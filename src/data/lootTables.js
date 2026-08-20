import { RARITY, RARITY_LIST, WEAPON_DEFS, ARMOR_DEFS, CONSUMABLE_DEFS, UNIQUE_WEAPONS, STAT_MODIFIERS } from "./items.js";

export function rollRarity(rng, luck = 0) {
  const weights = RARITY_LIST.map((r) => {
    let w = r.weight;
    if (r.id !== "common") w *= 1 + luck;
    return { ...r, weight: w };
  });
  return rng.weightedRandom(weights).id;
}

export function createItemFromDef(def, rarityId, rng, extra = {}) {
  const rarity = RARITY[rarityId] || RARITY.common;
  const item = {
    uid: `${def.id}_${Date.now()}_${rng.randomInt(0, 99999)}`,
    defId: def.id,
    name: def.name,
    slot: def.slot === "ring" ? "ring" : def.slot,
    icon: def.icon,
    rarity: rarity.id,
    rarityColor: rarity.color,
    rarityName: rarity.name,
    stackable: !!def.stackable,
    stack: 1,
    stats: {},
    affixes: [],
    flavor: rng.randomChoice(def.flavors || ["A curious find."]),
    unique: null,
    uniqueId: null,
    ...extra,
  };

  // Base stats from def
  const baseKeys = [
    "baseDamage", "attackSpeed", "range", "arc", "critChance", "critMult",
    "knockback", "element", "staminaCost", "manaCost", "projectileSpeed",
    "projectileCount", "projectileSize", "projectileSpread", "pierce", "splash",
    "chain", "statusChance", "lifeSteal", "attackStyle",
    "baseArmor", "baseDodge", "manaBonus", "movePenalty", "attackSpeedBonus",
    "damageBonus", "moveSpeed", "fireDamage", "iceDamage", "poisonDamage",
    "goldFind", "maxHp", "lootLuck", "cooldownReduction", "critDamage",
    "effect", "value", "duration",
  ];
  for (const k of baseKeys) {
    if (def[k] !== undefined) item.stats[k] = def[k];
  }

  // Scale weapon damage by rarity
  if (item.stats.baseDamage) {
    item.stats.baseDamage = Math.round(item.stats.baseDamage * rarity.mult);
  }
  if (item.stats.baseArmor) {
    item.stats.baseArmor = Math.round(item.stats.baseArmor * rarity.mult);
  }

  // Affix count by rarity
  const affixCount = {
    common: rng.chance(0.3) ? 1 : 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 3,
    mythic: 4,
  }[rarity.id] ?? 0;

  const used = new Set();
  for (let i = 0; i < affixCount; i++) {
    const pool = STAT_MODIFIERS.filter((m) => !used.has(m.id));
    if (!pool.length) break;
    const mod = rng.weightedRandom(pool, (m) => m.weight ?? 1);
    used.add(mod.id);
    const value = typeof mod.min === "number" && mod.min === mod.max
      ? mod.min
      : rng.randomFloat(mod.min, mod.max) * (0.85 + rarity.mult * 0.15);
    const rounded = Number.isInteger(mod.min) && Number.isInteger(mod.max)
      ? Math.round(value)
      : Math.round(value * 1000) / 1000;
    item.stats[mod.key] = (item.stats[mod.key] || 0) + rounded;
    item.affixes.push({ id: mod.id, text: mod.format(rounded), key: mod.key, value: rounded });
  }

  return item;
}

export function generateWeapon(rng, luck = 0, forceId = null) {
  // Chance for unique
  if (!forceId && rng.chance(0.015 + luck * 0.01)) {
    return generateUniqueWeapon(rng);
  }
  const defs = Object.values(WEAPON_DEFS);
  const def = forceId ? WEAPON_DEFS[forceId] : rng.randomChoice(defs);
  const rarity = rollRarity(rng, luck);
  return createItemFromDef(def, rarity, rng);
}

export function generateUniqueWeapon(rng, forceId = null) {
  const u = forceId ? UNIQUE_WEAPONS[forceId] : rng.randomChoice(Object.values(UNIQUE_WEAPONS));
  const base = WEAPON_DEFS[u.baseId];
  const item = createItemFromDef(base, u.rarity, rng);
  item.name = u.name;
  item.icon = u.icon;
  item.defId = u.id;
  item.unique = u.unique;
  item.uniqueId = u.uniqueId;
  item.flavor = rng.randomChoice(u.flavors || [u.unique]);
  for (const [k, v] of Object.entries(u.forcedStats || {})) {
    item.stats[k] = (item.stats[k] || 0) + v;
    if (k === "damageMult") {
      item.affixes.unshift({ id: "unique_dmg", text: `+${Math.round(v * 100)}% Damage`, key: k, value: v });
    }
  }
  return item;
}

export function generateArmor(rng, luck = 0, slot = null) {
  let defs = Object.values(ARMOR_DEFS);
  if (slot) {
    const slotMap = { ring1: "ring", ring2: "ring" };
    const want = slotMap[slot] || slot;
    defs = defs.filter((d) => d.slot === want);
  }
  const def = rng.randomChoice(defs);
  const rarity = rollRarity(rng, luck);
  const item = createItemFromDef(def, rarity, rng);
  if (def.slot === "ring") item.equipSlot = "ring";
  return item;
}

export function generateConsumable(rng, id = null) {
  const def = id ? CONSUMABLE_DEFS[id] : rng.randomChoice(Object.values(CONSUMABLE_DEFS));
  return createItemFromDef(def, "common", rng);
}

export function generateLootDrop(rng, luck = 0, floor = 1) {
  const roll = rng.next();
  const floorLuck = luck + floor * 0.02;
  if (roll < 0.35) return null;
  if (roll < 0.5) {
    return { type: "gold", amount: rng.randomInt(3 + floor, 10 + floor * 4) };
  }
  if (roll < 0.62) {
    return { type: "item", item: generateConsumable(rng, "health_potion") };
  }
  if (roll < 0.82) {
    return { type: "item", item: generateArmor(rng, floorLuck) };
  }
  return { type: "item", item: generateWeapon(rng, floorLuck) };
}

export function chestLoot(rng, luck, floor, chestType = "normal") {
  const luckBonus = { normal: 0, rare: 0.25, legendary: 0.6, mimic: 0.4 }[chestType] || 0;
  const count = { normal: rng.randomInt(1, 2), rare: rng.randomInt(2, 3), legendary: rng.randomInt(3, 4), mimic: rng.randomInt(2, 4) }[chestType] || 1;
  const drops = [];
  for (let i = 0; i < count; i++) {
    if (rng.chance(0.4)) {
      drops.push({ type: "gold", amount: rng.randomInt(8 + floor * 2, 20 + floor * 6) * (chestType === "legendary" ? 2 : 1) });
    } else if (rng.chance(0.55)) {
      drops.push({ type: "item", item: generateWeapon(rng, luck + luckBonus + floor * 0.03) });
    } else {
      drops.push({ type: "item", item: generateArmor(rng, luck + luckBonus + floor * 0.03) });
    }
  }
  if (chestType === "legendary" && rng.chance(0.35 + luck)) {
    drops.push({ type: "item", item: generateUniqueWeapon(rng) });
  }
  return drops;
}

export function shopInventory(rng, floor, luck) {
  const items = [];
  for (let i = 0; i < 6; i++) {
    let item;
    if (i < 2) item = generateWeapon(rng, luck + 0.1);
    else if (i < 5) item = generateArmor(rng, luck + 0.1);
    else item = generateConsumable(rng);
    const rarityMult = RARITY[item.rarity]?.mult || 1;
    const price = Math.round((20 + floor * 8) * rarityMult * rng.randomFloat(0.85, 1.2));
    items.push({ item, price, sold: false });
  }
  return items;
}

export function getItemCompareStats(item) {
  if (!item) return [];
  const lines = [];
  const s = item.stats;
  if (s.baseDamage) lines.push({ key: "baseDamage", label: `Damage: ${s.baseDamage}`, value: s.baseDamage });
  if (s.attackSpeed) lines.push({ key: "attackSpeed", label: `Speed: ${s.attackSpeed.toFixed(1)}/s`, value: s.attackSpeed });
  if (s.baseArmor) lines.push({ key: "baseArmor", label: `Armor: ${s.baseArmor}`, value: s.baseArmor });
  for (const a of item.affixes || []) {
    lines.push({ key: a.key, label: a.text, value: a.value, affix: true });
  }
  return lines;
}
