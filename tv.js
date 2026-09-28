/* ─────────────────────────────────────────── */
/*  TV DISPLAY — tv.js  (requires core.js)     */
/* ─────────────────────────────────────────── */

const PRAYERS_TV=[
  {key:'fajr',   nameUz:'Bomdod',nameAr:'الفجر'},
  {key:'dhuhr',  nameUz:'Peshin',nameAr:'الظهر'},
  {key:'asr',    nameUz:'Asr',   nameAr:'العصر'},
  {key:'maghrib',nameUz:'Shom',  nameAr:'المغرب'},
  {key:'isha',   nameUz:'Xufton',nameAr:'العشاء'},
];
const DAYS_UZ=['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
const MONTHS_UZ=['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

// How long the hero keeps announcing a prayer that has just begun
const STARTED_MS = 5 * 60000;

const pad2 = n => String(n).padStart(2,'0');
const hhmm = d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const fmtDayUz = d => `${DAYS_UZ[d.getDay()]}, ${d.getDate()}-${MONTHS_UZ[d.getMonth()].toLowerCase()}`;

// Touch the DOM only when something changed: every write repaints, and TV
// chips are slow.
function setText(id, v){ const el=document.getElementById(id); if(el.textContent!==v) el.textContent=v; }
function setHTML(el, v){ if(el.innerHTML!==v) el.innerHTML=v; }

function tickClock(){
  const now=appNow();
  setText('liveClock', hhmm(now));
  if(now.getSeconds()===0 || !tickClock.done){
    const h=toHijri(now, loadSettings().hijriAdj||0);
    setText('liveDate', `${fmtDayUz(now)} ${now.getFullYear()}`);
    setText('liveHijri', `${h.d} ${h.mName} ${h.y}`);
    tickClock.done=true;
  }
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

  setText('mosqueName',   settings.mosqueName   ||'Namoz Vaqtlari');
  setText('mosqueArabic', settings.mosqueArabic ||'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم');
  setText('cityFooter',   city.name);
  setText('methodFooter', `${(METHODS[settings.method]||METHODS.Karachi).name.split(' (')[0]} usuli`);
  setText('asrFooter',    `Asr: ${(ASR_METHODS[settings.asrMethod]||ASR_METHODS.Hanafi).name}`);

  // Hero: announces a prayer for 5 minutes after it begins ("vaqti
  // kirdi"), otherwise shows the next prayer.
  const ramazon=isRamazon(now,settings);
  st.started = st.current && (now - st.current.date) < STARTED_MS ? st.current : null;
  let label, p, time;
  if(st.started){
    p=st.started; label='Hozir'; time=hhmm(p.date);
    st.startedUntil=new Date(+p.date + STARTED_MS);
  } else {
    p=st.next;
    const nextDay=st.next.tomorrow?st.tom:now;
    label=(isRamazon(nextDay,settings)&&RAMAZON_HERO[p.key])||'Keyingi namoz';
    if(p.tomorrow) label+=' · ertaga';
    time=p.date?hhmm(p.date):'--:--';
  }
  const heroKey=`${st.started?'now':'next'}:${p.key}:${p.nameUz}`;
  const hero=document.getElementById('hero');
  if(hero.dataset.key!==heroKey){
    hero.dataset.key=heroKey;
    hero.classList.toggle('started', !!st.started);
    hero.classList.remove('enter'); void hero.offsetWidth; hero.classList.add('enter');
  }
  setText('heroLabel', label);
  setText('heroName',  p.nameUz);
  setText('heroAr',    p.nameAr);
  setText('heroTime',  time);
  st.ramazon=ramazon;
  window._tvState = st;
  renderDial(document.getElementById('dial'), st, now);

  // Today row: Bomdod, Quyosh, Peshin, Asr, Shom, Xufton. Built once, then
  // updated in place so state changes can ease instead of snapping.
  const row=document.getElementById('todayRow');
  const cols=[PRAYERS_TV[0], {key:'sunrise', nameUz:'Quyosh', nameAr:'الشروق', sun:true}, ...PRAYERS_TV.slice(1)];
  if(row.children.length!==cols.length){
    row.innerHTML=cols.map(c=>`
      <div class="t-col${c.sun?' sun':''}" data-key="${c.key}">
        <div class="t-head"><span class="t-uz"></span>${c.sun?'':'<span class="t-ar" lang="ar"></span>'}</div>
        <div class="t-time"></div>
        <div class="t-state"></div>
      </div>`).join('');
  }
  cols.forEach((c,i)=>{
    const q=forDay(c,now), col=row.children[i];
    const d=decimalToDate(st.T[q.key],now);
    const isCur =!q.sun && st.current && st.current.key===q.key;
    const isNext=!q.sun && !st.next.tomorrow && st.next.key===q.key;
    const isPast=!isCur && !isNext && d && d<=now;
    col.classList.toggle('current', !!isCur);
    col.classList.toggle('next', !!isNext);
    col.classList.toggle('passed', !!isPast);
    const set=(sel,v)=>{ const el=col.querySelector(sel); if(el && el.textContent!==v) el.textContent=v; };
    set('.t-uz', q.nameUz); set('.t-ar', q.nameAr);
    set('.t-time', decimalToHHMM(st.T[q.key]));
    set('.t-state', (ramazon&&RAMAZON_NOTE[q.key])||(isCur?'Hozir':isNext?'Keyingi':''));
  });

  // Tomorrow: one line
  const TT=getTimesForDate(st.tom,settings,city);
  const items=[['Bomdod','fajr'],['Quyosh','sunrise'],[st.tom.getDay()===5?'Juma':'Peshin','dhuhr'],['Asr','asr'],['Shom','maghrib'],['Xufton','isha']]
    .map(([n,k])=>`<span class="tl-item">${n}<b>${decimalToHHMM(TT[k])}</b></span>`).join('');
  setHTML(document.getElementById('tomorrowLine'), `<span class="tl-day">Ertaga, ${fmtDayUz(st.tom).split(', ')[1]}</span>${items}`);

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
  if(ms<=0 || (st.started && now>=st.startedUntil)){ renderTV(); return; }

  let html;
  if(st.started){
    const k=st.started.key;
    html = st.ramazon && k==='maghrib' ? 'Iftor vaqti kirdi'
         : st.ramazon && k==='fajr'    ? 'Saharlik vaqti tugadi'
         : `${st.started.nameUz} vaqti kirdi`;
  } else {
    const totalS=Math.floor(ms/1000);
    const h=Math.floor(totalS/3600), m=Math.floor((totalS%3600)/60), s=totalS%60;
    if(totalS<600)      html=`<b>${m}</b> daqiqa <b>${pad2(s)}</b> soniya qoldi`;
    else if(h>0)        html=`<b>${h}</b> soat <b>${m}</b> daqiqa qoldi`;
    else                html=`<b>${m}</b> daqiqa qoldi`;
  }
  setHTML(el, html);

  const mk=st.makruhUntil && now<st.makruhUntil ? `Hozir makruh vaqt · ${hhmm(st.makruhUntil)} gacha` : '';
  setText('heroNote', mk);
  if(st.makruhUntil && now>=st.makruhUntil) st.makruhUntil=null;

}

// Burn-in guard: nudge the whole layout a few pixels every 10 minutes so no
// pixel shows the same thing for hours. Invisible from the hall.
const SHIFTS=[[0,0],[3,2],[-2,3],[-3,-2],[2,-3],[0,3],[-3,0]];
let shiftIdx=0;
function shiftLayout(){
  shiftIdx=(shiftIdx+1)%SHIFTS.length;
  const [x,y]=SHIFTS[shiftIdx];
  document.querySelector('.layout').style.transform=`translate(${x}px,${y}px)`;
}

window.addEventListener('storage', e=>{ if(e.key==='prayerSettings'){ tickClock(); renderTV(); } });

document.addEventListener('DOMContentLoaded',()=>{
  tickClock();
  renderTV();
  // phase crossfades only from here on; the first frame paints directly
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.add('ready')));
  setInterval(tickClock,     1000);
  setInterval(tickCountdown, 1000);
  setInterval(renderTV,     60000);
  setInterval(shiftLayout, 10*60000);
  tickCountdown();
});
