import { memo } from 'react';
import { PRAYERS_TV, forDay } from '../core/day.js';

// A 24-hour clock face for the day: 00 at the top like the old donut,
// hour numbers around the rim, one coloured sector per prayer period with
// its name beside it, makruh windows in red, and a hand pointing at now.
// The centre is the clock itself. Plain SVG, redrawn once a minute.
const SIZE = 440, C = SIZE / 2;
const R = 170, W = 32;                       // sector ring (stroke centred on R)
const R_LABEL = 214;                         // hour numbers
const NAME_CHAR_W = 12.5;                    // ~average glyph width of the 22px labels (bold)
const GAP = 0.6;                             // degrees between sectors

const angle = h => (h / 24) * 360;           // 00:00 at the top, clockwise
const point = (deg, r) => {
  const a = deg * Math.PI / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};
function arc(h1, h2, r, gap = GAP) {
  let a1 = angle(h1), a2 = angle(h2 < h1 ? h2 + 24 : h2);
  a1 += gap; a2 -= gap;
  if (a2 <= a1) return '';
  const [x1, y1] = point(a1, r), [x2, y2] = point(a2, r);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}
const f1 = n => n.toFixed(1);

function Dial({ minute, st, dateKey }) {
  const T = st.T, ok = Number.isFinite;
  const nowH = minute / 60;
  const inSpan = (a, b) => (b >= a ? nowH >= a && nowH < b : nowH >= a || nowH < b);
  const ends = { fajr: T.sunrise, dhuhr: T.asr, asr: T.maghrib, maghrib: T.isha, isha: T.fajr };
  const today = new Date(dateKey);
  const sectors = PRAYERS_TV.map(p => ({ ...forDay(p, today), from: T[p.key], to: ends[p.key] }))
    .filter(s => ok(s.from) && ok(s.to));
  const nextKey = st.started ? null : st.next.key;
  const M = 1 / 60, rIn = R - W / 2 - 5;
  const makruh = [
    ok(T.sunrise) && [T.sunrise, T.sunrise + 15 * M],
    ok(T.dhuhr) && [T.dhuhr - 15 * M, T.dhuhr],
    ok(T.maghrib) && [T.maghrib - 5 * M, T.maghrib],
  ].filter(Boolean);
  const current = sectors.find(s => inSpan(s.from, s.to));

  const nowA = angle(nowH);
  const [hx1, hy1] = point(nowA, R - W / 2 - 4), [hx2, hy2] = point(nowA, R + W / 2 + 8);   // across the ring only

  return (
    <svg id="dial" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img"
      aria-label={`Kun soati: hozir ${current ? current.nameUz + ' vaqti' : 'namoz vaqti emas'}`}>
      <circle className="track" cx={C} cy={C} r={R} />

      {/* hour ticks + numbers */}
      {Array.from({ length: 24 }, (_, h) => {
        const major = h % 3 === 0;
        const [x1, y1] = point(angle(h), R + W / 2 + 4), [x2, y2] = point(angle(h), R + W / 2 + (major ? 14 : 9));
        return <line key={h} className={major ? 'tick major' : 'tick'} x1={f1(x1)} y1={f1(y1)} x2={f1(x2)} y2={f1(y2)} />;
      })}
      {[0, 3, 6, 9, 12, 15, 18, 21].map(h => {
        const [x, y] = point(angle(h), R_LABEL);
        return <text key={h} className="hour" x={f1(x)} y={f1(y)}>{String(h).padStart(2, '0')}</text>;
      })}

      {/* prayer sectors */}
      {sectors.map(s => (
        <path key={s.key} d={arc(s.from, s.to, R)}
          className={`seg seg-${s.key}${s === current ? ' current' : ''}${s.key === nextKey ? ' next' : ''}`} />
      ))}
      {makruh.map(([a, b], i) => <path key={i} className="mk" d={arc(a, b, rIn, 0)} />)}

      {/* sector names, placed at each sector's middle */}
      {sectors.map(s => {
        const mid = s.to < s.from ? (s.from + s.to + 24) / 2 : (s.from + s.to) / 2;
        // keep the label box inside the ring's inner edge: push it outward as
        // far as its own width allows at this angle (clear of the centre clock)
        const a = angle(mid % 24) * Math.PI / 180;
        const hw = s.nameUz.length * NAME_CHAR_W / 2, hh = 12;
        const r = R - W / 2 - 4 - (hw * Math.abs(Math.sin(a)) + hh * Math.abs(Math.cos(a)));
        const [x, y] = point(angle(mid % 24), r);
        return (
          <text key={s.key} x={f1(x)} y={f1(y)}
            className={`name${s === current ? ' current' : ''}${s.key === nextKey ? ' next' : ''}`}>{s.nameUz}</text>
        );
      })}

      {/* the hand: points at now */}
      <line className="hand" x1={f1(hx1)} y1={f1(hy1)} x2={f1(hx2)} y2={f1(hy2)} />
      <circle className="hand-tip" cx={f1(point(nowA, R)[0])} cy={f1(point(nowA, R)[1])} r="9" />
    </svg>
  );
}

// Redraw once a minute, not every second
const MemoDial = memo(Dial);
export default function DialOnce({ now, st }) {
  const dateKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return <MemoDial minute={now.getHours() * 60 + now.getMinutes()} st={st} dateKey={dateKey} />;
}
