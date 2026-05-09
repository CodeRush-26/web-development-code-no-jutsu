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

export default router;
