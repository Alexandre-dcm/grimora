/**
 * Pixel-art authoring core.
 *
 * A PixelGrid is a character matrix where every char addresses the master
 * palette (see Palette.js) and "." / " " means transparent. Grids are:
 *   - merged into integer rect spans (run-length horizontally, then vertically),
 *   - emitted as real SVG (crispEdges, integer coords, no curves/gradients),
 *   - rasterized ONCE into an offscreen canvas at 1 art-pixel = 1 canvas-pixel.
 *
 * Because the SVG is literally a list of axis-aligned integer rects, the SVG
 * raster and the direct raster are pixel-identical — the direct path exists
 * purely as an offline-safe fallback.
 *
 * See ART_BIBLE.md §2.
 */

import { PALETTE } from "./Palette.js";

const TRANSPARENT = ".";

export class PixelGrid {
  constructor(w, h, chars) {
    this.w = w;
    this.h = h;
    this.chars = chars || new Array(w * h).fill(TRANSPARENT);
  }

  /** Build from an array of equal-or-ragged length strings. */
  static from(rows) {
    const h = rows.length;
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const chars = new Array(w * h).fill(TRANSPARENT);
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        chars[y * w + x] = c === " " ? TRANSPARENT : c;
      }
    }
    return new PixelGrid(w, h, chars);
  }

  static empty(w, h) {
    return new PixelGrid(w, h);
  }

  clone() {
    return new PixelGrid(this.w, this.h, this.chars.slice());
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return TRANSPARENT;
    return this.chars[y * this.w + x];
  }

  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.chars[y * this.w + x] = c;
    return this;
  }

  isSolid(x, y) {
    return this.get(x, y) !== TRANSPARENT;
  }

  /** Grow the canvas, keeping content at (dx, dy). */
  resized(w, h, dx = 0, dy = 0) {
    const out = PixelGrid.empty(w, h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c !== TRANSPARENT) out.set(x + dx, y + dy, c);
      }
    }
    return out;
  }

  mirrorX() {
    const out = PixelGrid.empty(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        out.set(this.w - 1 - x, y, this.get(x, y));
      }
    }
    return out;
  }

  /** Vertical flip. Only meaningful for orientation-agnostic art (ground tiles). */
  mirrorY() {
    const out = PixelGrid.empty(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        out.set(x, this.h - 1 - y, this.get(x, y));
      }
    }
    return out;
  }

  /**
   * Offset a horizontal band of rows — the workhorse of pixel animation.
   * The band's original area is cleared and the band is re-drawn on top,
   * so a shifted arm correctly overlaps the torso.
   */
  shiftBand(y0, y1, dx, dy = 0) {
    const out = this.clone();
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < this.w; x++) out.set(x, y, TRANSPARENT);
    }
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c !== TRANSPARENT) out.set(x + dx, y + dy, c);
      }
    }
    return out;
  }

  /** Offset only a rectangular region (a limb, a wing, a weapon hand). */
  shiftRegion(x0, y0, x1, y1, dx, dy = 0) {
    const out = this.clone();
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) out.set(x, y, TRANSPARENT);
    }
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = this.get(x, y);
        if (c !== TRANSPARENT) out.set(x + dx, y + dy, c);
      }
    }
    return out;
  }

  translate(dx, dy) {
    const out = PixelGrid.empty(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c !== TRANSPARENT) out.set(x + dx, y + dy, c);
      }
    }
    return out;
  }

  /** Remove a row (squash) and pad at the top to keep height. */
  squashRow(y) {
    const out = PixelGrid.empty(this.w, this.h);
    for (let sy = 0, dy = 1; sy < this.h; sy++) {
      if (sy === y) continue;
      for (let x = 0; x < this.w; x++) out.set(x, dy, this.get(x, sy));
      dy++;
    }
    return out;
  }

  /** Composite another grid on top at an offset. */
  stamp(other, dx = 0, dy = 0) {
    const out = this.clone();
    for (let y = 0; y < other.h; y++) {
      for (let x = 0; x < other.w; x++) {
        const c = other.get(x, y);
        if (c !== TRANSPARENT) out.set(x + dx, y + dy, c);
      }
    }
    return out;
  }

  /** Composite underneath (only fills transparent cells). */
  under(other, dx = 0, dy = 0) {
    const out = this.clone();
    for (let y = 0; y < other.h; y++) {
      for (let x = 0; x < other.w; x++) {
        const c = other.get(x, y);
        if (c !== TRANSPARENT && out.get(x + dx, y + dy) === TRANSPARENT) {
          out.set(x + dx, y + dy, c);
        }
      }
    }
    return out;
  }

  /** Remap palette chars: { from: to }. Used for biome remaps and variants. */
  remap(map) {
    const out = this.clone();
    for (let i = 0; i < out.chars.length; i++) {
      const c = out.chars[i];
      if (map[c] !== undefined) out.chars[i] = map[c];
    }
    return out;
  }

  /** Add a 1px outline in `char` around every opaque cluster. */
  outlined(char = "0") {
    const out = this.clone();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.isSolid(x, y)) continue;
        if (
          this.isSolid(x - 1, y) || this.isSolid(x + 1, y) ||
          this.isSolid(x, y - 1) || this.isSolid(x, y + 1)
        ) {
          out.set(x, y, char);
        }
      }
    }
    return out;
  }

  /** Darken the bottom `rows` of the silhouette — cheap grounded feel. */
  bottomShade(char, rows = 1) {
    const out = this.clone();
    for (let x = 0; x < this.w; x++) {
      let lowest = -1;
      for (let y = this.h - 1; y >= 0; y--) {
        if (this.isSolid(x, y) && this.get(x, y) !== "0") { lowest = y; break; }
      }
      if (lowest < 0) continue;
      for (let r = 0; r < rows; r++) {
        const y = lowest - r;
        if (y >= 0 && this.isSolid(x, y) && this.get(x, y) !== "0") out.set(x, y, char);
      }
    }
    return out;
  }

  /** Tight bounds of opaque content. */
  bounds() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.isSolid(x, y)) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  /**
   * Merge into integer rects: horizontal run-length, then vertical merge of
   * identical runs. Produces compact, human-readable SVG.
   */
  toRects() {
    const runs = [];
    for (let y = 0; y < this.h; y++) {
      let x = 0;
      while (x < this.w) {
        const c = this.get(x, y);
        if (c === TRANSPARENT) { x++; continue; }
        let len = 1;
        while (x + len < this.w && this.get(x + len, y) === c) len++;
        runs.push({ x, y, w: len, h: 1, c });
        x += len;
      }
    }
    // Vertical merge
    const byKey = new Map();
    const out = [];
    for (const r of runs) {
      const key = `${r.x}:${r.w}:${r.c}`;
      const prev = byKey.get(key);
      if (prev && prev.y + prev.h === r.y) {
        prev.h += 1;
      } else {
        const rect = { ...r };
        out.push(rect);
        byKey.set(key, rect);
      }
    }
    return out;
  }

  toSVG(palette = PALETTE, scale = 1) {
    const rects = this.toRects();
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w * scale}" height="${this.h * scale}"`,
      ` viewBox="0 0 ${this.w} ${this.h}" shape-rendering="crispEdges" image-rendering="pixelated">`,
    ];
    // Group by color so the SVG reads like an authored pixel-art layer stack
    const groups = new Map();
    for (const r of rects) {
      if (!groups.has(r.c)) groups.set(r.c, []);
      groups.get(r.c).push(r);
    }
    for (const [c, list] of groups) {
      const color = palette[c] || "#ff00ff";
      parts.push(`<g fill="${color}">`);
      for (const r of list) {
        parts.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`);
      }
      parts.push(`</g>`);
    }
    parts.push("</svg>");
    return parts.join("");
  }

  /** Synchronous raster (identical output to the SVG path). */
  rasterizeSync(palette = PALETTE) {
    const cv = makeCanvas(this.w, this.h);
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (const r of this.toRects()) {
      ctx.fillStyle = palette[r.c] || "#ff00ff";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    return cv;
  }

  /** Raster by decoding the real SVG source into an offscreen canvas. */
  async rasterizeSVG(palette = PALETTE) {
    const svg = this.toSVG(palette);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const img = new Image();
    img.width = this.w;
    img.height = this.h;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    if (img.decode) { try { await img.decode(); } catch { /* already loaded */ } }
    const cv = makeCanvas(this.w, this.h);
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, this.w, this.h);
    return cv;
  }
}

export function makeCanvas(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, w);
  cv.height = Math.max(1, h);
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return cv;
}

/**
 * A rasterized, immutable sprite ready to blit.
 * `ax`/`ay` are the anchor in logical pixels: the point that lands on the
 * entity's world position. Characters anchor at the feet, props at the base.
 */
export class Sprite {
  constructor(name, canvas, grid, ax, ay) {
    this.name = name;
    this.canvas = canvas;
    this.grid = grid;
    this.w = canvas.width;
    this.h = canvas.height;
    this.ax = ax ?? Math.floor(canvas.width / 2);
    this.ay = ay ?? canvas.height;
    this._tints = new Map();
  }

  /** Cached recolor: blends opaque pixels toward `color` by `strength`. */
  tinted(color, strength = 1) {
    const key = `${color}|${strength.toFixed(2)}`;
    let cv = this._tints.get(key);
    if (cv) return cv;
    cv = makeCanvas(this.w, this.h);
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.canvas, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = strength;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (this._tints.size < 24) this._tints.set(key, cv);
    return cv;
  }

  /** Flat silhouette, for dash afterimages and shadows. */
  silhouette(color) {
    return this.tinted(color, 1);
  }

  toSVG() {
    return this.grid ? this.grid.toSVG() : "";
  }
}

/** Compile a grid (or row array) into a Sprite. */
export function compileSync(name, gridOrRows, opts = {}) {
  const grid = gridOrRows instanceof PixelGrid ? gridOrRows : PixelGrid.from(gridOrRows);
  const canvas = grid.rasterizeSync(opts.palette || PALETTE);
  return new Sprite(name, canvas, grid, opts.ax, opts.ay);
}

export async function compileSVG(name, gridOrRows, opts = {}) {
  const grid = gridOrRows instanceof PixelGrid ? gridOrRows : PixelGrid.from(gridOrRows);
  const canvas = await grid.rasterizeSVG(opts.palette || PALETTE);
  return new Sprite(name, canvas, grid, opts.ax, opts.ay);
}

/* ------------------------------------------------------------------ *
 * Pixel primitives — the vocabulary used by procedural env sprites.
 * They stamp what a human would stamp: hard rects, stepped edges,
 * checker dither, 3-tone ramps. No curves, no noise fields.
 * ------------------------------------------------------------------ */

export function rect(grid, x, y, w, h, c) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) grid.set(x + i, y + j, c);
  return grid;
}

export function hline(grid, x, y, w, c) {
  for (let i = 0; i < w; i++) grid.set(x + i, y, c);
  return grid;
}

export function vline(grid, x, y, h, c) {
  for (let j = 0; j < h; j++) grid.set(x, y + j, c);
  return grid;
}

/** Filled shape from per-row [startX, width] spans — the pixel-art way. */
export function spans(grid, x, y, rows, c) {
  rows.forEach(([sx, w], j) => {
    for (let i = 0; i < w; i++) grid.set(x + sx + i, y + j, c);
  });
  return grid;
}

/** 50% checkerboard dither inside a box. */
export function dither(grid, x, y, w, h, c, phase = 0, density = 2) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if ((i + j + phase) % density === 0) grid.set(x + i, y + j, c);
    }
  }
  return grid;
}

/** Dither only over already-opaque pixels (material transitions). */
export function ditherOver(grid, x, y, w, h, c, phase = 0) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if ((i + j + phase) % 2 === 0 && grid.isSolid(x + i, y + j)) grid.set(x + i, y + j, c);
    }
  }
  return grid;
}

/**
 * Stepped diagonal (ART_BIBLE §5): draws `steps` horizontal runs of `run`
 * pixels, dropping by (dx, dy) between runs. This is how pixel artists draw
 * slopes — never a 1:1 alternating staircase on a large form.
 */
export function steppedLine(grid, x, y, steps, run, dx, dy, c) {
  let cx = x;
  let cy = y;
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < run; i++) grid.set(cx + i * Math.sign(dx || 1), cy, c);
    cx += dx * run;
    cy += dy;
  }
  return grid;
}

/** Jagged pixel arc used by lightning and cracks. */
export function jagged(grid, x, y, len, dirX, dirY, c, rand) {
  let cx = x;
  let cy = y;
  for (let i = 0; i < len; i++) {
    grid.set(cx, cy, c);
    cx += dirX;
    cy += dirY;
    if (rand && rand() < 0.45) cx += rand() < 0.5 ? 1 : -1;
  }
  return grid;
}

/** A blocky irregular cluster: the base building block for rocks and rubble. */
export function blob(grid, cx, cy, rw, rh, c, rand) {
  for (let j = -rh; j <= rh; j++) {
    const t = 1 - Math.abs(j) / (rh + 1);
    let half = Math.max(1, Math.round(rw * t));
    if (rand) half = Math.max(1, half - (rand() < 0.4 ? 1 : 0));
    for (let i = -half; i <= half; i++) grid.set(cx + i, cy + j, c);
  }
  return grid;
}
