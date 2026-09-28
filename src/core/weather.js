/* ─────────────────────────────────────────── */
/*  NAMOZ VAQTLARI — core/weather.js           */
/*  Current weather for the mosque's city      */
/*  (Open-Meteo: free, no API key), cached so  */
/*  a TV that loses Wi-Fi keeps its last known */
/*  sky for a while, then falls back to none.  */
/* ─────────────────────────────────────────── */

export const WEATHER_KINDS = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder'];

export const WEATHER_UZ = {
  clear: 'Ochiq havo', partly: 'Qisman bulutli', cloudy: 'Bulutli', fog: 'Tuman',
  drizzle: 'Mayda yomgʻir', rain: 'Yomgʻir', snow: 'Qor', thunder: 'Momaqaldiroq',
};

const REFRESH_MS = 30 * 60000;         // fetch every 30 minutes
const STALE_MS = 3 * 3600000;          // after 3 h without data, show no weather
const CACHE_KEY = 'weatherCache';

// WMO weather code -> { kind, intensity 1..3 }
export function fromWmo(code) {
  const c = Number(code);
  if (c === 0) return { kind: 'clear', intensity: 1 };
  if (c === 1 || c === 2) return { kind: 'partly', intensity: c };
  if (c === 3) return { kind: 'cloudy', intensity: 2 };
  if (c === 45 || c === 48) return { kind: 'fog', intensity: 2 };
  if (c >= 51 && c <= 57) return { kind: 'drizzle', intensity: c >= 55 ? 2 : 1 };
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82))
    return { kind: 'rain', intensity: [65, 67, 82].includes(c) ? 3 : [63, 81].includes(c) ? 2 : 1 };
  if ((c >= 71 && c <= 77) || c === 85 || c === 86)
    return { kind: 'snow', intensity: [75, 86].includes(c) ? 3 : [73, 85].includes(c) ? 2 : 1 };
  if (c >= 95) return { kind: 'thunder', intensity: 3 };
  return { kind: 'clear', intensity: 1 };
}

// ?weather=rain&temp=8 (test mode): force a sky without waiting for it
export function weatherOverride(search = typeof location !== 'undefined' ? location.search : '') {
  const q = new URLSearchParams(search);
  const kind = q.get('weather');
  if (!WEATHER_KINDS.includes(kind)) return null;
  const temp = q.get('temp');
  return { kind, intensity: Math.min(3, Math.max(1, Number(q.get('intensity')) || 2)),
    temp: temp === null || temp === '' ? null : Number(temp), forced: true };
}

function readCache(city) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!c || c.lat !== city.lat || c.lon !== city.lon) return null;
    return c;
  } catch { return null; }
}

export function cachedWeather(city, nowMs = Date.now()) {
  const c = readCache(city);
  if (!c || nowMs - c.at > STALE_MS) return null;
  return { ...fromWmo(c.code), temp: c.temp };
}

export async function fetchWeather(city, { force = false } = {}) {
  const c = readCache(city);
  if (!force && c && Date.now() - c.at < REFRESH_MS) return cachedWeather(city);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
    + '&current=temperature_2m,weather_code&timezone=Asia%2FTashkent';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const cur = (await r.json()).current;
    const entry = { lat: city.lat, lon: city.lon, at: Date.now(),
      code: cur.weather_code, temp: Math.round(cur.temperature_2m) };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(entry)); } catch { /* storage blocked */ }
    return { ...fromWmo(entry.code), temp: entry.temp };
  } catch {
    return cachedWeather(city);          // offline: last known sky, or none
  } finally {
    clearTimeout(timer);
  }
}

export const WEATHER_REFRESH_MS = REFRESH_MS;
