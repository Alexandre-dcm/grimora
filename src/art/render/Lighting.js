/**
 * STYLIZED PIXEL LIGHTING (ART_BIBLE §11).
 *
 * The lightmap is built at quarter resolution with smoothing disabled, so every
 * halo edge lands on chunky 4x4 blocks — pixel light, not a CSS radial
 * gradient. It is composited over the scene with `multiply`, which darkens
 * unlit stone toward the biome ambient and leaves torch-lit areas at full
 * value. A single cheap `screen` pass adds bloom around strong lights.
 */

import { makeCanvas } from "../PixelSprite.js";
import { mix } from "../Palette.js";
import { assets } from "../AssetRegistry.js";
import { crisp } from "./Draw.js";

const SCALE = 4;

/**
 * How dark unlit stone gets. The lightmap is multiplied over the scene, so the
 * ambient fill has to stay well above the biome's near-black tint or the whole
 * dungeon crushes to black — mid-value tinted grey, not the tint itself.
 */
function ambientFill(biome) {
  const t = 0.4 + (biome.ambientStrength ?? 0.66) * 0.22;
  return mix("#ffffff", biome.ambient || "#1b1826", t);
}

export class Lighting {
  constructor() {
    this.cv = makeCanvas(2, 2);
    this.ctx = crisp(this.cv.getContext("2d"));
    this.enabled = true;
    this.w = 0;
    this.h = 0;
  }

  resize(w, h) {
    const lw = Math.max(1, Math.ceil(w / SCALE));
    const lh = Math.max(1, Math.ceil(h / SCALE));
    if (lw === this.w && lh === this.h) return;
    this.w = lw;
    this.h = lh;
    this.cv.width = lw;
    this.cv.height = lh;
    crisp(this.ctx);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx main context, screen-space transform
   * @param {object} cam { x, y, zoom }
   * @param {Array} lights [{ x, y, color, radius }] in world space
   * @param {object} biome ambient color + strength
   */
  render(ctx, cam, lights, biome, viewW, viewH) {
    if (!this.enabled) return;
    this.resize(viewW, viewH);
    const lc = this.ctx;

    // Ambient floor: how dark unlit stone gets, tinted by the biome.
    lc.globalCompositeOperation = "source-over";
    if (this._fillKey !== biome.key) {
      this._fillKey = biome.key;
      this._fill = ambientFill(biome);
    }
    lc.fillStyle = this._fill;
    lc.fillRect(0, 0, this.w, this.h);
    this._vignette(lc);

    lc.globalCompositeOperation = "lighter";
    const z = cam.zoom;
    for (const l of lights) {
      const halo = assets.halo(l.radius, l.color);
      const sx = ((l.x - cam.x) * z) / SCALE;
      const sy = ((l.y - cam.y) * z) / SCALE;
      const size = (l.radius * 2 * z) / SCALE;
      if (sx + size < 0 || sx - size > this.w || sy + size < 0 || sy - size > this.h) continue;
      lc.drawImage(halo, Math.round(sx - size / 2), Math.round(sy - size / 2), Math.round(size), Math.round(size));
    }
    lc.globalCompositeOperation = "source-over";

    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(this.cv, 0, 0, viewW, viewH);
    // Bloom: the same map added back at low strength lifts lit halos
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.1;
    ctx.drawImage(this.cv, 0, 0, viewW, viewH);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = prevSmooth;
  }

  /**
   * Stepped darkening toward the screen edges, drawn into the low-res lightmap
   * so its bands land on chunky blocks instead of reading as a soft CSS
   * vignette (§11: focus the eye without hiding threats).
   */
  _vignette(lc) {
    const steps = 6;
    const depthX = Math.max(2, Math.round(this.w * 0.16));
    const depthY = Math.max(2, Math.round(this.h * 0.18));
    lc.fillStyle = "rgba(0,0,0,0.085)";
    for (let s = 0; s < steps; s++) {
      const bx = Math.round((depthX * (steps - s)) / steps);
      const by = Math.round((depthY * (steps - s)) / steps);
      lc.fillRect(0, 0, this.w, by);
      lc.fillRect(0, this.h - by, this.w, by);
      lc.fillRect(0, 0, bx, this.h);
      lc.fillRect(this.w - bx, 0, bx, this.h);
    }
  }
}
