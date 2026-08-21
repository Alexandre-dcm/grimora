/**
 * 5x7 bitmap pixel font, hand-authored.
 * Used for every piece of text drawn on the canvas: damage numbers, the title
 * logo, world-space labels. Rendered as real pixels so it can never be
 * anti-aliased. See ART_BIBLE.md §12 / §13.
 */

import { PixelGrid, makeCanvas } from "./PixelSprite.js";
import { PALETTE } from "./Palette.js";

const G = {
  A: ".###.,#...#,#...#,#####,#...#,#...#,#...#",
  B: "####.,#...#,#...#,####.,#...#,#...#,####.",
  C: ".###.,#...#,#....,#....,#....,#...#,.###.",
  D: "####.,#...#,#...#,#...#,#...#,#...#,####.",
  E: "#####,#....,#....,####.,#....,#....,#####",
  F: "#####,#....,#....,####.,#....,#....,#....",
  G: ".###.,#...#,#....,#..##,#...#,#...#,.###.",
  H: "#...#,#...#,#...#,#####,#...#,#...#,#...#",
  I: "#####,..#..,..#..,..#..,..#..,..#..,#####",
  J: "..###,...#.,...#.,...#.,...#.,#..#.,.##..",
  K: "#...#,#..#.,#.#..,##...,#.#..,#..#.,#...#",
  L: "#....,#....,#....,#....,#....,#....,#####",
  M: "#...#,##.##,#.#.#,#...#,#...#,#...#,#...#",
  N: "#...#,##..#,#.#.#,#..##,#...#,#...#,#...#",
  O: ".###.,#...#,#...#,#...#,#...#,#...#,.###.",
  P: "####.,#...#,#...#,####.,#....,#....,#....",
  Q: ".###.,#...#,#...#,#...#,#.#.#,#..#.,.##.#",
  R: "####.,#...#,#...#,####.,#.#..,#..#.,#...#",
  S: ".####,#....,#....,.###.,....#,....#,####.",
  T: "#####,..#..,..#..,..#..,..#..,..#..,..#..",
  U: "#...#,#...#,#...#,#...#,#...#,#...#,.###.",
  V: "#...#,#...#,#...#,#...#,#...#,.#.#.,..#..",
  W: "#...#,#...#,#...#,#.#.#,#.#.#,##.##,#...#",
  X: "#...#,#...#,.#.#.,..#..,.#.#.,#...#,#...#",
  Y: "#...#,#...#,.#.#.,..#..,..#..,..#..,..#..",
  Z: "#####,....#,...#.,..#..,.#...,#....,#####",
  "0": ".###.,#...#,#..##,#.#.#,##..#,#...#,.###.",
  "1": "..#..,.##..,..#..,..#..,..#..,..#..,.###.",
  "2": ".###.,#...#,....#,...#.,..#..,.#...,#####",
  "3": "####.,....#,....#,.###.,....#,....#,####.",
  "4": "...#.,..##.,.#.#.,#..#.,#####,...#.,...#.",
  "5": "#####,#....,#....,####.,....#,#...#,.###.",
  "6": "..##.,.#...,#....,####.,#...#,#...#,.###.",
  "7": "#####,....#,...#.,..#..,..#..,..#..,..#..",
  "8": ".###.,#...#,#...#,.###.,#...#,#...#,.###.",
  "9": ".###.,#...#,#...#,.####,....#,...#.,.##..",
  "!": "..#..,..#..,..#..,..#..,..#..,.....,..#..",
  "?": ".###.,#...#,....#,...#.,..#..,.....,..#..",
  ".": ".....,.....,.....,.....,.....,.....,..#..",
  ",": ".....,.....,.....,.....,.....,..#..,.#...",
  ":": ".....,..#..,.....,.....,.....,..#..,.....",
  "'": "..#..,..#..,.....,.....,.....,.....,.....",
  "-": ".....,.....,.....,#####,.....,.....,.....",
  "+": ".....,..#..,..#..,#####,..#..,..#..,.....",
  "/": "....#,...#.,...#.,..#..,.#...,.#...,#....",
  "%": "#...#,...#.,..#..,.#...,#...#,.....,.....",
  "*": ".....,#.#.#,.###.,#####,.###.,#.#.#,.....",
  "(": "...#.,..#..,.#...,.#...,.#...,..#..,...#.",
  ")": ".#...,..#..,...#.,...#.,...#.,..#..,.#...",
  "[": ".###.,.#...,.#...,.#...,.#...,.#...,.###.",
  "]": ".###.,...#.,...#.,...#.,...#.,...#.,.###.",
  "<": "...#.,..#..,.#...,#....,.#...,..#..,...#.",
  ">": ".#...,..#..,...#.,....#,...#.,..#..,.#...",
  "=": ".....,.....,#####,.....,#####,.....,.....",
  "#": ".#.#.,#####,.#.#.,#####,.#.#.,.....,.....",
};

const GLYPH_W = 5;
const GLYPH_H = 7;
export const FONT_ADVANCE = 6;
export const FONT_HEIGHT = GLYPH_H;

/** char -> PixelGrid, glyph inset by 1px so the outline pass has room. */
const grids = new Map();
for (const [ch, def] of Object.entries(G)) {
  const rows = def.split(",");
  const grid = PixelGrid.empty(GLYPH_W + 2, GLYPH_H + 2);
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === "#") grid.set(x + 1, y + 1, "F");
    }
  }
  grids.set(ch, grid);
}

/** color -> Map<char, canvas>. Small, bounded, built lazily. */
const atlases = new Map();

function atlasFor(color, outlineColor) {
  const key = `${color}|${outlineColor || "-"}`;
  let atlas = atlases.get(key);
  if (atlas) return atlas;
  atlas = new Map();
  const palette = { F: color, O: outlineColor || "#000000" };
  for (const [ch, grid] of grids) {
    const g = outlineColor ? grid.outlined("O") : grid;
    atlas.set(ch, g.rasterizeSync(palette));
  }
  if (atlases.size < 32) atlases.set(key, atlas);
  return atlas;
}

export function measureText(text, scale = 1) {
  return {
    w: text.length * FONT_ADVANCE * scale,
    h: GLYPH_H * scale,
  };
}

/**
 * Draw pixel text. Coordinates are snapped to integers and scale must be an
 * integer to keep every glyph pixel square.
 */
export function drawText(ctx, text, x, y, opts = {}) {
  const scale = Math.max(1, Math.round(opts.scale || 1));
  const color = opts.color || PALETTE["9"];
  const outline = opts.outline === false ? null : (opts.outline || PALETTE["0"]);
  const align = opts.align || "left";
  const str = String(text).toUpperCase();

  const width = str.length * FONT_ADVANCE * scale;
  let px = Math.round(x);
  if (align === "center") px = Math.round(x - width / 2);
  else if (align === "right") px = Math.round(x - width);
  const py = Math.round(y);

  const atlas = atlasFor(color, outline);
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < str.length; i++) {
    const cv = atlas.get(str[i]);
    if (!cv) continue;
    ctx.drawImage(
      cv,
      px + i * FONT_ADVANCE * scale - scale,
      py - scale,
      cv.width * scale,
      cv.height * scale
    );
  }
  ctx.imageSmoothingEnabled = prev;
  return width;
}

/**
 * Render a text run to its own canvas — used for HTML UI elements that need
 * pixel type as an image, and for the title logo.
 */
export function textToCanvas(text, opts = {}) {
  const scale = Math.max(1, Math.round(opts.scale || 1));
  const color = opts.color || PALETTE["9"];
  const outline = opts.outline === false ? null : (opts.outline || PALETTE["0"]);
  const str = String(text).toUpperCase();
  const w = (str.length * FONT_ADVANCE + 2) * scale;
  const h = (GLYPH_H + 2) * scale;
  const cv = makeCanvas(w, h);
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawText(ctx, str, scale, scale, { scale, color, outline });
  return cv;
}
