# Abyssbound

A real-time 2D dungeon crawler roguelite that runs entirely in the browser.

## Play

Open `index.html` via a local web server (ES modules require HTTP):

```bash
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then visit http://localhost:8080

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Mouse | Aim |
| Left Click | Attack |
| Right Click / Space | Dash |
| E | Interact |
| I | Inventory |
| 1–5 | Use consumables |
| ESC | Pause |
| F3 | Debug overlay |

## Features

- Procedural multi-room dungeon floors with 5 biomes
- Real-time combat with melee & ranged weapons
- Loot rarities, equipment, inventory, shops, shrines
- Level-up upgrade choices & kill combos
- Elites, bosses with phases, status effects
- Meta progression (Souls) and achievements
- Particles, screen shake, hit-stop, synthesized audio

## Architecture

```
src/
  core/       Game loop, input, camera, audio
  entities/   Player, enemies, projectiles, pickups
  systems/    Combat, dungeon gen, particles, progression
  data/       Weapons, enemies, items, upgrades, biomes
  ui/         HUD, menus, inventory, level-up
  utils/      Math, RNG, object pool
```
