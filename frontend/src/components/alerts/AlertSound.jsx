import { useEffect, useRef } from 'react';
import { useFleetStore } from '../../store/fleetStore';
import { playSeverity, unlockAudio } from '../../lib/audio';

/**
 * Audible alert: when a new alertId appears in the store, play a tone keyed
 * to its severity. Browser autoplay policy requires a user gesture to enable
 * audio — we attach a one-time click listener to unlock it.
 */
export default function AlertSound() {
  const lastIdsRef = useRef(new Set());
  const initRef = useRef(false);

  useEffect(() => {
    // seed with whatever alerts are already present (don't beep on initial snapshot)
    const initial = useFleetStore.getState().alerts;
    for (const a of initial) lastIdsRef.current.add(a.alertId);
    initRef.current = true;

    const onClick = () => unlockAudio();
    window.addEventListener('click', onClick, { once: true });

    const unsub = useFleetStore.subscribe((state) => {
      if (!initRef.current) return;
      for (const a of state.alerts) {
        if (!lastIdsRef.current.has(a.alertId)) {
          lastIdsRef.current.add(a.alertId);
          playSeverity(a.severity || 'high');
        }
      }
    });

    return () => {
      unsub();
      window.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}
