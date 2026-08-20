/** Simple object pool for hot-path entities (particles, projectiles, damage numbers). */

export class ObjectPool {
  constructor(factory, reset, initialSize = 32) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.active = [];
    for (let i = 0; i < initialSize; i++) {
      this.free.push(factory());
    }
  }

  acquire(...args) {
    const obj = this.free.pop() || this.factory();
    this.reset(obj, ...args);
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const i = this.active.indexOf(obj);
    if (i >= 0) this.active.splice(i, 1);
    this.free.push(obj);
  }

  releaseAll() {
    while (this.active.length) {
      this.free.push(this.active.pop());
    }
  }

  update(dt, updateFn, shouldRelease) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      updateFn(obj, dt);
      if (shouldRelease(obj)) {
        this.active.splice(i, 1);
        this.free.push(obj);
      }
    }
  }
}
