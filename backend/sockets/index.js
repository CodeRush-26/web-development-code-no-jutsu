import { Server } from 'socket.io';
import * as state from '../simulator/state.js';
import * as alerts from '../services/alerts.js';
import * as weather from '../services/weather.js';
import { registerHandlers } from './handlers.js';
import { env } from '../config/env.js';

export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000
  });

  alerts.setIo(io);
  weather.setIo(io);

  io.on('connection', (socket) => {
    socket.data.role = null;
    socket.data.shipId = null;

    socket.on('auth:identify', (payload) => {
      if (socket.data.role) return;
      const role = payload?.role;
      const shipId = payload?.shipId;
      if (role !== 'command' && role !== 'captain') {
        return socket.emit('error', { code: 'invalid_role' });
      }
      if (role === 'captain' && (!shipId || !state.getShip(shipId))) {
        return socket.emit('error', { code: 'invalid_ship' });
      }
      socket.data.role = role;
      socket.data.shipId = shipId || null;
      socket.join('fleet');
      if (role === 'command') socket.join('command');
      if (role === 'captain') socket.join(`ship:${shipId}`);

      const cfg = state.getFleetConfig();
      socket.emit('fleet:snapshot', {
        ships: state.allShips(),
        zones: state.allZones(),
        activeAlerts: state.activeAlerts(),
        navigablePolygon: cfg?.navigablePolygon || null,
        boundingBox: cfg?.boundingBox || null,
        ports: cfg?.ports || [],
        serverTime: Date.now(),
        you: { role, shipId: shipId || null }
      });
    });

    registerHandlers(io, socket);

    socket.on('disconnect', () => {
      // socket.io auto-leaves rooms; no manual cleanup needed
    });
  });

  console.log('✓ Socket.io attached');
  return io;
}
