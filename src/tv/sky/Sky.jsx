import daySky from '../../assets/weather/day.webp';
import duskSky from '../../assets/weather/dusk.webp';
import nightSky from '../../assets/weather/night.webp';
import overcastSky from '../../assets/weather/overcast.webp';
import stormSky from '../../assets/weather/storm.webp';
import fogSky from '../../assets/weather/fog.webp';

const PHASE_SKIES = { day: daySky, dusk: duskSky, night: nightSky };
const WEATHER_SKIES = { cloudy: overcastSky, snow: overcastSky, rain: stormSky, drizzle: stormSky, thunder: stormSky, fog: fogSky };
const FALLING = new Set(['rain', 'drizzle', 'thunder', 'snow']);

// Low-cost TV sky: one static bundled photo plus CSS-only overlays.
// No canvas loops, no blur filters, no Framer Motion image cross-fades.
export default function Sky({ phase, weather, makruh }) {
  const kind = weather?.kind || 'none';
  const source = kind === 'none' ? null : WEATHER_SKIES[kind] || PHASE_SKIES[phase] || nightSky;

  return (
    <div className={`sky wx-${kind}`} aria-hidden="true">
      {source && <img className="sky-photo" src={source} alt="" decoding="async" />}
      {source && <div className="sky-shade" />}
      {FALLING.has(kind) && <div className={`sky-static wx-static-${kind === 'thunder' ? 'rain' : kind}`} />}
      {kind === 'thunder' && <div className="lightning" />}
      <div className={`makruh-veil${makruh ? ' on' : ''}`} />
    </div>
  );
}
