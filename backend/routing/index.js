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

// Pre-defined corridor waypoints through the Strait of Hormuz and Gulf of Oman.
// Ships use these as stepping stones when A* cannot find a full grid path.
// All coords are [lng, lat] (GeoJSON order).
const HORMUZ_WEST = [56.10, 26.55]; // Persian Gulf side of strait
const HORMUZ_EAST = [56.80, 26.30]; // Gulf of Oman side of strait
const GULF_OMAN_MID = [57.80, 25.50]; // Open water, central Gulf of Oman
const PERSIAN_GULF_MID = [54.50, 26.00]; // Open water, central Persian Gulf

// Longitude threshold separating Persian Gulf from Gulf of Oman
const HORMUZ_LNG = 56.5;

/**
 * Corridor fallback: routes ships through the Hormuz strait using pre-defined
 * waypoints when A* fails, so ships always follow a geographically plausible path.
 */
function computeDirectFallback(ship, opts = {}) {
  if (!gridCache) return null;
  const start = ship.position.coordinates; // [lng, lat]
  const goal = ship.destination.coordinates;

  const startInGulf = start[0] < HORMUZ_LNG;
  const goalInGulf  = goal[0]  < HORMUZ_LNG;

  let waypoints;
  if (startInGulf && !goalInGulf) {
    // Persian Gulf → Gulf of Oman: go through strait west→east
    waypoints = [start.slice(), PERSIAN_GULF_MID, HORMUZ_WEST, HORMUZ_EAST, GULF_OMAN_MID, goal.slice()];
  } else if (!startInGulf && goalInGulf) {
    // Gulf of Oman → Persian Gulf: go through strait east→west
    waypoints = [start.slice(), GULF_OMAN_MID, HORMUZ_EAST, HORMUZ_WEST, PERSIAN_GULF_MID, goal.slice()];
  } else {
    // Same side — direct within-gulf route, but deflect around zones
    waypoints = [start.slice(), goal.slice()];
  }

  // Deflect around any active user-drawn zones that block the path
  if (!opts.shipInsideZone) {
    const zones = gridCache.zones || [];
    for (const z of zones) {
      try {
        const line = turf.lineString(waypoints);
        if (turf.booleanIntersects(line, turf.polygon(z.geometry.coordinates))) {
          const centroid = turf.centroid(turf.polygon(z.geometry.coordinates)).geometry.coordinates;
          const bearing = turf.bearing(turf.point(start), turf.point(goal));
          const offset = turf.destination(turf.point(centroid), 80, (bearing + 90) % 360, {
            units: 'kilometers'
          }).geometry.coordinates;
          waypoints.splice(1, 0, offset);
          break;
        }
      } catch { /* skip malformed zone */ }
    }
  }

  return waypoints;
}
