import { toHijri } from '../core/prayer.js';
import { fmtDayUz } from '../core/day.js';

const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم';

// Mosque identity (left) + today's date, Gregorian and Hijri (right).
// The wall clock lives in the centre of the dial.
export default function TopBar({ now, settings }) {
  const h = toHijri(now, settings.hijriAdj || 0);
  return (
    <header className="topbar">
      <div className="mosque-block">
        <div className="mosque-arabic" id="mosqueArabic" lang="ar" dir="rtl">{settings.mosqueArabic || BISMILLAH}</div>
        <div className="mosque-name" id="mosqueName">{settings.mosqueName || 'Namoz Vaqtlari'}</div>
      </div>
      <div className="live-date">
        <span id="liveDate">{fmtDayUz(now)} {now.getFullYear()}</span>
        <span id="liveHijri">{h.d} {h.mName} {h.y}</span>
      </div>
    </header>
  );
}
