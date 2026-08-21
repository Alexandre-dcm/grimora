import { clamp, normalize, angle } from "../utils/MathUtils.js";
import { WEAPON_DEFS } from "../data/items.js";
import { CLASSES } from "../data/upgrades.js";
import { generateWeapon, generateConsumable } from "../data/lootTables.js";
import { rng } from "../utils/Random.js";

const EQUIP_SLOTS = ["weapon", "helmet", "chest", "gloves", "boots", "ring1", "ring2", "amulet"];

export class Player {
  constructor(x, y, classId = "warrior", meta = {}) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.classId = classId;
    this.classDef = CLASSES[classId] || CLASSES.warrior;

    this.base = {
      maxHp: this.classDef.stats.maxHp,
      maxMana: this.classDef.stats.maxMana,
      maxStamina: this.classDef.stats.maxStamina,
      moveSpeed: 165 * (this.classDef.stats.moveSpeed || 1),
      damageMult: this.classDef.stats.damageMult || 1,
      armor: this.classDef.stats.armor || 0,
      critChance: this.classDef.stats.critChance || 0.05,
      critMult: 1.75 + (this.classDef.stats.critMult || 0),
      dodge: this.classDef.stats.dodge || 0,
      lifeSteal: 0,
      xpGain: 1,
      goldFind: 1,
      lootLuck: 0,
      cooldownReduction: 0,
      projectileCount: 0,
      projectileSize: this.classDef.stats.projectileSize || 0,
      fireDamage: 0,
      iceDamage: 0,
      lightningDamage: 0,
      poisonDamage: 0,
      rangeMult: 1,
      knockbackMult: 1,
      chain: 0,
      statusChance: 0,
      armorPen: 0,
      hpRegen: 0,
      manaRegen: classId === "mage" ? 8 : 4,
      staminaRegen: 28,
      pickupRadius: 48,
      dashCdr: classId === "rogue" ? 0.2 : 0,
      thorns: 0,
      execute: 0,
      killExplode: 0,
      burnSpread: false,
      missingHpDamage: false,
      overhealShield: false,
      comboPower: 0,
      bonusSlow: false,
    };

    // Meta progression
    this.base.maxHp *= 1 + (meta.hpBonus || 0);
    this.base.damageMult *= 1 + (meta.damageBonus || 0);
    this.base.lootLuck += meta.luckBonus || 0;
    this.base.xpGain *= 1 + (meta.xpBonus || 0);
    this.base.goldFind *= 1 + (meta.goldBonus || 0);
    this.base.moveSpeed *= 1 + (meta.speedBonus || 0);
    this.base.armor += meta.armorBonus || 0;

    this.bonuses = {
      maxHp: 0, maxMana: 0, damageMult: 0, attackSpeed: 0, armor: 0,
      critChance: 0, critMult: 0, dodge: 0, lifeSteal: 0, moveSpeed: 0,
      xpGain: 0, goldFind: 0, lootLuck: 0, cooldownReduction: 0,
      projectileCount: 0, projectileSize: 0, fireDamage: 0, iceDamage: 0,
      lightningDamage: 0, poisonDamage: 0, rangeMult: 0, knockbackMult: 0,
      chain: 0, statusChance: 0, armorPen: 0, hpRegen: 0, dashCdr: 0,
      thorns: 0, execute: 0, killExplode: 0, burnSpread: false,
      missingHpDamage: false, overhealShield: false, comboPower: 0,
      bonusSlow: false, pickupRadius: 0,
    };

    this.equipment = Object.fromEntries(EQUIP_SLOTS.map((s) => [s, null]));
    this.inventory = [];
    this.inventorySize = 24;

    this.hp = this.getMaxHp();
    this.mana = this.getMaxMana();
    this.stamina = this.getMaxStamina();
    this.shield = 0;
    this.level = 1;
    this.xp = 0;
    this.xpToLevel = 40;
    this.gold = 0;
    this.soulsEarned = 0;

    this.aimAngle = 0;
    this.facing = 1;
    this.attackTimer = 0;
    this.attackAnim = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDuration = 0.18;
    this.dashSpeed = 420;
    this.dashDir = { x: 0, y: 0 };
    this.iFrames = 0;
    this.hurtFlash = 0;
    this.dead = false;
    this.reviveUsed = false;
    this.hasRevive = !!meta.revive;

    this.buffs = [];
    this.statuses = [];
    this.vx = 0;
    this.vy = 0;

    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.itemsFound = 0;
    this.bossesKilled = 0;
    this.chestsOpened = 0;
    this.floorDamageTaken = 0;

    // Starting gear
    const weapon = generateWeapon(rng, 0, this.classDef.startingWeapon);
    weapon.rarity = "common";
    weapon.rarityColor = "#b0b0b0";
    weapon.rarityName = "Common";
    this.equip(weapon);

    const potions = 1 + (meta.startingPotions || 0);
    for (let i = 0; i < potions; i++) {
      this.addItem(generateConsumable(rng, "health_potion"));
    }
  }

  getMaxHp() {
    let v = this.base.maxHp + this.bonuses.maxHp + this._equipStat("maxHp");
    return Math.max(1, Math.round(v));
  }

  getMaxMana() {
    return Math.max(1, Math.round(this.base.maxMana + this.bonuses.maxMana + this._equipStat("maxMana") + this._equipStat("manaBonus")));
  }

  getMaxStamina() {
    return Math.round(this.base.maxStamina);
  }

  getMoveSpeed() {
    let m = this.base.moveSpeed * (1 + this.bonuses.moveSpeed + this._equipStat("moveSpeed"));
    m *= 1 - this._equipStat("movePenalty");
    m *= this._buffMult("moveSpeed");
    if (this.dashTimer > 0) return this.dashSpeed;
    return m * this._statusSlow();
  }

  getDamageMult() {
    let d = this.base.damageMult + this.bonuses.damageMult + this._equipStat("damageMult") + this._equipStat("damageBonus");
    d *= this._buffMult("damageMult");
    if (this.bonuses.missingHpDamage || this.base.missingHpDamage) {
      const missing = 1 - this.hp / this.getMaxHp();
      d += missing * 0.5;
    }
    const comboBonus = this.getComboTier().damage * (1 + (this.bonuses.comboPower || 0));
    d += comboBonus;
    return d;
  }

  getArmor() {
    return this.base.armor + this.bonuses.armor + this._equipStat("armor") + this._equipStat("baseArmor");
  }

  getCritChance() {
    return clamp(
      this.base.critChance + this.bonuses.critChance + this._equipStat("critChance") + (this.equipment.weapon?.stats.critChance || 0),
      0,
      0.75
    );
  }

  getCritMult() {
    return this.base.critMult + this.bonuses.critMult + this._equipStat("critMult") + this._equipStat("critDamage") + (this.equipment.weapon?.stats.critMult || 0) - 1.75;
  }

  getDodge() {
    return clamp(this.base.dodge + this.bonuses.dodge + this._equipStat("dodge") + this._equipStat("baseDodge"), 0, 0.5);
  }

  getLifeSteal() {
    return this.base.lifeSteal + this.bonuses.lifeSteal + this._equipStat("lifeSteal") + (this.equipment.weapon?.stats.lifeSteal || 0);
  }

  getLuck() {
    return this.base.lootLuck + this.bonuses.lootLuck + this._equipStat("lootLuck");
  }

  getWeapon() {
    return this.equipment.weapon;
  }

  getAttackSpeed() {
    const w = this.getWeapon();
    if (!w) return 1;
    return w.stats.attackSpeed * (1 + this.bonuses.attackSpeed + this._equipStat("attackSpeed") + this._equipStat("attackSpeedBonus")) * this._buffMult("attackSpeed");
  }

  _equipStat(key) {
    let sum = 0;
    for (const slot of EQUIP_SLOTS) {
      const item = this.equipment[slot];
      if (item?.stats?.[key]) sum += item.stats[key];
    }
    return sum;
  }

  _buffMult(key) {
    let m = 1;
    for (const b of this.buffs) {
      if (b.stats[key]) m += b.stats[key];
    }
    return m;
  }

  _statusSlow() {
    if (!this.statuses?.length) return 1;
    let slow = 0;
    for (const s of this.statuses) {
      if (s.id === "stun") return 0;
      if (s.id === "freeze" || s.id === "slow") slow = Math.max(slow, 0.4);
    }
    return Math.max(0.3, 1 - slow);
  }

  addBuff(id, stats, duration) {
    this.buffs = this.buffs.filter((b) => b.id !== id);
    this.buffs.push({ id, stats, timeLeft: duration });
  }

  heal(amount) {
    const max = this.getMaxHp();
    const before = this.hp;
    this.hp = Math.min(max, this.hp + amount);
    const healed = this.hp - before;
    const overflow = amount - healed;
    if (overflow > 0 && (this.bonuses.overhealShield || this.base.overhealShield)) {
      this.shield = Math.min(max * 0.5, this.shield + overflow);
    }
    return healed;
  }

  takeDamage(raw, opts = {}) {
    if (this.dead || this.iFrames > 0) return 0;
    if (!opts.ignoreDodge && rng.chance(this.getDodge())) {
      return -1; // dodged
    }
    let dmg = raw;
    if (!opts.ignoreArmor) {
      const armor = this.getArmor();
      dmg *= 100 / (100 + armor * 4);
    }
    if (this.classId === "warrior") dmg *= 0.9;
    dmg = Math.max(1, Math.round(dmg));

    if (this.shield > 0) {
      const abs = Math.min(this.shield, dmg);
      this.shield -= abs;
      dmg -= abs;
    }
    this.hp -= dmg;
    this.damageTaken += dmg;
    this.floorDamageTaken += dmg;
    this.hurtFlash = 0.15;
    this.iFrames = opts.iFrames ?? 0.35;
    this.combo = Math.floor(this.combo * 0.5);

    if (this.hp <= 0) {
      if (this.hasRevive && !this.reviveUsed) {
        this.reviveUsed = true;
        this.hp = 1;
        this.iFrames = 2;
        return dmg;
      }
      this.hp = 0;
      this.dead = true;
    }
    return dmg;
  }

  addXp(amount) {
    const gain = Math.round(amount * (this.base.xpGain + this.bonuses.xpGain) * this._buffMult("xpGain") * (1 + this.getComboTier().xp));
    this.xp += gain;
    let leveled = 0;
    while (this.xp >= this.xpToLevel) {
      this.xp -= this.xpToLevel;
      this.level++;
      leveled++;
      this.xpToLevel = Math.round(40 * Math.pow(1.25, this.level - 1));
      this.heal(this.getMaxHp() * 0.15);
    }
    return { gain, leveled };
  }

  addGold(amount) {
    const gain = Math.round(amount * (this.base.goldFind + this.bonuses.goldFind) * (1 + this.getComboTier().gold));
    this.gold += gain;
    return gain;
  }

  registerKill() {
    this.kills++;
    this.combo++;
    this.comboTimer = 3.5;
  }

  getComboTier() {
    const c = this.combo;
    const power = 1 + (this.bonuses.comboPower || 0);
    if (c >= 50) return { name: "MASSACRE", damage: 0.35 * power, xp: 0.4 * power, gold: 0.4 * power, color: "#ff1744" };
    if (c >= 20) return { name: "UNSTOPPABLE", damage: 0.22 * power, xp: 0.25 * power, gold: 0.25 * power, color: "#ff9800" };
    if (c >= 10) return { name: "RAMPAGE", damage: 0.12 * power, xp: 0.15 * power, gold: 0.15 * power, color: "#ffeb3b" };
    if (c >= 5) return { name: "KILLING SPREE", damage: 0.06 * power, xp: 0.08 * power, gold: 0.08 * power, color: "#81d4fa" };
    return { name: "", damage: 0, xp: 0, gold: 0, color: "#fff" };
  }

  addItem(item) {
    if (item.stackable) {
      const existing = this.inventory.find((i) => i.defId === item.defId && i.stackable);
      if (existing) {
        existing.stack += item.stack || 1;
        return true;
      }
    }
    if (this.inventory.length >= this.inventorySize) return false;
    this.inventory.push(item);
    this.itemsFound++;
    return true;
  }

  removeItem(uid) {
    const i = this.inventory.findIndex((it) => it.uid === uid);
    if (i >= 0) return this.inventory.splice(i, 1)[0];
    return null;
  }

  equip(item) {
    let slot = item.slot;
    if (slot === "ring") {
      slot = !this.equipment.ring1 ? "ring1" : !this.equipment.ring2 ? "ring2" : "ring1";
    }
    if (slot === "consumable") return false;
    if (!EQUIP_SLOTS.includes(slot)) return false;

    const prev = this.equipment[slot];
    // Remove from inventory if present
    this.inventory = this.inventory.filter((i) => i.uid !== item.uid);
    this.equipment[slot] = item;
    if (prev) this.addItem(prev);

    // Recalc hp/mana caps
    this.hp = Math.min(this.hp, this.getMaxHp());
    this.mana = Math.min(this.mana, this.getMaxMana());
    return true;
  }

  unequip(slot) {
    const item = this.equipment[slot];
    if (!item) return false;
    if (this.inventory.length >= this.inventorySize) return false;
    this.equipment[slot] = null;
    this.addItem(item);
    this.hp = Math.min(this.hp, this.getMaxHp());
    return true;
  }

  useConsumable(item) {
    if (!item || item.slot !== "consumable") return false;
    const s = item.stats;
    switch (s.effect) {
      case "heal":
        this.heal(s.value);
        break;
      case "mana":
        this.mana = Math.min(this.getMaxMana(), this.mana + s.value);
        break;
      case "buff_speed":
        this.addBuff("potion_speed", { moveSpeed: s.value }, s.duration);
        break;
      case "buff_damage":
        this.addBuff("potion_dmg", { damageMult: s.value }, s.duration);
        break;
      case "buff_luck":
        this.addBuff("potion_luck", {}, s.duration);
        this.bonuses.lootLuck += s.value;
        setTimeout(() => { this.bonuses.lootLuck -= s.value; }, s.duration * 1000);
        break;
      case "buff_xp":
        this.addBuff("potion_xp", { xpGain: s.value }, s.duration);
        break;
      default:
        return false;
    }
    if (item.stack > 1) item.stack--;
    else this.removeItem(item.uid);
    return true;
  }

  tryDash(dirX, dirY) {
    if (this.dashCooldown > 0 || this.dashTimer > 0) return false;
    if (this.stamina < 25) return false;
    let dx = dirX;
    let dy = dirY;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.aimAngle);
      dy = Math.sin(this.aimAngle);
    }
    const n = normalize(dx, dy);
    this.dashDir = n;
    this.dashTimer = this.dashDuration;
    this.dashCooldown = 1.1 * (1 - this.base.dashCdr - this.bonuses.dashCdr);
    this.stamina -= 25;
    this.iFrames = this.dashDuration + 0.05;
    return true;
  }

  update(dt, input) {
    if (this.dead) return;

    // Buffs
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      this.buffs[i].timeLeft -= dt;
      if (this.buffs[i].timeLeft <= 0) this.buffs.splice(i, 1);
    }

    if (this.iFrames > 0) this.iFrames -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.attackAnim > 0) this.attackAnim -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    this.aimAngle = angle(this.x, this.y, input.mouse.worldX, input.mouse.worldY);
    this.facing = Math.cos(this.aimAngle) >= 0 ? 1 : -1;

    // Movement
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDir.x * this.dashSpeed;
      this.vy = this.dashDir.y * this.dashSpeed;
    } else {
      const mv = input.moveVector();
      const speed = this.getMoveSpeed();
      this.vx = mv.x * speed;
      this.vy = mv.y * speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Regen
    this.stamina = Math.min(this.getMaxStamina(), this.stamina + this.base.staminaRegen * dt);
    this.mana = Math.min(this.getMaxMana(), this.mana + this.base.manaRegen * dt);
    if (this.bonuses.hpRegen + this.base.hpRegen > 0) {
      this.heal((this.bonuses.hpRegen + this.base.hpRegen) * dt);
    }

    // Combo decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = Math.max(0, this.combo - 1);
        this.comboTimer = 0.5;
      }
    }
  }

  canAttack() {
    return this.attackTimer <= 0 && !this.dead && this.dashTimer <= 0;
  }

  beginAttack() {
    const w = this.getWeapon();
    if (!w || !this.canAttack()) return false;
    const staminaCost = (w.stats.staminaCost || 0) * 0.5;
    const manaCost = w.stats.manaCost || 0;
    if (this.stamina < staminaCost || this.mana < manaCost) return false;
    this.stamina -= staminaCost;
    this.mana -= manaCost;
    const spd = this.getAttackSpeed();
    this.attackTimer = 1 / spd;
    this.attackAnim = Math.min(0.2, this.attackTimer * 0.6);
    return true;
  }

  // Presentation lives in src/art/render/EntityRenderer.js — the player is
  // drawn from its state (aimAngle, attackAnim, dashTimer, hurtFlash, iFrames).
}

export { EQUIP_SLOTS, WEAPON_DEFS };
