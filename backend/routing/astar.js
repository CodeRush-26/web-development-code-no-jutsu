import { isWalkable, cellToLngLat, cellCost } from './grid.js';
import * as turf from '@turf/turf';

/**
 * Min-heap priority queue (binary heap).
 */
class PriorityQueue {
  constructor() {
    this.heap = [];
  }
  push(item, priority) {
    this.heap.push({ item, priority });
    this._siftUp(this.heap.length - 1);
  }
  pop() {
    if (!this.heap.length) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length) {
      this.heap[0] = last;
      this._siftDown(0);
    }
    return top.item;
  }
  get size() {
    return this.heap.length;
  }
  _siftUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].priority > this.heap[i].priority) {
        [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
        i = parent;
      } else break;
    }
  }
  _siftDown(i) {
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let best = i;
      if (l < n && this.heap[l].priority < this.heap[best].priority) best = l;
      if (r < n && this.heap[r].priority < this.heap[best].priority) best = r;
      if (best !== i) {
        [this.heap[best], this.heap[i]] = [this.heap[i], this.heap[best]];
        i = best;
      } else break;
    }
  }
}

const NEIGHBORS = [
  [-1, -1, Math.SQRT2],
  [-1, 0, 1],
  [-1, 1, Math.SQRT2],
  [0, -1, 1],
  [0, 1, 1],
  [1, -1, Math.SQRT2],
  [1, 0, 1],
  [1, 1, Math.SQRT2]
];

/**
 * A* search on the grid. Returns array of cell indices or null.
 * `allowStartUnwalkable`: when ship starts inside a zone, treat the start cell as walkable.
 */
export function findPath(grid, startCell, goalCell, { allowStartUnwalkable = false } = {}) {
  const startIdx = startCell.r * grid.cols + startCell.c;
  const goalIdx = goalCell.r * grid.cols + goalCell.c;

  if (!allowStartUnwalkable && !isWalkable(grid, startCell.r, startCell.c)) return null;
  if (!isWalkable(grid, goalCell.r, goalCell.c)) {
    // Goal is blocked. If it's inside a zone, return null (ship is stranded).
    // Only snap for edge-of-map cases, not zone blocks.
    return null;
  }

  const open = new PriorityQueue();
  const cameFrom = new Map();
  const gScore = new Map();
  const closed = new Set();
  gScore.set(startIdx, 0);
  open.push({ r: startCell.r, c: startCell.c }, heuristic(grid, startCell, goalCell));

  let iter = 0;
  const MAX_ITER = grid.rows * grid.cols;

  while (open.size) {
    if (iter++ > MAX_ITER) return null;
    const cur = open.pop();
    const curIdx = cur.r * grid.cols + cur.c;
    if (closed.has(curIdx)) continue;
    closed.add(curIdx);

    if (cur.r === goalCell.r && cur.c === goalCell.c) {
      return reconstructPath(cameFrom, curIdx, grid);
    }

    const isStart = cur.r === startCell.r && cur.c === startCell.c;
    const curWalkable = isWalkable(grid, cur.r, cur.c);
    if (!curWalkable && !(allowStartUnwalkable && isStart)) continue;

    for (const [dr, dc, cost] of NEIGHBORS) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (!isWalkable(grid, nr, nc)) continue;
      const nIdx = nr * grid.cols + nc;
      if (closed.has(nIdx)) continue;
      // Multiply base cost by cell's weather cost (1.0 = clear, 2.0 = adverse weather)
      const weatherCost = cellCost(grid, nr, nc) || 1;
      const tentativeG = (gScore.get(curIdx) ?? Infinity) + cost * weatherCost;
      if (tentativeG < (gScore.get(nIdx) ?? Infinity)) {
        cameFrom.set(nIdx, curIdx);
        gScore.set(nIdx, tentativeG);
        const f = tentativeG + heuristic(grid, { r: nr, c: nc }, goalCell);
        open.push({ r: nr, c: nc }, f);
      }
    }
  }

  return null;
}

function heuristic(grid, a, b) {
  const [aLng, aLat] = cellToLngLat(grid, a.r, a.c);
  const [bLng, bLat] = cellToLngLat(grid, b.r, b.c);
  // haversine distance in km
  return turf.distance(turf.point([aLng, aLat]), turf.point([bLng, bLat]), {
    units: 'kilometers'
  });
}

function reconstructPath(cameFrom, currentIdx, grid) {
  const cells = [currentIdx];
  let cur = currentIdx;
  while (cameFrom.has(cur)) {
    cur = cameFrom.get(cur);
    cells.push(cur);
  }
  cells.reverse();
  return cells.map((idx) => {
    const r = Math.floor(idx / grid.cols);
    const c = idx % grid.cols;
    return { r, c };
  });
}

function nearestWalkable(grid, r0, c0, maxRadius) {
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
        const r = r0 + dr;
        const c = c0 + dc;
        if (isWalkable(grid, r, c)) return { r, c };
      }
    }
  }
  return null;
}
