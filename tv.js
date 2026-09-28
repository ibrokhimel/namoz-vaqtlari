/* ─────────────────────────────────────────── */
/*  TV DISPLAY — tv.js  (requires core.js)     */
/* ─────────────────────────────────────────── */

const PRAYERS_TV=[
  {key:'fajr',   nameUz:'Bomdod',nameAr:'الفجر', icon:'🌙'},
  {key:'dhuhr',  nameUz:'Peshin',nameAr:'الظهر', icon:'☀️'},
  {key:'asr',    nameUz:'Asr',   nameAr:'العصر', icon:'🌤️'},
  {key:'maghrib',nameUz:'Shom',  nameAr:'المغرب',icon:'🌇'},
  {key:'isha',   nameUz:'Xufton',nameAr:'العشاء',icon:'🌙'},
];
const DAYS_UZ=['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
const MONTHS_UZ=['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

// Stars
(function(){
  const el=document.getElementById('stars');
  for(let i=0;i<200;i++){
    const s=document.createElement('div');s.className='star';
    const sz=Math.random()*2.8+.4;
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*72}%;width:${sz}px;height:${sz}px;--d:${(Math.random()*3+1.5).toFixed(1)}s;--dl:${(Math.random()*7).toFixed(1)}s`;
    el.appendChild(s);
  }
})();


const pad2 = n => String(n).padStart(2,'0');
const fmtDayUz = d => `${DAYS_UZ[d.getDay()]}, ${d.getDate()}-${MONTHS_UZ[d.getMonth()].toLowerCase()}`;

function tickClock(){
  const now=appNow();
  const settings=loadSettings();
  document.getElementById('liveClock').textContent=`${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const h=toHijri(now, settings.hijriAdj||0);
  document.getElementById('liveDate').textContent=`${fmtDayUz(now)} ${now.getFullYear()}`;
  document.getElementById('liveHijri').textContent=`${h.d} ${h.mName} ${h.y}`;
}

// ── SPECIAL DAYS ─────────────────────────────
// Friday: Peshin is prayed as Juma. Ramazon (Hijri month 9): Bomdod marks
// the end of saharlik and Shom is iftorlik.
const JUMA={nameUz:'Juma', nameAr:'الجمعة'};
const RAMAZON_NOTE={fajr:'Saharlik tugaydi', maghrib:'Iftorlik'};
const RAMAZON_HERO={fajr:'Saharlik tugashiga', maghrib:'Iftorgacha'};

function forDay(p, date){
  return (p.key==='dhuhr' && date.getDay()===5) ? {...p, ...JUMA} : p;
}
function isRamazon(date, settings){
  return toHijri(date, settings.hijriAdj||0).m===9;
}

// Makruh windows (Hanafi): sunrise to +15 min, zawal (15 min before
// Peshin), and the 5 minutes before Shom. Returns the end of the window
// we are in, or null.
function makruhEnd(now, T){
  const M=60000, at=t=>decimalToDate(t,now);
  const sun=at(T.sunrise), dhuhr=at(T.dhuhr), maghrib=at(T.maghrib);
  const windows=[
    sun     && [sun, new Date(+sun+15*M)],
    dhuhr   && [new Date(+dhuhr-15*M), dhuhr],
    maghrib && [new Date(+maghrib-5*M), maghrib],
  ].filter(Boolean);
  const w=windows.find(([a,b])=>now>=a && now<b);
  return w?w[1]:null;
}

// Where are we in the day? Works on real Date objects, not decimal hours.
//  current: prayer whose time is running now (null between sunrise and
//           Peshin, and before Bomdod, when no prayer of *today* is current)
//  next:    the next prayer to start (tomorrow's Bomdod after Xufton)
//  from:    start of the interval the progress bar measures
function getDayState(now, settings, city){
  const tom=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  const yes=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
  const T =getTimesForDate(now,settings,city);
  const at=(t,ref)=>decimalToDate(t,ref);
  const today=PRAYERS_TV.map(p=>({...forDay(p,now), date:at(T[p.key],now)})).filter(p=>p.date);
  const sunrise=at(T.sunrise,now);

  let next=today.find(p=>p.date>now);
  if(!next){
    // first prayer of tomorrow that has a valid time (Bomdod unless the
    // calculation returned NaN for it)
    const TT=getTimesForDate(tom,settings,city);
    const p=PRAYERS_TV.find(p=>Number.isFinite(TT[p.key]))||PRAYERS_TV[0];
    next={...forDay(p,tom), date:at(TT[p.key],tom), tomorrow:true};
  }
  const started=today.filter(p=>p.date<=now);
  let current=started.length?started[started.length-1]:null;
  if(current && current.key==='fajr' && sunrise && now>=sunrise) current=null;

  let from;
  if(current) from=current.date;
  else if(sunrise && now>=sunrise) from=sunrise;
  else {
    const YT=getTimesForDate(yes,settings,city);
    from=at(YT.isha,yes);
  }
  if(!from) from=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return {T, sunrise, current, next, from, tom, makruhUntil:makruhEnd(now,T)};
}

// Screen phase follows the sun: day (sunrise -> Shom), dusk (Bomdod ->
// sunrise and Shom -> Xufton), night (Xufton -> Bomdod).
function dayPhase(now, T){
  const at=t=>decimalToDate(t,now);
  const fajr=at(T.fajr), sun=at(T.sunrise), maghrib=at(T.maghrib), isha=at(T.isha);
  if(!fajr||!sun||!maghrib||!isha) return 'dusk';
  if(now<fajr || now>=isha) return 'night';
  if(now>=sun && now<maghrib) return 'day';
  return 'dusk';
}

function renderTV(){
  const settings=loadSettings();
  const city=CITIES[settings.city]||CITIES.Tashkent;
  const now=appNow();
  const st=getDayState(now,settings,city);
  const phase=dayPhase(now,st.T);
  if(document.documentElement.dataset.phase!==phase) document.documentElement.dataset.phase=phase;

  document.getElementById('mosqueName').textContent   =settings.mosqueName   ||'Namoz Vaqtlari';
  document.getElementById('mosqueArabic').textContent =settings.mosqueArabic ||'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم';
  document.getElementById('cityFooter').textContent   =city.name;
  document.getElementById('methodFooter').textContent =`${(METHODS[settings.method]||METHODS.Karachi).name.split(' (')[0]} usuli`;
  document.getElementById('asrFooter').textContent    =`Asr: ${(ASR_METHODS[settings.asrMethod]||ASR_METHODS.Hanafi).name}`;

  // Hero
  const ramazon=isRamazon(now,settings);
  const nextDay=st.next.tomorrow?st.tom:now;
  const heroLabel=(isRamazon(nextDay,settings)&&RAMAZON_HERO[st.next.key])||'Keyingi namoz';
  document.getElementById('heroLabel').textContent = st.next.tomorrow ? `${heroLabel} · ertaga` : heroLabel;
  document.getElementById('heroName').textContent  = st.next.nameUz;
  document.getElementById('heroAr').textContent    = st.next.nameAr;
  document.getElementById('heroTime').textContent  = st.next.date
    ? `${pad2(st.next.date.getHours())}:${pad2(st.next.date.getMinutes())}` : '--:--';
  window._tvState = st;

  // Today row: Bomdod, Quyosh, Peshin, Asr, Shom, Xufton
  const row=document.getElementById('todayRow');
  row.innerHTML='';
  const cols=[PRAYERS_TV[0], {key:'sunrise', nameUz:'Quyosh', nameAr:'الشروق', sun:true}, ...PRAYERS_TV.slice(1)];
  cols.forEach(p=>{
    p=forDay(p,now);
    const d=decimalToDate(st.T[p.key],now);
    const isCur =!p.sun && st.current && st.current.key===p.key;
    const isNext=!p.sun && !st.next.tomorrow && st.next.key===p.key;
    const isPast=!isCur && !isNext && d && d<=now;
    const col=document.createElement('div');
    col.className=`t-col${p.sun?' sun':''}${isCur?' current':''}${isNext?' next':''}${isPast?' passed':''}`;
    const state=(ramazon&&RAMAZON_NOTE[p.key])||(isCur?'Hozir':isNext?'Keyingi':'');
    col.innerHTML=`
      <div class="t-head"><span class="t-uz">${p.nameUz}</span>${p.sun?'':`<span class="t-ar" lang="ar">${p.nameAr}</span>`}</div>
      <div class="t-time">${decimalToHHMM(st.T[p.key])}</div>
      <div class="t-state">${state}</div>`;
    row.appendChild(col);
  });

  // Tomorrow: one line
  const TT=getTimesForDate(st.tom,settings,city);
  const items=[['Bomdod','fajr'],['Quyosh','sunrise'],[st.tom.getDay()===5?'Juma':'Peshin','dhuhr'],['Asr','asr'],['Shom','maghrib'],['Xufton','isha']]
    .map(([n,k])=>`<span class="tl-item">${n}<b>${decimalToHHMM(TT[k])}</b></span>`).join('');
  document.getElementById('tomorrowLine').innerHTML=`<span class="tl-day">Ertaga, ${fmtDayUz(st.tom).split(', ')[1]}</span>${items}`;

  tickCountdown();
}

// Countdown: minutes while far away, seconds only in the last 10 minutes
function tickCountdown(){
  const st=window._tvState;
  if(!st)return;
  const now=appNow();
  const el=document.getElementById('heroCountdown');
  if(!st.next.date){ el.textContent='Vaqtni hisoblab boʻlmadi'; return; }
  const ms=st.next.date-now;
  if(ms<=0){ renderTV(); return; }
  const totalS=Math.floor(ms/1000);
  const h=Math.floor(totalS/3600), m=Math.floor((totalS%3600)/60), s=totalS%60;
  let html;
  if(totalS<600)      html=`<b>${m}</b> daqiqa <b>${pad2(s)}</b> soniya qoldi`;
  else if(h>0)        html=`<b>${h}</b> soat <b>${m}</b> daqiqa qoldi`;
  else                html=`<b>${m}</b> daqiqa qoldi`;
  if(el.innerHTML!==html) el.innerHTML=html;

  const note=document.getElementById('heroNote');
  const mk=st.makruhUntil && now<st.makruhUntil
    ? `Hozir makruh vaqt · ${pad2(st.makruhUntil.getHours())}:${pad2(st.makruhUntil.getMinutes())} gacha` : '';
  if(note.textContent!==mk) note.textContent=mk;
  if(st.makruhUntil && now>=st.makruhUntil) st.makruhUntil=null;

  const span=st.next.date-st.from;
  const frac=span>0?Math.min(1,Math.max(0,(now-st.from)/span)):0;
  document.getElementById('heroProgress').style.transform=`scaleX(${frac.toFixed(4)})`;
}

window.addEventListener('storage', e=>{ if(e.key==='prayerSettings'){ tickClock(); renderTV(); } });

document.addEventListener('DOMContentLoaded',()=>{
  tickClock();
  renderTV();
  setInterval(tickClock,     1000);
  setInterval(tickCountdown, 1000);
  setInterval(renderTV,     60000);
  tickCountdown();
});
