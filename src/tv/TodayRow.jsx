import { decimalToDate, decimalToHHMM } from '../core/prayer.js';
import { PRAYERS_TV, RAMAZON_NOTE, SUNRISE, forDay, isRamazon } from '../core/day.js';

const COLS = [PRAYERS_TV[0], SUNRISE, ...PRAYERS_TV.slice(1)];

// Bomdod, Quyosh, Peshin, Asr, Shom, Xufton — one row of columns, no cards
export default function TodayRow({ now, st, settings }) {
  const ramazon = isRamazon(now, settings);
  return (
    <section className="today-row" id="todayRow" aria-label="Bugungi namoz vaqtlari">
      {COLS.map(c => {
        const q = forDay(c, now);
        const d = decimalToDate(st.T[q.key], now);
        const isCur = !q.sun && st.current && st.current.key === q.key;
        const isNext = !q.sun && !st.next.tomorrow && st.next.key === q.key;
        const isPast = !isCur && !isNext && d && d <= now;
        const cls = ['t-col', q.sun && 'sun', isCur && 'current', isNext && 'next', isPast && 'passed'].filter(Boolean).join(' ');
        return (
          <div key={c.key} className={cls} data-key={c.key}>
            <div className="t-head">
              <span className="t-uz">{q.nameUz}</span>
              {!q.sun && <span className="t-ar" lang="ar">{q.nameAr}</span>}
            </div>
            <div className="t-time">{decimalToHHMM(st.T[q.key])}</div>
            <div className="t-state">{(ramazon && RAMAZON_NOTE[q.key]) || (isCur ? 'Hozir' : isNext ? 'Keyingi' : '')}</div>
          </div>
        );
      })}
    </section>
  );
}
