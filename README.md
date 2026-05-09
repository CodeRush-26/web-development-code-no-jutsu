[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/ncRwI7td)

# Maritime Ops — Fleet Command System

**Code Rush Web Dev Track** — real-time crisis ops dashboard for 15 cargo ships in the Strait of Hormuz.

- **Backend:** Node.js + Express + Socket.io + Turf.js + Groq AI (in-memory state, no database)
- **Frontend:** React + Vite + Leaflet + Zustand + Tailwind
- **AI:** Groq `llama-3.3-70b-versatile` via OpenAI-compatible function calling
- **Weather:** Open-Meteo Marine API (keyless)

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env and paste your GROQ_API_KEY (free at console.groq.com)
docker compose up --build
```
Open http://localhost:5173

## Quick Start (no Docker)

```bash
# Terminal 1 - backend
cd backend
npm install
cp .env.example .env       # paste GROQ_API_KEY
npm start

# Terminal 2 - frontend
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Required API Keys

| Key | Required | Where | Cost |
|---|---|---|---|
| `GROQ_API_KEY` | YES | https://console.groq.com → API Keys | Free tier |

Open-Meteo (weather) and OpenStreetMap (basemap) need no keys.

## Spec Compliance

| PDF Requirement | Status |
|---|---|
| Exactly 15 active ships | ✅ from fleet.json |
| 1 Hz tick rate | ✅ |
| ≤ 500ms propagation (95p) | ✅ measured ~3ms locally |
| Geofence breach alert ≤ 1s | ✅ |
| 2 km proximity threshold | ✅ |
| 30% extra fuel adverse weather | ✅ |
| 5+ concurrent users in sync | ✅ |
| Smooth interpolation | ✅ |
| 15 ships on map | ✅ |
| Click ship → cargo/fuel/etc. | ✅ |
| Command-only zone draw | ✅ |
| Visual + audible alerts | ✅ |
| Alerts persist until ack | ✅ |
| WebSocket only, no polling | ✅ |
| AI extracts severity/casualties | ✅ Groq |
| Real weather (Open-Meteo) | ✅ |
| Proximity in alert pipeline | ✅ |
| Playback (1hr / 30s steps) | ✅ |
| docker compose up | ✅ |
| Documented assumptions | ✅ |

## Documented Assumptions

- **No database** — state lives in memory; PDF allows ring buffer for playback. Ring buffer = 120 snapshots = last hour at 30s.
- **Backend restart** = fresh state from `fleet.json` (every team grades on the same fleet, per spec).
- `fleet.json` provides `[lat, lng]`. We store GeoJSON `[lng, lat]`.
- **Fuel units:** tons (per fleet.json).
- **Adverse weather:** wave_height > 2.5m OR wind_wave_height > 2.0m.
- **Routing:** A* on 10km grid + LOS smoothing; naive direct fallback (spec allows naive routing).
- **Arrival threshold:** < 1.0 km from destination port.
- **Proximity threshold:** 2.0 km exactly (spec).
- **AI:** Groq `llama-3.3-70b-versatile`, 10s timeout, fallback severity:high.
- **Map basemap:** OpenStreetMap public tiles (allowed by spec).
- **Captain auth:** select ship from dropdown; no password (hackathon scope).

## Project Layout

```
.
├── docker-compose.yml
├── .env.example
├── README.md
├── fleet.json
├── WEB DEVELOPMENT PROBLEM STATEMENT.pdf
├── backend/                   (in-memory simulator + Socket.io + Groq AI)
└── frontend/                  (React + Vite + Leaflet + Zustand)
```

## Bonuses Implemented

None yet — focused on locking in 60% core + 20% AI + 15% UX. Bonuses are tiebreakers only.
