/**
 * ASSET REGISTRY (ART_BIBLE §15).
 *
 * The single lookup for every visual in the game. Authored grids are compiled
 * to offscreen canvases exactly once, on first request, and cached forever.
 * Nothing in this file allocates per frame.
 *
 * Naming follows ART_BIBLE §16, e.g.
 *   assets.enemy("skeleton", "walk", 2)      -> enemy_skeleton_walk_03
 *   assets.player("rogue", "right", "idle")  -> player_rogue_right_idle_01
 *   assets.tile("floor_stone_01", "forest")
 *   assets.item("iron_sword")
 */

import { PixelGrid, Sprite, makeCanvas, compileSync } from "./PixelSprite.js";
import { PALETTE, BIOME_ART, hexToRgb } from "./Palette.js";
import { buildClip } from "./Rigger.js";
import { PLAYER_SPRITES, PLAYER_RIG, CLASS_REMAPS, PLAYER_H } from "./sprites/player.js";
import { ENEMY_SPRITES, ENEMY_FALLBACK } from "./sprites/enemies.js";
import { BOSS_SPRITES, BOSS_PHASE_REMAPS } from "./sprites/bosses.js";
import { TILE_SPRITES, PROP_SPRITES, NATIVE_TILES } from "./sprites/environment.js";
import { ITEM_SPRITES, ITEM_TYPE_FALLBACK, CHEST_SPRITES } from "./sprites/items.js";
import { INTERACT_SPRITES, PICKUP_SPRITES } from "./sprites/interactables.js";
import { UI_ICONS } from "./sprites/icons.js";

const PLAYER_RIGS = { type: "biped", bands: [10, 20] };

class AssetRegistry {
  constructor() {
    this.cache = new Map();
    this.clips = new Map();
    this.halos = new Map();
    this.shadows = new Map();
    this.stats = { sprites: 0, pixels: 0 };
  }

  /** Compile-and-cache by key. `build` returns a PixelGrid or row array. */
  _sprite(key, build, opts) {
    let s = this.cache.get(key);
    if (s) return s;
    const grid = build();
    s = compileSync(key, grid, opts);
    this.cache.set(key, s);
    this.stats.sprites++;
    this.stats.pixels += s.w * s.h;
    return s;
  }

  /** All frames of one clip, cached as an array of Sprites. */
  _clip(key, baseRows, rig, state, dir, remap) {
    let arr = this.clips.get(key);
    if (arr) return arr;
    let base = PixelGrid.from(baseRows);
    if (remap) base = base.remap(remap);
    const grids = buildClip(base, rig, state, dir);
    arr = grids.map((g, i) => {
      const s = compileSync(`${key}_${String(i + 1).padStart(2, "0")}`, g);
      this.stats.sprites++;
      this.stats.pixels += s.w * s.h;
      return s;
    });
    this.clips.set(key, arr);
    return arr;
  }

  /* ---------------------------------------------------------------- *
   * CHARACTERS
   * ---------------------------------------------------------------- */

  /**
   * @param {string} classId warrior | rogue | mage
   * @param {string} dir     down | up | left | right
   * @param {string} state   idle | walk | attack | hurt | death | dodge
   */
  playerClip(classId, dir, state) {
    const key = `player_${classId}_${dir}_${state}`;
    let arr = this.clips.get(key);
    if (arr) return arr;
    const src = dir === "left" ? "right" : dir;
    const rows = PLAYER_SPRITES[src] || PLAYER_SPRITES.down;
    let base = PixelGrid.from(rows);
    const remap = CLASS_REMAPS[classId];
    if (remap && Object.keys(remap).length) base = base.remap(remap);
    if (dir === "left") base = base.mirrorX();
    const facing = dir === "left" ? -1 : 1;
    const grids = buildClip(base, PLAYER_RIGS, state, facing);
    arr = grids.map((g, i) => compileSync(`${key}_${i}`, g, { ax: Math.floor(g.w / 2), ay: PLAYER_H - 1 }));
    this.clips.set(key, arr);
    this.stats.sprites += arr.length;
    return arr;
  }

  /** Hand anchor in sprite-local pixels for the current facing. */
  playerHand(dir) {
    const h = PLAYER_RIG.hand[dir] || PLAYER_RIG.hand.down;
    return h;
  }

  enemyClip(defId, state, flip = false) {
    const def = ENEMY_SPRITES[defId] || ENEMY_SPRITES[ENEMY_FALLBACK];
    const key = `enemy_${defId}_${state}_${flip ? "l" : "r"}`;
    let arr = this.clips.get(key);
    if (arr) return arr;
    let base = PixelGrid.from(def.rows);
    if (flip) base = base.mirrorX();
    const grids = buildClip(base, def.rig, state, flip ? -1 : 1);
    arr = grids.map((g, i) => compileSync(`${key}_${i}`, g, { ax: Math.floor(g.w / 2), ay: g.h - 1 }));
    this.clips.set(key, arr);
    this.stats.sprites += arr.length;
    return arr;
  }

  bossClip(defId, phase, state, flip = false) {
    const def = BOSS_SPRITES[defId];
    if (!def) return this.enemyClip("demon", state, flip);
    const key = `boss_${defId}_p${phase}_${state}_${flip ? "l" : "r"}`;
    let arr = this.clips.get(key);
    if (arr) return arr;
    let base = PixelGrid.from(def.rows);
    const remaps = BOSS_PHASE_REMAPS[defId];
    if (remaps) {
      for (let p = 2; p <= phase; p++) if (remaps[p]) base = base.remap(remaps[p]);
    }
    if (flip) base = base.mirrorX();
    const grids = buildClip(base, def.rig, state, flip ? -1 : 1);
    arr = grids.map((g, i) => compileSync(`${key}_${i}`, g, { ax: Math.floor(g.w / 2), ay: g.h - 1 }));
    this.clips.set(key, arr);
    this.stats.sprites += arr.length;
    return arr;
  }

  bossAccent(defId) {
    return BOSS_SPRITES[defId]?.accent || PALETTE.t;
  }

  /* ---------------------------------------------------------------- *
   * ITEMS
   * ---------------------------------------------------------------- */

  item(defId, type) {
    const rows =
      ITEM_SPRITES[defId] ||
      ITEM_SPRITES[ITEM_TYPE_FALLBACK[type]] ||
      ITEM_SPRITES[ITEM_TYPE_FALLBACK.weapon];
    return this._sprite(`item_${defId || type}`, () => rows);
  }

  /** Mirrored item sprite, for weapons held in the left hand. */
  itemFlipped(defId, type) {
    const key = `item_${defId || type}_flip`;
    let s = this.cache.get(key);
    if (s) return s;
    const base = this.item(defId, type);
    s = compileSync(key, base.grid.mirrorX());
    this.cache.set(key, s);
    return s;
  }

  chest(type, opened) {
    const key = opened ? `${type}_open` : type;
    const rows = CHEST_SPRITES[key] || CHEST_SPRITES[opened ? "normal_open" : "normal"];
    return this._sprite(`chest_${key}`, () => rows);
  }

  icon(name) {
    const rows = UI_ICONS[name];
    if (!rows) return null;
    return this._sprite(`icon_${name}`, () => rows);
  }

  /* ---------------------------------------------------------------- *
   * WORLD INTERACTABLES
   * ---------------------------------------------------------------- */

  /** @returns {{sprite:Sprite, def:object}|null} */
  interactable(kind, frame = 0) {
    const def = INTERACT_SPRITES[kind];
    if (!def) return null;
    const i = frame % def.rows.length;
    const sprite = this._sprite(`interact_${kind}_${i}`, () => def.rows[i]);
    return { sprite, def };
  }

  interactDef(kind) {
    return INTERACT_SPRITES[kind] || null;
  }

  /** @returns {{sprite:Sprite, def:object}|null} */
  pickup(kind, frame = 0) {
    const def = PICKUP_SPRITES[kind];
    if (!def) return null;
    const i = frame % def.rows.length;
    const sprite = this._sprite(`pickup_${kind}_${i}`, () => def.rows[i]);
    return { sprite, def };
  }

  /* ---------------------------------------------------------------- *
   * ENVIRONMENT
   * ---------------------------------------------------------------- */

  /**
   * @param {number} orient 0-3: mirror flags (1 = flip X, 2 = flip Y). Ground
   *   tiles are orientation-agnostic, so four orientations quadruple the
   *   effective variant count for free and kill the visible repeat.
   */
  tile(name, biomeKey = "catacombs", orient = 0) {
    const rows = TILE_SPRITES[name];
    if (!rows) return null;
    const remap = NATIVE_TILES.has(name) ? null : this._biomeRemap(biomeKey);
    return this._sprite(`tile_${name}_${biomeKey}_${orient}`, () => {
      let g = PixelGrid.from(rows);
      if (remap) g = g.remap(remap);
      if (orient & 1) g = g.mirrorX();
      if (orient & 2) g = g.mirrorY();
      return g;
    });
  }

  /** @returns {{sprite:Sprite, meta:object}} */
  /**
   * @param {boolean} flip Mirror the prop. Cheap variety for repeated clutter
   *   (barrels, urns, rubble) without authoring a second sprite.
   */
  prop(name, biomeKey = "catacombs", frame = 0, flip = false) {
    const def = PROP_SPRITES[name];
    if (!def) return null;
    const rows = Array.isArray(def.rows[0]) ? def.rows[frame % def.rows.length] : def.rows;
    const remap = this._biomeRemap(biomeKey);
    const sprite = this._sprite(`prop_${name}_${biomeKey}_${frame}${flip ? "_f" : ""}`, () => {
      let g = PixelGrid.from(rows);
      if (remap) g = g.remap(remap);
      return flip ? g.mirrorX() : g;
    });
    return { sprite, meta: def };
  }

  propMeta(name) {
    return PROP_SPRITES[name] || null;
  }

  propFrameCount(name) {
    const def = PROP_SPRITES[name];
    if (!def) return 1;
    return Array.isArray(def.rows[0]) ? def.rows.length : 1;
  }

  _biomeRemap(biomeKey) {
    for (const b of Object.values(BIOME_ART)) {
      if (b.key === biomeKey) return b.tileRemap;
    }
    return null;
  }

  /* ---------------------------------------------------------------- *
   * DERIVED VISUALS — halos, shadows, silhouettes
   * ---------------------------------------------------------------- */

  /**
   * Pixelated light halo: concentric hard-edged rings at 1/4 resolution.
   * Additive-blended by the lighting pass, never a smooth CSS-style gradient.
   */
  halo(radius, color) {
    const r = Math.max(4, Math.round(radius / 4) * 4);
    const key = `${r}|${color}`;
    let cv = this.halos.get(key);
    if (cv) return cv;
    const lr = Math.round(r / 4);            // light layer runs at quarter res
    const size = lr * 2 + 1;
    cv = makeCanvas(size, size);
    const ctx = cv.getContext("2d");
    const [cr, cg, cb] = hexToRgb(color);
    const steps = 6;
    for (let s = steps; s >= 1; s--) {
      const rad = (lr * s) / steps;
      // Quadratic falloff quantized into `steps` bands. Capped below 1 so a
      // torch reads as warm light rather than a blown-out white disc.
      const a = Math.pow(1 - (s - 1) / steps, 2) * 0.72;
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
      // Draw the band as a pixel disc so the edge is stepped, not smooth
      for (let y = -Math.ceil(rad); y <= Math.ceil(rad); y++) {
        const half = Math.floor(Math.sqrt(Math.max(0, rad * rad - y * y)));
        if (half <= 0) continue;
        ctx.fillRect(lr - half, lr + y, half * 2 + 1, 1);
      }
    }
    this.halos.set(key, cv);
    return cv;
  }

  /** Hard-edged elliptical contact shadow, cached per width. */
  shadow(w) {
    const ww = Math.max(6, Math.round(w / 2) * 2);
    let cv = this.shadows.get(ww);
    if (cv) return cv;
    const h = Math.max(3, Math.round(ww * 0.4));
    cv = makeCanvas(ww, h);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    const rx = ww / 2;
    const ry = h / 2;
    for (let y = 0; y < h; y++) {
      const t = 1 - ((y - ry + 0.5) / ry) ** 2;
      if (t <= 0) continue;
      const half = Math.max(1, Math.round(rx * Math.sqrt(t)));
      ctx.fillRect(Math.round(rx - half), y, half * 2, 1);
    }
    this.shadows.set(ww, cv);
    return cv;
  }

  /**
   * Outline glow: the sprite silhouette expanded by 1px, in `color`.
   * Used for elites, bosses and loot rarity — readability first (§11).
   */
  glow(sprite, color) {
    const key = `glow_${sprite.name}_${color}`;
    let s = this.cache.get(key);
    if (s) return s;
    const ring = sprite.grid.outlined("Q");
    const cv = makeCanvas(ring.w, ring.h);
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (const r of ring.toRects()) {
      if (r.c !== "Q") continue;
      ctx.fillStyle = color;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    s = new Sprite(key, cv, ring, sprite.ax, sprite.ay);
    this.cache.set(key, s);
    return s;
  }

  clearDerived() {
    // Called on floor change: biome-specific tiles stay, tints are per-sprite.
  }
}

export const assets = new AssetRegistry();
