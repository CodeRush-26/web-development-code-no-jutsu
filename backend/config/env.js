import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ Missing required env var: ${name}`);
    console.error('  Copy .env.example to .env and fill in values.');
    process.exit(1);
  }
  return v;
}

function num(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) {
    console.error(`✗ Env var ${name} must be a number, got: ${v}`);
    process.exit(1);
  }
  return n;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: num('PORT', 3001),

  GROQ_API_KEY: required('GROQ_API_KEY'),
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

  // Default 950ms gives ~50ms headroom under the 1Hz spec. setInterval jitter
  // typically adds ~1-5ms — keeping us safely "1 Hz or faster".
  TICK_MS: num('TICK_MS', 950),
  SNAPSHOT_INTERVAL_MS: num('SNAPSHOT_INTERVAL_MS', 30000),
  HISTORY_TTL_HOURS: num('HISTORY_TTL_HOURS', 1),

  WEATHER_CACHE_MS: num('WEATHER_CACHE_MS', 300000),
  ADVERSE_WAVE_HEIGHT_M: num('ADVERSE_WAVE_HEIGHT_M', 2.5),
  ADVERSE_WIND_WAVE_HEIGHT_M: num('ADVERSE_WIND_WAVE_HEIGHT_M', 2.0),

  BASE_FUEL_BURN_PER_KNOT_HOUR: num('BASE_FUEL_BURN_PER_KNOT_HOUR', 0.5),
  PROXIMITY_THRESHOLD_KM: num('PROXIMITY_THRESHOLD_KM', 2.0),
  ADVERSE_WEATHER_FUEL_MULTIPLIER: 1.30,

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
