/**
 * THE DELVER — player character.
 *
 * 24x30 logical pixels. Feet land on row 28, contact shadow row 29.
 * Silhouette identity: pointed hood, a single steel pauldron, a crimson
 * gambeson strip framed by dark leather, and a very dark cloak that reads as
 * a frame behind the body rather than competing with it (ART_BIBLE §7, §11).
 *
 * Authored with explicit coordinates. Pure data — no DOM.
 */

import { shape } from "../Shape.js";

export const PLAYER_W = 24;
export const PLAYER_H = 30;
const CX = 12;

/** Shared body construction so all three facings stay on-model. */
function legsAndCloak(s) {
  // Cloak: near-black, sits behind. Two tones only, so it never out-values the body.
  s.taper(CX, 9, 20, 14, 22, "P");
  s.taper(CX, 10, 18, 10, 16, "i");

  // Legs
  s.symBox(8, 21, 4, 7, "b");
  s.symBox(9, 22, 2, 6, "c");
  s.symBox(7, 27, 5, 2, "a");
  s.symBox(8, 27, 3, 1, "b");
}

function torso(s) {
  s.taper(CX, 10, 11, 13, 11, "b");
  s.box(10, 11, 4, 8, "k");        // gambeson
  s.box(10, 11, 2, 8, "l");        // lit edge
  s.box(9, 12, 1, 7, "a");         // strap shadow
  s.box(14, 12, 1, 7, "a");
  s.box(8, 19, 8, 2, "q");         // belt
  s.box(11, 19, 2, 2, "t");        // buckle
  // arms
  s.box(6, 11, 3, 8, "b");
  s.box(6, 11, 1, 8, "c");
  s.box(15, 11, 3, 8, "b");
  s.box(6, 18, 3, 3, "a");         // gloves
  s.box(15, 18, 3, 3, "a");
}

const DOWN = shape(PLAYER_W, PLAYER_H, (s) => {
  legsAndCloak(s);
  torso(s);

  // Hood
  s.taper(CX, 1, 4, 8, 12, "j");
  s.box(6, 4, 12, 6, "j");
  s.taper(CX, 1, 3, 6, 10, "k");
  s.box(6, 4, 3, 5, "k");
  s.box(16, 5, 2, 5, "i");
  s.box(7, 10, 10, 1, "i");

  // Face in hood shadow, two bright eyes
  s.box(8, 5, 8, 5, "I");
  s.box(9, 6, 6, 3, "K");
  s.box(9, 8, 6, 1, "J");
  s.box(9, 7, 2, 1, "9");
  s.box(13, 7, 2, 1, "9");

  // Pauldron on the left shoulder
  s.box(4, 10, 5, 4, "g");
  s.box(4, 10, 5, 1, "h");
  s.box(4, 13, 5, 1, "f");
  s.px(5, 11, "h");

  s.contact("1", 5);
});

const UP = shape(PLAYER_W, PLAYER_H, (s) => {
  legsAndCloak(s);
  torso(s);

  // Hood from behind: no face, a seam down the middle
  s.taper(CX, 1, 4, 8, 12, "j");
  s.box(6, 4, 12, 7, "j");
  s.taper(CX, 1, 3, 6, 10, "k");
  s.box(6, 4, 3, 6, "k");
  s.box(16, 5, 2, 6, "i");
  s.box(11, 3, 2, 8, "i");
  s.box(7, 10, 10, 1, "i");

  // Cloak clasp and a hanging cowl
  s.box(9, 11, 6, 2, "i");
  s.box(11, 11, 2, 2, "s");
  s.box(9, 13, 6, 6, "i");

  // Pauldron mirrored to the far shoulder
  s.box(15, 10, 5, 4, "g");
  s.box(15, 10, 5, 1, "h");
  s.box(15, 13, 5, 1, "f");

  s.contact("1", 5);
});

const RIGHT = shape(PLAYER_W, PLAYER_H, (s) => {
  // Cloak trails to the left, behind the body
  s.taper(9, 10, 19, 12, 18, "P");
  s.taper(9, 11, 17, 8, 13, "i");

  // Legs, offset into a stride-ready stance
  s.box(8, 21, 4, 7, "b");
  s.box(9, 22, 2, 6, "c");
  s.box(6, 27, 6, 2, "a");
  s.box(13, 21, 4, 7, "b");
  s.box(13, 22, 2, 6, "c");
  s.box(12, 27, 6, 2, "a");

  // Torso in profile: narrower, leaning slightly forward
  s.taper(12, 10, 11, 11, 9, "b");
  s.box(11, 11, 4, 8, "k");
  s.box(11, 11, 2, 8, "l");
  s.box(9, 19, 8, 2, "q");
  s.box(12, 19, 2, 2, "t");

  // Near arm forward, far arm behind
  s.box(15, 12, 3, 7, "b");
  s.box(15, 12, 1, 7, "c");
  s.box(15, 18, 4, 3, "a");
  s.box(8, 13, 3, 6, "a");

  // Hood in profile: peak points back, brim overhangs the face
  s.taper(11, 1, 4, 8, 13, "j");
  s.box(6, 4, 13, 6, "j");
  s.box(6, 3, 5, 3, "j");
  s.taper(11, 1, 3, 6, 10, "k");
  s.box(7, 4, 3, 5, "k");
  s.box(7, 10, 10, 1, "i");

  // Profile face: one eye, jaw line
  s.box(14, 5, 5, 5, "I");
  s.box(14, 6, 4, 3, "K");
  s.box(14, 7, 2, 1, "9");
  s.box(17, 8, 2, 2, "J");
  s.box(13, 4, 6, 1, "i");

  // Pauldron on the near shoulder
  s.box(11, 10, 5, 3, "g");
  s.box(11, 10, 5, 1, "h");
  s.box(11, 12, 5, 1, "f");

  s.contact("1", 5);
});

/**
 * Animation rig: row bands and limb regions used by Rigger to synthesise
 * frames with integer pixel-space transforms (ART_BIBLE §7).
 */
export const PLAYER_RIG = {
  head: [0, 10],
  torso: [11, 20],
  legs: [21, 28],
  legLeft: [5, 21, 11, 28],
  legRight: [12, 21, 19, 28],
  armFront: [14, 10, 20, 21],
  cloak: [0, 9, 5, 27],
  /** Where a held weapon is anchored, per facing. */
  hand: {
    down: { x: 17, y: 17 },
    up: { x: 6, y: 17 },
    right: { x: 16, y: 16 },
    left: { x: 7, y: 16 },
  },
};

export const PLAYER_SPRITES = { down: DOWN, up: UP, right: RIGHT };

/** Class recolors — the cloak and gambeson carry the class identity. */
export const CLASS_REMAPS = {
  warrior: {},
  rogue: { P: "u", i: "u", j: "v", k: "w", l: "x" },
  mage: { P: "E", i: "E", j: "F", k: "G", l: "H" },
};
