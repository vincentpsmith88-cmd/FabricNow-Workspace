import React, { useEffect, useId, useRef, useState } from 'react';

export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function smooth(pts, minY, maxY) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  const t = 0.17;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) * t, minY, maxY);
    const c2y = clamp(p2[1] - (p3[1] - p1[1]) * t, minY, maxY);
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${c1y} ${p2[0] - (p3[0] - p1[0]) * t},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Responsive, animated area/line chart. data: [{ label, value }] */
export function LineChart({ data, height = 260, unit = 'jobs' }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const gid = useId().replace(/:/g, '');
  const n = data.length;
  const pad = { l: 38, r: 12, t: 14, b: 28 };
  const w = Math.max(width, 260);
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const max = Math.max(0, ...data.map((d) => d.value));
  const step = Math.max(1, niceStep(Math.max(max, 1) / 4));
  const yMax = step * 4;
  const x = (i) => pad.l + (n < 2 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - (v / yMax) * ih;
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = smooth(pts, pad.t, pad.t + ih);
  const area = pts.length ? `${line} L${pts[n - 1][0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih} Z` : '';
  const every = Math.max(1, Math.ceil((n - 1) / 4));
  const empty = max === 0;

  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (n - 1));
    setHover(clamp(i, 0, n - 1));
  };

  return (
    <div ref={ref} className="lchart" style={{ height }}>
      {width > 0 && (
        <>
          <svg width={w} height={height} role="img" aria-label={`Line chart of ${unit} per day`}>
            <defs>
              <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#E66239" stopOpacity=".28" />
                <stop offset="1" stopColor="#E66239" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={y(step * t)} y2={y(step * t)} className="grid-line" />
                <text x={pad.l - 10} y={y(step * t) + 4} textAnchor="end" className="axis">{step * t}</text>
              </g>
            ))}
            {data.map((d, i) => (i % every === 0 || i === n - 1) && (n - 1 - i >= every / 2 || i === n - 1) ? (
              <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="axis">{d.label}</text>
            ) : null)}
            <path d={area} fill={`url(#a${gid})`} className="chart-area" />
            <path d={line} pathLength="1" className="chart-line" fill="none" />
            {n > 0 && <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="4.5" className="chart-dot" />}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t} y2={pad.t + ih} className="guide" />
                <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5.5" className="chart-dot hot" />
              </g>
            )}
            <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onPointerMove={move} onPointerLeave={() => setHover(null)} />
          </svg>
          {hover !== null && (
            <div className="tip" style={{ left: clamp(pts[hover][0], 64, w - 64), top: Math.max(0, pts[hover][1] - 58) }}>
              <strong>{data[hover].value} {data[hover].value === 1 ? unit.replace(/s$/, '') : unit}</strong>
              <span>{data[hover].label}</span>
            </div>
          )}
          {empty && <div className="chart-empty">No activity in this period yet</div>}
        </>
      )}
    </div>
  );
}

/** Vertical bars that grow in. data: [[label, value]] */
export function BarChart({ data, height = 230 }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="bchart" style={{ height }} role="img" aria-label="Bar chart">
      {data.map(([k, v], i) => (
        <div className="bcol" key={k}>
          <span className="bval">{v}</span>
          <div className="btrack"><i style={{ height: `${(v / max) * 100}%`, animationDelay: `${120 + i * 70}ms` }} /></div>
          <span className="blab" title={k}>{k}</span>
        </div>
      ))}
    </div>
  );
}

/** Counts up once to `value` (and again if the value changes). Respects reduced motion. */
export function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return undefined; }
    const start = performance.now(), a = from.current;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 800);
      const v = a + (value - a) * (1 - (1 - p) ** 3);
      from.current = v; setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{Math.round(shown).toLocaleString()}</>;
}
