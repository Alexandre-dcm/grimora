import { Game } from "./core/Game.js";

const canvas = document.getElementById("game-canvas");
const uiRoot = document.getElementById("ui-root");

const game = new Game(canvas, uiRoot);
game.start();

// Expose for debug console
window.__ABYSBOUND__ = game;
