import * as turf from '@turf/turf';
import * as state from './state.js';
import { planRoute } from '../routing/index.js';
import { createAlert } from '../services/alerts.js';
import { getCachedWeather, refreshWeatherAsync } from '../services/weather.js';
import { env } from '../config/env.js';

let timer = null;
let io = null;
let tickCount = 0;

export function startTickLoop(socketServer) {
  io = socketServer;
  if (timer) return;
  timer = setInterval(runTick, env.TICK_MS);
  console.log(`✓ Simulator tick running every ${env.TICK_MS}ms`);
}

export function stopTickLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function runTick() {
  const tickStart = Date.now();
  tickCount++;
  const dtSec = env.TICK_MS / 1000;

  const zonesArr = state.allZones();
  const allShips = state.allShips();

  // 1. advance every ship
  for (const ship of allShips) {
    if (['arrived', 'out_of_fuel', 'stopped', 'stranded'].includes(ship.status)) continue;
    advanceShip(ship, dtSec, zonesArr);
  }

  // 2. proximity check (15 ships → 105 pairs)
  checkProximity(allShips);

  // 3. weather refresh per ship (every 60 ticks ≈ 1 min)
  if (tickCount % 60 === 0) {
    for (const ship of allShips) refreshWeatherAsync(ship).catch(() => {});
  }

  // 4. broadcast
  const payload = {
    ships: allShips.map(serializeShip),
    serverTime: Date.now()
  };
  io.to('fleet').volatile.emit('fleet:update', payload);

  const elapsed = Date.now() - tickStart;
  if (elapsed > env.TICK_MS * 0.5) {
    console.warn(`⚠ tick took ${elapsed}ms (budget ${env.TICK_MS}ms)`);
  }
}

function advanceShip(ship, dtSec, zonesArr) {
  // weather flag from cache
  const weather = getCachedWeather(ship.shipId);
  ship.inAdverseWeather = !!weather?.adverse;

  // ensure path exists
  if (!ship.currentPath?.length || ship.pathIndex >= ship.currentPath.length) {
    const planned = planRoute(ship);
    if (!planned.path) {
      ship.status = 'stranded';
      ship.speed = 0;
      const key = `stranded:${ship.shipId}`;
      if (!state.activeAlertKeys.has(key)) {
        state.activeAlertKeys.add(key);
        createAlert({
          type: 'stranded',
          severity: 'high',
          shipIds: [ship.shipId],
          message: `${ship.name} stranded — no valid path to ${ship.destination?.portName ?? 'destination'}`
        });
      }
      return;
    }
    ship.currentPath = planned.path;
    ship.pathIndex = 0;
    if (!planned.sufficientFuel && ship.status !== 'insufficient_fuel') {
      ship.status = 'insufficient_fuel';
      const key = `fuel:${ship.shipId}`;
      if (!state.activeAlertKeys.has(key)) {
        state.activeAlertKeys.add(key);
        createAlert({
          type: 'insufficient_fuel',
          severity: 'medium',
          shipIds: [ship.shipId],
          message: `${ship.name} fuel low — may not reach destination`
        });
      }
    } else if (ship.status !== 'rerouting' && ship.status !== 'distressed') {
      ship.status = 'normal';
    }
  }

  // step toward next waypoint
  const target = ship.currentPath[ship.pathIndex];
  const fromPt = turf.point(ship.position.coordinates);
  const toPt = turf.point(target);
  const distKm = turf.distance(fromPt, toPt, { units: 'kilometers' });
  const speedKmPerSec = (ship.speed * 1.852) / 3600; // knots → km/s
  const stepKm = speedKmPerSec * dtSec;

  if (stepKm <= 0) return;

  if (stepKm >= distKm) {
    ship.position = { type: 'Point', coordinates: target.slice() };
    ship.pathIndex++;
  } else {
    const headingDeg = turf.bearing(fromPt, toPt);
    const next = turf.destination(fromPt, stepKm, headingDeg, { units: 'kilometers' });
    ship.position = { type: 'Point', coordinates: next.geometry.coordinates };
    ship.heading = (headingDeg + 360) % 360;
  }

  // fuel burn (30% extra in adverse weather)
  const hours = dtSec / 3600;
  const baseBurn = ship.speed * env.BASE_FUEL_BURN_PER_KNOT_HOUR * hours;
  const burn = baseBurn * (ship.inAdverseWeather ? env.ADVERSE_WEATHER_FUEL_MULTIPLIER : 1);
  ship.fuel = Math.max(0, ship.fuel - burn);

  if (ship.fuel === 0) {
    ship.status = 'out_of_fuel';
    ship.speed = 0;
    const key = `fuel:${ship.shipId}`;
    if (!state.activeAlertKeys.has(key)) {
      state.activeAlertKeys.add(key);
      createAlert({
        type: 'out_of_fuel',
        severity: 'high',
        shipIds: [ship.shipId],
        message: `${ship.name} out of fuel — vessel adrift`
      });
    }
    return;
  }

  // arrival check
  if (ship.destination?.coordinates) {
    const arrival = turf.distance(
      turf.point(ship.position.coordinates),
      turf.point(ship.destination.coordinates),
      { units: 'kilometers' }
    );
    if (arrival < 1.0) {
      ship.status = 'arrived';
      ship.speed = 0;
      return;
    }
  }

  // geofence check
  for (const z of zonesArr) {
    const zoneKey = `geofence:${ship.shipId}:${z.zoneId}`;
    const inside = turf.booleanPointInPolygon(
      turf.point(ship.position.coordinates),
      turf.polygon(z.geometry.coordinates)
    );
    if (inside && !state.activeAlertKeys.has(zoneKey)) {
      state.activeAlertKeys.add(zoneKey);
      createAlert({
        type: 'geofence',
        severity: 'high',
        shipIds: [ship.shipId],
        zoneId: z.zoneId,
        message: `${ship.name} entered ${z.name}`
      });
      ship.status = 'rerouting';
      const replanned = planRoute(ship, { shipInsideZone: true });
      if (replanned.path) {
        ship.currentPath = replanned.path;
        ship.pathIndex = 0;
      }
    } else if (!inside && state.activeAlertKeys.has(zoneKey)) {
      state.activeAlertKeys.delete(zoneKey);
    }
  }

  ship.lastUpdated = new Date();
}

function checkProximity(allShips) {
  for (let i = 0; i < allShips.length; i++) {
    for (let j = i + 1; j < allShips.length; j++) {
      const a = allShips[i];
      const b = allShips[j];
      const km = turf.distance(
        turf.point(a.position.coordinates),
        turf.point(b.position.coordinates),
        { units: 'kilometers' }
      );
      const key = `proximity:${[a.shipId, b.shipId].sort().join(':')}`;
      if (km < env.PROXIMITY_THRESHOLD_KM && !state.activeAlertKeys.has(key)) {
        state.activeAlertKeys.add(key);
        createAlert({
          type: 'proximity',
          severity: 'medium',
          shipIds: [a.shipId, b.shipId],
          message: `${a.name} ↔ ${b.name} within ${km.toFixed(2)}km`
        });
      } else if (km >= env.PROXIMITY_THRESHOLD_KM && state.activeAlertKeys.has(key)) {
        state.activeAlertKeys.delete(key);
      }
    }
  }
}

function serializeShip(s) {
  return {
    shipId: s.shipId,
    name: s.name,
    position: {
      type: 'Point',
      coordinates: [
        Number(s.position.coordinates[0].toFixed(6)),
        Number(s.position.coordinates[1].toFixed(6))
      ]
    },
    heading: Number((s.heading ?? 0).toFixed(1)),
    speed: Number((s.speed ?? 0).toFixed(2)),
    maxSpeed: s.maxSpeed,
    destination: s.destination,
    fuel: Number((s.fuel ?? 0).toFixed(1)),
    fuelCapacity: s.fuelCapacity,
    cargo: s.cargo,
    status: s.status,
    inAdverseWeather: s.inAdverseWeather
  };
}

export { serializeShip };
