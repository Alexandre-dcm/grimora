/**
 * UI ICONS — 16x16, one per concept. These replace every emoji in the game
 * (ART_BIBLE §14): emoji are another font's art direction, not ours.
 *
 * Read at 16-32px in HTML, so each icon is a bold silhouette with at most
 * three tones and no interior detail smaller than 2px.
 *
 * Pure data — no DOM.
 */

import { shape } from "../Shape.js";

const I = 16;
const ic = (build) => shape(I, I, build);

/* ---- weapons & combat ------------------------------------------------ */

const sword = ic((s) => {
  for (let i = 0; i < 9; i++) {
    s.run(4 + i, 11 - i, 3, "g");
    s.px(4 + i, 11 - i, "h");
  }
  s.run(12, 1, 3, "h");
  s.run(13, 0, 2, "9");
  for (let i = -2; i <= 2; i++) {
    s.px(4 + i, 11 + i, "s");
    s.px(5 + i, 11 + i, "r");
  }
  s.run(1, 13, 3, "c");
  s.run(0, 14, 3, "b");
  s.px(0, 15, "r");
  s.outline("0");
});

const dagger = ic((s) => {
  for (let i = 0; i < 6; i++) {
    s.run(6 + i, 9 - i, 3, "g");
    s.px(6 + i, 9 - i, "h");
  }
  s.run(11, 3, 2, "9");
  for (let i = -2; i <= 2; i++) s.px(6 + i, 9 + i, "s");
  s.run(3, 11, 3, "b");
  s.px(2, 13, "r");
  s.outline("0");
});

const wand = ic((s) => {
  for (let i = 0; i < 8; i++) {
    s.run(3 + i, 12 - i, 2, "c");
    s.px(3 + i, 12 - i, "d");
  }
  s.box(10, 2, 4, 4, "G");
  s.box(11, 3, 2, 2, "H");
  s.px(12, 1, "Q");
  s.px(9, 1, "H");
  s.px(15, 5, "H");
  s.outline("0");
});

const burst = ic((s) => {
  s.spans(5, [[5, 6], [4, 8], [4, 8], [5, 6]], "o");
  s.spans(6, [[6, 4], [6, 4]], "p");
  for (const [x, y] of [[7, 1], [7, 14], [1, 7], [14, 7], [3, 3], [12, 3], [3, 12], [12, 12]]) {
    s.box(x, y, 2, 2, "n");
  }
  for (const [x, y] of [[7, 3], [7, 12], [3, 7], [12, 7]]) s.box(x, y, 2, 2, "o");
  s.outline("0");
});

const bolt = ic((s) => {
  s.spans(1, [[8, 4], [7, 4], [6, 4], [5, 5], [4, 6], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [2, 3], [1, 2]], "p");
  s.spans(2, [[8, 2], [7, 2], [6, 2], [5, 2], [8, 2], [7, 2], [6, 2], [5, 2]], "s");
  s.outline("0");
});

const target = ic((s) => {
  const ring = (r, c) => {
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      s.px(8 + Math.round(Math.cos(t) * r), 8 + Math.round(Math.sin(t) * r), c);
    }
  };
  ring(6, "9");
  ring(3, "l");
  s.box(7, 7, 2, 2, "l");
  s.run(0, 8, 3, "9");
  s.run(13, 8, 3, "9");
  s.col(8, 0, 3, "9");
  s.col(8, 13, 3, "9");
  s.outline("0");
});

const eye = ic((s) => {
  s.spans(5, [[2, 12], [1, 14], [1, 14], [2, 12], [4, 8]], "9");
  s.spans(6, [[4, 8], [3, 10], [4, 8]], "C");
  s.box(6, 6, 4, 4, "1");
  s.box(7, 7, 2, 2, "T");
  s.run(2, 4, 12, "8");
  s.outline("0");
});

const skull = ic((s) => {
  s.spans(2, [[4, 8], [3, 10], [2, 12], [2, 12], [2, 12], [2, 12], [3, 10], [4, 8]], "N");
  s.spans(2, [[5, 4], [4, 4]], "O");
  s.box(4, 6, 3, 3, "0");
  s.box(9, 6, 3, 3, "0");
  s.px(5, 7, "l");
  s.px(10, 7, "l");
  s.box(7, 9, 2, 2, "M");
  s.box(5, 11, 6, 3, "N");
  s.px(6, 12, "0");
  s.px(8, 12, "0");
  s.px(10, 12, "0");
  s.outline("0");
});

const hammer = ic((s) => {
  s.box(3, 2, 10, 5, "g");
  s.run(3, 2, 10, "h");
  s.run(3, 6, 10, "f");
  s.box(7, 7, 3, 8, "c");
  s.col(7, 7, 8, "d");
  s.box(6, 13, 5, 2, "b");
  s.outline("0");
});

const bow = ic((s) => {
  const arc = [[7, 1], [9, 2], [11, 3], [12, 5], [12, 7], [12, 9], [11, 11], [9, 13], [7, 14]];
  for (const [x, y] of arc) {
    s.px(x, y, "c");
    s.px(x + 1, y, "d");
  }
  for (let y = 1; y < 15; y++) s.px(6, y, "8");
  s.box(12, 6, 2, 3, "b");
  s.run(2, 7, 5, "9");
  s.px(2, 6, "9");
  s.px(2, 8, "9");
  s.outline("0");
});

const orb = ic((s) => {
  s.spans(3, [[5, 6], [3, 10], [2, 12], [2, 12], [2, 12], [2, 12], [3, 10], [5, 6]], "G");
  s.spans(4, [[5, 4], [4, 4], [4, 4]], "H");
  s.spans(8, [[4, 8], [5, 6]], "F");
  s.px(5, 5, "Q");
  s.run(1, 11, 3, "s");
  s.run(12, 11, 3, "s");
  s.run(4, 12, 8, "r");
  s.outline("0");
});

const wave = ic((s) => {
  for (const [y, o] of [[4, 0], [8, 1], [12, 2]]) {
    for (let x = 1; x < 15; x++) {
      s.px(x, y + (Math.floor((x + o) / 2) % 2), "C");
      s.px(x, y + 1 + (Math.floor((x + o) / 2) % 2), "B");
    }
  }
  s.outline("0");
});

const spiral = ic((s) => {
  const pts = [];
  for (let a = 0; a < 34; a++) {
    const t = (a / 34) * Math.PI * 4;
    const r = 1 + (a / 34) * 6;
    pts.push([8 + Math.round(Math.cos(t) * r), 8 + Math.round(Math.sin(t) * r)]);
  }
  for (const [x, y] of pts) s.px(x, y, "T");
  s.px(8, 8, "Q");
  s.outline("0");
});

const thorn = ic((s) => {
  s.col(7, 2, 12, "v");
  s.col(8, 2, 12, "w");
  for (const [y, d] of [[4, -1], [7, 1], [10, -1], [12, 1]]) {
    for (let i = 1; i <= 4; i++) s.px(7 + d * i, y - Math.floor(i / 2), "w");
    s.px(7 + d * 4, y - 2, "x");
  }
  s.px(7, 1, "x");
  s.outline("0");
});

/* ---- vitals ---------------------------------------------------------- */

function heartShape(s, main, light, dark) {
  s.spans(3, [[2, 4], [1, 6], [1, 14], [1, 14], [2, 12], [3, 10], [4, 8], [5, 6], [6, 4], [7, 2]], main);
  s.spans(3, [[9, 4], [9, 6]], main);
  s.spans(4, [[2, 3], [2, 3]], light);
  s.px(4, 4, light);
  s.spans(8, [[3, 10], [4, 8]], dark);
}

const heart = ic((s) => {
  heartShape(s, "k", "l", "j");
  s.outline("0");
});

const heartBroken = ic((s) => {
  heartShape(s, "k", "l", "j");
  for (let i = 0; i < 9; i++) s.px(7 + (i % 2), 3 + i, "0");
  s.outline("0");
});

const heartPlus = ic((s) => {
  heartShape(s, "k", "l", "j");
  s.box(11, 1, 2, 6, "9");
  s.box(9, 3, 6, 2, "9");
  s.outline("0");
});

const regen = ic((s) => {
  heartShape(s, "w", "x", "v");
  s.box(11, 1, 2, 6, "z");
  s.box(9, 3, 6, 2, "z");
  s.outline("0");
});

const shield = ic((s) => {
  s.spans(1, [[2, 12], [1, 14], [1, 14], [1, 14], [1, 14], [2, 12], [2, 12], [3, 10], [4, 8], [5, 6], [6, 4], [7, 2]], "g");
  s.spans(2, [[3, 10], [2, 12], [2, 12], [3, 10], [3, 10], [4, 8]], "h");
  s.box(7, 4, 2, 7, "f");
  s.box(4, 6, 8, 2, "f");
  s.outline("0");
});

const rock = ic((s) => {
  s.spans(4, [[5, 6], [3, 10], [2, 12], [1, 14], [1, 14], [1, 14], [1, 14], [2, 12]], "5");
  s.spans(4, [[5, 3], [3, 4], [2, 4]], "6");
  s.spans(9, [[9, 6], [9, 5]], "4");
  s.px(6, 8, "4");
  s.px(7, 9, "4");
  s.outline("0");
});

const manaDrop = ic((s) => {
  s.spans(1, [[7, 2], [7, 3], [6, 4], [5, 6], [4, 8], [3, 10], [2, 12], [2, 12], [2, 12], [3, 10], [4, 8], [6, 4]], "B");
  s.spans(6, [[5, 4], [4, 4], [4, 4], [5, 4]], "C");
  s.px(5, 7, "D");
  s.px(5, 8, "D");
  s.outline("0");
});

const bloodDrop = ic((s) => {
  s.spans(1, [[7, 2], [7, 3], [6, 4], [5, 6], [4, 8], [3, 10], [2, 12], [2, 12], [2, 12], [3, 10], [4, 8], [6, 4]], "j");
  s.spans(6, [[5, 4], [4, 4], [4, 4], [5, 4]], "k");
  s.px(5, 7, "l");
  s.outline("0");
});

const stamina = ic((s) => {
  s.spans(2, [[6, 5], [5, 5], [4, 5], [3, 6], [2, 7], [5, 6], [4, 5], [3, 5], [2, 5]], "z");
  s.spans(2, [[6, 2], [5, 2], [4, 2]], "x");
  s.outline("0");
});

/* ---- economy & progression ------------------------------------------ */

const coin = ic((s) => {
  s.spans(3, [[5, 6], [3, 10], [2, 12], [2, 12], [2, 12], [2, 12], [3, 10], [5, 6]], "s");
  s.spans(4, [[4, 4], [3, 4]], "t");
  s.spans(8, [[4, 8], [5, 6]], "r");
  s.box(6, 5, 4, 6, "r");
  s.box(7, 5, 2, 6, "t");
  s.px(6, 6, "t");
  s.px(9, 9, "t");
  s.outline("0");
});

const souls = ic((s) => {
  s.spans(2, [[5, 6], [3, 10], [3, 10], [2, 12], [2, 12], [3, 10], [3, 10], [4, 8]], "U");
  s.spans(3, [[5, 3], [4, 3]], "H");
  s.box(5, 5, 2, 2, "1");
  s.box(9, 5, 2, 2, "1");
  s.box(6, 9, 4, 2, "1");
  for (let i = 0; i < 4; i++) s.px(4 + i * 3, 11 + (i % 2), "G");
  s.outline("0");
});

const xpStar = ic((s) => {
  s.col(8, 1, 14, "t");
  s.run(1, 8, 14, "t");
  for (let i = 1; i <= 4; i++) {
    s.px(8 - i, 8 - i, "s");
    s.px(8 + i, 8 - i, "s");
    s.px(8 - i, 8 + i, "s");
    s.px(8 + i, 8 + i, "s");
  }
  s.box(7, 7, 3, 3, "Q");
  s.outline("0");
});

const book = ic((s) => {
  s.box(2, 3, 12, 11, "j");
  s.box(3, 4, 10, 9, "k");
  s.box(7, 3, 2, 11, "i");
  s.box(3, 4, 4, 2, "8");
  s.box(9, 4, 4, 2, "8");
  s.box(3, 8, 4, 1, "8");
  s.box(9, 8, 4, 1, "8");
  s.px(8, 6, "t");
  s.outline("0");
});

const clover = ic((s) => {
  const leaf = (cx, cy) => {
    s.spans(cy, [[cx - 1, 4], [cx - 2, 6], [cx - 2, 6], [cx - 1, 4]], "w");
    s.px(cx, cy + 1, "x");
  };
  leaf(5, 3);
  leaf(11, 3);
  leaf(5, 8);
  leaf(11, 8);
  s.col(8, 8, 7, "v");
  s.px(9, 13, "v");
  s.outline("0");
});

const hourglass = ic((s) => {
  s.box(2, 1, 12, 2, "s");
  s.box(2, 13, 12, 2, "s");
  s.spans(3, [[3, 10], [4, 8], [5, 6], [6, 4], [6, 4], [5, 6], [4, 8], [3, 10]], "8");
  s.spans(3, [[4, 8], [5, 6], [6, 4]], "p");
  s.spans(9, [[6, 4], [5, 6], [4, 8]], "p");
  s.px(7, 7, "p");
  s.outline("0");
});

const ruler = ic((s) => {
  s.box(1, 6, 14, 4, "d");
  s.run(1, 6, 14, "9");
  for (let x = 3; x < 15; x += 3) s.col(x, 6, 3, "b");
  s.px(1, 9, "b");
  s.outline("0");
});

const magnet = ic((s) => {
  s.box(2, 2, 4, 9, "8");
  s.box(10, 2, 4, 9, "8");
  s.spans(2, [[6, 4], [6, 4]], "8");
  s.box(2, 2, 4, 3, "8");
  s.box(6, 2, 4, 3, "7");
  s.box(2, 11, 4, 3, "l");
  s.box(10, 11, 4, 3, "C");
  s.run(2, 2, 12, "9");
  s.outline("0");
});

/* ---- elements -------------------------------------------------------- */

const flame = ic((s) => {
  s.spans(1, [[7, 2], [6, 4], [5, 6], [4, 8], [3, 10], [2, 12], [2, 12], [2, 12], [3, 10], [4, 8], [5, 6]], "n");
  s.spans(4, [[6, 4], [5, 6], [4, 8], [4, 8], [4, 8], [5, 6], [6, 4]], "o");
  s.spans(7, [[6, 4], [6, 4], [7, 2]], "p");
  s.px(7, 3, "p");
  s.outline("0");
});

const snowflake = ic((s) => {
  s.col(8, 1, 14, "C");
  for (let i = 0; i < 12; i++) {
    const t = i - 6;
    s.px(8 + t, 8 + t, "C");
    s.px(8 - t, 8 + t, "C");
  }
  for (const y of [4, 11]) {
    s.px(6, y, "D");
    s.px(10, y, "D");
  }
  s.box(7, 7, 3, 3, "D");
  s.px(8, 1, "D");
  s.px(8, 14, "D");
  s.outline("0");
});

const venom = ic((s) => {
  s.spans(2, [[5, 6], [4, 8], [4, 8], [5, 6]], "y");
  s.box(6, 3, 2, 2, "z");
  s.box(9, 3, 2, 2, "z");
  s.px(6, 4, "0");
  s.px(10, 4, "0");
  s.spans(6, [[6, 5], [7, 4], [5, 4], [4, 4], [5, 5], [7, 4]], "y");
  s.px(6, 6, "z");
  s.px(5, 9, "z");
  s.px(9, 12, "z");
  s.outline("0");
});

const ghost = ic((s) => {
  s.spans(2, [[5, 6], [3, 10], [2, 12], [2, 12], [2, 12], [2, 12], [2, 12], [2, 12], [2, 12], [2, 12]], "8");
  s.spans(3, [[5, 4], [4, 4]], "9");
  s.box(5, 5, 2, 3, "1");
  s.box(9, 5, 2, 3, "1");
  s.box(7, 9, 2, 2, "1");
  s.run(2, 12, 3, "8");
  s.run(7, 12, 2, "8");
  s.run(11, 12, 3, "8");
  s.px(3, 13, "7");
  s.px(12, 13, "7");
  s.outline("0");
});

const bomb = ic((s) => {
  s.spans(5, [[4, 8], [3, 10], [2, 12], [2, 12], [2, 12], [3, 10], [4, 8]], "3");
  s.spans(6, [[4, 4], [3, 4], [3, 4]], "5");
  s.box(7, 3, 3, 3, "4");
  s.px(10, 2, "c");
  s.px(11, 1, "o");
  s.px(12, 0, "p");
  s.outline("0");
});

const wildfire = ic((s) => {
  s.spans(6, [[1, 4], [1, 5], [0, 6], [0, 7], [0, 8]], "n");
  s.spans(4, [[6, 4], [5, 6], [5, 6], [4, 8], [4, 8], [5, 6]], "n");
  s.spans(6, [[6, 4], [6, 4], [6, 4]], "o");
  s.spans(8, [[11, 4], [11, 5], [10, 6], [10, 6]], "n");
  s.px(7, 5, "p");
  s.px(2, 8, "o");
  s.px(12, 10, "o");
  s.run(0, 14, 16, "m");
  s.outline("0");
});

/* ---- gear & misc ----------------------------------------------------- */

const hand = ic((s) => {
  s.box(4, 5, 9, 8, "K");
  s.box(4, 5, 9, 2, "L");
  s.box(4, 2, 2, 4, "K");
  s.box(7, 1, 2, 5, "K");
  s.box(10, 2, 2, 4, "K");
  s.box(12, 6, 3, 3, "K");
  s.box(4, 13, 9, 2, "J");
  s.outline("0");
});

const boot = ic((s) => {
  s.box(5, 2, 6, 9, "c");
  s.run(5, 2, 6, "d");
  s.box(5, 10, 9, 3, "c");
  s.box(4, 13, 11, 2, "b");
  s.box(5, 7, 6, 1, "b");
  s.px(12, 11, "s");
  s.outline("0");
});

const wind = ic((s) => {
  for (const [y, x0, len] of [[3, 3, 10], [6, 1, 13], [9, 4, 9], [12, 2, 8]]) {
    s.run(x0, y, len, "8");
    s.px(x0 + len, y - 1, "9");
    s.px(x0 + len - 1, y, "9");
  }
  s.outline("0");
});

const check = ic((s) => {
  for (let i = 0; i < 4; i++) s.box(2 + i, 7 + i, 2, 2, "x");
  for (let i = 0; i < 6; i++) s.box(6 + i, 10 - i, 2, 2, "z");
  s.outline("0");
});

const cross = ic((s) => {
  for (let i = 0; i < 10; i++) {
    s.box(3 + i, 3 + i, 2, 2, "k");
    s.box(12 - i, 3 + i, 2, 2, "k");
  }
  s.outline("0");
});

const lock = ic((s) => {
  s.box(3, 7, 10, 8, "g");
  s.box(4, 8, 8, 6, "h");
  s.spans(2, [[5, 6], [4, 2], [10, 2], [4, 2], [10, 2], [4, 2], [10, 2]], "f");
  s.box(7, 9, 2, 4, "e");
  s.px(7, 10, "0");
  s.outline("0");
});

const arrowUp = ic((s) => {
  s.spans(2, [[7, 2], [6, 4], [5, 6], [4, 8], [3, 10]], "z");
  s.box(6, 7, 4, 8, "z");
  s.outline("0");
});

const arrowDown = ic((s) => {
  s.box(6, 1, 4, 8, "l");
  s.spans(9, [[3, 10], [4, 8], [5, 6], [6, 4], [7, 2]], "l");
  s.outline("0");
});

const plus = ic((s) => {
  s.box(6, 2, 4, 12, "9");
  s.box(2, 6, 12, 4, "9");
  s.outline("0");
});

const potion = ic((s) => {
  s.box(6, 1, 4, 2, "c");
  s.box(6, 3, 4, 2, "8");
  s.spans(5, [[4, 8], [3, 10], [3, 10], [3, 10], [3, 10], [3, 10], [4, 8], [5, 6]], "8");
  s.spans(7, [[4, 8], [4, 8], [4, 8], [4, 8], [5, 6]], "k");
  s.run(4, 7, 8, "l");
  s.px(5, 9, "9");
  s.outline("0");
});

const chestIcon = ic((s) => {
  s.box(1, 6, 14, 8, "c");
  s.box(2, 7, 12, 6, "d");
  s.spans(3, [[3, 10], [2, 12], [1, 14]], "c");
  s.box(1, 5, 14, 2, "g");
  s.box(6, 5, 4, 5, "g");
  s.box(7, 7, 2, 2, "t");
  s.box(1, 13, 14, 2, "b");
  s.outline("0");
});

const skullCrossed = ic((s) => {
  s.spans(3, [[4, 8], [3, 10], [3, 10], [3, 10], [4, 8]], "N");
  s.box(5, 5, 2, 2, "0");
  s.box(9, 5, 2, 2, "0");
  s.box(6, 8, 4, 2, "N");
  s.px(7, 8, "0");
  for (let i = 0; i < 10; i++) {
    s.px(3 + i, 11 + (i % 2 ? 0 : 1), "M");
    s.px(12 - i, 11 + (i % 2 ? 0 : 1), "M");
  }
  s.outline("0");
});

export const UI_ICONS = {
  sword, dagger, wand, burst, bolt, target, eye, skull, hammer, bow, orb,
  wave, spiral, thorn,
  heart, heart_broken: heartBroken, heart_plus: heartPlus, regen, shield, rock,
  mana: manaDrop, blood: bloodDrop, stamina,
  coin, souls, xp: xpStar, book, clover, hourglass, ruler, magnet,
  flame, snowflake, venom, ghost, bomb, wildfire,
  hand, boot, wind, check, cross, lock,
  arrow_up: arrowUp, arrow_down: arrowDown, plus, potion, chest: chestIcon,
  skull_crossed: skullCrossed,
};

/** Level-up upgrade id -> icon name (data/upgrades.js LEVEL_UPGRADES). */
export const UPGRADE_ICONS = {
  dmg15: "sword", dmg25: "burst", as20: "hand", as35: "bolt",
  crit10: "eye", crit20: "target", hp20: "heart", hp40: "shield",
  armor5: "rock", ms15: "boot", ms25: "wind", proj1: "bow",
  proj_size: "orb", fire20: "flame", ice20: "snowflake", light20: "bolt",
  poison20: "venom", ls8: "blood", dodge8: "ghost", xp20: "book",
  gold25: "coin", luck15: "clover", cdr12: "hourglass", mana30: "mana",
  range20: "ruler", knock: "wave", dash: "spiral", armor_pen: "hammer",
  exec: "skull", thorns: "thorn", regen: "regen", pickup: "magnet",
  combo: "flame", explode_kill: "bomb", burn_spread: "wildfire",
  missing_hp: "heart_broken", overheal: "heart_plus",
};

/** Class id -> icon name. */
export const CLASS_ICONS = { warrior: "sword", rogue: "dagger", mage: "wand" };

/** Meta-progression upgrade id -> icon name. */
export const META_ICONS = {
  meta_hp: "heart", meta_dmg: "sword", meta_luck: "clover", meta_potion: "potion",
  meta_xp: "book", meta_gold: "coin", meta_speed: "boot", meta_armor: "shield",
  meta_souls: "souls", meta_revive: "heart_plus",
};
