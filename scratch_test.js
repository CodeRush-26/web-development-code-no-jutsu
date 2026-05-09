import * as turf from '@turf/turf';
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./backend/data/fleet.json', 'utf8'));

const navCoords = data.navigableWater.map(([lat, lng]) => [lng, lat]);
if (navCoords[0][0] !== navCoords[navCoords.length - 1][0] || navCoords[0][1] !== navCoords[navCoords.length - 1][1]) {
  navCoords.push(navCoords[0]);
}

const navPoly = turf.polygon([navCoords]);

data.ports.forEach(p => {
  const pt = turf.point([p.position[1], p.position[0]]);
  const inside = turf.booleanPointInPolygon(pt, navPoly);
  console.log(`Port ${p.name}: inside = ${inside}`);
});

data.fleet.forEach(s => {
  const pt = turf.point([s.position[1], s.position[0]]);
  const inside = turf.booleanPointInPolygon(pt, navPoly);
  console.log(`Ship ${s.name}: inside = ${inside}`);
});
