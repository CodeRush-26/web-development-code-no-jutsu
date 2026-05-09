import * as turf from '@turf/turf';

const CELL_SIZE_KM = 5; // ~5km cells — fine enough to navigate the Strait of Hormuz channel
const WEATHER_COST_MULTIPLIER = 2.0; // cells with adverse weather cost 2x more to traverse

/**
 * Build a cost grid over the bounding box.
 * cell cost: 0 = unwalkable, 1.0 = normal, >1.0 = adverse weather penalty.
 * Weather overlay is applied via applyWeatherOverlay() after weather data arrives.
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

  const cells = new Float32Array(rows * cols); // 0=blocked, 1=normal, >1=weather penalty
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
      cells[r * cols + c] = walkable ? 1.0 : 0;
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

/**
 * Apply weather overlay: for each ship with adverse weather, mark cells
 * within ~30km radius of that ship as having weather penalty cost.
 * Called periodically when weather data refreshes.
 */
export function applyWeatherOverlay(grid, adverseShipPositions) {
  // Reset all walkable cells to base cost 1.0
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i] > 0) grid.cells[i] = 1.0;
  }

  // For each adverse weather position, penalize nearby cells
  const radiusCells = Math.ceil(30 / grid.cellSizeKm); // ~30km weather radius
  for (const [lng, lat] of adverseShipPositions) {
    const centerC = Math.floor((lng - grid.minLng) / grid.lngStep);
    const centerR = Math.floor((lat - grid.minLat) / grid.latStep);

    for (let dr = -radiusCells; dr <= radiusCells; dr++) {
      for (let dc = -radiusCells; dc <= radiusCells; dc++) {
        if (dr * dr + dc * dc > radiusCells * radiusCells) continue; // circular
        const r = centerR + dr;
        const c = centerC + dc;
        if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) continue;
        const idx = r * grid.cols + c;
        if (grid.cells[idx] > 0) {
          grid.cells[idx] = Math.max(grid.cells[idx], WEATHER_COST_MULTIPLIER);
        }
      }
    }
  }
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
  return grid.cells[r * grid.cols + c] > 0;
}

/**
 * Get the traversal cost of a cell. Returns 0 for unwalkable, 1.0 for normal,
 * >1.0 for weather-penalized cells.
 */
export function cellCost(grid, r, c) {
  if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return 0;
  return grid.cells[r * grid.cols + c];
}
