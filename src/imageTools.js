/* Small browser-side image helpers: shrink a photo before upload, crop a square swatch, and pick dominant colours. */
const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read that image.')); i.src = src; });
const fileToUrl = (file) => URL.createObjectURL(file);

export async function compressImage(file, max = 1200, quality = 0.8) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('Please choose an image file.');
  const url = fileToUrl(file);
  try {
    const img = await load(url), k = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
    return { src: c.toDataURL('image/jpeg', quality), aspect: w / h, w, h };
  } finally { URL.revokeObjectURL(url); }
}
/* Centre square crop, scaled to `size` px. */
export async function squareSwatch(dataUrl, size = 480, quality = 0.82) {
  const img = await load(dataUrl), s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
  const c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', quality);
}
/* Up to n dominant colours as #rrggbb. Quantises to 4 bits per channel, then keeps the most common distinct ones. */
export async function extractPalette(dataUrl, n = 5) {
  const img = await load(dataUrl), c = document.createElement('canvas'), S = 56; c.width = c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, S, S);
  const d = x.getImageData(0, 0, S, S).data, bins = new Map();
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); const b = bins.get(k) || { n: 0, r: 0, g: 0, b: 0 }; b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; bins.set(k, b); }
  const all = [...bins.values()].sort((a, b) => b.n - a.n).map((b) => [Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)]);
  const out = [];
  for (const c1 of all) { if (out.every((c2) => Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]) > 46)) out.push(c1); if (out.length >= n) break; }
  return out.map(([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
}
/* Make sure an image URL can be drawn inside an SVG texture (needs a data URL). Returns the data URL or null. */
export async function toDataUrl(url, max = 480) {
  if (/^data:image\//.test(url)) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return (await compressImage(new File([blob], 'swatch', { type: blob.type || 'image/jpeg' }), max, 0.82)).src;
  } catch { return null; }
}
