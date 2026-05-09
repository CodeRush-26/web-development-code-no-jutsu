import { useEffect, useState } from 'react';
import { useFleetStore } from '../../store/fleetStore';

/**
 * Visual heartbeat — pulses every time a fleet:update tick arrives.
 * Confirms live data flow at a glance.
 */
export default function TickPulse() {
  const [beat, setBeat] = useState(false);
  const lastServerTime = useFleetStore((s) => s.lastServerTime);

  useEffect(() => {
    if (!lastServerTime) return;
    setBeat(true);
    const t = setTimeout(() => setBeat(false), 120);
    return () => clearTimeout(t);
  }, [lastServerTime]);

  return <span className={`tick-dot ${beat ? 'beat' : ''}`} title="Live tick" />;
}
