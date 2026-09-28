/* ─────────────────────────────────────────── */
/*  PRAYER TIMES APP — app.js (index + settings) */
/*  Requires core.js                           */
/* ─────────────────────────────────────────── */

// ──────────────────────────────────────────────
// MAIN PAGE LOGIC
// ──────────────────────────────────────────────
let countdownInterval = null;


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
