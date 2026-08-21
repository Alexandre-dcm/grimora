/**
 * Master palette — the single source of color truth.
 * Every pixel grid in the project addresses these by their single character key.
 * See ART_BIBLE.md §4. Never hardcode a hex outside this file.
 */

export const PALETTE = {
  // Neutrals (dark -> light)
  "0": "#05040a", "1": "#0f0d16", "2": "#1a1724", "3": "#262232", "4": "#343044",
  "5": "#454057", "6": "#59536d", "7": "#746e88", "8": "#9a94a8", "9": "#ded9e8",

  // Wood & leather
  a: "#241812", b: "#3d2818", c: "#5c3d22", d: "#8a6134",

  // Metal
  e: "#262d38", f: "#414c5c", g: "#6b7888", h: "#a3b0c0",

  // Blood & crimson
  i: "#3d0d14", j: "#6b1420", k: "#a82230", l: "#e0454a",

  // Fire & ember
  m: "#5c1c08", n: "#a33a10", o: "#e8791c", p: "#ffc247",

  // Gold
  q: "#4a3410", r: "#7d5c16", s: "#c19a24", t: "#f2d967",

  // Nature green
  u: "#14240f", v: "#22401a", w: "#3c6b28", x: "#6aa83c",

  // Poison
  y: "#2a4a14", z: "#8de03c",

  // Frost & ice
  A: "#0e2438", B: "#1f5a80", C: "#4fa8cc", D: "#b8ecf7",

  // Arcane & void
  E: "#1a0f2e", F: "#3d1f66", G: "#7b3fc4", H: "#cfa0ff",

  // Flesh
  I: "#4a2a22", J: "#7a4634", K: "#a86b4a", L: "#d19a72",

  // Bone
  M: "#6b6355", N: "#a89e86", O: "#ede7d2",

  // Specials
  P: "#14060a", Q: "#ffffff", R: "#ffe9a3", S: "#ff9a2e", T: "#7ff0ff",
  U: "#c86bff", V: "#4a5a1c", W: "#9a8f3a", X: "#16303d", Y: "#2d6f7a",
  Z: "#6fd0c4",
};

/** Semantic aliases so gameplay code never speaks in palette chars. */
export const COLORS = {
  outline: PALETTE["0"],
  black: PALETTE["1"],
  charcoal: PALETTE["2"],
  stone: PALETTE["5"],
  stoneLight: PALETTE["6"],
  grey: PALETTE["7"],
  paleGrey: PALETTE["8"],
  white: PALETTE["9"],
  pureWhite: PALETTE.Q,

  wood: PALETTE.c,
  leather: PALETTE.b,
  steel: PALETTE.g,
  steelShine: PALETTE.h,

  blood: PALETTE.j,
  crimson: PALETTE.k,
  red: PALETTE.l,

  ember: PALETTE.n,
  flame: PALETTE.o,
  flamePale: PALETTE.p,

  gold: PALETTE.s,
  goldShine: PALETTE.t,

  moss: PALETTE.w,
  grass: PALETTE.x,
  poison: PALETTE.z,

  frost: PALETTE.C,
  ice: PALETTE.D,

  arcane: PALETTE.G,
  arcaneShine: PALETTE.H,

  bone: PALETTE.N,
  boneLight: PALETTE.O,

  candle: PALETTE.R,
  torch: PALETTE.S,
  magic: PALETTE.T,
  mystic: PALETTE.U,
};

/** Element -> accent color, used by projectiles, VFX and damage numbers. */
export const ELEMENT_COLORS = {
  none: PALETTE["9"],
  physical: PALETTE["9"],
  fire: PALETTE.o,
  ice: PALETTE.C,
  lightning: PALETTE.p,
  poison: PALETTE.z,
  blood: PALETTE.k,
  arcane: PALETTE.H,
};

/** Rarity colors (ART_BIBLE §13). Keys match data/items.js RARITY ids. */
export const RARITY_COLORS = {
  common: "#b6b2c4",
  uncommon: "#5c9a35",
  rare: "#3d8fd8",
  epic: "#9040c8",
  legendary: "#e8901c",
  mythic: "#f0344a",
};

export const RARITY_GLOW = {
  common: 0,
  uncommon: 0.25,
  rare: 0.45,
  epic: 0.7,
  legendary: 0.9,
  mythic: 1,
};

/**
 * Biome visual identities. Each biome remaps the shared tileset palette and
 * declares its ambient light, atmosphere and decoration vocabulary.
 * `remap` is applied to environment sprites at rasterization time so one
 * authored tile serves all five biomes while staying palette-legal.
 */
export const BIOME_ART = {
  1: {
    id: 1,
    key: "catacombs",
    name: "Forgotten Catacombs",
    ambient: "#1b1826",
    ambientStrength: 0.72,
    fogColor: "#241f33",
    floorTone: ["3", "4", "5"],
    wallTone: ["2", "4", "6"],
    tileRemap: null, // authored natively in catacombs tones
    accent: PALETTE["7"],
    mossChar: "w",
    lightColor: COLORS.candle,
    atmosphere: "dust",
    decor: ["bone", "skull_pile", "tombstone", "candle", "chain", "urn", "rubble", "crack", "puddle", "root"],
    anchors: ["statue_guardian", "pillar_broken", "brazier", "bookshelf", "altar", "tomb_niche"],
    scenes: ["crypt", "ransacked", "battlefield", "library", "shrine"],
  },
  2: {
    id: 2,
    key: "forest",
    name: "Cursed Forest",
    ambient: "#111d15",
    ambientStrength: 0.66,
    fogColor: "#16281c",
    floorTone: ["2", "3", "v"],
    wallTone: ["u", "v", "w"],
    tileRemap: { 2: "a", 3: "b", 4: "c", 5: "v", 6: "w", w: "w", x: "x" },
    // Earth, not masonry: the ruins keep stone walls, the ground does not
    floorSet: ["ground_dirt_01", "ground_dirt_02", "ground_dirt_03", "ground_dirt_04", "ground_dirt_05", "ground_dirt_06"],
    accent: PALETTE.x,
    mossChar: "x",
    lightColor: PALETTE.x,
    atmosphere: "spores",
    decor: ["grass", "mushroom", "bush", "root", "leaf", "log", "rubble", "puddle", "flower", "vine"],
    anchors: ["tree_dead", "tree_twisted", "standing_stone", "pillar_broken", "root_arch", "stump"],
    scenes: ["overgrown", "ransacked", "battlefield", "shrine"],
  },
  3: {
    id: 3,
    key: "inferno",
    name: "Infernal Depths",
    ambient: "#1d0d09",
    ambientStrength: 0.62,
    fogColor: "#2a1109",
    floorTone: ["1", "2", "3"],
    wallTone: ["1", "3", "m"],
    tileRemap: { 2: "0", 3: "1", 4: "2", 5: "3", 6: "m", w: "m", x: "n" },
    floorSet: ["ground_ash_01", "ground_ash_02", "ground_ash_03", "ground_ash_04", "ground_ash_05", "ground_ash_06"],
    accent: PALETTE.o,
    mossChar: "m",
    lightColor: COLORS.flame,
    atmosphere: "embers",
    decor: ["lava_crack", "ash_pile", "bone", "obsidian_spike", "chain", "rubble", "crack", "scorch", "skull_pile"],
    anchors: ["brazier", "demon_statue", "pillar_broken", "obelisk", "anvil", "altar"],
    scenes: ["forge", "battlefield", "ransacked", "shrine"],
  },
  4: {
    id: 4,
    key: "frozen",
    name: "Frozen Abyss",
    ambient: "#0f2436",
    ambientStrength: 0.7,
    fogColor: "#17324a",
    floorTone: ["3", "4", "B"],
    wallTone: ["A", "4", "B"],
    tileRemap: { 2: "A", 3: "e", 4: "f", 5: "B", 6: "C", w: "B", x: "C" },
    floorSet: ["ground_snow_01", "ground_snow_02", "ground_snow_03", "ground_snow_04", "ground_snow_05", "ground_snow_06"],
    accent: PALETTE.C,
    mossChar: "B",
    lightColor: COLORS.frost,
    atmosphere: "snow",
    decor: ["icicle", "ice_block", "snow_drift", "bone", "rubble", "crack", "ice_spike", "puddle_frozen"],
    anchors: ["frozen_pillar", "frozen_statue", "pillar_broken", "ice_obelisk", "tomb_niche"],
    scenes: ["crypt", "battlefield", "ransacked", "shrine"],
  },
  5: {
    id: 5,
    key: "void",
    name: "Void Citadel",
    ambient: "#130a1e",
    ambientStrength: 0.6,
    fogColor: "#1d0f2e",
    floorTone: ["1", "2", "E"],
    wallTone: ["0", "E", "F"],
    tileRemap: { 2: "0", 3: "1", 4: "2", 5: "E", 6: "F", w: "F", x: "G" },
    floorSet: ["ground_void_01", "ground_void_02", "ground_void_03", "ground_void_04", "ground_void_05", "ground_void_06"],
    accent: PALETTE.G,
    mossChar: "F",
    lightColor: COLORS.mystic,
    atmosphere: "cosmic",
    decor: ["glyph", "fragment", "rune_stone", "crack_void", "rubble", "star_hole", "bone"],
    anchors: ["obelisk_void", "shattered_pillar", "glyph_circle", "statue_guardian", "altar"],
    scenes: ["shrine", "ransacked", "battlefield", "crypt"],
  },
};

export function getBiomeArt(floorOrId) {
  const id = ((floorOrId - 1) % 5) + 1;
  return BIOME_ART[id] || BIOME_ART[1];
}

/** Parse "#rrggbb" -> [r,g,b]. */
export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Blend two hex colors. t=0 -> a, t=1 -> b. */
export function mix(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/** Quantized shade: keeps colors on-palette-ish by stepping in 1/8ths. */
export function shade(hex, amount) {
  const step = Math.round(amount * 8) / 8;
  return step >= 0 ? mix(hex, "#ffffff", step) : mix(hex, "#000000", -step);
}

export function withAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
