import { ObjectPool } from "../utils/ObjectPool.js";
import { rng } from "../utils/Random.js";
import { PALETTE, ELEMENT_COLORS } from "../art/Palette.js";

/**
 * Particles are whole pixels (ART_BIBLE §12): every mote is a 1-3px axis-aligned
 * square on integer coordinates, and it steps down a small colour ramp as it
 * dies instead of fading through alpha alone. That reads as hand-animated pixel
 * VFX rather than a modern soft-particle system.
 */

/** Cooling ramps: particles walk these as they age. */
const RAMPS = {
  fire: [PALETTE.Q, PALETTE.p, PALETTE.o, PALETTE.n, PALETTE.m],
  ice: [PALETTE.Q, PALETTE.D, PALETTE.C, PALETTE.B, PALETTE.A],
  lightning: [PALETTE.Q, PALETTE.T, PALETTE.p, PALETTE.s],
  poison: [PALETTE.Q, PALETTE.z, PALETTE.x, PALETTE.w, PALETTE.y],
  blood: [PALETTE.l, PALETTE.k, PALETTE.j, PALETTE.i],
  arcane: [PALETTE.Q, PALETTE.H, PALETTE.U, PALETTE.G, PALETTE.F],
  gold: [PALETTE.Q, PALETTE.t, PALETTE.s, PALETTE.r],
  smoke: [PALETTE["7"], PALETTE["5"], PALETTE["3"], PALETTE["2"]],
  spark: [PALETTE.Q, PALETTE["9"], PALETTE["8"], PALETTE["6"]],
  heal: [PALETTE.Q, PALETTE.z, PALETTE.x, PALETTE.w],
};

export class ParticleSystem {
  constructor() {
    this.pool = new ObjectPool(
      () => ({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
        size: 2, color: "#fff", gravity: 0, drag: 1, fade: true, ramp: null, flicker: 0,
      }),
      (p, x, y, opts = {}) => {
        p.x = x;
        p.y = y;
        p.vx = opts.vx ?? 0;
        p.vy = opts.vy ?? 0;
        p.life = opts.life ?? 0.5;
        p.maxLife = p.life;
        // Pixel sizes only — 1, 2 or 3 px squares
        p.size = Math.max(1, Math.min(3, Math.round(opts.size ?? 2)));
        p.color = opts.color ?? PALETTE["9"];
        p.gravity = opts.gravity ?? 0;
        p.drag = opts.drag ?? 0.98;
        p.fade = opts.fade !== false;
        p.ramp = opts.ramp ? RAMPS[opts.ramp] || null : null;
        p.flicker = opts.flicker ?? 0;
      },
      512
    );
  }

  /** Ramp name for an element id, so elemental VFX are colour-coded (§12). */
  static rampFor(element) {
    return RAMPS[element] ? element : null;
  }

  emit(x, y, count, optsFactory) {
    for (let i = 0; i < count; i++) {
      const opts = typeof optsFactory === "function" ? optsFactory(i) : { ...optsFactory };
      this.pool.acquire(x, y, opts);
    }
  }

  burst(x, y, count, color, speed = 120, life = 0.45, ramp = null) {
    this.emit(x, y, count, () => {
      const a = rng.randomFloat(0, Math.PI * 2);
      const s = rng.randomFloat(speed * 0.3, speed);
      return {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rng.randomFloat(life * 0.5, life),
        size: rng.randomInt(1, 3),
        color,
        ramp,
        gravity: 40,
        drag: 0.96,
      };
    });
  }

  /**
   * Directional hit spray: a tight cone opposite the blow, plus a couple of
   * stray sparks. This is what sells an impact (§12).
   */
  hit(x, y, angle, count, element = "none", crit = false) {
    const ramp = ParticleSystem.rampFor(element) || (crit ? "gold" : "spark");
    const color = ELEMENT_COLORS[element] || (crit ? PALETTE.t : PALETTE.Q);
    this.emit(x, y, count, (i) => {
      const stray = i % 4 === 3;
      const a = angle + rng.randomFloat(-0.7, 0.7) + (stray ? rng.randomFloat(-1.6, 1.6) : 0);
      const s = rng.randomFloat(90, crit ? 320 : 210);
      return {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rng.randomFloat(0.14, crit ? 0.42 : 0.3),
        size: crit && !stray ? 3 : rng.randomInt(1, 2),
        color,
        ramp,
        gravity: 120,
        drag: 0.93,
      };
    });
  }

  /** Blood spatter that settles on the floor. */
  blood(x, y, angle, count = 8) {
    this.emit(x, y, count, () => {
      const a = angle + rng.randomFloat(-0.9, 0.9);
      const s = rng.randomFloat(40, 180);
      return {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rng.randomFloat(0.3, 0.7),
        size: rng.randomInt(1, 2),
        color: PALETTE.k,
        ramp: "blood",
        gravity: 260,
        drag: 0.9,
      };
    });
  }

  /** Rising embers / spores / motes, used for auras and elemental sources. */
  motes(x, y, count, ramp, spread = 12) {
    this.emit(x, y, count, () => ({
      vx: rng.randomFloat(-18, 18),
      vy: rng.randomFloat(-60, -20),
      life: rng.randomFloat(0.4, 0.9),
      size: rng.randomInt(1, 2),
      color: (RAMPS[ramp] || RAMPS.spark)[0],
      ramp,
      gravity: -12,
      drag: 0.97,
      flicker: 0.3,
    }));
  }

  /** Death puff in the creature's own palette, drifting up as it dissolves. */
  death(x, y, color, big = false) {
    this.burst(x, y, big ? 30 : 16, color, big ? 190 : 130, big ? 0.7 : 0.45, "smoke");
    this.emit(x, y, big ? 12 : 6, () => ({
      vx: rng.randomFloat(-30, 30),
      vy: rng.randomFloat(-70, -25),
      life: rng.randomFloat(0.4, 0.8),
      size: rng.randomInt(1, 3),
      color,
      gravity: -20,
      drag: 0.96,
    }));
  }

  ring(x, y, color, radius = 40, ramp = null) {
    const n = 16;
    this.emit(x, y, n, (i) => {
      const a = (i / n) * Math.PI * 2;
      return {
        vx: Math.cos(a) * radius * 2,
        vy: Math.sin(a) * radius * 2,
        life: 0.35,
        size: 2,
        color,
        ramp,
        drag: 0.9,
      };
    });
  }

  trail(x, y, color, vx = 0, vy = 0) {
    this.pool.acquire(x, y, {
      vx: vx * 0.2 + rng.randomFloat(-20, 20),
      vy: vy * 0.2 + rng.randomFloat(-20, 20),
      life: 0.2,
      size: rng.randomFloat(2, 4),
      color,
      drag: 0.92,
    });
  }

  levelUp(x, y) {
    this.burst(x, y, 36, PALETTE.t, 200, 0.8, "gold");
    this.ring(x, y, PALETTE.p, 60, "gold");
    // Ascending pillar of sparks — the level-up read (§12)
    this.emit(x, y + 10, 26, () => ({
      vx: rng.randomFloat(-26, 26),
      vy: rng.randomFloat(-220, -110),
      life: rng.randomFloat(0.5, 1),
      size: rng.randomInt(1, 3),
      color: PALETTE.t,
      ramp: "gold",
      gravity: -40,
      drag: 0.98,
    }));
  }

  heal(x, y) {
    this.emit(x, y, 14, () => ({
      vx: rng.randomFloat(-30, 30),
      vy: rng.randomFloat(-80, -40),
      life: 0.6,
      size: rng.randomInt(1, 2),
      color: PALETTE.z,
      ramp: "heal",
      gravity: -20,
    }));
  }

  update(dt) {
    this.pool.update(
      dt,
      (p, d) => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity * d;
        p.x += p.vx * d;
        p.y += p.vy * d;
        p.life -= d;
      },
      (p) => p.life <= 0
    );
  }

  render(ctx) {
    for (const p of this.pool.active) {
      const t = Math.max(0, p.life / p.maxLife);
      // Colour ramps do the fading; alpha only handles the last sliver of life
      let color = p.color;
      if (p.ramp) {
        const i = Math.min(p.ramp.length - 1, Math.floor((1 - t) * p.ramp.length));
        color = p.ramp[i];
      }
      if (p.flicker && Math.floor(p.life * 30) % 2 === 0) continue;
      ctx.globalAlpha = p.fade ? Math.min(1, t * 4) : 1;
      ctx.fillStyle = color;
      // Shrink to a single pixel before dying, on integer coordinates
      const s = t < 0.35 ? Math.max(1, p.size - 1) : p.size;
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
  }

  get count() {
    return this.pool.active.length;
  }

  clear() {
    this.pool.releaseAll();
  }
}
