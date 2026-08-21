/**
 * Visual smoke test: boots the game in headless Chrome, plays a little, and
 * writes screenshots to tools/shots/. Also reports console errors, so a broken
 * sprite or a bad import fails loudly instead of silently drawing nothing.
 *
 *   node tools/shots.mjs [--floors 3] [--w 1280] [--h 720]
 */

import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const args = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};

const W = +arg("w", 1280);
const H = +arg("h", 720);
const FLOORS = +arg("floors", 3);
const OUT = "tools/shots";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [`--window-size=${W},${H}`, "--force-device-scale-factor=1", "--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}\n${e.stack}`));

await page.goto("http://localhost:8080/index.html", { waitUntil: "networkidle2" });
await page.waitForFunction("window.game !== undefined", { timeout: 10000 });

const shot = async (name) => {
  // Explicit clip: without it headless downsamples the capture, which softens
  // the pixel grid and makes the art look blurrier than it renders.
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
  });
  console.log(`  wrote ${OUT}/${name}.png`);
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("title screen");
await wait(900);
await shot("01-title");

// Class select + start
await page.evaluate(() => document.querySelector('[data-class="rogue"]')?.click());
await wait(200);
await shot("02-title-rogue");
await page.evaluate(() => document.querySelector("#btn-start").click());
await wait(700);
await shot("03-start-room");

// Walk around and fight: hold keys, click to attack
const press = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await wait(ms);
  for (const k of keys) await page.keyboard.up(k);
};

await page.mouse.move(W * 0.65, H * 0.5);
await press(["d"], 900);
await shot("04-walk");

// Teleport to interesting rooms and grab a shot of each type
const roomShot = async (type, name) => {
  const found = await page.evaluate((t) => {
    const g = window.game;
    const room = g.dungeon.rooms.find((r) => r.type === t);
    if (!room) return false;
    g.player.x = room.cx;
    g.player.y = room.cy + 60;
    g.camera.snapTo(g.player.x, g.player.y);
    g.enterRoom(room);
    return true;
  }, type);
  if (!found) {
    console.log(`  (no ${type} room on this floor)`);
    return;
  }
  await wait(500);
  // Swing a few times where there are enemies
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(W * 0.62, H * 0.5);
    await wait(120);
  }
  await shot(name);
};

await roomShot("combat", "05-combat");
await roomShot("treasure", "06-treasure");
await roomShot("shrine", "07-shrine");
await roomShot("shop", "08-shop-room");
await roomShot("elite", "09-elite");

// Level up screen
await page.evaluate(() => window.game.player.addXp(5000));
await wait(400);
await shot("10-levelup");
await page.evaluate(() => document.querySelector(".upgrade-card")?.click());
await wait(200);

// Inventory
await page.evaluate(() => {
  const g = window.game;
  for (let i = 0; i < 10; i++) {
    const d = g.lootDebugDrop?.();
    void d;
  }
});
await page.keyboard.press("i");
await wait(400);
await shot("11-inventory");
await page.keyboard.press("i");
await wait(200);

// Deeper floors for biome identity
for (let f = 2; f <= FLOORS; f++) {
  await page.evaluate(() => window.game.descend());
  await wait(700);
  await page.evaluate(() => {
    const g = window.game;
    const room = g.dungeon.rooms.find((r) => r.type === "combat" || r.type === "elite") || g.dungeon.rooms[1];
    g.player.x = room.cx;
    g.player.y = room.cy + 50;
    g.camera.snapTo(g.player.x, g.player.y);
    g.enterRoom(room);
  });
  await wait(600);
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(W * 0.6, H * 0.52);
    await wait(120);
  }
  await shot(`12-floor${f}`);
}

// Boss floor
await page.evaluate(() => {
  const g = window.game;
  while (g.floor < 3) g.descend();
});
await wait(600);
const hasBoss = await page.evaluate(() => {
  const g = window.game;
  const room = g.dungeon.rooms.find((r) => r.type === "boss");
  if (!room) return false;
  g.player.x = room.cx;
  g.player.y = room.cy + 120;
  g.camera.snapTo(g.player.x, g.player.y);
  g.enterRoom(room);
  return true;
});
if (hasBoss) {
  await wait(900);
  for (let i = 0; i < 10; i++) {
    await page.mouse.click(W * 0.5, H * 0.42);
    await wait(120);
  }
  await shot("13-boss");
}

// Performance probe: spawn a crowd and measure frame time
const perf = await page.evaluate(async () => {
  const g = window.game;
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    g.spawnEnemy(
      ["skeleton", "goblin", "bat", "slime", "spider", "orc"][i % 6],
      g.player.x + Math.cos(a) * (80 + (i % 5) * 40),
      g.player.y + Math.sin(a) * (80 + (i % 5) * 40)
    );
  }
  const samples = [];
  let last = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const now = performance.now();
      samples.push(now - last);
      last = now;
      if (samples.length < 120) requestAnimationFrame(tick);
      else {
        samples.sort((a, b) => a - b);
        resolve({
          entities: g.enemies.length,
          median: +samples[60].toFixed(2),
          p95: +samples[113].toFixed(2),
          worst: +samples[119].toFixed(2),
          sprites: g.dungeonArt ? undefined : undefined,
        });
      }
    };
    requestAnimationFrame(tick);
  });
});
await wait(300);
await shot("14-crowd");
console.log("perf:", JSON.stringify(perf));

const stats = await page.evaluate(() => ({
  fps: window.game.fps,
  canvas: `${window.game.canvas.width}x${window.game.canvas.height}`,
  zoom: window.game.camera.zoom,
  cached: window.__assets?.stats ?? null,
}));
console.log("stats:", JSON.stringify(stats));

await browser.close();

if (errors.length) {
  console.log(`\n${errors.length} console problem(s):`);
  for (const e of errors.slice(0, 25)) console.log(" -", e);
  process.exitCode = 1;
} else {
  console.log("\nno console errors");
}
