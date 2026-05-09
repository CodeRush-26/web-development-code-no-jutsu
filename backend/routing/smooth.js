import { isWalkable, cellToLngLat } from './grid.js';

/**
 * Line-of-sight smoothing using Bresenham-style traversal.
 * Greedy: from i, find farthest j such that all cells on the segment are walkable, jump to j.
 */
export function smoothPath(cellPath, grid) {
  if (!cellPath || cellPath.length <= 2) {
    return (cellPath || []).map((cell) => cellToLngLat(grid, cell.r, cell.c));
  }

  const result = [cellPath[0]];
  let i = 0;
  while (i < cellPath.length - 1) {
    let j = cellPath.length - 1;
    while (j > i + 1) {
      if (lineOfSight(grid, cellPath[i], cellPath[j])) break;
      j--;
    }
    result.push(cellPath[j]);
    i = j;
  }

  return result.map((cell) => cellToLngLat(grid, cell.r, cell.c));
}

function lineOfSight(grid, a, b) {
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
    if (r0 === r1 && c0 === c1) return true;
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
}
