import { Game } from "./core/Game.js";
import { assets } from "./art/AssetRegistry.js";

const canvas = document.getElementById("game-canvas");
const uiRoot = document.getElementById("ui-root");

const game = new Game(canvas, uiRoot);
game.start();

// Debug/automation handles
window.game = game;
window.__ABYSBOUND__ = game;
window.__assets = assets;
