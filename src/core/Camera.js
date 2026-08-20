import { lerp, clamp } from "../utils/MathUtils.js";

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.zoom = 1;
    this.shakeAmount = 0;
    this.shakeDecay = 6;
    this._shakeX = 0;
    this._shakeY = 0;
    this.bounds = null; // { x, y, w, h }
    this.viewW = 800;
    this.viewH = 600;
    this.followSpeed = 8;
  }

  setViewSize(w, h) {
    this.viewW = w;
    this.viewH = h;
  }

  follow(tx, ty, dt) {
    this.targetX = tx - this.viewW / (2 * this.zoom);
    this.targetY = ty - this.viewH / (2 * this.zoom);
    const t = 1 - Math.exp(-this.followSpeed * dt);
    this.x = lerp(this.x, this.targetX, t);
    this.y = lerp(this.y, this.targetY, t);
    this._applyBounds();
  }

  snapTo(tx, ty) {
    this.x = tx - this.viewW / (2 * this.zoom);
    this.y = ty - this.viewH / (2 * this.zoom);
    this.targetX = this.x;
    this.targetY = this.y;
    this._applyBounds();
  }

  setBounds(x, y, w, h) {
    this.bounds = { x, y, w, h };
  }

  clearBounds() {
    this.bounds = null;
  }

  shake(intensity = 6, durationBoost = 0) {
    this.shakeAmount = Math.max(this.shakeAmount, intensity);
    if (durationBoost) this.shakeAmount += durationBoost;
  }

  update(dt) {
    if (this.shakeAmount > 0.1) {
      this._shakeX = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this._shakeY = (Math.random() - 0.5) * 2 * this.shakeAmount;
      this.shakeAmount = lerp(this.shakeAmount, 0, 1 - Math.exp(-this.shakeDecay * dt));
    } else {
      this._shakeX = 0;
      this._shakeY = 0;
      this.shakeAmount = 0;
    }
  }

  apply(ctx) {
    ctx.setTransform(
      this.zoom,
      0,
      0,
      this.zoom,
      -this.x * this.zoom + this._shakeX,
      -this.y * this.zoom + this._shakeY
    );
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this._shakeX,
      y: (wy - this.y) * this.zoom + this._shakeY,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this._shakeX) / this.zoom + this.x,
      y: (sy - this._shakeY) / this.zoom + this.y,
    };
  }

  _applyBounds() {
    if (!this.bounds) return;
    const vw = this.viewW / this.zoom;
    const vh = this.viewH / this.zoom;
    if (this.bounds.w <= vw) {
      this.x = this.bounds.x + (this.bounds.w - vw) / 2;
    } else {
      this.x = clamp(this.x, this.bounds.x, this.bounds.x + this.bounds.w - vw);
    }
    if (this.bounds.h <= vh) {
      this.y = this.bounds.y + (this.bounds.h - vh) / 2;
    } else {
      this.y = clamp(this.y, this.bounds.y, this.bounds.y + this.bounds.h - vh);
    }
  }
}
