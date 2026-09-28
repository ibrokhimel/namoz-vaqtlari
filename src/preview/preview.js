// Test page: every TV state live at once, each an iframe of tv.html?at=...
// Scenario times are derived from the saved settings (city, method,
// adjustments), so "Asr vaqti kirdi" is always one minute after *your* Asr.
import { CITIES, decimalToDate, getTimesForDate, loadSettings, toHijri } from '../core/prayer.js';
import { pad2 } from '../core/day.js';
import '../assets/fonts/fonts.css';
import './preview.css';

const settings = loadSettings();
const city = CITIES[settings.city] || CITIES.Tashkent;
const MIN = 60000;

const today = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const timeOf = (day, key) => decimalToDate(getTimesForDate(day, settings, city)[key], day);
const shift = (d, minutes) => d && new Date(+d + minutes * MIN);

const nextWeekday = (from, wd) => addDays(from, (wd - from.getDay() + 7) % 7 || 7);
function nextRamazonDay(from) {
  for (let i = 0; i < 400; i++) {
    const d = addDays(from, i), h = toHijri(d, settings.hijriAdj || 0);
    if (h.m === 9 && h.d >= 5) return d;          // a few days in, clear of the month edge
  }
  return from;
}
const juma = nextWeekday(today, 5);
const ramazon = nextRamazonDay(today);
const weekday = today.getDay() === 5 ? addDays(today, 1) : today;   // plain day, not Friday

const SCENARIOS = [
  ['Kunduzi', 'Peshin vaqti, keyingisi Asr', shift(timeOf(weekday, 'dhuhr'), 90)],
  ['Makruh (zavol)', 'Peshindan oldingi 15 daqiqa', shift(timeOf(weekday, 'dhuhr'), -8)],
  ['Oxirgi 10 daqiqa', 'Soniyalar koʻrinadi', shift(timeOf(weekday, 'asr'), -7)],
  ['Asr vaqti kirdi', 'Birinchi 5 daqiqa eʼloni', shift(timeOf(weekday, 'asr'), 1)],
  ['Shom (kechqurun)', 'Dusk rang rejimi', shift(timeOf(weekday, 'maghrib'), 20)],
  ['Kechasi', 'Xuftondan keyin, keyingisi ertaga', shift(timeOf(weekday, 'isha'), 120)],
  ['Bomdoddan oldin', 'Tun, keyingisi Bomdod', shift(timeOf(weekday, 'fajr'), -90)],
  ['Quyosh chiqishi', 'Makruh, keyin namoz vaqti emas', shift(timeOf(weekday, 'sunrise'), 5)],
  ['Juma', 'Peshin oʻrniga Juma', shift(timeOf(juma, 'dhuhr'), -60)],
  ['Ramazon · iftorgacha', 'Iftorlik, saharlik belgilari', shift(timeOf(ramazon, 'maghrib'), -40)],
  ['Ramazon · saharlik', 'Saharlik tugashiga', shift(timeOf(ramazon, 'fajr'), -30)],
  ['Butun kun ×600', 'Yarim tundan boshlab, tez', today, 600],
];

const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const url = (d, speed = 1) => `tv.html?at=${iso(d)}${speed > 1 ? `&speed=${speed}` : ''}`;
const label = d => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

document.getElementById('pvCity').textContent = city.name;
document.getElementById('pvGrid').innerHTML = SCENARIOS.filter(([, , d]) => d).map(([title, sub, d, speed = 1]) => `
  <article class="pv-card">
    <div class="pv-frame"><iframe src="${url(d, speed)}" title="${title}" loading="lazy" tabindex="-1"></iframe></div>
    <div class="pv-meta">
      <div><h2>${title}</h2><p>${sub} · ${label(d)}</p></div>
      <div class="pv-links">
        <a href="${url(d, speed)}" target="_blank">Toʻliq</a>
        ${speed === 1 ? `<a href="${url(d, 60)}" target="_blank">×60</a>` : ''}
      </div>
    </div>
  </article>`).join('');

const at = document.getElementById('pvAt');
const pvSpeed = document.getElementById('pvSpeed');
at.value = iso(new Date());
document.getElementById('pvForm').addEventListener('submit', e => {
  e.preventDefault();
  window.open(`tv.html?at=${at.value}${+pvSpeed.value > 1 ? `&speed=${pvSpeed.value}` : ''}`, '_blank');
});
