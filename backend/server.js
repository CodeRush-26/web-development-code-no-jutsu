import http from 'node:http';
import express from 'express';
import cors from 'cors';

import { env } from './config/env.js';
import { buildInitialShips } from './simulator/seed.js';
import * as state from './simulator/state.js';
import { initGrid } from './routing/index.js';
import { startTickLoop, stopTickLoop } from './simulator/tick.js';
import { startHistoryWriter, stopHistoryWriter } from './services/history.js';
import { attachSocketServer } from './sockets/index.js';
import apiRoutes from './routes/api.js';

async function main() {
  // 1. Load fleet.json + build in-memory ships
  const { ships, config } = await buildInitialShips();
  state.setFleetConfig(config);
  state.loadInitialShips(ships);

  // 2. Build routing grid (navigable polygon + zones, but no zones yet at boot)
  initGrid(config.navigablePolygon, []);

  // 2b. Pre-plan initial paths so tick 1 doesn't blow the 1Hz budget.
  const { planRoute } = await import('./routing/index.js');
  let planned = 0;
  for (const ship of state.allShips()) {
    const result = planRoute(ship);
    if (result.path) {
      ship.currentPath = result.path;
      ship.pathIndex = 0;
      planned++;
    }
  }
  console.log(`✓ Pre-planned ${planned}/${state.allShips().length} initial routes`);

  // 3. Express + HTTP server
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', apiRoutes);
  app.get('/', (req, res) =>
    res.json({ name: 'fleet-backend', status: 'ok', time: Date.now() })
  );

  const httpServer = http.createServer(app);

  // 4. Socket.io
  const io = attachSocketServer(httpServer);

  // 5. Simulator tick
  startTickLoop(io);

  // 6. History ring buffer
  startHistoryWriter();

  // 7. Listen
  httpServer.listen(env.PORT, () => {
    console.log(`✓ Backend ready on http://localhost:${env.PORT}`);
    console.log(`  Health:   GET  /api/health`);
    console.log(`  Ships:    GET  /api/ships`);
    console.log(`  Socket:   ws://localhost:${env.PORT}`);
  });

  // 8. Graceful shutdown
  const shutdown = (sig) => {
    console.log(`\n${sig} received — shutting down`);
    stopTickLoop();
    stopHistoryWriter();
    io.close();
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('✗ Boot failed:', err);
  process.exit(1);
});
