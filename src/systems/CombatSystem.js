import { angle, dist, normalize, circleOverlap } from "../utils/MathUtils.js";
import { Projectile } from "../entities/Projectile.js";
import { ELEMENTS } from "../data/items.js";
import { ParticleSystem } from "./ParticleSystem.js";
import { statusSystem } from "./StatusEffectSystem.js";
import { rng } from "../utils/Random.js";
import { audio } from "../core/AudioManager.js";

export class CombatSystem {
  constructor(game) {
    this.game = game;
  }

  playerAttack() {
    const player = this.game.player;
    const weapon = player.getWeapon();
    if (!weapon || !player.beginAttack()) return;

    const style = weapon.stats.attackStyle || "melee_slash";
    const aim = player.aimAngle;
    audio.play(style.startsWith("melee") ? "swing" : "shoot");

    if (style.startsWith("melee")) {
      this._meleeAttack(player, weapon, aim);
    } else {
      this._rangedAttack(player, weapon, aim);
    }
  }

  _calcHitDamage(player, weapon) {
    let base = (weapon.stats.baseDamage || 10) * player.getDamageMult();
    const el = weapon.stats.element || "none";
    const elemBonus = {
      fire: player.base.fireDamage + player.bonuses.fireDamage + player._equipStat("fireDamage"),
      ice: player.base.iceDamage + player.bonuses.iceDamage + player._equipStat("iceDamage"),
      lightning: player.base.lightningDamage + player.bonuses.lightningDamage + player._equipStat("lightningDamage"),
      poison: player.base.poisonDamage + player.bonuses.poisonDamage + player._equipStat("poisonDamage"),
      blood: 0,
      arcane: 0,
      none: 0,
    };
    base *= 1 + (elemBonus[el] || 0);

    const crit = rng.chance(player.getCritChance());
    if (crit) {
      const critMult =
        (weapon.stats.critMult || 1.75) +
        player.bonuses.critMult +
        player._equipStat("critMult") +
        player._equipStat("critDamage");
      base *= critMult;
    }
    return { damage: Math.max(1, Math.round(base)), crit, element: el };
  }

  _meleeAttack(player, weapon, aim) {
    const range = (weapon.stats.range || 50) * (player.base.rangeMult + player.bonuses.rangeMult);
    const arc = weapon.stats.arc || 1.2;
    const { damage, crit, element } = this._calcHitDamage(player, weapon);
    const kb = (weapon.stats.knockback || 100) * (player.base.knockbackMult + player.bonuses.knockbackMult);
    let hit = 0;

    for (const enemy of this.game.enemies) {
      if (enemy.dead) continue;
      const d = dist(player.x, player.y, enemy.x, enemy.y);
      if (d > range + enemy.radius) continue;
      const a = angle(player.x, player.y, enemy.x, enemy.y);
      let diff = Math.abs(a - aim);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
      if (diff > arc / 2) continue;

      let dmg = damage;
      if ((player.bonuses.execute || player.base.execute) && enemy.hp / enemy.maxHp < 0.3) {
        dmg *= 1 + (player.bonuses.execute || player.base.execute);
      }
      if (weapon.uniqueId === "elite_slayer" && (enemy.isElite || enemy.isBoss)) {
        dmg *= 1.4;
      }

      const n = normalize(enemy.x - player.x, enemy.y - player.y);
      this._damageEnemy(enemy, dmg, {
        crit,
        knockback: { x: n.x * kb, y: n.y * kb },
        element,
        weapon,
        player,
      });
      hit++;
    }

    if (hit > 0) {
      this.game.camera.shake(crit ? 8 : 4);
      this.game.time.freeze(crit ? 0.05 : 0.03);
    }

    // Slam AOE
    if (weapon.stats.attackStyle === "melee_slam") {
      this.game.particles.ring(player.x, player.y, "#ffcc80", range * 0.6, "smoke");
      this.game.fx?.shockwave(player.x, player.y, range * 0.9, "#ffcc80");
    }
  }

  _rangedAttack(player, weapon, aim) {
    const { damage, crit, element } = this._calcHitDamage(player, weapon);
    const count = (weapon.stats.projectileCount || 1) + player.bonuses.projectileCount + player.base.projectileCount + player._equipStat("projectileCount");
    const spread = weapon.stats.projectileSpread || (count > 1 ? 0.2 : 0);
    const speed = weapon.stats.projectileSpeed || 400;
    const size = (weapon.stats.projectileSize || 4) * (1 + player.bonuses.projectileSize + player.base.projectileSize + player._equipStat("projectileSize"));
    const elem = ELEMENTS[element] || ELEMENTS.none;
    const statusChance = (weapon.stats.statusChance || 0) + player.bonuses.statusChance + player.base.statusChance;
    const chain = (weapon.stats.chain || 0) + player.bonuses.chain + player.base.chain + (weapon.uniqueId === "extra_chain" ? 2 : 0);

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      const proj = Projectile.fromAngle(player.x, player.y, aim + offset, speed, {
        damage,
        crit,
        radius: size,
        color: elem.color,
        owner: "player",
        pierce: weapon.stats.pierce || 0,
        splash: weapon.stats.splash || 0,
        element,
        statusChance,
        statusId: elem.status,
        knockback: weapon.stats.knockback || 60,
        chain,
        life: (weapon.stats.range || 400) / speed,
        fromWeapon: weapon,
        uniqueId: weapon.uniqueId,
      });
      this.game.projectiles.push(proj);
    }
  }

  _damageEnemy(enemy, damage, opts = {}) {
    const player = opts.player || this.game.player;
    const dealt = enemy.takeDamage(damage, {
      knockback: opts.knockback,
      armorPen: player.bonuses.armorPen + player.base.armorPen,
      hitStop: opts.crit ? 0.06 : 0.03,
    });
    if (dealt <= 0) return;

    player.damageDealt += dealt;
    audio.play(opts.crit ? "crit" : "hit");
    const element = opts.element || "none";
    this.game.spawnDamageNumber(enemy.x, enemy.y - enemy.radius, dealt, opts.crit, element);

    // Impact VFX: spray away from the blow, mark the contact point, add blood
    const kb = opts.knockback;
    const hitAngle = kb ? Math.atan2(kb.y, kb.x) : angle(player.x, player.y, enemy.x, enemy.y);
    const hx = enemy.x - Math.cos(hitAngle) * enemy.radius * 0.6;
    const hy = enemy.y - Math.sin(hitAngle) * enemy.radius * 0.6;
    this.game.particles.hit(hx, hy, hitAngle, opts.crit ? 14 : 7, element, opts.crit);
    this.game.fx?.impact(hx, hy, ELEMENTS[element]?.color, opts.crit, opts.crit ? 9 : 6);
    if (element === "none" || element === "physical" || element === "blood") {
      this.game.particles.blood(hx, hy, hitAngle, opts.crit ? 8 : 4);
    }

    // Life steal
    const ls = player.getLifeSteal();
    if (ls > 0) player.heal(dealt * ls);

    // Status
    const weapon = opts.weapon;
    const elem = ELEMENTS[element];
    const chance = (weapon?.stats.statusChance || 0) + player.bonuses.statusChance;
    if (elem?.status && rng.chance(chance || 0.2)) {
      statusSystem.apply(enemy, elem.status, 1 + (player.bonuses[`${element}Damage`] || 0));
    }
    if (player.bonuses.bonusSlow) statusSystem.apply(enemy, "slow", 1, 1.5);

    // Bloodfang unique
    if (weapon?.uniqueId === "blood_explosion" && opts.crit && rng.chance(0.25)) {
      this._explode(enemy.x, enemy.y, damage * 0.6, 70, "#c62828", player);
    }

    if (enemy.dead) this.game.onEnemyKilled(enemy);
  }

  _explode(x, y, damage, radius, color, player) {
    audio.play("explode");
    this.game.particles.burst(x, y, 24, color, 200, 0.5, "fire");
    this.game.particles.motes(x, y, 8, "smoke");
    this.game.fx?.shockwave(x, y, radius, color);
    this.game.fx?.impact(x, y, color, true, 12);
    this.game.camera.shake(10);
    for (const e of this.game.enemies) {
      if (e.dead) continue;
      if (dist(x, y, e.x, e.y) <= radius + e.radius) {
        this._damageEnemy(e, damage, { player, crit: false, element: "none" });
      }
    }
  }

  updateProjectiles(dt) {
    const g = this.game;
    for (const p of g.projectiles) {
      if (p.dead) continue;
      p.update(dt);
      if (p.trail) g.particles.trail(p.x, p.y, p.color, p.vx, p.vy);

      if (p.owner === "player") {
        for (const enemy of g.enemies) {
          if (enemy.dead || p.hitIds.has(enemy.id)) continue;
          if (!circleOverlap(p.x, p.y, p.radius, enemy.x, enemy.y, enemy.radius)) continue;
          p.hitIds.add(enemy.id);

          const n = normalize(enemy.x - p.x, enemy.y - p.y);
          let dmg = p.damage;
          const player = g.player;
          if ((player.bonuses.execute || player.base.execute) && enemy.hp / enemy.maxHp < 0.3) {
            dmg *= 1 + (player.bonuses.execute || player.base.execute);
          }
          this._damageEnemy(enemy, dmg, {
            crit: p.crit,
            knockback: { x: n.x * p.knockback, y: n.y * p.knockback },
            element: p.element,
            weapon: p.fromWeapon,
            player,
          });

          if (p.statusId && rng.chance(p.statusChance || 0.3)) {
            statusSystem.apply(enemy, p.statusId);
          }

          if (p.splash > 0) {
            for (const o of g.enemies) {
              if (o.dead || o.id === enemy.id) continue;
              if (dist(p.x, p.y, o.x, o.y) <= p.splash + o.radius) {
                this._damageEnemy(o, p.damage * 0.5, { player, crit: false, element: p.element, weapon: p.fromWeapon });
              }
            }
            g.particles.burst(p.x, p.y, 10, p.color, 100, 0.3, ParticleSystem.rampFor(p.element));
            g.fx?.shockwave(p.x, p.y, p.splash, p.color);
          }

          // Chain lightning
          if (p.chain > 0) {
            let from = enemy;
            let chains = p.chain;
            const chained = new Set([enemy.id]);
            while (chains-- > 0) {
              let next = null;
              let best = 180;
              for (const o of g.enemies) {
                if (o.dead || chained.has(o.id)) continue;
                const d = dist(from.x, from.y, o.x, o.y);
                if (d < best) {
                  best = d;
                  next = o;
                }
              }
              if (!next) break;
              chained.add(next.id);
              this._damageEnemy(next, p.damage * 0.7, { player, crit: false, element: "lightning", weapon: p.fromWeapon });
              g.fx?.arc(from.x, from.y, next.x, next.y);
              g.particles.emit(from.x, from.y, 6, () => ({
                vx: (next.x - from.x) * 2,
                vy: (next.y - from.y) * 2,
                life: 0.15,
                size: 2,
                ramp: "lightning",
              }));
              from = next;
            }
          }

          if (p.uniqueId === "void_pull") {
            enemy.knockbackX += (p.x - enemy.x) * 2;
            enemy.knockbackY += (p.y - enemy.y) * 2;
          }

          if (p.pierce > 0) p.pierce--;
          else {
            p.dead = true;
            break;
          }
        }
      } else {
        // Enemy projectile vs player
        const player = g.player;
        if (!player.dead && circleOverlap(p.x, p.y, p.radius, player.x, player.y, player.radius)) {
          const dealt = player.takeDamage(p.damage);
          if (dealt > 0) {
            audio.play("hurt");
            g.spawnDamageNumber(player.x, player.y - 20, dealt, false, p.element);
            g.camera.shake(7);
            g.particles.hit(p.x, p.y, p.angle, 9, p.element, false);
            g.particles.blood(player.x, player.y, p.angle, 5);
            g.fx?.impact(p.x, p.y, p.color, false, 7);
            if (player.bonuses.thorns > 0) {
              // thorns not applied to projectile source easily — skip
            }
          } else if (dealt === -1) {
            g.spawnFloatingText(player.x, player.y - 20, "DODGE", "#81d4fa");
          }
          p.dead = true;
        }
      }
    }

    g.projectiles = g.projectiles.filter((p) => !p.dead);
  }
}
