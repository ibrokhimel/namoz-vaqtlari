import { useEffect, useState } from 'react';
import { appNow } from '../core/prayer.js';

// Tashkent wall time, updated once a second (aligned to the second so the
// clock and countdown tick together).
export function useNow() {
  const [now, setNow] = useState(appNow);
  useEffect(() => {
    let t;
    const tick = () => { setNow(appNow()); t = setTimeout(tick, 1000 - (Date.now() % 1000) + 5); };
    t = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(t);
  }, []);
  return now;
}

// Scale the 1920x1080 stage to fit the screen (Android TV WebViews often
// report 960x540 @2x).
export function useStageScale() {
  const fit = () => Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  const [s, setS] = useState(fit);
  useEffect(() => {
    const on = () => setS(fit());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

// Burn-in guard: nudge the layout a few pixels every 10 minutes so no
// pixel shows the same thing for hours. Invisible from the hall.
const SHIFTS = [[0,0],[3,2],[-2,3],[-3,-2],[2,-3],[0,3],[-3,0]];
export function useBurnInShift() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(n => (n + 1) % SHIFTS.length), 10 * 60000);
    return () => clearInterval(id);
  }, []);
  const [x, y] = SHIFTS[i];
  return i === 0 ? undefined : `translate(${x}px,${y}px)`;
}
