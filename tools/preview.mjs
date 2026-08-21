/**
 * Renders every authored sprite to a single HTML contact sheet of inline SVG,
 * so the art can be reviewed (and screenshotted headlessly) without running
 * the game. Uses PixelGrid.toSVG, which needs no DOM.
 *
 * Run: node tools/preview.mjs [outfile]
 */
import { writeFileSync } from "node:fs";
import { PixelGrid } from "../src/art/PixelSprite.js";
import { PALETTE } from "../src/art/Palette.js";
import { PLAYER_SPRITES } from "../src/art/sprites/player.js";
import { ENEMY_SPRITES } from "../src/art/sprites/enemies.js";
import { BOSS_SPRITES } from "../src/art/sprites/bosses.js";

let ENV = {};
let PROPS = {};
let ITEMS = {};
try {
  const m = await import("../src/art/sprites/environment.js");
  ENV = m.ENV_SPRITES || {};
  PROPS = m.PROP_SPRITES || {};
} catch { /* not written yet */ }
try {
  const m = await import("../src/art/sprites/items.js");
  ITEMS = m.ITEM_SPRITES || {};
} catch { /* not written yet */ }

const out = process.argv[2] || "tools/preview.html";
const sections = [];

function cell(name, rows, scale) {
  const grid = PixelGrid.from(rows);
  const svg = grid.toSVG(PALETTE, scale);
  return `<figure><div class="art">${svg}</div><figcaption>${name}<br><span>${grid.w}x${grid.h}</span></figcaption></figure>`;
}

function section(title, entries, scale) {
  const cells = entries.map(([n, rows]) => cell(n, rows, scale)).join("\n");
  sections.push(`<h2>${title}</h2><div class="grid">${cells}</div>`);
}

section("Player", Object.entries(PLAYER_SPRITES), 6);
section("Enemies", Object.entries(ENEMY_SPRITES).map(([k, v]) => [k, v.rows]), 5);
section("Bosses", Object.entries(BOSS_SPRITES).map(([k, v]) => [k, v.rows]), 4);
if (Object.keys(ENV).length) {
  section("Environment", Object.entries(ENV).map(([k, v]) => [k, v.rows || v]), 5);
}
if (Object.keys(PROPS).length) {
  section("Props", Object.entries(PROPS).map(([k, v]) => [k, v.rows || v]), 5);
}
if (Object.keys(ITEMS).length) {
  section("Items", Object.entries(ITEMS).map(([k, v]) => [k, v.rows || v]), 6);
}

const html = `<!DOCTYPE html><meta charset="utf-8"><title>Abyssbound — sprite sheet</title>
<style>
  body { background:#0f0d16; color:#ded9e8; font:12px ui-monospace,monospace; margin:0; padding:24px; }
  h2 { color:#f2d967; border-bottom:1px solid #343044; padding-bottom:6px; margin:32px 0 16px; letter-spacing:.1em; text-transform:uppercase; font-size:13px; }
  .grid { display:flex; flex-wrap:wrap; gap:18px; align-items:flex-end; }
  figure { margin:0; text-align:center; }
  .art { background:
      linear-gradient(45deg,#1a1724 25%,transparent 25%,transparent 75%,#1a1724 75%),
      linear-gradient(45deg,#1a1724 25%,#141220 25%,#141220 75%,#1a1724 75%);
    background-size:16px 16px; background-position:0 0,8px 8px;
    border:1px solid #343044; padding:4px; display:inline-block; line-height:0; }
  svg { image-rendering:pixelated; display:block; }
  figcaption { margin-top:6px; color:#9a94a8; max-width:180px; }
  figcaption span { color:#59536d; }
</style>
${sections.join("\n")}
`;

writeFileSync(out, html);
console.log(`wrote ${out}`);
