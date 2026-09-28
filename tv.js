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


// ── Oy fazasi SVG
function drawMoonPhase(day){
  const svg = document.getElementById('moonSvg2');
  if(!svg) return;
  const R = 34, cx = 40, cy = 40;
  const gold = '#c9a84c', dark = '#0a0f1e', glow = 'rgba(201,168,76,0.35)';

  const waxing = day <= 15;
  // illumination: 0=yangi oy, 1=to'liq oy
  const illum = day <= 15 ? (day - 1) / 14 : (30 - day) / 14;
  // limb fraction: +1=yangi(crescent thin), 0=yarim, -1=to'liq
  const limbFrac = Math.cos(Math.PI * illum);
  const ex = Math.abs(limbFrac) * R; // ellips x radiusi

  const top = {x: cx, y: cy - R};
  const bot = {x: cx, y: cy + R};

  let path = '';

  if(day <= 1 || day >= 30){
    // Yangi oy — juda ingichka o'ng o'roq
    path = `<path d="M${cx},${cy-R} A${R},${R} 0 1,1 ${cx},${cy+R} A${R*0.1},${R} 0 1,0 ${cx},${cy-R}" fill="${gold}" opacity="0.9"/>`;
  } else if(illum >= 0.99){
    // To'liq oy
    path = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${gold}" opacity="0.95"/>`;
  } else {
    // Umumiy: har doim o'ng yoni (waxing) yoki chap yoni (waning) lit
    // Tashqi yoy: yoritilgan yonning yarim doirasi
    // Ichki yoy (terminator): crescent=konkav, gibbous=konveks

    let outerSweep, innerSweep;
    let innerEx;

    if(waxing){
      // O'ng yoni yoritilgan
      outerSweep = 1; // o'ng yarim doira (soat yo'nalishi yuqoridan pastga)
      if(limbFrac > 0){
        // Crescent: terminator chap tomonga botgan (konkav)
        innerSweep = 0; innerEx = ex;
      } else {
        // Gibbous: terminator o'ng tomonga chiqqan (konveks)
        innerSweep = 1; innerEx = ex;
      }
    } else {
      // Chap yoni yoritilgan
      outerSweep = 0; // chap yarim doira (soat teskari)
      if(limbFrac > 0){
        // Crescent: terminator o'ng tomonga botgan
        innerSweep = 1; innerEx = ex;
      } else {
        // Gibbous: terminator chap tomonga chiqqan
        innerSweep = 0; innerEx = ex;
      }
    }

    let innerArc;
    if(innerEx < 1){
      innerArc = `L${bot.x},${bot.y}`;
    } else {
      innerArc = `A${innerEx},${R} 0 0,${innerSweep} ${bot.x},${bot.y}`;
    }
    path = `<path d="M${top.x},${top.y} A${R},${R} 0 1,${outerSweep} ${bot.x},${bot.y} ${innerArc} Z" fill="${gold}" opacity="0.92"/>`;
  }

  const glowCircle = `<circle cx="${cx}" cy="${cy}" r="${R+4}" fill="none" stroke="${glow}" stroke-width="2.5"/>`;
  const bg = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${dark}"/>`;
  const dayTxt = `<text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="13" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-weight="600">${day}</text>`;
  svg.innerHTML = glowCircle + bg + path + dayTxt;
}

function tickClock(){
  const now=new Date();
  const settings=loadSettings();
  document.getElementById('liveClock').textContent=
    `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const h=toHijri(now, settings.hijriAdj||0);
  document.getElementById('liveDate').textContent=
    `${DAYS_UZ[now.getDay()]} · ${now.getDate()} ${MONTHS_UZ[now.getMonth()]} ${now.getFullYear()} · ${h.d} ${h.mName} ${h.y}`;
  drawMoonPhase(h.d);
  const mnEl=document.getElementById('moonCornerLabel');
  if(mnEl) mnEl.textContent=h.mName+'\n'+h.y;
}

function buildCards(containerId,times,refDate,now,isToday){
  const c=document.getElementById(containerId);
  if(!c)return;c.innerHTML='';

  const nowDec  = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  const sunH    = ((times.sunrise%24)+24)%24;
  const dhuhrH  = ((times.dhuhr%24)+24)%24;
  const isZuho  = isToday && nowDec >= sunH + 15/60 && nowDec < dhuhrH;

  let currentKey=null, nextKey=null;
  if(isToday){
    if(isZuho){
      // Zuho vaqtida: hech qaysi namoz "hozirgi" emas, peshin "keyingi"
      currentKey = null;
      nextKey = 'dhuhr';
    } else {
      for(let i=PRAYERS_TV.length-1;i>=0;i--){
        const ph=((times[PRAYERS_TV[i].key]%24)+24)%24;
        if(nowDec >= ph){currentKey=PRAYERS_TV[i].key;break;}
      }
    }
  }

  PRAYERS_TV.forEach((p,i)=>{
    const adj=(loadSettings().adjustments[p.key]||0);
    const ph=((times[p.key]%24)+24)%24;
    const isActive=isToday&&p.key===currentKey;
    const isNext  =isToday&&p.key===nextKey;
    const isPassed=isToday&&!isActive&&!isNext&&nowDec>ph;

    const card=document.createElement('div');
    card.className=`pcard${isActive?' active':''}${isNext?' next-prayer':''}${isPassed?' passed':''}`;
    card.style.setProperty('--dl',`${0.15+i*.1}s`);

    const adjHtml=adj!==0?`<div class="c-adj">${adj>0?'+':''}${adj} daq</div>`:'';
    const ribbon = isActive
      ? '<div class="active-ribbon">✦ HOZIRGI NAMOZ ✦</div>'
      : isNext
        ? '<div class="active-ribbon next-ribbon">⟩ KEYINGI NAMOZ ⟨</div>'
        : '';
    card.innerHTML=`
      ${ribbon}
      <div class="c-icon">${p.icon}</div>
      <div class="c-ar">${p.nameAr}</div>
      <div class="c-uz">${p.nameUz}</div>
      <div class="c-time">${decimalToHHMM(times[p.key])}</div>
      ${adjHtml}
    `;
    c.appendChild(card);
  });
}

function renderTV(){
  const settings=loadSettings();
  const city=CITIES[settings.city]||CITIES.Tashkent;
  const now=new Date();
  const tom=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);

  document.getElementById('mosqueName').textContent   =settings.mosqueName   ||'Namoz Vaqtlari';
  document.getElementById('mosqueArabic').textContent =settings.mosqueArabic ||'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم';
  document.getElementById('cityFooter').textContent   =city.name;
  document.getElementById('methodFooter').textContent =(METHODS[settings.method]||METHODS.Karachi).name;
  document.getElementById('todayDate').textContent    =`${DAYS_UZ[now.getDay()]}, ${now.getDate()} ${MONTHS_UZ[now.getMonth()]}`;
  document.getElementById('tomorrowDate').textContent =`${DAYS_UZ[tom.getDay()]}, ${tom.getDate()} ${MONTHS_UZ[tom.getMonth()]}`;

  const todayT  =getTimesForDate(now,settings,city);
  const tomorrowT=getTimesForDate(tom,settings,city);

  document.getElementById('todaySun').innerHTML   =`🌅 <span>Quyosh:</span> ${decimalToHHMM(todayT.sunrise)}`;
  document.getElementById('tomorrowSun').innerHTML=`🌅 <span>Quyosh:</span> ${decimalToHHMM(tomorrowT.sunrise)}`;

  // Next prayer — decimal hours comparison
  const nowDec = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  let nextP=null, nextTime=null;
  for(const p of PRAYERS_TV){
    const ph = ((todayT[p.key]%24)+24)%24;
    if(nowDec < ph){ nextP=p; nextTime=decimalToDate(todayT[p.key],now); break; }
  }
  if(!nextP){
    nextP=PRAYERS_TV[0];
    nextTime=decimalToDate(tomorrowT.fajr,tom);
  }
  window._tvNextTime=nextTime;
  document.getElementById('nextName').textContent=`${nextP.icon} ${nextP.nameUz}`;

  buildCards('todayCards',   todayT,   now,now,true);
  buildCards('tomorrowCards',tomorrowT,tom,now,false);
}

function tickCountdown(){
  if(!window._tvNextTime)return;
  let diff=Math.max(0,window._tvNextTime-new Date());
  const h=Math.floor(diff/3600000);diff-=h*3600000;
  const m=Math.floor(diff/60000);diff-=m*60000;
  const s=Math.floor(diff/1000);
  document.getElementById('nextCountdown').textContent=
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if(h===0&&m===0&&s===0)setTimeout(renderTV,1500);
}

// ── PANEL SWITCHING ──────────────────────────
const PANEL_INTERVAL = 10000; // 10 seconds
let currentPanel = 0;

function switchPanel(idx){
  const panels = [document.getElementById('panel1'), document.getElementById('panel2')];
  const dots   = [document.getElementById('dot1'),   document.getElementById('dot2')];
  panels.forEach((p,i)=>{ p.classList.toggle('visible', i===idx); });
  dots.forEach((d,i)=>{ d.classList.toggle('on', i===idx); });
  currentPanel = idx;
  if(idx===1){ buildLegend(); buildDurationList(); drawCircle(); }
}

// ── PRAYER COLORS ────────────────────────────
const P_COLORS = {
  night:   '#1a2a4a',   // midnight to fajr
  fajr:    '#7b5ea7',   // fajr: deep purple
  sunrise: '#e8844a',   // sunrise to dhuhr: orange
  dhuhr:   '#c9a84c',   // dhuhr: gold
  asr:     '#4a9eca',   // asr: sky blue
  maghrib: '#e05555',   // maghrib: red-orange
  isha:    '#2a5a8a',   // isha: deep blue
};

// ── DRAW CIRCLE CLOCK ────────────────────────
function drawCircle(){
  const canvas = document.getElementById('clockCanvas');
  if(!canvas) return;
  const ctx  = canvas.getContext('2d');
  const cx   = 290, cy = 290, R = 266, r = 176;
  const now  = new Date();
  const settings = loadSettings();
  const city = CITIES[settings.city]||CITIES.Tashkent;
  const times = getTimesForDate(now, settings, city);

  ctx.clearRect(0,0,580,580);

  // Convert decimal hour to angle (0h = top = -90deg, clockwise)
  // 24 hours = 360 degrees
  function hToAngle(h){ return (h/24)*Math.PI*2 - Math.PI/2; }

  // Prayer segments: [from_h, to_h, color, key]
  const fajrH    = ((times.fajr   %24)+24)%24;
  const sunriseH = ((times.sunrise%24)+24)%24;
  const dhuhrH   = ((times.dhuhr  %24)+24)%24;
  const asrH     = ((times.asr    %24)+24)%24;
  const maghribH = ((times.maghrib%24)+24)%24;
  const ishaH    = ((times.isha   %24)+24)%24;

  // Makruh (forbidden) times
  const M15 = 15/60; // 15 minutes in decimal hours
  const M5  =  5/60; //  5 minutes in decimal hours
  const makruh1End   = sunriseH + M15;  // sunrise + 15 min
  const makruh2Start = dhuhrH   - M15;  // zaval: dhuhr - 15 min
  const makruh3Start = maghribH - M5;   // sunset - 5 min

  const segments = [
    { from:0,              to:fajrH,         color:'#0d1428', key:'night1'  },
    { from:fajrH,          to:sunriseH,      color:'#6b3fa0', key:'fajr'    },
    // makruh 1: sunrise → sunrise+15min
    { from:sunriseH,       to:makruh1End,    color:'#c0392b', key:'makruh1' },
    // zuho: sunrise+15min → dhuhr-15min
    { from:makruh1End,     to:makruh2Start,  color:'#e8d5a0', key:'zuho'   },
    // makruh 2: zaval — dhuhr-15min → dhuhr
    { from:makruh2Start,   to:dhuhrH,        color:'#c0392b', key:'makruh2' },
    { from:dhuhrH,         to:asrH,          color:'#b8922a', key:'dhuhr'   },
    { from:asrH,           to:makruh3Start,  color:'#2878a8', key:'asr'     },
    // makruh 3: sunset-5min → maghrib
    { from:makruh3Start,   to:maghribH,      color:'#c0392b', key:'makruh3' },
    { from:maghribH,       to:ishaH,         color:'#1a7a4a', key:'maghrib' },
    { from:ishaH,          to:24,            color:'#1a3060', key:'isha'    },
  ];

  // Find active segment key for explode effect (including makruh zones)
  const nowDecimal = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  let activeSegKey = null;

  // Check makruh zones first (they take priority)
  if(nowDecimal >= sunriseH && nowDecimal < makruh1End){
    activeSegKey = 'makruh1';
  } else if(nowDecimal >= makruh2Start && nowDecimal < dhuhrH){
    activeSegKey = 'makruh2';
  } else if(nowDecimal >= makruh3Start && nowDecimal < maghribH){
    activeSegKey = 'makruh3';
  } else {
    // Regular prayer segments
    const prayerOrder = ['fajr','zuho','dhuhr','asr','maghrib','isha'];
    for(let i=prayerOrder.length-1;i>=0;i--){
      const key = prayerOrder[i];
      let ph;
      if(key==='zuho') ph = makruh1End;
      else ph = ((times[key]%24)+24)%24;
      if(nowDecimal >= ph){ activeSegKey = key; break; }
    }
  }

  const EXPLODE = 22; // px offset for active segment

  // Draw segments
  segments.forEach(seg=>{
    const aStart = hToAngle(seg.from);
    const aEnd   = hToAngle(seg.to);
    const aMid   = (aStart + aEnd) / 2;

    const isActive = seg.key === activeSegKey;
    // Offset the whole segment (center + arc) outward
    const ox = isActive ? Math.cos(aMid) * EXPLODE : 0;
    const oy = isActive ? Math.sin(aMid) * EXPLODE : 0;

    ctx.beginPath();
    ctx.moveTo(cx + ox, cy + oy);
    ctx.arc(cx + ox, cy + oy, R, aStart, aEnd);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();

    // Active segment: bright white border
    if(isActive){
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy);
      ctx.arc(cx + ox, cy + oy, R, aStart, aEnd);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });

  // Draw hatch overlay on makruh segments for extra clarity
  const makruhSegs = segments.filter(s=>s.key.startsWith('makruh'));
  makruhSegs.forEach(seg=>{
    const aStart = hToAngle(seg.from);
    const aEnd   = hToAngle(seg.to);
    ctx.save();
    // Clip to this segment
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,R,aStart,aEnd);
    ctx.closePath();
    ctx.clip();
    // Draw diagonal lines
    ctx.strokeStyle='rgba(255,255,255,0.18)';
    ctx.lineWidth=2;
    for(let i=-R*2;i<R*2;i+=10){
      ctx.beginPath();
      ctx.moveTo(cx+i, cy-R);
      ctx.lineTo(cx+i+R, cy+R);
      ctx.stroke();
    }
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle='#04080f';
  ctx.fill();

  // Outer ring border
  ctx.beginPath();
  ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle='rgba(201,168,76,0.3)';
  ctx.lineWidth=2;
  ctx.stroke();

  // Inner ring border
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle='rgba(201,168,76,0.2)';
  ctx.lineWidth=1.5;
  ctx.stroke();

  // Hour tick marks only (no labels)
  for(let h=0;h<24;h++){
    const a = hToAngle(h);
    const isMajor = h%6===0;
    const r1 = isMajor ? R-8 : R-5;
    const r2 = R+2;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*r1, cy+Math.sin(a)*r1);
    ctx.lineTo(cx+Math.cos(a)*r2, cy+Math.sin(a)*r2);
    ctx.strokeStyle = isMajor ? 'rgba(201,168,76,0.8)' : 'rgba(201,168,76,0.25)';
    ctx.lineWidth   = isMajor ? 2 : 1;
    ctx.stroke();
  }


  // Prayer name markers on the ring
  const pMarkers = [
    {h:fajrH,   lbl:'Bomdod',  ar:'الفجر',  col:'#9b6fd0'},
    {h:dhuhrH,  lbl:'Peshin',  ar:'الظهر',  col:'#d4a840'},
    {h:asrH,    lbl:'Asr',     ar:'العصر',  col:'#4a9eca'},
    {h:maghribH,lbl:'Shom',    ar:'المغرب', col:'#e06060'},
    {h:ishaH,   lbl:'Xufton',  ar:'العشاء', col:'#4070b8'},
  ];

  pMarkers.forEach(pm=>{
    const a   = hToAngle(pm.h);
    const rmid= (r+R)/2;
    ctx.beginPath();
    ctx.arc(cx+Math.cos(a)*rmid, cy+Math.sin(a)*rmid, 7,0,Math.PI*2);
    ctx.fillStyle=pm.col;
    ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.5)';
    ctx.lineWidth=1.5;
    ctx.stroke();
  });

  // ── Mustahab (afzal) vaqt markers
  const bomdodMid  = (fajrH + sunriseH) / 2;
  const peshinMid  = (dhuhrH + asrH) / 2;
  const asrMid     = (asrH + maghribH) / 2 - 15/60;
  const shomStart  = maghribH;
  const xuftonDur  = (ishaH < fajrH ? fajrH + 24 : fajrH + 24) - ishaH;
  const xufton3    = ishaH + xuftonDur * 2/3;

  const mustahab = [
    { h: bomdodMid, col1:'#c9a0f0', col2:'#f0e0ff' }, // Bomdod — binafsha yorqin
    { h: peshinMid, col1:'#f0d060', col2:'#fff8c0' }, // Peshin — oltin yorqin
    { h: asrMid,    col1:'#60c0f0', col2:'#d0f0ff' }, // Asr    — ko'k yorqin
    { h: shomStart, col1:'#60e0a0', col2:'#c0fff0' }, // Shom   — yashil yorqin
    { h: xufton3,   col1:'#6080e0', col2:'#c0d0ff' }, // Xufton — ko'k-binafsha
  ];

  mustahab.forEach(m=>{
    const a    = hToAngle(((m.h%24)+24)%24);
    const rmid = (r+R)/2;
    const mx   = cx + Math.cos(a)*rmid;
    const my   = cy + Math.sin(a)*rmid;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI*2);
    ctx.strokeStyle = m.col1;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Gradient filled dot
    const grad = ctx.createRadialGradient(mx-2, my-2, 1, mx, my, 10);
    grad.addColorStop(0, m.col2);
    grad.addColorStop(1, m.col1);
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI*2);
    ctx.fillStyle = grad;
    ctx.shadowColor = m.col1;
    ctx.shadowBlur  = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // White border
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Star ✦ inside
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', mx, my);
  });

  // Current time needle
  const nowH = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  const nowA  = hToAngle(nowH);

  // Needle line
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(nowA)*r, cy + Math.sin(nowA)*r);
  ctx.lineTo(cx + Math.cos(nowA)*R, cy + Math.sin(nowA)*R);
  ctx.strokeStyle='#ffffff';
  ctx.lineWidth=3;
  ctx.shadowColor='rgba(255,255,255,0.8)';
  ctx.shadowBlur=12;
  ctx.stroke();
  ctx.shadowBlur=0;

  // Needle head dot
  ctx.beginPath();
  ctx.arc(cx+Math.cos(nowA)*R, cy+Math.sin(nowA)*R, 8,0,Math.PI*2);
  ctx.fillStyle='#fff';
  ctx.shadowColor='rgba(255,255,255,0.9)';
  ctx.shadowBlur=14;
  ctx.fill();
  ctx.shadowBlur=0;

  // Center dot
  ctx.beginPath();
  ctx.arc(cx,cy,10,0,Math.PI*2);
  ctx.fillStyle='rgba(201,168,76,0.8)';
  ctx.shadowColor='rgba(201,168,76,0.8)';ctx.shadowBlur=10;
  ctx.fill();ctx.shadowBlur=0;

  // ── Update center text using activeSegKey (already computed above)
  document.getElementById('ccTime').textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const CENTER_LABELS = {
    fajr:    { nameUz:'Bomdod',  nameAr:'الفجر'  },
    zuho:    { nameUz:'Zuho',    nameAr:'الضحى'  },
    dhuhr:   { nameUz:'Peshin',  nameAr:'الظهر'  },
    asr:     { nameUz:'Asr',     nameAr:'العصر'  },
    maghrib: { nameUz:'Shom',    nameAr:'المغرب' },
    isha:    { nameUz:'Xufton',  nameAr:'العشاء' },
    makruh1: { nameUz:'Makruh vaqt', nameAr:'وقت مكروه'  },
    makruh2: { nameUz:'Makruh vaqt', nameAr:'وقت الزوال' },
    makruh3: { nameUz:'Makruh vaqt', nameAr:'وقت مكروه'  },
    night1:  { nameUz:'Tun',     nameAr:'الليل'  },
  };
  const lbl = CENTER_LABELS[activeSegKey] || { nameUz:'—', nameAr:'' };
  document.getElementById('ccName').textContent = lbl.nameUz;
  document.getElementById('ccAr').textContent   = lbl.nameAr;

  // ── Legend: update active class only
  const curKey = ['fajr','dhuhr','asr','maghrib','isha','zuho'].includes(activeSegKey) ? activeSegKey : null;
  updateLegendActive(curKey);
}

const LEG_DATA = [
  {key:'fajr',   nameUz:'Bomdod', nameAr:'الفجر',  color:'#6b3fa0'},
  {key:'zuho',   nameUz:'Zuho',   nameAr:'الضحى',  color:'#e8d5a0', isSpecial:true},
  {key:'dhuhr',  nameUz:'Peshin', nameAr:'الظهر',  color:'#b8922a'},
  {key:'asr',    nameUz:'Asr',    nameAr:'العصر',  color:'#2878a8'},
  {key:'maghrib',nameUz:'Shom',   nameAr:'المغرب', color:'#1a7a4a'},
  {key:'isha',   nameUz:'Xufton', nameAr:'العشاء', color:'#1a3060'},
];

function buildLegend(){
  const leg = document.getElementById('circleLegend');
  if(!leg || leg.children.length>0) return; // already built
  const settings = loadSettings();
  const city = CITIES[settings.city]||CITIES.Tashkent;
  const now  = new Date();
  const times = getTimesForDate(now, settings, city);

  // Zuho start/end
  const sunriseH   = ((times.sunrise%24)+24)%24;
  const dhuhrH     = ((times.dhuhr  %24)+24)%24;
  const zuhoStart  = sunriseH + 15/60;
  const zuhoEnd    = dhuhrH   - 15/60;

  LEG_DATA.forEach((ld,i)=>{
    const div = document.createElement('div');
    div.className = 'legend-item' + (ld.key==='zuho' ? ' zuho-item' : '');
    div.id = `leg_${ld.key}`;
    div.style.setProperty('--dl', `${i*.08}s`);

    // Zuho: show time range
    let timeHtml;
    if(ld.key==='zuho'){
      timeHtml = `<div class="leg-time" id="leg_time_zuho" style="font-size:1.1rem;line-height:1.3">${decimalToHHMM(zuhoStart)}<br><span style="font-size:.75rem;opacity:.6">—</span><br>${decimalToHHMM(zuhoEnd)}</div>`;
    } else {
      timeHtml = `<div class="leg-time" id="leg_time_${ld.key}">${decimalToHHMM(times[ld.key])}</div>`;
    }

    div.innerHTML = `
      <div class="leg-dot" style="background:${ld.color};--dc:${ld.color}"></div>
      <div class="leg-info">
        <div class="leg-name">${ld.nameUz}</div>
        <div class="leg-ar">${ld.nameAr}</div>
      </div>
      ${timeHtml}
    `;
    leg.appendChild(div);
  });

  // Makruh note
  const note = document.createElement('div');
  note.style.cssText='display:flex;align-items:center;gap:12px;padding:8px 14px;margin-top:4px;border-top:1px solid rgba(255,255,255,0.06)';
  note.innerHTML=`
    <div style="width:14px;height:14px;border-radius:3px;background:#c0392b;flex-shrink:0;
      background:repeating-linear-gradient(45deg,#c0392b,#c0392b 4px,#8b1a1a 4px,#8b1a1a 8px)"></div>
    <div style="font-size:0.7rem;color:#8b96a8;letter-spacing:1px;line-height:1.4">
      <span style="color:#e07070;font-weight:600">Makruh vaqtlar</span><br>
      Quyosh chiqishi +15 daq · Zaval −15 daq · Quyosh botishi −5 daq
    </div>
  `;
  leg.appendChild(note);
}

function buildDurationList(){
  const el = document.getElementById('durationList');
  if(!el || el.children.length>0) return;
  const settings = loadSettings();
  const city = CITIES[settings.city]||CITIES.Tashkent;
  const now  = new Date();
  const times = getTimesForDate(now, settings, city);

  const sunH = ((times.sunrise%24)+24)%24;
  const dhuH = ((times.dhuhr  %24)+24)%24;
  const magH = ((times.maghrib%24)+24)%24;
  const m15  = 15/60, m5 = 5/60;

  const rows = [
    { key:'fajr',    name:'Bomdod',       color:'#6b3fa0', from:times.fajr,      to:sunH,          makruh:false },
    { key:'makruh1', name:'Makruh vaqt',  color:'#c0392b', from:sunH,            to:sunH+m15,      makruh:true  },
    { key:'zuho',    name:'Zuho',         color:'#e8d5a0', from:sunH+m15,        to:dhuH-m15,      makruh:false },
    { key:'makruh2', name:'Makruh vaqt',  color:'#c0392b', from:dhuH-m15,        to:dhuH,          makruh:true  },
    { key:'dhuhr',   name:'Peshin',       color:'#b8922a', from:times.dhuhr,     to:times.asr,     makruh:false },
    { key:'asr',     name:'Asr',          color:'#2878a8', from:times.asr,       to:magH-m5,       makruh:false },
    { key:'makruh3', name:'Makruh vaqt',  color:'#c0392b', from:magH-m5,         to:magH,          makruh:true  },
    { key:'maghrib', name:'Shom',         color:'#1a7a4a', from:times.maghrib,   to:times.isha,    makruh:false },
    { key:'isha',    name:'Xufton',       color:'#1a3060', from:times.isha,      to:times.fajr+24, makruh:false },
  ];

  // Max duration for bar scaling
  const maxMins = Math.max(...rows.map(r=> Math.round((r.to - r.from)*60)));

  const title = document.createElement('div');
  title.className = 'dur-title';
  title.textContent = 'Namoz vaqtlari davomiyligi';
  el.appendChild(title);

  rows.forEach(r=>{
    const mins = Math.round((r.to - r.from)*60);
    const pct  = Math.round(mins/maxMins*100);
    const fromH= ((r.from%24)+24)%24;
    const toH  = ((r.to  %24)+24)%24;
    const div  = document.createElement('div');
    div.className = 'dur-item' + (r.makruh?' makruh-dur':'');
    div.id = `dur_${r.key}`;
    div.innerHTML=`
      <div class="dur-dot${r.makruh?' sq':''}" style="background:${r.color}"></div>
      <div class="dur-name">${r.name}</div>
      <div class="dur-range">${decimalToHHMM(fromH)} – ${decimalToHHMM(toH)}</div>
      <div class="dur-bar-wrap"><div class="dur-bar" style="width:${pct}%;background:${r.color}"></div></div>
      <div class="dur-mins">${mins} daq</div>
    `;
    el.appendChild(div);
  });
}

function updateDurationActive(activeKey){
  document.querySelectorAll('.dur-item').forEach(el=>{
    const key = el.id.replace('dur_','');
    el.classList.toggle('active-dur', key===activeKey && !el.classList.contains('makruh-dur'));
  });
}
function updateLegendActive(curKey){
  LEG_DATA.forEach(ld=>{
    const el = document.getElementById(`leg_${ld.key}`);
    if(el) el.classList.toggle('active-leg', ld.key===curKey);
  });
}

// ── Animate circle needle every second when visible
function tickCircle(){
  if(currentPanel===1) drawCircle();
}

document.addEventListener('DOMContentLoaded',()=>{
  tickClock();
  renderTV();
  buildLegend();
  buildDurationList();
  setInterval(tickClock,     1000);
  setInterval(tickCountdown, 1000);
  setInterval(tickCircle,    1000);
  setInterval(renderTV,     60000);
  setInterval(()=>{ switchPanel((currentPanel+1)%2); }, PANEL_INTERVAL);
  tickCountdown();
});
