export const BIOMES = {
  1: {
    id: 1,
    name: "Forgotten Catacombs",
    floorColor: "#1a1520",
    wallColor: "#3d3450",
    accent: "#6b5b8a",
    fog: "rgba(20, 10, 30, 0.35)",
    hazard: null,
  },
  2: {
    id: 2,
    name: "Cursed Forest",
    floorColor: "#0f1a12",
    wallColor: "#2d4a32",
    accent: "#4a7c59",
    fog: "rgba(10, 30, 15, 0.3)",
    hazard: "roots",
  },
  3: {
    id: 3,
    name: "Infernal Depths",
    floorColor: "#1a0c0a",
    wallColor: "#5a2a20",
    accent: "#c45c2a",
    fog: "rgba(40, 10, 5, 0.35)",
    hazard: "lava",
  },
  4: {
    id: 4,
    name: "Frozen Abyss",
    floorColor: "#0a1520",
    wallColor: "#3a5a70",
    accent: "#7ec8e3",
    fog: "rgba(10, 25, 40, 0.35)",
    hazard: "ice",
  },
  5: {
    id: 5,
    name: "Void Citadel",
    floorColor: "#120818",
    wallColor: "#3a2060",
    accent: "#9b59b6",
    fog: "rgba(30, 5, 50, 0.4)",
    hazard: "void",
  },
};

export function getBiome(floor) {
  const id = ((floor - 1) % 5) + 1;
  const biome = BIOMES[id];
  return {
    ...biome,
    displayName: floor > 5 ? `${biome.name} II` : biome.name,
    floor,
  };
}

export const ROOM_TYPES = {
  start: { id: "start", name: "Entrance", color: "#4caf50", weight: 0 },
  combat: { id: "combat", name: "Combat", color: "#ef5350", weight: 40 },
  elite: { id: "elite", name: "Elite", color: "#ff9800", weight: 8 },
  treasure: { id: "treasure", name: "Treasure", color: "#ffd54f", weight: 10 },
  shop: { id: "shop", name: "Shop", color: "#42a5f5", weight: 7 },
  shrine: { id: "shrine", name: "Shrine", color: "#ab47bc", weight: 8 },
  healing: { id: "healing", name: "Sanctuary", color: "#66bb6a", weight: 6 },
  event: { id: "event", name: "Event", color: "#26c6da", weight: 8 },
  secret: { id: "secret", name: "Secret", color: "#78909c", weight: 0 },
  boss: { id: "boss", name: "Boss", color: "#c62828", weight: 0 },
};

export const SHRINE_TYPES = [
  {
    id: "blood",
    name: "Blood Shrine",
    desc: "Lose 20% max HP → gain +30% damage this run",
    color: "#c62828",
    apply: (player) => {
      const loss = Math.floor(player.getMaxHp() * 0.2);
      player.bonuses.maxHp -= loss;
      player.hp = Math.min(player.hp, player.getMaxHp());
      player.bonuses.damageMult += 0.3;
      return `Sacrificed ${loss} HP for +30% damage`;
    },
  },
  {
    id: "greed",
    name: "Greed Shrine",
    desc: "Gain +50% gold → enemies deal +20% damage",
    color: "#ffd54f",
    apply: (player, game) => {
      player.bonuses.goldFind += 0.5;
      game.runModifiers.enemyDamage += 0.2;
      return "+50% gold find; enemies empowered";
    },
  },
  {
    id: "chaos",
    name: "Chaos Shrine",
    desc: "Random powerful effect — for better or worse",
    color: "#7e57c2",
    apply: (player, game, rng) => {
      const outcomes = [
        () => { player.bonuses.damageMult += 0.4; return "+40% damage!"; },
        () => { player.bonuses.maxHp += 40; player.heal(40); return "+40 Max HP!"; },
        () => { player.bonuses.critChance += 0.2; return "+20% crit!"; },
        () => { player.takeDamage(25, { ignoreArmor: true }); return "The shrine lashes out! -25 HP"; },
        () => { player.bonuses.moveSpeed += 0.2; return "+20% move speed!"; },
        () => { game.runModifiers.enemyHp += 0.25; return "Enemies grow tougher..."; },
      ];
      return rng.randomChoice(outcomes)();
    },
  },
  {
    id: "healing",
    name: "Healing Shrine",
    desc: "Fully restore HP and Mana",
    color: "#66bb6a",
    apply: (player) => {
      player.heal(9999);
      player.mana = player.getMaxMana();
      return "Fully restored";
    },
  },
  {
    id: "power",
    name: "Power Shrine",
    desc: "Gain a powerful temporary buff (20s)",
    color: "#ff9800",
    apply: (player) => {
      player.addBuff("power_shrine", { damageMult: 0.5, attackSpeed: 0.3, moveSpeed: 0.2 }, 20);
      return "Empowered for 20 seconds!";
    },
  },
];

export const EVENT_TYPES = [
  {
    id: "ambush",
    name: "Ambush!",
    desc: "The shadows come alive...",
    run: (game) => {
      game.announce("AMBUSH!");
      game.spawnAmbush(8);
    },
  },
  {
    id: "blessing",
    name: "Fading Blessing",
    desc: "A warm light restores you.",
    run: (game) => {
      game.player.heal(game.player.getMaxHp() * 0.35);
      game.player.bonuses.damageMult += 0.08;
      game.announce("BLESSING");
    },
  },
  {
    id: "cursed_blessing",
    name: "Cursed Blessing",
    desc: "Power... at a price.",
    run: (game) => {
      game.player.bonuses.damageMult += 0.25;
      game.player.bonuses.maxHp = Math.max(20, game.player.bonuses.maxHp - 15);
      game.player.hp = Math.min(game.player.hp, game.player.getMaxHp());
      game.announce("CURSED BLESSING");
    },
  },
  {
    id: "gamble",
    name: "Wheel of Fate",
    desc: "Risk gold for glory.",
    interactive: true,
  },
  {
    id: "sacrifice",
    name: "Sacrifice Altar",
    desc: "Offer HP for a powerful relic.",
    interactive: true,
  },
  {
    id: "merchant",
    name: "Mysterious Merchant",
    desc: "A stranger with rare wares.",
    interactive: true,
  },
];
