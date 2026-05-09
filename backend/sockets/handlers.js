import { v4 as uuidv4 } from 'uuid';
import * as turf from '@turf/turf';
import * as state from '../simulator/state.js';
import * as routing from '../routing/index.js';
import { createAlert, resolveAlert } from '../services/alerts.js';

function forbidden(socket, code = 'forbidden') {
  socket.emit('error', { code });
}

export function registerHandlers(io, socket) {
  // ============== ZONES (Command only) ==============
  socket.on('zone:create', (payload) => {
    if (socket.data.role !== 'command') return forbidden(socket);
    if (!payload?.geometry?.coordinates) return forbidden(socket, 'invalid_payload');

    const zone = {
      zoneId: uuidv4(),
      name: payload.name || 'Restricted Zone',
      geometry: payload.geometry,
      active: true,
      createdBy: 'command',
      createdAt: Date.now()
    };
    state.setZone(zone);
    routing.rebuildForZones(state.allZones());
    invalidateShipPaths();

    io.to('fleet').emit('zone:update', { action: 'create', zone });
  });

  socket.on('zone:edit', (payload) => {
    if (socket.data.role !== 'command') return forbidden(socket);
    const { zoneId, name, geometry } = payload || {};
    if (!zoneId) return forbidden(socket, 'invalid_payload');

    const existing = state.getZone(zoneId);
    if (!existing) return forbidden(socket, 'not_found');

    const updated = {
      ...existing,
      ...(name && { name }),
      ...(geometry && { geometry })
    };
    state.setZone(updated);
    routing.rebuildForZones(state.allZones());
    invalidateShipPaths();
    io.to('fleet').emit('zone:update', { action: 'edit', zone: updated });
  });

  socket.on('zone:delete', ({ zoneId } = {}) => {
    if (socket.data.role !== 'command') return forbidden(socket);
    if (!zoneId) return forbidden(socket, 'invalid_payload');
    state.removeZone(zoneId);
    routing.rebuildForZones(state.allZones());
    // Un-strand ships that were stranded by this zone
    for (const ship of state.allShips()) {
      if (ship.status === 'stranded') {
        state.activeAlertKeys.delete(`stranded:${ship.shipId}`);
        ship.status = 'rerouting';
        // Restore speed from fleet data (ships were stopped when stranded)
        if (ship.speed === 0 && ship.maxSpeed) ship.speed = ship.maxSpeed * 0.6;
      }
    }
    invalidateShipPaths();
    io.to('fleet').emit('zone:update', { action: 'delete', zone: { zoneId } });
  });

  // ============== DIRECTIVES ==============
  socket.on('directive:send', (payload) => {
    if (socket.data.role !== 'command') return forbidden(socket);
    const { shipId, type, payload: dirPayload } = payload || {};
    if (!shipId || !state.getShip(shipId)) return forbidden(socket, 'invalid_ship');
    if (!['reroute', 'divert', 'hold', 'change_destination'].includes(type)) {
      return forbidden(socket, 'invalid_type');
    }

    const directive = {
      directiveId: uuidv4(),
      shipId,
      type,
      payload: dirPayload || {},
      status: 'pending',
      issuedBy: 'command',
      issuedAt: Date.now(),
      respondedAt: null,
      distressMessage: null
    };
    state.addDirective(directive);
    io.to(`ship:${shipId}`).emit('directive:incoming', directive);
    socket.emit('directive:sent', { directiveId: directive.directiveId });
  });

  socket.on('directive:accept', ({ directiveId } = {}) => {
    if (socket.data.role !== 'captain') return forbidden(socket);
    const directive = state.getDirective(directiveId);
    if (!directive) return forbidden(socket, 'not_found');
    if (directive.shipId !== socket.data.shipId) return forbidden(socket);
    if (directive.status !== 'pending') return forbidden(socket, 'already_responded');

    state.updateDirective(directiveId, {
      status: 'accepted',
      respondedAt: Date.now()
    });

    applyDirective(state.getShip(directive.shipId), directive);
    io.to('fleet').emit('directive:response', {
      directiveId,
      response: 'accepted',
      shipId: directive.shipId,
      type: directive.type
    });
  });

  socket.on('directive:escalate', ({ directiveId, distressMessage } = {}) => {
    if (socket.data.role !== 'captain') return forbidden(socket);
    const directive = state.getDirective(directiveId);
    if (!directive) return forbidden(socket, 'not_found');
    if (directive.shipId !== socket.data.shipId) return forbidden(socket);
    if (directive.status !== 'pending') return forbidden(socket, 'already_responded');

    state.updateDirective(directiveId, {
      status: 'escalated',
      distressMessage: distressMessage || '',
      respondedAt: Date.now()
    });

    const ship = state.getShip(directive.shipId);
    if (ship) ship.status = 'distressed';

    createAlert({
      type: 'distress',
      severity: 'high',
      shipIds: [directive.shipId],
      message: (distressMessage || '').slice(0, 120),
      distressText: distressMessage || ''
    });

    io.to('fleet').emit('directive:response', {
      directiveId,
      response: 'escalated',
      shipId: directive.shipId,
      distressMessage: distressMessage || ''
    });
  });

  // ============== ALERT ACK ==============
  socket.on('alert:acknowledge', ({ alertId } = {}) => {
    if (!alertId) return;
    resolveAlert(alertId);
  });

  // ============== CAPTAIN-INITIATED DISTRESS (no directive) ==============
  socket.on('distress:send', ({ distressMessage } = {}) => {
    if (socket.data.role !== 'captain') return forbidden(socket);
    if (!distressMessage) return forbidden(socket, 'empty_message');
    const shipId = socket.data.shipId;
    const ship = state.getShip(shipId);
    if (ship) ship.status = 'distressed';

    createAlert({
      type: 'distress',
      severity: 'high',
      shipIds: [shipId],
      message: distressMessage.slice(0, 120),
      distressText: distressMessage
    });
  });
}

function applyDirective(ship, directive) {
  if (!ship) return;
  switch (directive.type) {
    case 'change_destination':
      if (directive.payload?.destination) {
        ship.destination = directive.payload.destination;
        ship.currentPath = [];
        ship.pathIndex = 0;
        ship.status = 'rerouting';
      }
      break;
    case 'divert':
      if (directive.payload?.waypoint) {
        const wp = directive.payload.waypoint;
        ship.currentPath = [wp, ...(ship.currentPath || [])];
        ship.pathIndex = 0;
        ship.status = 'rerouting';
      }
      break;
    case 'hold':
      ship.speed = 0;
      ship.status = 'stopped';
      break;
    case 'reroute':
    default:
      ship.currentPath = [];
      ship.pathIndex = 0;
      ship.status = 'rerouting';
      break;
  }
}

function invalidateShipPaths() {
  const zonesArr = state.allZones();
  for (const ship of state.allShips()) {
    if (['arrived', 'out_of_fuel', 'stopped'].includes(ship.status)) continue;

    // Clear existing path
    ship.currentPath = [];
    ship.pathIndex = 0;

    // Check if destination is now inside a zone → stranded
    if (ship.destination?.coordinates && zonesArr.length > 0) {
      const destPt = turf.point(ship.destination.coordinates);
      let blocked = false;
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
            blocked = true;
            break;
          }
        } catch { /* skip */ }
      }
      if (blocked) continue;
    }

    // Immediately try to replan
    ship.status = 'rerouting';
    const planned = routing.planRoute(ship);
    if (planned.path) {
      ship.currentPath = planned.path;
      ship.pathIndex = 0;
      ship.status = 'normal';
    }
  }
}
