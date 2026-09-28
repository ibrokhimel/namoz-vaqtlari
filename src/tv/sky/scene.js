// Weather scene painted behind the TV screen.
//
// Legibility first: every colour stays close to the phase's background and
// at low opacity, so text contrast barely moves (checked by the legibility
// test, which samples the real pixels behind each text).
//
// Cheap on TV chips. Only falling rain/snow is drawn per frame, on a
// half-resolution canvas, one batched path per opacity bucket, 30 fps,
// paused while the screen is hidden. Clouds, fog, twinkles and lightning
// are plain elements moved by CSS animations (compositor only, no repaint);
// stars are painted once.

export const W = 1920, H = 1080;

// Colours per phase: [r, g, b] and opacity ranges
export const INK = {
  day:   { rain: [64, 90, 122],   snow: [128, 150, 178], cloud: [255, 255, 255], star: null },
  dusk:  { rain: [186, 202, 224], snow: [228, 234, 244], cloud: [58, 76, 104],   star: [206, 216, 236] },
  night: { rain: [150, 170, 200], snow: [206, 214, 228], cloud: [30, 40, 58],    star: [200, 212, 236] },
};
const ALPHA = {
  day:   { rain: [0.10, 0.20], snow: [0.30, 0.50], star: [0, 0] },
  dusk:  { rain: [0.12, 0.26], snow: [0.28, 0.50], star: [0.10, 0.45] },
  night: { rain: [0.10, 0.24], snow: [0.26, 0.48], star: [0.10, 0.50] },
};

export const rnd = (a, b) => a + Math.random() * (b - a);
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a.toFixed(3)})`;

// Soft cloud sprite (overlapping radial blobs) as an image URL, per colour
const spriteCache = new Map();
export function cloudSpriteURL(rgb) {
  const key = rgb.join(',');
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = document.createElement('canvas');
  c.width = 640; c.height = 240;
  const x = c.getContext('2d');
  for (const [cx, cy, r] of [[160, 150, 110], [290, 120, 140], [430, 140, 120], [540, 160, 90], [340, 170, 130]]) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(rgb, 0.55)); g.addColorStop(0.6, rgba(rgb, 0.25)); g.addColorStop(1, rgba(rgb, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  }
  const url = c.toDataURL();
  spriteCache.set(key, url);
  return url;
}

// Stars, painted once onto their own canvas
export function paintStars(canvas, phase, resolution) {
  const ink = INK[phase], al = ALPHA[phase];
  canvas.width = Math.round(W * resolution); canvas.height = Math.round(H * resolution);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
  if (!ink?.star) return;
  const n = phase === 'night' ? 90 : 35;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rgba(ink.star, rnd(al.star[0], al.star[1]));
    ctx.beginPath(); ctx.arc(rnd(0, W), rnd(0, H * 0.62), rnd(0.6, 1.6), 0, Math.PI * 2); ctx.fill();
  }
}

// Falling rain / drizzle / snow; returns stop()
export function startPrecipitation(canvas, { phase, kind, intensity = 2, reduced = false, resolution = 0.5 }) {
  const ink = INK[phase] || INK.night, al = ALPHA[phase] || ALPHA.night;
  const ctx = canvas.getContext('2d');
  canvas.width = Math.round(W * resolution); canvas.height = Math.round(H * resolution);
  ctx.setTransform(resolution, 0, 0, resolution, 0, 0);

  const snow = kind === 'snow', drizzle = kind === 'drizzle';
  const n = snow ? [0, 70, 120, 180][intensity] : drizzle ? 70 : [0, 110, 170, 240][intensity];
  const ps = Array.from({ length: n || 120 }, (_, i) => snow
    ? { x: rnd(0, W), y: rnd(-H, H), r: rnd(1.2, 3.0), v: rnd(28, 72), sway: rnd(8, 26), ph: rnd(0, 6.28), b: i % 3 }
    : { x: rnd(-200, W), y: rnd(-H, H), len: drizzle ? rnd(8, 14) : rnd(18, 34), v: drizzle ? rnd(420, 620) : rnd(900, 1350), b: i % 3 });
  const [a0, a1] = snow ? al.snow : al.rain, col = snow ? ink.snow : ink.rain, wind = 0.2;

  const draw = (t, dt) => {
    ctx.clearRect(0, 0, W, H);
    for (let b = 0; b < 3; b++) {
      const style = rgba(col, a0 + (a1 - a0) * (b / 2));
      ctx.beginPath();
      if (snow) {
        ctx.fillStyle = style;
        for (const f of ps) {
          if (f.b !== b) continue;
          f.y += f.v * dt;
          if (f.y > H + 10) { f.y = rnd(-60, -10); f.x = rnd(0, W); }
          const x = f.x + Math.sin(t * 0.6 + f.ph) * f.sway;
          ctx.moveTo(x + f.r, f.y); ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        }
        ctx.fill();
      } else {
        ctx.strokeStyle = style; ctx.lineWidth = drizzle ? 1.1 : 1.5; ctx.lineCap = 'round';
        for (const d of ps) {
          if (d.b !== b) continue;
          d.y += d.v * dt; d.x += d.v * wind * dt;
          if (d.y > H + 40) { d.y = rnd(-120, -20); d.x = rnd(-300, W); }
          ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * wind, d.y - d.len);
        }
        ctx.stroke();
      }
    }
  };

  if (reduced) { draw(0, 0); return () => {}; }
  let raf = 0, last = performance.now(), acc = 0, t = 0;
  const loop = now => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
    if (acc < 1 / 30) return;
    t += acc; draw(t, acc); acc = 0;
  };
  const onVis = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
}
