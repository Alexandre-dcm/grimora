import { GameLoop } from "./GameLoop.js";
import { InputManager } from "./InputManager.js";
import { Camera } from "./Camera.js";
import { audio } from "./AudioManager.js";
import { Time } from "../utils/Time.js";
import { rng } from "../utils/Random.js";
import { dist, circleOverlap } from "../utils/MathUtils.js";
import { Player } from "../entities/Player.js";
import { Enemy, Boss } from "../entities/Enemy.js";
import { Projectile, Pickup, Chest, WorldInteractable } from "../entities/Projectile.js";
import { ENEMY_DEFS, BOSS_DEFS } from "../data/enemies.js";
import { DungeonGenerator, getRoomAt, resolveCollisions } from "../systems/DungeonGenerator.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { ParticleSystem } from "../systems/ParticleSystem.js";
import { ProgressionSystem } from "../systems/ProgressionSystem.js";
import { statusSystem } from "../systems/StatusEffectSystem.js";
import { chestLoot, shopInventory, generateLootDrop } from "../data/lootTables.js";
import { ROOM_TYPES } from "../data/world.js";
import { UIManager } from "../ui/UIManager.js";
import { getBiomeArt, PALETTE } from "../art/Palette.js";
import { DungeonRenderer } from "../art/render/DungeonRenderer.js";
import { EntityRenderer } from "../art/render/EntityRenderer.js";
import { Lighting } from "../art/render/Lighting.js";
import { TitleScene } from "../art/render/TitleScene.js";
import { FloatingText, Atmosphere } from "../art/render/Vfx.js";
import { crisp } from "../art/render/Draw.js";
import { triggerAttack } from "../art/render/Anim.js";

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.ctx = crisp(canvas.getContext("2d", { alpha: false }));
    this.time = new Time();
    this.camera = new Camera();
    this.input = new InputManager(canvas);
    this.particles = new ParticleSystem();
    this.progression = new ProgressionSystem();
    this.combat = new CombatSystem(this);
    this.ui = new UIManager(uiRoot, this);

    // Presentation layer (ART_BIBLE). None of these hold gameplay state.
    this.dungeonArt = new DungeonRenderer();
    this.fx = new EntityRenderer(this);
    this.lighting = new Lighting();
    this.floats = new FloatingText();
    this.atmosphere = new Atmosphere();
    this.title = new TitleScene();
    this.biomeArt = getBiomeArt(1);
    this._layers = [];
    this._lights = [];
    this._view = { x: 0, y: 0, w: 0, h: 0 };

    this.state = "hub"; // hub | playing | paused | levelup | dead
    this.selectedClass = "warrior";
    this.debug = false;
    this.floor = 1;
    this.dungeon = null;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.chests = [];
    this.interactables = [];
    this.currentRoom = null;
    this.runModifiers = { enemyDamage: 0, enemyHp: 0 };
    this.runSummary = null;
    this.maxComboThisRun = 0;
    this.maxGoldThisRun = 0;
    this.legendariesThisRun = 0;
    this.mythicsThisRun = 0;
    this.fps = 60;
    this._fpsAccum = 0;
    this._fpsFrames = 0;

    audio.setMuted(this.progression.save.settings.muted);

    this.loop = new GameLoop(
      (ts) => this.update(ts),
      () => this.render()
    );

    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
    this.resize();
    this.input.attach();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.camera.setViewSize(this.canvas.width, this.canvas.height);
    // Integer zoom only: a fractional scale would smear the pixel grid
    // (ART_BIBLE §2). ~640 world px across frames a room plus its walls.
    this.camera.zoom = Math.max(1, Math.min(6, Math.round(this.canvas.width / 640)));
    crisp(this.ctx);
  }

  start() {
    this.ui.setMode("hub");
    this.time.start(performance.now());
    this.loop.start();
  }

  startRun(classId = "warrior") {
    audio.resume();
    this.selectedClass = classId;
    this.floor = 1;
    this.runModifiers = { enemyDamage: 0, enemyHp: 0 };
    this.maxComboThisRun = 0;
    this.maxGoldThisRun = 0;
    this.legendariesThisRun = 0;
    this.mythicsThisRun = 0;
    this.runSummary = null;

    const meta = this.progression.getMetaBonuses();
    this.player = new Player(0, 0, classId, meta);
    this.generateFloor();
    this.state = "playing";
    this.ui.setMode("playing");
    this.ui.announce(this.dungeon.biome.displayName, 2.5);
  }

  generateFloor() {
    const gen = new DungeonGenerator(Date.now() ^ (this.floor * 9973));
    this.dungeon = gen.generate(this.floor);
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.chests = [];
    this.interactables = [];
    this.particles.clear();

    this.player.x = this.dungeon.startX;
    this.player.y = this.dungeon.startY;
    this.player.floorDamageTaken = 0;
    this.camera.snapTo(this.player.x, this.player.y);
    this.camera.setBounds(
      this.dungeon.bounds.x,
      this.dungeon.bounds.y,
      this.dungeon.bounds.w,
      this.dungeon.bounds.h
    );

    // Materialize room content (chests / interactables). Enemies spawn on enter.
    for (const room of this.dungeon.rooms) {
      for (const c of room.chests) {
        this.chests.push(new Chest(c.x, c.y, c.type));
      }
      for (const it of room.interactables) {
        this.interactables.push(new WorldInteractable(it.x, it.y, it.kind, it.data || {}));
      }
      room.activated = room.type === "start";
      room.spawned = false;
    }

    // Portal appears when floor cleared — added dynamically
    this.currentRoom = getRoomAt(this.player.x, this.player.y, this.dungeon);
    if (this.currentRoom) this.currentRoom.visited = true;

    // Bake the visual dungeon: tiles, walls, seeded decoration, static lights
    this.biomeArt = getBiomeArt(this.floor);
    this.dungeonArt.build(this.dungeon);
    this.atmosphere.setKind(this.biomeArt.atmosphere);
    this.floats.clear();
  }

  enterRoom(room) {
    if (!room || room.activated) return;
    room.activated = true;
    room.visited = true;
    this.ui.announce((ROOM_TYPES[room.type]?.name || room.type).toUpperCase(), 1.5);

    if (room.spawned) return;
    room.spawned = true;

    if (room.type === "boss") {
      audio.play("boss");
      this.ui.announce(BOSS_DEFS[room.bossId]?.name || "BOSS", 3);
    }

    for (const sp of room.spawns) {
      if (sp.bossId) {
        const def = BOSS_DEFS[sp.bossId];
        const boss = new Boss(def, sp.x, sp.y, this.floor);
        boss.maxHp = Math.round(boss.maxHp * (1 + this.runModifiers.enemyHp));
        boss.hp = boss.maxHp;
        boss.damage *= 1 + this.runModifiers.enemyDamage;
        this.enemies.push(boss);
      } else {
        this.spawnEnemy(sp.enemyId, sp.x, sp.y, sp.elite);
      }
    }

    // Lock room if combat
    if (room.locked && room.spawns.length) {
      room.cleared = false;
    } else {
      room.cleared = true;
    }
  }

  spawnEnemy(id, x, y, eliteId = null) {
    const def = ENEMY_DEFS[id];
    if (!def) return null;
    const e = new Enemy(def, x, y, this.floor, eliteId);
    e.maxHp = Math.round(e.maxHp * (1 + this.runModifiers.enemyHp));
    e.hp = e.maxHp;
    e.damage *= 1 + this.runModifiers.enemyDamage;
    this.enemies.push(e);
    return e;
  }

  spawnAmbush(count = 6) {
    const biome = ((this.floor - 1) % 5) + 1;
    const pool = Object.values(ENEMY_DEFS).filter((e) => e.biomes.includes(biome));
    const list = pool.length ? pool : Object.values(ENEMY_DEFS);
    for (let i = 0; i < count; i++) {
      const def = rng.randomChoice(list);
      const a = rng.randomFloat(0, Math.PI * 2);
      this.spawnEnemy(def.id, this.player.x + Math.cos(a) * 140, this.player.y + Math.sin(a) * 140);
    }
  }

  update(ts) {
    this.time.tick(ts);
    const dt = this.time.delta;

    this._fpsAccum += dt;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsAccum);
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }

    this.input.updateWorldMouse(this.camera);

    // Global keys
    if (this.input.justPressed("debug")) this.debug = !this.debug;

    if (this.state === "playing") {
      this._updatePlaying(dt);
    } else if (this.state === "paused" || this.state === "levelup" || this.state === "inventory" || this.state === "shop") {
      if (this.input.justPressed("pause") || this.input.justPressed("inventory")) {
        if (this.state === "levelup") {
          /* must choose */
        } else {
          this.resume();
        }
      }
    }

    this.ui.update(dt);
    this.input.endFrame();
  }

  _updatePlaying(dt) {
    const p = this.player;
    const input = this.input;

    if (input.justPressed("pause")) {
      this.pause();
      return;
    }
    if (input.justPressed("inventory")) {
      this.state = "inventory";
      this.ui.setMode("inventory");
      return;
    }

    // Consumable hotkeys
    for (let i = 1; i <= 5; i++) {
      if (input.justPressed(`slot${i}`)) {
        const pot = p.inventory.filter((it) => it.slot === "consumable")[i - 1];
        if (pot) {
          p.useConsumable(pot);
          audio.play("heal");
        }
      }
    }

    if (p.dead) {
      this.endRun(false);
      return;
    }

    // Dash
    if (input.justPressed("dash") || input.mouseDown.right) {
      const mv = input.moveVector();
      if (p.tryDash(mv.x, mv.y)) {
        audio.play("dash");
        this.particles.burst(p.x, p.y, 10, "#90caf9", 160, 0.25);
      }
    }

    p.update(dt, input);
    resolveCollisions(p, this.dungeon);
    statusSystem.update(p, dt, (ent, dmg) => {
      ent.takeDamage(dmg, { ignoreDodge: true, iFrames: 0 });
    });

    // Attack
    if (input.mouse.left || input.mouseDown.left) {
      this.combat.playerAttack();
    }

    // Room detection
    const room = getRoomAt(p.x, p.y, this.dungeon);
    if (room && room !== this.currentRoom) {
      this.currentRoom = room;
      this.enterRoom(room);
    } else if (room && !room.activated) {
      this.enterRoom(room);
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      const action = e.update(dt, p, this);
      resolveCollisions(e, this.dungeon);
      if (!action) continue;

      // Presentation only: let the attack clip play for instantaneous attacks
      if (action.attack || action.projectile || action.projectiles) triggerAttack(e);

      if (action.attack && circleOverlap(e.x, e.y, e.attackRange, p.x, p.y, p.radius)) {
        const dealt = p.takeDamage(action.attack.damage);
        if (dealt > 0) {
          audio.play("hurt");
          this.spawnDamageNumber(p.x, p.y - 18, dealt, false);
          this.camera.shake(6);
          if (e.statusOnHit && rng.chance(e.statusChance || 0.3)) {
            statusSystem.apply(p, e.statusOnHit);
          }
          if (p.bonuses.thorns > 0) {
            e.takeDamage(dealt * p.bonuses.thorns);
          }
          if (e.elite?.onHitHeal) e.hp = Math.min(e.maxHp, e.hp + dealt * e.elite.onHitHeal);
        } else if (dealt === -1) {
          this.spawnFloatingText(p.x, p.y - 18, "DODGE", "#81d4fa");
        }
      }

      if (action.projectile) {
        const pr = action.projectile;
        this.projectiles.push(
          Projectile.fromAngle(e.x, e.y, pr.angle, pr.speed, {
            damage: pr.damage,
            radius: pr.radius || 5,
            color: pr.color,
            owner: "enemy",
            splash: pr.splash || 0,
            element: pr.element,
            life: 2.5,
          })
        );
      }
      if (action.projectiles) {
        for (const pr of action.projectiles) {
          this.projectiles.push(
            Projectile.fromAngle(e.x, e.y, pr.angle, pr.speed, {
              damage: pr.damage,
              radius: pr.radius || 5,
              color: pr.color,
              owner: "enemy",
              splash: pr.splash || 0,
              life: 2.5,
            })
          );
        }
      }
      if (action.aoe) {
        const a = action.aoe;
        this.particles.burst(a.x, a.y, 22, PALETTE.l, 180, 0.5, "fire");
        this.fx.shockwave(a.x, a.y, a.radius, PALETTE.o);
        this.fx.impact(a.x, a.y, PALETTE.p, true, 12);
        this.camera.shake(12);
        if (dist(p.x, p.y, a.x, a.y) < a.radius + p.radius) {
          const dealt = p.takeDamage(a.damage);
          if (dealt > 0) this.spawnDamageNumber(p.x, p.y - 18, dealt, false);
        }
      }
      if (action.summon) {
        const count = action.summonCount || 2;
        const pool = Object.keys(ENEMY_DEFS);
        for (let i = 0; i < count; i++) {
          const id = rng.randomChoice(["skeleton", "rat", "bat", "slime", "fire_imp"]);
          if (ENEMY_DEFS[id]) {
            this.spawnEnemy(id, e.x + rng.randomFloat(-40, 40), e.y + rng.randomFloat(-40, 40));
          }
        }
      }
      if (action.auraDamage) {
        p.takeDamage(action.auraDamage, { ignoreDodge: true, iFrames: 0 });
      }
    }

    this.combat.updateProjectiles(dt);

    // Pickups
    const pickupRange = p.base.pickupRadius * (1 + p.bonuses.pickupRadius);
    for (const pk of this.pickups) {
      const collected = pk.update(dt, p, pickupRange);
      if (collected) this._collectPickup(pk);
    }
    this.pickups = this.pickups.filter((pk) => !pk.dead);

    // Interact
    this._updateInteract();

    // Clear rooms
    this._checkRoomClear();

    // Particles, VFX & camera
    this.particles.update(dt);
    this.fx.update(dt);
    this.floats.update(dt);
    this.camera.follow(p.x, p.y, dt);
    this.camera.update(dt);

    this.maxComboThisRun = Math.max(this.maxComboThisRun, p.combo);
    this.maxGoldThisRun = Math.max(this.maxGoldThisRun, p.gold);

    // Portal spawn when all combat rooms cleared
    this._maybeAddPortal();
  }

  _collectPickup(pk) {
    const p = this.player;
    if (pk.kind === "xp") {
      const { gain, leveled } = p.addXp(pk.data.amount || 5);
      audio.play("xp");
      if (leveled > 0) this._onLevelUp(leveled);
    } else if (pk.kind === "gold") {
      const g = p.addGold(pk.data.amount || 1);
      audio.play("coin");
      this.spawnFloatingText(p.x, p.y - 20, `+${g}g`, "gold");
    } else if (pk.kind === "heart") {
      p.heal(pk.data.amount || 15);
      audio.play("heal");
      this.particles.heal(p.x, p.y);
    } else if (pk.kind === "item") {
      const item = pk.data.item;
      if (p.addItem(item)) {
        audio.play("pickup");
        this.spawnFloatingText(p.x, p.y - 24, item.name, "");
        if (item.rarity === "legendary") {
          this.legendariesThisRun++;
          this.progression.noteLegendary();
          this.announce("LEGENDARY!");
        }
        if (item.rarity === "mythic") {
          this.mythicsThisRun++;
          this.progression.noteMythic();
          this.announce("MYTHIC!");
        }
      } else {
        pk.dead = false;
        pk.magnet = false;
        pk.life = 10;
        this.announce("Inventory full!");
      }
    }
  }

  _onLevelUp(count) {
    audio.play("levelup");
    this.particles.levelUp(this.player.x, this.player.y);
    this.camera.shake(10);
    this.state = "levelup";
    this.ui.prepareLevelUp();
    this.ui.setMode("levelup");
    this._pendingLevels = (this._pendingLevels || 0) + count - 1;
  }

  resumeFromLevelUp() {
    if (this._pendingLevels > 0) {
      this._pendingLevels--;
      this.ui.prepareLevelUp();
      this.ui.setMode("levelup");
      return;
    }
    this.state = "playing";
    this.ui.setMode("playing");
  }

  _updateInteract() {
    const p = this.player;
    let nearest = null;
    let nearestD = 48;
    let kind = null;

    for (const c of this.chests) {
      if (c.opened) continue;
      const d = dist(p.x, p.y, c.x, c.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = c;
        kind = "chest";
      }
    }
    for (const it of this.interactables) {
      if (it.used && it.kind !== "portal") continue;
      const d = dist(p.x, p.y, it.x, it.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = it;
        kind = it.kind;
      }
    }

    if (nearest) {
      const labels = {
        chest: "[E] Open Chest",
        shop: "[E] Browse Shop",
        shrine: `[E] ${nearest.data?.name || "Shrine"}`,
        heal_fountain: "[E] Drink",
        event: `[E] ${nearest.data?.name || "Event"}`,
        portal: "[E] Descend",
      };
      this.ui.interactText = labels[kind] || "[E] Interact";
    } else {
      this.ui.interactText = "";
    }

    if (this.input.justPressed("interact") && nearest) {
      this._doInteract(nearest, kind);
    }
  }

  _doInteract(target, kind) {
    const p = this.player;
    if (kind === "chest") {
      if (target.isMimic && !target.opened) {
        target.opened = true;
        this.announce("IT'S A MIMIC!");
        this.spawnEnemy("mimic", target.x, target.y);
        audio.play("boss");
        return;
      }
      target.opened = true;
      p.chestsOpened++;
      audio.play("chest");
      this.particles.burst(target.x, target.y, 30, target.colors[target.type], 180, 0.6);
      this.camera.shake(6);
      const drops = chestLoot(rng, p.getLuck(), this.floor, target.type);
      for (const d of drops) {
        if (d.type === "gold") {
          this.pickups.push(new Pickup(target.x + rng.randomFloat(-20, 20), target.y, "gold", { amount: d.amount }));
        } else {
          this.pickups.push(new Pickup(target.x + rng.randomFloat(-20, 20), target.y + rng.randomFloat(-10, 10), "item", { item: d.item }));
        }
      }
    } else if (kind === "shop") {
      this.ui.shopItems = shopInventory(rng, this.floor, p.getLuck());
      this.state = "shop";
      this.ui.setMode("shop");
    } else if (kind === "shrine") {
      if (target.used) return;
      target.used = true;
      const msg = target.data.apply(p, this, rng);
      this.announce(msg || "Shrine activated");
      audio.play("levelup");
      this.particles.ring(target.x, target.y, target.data.color || "#ab47bc", 50);
    } else if (kind === "heal_fountain") {
      if (target.used) return;
      target.used = true;
      p.heal(p.getMaxHp() * 0.5);
      p.mana = p.getMaxMana();
      audio.play("heal");
      this.particles.heal(p.x, p.y);
      this.announce("Restored");
    } else if (kind === "event") {
      if (target.used) return;
      target.used = true;
      const ev = target.data;
      if (ev.run) ev.run(this);
      else if (ev.id === "gamble") {
        if (p.gold >= 25) {
          p.gold -= 25;
          if (rng.chance(0.45)) {
            const loot = generateLootDrop(rng, p.getLuck() + 0.3, this.floor);
            if (loot?.type === "item") {
              this.pickups.push(new Pickup(target.x, target.y, "item", { item: loot.item }));
              this.announce("YOU WIN!");
            } else {
              p.addGold(80);
              this.announce("JACKPOT GOLD!");
            }
          } else {
            this.announce("You lose...");
            this.spawnAmbush(5);
          }
        } else this.announce("Need 25 gold");
      } else if (ev.id === "sacrifice") {
        const loss = Math.floor(p.getMaxHp() * 0.15);
        p.bonuses.maxHp -= loss;
        p.hp = Math.min(p.hp, p.getMaxHp());
        const loot = generateLootDrop(rng, p.getLuck() + 0.5, this.floor + 2);
        if (loot?.item) this.pickups.push(new Pickup(target.x, target.y, "item", { item: loot.item }));
        this.announce("Blood for power");
      } else if (ev.id === "merchant") {
        this.ui.shopItems = shopInventory(rng, this.floor + 1, p.getLuck() + 0.2);
        this.state = "shop";
        this.ui.setMode("shop");
      }
    } else if (kind === "portal") {
      this.descend();
    }
  }

  _checkRoomClear() {
    const room = this.currentRoom;
    if (!room || room.cleared || !room.locked) return;

    if (room.type === "boss") {
      if (!this.enemies.some((e) => e.isBoss && !e.dead)) {
        room.cleared = true;
        this.player.addXp(20 + this.floor * 5);
      }
      return;
    }

    const aliveInRoom = this.enemies.some(
      (e) =>
        !e.dead &&
        e.x > room.x - 40 &&
        e.x < room.x + room.w + 40 &&
        e.y > room.y - 40 &&
        e.y < room.y + room.h + 40
    );
    if (!aliveInRoom && room.spawned) {
      room.cleared = true;
      this.player.addXp(8 + this.floor * 2);
    }
  }

  _maybeAddPortal() {
    const combatRooms = this.dungeon.rooms.filter((r) =>
      ["combat", "elite", "boss"].includes(r.type)
    );
    const allClear = combatRooms.every((r) => r.cleared || !r.activated);
    const hasPortal = this.interactables.some((i) => i.kind === "portal");
    if (allClear && combatRooms.some((r) => r.activated) && !hasPortal) {
      // Place portal in farthest cleared room or current
      const bossRoom = this.dungeon.rooms.find((r) => r.type === "boss");
      const end = bossRoom || this.dungeon.rooms[this.dungeon.rooms.length - 1];
      this.interactables.push(new WorldInteractable(end.cx, end.cy + 40, "portal"));
      this.announce("A portal opens...");
      audio.play("levelup");

      if (this.player.floorDamageTaken === 0 && combatRooms.some((r) => r.activated)) {
        this.progression.save.stats.untouchableFloors++;
        this.progression.persist();
      }
    }
  }

  descend() {
    // Floor clear rewards
    this.player.addXp(30 + this.floor * 10);
    this.player.addGold(15 + this.floor * 5);
    this.floor++;
    this.announce(`FLOOR ${this.floor}`);
    this.generateFloor();
    this.ui.announce(this.dungeon.biome.displayName, 2.5);
  }

  onEnemyKilled(enemy) {
    const p = this.player;
    p.registerKill();
    audio.play("death");
    // Death puff in the creature's own colour, so kills read at a glance (§12)
    this.particles.death(enemy.x, enemy.y, enemy.color, enemy.isBoss || enemy.isElite);
    this.particles.blood(enemy.x, enemy.y, Math.PI * 1.5, enemy.isBoss ? 16 : 6);
    if (enemy.isBoss || enemy.isElite) {
      this.fx.shockwave(enemy.x, enemy.y, enemy.isBoss ? 160 : 80, enemy.color);
    }
    this.camera.shake(enemy.isBoss ? 16 : enemy.isElite ? 8 : 3);
    this.time.freeze(enemy.isBoss ? 0.12 : 0.04);

    // XP orbs
    const xpAmount = enemy.xp;
    const orbs = enemy.isBoss ? 8 : enemy.isElite ? 4 : 2;
    for (let i = 0; i < orbs; i++) {
      this.pickups.push(
        new Pickup(
          enemy.x + rng.randomFloat(-15, 15),
          enemy.y + rng.randomFloat(-15, 15),
          "xp",
          { amount: Math.ceil(xpAmount / orbs) }
        )
      );
    }

    // Gold
    const [gmin, gmax] = enemy.goldRange || [1, 3];
    if (rng.chance(0.7) || enemy.isElite || enemy.isBoss) {
      this.pickups.push(
        new Pickup(enemy.x, enemy.y, "gold", {
          amount: rng.randomInt(gmin, gmax) * (enemy.lootBonus || 1),
        })
      );
    }

    // Loot
    const luck = p.getLuck() + (enemy.isElite ? 0.2 : 0) + (enemy.isBoss ? 0.5 : 0);
    if (enemy.isBoss || enemy.isElite || rng.chance(0.12 * enemy.lootBonus)) {
      const drop = generateLootDrop(rng, luck, this.floor);
      if (drop?.type === "item") {
        this.pickups.push(new Pickup(enemy.x, enemy.y - 10, "item", { item: drop.item }));
      } else if (drop?.type === "gold") {
        this.pickups.push(new Pickup(enemy.x, enemy.y, "gold", { amount: drop.amount }));
      }
    }

    if (rng.chance(0.08)) {
      this.pickups.push(new Pickup(enemy.x, enemy.y, "heart", { amount: 12 }));
    }

    // Elite explode
    if (enemy.elite?.onDeathExplode) {
      this.combat._explode(
        enemy.x,
        enemy.y,
        enemy.elite.explodeDamage || 25,
        enemy.elite.explodeRadius || 80,
        "#ff6d00",
        p
      );
    }

    // Kill explode upgrade
    if (p.bonuses.killExplode && rng.chance(p.bonuses.killExplode)) {
      this.combat._explode(enemy.x, enemy.y, 20 + p.level * 2, 60, "#ffab40", p);
    }

    // Shatter unique
    if (p.getWeapon()?.uniqueId === "shatter" && statusSystem.has(enemy, "freeze")) {
      this.combat._explode(enemy.x, enemy.y, 30, 55, "#4fc3f7", p);
    }

    if (enemy.isBoss) {
      p.bossesKilled++;
      this.announce(`${enemy.name} DEFEATED`);
      // Guaranteed unique-ish loot
      const drops = chestLoot(rng, luck + 0.4, this.floor, "legendary");
      for (const d of drops) {
        if (d.type === "item") this.pickups.push(new Pickup(enemy.x, enemy.y, "item", { item: d.item }));
        else this.pickups.push(new Pickup(enemy.x, enemy.y, "gold", { amount: d.amount }));
      }
    }

    const tier = p.getComboTier();
    if (tier.name && (p.combo === 5 || p.combo === 10 || p.combo === 20 || p.combo === 50)) {
      this.ui.showCombo(tier.name);
    }

    // Souls trickle
    p.soulsEarned += enemy.isBoss ? 8 : enemy.isElite ? 3 : 1;
  }

  announce(text) {
    this.ui.announce(text);
  }

  /** Combat numbers are drawn in the world with the bitmap font (§12). */
  spawnDamageNumber(wx, wy, amount, crit, element = "none") {
    this.floats.damage(wx, wy, amount, { crit, element });
  }

  spawnFloatingText(wx, wy, text, cls) {
    const color =
      cls === "gold" ? PALETTE.t :
      cls === "crit" ? PALETTE.p :
      cls === "heal" ? PALETTE.z :
      PALETTE["9"];
    this.floats.spawn(wx, wy, text, { color, scale: 2 });
  }

  clampEntity(e) {
    resolveCollisions(e, this.dungeon);
  }

  pause() {
    this.state = "paused";
    this.ui.setMode("pause");
  }

  resume() {
    this.state = "playing";
    this.ui.setMode("playing");
  }

  endRun(won) {
    const p = this.player;
    const souls = this.progression.addSouls(
      Math.round(p.soulsEarned + this.floor * 5 + p.bossesKilled * 15 + p.level * 2)
    );
    this.runSummary = {
      won,
      floor: this.floor,
      kills: p.kills,
      gold: this.maxGoldThisRun,
      damageDealt: p.damageDealt,
      itemsFound: p.itemsFound,
      bossesKilled: p.bossesKilled,
      souls,
    };
    this.progression.recordRun({
      kills: p.kills,
      chestsOpened: p.chestsOpened,
      bossesKilled: p.bossesKilled,
      maxCombo: this.maxComboThisRun,
      floor: this.floor,
      maxGold: this.maxGoldThisRun,
      legendariesFound: this.legendariesThisRun,
      mythicsFound: this.mythicsThisRun,
      untouchable: false,
    });
    this.state = "dead";
    this.ui.setMode("summary");
  }

  getDebugText() {
    const p = this.player;
    return [
      `FPS: ${this.fps}`,
      `Entities: ${this.enemies.length + this.projectiles.length + this.pickups.length}`,
      `Enemies: ${this.enemies.filter((e) => !e.dead).length}`,
      `Particles: ${this.particles.count}`,
      `Player: ${p ? `${p.x.toFixed(0)}, ${p.y.toFixed(0)}` : "-"}`,
      `Floor: ${this.floor}`,
      `Room: ${this.currentRoom?.type || "-"} (${this.currentRoom?.id || "-"})`,
      `Projectiles: ${this.projectiles.length}`,
    ].join("\n");
  }

  /**
   * Frame layout (ART_BIBLE §11 draw order):
   *   baked dungeon -> depth-sorted props & actors -> projectiles -> particles
   *   -> impacts -> combat text -> lightmap -> atmosphere.
   * Every pass runs with smoothing disabled and integer destinations.
   */
  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = this.time.elapsed ?? performance.now() / 1000;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    crisp(ctx);

    if (this.state === "hub" || this.state === "dead" || !this.dungeon) {
      this.title.render(ctx, w, h, performance.now() / 1000);
      return;
    }

    ctx.fillStyle = this.biomeArt.ambient;
    ctx.fillRect(0, 0, w, h);

    const view = this._view;
    const z = this.camera.zoom;
    view.x = this.camera.x - 32;
    view.y = this.camera.y - 32;
    view.w = w / z + 64;
    view.h = h / z + 64;

    this.camera.apply(ctx);
    crisp(ctx);

    this.dungeonArt.renderStatic(ctx, view);

    // Depth pass: environment props and actors interleaved by ground line
    const layers = this._layers;
    layers.length = 0;
    this.dungeonArt.collectDynamic(view, t, layers);
    this.fx.collect(view, this.time.delta, layers);
    layers.sort(sortByDepth);
    for (const l of layers) l.draw(ctx);

    this.fx.renderProjectiles(ctx, view);
    this.particles.render(ctx);
    this.fx.renderImpacts(ctx);
    this.floats.render(ctx);

    // Lighting and atmosphere in screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const lights = this._lights;
    lights.length = 0;
    this.dungeonArt.collectLights(view, t, lights);
    this.fx.collectLights(view, lights);
    this.lighting.render(ctx, { x: this.camera.x, y: this.camera.y, zoom: z }, lights, this.biomeArt, w, h);
    this.atmosphere.render(ctx, w, h, t);
  }
}

function sortByDepth(a, b) {
  return a.sort - b.sort;
}
