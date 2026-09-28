import { useEffect, useState } from 'react';
import { WEATHER_REFRESH_MS, cachedWeather, fetchWeather, weatherOverride } from '../core/weather.js';

// Current weather for the city; null when unknown (offline for > 3 h, or
// switched off in settings). ?weather=... forces a sky for testing,
// unless the weather background is switched off.
export function useWeather(city, enabled) {
  const forced = weatherOverride();
  const [w, setW] = useState(() => forced || cachedWeather(city));
  useEffect(() => {
    if (forced || !enabled) return;
    let alive = true;
    const load = () => fetchWeather(city).then(v => { if (alive) setW(v); });
    load();
    const id = setInterval(load, WEATHER_REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [city.lat, city.lon, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!enabled) return null;           // the mosque's own switch always wins
  return forced || w;
}
