import { RARITY } from "../data/items.js";
import { formatNumber } from "../utils/MathUtils.js";
import { EQUIP_SLOTS } from "../entities/Player.js";
import { LEVEL_UPGRADES, UPGRADE_RARITY_WEIGHT, META_UPGRADES, CLASSES, ACHIEVEMENTS } from "../data/upgrades.js";
import { getItemCompareStats } from "../data/lootTables.js";
import { rng } from "../utils/Random.js";
import { audio } from "../core/AudioManager.js";

export class UIManager {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.mode = "hub"; // hub | playing | inventory | levelup | pause | shop | summary | meta | controls
    this.selectedInv = null;
    this.levelChoices = [];
    this.shopItems = [];
    this.announceTimer = 0;
    this.announceText = "";
    this.comboShow = "";
    this.comboTimer = 0;
    this.floating = [];
    this.interactText = "";
    this._build();
  }

  _build() {
    this.root.innerHTML = `
      <div id="hud" class="hidden">
        <div class="hud-top">
          <div class="hud-bars">
            <div class="bar-row"><span class="bar-label">HP</span><div class="bar-track"><div class="bar-fill hp" id="hp-fill"></div><div class="bar-text" id="hp-text"></div></div></div>
            <div class="bar-row"><span class="bar-label">MP</span><div class="bar-track"><div class="bar-fill mana" id="mp-fill"></div><div class="bar-text" id="mp-text"></div></div></div>
            <div class="bar-row"><span class="bar-label">ST</span><div class="bar-track"><div class="bar-fill stamina" id="st-fill"></div><div class="bar-text" id="st-text"></div></div></div>
            <div class="bar-row"><span class="bar-label">XP</span><div class="bar-track"><div class="bar-fill xp" id="xp-fill"></div><div class="bar-text" id="xp-text"></div></div></div>
          </div>
          <div class="hud-meta">
            <div class="floor-name" id="floor-name">Floor 1</div>
            <div class="stat-line">Lv <span id="player-level">1</span> · <span id="room-type">Entrance</span></div>
            <div class="gold">◈ <span id="gold-text">0</span></div>
            <div class="stat-line" id="combo-text"></div>
          </div>
        </div>
        <div class="boss-bar-wrap hidden" id="boss-bar">
          <div class="boss-name" id="boss-name">Boss</div>
          <div class="boss-bar-track"><div class="boss-bar-fill" id="boss-fill"></div></div>
        </div>
        <div class="combo-banner" id="combo-banner"></div>
        <div class="room-announce" id="room-announce"></div>
        <div class="interact-prompt" id="interact-prompt"></div>
        <div class="hud-bottom">
          <div class="weapon-slot" id="weapon-slot"><span id="weapon-icon">⚔</span><span class="name" id="weapon-name">Weapon</span></div>
          <div class="ability-slot" title="Dash (Space)"><span>💨</span><div class="cd-overlay hidden" id="dash-cd"></div><span class="cd">Dash</span></div>
        </div>
        <div class="floating-texts" id="floating-texts"></div>
        <div class="debug-overlay hidden" id="debug-overlay"></div>
      </div>
      <div id="overlay-host"></div>
    `;
    this.hud = this.root.querySelector("#hud");
    this.overlayHost = this.root.querySelector("#overlay-host");
    this.floatHost = this.root.querySelector("#floating-texts");
  }

  setMode(mode) {
    this.mode = mode;
    this.selectedInv = null;
    if (mode === "playing") {
      this.hud.classList.remove("hidden");
      this.overlayHost.innerHTML = "";
    } else if (mode === "hub") {
      this.hud.classList.add("hidden");
      this.renderHub();
    } else if (mode === "inventory") {
      this.renderInventory();
    } else if (mode === "levelup") {
      this.renderLevelUp();
    } else if (mode === "pause") {
      this.renderPause();
    } else if (mode === "shop") {
      this.renderShop();
    } else if (mode === "summary") {
      this.hud.classList.add("hidden");
      this.renderSummary();
    } else if (mode === "meta") {
      this.renderMeta();
    } else if (mode === "controls") {
      this.renderControls();
    } else if (mode === "achievements") {
      this.renderAchievements();
    }
  }

  renderHub() {
    const prog = this.game.progression;
    const selected = this.game.selectedClass || "warrior";
    const classes = Object.values(CLASSES)
      .map(
        (c) => `
      <div class="class-card ${c.id === selected ? "selected" : ""}" data-class="${c.id}">
        <div class="icon">${c.icon}</div>
        <div class="name">${c.name}</div>
        <div class="desc">${c.desc}</div>
      </div>`
      )
      .join("");

    this.overlayHost.innerHTML = `
      <div class="overlay">
        <div class="panel hub-panel">
          <div class="logo">ABYSSBOUND</div>
          <p class="subtitle">Descend. Loot. Die. Grow stronger.</p>
          <div class="souls-display">Souls: ${formatNumber(prog.save.souls)}</div>
          <div class="class-grid">${classes}</div>
          <div class="btn-row">
            <button class="btn" id="btn-start">Enter the Abyss</button>
          </div>
          <div class="btn-row">
            <button class="btn secondary" id="btn-meta">Soul Forge</button>
            <button class="btn secondary" id="btn-achievements">Achievements</button>
            <button class="btn secondary" id="btn-controls">Controls</button>
          </div>
        </div>
      </div>`;

    this.overlayHost.querySelectorAll(".class-card").forEach((el) => {
      el.addEventListener("click", () => {
        audio.play("ui");
        this.game.selectedClass = el.dataset.class;
        this.renderHub();
      });
    });
    this.overlayHost.querySelector("#btn-start").onclick = () => {
      audio.play("ui");
      this.game.startRun(this.game.selectedClass || "warrior");
    };
    this.overlayHost.querySelector("#btn-meta").onclick = () => {
      audio.play("ui");
      this.setMode("meta");
    };
    this.overlayHost.querySelector("#btn-achievements").onclick = () => {
      audio.play("ui");
      this.setMode("achievements");
    };
    this.overlayHost.querySelector("#btn-controls").onclick = () => {
      audio.play("ui");
      this.setMode("controls");
    };
  }

  renderMeta() {
    const prog = this.game.progression;
    const nodes = META_UPGRADES.map((up) => {
      const rank = prog.save.metaRanks[up.id] || 0;
      const maxed = rank >= up.maxRank;
      const cost = maxed ? "MAX" : `${up.cost(rank)} souls`;
      return `
        <div class="meta-node ${maxed ? "maxed" : ""}" data-id="${up.id}">
          <strong>${up.name}</strong> (${rank}/${up.maxRank})
          <div style="color:var(--text-dim);font-size:0.8rem;margin-top:4px">${up.desc}</div>
          <div class="cost">${cost}</div>
        </div>`;
    }).join("");

    this.overlayHost.innerHTML = `
      <div class="overlay">
        <div class="panel" style="min-width:min(640px,92vw)">
          <h2>Soul Forge</h2>
          <p class="subtitle">Permanent power purchased with Souls</p>
          <div class="souls-display">Souls: ${formatNumber(prog.save.souls)}</div>
          <div class="meta-tree">${nodes}</div>
          <div class="btn-row"><button class="btn secondary" id="btn-back">Back</button></div>
        </div>
      </div>`;

    this.overlayHost.querySelectorAll(".meta-node:not(.maxed)").forEach((el) => {
      el.onclick = () => {
        if (prog.buyMeta(el.dataset.id)) {
          audio.play("pickup");
          this.renderMeta();
        } else audio.play("ui");
      };
    });
    this.overlayHost.querySelector("#btn-back").onclick = () => this.setMode("hub");
  }

  renderAchievements() {
    const prog = this.game.progression;
    const list = ACHIEVEMENTS.map((a) => {
      const unlocked = !!prog.save.achievements[a.id];
      return `<div style="padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:3px;opacity:${unlocked ? 1 : 0.45}">
        <strong style="color:${unlocked ? "var(--accent-hot)" : "var(--text-dim)"}">${unlocked ? "✓ " : ""}${a.name}</strong>
        <div style="font-size:0.8rem;color:var(--text-dim)">${a.desc}</div>
      </div>`;
    }).join("");
    this.overlayHost.innerHTML = `
      <div class="overlay"><div class="panel" style="min-width:min(480px,92vw)">
        <h2>Achievements</h2>
        <div style="display:flex;flex-direction:column;gap:8px;margin:16px 0;max-height:400px;overflow:auto;text-align:left">${list}</div>
        <div class="btn-row"><button class="btn secondary" id="btn-back">Back</button></div>
      </div></div>`;
    this.overlayHost.querySelector("#btn-back").onclick = () => this.setMode("hub");
  }

  renderControls() {
    this.overlayHost.innerHTML = `
      <div class="overlay"><div class="panel">
        <h2>Controls</h2>
        <div class="controls-list">
          <div><kbd>WASD</kbd> / Arrows — Move</div>
          <div><kbd>Mouse</kbd> — Aim</div>
          <div><kbd>LMB</kbd> — Attack</div>
          <div><kbd>RMB</kbd> / <kbd>Space</kbd> — Dash</div>
          <div><kbd>E</kbd> — Interact</div>
          <div><kbd>I</kbd> — Inventory</div>
          <div><kbd>1-5</kbd> — Use potion slot</div>
          <div><kbd>ESC</kbd> — Pause</div>
          <div><kbd>F3</kbd> — Debug</div>
        </div>
        <div class="btn-row"><button class="btn secondary" id="btn-back">Back</button></div>
      </div></div>`;
    this.overlayHost.querySelector("#btn-back").onclick = () => {
      this.setMode(this.game.state === "playing" ? "pause" : "hub");
    };
  }

  renderPause() {
    this.overlayHost.innerHTML = `
      <div class="overlay"><div class="panel hub-panel">
        <h2>Paused</h2>
        <div class="btn-row" style="flex-direction:column;align-items:stretch">
          <button class="btn" id="btn-resume">Resume</button>
          <button class="btn secondary" id="btn-inv">Inventory</button>
          <button class="btn secondary" id="btn-controls">Controls</button>
          <button class="btn secondary" id="btn-mute">${this.game.progression.save.settings.muted ? "Unmute" : "Mute"} Audio</button>
          <button class="btn danger" id="btn-quit">Abandon Run</button>
        </div>
      </div></div>`;
    this.overlayHost.querySelector("#btn-resume").onclick = () => this.game.resume();
    this.overlayHost.querySelector("#btn-inv").onclick = () => this.setMode("inventory");
    this.overlayHost.querySelector("#btn-controls").onclick = () => this.setMode("controls");
    this.overlayHost.querySelector("#btn-mute").onclick = () => {
      const s = this.game.progression.save.settings;
      s.muted = !s.muted;
      audio.setMuted(s.muted);
      this.game.progression.persist();
      this.renderPause();
    };
    this.overlayHost.querySelector("#btn-quit").onclick = () => this.game.endRun(false);
  }

  renderInventory() {
    const p = this.game.player;
    if (!p) return;
    const equipHtml = EQUIP_SLOTS.map((slot) => {
      const item = p.equipment[slot];
      const color = item ? RARITY[item.rarity]?.color : "var(--text-dim)";
      return `<div class="equip-slot" data-slot="${slot}">
        <span class="slot-label">${slot}</span>
        <span class="slot-item" style="color:${color}">${item ? `${item.icon} ${item.name}` : "— empty —"}</span>
      </div>`;
    }).join("");

    const cells = [];
    for (let i = 0; i < p.inventorySize; i++) {
      const item = p.inventory[i];
      if (item) {
        const sel = this.selectedInv === item.uid ? "selected" : "";
        cells.push(`<div class="inv-cell ${sel}" data-uid="${item.uid}" style="border-color:${item.rarityColor}">
          ${item.icon}${item.stack > 1 ? `<span class="stack">${item.stack}</span>` : ""}
        </div>`);
      } else {
        cells.push(`<div class="inv-cell"></div>`);
      }
    }

    const selected = p.inventory.find((i) => i.uid === this.selectedInv) ||
      (this.selectedInv?.startsWith("eq:") ? p.equipment[this.selectedInv.slice(3)] : null);

    this.overlayHost.innerHTML = `
      <div class="overlay"><div class="panel" style="min-width:min(860px,94vw)">
        <h2>Inventory</h2>
        <p class="subtitle">Gold: ${p.gold} · Press I or ESC to close</p>
        <div class="inv-layout">
          <div class="equip-slots">${equipHtml}</div>
          <div class="inv-grid">${cells.join("")}</div>
          <div class="tooltip-panel" id="inv-tip">${this._tooltipHtml(selected, p)}</div>
        </div>
        <div class="inv-actions">
          <button class="btn" id="btn-equip" ${!selected ? "disabled" : ""}>Equip / Use</button>
          <button class="btn secondary" id="btn-unequip">Unequip Slot</button>
          <button class="btn danger" id="btn-discard" ${!selected || selected.slot === undefined ? "" : ""}>Discard</button>
          <button class="btn secondary" id="btn-close">Close</button>
        </div>
      </div></div>`;

    this.overlayHost.querySelectorAll(".inv-cell[data-uid]").forEach((el) => {
      el.onclick = () => {
        this.selectedInv = el.dataset.uid;
        this.renderInventory();
      };
    });
    this.overlayHost.querySelectorAll(".equip-slot").forEach((el) => {
      el.onclick = () => {
        this.selectedInv = `eq:${el.dataset.slot}`;
        this.renderInventory();
      };
    });
    this.overlayHost.querySelector("#btn-close").onclick = () => this.game.resume();
    this.overlayHost.querySelector("#btn-equip").onclick = () => {
      if (!selected) return;
      if (selected.slot === "consumable") {
        p.useConsumable(selected);
        audio.play("heal");
      } else {
        p.equip(selected);
        audio.play("ui");
      }
      this.selectedInv = null;
      this.renderInventory();
    };
    this.overlayHost.querySelector("#btn-unequip").onclick = () => {
      const slot = this.selectedInv?.startsWith("eq:") ? this.selectedInv.slice(3) : null;
      if (slot && p.unequip(slot)) {
        audio.play("ui");
        this.selectedInv = null;
        this.renderInventory();
      }
    };
    this.overlayHost.querySelector("#btn-discard").onclick = () => {
      if (!selected) return;
      if (this.selectedInv?.startsWith("eq:")) {
        p.equipment[this.selectedInv.slice(3)] = null;
      } else {
        p.removeItem(selected.uid);
      }
      this.selectedInv = null;
      this.renderInventory();
    };
  }

  _tooltipHtml(item, player) {
    if (!item) return `<div style="color:var(--text-dim)">Select an item</div>`;
    const equipped = item.slot && item.slot !== "consumable"
      ? player.equipment[item.slot === "ring" ? "ring1" : item.slot]
      : null;
    const lines = getItemCompareStats(item)
      .map((l) => `<div class="stat positive">${l.label}</div>`)
      .join("");
    return `
      <div class="item-name" style="color:${item.rarityColor}">${item.icon} ${item.name}</div>
      <div class="item-type">${item.rarityName} · ${item.slot}</div>
      ${lines}
      ${item.unique ? `<div class="unique">${item.unique}</div>` : ""}
      <div class="flavor">"${item.flavor}"</div>
      ${equipped && equipped.uid !== item.uid ? `<div style="margin-top:10px;color:var(--text-dim);font-size:0.75rem">Currently equipped: ${equipped.name}</div>` : ""}
    `;
  }

  prepareLevelUp() {
    const weighted = LEVEL_UPGRADES.map((u) => ({
      ...u,
      weight: UPGRADE_RARITY_WEIGHT[u.rarity] || 10,
    }));
    this.levelChoices = [];
    const pool = [...weighted];
    for (let i = 0; i < 3; i++) {
      if (!pool.length) break;
      const pick = rng.weightedRandom(pool);
      this.levelChoices.push(pick);
      const idx = pool.findIndex((p) => p.id === pick.id);
      if (idx >= 0) pool.splice(idx, 1);
    }
  }

  renderLevelUp() {
    const p = this.game.player;
    const cards = this.levelChoices
      .map((u, i) => {
        const color = RARITY[u.rarity]?.color || "#fff";
        return `<div class="upgrade-card" data-idx="${i}">
          <div class="icon">${u.icon}</div>
          <div class="title">${u.name}</div>
          <div class="desc">${u.desc}</div>
          <div class="rarity-tag" style="color:${color}">${u.rarity}</div>
        </div>`;
      })
      .join("");

    this.overlayHost.innerHTML = `
      <div class="overlay"><div class="panel">
        <h1>Level ${p.level}</h1>
        <p class="subtitle">Choose an upgrade</p>
        <div class="levelup-cards">${cards}</div>
      </div></div>`;

    this.overlayHost.querySelectorAll(".upgrade-card").forEach((el) => {
      el.onclick = () => {
        const u = this.levelChoices[+el.dataset.idx];
        u.apply(p);
        audio.play("levelup");
        this.game.particles.levelUp(p.x, p.y);
        this.game.resumeFromLevelUp();
      };
    });
  }

  renderShop() {
    const p = this.game.player;
    const items = this.shopItems
      .map((s, i) => {
        const it = s.item;
        return `<div class="shop-item ${s.sold ? "sold" : ""}" data-idx="${i}">
          <div style="font-size:1.5rem">${it.icon}</div>
          <div style="color:${it.rarityColor};font-weight:600;font-size:0.85rem">${it.name}</div>
          <div style="font-size:0.7rem;color:var(--text-dim)">${it.rarityName}</div>
          <div class="price">${s.sold ? "SOLD" : `${s.price}g`}</div>
        </div>`;
      })
      .join("");

    this.overlayHost.innerHTML = `
      <div class="overlay"><div class="panel">
        <h2>Dungeon Shop</h2>
        <p class="subtitle">Gold: ${p.gold}</p>
        <div class="shop-grid">${items}</div>
        <div class="btn-row">
          <button class="btn secondary" id="btn-heal">Heal 40% — ${20 + this.game.floor * 5}g</button>
          <button class="btn secondary" id="btn-close">Leave</button>
        </div>
      </div></div>`;

    this.overlayHost.querySelectorAll(".shop-item:not(.sold)").forEach((el) => {
      el.onclick = () => {
        const s = this.shopItems[+el.dataset.idx];
        if (p.gold < s.price) {
          this.game.announce("Not enough gold!");
          return;
        }
        // Clone-ish: use the item reference
        if (p.inventory.length >= p.inventorySize && !(s.item.stackable && p.inventory.some((i) => i.defId === s.item.defId))) {
          this.game.announce("Inventory full!");
          return;
        }
        p.gold -= s.price;
        p.addItem(s.item);
        s.sold = true;
        audio.play("coin");
        this.renderShop();
      };
    });
    this.overlayHost.querySelector("#btn-heal").onclick = () => {
      const cost = 20 + this.game.floor * 5;
      if (p.gold >= cost) {
        p.gold -= cost;
        p.heal(p.getMaxHp() * 0.4);
        audio.play("heal");
        this.renderShop();
      }
    };
    this.overlayHost.querySelector("#btn-close").onclick = () => this.game.resume();
  }

  renderSummary() {
    const s = this.game.runSummary || {};
    this.overlayHost.innerHTML = `
      <div class="overlay"><div class="panel hub-panel">
        <h1>${s.won ? "Victory?" : "Run Complete"}</h1>
        <p class="subtitle">${s.won ? "You descended beyond measure." : "The abyss claims another."}</p>
        <div class="stats-grid">
          <span class="label">Floor Reached</span><span class="value">${s.floor}</span>
          <span class="label">Enemies Killed</span><span class="value">${s.kills}</span>
          <span class="label">Gold Collected</span><span class="value">${formatNumber(s.gold)}</span>
          <span class="label">Damage Dealt</span><span class="value">${formatNumber(s.damageDealt)}</span>
          <span class="label">Items Found</span><span class="value">${s.itemsFound}</span>
          <span class="label">Bosses Defeated</span><span class="value">${s.bossesKilled}</span>
          <span class="label">Souls Earned</span><span class="value" style="color:#a78bfa">${s.souls}</span>
        </div>
        <div class="btn-row">
          <button class="btn" id="btn-again">Descend Again</button>
          <button class="btn secondary" id="btn-hub">Return to Hub</button>
        </div>
      </div></div>`;
    this.overlayHost.querySelector("#btn-again").onclick = () => this.game.startRun(this.game.selectedClass);
    this.overlayHost.querySelector("#btn-hub").onclick = () => this.setMode("hub");
  }

  updateHud() {
    if (this.mode !== "playing" && this.mode !== "inventory" && this.mode !== "pause") return;
    const p = this.game.player;
    if (!p) return;

    const setBar = (fillId, textId, cur, max) => {
      const el = document.getElementById(fillId);
      const tx = document.getElementById(textId);
      if (el) el.style.width = `${Math.max(0, (cur / max) * 100)}%`;
      if (tx) tx.textContent = `${Math.ceil(cur)}/${Math.ceil(max)}`;
    };
    setBar("hp-fill", "hp-text", p.hp, p.getMaxHp());
    setBar("mp-fill", "mp-text", p.mana, p.getMaxMana());
    setBar("st-fill", "st-text", p.stamina, p.getMaxStamina());
    setBar("xp-fill", "xp-text", p.xp, p.xpToLevel);

    const fl = document.getElementById("floor-name");
    if (fl) fl.textContent = `Floor ${this.game.floor} — ${this.game.dungeon?.biome?.displayName || ""}`;
    const lv = document.getElementById("player-level");
    if (lv) lv.textContent = p.level;
    const gold = document.getElementById("gold-text");
    if (gold) gold.textContent = formatNumber(p.gold);
    const room = document.getElementById("room-type");
    if (room) room.textContent = this.game.currentRoom?.type || "—";

    const w = p.getWeapon();
    const wi = document.getElementById("weapon-icon");
    const wn = document.getElementById("weapon-name");
    if (wi) wi.textContent = w?.icon || "⚔";
    if (wn) wn.textContent = w?.name || "None";

    const dash = document.getElementById("dash-cd");
    if (dash) {
      if (p.dashCooldown > 0) {
        dash.classList.remove("hidden");
        dash.textContent = p.dashCooldown.toFixed(1);
      } else dash.classList.add("hidden");
    }

    const combo = p.getComboTier();
    const ct = document.getElementById("combo-text");
    if (ct) ct.textContent = p.combo >= 5 ? `${combo.name} ×${p.combo}` : p.combo > 0 ? `Combo ×${p.combo}` : "";

    // Boss bar
    const boss = this.game.enemies.find((e) => e.isBoss && !e.dead);
    const bb = document.getElementById("boss-bar");
    if (bb) {
      if (boss) {
        bb.classList.remove("hidden");
        document.getElementById("boss-name").textContent = boss.name;
        document.getElementById("boss-fill").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      } else bb.classList.add("hidden");
    }

    // Interact
    const ip = document.getElementById("interact-prompt");
    if (ip) {
      if (this.interactText) {
        ip.textContent = this.interactText;
        ip.classList.add("show");
      } else ip.classList.remove("show");
    }

    // Announce
    const an = document.getElementById("room-announce");
    if (an && this.announceTimer > 0) {
      an.textContent = this.announceText;
      an.classList.add("show");
    } else if (an) an.classList.remove("show");

    // Combo banner
    const cb = document.getElementById("combo-banner");
    if (cb && this.comboTimer > 0) {
      cb.textContent = this.comboShow;
      cb.classList.add("show");
    } else if (cb) cb.classList.remove("show");

    // Debug
    const dbg = document.getElementById("debug-overlay");
    if (dbg) {
      if (this.game.debug) {
        dbg.classList.remove("hidden");
        dbg.textContent = this.game.getDebugText();
      } else dbg.classList.add("hidden");
    }
  }

  announce(text, duration = 2) {
    this.announceText = text;
    this.announceTimer = duration;
  }

  showCombo(name) {
    this.comboShow = name;
    this.comboTimer = 1.5;
  }

  spawnFloat(screenX, screenY, text, className = "") {
    const el = document.createElement("div");
    el.className = `float-dmg ${className}`;
    el.textContent = text;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    this.floatHost.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  update(dt) {
    if (this.announceTimer > 0) this.announceTimer -= dt;
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.mode === "playing") this.updateHud();
  }
}
