import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Check, Copy, Download, FileImage, FileText, Image as ImageIcon, Palette, Ruler, Scale, Scissors, Shirt, Spline, Upload, X } from 'lucide-react';
import { api } from '../api.js';
import {
  LENGTH, WEIGHT, MEN, WOMEN, baseName, buildPdf, canvasBlob, cmykToRgb, convert, fmtBytes, fmtNum, hexToRgb, hslToRgb,
  normaliseSvg, rasterise, rgbToCmyk, rgbToHex, rgbToHsl, svgSize, toFraction, weightClass,
} from '../convert.js';

/* ---------- small shared pieces ---------- */
function useCopy() {
  const [done, setDone] = useState('');
  const timer = useRef(0);
  const copy = (text, key = text) => {
    try { navigator.clipboard.writeText(String(text)); } catch { /* ignore */ }
    setDone(key); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(''), 1400);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return [done, copy];
}

const download = (blob, name) => {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

function Field({ label, value, onCommit, w, suffix, mono }) {
  const [text, setText] = useState(null);
  return (
    <label className="cv-field" style={w ? { width: w } : null}>
      <span>{label}</span>
      <div className="cv-input">
        <input className={mono ? 'mono' : ''} value={text ?? value} inputMode="decimal" spellCheck={false}
          onFocus={(e) => { setText(String(value)); e.target.select(); }}
          onChange={(e) => { setText(e.target.value); onCommit(e.target.value); }}
          onBlur={() => setText(null)} />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}

function Choice({ label, value, onChange, options }) {
  return (
    <label className="cv-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Slider({ label, value, onChange, min, max, step = 1, show }) {
  return (
    <label className="cv-field">
      <span>{label}<b>{show ? show(value) : value}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ToolHead({ title, body, badge }) {
  return (
    <header className="cv-tool-head">
      <div><h2>{title}</h2><p>{body}</p></div>
      {badge && <span className="cv-badge">{badge}</span>}
    </header>
  );
}

/* ---------- file based tools ---------- */
function FileTool({ title, body, badge, accept, exts, multiple, actionLabel, options, process, emptyHint }) {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [copied, copy] = useCopy();
  const input = useRef(null);
  const [opts, setOpts] = useState(options.initial);

  useEffect(() => () => results.forEach((r) => r.url && URL.revokeObjectURL(r.url)), [results]);

  const take = (list) => {
    const ok = Array.from(list || []).filter((f) => exts.test(f.name) || (f.type && accept.split(',').some((t) => t.trim() === f.type)));
    if (!ok.length) { setError(`Choose a file ending in ${exts.source.replace(/[\\$()]/g, '').replace(/\|/g, ', .').replace(/^\.?/, '.')}.`); return; }
    setError(''); setResults([]);
    setFiles((cur) => (multiple ? [...cur, ...ok] : ok.slice(0, 1)));
  };
  const run = async () => {
    setBusy(true); setError(''); setResults([]);
    try {
      const out = await process(files, opts);
      setResults(out.map((r) => ({ ...r, url: r.blob ? URL.createObjectURL(r.blob) : '' })));
    } catch (e) { setError(e.message || 'Conversion failed.'); } finally { setBusy(false); }
  };

  return (
    <div className="cv-tool">
      <ToolHead title={title} body={body} badge={badge} />
      <div
        className={`cv-drop ${drag ? 'drag' : ''} ${files.length ? 'has' : ''}`} role="button" tabIndex={0}
        onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files); }}
      >
        <span className="cv-drop-ico"><Upload size={20} /></span>
        <div><strong>{files.length ? (multiple ? 'Add more files' : 'Replace file') : 'Drop a file here, or browse'}</strong><small>{emptyHint}</small></div>
        <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
      </div>

      {files.length > 0 && (
        <ul className="cv-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <FileImage size={15} /><span>{f.name}</span><small>{fmtBytes(f.size)}</small>
              <button className="icon-btn" aria-label={`Remove ${f.name}`} onClick={() => { setFiles(files.filter((_, k) => k !== i)); setResults([]); }}><X size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="cv-opts">{options.render(opts, (p) => setOpts((o) => ({ ...o, ...p })))}</div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="cv-actions">
        <button className={`btn btn-primary ${busy ? 'is-pending' : ''}`} disabled={!files.length} aria-busy={busy} onClick={run} data-no-spin>
          {!busy && <ArrowLeftRight size={16} />}{actionLabel}
        </button>
      </div>

      {results.length > 0 && (
        <div className="cv-results">
          {results.map((r, i) => (
            <article className="cv-result" key={`${r.name}-${i}`}>
              <div className="cv-thumb">{r.preview !== false && r.url && r.kind !== 'pdf' ? <img src={r.url} alt="" /> : <FileText size={34} />}</div>
              <div className="cv-result-body">
                <strong title={r.name}>{r.name}</strong>
                <small>{r.note || `${fmtBytes(r.inSize)} → ${fmtBytes(r.blob.size)}`}{r.dims ? ` · ${r.dims}` : ''}</small>
                <div className="cv-result-actions">
                  <button className="btn btn-primary btn-sm" data-no-spin onClick={() => download(r.blob, r.name)}><Download size={14} /> Download</button>
                  {r.text && <button className="btn btn-ghost btn-sm" data-no-spin onClick={() => copy(r.text, r.name)}>{copied === r.name ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy code</>}</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const IMG_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i;
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

function SvgToPng() {
  return (
    <FileTool
      title="SVG to PNG" badge="Runs in your browser"
      body="Turn a vector flat, print or logo into a crisp image for listings, mood boards and social posts. Pick any size, including 4× for print."
      accept=".svg,image/svg+xml" exts={/\.svg$/i} multiple actionLabel="Convert to image" emptyHint="SVG files only. Nothing is uploaded."
      options={{
        initial: { fmt: 'png', scale: '2', width: '', bg: 'transparent', color: '#FFFFFF' },
        render: (o, set) => (<>
          <Choice label="Output" value={o.fmt} onChange={(fmt) => set({ fmt })} options={[['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WebP']]} />
          <Choice label="Size" value={o.scale} onChange={(scale) => set({ scale })} options={[['1', '1× (original)'], ['2', '2×'], ['4', '4× (print)'], ['custom', 'Custom width']]} />
          {o.scale === 'custom' && <Field label="Width" value={o.width} onCommit={(v) => set({ width: v.replace(/\D/g, '') })} suffix="px" w="120px" />}
          <Choice label="Background" value={o.bg} onChange={(bg) => set({ bg })} options={[['transparent', 'Transparent'], ['solid', 'Solid colour']]} />
          {o.bg === 'solid' && <label className="cv-field"><span>Colour</span><input type="color" value={o.color} onChange={(e) => set({ color: e.target.value })} /></label>}
        </>),
      }}
      process={async (files, o) => {
        const out = [];
        for (const f of files) {
          const text = await f.text();
          if (!/<svg/i.test(text)) throw new Error(`${f.name} does not look like an SVG file.`);
          const size = svgSize(text);
          const width = o.scale === 'custom' ? Number(o.width) || size.w : size.w * Number(o.scale);
          const flat = o.fmt === 'jpg';
          const bg = o.bg === 'solid' ? o.color : flat ? '#FFFFFF' : null;
          const { canvas, w, h } = await rasterise(new Blob([normaliseSvg(text)], { type: 'image/svg+xml' }), { width, bg });
          const blob = await canvasBlob(canvas, MIME[o.fmt], 0.92);
          out.push({ blob, name: `${baseName(f.name)}.${o.fmt}`, inSize: f.size, dims: `${w} × ${h}px` });
        }
        return out;
      }}
    />
  );
}

function ImageToSvg() {
  return (
    <FileTool
      title="Image to SVG" badge="Traced on the FabricNow server"
      body="Trace a PNG, JPG or WebP into clean vector paths. Best for line art, motifs, prints, logos and hand-drawn flats; photos come out posterised."
      accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" exts={/\.(png|jpe?g|webp)$/i} multiple={false} actionLabel="Trace to SVG"
      emptyHint="PNG, JPG or WebP up to 15 MB. The upload is deleted right after tracing."
      options={{
        initial: { steps: 5, threshold: 200, speckle: 2, smooth: 0.3, color: '#000000', bg: 'transparent' },
        render: (o, set) => (<>
          <Slider label="Detail" value={o.steps} min={1} max={16} onChange={(steps) => set({ steps })} show={(v) => (v < 4 ? 'Simple' : v < 9 ? 'Balanced' : 'Rich')} />
          <Slider label="Threshold" value={o.threshold} min={0} max={255} onChange={(threshold) => set({ threshold })} />
          <Slider label="Remove specks" value={o.speckle} min={0} max={30} onChange={(speckle) => set({ speckle })} show={(v) => `${v}px`} />
          <Slider label="Smoothing" value={o.smooth} min={0} max={1} step={0.05} onChange={(smooth) => set({ smooth })} show={(v) => v.toFixed(2)} />
          <label className="cv-field"><span>Fill colour</span><input type="color" value={o.color} onChange={(e) => set({ color: e.target.value })} /></label>
          <Choice label="Background" value={o.bg} onChange={(bg) => set({ bg })} options={[['transparent', 'Transparent'], ['#FFFFFF', 'White']]} />
        </>),
      }}
      process={async (files, o) => {
        const f = files[0]; const fd = new FormData();
        fd.append('image', f); fd.append('steps', o.steps); fd.append('threshold', o.threshold);
        fd.append('turdSize', o.speckle); fd.append('optTolerance', o.smooth); fd.append('color', o.color); fd.append('background', o.bg);
        const d = await api('/api/convert/png-to-svg', { method: 'POST', body: fd });
        const blob = new Blob([d.svg], { type: 'image/svg+xml' });
        return [{ blob, name: `${baseName(f.name)}.svg`, inSize: f.size, text: d.svg, dims: `${(d.svg.match(/<path/g) || []).length} paths` }];
      }}
    />
  );
}

function ImageFormats() {
  return (
    <FileTool
      title="Image formats and sizes" badge="Runs in your browser"
      body="Convert between PNG, JPG and WebP, shrink files for faster listings, or resize to a marketplace or social size."
      accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,image/*" exts={IMG_EXT} multiple actionLabel="Convert images" emptyHint="PNG, JPG, WebP, GIF or BMP. Nothing is uploaded."
      options={{
        initial: { fmt: 'jpg', quality: 88, size: 'original', width: '' },
        render: (o, set) => (<>
          <Choice label="Convert to" value={o.fmt} onChange={(fmt) => set({ fmt })} options={[['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']]} />
          {o.fmt !== 'png' && <Slider label="Quality" value={o.quality} min={40} max={100} onChange={(quality) => set({ quality })} show={(v) => `${v}%`} />}
          <Choice label="Size" value={o.size} onChange={(size) => set({ size })} options={[['original', 'Keep original'], ['2048', 'Shopify: 2048px wide'], ['2000', 'Etsy: 2000px wide'], ['1080', 'Instagram: 1080px wide'], ['custom', 'Custom width']]} />
          {o.size === 'custom' && <Field label="Width" value={o.width} onCommit={(v) => set({ width: v.replace(/\D/g, '') })} suffix="px" w="120px" />}
        </>),
      }}
      process={async (files, o) => {
        const out = [];
        for (const f of files) {
          const width = o.size === 'original' ? undefined : o.size === 'custom' ? Number(o.width) || undefined : Number(o.size);
          const { canvas, w, h } = await rasterise(f, { width, bg: o.fmt === 'jpg' ? '#FFFFFF' : null });
          const blob = await canvasBlob(canvas, MIME[o.fmt], o.quality / 100);
          out.push({ blob, name: `${baseName(f.name)}.${o.fmt}`, inSize: f.size, dims: `${w} × ${h}px` });
        }
        return out;
      }}
    />
  );
}

function ImageToPdf() {
  return (
    <FileTool
      title="Images to PDF" badge="Runs in your browser"
      body="Combine one or more images into a single PDF: lookbooks, line sheets, fabric swatch cards, or a print-ready flat. One image per page."
      accept=".png,.jpg,.jpeg,.webp,image/*" exts={IMG_EXT} multiple actionLabel="Make PDF" emptyHint="Add several images to build a multi-page PDF, in the order listed."
      options={{
        initial: { size: 'a4', margin: 24 },
        render: (o, set) => (<>
          <Choice label="Page size" value={o.size} onChange={(size) => set({ size })} options={[['a4', 'A4'], ['a3', 'A3'], ['letter', 'US Letter'], ['fit', 'Fit to image']]} />
          {o.size !== 'fit' && <Slider label="Margin" value={o.margin} min={0} max={72} onChange={(margin) => set({ margin })} show={(v) => `${v} pt`} />}
        </>),
      }}
      process={async (files, o) => {
        const pages = [];
        for (const f of files) {
          const { canvas, w, h } = await rasterise(f, { bg: '#FFFFFF', width: undefined });
          const jpg = await canvasBlob(canvas, 'image/jpeg', 0.92);
          pages.push({ bytes: new Uint8Array(await jpg.arrayBuffer()), w, h });
        }
        const blob = await buildPdf(pages, o);
        const name = `${files.length === 1 ? baseName(files[0].name) : 'lookbook'}.pdf`;
        return [{ blob, name, kind: 'pdf', inSize: files.reduce((s, f) => s + f.size, 0), dims: `${pages.length} page${pages.length > 1 ? 's' : ''}` }];
      }}
    />
  );
}

/* ---------- unit tools ---------- */
function Outputs({ rows, copyKey }) {
  const [done, copy] = useCopy();
  return (
    <div className="cv-grid-out">
      {rows.map(([label, value, extra]) => (
        <button key={label} className="cv-out" data-no-spin onClick={() => copy(value, label)} title="Copy value">
          <small>{label}</small><strong>{value}</strong>{extra && <em>{extra}</em>}
          <span>{done === label ? <Check size={14} /> : <Copy size={14} />}</span>
        </button>
      ))}
    </div>
  );
}

function LengthTool() {
  const [v, setV] = useState('100'); const [from, setFrom] = useState('cm');
  const n = parseFloat(v);
  const rows = Object.keys(LENGTH).map((u) => {
    const val = convert(n, from, u, LENGTH);
    return [u, `${fmtNum(val)} ${u}`, u === 'in' && Number.isFinite(val) ? `${toFraction(val)} in` : null];
  });
  return (
    <div className="cv-tool">
      <ToolHead title="Measurements" body="Convert body and pattern measurements between centimetres, millimetres, inches, feet, metres and yards. Inches also show as tailor's fractions." badge="Instant" />
      <div className="cv-opts">
        <Field label="Value" value={v} onCommit={setV} w="160px" />
        <Choice label="From" value={from} onChange={setFrom} options={Object.keys(LENGTH).map((u) => [u, u])} />
      </div>
      <Outputs rows={rows} />
    </div>
  );
}

function FabricQty() {
  const [qty, setQty] = useState('3'); const [qu, setQu] = useState('yd');
  const [wd, setWd] = useState('112'); const [wu, setWu] = useState('cm');
  const [price, setPrice] = useState('12'); const [pu, setPu] = useState('yd');
  const q = parseFloat(qty); const m = convert(q, qu, 'm', LENGTH); const yd = convert(q, qu, 'yd', LENGTH);
  const wM = convert(parseFloat(wd), wu, 'm', LENGTH);
  const p = parseFloat(price); const perM = pu === 'yd' ? p / 0.9144 : p; const perYd = pu === 'yd' ? p : p * 0.9144;
  return (
    <div className="cv-tool">
      <ToolHead title="Fabric quantity and price" body="Switch between metres and yards, see the cloth area for a given width, and compare a price per yard with a price per metre." badge="Instant" />
      <div className="cv-opts">
        <Field label="Length" value={qty} onCommit={setQty} w="140px" />
        <Choice label="Unit" value={qu} onChange={setQu} options={[['yd', 'yards'], ['m', 'metres']]} />
        <Field label="Fabric width" value={wd} onCommit={setWd} w="140px" />
        <Choice label="Width unit" value={wu} onChange={setWu} options={[['cm', 'cm'], ['in', 'inches']]} />
      </div>
      <Outputs rows={[['Metres', `${fmtNum(m)} m`], ['Yards', `${fmtNum(yd)} yd`], ['Cloth area', Number.isFinite(m * wM) ? `${fmtNum(m * wM)} m²` : '—'], ['Width', Number.isFinite(wM) ? `${fmtNum(wM * 100, 1)} cm / ${fmtNum(wM / 0.0254, 1)} in` : '—']]} />
      <h3 className="cv-sub">Price per unit</h3>
      <div className="cv-opts">
        <Field label="Price" value={price} onCommit={setPrice} w="140px" />
        <Choice label="Per" value={pu} onChange={setPu} options={[['yd', 'yard'], ['m', 'metre']]} />
      </div>
      <Outputs rows={[['Per yard', Number.isFinite(perYd) ? fmtNum(perYd, 2) : '—'], ['Per metre', Number.isFinite(perM) ? fmtNum(perM, 2) : '—'], ['Total for length', Number.isFinite(perM * m) ? fmtNum(perM * m, 2) : '—']]} />
    </div>
  );
}

function WeightTool() {
  const [v, setV] = useState('150'); const [from, setFrom] = useState('g/m²');
  const n = parseFloat(v); const gsm = convert(n, from, 'g/m²', WEIGHT);
  return (
    <div className="cv-tool">
      <ToolHead title="Fabric weight" body="Convert between grams per square metre (GSM), ounces per square yard and momme (silk). A quick guide shows what kind of cloth that weight usually is." badge="Instant" />
      <div className="cv-opts">
        <Field label="Weight" value={v} onCommit={setV} w="160px" />
        <Choice label="From" value={from} onChange={setFrom} options={Object.keys(WEIGHT).map((u) => [u, u])} />
      </div>
      <Outputs rows={Object.keys(WEIGHT).map((u) => [u, `${fmtNum(convert(n, from, u, WEIGHT), 2)} ${u}`])} />
      {weightClass(gsm) && <p className="cv-note">{weightClass(gsm)}</p>}
    </div>
  );
}

/* ---------- colour ---------- */
function ColourTool() {
  const [rgb, setRgb] = useState({ r: 230, g: 98, b: 57 });
  const [done, copy] = useCopy();
  const hsl = rgbToHsl(rgb); const cmyk = rgbToCmyk(rgb); const hex = rgbToHex(rgb);
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(parseFloat(v) || 0)));
  const setRgbKey = (k) => (t) => setRgb((c) => ({ ...c, [k]: clamp(t, 255) }));
  const setHslKey = (k, max) => (t) => setRgb(hslToRgb({ ...hsl, [k]: clamp(t, max) }));
  const setCmykKey = (k) => (t) => setRgb(cmykToRgb({ ...cmyk, [k]: clamp(t, 100) }));
  const css = [['HEX', hex], ['RGB', `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`], ['HSL', `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`], ['CMYK', `${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}`]];
  return (
    <div className="cv-tool">
      <ToolHead title="Colour" body="Move a colour between screen and print values. Type into any box, or pick a colour, and the rest update." badge="Instant" />
      <div className="cv-colour">
        <label className="cv-swatch" style={{ background: hex }} aria-label="Pick a colour">
          <input type="color" value={hex.toLowerCase()} onChange={(e) => setRgb(hexToRgb(e.target.value))} />
        </label>
        <div className="cv-colour-fields">
          <div className="cv-row"><Field label="HEX" mono w="130px" value={hex} onCommit={(t) => { const c = hexToRgb(t); if (c) setRgb(c); }} /></div>
          <div className="cv-row">
            <Field label="R" w="86px" value={rgb.r} onCommit={setRgbKey('r')} /><Field label="G" w="86px" value={rgb.g} onCommit={setRgbKey('g')} /><Field label="B" w="86px" value={rgb.b} onCommit={setRgbKey('b')} />
          </div>
          <div className="cv-row">
            <Field label="H" w="86px" value={hsl.h} suffix="°" onCommit={setHslKey('h', 360)} /><Field label="S" w="86px" value={hsl.s} suffix="%" onCommit={setHslKey('s', 100)} /><Field label="L" w="86px" value={hsl.l} suffix="%" onCommit={setHslKey('l', 100)} />
          </div>
          <div className="cv-row">
            <Field label="C" w="76px" value={cmyk.c} onCommit={setCmykKey('c')} /><Field label="M" w="76px" value={cmyk.m} onCommit={setCmykKey('m')} /><Field label="Y" w="76px" value={cmyk.y} onCommit={setCmykKey('y')} /><Field label="K" w="76px" value={cmyk.k} onCommit={setCmykKey('k')} />
          </div>
        </div>
      </div>
      <div className="cv-grid-out">
        {css.map(([l, val]) => (
          <button key={l} className="cv-out" data-no-spin onClick={() => copy(val, l)}><small>{l}</small><strong className="mono">{val}</strong><span>{done === l ? <Check size={14} /> : <Copy size={14} />}</span></button>
        ))}
      </div>
      <p className="cv-note">CMYK here is a mathematical estimate. For dyeing or print, match against your printer's profile or a physical swatch.</p>
    </div>
  );
}

/* ---------- sizes ---------- */
function SizeTool() {
  const [kind, setKind] = useState('women');
  const table = kind === 'women' ? WOMEN : MEN;
  const systems = kind === 'women' ? ['US', 'UK', 'EU', 'IT', 'FR', 'AU', 'Letter'] : ['US', 'UK', 'EU', 'Letter'];
  const [sys, setSys] = useState('US'); const [val, setVal] = useState('');
  useEffect(() => { setSys('US'); setVal(''); }, [kind]);
  const options = useMemo(() => table.map((r) => String(r[sys])), [table, sys]);
  const row = table.find((r) => String(r[sys]) === val);
  const cols = kind === 'women' ? ['US', 'UK', 'EU', 'IT', 'FR', 'AU', 'Letter', 'bust', 'waist', 'hip'] : ['Letter', 'US', 'UK', 'EU', 'chestCm'];
  const head = { bust: 'Bust cm', waist: 'Waist cm', hip: 'Hip cm', chestCm: 'Chest cm' };
  return (
    <div className="cv-tool">
      <ToolHead title="Clothing sizes" body="Find the matching size in another system, with typical body measurements. Always check the brand's own chart before cutting or ordering." badge="Instant" />
      <div className="cv-opts">
        <Choice label="Garment" value={kind} onChange={setKind} options={[['women', "Women's dresses and tops"], ['men', "Men's tops and jackets"]]} />
        <Choice label="I have a size in" value={sys} onChange={(s) => { setSys(s); setVal(''); }} options={systems.map((s) => [s, s === 'Letter' ? 'XS to XXL' : s])} />
        <Choice label="Size" value={val} onChange={setVal} options={[['', 'Choose…'], ...options.map((o) => [o, o])]} />
      </div>
      <div className="cv-table-wrap">
        <table className="cv-table">
          <thead><tr>{cols.map((c) => <th key={c}>{head[c] || c}</th>)}</tr></thead>
          <tbody>{table.map((r) => (
            <tr key={r.US} className={row === r ? 'on' : ''} onClick={() => setVal(String(r[sys]))}>{cols.map((c) => <td key={c}>{r[c]}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
      <p className="cv-note">Typical values only. Sizing differs between brands and markets, and African tailoring is usually cut from personal measurements.</p>
    </div>
  );
}

/* ---------- page ---------- */
const SECTIONS = {
  image: { tools: [
    { id: 'img-svg', label: 'Image to SVG', sub: 'PNG, JPG, WebP', icon: Spline, C: ImageToSvg },
    { id: 'svg-png', label: 'SVG to PNG', sub: 'Also JPG, WebP', icon: ImageIcon, C: SvgToPng },
    { id: 'formats', label: 'Formats and sizes', sub: 'PNG, JPG, WebP, resize', icon: FileImage, C: ImageFormats },
    { id: 'pdf', label: 'Images to PDF', sub: 'Lookbooks, line sheets', icon: FileText, C: ImageToPdf },
  ] },
  units: { tools: [
    { id: 'length', label: 'Measurements', sub: 'cm, in, yd, ft, m', icon: Ruler, C: LengthTool },
    { id: 'qty', label: 'Fabric quantity', sub: 'Yards, metres, price', icon: Scissors, C: FabricQty },
    { id: 'weight', label: 'Fabric weight', sub: 'GSM, oz/yd², momme', icon: Scale, C: WeightTool },
  ] },
  style: { tools: [
    { id: 'colour', label: 'Colour', sub: 'HEX, RGB, HSL, CMYK', icon: Palette, C: ColourTool },
    { id: 'sizes', label: 'Clothing sizes', sub: 'US, UK, EU, IT, FR', icon: Shirt, C: SizeTool },
  ] },
};

export default function Converter({ section = 'image' }) {
  const tools = (SECTIONS[section] || SECTIONS.image).tools;
  const [id, setId] = useState(tools[0].id);
  useEffect(() => { setId(tools[0].id); }, [section]);
  const active = tools.find((t) => t.id === id) || tools[0];
  const Active = active.C;
  return (
    <div className="cv">
      <nav className="cv-list" aria-label="Converters">
        {tools.map((t) => (
          <button key={t.id} data-no-spin className={t.id === active.id ? 'on' : ''} aria-current={t.id === active.id ? 'true' : undefined} onClick={() => setId(t.id)}>
            <span className="cv-list-ico"><t.icon size={17} /></span>
            <span><strong>{t.label}</strong><small>{t.sub}</small></span>
          </button>
        ))}
      </nav>
      <section className="cv-main" key={active.id}><Active /></section>
    </div>
  );
}
