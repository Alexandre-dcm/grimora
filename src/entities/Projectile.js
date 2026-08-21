import { dist } from "../utils/MathUtils.js";
import { RARITY_COLORS } from "../art/Palette.js";

let _pid = 1;

export class Projectile {
  constructor(opts = {}) {
    this.id = _pid++;
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.speed = opts.speed || 400;
    this.angle = opts.angle || 0;
    this.damage = opts.damage || 10;
    this.radius = opts.radius || 4;
    this.color = opts.color || "#fff";
    this.life = opts.life || 1.5;
    this.maxLife = this.life;
    this.owner = opts.owner || "player"; // player | enemy
    this.pierce = opts.pierce || 0;
    this.hitIds = new Set();
    this.splash = opts.splash || 0;
    this.element = opts.element || "none";
    this.statusChance = opts.statusChance || 0;
    this.statusId = opts.statusId || null;
    this.crit = !!opts.crit;
    this.knockback = opts.knockback || 80;
    this.chain = opts.chain || 0;
    this.dead = false;
    this.trail = opts.trail !== false;
    this.fromWeapon = opts.fromWeapon || null;
    this.uniqueId = opts.uniqueId || null;
  }

  static fromAngle(x, y, ang, speed, opts = {}) {
    return new Projectile({
      ...opts,
      x,
      y,
      angle: ang,
      speed,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
    });
  }

  update(dt) {
    if (this.dead) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  // Drawn as a directional pixel bolt by EntityRenderer.renderProjectiles.
}

export class Pickup {
  constructor(x, y, kind, data = {}) {
    this.x = x;
    this.y = y;
    this.kind = kind; // xp | gold | item | heart
    this.data = data;
    this.radius = kind === "item" ? 12 : 7;
    this.vy = -40;
    this.life = 20;
    this.magnet = false;
    this.dead = false;
    this.bob = Math.random() * Math.PI * 2;
    this.color = data.item?.rarityColor || RARITY_COLORS.common;
  }

  update(dt, player, pickupRange) {
    if (this.dead) return;
    this.life -= dt;
    this.bob += dt * 4;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    // Settle pop
    if (this.vy < 0) {
      this.y += this.vy * dt;
      this.vy += 180 * dt;
    }

    const d = dist(this.x, this.y, player.x, player.y);
    const range = this.kind === "xp" ? pickupRange * 1.5 : pickupRange;
    if (d < range) this.magnet = true;

    if (this.magnet) {
      const speed = this.kind === "xp" ? 380 : 280;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      this.x += (dx / len) * speed * dt;
      this.y += (dy / len) * speed * dt;
      if (d < player.radius + this.radius) {
        this.dead = true;
        return true; // collected
      }
    }
    return false;
  }

  // Drawn with its item icon and rarity beacon by EntityRenderer.
}

export class Chest {
  constructor(x, y, type = "normal") {
    this.x = x;
    this.y = y;
    this.type = type; // normal | rare | legendary | mimic
    this.radius = 18;
    this.opened = false;
    this.isMimic = type === "mimic";
    this.bob = Math.random() * 10;
    this.colors = {
      normal: RARITY_COLORS.common,
      rare: RARITY_COLORS.rare,
      legendary: RARITY_COLORS.legendary,
      mimic: RARITY_COLORS.common,
    };
  }

  // Drawn from CHEST_SPRITES by EntityRenderer, with a rarity beacon.
}

export class WorldInteractable {
  constructor(x, y, kind, data = {}) {
    this.x = x;
    this.y = y;
    this.kind = kind; // shrine | shop | portal | event | heal_fountain
    this.data = data;
    this.radius = 22;
    this.used = false;
  }

  // Drawn from INTERACT_SPRITES by EntityRenderer, with its own light source.
}
