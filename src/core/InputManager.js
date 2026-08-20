const KEY_MAP = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "dash",
  KeyE: "interact",
  KeyI: "inventory",
  KeyC: "character",
  Escape: "pause",
  KeyR: "reload",
  Digit1: "slot1",
  Digit2: "slot2",
  Digit3: "slot3",
  Digit4: "slot4",
  Digit5: "slot5",
  F3: "debug",
};

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = Object.create(null);
    this.keysDown = Object.create(null);
    this.keysUp = Object.create(null);
    this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, left: false, right: false };
    this.mouseDown = { left: false, right: false };
    this.mouseUp = { left: false, right: false };
    this._bound = {
      kd: this._onKeyDown.bind(this),
      ku: this._onKeyUp.bind(this),
      mm: this._onMouseMove.bind(this),
      md: this._onMouseDown.bind(this),
      mu: this._onMouseUp.bind(this),
      ctx: (e) => e.preventDefault(),
      bl: () => this.reset(),
    };
  }

  attach() {
    window.addEventListener("keydown", this._bound.kd);
    window.addEventListener("keyup", this._bound.ku);
    this.canvas.addEventListener("mousemove", this._bound.mm);
    this.canvas.addEventListener("mousedown", this._bound.md);
    window.addEventListener("mouseup", this._bound.mu);
    this.canvas.addEventListener("contextmenu", this._bound.ctx);
    window.addEventListener("blur", this._bound.bl);
  }

  detach() {
    window.removeEventListener("keydown", this._bound.kd);
    window.removeEventListener("keyup", this._bound.ku);
    this.canvas.removeEventListener("mousemove", this._bound.mm);
    this.canvas.removeEventListener("mousedown", this._bound.md);
    window.removeEventListener("mouseup", this._bound.mu);
    this.canvas.removeEventListener("contextmenu", this._bound.ctx);
    window.removeEventListener("blur", this._bound.bl);
  }

  reset() {
    for (const k of Object.keys(this.keys)) this.keys[k] = false;
    this.mouse.left = false;
    this.mouse.right = false;
  }

  endFrame() {
    for (const k of Object.keys(this.keysDown)) this.keysDown[k] = false;
    for (const k of Object.keys(this.keysUp)) this.keysUp[k] = false;
    this.mouseDown.left = false;
    this.mouseDown.right = false;
    this.mouseUp.left = false;
    this.mouseUp.right = false;
  }

  pressed(action) {
    return !!this.keys[action];
  }

  justPressed(action) {
    return !!this.keysDown[action];
  }

  justReleased(action) {
    return !!this.keysUp[action];
  }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.pressed("left")) x -= 1;
    if (this.pressed("right")) x += 1;
    if (this.pressed("up")) y -= 1;
    if (this.pressed("down")) y += 1;
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  updateWorldMouse(camera) {
    this.mouse.worldX = this.mouse.x / camera.zoom + camera.x;
    this.mouse.worldY = this.mouse.y / camera.zoom + camera.y;
  }

  _onKeyDown(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    if (e.repeat) return;
    e.preventDefault();
    this.keys[action] = true;
    this.keysDown[action] = true;
  }

  _onKeyUp(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    this.keys[action] = false;
    this.keysUp[action] = true;
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    this.mouse.y = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
  }

  _onMouseDown(e) {
    if (e.button === 0) {
      this.mouse.left = true;
      this.mouseDown.left = true;
    } else if (e.button === 2) {
      this.mouse.right = true;
      this.mouseDown.right = true;
    }
  }

  _onMouseUp(e) {
    if (e.button === 0) {
      this.mouse.left = false;
      this.mouseUp.left = true;
    } else if (e.button === 2) {
      this.mouse.right = false;
      this.mouseUp.right = true;
    }
  }
}
