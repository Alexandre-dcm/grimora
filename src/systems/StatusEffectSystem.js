export const STATUS_DEFS = {
  burn: {
    id: "burn",
    name: "Burn",
    color: "#ff5722",
    maxStacks: 5,
    tick: 0.4,
    dps: 6,
    duration: 3,
    stacking: "stack",
  },
  poison: {
    id: "poison",
    name: "Poison",
    color: "#8bc34a",
    maxStacks: 8,
    tick: 0.5,
    dps: 4,
    duration: 4,
    stacking: "stack",
  },
  bleed: {
    id: "bleed",
    name: "Bleed",
    color: "#c62828",
    maxStacks: 6,
    tick: 0.35,
    dps: 5,
    duration: 3.5,
    stacking: "stack",
  },
  freeze: {
    id: "freeze",
    name: "Freeze",
    color: "#4fc3f7",
    maxStacks: 1,
    duration: 1.2,
    slow: 0.7,
    stacking: "refresh",
  },
  shock: {
    id: "shock",
    name: "Shock",
    color: "#ffeb3b",
    maxStacks: 3,
    duration: 2,
    damageAmp: 0.08,
    stacking: "stack",
  },
  slow: {
    id: "slow",
    name: "Slow",
    color: "#90caf9",
    maxStacks: 1,
    duration: 2,
    slow: 0.4,
    stacking: "refresh",
  },
  stun: {
    id: "stun",
    name: "Stun",
    color: "#fff",
    maxStacks: 1,
    duration: 0.6,
    stun: true,
    stacking: "refresh",
  },
  vulnerability: {
    id: "vulnerability",
    name: "Vulnerable",
    color: "#ce93d8",
    maxStacks: 1,
    duration: 3,
    damageAmp: 0.2,
    stacking: "refresh",
  },
};

export class StatusEffectSystem {
  apply(entity, statusId, power = 1, source = null) {
    const def = STATUS_DEFS[statusId];
    if (!def || !entity || entity.dead) return;
    if (!entity.statuses) entity.statuses = [];

    const existing = entity.statuses.find((s) => s.id === statusId);
    const dur = def.duration;

    if (existing) {
      if (def.stacking === "stack") {
        existing.stacks = Math.min(def.maxStacks, existing.stacks + 1);
        existing.timeLeft = Math.max(existing.timeLeft, dur);
      } else {
        existing.timeLeft = dur;
        existing.stacks = 1;
      }
      existing.power = Math.max(existing.power, power);
    } else {
      entity.statuses.push({
        id: statusId,
        stacks: 1,
        timeLeft: dur,
        tickTimer: def.tick || 0,
        power,
        color: def.color,
      });
    }
  }

  update(entity, dt, onDamage) {
    if (!entity.statuses?.length) return;
    for (let i = entity.statuses.length - 1; i >= 0; i--) {
      const s = entity.statuses[i];
      const def = STATUS_DEFS[s.id];
      s.timeLeft -= dt;
      if (def.tick) {
        s.tickTimer -= dt;
        if (s.tickTimer <= 0) {
          s.tickTimer = def.tick;
          const dmg = (def.dps || 0) * s.stacks * s.power * def.tick;
          if (dmg > 0 && onDamage) onDamage(entity, dmg, s.id);
        }
      }
      if (s.timeLeft <= 0) entity.statuses.splice(i, 1);
    }
  }

  getSlowFactor(entity) {
    if (!entity.statuses?.length) return 1;
    let slow = 0;
    let stunned = false;
    for (const s of entity.statuses) {
      const def = STATUS_DEFS[s.id];
      if (def.stun) stunned = true;
      if (def.slow) slow = Math.max(slow, def.slow * (s.stacks || 1));
    }
    if (stunned) return 0;
    return Math.max(0.15, 1 - slow);
  }

  getDamageAmp(entity) {
    if (!entity.statuses?.length) return 1;
    let amp = 0;
    for (const s of entity.statuses) {
      const def = STATUS_DEFS[s.id];
      if (def.damageAmp) amp += def.damageAmp * s.stacks;
    }
    return 1 + amp;
  }

  has(entity, id) {
    return entity.statuses?.some((s) => s.id === id);
  }
}

export const statusSystem = new StatusEffectSystem();
