/**
 * BOSSES — 56x56, authored with explicit coordinates (ART_BIBLE §2, §8).
 *
 * Each is built as: symmetric mass -> mirrorMerge -> asymmetric detail
 * (weapon / broken horn) -> outline -> contact shadow.
 * None is a scaled-up normal enemy; every silhouette is unique.
 *
 * Pure data — no DOM.
 */

import { shape } from "../Shape.js";

const W = 56;
const H = 56;
const CX = 28;

/* =============================== 1. THE ABYSSAL KNIGHT ===============================
 * Black plate over crimson, gold trim, horned great-helm, tattered cape,
 * two-handed greatsword planted at its side.
 */
const abyssalKnight = shape(W, H, (s) => {
  // --- cape, behind everything
  s.taper(CX, 22, 28, 26, 46, "i");
  s.taper(CX, 22, 26, 20, 36, "j");
  s.dither(6, 44, 44, 6, "i", 0, true);

  // --- legs & boots
  s.symBox(16, 40, 9, 12, "e");
  s.symBox(18, 40, 5, 10, "f");
  s.symBox(14, 49, 12, 5, "e");
  s.symBox(15, 50, 9, 2, "f");

  // --- torso
  s.taper(CX, 20, 21, 20, 24, "f");
  s.taper(CX, 21, 17, 12, 15, "g");
  s.box(CX - 9, 35, 18, 3, "r");          // belt
  s.box(CX - 3, 35, 6, 3, "s");           // buckle
  s.symBox(21, 24, 2, 10, "e");           // chest fluting
  s.box(CX - 1, 24, 2, 11, "e");
  s.symBox(19, 30, 3, 2, "s");            // gold rivets

  // --- pauldrons
  s.taper(9, 21, 10, 16, 10, "f");
  s.taper(9, 22, 8, 12, 7, "g");
  s.step(4, 21, 4, 2, 1, -1, "e");        // spikes rising outward
  s.symBox(2, 24, 3, 3, "e");

  // --- gorget & helm
  s.box(CX - 7, 17, 14, 4, "e");
  s.taper(CX, 6, 13, 16, 20, "f");
  s.taper(CX, 7, 10, 12, 15, "g");
  s.box(CX - 9, 12, 18, 5, "0");          // visor recess
  s.box(CX - 8, 13, 16, 3, "l");          // burning slit
  s.box(CX - 8, 14, 16, 1, "k");
  s.box(CX - 6, 6, 12, 2, "e");           // crown ridge
  s.box(CX - 1, 6, 2, 8, "e");            // nasal bar

  // --- horns, sweeping up and out
  s.step(19, 8, 6, 2, -1, -1, "k");
  s.step(18, 3, 3, 2, 1, -1, "l");

  s.mirrorMerge();

  // --- greatsword, asymmetric, planted point-down at its right side
  s.box(45, 12, 4, 30, "g");              // blade
  s.box(46, 12, 2, 30, "h");
  s.box(45, 42, 4, 3, "g");
  s.box(44, 41, 6, 2, "e");               // fuller tip
  s.box(42, 9, 10, 3, "e");               // crossguard
  s.box(43, 10, 8, 1, "s");
  s.box(46, 3, 2, 6, "b");                // grip
  s.box(45, 1, 4, 3, "s");                // pommel

  s.outline("0");
  s.contact("1", 6);
});

/* ================================ 2. THE HOLLOW STAG ================================
 * Gaunt forest horror: bleached elk skull, immense antlers, hollow ribcage
 * wrapped in bark and roots, green witchlight in the sockets.
 */
const hollowStag = shape(W, H, (s) => {
  // --- hind mass & legs (long, thin, digitigrade)
  s.symBox(13, 38, 6, 12, "v");
  s.symBox(14, 38, 3, 12, "w");
  s.symBox(11, 49, 9, 4, "u");
  s.symBox(21, 40, 5, 10, "v");
  s.symBox(22, 40, 2, 10, "w");
  s.symBox(20, 49, 7, 3, "u");

  // --- torso: hollow ribcage
  s.taper(CX, 22, 18, 22, 18, "v");
  s.taper(CX, 23, 15, 16, 12, "w");
  for (let i = 0; i < 5; i++) {
    s.box(CX - 10, 25 + i * 3, 20, 2, "N");   // ribs
    s.box(CX - 8, 26 + i * 3, 16, 1, "u");    // gaps
  }
  s.box(CX - 2, 24, 4, 16, "M");              // sternum
  s.box(CX - 1, 25, 2, 14, "N");

  // --- shoulders / bark mantle
  s.taper(CX, 19, 6, 26, 22, "u");
  s.dither(CX - 13, 19, 26, 5, "v", 0, true);
  s.symBox(8, 20, 5, 8, "u");
  s.symBox(9, 21, 3, 6, "v");

  // --- neck & elk skull
  s.box(CX - 3, 14, 6, 6, "M");
  s.taper(CX, 8, 8, 12, 10, "N");
  s.taper(CX, 15, 4, 8, 5, "O");              // muzzle
  s.box(CX - 4, 18, 8, 3, "N");
  s.box(CX - 3, 20, 6, 2, "M");
  s.symBox(20, 11, 4, 3, "0");                // sockets
  s.symBox(21, 12, 2, 2, "x");                // witchlight
  s.box(CX - 1, 16, 2, 4, "0");               // nasal cavity
  s.symBox(24, 20, 2, 3, "O");                // teeth

  // --- antlers: stepped, branching, immense
  s.step(21, 8, 5, 2, -1, -1, "N");
  s.step(13, 3, 4, 2, -1, 1, "N");
  s.col(12, 4, 6, "N");
  s.col(8, 6, 5, "N");
  s.run(8, 6, 5, "N");
  s.step(17, 6, 3, 2, -1, -1, "M");
  s.col(6, 8, 4, "M");
  s.run(4, 11, 4, "N");
  s.col(4, 11, 5, "N");
  s.col(15, 2, 4, "N");
  s.run(12, 2, 4, "N");
  s.col(19, 4, 3, "M");

  s.mirrorMerge();

  // --- one snapped antler tine breaks the symmetry
  s.box(44, 2, 3, 2, ".");
  s.box(47, 3, 2, 4, ".");
  s.box(43, 4, 3, 2, "M");

  // --- roots creeping up the near foreleg
  s.box(24, 44, 2, 8, "u");
  s.box(30, 46, 2, 6, "u");

  s.outline("0");
  s.contact("1", 8);
});

/* =============================== 3. THE INFERNAL DUKE ===============================
 * Molten demon lord: crown of flame, sweeping membranous wings, obsidian hide
 * split by glowing fissures, cloven hooves.
 */
const infernalDuke = shape(W, H, (s) => {
  // --- wings, drawn behind the body
  s.step(16, 12, 8, 2, -1, 1, "m");
  s.taper(11, 20, 16, 18, 6, "m");
  s.taper(11, 21, 13, 13, 4, "n");
  for (let i = 0; i < 4; i++) s.col(6 + i * 3, 16 + i * 2, 16 - i * 3, "m"); // wing fingers
  s.dither(3, 22, 18, 12, "m", 1, true);

  // --- legs & hooves
  s.symBox(16, 38, 8, 10, "m");
  s.symBox(17, 38, 5, 9, "n");
  s.symBox(15, 47, 10, 4, "1");
  s.symBox(16, 48, 3, 3, "2");
  s.symBox(21, 48, 3, 3, "2");

  // --- torso
  s.taper(CX, 18, 21, 22, 20, "m");
  s.taper(CX, 19, 18, 16, 13, "n");
  s.box(CX - 6, 24, 12, 2, "o");             // fissures
  s.box(CX - 4, 28, 8, 2, "o");
  s.box(CX - 7, 32, 14, 2, "o");
  s.box(CX - 3, 25, 6, 1, "p");
  s.box(CX - 5, 33, 10, 1, "p");
  s.symBox(19, 20, 4, 6, "1");               // shoulder plates
  s.symBox(20, 21, 2, 4, "n");

  // --- arms
  s.symBox(13, 24, 5, 14, "m");
  s.symBox(14, 25, 3, 12, "n");
  s.symBox(12, 37, 7, 4, "1");               // clawed fists
  s.symBox(11, 40, 2, 3, "p");
  s.symBox(14, 40, 2, 3, "p");

  // --- head
  s.taper(CX, 8, 11, 14, 16, "m");
  s.taper(CX, 9, 8, 10, 12, "n");
  s.box(CX - 6, 13, 12, 3, "0");
  s.symBox(22, 13, 4, 3, "p");               // blazing eyes
  s.symBox(23, 14, 2, 1, "Q");
  s.box(CX - 4, 17, 8, 2, "0");              // maw
  s.symBox(24, 17, 1, 2, "p");
  s.box(CX - 3, 18, 6, 1, "o");

  // --- horns + flame crown
  s.step(20, 8, 6, 2, -1, -1, "1");
  s.step(19, 3, 3, 2, 1, -1, "2");
  s.symBox(24, 2, 2, 5, "o");
  s.symBox(21, 4, 2, 4, "n");
  s.box(CX - 1, 0, 2, 6, "p");
  s.symBox(25, 1, 1, 3, "p");

  s.mirrorMerge();
  s.outline("0");
  s.contact("1", 8);
});

/* ============================== 4. THE FROST SOVEREIGN ==============================
 * Ancient king sealed in ice: jagged crown, frozen mantle, glacier scepter,
 * shards erupting from the shoulders.
 */
const frostSovereign = shape(W, H, (s) => {
  // --- mantle / robe, wide and heavy
  s.taper(CX, 24, 28, 24, 44, "A");
  s.taper(CX, 24, 26, 18, 34, "B");
  s.taper(CX, 26, 22, 10, 20, "C");
  s.dither(8, 44, 40, 7, "A", 0, true);
  s.box(CX - 2, 30, 4, 20, "D");            // frozen seam

  // --- feet peeking out
  s.symBox(18, 49, 8, 4, "A");
  s.symBox(19, 50, 5, 2, "B");

  // --- torso & arms
  s.taper(CX, 20, 14, 20, 24, "B");
  s.taper(CX, 21, 11, 14, 16, "C");
  s.symBox(13, 23, 5, 14, "B");
  s.symBox(14, 24, 3, 12, "C");
  s.symBox(12, 36, 7, 4, "A");              // frozen gauntlets
  s.symBox(13, 37, 4, 2, "D");

  // --- shoulder shards
  s.symBox(11, 20, 7, 5, "A");
  s.symBox(12, 21, 5, 3, "B");
  s.step(10, 20, 5, 2, -1, -1, "D");
  s.step(14, 19, 4, 2, -1, -1, "C");

  // --- head
  s.box(CX - 4, 17, 8, 4, "A");             // gorget
  s.taper(CX, 8, 10, 12, 14, "B");
  s.taper(CX, 9, 7, 8, 10, "C");
  s.box(CX - 5, 12, 10, 3, "0");
  s.symBox(23, 12, 3, 3, "T");              // frozen stare
  s.symBox(24, 13, 1, 1, "Q");
  s.box(CX - 3, 16, 6, 2, "A");             // frost beard
  s.box(CX - 4, 17, 8, 1, "D");

  // --- crown of jagged ice
  s.box(CX - 7, 6, 14, 3, "A");
  s.box(CX - 6, 7, 12, 1, "C");
  s.col(CX - 1, 0, 7, "D");
  s.col(CX, 0, 7, "D");
  s.symBox(22, 2, 2, 5, "D");
  s.symBox(19, 4, 2, 3, "C");
  s.symBox(25, 1, 1, 5, "D");

  s.mirrorMerge();

  // --- glacier scepter in the right hand
  s.box(45, 10, 3, 30, "B");
  s.box(46, 10, 1, 30, "C");
  s.box(43, 3, 7, 8, "C");
  s.box(44, 4, 5, 6, "D");
  s.box(45, 5, 3, 4, "T");
  s.box(46, 0, 1, 4, "D");
  s.box(42, 6, 1, 3, "D");
  s.box(50, 6, 1, 3, "D");

  s.outline("0");
  s.contact("1", 8);
});

/* =============================== 5. THE VOID EMPEROR ===============================
 * Legless, robed, crowned in dark stars, ringed by torn-off fragments of
 * itself. Three eyes. Reality frays at its hem.
 */
const voidEmperor = shape(W, H, (s) => {
  // --- robe: broad, tapering into nothing
  s.taper(CX, 20, 26, 22, 42, "E");
  s.taper(CX, 20, 24, 16, 32, "F");
  s.taper(CX, 22, 20, 8, 18, "G");
  s.box(CX - 1, 24, 2, 22, "H");             // spine of light

  // --- frayed hem, dissolving upward
  s.dither(7, 42, 42, 5, "E", 0, true);
  s.dither(9, 44, 38, 4, ".", 1, true);
  for (let i = 0; i < 7; i++) s.col(10 + i * 6, 46, 2 + (i % 3), "F");

  // --- arms, wide open
  s.symBox(11, 24, 5, 12, "F");
  s.symBox(12, 25, 3, 10, "G");
  s.symBox(9, 35, 8, 4, "E");
  s.symBox(10, 36, 5, 2, "H");

  // --- shoulders
  s.taper(CX, 18, 5, 26, 22, "E");
  s.symBox(9, 19, 6, 5, "F");
  s.symBox(10, 20, 4, 3, "G");

  // --- head: a hood with no face, only eyes
  s.taper(CX, 7, 12, 12, 16, "E");
  s.taper(CX, 9, 9, 8, 12, "F");
  s.box(CX - 5, 13, 10, 4, "0");
  s.symBox(22, 14, 3, 2, "H");               // outer eyes
  s.box(CX - 1, 11, 2, 2, "H");              // third eye
  s.symBox(23, 14, 1, 1, "Q");

  // --- crown of dark stars
  s.box(CX - 6, 6, 12, 2, "E");
  s.col(CX - 1, 1, 6, "G");
  s.col(CX, 1, 6, "G");
  s.symBox(22, 3, 2, 4, "F");
  s.symBox(19, 5, 2, 3, "F");
  s.symPx(23, 1, "U");
  s.symPx(20, 3, "U");
  s.px(CX - 1, 0, "U");
  s.px(CX, 0, "U");

  s.mirrorMerge();

  // --- orbiting fragments (asymmetric on purpose: they are torn loose)
  s.box(3, 14, 4, 4, "F");
  s.box(4, 15, 2, 2, "G");
  s.box(50, 22, 5, 3, "F");
  s.box(51, 23, 3, 1, "G");
  s.box(46, 8, 3, 3, "F");
  s.box(8, 34, 3, 2, "F");
  s.box(48, 40, 4, 2, "F");

  s.outline("0");
});

export const BOSS_SPRITES = {
  abyssal_knight: { rows: abyssalKnight, rig: { type: "heavy", bands: [20, 40] }, accent: "#e0454a" },
  forest_horror: { rows: hollowStag, rig: { type: "heavy", bands: [22, 40] }, accent: "#6aa83c" },
  infernal_duke: { rows: infernalDuke, rig: { type: "heavy", bands: [19, 40] }, accent: "#e8791c" },
  frost_sovereign: { rows: frostSovereign, rig: { type: "floater", bands: [20, 44] }, accent: "#4fa8cc" },
  void_emperor: { rows: voidEmperor, rig: { type: "floater", bands: [18, 44] }, accent: "#7b3fc4" },
};

/**
 * Phase palette shifts (ART_BIBLE §8). Phase 2 cracks the armour, phase 3
 * pushes the whole creature toward its rage color.
 */
export const BOSS_PHASE_REMAPS = {
  abyssal_knight: { 2: { g: "h" }, 3: { f: "j", g: "k", e: "i" } },
  forest_horror: { 2: { w: "x" }, 3: { v: "y", w: "z", u: "y" } },
  infernal_duke: { 2: { n: "o" }, 3: { m: "n", n: "o", "1": "m" } },
  frost_sovereign: { 2: { C: "D" }, 3: { B: "C", C: "D", A: "B" } },
  void_emperor: { 2: { G: "H" }, 3: { F: "G", G: "H", E: "F" } },
};
