import * as turf from '@turf/turf';

const CELL_SIZE_KM = 10; // ~10km cells — coarser keeps A* fast for hackathon over the whole Gulf region

/**
 * Build a walkability grid over the bounding box.
 * cell = 1 if center is inside navigablePolygon AND not inside any zone.
 */
export function buildGrid(navigablePolygon, zones, cellSizeKm = CELL_SIZE_KM) {
  const bbox = turf.bbox(navigablePolygon); // [minLng, minLat, maxLng, maxLat]
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // approximate degrees per km at this latitude (~26°)
  const midLat = (minLat + maxLat) / 2;
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.320 * Math.cos((midLat * Math.PI) / 180);

  const latStep = cellSizeKm / kmPerDegLat;
  const lngStep = cellSizeKm / kmPerDegLng;

  const rows = Math.max(1, Math.ceil((maxLat - minLat) / latStep));
  const cols = Math.max(1, Math.ceil((maxLng - minLng) / lngStep));

  const cells = new Uint8Array(rows * cols);
  const navPoly = turf.polygon(navigablePolygon.coordinates);
  const zonePolys = zones.map((z) => turf.polygon(z.geometry.coordinates));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lng = minLng + (c + 0.5) * lngStep;
      const lat = minLat + (r + 0.5) * latStep;
      const pt = turf.point([lng, lat]);

      let walkable = turf.booleanPointInPolygon(pt, navPoly);
      if (walkable) {
        for (const zp of zonePolys) {
          if (turf.booleanPointInPolygon(pt, zp)) {
            walkable = false;
            break;
          }
        }
      }
      cells[r * cols + c] = walkable ? 1 : 0;
    }
  }

  return {
    rows,
    cols,
    cells,
    minLng,
    minLat,
    maxLng,
    maxLat,
    latStep,
    lngStep,
    cellSizeKm,
    navigablePolygon,
    zones
  };
}

export function rebuildForZones(grid, zones) {
  return buildGrid(grid.navigablePolygon, zones, grid.cellSizeKm);
}

export function lngLatToCell(grid, lng, lat) {
  const c = Math.floor((lng - grid.minLng) / grid.lngStep);
  const r = Math.floor((lat - grid.minLat) / grid.latStep);
  if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return null;
  return { r, c, idx: r * grid.cols + c };
}

export function cellToLngLat(grid, r, c) {
  const lng = grid.minLng + (c + 0.5) * grid.lngStep;
  const lat = grid.minLat + (r + 0.5) * grid.latStep;
  return [lng, lat];
}

export function isWalkable(grid, r, c) {
  if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return false;
  return grid.cells[r * grid.cols + c] === 1;
}
