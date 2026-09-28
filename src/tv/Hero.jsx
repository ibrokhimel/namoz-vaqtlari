import { RAMAZON_HERO, countdownParts, heroMode, hhmm, isRamazon } from '../core/day.js';
import { AnimatePresence, motion } from 'motion/react';
import Dial from './Dial.jsx';
import { FocusText, RollingNumber } from './Motion.jsx';

// The one thing the back row must read. By default the prayer whose time
// it is now, with how long its time lasts; once the next prayer is close
// (settings.nextLeadMin), the next prayer and its countdown. The dial
// beside it is the wall clock.
export default function Hero({ now, st, settings }) {
  const ramazon = isRamazon(now, settings);
  const mode = heroMode(st, now, settings.nextLeadMin ?? 30);
  let label, p, time, until;
  if (mode === 'current') {
    p = st.current;
    label = st.started ? 'Hozir' : `Hozir · ${p.nameUz} vaqti`;
    time = hhmm(p.date);
    until = p.endsAt;
  } else {
    p = st.next;
    const nextDay = p.tomorrow ? st.tom : now;
    label = (isRamazon(nextDay, settings) && RAMAZON_HERO[p.key]) || 'Keyingi namoz';
    if (p.tomorrow) label += ' · ertaga';
    time = p.date ? hhmm(p.date) : '--:--';
    until = p.date;
  }
  const heroKey = `${mode}:${p.key}:${p.nameUz}`;
  const makruh = st.makruhUntil && now < st.makruhUntil ? `Hozir makruh vaqt · ${hhmm(st.makruhUntil)} gacha` : '';
  const periodName = st.current ? `${st.current.nameUz} vaqti` : 'Namoz vaqti emas';

  return (
    <section className={`hero enter mode-${mode}${st.started ? ' started' : ''}`} id="hero">
      <AnimatePresence mode="wait" initial={false}>
      {/* a new prayer: the old one blurs away, the new one comes into focus */}
      <motion.div className="hero-text" key={heroKey}
        initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
        transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}>
        <div className="hero-head">
          <div className="hero-label" id="heroLabel">{label}</div>
          <div className="hero-note" id="heroNote">{makruh}</div>
        </div>
        <div className="hero-name">
          <span className="hero-uz" id="heroName" aria-label={p.nameUz}><FocusText text={p.nameUz} /></span>
          <span className="hero-ar" id="heroAr" lang="ar" dir="rtl">{p.nameAr}</span>
        </div>
        <div className="hero-when">
          <span className="hero-time" id="heroTime">{time}</span>
          <Countdown now={now} st={st} mode={mode} until={until} ramazon={ramazon} />
        </div>
      </motion.div>
      </AnimatePresence>
      <div className="hero-dial">
        <Dial now={now} st={st} />
        <div className="dial-center">
          <div className="dial-clock" id="liveClock" aria-label={hhmm(now)}>
            <RollingNumber value={now.getHours()} digits={2} /><span className="colon">:</span><RollingNumber value={now.getMinutes()} digits={2} />
          </div>
          <div className="dial-period">{periodName}</div>
        </div>
      </div>
    </section>
  );
}

function Countdown({ now, st, mode, until, ramazon }) {
  let body;
  if (st.started && mode === 'current') {
    const k = st.started.key;
    body = ramazon && k === 'maghrib' ? 'Iftor vaqti kirdi'
         : ramazon && k === 'fajr'    ? 'Saharlik vaqti tugadi'
         : `${st.started.nameUz} vaqti kirdi`;
  } else if (!until) {
    body = 'Vaqtni hisoblab boʻlmadi';
  } else {
    const parts = countdownParts(until - now).map(([n, unit], i) => (
      <span key={unit}>{i > 0 && ' '}<b><RollingNumber value={Number(n)} digits={unit === 'soniya' ? 2 : String(Number(n)).length} /></b> {unit}</span>
    ));
    // current: how long this prayer's time lasts; next: time until it
    body = mode === 'current'
      ? <>tugashiga {parts}</>
      : <>{parts} qoldi</>;
  }
  return <div className="hero-countdown" id="heroCountdown">{body}</div>;
}
