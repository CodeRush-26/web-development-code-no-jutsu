import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLEET_PATH = path.resolve(__dirname, '../data/fleet.json');

let fleetData = null;

export async function loadFleetJson() {
  if (fleetData) return fleetData;
  const raw = await readFile(FLEET_PATH, 'utf-8');
  fleetData = JSON.parse(raw);
  return fleetData;
}

/**
 * fleet.json provides positions in [lat, lng]. Internally we use GeoJSON [lng, lat].
 * navigableWater polygon is converted similarly. Destination IDs are resolved to
 * { portId, portName, coordinates } via the ports[] catalog.
 */
export async function getFleetConfig() {
  const data = await loadFleetJson();

  const navCoords = data.navigableWater.map(([lat, lng]) => [lng, lat]);
  if (
    navCoords.length &&
    (navCoords[0][0] !== navCoords[navCoords.length - 1][0] ||
      navCoords[0][1] !== navCoords[navCoords.length - 1][1])
  ) {
    navCoords.push(navCoords[0]);
  }

  const navigablePolygon = {
    type: 'Polygon',
    coordinates: [navCoords]
  };

  const portsById = new Map(
    data.ports.map((p) => [
      p.id,
      {
        portId: p.id,
        portName: p.name,
        coordinates: [p.position[1], p.position[0]] // [lng, lat]
      }
    ])
  );

  return {
    scenario: data.scenario,
    boundingBox: data.boundingBox,
    navigablePolygon,
    portsById,
    ports: [...portsById.values()],
    rawFleet: data.fleet
  };
}

/**
 * Build the initial fleet of 15 ship objects (in-memory shape).
 */
export async function buildInitialShips() {
  const cfg = await getFleetConfig();
  const ships = cfg.rawFleet.map((s) => {
    const dest = cfg.portsById.get(s.destination) || null;
    const [lat, lng] = s.position;
    return {
      shipId: s.shipId,
      name: s.name,
      position: { type: 'Point', coordinates: [lng, lat] },
      heading: s.heading,
      speed: s.speed,
      maxSpeed: 25,
      destination: dest,
      fuel: s.fuel,
      fuelCapacity: Math.max(s.fuel * 1.5, 10000),
      cargo: s.cargo,
      status: s.status || 'normal',
      currentPath: [],
      pathIndex: 0,
      inAdverseWeather: false,
      lastUpdated: new Date()
    };
  });
  return { ships, config: cfg };
}
