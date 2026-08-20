/** Lightweight Web Audio synthesizer — no external assets. */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = 0.35;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
  }

  resume() {
    this.init();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
  }

  _gain(v = 1) {
    if (!this.ctx || this.muted || !this.enabled) return null;
    const g = this.ctx.createGain();
    g.gain.value = this.master * v;
    g.connect(this.ctx.destination);
    return g;
  }

  _tone(freq, dur, type = "square", vol = 0.3, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this._gain(vol);
    if (!g) return;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(this.master * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol = 0.2, filterFreq = 800) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const g = this._gain(vol);
    if (!g) return;
    g.gain.setValueAtTime(this.master * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
    src.stop(t + dur);
  }

  play(name) {
    this.resume();
    switch (name) {
      case "swing":
        this._noise(0.08, 0.15, 1200);
        this._tone(180, 0.06, "sawtooth", 0.12, -80);
        break;
      case "shoot":
        this._tone(520, 0.07, "square", 0.12, -300);
        break;
      case "hit":
        this._noise(0.05, 0.2, 600);
        this._tone(120, 0.05, "triangle", 0.15, -60);
        break;
      case "crit":
        this._tone(440, 0.08, "square", 0.18);
        this._tone(660, 0.1, "square", 0.12);
        break;
      case "death":
        this._tone(200, 0.15, "sawtooth", 0.15, -150);
        this._noise(0.12, 0.18, 400);
        break;
      case "pickup":
        this._tone(660, 0.06, "sine", 0.15);
        this._tone(990, 0.08, "sine", 0.12);
        break;
      case "xp":
        this._tone(880, 0.05, "sine", 0.1);
        break;
      case "levelup":
        this._tone(392, 0.1, "triangle", 0.2);
        this._tone(523, 0.12, "triangle", 0.18);
        this._tone(659, 0.18, "triangle", 0.16);
        break;
      case "chest":
        this._tone(300, 0.1, "triangle", 0.15);
        this._noise(0.1, 0.1, 900);
        break;
      case "dash":
        this._noise(0.1, 0.12, 2000);
        break;
      case "hurt":
        this._tone(90, 0.12, "sawtooth", 0.2, -40);
        break;
      case "ui":
        this._tone(500, 0.04, "sine", 0.08);
        break;
      case "coin":
        this._tone(980, 0.05, "square", 0.1);
        this._tone(1300, 0.06, "square", 0.08);
        break;
      case "boss":
        this._tone(80, 0.3, "sawtooth", 0.25, -20);
        this._tone(60, 0.4, "triangle", 0.2);
        break;
      case "heal":
        this._tone(440, 0.1, "sine", 0.12);
        this._tone(550, 0.12, "sine", 0.1);
        break;
      case "explode":
        this._noise(0.25, 0.3, 300);
        this._tone(60, 0.2, "sawtooth", 0.2, -40);
        break;
      default:
        break;
    }
  }
}

export const audio = new AudioManager();
