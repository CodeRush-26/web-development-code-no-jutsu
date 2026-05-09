import { Router } from 'express';
import * as state from '../simulator/state.js';
import { getHistoryRange, allSnapshots } from '../services/history.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    time: Date.now(),
    ships: state.allShips().length,
    zones: state.allZones().length,
    activeAlerts: state.activeAlerts().length
  });
});

router.get('/ships', (req, res) => {
  res.json(state.allShips());
});

router.get('/ships/:shipId', (req, res) => {
  const ship = state.getShip(req.params.shipId);
  if (!ship) return res.status(404).json({ error: 'not_found' });
  res.json(ship);
});

router.get('/zones', (req, res) => {
  res.json(state.allZones());
});

router.get('/alerts', (req, res) => {
  const { status = 'active' } = req.query;
  if (status === 'all') return res.json(state.allAlerts());
  if (status === 'active') return res.json(state.activeAlerts());
  res.json(state.allAlerts().filter((a) => a.status === status));
});

router.get('/history', (req, res) => {
  const to = req.query.to ? Number(req.query.to) : Date.now();
  const from = req.query.from ? Number(req.query.from) : to - 3600_000;
  const events = getHistoryRange(from, to);
  res.json({ from, to, count: events.length, events });
});

router.get('/history/all', (req, res) => {
  res.json(allSnapshots());
});

router.get('/fleet-config', (req, res) => {
  const cfg = state.getFleetConfig();
  if (!cfg) return res.status(503).json({ error: 'not_ready' });
  res.json({
    boundingBox: cfg.boundingBox,
    navigablePolygon: cfg.navigablePolygon,
    ports: cfg.ports
  });
});

/**
 * POST /api/fleet/reset
 * Refuels all ships to full capacity and resets status to 'normal'.
 * Use for hackathon demos after a long simulation run.
 */
router.post('/fleet/reset', (req, res) => {
  const ships = state.allShips();
  for (const ship of ships) {
    state.setShip(ship.shipId, {
      fuel: ship.fuelCapacity,
      status: 'normal',
      speed: ship.maxSpeed || 14,
      currentPath: [],
      pathIndex: 0
    });
  }
  for (const key of [...state.activeAlertKeys]) {
    if (key.startsWith('fuel:') || key.startsWith('predict-fuel:') || key.startsWith('stranded:')) {
      state.activeAlertKeys.delete(key);
    }
  }
  res.json({ ok: true, ships: ships.length, message: 'Fleet refueled and reset to normal' });
});

export default router;
