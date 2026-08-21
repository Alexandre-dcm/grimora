/**
 * TITLE SCENE (ART_BIBLE §14).
 *
 * A parallax pixel diorama: dithered sky, a ruined citadel on the horizon,
 * broken arches, and a graveyard foreground with flickering braziers. Every
 * layer is baked once into a tiling offscreen canvas and scrolled at integer
 * offsets, so the whole screen costs a handful of drawImage calls.
 *
 * The logo is drawn with the bitmap font, not a web font, so the title itself
 * is made of the same pixels as the game.
 */

import { makeCanvas } from "../PixelSprite.js";
import { PALETTE } from "../Palette.js";
import { drawText } from "../PixelFont.js";
import { seeded } from "../Shape.js";
import { assets } from "../AssetRegistry.js";
import { crisp } from "./Draw.js";

const LAYER_W = 480;
const LAYER_H = 270;

/** Vertical dither transition between two tones across `h` rows. */
function bandFade(ctx, x, y, w, h, from, to) {
  for (let j = 0; j < h; j++) {
    const t = j / Math.max(1, h - 1);
    ctx.fillStyle = from;
    ctx.fillRect(x, y + j, w, 1);
    ctx.fillStyle = to;
    // Ordered 4x4-ish dither: density rises with t, so the seam is stepped
    for (let i = 0; i < w; i++) {
      const th = ((i % 4) * 4 + (j % 4)) / 16;
      if (th < t) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

function buildSky() {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = crisp(cv.getContext("2d"));
  const stops = [
    [0, 40, PALETTE["0"], PALETTE.E],
    [40, 70, PALETTE.E, PALETTE["1"]],
    [110, 60, PALETTE["1"], PALETTE["2"]],
  ];
  ctx.fillStyle = PALETTE["0"];
  ctx.fillRect(0, 0, LAYER_W, LAYER_H);
  for (const [y, h, a, b] of stops) bandFade(ctx, 0, y, LAYER_W, h, a, b);
  ctx.fillStyle = PALETTE["2"];
  ctx.fillRect(0, 170, LAYER_W, LAYER_H - 170);

  // Stars: single pixels, a few brighter clusters
  const rnd = seeded(90210);
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(rnd() * LAYER_W);
    const y = Math.floor(rnd() * 120);
    const b = rnd();
    ctx.fillStyle = b > 0.93 ? PALETTE.Q : b > 0.7 ? PALETTE["8"] : PALETTE["6"];
    ctx.fillRect(x, y, 1, 1);
    if (b > 0.97) {
      ctx.fillStyle = PALETTE["7"];
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }

  // A pale moon: stepped disc, one crater cluster, no anti-aliasing
  const mx = 372;
  const my = 46;
  const r = 17;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillStyle = y < -4 ? PALETTE["9"] : y < 6 ? PALETTE["8"] : PALETTE["7"];
    ctx.fillRect(mx - half, my + y, half * 2, 1);
  }
  ctx.fillStyle = PALETTE["6"];
  ctx.fillRect(mx - 6, my - 4, 4, 3);
  ctx.fillRect(mx + 3, my + 2, 5, 4);
  ctx.fillRect(mx - 2, my + 7, 3, 2);
  return cv;
}

/** Jagged mountain ridge, drawn as vertical runs from a stepped skyline. */
function buildRidge(seed, baseY, height, color, shade) {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = crisp(cv.getContext("2d"));
  const rnd = seeded(seed);
  let y = baseY;
  for (let x = 0; x < LAYER_W; x++) {
    // Random walk with a pull toward the base line keeps peaks believable
    if (x % 3 === 0) {
      y += Math.round((rnd() - 0.5) * 6);
      y = Math.max(baseY - height, Math.min(baseY + 6, y));
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, LAYER_H - y);
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, 1, 2);
  }
  return cv;
}

/** The citadel: a central keep with spires, buttresses and lit windows. */
function buildCitadel() {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = crisp(cv.getContext("2d"));
  const stone = PALETTE["1"];
  const lit = PALETTE["3"];
  const dark = PALETTE["0"];

  const tower = (x, w, top) => {
    ctx.fillStyle = stone;
    ctx.fillRect(x, top, w, 190 - top);
    ctx.fillStyle = lit;
    ctx.fillRect(x, top, 2, 190 - top);
    ctx.fillStyle = dark;
    ctx.fillRect(x + w - 2, top, 2, 190 - top);
    // Crenellations
    for (let i = 0; i < w; i += 4) {
      ctx.fillStyle = stone;
      ctx.fillRect(x + i, top - 4, 3, 4);
      ctx.fillStyle = lit;
      ctx.fillRect(x + i, top - 4, 1, 4);
    }
    // Spire
    ctx.fillStyle = dark;
    for (let j = 0; j < 14; j++) {
      const sw = Math.max(1, w - 4 - Math.floor(j * (w / 14)));
      ctx.fillRect(x + Math.floor((w - sw) / 2), top - 5 - j, sw, 1);
    }
  };

  tower(150, 22, 96);
  tower(300, 20, 104);
  tower(214, 34, 62);         // central keep
  tower(186, 14, 120);
  tower(276, 14, 124);

  // Curtain wall
  ctx.fillStyle = stone;
  ctx.fillRect(140, 150, 200, 40);
  ctx.fillStyle = lit;
  ctx.fillRect(140, 150, 200, 2);
  for (let i = 140; i < 340; i += 6) {
    ctx.fillStyle = stone;
    ctx.fillRect(i, 146, 4, 4);
  }
  ctx.fillStyle = dark;
  ctx.fillRect(222, 164, 18, 26);
  ctx.fillRect(226, 158, 10, 8);

  // Windows: warm pinpricks, the only bright thing on the skyline
  const rnd = seeded(7);
  for (const [wx, wy, n] of [[216, 74, 6], [155, 108, 4], [304, 116, 4], [190, 130, 3], [280, 134, 3]]) {
    for (let i = 0; i < n; i++) {
      const x = wx + Math.floor(rnd() * 22);
      const y = wy + i * 9;
      ctx.fillStyle = rnd() > 0.5 ? PALETTE.R : PALETTE.S;
      ctx.fillRect(x, y, 2, 3);
    }
  }
  return cv;
}

/** Broken arches and columns in the middle distance. */
function buildRuins() {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = crisp(cv.getContext("2d"));
  const rnd = seeded(4242);
  const stone = PALETTE["2"];
  const lit = PALETTE["4"];
  const dark = PALETTE["0"];

  const column = (x, top, w) => {
    ctx.fillStyle = stone;
    ctx.fillRect(x, top, w, 220 - top);
    ctx.fillStyle = lit;
    ctx.fillRect(x, top, 2, 220 - top);
    ctx.fillStyle = dark;
    ctx.fillRect(x + w - 1, top, 1, 220 - top);
    // Broken crown: a couple of missing bites
    ctx.clearRect(x + Math.floor(rnd() * w), top, 2, 3);
    ctx.fillStyle = lit;
    ctx.fillRect(x - 1, top, w + 2, 2);
  };

  for (const [x, top, w] of [[24, 150, 10], [58, 168, 8], [96, 158, 12], [364, 156, 10], [404, 170, 8], [438, 150, 12]]) {
    column(x, top, w);
  }
  // A surviving arch spanning two columns
  ctx.fillStyle = stone;
  ctx.fillRect(24, 146, 84, 6);
  ctx.fillStyle = lit;
  ctx.fillRect(24, 146, 84, 2);
  ctx.fillStyle = dark;
  ctx.fillRect(70, 152, 6, 4);
  return cv;
}

/** Foreground: ground plane, tombstones, dead trees, braziers. */
function buildForeground() {
  const cv = makeCanvas(LAYER_W, LAYER_H);
  const ctx = crisp(cv.getContext("2d"));
  const rnd = seeded(1337);

  // Ground with a dithered top edge so it doesn't read as a hard bar
  ctx.fillStyle = PALETTE["1"];
  ctx.fillRect(0, 228, LAYER_W, LAYER_H - 228);
  bandFade(ctx, 0, 220, LAYER_W, 8, PALETTE["2"], PALETTE["1"]);
  ctx.fillStyle = PALETTE["0"];
  for (let x = 0; x < LAYER_W; x++) {
    if ((x * 7) % 11 < 3) ctx.fillRect(x, 236 + Math.floor(rnd() * 4), 2, 1);
  }

  // Tombstones
  const tomb = (x, y, w, h, tilt) => {
    ctx.fillStyle = PALETTE["2"];
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE["4"];
    ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = PALETTE["0"];
    ctx.fillRect(x + w - 2, y, 2, h);
    ctx.fillRect(x + tilt, y - 1, w, 1);
    // Rounded top, stepped
    ctx.fillStyle = PALETTE["2"];
    ctx.fillRect(x + 1, y - 2, w - 2, 2);
    ctx.fillStyle = PALETTE["3"];
    ctx.fillRect(x + 2, y + 4, w - 5, 1);
    ctx.fillRect(x + 2, y + 7, w - 6, 1);
  };
  tomb(40, 222, 12, 18, 0);
  tomb(96, 226, 10, 14, 1);
  tomb(392, 224, 11, 16, 0);
  tomb(430, 228, 9, 12, -1);

  // Dead trees: trunk with forked branches, pure silhouette
  const tree = (bx, by, h, dir) => {
    ctx.fillStyle = PALETTE["0"];
    for (let j = 0; j < h; j++) {
      const w = j < h * 0.3 ? 2 : 3;
      ctx.fillRect(bx + (j % 5 === 0 ? dir : 0), by - j, w, 1);
    }
    const branch = (sx, sy, len, dx, dy) => {
      let x = sx;
      let y = sy;
      for (let i = 0; i < len; i++) {
        ctx.fillRect(x, y, 2, 1);
        x += dx;
        if (i % 2 === 0) y += dy;
      }
    };
    branch(bx, by - h + 4, 9, dir, -1);
    branch(bx, by - h + 12, 7, -dir, -1);
    branch(bx + 1, by - h + 20, 5, dir, -1);
  };
  tree(18, 240, 54, 1);
  tree(452, 244, 44, -1);
  tree(140, 236, 30, -1);

  // Iron braziers flanking the centre, on stepped stone bases
  for (const bx of [128, 336]) {
    ctx.fillStyle = PALETTE["3"];
    ctx.fillRect(bx - 6, 232, 12, 6);
    ctx.fillStyle = PALETTE["5"];
    ctx.fillRect(bx - 6, 232, 12, 1);
    ctx.fillStyle = PALETTE["2"];
    ctx.fillRect(bx - 2, 220, 4, 12);
    ctx.fillStyle = PALETTE.f;
    ctx.fillRect(bx - 7, 214, 14, 6);
    ctx.fillStyle = PALETTE.g;
    ctx.fillRect(bx - 7, 214, 14, 1);
    ctx.fillStyle = PALETTE.e;
    ctx.fillRect(bx - 7, 219, 14, 1);
  }
  return cv;
}

export class TitleScene {
  constructor() {
    this.sky = buildSky();
    this.ridgeFar = buildRidge(11, 168, 46, PALETTE["1"], PALETTE["2"]);
    this.ridgeNear = buildRidge(29, 196, 34, PALETTE["0"], PALETTE["1"]);
    this.citadel = buildCitadel();
    this.ruins = buildRuins();
    this.fore = buildForeground();
    this.motes = [];
    for (let i = 0; i < 70; i++) {
      this.motes.push({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28, s: 0.4 + Math.random() });
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx screen-space
   * @param {number} w device width
   * @param {number} h device height
   * @param {number} t seconds
   */
  render(ctx, w, h, t) {
    // Integer scale keeps the diorama pixel-perfect at any window size
    const scale = Math.max(1, Math.floor(Math.min(w / LAYER_W, h / LAYER_H)));
    const dw = LAYER_W * scale;
    const dh = LAYER_H * scale;
    const ox = Math.round((w - dw) / 2);
    const oy = Math.round((h - dh) / 2);

    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = PALETTE["0"];
    ctx.fillRect(0, 0, w, h);

    const layer = (cv, driftPx) => {
      const d = Math.round(driftPx) * scale;
      ctx.drawImage(cv, ox + d, oy, dw, dh);
      ctx.drawImage(cv, ox + d - dw, oy, dw, dh);
      ctx.drawImage(cv, ox + d + dw, oy, dw, dh);
    };

    // Parallax: distant layers drift slowest. Offsets are whole pixels.
    layer(this.sky, Math.sin(t * 0.05) * 6);
    layer(this.ridgeFar, Math.sin(t * 0.05) * 6 - t * 0.6);
    layer(this.citadel, -t * 0.9);
    layer(this.ridgeNear, -t * 1.6);
    layer(this.ruins, -t * 2.4);
    layer(this.fore, 0);   // static: the braziers must stay under their flames

    // Brazier light and flame, drawn in screen space over the foreground
    for (const bx of [128, 336]) this._flame(ctx, ox, oy, scale, bx, t);

    // Drifting embers
    ctx.fillStyle = PALETTE.o;
    for (const m of this.motes) {
      let y = (m.y * dh - t * 14 * m.s) % dh;
      if (y < 0) y += dh;
      const x = (m.x * dw + Math.sin(t * 0.6 + m.p) * 10 * scale) % dw;
      ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3 + m.p));
      ctx.fillRect(ox + Math.round(x), oy + Math.round(y), scale, scale);
    }
    ctx.globalAlpha = 1;

    this._logo(ctx, w, oy, dh, scale, t);
    ctx.imageSmoothingEnabled = prev;
  }

  /** Flickering pixel flame plus its halo, anchored to a brazier bowl. */
  _flame(ctx, ox, oy, scale, bx, t) {
    const x = ox + bx * scale;
    const y = oy + 214 * scale;
    const halo = assets.halo(70, PALETTE.S);
    const flick = 0.82 + Math.sin(t * 11 + bx) * 0.1 + Math.sin(t * 23) * 0.06;
    const hs = Math.round(150 * scale * flick);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5;
    ctx.drawImage(halo, Math.round(x - hs / 2), Math.round(y - hs / 2), hs, hs);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    const step = Math.floor(t * 9 + bx) % 3;
    const cols = [PALETTE.n, PALETTE.o, PALETTE.p, PALETTE.R];
    const shape = [
      [[-3, 0, 6, 2], [-2, -2, 4, 2], [-1, -4, 2, 2], [0, -6, 1, 2]],
      [[-3, 0, 6, 2], [-2, -2, 5, 2], [0, -4, 2, 2], [1, -6, 1, 2]],
      [[-3, 0, 6, 2], [-3, -2, 5, 2], [-2, -4, 2, 2], [-2, -6, 1, 2]],
    ][step];
    shape.forEach((r, i) => {
      ctx.fillStyle = cols[Math.min(cols.length - 1, i)];
      ctx.fillRect(x + r[0] * scale, y + r[1] * scale, r[2] * scale, r[3] * scale);
    });
  }

  /** Wordmark: pixel type, a stepped banner and a rule with end caps. */
  _logo(ctx, w, oy, dh, scale, t) {
    const cx = Math.round(w / 2);
    const top = oy + Math.round(dh * 0.1);
    const s = Math.max(3, scale * 2);
    const title = "ABYSSBOUND";
    const tw = title.length * 6 * s;

    // Banner plate behind the type
    const bw = tw + 14 * s;
    const bh = 13 * s;
    const bx = cx - Math.round(bw / 2);
    ctx.fillStyle = "rgba(5,4,10,0.72)";
    ctx.fillRect(bx, top - 3 * s, bw, bh);
    ctx.fillStyle = PALETTE.q;
    ctx.fillRect(bx, top - 3 * s, bw, s);
    ctx.fillRect(bx, top + bh - 4 * s, bw, s);
    ctx.fillStyle = PALETTE.s;
    ctx.fillRect(bx, top - 3 * s, s, s);
    ctx.fillRect(bx + bw - s, top - 3 * s, s, s);
    ctx.fillRect(bx, top + bh - 4 * s, s, s);
    ctx.fillRect(bx + bw - s, top + bh - 4 * s, s, s);

    // Type: gold with a dark outline, plus a 1px top highlight row
    drawText(ctx, title, cx, top, { scale: s, color: PALETTE.s, outline: PALETTE["0"], align: "center" });
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, top, bw, 2 * s);
    ctx.clip();
    drawText(ctx, title, cx, top, { scale: s, color: PALETTE.t, outline: false, align: "center" });
    ctx.restore();

    // Subtitle, dimmed and slowly breathing
    const sub = "A DARK FANTASY ROGUELITE";
    const ss = Math.max(1, Math.round(s / 3));
    ctx.globalAlpha = 0.7 + Math.sin(t * 1.5) * 0.15;
    drawText(ctx, sub, cx, top + bh + 2 * s, { scale: ss, color: PALETTE["8"], outline: PALETTE["0"], align: "center" });
    ctx.globalAlpha = 1;
  }
}
