import * as turf from '@turf/turf';
import * as state from './state.js';
import { planRoute } from '../routing/index.js';
import { getGrid } from '../routing/index.js';
import { applyWeatherOverlay } from '../routing/grid.js';
import { createAlert, resolveAlert } from '../services/alerts.js';
import { getCachedWeather, refreshWeatherAsync, setIo as setWeatherIo } from '../services/weather.js';
import { env } from '../config/env.js';

let timer = null;
let io = null;
let tickCount = 0;

export function startTickLoop(socketServer) {
  io = socketServer;
  setWeatherIo(socketServer); // Ensure weather service can broadcast
  if (timer) return;
  timer = setInterval(runTick, env.TICK_MS);
  console.log(`✓ Simulator tick running every ${env.TICK_MS}ms`);
  
  // Initial weather fetch for all ships so dashboard isn't empty
  const ships = state.allShips();
  for (const s of ships) refreshWeatherAsync(s).catch(() => {});
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
    if (['arrived', 'out_of_fuel', 'stopped'].includes(ship.status)) continue;
    advanceShip(ship, dtSec, zonesArr);
  }

  // 1b. geofence check — are any ships inside zones?
  checkGeofences(allShips, zonesArr);

  // 2. proximity check (15 ships → 105 pairs)
  checkProximity(allShips);

  // 3. weather refresh per ship (every 60 ticks ≈ 1 min)
  if (tickCount % 60 === 0) {
    for (const ship of allShips) refreshWeatherAsync(ship).catch(() => {});

    // Apply weather overlay to routing grid so A* avoids bad weather
    const grid = getGrid();
    if (grid) {
      const adversePositions = allShips
        .filter((s) => s.inAdverseWeather)
        .map((s) => s.position.coordinates);
      if (adversePositions.length > 0) {
        applyWeatherOverlay(grid, adversePositions);
      }
    }
  }

  // 3b. Predictive alerts (every 10 ticks ≈ 10s)
  if (tickCount % 10 === 0) {
    checkPredictiveAlerts(allShips, zonesArr);
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
    // Check if destination itself is inside a zone (→ stranded)
    if (ship.destination?.coordinates && zonesArr.length > 0) {
      const destPt = turf.point(ship.destination.coordinates);
      for (const z of zonesArr) {
        try {
          if (turf.booleanPointInPolygon(destPt, turf.polygon(z.geometry.coordinates))) {
            ship.status = 'stranded';
            ship.speed = 0;
            const key = `stranded:${ship.shipId}`;
            if (!state.activeAlertKeys.has(key)) {
              state.activeAlertKeys.add(key);
              createAlert({
                type: 'stranded',
                severity: 'high',
                shipIds: [ship.shipId],
                message: `${ship.name} stranded — destination ${ship.destination?.portName ?? 'port'} is inside restricted zone "${z.name}"`
              });
            }
            return;
          }
        } catch { /* skip malformed zone */ }
      }
    }

    // Check if ship is in adverse weather zone
    ship.inAdverseWeather = false;
    for (const z of zonesArr) {
      try {
        const name = (z.name || '').toLowerCase();
        if (name.includes('storm') || name.includes('weather')) {
          if (turf.booleanPointInPolygon(turf.point(ship.position.coordinates), turf.polygon(z.geometry.coordinates))) {
            ship.inAdverseWeather = true;
            break;
          }
        }
      } catch { /* skip malformed */ }
    }

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
    
    // Immediate fuel viability check
    const fuelKey = `fuel:${ship.shipId}`;
    if (!planned.sufficientFuel) {
      ship.status = 'insufficient_fuel';
      if (!state.activeAlertKeys.has(fuelKey)) {
        state.activeAlertKeys.add(fuelKey);
        createAlert({
          type: 'insufficient_fuel',
          severity: 'medium',
          shipIds: [ship.shipId],
          message: `⚠ ${ship.name} fuel low — path to ${ship.destination?.portName || 'destination'} requires more than ${ship.fuel.toFixed(1)}t available`
        });
      }
    } else {
      // Clear insufficient_fuel if now sufficient (e.g. rerouted or refueled)
      if (ship.status === 'insufficient_fuel') ship.status = 'normal';
      state.activeAlertKeys.delete(fuelKey);
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

  // v³ fuel model: fuel_per_sec = k × speed³ × cargoMultiplier × weatherMultiplier
  const v = ship.speed;
  const baseBurn = env.FUEL_BURN_K * v * v * v * dtSec;
  const cargoMul = ship.cargoMultiplier || 1.0;
  const weatherMul = ship.inAdverseWeather ? env.ADVERSE_WEATHER_FUEL_MULTIPLIER : 1.0;
  const burn = baseBurn * cargoMul * weatherMul;
  
  const oldFuel = ship.fuel;
  ship.fuel = Math.max(0, ship.fuel - burn);
  ship.fuelBurnRate = burn / dtSec; // t/s for frontend display

  // Numerical verification logging
  if (ship.inAdverseWeather || tickCount % 30 === 0) {
    console.log(`[FUEL] ${ship.name}: burn=${burn.toFixed(4)}t (base=${baseBurn.toFixed(4)}t, mul=${weatherMul.toFixed(2)}${ship.inAdverseWeather ? ' STORM' : ''}), fuel=${ship.fuel.toFixed(2)}t`);
  }

  if (ship.fuel === 0) {
    ship.status = 'out_of_fuel';
    ship.speed = 0;
    const key = `fuel:${ship.shipId}`;
    if (!state.activeAlertKeys.has(key)) {
      state.activeAlertKeys.add(key);
      createAlert({
        type: 'out_of_fuel',
        severity: 'critical',
        shipIds: [ship.shipId],
        message: `🚨 CRITICAL: ${ship.name} out of fuel — vessel adrift at [${ship.position.coordinates[1].toFixed(3)}°N, ${ship.position.coordinates[0].toFixed(3)}°E]`
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

/**
 * Separate geofence pass: checks ALL ships against ALL zones.
 * Catches ships that are inside zones due to zone:create overlapping them.
 */
function checkGeofences(allShips, zonesArr) {
  if (!zonesArr.length) return;
  for (const ship of allShips) {
    if (['arrived', 'out_of_fuel', 'stopped'].includes(ship.status)) continue;
    const shipPt = turf.point(ship.position.coordinates);
    for (const z of zonesArr) {
      const zoneKey = `geofence:${ship.shipId}:${z.zoneId}`;
      try {
        const inside = turf.booleanPointInPolygon(shipPt, turf.polygon(z.geometry.coordinates));
        if (inside && !state.activeAlertKeys.has(zoneKey)) {
          state.activeAlertKeys.add(zoneKey);
          createAlert({
            type: 'geofence',
            severity: 'high',
            shipIds: [ship.shipId],
            zoneId: z.zoneId,
            message: `⚠ ${ship.name} inside restricted zone "${z.name}" — rerouting`
          });
          // Force immediate reroute out of the zone
          ship.status = 'rerouting';
          ship.currentPath = [];
          ship.pathIndex = 0;
        } else if (!inside && state.activeAlertKeys.has(zoneKey)) {
          state.activeAlertKeys.delete(zoneKey);
        }
      } catch { /* skip malformed zone */ }
    }
  }
}

// Tracks last alert timestamp per ship pair to enforce 30-second re-alert cooldown.
// Map<pairKey, lastAlertMs>
const proximityCooldown = new Map();
// Map<pairKey, alertId> to properly resolve them when ships separate
const proximityAlertIds = new Map();
const PROXIMITY_COOLDOWN_MS = 30_000;

/**
 * Check all N*(N-1)/2 ship pairs for proximity breaches.
 * - Alert fires within 1 tick of breach
 * - Each pair triggers its own independent alert (3 ships → 3 pair alerts)
 * - Same pair re-alerts at most once per 30 seconds (handles oscillation at boundary)
 * - Alert clears when ships move beyond PROXIMITY_THRESHOLD_KM
 */
function checkProximity(allShips) {
  const now = Date.now();
  for (let i = 0; i < allShips.length; i++) {
    for (let j = i + 1; j < allShips.length; j++) {
      const a = allShips[i];
      const b = allShips[j];
      const km = turf.distance(
        turf.point(a.position.coordinates),
        turf.point(b.position.coordinates),
        { units: 'kilometers' }
      );
      // Canonical key so MV-1:MV-2 and MV-2:MV-1 are the same pair
      const key = `proximity:${[a.shipId, b.shipId].sort().join(':')}`;

      if (km < env.PROXIMITY_THRESHOLD_KM) {
        const lastFired = proximityCooldown.get(key) ?? 0;
        const cooldownExpired = (now - lastFired) >= PROXIMITY_COOLDOWN_MS;

        // Fire if: (a) not currently active (ships just entered range), OR
        //          (b) cooldown expired (ships oscillated: went apart, came back)
        if (!state.activeAlertKeys.has(key) && cooldownExpired) {
          state.activeAlertKeys.add(key);
          proximityCooldown.set(key, now);
          const alert = createAlert({
            type: 'proximity',
            severity: 'critical',
            shipIds: [a.shipId, b.shipId],
            message: `PROXIMITY BREACH: ${a.name} (${a.shipId}) and ${b.name} (${b.shipId}) are ${km.toFixed(2)} km apart!`
          });
          proximityAlertIds.set(key, alert.alertId);
          console.log(`[ALERT] Proximity breach created: ${a.shipId}-${b.shipId} at ${km.toFixed(2)}km`);
        }
      } else {
        // Ships moved beyond threshold — clear active flag so next approach re-alerts
        if (state.activeAlertKeys.has(key)) {
          state.activeAlertKeys.delete(key);
          const alertId = proximityAlertIds.get(key);
          if (alertId) {
            resolveAlert(alertId);
            proximityAlertIds.delete(key);
          }
        }
      }
    }
  }
}

/**
 * Predictive alerts: fire warnings BEFORE things go wrong.
 * - Fuel shortage: "Ship will run out of fuel X km short of port"
 * - Zone entry: "Ship will enter zone in ~N minutes"
 */
function checkPredictiveAlerts(allShips, zonesArr) {
  for (const ship of allShips) {
    if (['arrived', 'out_of_fuel', 'stopped', 'stranded'].includes(ship.status)) continue;

    // Predictive fuel alert
    if (ship.destination?.coordinates && ship.speed > 0) {
      const result = planRoute(ship);
      if (result.path && !result.sufficientFuel) {
        const shortfallTons = result.fuelEstimate - ship.fuel;
        // Only alert if shortfall is more than 5% of capacity to avoid noise on marginal cases
        const isSignificantShortfall = shortfallTons > (ship.fuelCapacity * 0.05);
        const key = `predict-fuel:${ship.shipId}`;

        if (isSignificantShortfall && !state.activeAlertKeys.has(key)) {
          state.activeAlertKeys.add(key);
          const distLeft = result.distanceKm;
          const fuelRange = (ship.fuel / result.fuelEstimate) * distLeft;
          const shortKm = Math.max(0, distLeft - fuelRange).toFixed(0);
          createAlert({
            type: 'predictive_fuel',
            severity: 'medium',
            shipIds: [ship.shipId],
            message: `⚠ Predictive: ${ship.name} will run out of fuel ~${shortKm} km short of ${ship.destination.portName || 'port'}. Shortfall: ${shortfallTons.toFixed(0)}t`
          });
        } else if (!isSignificantShortfall && state.activeAlertKeys.has(key)) {
          state.activeAlertKeys.delete(key);
        }
      } else {
        // Clear prediction if fuel is now sufficient
        state.activeAlertKeys.delete(`predict-fuel:${ship.shipId}`);
      }
    }

    // Predictive zone entry alert
    if (ship.currentPath?.length > 0 && ship.speed > 0) {
      for (const z of zonesArr) {
        const zoneKey = `predict-zone:${ship.shipId}:${z.zoneId}`;
        if (state.activeAlertKeys.has(`geofence:${ship.shipId}:${z.zoneId}`)) continue; // already inside
        if (state.activeAlertKeys.has(zoneKey)) continue; // already warned

        // Check if any upcoming waypoint falls inside this zone
        const idx = ship.pathIndex || 0;
        for (let i = idx; i < Math.min(idx + 5, ship.currentPath.length); i++) {
          try {
            const inside = turf.booleanPointInPolygon(
              turf.point(ship.currentPath[i]),
              turf.polygon(z.geometry.coordinates)
            );
            if (inside) {
              const distToWp = turf.distance(
                turf.point(ship.position.coordinates),
                turf.point(ship.currentPath[i]),
                { units: 'kilometers' }
              );
              const speedKmh = ship.speed * 1.852;
              const minutesToEntry = Math.round((distToWp / speedKmh) * 60);
              // Only alert if entry is imminent (within 5 mins or 5km)
              if (minutesToEntry <= 5 || distToWp <= 5) {
                state.activeAlertKeys.add(zoneKey);
                createAlert({
                  type: 'predictive_zone',
                  severity: 'medium',
                  shipIds: [ship.shipId],
                  zoneId: z.zoneId,
                  message: `⚠ Predictive: ${ship.name} will enter ${z.name} in ~${minutesToEntry} min`
                });
              }
              break;
            }
          } catch { /* skip malformed zone */ }
        }
      }
    }
  }
}

function serializeShip(s) {
  // Compute fuel estimate for frontend display
  let fuelEstimate = null;
  let fuelShortfall = null;
  if (s.destination?.coordinates && s.speed > 0 && s.currentPath?.length > 0) {
    let distKm = 0;
    const coords = [s.position.coordinates, ...(s.currentPath || []).slice(s.pathIndex || 0)];
    for (let i = 1; i < coords.length; i++) {
      distKm += turf.distance(turf.point(coords[i - 1]), turf.point(coords[i]), { units: 'kilometers' });
    }
    const speedKmH = s.speed * 1.852;
    const seconds = (distKm / speedKmH) * 3600;
    const v = s.speed;
    const baseBurn = env.FUEL_BURN_K * v * v * v * seconds;
    const cargoMul = s.cargoMultiplier || 1.0;
    const weatherMul = s.inAdverseWeather ? env.ADVERSE_WEATHER_FUEL_MULTIPLIER : 1.0;
    fuelEstimate = baseBurn * cargoMul * weatherMul;
    fuelShortfall = fuelEstimate > s.fuel ? fuelEstimate - s.fuel : 0;
  }

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
    fuelEstimate: fuelEstimate !== null ? Number(fuelEstimate.toFixed(1)) : null,
    fuelShortfall: fuelShortfall !== null ? Number(fuelShortfall.toFixed(1)) : null,
    fuelBurnRate: Number((s.fuelBurnRate ?? 0).toFixed(2)),
    cargo: s.cargo,
    cargoMultiplier: s.cargoMultiplier || 1.0,
    status: s.status,
    inAdverseWeather: s.inAdverseWeather,
    currentPath: s.currentPath || []
  };
}

export { serializeShip };
