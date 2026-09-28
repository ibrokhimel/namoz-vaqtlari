/* ─────────────────────────────────────────── */
/*  PRAYER TIMES APP — app.js                  */
/* ─────────────────────────────────────────── */

// ──────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────
const PRAYERS = [
  { key: 'fajr',    nameUz: 'Bomdod',  nameAr: 'الفجر',  icon: '🌙' },
  { key: 'dhuhr',   nameUz: 'Peshin',  nameAr: 'الظهر',  icon: '☀️' },
  { key: 'asr',     nameUz: 'Asr',     nameAr: 'العصر',  icon: '🌤️' },
  { key: 'maghrib', nameUz: 'Shom',    nameAr: 'المغرب', icon: '🌇' },
  { key: 'isha',    nameUz: 'Xufton',  nameAr: 'العشاء', icon: '🌙' },
];

const CITIES = {
  Tashkent:    { lat: 41.2995, lon: 69.2401, name: "Toshkent"   },
  Samarkand:   { lat: 39.6542, lon: 66.9597, name: "Samarqand"  },
  Bukhara:     { lat: 39.7681, lon: 64.4556, name: "Buxoro"     },
  Namangan:    { lat: 41.0011, lon: 71.6725, name: "Namangan"   },
  Andijan:     { lat: 40.7833, lon: 72.3444, name: "Andijon"    },
  Fergana:     { lat: 40.3864, lon: 71.7864, name: "Farg'ona"   },
  Nukus:       { lat: 42.4593, lon: 59.6139, name: "Nukus"      },
  Qarshi:      { lat: 38.8600, lon: 65.7897, name: "Qarshi"     },
  Termez:      { lat: 37.2242, lon: 67.2783, name: "Termiz"     },
  Urgench:     { lat: 41.5500, lon: 60.6333, name: "Urganch"    },
  Jizzakh:     { lat: 40.1158, lon: 67.8422, name: "Jizzax"     },
  Gulistan:    { lat: 40.4897, lon: 68.7786, name: "Guliston"   },
};

// Calculation methods: [Fajr angle, Isha angle]
const METHODS = {
  MWL:     { fajr: 18, isha: 17,   name: "Muslim World League" },
  ISNA:    { fajr: 15, isha: 15,   name: "ISNA (Amerika)"      },
  Egypt:   { fajr: 19.5, isha: 17.5, name: "Misr (Qohira)"    },
  Karachi: { fajr: 18, isha: 18,   name: "Karachi (O'rta Osiyo)" },
  MeccaUm: { fajr: 18.5, isha: 90, name: "Umm al-Qura (Makka)" }, // 90 min
};

// Asr: 1 = Shafi/Maliki/Hanbali, 2 = Hanafi
const ASR_METHODS = {
  Standard: { factor: 1, name: "Shofiy / Molikiy" },
  Hanafi:   { factor: 2, name: "Hanafiy" },
};

// Default settings
const DEFAULT_SETTINGS = {
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
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('prayerSettings') || 'null');
    return s ? { ...DEFAULT_SETTINGS, ...s, adjustments: { ...DEFAULT_SETTINGS.adjustments, ...(s.adjustments || {}) } }
             : { ...DEFAULT_SETTINGS, adjustments: { ...DEFAULT_SETTINGS.adjustments } };
  } catch { return { ...DEFAULT_SETTINGS, adjustments: { ...DEFAULT_SETTINGS.adjustments } }; }
}

function saveSettings(s) {
  localStorage.setItem('prayerSettings', JSON.stringify(s));
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

function calcPrayerTimes(date, lat, lon, methodKey, asrKey) {
  const method = METHODS[methodKey] || METHODS.Karachi;
  const asr    = ASR_METHODS[asrKey] || ASR_METHODS.Hanafi;
  const tz     = 5; // UTC+5 for Uzbekistan
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
function decimalToHHMM(h) {
  if (isNaN(h)) return '--:--';
  h = ((h % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

function decimalToDate(h, referenceDate) {
  if (isNaN(h)) return null;
  h = ((h % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ss = Math.floor(((h - hh) * 60 - mm) * 60);
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), hh, mm, ss);
}

function applyAdj(decimalHour, minutesAdj) {
  return decimalHour + minutesAdj / 60;
}

// ──────────────────────────────────────────────
// STARS BACKGROUND (shared by both pages)
// ──────────────────────────────────────────────
function initStars() {
  const el = document.getElementById('stars');
  if (!el) return;
  for (let i = 0; i < 130; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = Math.random() * 2.4 + 0.5;
    s.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 65}%;
      width: ${sz}px;
      height: ${sz}px;
      --d: ${(Math.random() * 3 + 1.5).toFixed(1)}s;
      --delay: ${(Math.random() * 5).toFixed(1)}s;
    `;
    el.appendChild(s);
  }
}

// ──────────────────────────────────────────────
// MAIN PAGE LOGIC
// ──────────────────────────────────────────────
let countdownInterval = null;

// ── Hijriy sana hisoblash
function toHijri(date, adj){
  adj = adj || 0;
  const HIJRI_MONTHS=['Muharram','Safar','Rabi ul-Avval','Rabi ul-Oxir',
    'Jumad ul-Avval','Jumad ul-Oxir','Rajab','Sha\'bon','Ramazon','Shavvol',
    'Zul-Qa\'da','Zul-Hijja'];
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

function renderMainPage() {
  if (!document.getElementById('todayList')) return; // not on main page

  initStars();
  updateMainPage();

  // Re-render every minute
  setInterval(updateMainPage, 60000);
}

function updateMainPage() {
  const settings = loadSettings();
  const city     = CITIES[settings.city] || CITIES.Tashkent;

  // Info bar
  const now    = new Date();
  const days   = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
  const months = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  const el = document.getElementById('dateDisplay');
  const h = toHijri(now, settings.hijriAdj || 0);
  if (el) el.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} · ${h.d} ${h.mName} ${h.y}`;

  const cityEl = document.getElementById('cityDisplay');
  if (cityEl) cityEl.textContent = city.name;

  const mosqueEl = document.getElementById('mosqueDisplay');
  if (mosqueEl) {
    mosqueEl.textContent = settings.mosqueName
      ? settings.mosqueName
      : 'Namoz Vaqtlari';
  }

  const methodEl = document.getElementById('methodDisplay');
  if (methodEl) methodEl.textContent = (METHODS[settings.method] || METHODS.Karachi).name.split(' (')[0];

  updateNextBanner(settings, city, now);
  renderDualLists(settings, city, now);

  // Countdown
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => tickCountdown(settings, city), 1000);
  tickCountdown(settings, city);
}

function getTimesForDate(date, settings, city) {
  const raw = calcPrayerTimes(date, city.lat, city.lon, settings.method, settings.asrMethod);
  const adj = settings.adjustments;
  return {
    fajr:    applyAdj(raw.fajr,    adj.fajr    || 0),
    sunrise: raw.sunrise,
    dhuhr:   applyAdj(raw.dhuhr,   adj.dhuhr   || 0),
    asr:     applyAdj(raw.asr,     adj.asr     || 0),
    maghrib: applyAdj(raw.maghrib, adj.maghrib || 0),
    isha:    applyAdj(raw.isha,    adj.isha    || 0),
  };
}

function updateNextBanner(settings, city, now) {
  const times = getTimesForDate(now, settings, city);
  const nowDecimal = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;

  let nextPrayer = null, nextTime = null;
  for (const p of PRAYERS) {
    const ph = ((times[p.key] % 24) + 24) % 24;
    if (nowDecimal < ph) {
      nextPrayer = p;
      nextTime = decimalToDate(times[p.key], now);
      break;
    }
  }

  if (!nextPrayer) {
    const tom = new Date(now); tom.setDate(tom.getDate() + 1);
    const tomTimes = getTimesForDate(tom, settings, city);
    nextPrayer = PRAYERS[0];
    nextTime = decimalToDate(tomTimes.fajr, tom);
  }

  const iconEl = document.getElementById('nextIcon');
  const nameEl = document.getElementById('nextName');
  if (iconEl) iconEl.textContent = nextPrayer.icon;
  if (nameEl) nameEl.textContent = nextPrayer.nameUz;

  window._nextPrayerTime = nextTime;
}

function tickCountdown(settings, city) {
  const now = new Date();
  if (!window._nextPrayerTime) { updateNextBanner(settings, city, now); return; }

  let diff = Math.max(0, window._nextPrayerTime - now);
  if (diff === 0) { setTimeout(() => { updateMainPage(); }, 1500); return; }

  const h  = Math.floor(diff / 3600000); diff -= h * 3600000;
  const m  = Math.floor(diff / 60000);   diff -= m * 60000;
  const s  = Math.floor(diff / 1000);

  const el = document.getElementById('countdown');
  if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function renderDualLists(settings, city, now) {
  const days   = ['Yak','Du','Se','Cho','Pay','Ju','Sha'];
  const months = ['Yan','Fev','Mar','Apr','May','Iyu','Iyu','Avg','Sen','Okt','Noy','Dek'];

  const tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const todayDateEl = document.getElementById('todayDate');
  const tomDateEl   = document.getElementById('tomorrowDate');
  if (todayDateEl) todayDateEl.textContent = `${now.getDate()} ${months[now.getMonth()]}`;
  if (tomDateEl)   tomDateEl.textContent   = `${tom.getDate()} ${months[tom.getMonth()]}`;

  buildPrayerList('todayList',    settings, city, now,  false);
  buildPrayerList('tomorrowList', settings, city, tom,  true);
}

function buildPrayerList(listId, settings, city, refDate, isTomorrow) {
  const now        = new Date();
  const times      = getTimesForDate(refDate, settings, city);
  const adj        = settings.adjustments;
  const nowDecimal = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;

  // Find currently active prayer (today only) — decimal hours comparison
  let currentKey = null;
  if (!isTomorrow) {
    const sunriseH = ((times.sunrise % 24) + 24) % 24;
    const dhuhrH   = ((times.dhuhr   % 24) + 24) % 24;
    const isZuho   = nowDecimal >= sunriseH + 15/60 && nowDecimal < dhuhrH;

    if (!isZuho) {
      for (let i = PRAYERS.length - 1; i >= 0; i--) {
        const ph = ((times[PRAYERS[i].key] % 24) + 24) % 24;
        if (nowDecimal >= ph) { currentKey = PRAYERS[i].key; break; }
      }
    }
  }

  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = '';

  PRAYERS.forEach((p, i) => {
    const adjMin   = adj[p.key] || 0;
    const ph       = ((times[p.key] % 24) + 24) % 24;
    const isActive = !isTomorrow && p.key === currentKey;
    const isPassed = !isTomorrow && !isActive && nowDecimal > ph;

    const card = document.createElement('div');
    card.className = `prayer-card compact${isActive ? ' active' : ''}${isPassed ? ' passed' : ''}`;
    card.style.setProperty('--delay', `${0.1 + i * 0.07}s`);

    const adjLabel = adjMin !== 0
      ? `<span class="p-adj">${adjMin > 0 ? '+' : ''}${adjMin}′</span>`
      : '';

    card.innerHTML = `
      <span class="p-icon-sm">${p.icon}</span>
      <span class="p-name-sm">${p.nameUz}</span>
      <span class="p-time-sm">${decimalToHHMM(times[p.key])}${adjLabel}</span>
    `;
    list.appendChild(card);

    // Sunrise divider after fajr
    if (p.key === 'fajr') {
      const row = document.createElement('div');
      row.className = 'sunrise-row-sm';
      row.innerHTML = `🌅 ${decimalToHHMM(times.sunrise)}`;
      list.appendChild(row);
    }
  });
}

// ──────────────────────────────────────────────
// SETTINGS PAGE LOGIC
// ──────────────────────────────────────────────
function renderSettingsPage() {
  if (!document.getElementById('citySelect')) return; // not on settings page

  initStars();

  const settings = loadSettings();

  // Populate mosque name inputs
  const mosqueInput = document.getElementById('mosqueInput');
  const mosqueArabicInput = document.getElementById('mosqueArabicInput');
  if (mosqueInput) mosqueInput.value = settings.mosqueName || '';
  if (mosqueArabicInput) mosqueArabicInput.value = settings.mosqueArabic || '';
  const citySelect = document.getElementById('citySelect');
  if (citySelect) {
    Object.entries(CITIES).forEach(([key, val]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.name;
      opt.selected = key === settings.city;
      citySelect.appendChild(opt);
    });
  }

  // Populate calculation method
  const methodSelect = document.getElementById('methodSelect');
  if (methodSelect) {
    Object.entries(METHODS).forEach(([key, val]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.name;
      opt.selected = key === settings.method;
      methodSelect.appendChild(opt);
    });
  }

  // Populate asr method
  const asrSelect = document.getElementById('asrSelect');
  if (asrSelect) {
    Object.entries(ASR_METHODS).forEach(([key, val]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.name;
      opt.selected = key === settings.asrMethod;
      asrSelect.appendChild(opt);
    });
  }

  // Adjustment controls
  PRAYERS.forEach(p => {
    const valEl = document.getElementById(`adj_val_${p.key}`);
    if (valEl) valEl.textContent = `${settings.adjustments[p.key] >= 0 ? '+' : ''}${settings.adjustments[p.key]} daq`;

    const plusBtn  = document.getElementById(`adj_plus_${p.key}`);
    const minusBtn = document.getElementById(`adj_minus_${p.key}`);

    function updateAdj(delta) {
      const s = loadSettings();
      s.adjustments[p.key] = Math.max(-30, Math.min(30, (s.adjustments[p.key] || 0) + delta));
      saveSettings(s);
      const el = document.getElementById(`adj_val_${p.key}`);
      if (el) el.textContent = `${s.adjustments[p.key] >= 0 ? '+' : ''}${s.adjustments[p.key]} daq`;
    }

    if (plusBtn)  plusBtn.addEventListener('click',  () => updateAdj(+1));
    if (minusBtn) minusBtn.addEventListener('click', () => updateAdj(-1));
  });

  // Hijri adjustment controls
  function updateHijriPreview(adj) {
    const now = new Date();
    const h = toHijri(now, adj);
    const valEl = document.getElementById('hijri_val');
    const preEl = document.getElementById('hijriPreview');
    if (valEl) valEl.textContent = `${adj > 0 ? '+' : ''}${adj} kun`;
    if (preEl) preEl.textContent = `Bugun: ${h.d} ${h.mName} ${h.y}`;
  }
  updateHijriPreview(settings.hijriAdj || 0);

  const hijriPlus  = document.getElementById('hijri_plus');
  const hijriMinus = document.getElementById('hijri_minus');
  function updateHijriAdj(delta) {
    const s = loadSettings();
    s.hijriAdj = Math.max(-3, Math.min(3, (s.hijriAdj || 0) + delta));
    saveSettings(s);
    updateHijriPreview(s.hijriAdj);
  }
  if (hijriPlus)  hijriPlus.addEventListener('click',  () => updateHijriAdj(+1));
  if (hijriMinus) hijriMinus.addEventListener('click', () => updateHijriAdj(-1));

  // Save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const s = loadSettings();
      s.city        = document.getElementById('citySelect').value;
      s.method      = document.getElementById('methodSelect').value;
      s.asrMethod   = document.getElementById('asrSelect').value;
      s.mosqueName  = (document.getElementById('mosqueInput')?.value || '').trim();
      s.mosqueArabic = (document.getElementById('mosqueArabicInput')?.value || '').trim();
      saveSettings(s);
      showToast('Sozlamalar saqlandi ✓');
      setTimeout(() => { window.location.href = 'index.html'; }, 900);
    });
  }
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ──────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderMainPage();
  renderSettingsPage();
});
