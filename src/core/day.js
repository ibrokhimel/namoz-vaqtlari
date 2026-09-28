/* ─────────────────────────────────────────── */
/*  NAMOZ VAQTLARI — core/day.js               */
/*  Where are we in the day? Pure functions,   */
/*  no DOM: used by the TV app and the tests.  */
/* ─────────────────────────────────────────── */
import { decimalToDate, getTimesForDate, toHijri } from './prayer.js';

export const PRAYERS_TV = [
  { key: 'fajr',    nameUz: 'Bomdod', nameAr: 'الفجر' },
  { key: 'dhuhr',   nameUz: 'Peshin', nameAr: 'الظهر' },
  { key: 'asr',     nameUz: 'Asr',    nameAr: 'العصر' },
  { key: 'maghrib', nameUz: 'Shom',   nameAr: 'المغرب' },
  { key: 'isha',    nameUz: 'Xufton', nameAr: 'العشاء' },
];
export const SUNRISE = { key: 'sunrise', nameUz: 'Quyosh', nameAr: 'الشروق', sun: true };

export const DAYS_UZ   = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
export const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

export const pad2 = n => String(n).padStart(2, '0');
export const hhmm = d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
export const fmtDayUz = d => `${DAYS_UZ[d.getDay()]}, ${d.getDate()}-${MONTHS_UZ[d.getMonth()].toLowerCase()}`;

// How long the hero keeps announcing a prayer that has just begun
export const STARTED_MS = 5 * 60000;

// ── SPECIAL DAYS ─────────────────────────────
// Friday: Peshin is prayed as Juma. Ramazon (Hijri month 9): Bomdod marks
// the end of saharlik and Shom is iftorlik.
export const JUMA = { nameUz: 'Juma', nameAr: 'الجمعة' };
export const RAMAZON_NOTE = { fajr: 'Saharlik tugaydi', maghrib: 'Iftorlik' };
export const RAMAZON_HERO = { fajr: 'Saharlik tugashiga', maghrib: 'Iftorgacha' };

export function forDay(p, date) {
  return (p.key === 'dhuhr' && date.getDay() === 5) ? { ...p, ...JUMA } : p;
}
export function isRamazon(date, settings) {
  return toHijri(date, settings.hijriAdj || 0).m === 9;
}

// Makruh windows (Hanafi): sunrise to +15 min, zawal (15 min before
// Peshin), and the 5 minutes before Shom. Returns the end of the window
// we are in, or null.
export function makruhEnd(now, T) {
  const M = 60000, at = t => decimalToDate(t, now);
  const sun = at(T.sunrise), dhuhr = at(T.dhuhr), maghrib = at(T.maghrib);
  const windows = [
    sun     && [sun, new Date(+sun + 15 * M)],
    dhuhr   && [new Date(+dhuhr - 15 * M), dhuhr],
    maghrib && [new Date(+maghrib - 5 * M), maghrib],
  ].filter(Boolean);
  const w = windows.find(([a, b]) => now >= a && now < b);
  return w ? w[1] : null;
}

// Works on real Date objects, not decimal hours.
//  current: prayer whose time is running now (null between sunrise and
//           Peshin, and before Bomdod, when no prayer of *today* is current)
//  next:    the next prayer to start (tomorrow's Bomdod after Xufton)
//  started: current prayer if it began less than STARTED_MS ago
export function getDayState(now, settings, city) {
  const tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const T = getTimesForDate(now, settings, city);
  const at = (t, ref) => decimalToDate(t, ref);
  const today = PRAYERS_TV.map(p => ({ ...forDay(p, now), date: at(T[p.key], now) })).filter(p => p.date);
  const sunrise = at(T.sunrise, now);

  let next = today.find(p => p.date > now);
  if (!next) {
    // first prayer of tomorrow with a valid time (Bomdod unless NaN)
    const TT = getTimesForDate(tom, settings, city);
    const p = PRAYERS_TV.find(p => Number.isFinite(TT[p.key])) || PRAYERS_TV[0];
    next = { ...forDay(p, tom), date: at(TT[p.key], tom), tomorrow: true };
  }
  const begun = today.filter(p => p.date <= now);
  let current = begun.length ? begun[begun.length - 1] : null;
  if (current && current.key === 'fajr' && sunrise && now >= sunrise) current = null;

  const started = current && (now - current.date) < STARTED_MS ? current : null;
  return {
    T, sunrise, current, next, tom, started,
    startedUntil: started ? new Date(+started.date + STARTED_MS) : null,
    makruhUntil: makruhEnd(now, T),
  };
}

// Screen phase follows the sun: day (sunrise -> Shom), dusk (Bomdod ->
// sunrise and Shom -> Xufton), night (Xufton -> Bomdod).
export function dayPhase(now, T) {
  const at = t => decimalToDate(t, now);
  const fajr = at(T.fajr), sun = at(T.sunrise), maghrib = at(T.maghrib), isha = at(T.isha);
  if (!fajr || !sun || !maghrib || !isha) return 'dusk';
  if (now < fajr || now >= isha) return 'night';
  if (now >= sun && now < maghrib) return 'day';
  return 'dusk';
}

// Countdown wording: minutes while far away, seconds in the last 10 min
export function countdownParts(ms) {
  const totalS = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalS / 3600), m = Math.floor((totalS % 3600) / 60), s = totalS % 60;
  if (totalS < 600) return [[m, 'daqiqa'], [pad2(s), 'soniya']];
  if (h > 0) return [[h, 'soat'], [m, 'daqiqa']];
  return [[m, 'daqiqa']];
}
