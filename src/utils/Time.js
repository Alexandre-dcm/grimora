export class Time {
  constructor() {
    this.now = 0;
    this.delta = 0;
    this.elapsed = 0;
    this.scale = 1;
    this.hitStop = 0;
    this._last = 0;
  }

  start(timestamp) {
    this._last = timestamp;
    this.now = timestamp;
  }

  tick(timestamp) {
    this.now = timestamp;
    let raw = (timestamp - this._last) / 1000;
    this._last = timestamp;
    // Clamp to avoid spiral of death after tab switch
    raw = Math.min(raw, 0.05);

    if (this.hitStop > 0) {
      this.hitStop -= raw;
      this.delta = 0;
      return;
    }

    this.delta = raw * this.scale;
    this.elapsed += this.delta;
  }

  freeze(seconds) {
    this.hitStop = Math.max(this.hitStop, seconds);
  }
}
