import { toHijri } from '../core/prayer.js';
import { fmtDayUz } from '../core/day.js';
import { WEATHER_UZ } from '../core/weather.js';

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم';

// Bismillah (left), mosque name (centre), weather and dates (right). The wall
// clock lives in the centre of the dial.
export default function TopBar({ now, settings, weather, phase }) {
  const h = toHijri(now, settings.hijriAdj || 0);
  return (
    <header className="topbar">
      <div className="mosque-arabic" id="mosqueArabic" lang="ar" dir="rtl">{settings.mosqueArabic || BISMILLAH}</div>
      <div className="mosque-name" id="mosqueName">{settings.mosqueName || 'Namoz Vaqtlari'}</div>
      <div className="topbar-right">
        {weather && (
          <div className="weather" id="weather" aria-label={WEATHER_UZ[weather.kind]} title={WEATHER_UZ[weather.kind]}>
            <WeatherIcon kind={weather.kind} night={phase !== 'day'} />
            {Number.isFinite(weather.temp) && <span className="w-temp">{weather.temp}°</span>}
          </div>
        )}
        <div className="live-date">
          <span id="liveDate">{fmtDayUz(now)} {now.getFullYear()}</span>
          <span id="liveHijri">{h.d} {h.mName} {h.y}</span>
        </div>
      </div>
    </header>
  );
}

// Minimal line icons, drawn in the text colour
function WeatherIcon({ kind, night }) {
  const sun = <><circle cx="24" cy="20" r="7" />{[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
    const r = a * Math.PI / 180;
    return <line key={a} x1={24 + 11 * Math.cos(r)} y1={20 + 11 * Math.sin(r)} x2={24 + 14 * Math.cos(r)} y2={20 + 14 * Math.sin(r)} />;
  })}</>;
  const moon = <path d="M29 9a11 11 0 1 0 8 17 9 9 0 0 1-8-17z" />;
  const cloud = <path d="M14 38h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 7 7 0 0 0-1 18z" />;
  const drops = n => Array.from({ length: n }, (_, i) => <line key={i} x1={16 + i * 8} y1="42" x2={13 + i * 8} y2="48" />);
  const flakes = [16, 24, 32].map(x => <circle key={x} cx={x} cy="45" r="1.6" className="fill" />);
  const body = {
    clear: night ? moon : sun,
    partly: <><g transform="translate(-6,-6) scale(.8)">{night ? moon : sun}</g>{cloud}</>,
    cloudy: cloud,
    fog: <>{[20, 28, 36].map(y => <line key={y} x1="8" y1={y} x2="40" y2={y} />)}</>,
    drizzle: <>{cloud}{drops(3)}</>,
    rain: <>{cloud}{drops(3)}</>,
    snow: <>{cloud}{flakes}</>,
    thunder: <>{cloud}<path d="M25 40l-4 7h6l-3 6" /></>,
  }[kind];
  return <svg className="w-icon" viewBox="0 0 48 52" aria-hidden="true">{body}</svg>;
}
