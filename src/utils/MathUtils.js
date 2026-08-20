export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const lerp = (a, b, t) => a + (b - a) * t;

export const invLerp = (a, b, v) => (v - a) / (b - a);

export const smoothstep = (t) => t * t * (3 - 2 * t);

export const dist = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};

export const angle = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

export const normalize = (x, y) => {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
};

export const moveToward = (x, y, tx, ty, speed, dt) => {
  const d = dist(x, y, tx, ty);
  if (d < 0.001) return { x: tx, y: ty, arrived: true };
  const step = Math.min(d, speed * dt);
  return {
    x: x + ((tx - x) / d) * step,
    y: y + ((ty - y) / d) * step,
    arrived: step >= d,
  };
};

export const circleOverlap = (x1, y1, r1, x2, y2, r2) =>
  dist2(x1, y1, x2, y2) <= (r1 + r2) * (r1 + r2);

export const pointInRect = (px, py, rx, ry, rw, rh) =>
  px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;

export const circleRectOverlap = (cx, cy, cr, rx, ry, rw, rh) => {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  return dist2(cx, cy, nx, ny) <= cr * cr;
};

export const rectOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const formatNumber = (n) => {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.floor(n).toLocaleString();
};

export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
