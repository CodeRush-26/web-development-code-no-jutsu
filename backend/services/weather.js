import { env } from '../config/env.js';

/**
 * Open-Meteo Marine API — free, keyless.
 * Cached per ship for WEATHER_CACHE_MS.
 */
const cache = new Map(); // shipId -> { conditions, fetchedAt }
let io = null;

export function setIo(socketServer) {
  io = socketServer;
}

export function getCachedWeather(shipId) {
  return cache.get(shipId)?.conditions;
}

export async function refreshWeatherAsync(ship) {
  const cached = cache.get(ship.shipId);
  if (cached && Date.now() - cached.fetchedAt < env.WEATHER_CACHE_MS) return;

  const [lng, lat] = ship.position.coordinates;

  // mark in-flight to prevent duplicate calls (cheap fingerprint)
  cache.set(ship.shipId, { conditions: cached?.conditions, fetchedAt: Date.now() });

  try {
    const url =
      `https://marine-api.open-meteo.com/v1/marine` +
      `?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
      `&hourly=wave_height,wind_wave_height&forecast_days=1`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();

    const idx = pickCurrentHourIndex(data?.hourly?.time);
    const wave = data?.hourly?.wave_height?.[idx] ?? 0;
    const windWave = data?.hourly?.wind_wave_height?.[idx] ?? 0;

    const adverse =
      wave > env.ADVERSE_WAVE_HEIGHT_M || windWave > env.ADVERSE_WIND_WAVE_HEIGHT_M;

    const conditions = {
      wave_height: wave,
      wind_wave_height: windWave,
      adverse,
      sampledAt: new Date().toISOString()
    };

    cache.set(ship.shipId, { conditions, fetchedAt: Date.now() });
    if (io) io.to('fleet').emit('weather:update', { shipId: ship.shipId, conditions });
  } catch (err) {
    // soft fail — keep last cached value
    if (env.NODE_ENV !== 'production') {
      console.warn(`weather fetch failed for ${ship.shipId}:`, err.message);
    }
  }
}

function pickCurrentHourIndex(timeArr) {
  if (!Array.isArray(timeArr) || !timeArr.length) return 0;
  const now = Date.now();
  let bestIdx = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < timeArr.length; i++) {
    const t = new Date(timeArr[i]).getTime();
    const d = Math.abs(now - t);
    if (d < bestDelta) {
      bestDelta = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}
