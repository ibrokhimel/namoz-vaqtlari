/* ─────────────────────────────────────────── */
/*  NAMOZ VAQTLARI — core/prayer.js            */
/*  Prayer-time maths, settings, clock, Hijri  */
/*  Shared by the phone pages and the TV app   */
/* ─────────────────────────────────────────── */

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────
export const PRAYERS = [
  { key: 'fajr',    nameUz: 'Bomdod',  nameAr: 'الفجر',  icon: '🌙' },
  { key: 'dhuhr',   nameUz: 'Peshin',  nameAr: 'الظهر',  icon: '☀️' },
  { key: 'asr',     nameUz: 'Asr',     nameAr: 'العصر',  icon: '🌤️' },
  { key: 'maghrib', nameUz: 'Shom',    nameAr: 'المغرب', icon: '🌇' },
  { key: 'isha',    nameUz: 'Xufton',  nameAr: 'العشاء', icon: '🌙' },
];

export const CITIES = {
  Tashkent:    { lat: 41.2995, lon: 69.2401, name: "Toshkent"   },
  Samarkand:   { lat: 39.6542, lon: 66.9597, name: "Samarqand"  },
  Bukhara:     { lat: 39.7681, lon: 64.4556, name: "Buxoro"     },
  Namangan:    { lat: 41.0011, lon: 71.6725, name: "Namangan"   },
  Andijan:     { lat: 40.7833, lon: 72.3444, name: "Andijon"    },
  Fergana:     { lat: 40.3864, lon: 71.7864, name: "Fargʻona"   },
  Nukus:       { lat: 42.4593, lon: 59.6139, name: "Nukus"      },
  Qarshi:      { lat: 38.8600, lon: 65.7897, name: "Qarshi"     },
  Termez:      { lat: 37.2242, lon: 67.2783, name: "Termiz"     },
  Urgench:     { lat: 41.5500, lon: 60.6333, name: "Urganch"    },
  Jizzakh:     { lat: 40.1158, lon: 67.8422, name: "Jizzax"     },
  Gulistan:    { lat: 40.4897, lon: 68.7786, name: "Guliston"   },
};

// Calculation methods: [Fajr angle, Isha angle]
export const METHODS = {
  MWL:     { fajr: 18, isha: 17,   name: "Muslim World League" },
  ISNA:    { fajr: 15, isha: 15,   name: "ISNA (Amerika)"      },
  Egypt:   { fajr: 19.5, isha: 17.5, name: "Misr (Qohira)"    },
  Karachi: { fajr: 18, isha: 18,   name: "Karachi (Oʻrta Osiyo)" },
  MeccaUm: { fajr: 18.5, isha: 90, name: "Umm al-Qura (Makka)" }, // 90 min
};

// Asr: 1 = Shafi/Maliki/Hanbali, 2 = Hanafi
export const ASR_METHODS = {
  Standard: { factor: 1, name: "Shofiy / Molikiy" },
  Hanafi:   { factor: 2, name: "Hanafiy" },
};

// Default settings
export const DEFAULT_SETTINGS = {
  city:        'Tashkent',
  method:      'Karachi',
  asrMethod:   'Hanafi',
  mosqueName:  '',
  mosqueArabic: '',
  hijriAdj:    0,
  adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
};

// ──────────────────────────────────────────────
// SETTINGS STORE
// ──────────────────────────────────────────────
export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('prayerSettings') || 'null');
    return s ? { ...DEFAULT_SETTINGS, ...s, adjustments: { ...DEFAULT_SETTINGS.adjustments, ...(s.adjustments || {}) } }
             : { ...DEFAULT_SETTINGS, adjustments: { ...DEFAULT_SETTINGS.adjustments } };
  } catch { return { ...DEFAULT_SETTINGS, adjustments: { ...DEFAULT_SETTINGS.adjustments } }; }
}

export function saveSettings(s) {
  try { localStorage.setItem('prayerSettings', JSON.stringify(s)); return true; }
  catch { return false; }  // storage full or blocked: keep running on defaults
}

// ──────────────────────────────────────────────
// CLOCK
// ──────────────────────────────────────────────
// Every city is in Uzbekistan (UTC+5, no DST). A TV whose system time
// zone is left at UTC would otherwise show a clock five hours off and
// count down to the wrong moment. appNow() returns a Date whose *local*
// fields (getHours, getDate...) read Tashkent wall time whatever the
// device zone is, so all date math below can keep using local getters.
export const CITY_UTC_OFFSET_MIN = 5 * 60;

export function appNow() {
  const d = new Date();
  return new Date(d.getTime() + (CITY_UTC_OFFSET_MIN + d.getTimezoneOffset()) * 60000);
}

// ──────────────────────────────────────────────
// MATH HELPERS
// ──────────────────────────────────────────────
const toRad = d => d * Math.PI / 180;
const toDeg = r => r * 180 / Math.PI;

function julianDay(date) {
  let y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(date) {
  const JD = julianDay(date);
  const D  = JD - 2451545.0;
  const g  = toRad(((357.529 + 0.98560028 * D) % 360 + 360) % 360);
  const q  = ((280.459 + 0.98564736 * D) % 360 + 360) % 360;
  const L  = toRad(((q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360 + 360) % 360);
  const e  = toRad(23.439 - 0.0000004 * D);
  const RA = toDeg(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
  const sinDec = Math.sin(e) * Math.sin(L);
  const cosDec = Math.cos(Math.asin(sinDec));
  const EqT    = q / 15 - ((RA + 24) % 24);
  return { sinDec, cosDec, EqT };
}

export function calcPrayerTimes(date, lat, lon, methodKey, asrKey) {
  const method = METHODS[methodKey] || METHODS.Karachi;
  const asr    = ASR_METHODS[asrKey] || ASR_METHODS.Hanafi;
  const tz     = CITY_UTC_OFFSET_MIN / 60;
  const { sinDec, cosDec, EqT } = sunPosition(date);

  const transit = 12 + tz - lon / 15 - EqT;

  function ha(angle) {
    const num = Math.sin(toRad(angle)) - Math.sin(toRad(lat)) * sinDec;
    const den = Math.cos(toRad(lat)) * cosDec;
    if (Math.abs(num / den) > 1) return NaN;
    return toDeg(Math.acos(num / den)) / 15;
  }

  function asrHA(shadow) {
    const a = Math.atan(1 / (shadow + Math.tan(Math.abs(toRad(lat) - Math.asin(sinDec)))));
    const n = Math.sin(a) - Math.sin(toRad(lat)) * sinDec;
    const dd = Math.cos(toRad(lat)) * cosDec;
    if (Math.abs(n / dd) > 1) return NaN;
    return toDeg(Math.acos(n / dd)) / 15;
  }

  // Isha: if method.isha >= 60 it's a fixed offset in minutes from Maghrib
  const ishaIsOffset = method.isha >= 60;
  const maghribDecimal = transit + ha(-0.833);

  return {
    fajr:    transit - ha(-method.fajr),
    sunrise: transit - ha(-0.833),
    dhuhr:   transit + 0.055,
    asr:     transit + asrHA(asr.factor),
    maghrib: maghribDecimal,
    isha:    ishaIsOffset ? maghribDecimal + method.isha / 60 : transit + ha(-method.isha),
  };
}

// ──────────────────────────────────────────────
// TIME FORMATTERS
// ──────────────────────────────────────────────
// Work in whole seconds so float error (16.3*60 = 977.9999...) never
// turns 16:18 into 16:17.
export function decimalToHHMM(h) {
  if (!Number.isFinite(h)) return '--:--';
  const m = Math.round((((h % 24) + 24) % 24) * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
}

export function decimalToDate(h, referenceDate) {
  if (!Number.isFinite(h)) return null;
  const s = Math.round((((h % 24) + 24) % 24) * 3600);
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, s);
}

// Published timetables use whole minutes; round once, here, so the time
// shown and the moment the countdown reaches zero are the same minute.
export const roundToMinute = h => Number.isFinite(h) ? Math.round(h * 60) / 60 : NaN;

export function applyAdj(decimalHour, minutesAdj) {
  return decimalHour + minutesAdj / 60;
}

// ──────────────────────────────────────────────
// HIJRI DATE
// ──────────────────────────────────────────────
export function toHijri(date, adj){
  adj = adj || 0;
  const HIJRI_MONTHS=['Muharram','Safar','Rabiul avval','Rabiul oxir',
    'Jumodul avval','Jumodul oxir','Rajab','Shaʼbon','Ramazon','Shavvol',
    'Zulqaʼda','Zulhijja'];
  const d2 = new Date(date); d2.setDate(d2.getDate() + adj);
  const y=d2.getFullYear(),m=d2.getMonth()+1,d=d2.getDate();
  const a=Math.floor((14-m)/12);
  const yr=y+4800-a, mo=m+12*a-3;
  let jdn=d+Math.floor((153*mo+2)/5)+365*yr+Math.floor(yr/4)-Math.floor(yr/100)+Math.floor(yr/400)-32045;
  const l=jdn-1948440+10632;
  const n=Math.floor((l-1)/10631);
  const l2=l-10631*n+354;
  const j=Math.floor((10985-l2)/5316)*Math.floor((50*l2)/17719)+Math.floor(l2/5670)*Math.floor((43*l2)/15238);
  const l3=l2-Math.floor((30-j)/15)*Math.floor((17719*j)/50)-Math.floor(j/16)*Math.floor((15238*j)/43)+29;
  const hm=Math.floor((24*l3)/709);
  const hd=l3-Math.floor((709*hm)/24);
  const hy=30*n+j-30;
  return { d:hd, m:hm, y:hy, mName:HIJRI_MONTHS[hm-1] };
}

// Adjusted prayer times for a date (sunrise is never adjusted)
export function getTimesForDate(date, settings, city) {
  const raw = calcPrayerTimes(date, city.lat, city.lon, settings.method, settings.asrMethod);
  const adj = settings.adjustments;
  return {
    fajr:    roundToMinute(applyAdj(raw.fajr,    adj.fajr    || 0)),
    sunrise: roundToMinute(raw.sunrise),
    dhuhr:   roundToMinute(applyAdj(raw.dhuhr,   adj.dhuhr   || 0)),
    asr:     roundToMinute(applyAdj(raw.asr,     adj.asr     || 0)),
    maghrib: roundToMinute(applyAdj(raw.maghrib, adj.maghrib || 0)),
    isha:    roundToMinute(applyAdj(raw.isha,    adj.isha    || 0)),
  };
}
