/**
 * ANIMATION RIGGER (ART_BIBLE §6).
 *
 * Frames are synthesised from a single authored grid by integer pixel-space
 * transforms — band shifts, region lifts, row squashes, erosion. Nothing is
 * ever rotated, scaled or interpolated, so every frame is still hand-authorable
 * pixel art. This is how one 24x24 grid becomes a 15-frame creature.
 *
 * Pure data — no DOM.
 */

import { PixelGrid } from "./PixelSprite.js";

/** Frame counts and playback rates per state. */
export const CLIPS = {
  idle: { frames: 2, fps: 3.5, loop: true },
  walk: { frames: 4, fps: 9, loop: true },
  attack: { frames: 3, fps: 13, loop: false },
  hurt: { frames: 2, fps: 14, loop: false },
  death: { frames: 5, fps: 9, loop: false },
  dodge: { frames: 2, fps: 12, loop: false },
  cast: { frames: 3, fps: 8, loop: false },
};

function regions(grid, rig) {
  const h = grid.h;
  const b = rig?.bands;
  const headEnd = b ? b[0] : Math.max(1, Math.round(h * 0.32));
  const bodyEnd = b ? b[1] : Math.max(headEnd + 1, Math.round(h * 0.72));
  return { headEnd, bodyEnd, legStart: Math.min(h - 1, bodyEnd + 1), h };
}

/** Lift the left or right half of the leg band by 1px — one footfall. */
function legLift(grid, rig, side) {
  const { legStart, h } = regions(grid, rig);
  const mid = Math.floor(grid.w / 2);
  return side === "left"
    ? grid.shiftRegion(0, legStart, mid - 1, h - 1, 0, -1)
    : grid.shiftRegion(mid, legStart, grid.w - 1, h - 1, 0, -1);
}

/** Drop the head band by dy — breathing, impact, weight. */
function headBob(grid, rig, dy) {
  const { headEnd } = regions(grid, rig);
  return grid.shiftBand(0, headEnd, 0, dy);
}

/** Sway the whole upper body sideways — heavy gaits. */
function upperSway(grid, rig, dx) {
  const { bodyEnd } = regions(grid, rig);
  return grid.shiftBand(0, bodyEnd, dx, 0);
}

/** Remove a fraction of pixels on a stable checker/hash pattern. */
function erode(grid, amount) {
  const out = grid.clone();
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (!grid.isSolid(x, y)) continue;
      // Deterministic hash so the dissolve looks designed, not random
      const hp = ((x * 7 + y * 13 + ((x * y) % 5)) % 10) / 10;
      if (hp < amount) out.set(x, y, ".");
    }
  }
  return out;
}

/** Collapse: squash `n` rows out of the body and settle downward. */
function collapse(grid, rig, n) {
  const { bodyEnd } = regions(grid, rig);
  let g = grid;
  for (let i = 0; i < n; i++) g = g.squashRow(Math.max(1, bodyEnd - i));
  return g.translate(0, n);
}

/* ==================================================================== *
 * PER-TYPE RECIPES
 * ==================================================================== */

function bipedFrames(grid, rig, state, dir) {
  const dx = dir;
  switch (state) {
    case "idle":
      return [grid, headBob(grid, rig, 1)];
    case "walk":
      return [legLift(grid, rig, "left"), grid, legLift(grid, rig, "right"), grid];
    case "attack":
      return [
        headBob(grid.translate(-dx, 0), rig, 1),
        grid.translate(dx * 2, -1),
        grid.translate(dx, 0),
      ];
    case "hurt":
      return [grid.translate(-dx * 2, 0), grid.translate(-dx, 0)];
    case "dodge":
      return [collapse(grid, rig, 1).translate(-dx, 0), collapse(grid, rig, 2)];
    case "cast":
      return [headBob(grid, rig, 1), grid.translate(0, -1), grid];
    case "death":
    default:
      return [
        grid.translate(-dx, 0),
        collapse(grid, rig, 2),
        erode(collapse(grid, rig, 4), 0.25),
        erode(collapse(grid, rig, 6), 0.55),
        erode(collapse(grid, rig, 8), 0.8),
      ];
  }
}

function heavyFrames(grid, rig, state, dir) {
  const dx = dir;
  switch (state) {
    case "idle":
      return [grid, headBob(grid, rig, 1)];
    case "walk":
      return [
        upperSway(legLift(grid, rig, "left"), rig, -1),
        grid,
        upperSway(legLift(grid, rig, "right"), rig, 1),
        grid,
      ];
    case "attack":
      return [
        upperSway(grid.translate(-dx * 2, 0), rig, -dx),
        grid.translate(dx * 3, -1),
        grid.translate(dx, 1),
      ];
    default:
      return bipedFrames(grid, rig, state, dir);
  }
}

function quadrupedFrames(grid, rig, state, dir) {
  const dx = dir;
  const { legStart, h } = regions(grid, rig);
  const third = Math.floor(grid.w / 3);
  const front = (g, d) => g.shiftRegion(grid.w - third, legStart, grid.w - 1, h - 1, 0, d);
  const back = (g, d) => g.shiftRegion(0, legStart, third, h - 1, 0, d);
  switch (state) {
    case "idle":
      return [grid, headBob(grid, rig, 1)];
    case "walk":
      return [front(grid, -1), back(grid, -1), front(back(grid, -1), -1), grid];
    case "attack":
      return [grid.translate(-dx, 1), grid.translate(dx * 3, -1), grid.translate(dx, 0)];
    default:
      return bipedFrames(grid, rig, state, dir);
  }
}

function blobFrames(grid, rig, state, dir) {
  const squash = (n) => {
    let g = grid;
    for (let i = 0; i < n; i++) g = g.squashRow(grid.h - 3 - i);
    return g.translate(0, n);
  };
  switch (state) {
    case "idle":
      return [grid, squash(1)];
    case "walk":
      return [squash(2), squash(1), grid, squash(1)];
    case "attack":
      return [squash(3), grid.translate(dir, -2), grid];
    default:
      return bipedFrames(grid, rig, state, dir);
  }
}

function flyerFrames(grid, rig, state, dir) {
  const w = rig?.wings;
  const flap = (d) =>
    w ? grid.shiftRegion(w[0], w[1], w[2], w[3], 0, d) : grid.shiftBand(0, regions(grid, rig).headEnd, 0, d);
  switch (state) {
    case "idle":
      return [flap(-1), flap(1)];
    case "walk":
      return [flap(-1).translate(0, -1), grid, flap(1).translate(0, 1), grid];
    case "attack":
      return [flap(-1).translate(-dir, -1), flap(1).translate(dir * 3, 1), grid.translate(dir, 0)];
    case "death":
      return [
        grid.translate(0, 1),
        collapse(grid, rig, 2).translate(0, 2),
        erode(collapse(grid, rig, 3).translate(0, 3), 0.3),
        erode(collapse(grid, rig, 4).translate(0, 4), 0.6),
        erode(collapse(grid, rig, 5).translate(0, 5), 0.85),
      ];
    default:
      return bipedFrames(grid, rig, state, dir);
  }
}

function floaterFrames(grid, rig, state, dir) {
  const hem = rig?.hem;
  const drift = (dy) => {
    let g = grid.translate(0, dy);
    if (hem) g = g.shiftRegion(0, hem[0], grid.w - 1, Math.min(grid.h - 1, hem[1]), dy, 0);
    return g;
  };
  switch (state) {
    case "idle":
      return [drift(-1), drift(1)];
    case "walk":
      return [drift(-1), drift(0), drift(1), drift(0)];
    case "attack":
      return [drift(-2), grid.translate(dir * 3, 0), grid.translate(dir, 0)];
    case "cast":
      return [drift(-2), drift(-1), drift(0)];
    case "death":
      return [
        drift(-1),
        erode(grid, 0.2).translate(0, -1),
        erode(grid, 0.45).translate(0, -2),
        erode(grid, 0.7).translate(0, -3),
        erode(grid, 0.9).translate(0, -4),
      ];
    default:
      return bipedFrames(grid, rig, state, dir);
  }
}

const RECIPES = {
  biped: bipedFrames,
  heavy: heavyFrames,
  quadruped: quadrupedFrames,
  blob: blobFrames,
  flyer: flyerFrames,
  floater: floaterFrames,
};

/**
 * Build every frame of one clip.
 * @param {PixelGrid|string[]} base authored grid
 * @param {object} rig  { type, bands, wings, hem }
 * @param {string} state one of CLIPS
 * @param {number} dir  +1 faces right, -1 faces left (drives lunge direction)
 * @returns {PixelGrid[]}
 */
export function buildClip(base, rig, state, dir = 1) {
  const grid = base instanceof PixelGrid ? base : PixelGrid.from(base);
  const recipe = RECIPES[rig?.type] || bipedFrames;
  const frames = recipe(grid, rig || {}, state, dir);
  const want = CLIPS[state]?.frames || frames.length;
  // Pad by holding the last frame so clip length always matches CLIPS
  while (frames.length < want) frames.push(frames[frames.length - 1]);
  return frames.slice(0, want);
}

/** Frame index for a clip at elapsed time `t` seconds. */
export function frameAt(state, t) {
  const clip = CLIPS[state] || CLIPS.idle;
  const i = Math.floor(t * clip.fps);
  return clip.loop ? i % clip.frames : Math.min(clip.frames - 1, i);
}

/** True once a non-looping clip has played out. */
export function clipDone(state, t) {
  const clip = CLIPS[state] || CLIPS.idle;
  return !clip.loop && t * clip.fps >= clip.frames;
}
