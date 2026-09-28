/* ─────────────────────────────────────────── */
/*  TV DIAL — the day as a 24-hour ring        */
/*  Requires core.js                           */
/* ─────────────────────────────────────────── */
//
// Noon at the top, midnight at the bottom: the ring mirrors the sky, so
// the daylight prayers sit on the upper half. One arc per prayer period
// (sunrise to Peshin stays empty: no prayer then). The current period is
// drawn in ink, the next in the accent colour, makruh windows as thin
// terracotta marks on the inner edge, and a dot marks "now".
// Plain SVG: crisp at any scale, redrawn once a minute, no canvas work.

const DIAL = { size: 440, r: 190, w: 30 };            // stroke centred on r
const DIAL_GAP_DEG = 0.8;                            // gap between arcs

function dialAngle(h){ return ((h - 12) / 24) * 360; }     // 12:00 -> 0deg (top)

function dialPoint(deg, r){
  const a = deg * Math.PI / 180, c = DIAL.size / 2;
  return [c + r * Math.sin(a), c - r * Math.cos(a)];
}

// Arc between two decimal hours; h2 may be past midnight (h2 < h1)
function dialArc(h1, h2, r, gap = DIAL_GAP_DEG){
  let a1 = dialAngle(h1), a2 = dialAngle(h2 < h1 ? h2 + 24 : h2);
  a1 += gap; a2 -= gap;
  if (a2 <= a1) return '';
  const [x1, y1] = dialPoint(a1, r), [x2, y2] = dialPoint(a2, r);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// st: getDayState() result (+ .started); now: appNow()
function renderDial(svg, st, now){
  const T = st.T, ok = h => Number.isFinite(h);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const inSpan = (a, b) => b >= a ? nowH >= a && nowH < b : nowH >= a || nowH < b;

  const periods = [
    { key:'fajr',    from:T.fajr,    to:T.sunrise },
    { key:'dhuhr',   from:T.dhuhr,   to:T.asr     },
    { key:'asr',     from:T.asr,     to:T.maghrib },
    { key:'maghrib', from:T.maghrib, to:T.isha    },
    { key:'isha',    from:T.isha,    to:T.fajr    },   // wraps past midnight
  ].filter(p => ok(p.from) && ok(p.to));

  const nextKey = st.started ? null : st.next.key;
  const segs = periods.map(p => {
    const cls = inSpan(p.from, p.to) ? 'current' : p.key === nextKey ? 'next' : '';
    return `<path class="seg ${cls}" d="${dialArc(p.from, p.to, DIAL.r)}"/>`;
  }).join('');

  const rIn = DIAL.r - DIAL.w / 2 + 4, M = 1 / 60;
  const makruh = [
    ok(T.sunrise) && [T.sunrise, T.sunrise + 15 * M],
    ok(T.dhuhr)   && [T.dhuhr - 15 * M, T.dhuhr],
    ok(T.maghrib) && [T.maghrib - 5 * M, T.maghrib],
  ].filter(Boolean).map(([a, b]) => `<path class="mk" d="${dialArc(a, b, rIn, 0)}"/>`).join('');

  const ticks = [0, 12].map(h => {                     // midnight + noon orient the ring
    const [x1, y1] = dialPoint(dialAngle(h), DIAL.r - DIAL.w / 2 - 10);
    const [x2, y2] = dialPoint(dialAngle(h), DIAL.r - DIAL.w / 2 - 24);
    return `<line class="tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join('');

  const [nx, ny] = dialPoint(dialAngle(nowH), DIAL.r);
  const html = `<circle class="track" cx="${DIAL.size / 2}" cy="${DIAL.size / 2}" r="${DIAL.r}"/>`
    + segs + makruh + ticks
    + `<circle class="now" cx="${nx.toFixed(2)}" cy="${ny.toFixed(2)}" r="13"/>`;
  if (svg.innerHTML !== html) svg.innerHTML = html;
}
