import { useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ASR_METHODS, CITIES, METHODS, loadSettings, simulation } from '../core/prayer.js';
import { dayPhase, fmtDayUz, getDayState, hhmm } from '../core/day.js';
import { useBurnInShift, useNow, useStageScale } from './hooks.js';
import TopBar from './TopBar.jsx';
import Hero from './Hero.jsx';
import TodayTable from './TodayTable.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import Sky from './sky/Sky.jsx';
import { useWeather } from './useWeather.js';
import UpdatePrompt from './UpdatePrompt.jsx';
import UpdateBoot from './UpdateBoot.jsx';
import { bootedFromUpdate, startUpdates, useUpdate } from './update-store.js';

export default function App() {
  const now = useNow();
  const scale = useStageScale();
  const shift = useBurnInShift();
  const [settings, setSettings] = useState(loadSettings);
  const city = CITIES[settings.city] || CITIES.Tashkent;

  // Settings saved from another window (e.g. settings.html) apply at once
  useEffect(() => {
    const on = e => { if (e.key === 'prayerSettings') setSettings(loadSettings()); };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  // Day state changes at most once a minute, or when a boundary passes
  const minuteKey = Math.floor(now.getTime() / 60000);
  const st = useMemo(() => getDayState(now, settings, city), [minuteKey, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const phase = dayPhase(now, st.T);
  useEffect(() => { document.documentElement.dataset.phase = phase; }, [phase]);
  const weather = useWeather(city, settings.weatherBg !== false);
  const makruh = !!(st.makruhUntil && now < st.makruhUntil);
  useEffect(() => { document.documentElement.dataset.weather = weather?.kind || 'none'; }, [weather?.kind]);

  useEffect(() => { startUpdates(); }, []);

  // phase crossfades only after the first frame has painted directly
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="stage" id="stage" style={{ '--s': scale }}>
      <Sky phase={phase} weather={weather} makruh={makruh} scale={scale} />
      <div className={`layout${bootedFromUpdate ? ' boot-reveal' : ''}`} style={{ transform: shift }}>
        <TopBar now={now} settings={settings} weather={weather} phase={phase} />
        <main className="panel-days" id="main">
          <Hero now={now} st={st} settings={settings} />
          <TodayTable now={now} st={st} settings={settings} city={city} />
        </main>
        <footer className="footer">
          <div>
            <span id="cityFooter">{city.name}</span><span className="f-sep">·</span>
            <span id="methodFooter">{(METHODS[settings.method] || METHODS.Karachi).name.split(' (')[0]} usuli</span>
            <span className="f-sep">·</span>
            <span id="asrFooter">Asr: {(ASR_METHODS[settings.asrMethod] || ASR_METHODS.Hanafi).name}</span>
          </div>
          <div>Astronomik hisob<span className="f-sep">·</span><VersionStatus /><span className="f-sep">·</span><span className="f-credit">RKE</span></div>
        </footer>
      </div>
      <SettingsPanel settings={settings} onChange={setSettings} now={now} />
      <SimBadge now={now} />
      <UpdatePrompt />
      <UpdateBoot />
    </div>
    </MotionConfig>
  );
}

// Status bar: the running version, or "Yangilanish mavjud" when a newer one
// is waiting (install it from the settings panel)
function VersionStatus() {
  const u = useUpdate();
  if (u.status === 'available' || u.status === 'installing')
    return <span className="f-update" id="versionStatus">Yangilanish mavjud</span>;
  return <span className="f-version" id="versionStatus">v{u.current.name}</span>;
}

// Test mode (?at=...): impossible to mistake for the real schedule
function SimBadge({ now }) {
  const sim = simulation();
  if (!sim) return null;
  return (
    <div className="sim-badge" role="status">
      <b>SINOV REJIMI</b> {fmtDayUz(now)} {now.getFullYear()} · {hhmm(now)}{sim.speed > 1 ? ` · ×${sim.speed}` : ''}
    </div>
  );
}
