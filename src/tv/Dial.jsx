import { memo } from 'react';

// The day as a 24-hour ring. Plain SVG: crisp at any scale, cheap to draw.
const SIZE = 440, R = 190, W = 30, GAP = 0.8;
const C = SIZE / 2;

const angle = h => ((h - 12) / 24) * 360;                 // 12:00 at the top
const point = (deg, r) => {
  const a = deg * Math.PI / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};
function arc(h1, h2, r, gap = GAP) {
  let a1 = angle(h1), a2 = angle(h2 < h1 ? h2 + 24 : h2);
  a1 += gap; a2 -= gap;
  if (a2 <= a1) return '';
  const [x1, y1] = point(a1, r), [x2, y2] = point(a2, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function Dial({ minute, st }) {
  const T = st.T, ok = Number.isFinite;
  const nowH = minute / 60;
  const inSpan = (a, b) => (b >= a ? nowH >= a && nowH < b : nowH >= a || nowH < b);
  const periods = [
    ['fajr', T.fajr, T.sunrise], ['dhuhr', T.dhuhr, T.asr], ['asr', T.asr, T.maghrib],
    ['maghrib', T.maghrib, T.isha], ['isha', T.isha, T.fajr],
  ].filter(([, a, b]) => ok(a) && ok(b));
  const nextKey = st.started ? null : st.next.key;
  const rIn = R - W / 2 + 4, M = 1 / 60;
  const makruh = [
    ok(T.sunrise) && [T.sunrise, T.sunrise + 15 * M],
    ok(T.dhuhr) && [T.dhuhr - 15 * M, T.dhuhr],
    ok(T.maghrib) && [T.maghrib - 5 * M, T.maghrib],
  ].filter(Boolean);
  const [nx, ny] = point(angle(nowH), R);

  return (
    <svg id="dial" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Kun davomidagi namoz vaqtlari">
      <circle className="track" cx={C} cy={C} r={R} />
      {periods.map(([key, a, b]) => (
        <path key={key} className={`seg ${inSpan(a, b) ? 'current' : key === nextKey ? 'next' : ''}`} d={arc(a, b, R)} />
      ))}
      {makruh.map(([a, b], i) => <path key={i} className="mk" d={arc(a, b, rIn, 0)} />)}
      {[0, 12].map(h => {
        const [x1, y1] = point(angle(h), R - W / 2 - 10), [x2, y2] = point(angle(h), R - W / 2 - 24);
        return <line key={h} className="tick" x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <circle className="now" cx={nx.toFixed(2)} cy={ny.toFixed(2)} r="13" />
    </svg>
  );
}

// Redraw once a minute, not every second
const MemoDial = memo(Dial);
export default function DialOnce({ now, st }) {
  return <MemoDial minute={now.getHours() * 60 + now.getMinutes()} st={st} />;
}
