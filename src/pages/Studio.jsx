import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, Check, ArrowRight, RotateCcw, Sparkles, Wand2, Shirt, Palette, FileText, Download } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { Segmented } from '../components/ui.jsx';


const LININGS=[{value:'none',label:'None'},{value:'partial',label:'Partial'},{value:'full',label:'Full'}];
const MAX_NOTES=500;
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;

function usePreview(file){
  const [url,setUrl]=useState('');
  useEffect(()=>{if(!file){setUrl('');return} const u=URL.createObjectURL(file);setUrl(u);return()=>URL.revokeObjectURL(u)},[file]);
  return url;
}
function Dropzone({file,preview,onFile,big,title,hint,scanning}){
  const input=useRef(null); const [drag,setDrag]=useState(false);
  const take=f=>{if(f&&f.type.startsWith('image/'))onFile(f)};
  return <div className={`dz ${big?'dz-big':'dz-small'} ${drag?'drag':''} ${file?'has':''} ${scanning?'scanning':''}`}
    role="button" tabIndex={0} aria-label={title} onClick={()=>input.current?.click()}
    onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.current?.click()}}}
    onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
    onDrop={e=>{e.preventDefault();setDrag(false);take(e.dataTransfer.files?.[0])}}>
    {file?<><img src={preview} alt="" className="dz-img"/>{scanning&&<span className="scan"/>}
      <div className="dz-meta"><strong>{file.name}</strong><small>{(file.size/1024/1024).toFixed(1)} MB</small></div>
      <button type="button" className="dz-x" onClick={e=>{e.stopPropagation();onFile(null);if(input.current)input.current.value=''}}><X size={16}/></button>
    </>:<div className="dz-empty"><span className="dz-ico"><ImagePlus size={big?26:20}/></span><strong>{title}</strong><small>{hint}</small></div>}
    <input ref={input} type="file" accept="image/*" hidden onChange={e=>take(e.target.files?.[0])}/>
  </div>
}

function PatternStudio({onDone,setPage}){
  const toast=useToast(),[file,setFile]=useState(null),[swatch,setSwatch]=useState(null),
  [lining,setLining]=useState('none'),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[secs,setSecs]=useState(0),
  [error,setError]=useState(''),[result,setResult]=useState(null);
  const photo=usePreview(file),fabric=usePreview(swatch);
  useEffect(()=>{if(!busy){setSecs(0);return}const id=setInterval(()=>setSecs(s=>s+1),1000);return()=>clearInterval(id)},[busy]);
  const reset=()=>{setFile(null);setSwatch(null);setNotes('');setLining('none');setResult(null);setError('')};
  const submit=async e=>{e.preventDefault();if(!file)return setError('Add a garment photo to continue.');if(file.size>10*1024*1024)return setError('That photo is over 10 MB.');
    setBusy(true);setError('');try{const fd=new FormData();fd.append('file',file);if(swatch)fd.append('swatch',swatch);fd.append('notes',notes);fd.append('lining',lining);
      const d=await api('/api/workspace/patterns',{method:'POST',body:fd});setResult(d);onDone(d);toast.success('Pattern generation started.')}catch(err){setError(err.message)}finally{setBusy(false)}};
  if(result)return <section className="panel done"><svg className="check-anim" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" pathLength="1"/><path d="M15 27.5l7.5 7.5L37.5 19" pathLength="1"/></svg>
    <h2>Generation started</h2><p className="muted">AI is identifying the garment type and constructing mathematical 2D pattern geometry from your photo. The final PNG/SVG boundaries are rendered from numeric geometry.</p>
    <p className="muted small-text">Job ID <code>{result.id||result.job_id}</code></p>
    <div className="done-actions"><button className="btn btn-primary" onClick={()=>setPage('projects')}>View in Projects <ArrowRight size={16}/></button><button className="btn btn-ghost" onClick={reset}><RotateCcw size={16}/> Start another</button></div>
  </section>;
  return <div className="cols studio"><form className="panel composer" onSubmit={submit}>
    <div className="step"><div className="step-head"><h3>Garment photo</h3><span>Front-facing JPG, PNG or WebP, up to 10 MB</span></div>
      <Dropzone big file={file} preview={photo} onFile={f=>{setFile(f);setError('')}} title="Drop a garment photo here" hint="or click to browse" scanning={busy}/></div>
    <div className="step"><div className="step-head"><h3>Fabric reference <em>optional</em></h3><span>A close-up improves motif fidelity</span></div>
      <Dropzone file={swatch} preview={fabric} onFile={setSwatch} title="Add a fabric close-up" hint="Drop or click"/></div>
    <div className="step"><div className="step-head"><h3>AI garment analysis</h3><span>FabricNow AI automatically identifies the garment and African style family from the photo.</span></div>
      <div className="notice"><strong>No garment type selection required.</strong><br/>Claude is preferred for construction and geometry analysis when configured. OpenAI vision is the fallback. The AI determines the garment type, piece breakdown, proportions and numeric 2D geometry independently for each photo.</div></div>
    <div className="step"><div className="step-head"><h3>Lining</h3><span>Optional construction instruction</span></div><Segmented label="Lining" options={LININGS} value={lining} onChange={setLining}/></div>
    <div className="step"><div className="step-head"><h3>Designer notes <em>optional</em></h3><span>{notes.length}/{MAX_NOTES}</span></div>
      <textarea className="notes" rows={4} maxLength={MAX_NOTES} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional: construction details, fit notes, special panels, cultural/style details"/></div>
    {error&&<div className="error">{error}</div>}
    <div className="composer-bar"><p>{file?`AI will identify the garment${lining!=='none'?`, ${lining} lining`:''}${swatch?', fabric reference added':''}`:'Add a garment photo to begin'}</p>
      <button className="btn btn-primary btn-lg" disabled={busy||!file}><Sparkles size={16}/> {busy?'Generating…':'Generate'}</button></div>
  </form>
  <aside className={`brief ${busy?'busy':''}`}><div className="brief-head"><span>AI pattern brief</span><span className={`ready ${file?'on':''}`}>{busy?'Working':file?'Ready':'Waiting'}</span></div>
    <div className="brief-photo">{photo?<img src={photo} alt="Garment preview"/>:<img src="/logo-icon.svg" alt="" className="float"/>}{busy&&<span className="scan"/>}</div>
    <dl className="brief-list"><div><dt>Garment</dt><dd>AI decides</dd></div><div><dt>Scope</dt><dd>Africa</dd></div><div><dt>Geometry</dt><dd>Numeric 2D</dd></div><div><dt>Fabric</dt><dd>{swatch?'Reference added':'AI will inspect photo'}</dd></div></dl>
    <p className="brief-foot-text">Each photo is analyzed independently. The AI returns numeric piece geometry; FabricNow renders the final SVG/PNG deterministically and records the analysis in <code>manifest.json</code>.</p>
  </aside></div>;
}

function AIGenerator(){
  const toast=useToast(),[mode,setMode]=useState('african-garment'),[file,setFile]=useState(null),[prompt,setPrompt]=useState(''),
  [busy,setBusy]=useState(false),[error,setError]=useState(''),[image,setImage]=useState('');
  const preview=usePreview(file);
  const generate=async()=>{if(!prompt.trim())return setError('Describe what you want the AI to create.');setBusy(true);setError('');
    try{const fd=new FormData();fd.append('prompt',prompt);fd.append('mode',mode);if(file)fd.append('file',file);
      const d=await api('/api/workspace/ai/generate-image',{method:'POST',body:fd});setImage(`data:image/png;base64,${d.image_base64}`);toast.success('AI design generated.')}catch(e){setError(e.message)}finally{setBusy(false)}};
  const modes=[['african-garment','African Garment',Shirt],['fabric-print','Fabric / Print',Palette],['colorways','Colorways',Wand2],['mockup','Model Mockup',Sparkles],['technical-flat','Technical Flat',Shirt],['lookbook','Lookbook',Sparkles],['aso-ebi','Aso-Ebi Set',Palette],['cutting-layout','Cutting Layout',FileText]];
  return <div className="cols studio"><section className="panel composer">
    <div className="step"><div className="step-head"><h3>What should FabricNow generate?</h3><span>Designed for African fashion and textile workflows</span></div>
      <div className="chips">{modes.map(([id,label,I])=><button type="button" className={`chip ${mode===id?'on':''}`} key={id} onClick={()=>setMode(id)}><I size={14}/>{label}</button>)}</div></div>
    <div className="step"><div className="step-head"><h3>Reference image <em>optional</em></h3></div><Dropzone file={file} preview={preview} onFile={setFile} title="Add a reference" hint="Use a garment or fabric image"/></div>
    <div className="step"><div className="step-head"><h3>AI brief</h3></div><textarea className="notes" rows={7} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={mode==='fabric-print'?'Example: indigo Adire-inspired geometric repeat, deep blue and ivory, hand-dyed texture…':mode==='cutting-layout'?'Example: arrange front bodice, back bodice, sleeve and skirt pieces on 60-inch fabric…':'Example: modern African Kaba and Slit with structured peplum, three-quarter sleeves, elegant Ankara placement…'}/></div>
    {error&&<div className="error">{error}</div>}<button className="btn btn-primary btn-lg" onClick={generate} disabled={busy}><Wand2 size={16}/>{busy?'Generating…':'Generate design'}</button>
  </section><aside className="brief"><div className="brief-head"><span>AI output</span><span className={`ready ${image?'on':''}`}>{busy?'Generating':image?'Ready':'Waiting'}</span></div>
    <div className="brief-photo ai-output">{image?<img src={image} alt="Generated design"/>:<Sparkles size={34}/>}</div>
    {image&&<a className="btn btn-ghost" href={image} download="fabricnow-ai-design.png"><Download size={15}/> Save image</a>}
  </aside></div>;
}

function ListingWriter(){
  const toast=useToast(),[form,setForm]=useState({garment:'',fabric:'',style:'',notes:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[out,setOut]=useState(null);
  const run=async()=>{setBusy(true);setError('');try{const fd=new FormData();Object.entries(form).forEach(([k,v])=>fd.append(k,v));setOut(await api('/api/workspace/ai/listing',{method:'POST',body:fd}));toast.success('Listing generated.')}catch(e){setError(e.message)}finally{setBusy(false)}};
  return <div className="panel composer"><div className="step-head"><h3>AI product listing</h3><span>Generate consistent metadata for FabricNow digital products</span></div>
    <div className="cols"><div>{['garment','fabric','style'].map(k=><label className="field" key={k}>{cap(k)}<input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
      <label className="field">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button className="btn btn-primary" onClick={run} disabled={busy}><FileText size={15}/>{busy?'Writing…':'Generate listing'}</button></div>
      <div className="notice" style={{minHeight:280}}>{out?<><h3>{out.title}</h3><p>{out.description||out.short_description}</p><p><strong>Category:</strong> {out.category}</p><p><strong>Style:</strong> {out.style}</p><p><strong>Fabric:</strong> {out.fabric}</p><p><strong>Tags:</strong> {(out.tags||[]).join(', ')}</p></>:error?<span className="error">{error}</span>:<span>Your generated title, description, category, style, fabric and SEO fields will appear here.</span>}</div></div>
  </div>;
}

export default function Studio({onDone,setPage}){
  const [tool,setTool]=useState('patterns');
  return <div><div className="studio-tabs">
    <button className={tool==='patterns'?'active':''} onClick={()=>setTool('patterns')}><Shirt size={16}/> Pattern Extraction</button>
    <button className={tool==='generate'?'active':''} onClick={()=>setTool('generate')}><Wand2 size={16}/> AI Design Studio</button>
    <button className={tool==='listing'?'active':''} onClick={()=>setTool('listing')}><FileText size={16}/> Product Listing AI</button>
  </div>
  {tool==='patterns'?<PatternStudio onDone={onDone} setPage={setPage}/>:tool==='generate'?<AIGenerator/>:<ListingWriter/>}</div>
}
