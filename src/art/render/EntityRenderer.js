/**
 * ENTITY RENDERER (ART_BIBLE §7, §8, §11).
 *
 * Owns every moving visual: hero, enemies, bosses, projectiles, loot, chests
 * and world objects. Gameplay classes no longer draw themselves — they only
 * hold state, and this module reads it. That keeps the art layer replaceable
 * and guarantees the whole cast obeys one visual language.
 *
 * Everything is submitted to a shared depth list so a player can stand behind
 * a statue and in front of a tombstone, and the visual hierarchy of §11 is
 * enforced by draw order: environment, loot, enemies, player, attacks.
 */

import { PALETTE, ELEMENT_COLORS, RARITY_COLORS, RARITY_GLOW, withAlpha } from "../Palette.js";
import { assets } from "../AssetRegistry.js";
import { PLAYER_H, PLAYER_RIG } from "../sprites/player.js";
import { drawSprite, drawShadow, drawOutlineGlow, pxBar, pxRect, pxRing, pxPool } from "./Draw.js";
import { animate, dirFromAngle, deathAlpha } from "./Anim.js";
import { drawSlash, drawTelegraph, drawWindup, boltSprite, impactSprite } from "./Vfx.js";

/** Status id -> tint applied to the whole sprite. */
const STATUS_TINT = {
  burn: PALETTE.o,
  poison: PALETTE.z,
  bleed: PALETTE.k,
  freeze: PALETTE.C,
  shock: PALETTE.p,
  slow: PALETTE.B,
  stun: PALETTE.p,
  vulnerability: PALETTE.U,
};

const CLASS_LIGHT = {
  warrior: PALETTE.p,
  rogue: PALETTE.x,
  mage: PALETTE.H,
};

export class EntityRenderer {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.hits = [];          // impact starbursts
    this.waves = [];         // expanding shockwave rings
    this.arcs = [];          // chain-lightning bolts
    for (let i = 0; i < 48; i++) this.hits.push({ active: false });
    for (let i = 0; i < 16; i++) this.waves.push({ active: false });
    for (let i = 0; i < 24; i++) this.arcs.push({ active: false });
  }

  /* ---------------------------------------------------------------- *
   * TRANSIENT FX — spawned by combat hooks, drawn above everything
   * ---------------------------------------------------------------- */

  impact(x, y, color, crit = false, size = 7) {
    const h = this.hits.find((e) => !e.active) || this.hits[0];
    h.active = true;
    h.x = x;
    h.y = y;
    h.t = 0;
    h.life = crit ? 0.3 : 0.18;
    h.color = color || PALETTE.Q;
    h.crit = crit;
    h.size = crit ? size + 5 : size;
  }

  /** Expanding stepped ring — explosions, slams, splash damage. */
  shockwave(x, y, radius, color) {
    const w = this.waves.find((e) => !e.active) || this.waves[0];
    w.active = true;
    w.x = x;
    w.y = y;
    w.r = Math.max(12, radius);
    w.t = 0;
    w.life = 0.32;
    w.color = color || PALETTE.p;
  }

  /** Jagged pixel bolt between two points — chain lightning. */
  arc(x1, y1, x2, y2, color = PALETTE.p) {
    const a = this.arcs.find((e) => !e.active) || this.arcs[0];
    a.active = true;
    a.x1 = x1;
    a.y1 = y1;
    a.x2 = x2;
    a.y2 = y2;
    a.t = 0;
    a.life = 0.14;
    a.color = color;
    a.seed = Math.random() * 1000;
  }

  update(dt) {
    this.time += dt;
    for (const h of this.hits) {
      if (!h.active) continue;
      h.t += dt;
      if (h.t >= h.life) h.active = false;
    }
    for (const w of this.waves) {
      if (!w.active) continue;
      w.t += dt;
      if (w.t >= w.life) w.active = false;
    }
    for (const a of this.arcs) {
      if (!a.active) continue;
      a.t += dt;
      if (a.t >= a.life) a.active = false;
    }
  }

  /* ---------------------------------------------------------------- *
   * COLLECTION — everything that participates in depth sorting
   * ---------------------------------------------------------------- */

  collect(view, dt, out) {
    const g = this.game;
    for (const c of g.chests) this._chest(c, view, out);
    for (const it of g.interactables) this._interactable(it, view, out);
    for (const pk of g.pickups) this._pickup(pk, view, out);
    for (const e of g.enemies) this._enemy(e, view, dt, out);
    if (g.player) this._player(g.player, dt, out);
    return out;
  }

  /* ---------------------------------------------------------------- *
   * PLAYER
   * ---------------------------------------------------------------- */

  _player(p, dt, out) {
    const anim = animate(p, "player", dt);
    const dir = dirFromAngle(p.aimAngle);
    const clip = assets.playerClip(p.classId, dir, anim.state);
    const sprite = clip[Math.min(clip.length - 1, anim.frame)];
    const foot = p.y + 13;

    // Flicker on i-frames; never fully invisible, the player must stay findable
    const blink = p.iFrames > 0 && Math.floor(p.iFrames * 22) % 2 === 0;
    const alpha = p.dead ? deathAlpha(anim.deathT) : blink ? 0.5 : 1;
    const status = this._statusTint(p);
    const weapon = p.getWeapon();
    const behind = dir === "up";

    out.push({
      sort: p.y + 2000,   // §11: the player always resolves above equal-depth actors
      draw: (ctx) => {
        drawShadow(ctx, assets, p.x, p.y + 12, 22, 0.55 * alpha);

        // A faint own-light rim keeps the hero readable on busy floors
        drawOutlineGlow(ctx, assets, sprite, p.x, foot, PALETTE["0"], 0.5);

        if (behind && weapon) this._weapon(ctx, p, weapon, dir, anim, foot, alpha);
        drawSprite(ctx, sprite, p.x, foot, {
          alpha,
          // Ramp the white out fast: a full-strength flash held for the whole
          // window erases the hero's read (§13).
          flash: Math.min(0.7, Math.max(0, p.hurtFlash) * 4.5),
          tint: status?.color,
          tintStrength: status?.strength,
        });
        if (!behind && weapon) this._weapon(ctx, p, weapon, dir, anim, foot, alpha);

        if (p.shield > 0) {
          const t = 0.35 + Math.sin(this.time * 6) * 0.12;
          pxRing(ctx, p.x, p.y, 20, 2, PALETTE.T, t);
        }
        if (p.dashTimer > 0) {
          // Dash after-image: the previous silhouette, fading behind the hero
          const back = assets.glow(sprite, PALETTE.T);
          ctx.globalAlpha = 0.35;
          ctx.drawImage(
            back.canvas,
            Math.round(p.x - p.dashDir.x * 12) - back.ax,
            Math.round(foot - p.dashDir.y * 12) - back.ay
          );
          ctx.globalAlpha = 1;
        }
        this._swing(ctx, p, weapon, anim);
      },
    });
  }

  /** Held weapon, anchored to the rig's hand and pushed out during a swing. */
  _weapon(ctx, p, weapon, dir, anim, foot, alpha) {
    const flip = dir === "left" || dir === "up";
    const spr = flip ? assets.itemFlipped(weapon.defId, weapon.slot) : assets.item(weapon.defId, weapon.slot);
    if (!spr) return;
    const hand = PLAYER_RIG.hand[dir] || PLAYER_RIG.hand.down;
    // Sprite grips are authored bottom-left; anchor that corner at the hand
    const gripX = flip ? spr.w - 4 : 4;
    const gripY = spr.h - 4;
    let hx = p.x - Math.floor(24 / 2) + hand.x;
    let hy = foot - (PLAYER_H - 1) + hand.y;

    // Attack thrust: 3 frames of push along the aim, no rotation. Kept short so
    // the weapon stays visually attached to the hand.
    if (anim.state === "attack") {
      const push = [1, 4, 2][Math.min(2, anim.frame)];
      hx += Math.cos(p.aimAngle) * push;
      hy += Math.sin(p.aimAngle) * push;
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(spr.canvas, Math.round(hx - gripX), Math.round(hy - gripY));
    ctx.globalAlpha = 1;
  }

  /** Melee arc / cast flare for the current attack. */
  _swing(ctx, p, weapon, anim) {
    if (!weapon || p.attackAnim <= 0) return;
    const style = weapon.stats.attackStyle || "melee_slash";
    const dur = Math.max(0.08, Math.min(0.2, p.attackTimer * 0.6));
    const t = 1 - Math.max(0, Math.min(1, p.attackAnim / dur));
    const element = weapon.stats.element || "none";
    const color = ELEMENT_COLORS[element] || PALETTE.p;
    if (style.startsWith("melee")) {
      const range = (weapon.stats.range || 50) * (p.base.rangeMult + p.bonuses.rangeMult);
      drawSlash(ctx, p.x, p.y, p.aimAngle, Math.round(range * 0.8), color, t);
    } else {
      // Ranged/magic: a muzzle flare at the weapon hand
      const mx = p.x + Math.cos(p.aimAngle) * 16;
      const my = p.y + Math.sin(p.aimAngle) * 16;
      const cv = impactSprite(5, color, false);
      ctx.globalAlpha = 1 - t;
      ctx.drawImage(cv, Math.round(mx - cv.width / 2), Math.round(my - cv.height / 2));
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------------------------------------------------------- *
   * ENEMIES & BOSSES
   * ---------------------------------------------------------------- */

  _enemy(e, view, dt, out) {
    if (e.dead && !e._art) return;
    const r = e.radius;
    if (e.x + r < view.x || e.x - r > view.x + view.w) return;
    if (e.y + r < view.y || e.y - r > view.y + view.h) return;

    const anim = animate(e, "enemy", dt);
    const boss = !!e.isBoss;
    const clip = boss
      ? assets.bossClip(e.defId, e.phase || 1, anim.state, anim.flip)
      : assets.enemyClip(e.defId, anim.state, anim.flip);
    const sprite = clip[Math.min(clip.length - 1, anim.frame)];
    const alpha = e.dead ? deathAlpha(anim.deathT) : e.phasing ? 0.72 : 1;
    if (alpha <= 0) return;

    // Flyers hover: sprite lifts, shadow stays on the ground and shrinks
    const hover = e.flying ? 10 + Math.sin(this.time * 3 + e.id) * 3 : 0;
    const foot = e.y + Math.round(r * 0.8) - hover;
    const status = this._statusTint(e);
    const eliteColor = e.elite?.color || PALETTE.o;

    out.push({
      sort: e.y + (boss ? 500 : e.isElite ? 100 : 0),
      draw: (ctx) => {
        if (boss && e.telegraph > 0 && e.telegraphType) this._telegraph(ctx, e);

        drawShadow(ctx, assets, e.x, e.y + Math.round(r * 0.7), r * (e.flying ? 1.1 : 1.6), (e.flying ? 0.3 : 0.5) * alpha);

        if (boss) {
          const pulse = 0.5 + Math.sin(this.time * 4) * 0.2;
          drawOutlineGlow(ctx, assets, sprite, e.x, foot, assets.bossAccent(e.defId), pulse * alpha);
        } else if (e.isElite) {
          const pulse = 0.55 + Math.sin(this.time * 5 + e.id) * 0.25;
          drawOutlineGlow(ctx, assets, sprite, e.x, foot, eliteColor, pulse * alpha);
        } else {
          // Every enemy still gets a dark rim so it separates from the floor
          drawOutlineGlow(ctx, assets, sprite, e.x, foot, PALETTE["0"], 0.45 * alpha);
        }

        drawSprite(ctx, sprite, e.x, foot, {
          alpha,
          flash: Math.min(0.8, Math.max(0, e.hurtFlash) * 6),
          tint: status?.color,
          tintStrength: status?.strength,
        });

        if (!e.dead) this._enemyBar(ctx, e, sprite, foot, boss);
      },
    });
  }

  _enemyBar(ctx, e, sprite, foot, boss) {
    if (boss) return;                       // bosses use the dedicated HUD bar
    if (e.hp >= e.maxHp && !e.isElite) return;
    const w = Math.max(16, Math.round(sprite.w * 0.8));
    const y = foot - sprite.h - 6;
    const t = e.hp / e.maxHp;
    pxBar(ctx, e.x - w / 2, y, w, 3, t, e.isElite ? PALETTE.o : PALETTE.k, {
      back: PALETTE["1"],
      shine: PALETTE.p,
    });
    if (e.isElite) {
      // Elite pips: one notch per side, marking the threat tier
      pxRect(ctx, e.x - w / 2 - 3, y, 2, 3, e.elite.color || PALETTE.o);
      pxRect(ctx, e.x + w / 2 + 1, y, 2, 3, e.elite.color || PALETTE.o);
    }
  }

  _telegraph(ctx, e) {
    const t = e.telegraphType;
    const prog = 1 - e.telegraph / 0.7;
    if (t.type === "nova") {
      drawTelegraph(ctx, e.x, e.y, t.radius, this.time, PALETTE.l);
      drawWindup(ctx, e.x, e.y, t.radius * 0.5, prog, PALETTE.p);
    } else if (t.tx != null) {
      drawTelegraph(ctx, t.tx, t.ty, 45, this.time, PALETTE.o);
    }
  }

  _statusTint(ent) {
    if (!ent.statuses?.length) return null;
    const s = ent.statuses[ent.statuses.length - 1];
    const color = STATUS_TINT[s.id];
    if (!color) return null;
    // Pulse the tint so a status reads as active rather than as a recolor
    const strength = s.id === "freeze" ? 0.5 : 0.22 + Math.sin(this.time * 8) * 0.12;
    return { color, strength };
  }

  /* ---------------------------------------------------------------- *
   * LOOT, CHESTS, WORLD OBJECTS
   * ---------------------------------------------------------------- */

  _pickup(pk, view, out) {
    if (pk.dead) return;
    if (pk.x < view.x - 32 || pk.x > view.x + view.w + 32) return;
    if (pk.y < view.y - 32 || pk.y > view.y + view.h + 32) return;
    const bob = Math.round(Math.sin(pk.bob) * 2);
    // Blink out in the last second of life so expiring loot is legible
    const fade = pk.life < 1.5 ? 0.35 + Math.abs(Math.sin(pk.life * 8)) * 0.65 : 1;

    if (pk.kind === "item") {
      const item = pk.data.item;
      const spr = assets.item(item.defId, item.slot);
      const rarity = RARITY_COLORS[item.rarity] || PALETTE["8"];
      const glow = RARITY_GLOW[item.rarity] ?? 0;
      out.push({
        sort: pk.y - 0.2,
        draw: (ctx) => {
          drawShadow(ctx, assets, pk.x, pk.y + 8, 16, 0.4 * fade);
          if (glow > 0) {
            // Rarity beacon: a pool of light on the floor plus a rising sparkle
            const pulse = 0.22 + Math.sin(this.time * 3) * 0.1;
            pxPool(ctx, pk.x, pk.y + 8, 11, 5, rarity, pulse * glow * fade);
            if (glow > 0.6) {
              const sy = pk.y - 6 - ((this.time * 14 + pk.bob * 5) % 18);
              pxRect(ctx, pk.x + Math.sin(this.time * 2 + pk.bob) * 5, sy, 2, 2, rarity, 0.7 * fade);
            }
          }
          drawOutlineGlow(ctx, assets, spr, pk.x, pk.y + bob + 10, rarity, 0.9 * fade);
          drawSprite(ctx, spr, pk.x, pk.y + bob + 10, { alpha: fade, dy: 0 });
        },
      });
      return;
    }

    const def = assets.pickup(pk.kind, Math.floor(this.time * 7 + pk.bob * 3));
    if (!def) return;
    out.push({
      sort: pk.y - 0.3,
      draw: (ctx) => {
        drawShadow(ctx, assets, pk.x, pk.y + 6, 10, 0.35 * fade);
        drawSprite(ctx, def.sprite, pk.x, pk.y + bob + 6, { alpha: fade });
      },
    });
  }

  _chest(c, view, out) {
    if (c.x < view.x - 48 || c.x > view.x + view.w + 48) return;
    if (c.y < view.y - 48 || c.y > view.y + view.h + 48) return;
    const type = c.isMimic && !c.opened ? "mimic" : c.type === "mimic" ? "normal" : c.type;
    const spr = assets.chest(type, c.opened);
    const rarity = type === "legendary" ? RARITY_COLORS.legendary : type === "rare" ? RARITY_COLORS.rare : null;
    // Closed chests breathe; a mimic breathes a little too eagerly
    const bob = c.opened ? 0 : Math.round(Math.sin(this.time * 2 + c.bob) * (c.isMimic ? 2 : 1));

    out.push({
      sort: c.y,
      draw: (ctx) => {
        drawShadow(ctx, assets, c.x, c.y + 12, 30, 0.5);
        if (rarity && !c.opened) {
          const pulse = 0.18 + Math.sin(this.time * 3) * 0.06;
          pxPool(ctx, c.x, c.y + 12, 18, 7, rarity, pulse);
          drawOutlineGlow(ctx, assets, spr, c.x, c.y + 14 + bob, rarity, 0.45 + pulse);
        }
        drawSprite(ctx, spr, c.x, c.y + 14 + bob);
      },
    });
  }

  _interactable(it, view, out) {
    if (it.x < view.x - 64 || it.x > view.x + view.w + 64) return;
    if (it.y < view.y - 80 || it.y > view.y + view.h + 64) return;
    const def = assets.interactDef(it.kind);
    if (!def) return;
    const frame = Math.floor(this.time * (def.fps || 5));
    const got = assets.interactable(it.kind, frame);
    if (!got) return;
    const spr = got.sprite;
    const spent = it.used && it.kind !== "portal" && it.kind !== "shop";

    out.push({
      sort: it.y + 1,
      draw: (ctx) => {
        drawShadow(ctx, assets, it.x, it.y + 14, spr.w * 0.8, 0.5);
        if (!spent) {
          const c = PALETTE[def.light.color] || PALETTE.R;
          const pulse = 0.35 + Math.sin(this.time * 2.5) * 0.15;
          drawOutlineGlow(ctx, assets, spr, it.x, it.y + 16, c, pulse);
        }
        drawSprite(ctx, spr, it.x, it.y + 16, {
          // A used shrine keeps its shape but loses its colour
          tint: spent ? PALETTE["3"] : null,
          tintStrength: spent ? 0.6 : 0,
          alpha: spent ? 0.75 : 1,
        });
      },
    });
  }

  /* ---------------------------------------------------------------- *
   * ABOVE-EVERYTHING PASSES
   * ---------------------------------------------------------------- */

  /** Projectiles sit above actors: they are the thing that kills you (§11). */
  renderProjectiles(ctx, view) {
    for (const pr of this.game.projectiles) {
      if (pr.dead) continue;
      if (pr.x < view.x - 40 || pr.x > view.x + view.w + 40) continue;
      if (pr.y < view.y - 40 || pr.y > view.y + view.h + 40) continue;
      const base = pr.owner === "enemy"
        ? pr.color || ELEMENT_COLORS[pr.element] || PALETTE.l
        : ELEMENT_COLORS[pr.element] || pr.color || PALETTE.p;
      const hot = pr.crit ? PALETTE.Q : pr.owner === "enemy" ? PALETTE.p : PALETTE.Q;
      const cv = boltSprite(pr.angle, pr.radius + (pr.crit ? 1 : 0), base, hot, pr.trail ? 6 : 2);
      const a = Math.min(1, pr.life / Math.min(0.25, pr.maxLife));
      if (a !== 1) ctx.globalAlpha = a;
      ctx.drawImage(cv, Math.round(pr.x - cv.width / 2), Math.round(pr.y - cv.height / 2));
      if (a !== 1) ctx.globalAlpha = 1;
    }
  }

  /** Impact sparks, waves and bolts, drawn last so hits always register. */
  renderImpacts(ctx) {
    for (const w of this.waves) {
      if (!w.active) continue;
      const p = w.t / w.life;
      // Two rings a few pixels apart read as a wave front, not an outline
      pxRing(ctx, w.x, w.y, w.r * p, 3, w.color, (1 - p) * 0.85);
      if (p > 0.15) pxRing(ctx, w.x, w.y, w.r * (p - 0.15), 2, PALETTE.Q, (1 - p) * 0.35);
    }
    for (const a of this.arcs) {
      if (!a.active) continue;
      this._bolt(ctx, a);
    }
    for (const h of this.hits) {
      if (!h.active) continue;
      const p = h.t / h.life;
      const cv = impactSprite(Math.round(h.size * (0.6 + p * 0.7)), h.color, h.crit);
      ctx.globalAlpha = 1 - p * p;
      ctx.drawImage(cv, Math.round(h.x - cv.width / 2), Math.round(h.y - cv.height / 2));
      ctx.globalAlpha = 1;
    }
  }

  /** Stepped zig-zag between two points, jittered on a fixed seed. */
  _bolt(ctx, a) {
    const segs = 7;
    const dx = a.x2 - a.x1;
    const dy = a.y2 - a.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.globalAlpha = 1 - a.t / a.life;
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1);
      // Deterministic wobble, largest in the middle of the span
      const wob = Math.sin(t * 9 + a.seed) * 9 * Math.sin(t * Math.PI);
      const x = a.x1 + dx * t + nx * wob;
      const y = a.y1 + dy * t + ny * wob;
      pxRect(ctx, x - 1, y - 1, 3, 3, a.color);
      pxRect(ctx, x, y, 1, 1, PALETTE.Q);
    }
    ctx.globalAlpha = 1;
  }

  /** Lights emitted by moving things — merged with the dungeon's static set. */
  collectLights(view, out) {
    const g = this.game;
    if (g.player && !g.player.dead) {
      out.push({
        x: g.player.x,
        y: g.player.y,
        color: CLASS_LIGHT[g.player.classId] || PALETTE.R,
        radius: 132 + Math.sin(this.time * 3) * 4,
      });
    }
    for (const pr of g.projectiles) {
      if (pr.dead) continue;
      out.push({
        x: pr.x,
        y: pr.y,
        color: ELEMENT_COLORS[pr.element] || pr.color || PALETTE.p,
        radius: 34 + pr.radius * 3,
      });
    }
    for (const it of g.interactables) {
      const def = assets.interactDef(it.kind);
      if (!def?.light) continue;
      if (it.used && it.kind !== "portal") continue;
      out.push({ x: it.x, y: it.y - 8, color: PALETTE[def.light.color], radius: def.light.radius });
    }
    for (const c of g.chests) {
      if (c.opened || (c.type !== "legendary" && c.type !== "rare")) continue;
      out.push({ x: c.x, y: c.y, color: RARITY_COLORS[c.type === "legendary" ? "legendary" : "rare"], radius: 56 });
    }
    for (const pk of g.pickups) {
      if (pk.kind !== "item") continue;
      const glow = RARITY_GLOW[pk.data.item?.rarity] ?? 0;
      if (glow < 0.4) continue;
      out.push({ x: pk.x, y: pk.y, color: RARITY_COLORS[pk.data.item.rarity], radius: 30 + glow * 26 });
    }
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (e.isBoss) {
        out.push({ x: e.x, y: e.y, color: assets.bossAccent(e.defId), radius: 120 });
      } else if (e.isElite) {
        out.push({ x: e.x, y: e.y, color: e.elite.color || PALETTE.o, radius: 52 });
      } else if (e.element && e.element !== "none") {
        out.push({ x: e.x, y: e.y, color: ELEMENT_COLORS[e.element], radius: 30 });
      }
    }
    return out;
  }
}
