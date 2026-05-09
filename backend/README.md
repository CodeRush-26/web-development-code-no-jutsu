# Fleet Command — Backend

Node.js + Express + Socket.io + Groq AI. **Pure in-memory state — no database.**

## Quick Start

```bash
cd backend
npm install
cp .env.example .env
# edit .env and paste your GROQ_API_KEY (get from https://console.groq.com)
npm start
```

Expected boot log:
```
✓ Loaded 15 ships into memory
✓ Routing grid 87×118 cells (~10km each)
✓ Pre-planned 15/15 initial routes
✓ Socket.io attached
✓ Simulator tick running every 1000ms
✓ History writer running every 30000ms (capacity 120)
✓ Backend ready on http://localhost:3001
```

## Endpoints

### REST
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness — `{ ok, time, ships, zones, activeAlerts }` |
| GET | `/api/ships` | All 15 ships with current state |
| GET | `/api/ships/:shipId` | Single ship |
| GET | `/api/zones` | Active restricted zones |
| GET | `/api/alerts?status=active` | Alerts (active/acknowledged/resolved/all) |
| GET | `/api/history?from=&to=` | Snapshot timeline (last hour by default) |
| GET | `/api/history/all` | Full ring buffer |
| GET | `/api/fleet-config` | Bounding box + navigable polygon + ports |

### Socket.io (server → client)
- `fleet:snapshot` — once on connect (full state including ships, zones, navigablePolygon, ports)
- `fleet:update` — every tick (1 Hz) with all 15 ship states + serverTime
- `alert:new` / `alert:enriched` / `alert:resolved`
- `zone:update` (action: create/edit/delete)
- `directive:incoming` (only to target ship's room)
- `directive:response` (broadcast)
- `weather:update` (per ship)

### Socket.io (client → server)
- `auth:identify` — `{ role: 'command'|'captain', shipId? }`
- `zone:create` / `zone:edit` / `zone:delete` (Command only)
- `directive:send` (Command only)
- `directive:accept` / `directive:escalate` (Captain only — own ship)
- `distress:send` (Captain only — direct distress without directive)
- `alert:acknowledge`

## AI / NLP

Uses **Groq** (https://groq.com) with the `llama-3.3-70b-versatile` model via OpenAI-compatible function calling. Free tier available. The AI extracts structured info from captain distress messages:

```json
{
  "severity": "critical|high|medium|low",
  "category": "fire|flooding|medical|mechanical|piracy|weather|collision|other",
  "summary": "one-line summary",
  "casualties": { "injured": 0, "deceased": 0, "missing": 0 },
  "damage_estimate_usd": null,
  "time_sensitive": true,
  "requires_immediate_assistance": true,
  "suggested_actions": ["..."]
}
```

Calls are async with a 10-second timeout. Backend fires `alert:new` immediately, then `alert:enriched` when AI returns.

## Files

```
backend/
├── server.js                 # entry point
├── package.json              # 7 deps, no database
├── .env.example
├── config/env.js             # validates env vars
├── data/fleet.json           # provided by hackathon
├── simulator/
│   ├── seed.js               # parse fleet.json, build initial ships
│   ├── state.js              # in-memory Maps (ships/zones/alerts/directives)
│   └── tick.js               # 1Hz heart of the simulator
├── routing/
│   ├── grid.js               # walkability grid (10km cells)
│   ├── astar.js              # A* with closed set
│   ├── smooth.js             # Bresenham line-of-sight smoothing
│   └── index.js              # planRoute() with naive direct fallback
├── services/
│   ├── weather.js            # Open-Meteo Marine, 5min cache
│   ├── ai.js                 # Groq tool-use distress extraction
│   ├── alerts.js             # unified alert pipeline
│   └── history.js            # 30s snapshot ring buffer (capacity 120)
├── sockets/
│   ├── index.js              # Socket.io setup + auth:identify
│   └── handlers.js           # all client→server events
└── routes/api.js             # REST endpoints
```

## Documented Assumptions

- **No persistence** — state lives in memory only (PDF allows ring buffer for playback).
- **Ring buffer:** 120 snapshots = last hour at 30s resolution.
- **AI provider:** Groq with `llama-3.3-70b-versatile` model via OpenAI-compatible tool calling.
- `fleet.json` provides `[lat, lng]`. Internally we use GeoJSON `[lng, lat]`.
- **Fuel units:** tons.
- **Adverse weather:** wave_height > 2.5m OR wind_wave_height > 2.0m.
- **Adverse weather adds 30%** fuel multiplier.
- **Tick rate:** 1 Hz default.
- **Routing grid:** ~10km cells, A* + line-of-sight smoothing.
- **Arrival threshold:** < 1.0 km from destination.
- **Proximity threshold:** 2.0 km exactly.
- **AI timeout:** 10s. Fallback severity = 'high', category = 'other'.
- **AI cache:** identical messages 60s TTL.
