/**
 * PROCEDURAL DECORATOR (ART_BIBLE §9, §10).
 *
 * Turns a bare generated room rect into a place. Placement is fully
 * deterministic from (dungeon seed, room grid coords), so the same dungeon seed
 * always produces the same room dressing, and it obeys density rules rather
 * than scattering props uniformly:
 *
 *   - the middle of the room stays clear for combat;
 *   - doorways and their approach lanes stay clear;
 *   - corners take the big anchor props;
 *   - the band along the walls takes clutter;
 *   - the open floor takes only flat decals;
 *   - wall runs take torches at a regular rhythm, which also light the room.
 *
 * A room also picks a *scene* (crypt, ransacked, battlefield, library, forge,
 * shrine, overgrown), which biases which props appear so rooms read as having
 * had something happen in them.
 */

import { seeded } from "../Shape.js";
import { getBiomeArt } from "../Palette.js";
import { assets } from "../AssetRegistry.js";

/** Prop vocabulary per scene. Names must exist in PROP_SPRITES. */
const SCENES = {
  crypt: {
    anchors: ["tombstone", "statue_guardian", "tomb_niche", "pillar_broken"],
    clutter: ["bone_01", "bone_02", "bone_03", "skull_pile", "urn", "rubble_01", "candle"],
    decals: ["crack_01", "crack_02", "crack_03", "puddle"],
  },
  ransacked: {
    anchors: ["bookshelf", "pillar_broken", "table_broken"],
    clutter: ["barrel", "crate", "pot", "urn", "rubble_02", "rubble_03", "book", "shield_broken"],
    decals: ["crack_02", "crack_04", "scorch"],
  },
  battlefield: {
    anchors: ["banner", "pillar_broken", "statue_guardian"],
    clutter: ["sword_planted", "shield_broken", "bone_01", "bone_04", "skull_pile", "rubble_01"],
    decals: ["scorch", "crack_01", "crack_03"],
  },
  library: {
    anchors: ["bookshelf", "bookshelf", "table_broken"],
    clutter: ["book", "candle", "crate", "urn", "rubble_04"],
    decals: ["crack_02", "web"],
  },
  forge: {
    anchors: ["anvil", "brazier", "obsidian_spike"],
    clutter: ["barrel", "crate", "ash_pile", "bone_02", "rubble_02"],
    decals: ["scorch", "lava_crack", "crack_04"],
  },
  shrine: {
    anchors: ["altar", "statue_guardian", "obelisk"],
    clutter: ["candle", "urn", "rune_stone", "bone_03", "pot"],
    decals: ["glyph", "crack_01"],
  },
  overgrown: {
    anchors: ["tree_dead_01", "tree_twisted_01", "standing_stone", "root_arch", "stump"],
    clutter: ["bush_01", "bush_02", "rock_01", "rock_04", "log", "mushroom_01", "flower"],
    decals: ["grass_01", "grass_02", "root", "leaf", "puddle"],
  },
};

/** Biome-specific substitutions applied to any scene. */
const BIOME_SWAPS = {
  forest: {
    tombstone: "standing_stone", statue_guardian: "tree_twisted_02", tomb_niche: "root_arch",
    pillar_broken: "tree_dead_02", bookshelf: "tree_dead_03", urn: "stump", candle: "mushroom_01",
    crack_01: "root", crack_02: "grass_01", crack_03: "grass_02", crack_04: "leaf",
    rubble_01: "rock_02", rubble_02: "rock_05", rubble_03: "bush_03", rubble_04: "rock_08",
    web: "vine", obelisk: "standing_stone", scorch: "leaf",
  },
  inferno: {
    tombstone: "obsidian_spike", statue_guardian: "demon_statue", tomb_niche: "obsidian_spike",
    bookshelf: "anvil", candle: "brazier", puddle: "lava_crack", urn: "ash_pile",
    crack_01: "lava_crack", crack_02: "scorch", crack_03: "lava_crack", web: "scorch",
    obelisk: "obsidian_spike", pot: "ash_pile",
  },
  frozen: {
    tombstone: "ice_spike", statue_guardian: "frozen_statue", tomb_niche: "ice_block",
    pillar_broken: "frozen_pillar", bookshelf: "ice_block", candle: "icicle",
    puddle: "puddle_frozen", urn: "ice_block", obelisk: "ice_obelisk",
    crack_01: "snow_drift", crack_03: "puddle_frozen", web: "snow_drift", pot: "snow_drift",
  },
  void: {
    tombstone: "rune_stone", statue_guardian: "obelisk_void", tomb_niche: "star_hole",
    pillar_broken: "shattered_pillar", bookshelf: "obelisk_void", candle: "fragment",
    puddle: "star_hole", urn: "fragment", obelisk: "obelisk_void",
    crack_01: "crack_void", crack_02: "glyph", crack_03: "star_hole", web: "glyph",
    scorch: "glyph", pot: "fragment",
  },
};

/** Decals that only make sense tucked into a corner, never on open floor. */
const CORNER_ONLY = new Set(["web", "vine", "snow_drift"]);

/** Which scenes suit which room type. */
const ROOM_SCENES = {
  start: ["crypt", "shrine"],
  combat: ["ransacked", "battlefield", "crypt"],
  elite: ["battlefield", "shrine", "forge"],
  treasure: ["ransacked", "library", "crypt"],
  shop: ["library", "ransacked"],
  shrine: ["shrine"],
  healing: ["shrine", "overgrown"],
  event: ["library", "shrine", "crypt"],
  secret: ["library", "crypt"],
  boss: ["battlefield", "forge", "shrine"],
};

function hash(a, b, c) {
  let h = (a | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (b | 0), 0x85ebca6b);
  h = Math.imul(h ^ (c | 0), 0xc2b2ae35);
  return (h ^ (h >>> 15)) >>> 0;
}

function swap(name, biomeKey) {
  const table = BIOME_SWAPS[biomeKey];
  if (!table) return name;
  const to = table[name];
  if (!to) return name;
  return assets.propMeta(to) ? to : name;
}

/**
 * @returns {{ statics: Array, dynamics: Array, lights: Array, scene: string }}
 *   statics  — baked into the room canvas   { name, x, y, bg }
 *   dynamics — drawn per frame, y-sorted    { name, x, y, frames, tall }
 *   lights   — { x, y, color, radius, flicker }
 */
export function decorateRoom(room, dungeon, doors = []) {
  const biome = getBiomeArt(dungeon.floor);
  const bk = biome.key;
  const rnd = seeded(hash(dungeon.seed, room.gx * 73856093, room.gy * 19349663));

  const sceneList = ROOM_SCENES[room.type] || ROOM_SCENES.combat;
  const allowed = sceneList.filter((s) => biome.scenes.includes(s) || s === "shrine");
  const scene = (allowed.length ? allowed : sceneList)[Math.floor(rnd() * (allowed.length || sceneList.length))];
  const table = SCENES[scene] || SCENES.crypt;

  const statics = [];
  const dynamics = [];
  const lights = [];

  const wt = room.wallThickness || 16;
  const inner = { x: room.x + wt, y: room.y + wt, w: room.w - wt * 2, h: room.h - wt * 2 };
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  const clearR = Math.min(inner.w, inner.h) * 0.3;

  // Keep-out zones: combat centre, doorways, and pre-placed room content.
  const keepOut = [{ x: cx, y: cy, r: clearR }];
  for (const d of doors) keepOut.push({ x: d.x, y: d.y, r: 54 });
  for (const c of room.chests || []) keepOut.push({ x: c.x, y: c.y, r: 40 });
  for (const it of room.interactables || []) keepOut.push({ x: it.x, y: it.y, r: 48 });
  for (const sp of room.spawns || []) keepOut.push({ x: sp.x, y: sp.y, r: 26 });
  for (const o of room.obstacles || []) {
    keepOut.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, r: Math.max(o.w, o.h) * 0.6 + 10 });
  }

  const free = (x, y, pad = 0) => {
    if (x < inner.x + 4 || x > inner.x + inner.w - 4) return false;
    if (y < inner.y + 6 || y > inner.y + inner.h - 2) return false;
    for (const k of keepOut) {
      const dx = x - k.x;
      const dy = y - k.y;
      if (dx * dx + dy * dy < (k.r + pad) * (k.r + pad)) return false;
    }
    return true;
  };

  const place = (name, x, y, list) => {
    const meta = assets.propMeta(name);
    if (!meta) return false;
    // Mirroring is free variety: a row of identical barrels reads as tiling
    list.push({
      name,
      x: Math.round(x),
      y: Math.round(y),
      tall: !!meta.tall,
      bg: !!meta.bg,
      flip: rnd() < 0.5,
    });
    keepOut.push({ x, y, r: meta.tall ? 22 : 12 });
    if (meta.light) {
      lights.push({
        x: Math.round(x),
        y: Math.round(y - (meta.tall ? 14 : 6)),
        color: meta.light.color,
        radius: meta.light.radius,
        flicker: name === "torch" || name === "brazier" || name === "candle",
      });
    }
    return true;
  };

  /* --- 1. Ground decals: flat, background tier, allowed almost anywhere --- */
  const decalCount = 6 + Math.floor(rnd() * 8);
  for (let i = 0; i < decalCount; i++) {
    let x = inner.x + 8 + rnd() * (inner.w - 16);
    let y = inner.y + 8 + rnd() * (inner.h - 16);
    const name = swap(table.decals[Math.floor(rnd() * table.decals.length)], bk);
    if (!assets.propMeta(name)) continue;
    if (CORNER_ONLY.has(name)) {
      // A cobweb strung across open floor reads as a mistake; hug a corner
      x = rnd() < 0.5 ? inner.x + 2 + rnd() * 10 : inner.x + inner.w - 12 - rnd() * 10;
      y = rnd() < 0.5 ? inner.y + 4 + rnd() * 12 : inner.y + inner.h - 6 - rnd() * 12;
    }
    statics.push({ name, x: Math.round(x), y: Math.round(y), bg: true, flip: rnd() < 0.5 });
  }

  /* --- 2. Corner anchors: the big silhouettes that give a room character --- */
  const corners = [
    { x: inner.x + 26, y: inner.y + 30 },
    { x: inner.x + inner.w - 26, y: inner.y + 30 },
    { x: inner.x + 26, y: inner.y + inner.h - 8 },
    { x: inner.x + inner.w - 26, y: inner.y + inner.h - 8 },
  ];
  const anchorCount = room.type === "boss" ? 4 : 1 + Math.floor(rnd() * 3);
  const order = corners.map((c, i) => ({ c, k: rnd(), i })).sort((a, b) => a.k - b.k);
  let placedAnchors = 0;
  for (const { c } of order) {
    if (placedAnchors >= anchorCount) break;
    if (!free(c.x, c.y, 8)) continue;
    const name = swap(table.anchors[Math.floor(rnd() * table.anchors.length)], bk);
    const meta = assets.propMeta(name);
    if (!meta) continue;
    if (place(name, c.x, c.y, meta.tall || meta.light ? dynamics : statics)) placedAnchors++;
  }

  /* --- 3. Wall-band clutter: barrels, bones, rubble hugging the stone --- */
  const bandCount = 5 + Math.floor(rnd() * 7);
  for (let i = 0; i < bandCount; i++) {
    const side = Math.floor(rnd() * 4);
    const t = 0.1 + rnd() * 0.8;
    const depth = 8 + rnd() * 26;
    let x;
    let y;
    if (side === 0) { x = inner.x + inner.w * t; y = inner.y + depth; }
    else if (side === 1) { x = inner.x + inner.w * t; y = inner.y + inner.h - depth * 0.5; }
    else if (side === 2) { x = inner.x + depth; y = inner.y + inner.h * t; }
    else { x = inner.x + inner.w - depth; y = inner.y + inner.h * t; }
    if (!free(x, y, 4)) continue;
    const name = swap(table.clutter[Math.floor(rnd() * table.clutter.length)], bk);
    const meta = assets.propMeta(name);
    if (!meta) continue;
    place(name, x, y, meta.tall || meta.light || meta.anim ? dynamics : statics);
  }

  /* --- 4. Biome filler: the vegetation/ice/ember layer that sells the biome --- */
  const fillerNames = biome.decor
    .map((base) => {
      const candidates = [base, `${base}_01`, `${base}_02`, `${base}_03`, `${base}_04`];
      return candidates.filter((n) => assets.propMeta(n));
    })
    .flat();
  if (fillerNames.length) {
    const fillCount = 8 + Math.floor(rnd() * 10);
    for (let i = 0; i < fillCount; i++) {
      // Bias toward the room edges: sample depth with a squared distribution
      const edge = rnd() < 0.72;
      const x = edge
        ? (rnd() < 0.5 ? inner.x + rnd() * rnd() * inner.w * 0.4 : inner.x + inner.w - rnd() * rnd() * inner.w * 0.4)
        : inner.x + rnd() * inner.w;
      const y = edge
        ? (rnd() < 0.5 ? inner.y + rnd() * rnd() * inner.h * 0.45 : inner.y + inner.h - rnd() * rnd() * inner.h * 0.45)
        : inner.y + rnd() * inner.h;
      if (!free(x, y, 2)) continue;
      const name = fillerNames[Math.floor(rnd() * fillerNames.length)];
      const meta = assets.propMeta(name);
      if (!meta) continue;
      place(name, x, y, meta.tall || meta.light || meta.anim ? dynamics : statics);
    }
  }

  /* --- 5. Wall torches: a lighting rhythm, not decoration --- */
  const torchName = assets.propMeta(swap("candle", bk)) && bk === "inferno" ? "brazier" : "torch";
  const step = 200;
  // Sit the sconce on the wall face, not on the floor in front of it
  const rows = [inner.y - 2];
  for (const wy of rows) {
    for (let x = inner.x + 60; x < inner.x + inner.w - 40; x += step) {
      const jx = x + (rnd() - 0.5) * 30;
      if (doors.some((d) => Math.abs(d.x - jx) < 46 && Math.abs(d.y - wy) < 60)) continue;
      dynamics.push({ name: torchName, x: Math.round(jx), y: Math.round(wy), tall: false, anim: true, wall: true });
      const meta = assets.propMeta(torchName);
      lights.push({
        x: Math.round(jx),
        y: Math.round(wy - 12),
        color: meta.light.color,
        radius: meta.light.radius,
        flicker: true,
      });
    }
  }
  // A second pair on the side walls for depth
  for (const side of [0, 1]) {
    const x = side ? inner.x + inner.w - 7 : inner.x + 7;
    const y = inner.y + inner.h * (0.45 + rnd() * 0.2);
    if (!doors.some((d) => Math.abs(d.x - x) < 50 && Math.abs(d.y - y) < 50)) {
      dynamics.push({ name: torchName, x: Math.round(x), y: Math.round(y), anim: true, wall: true });
      const meta = assets.propMeta(torchName);
      lights.push({ x: Math.round(x), y: Math.round(y - 12), color: meta.light.color, radius: meta.light.radius, flicker: true });
    }
  }

  /* --- 6. Obstacles become real geometry, not grey boxes --- */
  for (const o of room.obstacles || []) {
    const kind = rnd();
    const px = o.x + o.w / 2;
    const py = o.y + o.h;
    const flip = rnd() < 0.5;
    if (kind < 0.45) {
      const name = swap("pillar_broken", bk);
      dynamics.push({ name, x: Math.round(px), y: Math.round(py), tall: true, flip });
    } else if (kind < 0.75) {
      const rockName = `rock_${String(6 + Math.floor(rnd() * 5)).padStart(2, "0")}`;
      dynamics.push({ name: assets.propMeta(rockName) ? rockName : "rock_06", x: Math.round(px), y: Math.round(py), tall: true, flip });
    } else {
      const name = swap("crate", bk);
      dynamics.push({ name: assets.propMeta(name) ? name : "crate", x: Math.round(px), y: Math.round(py), tall: true, flip });
    }
    // Rubble skirt so the block sits in the floor rather than on it
    for (let i = 0; i < 3; i++) {
      const rx = o.x + rnd() * o.w;
      const ry = o.y + o.h - 2 + rnd() * 8;
      const name = swap(`rubble_0${1 + Math.floor(rnd() * 4)}`, bk);
      if (assets.propMeta(name)) {
        statics.push({ name, x: Math.round(rx), y: Math.round(ry), bg: true, flip: rnd() < 0.5 });
      }
    }
  }

  return { statics, dynamics, lights, scene };
}

/** Corridor dressing: sparse, never blocking the lane. */
export function decorateCorridor(corridor, dungeon, index) {
  const biome = getBiomeArt(dungeon.floor);
  const bk = biome.key;
  const rnd = seeded(hash(dungeon.seed, index * 2654435761, 7));
  const statics = [];
  const lights = [];
  const dynamics = [];

  // Corridors overlap the rooms they connect. Anything landing inside a room
  // would read as a torch or barrel standing in open floor, so drop it.
  const inRoom = (x, y) =>
    (dungeon.rooms || []).some((r) => x > r.x - 8 && x < r.x + r.w + 8 && y > r.y - 8 && y < r.y + r.h + 8);

  for (const seg of corridor.segments) {
    const horizontal = seg.w > seg.h;
    const len = horizontal ? seg.w : seg.h;
    const count = Math.floor(len / 90);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / Math.max(1, count);
      const x = horizontal ? seg.x + seg.w * t : seg.x + (rnd() < 0.5 ? 3 : seg.w - 3);
      const y = horizontal ? seg.y + (rnd() < 0.5 ? 4 : seg.h - 2) : seg.y + seg.h * t;
      if (inRoom(x, y)) continue;
      if (rnd() < 0.35) {
        const name = swap("torch", bk);
        dynamics.push({ name, x: Math.round(x), y: Math.round(y), anim: true, wall: true });
        const meta = assets.propMeta(name);
        lights.push({ x: Math.round(x), y: Math.round(y - 10), color: meta.light.color, radius: meta.light.radius * 0.8, flicker: true });
      } else {
        const pool = ["rubble_01", "rubble_03", "bone_02", "crack_02", "puddle"].map((n) => swap(n, bk));
        const name = pool[Math.floor(rnd() * pool.length)];
        if (assets.propMeta(name)) {
          statics.push({ name, x: Math.round(x), y: Math.round(y), bg: true, flip: rnd() < 0.5 });
        }
      }
    }
  }
  return { statics, dynamics, lights };
}
