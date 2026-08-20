import { dist } from "../utils/MathUtils.js";

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

  render(ctx) {
    if (this.dead) return;
    const alpha = Math.min(1, this.life / Math.min(0.3, this.maxLife));
    ctx.globalAlpha = alpha;

    // Trail glow
    if (this.trail) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha * 0.35;
      ctx.beginPath();
      ctx.arc(this.x - this.vx * 0.02, this.y - this.vy * 0.02, this.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }

    ctx.fillStyle = this.crit ? "#ffeb3b" : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    if (this.crit) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
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
    this.color =
      kind === "xp" ? "#69f0ae" :
      kind === "gold" ? "#ffd54f" :
      kind === "heart" ? "#ef5350" :
      data.item?.rarityColor || "#fff";
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

  render(ctx) {
    if (this.dead) return;
    const bobY = Math.sin(this.bob) * 3;
    if (this.kind === "item") {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(this.x, this.y + bobY, this.radius + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.data.item?.icon || "?", this.x, this.y + bobY);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y + bobY, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(this.x - 2, this.y + bobY - 2, this.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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
      normal: "#a1887f",
      rare: "#42a5f5",
      legendary: "#ff9800",
      mimic: "#a1887f",
    };
  }

  render(ctx) {
    const bobY = Math.sin(Date.now() / 400 + this.bob) * 2;
    const c = this.colors[this.type] || this.colors.normal;
    if (!this.opened) {
      ctx.fillStyle = c;
      ctx.fillRect(this.x - 14, this.y - 10 + bobY, 28, 20);
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(this.x - 14, this.y - 10 + bobY, 28, 6);
      ctx.fillStyle = this.type === "legendary" ? "#ffd54f" : "#ffd54f";
      ctx.beginPath();
      ctx.arc(this.x, this.y + bobY, 3, 0, Math.PI * 2);
      ctx.fill();
      if (this.type === "legendary" || this.type === "rare") {
        ctx.strokeStyle = c;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, 22 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(this.x - 14, this.y - 4, 28, 14);
      ctx.fillStyle = c;
      ctx.fillRect(this.x - 14, this.y - 16, 28, 10);
    }
  }
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

  render(ctx) {
    const pulse = 0.7 + Math.sin(Date.now() / 300) * 0.3;
    const colors = {
      shrine: this.data.color || "#ab47bc",
      shop: "#42a5f5",
      portal: "#ffd54f",
      event: "#26c6da",
      heal_fountain: "#66bb6a",
    };
    const c = colors[this.kind] || "#fff";

    if (this.kind === "portal") {
      ctx.strokeStyle = c;
      ctx.fillStyle = `rgba(255, 213, 79, ${0.15 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 12px Cinzel, serif";
      ctx.fillStyle = c;
      ctx.textAlign = "center";
      ctx.fillText("DESCEND", this.x, this.y + 4);
      return;
    }

    ctx.fillStyle = this.used ? "#444" : c;
    ctx.globalAlpha = this.used ? 0.4 : pulse;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 20);
    ctx.lineTo(this.x + 16, this.y + 12);
    ctx.lineTo(this.x - 16, this.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    const label = this.kind === "shrine" ? (this.data.name || "Shrine") :
      this.kind === "shop" ? "Shop" :
      this.kind === "heal_fountain" ? "Fountain" :
      this.data.name || "Event";
    ctx.fillText(label, this.x, this.y + 28);
  }
}
