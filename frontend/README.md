# Fleet Command — Frontend

React + Vite + Leaflet + Zustand + Tailwind. Real-time UI for the Maritime Ops fleet command system.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

The dev server proxies `/api` and `/socket.io` to the backend on port 3001 — start the backend first.

## Pages

- `/login` — pick role (Command or Captain ship)
- `/command` — full fleet dashboard
- `/captain/:shipId` — single-ship bridge view

## Architecture

```
src/
├── App.jsx                          # router + role gate + socket connect
├── main.jsx
├── index.css                        # tailwind + dark map theme
├── lib/
│   ├── config.js                    # constants, status/severity colors
│   └── socket.js                    # singleton Socket.io client + event subscriptions
├── store/
│   ├── authStore.js                 # role, shipId (persisted)
│   └── fleetStore.js                # ships/zones/alerts/directives — single source of truth
├── hooks/
│   └── useShipAnimation.js          # RAF-based smooth interpolation
├── pages/
│   ├── Login.jsx
│   ├── CommandDashboard.jsx
│   └── CaptainDashboard.jsx
└── components/
    ├── sidebar/Sidebar.jsx
    ├── topbar/TopBar.jsx
    ├── map/
    │   ├── FleetMap.jsx
    │   ├── ShipMarker.jsx           # animated divIcon, smooth interp
    │   ├── ZoneLayer.jsx            # polygons
    │   ├── ZoneDrawTool.jsx         # leaflet-draw, Command-only
    │   ├── NavigablePolygon.jsx
    │   └── PortMarkers.jsx
    ├── alerts/RecentAlerts.jsx
    ├── playback/PlaybackTimeline.jsx
    └── panels/
        ├── StatCards.jsx
        ├── SelectedShipPanel.jsx
        ├── FleetStatus.jsx          # donut chart
        ├── WeatherOverview.jsx
        ├── AIDistressAnalysis.jsx
        └── DirectivesPanel.jsx
```

## Real-time Wiring

`lib/socket.js` connects to backend, subscribes to:
- `fleet:snapshot` — initial state on connect
- `fleet:update` — every 1 Hz tick
- `alert:new` / `alert:enriched` / `alert:resolved`
- `zone:update` (create/edit/delete)
- `directive:incoming` / `directive:response`
- `weather:update`

All events update `fleetStore` (Zustand). Components read via selectors and re-render only when their slice changes.

## Smooth Ship Motion

`useShipAnimation.js` runs a `requestAnimationFrame` loop that interpolates each ship's marker position between successive server ticks (1 Hz updates → 60 fps motion). Position is set via `marker.setLatLng()` directly — no React re-renders.

## Documented UX Choices

- Map basemap: OpenStreetMap public tiles (allowed by spec).
- Tiles dimmed via CSS filter to fit the dark UI.
- Ship markers are SVG triangle divIcons colored by status (normal=green, rerouting=amber, distressed=red pulsing, etc.).
- Zone drawing uses leaflet-draw, only available to Command role.
- Captain ESCALATE_DISTRESS opens a free-form prompt; backend AI analyzes severity and updates the alert via `alert:enriched`.
- Playback timeline pulls from `/api/history/all` (in-memory ring buffer, 120 snapshots = last hour at 30s).
