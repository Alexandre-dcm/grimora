/**
 * Animation state driver.
 *
 * Gameplay code owns no animation state — it already tracks everything we need
 * (attackAnim, hurtFlash, dashTimer, vx/vy, dead). This module reads those
 * fields and derives a clip + frame, stashing only presentation state on the
 * entity under `_art`. Nothing here can change gameplay behaviour.
 */

import { CLIPS, frameAt, clipDone } from "../Rigger.js";

/** Priority order: death > hurt > attack > dodge > walk > idle. */
function pickState(e, kind) {
  if (e.dead) return "death";
  if (kind === "player") {
    if (e.dashTimer > 0) return "dodge";
    if (e.attackAnim > 0) return "attack";
    if (e.hurtFlash > 0.05) return "hurt";
    return Math.hypot(e.vx || 0, e.vy || 0) > 8 ? "walk" : "idle";
  }
  if (e.hurtFlash > 0.05) return "hurt";
  if (e._art?.attackHold > 0) return "attack";
  if (e.telegraph > 0) return "cast";
  return Math.hypot(e.vx || 0, e.vy || 0) > 6 ? "walk" : "idle";
}

/**
 * Advance and read the animation for one entity.
 * @returns {{state:string, frame:number, t:number, dead:boolean, flip:boolean}}
 */
export function animate(e, kind, dt) {
  let a = e._art;
  if (!a) {
    a = e._art = { state: "idle", t: 0, attackHold: 0, flip: false, lastX: e.x, deathT: 0 };
  }

  if (a.attackHold > 0) a.attackHold -= dt;

  // Facing: sprites are authored facing right/front; mirror when moving left.
  if (kind === "player") {
    a.flip = e.aimAngle !== undefined ? Math.cos(e.aimAngle) < 0 : a.flip;
  } else if (Math.abs(e.x - a.lastX) > 0.05) {
    a.flip = e.x < a.lastX;
  }
  a.lastX = e.x;

  const want = pickState(e, kind);
  if (want !== a.state) {
    // Don't interrupt a one-shot clip with a lower-priority looping one
    const oneShot = !CLIPS[a.state]?.loop;
    const finished = clipDone(a.state, a.t);
    const override = want === "death" || want === "hurt" || want === "attack";
    if (!oneShot || finished || override) {
      a.state = want;
      a.t = 0;
    }
  }
  a.t += dt;
  if (a.state === "death") a.deathT += dt;

  return {
    state: a.state,
    frame: frameAt(a.state, a.t),
    t: a.t,
    flip: a.flip,
    deathT: a.deathT,
  };
}

/** Called by combat hooks so the attack clip plays even for instant attacks. */
export function triggerAttack(e, hold = 0.24) {
  if (!e._art) return;
  e._art.attackHold = hold;
  e._art.state = "attack";
  e._art.t = 0;
}

/** Player facing as a 4-direction key from the aim angle. */
export function dirFromAngle(angle) {
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const deg = (a * 180) / Math.PI;
  if (deg >= 45 && deg < 135) return "down";
  if (deg >= 135 && deg < 225) return "left";
  if (deg >= 225 && deg < 315) return "up";
  return "right";
}

/** Death fade: 1 -> 0 across the death clip, then stays 0. */
export function deathAlpha(t) {
  const total = CLIPS.death.frames / CLIPS.death.fps;
  return Math.max(0, 1 - t / total);
}
