import { io } from 'socket.io-client';
import { API_URL } from './config';
import { useFleetStore } from '../store/fleetStore';

let socket = null;

/**
 * Connect to the backend Socket.io server.
 * - In dev (`npm run dev`), VITE_API_URL is unset, so we connect directly to the
 *   backend on http://localhost:3001 (bypassing Vite's WS proxy which has issues).
 * - In production, set VITE_API_URL=https://your-backend.example.com.
 *
 * Important:
 *  - We DO NOT pin transports — let socket.io negotiate (polling → upgrade to ws).
 *  - Forcing `transports: ['websocket']` causes "Disconnected" if the upgrade fails.
 */
function targetUrl() {
  if (API_URL) return API_URL;
  if (typeof window === 'undefined') return undefined;
  // Default: same host as the page, port 3001 (backend dev port)
  const host = window.location.hostname || 'localhost';
  return `http://${host}:3001`;
}

export function connectSocket(role, shipId) {
  if (socket) {
    if (socket.connected) {
      // re-identify with new role/ship if needed
      socket.emit('auth:identify', { role, shipId });
      return socket;
    }
    socket.connect();
    return socket;
  }

  const url = targetUrl();
  console.log('[socket] connecting to', url);

  socket = io(url, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  socket.on('connect', () => {
    console.log('[socket] connected', socket.id);
    useFleetStore.getState().setConnected(true);
    socket.emit('auth:identify', { role, shipId });
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err.message);
    useFleetStore.getState().setConnected(false);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[socket] disconnect:', reason);
    useFleetStore.getState().setConnected(false);
  });

  socket.on('fleet:snapshot', (p) => useFleetStore.getState().applySnapshot(p));
  socket.on('fleet:update', (p) => useFleetStore.getState().applyUpdate(p));

  socket.on('alert:new', (a) => useFleetStore.getState().addAlert(a));
  socket.on('alert:enriched', (p) => useFleetStore.getState().enrichAlert(p));
  socket.on('alert:resolved', (p) => useFleetStore.getState().resolveAlert(p.alertId));

  socket.on('zone:update', (p) => useFleetStore.getState().applyZoneUpdate(p));

  socket.on('directive:incoming', (d) => useFleetStore.getState().addDirective(d));
  socket.on('directive:response', (p) => useFleetStore.getState().updateDirective(p));

  socket.on('weather:update', (p) => useFleetStore.getState().updateWeather(p));

  socket.on('error', (e) => console.warn('[socket] error', e));

  return socket;
}

export function getSocket() {
  return socket;
}

export function emit(event, payload, ack) {
  if (!socket) {
    console.warn('[socket] emit without connection:', event);
    return;
  }
  socket.emit(event, payload, ack);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
