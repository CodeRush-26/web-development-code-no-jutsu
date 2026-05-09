import { useState } from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import TopBar from '../components/topbar/TopBar';
import StatCards from '../components/panels/StatCards';
import FleetMap from '../components/map/FleetMap';
import SelectedShipPanel from '../components/panels/SelectedShipPanel';
import RecentAlerts from '../components/alerts/RecentAlerts';
import AlertSound from '../components/alerts/AlertSound';
import PlaybackTimeline from '../components/playback/PlaybackTimeline';
import FleetStatus from '../components/panels/FleetStatus';
import WeatherOverview from '../components/panels/WeatherOverview';
import AIDistressAnalysis from '../components/panels/AIDistressAnalysis';
import DirectivesPanel from '../components/panels/DirectivesPanel';
import ShipsTable from '../components/panels/ShipsTable';
import ZonesPanel from '../components/panels/ZonesPanel';
import { useFleetStore } from '../store/fleetStore';

export default function CommandDashboard() {
  const [active, setActive] = useState('dashboard');
  const selectedShipId = useFleetStore((s) => s.selectedShipId);

  return (
    <div className="h-screen flex bg-bg-base text-ink-1">
      <AlertSound />
      <Sidebar active={active} onChange={setActive} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar centerLabel="Command Center" />

        <main id="dashboard-main" className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {/* Top stats — anchor: dashboard */}
          <section id="section-top">
            <StatCards />
          </section>

          {/* Map + side rail */}
          <section id="section-map" className="grid grid-cols-[1fr_340px] gap-4">
            <div className="card overflow-hidden h-[520px]">
              <FleetMap mode="command" />
            </div>

            <div className="space-y-4">
              {selectedShipId ? <SelectedShipPanel /> : <SelectedPlaceholder />}
              <div id="section-alerts">
                <RecentAlerts />
              </div>
            </div>
          </section>

          {/* Fleet + Weather */}
          <section className="grid grid-cols-2 gap-4">
            <FleetStatus />
            <div id="section-weather">
              <WeatherOverview />
            </div>
          </section>

          {/* AI + Directives */}
          <section className="grid grid-cols-2 gap-4">
            <div id="section-ai">
              <AIDistressAnalysis />
            </div>
            <div id="section-directives">
              <DirectivesPanel />
            </div>
          </section>

          {/* Ships table — what backend exposes via /api/ships and fleet:update */}
          <section id="section-ships">
            <ShipsTable />
          </section>

          {/* Zones management */}
          <section id="section-zones">
            <ZonesPanel />
          </section>

          {/* Playback */}
          <section id="section-playback">
            <PlaybackTimeline />
          </section>
        </main>
      </div>
    </div>
  );
}

function SelectedPlaceholder() {
  return (
    <div className="card p-6 text-center">
      <p className="text-[10px] text-ink-3 uppercase tracking-widest mb-2">Selected Ship</p>
      <p className="text-sm text-ink-3">Click a ship on the map to see live details</p>
    </div>
  );
}
