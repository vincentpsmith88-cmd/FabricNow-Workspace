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
