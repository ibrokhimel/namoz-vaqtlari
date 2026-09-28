import { decimalToHHMM, getTimesForDate } from '../core/prayer.js';
import { fmtDayUz } from '../core/day.js';

// Tomorrow as one quiet line
export default function TomorrowLine({ st, settings, city }) {
  const TT = getTimesForDate(st.tom, settings, city);
  const items = [['Bomdod', 'fajr'], ['Quyosh', 'sunrise'], [st.tom.getDay() === 5 ? 'Juma' : 'Peshin', 'dhuhr'],
    ['Asr', 'asr'], ['Shom', 'maghrib'], ['Xufton', 'isha']];
  return (
    <section className="tomorrow-line" id="tomorrowLine">
      <span className="tl-day">Ertaga, {fmtDayUz(st.tom).split(', ')[1]}</span>
      {items.map(([n, k]) => <span key={k} className="tl-item">{n}<b>{decimalToHHMM(TT[k])}</b></span>)}
    </section>
  );
}
