/**
 * ITEMS — one authored icon per def id in data/items.js (ART_BIBLE §13).
 *
 * All icons live on a 20x20 grid, centered, and double as the world-pickup
 * sprite and the in-hand weapon overlay. Bladed weapons are authored on the
 * 45-degree diagonal (pointing up-right) so the same sprite reads correctly
 * held in the hand, mirrored for the other facing, with no rotation — pixel art
 * must never be rotated by the renderer.
 *
 * Silhouette is the identity: a sword, an axe, a bow and a tome must be
 * distinguishable as pure black shapes. Palette carries material and element.
 *
 * Pure data — no DOM.
 */

import { shape } from "../Shape.js";

const S = 20;

/* ==================================================================== *
 * PRIMITIVES
 * ==================================================================== */

/**
 * A blade running up-right at 45 degrees, drawn as stepped horizontal runs so
 * the band is orthogonally connected (a diagonal pixel chain reads as a mesh,
 * not as steel — ART_BIBLE §5).
 * `w` is the run length; the left pixel of each run is the lit edge.
 * Colors: [edge highlight, core, shadow].
 */
function blade(s, x, y, len, w, [hi, core, lo]) {
  for (let i = 0; i < len; i++) {
    s.run(x + i, y - i, w, core);
    s.px(x + i, y - i, hi);
    if (w > 2) s.px(x + i + w - 1, y - i, lo);
  }
  return s;
}

/** Tapered point continuing a diagonal blade up-right. */
function tip(s, x, y, w, [hi, core]) {
  for (let k = 0; k < w; k++) {
    s.run(x + k, y - k, w - k, core);
    s.px(x + k, y - k, hi);
  }
  return s;
}

/** A wrapped grip running down-left at 45 degrees. */
function grip(s, x, y, len, [hi, lo]) {
  for (let i = 0; i < len; i++) {
    s.run(x - i, y + i, 2, lo);
    s.px(x - i, y + i, hi);
  }
  return s;
}

/** Crossguard: a 2px-thick bar perpendicular to the blade (down-right). */
function guard(s, x, y, len, [hi, lo]) {
  for (let i = -len; i <= len; i++) {
    s.px(x + i, y + i, i <= 0 ? hi : lo);
    s.px(x + i + 1, y + i, i <= 0 ? hi : lo);
  }
  return s;
}

/** A gem or crystal: hard-edged rhombus. */
function gem(s, cx, cy, r, [hi, core, lo]) {
  for (let j = -r; j <= r; j++) {
    const w = r - Math.abs(j);
    for (let i = -w; i <= w; i++) s.px(cx + i, cy + j, core);
  }
  s.px(cx - 1, cy - 1, hi);
  s.px(cx, cy - r, hi);
  s.px(cx + 1, cy + 1, lo);
  s.px(cx, cy + r, lo);
  return s;
}

/* ==================================================================== *
 * WEAPON FAMILIES
 * ==================================================================== */

/** Straight sword: diagonal blade, crossguard, wrapped grip, pommel. */
function makeSword({ steel = ["h", "g", "f"], hilt = ["c", "b"], metal = ["s", "r"], len = 10, w = 3, gemChar = null } = {}) {
  return shape(S, S, (s) => {
    blade(s, 5, 13, len, w, steel);
    tip(s, 5 + len, 13 - len, w, steel);
    guard(s, 5, 13, 3, metal);
    grip(s, 4, 14, 4, hilt);
    s.px(0, 18, metal[0]);
    s.px(1, 18, metal[1]);
    s.px(1, 19, metal[1]);
    if (gemChar) s.px(5, 13, gemChar);
    s.outline("0");
  });
}

/** Greatsword: longer, thicker, fullered blade and a heavy guard. */
function makeGreatsword({ steel = ["h", "g", "f"], hilt = ["c", "b"], metal = ["s", "r"], gemChar = null } = {}) {
  return shape(S, S, (s) => {
    blade(s, 3, 14, 12, 4, steel);
    tip(s, 15, 2, 4, steel);
    for (let i = 0; i < 12; i++) s.px(3 + i + 1, 14 - i + 1, steel[1]);   // fuller
    guard(s, 3, 14, 4, metal);
    s.px(2, 12, metal[0]);
    s.px(6, 18, metal[1]);
    grip(s, 2, 15, 4, hilt);
    s.box(0, 18, 2, 2, metal[0]);
    if (gemChar) s.px(3, 14, gemChar);
    s.outline("0");
  });
}

/** Axe: stout haft with a broad crescent head. */
function makeAxe({ steel = ["h", "g", "f"], wood = ["d", "c", "b"], accent = null } = {}) {
  return shape(S, S, (s) => {
    for (let i = 0; i < 14; i++) {
      s.px(3 + i, 16 - i, wood[1]);
      s.px(4 + i, 16 - i, wood[0]);
      s.px(3 + i, 17 - i, wood[2]);
    }
    // Head: a wedge biting up-left, cheek behind the haft
    s.spans(3, [[9, 6], [8, 8], [7, 9], [7, 9], [8, 8], [9, 6]], steel[1]);
    s.spans(3, [[9, 3], [8, 4], [7, 4]], steel[0]);
    s.spans(6, [[8, 3], [9, 3], [10, 2]], steel[2]);
    s.box(13, 2, 2, 3, steel[1]);
    s.px(14, 1, steel[0]);
    if (accent) {
      s.px(9, 5, accent);
      s.px(10, 6, accent);
    }
    s.box(2, 16, 3, 3, wood[2]);
    s.outline("0");
  });
}

/** Spear: long haft, leaf point, small collar. */
function makeSpear({ steel = ["h", "g", "f"], wood = ["d", "c", "b"], accent = null } = {}) {
  return shape(S, S, (s) => {
    for (let i = 0; i < 15; i++) {
      s.px(2 + i, 17 - i, wood[1]);
      s.px(3 + i, 17 - i, wood[0]);
    }
    // Leaf blade
    s.spans(1, [[14, 3], [13, 4], [13, 4], [12, 4], [12, 3]], steel[1]);
    s.px(15, 1, steel[0]);
    s.px(14, 2, steel[0]);
    s.px(14, 3, steel[0]);
    s.px(16, 3, steel[2]);
    s.px(15, 4, steel[2]);
    s.px(12, 6, steel[1]);
    s.px(13, 5, steel[1]);
    if (accent) s.px(14, 4, accent);
    s.px(1, 18, wood[2]);
    s.px(2, 18, wood[2]);
    s.outline("0");
  });
}

/** Dagger: short wide blade, small guard, stubby grip. */
function makeDagger({ steel = ["h", "g", "f"], hilt = ["c", "b"], metal = ["s", "r"], gemChar = null } = {}) {
  return shape(S, S, (s) => {
    blade(s, 7, 12, 6, 3, steel);
    tip(s, 13, 6, 3, steel);
    guard(s, 7, 12, 2, metal);
    grip(s, 6, 13, 4, hilt);
    s.px(3, 16, metal[0]);
    if (gemChar) s.px(7, 12, gemChar);
    s.outline("0");
  });
}

/** Hammer: thick haft, blocky head with a struck face. */
function makeHammer({ steel = ["h", "g", "f"], wood = ["d", "c", "b"] } = {}) {
  return shape(S, S, (s) => {
    for (let i = 0; i < 12; i++) {
      s.px(4 + i, 16 - i, wood[1]);
      s.px(5 + i, 16 - i, wood[0]);
      s.px(4 + i, 17 - i, wood[2]);
    }
    s.box(10, 2, 8, 6, steel[1]);
    s.box(10, 2, 8, 2, steel[0]);
    s.box(10, 7, 8, 1, steel[2]);
    s.box(9, 3, 1, 4, steel[2]);
    s.px(12, 5, steel[0]);
    s.px(16, 5, steel[2]);
    s.box(3, 16, 3, 3, wood[2]);
    s.outline("0");
  });
}

/** Bow: stepped limbs with a taut string and a grip wrap. */
function makeBow({ wood = ["d", "c", "b"], string = "8", accent = null } = {}) {
  return shape(S, S, (s) => {
    // Limbs bow out to the right; the chord sits at x=8 so the string reads
    const arc = [
      [9, 1], [11, 2], [13, 3], [14, 4], [15, 5], [16, 6], [16, 7],
      [16, 8], [16, 9], [16, 10], [15, 11], [14, 12], [13, 13], [11, 14],
      [9, 15],
    ];
    for (const [x, y] of arc) {
      s.px(x, y, wood[1]);
      s.px(x + 1, y, wood[0]);
      s.px(x - 1, y, wood[2]);
    }
    s.box(16, 7, 3, 3, wood[2]);      // grip wrap
    s.px(17, 8, wood[0]);
    for (let i = 1; i < 15; i++) s.px(8, i, string);   // string
    s.px(9, 8, string);
    if (accent) {
      s.px(9, 1, accent);
      s.px(9, 15, accent);
    }
    s.outline("0");
  });
}

/** Crossbow: horizontal limbs on a stock, string drawn back. */
function makeCrossbow({ wood = ["d", "c", "b"], steel = ["h", "g", "f"], accent = null } = {}) {
  return shape(S, S, (s) => {
    s.box(4, 9, 13, 3, wood[1]);      // stock
    s.run(4, 9, 13, wood[0]);
    s.run(4, 11, 13, wood[2]);
    s.box(2, 11, 4, 4, wood[2]);      // butt
    s.box(12, 4, 2, 12, steel[1]);    // limbs
    s.run(12, 4, 2, steel[0]);
    s.px(13, 15, steel[2]);
    s.px(11, 5, steel[1]);
    s.px(11, 14, steel[1]);
    for (let y = 5; y < 15; y++) s.px(9 + Math.abs(y - 10) / 3, y, "8");
    s.box(8, 12, 2, 3, steel[2]);     // trigger
    if (accent) s.px(16, 10, accent);
    s.outline("0");
  });
}

/** Wand: short shaft topped with a floating crystal. */
function makeWand({ wood = ["d", "c", "b"], crystal = ["H", "G", "F"], spark = "Q" } = {}) {
  return shape(S, S, (s) => {
    for (let i = 0; i < 10; i++) {
      s.px(4 + i, 16 - i, wood[1]);
      s.px(5 + i, 16 - i, wood[0]);
    }
    s.box(3, 16, 3, 3, wood[2]);
    gem(s, 15, 5, 3, crystal);
    s.px(15, 1, spark);
    s.px(11, 4, spark);
    s.px(18, 8, spark);
    s.outline("0");
  });
}

/** Staff: long shaft, bound head, large focus stone. */
function makeStaff({ wood = ["d", "c", "b"], crystal = ["H", "G", "F"], spark = null, bind = ["s", "r"] } = {}) {
  return shape(S, S, (s) => {
    for (let i = 0; i < 15; i++) {
      s.px(2 + i, 17 - i, wood[1]);
      s.px(3 + i, 17 - i, wood[0]);
      s.px(2 + i, 18 - i, wood[2]);
    }
    // Fork holding the stone
    s.px(13, 5, wood[1]);
    s.px(12, 4, wood[1]);
    s.px(16, 8, wood[1]);
    s.px(17, 7, wood[1]);
    s.px(11, 6, bind[0]);
    s.px(12, 7, bind[1]);
    gem(s, 15, 4, 3, crystal);
    if (spark) {
      s.px(15, 0, spark);
      s.px(11, 3, spark);
      s.px(19, 6, spark);
    }
    s.box(1, 17, 3, 2, wood[2]);
    s.outline("0");
  });
}

/** Tome: closed book, three-quarter, with clasp and page block. */
function makeTome({ cover = ["k", "j", "i"], pages = ["9", "8", "7"], sigil = "t" } = {}) {
  return shape(S, S, (s) => {
    s.box(3, 4, 14, 13, cover[1]);
    s.box(3, 4, 14, 2, cover[0]);
    s.box(3, 15, 14, 2, cover[2]);
    s.box(15, 5, 2, 11, pages[1]);    // page block
    s.box(15, 5, 2, 1, pages[0]);
    for (let y = 6; y < 15; y += 2) s.px(16, y, pages[2]);
    s.box(3, 4, 2, 13, cover[2]);     // spine
    s.px(4, 6, cover[0]);
    s.box(8, 8, 5, 5, cover[2]);      // sigil plate
    s.px(10, 9, sigil);
    s.px(9, 10, sigil);
    s.px(10, 10, sigil);
    s.px(11, 10, sigil);
    s.px(10, 11, sigil);
    s.box(13, 9, 3, 3, "s");          // clasp
    s.px(14, 10, "t");
    s.outline("0");
  });
}

/** Orb: floating sphere with a hard-edged specular and orbit ring. */
function makeOrb({ core = ["H", "G", "F"], ring = ["s", "r"], spark = "Q" } = {}) {
  return shape(S, S, (s) => {
    s.spans(4, [[7, 6], [5, 10], [4, 12], [3, 14], [3, 14], [3, 14], [3, 14], [4, 12], [5, 10], [7, 6]], core[1]);
    s.spans(5, [[6, 6], [5, 8], [5, 8], [6, 6]], core[0]);
    s.spans(10, [[6, 8], [7, 6], [8, 4]], core[2]);
    s.px(7, 6, spark);
    s.px(8, 6, spark);
    // Orbit ring: a flattened stepped ellipse
    s.run(3, 12, 3, ring[0]);
    s.run(14, 12, 3, ring[0]);
    s.run(5, 13, 3, ring[1]);
    s.run(12, 13, 3, ring[1]);
    s.run(7, 14, 6, ring[1]);
    s.outline("0");
  });
}

/** Scythe: long haft with a sweeping crescent blade. */
function makeScythe({ steel = ["l", "k", "j"], wood = ["c", "b", "a"] } = {}) {
  return shape(S, S, (s) => {
    for (let i = 0; i < 15; i++) {
      s.px(2 + i, 17 - i, wood[1]);
      s.px(3 + i, 17 - i, wood[0]);
    }
    // Crescent: stepped outer curve, hollow interior
    const curve = [
      [16, 3], [15, 2], [13, 1], [11, 1], [9, 2], [7, 3], [6, 5], [5, 7],
    ];
    for (const [x, y] of curve) {
      s.px(x, y, steel[1]);
      s.px(x, y + 1, steel[0]);
      s.px(x - 1, y + 1, steel[1]);
    }
    s.px(4, 9, steel[1]);
    s.px(5, 9, steel[0]);
    s.px(12, 3, steel[2]);
    s.px(10, 4, steel[2]);
    s.px(8, 5, steel[2]);
    s.box(16, 3, 2, 2, wood[2]);
    s.box(1, 17, 3, 2, wood[2]);
    s.outline("0");
  });
}

/** Throwing knives: a fan of three small blades. */
const throwingKnives = shape(S, S, (s) => {
  const one = (x, y) => {
    blade(s, x, y, 4, 2, ["h", "g", "f"]);
    tip(s, x + 4, y - 4, 2, ["h", "g"]);
    s.px(x - 1, y + 1, "b");
    s.px(x - 2, y + 2, "b");
  };
  one(3, 16);
  one(6, 13);
  one(9, 10);
  s.outline("0");
});

/* ==================================================================== *
 * ARMOR
 * ==================================================================== */

const leatherCap = shape(S, S, (s) => {
  s.spans(5, [[6, 8], [5, 10], [4, 12], [4, 12]], "c");
  s.spans(5, [[6, 4], [5, 4], [4, 4]], "d");
  s.box(3, 9, 14, 2, "b");
  s.box(3, 9, 14, 1, "c");
  s.px(9, 4, "d");
  s.box(6, 11, 8, 1, "a");
  s.outline("0");
});

const ironHelm = shape(S, S, (s) => {
  s.spans(4, [[6, 8], [5, 10], [4, 12], [4, 12], [4, 12], [4, 12]], "g");
  s.spans(4, [[6, 3], [5, 3], [4, 4]], "h");
  s.box(4, 10, 12, 3, "f");
  s.box(6, 10, 8, 2, "0");         // eye slit
  s.px(7, 11, "e");
  s.px(12, 11, "e");
  s.col(9, 3, 3, "h");
  s.col(10, 3, 3, "h");
  s.box(4, 13, 12, 1, "e");
  s.outline("0");
});

const shadowHood = shape(S, S, (s) => {
  s.spans(3, [[8, 5], [6, 8], [5, 10], [4, 12], [4, 12], [3, 14], [3, 14], [4, 12]], "2");
  s.spans(4, [[8, 3], [7, 3], [6, 3]], "4");
  s.box(6, 8, 8, 4, "0");
  s.px(8, 10, "l");
  s.px(11, 10, "l");
  s.box(3, 12, 14, 2, "1");
  s.outline("0");
});

const mageHat = shape(S, S, (s) => {
  s.taper(10, 1, 10, 2, 10, "F");
  s.taper(10, 2, 9, 1, 5, "G");
  s.box(2, 11, 16, 3, "F");
  s.box(2, 11, 16, 1, "G");
  s.box(7, 9, 6, 2, "E");
  s.px(9, 10, "H");
  s.px(10, 3, "H");
  s.outline("0");
});

const leatherVest = shape(S, S, (s) => {
  s.box(4, 4, 12, 13, "c");
  s.box(4, 4, 12, 2, "d");
  s.box(2, 5, 3, 6, "c");         // shoulders
  s.box(15, 5, 3, 6, "c");
  s.box(9, 4, 2, 13, "b");        // center seam
  s.box(4, 13, 12, 2, "b");       // belt
  s.px(9, 13, "s");
  s.px(10, 13, "s");
  s.px(6, 8, "d");
  s.outline("0");
});

const chainmail = shape(S, S, (s) => {
  s.box(4, 4, 12, 13, "f");
  s.box(2, 5, 3, 6, "f");
  s.box(15, 5, 3, 6, "f");
  for (let y = 4; y < 17; y += 2) {
    for (let x = 4 + ((y / 2) % 2); x < 16; x += 2) s.px(x, y, "g");
  }
  s.box(4, 4, 12, 1, "g");
  s.box(4, 15, 12, 1, "e");
  s.outline("0");
});

const plateArmor = shape(S, S, (s) => {
  s.box(4, 4, 12, 13, "g");
  s.box(5, 5, 10, 11, "h");
  s.box(2, 4, 4, 5, "g");         // pauldrons
  s.box(14, 4, 4, 5, "g");
  s.box(2, 4, 4, 1, "h");
  s.box(14, 4, 4, 1, "h");
  s.box(9, 5, 2, 11, "f");        // sternum
  s.box(5, 11, 10, 1, "f");
  s.box(5, 14, 10, 2, "f");
  s.px(6, 7, "9");
  s.outline("0");
});

const robe = shape(S, S, (s) => {
  s.taper(10, 4, 13, 10, 16, "F");
  s.taper(10, 5, 10, 6, 10, "G");
  s.box(3, 6, 3, 7, "F");           // hanging sleeves
  s.box(14, 6, 3, 7, "F");
  s.box(3, 6, 3, 1, "G");
  s.box(14, 6, 3, 1, "G");
  s.box(7, 4, 6, 2, "E");           // collar
  s.px(9, 5, "H");
  s.px(10, 7, "H");
  s.px(9, 10, "H");
  s.box(5, 13, 10, 2, "E");         // sash
  s.px(9, 13, "s");
  s.px(10, 13, "s");
  s.run(3, 16, 14, "E");            // hem
  s.outline("0");
});

function makeGloves({ base = ["d", "c", "b"], accent = null } = {}) {
  return shape(S, S, (s) => {
    s.box(5, 6, 9, 8, base[1]);
    s.box(5, 6, 9, 2, base[0]);
    s.box(13, 8, 4, 3, base[1]);   // thumb
    s.box(5, 4, 2, 3, base[1]);    // fingers
    s.box(8, 4, 2, 3, base[1]);
    s.box(11, 4, 2, 3, base[1]);
    s.box(5, 14, 9, 3, base[2]);   // cuff
    s.box(5, 14, 9, 1, base[0]);
    if (accent) {
      s.px(9, 10, accent);
      s.px(10, 10, accent);
    }
    s.outline("0");
  });
}

function makeBoots({ base = ["d", "c", "b"], accent = null } = {}) {
  return shape(S, S, (s) => {
    s.box(6, 3, 7, 10, base[1]);
    s.box(6, 3, 7, 2, base[0]);
    s.box(6, 11, 11, 4, base[1]);  // foot
    s.box(6, 11, 11, 1, base[0]);
    s.box(5, 15, 13, 2, base[2]);  // sole
    s.box(6, 8, 7, 1, base[2]);    // strap
    if (accent) {
      s.px(15, 12, accent);
      s.px(16, 13, accent);
    }
    s.outline("0");
  });
}

function makeRing({ band = ["s", "r", "q"], stone = ["H", "G"] } = {}) {
  return shape(S, S, (s) => {
    s.spans(6, [[7, 6], [5, 4], [11, 4], [4, 3], [13, 3], [4, 3], [13, 3], [5, 4], [11, 4], [7, 6]], band[1]);
    s.px(7, 6, band[0]);
    s.px(8, 6, band[0]);
    s.px(5, 8, band[0]);
    s.px(13, 13, band[2]);
    s.px(9, 15, band[2]);
    s.box(8, 2, 4, 4, band[1]);    // setting
    s.box(8, 2, 4, 1, band[0]);
    gem(s, 9, 3, 2, [stone[1], stone[0], stone[1]]);
    s.outline("0");
  });
}

function makeAmulet({ chain = ["8", "7"], pendant = ["N", "M"], stone = null } = {}) {
  return shape(S, S, (s) => {
    // Chain: two stepped strands meeting at the top
    for (let i = 0; i < 7; i++) {
      s.px(9 - i, 3 + i, chain[i % 2]);
      s.px(10 + i, 3 + i, chain[i % 2]);
    }
    s.px(9, 2, chain[0]);
    s.px(10, 2, chain[0]);
    s.box(7, 10, 6, 7, pendant[1]);
    s.box(7, 10, 6, 1, pendant[0]);
    s.box(8, 11, 4, 5, pendant[0]);
    s.box(9, 9, 2, 2, pendant[1]);
    if (stone) {
      s.box(9, 12, 2, 2, stone);
      s.px(9, 12, "Q");
    } else {
      s.px(9, 13, pendant[1]);
      s.px(10, 14, pendant[1]);
    }
    s.outline("0");
  });
}

const boneAmulet = shape(S, S, (s) => {
  for (let i = 0; i < 7; i++) {
    s.px(9 - i, 3 + i, i % 2 ? "7" : "8");
    s.px(10 + i, 3 + i, i % 2 ? "7" : "8");
  }
  s.box(6, 10, 8, 7, "N");        // skull pendant
  s.box(7, 10, 6, 1, "O");
  s.box(7, 12, 2, 2, "0");
  s.box(11, 12, 2, 2, "0");
  s.box(8, 15, 4, 2, "M");
  s.px(9, 16, "0");
  s.px(10, 16, "0");
  s.outline("0");
});

const voidPendant = shape(S, S, (s) => {
  for (let i = 0; i < 6; i++) {
    s.px(9 - i, 3 + i, i % 2 ? "F" : "E");
    s.px(10 + i, 3 + i, i % 2 ? "F" : "E");
  }
  s.spans(9, [[8, 4], [6, 8], [5, 10], [5, 10], [6, 8], [8, 4]], "E");
  s.spans(10, [[8, 4], [7, 6], [7, 6], [8, 4]], "F");
  s.px(9, 12, "H");
  s.px(10, 12, "U");
  s.px(9, 11, "G");
  s.outline("0");
});

/* ==================================================================== *
 * CONSUMABLES
 * ==================================================================== */

/** Round-bellied flask. */
function makeFlask({ liquid = ["l", "k"], glass = "8", cork = ["c", "b"] } = {}) {
  return shape(S, S, (s) => {
    s.box(8, 2, 4, 3, cork[0]);      // cork
    s.box(8, 2, 4, 1, cork[1]);
    s.box(8, 5, 4, 3, glass);        // neck
    s.spans(8, [[6, 8], [5, 10], [4, 12], [4, 12], [4, 12], [4, 12], [5, 10], [6, 8], [7, 6]], glass);
    s.spans(10, [[6, 8], [5, 10], [5, 10], [5, 10], [6, 8], [7, 6]], liquid[1]);
    s.spans(10, [[6, 3], [5, 3], [5, 3]], liquid[0]);
    s.run(5, 10, 10, liquid[0]);     // meniscus
    s.px(6, 12, "9");                // glass specular
    s.px(6, 13, "9");
    s.outline("0");
  });
}

/** Tall vial. */
function makeVial({ liquid = ["T", "C"], glass = "8", cork = ["c", "b"] } = {}) {
  return shape(S, S, (s) => {
    s.box(8, 1, 4, 2, cork[0]);
    s.box(8, 1, 4, 1, cork[1]);
    s.box(7, 3, 6, 14, glass);
    s.box(8, 4, 4, 3, glass);
    s.box(8, 7, 4, 9, liquid[1]);
    s.run(8, 7, 4, liquid[0]);
    s.px(8, 9, "9");
    s.px(8, 10, "9");
    s.box(6, 16, 8, 1, glass);
    s.outline("0");
  });
}

/* ==================================================================== *
 * CHESTS — 32x24, four tiers, with an opened frame each.
 * ==================================================================== */

function makeChest(tier, open) {
  const wood = tier === "legendary" ? ["d", "c", "b"] : tier === "rare" ? ["c", "b", "a"] : ["c", "b", "a"];
  const band = tier === "legendary" ? ["t", "s", "r"] : tier === "rare" ? ["h", "g", "f"] : ["g", "f", "e"];
  const glowChar = tier === "legendary" ? "p" : tier === "rare" ? "C" : null;
  return shape(32, 26, (s) => {
    // Body
    s.box(3, 12, 26, 11, wood[1]);
    s.box(4, 13, 24, 9, wood[0]);
    s.box(3, 21, 26, 2, wood[2]);
    for (let x = 7; x < 28; x += 7) s.col(x, 13, 9, wood[2]);
    // Iron straps
    s.box(3, 12, 26, 1, band[1]);
    s.box(5, 12, 3, 11, band[1]);
    s.box(24, 12, 3, 11, band[1]);
    s.col(5, 12, 11, band[0]);
    s.col(24, 12, 11, band[0]);
    s.box(2, 22, 28, 2, band[2]);

    if (!open) {
      // Domed lid
      s.spans(4, [[8, 16], [6, 20], [5, 22], [4, 24], [3, 26], [3, 26], [3, 26], [3, 26]], wood[1]);
      s.spans(5, [[8, 16], [7, 18], [6, 18], [5, 18]], wood[0]);
      s.spans(4, [[8, 4], [6, 4], [5, 4]], wood[0]);
      s.box(3, 10, 26, 2, band[1]);
      s.box(3, 10, 26, 1, band[0]);
      s.box(5, 4, 3, 8, band[1]);
      s.box(24, 4, 3, 8, band[1]);
      // Lock plate
      s.box(13, 10, 6, 6, band[1]);
      s.box(14, 11, 4, 4, band[0]);
      s.box(15, 12, 2, 3, "0");
      s.px(15, 13, band[2]);
      if (glowChar) {
        s.px(16, 13, glowChar);
        s.px(15, 12, glowChar);
      }
    } else {
      // Lid thrown back; the interior is dark with spilled treasure
      s.box(2, 2, 28, 5, wood[2]);
      s.box(3, 2, 26, 3, wood[1]);
      s.box(3, 2, 26, 1, band[1]);
      s.box(4, 8, 24, 5, "0");
      s.box(5, 9, 22, 3, "1");
      for (const [cx, cy] of [[8, 11], [12, 10], [16, 11], [21, 10], [24, 11], [14, 12]]) {
        s.box(cx, cy, 3, 2, "s");
        s.run(cx, cy, 3, "t");
      }
      if (glowChar) {
        s.px(11, 9, glowChar);
        s.px(19, 9, glowChar);
      }
      s.box(13, 8, 6, 1, band[1]);
    }
    s.outline("0");
    s.contact("1", 4);
  });
}

const mimicClosed = shape(32, 26, (s) => {
  s.box(3, 12, 26, 11, "b");
  s.box(4, 13, 24, 9, "c");
  s.box(3, 21, 26, 2, "a");
  s.box(3, 12, 26, 1, "f");
  s.box(5, 12, 3, 11, "f");
  s.box(24, 12, 3, 11, "f");
  s.spans(4, [[8, 16], [6, 20], [5, 22], [4, 24], [3, 26], [3, 26], [3, 26], [3, 26]], "b");
  s.spans(5, [[8, 16], [7, 18], [6, 18], [5, 18]], "c");
  s.box(3, 10, 26, 2, "f");
  s.box(13, 10, 6, 6, "f");
  s.box(14, 11, 4, 4, "g");
  s.box(15, 12, 2, 3, "0");
  // The tell: fangs hanging from the lid seam, and two red glints
  s.box(6, 10, 20, 2, "0");
  for (let x = 7; x < 25; x += 4) {
    s.run(x, 11, 3, "O");
    s.run(x, 12, 2, "N");
    s.px(x, 13, "N");
  }
  s.box(8, 7, 3, 2, "j");
  s.box(21, 7, 3, 2, "j");
  s.px(9, 7, "l");
  s.px(22, 7, "l");
  s.outline("0");
  s.contact("1", 4);
});

/* ==================================================================== *
 * REGISTRY — keys are the exact def ids from data/items.js
 * ==================================================================== */

const ICE = ["D", "C", "B"];
const FIRE = ["p", "o", "n"];
const ARCANE = ["H", "G", "F"];
const POISON = ["z", "x", "y"];
const BLOOD = ["l", "k", "j"];
const GOLD = ["t", "s", "r"];

export const ITEM_SPRITES = {
  // ---- weapons -------------------------------------------------------
  iron_sword: makeSword(),
  greatsword: makeGreatsword(),
  battle_axe: makeAxe(),
  spear: makeSpear(),
  dagger: makeDagger(),
  war_hammer: makeHammer(),
  hunter_bow: makeBow(),
  crossbow: makeCrossbow(),
  spark_wand: makeWand({ crystal: ["p", "o", "n"], spark: "p" }),
  oak_staff: makeStaff({ crystal: ["9", "8", "7"] }),
  magic_tome: makeTome(),
  throwing_knives: throwingKnives,
  fire_staff: makeStaff({ crystal: FIRE, spark: "p", bind: ["n", "m"] }),
  lightning_wand: makeWand({ crystal: ["Q", "p", "s"], spark: "p" }),
  poison_bow: makeBow({ wood: ["w", "v", "u"], string: "z", accent: "z" }),
  frost_blade: makeSword({ steel: ICE, hilt: ["B", "A"], metal: ["C", "B"], gemChar: "D" }),
  blood_scythe: makeScythe(),
  arcane_orb: makeOrb(),

  // ---- uniques -------------------------------------------------------
  bloodfang: makeSword({ steel: BLOOD, hilt: ["a", "P"], metal: ["k", "j"], gemChar: "l", len: 9, w: 4 }),
  stormcaller: makeStaff({ wood: ["8", "7", "6"], crystal: ["Q", "p", "s"], spark: "Q", bind: ["h", "g"] }),
  void_tome: makeTome({ cover: ["G", "F", "E"], pages: ["H", "U", "G"], sigil: "Q" }),
  dragon_slayer: makeGreatsword({ steel: ["9", "h", "g"], hilt: ["r", "q"], metal: GOLD, gemChar: "l" }),
  winterbite: makeDagger({ steel: ICE, hilt: ["A", "0"], metal: ["C", "B"], gemChar: "D" }),

  // ---- armor ---------------------------------------------------------
  leather_cap: leatherCap,
  iron_helm: ironHelm,
  shadow_hood: shadowHood,
  mage_hat: mageHat,
  leather_vest: leatherVest,
  chainmail: chainmail,
  plate_armor: plateArmor,
  robe: robe,
  leather_gloves: makeGloves(),
  iron_gauntlets: makeGloves({ base: ["h", "g", "f"], accent: "s" }),
  thief_gloves: makeGloves({ base: ["4", "3", "2"], accent: "l" }),
  leather_boots: makeBoots(),
  iron_greaves: makeBoots({ base: ["h", "g", "f"], accent: "s" }),
  wind_boots: makeBoots({ base: ["8", "7", "6"], accent: "T" }),
  copper_ring: makeRing({ band: ["d", "c", "b"], stone: ["9", "8"] }),
  ruby_ring: makeRing({ stone: ["l", "k"] }),
  sapphire_ring: makeRing({ stone: ["D", "C"] }),
  emerald_ring: makeRing({ stone: ["z", "x"] }),
  gold_ring: makeRing({ stone: ["t", "s"] }),
  bone_amulet: boneAmulet,
  blood_amulet: makeAmulet({ pendant: ["k", "j"], stone: "l" }),
  luck_charm: makeAmulet({ chain: ["w", "v"], pendant: ["x", "w"], stone: "z" }),
  void_pendant: voidPendant,

  // ---- consumables ---------------------------------------------------
  health_potion: makeFlask({ liquid: ["l", "k"] }),
  mana_potion: makeFlask({ liquid: ["C", "B"] }),
  speed_potion: makeVial({ liquid: ["T", "Y"] }),
  damage_potion: makeVial({ liquid: ["o", "n"] }),
  luck_potion: makeVial({ liquid: ["t", "s"] }),
  xp_potion: makeVial({ liquid: ["H", "G"] }),
};

/** Family fallbacks, keyed by the def `type` / `slot` in data/items.js. */
export const ITEM_TYPE_FALLBACK = {
  sword: "iron_sword",
  greatsword: "greatsword",
  axe: "battle_axe",
  spear: "spear",
  dagger: "dagger",
  hammer: "war_hammer",
  bow: "hunter_bow",
  crossbow: "crossbow",
  wand: "spark_wand",
  staff: "oak_staff",
  tome: "magic_tome",
  thrown: "throwing_knives",
  scythe: "blood_scythe",
  orb: "arcane_orb",
  weapon: "iron_sword",
  helmet: "leather_cap",
  chest: "leather_vest",
  gloves: "leather_gloves",
  boots: "leather_boots",
  ring: "copper_ring",
  amulet: "bone_amulet",
  consumable: "health_potion",
};

export const CHEST_SPRITES = {
  normal: makeChest("normal", false),
  normal_open: makeChest("normal", true),
  rare: makeChest("rare", false),
  rare_open: makeChest("rare", true),
  legendary: makeChest("legendary", false),
  legendary_open: makeChest("legendary", true),
  mimic: mimicClosed,
  mimic_open: makeChest("normal", true),
};

/** Element accent overlays applied to any weapon icon (ART_BIBLE §13). */
export const ELEMENT_REMAPS = {
  none: null,
  fire: { h: "p", g: "o", f: "n" },
  ice: { h: "D", g: "C", f: "B" },
  lightning: { h: "Q", g: "p", f: "s" },
  poison: { h: "z", g: "x", f: "y" },
  blood: { h: "l", g: "k", f: "j" },
  arcane: { h: "H", g: "G", f: "F" },
};
