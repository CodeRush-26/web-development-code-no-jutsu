/**
 * Pure in-memory state — no database.
 * The simulator tick is the single writer.
 */

export const ships = new Map();           // shipId -> ship object
export const zones = new Map();           // zoneId -> zone object
export const directives = new Map();      // directiveId -> directive object
export const alerts = new Map();          // alertId -> alert object
export const activeAlertKeys = new Set(); // dedup keys

let fleetConfig = null;

export function setFleetConfig(cfg) {
  fleetConfig = cfg;
}

export function getFleetConfig() {
  return fleetConfig;
}

export function loadInitialShips(initialShips) {
  ships.clear();
  for (const s of initialShips) ships.set(s.shipId, s);
  console.log(`✓ Loaded ${ships.size} ships into memory`);
}

// ===== Ships =====
export function getShip(shipId) {
  return ships.get(shipId);
}

export function allShips() {
  return [...ships.values()];
}

export function setShip(shipId, partial) {
  const existing = ships.get(shipId);
  if (!existing) return null;
  const merged = { ...existing, ...partial };
  ships.set(shipId, merged);
  return merged;
}

// ===== Zones =====
export function setZone(zone) {
  zones.set(zone.zoneId, zone);
}

export function removeZone(zoneId) {
  zones.delete(zoneId);
  for (const key of activeAlertKeys) {
    if (key.startsWith('geofence:') && key.endsWith(`:${zoneId}`)) {
      activeAlertKeys.delete(key);
    }
  }
}

export function allZones() {
  return [...zones.values()];
}

export function getZone(zoneId) {
  return zones.get(zoneId);
}

// ===== Alerts =====
export function addAlert(alert) {
  alerts.set(alert.alertId, alert);
}

export function getAlert(alertId) {
  return alerts.get(alertId);
}

export function updateAlert(alertId, partial) {
  const a = alerts.get(alertId);
  if (!a) return null;
  Object.assign(a, partial);
  return a;
}

export function activeAlerts() {
  return [...alerts.values()].filter((a) => a.status === 'active');
}

export function allAlerts() {
  return [...alerts.values()].sort((a, b) => b.createdAt - a.createdAt);
}

// ===== Directives =====
export function addDirective(directive) {
  directives.set(directive.directiveId, directive);
}

export function getDirective(directiveId) {
  return directives.get(directiveId);
}

export function updateDirective(directiveId, partial) {
  const d = directives.get(directiveId);
  if (!d) return null;
  Object.assign(d, partial);
  return d;
}

export function allDirectives() {
  return [...directives.values()].sort((a, b) => b.issuedAt - a.issuedAt);
}

export function getDirectivesForShip(shipId) {
  return allDirectives().filter((d) => d.shipId === shipId);
}
