import { decimalToDate, decimalToHHMM, getTimesForDate } from '../core/prayer.js';
import { PRAYERS_TV, RAMAZON_NOTE, SUNRISE, fmtDayUz, forDay, isRamazon } from '../core/day.js';

const ROWS = [PRAYERS_TV[0], SUNRISE, ...PRAYERS_TV.slice(1)];

// Today and tomorrow side by side: one row per prayer, no cards.
// Current prayer = inverted row; next = accent; passed = muted.
export default function TodayTable({ now, st, settings, city }) {
  const ramazon = isRamazon(now, settings);
  const TT = getTimesForDate(st.tom, settings, city);
  return (
    <section className="today-table" id="todayRow" aria-label="Namoz vaqtlari: bugun va ertaga">
      <div className="tt-head">
        <span />
        <span>Bugun</span>
        <span>Ertaga, {fmtDayUz(st.tom).split(', ')[1]}</span>
      </div>
      {ROWS.map(c => {
        const q = forDay(c, now);
        const d = decimalToDate(st.T[q.key], now);
        const isCur = !q.sun && st.current && !st.current.yesterday && st.current.key === q.key;
        const isNext = !q.sun && !st.next.tomorrow && st.next.key === q.key;
        const isPast = !isCur && !isNext && d && d <= now;
        const state = (ramazon && RAMAZON_NOTE[q.key]) || (isCur ? 'Hozir' : isNext ? 'Keyingi' : '');
        const cls = ['tt-row', q.sun && 'sun', isCur && 'current', isNext && 'next', isPast && 'passed'].filter(Boolean).join(' ');
        const tomName = c.key === 'dhuhr' && st.tom.getDay() === 5 ? 'Juma' : null;
        return (
          <div key={c.key} className={cls} data-key={c.key}>
            <span className="tt-name">
              <span className="t-uz">{q.nameUz}</span>
              {!q.sun && <span className="t-ar" lang="ar">{q.nameAr}</span>}
              {state && <span className="t-state">{state}</span>}
            </span>
            <span className="t-time">{decimalToHHMM(st.T[q.key])}</span>
            <span className="t-tom">{tomName && <small>{tomName} </small>}{decimalToHHMM(TT[c.key])}</span>
          </div>
        );
      })}
    </section>
  );
}
