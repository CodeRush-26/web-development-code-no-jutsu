import { v4 as uuidv4 } from 'uuid';
import * as state from '../simulator/state.js';
import { extractDistress } from './ai.js';

let io = null;

export function setIo(socketServer) {
  io = socketServer;
}

/**
 * Unified alert creation. All alert types funnel through here.
 * For 'distress' alerts, fires AI enrichment async (does not block).
 */
export function createAlert({
  type,
  severity = 'high',
  shipIds = [],
  zoneId,
  message = '',
  distressText
}) {
  const alert = {
    alertId: uuidv4(),
    type,
    severity,
    shipIds,
    zoneId: zoneId || null,
    message,
    aiExtracted: null,
    status: 'active',
    createdAt: Date.now(),
    resolvedAt: null
  };
  state.addAlert(alert);

  if (io) io.to('fleet').emit('alert:new', alert);

  if (type === 'distress' && distressText) {
    enrichDistressAsync(alert.alertId, distressText);
  }

  return alert;
}

async function enrichDistressAsync(alertId, distressText) {
  try {
    const { data, ok } = await extractDistress(distressText);
    state.updateAlert(alertId, {
      aiExtracted: data,
      severity: data.severity || 'high'
    });
    if (io) {
      io.to('fleet').emit('alert:enriched', {
        alertId,
        aiExtracted: data,
        severity: data.severity || 'high',
        ok
      });
    }
  } catch (err) {
    console.error('AI enrichment error', err.message);
  }
}

export function resolveAlert(alertId) {
  const updated = state.updateAlert(alertId, {
    status: 'resolved',
    resolvedAt: Date.now()
  });
  if (updated && io) io.to('fleet').emit('alert:resolved', { alertId });
  return updated;
}

export function listActiveAlerts() {
  return state.activeAlerts();
}
