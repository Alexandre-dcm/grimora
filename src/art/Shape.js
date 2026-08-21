/**
 * Coordinate-based pixel authoring (ART_BIBLE.md §2 / §5).
 *
 * For large or symmetric assets, character grids get unwieldy — so those are
 * authored with explicit integer coordinates instead. Same output, same rules:
 * axis-aligned blocks, stepped diagonals, hard edges, master palette only.
 *
 * Pure data — no DOM. Node-safe so it can be linted and previewed offline.
 */

const T = ".";

export class Shape {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Array(w * h).fill(T);
  }

  px(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.d[y * this.w + x] = c;
    return this;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T;
    return this.d[y * this.w + x];
  }

  solid(x, y) {
    return this.get(x, y) !== T;
  }

  box(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  /** Horizontal run. */
  run(x, y, w, c) {
    for (let i = 0; i < w; i++) this.px(x + i, y, c);
    return this;
  }

  /** Vertical run. */
  col(x, y, h, c) {
    for (let j = 0; j < h; j++) this.px(x, y + j, c);
    return this;
  }

  /**
   * Per-row spans starting at row `y`: [[x, width], ...].
   * The primary tool for authoring an organic silhouette by hand.
   */
  spans(y, list, c) {
    list.forEach(([x, w], j) => this.run(x, y + j, w, c));
    return this;
  }

  /** Trapezoid: width lerps from wTop to wBot over h rows, centered on cx. */
  taper(cx, y, h, wTop, wBot, c) {
    for (let j = 0; j < h; j++) {
      const w = Math.max(1, Math.round(wTop + ((wBot - wTop) * j) / Math.max(1, h - 1)));
      this.run(cx - Math.floor(w / 2), y + j, w, c);
    }
    return this;
  }

  /** Stepped diagonal: `steps` runs of `run` px, moving by (dx, dy) each step. */
  step(x, y, steps, run, dx, dy, c) {
    let cx = x;
    let cy = y;
    for (let s = 0; s < steps; s++) {
      this.run(dx < 0 ? cx - run + 1 : cx, cy, run, c);
      cx += dx * run;
      cy += dy;
    }
    return this;
  }

  /** 50% checker dither in a box; only over existing pixels if `over`. */
  dither(x, y, w, h, c, phase = 0, over = false) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if ((i + j + phase) % 2) continue;
        if (over && !this.solid(x + i, y + j)) continue;
        this.px(x + i, y + j, c);
      }
    }
    return this;
  }

  /** Replace one char with another inside an optional box. */
  swap(from, to, x = 0, y = 0, w = this.w, h = this.h) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (this.get(i, j) === from) this.px(i, j, to);
      }
    }
    return this;
  }

  /** Mirror the left half onto the right half (frontal symmetry). */
  mirrorMerge() {
    const half = Math.floor(this.w / 2);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < half; x++) {
        const c = this.get(x, y);
        if (c !== T) this.px(this.w - 1 - x, y, c);
      }
    }
    return this;
  }

  /** Draw a block and its mirror image in one call. */
  symBox(x, y, w, h, c) {
    this.box(x, y, w, h, c);
    this.box(this.w - x - w, y, w, h, c);
    return this;
  }

  symPx(x, y, c) {
    this.px(x, y, c);
    this.px(this.w - 1 - x, y, c);
    return this;
  }

  /** 1px outline in `c` around every opaque cluster. */
  outline(c = "0") {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.solid(x, y)) continue;
        if (this.solid(x - 1, y) || this.solid(x + 1, y) || this.solid(x, y - 1) || this.solid(x, y + 1)) {
          add.push([x, y]);
        }
      }
    }
    for (const [x, y] of add) this.px(x, y, c);
    return this;
  }

  /** Contact shadow bar under the silhouette. */
  contact(c = "1", inset = 3) {
    let minX = this.w;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.solid(x, y)) {
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxY < 0) return this;
    for (let x = 0; x < this.w; x++) {
      for (let y = maxY; y >= Math.max(0, maxY - 4); y--) {
        if (this.solid(x, y)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          break;
        }
      }
    }
    const y = Math.min(this.h - 1, maxY + 1);
    this.run(minX + inset, y, Math.max(1, maxX - minX + 1 - inset * 2), c);
    return this;
  }

  toRows() {
    const rows = [];
    for (let y = 0; y < this.h; y++) {
      rows.push(this.d.slice(y * this.w, (y + 1) * this.w).join(""));
    }
    return rows;
  }
}

export function shape(w, h, build) {
  const s = new Shape(w, h);
  build(s);
  return s.toRows();
}

/** Tiny deterministic PRNG for seeded procedural sprites. */
export function seeded(seed) {
  let s = (seed | 0) || 1;
  return function next() {
    s = (Math.imul(s ^ (s >>> 15), s | 1) ^ (s + Math.imul(s ^ (s >>> 7), s | 61))) >>> 0;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}
