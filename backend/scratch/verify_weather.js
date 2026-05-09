async function verifyWeather() {
  console.log('--- VERIFYING WEATHER AWARENESS ---');
  
  const API = 'http://localhost:3001/api';

  // 1. Get a ship (e.g., HAL-01)
  const shipsRes = await fetch(`${API}/ships`);
  const ships = await shipsRes.json();
  const ship = ships[0];
  console.log(`Testing with ship: ${ship.name} at ${JSON.stringify(ship.position.coordinates)}`);

  // 2. Create a STORM zone over the ship
  const [lng, lat] = ship.position.coordinates;
  const stormZone = {
    name: 'Super Storm X',
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [lng - 0.5, lat - 0.5],
        [lng + 0.5, lat - 0.5],
        [lng + 0.5, lat + 0.5],
        [lng - 0.5, lat + 0.5],
        [lng - 0.5, lat - 0.5]
      ]]
    },
    properties: { type: 'storm' }
  };

  console.log('Creating Storm zone...');
  await fetch(`${API}/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stormZone)
  });
  
  console.log('Waiting 3 seconds for logs... Check the backend terminal for [FUEL] logs with STORM multiplier.');
  await new Promise(r => setTimeout(r, 3000));

  // 3. Create a RESTRICTED zone to force reroute
  const restrictedZone = {
    name: 'Restricted Area Y',
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [lng + 0.1, lat - 0.1],
        [lng + 0.3, lat - 0.1],
        [lng + 0.3, lat + 0.1],
        [lng + 0.1, lat + 0.1],
        [lng + 0.1, lat - 0.1]
      ]]
    },
    properties: { type: 'restricted' }
  };
  
  console.log('Creating Restricted zone...');
  await fetch(`${API}/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(restrictedZone)
  });

  console.log('Check logs for "rerouting" and updated paths.');
}

verifyWeather().catch(console.error);
