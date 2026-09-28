import { useEffect, useMemo, useState } from 'react';
import { ASR_METHODS, CITIES, METHODS, loadSettings, simulation } from '../core/prayer.js';
import { dayPhase, fmtDayUz, getDayState, hhmm } from '../core/day.js';
import { useBurnInShift, useNow, useStageScale } from './hooks.js';
import TopBar from './TopBar.jsx';
import Hero from './Hero.jsx';
import TodayRow from './TodayRow.jsx';
import TomorrowLine from './TomorrowLine.jsx';
import SettingsPanel from './SettingsPanel.jsx';

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

  // phase crossfades only after the first frame has painted directly
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
  }, []);

  return (
    <div className="stage" id="stage" style={{ '--s': scale }}>
      <div className="layout" style={{ transform: shift }}>
        <TopBar now={now} settings={settings} />
        <main className="panel-days" id="main">
          <Hero now={now} st={st} settings={settings} />
          <TodayRow now={now} st={st} settings={settings} />
          <TomorrowLine st={st} settings={settings} city={city} />
        </main>
        <footer className="footer">
          <div>
            <span id="cityFooter">{city.name}</span><span className="f-sep">·</span>
            <span id="methodFooter">{(METHODS[settings.method] || METHODS.Karachi).name.split(' (')[0]} usuli</span>
            <span className="f-sep">·</span>
            <span id="asrFooter">Asr: {(ASR_METHODS[settings.asrMethod] || ASR_METHODS.Hanafi).name}</span>
          </div>
          <div>Astronomik hisob<span className="f-sep">·</span><span className="f-credit">RKE</span></div>
        </footer>
      </div>
      <SettingsPanel settings={settings} onChange={setSettings} now={now} />
      <SimBadge now={now} />
    </div>
  );
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
