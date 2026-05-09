import * as turf from '@turf/turf';
import { isWalkable, cellToLngLat } from './grid.js';

/**
 * Greedy line-of-sight smoothing. From cell i, we try to jump straight to the
 * farthest cell j whose connecting segment is (a) walkable at cell resolution
 * and (b) entirely inside the navigable-water polygon at sub-cell resolution.
 *
 * Why the sub-cell polygon check matters: with 5 km cells the Bresenham trace
 * only checks cell centers along the diagonal. A line whose endpoint cells are
 * both in water can still nick land between the cell centers — this is what
 * caused ship paths to appear to cross peninsulas. Sampling the great-circle
 * line every ~half-cell prevents that.
 */
export function smoothPath(cellPath, grid) {
  if (!cellPath || cellPath.length <= 2) {
    return (cellPath || []).map((cell) => cellToLngLat(grid, cell.r, cell.c));
  }

  const navPoly = grid.navigablePolygon
    ? turf.polygon(grid.navigablePolygon.coordinates)
    : null;

  const result = [cellPath[0]];
  let i = 0;
  while (i < cellPath.length - 1) {
    let j = cellPath.length - 1;
    while (j > i + 1) {
      if (lineOfSight(grid, cellPath[i], cellPath[j], navPoly)) break;
      j--;
    }
    result.push(cellPath[j]);
    i = j;
  }

  return result.map((cell) => cellToLngLat(grid, cell.r, cell.c));
}

function lineOfSight(grid, a, b, navPoly) {
  // 1. Cell-resolution Bresenham walkability check
  let r0 = a.r;
  let c0 = a.c;
  const r1 = b.r;
  const c1 = b.c;
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dc - dr;

  while (true) {
    if (!isWalkable(grid, r0, c0)) return false;
    if (r0 === r1 && c0 === c1) break;
    const e2 = 2 * err;
    if (e2 > -dr) {
      err -= dr;
      c0 += sc;
    }
    if (e2 < dc) {
      err += dc;
      r0 += sr;
    }
  }

  // 2. Sub-cell polygon containment check
  if (!navPoly) return true;
  const [aLng, aLat] = cellToLngLat(grid, a.r, a.c);
  const [bLng, bLat] = cellToLngLat(grid, b.r, b.c);
  const samples = Math.max(8, Math.ceil(Math.max(dr, dc) * 2));
  for (let k = 1; k < samples; k++) {
    const t = k / samples;
    const lng = aLng + (bLng - aLng) * t;
    const lat = aLat + (bLat - aLat) * t;
    if (!turf.booleanPointInPolygon(turf.point([lng, lat]), navPoly)) {
      return false;
    }
  }
  return true;
}
