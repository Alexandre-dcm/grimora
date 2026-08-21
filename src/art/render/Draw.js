/**
 * Blit helpers. Every sprite in the game goes through here.
 *
 * Two hard rules (ART_BIBLE §2):
 *   1. destination coordinates are rounded to whole world pixels, so at an
 *      integer camera zoom every art pixel lands on a whole device pixel;
 *   2. no sprite is ever rotated or non-integer scaled.
 */

import { PALETTE } from "../Palette.js";

/** Disable interpolation on a context. Call after every setTransform/resize. */
export function crisp(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  return ctx;
}

/**
 * Draw a sprite with its anchor at world (x, y).
 * @param {object} o { flash, flashColor, alpha, tint, tintStrength, dy }
 */
export function drawSprite(ctx, sprite, x, y, o = {}) {
  if (!sprite) return;
  const px = Math.round(x) - sprite.ax;
  const py = Math.round(y + (o.dy || 0)) - sprite.ay;
  const a = o.alpha === undefined ? 1 : o.alpha;
  if (a <= 0) return;
  if (a !== 1) ctx.globalAlpha = a;
  let img = sprite.canvas;
  if (o.flash) img = sprite.tinted(o.flashColor || PALETTE.Q, o.flash);
  else if (o.tint) img = sprite.tinted(o.tint, o.tintStrength ?? 0.5);
  ctx.drawImage(img, px, py);
  if (a !== 1) ctx.globalAlpha = 1;
}

/** Draw the sprite's 1px outline ring in `color` — elite/boss/loot emphasis. */
export function drawOutlineGlow(ctx, registry, sprite, x, y, color, alpha = 0.85, dy = 0) {
  if (!sprite) return;
  const ring = registry.glow(sprite, color);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(ring.canvas, Math.round(x) - ring.ax, Math.round(y + dy) - ring.ay);
  ctx.globalAlpha = prev;
}

/** Hard-edged elliptical shadow, anchored at the entity's feet. */
export function drawShadow(ctx, registry, x, y, width, alpha = 1) {
  const cv = registry.shadow(width);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2));
  ctx.globalAlpha = prev;
}

/** Axis-aligned pixel rect — the only primitive allowed outside sprites. */
export function pxRect(ctx, x, y, w, h, color, alpha = 1) {
  const prev = ctx.globalAlpha;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (alpha !== 1) ctx.globalAlpha = prev;
}

/**
 * Chunky pixel bar (HP bars, telegraph fills): a dark frame, a fill, and a
 * 1px highlight on the fill's top row. Never a rounded rect or gradient.
 */
export function pxBar(ctx, x, y, w, h, t, fill, opts = {}) {
  const bw = Math.round(w);
  const bh = Math.round(h);
  const bx = Math.round(x);
  const by = Math.round(y);
  pxRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, opts.frame || PALETTE["0"]);
  pxRect(ctx, bx, by, bw, bh, opts.back || PALETTE["2"]);
  const fw = Math.max(0, Math.round(bw * Math.max(0, Math.min(1, t))));
  if (fw > 0) {
    pxRect(ctx, bx, by, fw, bh, fill);
    if (bh > 2) pxRect(ctx, bx, by, fw, 1, opts.shine || PALETTE["9"], 0.35);
  }
}

/**
 * Pixel-art ring used for telegraphs and shockwaves: a stepped circle of
 * `thickness` pixels, drawn span by span. Reads as pixel art at any radius.
 */
export function pxRing(ctx, cx, cy, radius, thickness, color, alpha = 1) {
  const prev = ctx.globalAlpha;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const r = Math.round(radius);
  const inner = Math.max(0, r - Math.max(1, Math.round(thickness)));
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  for (let y = -r; y <= r; y++) {
    const outer = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    if (outer <= 0) continue;
    const hole = Math.floor(Math.sqrt(Math.max(0, inner * inner - y * y)));
    if (hole > 0) {
      ctx.fillRect(icx - outer, icy + y, outer - hole, 1);
      ctx.fillRect(icx + hole, icy + y, outer - hole, 1);
    } else {
      ctx.fillRect(icx - outer, icy + y, outer * 2, 1);
    }
  }
  if (alpha !== 1) ctx.globalAlpha = prev;
}

/** Filled pixel disc (AOE fills, void holes). */
export function pxDisc(ctx, cx, cy, radius, color, alpha = 1) {
  pxRing(ctx, cx, cy, radius, radius, color, alpha);
}

/**
 * Elliptical pool of light on the floor: solid core, dithered rim. Used for
 * rarity glow under loot and chests — a clean stroked ring would read as UI,
 * while a dithered pool reads as light spilling onto stone (§11).
 */
export function pxPool(ctx, cx, cy, rx, ry, color, alpha = 1) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const icx = Math.round(cx);
  const icy = Math.round(cy);
  const irx = Math.round(rx);
  const iry = Math.max(1, Math.round(ry));
  for (let y = -iry; y <= iry; y++) {
    const t = 1 - (y * y) / (iry * iry);
    if (t <= 0) continue;
    const half = Math.floor(irx * Math.sqrt(t));
    for (let x = -half; x <= half; x++) {
      const d = (x * x) / (irx * irx) + (y * y) / (iry * iry);
      // Inner half solid, outer half checkered so the edge frays into the floor
      if (d > 0.45 && (x + y) % 2 !== 0) continue;
      ctx.fillRect(icx + x, icy + y, 1, 1);
    }
  }
  ctx.globalAlpha = prev;
}
