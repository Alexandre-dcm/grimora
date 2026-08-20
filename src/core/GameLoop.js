export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.running = false;
    this.rafId = 0;
    this._bound = this._frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this._bound);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _frame(ts) {
    if (!this.running) return;
    this.update(ts);
    this.render();
    this.rafId = requestAnimationFrame(this._bound);
  }
}
