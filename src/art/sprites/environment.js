/**
 * ENVIRONMENT — tileset, walls and the prop vocabulary (ART_BIBLE §9, §10).
 *
 * Floors and walls are authored in neutral stone tones ("2" mortar, "3" base,
 * "4" mid, "5" light, "6" highlight) and biome-remapped at compile time, so a
 * single authored tile serves all five biomes while staying palette-legal.
 *
 * Families with natural variation (rock, rubble, crack, grass, bush, tree,
 * bone, icicle) are seeded pixel-art constructors: they stamp the same
 * primitives a human would — stepped silhouette, 3-tone ramp, moss dither —
 * so one generator yields many coherent variants (ART_BIBLE §2).
 *
 * Pure data — no DOM.
 */

import { shape, seeded } from "../Shape.js";

export const TILE = 32;

/* ==================================================================== *
 * FLOORS — 32x32, individual stones with 1px mortar joints.
 * ==================================================================== */

/**
 * Organic growth patch: dense at the center, ragged at the rim, two tones.
 * Used for moss, frost bloom and ash — anything that "creeps" over stone.
 * Deliberately not a rectangle of 50% checker, which reads as noise.
 */
function growth(s, cx, cy, rx, ry, seed, dark, light, over = true) {
  const rnd = seeded(seed);
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      if (over && !s.solid(x, y)) continue;
      // Coverage falls off toward the rim so the edge frays instead of cutting
      if (rnd() > 0.85 - d * 0.75) continue;
      s.px(x, y, rnd() < 0.22 ? light : dark);
    }
  }
}

const COURSE_H = 8;

/**
 * Lay one course of stones with mortar joints.
 *
 * Course rows sit on a FIXED 8px grid shared by every floor variant, so the
 * horizontal joints run unbroken from tile to tile and read as masonry courses
 * instead of exposing the 32px tile lattice. Only the vertical joints are
 * staggered per tile, which is what real coursed stone looks like.
 * Contrast is kept low: the mortar is one step down, the lit lip one step up.
 */
function stoneCourse(s, y, seed) {
  const rnd = seeded(seed);
  let x = -Math.floor(rnd() * 11);
  while (x < TILE) {
    const w = 7 + Math.floor(rnd() * 10);
    const r = rnd();
    const base = r < 0.2 ? "4" : r < 0.3 ? "2" : "3";
    const lit = base === "4" ? "5" : base === "2" ? "3" : "4";
    s.box(x, y, w - 1, COURSE_H - 1, base);
    s.run(x, y, w - 1, lit);
    x += w;
  }
}

function makeFloor(variant) {
  return shape(TILE, TILE, (s) => {
    s.box(0, 0, TILE, TILE, "2");
    const seed = 1000 + variant * 137;
    for (let i = 0; i < TILE / COURSE_H; i++) {
      stoneCourse(s, i * COURSE_H, seed + i * 31 + variant * 7);
    }

    // Grain: a few pixels of wear, only on stone faces
    const g = seeded(seed * 7);
    for (let k = 0; k < 7; k++) {
      const x = Math.floor(g() * TILE);
      const yy = Math.floor(g() * TILE);
      if (s.get(x, yy) === "2") continue;
      s.px(x, yy, g() < 0.5 ? "4" : "2");
    }

    if (variant === 3) {
      s.step(4, 3, 6, 2, 1, 1, "2");
      s.step(17, 12, 5, 3, 1, 1, "2");
      s.step(22, 23, 4, 2, -1, 1, "2");
      s.px(10, 9, "2");
      s.px(11, 10, "2");
    }
    if (variant === 4) {
      // A missing stone: you can see the void beneath the floor
      s.box(9, 12, 13, 10, "1");
      s.box(10, 13, 11, 8, "2");
      s.run(10, 13, 11, "3");
      s.box(19, 19, 2, 2, "3");
      s.px(12, 17, "3");
    }
    if (variant === 5) {
      // Moss creeping out of the joints — dark, so it never reads as confetti
      growth(s, 8, 26, 9, 6, seed + 5, "u", "v");
      growth(s, 26, 9, 6, 5, seed + 9, "u", "v");
    }
  });
}

/* ==================================================================== *
 * ORGANIC GROUND — earth, ash, snow and void surfaces.
 *
 * Coursed stone is wrong for these biomes: soil and snow have no joints, so a
 * remapped brick tile reads as "brown bricks" rather than as ground. These are
 * built from irregular patches, pebbles and growth, and are authored in their
 * final colours (the registry skips the biome remap for them).
 * ==================================================================== *
 */

/** Irregular patch with a frayed rim — the base unit of every ground tile. */
function patch(s, cx, cy, rx, ry, color, seed) {
  const rnd = seeded(seed);
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      if (d > 0.5 && rnd() < 0.45) continue;   // fray the edge, keep the core
      s.px(x, y, color);
    }
  }
}

/** Scattered 1-2px stones, biased away from an even spread. */
function pebbles(s, seed, count, dark, light) {
  const rnd = seeded(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd() * TILE);
    const y = Math.floor(rnd() * TILE);
    const w = rnd() < 0.3 ? 2 : 1;
    s.box(x, y, w, 1, dark);
    if (rnd() < 0.5) s.px(x, y - 1, light);
  }
}

/** Grass tuft: three blades of different heights from one root pixel. */
function tuft(s, x, y, seed, dark, light) {
  const rnd = seeded(seed);
  const n = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) {
    const h = 2 + Math.floor(rnd() * 3);
    const lean = i - 1;
    for (let k = 0; k < h; k++) {
      s.px(x + lean + (k > 1 ? lean : 0), y - k, k === h - 1 ? light : dark);
    }
  }
}

/**
 * Lay 4-6 patches at seed-driven positions. Fixed positions would make every
 * tile share the same macro layout, which reads as an obvious repeat once a
 * room is tiled with them.
 */
function patchField(s, seed, dark, light, n = 5) {
  const rnd = seeded(seed);
  for (let i = 0; i < n; i++) {
    patch(
      s,
      Math.floor(rnd() * (TILE + 8)) - 4,
      Math.floor(rnd() * (TILE + 8)) - 4,
      5 + Math.floor(rnd() * 6),
      4 + Math.floor(rnd() * 5),
      rnd() < 0.55 ? dark : light,
      seed + i * 17
    );
  }
}

function makeGroundDirt(variant) {
  return shape(TILE, TILE, (s) => {
    const seed = 3100 + variant * 71;
    const rnd = seeded(seed);
    s.box(0, 0, TILE, TILE, "b");
    // Damp hollows and dry crests give the soil relief without a grid
    patchField(s, seed + 1, "a", "c", 5);
    pebbles(s, seed + 11, 9, "a", "d");

    if (variant === 1) {
      // A root creeping across the surface
      let x = 0;
      let y = 12 + Math.floor(rnd() * 6);
      while (x < TILE) {
        s.box(x, y, 2, 2, "a");
        s.px(x, y, "c");
        x += 2;
        if (rnd() < 0.4) y += rnd() < 0.5 ? 1 : -1;
      }
    }
    if (variant === 2) {
      tuft(s, 7, 20, seed + 21, "v", "w");
      tuft(s, 19, 27, seed + 22, "v", "w");
      tuft(s, 26, 12, seed + 23, "u", "v");
    }
    if (variant === 3) {
      // Dead leaves
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(rnd() * (TILE - 2));
        const y = Math.floor(rnd() * (TILE - 1));
        s.box(x, y, 2, 1, rnd() < 0.5 ? "W" : "V");
      }
    }
    if (variant === 4) growth(s, 14, 16, 11, 9, seed + 31, "u", "v", false);
    if (variant === 5) {
      patch(s, 16, 18, 10, 6, "a", seed + 41);
      s.run(9, 18, 12, "1");
      s.run(11, 19, 8, "1");
    }
  });
}

function makeGroundAsh(variant) {
  return shape(TILE, TILE, (s) => {
    const seed = 3300 + variant * 89;
    const rnd = seeded(seed);
    s.box(0, 0, TILE, TILE, "1");
    // Cooled basalt plates with dark fissures between them
    patchField(s, seed + 1, "2", "3", 5);
    for (let i = 0; i < 3; i++) {
      let x = Math.floor(rnd() * TILE);
      let y = Math.floor(rnd() * TILE);
      for (let k = 0; k < 7; k++) {
        s.px(x, y, "0");
        x += rnd() < 0.5 ? 1 : 0;
        y += rnd() < 0.5 ? 1 : -1;
      }
    }
    pebbles(s, seed + 11, 8, "0", "3");

    if (variant === 1 || variant === 4) {
      // Ember vein: the only saturated thing on the tile
      let x = 0;
      let y = 14 + Math.floor(rnd() * 6);
      while (x < TILE) {
        s.px(x, y, "m");
        s.px(x, y + 1, "n");
        if (rnd() < 0.25) s.px(x, y, "o");
        x += 1;
        if (rnd() < 0.35) y += rnd() < 0.5 ? 1 : -1;
      }
    }
    if (variant === 2) growth(s, 12, 20, 10, 7, seed + 21, "2", "3", false);
    if (variant === 3) {
      patch(s, 22, 12, 8, 6, "0", seed + 31);
      s.px(22, 12, "n");
      s.px(24, 14, "m");
    }
    if (variant === 5) {
      for (let i = 0; i < 5; i++) {
        s.px(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), "o");
      }
    }
  });
}

function makeGroundSnow(variant) {
  return shape(TILE, TILE, (s) => {
    const seed = 3500 + variant * 97;
    const rnd = seeded(seed);
    s.box(0, 0, TILE, TILE, "8");
    // Drifts catch the light on top and shade into blue in the hollows
    patchField(s, seed + 1, "9", "7", 5);
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(rnd() * (TILE - 4));
      const y = Math.floor(rnd() * (TILE - 2));
      s.run(x, y, 3 + Math.floor(rnd() * 3), "B");     // wind scour
    }
    if (variant === 1) {
      // Bare stone showing through
      patch(s, 18, 17, 8, 6, "4", seed + 21);
      patch(s, 18, 17, 5, 3, "5", seed + 22);
      s.px(16, 16, "6");
    }
    if (variant === 2) {
      patch(s, 12, 20, 9, 6, "D", seed + 31);
      s.px(10, 19, "Q");
      s.px(15, 22, "Q");
    }
    if (variant === 3) {
      // Cracked ice sheet
      let x = 2;
      let y = 8 + Math.floor(rnd() * 10);
      while (x < TILE - 2) {
        s.px(x, y, "A");
        s.px(x, y + 1, "B");
        x += 1;
        if (rnd() < 0.3) y += rnd() < 0.5 ? 1 : -1;
      }
    }
    if (variant === 4) pebbles(s, seed + 41, 7, "5", "7");
    if (variant === 5) {
      for (let i = 0; i < 4; i++) {
        s.px(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), "D");
      }
    }
  });
}

function makeGroundVoid(variant) {
  return shape(TILE, TILE, (s) => {
    const seed = 3700 + variant * 103;
    const rnd = seeded(seed);
    s.box(0, 0, TILE, TILE, "1");
    patchField(s, seed + 1, "E", "2", 5);
    for (let i = 0; i < 3; i++) {
      let x = Math.floor(rnd() * TILE);
      let y = Math.floor(rnd() * TILE);
      for (let k = 0; k < 8; k++) {
        s.px(x, y, "0");
        x += rnd() < 0.6 ? 1 : 0;
        y += rnd() < 0.5 ? 1 : -1;
      }
    }
    // Starfield showing through the floor
    for (let i = 0; i < 3 + variant; i++) {
      s.px(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), rnd() < 0.5 ? "H" : "U");
    }
    if (variant === 1) {
      s.box(13, 13, 6, 1, "F");
      s.box(15, 11, 2, 6, "F");
      s.px(16, 14, "G");
    }
    if (variant === 2) patch(s, 20, 18, 7, 5, "F", seed + 21);
    if (variant === 3) {
      s.box(6, 20, 4, 4, "0");
      s.px(7, 21, "G");
      s.px(8, 22, "U");
    }
    if (variant === 5) pebbles(s, seed + 31, 6, "0", "E");
  });
}

/** Standing water: dark pool, a dark rim, and two thin reflection lines. */
const floorPuddle = shape(TILE, TILE, (s) => {
  s.spans(11, [[9, 13], [6, 19], [4, 23], [3, 25], [3, 25], [4, 23], [6, 19], [9, 13]], "X");
  s.spans(12, [[8, 16], [6, 20], [5, 22], [5, 22], [6, 19], [8, 14]], "1");
  s.spans(13, [[9, 13], [7, 17], [7, 17], [8, 15]], "X");
  s.run(11, 14, 7, "Y");
  s.run(18, 16, 4, "Y");
  s.run(12, 15, 3, "Z");
  s.px(20, 17, "Z");
  s.outline("1");
});

/* ==================================================================== *
 * WALLS — a lit top surface, a dark front face, and a cast shadow.
 * ==================================================================== */

function makeWallTop(variant) {
  return shape(TILE, TILE, (s) => {
    s.box(0, 0, TILE, TILE, "4");
    const rnd = seeded(500 + variant * 91);
    // Coursed masonry, joints offset every other row
    for (let row = 0; row < 4; row++) {
      const y = row * 8;
      const off = row % 2 ? 6 : 0;
      s.run(0, y, TILE, "2");
      for (let x = -off; x < TILE; x += 12) {
        s.col(x + 11, y + 1, 7, "2");
        s.box(x, y + 1, 11, 6, "5");
        s.run(x, y + 1, 11, "6");
        if (rnd() < 0.35) s.px(x + 3 + Math.floor(rnd() * 6), y + 4, "4");
      }
    }
    if (variant === 1) {
      s.step(8, 2, 6, 2, 1, 1, "2");     // crack
      s.step(22, 16, 4, 2, -1, 1, "2");
    }
    if (variant === 2) {
      growth(s, 7, 5, 9, 6, 21, "v", "w");      // moss on top
      growth(s, 23, 13, 8, 7, 33, "v", "w");
    }
  });
}

function makeWallFace(variant) {
  return shape(TILE, 10, (s) => {
    s.box(0, 0, TILE, 10, "3");
    s.run(0, 0, TILE, "5");                 // lit lip where face meets top
    s.run(0, 1, TILE, "4");
    for (let x = variant * 4; x < TILE; x += 11) {
      s.col(x, 2, 8, "2");
    }
    s.run(0, 5, TILE, "2");
    s.box(0, 8, TILE, 2, "1");
    const rnd = seeded(77 + variant * 13);
    for (let i = 0; i < 6; i++) s.px(Math.floor(rnd() * TILE), 3 + Math.floor(rnd() * 4), "2");
    if (variant === 2) {
      growth(s, 8, 7, 8, 3, 41, "v", "w");
      growth(s, 25, 8, 6, 2, 43, "v", "w");
    }
  });
}

/** Soft-edged (but dithered, never gradient) shadow cast onto the floor. */
const wallShadow = shape(TILE, 6, (s) => {
  s.box(0, 0, TILE, 2, "1");
  s.dither(0, 2, TILE, 2, "1", 0);
  s.dither(0, 4, TILE, 2, "1", 1);
});

/** Doorway jamb + keystone, placed at every carved opening. */
const archJamb = shape(8, 24, (s) => {
  s.box(0, 0, 8, 24, "4");
  s.box(1, 1, 6, 22, "5");
  s.run(1, 1, 6, "6");
  for (let y = 3; y < 24; y += 6) s.run(1, y, 6, "2");
  s.col(7, 0, 24, "2");
  s.outline("0");
});

const archKey = shape(16, 10, (s) => {
  s.spans(0, [[2, 12], [1, 14], [0, 16], [0, 16]], "5");
  s.box(0, 4, 16, 6, "4");
  s.run(2, 0, 12, "6");
  s.col(7, 2, 8, "2");
  s.col(8, 2, 8, "2");
  s.outline("0");
});

/* ==================================================================== *
 * SEEDED FAMILIES
 * ==================================================================== */

/** Hard-edged pixel ellipse — the building block for organic masses. */
function lobe(s, cx, cy, rx, ry, c) {
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t <= 0) continue;
    const w = Math.round(rx * Math.sqrt(t));
    s.run(cx - w, cy + y, w * 2 + 1, c);
  }
  return s;
}

/**
 * Rocks: broad at the base, faceted, lit from the upper-left.
 * The profile widens monotonically downward so the mass reads as weight.
 */
function makeRock(seed, size = 16) {
  return shape(size, size, (s) => {
    const rnd = seeded(seed);
    const baseY = size - 2;
    const H = Math.max(5, Math.round(size * (0.42 + rnd() * 0.26)));
    const W = Math.max(7, Math.round(size * (0.68 + rnd() * 0.26)));
    const cx = Math.round(size / 2 + (rnd() < 0.5 ? 0 : 1));

    // Silhouette: width grows from the crown to the base, with 1px facet jogs
    const widths = [];
    let prev = 0;
    for (let j = 0; j < H; j++) {
      const t = j / (H - 1);
      let w = Math.round(W * (0.34 + 0.66 * Math.pow(t, 0.55)));
      if (rnd() < 0.35) w -= 1;
      w = Math.max(prev, Math.max(2, w));
      widths.push(w);
      prev = w - (rnd() < 0.2 ? 1 : 0);
    }
    // Off-center the crown so it never looks like a symmetric dome
    const skew = rnd() < 0.5 ? -1 : 1;
    const lefts = widths.map((w, j) => {
      const t = 1 - j / (H - 1);
      return Math.round(cx - w / 2 + skew * t * (W * 0.12));
    });

    for (let j = 0; j < H; j++) {
      s.run(lefts[j], baseY - H + 1 + j, widths[j], "5");
    }
    // Lit facet: upper-left third
    for (let j = 0; j < Math.ceil(H * 0.6); j++) {
      const y = baseY - H + 1 + j;
      const w = Math.max(1, Math.round(widths[j] * 0.45) - Math.floor(j / 3));
      s.run(lefts[j], y, w, "6");
    }
    // Shadowed facet: right edge and the base band
    for (let j = 0; j < H; j++) {
      const y = baseY - H + 1 + j;
      const w = Math.max(1, Math.round(widths[j] * (j > H * 0.6 ? 0.3 : 0.22)));
      s.run(lefts[j] + widths[j] - w, y, w, "4");
    }
    s.run(lefts[H - 1], baseY, widths[H - 1], "4");
    // Crevice: a stepped crack running down the face
    const cxk = lefts[Math.floor(H / 3)] + Math.round(widths[Math.floor(H / 3)] * 0.5);
    s.step(cxk, baseY - H + 2, Math.max(2, Math.floor(H / 2)), 1, skew, 1, "4");

    if (rnd() < 0.55) growth(s, cx - 1, baseY - H + 3, Math.max(2, Math.round(W / 3)), 2, seed + 3, "v", "w");
    s.outline("0");
    s.contact("1", 1);
  });
}

/** Rubble: 3-5 small chips, ground-level, no height. */
function makeRubble(seed) {
  return shape(16, 12, (s) => {
    const rnd = seeded(seed);
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const x = 1 + Math.floor(rnd() * 11);
      const y = 5 + Math.floor(rnd() * 5);
      const w = 2 + Math.floor(rnd() * 3);
      s.box(x, y, w, 2, "5");
      s.run(x, y, w, "6");
    }
    s.outline("1");
  });
}

/** Floor cracks: jagged, low contrast, background-tier. */
function makeCrack(seed) {
  return shape(24, 16, (s) => {
    const rnd = seeded(seed);
    let x = 2;
    let y = 4 + Math.floor(rnd() * 6);
    for (let i = 0; i < 20; i++) {
      s.px(x, y, "1");
      if (rnd() < 0.3) s.px(x, y + 1, "2");
      x += 1;
      if (rnd() < 0.4) y += rnd() < 0.5 ? 1 : -1;
      y = Math.max(1, Math.min(14, y));
      if (x > 21) break;
    }
    // one branch
    let bx = 8 + Math.floor(rnd() * 6);
    let by = y;
    for (let i = 0; i < 6; i++) {
      s.px(bx, by, "1");
      bx += rnd() < 0.5 ? 1 : 0;
      by += 1;
      if (by > 14) break;
    }
  });
}

/**
 * Grass: 2-3 clumps of splayed blades sharing a dark base tuft.
 * Blades curve by stepping sideways as they rise, so the tuft reads as
 * growing rather than as a row of fence posts.
 */
function makeGrass(seed, dead = false) {
  const dark = dead ? "V" : "u";
  const mid = dead ? "V" : "v";
  const light = dead ? "W" : "w";
  const tip = dead ? "W" : "x";
  return shape(16, 12, (s) => {
    const rnd = seeded(seed);
    const clumps = 2 + Math.floor(rnd() * 2);
    for (let c = 0; c < clumps; c++) {
      const bx = 3 + Math.floor((c * 11) / clumps) + Math.floor(rnd() * 3);
      const blades = 3 + Math.floor(rnd() * 3);
      for (let b = 0; b < blades; b++) {
        const h = 4 + Math.floor(rnd() * 5);
        const lean = b - (blades - 1) / 2;         // splay outward from center
        for (let j = 0; j < h; j++) {
          const t = j / Math.max(1, h - 1);
          const x = bx + Math.round(lean * t * 1.8);
          s.px(x, 10 - j, j === h - 1 ? tip : j > h * 0.5 ? light : mid);
        }
      }
      s.run(bx - 1, 11, 3, dark);
    }
  });
}

/**
 * Bushes: three overlapping leaf lobes, dark underside, lit crowns and a
 * couple of gaps punched through so the silhouette never reads as a pancake.
 * Dead variants are a bare tangle of twigs instead of a solid mass.
 */
function makeBush(seed, dead = false) {
  return shape(20, 18, (s) => {
    const rnd = seeded(seed);
    if (dead) {
      // A tangle: twigs fan out from a few points along the base
      for (let i = 0; i < 16; i++) {
        const root = 6 + Math.floor(rnd() * 8);
        const dir = i % 2 ? 1 : -1;
        let x = root;
        let y = 16 - Math.floor(rnd() * 2);
        const len = 5 + Math.floor(rnd() * 9);
        const drift = 1 + Math.floor(rnd() * 3);
        for (let j = 0; j < len; j++) {
          s.px(x, y, j > len * 0.65 ? "c" : "b");
          y -= 1;
          if (j % drift === 0) x += dir;
          if (y < 1) break;
        }
        if (rnd() < 0.45) {
          s.px(x + dir, y, "c");
          s.px(x + dir * 2, y - 1, "c");
        }
      }
      s.run(5, 17, 11, "a");
      s.px(4, 17, "b");
      s.px(16, 17, "b");
      s.outline("0");
      s.contact("1", 4);
      return;
    }
    lobe(s, 6, 11, 5, 4, "v");
    lobe(s, 13, 11, 5, 4, "v");
    lobe(s, 9, 7, 6, 4, "v");
    // Lit crowns on the upper-left of each lobe
    lobe(s, 8, 6, 4, 2, "w");
    lobe(s, 5, 10, 3, 2, "w");
    s.run(6, 4, 4, "x");
    s.px(11, 5, "x");
    s.px(3, 9, "x");
    // Dark underside
    s.dither(1, 13, 18, 5, "u", 0, true);
    s.run(4, 16, 12, "u");
    // Punch two gaps to break the mass
    s.px(10, 9, ".");
    s.px(15, 12, ".");
    if (rnd() < 0.6) {
      s.px(5, 8, "k");        // berries
      s.px(14, 10, "k");
    }
    s.outline("0");
    s.contact("1", 4);
  });
}

/**
 * Trees: a leaning stepped trunk with a root flare, forked branches, and
 * either bare claw-like limbs or a layered canopy of lobes.
 */
function makeTree(seed, kind = "dead") {
  return shape(32, 48, (s) => {
    const rnd = seeded(seed);
    const cx = 15 + Math.floor(rnd() * 2);
    const lean = rnd() < 0.5 ? -1 : 1;
    const crown = kind === "dead" ? 13 : 18;

    // Trunk: narrows as it rises, drifts sideways in steps
    let tx = cx;
    for (let y = 47; y > crown; y--) {
      const t = (47 - y) / (47 - crown);
      const w = Math.max(3, Math.round((7 - t * 3) + (y > 44 ? 2 : 0)));
      s.run(tx - Math.floor(w / 2), y, w, "b");
      s.col(tx - Math.floor(w / 2), y, 1, "c");
      s.col(tx + Math.ceil(w / 2) - 1, y, 1, "a");
      if ((47 - y) % 6 === 5) tx += lean;
    }
    // Root flare
    s.box(cx - 7, 45, 14, 3, "b");
    s.box(cx - 9, 46, 18, 2, "a");
    s.px(cx - 8, 46, "b");
    s.px(cx + 7, 46, "b");

    // Branches: fork off the trunk and step upward/outward
    const branches = kind === "dead" ? 5 : 3;
    for (let i = 0; i < branches; i++) {
      const y0 = crown + 2 + i * 4;
      const dir = i % 2 ? 1 : -1;
      let bx = tx + dir * 2;
      let by = y0;
      const len = 4 + Math.floor(rnd() * 6);
      for (let j = 0; j < len; j++) {
        s.px(bx, by, "b");
        s.px(bx, by - 1, "c");
        bx += dir;
        if (j % 2 === 0) by -= 1;
        // occasional twig fork
        if (j === len - 2 && rnd() < 0.6) {
          s.px(bx, by - 2, "b");
          s.px(bx + dir, by - 3, "b");
        }
      }
    }

    if (kind === "dead") {
      // A few bare upper limbs reaching out of the crown
      for (let i = 0; i < 3; i++) {
        let bx = tx + (i - 1) * 2;
        let by = crown + 1;
        for (let j = 0; j < 6 + Math.floor(rnd() * 4); j++) {
          s.px(bx, by, "b");
          by -= 1;
          if (rnd() < 0.4) bx += i === 1 ? 0 : i === 0 ? -1 : 1;
        }
      }
    } else {
      lobe(s, tx - 6, 12, 8, 6, "v");
      lobe(s, tx + 6, 13, 8, 6, "v");
      lobe(s, tx, 6, 10, 6, "v");
      lobe(s, tx - 4, 5, 6, 3, "w");
      lobe(s, tx + 5, 9, 5, 3, "w");
      s.run(tx - 5, 1, 7, "x");
      s.px(tx + 7, 6, "x");
      s.px(tx - 9, 11, "x");
      s.dither(tx - 14, 15, 28, 5, "u", 0, true);
      // Gaps so light reads through the canopy
      s.px(tx - 2, 10, ".");
      s.px(tx + 3, 8, ".");
      s.px(tx - 8, 14, ".");
    }
    s.outline("0");
    s.contact("1", 10);
  });
}

/** Bone scatter. */
function makeBone(seed) {
  return shape(16, 10, (s) => {
    const rnd = seeded(seed);
    const y = 5 + Math.floor(rnd() * 3);
    const len = 7 + Math.floor(rnd() * 5);
    const x = 2;
    s.run(x, y, len, "N");
    s.run(x, y + 1, len, "M");
    s.box(x - 1, y - 1, 2, 3, "N");
    s.box(x + len - 1, y - 1, 2, 3, "N");
    s.px(x + 2, y, "O");
    if (rnd() < 0.5) {
      s.run(x + 2, y + 3, 6, "M");
      s.run(x + 2, y + 3, 4, "N");
    }
    s.outline("1");
  });
}

function makeIcicle(seed) {
  return shape(12, 20, (s) => {
    const rnd = seeded(seed);
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const x = 2 + i * 4;
      const h = 8 + Math.floor(rnd() * 9);
      s.taper(x + 1, 0, h, 4, 1, "C");
      s.col(x + 1, 0, Math.floor(h * 0.7), "D");
    }
    s.outline("A");
  });
}

/* ==================================================================== *
 * HAND-AUTHORED PROPS
 * ==================================================================== */

const barrel = shape(16, 20, (s) => {
  s.box(2, 2, 12, 17, "c");
  s.box(3, 2, 4, 17, "d");
  s.box(11, 2, 3, 17, "b");
  s.box(1, 4, 14, 2, "f");        // iron hoops
  s.box(1, 15, 14, 2, "f");
  s.box(1, 4, 14, 1, "g");
  s.box(1, 15, 14, 1, "g");
  s.box(2, 0, 12, 3, "b");        // lid
  s.box(3, 1, 10, 1, "d");
  s.col(7, 3, 16, "b");
  s.col(10, 3, 16, "b");
  s.outline("0");
  s.contact("1", 3);
});

const crate = shape(16, 16, (s) => {
  s.box(1, 2, 14, 13, "c");
  s.box(2, 3, 12, 11, "d");
  s.box(1, 2, 14, 2, "d");
  s.box(1, 13, 14, 2, "b");
  s.step(2, 3, 11, 1, 1, 1, "b");   // diagonal brace
  s.box(1, 7, 14, 2, "b");
  s.box(2, 8, 12, 1, "c");
  s.px(3, 4, "d");
  s.px(12, 12, "b");
  s.outline("0");
  s.contact("1", 3);
});

const pot = shape(14, 16, (s) => {
  s.spans(3, [[3, 8], [2, 10], [1, 12], [1, 12], [1, 12], [1, 12], [2, 10], [2, 10], [3, 8], [3, 8], [4, 6]], "n");
  s.spans(4, [[3, 4], [2, 4], [2, 4], [2, 4], [2, 4], [3, 3], [3, 3]], "o");
  s.box(3, 1, 8, 3, "m");
  s.box(4, 1, 6, 1, "n");
  s.box(1, 8, 12, 1, "m");
  s.outline("0");
  s.contact("1", 3);
});

const urn = shape(14, 20, (s) => {
  s.spans(4, [[4, 6], [3, 8], [2, 10], [2, 10], [2, 10], [2, 10], [3, 8], [3, 8], [4, 6], [4, 6], [3, 8], [3, 8]], "M");
  s.spans(5, [[4, 3], [3, 3], [3, 3], [3, 3], [3, 3], [4, 3]], "N");
  s.box(4, 1, 6, 4, "M");
  s.box(5, 1, 4, 1, "N");
  s.box(3, 0, 8, 2, "M");
  s.box(2, 10, 10, 1, "5");
  s.outline("0");
  s.contact("1", 3);
});

const tombstone = shape(18, 24, (s) => {
  s.spans(2, [[5, 8], [3, 12], [2, 14], [1, 16]], "5");
  s.box(1, 6, 16, 16, "5");
  s.box(2, 7, 14, 14, "4");
  s.spans(3, [[5, 7], [3, 11], [2, 13]], "6");
  s.box(2, 7, 4, 14, "6");
  s.box(5, 10, 8, 2, "2");        // engraving
  s.box(5, 14, 8, 1, "2");
  s.box(5, 17, 6, 1, "2");
  s.box(0, 21, 18, 3, "4");
  s.box(1, 21, 16, 1, "5");
  growth(s, 5, 18, 5, 4, 61, "v", "w");
  growth(s, 13, 20, 4, 3, 67, "v", "w");
  s.outline("0");
  s.contact("1", 3);
});

const skullPile = shape(20, 14, (s) => {
  const skull = (x, y) => {
    s.box(x, y, 7, 6, "N");
    s.box(x + 1, y, 5, 1, "O");
    s.box(x + 1, y + 2, 2, 2, "0");
    s.box(x + 4, y + 2, 2, 2, "0");
    s.box(x + 2, y + 5, 3, 2, "M");
    s.px(x + 3, y + 6, "0");
  };
  s.box(1, 9, 18, 4, "M");
  skull(2, 6);
  skull(11, 5);
  skull(6, 2);
  s.run(2, 12, 16, "M");
  s.outline("0");
  s.contact("1", 4);
});

const candle = shape(8, 14, (s) => {
  // Aged wax, not white: the flame should be the brightest thing on the prop
  s.box(2, 5, 4, 8, "M");
  s.box(2, 5, 2, 8, "N");
  s.box(1, 12, 6, 2, "M");
  s.px(2, 12, "2");
  s.px(5, 12, "2");
  s.px(3, 4, "R");           // molten lip
  s.px(3, 2, "p");
  s.px(3, 3, "R");
  s.px(4, 3, "o");
  s.outline("0");
});

/**
 * Wall torch: an iron sconce, not a lamp post. Reads as *mounted* — a riveted
 * back plate flush to the stone, a short arm, a fire bowl, then the flame — so
 * it never looks like a prop standing in the middle of the floor.
 */
function makeTorch(frame) {
  return shape(12, 18, (s) => {
    // Back plate against the stone
    s.box(4, 11, 4, 6, "e");
    s.box(4, 11, 4, 1, "f");
    s.px(5, 13, "g");
    s.px(6, 15, "g");
    // Arm rising out of the plate
    s.box(5, 8, 2, 4, "f");
    s.px(5, 8, "g");
    // Fire bowl
    s.box(3, 5, 6, 3, "f");
    s.run(3, 5, 6, "g");
    s.px(3, 7, "e");
    s.px(8, 7, "e");
    s.box(4, 6, 4, 1, "m");            // charred interior

    const wob = [0, 1, -1][frame];
    const tall = [5, 7, 6][frame];
    s.taper(6 + wob, 5 - tall, tall, 5, 2, "n");
    s.taper(6 + wob, 6 - tall, tall - 1, 3, 1, "o");
    s.taper(6 + wob, 7 - tall, Math.max(2, tall - 3), 2, 1, "p");
    s.px(6 + wob, 5 - tall, "p");
    s.outline("0");
  });
}

function makeBrazier(frame) {
  return shape(20, 26, (s) => {
    s.box(6, 18, 8, 6, "f");        // stem
    s.box(7, 18, 3, 6, "g");
    s.box(3, 23, 14, 3, "e");       // base
    s.box(4, 23, 12, 1, "f");
    s.spans(11, [[2, 16], [2, 16], [3, 14], [3, 14], [4, 12], [5, 10], [6, 8]], "e");
    s.run(2, 11, 16, "g");
    s.box(4, 12, 12, 3, "m");       // coals: mostly dark, a few live embers
    for (const [ex, ey] of [[5, 13], [8, 12], [11, 14], [14, 13], [9, 14]]) {
      s.px(ex + (frame === 1 ? 1 : 0), ey, frame === 2 ? "n" : "o");
    }
    s.px(7, 13, "p");
    const h = [8, 11, 9][frame];
    const wob = [0, -1, 1][frame];
    s.taper(10 + wob, 12 - h, h, 9, 3, "n");
    s.taper(10 + wob, 13 - h, h - 1, 6, 2, "o");
    s.taper(10 + wob, 14 - h, Math.max(2, h - 4), 3, 1, "p");
    s.outline("0");
    s.contact("1", 5);
  });
}

const chain = shape(8, 28, (s) => {
  for (let y = 0; y < 28; y += 4) {
    s.box(2, y, 4, 3, "f");
    s.box(3, y + 1, 2, 1, "1");
    s.px(2, y, "g");
  }
  s.outline("1");
});

const bookshelf = shape(24, 34, (s) => {
  s.box(0, 0, 24, 34, "b");
  s.box(1, 1, 22, 32, "c");
  s.box(2, 2, 20, 30, "a");
  for (let r = 0; r < 3; r++) {
    const y = 3 + r * 10;
    s.box(2, y + 8, 20, 2, "c");
    s.box(2, y + 8, 20, 1, "d");
    let x = 3;
    const seed = seeded(31 + r * 7);
    while (x < 21) {
      const w = 2 + Math.floor(seed() * 2);
      const h = 6 + Math.floor(seed() * 2);
      const col = ["j", "N", "F", "v", "b"][Math.floor(seed() * 5)];
      s.box(x, y + 8 - h, w, h, col);
      s.run(x, y + 8 - h, w, "9");
      x += w + 1;
    }
  }
  s.outline("0");
  s.contact("1", 4);
});

const tableBroken = shape(26, 18, (s) => {
  s.box(2, 4, 22, 4, "c");        // top, tilted
  s.box(2, 4, 22, 1, "d");
  s.box(16, 8, 8, 2, "b");
  s.box(3, 8, 3, 9, "b");         // one leg standing
  s.box(3, 8, 1, 9, "c");
  s.box(18, 10, 7, 3, "b");       // one leg snapped off
  s.box(20, 13, 3, 4, "b");
  s.box(8, 14, 6, 2, "b");        // splinters
  s.px(12, 12, "c");
  s.outline("0");
  s.contact("1", 4);
});

const banner = shape(14, 30, (s) => {
  s.box(0, 0, 14, 2, "f");        // rod
  s.box(0, 0, 14, 1, "g");
  s.box(2, 2, 10, 22, "j");
  s.box(3, 2, 3, 22, "k");
  s.box(2, 2, 10, 1, "i");
  s.spans(24, [[2, 10], [3, 4], [7, 4], [4, 2], [8, 2]], "j");
  s.box(5, 8, 4, 4, "s");         // sigil
  s.box(6, 9, 2, 2, "t");
  s.outline("0");
});

const swordPlanted = shape(12, 26, (s) => {
  s.box(5, 4, 2, 16, "h");        // blade in the floor
  s.box(6, 4, 1, 16, "9");
  s.box(4, 20, 4, 2, "g");
  s.box(2, 2, 8, 2, "f");         // crossguard
  s.box(3, 2, 6, 1, "g");
  s.box(5, 0, 2, 2, "b");
  s.px(5, 0, "s");
  s.outline("0");
  s.contact("1", 3);
});

const shieldBroken = shape(16, 18, (s) => {
  s.spans(1, [[3, 10], [2, 12], [1, 14], [1, 14], [1, 14], [2, 12], [2, 12], [3, 10], [4, 8], [5, 6], [6, 4]], "f");
  s.spans(2, [[3, 8], [2, 10], [2, 10], [2, 10], [3, 8], [3, 8], [4, 6]], "g");
  s.box(6, 5, 4, 4, "s");
  s.box(9, 3, 6, 9, ".");         // the shattered corner
  s.step(9, 3, 5, 2, 1, 1, "e");
  s.outline("0");
  s.contact("1", 4);
});

const statueGuardian = shape(22, 40, (s) => {
  s.box(2, 34, 18, 6, "4");       // plinth
  s.box(3, 34, 16, 1, "6");
  s.box(4, 32, 14, 2, "5");
  s.taper(11, 14, 20, 12, 16, "5");   // robed body
  s.taper(11, 15, 18, 8, 11, "6");
  s.box(4, 16, 4, 14, "5");       // arms crossed
  s.box(14, 16, 4, 14, "5");
  s.box(6, 26, 10, 4, "4");
  s.box(7, 8, 8, 8, "5");         // head
  s.box(8, 9, 6, 6, "6");
  s.box(8, 11, 2, 2, "2");        // worn-away eyes
  s.box(12, 11, 2, 2, "2");
  s.box(6, 6, 10, 3, "5");        // hood brim
  s.box(7, 6, 8, 1, "6");
  s.box(9, 2, 4, 5, "5");         // crest
  s.px(10, 1, "6");
  s.step(3, 20, 4, 2, 1, 1, "4"); // cracks
  growth(s, 6, 30, 5, 4, 71, "v", "w");
  growth(s, 16, 28, 4, 4, 73, "v", "w");
  s.outline("0");
  s.contact("1", 4);
});

const demonStatue = shape(22, 40, (s) => {
  s.box(2, 34, 18, 6, "2");
  s.box(3, 34, 16, 1, "4");
  s.taper(11, 14, 20, 14, 16, "2");
  s.taper(11, 15, 18, 9, 11, "3");
  s.box(2, 16, 5, 10, "2");       // wings
  s.box(15, 16, 5, 10, "2");
  s.box(2, 16, 2, 10, "3");
  s.box(7, 8, 8, 8, "2");
  s.box(8, 9, 6, 6, "3");
  s.box(8, 11, 2, 2, "o");        // ember eyes
  s.box(12, 11, 2, 2, "o");
  s.box(4, 4, 4, 5, "3");         // horns, swept up and out
  s.box(14, 4, 4, 5, "3");
  s.box(2, 1, 3, 4, "4");
  s.box(17, 1, 3, 4, "4");
  s.px(2, 0, "4");
  s.px(19, 0, "4");
  s.box(9, 22, 4, 8, "m");        // molten seam
  s.box(10, 23, 2, 6, "o");
  s.outline("0");
  s.contact("1", 4);
});

const frozenStatue = shape(22, 40, (s) => {
  s.box(2, 34, 18, 6, "A");
  s.box(3, 34, 16, 1, "B");
  s.taper(11, 14, 20, 12, 16, "B");
  s.taper(11, 15, 18, 8, 11, "C");
  s.box(4, 16, 4, 14, "B");
  s.box(14, 16, 4, 14, "B");
  s.box(7, 8, 8, 8, "B");
  s.box(8, 9, 6, 6, "C");
  s.box(8, 11, 2, 2, "A");
  s.box(12, 11, 2, 2, "A");
  s.box(6, 6, 10, 3, "C");
  s.step(3, 12, 5, 2, 1, -1, "D");    // ice shards
  s.step(18, 14, 4, 2, 1, -1, "D");
  s.box(10, 2, 2, 6, "D");
  growth(s, 5, 29, 3, 4, 79, "C", "D");
  growth(s, 17, 25, 3, 3, 83, "C", "D");
  s.outline("0");
  s.contact("1", 4);
});

const pillarBroken = shape(20, 34, (s) => {
  s.box(1, 30, 18, 4, "4");
  s.box(2, 30, 16, 1, "6");
  s.box(4, 6, 12, 24, "5");
  s.box(5, 6, 9, 24, "6");
  for (let y = 8; y < 30; y += 5) s.run(4, y, 12, "4");
  s.col(9, 6, 24, "4");           // fluting
  s.col(12, 6, 24, "4");
  s.step(4, 6, 5, 2, 1, -1, "5"); // snapped top
  s.box(4, 4, 6, 2, "5");
  s.box(3, 26, 14, 4, "4");
  growth(s, 6, 25, 4, 5, 89, "v", "w");
  growth(s, 14, 22, 3, 4, 97, "v", "w");
  s.outline("0");
  s.contact("1", 3);
});

const obelisk = shape(18, 40, (s) => {
  s.box(1, 36, 16, 4, "2");
  s.taper(9, 2, 34, 8, 14, "3");
  s.taper(9, 3, 32, 4, 8, "4");
  s.box(6, 10, 6, 2, "G");        // glyph band
  s.box(6, 18, 6, 2, "G");
  s.box(7, 26, 4, 2, "G");
  s.px(8, 6, "H");
  s.outline("0");
  s.contact("1", 3);
});

const iceObelisk = shape(18, 40, (s) => {
  s.box(1, 36, 16, 4, "A");
  s.taper(9, 2, 34, 8, 14, "B");
  s.taper(9, 3, 32, 4, 8, "C");
  s.col(8, 6, 28, "D");
  s.box(6, 14, 6, 2, "D");
  s.box(6, 24, 6, 2, "D");
  s.outline("0");
  s.contact("1", 3);
});

const anvil = shape(20, 16, (s) => {
  s.box(2, 2, 16, 4, "f");
  s.box(3, 2, 14, 1, "g");
  s.box(0, 3, 3, 2, "f");         // horn
  s.box(7, 6, 6, 4, "e");
  s.box(4, 10, 12, 4, "f");
  s.box(5, 10, 10, 1, "g");
  s.box(3, 14, 14, 2, "e");
  s.outline("0");
  s.contact("1", 4);
});

const altar = shape(30, 24, (s) => {
  s.box(2, 6, 26, 5, "5");        // slab
  s.box(3, 6, 24, 1, "6");
  s.box(2, 11, 26, 2, "4");
  s.box(6, 13, 18, 8, "5");       // pedestal
  s.box(7, 13, 16, 8, "4");
  s.box(4, 21, 22, 3, "5");
  s.box(5, 21, 20, 1, "6");
  s.box(12, 1, 6, 5, "G");        // floating focus
  s.box(13, 2, 4, 3, "H");
  s.px(14, 3, "Q");
  s.box(10, 15, 10, 2, "2");
  growth(s, 9, 19, 4, 2, 101, "v", "w");
  growth(s, 21, 18, 3, 2, 103, "v", "w");
  s.outline("0");
  s.contact("1", 5);
});

const standingStone = shape(16, 30, (s) => {
  s.taper(8, 2, 27, 7, 13, "5");
  s.taper(8, 3, 25, 4, 8, "6");
  s.box(1, 27, 14, 3, "4");
  growth(s, 5, 21, 4, 6, 107, "v", "w");
  growth(s, 11, 25, 3, 4, 109, "v", "w");
  s.step(5, 8, 5, 2, 1, 1, "4");
  s.outline("0");
  s.contact("1", 3);
});

const log = shape(24, 12, (s) => {
  s.box(3, 3, 20, 7, "c");        // barrel of the log
  s.run(3, 3, 20, "d");           // lit top
  s.run(3, 9, 20, "b");           // shaded belly
  s.run(4, 10, 18, "a");
  for (let x = 8; x < 22; x += 6) {
    s.px(x, 5, "b");              // bark grain
    s.px(x + 2, 7, "b");
  }
  lobe(s, 4, 6, 3, 4, "b");       // sawn end
  lobe(s, 4, 6, 2, 3, "a");
  s.px(4, 6, "b");
  s.px(4, 4, "c");
  growth(s, 15, 4, 4, 1, 113, "v", "w");
  s.outline("0");
  s.contact("1", 3);
});

const stump = shape(18, 14, (s) => {
  s.box(2, 4, 14, 9, "b");
  s.box(3, 4, 12, 2, "c");
  s.box(4, 2, 10, 3, "c");
  s.box(5, 3, 8, 1, "d");
  s.box(7, 3, 4, 1, "b");         // rings
  s.box(1, 11, 16, 2, "a");
  growth(s, 5, 10, 4, 3, 131, "v", "w");
  growth(s, 13, 9, 3, 2, 137, "v", "w");
  s.outline("0");
  s.contact("1", 3);
});

function makeMushroom(seed) {
  return shape(16, 16, (s) => {
    const rnd = seeded(seed);
    const glow = rnd() < 0.5;
    const capLit = glow ? "T" : "l";
    const cap = glow ? "C" : "k";
    const capDark = glow ? "B" : "j";
    const count = 2 + Math.floor(rnd() * 2);
    // Draw back-to-front so the taller cap overlaps
    const order = [[3, 5], [10, 3], [7, 6]].slice(0, count);
    for (const [x, hh] of order) {
      const h = hh + Math.floor(rnd() * 2);
      const rx = h > 4 ? 4 : 3;
      s.box(x - 1, 15 - h, 3, h, "M");        // stem
      s.col(x - 1, 15 - h, h, "N");
      lobe(s, x, 14 - h, rx, 2, cap);         // dome
      s.run(x - rx, 14 - h + 2, rx * 2 + 1, capDark);   // shaded gill line
      s.run(x - rx + 1, 14 - h - 2, rx, capLit);        // lit crown
      s.px(x - 1, 14 - h - 1, glow ? "D" : "O");
      s.px(x + 1, 14 - h, capDark);           // spot
    }
    s.outline("0");
    s.contact("1", 2);
  });
}

/** Corner web: radial guy-lines plus stepped concentric rings. */
const web = shape(20, 20, (s) => {
  for (let a = 0; a <= 6; a++) {
    const ang = (a / 6) * (Math.PI / 2);
    for (let r = 1; r < 22; r++) {
      s.px(Math.round(r * Math.cos(ang)), Math.round(r * Math.sin(ang)), "6");
    }
  }
  // Rings: stepped quarter-arcs at increasing radius
  for (const r of [4, 8, 12, 16, 19]) {
    for (let i = 0; i <= r * 2; i++) {
      const t = i / (r * 2);
      const x = Math.round(r * Math.cos((t * Math.PI) / 2));
      const y = Math.round(r * Math.sin((t * Math.PI) / 2));
      s.px(x, y, "7");
    }
  }
  s.px(0, 0, "8");
  s.px(1, 1, "8");
});

const root = shape(24, 12, (s) => {
  let x = 0;
  let y = 6;
  const rnd = seeded(451);
  for (let i = 0; i < 24; i++) {
    s.box(x, y, 1, 3, "b");
    s.px(x, y, "c");
    x += 1;
    if (rnd() < 0.35) y += rnd() < 0.5 ? 1 : -1;
    y = Math.max(1, Math.min(8, y));
  }
  s.box(6, 4, 3, 2, "b");
  s.box(15, 8, 3, 2, "b");
  s.outline("1");
});

const rootArch = shape(36, 40, (s) => {
  s.taper(6, 6, 34, 6, 12, "b");
  s.taper(30, 6, 34, 6, 12, "b");
  s.col(4, 8, 30, "c");
  s.col(28, 8, 30, "c");
  s.spans(2, [[10, 16], [8, 20], [6, 8], [18, 8], [5, 5], [26, 5]], "b");
  s.box(10, 2, 16, 3, "c");
  s.dither(4, 20, 28, 16, "u", 0, true);
  s.outline("0");
});

const lavaCrack = shape(28, 16, (s) => {
  const rnd = seeded(88);
  let x = 1;
  let y = 8;
  for (let i = 0; i < 26; i++) {
    s.box(x, y, 1, 3, "m");
    s.px(x, y + 1, "o");
    if (rnd() < 0.4) s.px(x, y + 1, "p");
    x += 1;
    if (rnd() < 0.4) y += rnd() < 0.5 ? 1 : -1;
    y = Math.max(2, Math.min(11, y));
  }
  s.box(8, 4, 2, 4, "m");
  s.px(8, 5, "o");
  s.box(18, 11, 2, 4, "m");
  s.px(18, 12, "o");
});

const ashPile = shape(18, 10, (s) => {
  s.spans(3, [[5, 8], [3, 12], [2, 14], [1, 16], [0, 18], [0, 18], [1, 16]], "3");
  s.spans(3, [[6, 5], [4, 8], [3, 9]], "4");
  s.run(2, 8, 14, "2");
  s.px(6, 5, "n");
  s.px(11, 6, "m");
  s.px(9, 4, "o");
  s.outline("1");
});

const obsidianSpike = shape(14, 24, (s) => {
  s.taper(7, 2, 21, 3, 10, "2");
  s.taper(7, 4, 19, 2, 6, "3");
  s.col(5, 6, 13, "4");           // rim light so the shard reads against dark rock
  s.col(6, 4, 4, "4");
  s.px(6, 3, "6");
  s.px(6, 10, "n");               // ember trapped in the glass
  s.px(7, 15, "m");
  s.box(1, 21, 12, 3, "2");
  s.run(2, 21, 10, "3");
  s.outline("0");
  s.contact("1", 3);
});

const iceBlock = shape(20, 18, (s) => {
  s.box(2, 4, 16, 13, "B");
  s.box(3, 5, 14, 11, "C");
  s.box(2, 4, 16, 2, "D");
  s.step(4, 6, 5, 2, 1, 1, "D");
  s.box(12, 8, 4, 5, "D");
  growth(s, 7, 14, 4, 3, 151, "B", "D");
  s.outline("A");
  s.contact("1", 4);
});

const snowDrift = shape(24, 12, (s) => {
  s.spans(4, [[4, 16], [2, 20], [1, 22], [0, 24], [0, 24], [0, 24], [0, 24], [0, 24]], "8");
  s.spans(4, [[5, 12], [3, 15], [2, 17]], "9");
  s.dither(0, 9, 24, 3, "8", 1, true);
});

const iceSpike = shape(12, 22, (s) => {
  s.taper(6, 1, 20, 3, 9, "B");
  s.taper(6, 3, 17, 2, 5, "C");
  s.col(5, 4, 12, "D");
  s.box(1, 19, 10, 3, "B");
  s.outline("A");
  s.contact("1", 3);
});

const glyph = shape(20, 20, (s) => {
  s.box(2, 9, 16, 2, "G");
  s.box(9, 2, 2, 16, "G");
  s.step(4, 4, 6, 2, 1, 1, "F");
  s.step(16, 4, 6, 2, -1, 1, "F");
  s.box(8, 8, 4, 4, "H");
  s.px(9, 9, "Q");
  s.px(10, 10, "Q");
});

const glyphCircle = shape(40, 40, (s) => {
  const pts = [
    [20, 2], [28, 4], [34, 10], [37, 19], [34, 28], [28, 34], [20, 37],
    [12, 34], [6, 28], [3, 19], [6, 10], [12, 4],
  ];
  for (const [x, y] of pts) {
    s.box(x - 1, y - 1, 3, 3, "F");
    s.px(x, y, "H");
  }
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 5) % pts.length];
    const steps = 12;
    for (let t = 0; t <= steps; t++) {
      s.px(Math.round(x1 + ((x2 - x1) * t) / steps), Math.round(y1 + ((y2 - y1) * t) / steps), "F");
    }
  }
  s.box(17, 17, 6, 6, "G");
  s.box(18, 18, 4, 4, "H");
});

/** Floating void shard: an angular crystal, lit on one facet. */
const fragment = shape(16, 16, (s) => {
  s.spans(1, [[7, 2], [6, 4], [5, 6], [4, 7], [3, 8], [3, 8], [4, 7], [5, 6], [5, 5], [6, 3], [7, 2]], "F");
  s.spans(2, [[7, 1], [6, 2], [5, 3], [4, 4], [4, 3], [5, 2], [6, 1]], "G");
  s.col(7, 2, 5, "H");
  s.px(6, 4, "H");
  s.px(9, 8, "E");
  s.px(10, 9, "E");
  s.outline("E");
});

const runeStone = shape(16, 22, (s) => {
  s.taper(8, 3, 18, 8, 14, "3");
  s.taper(8, 4, 16, 5, 9, "4");
  s.box(1, 19, 14, 3, "2");
  s.box(6, 8, 4, 2, "G");
  s.box(7, 12, 2, 4, "G");
  s.px(7, 9, "H");
  s.outline("0");
  s.contact("1", 3);
});

const starHole = shape(20, 14, (s) => {
  s.spans(3, [[5, 10], [3, 14], [2, 16], [2, 16], [3, 14], [5, 10], [7, 6]], "0");
  s.spans(4, [[5, 10], [4, 12], [4, 12], [5, 10]], "E");
  s.px(8, 6, "H");
  s.px(13, 8, "U");
  s.px(6, 9, "H");
});

const scorch = shape(22, 14, (s) => {
  s.spans(3, [[5, 12], [3, 16], [1, 20], [1, 20], [2, 18], [4, 14], [7, 8]], "1");
  s.dither(2, 3, 18, 8, "2", 1, true);
  s.px(9, 6, "m");
  s.px(14, 8, "m");
});

const tombNiche = shape(28, 32, (s) => {
  s.box(0, 0, 28, 32, "4");
  s.box(2, 2, 24, 28, "2");
  s.box(3, 3, 22, 26, "1");
  s.spans(3, [[9, 10], [7, 14], [5, 18], [4, 20]], "2");
  s.box(4, 20, 20, 9, "4");       // sarcophagus lip
  s.box(5, 20, 18, 1, "6");
  s.box(6, 24, 16, 2, "2");
  s.box(9, 10, 10, 8, "M");       // remains inside
  s.box(10, 11, 3, 3, "N");
  s.box(15, 11, 3, 3, "N");
  s.box(11, 12, 1, 1, "0");
  s.box(16, 12, 1, 1, "0");
  growth(s, 7, 27, 5, 3, 139, "v", "w");
  growth(s, 20, 26, 4, 3, 149, "v", "w");
  s.outline("0");
});

const puddleFrozen = shape(TILE, TILE, (s) => {
  s.spans(10, [[7, 18], [5, 22], [4, 24], [4, 24], [5, 22], [7, 18], [9, 14]], "B");
  s.spans(11, [[7, 16], [6, 18], [6, 18], [7, 16]], "C");
  s.step(9, 12, 5, 3, 1, 1, "D");
  s.step(20, 14, 3, 2, -1, 1, "D");
  s.outline("A");
});

const flower = shape(10, 12, (s) => {
  s.col(4, 5, 7, "w");
  s.px(3, 8, "x");
  s.px(6, 7, "x");
  s.box(3, 2, 4, 3, "H");
  s.px(4, 1, "H");
  s.px(4, 3, "t");
  s.outline("0");
});

const leafScatter = shape(16, 8, (s) => {
  const rnd = seeded(9001);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rnd() * 14);
    const y = 2 + Math.floor(rnd() * 5);
    s.box(x, y, 2, 1, rnd() < 0.5 ? "W" : "V");
  }
});

const vine = shape(10, 30, (s) => {
  const rnd = seeded(313);
  let x = 4;
  for (let y = 0; y < 30; y++) {
    s.px(x, y, "v");
    s.px(x + 1, y, "w");
    if (rnd() < 0.25) x += rnd() < 0.5 ? 1 : -1;
    x = Math.max(1, Math.min(7, x));
    if (y % 6 === 3) {
      s.box(x - 2, y, 2, 2, "w");
      s.px(x - 2, y, "x");
    }
  }
});

/* ==================================================================== *
 * EXPORTS
 * ==================================================================== */

/** Tiles get the biome floor/wall remap applied. */
export const TILE_SPRITES = {
  floor_stone_01: makeFloor(0),
  floor_stone_02: makeFloor(1),
  floor_stone_03: makeFloor(2),
  floor_stone_04: makeFloor(6),
  floor_stone_05: makeFloor(7),
  floor_stone_06: makeFloor(8),
  floor_cracked_01: makeFloor(3),
  floor_broken_01: makeFloor(4),
  floor_moss_01: makeFloor(5),
  ground_dirt_01: makeGroundDirt(0),
  ground_dirt_02: makeGroundDirt(1),
  ground_dirt_03: makeGroundDirt(2),
  ground_dirt_04: makeGroundDirt(3),
  ground_dirt_05: makeGroundDirt(4),
  ground_dirt_06: makeGroundDirt(5),
  ground_ash_01: makeGroundAsh(0),
  ground_ash_02: makeGroundAsh(1),
  ground_ash_03: makeGroundAsh(2),
  ground_ash_04: makeGroundAsh(3),
  ground_ash_05: makeGroundAsh(4),
  ground_ash_06: makeGroundAsh(5),
  ground_snow_01: makeGroundSnow(0),
  ground_snow_02: makeGroundSnow(1),
  ground_snow_03: makeGroundSnow(2),
  ground_snow_04: makeGroundSnow(3),
  ground_snow_05: makeGroundSnow(4),
  ground_snow_06: makeGroundSnow(5),
  ground_void_01: makeGroundVoid(0),
  ground_void_02: makeGroundVoid(1),
  ground_void_03: makeGroundVoid(2),
  ground_void_04: makeGroundVoid(3),
  ground_void_05: makeGroundVoid(4),
  ground_void_06: makeGroundVoid(5),
  wall_top_01: makeWallTop(0),
  wall_top_02: makeWallTop(1),
  wall_top_03: makeWallTop(2),
  wall_face_01: makeWallFace(0),
  wall_face_02: makeWallFace(1),
  wall_face_03: makeWallFace(2),
  wall_shadow: wallShadow,
  arch_jamb: archJamb,
  arch_key: archKey,
};

/**
 * Tiles authored in their final biome colours. The registry must not run the
 * biome remap over these, or the earth/snow/void ramps get overwritten.
 */
export const NATIVE_TILES = new Set(
  Object.keys(TILE_SPRITES).filter((n) => n.startsWith("ground_"))
);

/**
 * Props. Metadata drives the decorator (ART_BIBLE §9):
 *   tall  — occludes; gets alpha when the player is behind it
 *   light — emits a lightmap halo
 *   flat  — a ground decal, safe anywhere
 */
export const PROP_SPRITES = {
  // catacombs / universal
  bone_01: { rows: makeBone(11), flat: true },
  bone_02: { rows: makeBone(23), flat: true },
  bone_03: { rows: makeBone(47), flat: true },
  bone_04: { rows: makeBone(71), flat: true },
  skull_pile: { rows: skullPile },
  tombstone: { rows: tombstone, tall: true },
  candle: { rows: candle, light: { color: "#ffe9a3", radius: 48 } },
  chain: { rows: chain, wall: true },
  urn: { rows: urn },
  barrel: { rows: barrel, tall: true },
  crate: { rows: crate, tall: true },
  pot: { rows: pot },
  bookshelf: { rows: bookshelf, tall: true },
  table_broken: { rows: tableBroken },
  banner: { rows: banner, wall: true, tall: true },
  sword_planted: { rows: swordPlanted },
  shield_broken: { rows: shieldBroken, flat: true },
  statue_guardian: { rows: statueGuardian, tall: true },
  demon_statue: { rows: demonStatue, tall: true },
  frozen_statue: { rows: frozenStatue, tall: true },
  pillar_broken: { rows: pillarBroken, tall: true },
  obelisk: { rows: obelisk, tall: true, light: { color: "#7b3fc4", radius: 64 } },
  obelisk_void: { rows: obelisk, tall: true, light: { color: "#c86bff", radius: 72 } },
  ice_obelisk: { rows: iceObelisk, tall: true, light: { color: "#4fa8cc", radius: 64 } },
  anvil: { rows: anvil },
  altar: { rows: altar, tall: true, light: { color: "#cfa0ff", radius: 72 } },
  brazier: { rows: [makeBrazier(0), makeBrazier(1), makeBrazier(2)], anim: 3, tall: true, light: { color: "#ff9a2e", radius: 128 } },
  torch: { rows: [makeTorch(0), makeTorch(1), makeTorch(2)], anim: 3, wall: true, light: { color: "#ff9a2e", radius: 104 } },
  tomb_niche: { rows: tombNiche, wall: true, tall: true },
  rubble_01: { rows: makeRubble(3), flat: true },
  rubble_02: { rows: makeRubble(13), flat: true },
  rubble_03: { rows: makeRubble(29), flat: true },
  rubble_04: { rows: makeRubble(53), flat: true },
  crack_01: { rows: makeCrack(5), flat: true, bg: true },
  crack_02: { rows: makeCrack(17), flat: true, bg: true },
  crack_03: { rows: makeCrack(37), flat: true, bg: true },
  crack_04: { rows: makeCrack(59), flat: true, bg: true },
  crack_void: { rows: starHole, flat: true, bg: true, light: { color: "#c86bff", radius: 40 } },
  star_hole: { rows: starHole, flat: true, bg: true },
  puddle: { rows: floorPuddle, flat: true, bg: true },
  puddle_frozen: { rows: puddleFrozen, flat: true, bg: true },
  web: { rows: web, flat: true, bg: true },
  scorch: { rows: scorch, flat: true, bg: true },
  ash_pile: { rows: ashPile, flat: true },
  lava_crack: { rows: lavaCrack, flat: true, light: { color: "#e8791c", radius: 64 } },
  obsidian_spike: { rows: obsidianSpike },
  icicle: { rows: makeIcicle(7), wall: true },
  ice_block: { rows: iceBlock, tall: true },
  ice_spike: { rows: iceSpike },
  snow_drift: { rows: snowDrift, flat: true },
  glyph: { rows: glyph, flat: true, bg: true, light: { color: "#7b3fc4", radius: 40 } },
  glyph_circle: { rows: glyphCircle, flat: true, bg: true, light: { color: "#7b3fc4", radius: 72 } },
  fragment: { rows: fragment, float: true, light: { color: "#7b3fc4", radius: 32 } },
  rune_stone: { rows: runeStone, light: { color: "#7b3fc4", radius: 40 } },
  shattered_pillar: { rows: pillarBroken, tall: true },
  frozen_pillar: { rows: iceObelisk, tall: true },

  // forest
  rock_01: { rows: makeRock(101, 16) },
  rock_02: { rows: makeRock(107, 16) },
  rock_03: { rows: makeRock(113, 16) },
  rock_04: { rows: makeRock(127, 20) },
  rock_05: { rows: makeRock(131, 20) },
  rock_06: { rows: makeRock(139, 24) },
  rock_07: { rows: makeRock(149, 24) },
  rock_08: { rows: makeRock(151, 12) },
  rock_09: { rows: makeRock(163, 12) },
  rock_10: { rows: makeRock(173, 28), tall: true },
  grass_01: { rows: makeGrass(201), flat: true },
  grass_02: { rows: makeGrass(211), flat: true },
  grass_03: { rows: makeGrass(223), flat: true },
  grass_04: { rows: makeGrass(227), flat: true },
  grass_dead_01: { rows: makeGrass(233, true), flat: true },
  grass_dead_02: { rows: makeGrass(239, true), flat: true },
  grass_dead_03: { rows: makeGrass(251, true), flat: true },
  grass_dead_04: { rows: makeGrass(257, true), flat: true },
  bush_01: { rows: makeBush(301) },
  bush_02: { rows: makeBush(307) },
  bush_03: { rows: makeBush(311) },
  bush_04: { rows: makeBush(313) },
  bush_dead_01: { rows: makeBush(317, true) },
  bush_dead_02: { rows: makeBush(331, true) },
  bush_dead_03: { rows: makeBush(337, true) },
  bush_dead_04: { rows: makeBush(347, true) },
  tree_dead_01: { rows: makeTree(401), tall: true },
  tree_dead_02: { rows: makeTree(409), tall: true },
  tree_dead_03: { rows: makeTree(419), tall: true },
  tree_dead_04: { rows: makeTree(421), tall: true },
  tree_twisted_01: { rows: makeTree(431, "leafy"), tall: true },
  tree_twisted_02: { rows: makeTree(433, "leafy"), tall: true },
  tree_twisted_03: { rows: makeTree(439, "leafy"), tall: true },
  tree_twisted_04: { rows: makeTree(443, "leafy"), tall: true },
  stump: { rows: stump },
  log: { rows: log },
  root: { rows: root, flat: true, bg: true },
  root_arch: { rows: rootArch, tall: true },
  standing_stone: { rows: standingStone, tall: true },
  mushroom_01: { rows: makeMushroom(501), light: { color: "#7ff0ff", radius: 32 } },
  mushroom_02: { rows: makeMushroom(509), light: { color: "#7ff0ff", radius: 32 } },
  mushroom_03: { rows: makeMushroom(521) },
  vine: { rows: vine, wall: true },
  flower: { rows: flower, flat: true },
  leaf: { rows: leafScatter, flat: true, bg: true },
  book: { rows: shape(10, 8, (s) => {
    s.box(0, 2, 10, 5, "j");
    s.box(1, 2, 8, 1, "9");
    s.box(1, 3, 8, 3, "8");
    s.box(4, 2, 2, 5, "i");
    s.outline("0");
  }), flat: true },
};

export const ENV_SPRITES = TILE_SPRITES;

/** Chars that the biome remap is allowed to touch on tiles. */
export const REMAPPABLE = ["2", "3", "4", "5", "6"];
