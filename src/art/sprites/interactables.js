/**
 * WORLD INTERACTABLES — shrine, shop stall, fountain, event pedestal, portal.
 *
 * These used to be colored triangles with HTML labels. Each is now a built
 * object with a base, a mid section, an ornament and a light source, animated
 * by cycling a small number of authored frames (ART_BIBLE §9, §12).
 *
 * Pure data — no DOM.
 */

import { shape } from "../Shape.js";

/* ==================================================================== *
 * SHARED PRIMITIVES
 * ==================================================================== */

/** Cut stone plinth: lit top course, shaded body, dark base course. */
function plinth(s, x, y, w, h) {
  s.box(x, y, w, h, "4");
  s.run(x, y, w, "6");
  s.box(x, y + h - 2, w, 2, "2");
  s.col(x, y, h, "3");
  s.col(x + w - 1, y, h, "2");
  // Block joints so it reads as masonry, not a flat rectangle
  for (let j = 3; j < h - 2; j += 3) s.run(x + 1, y + j, w - 2, "3");
  for (let j = 3; j < h - 2; j += 6) s.px(x + Math.floor(w / 2), y + j - 1, "3");
}

function mossPatch(s, x, y, w, char) {
  for (let i = 0; i < w; i++) {
    if ((i * 5 + x) % 3 === 0) s.px(x + i, y, char);
    if ((i * 7 + x) % 4 === 0) s.px(x + i, y + 1, char);
  }
}

/* ==================================================================== *
 * SHRINE — altar stone with a floating rune above the bowl
 * ==================================================================== */

const SHRINE_W = 32;
const SHRINE_H = 38;

function shrineFrame(runeY, glow) {
  return shape(SHRINE_W, SHRINE_H, (s) => {
    // Stepped base
    s.box(4, 30, 24, 4, "3");
    s.run(4, 30, 24, "5");
    s.box(3, 34, 26, 3, "2");
    s.run(3, 34, 26, "4");
    plinth(s, 8, 16, 16, 15);

    // Carved relief panel
    s.box(11, 20, 10, 8, "2");
    s.box(12, 21, 8, 6, "3");
    s.run(13, 23, 6, "5");
    s.col(15, 21, 6, "5");

    // Offering bowl
    s.box(9, 13, 14, 4, "5");
    s.run(9, 13, 14, "7");
    s.box(11, 14, 10, 2, "2");
    s.box(11, 14, 10, 1, "1");
    s.col(8, 14, 3, "3");
    s.col(23, 14, 3, "3");
    mossPatch(s, 9, 28, 14, "w");

    // Floating rune — the interaction affordance
    const ry = runeY;
    s.box(14, ry, 4, 1, glow);
    s.box(15, ry + 1, 2, 5, glow);
    s.box(13, ry + 2, 6, 1, glow);
    s.px(13, ry + 5, glow);
    s.px(18, ry + 5, glow);
    s.px(15, ry - 1, "Q");
    s.px(16, ry - 1, "Q");
    s.px(12, ry + 3, glow);
    s.px(19, ry + 3, glow);

    s.contact("1", 4);
  });
}

/* ==================================================================== *
 * SHOP — timber stall with an awning and stacked goods
 * ==================================================================== */

function shopFrame(flutter) {
  return shape(46, 40, (s) => {
    // Back posts
    s.box(6, 8, 3, 28, "b");
    s.col(6, 8, 28, "c");
    s.box(37, 8, 3, 28, "b");
    s.col(37, 8, 28, "c");

    // Awning: alternating cloth stripes with a scalloped, fluttering hem
    s.box(3, 5, 40, 3, "b");
    s.run(3, 5, 40, "c");
    for (let i = 0; i < 40; i += 6) {
      s.box(3 + i, 8, 3, 5, "j");
      s.box(6 + i, 8, 3, 5, "9");
      s.px(3 + i, 8, "k");
      s.px(6 + i, 8, "8");
    }
    for (let i = 0; i < 40; i += 3) {
      const dip = (i / 3 + flutter) % 2 === 0 ? 1 : 0;
      const col = (Math.floor(i / 3) % 2) === 0 ? "j" : "9";
      s.box(3 + i, 13, 3, 1 + dip, col);
    }

    // Counter
    s.box(2, 24, 42, 4, "c");
    s.run(2, 24, 42, "d");
    s.box(2, 28, 42, 2, "b");
    s.box(4, 30, 38, 6, "b");
    for (let x = 6; x < 42; x += 5) s.col(x, 30, 6, "a");

    // Goods on the counter: potion, coin stack, scroll
    s.box(8, 19, 5, 5, "l");
    s.box(9, 18, 3, 1, "8");
    s.px(9, 20, "9");
    s.box(18, 21, 8, 3, "s");
    s.run(18, 21, 8, "t");
    s.box(19, 19, 6, 2, "s");
    s.run(19, 19, 6, "t");
    s.box(30, 18, 7, 6, "N");
    s.box(30, 18, 7, 1, "O");
    s.box(31, 20, 5, 1, "M");
    s.box(31, 22, 4, 1, "M");

    // Hanging lantern, the stall's light
    s.box(21, 14, 4, 5, "q");
    s.box(22, 15, 2, 3, "p");
    s.px(22, 16, "R");
    s.px(23, 16, "R");
    s.box(22, 13, 2, 1, "q");

    s.contact("1", 6);
  });
}

/* ==================================================================== *
 * FOUNTAIN — basin with animated water and a spout
 * ==================================================================== */

function fountainFrame(phase) {
  return shape(34, 34, (s) => {
    // Outer basin
    s.spans(24, [[3, 28], [2, 30], [2, 30], [3, 28], [5, 24], [8, 18]], "3");
    s.spans(24, [[4, 26], [3, 28], [3, 28], [4, 26]], "5");
    s.run(3, 24, 28, "6");
    s.spans(28, [[5, 24], [8, 18]], "2");

    // Water surface with a stepped ripple that advances each frame
    s.box(5, 25, 24, 4, "X");
    s.box(6, 25, 22, 2, "Y");
    for (let i = 0; i < 22; i++) {
      if ((i + phase * 2) % 6 < 2) s.px(6 + i, 25, "Z");
      if ((i + phase * 2 + 3) % 6 < 2) s.px(6 + i, 27, "Y");
    }
    s.run(6, 26, 22, ((phase % 2) === 0) ? "Y" : "X");

    // Central column and bowl
    s.box(14, 14, 6, 11, "4");
    s.col(14, 14, 11, "6");
    s.col(19, 14, 11, "2");
    s.box(11, 10, 12, 4, "5");
    s.run(11, 10, 12, "7");
    s.box(13, 11, 8, 2, "X");
    s.box(13, 11, 8, 1, "Z");

    // Falling water: two stepped streams, offset per frame
    const off = phase % 3;
    s.col(12, 14 + off, 4, "Z");
    s.col(21, 16 - off, 4, "Z");
    s.px(12, 18 + off, "D");
    s.px(21, 20 - off, "D");
    if (phase % 2 === 0) {
      s.px(11, 22, "D");
      s.px(22, 23, "D");
    }
    mossPatch(s, 4, 30, 26, "w");

    s.contact("1", 5);
  });
}

/* ==================================================================== *
 * EVENT PEDESTAL — a hovering, turning card over a stone stand
 * ==================================================================== */

function eventFrame(turn) {
  return shape(28, 36, (s) => {
    s.box(5, 28, 18, 4, "3");
    s.run(5, 28, 18, "5");
    s.box(4, 32, 20, 3, "2");
    plinth(s, 9, 18, 10, 11);
    s.box(7, 15, 14, 4, "5");
    s.run(7, 15, 14, "7");

    // Card: width shrinks as it turns edge-on, so rotation reads without rotating
    const w = [9, 5, 2, 5][turn % 4];
    const x = 14 - Math.floor(w / 2);
    s.box(x, 3, w, 12, "E");
    s.box(x, 3, w, 1, "G");
    s.box(x, 14, w, 1, "F");
    if (w >= 5) {
      s.box(x + 1, 5, w - 2, 8, "F");
      s.px(x + Math.floor(w / 2), 7, "H");
      s.px(x + Math.floor(w / 2), 9, "H");
      s.px(x + Math.floor(w / 2), 10, "H");
    } else {
      s.col(x, 4, 11, "H");
    }
    // Glow motes rising off the card
    s.px(x - 2, 6 + (turn % 3), "U");
    s.px(x + w + 1, 9 - (turn % 3), "U");

    s.contact("1", 4);
  });
}

/* ==================================================================== *
 * PORTAL — carved arch with a swirling void aperture
 * ==================================================================== */

function portalFrame(swirl) {
  return shape(44, 52, (s) => {
    // Arch: stepped jambs and a stepped crown, built from stone blocks
    for (const side of [0, 1]) {
      const x = side === 0 ? 3 : 33;
      s.box(x, 14, 8, 34, "4");
      s.col(side === 0 ? x : x + 7, 14, 34, "2");
      s.col(side === 0 ? x + 7 : x, 14, 34, "5");
      for (let j = 14; j < 48; j += 5) s.run(x + 1, j, 6, "3");
      s.box(x, 46, 8, 3, "2");
      s.run(x, 46, 8, "5");
    }
    s.step(11, 12, 3, 3, 1, -1, "4");
    s.step(32, 12, 3, 3, -1, -1, "4");
    s.box(17, 7, 10, 4, "4");
    s.run(17, 7, 10, "6");
    s.box(14, 9, 16, 2, "3");

    // Aperture: nested arcs of void, brightening inward, advanced by `swirl`
    const cx = 22;
    const cy = 30;
    for (let r = 15; r >= 3; r -= 3) {
      const tone = r > 11 ? "E" : r > 7 ? "F" : "G";
      for (let a = 0; a < 28; a++) {
        const ang = (a / 28) * Math.PI * 2 + swirl * 0.4 + r * 0.35;
        const px = Math.round(cx + Math.cos(ang) * r);
        const py = Math.round(cy + Math.sin(ang) * r * 0.85);
        s.px(px, py, tone);
      }
    }
    s.box(19, 27, 6, 6, "H");
    s.box(20, 28, 4, 4, "U");
    s.px(21, 29, "Q");
    s.px(22, 29, "Q");
    // Sparks orbiting the mouth
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2 - swirl * 0.9;
      s.px(Math.round(cx + Math.cos(ang) * 17), Math.round(cy + Math.sin(ang) * 14), "H");
    }
    // Keystone rune
    s.box(20, 8, 4, 2, "U");
    s.px(21, 6, "H");
    s.px(22, 6, "H");

    s.contact("1", 8);
  });
}

/* ==================================================================== *
 * GROUND PICKUPS — xp shard, coin, heart
 * ==================================================================== */

/** Faceted shard, pulsing between two value ramps. */
function xpShard(bright) {
  const hi = bright ? "Q" : "z";
  const mid = bright ? "z" : "x";
  return shape(9, 11, (s) => {
    s.spans(0, [[4, 1], [3, 3], [2, 5], [1, 7], [1, 7], [1, 7], [2, 5], [3, 3], [4, 1]], mid);
    s.spans(1, [[4, 2], [3, 3], [3, 4], [3, 4], [3, 3], [4, 2]], "w");
    s.col(4, 1, 7, hi);
    s.px(4, 0, hi);
    s.px(3, 3, hi);
    s.px(5, 6, "y");
  });
}

/** Coin, spun by narrowing the disc to an edge-on bar. */
function coinFrame(turn) {
  const w = [9, 6, 2, 6][turn % 4];
  return shape(9, 9, (s) => {
    const x = 4 - Math.floor(w / 2);
    if (w >= 6) {
      s.spans(1, [[x + 1, w - 2], [x, w], [x, w], [x, w], [x, w], [x, w], [x + 1, w - 2]], "s");
      s.run(x + 1, 1, w - 2, "t");
      s.run(x + 1, 7, w - 2, "q");
      s.px(x + 1, 2, "t");
      s.box(x + 2, 3, Math.max(1, w - 4), 2, "r");
      s.px(x + 2, 3, "t");
    } else {
      s.box(x, 1, w, 7, "s");
      s.run(x, 1, w, "t");
      s.run(x, 7, w, "q");
    }
  });
}

/** Chunky heart, beating between two sizes. */
function heartFrame(big) {
  const c = big ? "l" : "k";
  return shape(11, 10, (s) => {
    s.spans(1, [[1, 3], [0, 5], [0, 11], [0, 11], [1, 9], [2, 7], [3, 5], [4, 3], [5, 1]], c);
    s.box(7, 1, 3, 1, c);
    s.box(6, 2, 5, 1, c);
    s.px(2, 2, "9");
    s.px(3, 2, "9");
    s.px(2, 3, "l");
    s.run(0, 3, 2, "j");
    s.run(9, 3, 2, "j");
    s.px(5, 8, "j");
  });
}

export const PICKUP_SPRITES = {
  xp: { rows: [xpShard(false), xpShard(true)], fps: 5, light: { color: "z", radius: 22 } },
  gold: { rows: [coinFrame(0), coinFrame(1), coinFrame(2), coinFrame(3)], fps: 7, light: { color: "t", radius: 24 } },
  heart: { rows: [heartFrame(false), heartFrame(true)], fps: 4, light: { color: "l", radius: 24 } },
};

/* ==================================================================== *
 * REGISTRY
 * ==================================================================== */

export const INTERACT_SPRITES = {
  shrine: { rows: [shrineFrame(6, "U"), shrineFrame(5, "H"), shrineFrame(6, "U"), shrineFrame(7, "H")], light: { color: "U", radius: 60 }, fps: 5 },
  shop: { rows: [shopFrame(0), shopFrame(1)], light: { color: "R", radius: 70 }, fps: 3 },
  heal_fountain: { rows: [fountainFrame(0), fountainFrame(1), fountainFrame(2)], light: { color: "T", radius: 55 }, fps: 6 },
  event: { rows: [eventFrame(0), eventFrame(1), eventFrame(2), eventFrame(3)], light: { color: "U", radius: 50 }, fps: 5 },
  portal: { rows: [portalFrame(0), portalFrame(1), portalFrame(2), portalFrame(3), portalFrame(4), portalFrame(5)], light: { color: "U", radius: 110 }, fps: 9 },
};
