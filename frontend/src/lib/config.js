// In dev, leave VITE_API_URL unset → socket.js connects to ws://localhost:3001 directly
// In production, set VITE_API_URL=https://your-backend.example.com
export const API_URL = import.meta.env.VITE_API_URL || '';

// Backend base URL for fetch() calls (REST API). In dev, Vite proxies /api → :3001.
// In production same-origin, we hit the same host.
export const REST_BASE = API_URL || '';

export const TICK_MS = 1000;
export const MAP_CENTER = [26.0, 55.0];
export const MAP_ZOOM = 7;
export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export const STATUS_LABEL = {
  normal: 'Normal',
  rerouting: 'Rerouting',
  distressed: 'Distressed',
  stopped: 'Stopped',
  stranded: 'Stranded',
  arrived: 'Arrived',
  insufficient_fuel: 'Low Fuel',
  out_of_fuel: 'Out of Fuel'
};

export const STATUS_COLOR = {
  normal: '#10b981',
  rerouting: '#f59e0b',
  distressed: '#dc2626',
  stopped: '#6b7280',
  stranded: '#a855f7',
  arrived: '#3b82f6',
  insufficient_fuel: '#f97316',
  out_of_fuel: '#7f1d1d'
};

export const SEVERITY_COLOR = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#64748b'
};

export const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
