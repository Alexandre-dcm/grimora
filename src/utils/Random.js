/** Seedable PRNG + common random helpers */

export class Random {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }

  next() {
    // Mulberry32
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  randomFloat(min = 0, max = 1) {
    return min + this.next() * (max - min);
  }

  randomInt(min, max) {
    return Math.floor(this.randomFloat(min, max + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  randomChoice(arr) {
    if (!arr.length) return undefined;
    return arr[this.randomInt(0, arr.length - 1)];
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  weightedRandom(items, weightFn = (x) => x.weight ?? 1) {
    let total = 0;
    for (const item of items) total += weightFn(item);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= weightFn(item);
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }

  pickN(arr, n) {
    return this.shuffle(arr).slice(0, Math.min(n, arr.length));
  }
}

export const rng = new Random();
