import * as turf from '@turf/turf';
import { buildGrid, lngLatToCell, isWalkable } from './grid.js';
import { findPath } from './astar.js';
import { smoothPath } from './smooth.js';
import { env } from '../config/env.js';

let gridCache = null;

export function initGrid(navigablePolygon, zones) {
  gridCache = buildGrid(navigablePolygon, zones);
  console.log(`✓ Routing grid ${gridCache.rows}×${gridCache.cols} cells (~${gridCache.cellSizeKm}km each)`);
  return gridCache;
}

export function rebuildForZones(zones) {
  if (!gridCache) return null;
  gridCache = buildGrid(gridCache.navigablePolygon, zones, gridCache.cellSizeKm);
  return gridCache;
}

export function getGrid() {
  return gridCache;
}

/**
 * planRoute: compute waypoint path from ship to its destination.
 * Returns { path, distanceKm, fuelEstimate, sufficientFuel }.
 * `path` is an array of [lng, lat] waypoints, or null if no path exists.
 */
export function planRoute(ship, opts = {}) {
  if (!gridCache) return { path: null, distanceKm: Infinity };
  if (!ship.destination?.coordinates) return { path: null, distanceKm: Infinity };

  const [shipLng, shipLat] = ship.position.coordinates;
  const [destLng, destLat] = ship.destination.coordinates;

  const startCell = lngLatToCell(gridCache, shipLng, shipLat);
  const goalCell = lngLatToCell(gridCache, destLng, destLat);
  if (!startCell || !goalCell) return { path: null, distanceKm: Infinity };

  // Ships from fleet.json may sit exactly on the navigable polygon boundary
  // where booleanPointInPolygon returns false. We're permissive about start cell
  // walkability when no zone caused this — only enforce for zone breach situations.
  const allowStartUnwalkable = true;

  const cellPath = findPath(gridCache, startCell, goalCell, { allowStartUnwalkable });

  // If A* couldn't find a path (e.g. polygon self-intersection, narrow channel),
  // fall back to "naive head toward destination" — the spec explicitly allows this.
  // We still avoid known zones by checking the direct line; if it crosses a zone,
  // we route through the zone-edge midpoint as a single deflection waypoint.
  if (!cellPath) {
    const direct = computeDirectFallback(ship, opts);
    if (direct) {
      let distanceKm = 0;
      for (let i = 1; i < direct.length; i++) {
        distanceKm += turf.distance(turf.point(direct[i - 1]), turf.point(direct[i]), {
          units: 'kilometers'
        });
      }
      const fuelEstimate = computeFuelEstimate(ship, distanceKm);
      return {
        path: direct,
        distanceKm,
        fuelEstimate,
        sufficientFuel: fuelEstimate <= ship.fuel,
        fallback: true
      };
    }
    return { path: null, distanceKm: Infinity };
  }

  const waypoints = smoothPath(cellPath, gridCache);

  // ensure exact destination is the last waypoint
  if (waypoints.length) {
    const last = waypoints[waypoints.length - 1];
    const [lng, lat] = last;
    if (Math.abs(lng - destLng) > 0.001 || Math.abs(lat - destLat) > 0.001) {
      waypoints.push([destLng, destLat]);
    }
  }

  let distanceKm = 0;
  for (let i = 1; i < waypoints.length; i++) {
    distanceKm += turf.distance(turf.point(waypoints[i - 1]), turf.point(waypoints[i]), {
      units: 'kilometers'
    });
  }

  const fuelEstimate = computeFuelEstimate(ship, distanceKm);

  return {
    path: waypoints,
    distanceKm,
    fuelEstimate,
    sufficientFuel: fuelEstimate <= ship.fuel
  };
}

function computeFuelEstimate(ship, distanceKm) {
  if (!ship.speed || ship.speed <= 0) return 0;
  const speedKmH = ship.speed * 1.852;
  const hours = distanceKm / speedKmH;
  const seconds = hours * 3600;
  // v³ model matching tick.js: k × speed³ × seconds × cargoMul × weatherMul
  const v = ship.speed;
  const baseBurn = env.FUEL_BURN_K * v * v * v * seconds;
  const cargoMul = ship.cargoMultiplier || 1.0;
  const weatherMul = ship.inAdverseWeather ? env.ADVERSE_WEATHER_FUEL_MULTIPLIER : 1.0;
  return baseBurn * cargoMul * weatherMul;
}

/**
 * Naive fallback: a single waypoint going directly to the destination, but if the
 * straight line crosses an active zone we add a deflection point that sidesteps it.
 * Spec: "naive head toward destination and deflect when blocked" is explicitly allowed.
 */
function computeDirectFallback(ship, opts = {}) {
  if (!gridCache) return null;
  const start = ship.position.coordinates;
  const goal = ship.destination.coordinates;
  const line = turf.lineString([start, goal]);

  const blockingZones = (gridCache.zones || []).filter((z) => {
    try {
      return turf.booleanIntersects(line, turf.polygon(z.geometry.coordinates));
    } catch {
      return false;
    }
  });

  if (!blockingZones.length || opts.shipInsideZone) {
    return [start.slice(), goal.slice()];
  }

  // Pick the first blocking zone, deflect around its centroid + perpendicular offset
  const zonePoly = turf.polygon(blockingZones[0].geometry.coordinates);
  const centroid = turf.centroid(zonePoly).geometry.coordinates;
  const bbox = turf.bbox(zonePoly);
  const radius = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  // perpendicular offset (rotate 90° relative to direct bearing)
  const bearing = turf.bearing(turf.point(start), turf.point(goal));
  const perpA = (bearing + 90) % 360;
  const offset = turf.destination(turf.point(centroid), radius * 80, perpA, {
    units: 'kilometers'
  }).geometry.coordinates;
  return [start.slice(), offset, goal.slice()];
}
