import { useEffect, useRef } from 'react';
import { useFleetStore } from '../store/fleetStore';
import { TICK_MS } from '../lib/config';

/**
 * Smoothly interpolate a Leaflet marker between server updates using RAF.
 * In PLAYBACK mode (state.playbackShips set), we snap to the snapshot position
 * instead of interpolating.
 */
export function useShipAnimation(shipId, getMarker) {
  const rafRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    function frame() {
      if (!mounted) return;
      const state = useFleetStore.getState();
      const marker = getMarker();
      if (!marker) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // playback override
      if (state.playbackShips) {
        const ps = state.playbackShips.get(shipId);
        if (ps) {
          const [lng, lat] = ps.position.coordinates;
          marker.setLatLng([lat, lng]);
          const el = marker.getElement();
          if (el) el.style.setProperty('--rot', `${ps.heading || 0}deg`);
        }
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // live interpolation
      const ship = state.ships.get(shipId);
      const prev = state.shipPrev.get(shipId);
      const updatedAt = state.shipUpdatedAt.get(shipId);
      if (ship && prev && updatedAt) {
        const t = Math.min(Math.max((Date.now() - updatedAt) / TICK_MS, 0), 1);
        const target = ship.position.coordinates;
        const lng = prev[0] + (target[0] - prev[0]) * t;
        const lat = prev[1] + (target[1] - prev[1]) * t;
        marker.setLatLng([lat, lng]);
        const el = marker.getElement();
        if (el) el.style.setProperty('--rot', `${ship.heading || 0}deg`);
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [shipId, getMarker]);
}
