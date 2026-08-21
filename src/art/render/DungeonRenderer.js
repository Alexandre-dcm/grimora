/**
 * DUNGEON RENDERER (ART_BIBLE §9).
 *
 * Consumes the existing rect-based dungeon data untouched and paints it as a
 * tiled, decorated, lit place:
 *
 *   - floors are laid from a 6-variant tileset with deterministic variant
 *     choice and a dithered edge shadow where they meet stone (autotiling by
 *     neighbour mask, not by hand-drawn corner tiles);
 *   - walls get a lit top surface, a dark front face and a cast shadow, so a
 *     wall reads as a solid object with height;
 *   - doorways get jambs and a keystone;
 *   - each room is baked ONCE into an offscreen canvas, so the static world
 *     costs one drawImage per visible room per frame.
 *
 * Tall and animated props are kept out of the bake and returned for the
 * y-sorted entity pass, so the player can walk in front of a statue.
 */

import { makeCanvas } from "../PixelSprite.js";
import { getBiomeArt, PALETTE } from "../Palette.js";
import { assets } from "../AssetRegistry.js";
import { TILE } from "../sprites/environment.js";
import { seeded } from "../Shape.js";
import { crisp } from "./Draw.js";
import { decorateRoom, decorateCorridor } from "./Decorator.js";

const PAD = 24;

const FLOOR_SET = [
  "floor_stone_01", "floor_stone_02", "floor_stone_03",
  "floor_stone_04", "floor_stone_05", "floor_stone_06",
  "floor_cracked_01", "floor_moss_01", "floor_broken_01",
];
const WALL_TOPS = ["wall_top_01", "wall_top_01", "wall_top_02", "wall_top_03"];
const WALL_FACES = ["wall_face_01", "wall_face_02", "wall_face_03"];

function hash2(a, b) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export class DungeonRenderer {
  constructor() {
    this.dungeon = null;
    this.biome = null;
    this.rooms = new Map();      // room.id -> { canvas, ox, oy, dynamics, lights, scene }
    this.corridors = [];         // { canvas, ox, oy, dynamics, lights }
    this.lights = [];
    this.doors = new Map();      // room.id -> [{x,y,side}]
  }

  /** Build every baked layer for a freshly generated dungeon. */
  build(dungeon) {
    this.dungeon = dungeon;
    this.biome = getBiomeArt(dungeon.floor);
    this.rooms.clear();
    this.corridors = [];
    this.lights = [];
    this.doors.clear();

    for (const room of dungeon.rooms) this.doors.set(room.id, this._findDoors(room, dungeon));

    for (const room of dungeon.rooms) {
      const doors = this.doors.get(room.id) || [];
      const decor = decorateRoom(room, dungeon, doors);
      const baked = this._bakeRoom(room, doors, decor);
      this.rooms.set(room.id, { ...baked, dynamics: decor.dynamics, lights: decor.lights, scene: decor.scene, room });
      this.lights.push(...decor.lights);
    }

    dungeon.corridors.forEach((c, i) => {
      const decor = decorateCorridor(c, dungeon, i);
      const baked = this._bakeCorridor(c, decor);
      this.corridors.push({ ...baked, dynamics: decor.dynamics, lights: decor.lights });
      this.lights.push(...decor.lights);
    });
  }

  /** Door centres: where a corridor segment crosses this room's wall ring. */
  _findDoors(room, dungeon) {
    const out = [];
    const wt = room.wallThickness || 16;
    for (const c of dungeon.corridors) {
      if (c.from !== room.id && c.to !== room.id) continue;
      for (const s of c.segments) {
        for (const wall of room.walls) {
          const ix = Math.max(wall.x, s.x);
          const iy = Math.max(wall.y, s.y);
          const iw = Math.min(wall.x + wall.w, s.x + s.w) - ix;
          const ih = Math.min(wall.y + wall.h, s.y + s.h) - iy;
          if (iw <= 0 || ih <= 0) continue;
          const cx = ix + iw / 2;
          const cy = iy + ih / 2;
          const side = wall.side || (wall.w > wall.h ? (cy < room.y + room.h / 2 ? "top" : "bottom") : (cx < room.x + room.w / 2 ? "left" : "right"));
          if (!out.some((d) => Math.abs(d.x - cx) < wt && Math.abs(d.y - cy) < wt)) {
            out.push({ x: cx, y: cy, w: iw, h: ih, side, rect: { x: ix, y: iy, w: iw, h: ih } });
          }
        }
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- *
   * BAKING
   * ---------------------------------------------------------------- */

  _bakeRoom(room, doors, decor) {
    const ox = room.x - PAD;
    const oy = room.y - PAD;
    const cv = makeCanvas(room.w + PAD * 2, room.h + PAD * 2);
    const ctx = crisp(cv.getContext("2d"));
    const bk = this.biome.key;
    const wt = room.wallThickness || 16;

    // --- floor -------------------------------------------------------
    const fx0 = room.x;
    const fy0 = room.y;
    for (let y = fy0; y < room.y + room.h; y += TILE) {
      for (let x = fx0; x < room.x + room.w; x += TILE) {
        this._drawFloorTile(ctx, x - ox, y - oy, x, y, bk);
      }
    }

    // --- floor edge shadow where stone meets floor --------------------
    this._edgeShadow(ctx, PAD + wt, PAD + wt, room.w - wt * 2, room.h - wt * 2);

    // --- baked decals and small props --------------------------------
    for (const d of decor.statics.filter((s) => s.bg)) this._drawProp(ctx, d, ox, oy, bk);
    for (const d of decor.statics.filter((s) => !s.bg)) this._drawProp(ctx, d, ox, oy, bk);

    // --- walls -------------------------------------------------------
    for (const wall of room.walls) this._drawWall(ctx, wall, ox, oy, bk);

    // --- doorways: punch floor through the wall, then frame it -------
    for (const d of doors) {
      const r = d.rect;
      const gx0 = Math.floor((r.x - 2) / TILE) * TILE;
      const gy0 = Math.floor((r.y - 2) / TILE) * TILE;
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x - ox - 2, r.y - oy - 2, r.w + 4, r.h + 4);
      ctx.clip();
      for (let y = gy0; y <= r.y + r.h + TILE; y += TILE) {
        for (let x = gx0; x <= r.x + r.w + TILE; x += TILE) {
          this._drawFloorTile(ctx, x - ox, y - oy, x, y, bk);
        }
      }
      ctx.restore();
      this._drawArch(ctx, d, ox, oy, bk);
    }

    return { canvas: cv, ox, oy };
  }

  _bakeCorridor(corridor, decor) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const s of corridor.segments) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.w);
      maxY = Math.max(maxY, s.y + s.h);
    }
    const ox = minX - PAD;
    const oy = minY - PAD;
    const cv = makeCanvas(maxX - minX + PAD * 2, maxY - minY + PAD * 2);
    const ctx = crisp(cv.getContext("2d"));
    const bk = this.biome.key;

    for (const s of corridor.segments) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.x - ox, s.y - oy, s.w, s.h);
      ctx.clip();
      const gx0 = Math.floor(s.x / TILE) * TILE;
      const gy0 = Math.floor(s.y / TILE) * TILE;
      for (let y = gy0; y < s.y + s.h + TILE; y += TILE) {
        for (let x = gx0; x < s.x + s.w + TILE; x += TILE) {
          this._drawFloorTile(ctx, x - ox, y - oy, x, y, bk);
        }
      }
      ctx.restore();
      // Lane edges: a dark lip so corridors read as cut through rock
      const shade = assets.tile("wall_shadow", bk);
      if (s.w > s.h) {
        ctx.fillStyle = PALETTE["0"];
        ctx.fillRect(s.x - ox, s.y - oy, s.w, 2);
        ctx.fillRect(s.x - ox, s.y - oy + s.h - 2, s.w, 2);
        if (shade) {
          for (let x = s.x; x < s.x + s.w; x += TILE) {
            ctx.drawImage(shade.canvas, x - ox, s.y - oy + 2);
          }
        }
      } else {
        ctx.fillStyle = PALETTE["0"];
        ctx.fillRect(s.x - ox, s.y - oy, 2, s.h);
        ctx.fillRect(s.x - ox + s.w - 2, s.y - oy, 2, s.h);
      }
    }

    for (const d of decor.statics) this._drawProp(ctx, d, ox, oy, bk);
    return { canvas: cv, ox, oy };
  }

  _drawFloorTile(ctx, dx, dy, wx, wy, bk) {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    const r = hash2(tx * 374761393 + this.dungeon.floor, ty * 668265263);
    // Biomes with their own ground surface (earth, ash, snow, void) use it for
    // every tile; masonry biomes weight toward plain stone with rare damage.
    const set = this.biome.floorSet;
    let name;
    if (set) {
      name = set[Math.floor(r * 100) % set.length];
    } else {
      const idx = r < 0.84
        ? Math.floor(r * 100) % 6
        : r < 0.92 ? 6 : r < 0.97 ? 7 : 8;
      name = FLOOR_SET[Math.min(FLOOR_SET.length - 1, idx)];
    }
    const spr = assets.tile(name, bk);
    if (spr) ctx.drawImage(spr.canvas, dx, dy);
  }

  /** Dithered darkening along the inside of the wall ring. */
  _edgeShadow(ctx, x, y, w, h) {
    const bands = [
      { d: 0, a: 0.5 }, { d: 1, a: 0.42 }, { d: 2, a: 0.34 }, { d: 3, a: 0.26 },
      { d: 4, a: 0.2 }, { d: 5, a: 0.14 }, { d: 6, a: 0.1 }, { d: 7, a: 0.06 },
    ];
    ctx.fillStyle = PALETTE["0"];
    for (const b of bands) {
      ctx.globalAlpha = b.a;
      // top / bottom
      for (let i = 0; i < w; i++) {
        if ((i + b.d) % 2 === 0 || b.d < 3) ctx.fillRect(x + i, y + b.d, 1, 1);
        if ((i + b.d) % 2 === 0 || b.d < 3) ctx.fillRect(x + i, y + h - 1 - b.d, 1, 1);
      }
      for (let j = 0; j < h; j++) {
        if ((j + b.d) % 2 === 0 || b.d < 3) ctx.fillRect(x + b.d, y + j, 1, 1);
        if ((j + b.d) % 2 === 0 || b.d < 3) ctx.fillRect(x + w - 1 - b.d, y + j, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawWall(ctx, wall, ox, oy, bk) {
    const horizontal = wall.w >= wall.h;
    // Top surface
    ctx.save();
    ctx.beginPath();
    ctx.rect(wall.x - ox, wall.y - oy, wall.w, wall.h);
    ctx.clip();
    const gx0 = Math.floor(wall.x / TILE) * TILE;
    const gy0 = Math.floor(wall.y / TILE) * TILE;
    for (let y = gy0; y < wall.y + wall.h + TILE; y += TILE) {
      for (let x = gx0; x < wall.x + wall.w + TILE; x += TILE) {
        const r = hash2(x * 92837111, y * 689287499 + this.dungeon.floor);
        const spr = assets.tile(WALL_TOPS[Math.floor(r * WALL_TOPS.length)], bk);
        if (spr) ctx.drawImage(spr.canvas, x - ox, y - oy);
      }
    }
    ctx.restore();

    // Rim light on the outer edge, hard dark line on the inner edge
    ctx.fillStyle = PALETTE["0"];
    ctx.fillRect(wall.x - ox, wall.y - oy, wall.w, 1);
    ctx.fillRect(wall.x - ox, wall.y - oy, 1, wall.h);
    ctx.fillRect(wall.x - ox + wall.w - 1, wall.y - oy, 1, wall.h);
    ctx.fillRect(wall.x - ox, wall.y - oy + wall.h - 1, wall.w, 1);

    if (horizontal) {
      // Front face hanging below the wall block, then its cast shadow
      const fy = wall.y + wall.h - oy;
      ctx.save();
      ctx.beginPath();
      ctx.rect(wall.x - ox, fy, wall.w, 10);
      ctx.clip();
      for (let x = Math.floor(wall.x / TILE) * TILE; x < wall.x + wall.w + TILE; x += TILE) {
        const r = hash2(x * 40503, wall.y * 15485863);
        const spr = assets.tile(WALL_FACES[Math.floor(r * WALL_FACES.length)], bk);
        if (spr) ctx.drawImage(spr.canvas, x - ox, fy);
      }
      ctx.restore();
      const shade = assets.tile("wall_shadow", bk);
      if (shade) {
        for (let x = wall.x; x < wall.x + wall.w; x += TILE) {
          ctx.drawImage(shade.canvas, x - ox, fy + 10);
        }
      }
    } else {
      // Vertical wall: a 3px dark lip on the room side
      const insideRight = wall.x < ox + PAD + 2;
      const lx = insideRight ? wall.x + wall.w - ox : wall.x - ox - 3;
      ctx.fillStyle = PALETTE["1"];
      ctx.globalAlpha = 0.75;
      ctx.fillRect(lx, wall.y - oy, 3, wall.h);
      ctx.globalAlpha = 0.4;
      ctx.fillRect(insideRight ? lx + 3 : lx - 2, wall.y - oy, 2, wall.h);
      ctx.globalAlpha = 1;
    }
  }

  _drawArch(ctx, door, ox, oy, bk) {
    const jamb = assets.tile("arch_jamb", bk);
    const key = assets.tile("arch_key", bk);
    if (!jamb) return;
    const r = door.rect;
    if (door.side === "top" || door.side === "bottom") {
      const y = r.y - oy - 2;
      ctx.drawImage(jamb.canvas, r.x - ox - jamb.w, y);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(jamb.canvas, -(r.x - ox + r.w) - jamb.w, y);
      ctx.restore();
      if (key) ctx.drawImage(key.canvas, Math.round(r.x - ox + r.w / 2 - key.w / 2), y - 6);
    } else {
      const x = r.x - ox - 2;
      ctx.drawImage(jamb.canvas, x, r.y - oy - jamb.h + 4);
      ctx.drawImage(jamb.canvas, x, r.y - oy + r.h - 4);
    }
  }

  _drawProp(ctx, d, ox, oy, bk) {
    const p = assets.prop(d.name, bk, 0, d.flip);
    if (!p) return;
    const s = p.sprite;
    ctx.drawImage(s.canvas, Math.round(d.x - ox - s.w / 2), Math.round(d.y - oy - s.h));
  }

  /* ---------------------------------------------------------------- *
   * PER-FRAME DRAW
   * ---------------------------------------------------------------- */

  /** Baked static layer for everything intersecting the view rect. */
  renderStatic(ctx, view) {
    for (const c of this.corridors) {
      if (!overlaps(view, { x: c.ox, y: c.oy, w: c.canvas.width, h: c.canvas.height })) continue;
      ctx.drawImage(c.canvas, c.ox, c.oy);
    }
    for (const entry of this.rooms.values()) {
      const { canvas, ox, oy, room } = entry;
      if (!overlaps(view, { x: ox, y: oy, w: canvas.width, h: canvas.height })) continue;
      ctx.drawImage(canvas, ox, oy);
      if (!room.visited) {
        ctx.fillStyle = "rgba(3,2,8,0.55)";
        ctx.fillRect(room.x, room.y, room.w, room.h);
      }
    }
  }

  /**
   * Props that must participate in depth sorting with entities.
   * @returns {Array<{y:number, draw:Function}>}
   */
  collectDynamic(view, time, out) {
    const bk = this.biome.key;
    const push = (d) => {
      const frames = assets.propFrameCount(d.name);
      const frame = frames > 1 ? Math.floor(time * 8 + (d.x + d.y) * 0.13) % frames : 0;
      const p = assets.prop(d.name, bk, frame, d.flip);
      if (!p) return;
      const s = p.sprite;
      const bx = Math.round(d.x - s.w / 2);
      const by = Math.round(d.y - s.h);
      if (bx + s.w < view.x || bx > view.x + view.w || by + s.h < view.y || by > view.y + view.h) return;
      out.push({ y: d.y, sort: d.tall ? d.y : d.y - 0.5, draw: (c) => c.drawImage(s.canvas, bx, by) });
    };
    for (const entry of this.rooms.values()) {
      if (!overlaps(view, { x: entry.ox, y: entry.oy, w: entry.canvas.width, h: entry.canvas.height })) continue;
      for (const d of entry.dynamics) push(d);
    }
    for (const c of this.corridors) {
      if (!overlaps(view, { x: c.ox, y: c.oy, w: c.canvas.width, h: c.canvas.height })) continue;
      for (const d of c.dynamics) push(d);
    }
    return out;
  }

  /** Lights inside the view, with flicker applied. */
  collectLights(view, time, out) {
    for (const l of this.lights) {
      if (l.x < view.x - l.radius || l.x > view.x + view.w + l.radius) continue;
      if (l.y < view.y - l.radius || l.y > view.y + view.h + l.radius) continue;
      const f = l.flicker ? 0.88 + Math.sin(time * 11 + l.x * 0.7) * 0.07 + Math.sin(time * 23 + l.y) * 0.05 : 1;
      out.push({ x: l.x, y: l.y, color: l.color, radius: l.radius * f });
    }
    return out;
  }

  /** Scene name for the room the player is in — used by the room announce. */
  sceneFor(roomId) {
    return this.rooms.get(roomId)?.scene || null;
  }
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
