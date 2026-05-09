import { create } from 'zustand';

export const useFleetStore = create((set, get) => ({
  // connection
  isConnected: false,
  lastServerTime: 0,

  // fleet (live)
  ships: new Map(),           // shipId -> ship object
  shipPrev: new Map(),        // shipId -> previous [lng, lat]
  shipUpdatedAt: new Map(),   // shipId -> ms timestamp

  // map config
  navigablePolygon: null,
  boundingBox: null,
  ports: [],

  // operations
  zones: new Map(),
  alerts: [],
  directives: [],
  weather: new Map(),

  // UI selection
  selectedShipId: null,

  // PLAYBACK MODE: when set, the map renders ships from this snapshot instead of live
  playbackTime: null,
  playbackShips: null, // Map<shipId, snapshotShip> | null

  setConnected: (b) => set({ isConnected: b }),

  applySnapshot: ({
    ships,
    zones,
    activeAlerts,
    navigablePolygon,
    boundingBox,
    ports,
    serverTime
  }) => {
    const shipMap = new Map();
    const prevMap = new Map();
    const tsMap = new Map();
    const now = Date.now();
    for (const s of ships || []) {
      shipMap.set(s.shipId, s);
      prevMap.set(s.shipId, s.position.coordinates.slice());
      tsMap.set(s.shipId, now);
    }
    const zoneMap = new Map();
    for (const z of zones || []) zoneMap.set(z.zoneId, z);
    set({
      ships: shipMap,
      shipPrev: prevMap,
      shipUpdatedAt: tsMap,
      zones: zoneMap,
      alerts: activeAlerts || [],
      navigablePolygon: navigablePolygon || null,
      boundingBox: boundingBox || null,
      ports: ports || [],
      lastServerTime: serverTime
    });
  },

  applyUpdate: ({ ships, serverTime }) => {
    const cur = get();
    const newShips = new Map(cur.ships);
    const newPrev = new Map(cur.shipPrev);
    const newTs = new Map(cur.shipUpdatedAt);
    const now = Date.now();
    for (const s of ships) {
      const old = newShips.get(s.shipId);
      newPrev.set(
        s.shipId,
        old ? old.position.coordinates.slice() : s.position.coordinates.slice()
      );
      newShips.set(s.shipId, s);
      newTs.set(s.shipId, now);
    }
    set({
      ships: newShips,
      shipPrev: newPrev,
      shipUpdatedAt: newTs,
      lastServerTime: serverTime
    });
  },

  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts] })),

  enrichAlert: ({ alertId, aiExtracted, severity }) =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.alertId === alertId
          ? { ...a, aiExtracted, severity: severity || a.severity }
          : a
      )
    })),

  resolveAlert: (alertId) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.alertId !== alertId) })),

  applyZoneUpdate: ({ action, zone }) => {
    const next = new Map(get().zones);
    if (action === 'delete') next.delete(zone.zoneId);
    else next.set(zone.zoneId, zone);
    set({ zones: next });
  },

  addDirective: (dir) => set((s) => ({ directives: [dir, ...s.directives] })),

  updateDirective: ({ directiveId, response, distressMessage }) =>
    set((s) => ({
      directives: s.directives.map((d) =>
        d.directiveId === directiveId
          ? { ...d, status: response, distressMessage }
          : d
      )
    })),

  updateWeather: ({ shipId, conditions }) => {
    const next = new Map(get().weather);
    next.set(shipId, conditions);
    set({ weather: next });
  },

  selectShip: (shipId) => set({ selectedShipId: shipId }),
  clearSelection: () => set({ selectedShipId: null }),

  // playback control
  setPlaybackSnapshot: (snap) => {
    if (!snap) {
      set({ playbackTime: null, playbackShips: null });
      return;
    }
    const m = new Map();
    for (const s of snap.ships || []) m.set(s.shipId, s);
    set({ playbackTime: snap.timestamp, playbackShips: m });
  }
}));
