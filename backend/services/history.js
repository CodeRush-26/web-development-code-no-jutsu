import * as state from '../simulator/state.js';
import { env } from '../config/env.js';

/**
 * In-memory ring buffer of fleet snapshots.
 * Capacity = HISTORY_TTL_HOURS * 3600s / (SNAPSHOT_INTERVAL_MS/1000)
 * Default = 1hr * 3600 / 30 = 120 snapshots.
 */
const CAPACITY = Math.ceil(
  (env.HISTORY_TTL_HOURS * 3600 * 1000) / env.SNAPSHOT_INTERVAL_MS
);

const snapshots = []; // { timestamp, ships, zones }
let timer = null;

export function startHistoryWriter() {
  if (timer) return;
  timer = setInterval(saveSnapshot, env.SNAPSHOT_INTERVAL_MS);
  console.log(`✓ History writer running every ${env.SNAPSHOT_INTERVAL_MS}ms (capacity ${CAPACITY})`);
}

export function stopHistoryWriter() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function saveSnapshot() {
  const snap = {
    timestamp: Date.now(),
    ships: state.allShips().map((s) => ({
      shipId: s.shipId,
      name: s.name,
      position: { type: 'Point', coordinates: s.position.coordinates.slice() },
      heading: s.heading,
      speed: s.speed,
      fuel: s.fuel,
      status: s.status,
      inAdverseWeather: s.inAdverseWeather
    })),
    zones: state.allZones().map((z) => ({
      zoneId: z.zoneId,
      name: z.name,
      geometry: z.geometry,
      active: z.active
    }))
  };

  snapshots.push(snap);
  while (snapshots.length > CAPACITY) snapshots.shift();
}

export function getHistoryRange(from, to) {
  const fromMs = from instanceof Date ? from.getTime() : Number(from);
  const toMs = to instanceof Date ? to.getTime() : Number(to);
  return snapshots.filter((s) => s.timestamp >= fromMs && s.timestamp <= toMs);
}

export function allSnapshots() {
  return snapshots.slice();
}
