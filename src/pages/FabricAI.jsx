import React, { useRef, useState } from 'react';
import { Sparkles, ImagePlus, RefreshCw, Upload } from 'lucide-react';
import { api } from '../api.js';
import { compressImage, extractPalette, squareSwatch } from '../imageTools.js';
import { Spinner } from '../components/ui.jsx';
import { Modal } from '../components/kit.jsx';
import './fabric-ai.css';

const EMPTY = { name: '', supplier: '', composition: '', weightGsm: '', widthCm: '', color: '', pattern: '', origin: '', notes: '' };
const parseAiFabric = (payload) => {
  const candidate = payload?.fabric ?? payload?.data?.fabric ?? payload?.result?.fabric ?? payload?.result ?? payload?.data ?? payload;
  return candidate && typeof candidate === 'object' ? candidate : {};
};

/* "Add from photo": the AI reads a photo of a fabric and fills in a library record. Everything it fills in can be edited. */
export default function FabricFromPhoto({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('pick'); // pick | reading | review
  const [form, setForm] = useState(EMPTY);
  const [swatch, setSwatch] = useState('');      // the image saved with the fabric
  const [crop, setCrop] = useState('');          // square crop of the user's own photo
  const [source, setSource] = useState('');      // photo sent to the AI
  const [palette, setPalette] = useState([]);
  const [meta, setMeta] = useState({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  const reset = () => { setStage('pick'); setForm(EMPTY); setSwatch(''); setCrop(''); setSource(''); setPalette([]); setMeta({}); setNotice(''); setError(''); setCleaning(false); };
  const close = () => { setOpen(false); setTimeout(reset, 200); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleFile = async (file) => {
    if (!file) return;
    reset(); setOpen(true); setStage('reading');
    try {
      const big = (await compressImage(file, 1024, 0.82)).src, sq = await squareSwatch(big, 480), pal = await extractPalette(big, 5);
      setSource(big); setCrop(sq); setSwatch(sq); setPalette(pal);
      try {
        const payload = await api('/api/workspace-suite/fabrics/ai-analyze', { method: 'POST', body: JSON.stringify({ imageDataUrl: big }) });
        const fabric = parseAiFabric(payload);
        if (!fabric || Object.keys(fabric).length === 0) {
          setNotice('The AI returned an unreadable result. Please try again, or fill in the details yourself.');
        } else {
          setForm({ ...EMPTY, name: fabric.name || '', color: fabric.color || '', pattern: fabric.pattern || '', composition: fabric.composition || '', origin: fabric.origin || '',
            weightGsm: fabric.weightGsm ?? '', widthCm: fabric.widthCm ?? '', notes: fabric.notes || '' });
          if (fabric.palette?.length) setPalette(fabric.palette);
          setMeta({ ai: true, suggestedUses: fabric.suggestedUses || [], repeatCm: fabric.repeatCm });
          setNotice('The AI filled these in from your photo. They are estimates, so check them before you rely on them.');
        }
      } catch (e) {
        const msg = e && e.message ? e.message : 'The AI could not read that fabric photo.';
        setNotice(`${msg} Please try again, or fill in the details yourself.`);
      }
      setStage('review');
    } catch (e) { setError(e.message); setStage('pick'); }
  };
  const cleanUp = async () => {
    if (!source || cleaning) return;
    setCleaning(true); setError('');
    try {
      const r = await api('/api/workspace-suite/fabrics/ai-swatch', { method: 'POST', body: JSON.stringify({ imageDataUrl: source }) });
      if (r.dataUrl) setSwatch(await squareSwatch(r.dataUrl, 480)); else setError(r.warning || 'The AI could not make a swatch this time.');
    } catch (e) { setError(e.message); } finally { setCleaning(false); }
  };
  const save = async () => {
    if (stage !== 'review') return setError('Choose a photo first.');
    if (!form.name.trim()) return setError('Give the fabric a name.');
    setSaving(true); setError('');
    try {
      const body = { ...form, weightGsm: Number(form.weightGsm) || undefined, widthCm: Number(form.widthCm) || undefined, imageUrl: swatch || undefined,
        meta: { ...meta, palette, swatch: swatch === crop ? 'photo' : 'ai' } };
      await api('/api/workspace-suite/fabrics', { method: 'POST', body: JSON.stringify(body) });
      onSaved?.(form.name.trim()); close();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleFile(f); }} />
      <button type="button" className="btn btn-ghost fai-btn" onClick={() => fileRef.current?.click()}><Sparkles size={15} /> Add from photo</button>
      <Modal open={open} onClose={close} kicker="MATERIALS · AI" title="Add a fabric from a photo" icon={Sparkles} size="lg" onSubmit={save} busy={saving}
        submitLabel="Add to library" description="Take or choose a photo of the fabric. The AI reads it and fills in the record for you."
        footnote="AI details are estimates." error={error}>
        {stage === 'pick' && (
          <div className={`fai-drop${over ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files?.[0]); }}>
            <ImagePlus size={28} /><b>Drop a fabric photo here</b><small>Lay the fabric flat in good light and fill the frame for the best result.</small>
            <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Choose a photo</button>
          </div>
        )}
        {stage === 'reading' && <div className="fai-reading" role="status" aria-label="Reading the fabric"><Spinner size={28} /></div>}
        {stage === 'review' && (
          <div className="fai-review">
            <div className="fai-visual">
              <div className="fai-swatch" style={{ backgroundImage: `url(${swatch})` }} role="img" aria-label="Fabric swatch" />
              {palette.length > 0 && <div className="fai-palette" aria-label="Colours found">{palette.map((c) => <span key={c} style={{ background: c }} title={c} />)}</div>}
              <div className="fai-visual-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={cleanUp} disabled={cleaning} data-no-spin>{cleaning ? <Spinner size={14} /> : <><Sparkles size={14} /> Clean up with AI</>}</button>
                {swatch !== crop && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSwatch(crop)}><RefreshCw size={14} /> Use my photo</button>}
              </div>
              <small className="fai-note">“Clean up” redraws the fabric flat and square. It may change small details, so compare it with your photo.</small>
            </div>
            <div className="fai-form">
              {notice && <p className="fai-notice">{notice}</p>}
              <label className="wide"><span>Fabric name</span><input value={form.name} onChange={set('name')} placeholder="e.g. Indigo adire cotton" maxLength={80} /></label>
              <label><span>Colour</span><input value={form.color} onChange={set('color')} /></label>
              <label><span>Pattern</span><input value={form.pattern} onChange={set('pattern')} placeholder="Adire, Kente, Ankara…" /></label>
              <label><span>Composition</span><input value={form.composition} onChange={set('composition')} placeholder="e.g. 100% cotton" /></label>
              <label><span>Origin</span><input value={form.origin} onChange={set('origin')} /></label>
              <label><span>Weight (gsm)</span><input type="number" min="0" value={form.weightGsm} onChange={set('weightGsm')} /></label>
              <label><span>Width (cm)</span><input type="number" min="0" value={form.widthCm} onChange={set('widthCm')} /></label>
              <label className="wide"><span>Supplier</span><input value={form.supplier} onChange={set('supplier')} placeholder="Where you buy it" /></label>
              <label className="wide"><span>Notes</span><textarea rows={3} value={form.notes} onChange={set('notes')} /></label>
              {meta.suggestedUses?.length > 0 && <div className="wide fai-uses"><span>Good for</span>{meta.suggestedUses.map((u) => <i key={u}>{u}</i>)}</div>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
