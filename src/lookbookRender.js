// Draws lookbook pages (A4 portrait) onto canvases. Used for the live preview, the PDF and the share thumbnails.
export const THEMES = {
  light: { bg: '#FBFAF8', card: '#FFFFFF', text: '#1D1A33', muted: '#6B6F80', line: '#E7E4EE', accent: '#E66239', name: 'Light' },
  dark: { bg: '#12111D', card: '#1B1A2D', text: '#EDEFF7', muted: '#A4ABC2', line: '#2D2B45', accent: '#F08A63', name: 'Midnight' },
  terracotta: { bg: '#2B1A15', card: '#38231C', text: '#FBEFE8', muted: '#D2B3A6', line: '#52352B', accent: '#F4A07C', name: 'Terracotta' },
};
export const LAYOUTS = { one: { per: 1, name: 'One design per page' }, two: { per: 2, name: 'Two per page' }, grid: { per: 4, name: 'Four per page (grid)' } };
export const CURRENCIES = ['USD', 'GHS', 'NGN', 'EUR', 'GBP', 'XOF', 'KES', 'ZAR', 'CAD'];
export const PAGE_W = 1240; export const PAGE_H = 1754;
const FONT = "'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif";

export const formatPrice = (price, currency) => {
  const raw = String(price ?? '').trim(); if (!raw) return '';
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : raw;
};

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function drawCover(ctx, img, x, y, w, h, r, fill) {
  ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip(); ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  if (img) { const k = Math.max(w / img.width, h / img.height); const dw = img.width * k; const dh = img.height * k; ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
  ctx.restore();
}

function wrap(ctx, text, maxW, maxLines = 3) {
  const words = String(text || '').split(/\s+/).filter(Boolean); const lines = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S*$/, '')}…`; }
  return lines;
}

function caption(ctx, it, s, t, x, y, w) {
  let cy = y; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = t.text; ctx.font = `800 34px ${FONT}`;
  wrap(ctx, it.name || 'Untitled', w, 2).forEach((l) => { ctx.fillText(l, x, cy); cy += 42; });
  const price = formatPrice(it.price, s.currency);
  if (price) { ctx.fillStyle = t.accent; ctx.font = `800 28px ${FONT}`; ctx.fillText(price, x, cy + 4); cy += 42; }
  if (it.note) { ctx.fillStyle = t.muted; ctx.font = `500 24px ${FONT}`; wrap(ctx, it.note, w, 3).forEach((l) => { ctx.fillText(l, x, cy + 4); cy += 32; }); }
}

export async function renderPages(items, s, width = PAGE_W) {
  try { await Promise.all([document.fonts.load(`800 30px Manrope`), document.fonts.load(`500 24px Manrope`)]); } catch { /* fonts optional */ }
  const t = THEMES[s.theme] || THEMES.light; const per = (LAYOUTS[s.layout] || LAYOUTS.one).per; const k = width / PAGE_W;
  const pages = [];
  const mk = () => { const c = document.createElement('canvas'); c.width = width; c.height = Math.round(PAGE_H * k); const ctx = c.getContext('2d'); ctx.scale(k, k); ctx.fillStyle = t.bg; ctx.fillRect(0, 0, PAGE_W, PAGE_H); ctx.textBaseline = 'top'; pages.push(c); return ctx; };

  // cover
  let ctx = mk(); const M = 96;
  ctx.fillStyle = t.accent; ctx.font = `800 26px ${FONT}`; ctx.letterSpacing = '6px';
  if (s.brand) ctx.fillText(s.brand.toUpperCase(), M, M);
  ctx.letterSpacing = '0px'; ctx.fillStyle = t.text; ctx.font = `800 118px ${FONT}`;
  let y = M + 90; wrap(ctx, s.title || 'Lookbook', PAGE_W - M * 2, 3).forEach((l) => { ctx.fillText(l, M, y); y += 124; });
  if (s.subtitle) { ctx.fillStyle = t.muted; ctx.font = `500 32px ${FONT}`; wrap(ctx, s.subtitle, PAGE_W - M * 2 - 200, 3).forEach((l) => { ctx.fillText(l, M, y + 10); y += 44; }); }
  const heroY = Math.max(y + 60, 760);
  drawCover(ctx, items[0]?.img, M, heroY, PAGE_W - M * 2, PAGE_H - heroY - M, 40, t.line);

  // item pages
  for (let i = 0; i < items.length; i += per) {
    ctx = mk(); const chunk = items.slice(i, i + per);
    if (per === 1) {
      const it = chunk[0]; drawCover(ctx, it.img, M, M, PAGE_W - M * 2, 1280, 36, t.line); caption(ctx, it, s, t, M, M + 1280 + 44, PAGE_W - M * 2);
    } else if (per === 2) {
      const cw = (PAGE_W - M * 2 - 48) / 2;
      chunk.forEach((it, j) => { const x = M + j * (cw + 48); drawCover(ctx, it.img, x, M, cw, 1000, 32, t.line); caption(ctx, it, s, t, x, M + 1000 + 36, cw); });
    } else {
      const cw = (PAGE_W - M * 2 - 40) / 2; const ch = 560;
      chunk.forEach((it, j) => { const x = M + (j % 2) * (cw + 40); const yy = M + Math.floor(j / 2) * (ch + 230); drawCover(ctx, it.img, x, yy, cw, ch, 28, t.line); caption(ctx, it, s, t, x, yy + ch + 26, cw); });
    }
    ctx.fillStyle = t.muted; ctx.font = `600 20px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(s.brand || '', M, PAGE_H - 60);
    ctx.textAlign = 'right'; ctx.fillText(String(pages.length), PAGE_W - M, PAGE_H - 60); ctx.textAlign = 'left';
  }
  return pages;
}
