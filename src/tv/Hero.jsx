import { RAMAZON_HERO, countdownParts, hhmm, isRamazon } from '../core/day.js';
import Dial from './Dial.jsx';

// The one thing the back row must read: announces a prayer for 5 minutes
// after it begins ("vaqti kirdi"), otherwise shows the next prayer. The
// dial beside it is the wall clock: 24-hour face, hand on "now".
export default function Hero({ now, st, settings }) {
  const ramazon = isRamazon(now, settings);
  let label, p, time;
  if (st.started) {
    p = st.started; label = 'Hozir'; time = hhmm(p.date);
  } else {
    p = st.next;
    const nextDay = p.tomorrow ? st.tom : now;
    label = (isRamazon(nextDay, settings) && RAMAZON_HERO[p.key]) || 'Keyingi namoz';
    if (p.tomorrow) label += ' · ertaga';
    time = p.date ? hhmm(p.date) : '--:--';
  }
  const heroKey = `${st.started ? 'now' : 'next'}:${p.key}:${p.nameUz}`;
  const makruh = st.makruhUntil && now < st.makruhUntil ? `Hozir makruh vaqt · ${hhmm(st.makruhUntil)} gacha` : '';
  const periodName = st.current ? `${st.current.nameUz} vaqti` : 'Namoz vaqti emas';

  return (
    <section className={`hero enter${st.started ? ' started' : ''}`} id="hero">
      <div className="hero-text" key={heroKey}>
        <div className="hero-head">
          <div className="hero-label" id="heroLabel">{label}</div>
          <div className="hero-note" id="heroNote">{makruh}</div>
        </div>
        <div className="hero-name">
          <span className="hero-uz" id="heroName">{p.nameUz}</span>
          <span className="hero-ar" id="heroAr" lang="ar" dir="rtl">{p.nameAr}</span>
        </div>
        <div className="hero-when">
          <span className="hero-time" id="heroTime">{time}</span>
          <Countdown now={now} st={st} ramazon={ramazon} />
        </div>
      </div>
      <div className="hero-dial">
        <Dial now={now} st={st} />
        <div className="dial-center">
          <div className="dial-clock" id="liveClock">{hhmm(now)}</div>
          <div className="dial-period">{periodName}</div>
        </div>
      </div>
    </section>
  );
}

function Countdown({ now, st, ramazon }) {
  let body;
  if (st.started) {
    const k = st.started.key;
    body = ramazon && k === 'maghrib' ? 'Iftor vaqti kirdi'
         : ramazon && k === 'fajr'    ? 'Saharlik vaqti tugadi'
         : `${st.started.nameUz} vaqti kirdi`;
  } else if (!st.next.date) {
    body = 'Vaqtni hisoblab boʻlmadi';
  } else {
    const parts = countdownParts(st.next.date - now);
    body = <>{parts.map(([n, unit], i) => <span key={unit}>{i > 0 && ' '}<b>{n}</b> {unit}</span>)} qoldi</>;
  }
  return <div className="hero-countdown" id="heroCountdown">{body}</div>;
}
