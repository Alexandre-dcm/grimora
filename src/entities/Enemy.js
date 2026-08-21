import { dist, normalize, angle, moveToward } from "../utils/MathUtils.js";
import { ELITE_MODIFIERS } from "../data/enemies.js";
import { statusSystem } from "../systems/StatusEffectSystem.js";
import { rng } from "../utils/Random.js";

let _id = 1;

export class Enemy {
  constructor(def, x, y, floor = 1, eliteMod = null) {
    this.id = _id++;
    this.def = def;
    this.defId = def.id;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.radius = def.radius;
    this.color = def.color;
    this.ai = def.ai || "chase";
    this.flying = !!def.flying;
    this.phasing = !!def.phasing;
    this.element = def.element || "none";

    const scale = 1 + (floor - 1) * 0.18;
    this.maxHp = Math.round(def.hp * scale);
    this.hp = this.maxHp;
    this.damage = def.damage * (1 + (floor - 1) * 0.12);
    this.speed = def.speed * (1 + Math.min(0.4, (floor - 1) * 0.03));
    this.xp = Math.round(def.xp * (1 + (floor - 1) * 0.1));
    this.goldRange = def.gold;
    this.armor = def.armor || 0;
    this.knockbackResist = def.knockbackResist || 0;
    this.attackRange = def.attackRange || 24;
    this.preferRange = def.preferRange || this.attackRange;
    this.attackCooldown = def.attackCooldown || 1;
    this.attackTimer = rng.randomFloat(0, this.attackCooldown);
    this.projectileSpeed = def.projectileSpeed || 250;
    this.splash = def.splash || 0;
    this.statusOnHit = def.statusOnHit || null;
    this.statusChance = def.statusChance || 0;
    this.dashCooldown = def.dashCooldown || 0;
    this.dashTimer = 0;
    this.lootBonus = def.lootBonus || 1;

    this.elite = null;
    if (eliteMod) {
      this.elite = ELITE_MODIFIERS[eliteMod] || eliteMod;
      this.name = `${this.elite.name} ${this.name}`;
      this.maxHp = Math.round(this.maxHp * (this.elite.hpMult || 1.5));
      this.hp = this.maxHp;
      this.damage *= this.elite.damageMult || 1.25;
      this.speed *= this.elite.speedMult || 1;
      this.radius *= this.elite.sizeMult || 1.15;
      this.armor += this.elite.armorBonus || 0;
      this.xp = Math.round(this.xp * 2.5);
      this.lootBonus *= 2;
      this.color = this.elite.color || this.color;
      if (this.elite.statusOnHit) {
        this.statusOnHit = this.elite.statusOnHit;
        this.statusChance = this.elite.statusChance || 0.4;
      }
    }

    this.vx = 0;
    this.vy = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.dead = false;
    this.hurtFlash = 0;
    this.freezeFrame = 0;
    this.statuses = [];
    this.telegraph = 0;
    this.summonTimer = 0;
    this.teleportTimer = this.elite?.teleport ? 3 : 0;
    this.hitFlash = 0;
  }

  get isElite() {
    return !!this.elite;
  }

  takeDamage(amount, opts = {}) {
    if (this.dead) return 0;
    let dmg = amount;
    const armor = Math.max(0, this.armor - (opts.armorPen || 0));
    dmg *= 100 / (100 + armor * 3);
    dmg *= statusSystem.getDamageAmp(this);
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg;
    this.hurtFlash = 0.12;
    this.freezeFrame = opts.hitStop || 0.04;

    if (opts.knockback && !this.phasing) {
      const resist = 1 - this.knockbackResist;
      this.knockbackX += opts.knockback.x * resist;
      this.knockbackY += opts.knockback.y * resist;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    return dmg;
  }

  update(dt, player, world) {
    if (this.dead) return null;
    if (this.freezeFrame > 0) {
      this.freezeFrame -= dt;
      return null;
    }
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    statusSystem.update(this, dt, (ent, dmg) => {
      ent.hp -= dmg;
      if (ent.hp <= 0) {
        ent.hp = 0;
        ent.dead = true;
      }
    });
    if (this.dead) return null;

    const slow = statusSystem.getSlowFactor(this);
    if (slow <= 0) return null;

    // Knockback decay
    this.x += this.knockbackX * dt;
    this.y += this.knockbackY * dt;
    this.knockbackX *= Math.pow(0.05, dt);
    this.knockbackY *= Math.pow(0.05, dt);

    this.attackTimer -= dt;
    const action = this._ai(dt, player, slow);

    // Elite auras / specials
    if (this.elite?.auraDamage && dist(this.x, this.y, player.x, player.y) < 60) {
      action.auraDamage = this.elite.auraDamage * dt;
    }
    if (this.elite?.teleport) {
      this.teleportTimer -= dt;
      if (this.teleportTimer <= 0) {
        this.teleportTimer = 3.5;
        const a = rng.randomFloat(0, Math.PI * 2);
        this.x = player.x + Math.cos(a) * 120;
        this.y = player.y + Math.sin(a) * 120;
        world?.clampEntity?.(this);
      }
    }
    if (this.elite?.summons) {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = 6;
        action.summon = true;
      }
    }

    return action;
  }

  _ai(dt, player, slow) {
    const action = { attack: null, projectile: null, summon: false };
    const d = dist(this.x, this.y, player.x, player.y);
    const speed = this.speed * slow;

    switch (this.ai) {
      case "swarm":
      case "chase": {
        if (d > this.attackRange) {
          const m = moveToward(this.x, this.y, player.x, player.y, speed, dt);
          this.x = m.x;
          this.y = m.y;
        } else if (this.attackTimer <= 0) {
          action.attack = { damage: this.damage };
          this.attackTimer = this.attackCooldown;
        }
        break;
      }
      case "tank": {
        if (d > this.attackRange) {
          const m = moveToward(this.x, this.y, player.x, player.y, speed * 0.9, dt);
          this.x = m.x;
          this.y = m.y;
        } else if (this.attackTimer <= 0) {
          action.attack = { damage: this.damage * 1.1 };
          this.attackTimer = this.attackCooldown;
        }
        break;
      }
      case "strafe": {
        const ang = angle(player.x, player.y, this.x, this.y);
        if (d < 80) {
          this.x += Math.cos(ang) * speed * dt;
          this.y += Math.sin(ang) * speed * dt;
        } else if (d > 140) {
          const m = moveToward(this.x, this.y, player.x, player.y, speed, dt);
          this.x = m.x;
          this.y = m.y;
        } else {
          this.x += Math.cos(ang + Math.PI / 2) * speed * dt;
          this.y += Math.sin(ang + Math.PI / 2) * speed * dt;
        }
        if (d < this.attackRange && this.attackTimer <= 0) {
          action.attack = { damage: this.damage };
          this.attackTimer = this.attackCooldown;
        }
        break;
      }
      case "flying": {
        const wobble = Math.sin(Date.now() / 200 + this.id) * 30;
        const tx = player.x + wobble;
        const ty = player.y + Math.cos(Date.now() / 250 + this.id) * 20;
        if (d > this.attackRange) {
          const m = moveToward(this.x, this.y, tx, ty, speed, dt);
          this.x = m.x;
          this.y = m.y;
        } else if (this.attackTimer <= 0) {
          action.attack = { damage: this.damage };
          this.attackTimer = this.attackCooldown;
        }
        break;
      }
      case "ranged":
      case "mage": {
        if (d < this.preferRange * 0.6) {
          const ang = angle(player.x, player.y, this.x, this.y);
          this.x += Math.cos(ang) * speed * dt;
          this.y += Math.sin(ang) * speed * dt;
        } else if (d > this.preferRange * 1.2) {
          const m = moveToward(this.x, this.y, player.x, player.y, speed * 0.85, dt);
          this.x = m.x;
          this.y = m.y;
        } else {
          const ang = angle(player.x, player.y, this.x, this.y) + Math.PI / 2;
          this.x += Math.cos(ang) * speed * 0.6 * dt;
          this.y += Math.sin(ang) * speed * 0.6 * dt;
        }
        if (d < this.attackRange && this.attackTimer <= 0) {
          const a = angle(this.x, this.y, player.x, player.y);
          action.projectile = {
            damage: this.damage,
            speed: this.projectileSpeed,
            angle: a,
            splash: this.splash,
            element: this.element,
            color: this.color,
            radius: this.ai === "mage" ? 7 : 4,
          };
          this.attackTimer = this.attackCooldown;
          this.telegraph = 0.15;
        }
        break;
      }
      case "assassin": {
        this.dashTimer -= dt;
        if (d > 160 && this.dashTimer <= 0) {
          const n = normalize(player.x - this.x, player.y - this.y);
          this.x += n.x * 100;
          this.y += n.y * 100;
          this.dashTimer = this.dashCooldown || 2.5;
        } else if (d > this.attackRange) {
          const m = moveToward(this.x, this.y, player.x, player.y, speed, dt);
          this.x = m.x;
          this.y = m.y;
        } else if (this.attackTimer <= 0) {
          action.attack = { damage: this.damage * 1.3 };
          this.attackTimer = this.attackCooldown;
        }
        break;
      }
      default: {
        const m = moveToward(this.x, this.y, player.x, player.y, speed, dt);
        this.x = m.x;
        this.y = m.y;
      }
    }
    return action;
  }

  // Presentation lives in src/art/render/EntityRenderer.js.
}

export class Boss extends Enemy {
  constructor(def, x, y, floor = 1) {
    super(
      {
        ...def,
        ai: "boss",
        attackRange: 40,
        attackCooldown: 1.2,
      },
      x,
      y,
      floor,
      null
    );
    this.isBoss = true;
    this.name = def.name;
    this.phase = 1;
    this.maxPhases = def.phases || 3;
    this.attackIndex = 0;
    this.patternTimer = 1.5;
    this.telegraph = 0;
    this.telegraphType = null;
    this.enraged = false;
    this.radius = def.radius;
    this.maxHp = Math.round(def.hp * (1 + (floor - 1) * 0.15));
    this.hp = this.maxHp;
    this.damage = def.damage * (1 + (floor - 1) * 0.1);
    this.speed = def.speed;
    this.xp = def.xp;
    this.attacks = def.attacks || ["slash", "charge"];
    this.color = def.color;
  }

  update(dt, player, world) {
    if (this.dead) return null;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    statusSystem.update(this, dt, (ent, dmg) => {
      ent.hp -= dmg;
      if (ent.hp <= 0) {
        ent.hp = 0;
        ent.dead = true;
      }
    });
    if (this.dead) return null;

    const hpRatio = this.hp / this.maxHp;
    const newPhase = hpRatio > 0.66 ? 1 : hpRatio > 0.33 ? 2 : 3;
    if (newPhase > this.phase) {
      this.phase = newPhase;
      this.enraged = this.phase >= 3;
      this.speed *= 1.15;
    }

    this.x += this.knockbackX * dt;
    this.y += this.knockbackY * dt;
    this.knockbackX *= 0.9;
    this.knockbackY *= 0.9;

    const action = { attack: null, projectile: null, summon: false, aoe: null, isBoss: true };

    if (this.telegraph > 0) {
      this.telegraph -= dt;
      if (this.telegraph <= 0) {
        action.aoe = this._resolveTelegraph(player);
        this.telegraphType = null;
      }
      return action;
    }

    this.patternTimer -= dt;
    const d = dist(this.x, this.y, player.x, player.y);
    const spd = this.speed * (this.enraged ? 1.3 : 1) * statusSystem.getSlowFactor(this);

    if (d > 50) {
      const m = moveToward(this.x, this.y, player.x, player.y, spd, dt);
      this.x = m.x;
      this.y = m.y;
    }

    if (this.patternTimer <= 0) {
      const atk = this.attacks[this.attackIndex % this.attacks.length];
      this.attackIndex++;
      this.patternTimer = this.enraged ? 0.9 : 1.4 - this.phase * 0.15;

      if (atk === "slash" || atk === "ram") {
        if (d < 70) action.attack = { damage: this.damage * 1.2 };
        else {
          this.telegraph = 0.4;
          this.telegraphType = { type: "charge", tx: player.x, ty: player.y };
        }
      } else if (atk === "sword_wave" || atk === "fireball" || atk === "ice_shard" || atk === "void_bolt") {
        const a = angle(this.x, this.y, player.x, player.y);
        const count = this.phase >= 2 ? 3 : 1;
        action.projectiles = [];
        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * 0.25;
          action.projectiles.push({
            damage: this.damage * 0.85,
            speed: 320,
            angle: a + spread,
            color: this.color,
            radius: 8,
            splash: 20,
          });
        }
      } else if (atk === "summon" || atk === "summon_wolves" || atk === "summon_imps") {
        action.summon = true;
        action.summonCount = 2 + this.phase;
      } else if (atk === "slam" || atk === "nova" || atk === "freeze_nova" || atk === "meteor" || atk === "blizzard" || atk === "reality_tear" || atk === "poison_cloud") {
        this.telegraph = 0.7;
        this.telegraphType = { type: "nova", radius: 100 + this.phase * 20 };
      } else if (atk === "charge" || atk === "dash" || atk === "teleport_strike") {
        this.telegraph = 0.35;
        this.telegraphType = { type: "charge", tx: player.x, ty: player.y };
      } else if (atk === "root_spike") {
        this.telegraph = 0.5;
        this.telegraphType = { type: "spikes", tx: player.x, ty: player.y };
      }
    }

    return action;
  }

  _resolveTelegraph(player) {
    if (!this.telegraphType) return null;
    const t = this.telegraphType;
    if (t.type === "charge") {
      this.x = t.tx;
      this.y = t.ty;
      return { damage: this.damage * 1.4, radius: 50, x: t.tx, y: t.ty };
    }
    if (t.type === "nova") {
      return { damage: this.damage * 1.5, radius: t.radius, x: this.x, y: this.y };
    }
    if (t.type === "spikes") {
      return { damage: this.damage, radius: 45, x: t.tx, y: t.ty };
    }
    return null;
  }

  // Presentation (phase remaps, telegraphs, aura) lives in EntityRenderer.
}
