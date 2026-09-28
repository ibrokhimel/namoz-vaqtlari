import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { INK, W, cloudSpriteURL, paintStars, rnd, startPrecipitation } from './scene.js';

const CLOUDS = { partly: 3, cloudy: 6, rain: 5, drizzle: 5, thunder: 7, snow: 4 };
const FALLING = new Set(['rain', 'drizzle', 'thunder', 'snow']);

// The sky behind everything, back to front: gradient (CSS, per phase +
// weather), stars (painted once), drifting clouds and fog (CSS-animated
// elements), falling rain/snow (canvas), lightning, and a faint red veil
// during makruh. Everything stays close to the page background so text
// keeps its contrast.
export default function Sky({ phase, weather, makruh, scale }) {
  const reduced = useReducedMotion();
  const kind = weather?.kind || 'none';
  const intensity = weather?.intensity || 2;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const starRes = Math.min(1.5, Math.max(0.5, scale * dpr));
  const rainRes = Math.min(0.75, Math.max(0.4, scale * dpr * 0.5));   // soft streaks: half res is plenty

  const starsRef = useRef(null), rainRef = useRef(null);
  const showStars = phase !== 'day' && (kind === 'clear' || kind === 'partly');

  useEffect(() => { if (showStars && starsRef.current) paintStars(starsRef.current, phase, starRes); }, [showStars, phase, starRes]);
  useEffect(() => {
    if (!FALLING.has(kind) || !rainRef.current) return undefined;
    return startPrecipitation(rainRef.current, { phase, kind: kind === 'thunder' ? 'rain' : kind, intensity: kind === 'thunder' ? 3 : intensity, reduced, resolution: rainRes });
  }, [phase, kind, intensity, reduced, rainRes]);

  // clouds: fixed layout per kind, drifting by CSS
  const clouds = useMemo(() => {
    const n = CLOUDS[kind] || 0;
    const url = n ? cloudSpriteURL((INK[phase] || INK.night).cloud) : null;
    return Array.from({ length: n }, (_, i) => {
      const k = rnd(0.9, 1.8), dur = rnd(180, 320);
      return { url, top: rnd(-60, 380), w: 640 * k, h: 240 * k, dur, delay: -rnd(0, dur), key: i };
    });
  }, [kind, phase]);

  // a few stars that twinkle (CSS opacity), on top of the static ones
  const twinkles = useMemo(() => (showStars ? Array.from({ length: 12 }, (_, i) => ({
    key: i, x: rnd(0, W), y: rnd(0, 640), dur: rnd(4, 9), delay: -rnd(0, 9),
  })) : []), [showStars]);

  const flash = useLightning(kind === 'thunder' && !reduced);

  return (
    <div className={`sky wx-${kind}`} aria-hidden="true">
      {showStars && <canvas ref={starsRef} className="sky-layer" />}
      {twinkles.map(t => <i key={t.key} className="twinkle" style={{ left: t.x, top: t.y, animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }} />)}
      {clouds.map(c => (
        <div key={c.key} className="cloud" style={{ top: c.top, width: c.w, height: c.h, backgroundImage: `url(${c.url})`,
          animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }} />
      ))}
      {kind === 'fog' && [0, 1, 2, 3].map(i => <div key={i} className="fog-band" style={{ top: 60 + i * 240, animationDelay: `${-i * 7}s` }} />)}
      {FALLING.has(kind) && <canvas ref={rainRef} className="sky-layer" />}
      {kind === 'thunder' && <div className={`lightning${flash ? ' on' : ''}`} key={flash} />}
      <div className={`makruh-veil${makruh ? ' on' : ''}`} />
    </div>
  );
}

// A soft flash every 18-45 s; returns a counter that changes per flash
function useLightning(on) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    let t;
    const next = () => { t = setTimeout(() => { setN(v => v + 1); next(); }, rnd(18000, 45000)); };
    t = setTimeout(() => { setN(v => v + 1); next(); }, rnd(4000, 12000));
    return () => clearTimeout(t);
  }, [on]);
  return on ? n : 0;
}
