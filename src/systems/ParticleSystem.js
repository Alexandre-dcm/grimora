import { ObjectPool } from "../utils/ObjectPool.js";
import { rng } from "../utils/Random.js";

export class ParticleSystem {
  constructor() {
    this.pool = new ObjectPool(
      () => ({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
        size: 2, color: "#fff", gravity: 0, drag: 1, fade: true, shape: "circle",
      }),
      (p, x, y, opts = {}) => {
        p.x = x;
        p.y = y;
        p.vx = opts.vx ?? 0;
        p.vy = opts.vy ?? 0;
        p.life = opts.life ?? 0.5;
        p.maxLife = p.life;
        p.size = opts.size ?? 3;
        p.color = opts.color ?? "#fff";
        p.gravity = opts.gravity ?? 0;
        p.drag = opts.drag ?? 0.98;
        p.fade = opts.fade !== false;
        p.shape = opts.shape ?? "circle";
      },
      256
    );
  }

  emit(x, y, count, optsFactory) {
    for (let i = 0; i < count; i++) {
      const opts = typeof optsFactory === "function" ? optsFactory(i) : { ...optsFactory };
      this.pool.acquire(x, y, opts);
    }
  }

  burst(x, y, count, color, speed = 120, life = 0.45) {
    this.emit(x, y, count, () => {
      const a = rng.randomFloat(0, Math.PI * 2);
      const s = rng.randomFloat(speed * 0.3, speed);
      return {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rng.randomFloat(life * 0.5, life),
        size: rng.randomFloat(2, 5),
        color,
        gravity: 40,
        drag: 0.96,
      };
    });
  }

  ring(x, y, color, radius = 40) {
    const n = 16;
    this.emit(x, y, n, (i) => {
      const a = (i / n) * Math.PI * 2;
      return {
        vx: Math.cos(a) * radius * 2,
        vy: Math.sin(a) * radius * 2,
        life: 0.35,
        size: 3,
        color,
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
    this.burst(x, y, 40, "#ffd54f", 200, 0.8);
    this.ring(x, y, "#fff59d", 60);
  }

  heal(x, y) {
    this.emit(x, y, 12, () => ({
      vx: rng.randomFloat(-30, 30),
      vy: rng.randomFloat(-80, -40),
      life: 0.6,
      size: 3,
      color: "#69f0ae",
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
      const alpha = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === "square") {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
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
