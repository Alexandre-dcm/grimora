/**
 * VFX (ART_BIBLE §12).
 *
 * Everything here is built from whole pixels: slash crescents are generated
 * span by span per direction bucket and cached, impact flashes are pixel
 * starbursts, and damage numbers use the 5x7 bitmap font with an integer
 * bounce. No rotation, no blur, no smooth gradients.
 */

import { makeCanvas } from "../PixelSprite.js";
import { PALETTE, ELEMENT_COLORS, withAlpha } from "../Palette.js";
import { drawText } from "../PixelFont.js";
import { crisp, pxRect } from "./Draw.js";

/* ==================================================================== *
 * SLASH ARCS — 16 direction buckets, generated once each
 * ==================================================================== */

const BUCKETS = 16;
const slashCache = new Map();

/**
 * Crescent sweep centred on a direction bucket. Built by walking the arc and
 * stamping 1px spans, tapering at both ends — the pixel-art way to draw a
 * swing, instead of rotating a bitmap.
 */
function buildSlash(bucket, radius, thickness, spread, color) {
  const size = (radius + thickness + 2) * 2;
  const cv = makeCanvas(size, size);
  const ctx = crisp(cv.getContext("2d"));
  const c = size / 2;
  const base = (bucket / BUCKETS) * Math.PI * 2;
  const steps = Math.max(12, Math.round(radius * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = base + (t - 0.5) * spread;
    // Taper: full thickness in the middle of the sweep, 1px at the tips
    const taper = Math.sin(t * Math.PI);
    const th = Math.max(1, Math.round(thickness * taper));
    const bright = taper > 0.72;
    ctx.fillStyle = bright ? PALETTE.Q : color;
    for (let k = 0; k < th; k++) {
      const r = radius - k;
      ctx.fillRect(Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r), 1, 1);
    }
  }
  return cv;
}

export function slashSprite(angle, radius, color, thickness = 4, spread = 1.7) {
  const bucket = ((Math.round((angle / (Math.PI * 2)) * BUCKETS) % BUCKETS) + BUCKETS) % BUCKETS;
  const key = `${bucket}|${Math.round(radius)}|${color}|${thickness}|${spread.toFixed(1)}`;
  let cv = slashCache.get(key);
  if (!cv) {
    cv = buildSlash(bucket, Math.round(radius), thickness, spread, color);
    if (slashCache.size < 400) slashCache.set(key, cv);
  }
  return cv;
}

/** Draw a swing centred on (x, y). `t` is 0..1 progress through the swing. */
export function drawSlash(ctx, x, y, angle, radius, color, t) {
  const cv = slashSprite(angle, radius, color, t < 0.4 ? 5 : 3);
  const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2));
  ctx.globalAlpha = 1;
}

/* ==================================================================== *
 * IMPACT FLASHES — pixel starbursts
 * ==================================================================== */

const impactCache = new Map();

function buildImpact(size, color, crit) {
  const cv = makeCanvas(size * 2 + 1, size * 2 + 1);
  const ctx = crisp(cv.getContext("2d"));
  const c = size;
  const arms = crit ? 8 : 4;
  ctx.fillStyle = color;
  for (let a = 0; a < arms; a++) {
    const ang = (a / arms) * Math.PI * 2 + (crit ? Math.PI / 8 : 0);
    const len = a % 2 === 0 ? size : Math.round(size * 0.6);
    for (let r = 1; r <= len; r++) {
      const w = r < len * 0.4 ? 2 : 1;
      ctx.fillRect(Math.round(c + Math.cos(ang) * r), Math.round(c + Math.sin(ang) * r), w, w);
    }
  }
  ctx.fillStyle = PALETTE.Q;
  ctx.fillRect(c - 1, c - 1, 3, 3);
  if (crit) {
    ctx.fillRect(c - 2, c - 2, 5, 5);
    ctx.fillStyle = color;
    ctx.fillRect(c - 3, c - 3, 7, 1);
    ctx.fillRect(c - 3, c + 3, 7, 1);
  }
  return cv;
}

export function impactSprite(size, color, crit = false) {
  const key = `${size}|${color}|${crit ? 1 : 0}`;
  let cv = impactCache.get(key);
  if (!cv) {
    cv = buildImpact(size, color, crit);
    if (impactCache.size < 200) impactCache.set(key, cv);
  }
  return cv;
}

/* ==================================================================== *
 * PROJECTILE BOLTS — 16 direction buckets, generated per size/element
 * ==================================================================== */

const boltCache = new Map();

/**
 * A bolt is a lens-shaped core with a stepped tail along the travel axis, so
 * direction reads instantly. Built per bucket rather than rotated (§2).
 */
function buildBolt(bucket, r, color, hot, tail) {
  const len = r * 2 + tail;
  const size = (len + 2) * 2;
  const cv = makeCanvas(size, size);
  const ctx = crisp(cv.getContext("2d"));
  const c = size / 2;
  const a = (bucket / BUCKETS) * Math.PI * 2;
  const ux = Math.cos(a);
  const uy = Math.sin(a);

  // Tail: shrinking blocks trailing behind the core
  for (let i = 1; i <= tail; i++) {
    const t = 1 - i / (tail + 1);
    const w = Math.max(1, Math.round(r * t));
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.28 + t * 0.5;
    ctx.fillRect(Math.round(c - ux * i - w / 2), Math.round(c - uy * i - w / 2), w, w);
  }
  ctx.globalAlpha = 1;

  // Core: pixel disc, then a hot inner disc and a leading white pixel
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    if (half >= 0) ctx.fillRect(c - half, c + y, half * 2 + 1, 1);
  }
  const ir = Math.max(1, r - 2);
  ctx.fillStyle = hot;
  for (let y = -ir; y <= ir; y++) {
    const half = Math.floor(Math.sqrt(Math.max(0, ir * ir - y * y)));
    if (half >= 0) ctx.fillRect(c - half, c + y, half * 2 + 1, 1);
  }
  ctx.fillStyle = PALETTE.Q;
  ctx.fillRect(Math.round(c + ux * (r - 1)), Math.round(c + uy * (r - 1)), 2, 2);
  return cv;
}

export function boltSprite(angle, radius, color, hot = PALETTE.Q, tail = 5) {
  const bucket = ((Math.round((angle / (Math.PI * 2)) * BUCKETS) % BUCKETS) + BUCKETS) % BUCKETS;
  const r = Math.max(2, Math.round(radius));
  const key = `${bucket}|${r}|${color}|${hot}|${tail}`;
  let cv = boltCache.get(key);
  if (!cv) {
    cv = buildBolt(bucket, r, color, hot, tail);
    if (boltCache.size < 600) boltCache.set(key, cv);
  }
  return cv;
}

/* ==================================================================== *
 * FLOATING COMBAT TEXT
 * ==================================================================== */

class FloatEntry {
  constructor() {
    this.active = false;
  }

  set(x, y, text, opts) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.text = String(text);
    this.t = 0;
    this.life = opts.life || (opts.crit ? 1.0 : 0.78);
    this.color = opts.color || PALETTE["9"];
    this.crit = !!opts.crit;
    this.scale = opts.scale || (opts.crit ? 2 : 1);
    this.drift = (opts.drift ?? 0) + (Math.random() - 0.5) * 14;
    this.label = opts.label || null;
  }
}

export class FloatingText {
  constructor(max = 96) {
    this.pool = [];
    for (let i = 0; i < max; i++) this.pool.push(new FloatEntry());
    this.cursor = 0;
  }

  spawn(x, y, text, opts = {}) {
    // Ring buffer: newest text always wins, oldest silently recycles
    let e = this.pool.find((p) => !p.active);
    if (!e) {
      e = this.pool[this.cursor % this.pool.length];
      this.cursor++;
    }
    // Stack rather than overlap: fast hits at the same spot would otherwise
    // pile into an illegible blob.
    let sy = y;
    for (const o of this.pool) {
      if (!o.active || o === e) continue;
      if (Math.abs(o.x - x) < 22 && Math.abs(o.y - sy) < 11) sy = o.y - 11;
    }
    e.set(x, sy, text, opts);
    return e;
  }

  damage(x, y, amount, opts = {}) {
    const element = opts.element && opts.element !== "none" ? opts.element : null;
    const color = opts.crit
      ? PALETTE.p
      : element
        ? ELEMENT_COLORS[element] || PALETTE["9"]
        : PALETTE["9"];
    // Scales are in world pixels and get multiplied by the camera zoom, so
    // they stay small here: 1 for chip damage, 2 for a crit that must shout.
    this.spawn(x, y, Math.max(1, Math.round(amount)), {
      crit: opts.crit,
      color,
      label: opts.crit ? "CRIT" : null,
      scale: opts.crit ? 2 : 1,
    });
  }

  update(dt) {
    for (const e of this.pool) {
      if (!e.active) continue;
      e.t += dt;
      if (e.t >= e.life) e.active = false;
    }
  }

  clear() {
    for (const e of this.pool) e.active = false;
  }

  render(ctx) {
    for (const e of this.pool) {
      if (!e.active) continue;
      const p = e.t / e.life;
      // Integer-stepped pop: fast rise, small settle, then fade
      const rise = p < 0.25 ? (p / 0.25) * 10 : 10 + (p - 0.25) * 8;
      const bounce = e.crit && p < 0.3 ? Math.round(Math.sin(p * 10) * 2) : 0;
      const alpha = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
      const x = Math.round(e.x + e.drift * p);
      const y = Math.round(e.y - rise + bounce);
      const scale = e.crit && p < 0.18 ? e.scale + 1 : e.scale;
      ctx.globalAlpha = alpha;
      if (e.label) {
        drawText(ctx, e.label, x, y - 8 * scale, {
          scale: Math.max(1, scale - 1),
          color: PALETTE.o,
          outline: PALETTE["0"],
          align: "center",
        });
      }
      drawText(ctx, e.text, x, y, { scale, color: e.color, outline: PALETTE["0"], align: "center" });
      ctx.globalAlpha = 1;
    }
  }
}

/* ==================================================================== *
 * BACKGROUND ATMOSPHERE — biome motes drifting in screen space
 * ==================================================================== */

const MOTE_STYLES = {
  dust: { color: PALETTE["7"], size: 1, vy: 6, vx: 4, alpha: 0.4, count: 70 },
  spores: { color: PALETTE.x, size: 1, vy: -8, vx: 6, alpha: 0.45, count: 80 },
  embers: { color: PALETTE.o, size: 1, vy: -22, vx: 8, alpha: 0.65, count: 90 },
  snow: { color: PALETTE.D, size: 1, vy: 26, vx: 10, alpha: 0.55, count: 110 },
  cosmic: { color: PALETTE.U, size: 1, vy: -5, vx: 5, alpha: 0.5, count: 80 },
};

export class Atmosphere {
  constructor() {
    this.motes = [];
    this.style = MOTE_STYLES.dust;
    this.kind = "dust";
  }

  setKind(kind) {
    const style = MOTE_STYLES[kind] || MOTE_STYLES.dust;
    if (this.kind === kind && this.motes.length) return;
    this.kind = kind;
    this.style = style;
    this.motes = [];
    for (let i = 0; i < style.count; i++) {
      this.motes.push({
        x: Math.random(),
        y: Math.random(),
        p: Math.random() * Math.PI * 2,
        s: 0.6 + Math.random() * 0.8,
        big: Math.random() < 0.18,
      });
    }
  }

  /** Screen-space, drawn over the world but under the UI. */
  render(ctx, w, h, time) {
    const st = this.style;
    ctx.fillStyle = st.color;
    for (const m of this.motes) {
      const drift = Math.sin(time * 0.7 + m.p) * st.vx;
      let y = (m.y * h + time * st.vy * m.s) % h;
      if (y < 0) y += h;
      const x = (m.x * w + drift + time * 2) % w;
      const size = m.big ? st.size + 1 : st.size;
      ctx.globalAlpha = st.alpha * (m.big ? 1 : 0.7) * (0.6 + 0.4 * Math.sin(time * 2 + m.p));
      ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    ctx.globalAlpha = 1;
  }
}

/* ==================================================================== *
 * TELEGRAPHS
 * ==================================================================== */

/** Pulsing danger disc with a stepped rim — boss slams and AOE warnings. */
export function drawTelegraph(ctx, x, y, radius, t, color = PALETTE.l) {
  const pulse = 0.5 + Math.sin(t * 12) * 0.25;
  const r = Math.round(radius);
  ctx.fillStyle = withAlpha(color, 0.13 + pulse * 0.1);
  for (let yy = -r; yy <= r; yy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy)));
    if (half > 0) ctx.fillRect(Math.round(x) - half, Math.round(y) + yy, half * 2, 1);
  }
  // Rim: dashed pixel ring so it never looks like a vector stroke
  ctx.fillStyle = color;
  const steps = Math.max(24, r);
  for (let i = 0; i < steps; i++) {
    if (i % 4 === 3) continue;
    const a = (i / steps) * Math.PI * 2 + t * 1.5;
    ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2);
  }
}

/** Charge-up spark ring that closes in — used for windups. */
export function drawWindup(ctx, x, y, radius, t, color = PALETTE.p) {
  const r = Math.round(radius * (1 - t * 0.6));
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 6;
    pxRect(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 2, color, 0.9);
  }
}
