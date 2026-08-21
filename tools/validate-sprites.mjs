/**
 * Sprite data linter. Walks every export of src/art/sprites/*.js, finds
 * character grids (arrays of strings) and checks:
 *   - all rows the same width
 *   - only master-palette characters
 *   - no fully empty grid
 * Run: node tools/validate-sprites.mjs
 */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PALETTE } from "../src/art/Palette.js";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "src", "art", "sprites");
const legal = new Set([...Object.keys(PALETTE), ".", " "]);

let errors = 0;
let grids = 0;

function isGrid(v) {
  return (
    Array.isArray(v) &&
    v.length >= 2 &&
    v.every((r) => typeof r === "string") &&
    v.some((r) => r.length > 1)
  );
}

function checkGrid(path, rows) {
  grids++;
  const widths = new Set(rows.map((r) => r.length));
  if (widths.size > 1) {
    const w = [...widths].sort((a, b) => b - a)[0];
    const bad = rows
      .map((r, i) => (r.length === w ? null : `row ${i}: ${r.length} (expected ${w}) "${r}"`))
      .filter(Boolean);
    console.error(`RAGGED  ${path}\n        ${bad.join("\n        ")}`);
    errors++;
  }
  const badChars = new Map();
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (!legal.has(r[x])) {
        const k = r[x];
        if (!badChars.has(k)) badChars.set(k, `${x},${y}`);
      }
    }
  });
  if (badChars.size) {
    console.error(
      `PALETTE ${path} illegal chars: ${[...badChars].map(([c, at]) => `'${c}'@${at}`).join(", ")}`
    );
    errors++;
  }
  if (rows.every((r) => /^[. ]*$/.test(r))) {
    console.error(`EMPTY   ${path}`);
    errors++;
  }
  // Interior spaces are almost always a typo: use "." for deliberate transparency.
  const spaced = rows
    .map((r, i) => (/[^. ] [^. ]/.test(r) || /[^. ] +$/.test(r) ? `row ${i}: "${r}"` : null))
    .filter(Boolean);
  if (spaced.length) {
    console.error(`SPACES  ${path}\n        ${spaced.join("\n        ")}`);
    errors++;
  }
}

function walk(path, value, depth = 0) {
  if (depth > 6 || value == null) return;
  if (isGrid(value)) {
    checkGrid(path, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(`${path}[${i}]`, v, depth + 1));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walk(`${path}.${k}`, v, depth + 1);
  }
}

const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
for (const f of files) {
  const mod = await import(join(dir, f));
  for (const [name, value] of Object.entries(mod)) {
    walk(`${f}:${name}`, value);
  }
}

console.log(`\nChecked ${grids} grids in ${files.length} files — ${errors ? `${errors} problem(s)` : "all clean"}`);
process.exit(errors ? 1 : 0);
