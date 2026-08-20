import { META_UPGRADES, ACHIEVEMENTS } from "../data/upgrades.js";

const SAVE_KEY = "abyssbound_save_v1";
const SAVE_VERSION = 1;

const DEFAULT_SAVE = {
  version: SAVE_VERSION,
  souls: 0,
  metaRanks: {},
  unlockedClasses: ["warrior", "rogue", "mage"],
  unlockedWeapons: [],
  achievements: {},
  stats: {
    totalKills: 0,
    chestsOpened: 0,
    bossesKilled: 0,
    legendariesFound: 0,
    mythicsFound: 0,
    maxCombo: 0,
    deepestFloor: 0,
    untouchableFloors: 0,
    maxGoldHeld: 0,
    runsCompleted: 0,
    totalSouls: 0,
  },
  settings: {
    muted: false,
    shake: true,
  },
};

export class ProgressionSystem {
  constructor() {
    this.save = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const data = JSON.parse(raw);
      if (!data || data.version !== SAVE_VERSION) {
        return { ...structuredClone(DEFAULT_SAVE), ...this._migrate(data) };
      }
      return {
        ...structuredClone(DEFAULT_SAVE),
        ...data,
        stats: { ...DEFAULT_SAVE.stats, ...(data.stats || {}) },
        settings: { ...DEFAULT_SAVE.settings, ...(data.settings || {}) },
        metaRanks: data.metaRanks || {},
        achievements: data.achievements || {},
      };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  _migrate(data) {
    if (!data) return {};
    return {
      souls: data.souls || 0,
      stats: data.stats || {},
    };
  }

  persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch (e) {
      console.warn("Save failed", e);
    }
  }

  getMetaBonuses() {
    const s = {
      hpBonus: 0,
      damageBonus: 0,
      luckBonus: 0,
      startingPotions: 0,
      xpBonus: 0,
      goldBonus: 0,
      speedBonus: 0,
      armorBonus: 0,
      soulBonus: 0,
      revive: false,
    };
    for (const up of META_UPGRADES) {
      const rank = this.save.metaRanks[up.id] || 0;
      if (rank > 0) up.apply(s, rank);
    }
    return s;
  }

  buyMeta(id) {
    const up = META_UPGRADES.find((m) => m.id === id);
    if (!up) return false;
    const rank = this.save.metaRanks[id] || 0;
    if (rank >= up.maxRank) return false;
    const cost = up.cost(rank);
    if (this.save.souls < cost) return false;
    this.save.souls -= cost;
    this.save.metaRanks[id] = rank + 1;
    this.persist();
    return true;
  }

  addSouls(amount) {
    const bonus = this.getMetaBonuses().soulBonus || 0;
    const gained = Math.round(amount * (1 + bonus));
    this.save.souls += gained;
    this.save.stats.totalSouls += gained;
    this.persist();
    return gained;
  }

  recordRun(runStats) {
    const st = this.save.stats;
    st.totalKills += runStats.kills || 0;
    st.chestsOpened += runStats.chestsOpened || 0;
    st.bossesKilled += runStats.bossesKilled || 0;
    st.maxCombo = Math.max(st.maxCombo, runStats.maxCombo || 0);
    st.deepestFloor = Math.max(st.deepestFloor, runStats.floor || 0);
    st.maxGoldHeld = Math.max(st.maxGoldHeld, runStats.maxGold || 0);
    st.runsCompleted += 1;
    if (runStats.legendariesFound) st.legendariesFound += runStats.legendariesFound;
    if (runStats.mythicsFound) st.mythicsFound += runStats.mythicsFound;
    if (runStats.untouchable) st.untouchableFloors += 1;
    this._checkAchievements();
    this.persist();
  }

  _checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (this.save.achievements[a.id]) continue;
      if (a.check(this.save.stats)) {
        this.save.achievements[a.id] = { unlockedAt: Date.now() };
        this.save.souls += 10;
      }
    }
  }

  noteLegendary() {
    this.save.stats.legendariesFound++;
    this._checkAchievements();
    this.persist();
  }

  noteMythic() {
    this.save.stats.mythicsFound++;
    this._checkAchievements();
    this.persist();
  }
}
