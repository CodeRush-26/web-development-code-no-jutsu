import { WifiOff } from 'lucide-react';
import { useFleetStore } from '../../store/fleetStore';

export default function ConnectionBanner() {
  const isConnected = useFleetStore((s) => s.isConnected);
  if (isConnected) return null;
  return (
    <div className="disconnect-banner">
      <WifiOff className="w-4 h-4" />
      <span>Connection lost. Reconnecting…</span>
    </div>
  );
}
