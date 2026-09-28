import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { rnd, startPrecipitation } from './scene.js';
import daySky from '../../assets/weather/day.webp';
import duskSky from '../../assets/weather/dusk.webp';
import nightSky from '../../assets/weather/night.webp';
import overcastSky from '../../assets/weather/overcast.webp';
import stormSky from '../../assets/weather/storm.webp';
import fogSky from '../../assets/weather/fog.webp';

const PHASE_SKIES = { day: daySky, dusk: duskSky, night: nightSky };
const WEATHER_SKIES = { cloudy: overcastSky, snow: overcastSky, rain: stormSky, drizzle: stormSky, thunder: stormSky, fog: fogSky };
const FALLING = new Set(['rain', 'drizzle', 'thunder', 'snow']);

// Locally bundled photographic skies, with lightweight precipitation above
// the contrast veil. No generated canvas cloud sprites or synthetic stars.
export default function Sky({ phase, weather, makruh, scale }) {
  const reduced = useReducedMotion();
  const kind = weather?.kind || 'none';
  const intensity = weather?.intensity || 2;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const rainRes = Math.min(0.75, Math.max(0.4, scale * dpr * 0.5));   // soft streaks: half res is plenty

  const rainRef = useRef(null);
  const source = kind === 'none' ? null : WEATHER_SKIES[kind] || PHASE_SKIES[phase] || nightSky;

  useEffect(() => {
    if (!FALLING.has(kind) || !rainRef.current) return undefined;
    return startPrecipitation(rainRef.current, { phase, kind: kind === 'thunder' ? 'rain' : kind, intensity: kind === 'thunder' ? 3 : intensity, reduced, resolution: rainRes });
  }, [phase, kind, intensity, reduced, rainRes]);

  const flash = useLightning(kind === 'thunder' && !reduced);

  return (
    <div className={`sky wx-${kind}`} aria-hidden="true">
      {source && <img key={source} className="sky-photo" src={source} alt="" decoding="async" />}
      {source && <div className="sky-shade" />}
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
