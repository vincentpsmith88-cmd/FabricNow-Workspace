// Pure conversion helpers for the Converter pages. Everything here runs in the browser.

/* ---------- images ---------- */
export const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
export const baseName = (name) => String(name || 'file').replace(/\.[^.]+$/, '');

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be read as an image.'));
    img.src = src;
  });
}

export const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Your browser cannot export ${type}.`))), type, quality);
});

/** Draws a blob/file to a canvas at the requested width (height follows). `bg` null keeps transparency. */
export async function rasterise(file, { width, bg = null } = {}) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w0 = img.naturalWidth || 1024; const h0 = img.naturalHeight || 1024;
    const w = Math.max(1, Math.min(8000, Math.round(width || w0)));
    const h = Math.max(1, Math.round((w * h0) / w0));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas: c, w, h, w0, h0 };
  } finally { URL.revokeObjectURL(url); }
}

/** Reads the natural size of an SVG from width/height or viewBox. */
export function svgSize(text) {
  const tag = (text.match(/<svg[^>]*>/i) || [''])[0];
  const num = (k) => { const m = tag.match(new RegExp(`\\s${k}=["']([\\d.]+)(px)?["']`, 'i')); return m ? parseFloat(m[1]) : 0; };
  let w = num('width'); let h = num('height');
  const vb = tag.match(/viewBox=["']([^"']+)["']/i);
  if ((!w || !h) && vb) { const p = vb[1].trim().split(/[\s,]+/).map(Number); if (p.length === 4 && p[2] > 0 && p[3] > 0) { w = w || p[2]; h = h || p[3]; } }
  return { w: w || 1024, h: h || 1024 };
}

/** Makes sure the SVG has a namespace and explicit size so browsers can rasterise it. */
export function normaliseSvg(text) {
  const { w, h } = svgSize(text);
  return text.replace(/<svg([^>]*)>/i, (m, attrs) => {
    let a = attrs;
    if (!/xmlns=/.test(a)) a += ' xmlns="http://www.w3.org/2000/svg"';
    if (!/\swidth=/.test(a)) a += ` width="${w}"`;
    if (!/\sheight=/.test(a)) a += ` height="${h}"`;
    return `<svg${a}>`;
  });
}

/* ---------- PDF (JPEG pages, no dependencies) ---------- */
export const PAGE_SIZES = { fit: null, a4: [595.28, 841.89], a3: [841.89, 1190.55], letter: [612, 792] };

export async function buildPdf(images, { size = 'fit', margin = 24 } = {}) {
  // images: [{ bytes:Uint8Array (JPEG), w, h }]
  const enc = new TextEncoder();
  const chunks = []; const offsets = []; let pos = 0;
  const push = (d) => { const u = typeof d === 'string' ? enc.encode(d) : d; chunks.push(u); pos += u.length; };
  const obj = (n, body) => { offsets[n] = pos; push(`${n} 0 obj\n`); push(body); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = images.length; const kids = images.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  images.forEach((im, i) => {
    const pn = 3 + i * 3; const xn = pn + 1; const cn = pn + 2;
    let pw; let ph; let dw; let dh; let dx; let dy;
    if (size === 'fit') { pw = im.w * 0.75; ph = im.h * 0.75; dw = pw; dh = ph; dx = 0; dy = 0; }
    else {
      let [a, b] = PAGE_SIZES[size] || PAGE_SIZES.a4;
      if (im.w > im.h) [a, b] = [b, a];
      pw = a; ph = b;
      const k = Math.min((pw - margin * 2) / im.w, (ph - margin * 2) / im.h);
      dw = im.w * k; dh = im.h * k; dx = (pw - dw) / 2; dy = (ph - dh) / 2;
    }
    const f = (v) => v.toFixed(2);
    obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pw)} ${f(ph)}] /Resources << /XObject << /Im${i} ${xn} 0 R >> >> /Contents ${cn} 0 R >>`);
    offsets[xn] = pos; push(`${xn} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`);
    push(im.bytes); push('\nendstream\nendobj\n');
    const content = `q ${f(dw)} 0 0 ${f(dh)} ${f(dx)} ${f(dy)} cm /Im${i} Do Q`;
    obj(cn, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const total = 3 + n * 3; const xref = pos;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

/* ---------- lengths, fabric, weight ---------- */
export const LENGTH = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048, yd: 0.9144 };
export const WEIGHT = { 'g/m²': 1, 'oz/yd²': 33.90574, momme: 4.3056 };   // value × factor = g/m²  (oz/yd² -> 33.9057 g/m²)

export const convert = (value, from, to, table) => (value * table[from]) / table[to];

export function toFraction(inches, denom = 16) {
  const neg = inches < 0; let v = Math.abs(inches);
  let whole = Math.floor(v); let n = Math.round((v - whole) * denom);
  if (n === denom) { whole += 1; n = 0; }
  if (n) { let d = denom; while (n % 2 === 0) { n /= 2; d /= 2; } return `${neg ? '-' : ''}${whole ? `${whole} ` : ''}${n}/${d}`; }
  return `${neg ? '-' : ''}${whole}`;
}

export const fmtNum = (n, d = 3) => (Number.isFinite(n) ? String(Number(n.toFixed(d))) : '—');

export function weightClass(gsm) {
  if (!(gsm > 0)) return '';
  if (gsm < 100) return 'Very light: chiffon, voile, organza, lawn';
  if (gsm < 150) return 'Light: shirting, poplin, crepe de chine, fine lace';
  if (gsm < 250) return 'Medium: ankara, kitenge, chambray, light denim, twill';
  if (gsm < 400) return 'Medium-heavy: denim, canvas, brocade, aso-oke';
  return 'Heavy: coating, upholstery, thick wool';
}

/* ---------- colour ---------- */
export function hexToRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
export const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const l = (mx + mn) / 2; let h = 0; let s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
export function hslToRgb({ h, s, l }) {
  s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}
export function rgbToCmyk({ r, g, b }) {
  const r1 = r / 255; const g1 = g / 255; const b1 = b / 255; const k = 1 - Math.max(r1, g1, b1);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: Math.round(((1 - r1 - k) / (1 - k)) * 100), m: Math.round(((1 - g1 - k) / (1 - k)) * 100), y: Math.round(((1 - b1 - k) / (1 - k)) * 100), k: Math.round(k * 100) };
}
export function cmykToRgb({ c, m, y, k }) {
  const f = (v) => Math.round(255 * (1 - v / 100) * (1 - k / 100));
  return { r: f(c), g: f(m), b: f(y) };
}

/* ---------- clothing sizes (typical values; brand charts vary) ---------- */
export const WOMEN = Array.from({ length: 11 }, (_, i) => {
  const us = i * 2; const step = us <= 10 ? us / 2 : 5 + (us - 10) / 2 * 1.33;
  const letter = us <= 2 ? 'XS' : us <= 6 ? 'S' : us <= 10 ? 'M' : us <= 14 ? 'L' : us <= 18 ? 'XL' : 'XXL';
  return { US: us, UK: us + 4, AU: us + 4, EU: us + 32, FR: us + 34, IT: us + 36, Letter: letter,
    bust: Math.round(80 + step * 3), waist: Math.round(61 + step * 3), hip: Math.round(87 + step * 3) };
});
export const MEN = [34, 36, 38, 40, 42, 44, 46, 48].map((c) => ({
  US: c, UK: c, EU: c + 10, Letter: c <= 34 ? 'XS' : c === 36 ? 'S' : c <= 40 ? 'M' : c === 42 ? 'L' : c === 44 ? 'XL' : c === 46 ? 'XXL' : '3XL', chestCm: Math.round(c * 2.54),
}));

/* ======================================================================================
   Background removal (plain / studio backgrounds). Flood-fills from the image border so
   colours inside the garment that happen to match the background are kept.
   ====================================================================================== */
const dist2 = (r1, g1, b1, r2, g2, b2) => { // "redmean" weighted distance, closer to how the eye sees colour
  const rm = (r1 + r2) / 2; const dr = r1 - r2; const dg = g1 - g2; const db = b1 - b2;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
};

export function detectBackground({ data, width, height }) {
  const bins = new Map(); const add = (x, y) => {
    const i = (y * width + x) * 4; if (data[i + 3] < 200) return;
    const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const b = bins.get(k) || { n: 0, r: 0, g: 0, b: 0 }; b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]; bins.set(k, b);
  };
  const step = Math.max(1, Math.floor(Math.max(width, height) / 400));
  for (let x = 0; x < width; x += step) { add(x, 0); add(x, height - 1); }
  for (let y = 0; y < height; y += step) { add(0, y); add(width - 1, y); }
  let best = null; bins.forEach((b) => { if (!best || b.n > best.n) best = b; });
  return best ? { r: Math.round(best.r / best.n), g: Math.round(best.g / best.n), b: Math.round(best.b / best.n) } : { r: 255, g: 255, b: 255 };
}

/** Mutates `img.data`: background pixels get alpha 0, edges are feathered and de-fringed. Returns the colour removed. */
export function removeBackground(img, { tolerance = 30, feather = 1, bg = null } = {}) {
  const { data, width: w, height: h } = img;
  const key = bg || detectBackground(img);
  const t = Math.pow(tolerance * 6.5 + 20, 2);               // tolerance 0..100 → distance threshold
  const near = (p) => dist2(data[p], data[p + 1], data[p + 2], key.r, key.g, key.b) <= t;
  const mask = new Uint8Array(w * h);                        // 1 = background
  const stack = [];
  const seed = (x, y) => { const i = y * w + x; if (!mask[i] && near(i * 4)) { mask[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (stack.length) {
    const i = stack.pop(); const x = i % w; const y = (i / w) | 0;
    if (x > 0) seed(x - 1, y); if (x < w - 1) seed(x + 1, y); if (y > 0) seed(x, y - 1); if (y < h - 1) seed(x, y + 1);
  }
  // feather: blur the mask with a box filter so the cut-out edge fades instead of stair-stepping
  let alpha = new Float32Array(w * h);
  for (let i = 0; i < alpha.length; i++) alpha[i] = mask[i] ? 0 : 1;
  const r = Math.round(feather);
  if (r > 0) {
    const tmp = new Float32Array(w * h); const win = r * 2 + 1;
    for (let y = 0; y < h; y++) { let s = 0; const row = y * w;
      for (let x = -r; x <= r; x++) s += alpha[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) { tmp[row + x] = s / win; s += alpha[row + Math.min(w - 1, x + r + 1)] - alpha[row + Math.max(0, x - r)]; } }
    const out = new Float32Array(w * h);
    for (let x = 0; x < w; x++) { let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) { out[y * w + x] = s / win; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    alpha = out;
    for (let i = 0; i < alpha.length; i++) if (mask[i] && alpha[i] < 0.02) alpha[i] = 0; else if (!mask[i] && alpha[i] > 0.98) alpha[i] = 1;
  }
  for (let i = 0; i < alpha.length; i++) {
    const p = i * 4; const a = alpha[i];
    if (a > 0 && a < 1) { // remove the background tint that bleeds into edge pixels
      data[p] = Math.max(0, Math.min(255, (data[p] - key.r * (1 - a)) / a));
      data[p + 1] = Math.max(0, Math.min(255, (data[p + 1] - key.g * (1 - a)) / a));
      data[p + 2] = Math.max(0, Math.min(255, (data[p + 2] - key.b * (1 - a)) / a));
    }
    data[p + 3] = Math.round(data[p + 3] * a);
  }
  return key;
}

/* ======================================================================================
   Palette (median cut) and hand-off to the Colour tool
   ====================================================================================== */
export function extractPalette({ data, width, height }, count = 6) {
  const px = []; const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 12000)));
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4; if (data[i + 3] >= 128) px.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (!px.length) return [];
  let boxes = [px];
  const range = (b) => [0, 1, 2].map((c) => { let lo = 255; let hi = 0; for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; } return hi - lo; });
  while (boxes.length < count * 4) {
    let pick = -1; let score = 0;
    boxes.forEach((b, i) => { const s = Math.max(...range(b)) * Math.sqrt(b.length); if (b.length > 1 && s > score) { score = s; pick = i; } });
    if (pick < 0) break;
    const b = boxes[pick]; const ch = range(b).indexOf(Math.max(...range(b)));
    b.sort((p, q) => p[ch] - q[ch]); const mid = b.length >> 1;
    boxes.splice(pick, 1, b.slice(0, mid), b.slice(mid));
  }
  const total = px.length;
  const cols = boxes.filter((b) => b.length).map((b) => {
    const rgb = { r: 0, g: 0, b: 0 }; for (const p of b) { rgb.r += p[0]; rgb.g += p[1]; rgb.b += p[2]; }
    return { rgb: { r: rgb.r / b.length, g: rgb.g / b.length, b: rgb.b / b.length }, n: b.length };
  }).sort((a, b) => b.n - a.n);
  const merged = []; // fold shades that look the same into one swatch
  for (const c of cols) {
    const hit = merged.find((m) => dist2(m.rgb.r, m.rgb.g, m.rgb.b, c.rgb.r, c.rgb.g, c.rgb.b) < 22 * 22 * 9);
    if (hit) { const t = hit.n + c.n; ['r', 'g', 'b'].forEach((k) => { hit.rgb[k] = (hit.rgb[k] * hit.n + c.rgb[k] * c.n) / t; }); hit.n = t; } else merged.push({ rgb: { ...c.rgb }, n: c.n });
  }
  return merged.sort((a, b) => b.n - a.n).slice(0, count).map((m) => {
    const rgb = { r: Math.round(m.rgb.r), g: Math.round(m.rgb.g), b: Math.round(m.rgb.b) };
    return { hex: rgbToHex(rgb), rgb, pct: Math.max(1, Math.round((m.n / total) * 100)) };
  });
}

/** Tiny in-memory hand-off so the Palette tool can open a colour in the Colour tool. */
export const colourHandoff = { hex: null };

/* ======================================================================================
   DXF → SVG (ASCII DXF: lines, polylines, arcs, circles, ellipses, splines, text, blocks)
   ====================================================================================== */
const UNIT_MM = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000, 10: 914.4 };
const D2R = Math.PI / 180;

function readDxf(text) {
  const L = text.split(/\r?\n/); const sections = {}; let sec = null; let cur = null; const header = {}; let hvar = null;
  for (let i = 0; i + 1 < L.length; i += 2) {
    const code = parseInt(L[i].trim(), 10); const val = L[i + 1].trim();
    if (Number.isNaN(code)) continue;
    if (code === 0) {
      if (val === 'SECTION') { cur = null; continue; }
      if (val === 'ENDSEC') { sec = null; cur = null; continue; }
      if (val === 'EOF') break;
      if (sec) { cur = { t: val, p: [] }; (sections[sec] ||= []).push(cur); }
    } else if (code === 2 && !sec && cur === null && (val === 'HEADER' || val === 'BLOCKS' || val === 'ENTITIES' || val === 'TABLES' || val === 'CLASSES' || val === 'OBJECTS')) { sec = val; }
    else if (sec === 'HEADER') { if (code === 9) hvar = val; else if (hvar) { header[hvar] = val; hvar = null; } }
    else if (cur) cur.p.push([code, val]);
  }
  return { sections, header };
}

const g = (e, code, def) => { const f = e.p.find((x) => x[0] === code); return f ? f[1] : def; };
const gn = (e, code, def = 0) => { const f = e.p.find((x) => x[0] === code); return f ? parseFloat(f[1]) : def; };

function arcPts(cx, cy, r, a0, a1, rx = r, ry = r, rot = 0) {
  const sweep = a1 - a0; const n = Math.max(8, Math.ceil(Math.abs(sweep) / (4 * D2R))); const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (sweep * i) / n; const x = rx * Math.cos(a); const y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return pts;
}

function bulgePts(p1, p2, b) {
  if (!b) return [];
  const th = 4 * Math.atan(b); const dx = p2[0] - p1[0]; const dy = p2[1] - p1[1]; const c = Math.hypot(dx, dy);
  if (!c) return [];
  const k = c / 2 / Math.tan(th / 2); const cx = (p1[0] + p2[0]) / 2 + (-dy / c) * k; const cy = (p1[1] + p2[1]) / 2 + (dx / c) * k;
  const r = Math.hypot(p1[0] - cx, p1[1] - cy); const a0 = Math.atan2(p1[1] - cy, p1[0] - cx);
  const n = Math.max(2, Math.ceil(Math.abs(th) / (4 * D2R))); const out = [];
  for (let i = 1; i < n; i++) { const a = a0 + (th * i) / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}

function withBulges(verts, closed) {
  const out = [];
  verts.forEach((v, i) => {
    out.push([v.x, v.y]);
    const next = verts[i + 1] || (closed ? verts[0] : null);
    if (next && v.b) out.push(...bulgePts([v.x, v.y], [next.x, next.y], v.b));
  });
  return out;
}

function deBoor(deg, ctrl, knots, u) {
  let k = deg; while (k < knots.length - deg - 2 && u >= knots[k + 1]) k++;
  const d = []; for (let j = 0; j <= deg; j++) d[j] = [...ctrl[j + k - deg]];
  for (let r = 1; r <= deg; r++) for (let j = deg; j >= r; j--) {
    const den = knots[j + 1 + k - r] - knots[j + k - deg]; const a = den ? (u - knots[j + k - deg]) / den : 0;
    d[j] = [(1 - a) * d[j - 1][0] + a * d[j][0], (1 - a) * d[j - 1][1] + a * d[j][1]];
  }
  return d[deg];
}

function splinePts(e) {
  const deg = gn(e, 71, 3); const knots = e.p.filter((x) => x[0] === 40).map((x) => parseFloat(x[1]));
  const xs = e.p.filter((x) => x[0] === 10).map((x) => parseFloat(x[1])); const ys = e.p.filter((x) => x[0] === 20).map((x) => parseFloat(x[1]));
  const ctrl = xs.map((x, i) => [x, ys[i]]);
  if (ctrl.length > deg && knots.length === ctrl.length + deg + 1) {
    const lo = knots[deg]; const hi = knots[knots.length - deg - 1]; const n = Math.max(24, ctrl.length * 12); const out = [];
    for (let i = 0; i <= n; i++) out.push(deBoor(deg, ctrl, knots, Math.min(hi - 1e-9, lo + ((hi - lo) * i) / n)));
    out.push(ctrl[ctrl.length - 1]); return out;
  }
  const fx = e.p.filter((x) => x[0] === 11).map((x) => parseFloat(x[1])); const fy = e.p.filter((x) => x[0] === 21).map((x) => parseFloat(x[1]));
  if (fx.length > 1) { // no knots stored: smooth curve through the fit points (Catmull-Rom)
    const P = fx.map((x, i) => [x, fy[i]]); const out = [P[0]];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)]; const p1 = P[i]; const p2 = P[i + 1]; const p3 = P[Math.min(P.length - 1, i + 2)];
      for (let k = 1; k <= 12; k++) { const t = k / 12; const t2 = t * t; const t3 = t2 * t;
        out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); }
    }
    return out;
  }
  return ctrl;
}

export function dxfToSvg(text, { unit = 'auto', stroke = '#111111', strokeWidth = 0.002, showText = true } = {}) {
  const { sections, header } = readDxf(text);
  const entities = sections.ENTITIES || [];
  if (!entities.length) throw new Error('No drawing entities found. Save the file as an ASCII DXF (not binary) and try again.');
  const blocks = {}; let curBlock = null;
  (sections.BLOCKS || []).forEach((e) => { if (e.t === 'BLOCK') { curBlock = { name: g(e, 2, ''), list: [], bx: gn(e, 10), by: gn(e, 20) }; blocks[curBlock.name] = curBlock; } else if (e.t === 'ENDBLK') curBlock = null; else if (curBlock) curBlock.list.push(e); });

  const paths = []; const texts = []; const skipped = {}; const layers = new Set();
  const tf = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];

  const walk = (list, m, depth) => {
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; const layer = g(e, 8, '0'); const add = (pts, closed = false) => { if (pts.length > 1) { layers.add(layer); paths.push({ pts: pts.map((p) => tf(m, p[0], p[1])), closed, layer }); } };
      switch (e.t) {
        case 'LINE': add([[gn(e, 10), gn(e, 20)], [gn(e, 11), gn(e, 21)]]); break;
        case 'LWPOLYLINE': {
          const verts = []; e.p.forEach(([c, v]) => { if (c === 10) verts.push({ x: parseFloat(v), y: 0, b: 0 }); else if (c === 20 && verts.length) verts[verts.length - 1].y = parseFloat(v); else if (c === 42 && verts.length) verts[verts.length - 1].b = parseFloat(v); });
          const closed = (gn(e, 70, 0) & 1) === 1; const pts = withBulges(verts, closed); if (closed) pts.push(pts[0]); add(pts, closed); break; }
        case 'POLYLINE': {
          const verts = []; let j = i + 1; const flag = gn(e, 70, 0);
          while (j < list.length && list[j].t !== 'SEQEND') { if (list[j].t === 'VERTEX' && (gn(list[j], 70, 0) & 16) === 0) verts.push({ x: gn(list[j], 10), y: gn(list[j], 20), b: gn(list[j], 42, 0) }); j++; }
          i = j; if (flag & (16 | 64)) { skipped.MESH = (skipped.MESH || 0) + 1; break; }
          const closed = (flag & 1) === 1; const pts = withBulges(verts, closed); if (closed) pts.push(pts[0]); add(pts, closed); break; }
        case 'CIRCLE': add(arcPts(gn(e, 10), gn(e, 20), gn(e, 40), 0, Math.PI * 2), true); break;
        case 'ARC': { const a0 = gn(e, 50) * D2R; let a1 = gn(e, 51) * D2R; if (a1 <= a0) a1 += Math.PI * 2; add(arcPts(gn(e, 10), gn(e, 20), gn(e, 40), a0, a1)); break; }
        case 'ELLIPSE': { const mx = gn(e, 11); const my = gn(e, 21); const rx = Math.hypot(mx, my); const ry = rx * gn(e, 40, 1); let a1 = gn(e, 42, Math.PI * 2); const a0 = gn(e, 41, 0); if (a1 <= a0) a1 += Math.PI * 2; add(arcPts(gn(e, 10), gn(e, 20), rx, a0, a1, rx, ry, Math.atan2(my, mx))); break; }
        case 'SPLINE': add(splinePts(e), (gn(e, 70, 0) & 1) === 1); break;
        case 'TEXT': case 'MTEXT': {
          if (!showText) break; const raw = String(g(e, 1, '')); const val = raw.replace(/\\P/g, ' ').replace(/\{?\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '').trim(); if (!val) break;
          const [x, y] = tf(m, gn(e, 10), gn(e, 20)); texts.push({ x, y, h: gn(e, 40, 2.5) * Math.hypot(m[0], m[1]), rot: gn(e, 50, 0) + Math.atan2(m[1], m[0]) / D2R, val, layer }); layers.add(layer); break; }
        case 'INSERT': {
          const b = blocks[g(e, 2, '')]; if (!b || depth > 4) { skipped.INSERT = (skipped.INSERT || 0) + 1; break; }
          const sx = gn(e, 41, 1); const sy = gn(e, 42, 1); const a = gn(e, 50, 0) * D2R; const c = Math.cos(a); const s = Math.sin(a);
          const local = [c * sx, s * sx, -s * sy, c * sy, gn(e, 10), gn(e, 20)];
          walk(b.list, mul(m, mul(local, [1, 0, 0, 1, -b.bx, -b.by])), depth + 1); break; }
        default: skipped[e.t] = (skipped[e.t] || 0) + 1;
      }
    }
  };
  walk(entities, [1, 0, 0, 1, 0, 0], 0);
  if (!paths.length && !texts.length) throw new Error('This DXF has no lines or curves this converter can read.');

  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const see = (x, y) => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; };
  paths.forEach((p) => p.pts.forEach(([x, y]) => see(x, y))); texts.forEach((t) => see(t.x, t.y));
  const w = Math.max(maxX - minX, 1e-6); const h = Math.max(maxY - minY, 1e-6); const pad = Math.max(w, h) * 0.02;
  const fx = (x) => +(x - minX + pad).toFixed(3); const fy = (y) => +(maxY - y + pad).toFixed(3); // flip: DXF is y-up, SVG is y-down
  const mmPer = unit === 'mm' ? 1 : unit === 'cm' ? 10 : unit === 'in' ? 25.4 : UNIT_MM[parseInt(header.$INSUNITS, 10)] || 0;
  const vw = +(w + pad * 2).toFixed(3); const vh = +(h + pad * 2).toFixed(3);
  const size = mmPer ? ` width="${+(vw * mmPer).toFixed(2)}mm" height="${+(vh * mmPer).toFixed(2)}mm"` : '';
  const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const byLayer = {}; paths.forEach((p) => { (byLayer[p.layer] ||= { p: [], t: [] }).p.push(p); }); texts.forEach((t) => { (byLayer[t.layer] ||= { p: [], t: [] }).t.push(t); });
  const body = Object.entries(byLayer).map(([name, v]) => {
    const d = v.p.map((p) => `M${p.pts.map(([x, y]) => `${fx(x)} ${fy(y)}`).join('L')}${p.closed ? 'Z' : ''}`).join('');
    const tx = v.t.map((t) => `<text x="${fx(t.x)}" y="${fy(t.y)}" font-size="${+(t.h).toFixed(2)}" transform="rotate(${-t.rot.toFixed(2)} ${fx(t.x)} ${fy(t.y)})">${esc(t.val)}</text>`).join('');
    return `<g id="${esc(name.replace(/\s+/g, '_'))}" data-layer="${esc(name)}">${d ? `<path d="${d}"/>` : ''}${tx}</g>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}"${size} fill="none" stroke="${stroke}" stroke-width="${+(Math.max(w, h) * strokeWidth).toPrecision(3)}" stroke-linejoin="round" stroke-linecap="round" font-family="Arial, sans-serif" >\n<style>text{fill:${stroke};stroke:none}</style>\n${body}\n</svg>`;
  return { svg, stats: { paths: paths.length, texts: texts.length, layers: layers.size, widthMm: mmPer ? +(w * mmPer).toFixed(1) : null, heightMm: mmPer ? +(h * mmPer).toFixed(1) : null, skipped } };
}
