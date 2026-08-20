import { Random } from "../utils/Random.js";
import { ROOM_TYPES, getBiome, SHRINE_TYPES, EVENT_TYPES } from "../data/world.js";
import { getEnemiesForFloor, BOSS_DEFS, ELITE_MODIFIERS } from "../data/enemies.js";

const TILE = 32;
const ROOM_W = 18;
const ROOM_H = 12;

export class DungeonGenerator {
  constructor(seed = Date.now()) {
    this.rng = new Random(seed);
  }

  generate(floor = 1) {
    const biome = getBiome(floor);
    const isBossFloor = floor % 3 === 0;
    const roomCount = isBossFloor ? this.rng.randomInt(5, 7) : this.rng.randomInt(7, 11);

    // Graph of rooms on a grid
    const graph = new Map();
    const placed = [];
    const start = { gx: 0, gy: 0 };
    placed.push(start);
    graph.set(this._key(0, 0), { gx: 0, gy: 0, type: "start", links: [] });

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (placed.length < roomCount) {
      const from = this.rng.randomChoice(placed);
      const dir = this.rng.randomChoice(dirs);
      const nx = from.gx + dir.dx;
      const ny = from.gy + dir.dy;
      const key = this._key(nx, ny);
      if (graph.has(key)) continue;
      const node = { gx: nx, gy: ny, type: "combat", links: [] };
      graph.set(key, node);
      placed.push({ gx: nx, gy: ny });
      // Link
      const fromNode = graph.get(this._key(from.gx, from.gy));
      fromNode.links.push({ gx: nx, gy: ny });
      node.links.push({ gx: from.gx, gy: from.gy });
    }

    // Assign room types along a path from start to farthest
    const order = this._bfsOrder(graph, 0, 0);
    const types = this._pickRoomTypes(order.length, isBossFloor, floor);

    order.forEach((key, i) => {
      graph.get(key).type = types[i];
    });

    // Secret room chance
    if (this.rng.chance(0.35)) {
      const anchor = this.rng.randomChoice(placed);
      for (const dir of this.rng.shuffle(dirs)) {
        const sx = anchor.gx + dir.dx;
        const sy = anchor.gy + dir.dy;
        const sk = this._key(sx, sy);
        if (!graph.has(sk)) {
          const secret = { gx: sx, gy: sy, type: "secret", links: [], secret: true };
          graph.set(sk, secret);
          const a = graph.get(this._key(anchor.gx, anchor.gy));
          a.links.push({ gx: sx, gy: sy, secret: true });
          secret.links.push({ gx: anchor.gx, gy: anchor.gy });
          placed.push({ gx: sx, gy: sy });
          break;
        }
      }
    }

    // Build world geometry
    const rooms = [];
    let minGX = Infinity, minGY = Infinity, maxGX = -Infinity, maxGY = -Infinity;
    for (const n of graph.values()) {
      minGX = Math.min(minGX, n.gx);
      minGY = Math.min(minGY, n.gy);
      maxGX = Math.max(maxGX, n.gx);
      maxGY = Math.max(maxGY, n.gy);
    }

    const gapX = (ROOM_W + 4) * TILE;
    const gapY = (ROOM_H + 4) * TILE;

    for (const n of graph.values()) {
      const wx = (n.gx - minGX) * gapX + 2 * TILE;
      const wy = (n.gy - minGY) * gapY + 2 * TILE;
      const room = this._buildRoom(n, wx, wy, floor, biome, isBossFloor);
      rooms.push(room);
    }

    // Corridors between linked rooms
    const corridors = [];
    const seen = new Set();
    for (const n of graph.values()) {
      const roomA = rooms.find((r) => r.gx === n.gx && r.gy === n.gy);
      for (const link of n.links) {
        const ck = [this._key(n.gx, n.gy), this._key(link.gx, link.gy)].sort().join("|");
        if (seen.has(ck)) continue;
        seen.add(ck);
        const roomB = rooms.find((r) => r.gx === link.gx && r.gy === link.gy);
        corridors.push(this._buildCorridor(roomA, roomB));
      }
    }

    // Cut door openings so corridors are walkable
    this._cutDoors(rooms, corridors);

    const startRoom = rooms.find((r) => r.type === "start");
    const bounds = this._calcBounds(rooms, corridors);

    return {
      floor,
      biome,
      rooms,
      corridors,
      bounds,
      seed: this.rng.seed,
      startX: startRoom.cx,
      startY: startRoom.cy,
      isBossFloor,
    };
  }

  _key(gx, gy) {
    return `${gx},${gy}`;
  }

  _bfsOrder(graph, sx, sy) {
    const start = this._key(sx, sy);
    const order = [];
    const visited = new Set([start]);
    const q = [start];
    while (q.length) {
      const k = q.shift();
      order.push(k);
      const n = graph.get(k);
      for (const l of n.links) {
        const lk = this._key(l.gx, l.gy);
        if (!visited.has(lk)) {
          visited.add(lk);
          q.push(lk);
        }
      }
    }
    return order;
  }

  _pickRoomTypes(count, isBossFloor, floor) {
    const types = ["start"];
    const pool = ["combat", "combat", "combat", "elite", "treasure", "shop", "shrine", "healing", "event"];
    for (let i = 1; i < count - 1; i++) {
      types.push(this.rng.randomChoice(pool));
    }
    // Ensure at least one treasure and variety
    if (count > 4 && !types.includes("treasure")) types[Math.floor(count / 2)] = "treasure";
    if (count > 5 && !types.includes("elite")) types[count - 2] = "elite";
    types.push(isBossFloor || floor % 3 === 0 ? "boss" : "combat");
    // Last room before end often has portal potential — mark end
    return types.slice(0, count);
  }

  _buildRoom(node, wx, wy, floor, biome, isBossFloor) {
    const w = (node.type === "boss" ? ROOM_W + 4 : ROOM_W) * TILE;
    const h = (node.type === "boss" ? ROOM_H + 2 : ROOM_H) * TILE;
    const x = wx;
    const y = wy;
    const room = {
      id: this._key(node.gx, node.gy),
      gx: node.gx,
      gy: node.gy,
      type: node.type,
      x,
      y,
      w,
      h,
      cx: x + w / 2,
      cy: y + h / 2,
      cleared: node.type === "start" || node.type === "shop" || node.type === "healing" || node.type === "shrine" || node.type === "treasure" || node.type === "event" || node.type === "secret",
      visited: false,
      doors: node.links,
      secret: !!node.secret,
      walls: [],
      obstacles: [],
      spawns: [],
      interactables: [],
      chests: [],
      locked: node.type === "combat" || node.type === "elite" || node.type === "boss",
    };

    // Border walls — door gaps carved after corridors are known (see finalizeDoors)
    const thick = 16;
    room.wallThickness = thick;
    room.walls = [
      { x: x, y: y, w, h: thick, side: "top" },
      { x: x, y: y + h - thick, w, h: thick, side: "bottom" },
      { x: x, y: y, w: thick, h, side: "left" },
      { x: x + w - thick, y: y, w: thick, h, side: "right" },
    ];

    // Interior obstacles (not in start/boss/shop)
    if (["combat", "elite", "event"].includes(node.type)) {
      const count = this.rng.randomInt(1, 4);
      for (let i = 0; i < count; i++) {
        room.obstacles.push({
          x: x + this.rng.randomInt(60, w - 90),
          y: y + this.rng.randomInt(60, h - 90),
          w: this.rng.randomInt(28, 50),
          h: this.rng.randomInt(28, 50),
        });
      }
    }

    // Content
    this._populateRoom(room, floor, biome);
    return room;
  }

  _populateRoom(room, floor, biome) {
    const enemyPool = getEnemiesForFloor(floor);
    const rng = this.rng;

    if (room.type === "combat") {
      const n = rng.randomInt(4, 7 + Math.min(5, floor));
      for (let i = 0; i < n; i++) {
        room.spawns.push({
          enemyId: rng.randomChoice(enemyPool).id,
          x: room.cx + rng.randomFloat(-room.w * 0.3, room.w * 0.3),
          y: room.cy + rng.randomFloat(-room.h * 0.3, room.h * 0.3),
          elite: rng.chance(0.04 + floor * 0.01) ? rng.randomChoice(Object.keys(ELITE_MODIFIERS)) : null,
        });
      }
    } else if (room.type === "elite") {
      const base = rng.randomChoice(enemyPool.filter((e) => e.hp >= 40) || enemyPool);
      room.spawns.push({
        enemyId: base.id,
        x: room.cx,
        y: room.cy,
        elite: rng.randomChoice(Object.keys(ELITE_MODIFIERS)),
      });
      for (let i = 0; i < 3; i++) {
        room.spawns.push({
          enemyId: rng.randomChoice(enemyPool).id,
          x: room.cx + rng.randomFloat(-80, 80),
          y: room.cy + rng.randomFloat(-80, 80),
          elite: null,
        });
      }
    } else if (room.type === "boss") {
      const bosses = Object.values(BOSS_DEFS);
      const biomeId = ((floor - 1) % 5) + 1;
      const boss = bosses.find((b) => b.floor === biomeId) || bosses[Math.min(bosses.length - 1, Math.floor((floor - 1) / 3) % bosses.length)];
      room.spawns.push({ bossId: boss.id, x: room.cx, y: room.cy - 40 });
      room.bossId = boss.id;
    } else if (room.type === "treasure" || room.type === "secret") {
      const chestType = room.type === "secret" ? (rng.chance(0.3) ? "legendary" : "rare") : rng.chance(0.15) ? "rare" : "normal";
      room.chests.push({ x: room.cx, y: room.cy, type: rng.chance(0.08) ? "mimic" : chestType });
    } else if (room.type === "shop") {
      room.interactables.push({ kind: "shop", x: room.cx, y: room.cy });
    } else if (room.type === "shrine") {
      const shrine = rng.randomChoice(SHRINE_TYPES);
      room.interactables.push({ kind: "shrine", x: room.cx, y: room.cy, data: shrine });
    } else if (room.type === "healing") {
      room.interactables.push({ kind: "heal_fountain", x: room.cx, y: room.cy });
    } else if (room.type === "event") {
      const ev = rng.randomChoice(EVENT_TYPES);
      room.interactables.push({ kind: "event", x: room.cx, y: room.cy, data: ev });
    }

    // Occasional chest in combat rooms
    if (room.type === "combat" && rng.chance(0.2)) {
      room.chests.push({ x: room.cx + 60, y: room.cy - 40, type: "normal" });
    }
  }

  _cutDoors(rooms, corridors) {
    const DOOR = 60;
    for (const room of rooms) {
      const openings = [];
      for (const c of corridors) {
        if (c.from !== room.id && c.to !== room.id) continue;
        const otherId = c.from === room.id ? c.to : c.from;
        const other = rooms.find((r) => r.id === otherId);
        if (!other) continue;
        const dx = other.cx - room.cx;
        const dy = other.cy - room.cy;
        if (Math.abs(dx) >= Math.abs(dy)) {
          openings.push({ side: dx > 0 ? "right" : "left", center: room.cy });
        } else {
          openings.push({ side: dy > 0 ? "bottom" : "top", center: room.cx });
        }
      }

      const newWalls = [];
      for (const wall of room.walls) {
        const ops = openings.filter((o) => o.side === wall.side);
        if (!ops.length) {
          newWalls.push(wall);
          continue;
        }
        if (wall.side === "top" || wall.side === "bottom") {
          let segments = [{ x: wall.x, w: wall.w }];
          for (const op of ops) {
            const next = [];
            for (const seg of segments) {
              const doorX = op.center - DOOR / 2;
              const doorR = op.center + DOOR / 2;
              const leftEnd = Math.max(seg.x, Math.min(seg.x + seg.w, doorX));
              const rightStart = Math.max(seg.x, Math.min(seg.x + seg.w, doorR));
              if (leftEnd > seg.x + 1) next.push({ x: seg.x, w: leftEnd - seg.x });
              if (seg.x + seg.w > rightStart + 1) next.push({ x: rightStart, w: seg.x + seg.w - rightStart });
            }
            segments = next;
          }
          for (const seg of segments) {
            if (seg.w > 4) newWalls.push({ x: seg.x, y: wall.y, w: seg.w, h: wall.h, side: wall.side });
          }
        } else {
          let segments = [{ y: wall.y, h: wall.h }];
          for (const op of ops) {
            const next = [];
            for (const seg of segments) {
              const doorY = op.center - DOOR / 2;
              const doorB = op.center + DOOR / 2;
              const topEnd = Math.max(seg.y, Math.min(seg.y + seg.h, doorY));
              const botStart = Math.max(seg.y, Math.min(seg.y + seg.h, doorB));
              if (topEnd > seg.y + 1) next.push({ y: seg.y, h: topEnd - seg.y });
              if (seg.y + seg.h > botStart + 1) next.push({ y: botStart, h: seg.y + seg.h - botStart });
            }
            segments = next;
          }
          for (const seg of segments) {
            if (seg.h > 4) newWalls.push({ x: wall.x, y: seg.y, w: wall.w, h: seg.h, side: wall.side });
          }
        }
      }
      room.walls = newWalls;
    }
  }

  _buildCorridor(a, b) {
    const thick = 56;
    const segments = [];
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    if (Math.abs(dx) >= Math.abs(dy)) {
      // Horizontal
      segments.push({
        x: Math.min(a.cx, b.cx) - thick / 2,
        y: a.cy - thick / 2,
        w: Math.abs(a.cx - b.cx) + thick,
        h: thick,
      });
    } else {
      // Vertical
      segments.push({
        x: a.cx - thick / 2,
        y: Math.min(a.cy, b.cy) - thick / 2,
        w: thick,
        h: Math.abs(a.cy - b.cy) + thick,
      });
    }
    return { segments, from: a.id, to: b.id };
  }

  _calcBounds(rooms, corridors) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rooms) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    }
    for (const c of corridors) {
      for (const s of c.segments) {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + s.w);
        maxY = Math.max(maxY, s.y + s.h);
      }
    }
    const pad = 64;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
}

export function pointInRoom(px, py, room) {
  return px >= room.x && px <= room.x + room.w && py >= room.y && py <= room.y + room.h;
}

export function getRoomAt(px, py, dungeon) {
  return dungeon.rooms.find((r) => pointInRoom(px, py, r)) || null;
}

export function resolveCollisions(entity, dungeon) {
  if (!dungeon) return;

  if (entity.flying || entity.phasing) {
    const b = dungeon.bounds;
    entity.x = Math.max(b.x + 20, Math.min(b.x + b.w - 20, entity.x));
    entity.y = Math.max(b.y + 20, Math.min(b.y + b.h - 20, entity.y));
    return;
  }

  const r = entity.radius;

  // Push out of solid walls/obstacles
  for (const room of dungeon.rooms) {
    for (const s of room.walls) {
      _circleRectPush(entity, r, s);
    }
    for (const s of room.obstacles) {
      _circleRectPush(entity, r, s);
    }
  }

  // Soft world bounds
  const b = dungeon.bounds;
  entity.x = Math.max(b.x + r, Math.min(b.x + b.w - r, entity.x));
  entity.y = Math.max(b.y + r, Math.min(b.y + b.h - r, entity.y));
}

function _circleRectPush(entity, r, s) {
  const nearestX = Math.max(s.x, Math.min(entity.x, s.x + s.w));
  const nearestY = Math.max(s.y, Math.min(entity.y, s.y + s.h));
  let dx = entity.x - nearestX;
  let dy = entity.y - nearestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return;
  if (d2 < 0.0001) {
    // Center inside rect — push via smallest overlap
    const left = entity.x - s.x;
    const right = s.x + s.w - entity.x;
    const top = entity.y - s.y;
    const bottom = s.y + s.h - entity.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) entity.x = s.x - r;
    else if (m === right) entity.x = s.x + s.w + r;
    else if (m === top) entity.y = s.y - r;
    else entity.y = s.y + s.h + r;
    return;
  }
  const d = Math.sqrt(d2);
  const push = r - d;
  entity.x += (dx / d) * push;
  entity.y += (dy / d) * push;
}
