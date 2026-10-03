import React,{useEffect,useMemo,useRef,useState} from 'react';
import {api,API,downloadFile} from '../api.js';
import {useToast} from '../toast.jsx';
import {Bot,Check,CheckCircle2,ChevronDown,Circle,Copy,Crosshair,Download,Eye,EyeOff,FlipHorizontal,Hand,Image as ImageIcon,Layers3,LayoutGrid,ListOrdered,Magnet,Minus,Move,PenTool,Plus,Redo2,Ruler,Save,Scissors,Shapes,SlidersHorizontal,Sparkles,Square,SquareDashed,Trash2,Undo2,Upload,Wand2,ZoomIn,ZoomOut} from 'lucide-react';
import Board from './tailor/Board.jsx';
import {BOARD_W,BOARD_H,uid,clamp,toUnit,fromUnit,num,fmt,isLine,lineLen,bbox,shift,mirrorOp} from './tailor/geometry.js';
import {BLOCKS,STARTERS,SIZES,DEFAULT_MEAS,MEAS_FIELDS,blockOps,starterOps,mapProjectMeasurements} from './tailor/blocks.js';
import {computeLayout,placedShape,layoutSvg} from './tailor/cutting.js';
import './tailor-tools.css';

const TOOLS=[
 ['select','Select','V',Hand,'Click to select · drag to move · drag corner dots to reshape'],
 ['piece','Rectangle piece','P',Square,'Drag to draw a rectangular pattern piece'],
 ['trace','Trace outline','O',PenTool,'Click around the shape · click the first dot, double-click or Enter to close · Backspace undoes a point'],
 ['seam','Seam','S',Minus,'Drag to draw a seam line'],
 ['dart','Dart','D',ChevronDown,'Drag from the dart point down to the dart base'],
 ['notch','Notch','N',Circle,'Click to place a notch'],
 ['grainline','Grainline','G',Move,'Drag to draw a grainline'],
 ['stitch','Stitch','T',Scissors,'Drag to draw a stitch line'],
 ['measure','Measure','M',Ruler,'Drag to measure a distance'],
 ['annotation','Note','A',Layers3,'Click to add a note'],
 ['photo','Move photo','',Hand,'Drag to move the photo underlay',true],
 ['calibrate','Set photo scale','',Crosshair,'Drag a line over something you know the real length of',true]
];
const TABS=[['ai','AI Tailor',Bot],['inspect','Inspector',SlidersHorizontal],['blocks','Blocks',Shapes],['photo','Photo',ImageIcon],['cut','Cutting',LayoutGrid],['sew','Sewing',ListOrdered],['check','Checklist',CheckCircle2]];
const CHECKS=['Grainline is defined','Seam allowances are checked','Notches match joining pieces','Measurements are verified','Stitch order is documented'];
const FABRIC_PRESETS=[90,112,140,150];
const SCALE_NOTE='1 board unit = 1 cm; origin top-left; x right, y down; board is 140 x 180 cm.';

const isGood=o=>{
 const f=(...k)=>k.every(x=>Number.isFinite(Number(o[x])));
 if(!o||typeof o!=='object')return false;
 if(o.type==='piece')return Array.isArray(o.points)&&o.points.length>=3&&o.points.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
 if(['notch','annotation'].includes(o.type))return f('x','y');
 if(o.type==='dart')return f('x','y','x2','y2');
 return f('x1','y1','x2','y2');
};
function cleanOps(list){
 return (list||[]).map(o=>({...o,type:o.type==='line'?'seam':o.type})).filter(isGood).map(o=>{
  const r={...o,id:uid()};
  if(r.type==='piece'){r.points=r.points.map(p=>[clamp(+p[0],0,BOARD_W),clamp(+p[1],0,BOARD_H)]);Object.assign(r,bbox(r.points));r.name=r.name||'AI piece';r.cut=r.cut||1;r.allowance=r.allowance??1}
  else ['x','x1','x2'].forEach(k=>{if(r[k]!==undefined)r[k]=clamp(+r[k],0,BOARD_W)});
  ['y','y1','y2'].forEach(k=>{if(r[k]!==undefined)r[k]=clamp(+r[k],0,BOARD_H)});
  return r;
 });
}
async function compressImage(file,max=1200,q=.78){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Could not read that image.'));i.src=url});
  const k=Math.min(1,max/Math.max(img.width,img.height)),w=Math.round(img.width*k),h=Math.round(img.height*k);
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
  return {src:c.toDataURL('image/jpeg',q),aspect:w/h};
 }finally{URL.revokeObjectURL(url)}
}
const stripGroup=(ops,id)=>ops.filter(o=>o.id!==id&&o.parent!==id);

export default function TailorTools(){
 const toast=useToast();
 const [boards,setBoards]=useState([]),[board,setBoard]=useState(null),[ops,setOps]=useState([]),[tool,setTool]=useState('select'),[selected,setSelected]=useState(null),[projects,setProjects]=useState([]),[projectId,setProjectId]=useState(''),[ai,setAi]=useState(null),[request,setRequest]=useState('Check the construction, seam placement, allowances and stitch sequence for this pattern.'),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[unit,setUnit]=useState('cm'),[zoom,setZoom]=useState(100),[tab,setTab]=useState('blocks'),[checked,setChecked]=useState([]),[snap,setSnap]=useState(true),[showSA,setShowSA]=useState(true),[hist,setHist]=useState({past:[],future:[]});
 const [meas,setMeas]=useState(DEFAULT_MEAS),[photo,setPhoto]=useState(null),[fab,setFab]=useState({w:150,allow:true,rotate:false,extra:5}),[stitch,setStitch]=useState(null),[sewDone,setSewDone]=useState([]),[cutAi,setCutAi]=useState(null),[busyKind,setBusyKind]=useState('');
 const opsRef=useRef(ops),histRef=useRef(hist),cursorRef=useRef(null),areaRef=useRef(null),fileRef=useRef(null);
 opsRef.current=ops;histRef.current=hist;

 const applyBoard=b=>{
  setBoard(b);setOps(Array.isArray(b?.operations)?b.operations:[]);setUnit(b?.unit||'cm');setProjectId(b?.projectId||'');
  const ph=b?.layers?.find(l=>l.type==='photo'),me=b?.layers?.find(l=>l.type==='measurements');
  setPhoto(ph&&ph.src?{...ph}:null);setMeas({...DEFAULT_MEAS,...(me?.values||{})});
  setSelected(null);setAi(null);setStitch(null);setCutAi(null);setHist({past:[],future:[]});
 };
 useEffect(()=>{Promise.allSettled([api('/api/tailor-tools/boards'),api('/api/workspace-suite/projects?limit=50')]).then(([b,p])=>{if(b.status==='fulfilled'){setBoards(b.value.boards||[]);if(b.value.boards?.[0])applyBoard(b.value.boards[0])}if(p.status==='fulfilled')setProjects(p.value.projects||[])})},[]);
 useEffect(()=>{const el=areaRef.current;const h=e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();setZoom(z=>clamp(z+(e.deltaY<0?8:-8),50,300))};el.addEventListener('wheel',h,{passive:false});return()=>el.removeEventListener('wheel',h)},[]);

 /* history */
 const push=()=>setHist(h=>({past:[...h.past.slice(-59),opsRef.current],future:[]}));
 const commit=next=>{push();setOps(next)};
 const undo=()=>{const h=histRef.current;if(!h.past.length)return;setHist({past:h.past.slice(0,-1),future:[opsRef.current,...h.future]});setOps(h.past[h.past.length-1]);setSelected(null)};
 const redo=()=>{const h=histRef.current;if(!h.future.length)return;setHist({past:[...h.past,opsRef.current],future:h.future.slice(1)});setOps(h.future[0]);setSelected(null)};
 const selectedOp=ops.find(o=>o.id===selected);
 const patch=p=>setOps(os=>os.map(o=>o.id===selected?{...o,...p}:o));
 const removeSelected=()=>{if(!selected)return;commit(stripGroup(ops,selected));setSelected(null)};
 const group=id=>ops.filter(o=>o.id===id||o.parent===id);
 const duplicate=()=>{
  if(!selectedOp)return;const nid=uid();
  const copies=group(selected).map(o=>({...shift(o,5,5),id:o.id===selected?nid:uid(),parent:o.parent?nid:undefined}));
  commit([...ops,...copies]);setSelected(nid);
 };
 const mirror=()=>{
  if(selectedOp?.type!=='piece')return toast.info('Select a pattern piece to mirror.');
  if(selectedOp.fold)return toast.info('This piece is cut on the fold, so it is already symmetrical. Use Mirror for left/right pairs.');
  const b=bbox(selectedOp.points),cx=b.x+b.w/2,sx=b.x+2*b.w+6<=BOARD_W?b.w+6:-(b.w+6),nid=uid();
  const copies=group(selected).map(o=>{const m=mirrorOp(o,cx,sx);return {...m,id:o.id===selected?nid:uid(),parent:o.parent?nid:undefined,...(o.id===selected?{name:`${o.name} (mirror)`}:{})}});
  copies[0]=Object.assign(copies[0],bbox(copies[0].points));
  commit([...ops,...copies]);setSelected(nid);
 };
 const nudge=(dx,dy)=>commit(ops.map(o=>(o.id===selected||o.parent===selected)?shift(o,dx,dy):o));

 useEffect(()=>{
  const k=e=>{
   if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
   const key=e.key.toLowerCase();
   if(tool==='trace'&&['enter','escape','backspace'].includes(key))return;
   if(e.metaKey||e.ctrlKey){if(key==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(key==='y'){e.preventDefault();redo()}else if(key==='d'){e.preventDefault();duplicate()}return}
   if(key==='escape'){setSelected(null);setTool('select');return}
   if((key==='delete'||key==='backspace')&&selected){e.preventDefault();removeSelected();return}
   if(selected&&key.startsWith('arrow')){e.preventDefault();const s=e.shiftKey?5:1;nudge(key==='arrowleft'?-s:key==='arrowright'?s:0,key==='arrowup'?-s:key==='arrowdown'?s:0);return}
   const t=TOOLS.find(x=>x[2]&&x[2].toLowerCase()===key);if(t)setTool(t[0]);
  };
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);
 });

 /* boards */
 const create=async()=>{try{const d=await api('/api/tailor-tools/boards',{method:'POST',body:JSON.stringify({name:'Tailor Board',projectId:projectId||null,unit})});setBoards(b=>[d.board,...b]);applyBoard(d.board)}catch(e){toast.error(e.message)}};
 const layersPayload=()=>[...(photo?.src?[{type:'photo',...photo}]:[]),{type:'measurements',values:meas}];
 const save=async()=>{if(!board)return create();setSaving(true);try{const d=await api(`/api/tailor-tools/boards/${board.id}`,{method:'PUT',body:JSON.stringify({operations:ops,layers:layersPayload(),projectId:projectId||board.projectId||null,unit,aiContext:ai||{}})});setBoard(d.board);setBoards(bs=>bs.map(x=>x.id===d.board.id?d.board:x));toast.success('Tailor board saved.')}catch(e){toast.error(e.message)}finally{setSaving(false)}};
 const loadBoard=id=>{const b=boards.find(x=>x.id===id);if(b)applyBoard(b)};

 /* blocks */
 const addOps=res=>{
  if(!res.ops.length)return;
  commit([...opsRef.current,...res.ops]);
  const first=res.ops.find(o=>o.type==='piece');if(first)setSelected(first.id);setTool('select');
  if(res.overflow)toast.info('The board is nearly full, so some pieces were placed on top of others. Drag them apart or clear space.');
 };
 const addStarter=id=>addOps(starterOps(id,meas,opsRef.current));
 const addBlock=id=>addOps(blockOps(id,meas,opsRef.current));
 const setMeasure=(k,v)=>{const n=fromUnit(parseFloat(v),unit);if(Number.isFinite(n)&&n>0)setMeas(m=>({...m,[k]:+n.toFixed(2)}))};
 const useProjectMeas=()=>{const p=projects.find(x=>x.id===projectId);const mapped=mapProjectMeasurements(p?.measurements);const n=Object.keys(mapped).length;if(!n)return toast.info('No bust, waist or hip measurements were found on this project.');setMeas(m=>({...m,...mapped}));toast.info(`Applied ${n} measurement${n>1?'s':''} from the project (values read as cm).`)};

 /* photo */
 const onPhotoFile=async e=>{
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  try{
   const {src,aspect}=await compressImage(f);
   const h=Math.min(130,BOARD_H-20),w=h*aspect,mw=BOARD_W-20,[W,H]=w>mw?[mw,mw/aspect]:[w,h];
   setPhoto({src,x:(BOARD_W-W)/2,y:(BOARD_H-H)/2,w:W,h:H,opacity:.6,visible:true,calibrated:false});setTab('photo');
  }catch(err){toast.error(err.message)}
 };
 const onCalibrate=(a,b)=>{
  const v=parseFloat(window.prompt(`How long is that line in real life? (${unit})`)||'');
  setTool('select');if(!(v>0)||!photo)return;
  const k=fromUnit(v,unit)/Math.hypot(b.x-a.x,b.y-a.y);
  setPhoto(p=>({...p,x:a.x+(p.x-a.x)*k,y:a.y+(p.y-a.y)*k,w:p.w*k,h:p.h*k,calibrated:true}));
 };
 const fitPhoto=()=>setPhoto(p=>{const k=Math.min((BOARD_W-10)/p.w,(BOARD_H-10)/p.h);const w=p.w*k,h=p.h*k;return {...p,w,h,x:(BOARD_W-w)/2,y:(BOARD_H-h)/2,calibrated:false}});

 /* AI */
 const summary=useMemo(()=>ops.filter(o=>o.type==='piece').map(o=>{const b=bbox(o.points);return {name:o.name,cut:o.cut||1,onFold:!!o.fold,widthCm:+b.w.toFixed(1),heightCm:+b.h.toFixed(1),allowanceCm:o.allowance??1,notches:ops.filter(c=>c.parent===o.id&&c.type==='notch').length,darts:ops.filter(c=>c.parent===o.id&&c.type==='dart').length}}),[ops]);
 const currentProject=projects.find(x=>x.id===projectId);
 const ctx=()=>({project:currentProject||null,measurements:currentProject?.measurements||{},fabric:currentProject?.fabric||''});
 const ask=async()=>{setBusy(true);try{const {layers,...rest}=board||{};const d=await api('/api/tailor-tools/ai',{method:'POST',body:JSON.stringify({request,project:currentProject||null,board:{...rest,operations:ops,pieces:summary,scale:SCALE_NOTE,blockMeasurementsCm:meas},measurements:currentProject?.measurements||{},fabric:currentProject?.fabric||''})});setAi(d);setTab('ai')}catch(e){toast.error(e.message)}finally{setBusy(false)}};
 const applySuggestion=s=>{const good=cleanOps(s.operations);if(!good.length)return toast.info('This suggestion has no drawable operations to apply.');commit([...ops,...good])};
 const genStitch=async()=>{setBusyKind('sew');try{const d=await api('/api/tailor-tools/stitch-plan',{method:'POST',body:JSON.stringify({...ctx(),operations:ops,request:`Garment pieces (cm): ${JSON.stringify(summary)}. ${SCALE_NOTE} Give a numbered stitch_plan in a sensible industry sewing order, with seam allowances and finishing notes.`})});setStitch(d);setSewDone([])}catch(e){toast.error(e.message)}finally{setBusyKind('')}};
 const layout=useMemo(()=>computeLayout(ops,{fabricW:fab.w,withAllowance:fab.allow,rotate:fab.rotate}),[ops,fab]);
 const genCutAi=async()=>{setBusyKind('cut');try{const d=await api('/api/tailor-tools/cutting-layout',{method:'POST',body:JSON.stringify({...ctx(),operations:ops,request:`Fabric width ${fab.w} cm. Estimated length ${layout.length.toFixed(0)} cm at ${(layout.efficiency*100).toFixed(0)}% efficiency for pieces ${JSON.stringify(summary)}. ${SCALE_NOTE} Advise on grain, nap, pattern matching, interfacing and cutting order. Do not invent measurements.`})});setCutAi(d)}catch(e){toast.error(e.message)}finally{setBusyKind('')}};
 const downloadLayout=()=>{const url=URL.createObjectURL(new Blob([layoutSvg(layout,board?.name||'Cutting layout')],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='cutting-layout.svg';a.click();URL.revokeObjectURL(url)};
 const toggleCheck=i=>setChecked(c=>c.includes(i)?c.filter(x=>x!==i):[...c,i]);

 const activeTool=TOOLS.find(t=>t[0]===tool);
 const pct=Math.round(checked.length/CHECKS.length*100);
 const sb=selectedOp?.type==='piece'?bbox(selectedOp.points):null;
 const lenM=layout.length*(1+fab.extra/100)/100;
 const empty=ops.length===0&&!photo;

 return <div className="tt-page">
  <header className="tt-hero">
   <div className="tt-hero-copy">
    <span className="tt-eyebrow"><Scissors size={13}/> Tailor Tools</span>
    <h2>Draft the pattern. <span>Build it right.</span></h2>
   </div>
   <div className="tt-actions">
    <button className="btn btn-ghost" onClick={create}><Plus size={15}/> New board</button>
    {board&&<button className="btn btn-ghost" onClick={()=>downloadFile(`${API}/api/tailor-tools/boards/${board.id}/export.svg`,`${(board.name||'tailor-board').replace(/\s+/g,'-')}.svg`)}><Download size={15}/> Export SVG</button>}
    <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Sparkles size={15}/>:<Save size={15}/>} {saving?'Saving…':'Save board'}</button>
   </div>
  </header>

  <div className="tt-workbench">
   <section className="tt-stage">
    <div className="tt-stage-bar">
     <div className="tt-title">
      {boards.length>0
       ?<select className="tt-board-select" value={board?.id||''} onChange={e=>loadBoard(e.target.value)} aria-label="Switch board">{boards.map((b,i)=><option key={b.id} value={b.id}>{b.name||'Tailor board'} · #{boards.length-i}</option>)}</select>
       :<strong>Tailor board</strong>}
      <span className="tt-pill">{currentProject?`Linked · ${currentProject.name}`:'Unsaved draft'}</span>
     </div>
     <div className="tt-stage-ctrl">
      <select value={projectId} onChange={e=>setProjectId(e.target.value)} aria-label="Linked project"><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <div className="tt-seg">{['cm','mm','in'].map(u=><button key={u} className={unit===u?'on':''} onClick={()=>setUnit(u)}>{u}</button>)}</div>
     </div>
    </div>

    <div className="tt-canvas-area" ref={areaRef}>
     <Board ops={ops} tool={tool} setTool={setTool} selected={selected} setSelected={setSelected} zoom={zoom} unit={unit} showSA={showSA} snap={snap} photo={photo} setPhoto={setPhoto} onCommit={commit} onLive={setOps} onBegin={push} onCalibrate={onCalibrate} cursorRef={cursorRef}/>
     <nav className="tt-rail" aria-label="Drawing tools">
      {TOOLS.filter(t=>!t[5]).map(([id,label,key,Icon])=><button key={id} className={tool===id?'active':''} onClick={()=>setTool(id)} aria-label={label}><Icon size={18}/><span className="tt-tip">{label}{key&&<kbd>{key}</kbd>}</span></button>)}
     </nav>
     <div className="tt-actionbar">
      <button onClick={undo} disabled={!hist.past.length} title="Undo (Ctrl+Z)"><Undo2 size={16}/></button>
      <button onClick={redo} disabled={!hist.future.length} title="Redo (Ctrl+Shift+Z)"><Redo2 size={16}/></button>
      <i/>
      <button onClick={duplicate} disabled={!selectedOp} title="Duplicate (Ctrl+D)"><Copy size={16}/></button>
      <button onClick={mirror} disabled={selectedOp?.type!=='piece'} title="Mirror piece (left/right pair)"><FlipHorizontal size={16}/></button>
      <button onClick={removeSelected} disabled={!selectedOp} title="Delete (Del)"><Trash2 size={16}/></button>
      <i/>
      <button className={snap?'on':''} onClick={()=>setSnap(s=>!s)} title="Snap to grid and points"><Magnet size={16}/></button>
      <button className={showSA?'on':''} onClick={()=>setShowSA(s=>!s)} title="Show seam allowance"><SquareDashed size={16}/></button>
      <button className={photo?.visible===false?'':photo?'on':''} disabled={!photo} onClick={()=>setPhoto(p=>({...p,visible:p.visible===false}))} title="Show / hide photo">{photo?.visible===false?<EyeOff size={16}/>:<Eye size={16}/>}</button>
     </div>
     {empty&&<div className="tt-start">
      <h3>Start your pattern</h3>
      <p>Pick a garment to drop in ready-made blocks, or trace one from a photo.</p>
      <div className="tt-start-grid">{STARTERS.map(s=><button key={s.id} onClick={()=>addStarter(s.id)}><Shapes size={16}/>{s.label}</button>)}</div>
      <div className="tt-start-row"><button onClick={()=>fileRef.current?.click()}><Upload size={14}/> Trace from a photo</button><button onClick={()=>setTool('piece')}><Square size={14}/> Draw a piece</button></div>
      <small>Blocks use the measurements in the Blocks tab. Edit them first if you need a different size.</small>
     </div>}
     <div className="tt-zoom"><button onClick={()=>setZoom(z=>clamp(z-15,50,300))} aria-label="Zoom out"><ZoomOut size={15}/></button><b onClick={()=>setZoom(100)} title="Fit to screen">{zoom}%</b><button onClick={()=>setZoom(z=>clamp(z+15,50,300))} aria-label="Zoom in"><ZoomIn size={15}/></button></div>
    </div>

    <div className="tt-status">
     <span><i className="tt-dot"/> {activeTool[1]} · {activeTool[4]}</span>
     <span ref={cursorRef} className="tt-cursor">x – y –</span>
     <button onClick={()=>{commit([]);setSelected(null)}} disabled={!ops.length}><Trash2 size={13}/> Clear board</button>
    </div>
   </section>

   <aside className="tt-side">
    <div className="tt-tabs" role="tablist">
     {TABS.map(([id,l,I])=><button key={id} role="tab" aria-selected={tab===id} title={l} className={tab===id?'on':''} onClick={()=>setTab(id)}><I size={15}/>{tab===id&&<span>{l}</span>}</button>)}
    </div>
    <div className="tt-scroll">

    {tab==='ai'&&<div className="tt-panel">
     <div className="tt-panel-head"><div className="tt-ai-badge"><Sparkles size={15}/></div><div><strong>Ask your AI tailor</strong><small>Reviews construction. You approve every change.</small></div></div>
     <textarea value={request} onChange={e=>setRequest(e.target.value)} rows={4} placeholder="Ask about seam placement, darts, fit, cutting or stitch order…"/>
     <button className="btn btn-primary tt-ai-btn" onClick={ask} disabled={busy}><Wand2 size={15}/>{busy?'Analyzing…':'Analyze pattern'}</button>
     {ai&&<div className="tt-ai-result">
      <div className="tt-confidence"><span>Detected garment</span><b>{ai.garment_type||'Not confirmed'}</b><em>{Math.round((Number(ai.confidence)||0)*100)}%</em><i style={{width:`${Math.round((Number(ai.confidence)||0)*100)}%`}}/></div>
      <p>{ai.summary}</p>
      {ai.warnings?.length>0&&<div className="tt-warnings">{ai.warnings.map((w,i)=><div key={i}>{w}</div>)}</div>}
      {ai.suggestions?.map((s,i)=><div className="tt-suggestion" key={i}><strong>{s.title}</strong><p>{s.reason}</p>{s.operations?.length>0&&<button className="btn btn-ghost btn-sm" onClick={()=>applySuggestion(s)}><Check size={13}/> Apply to board</button>}</div>)}
     </div>}
    </div>}

    {tab==='inspect'&&<div className="tt-panel">
     <div className="tt-panel-head"><div><strong>Selected object</strong><small>{selectedOp?'Edit values below.':'Click an object on the board or in the list.'}</small></div></div>
     {selectedOp?<div className="tt-fields">
      <div className="tt-field"><label>Type</label><b>{selectedOp.type}</b></div>
      {selectedOp.type==='piece'&&<>
       <div className="tt-field"><label>Name</label><input value={selectedOp.name||''} onFocus={push} onChange={e=>patch({name:e.target.value})}/></div>
       <div className="tt-field"><label>Cut qty</label><input type="number" min="1" value={selectedOp.cut||1} onFocus={push} onChange={e=>patch({cut:Math.max(1,parseInt(e.target.value)||1)})}/></div>
       <div className="tt-field"><label>Seam allowance ({unit})</label><input type="number" min="0" step={unit==='mm'?1:.1} value={Number(toUnit(selectedOp.allowance??1,unit).toFixed(2))} onFocus={push} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))patch({allowance:Math.max(0,fromUnit(v,unit))})}}/></div>
       <div className="tt-field"><label>Cut on fold</label><button className={`tt-switch${selectedOp.fold?' on':''}`} onClick={()=>{push();patch({fold:!selectedOp.fold})}} aria-pressed={!!selectedOp.fold}><i/></button></div>
       <div className="tt-field"><label>Size</label><b>{num(sb.w,unit)} × {num(sb.h,unit)} {unit}</b></div>
      </>}
      {selectedOp.type==='dart'&&<>
       <div className="tt-field"><label>Width ({unit})</label><input type="number" min="0" step={unit==='mm'?1:.1} value={Number(toUnit(selectedOp.w||3,unit).toFixed(2))} onFocus={push} onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))patch({w:Math.max(0,fromUnit(v,unit))})}}/></div>
       <div className="tt-field"><label>Length</label><b>{fmt(Math.hypot(selectedOp.x2-selectedOp.x,selectedOp.y2-selectedOp.y),unit)}</b></div>
      </>}
      {isLine(selectedOp)&&<div className="tt-field"><label>Length</label><b>{fmt(lineLen(selectedOp),unit)}</b></div>}
      {selectedOp.type==='annotation'&&<div className="tt-field"><label>Text</label><input value={selectedOp.text||''} onFocus={push} onChange={e=>patch({text:e.target.value.slice(0,120)})}/></div>}
      <button className="btn btn-ghost btn-sm tt-danger" onClick={removeSelected}><Trash2 size={13}/> Delete{selectedOp.type==='piece'?' piece and its marks':''}</button>
     </div>:<div className="tt-empty"><Hand size={22}/><p>Nothing selected</p></div>}
     <div className="tt-objects-head">Objects ({ops.length})</div>
     <div className="tt-objects">{ops.map(o=><button key={o.id} className={`${selected===o.id?'on':''}${o.parent?' child':''}`} onClick={()=>{setSelected(o.id);setTool('select')}}><span className="tt-chip">{o.type}</span>{o.name||o.text||(isLine(o)?fmt(lineLen(o),unit):'')}</button>)}</div>
    </div>}

    {tab==='blocks'&&<div className="tt-panel">
     <div className="tt-panel-head"><div><strong>Pattern blocks</strong><small>Basic blocks sized from the measurements below.</small></div></div>
     <div className="tt-sub">Start a garment</div>
     <div className="tt-cards">{STARTERS.map(s=><button key={s.id} onClick={()=>addStarter(s.id)}><Shapes size={16}/><b>{s.label}</b><small>{s.blocks.length} pieces</small></button>)}</div>
     <div className="tt-sub">Single pieces</div>
     <div className="tt-chips">{BLOCKS.map(b=><button key={b.id} onClick={()=>addBlock(b.id)}><Plus size={12}/>{b.label}</button>)}</div>
     <div className="tt-sub">Measurements ({unit}) <span className="tt-sizes">{Object.keys(SIZES).map(s=><button key={s} onClick={()=>setMeas(m=>({...m,...SIZES[s]}))}>{s}</button>)}</span></div>
     <div className="tt-meas">{MEAS_FIELDS.map(([k,l])=><label key={k}><span>{l}</span><input type="number" step={unit==='mm'?1:.5} value={Number(toUnit(meas[k],unit).toFixed(1))} onChange={e=>setMeasure(k,e.target.value)}/></label>)}</div>
     {projectId&&<button className="btn btn-ghost btn-sm" onClick={useProjectMeas}>Use measurements from linked project</button>}
     <p className="tt-note">These are basic blocks, not a finished fit. Make a toile (test garment) and adjust before cutting good fabric.</p>
    </div>}

    {tab==='photo'&&<div className="tt-panel">
     <div className="tt-panel-head"><div><strong>Trace from a photo</strong><small>Put a garment photo under the board and cut out each piece.</small></div></div>
     <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoFile}/>
     {!photo?<button className="tt-upload" onClick={()=>fileRef.current?.click()}><Upload size={20}/><b>Upload a garment photo</b><small>Flat-lay or straight-on photos work best.</small></button>
     :<>
      <div className="tt-photo-thumb"><img src={photo.src} alt="Garment photo"/></div>
      <div className="tt-field"><label>Opacity</label><input type="range" min="10" max="100" value={Math.round((photo.opacity??.6)*100)} onChange={e=>setPhoto(p=>({...p,opacity:e.target.value/100}))}/></div>
      <div className={`tt-scale-note${photo.calibrated?' ok':''}`}>{photo.calibrated?'Scale is set. Traced measurements are real-size.':'Scale not set. A photo has no real size, so traced measurements are not real until you set the scale.'}</div>
      <div className="tt-steps">
       <button className={tool==='calibrate'?'on':''} onClick={()=>setTool('calibrate')}><Crosshair size={15}/><span><b>1. Set real scale</b><small>Drag a line over something you know (e.g. a ruler or shoulder width), then type its real length.</small></span></button>
       <button className={tool==='trace'?'on':''} onClick={()=>setTool('trace')}><PenTool size={15}/><span><b>2. Trace each piece</b><small>Click around the edge. Click the first dot or press Enter to close it.</small></span></button>
       <button className={tool==='photo'?'on':''} onClick={()=>setTool('photo')}><Move size={15}/><span><b>Move photo</b><small>Drag the photo to line it up.</small></span></button>
      </div>
      <div className="tt-row"><button className="btn btn-ghost btn-sm" onClick={fitPhoto}>Fit to board</button><button className="btn btn-ghost btn-sm" onClick={()=>fileRef.current?.click()}>Replace</button><button className="btn btn-ghost btn-sm tt-danger-inline" onClick={()=>{setPhoto(null);if(tool==='photo'||tool==='calibrate')setTool('select')}}>Remove</button></div>
     </>}
    </div>}

    {tab==='cut'&&<div className="tt-panel">
     <div className="tt-panel-head"><div><strong>Cutting layout</strong><small>Estimate of fabric needed. Grain runs top to bottom.</small></div></div>
     <div className="tt-field"><label>Fabric width ({unit})</label><input type="number" min="10" value={Number(toUnit(fab.w,unit).toFixed(1))} onChange={e=>{const v=fromUnit(parseFloat(e.target.value),unit);if(v>0)setFab(f=>({...f,w:v}))}}/></div>
     <div className="tt-chips">{FABRIC_PRESETS.map(w=><button key={w} className={Math.round(fab.w)===w?'on':''} onClick={()=>setFab(f=>({...f,w}))}>{num(w,unit)} {unit}</button>)}</div>
     <label className="tt-check"><input type="checkbox" checked={fab.allow} onChange={e=>setFab(f=>({...f,allow:e.target.checked}))}/> Include seam allowance</label>
     <label className="tt-check"><input type="checkbox" checked={fab.rotate} onChange={e=>setFab(f=>({...f,rotate:e.target.checked}))}/> Allow turning pieces 90° (plain fabric, no nap)</label>
     <div className="tt-field"><label>Extra for shrinkage (%)</label><input type="number" min="0" max="30" value={fab.extra} onChange={e=>setFab(f=>({...f,extra:clamp(parseFloat(e.target.value)||0,0,30)}))}/></div>
     {layout.count===0?<div className="tt-empty"><LayoutGrid size={22}/><p>Add pattern pieces to see the layout.</p></div>:<>
      <div className="tt-stats"><div><b>{lenM.toFixed(2)} m</b><small>{(lenM/0.9144).toFixed(2)} yd to buy</small></div><div><b>{Math.round(layout.efficiency*100)}%</b><small>fabric used</small></div><div><b>{layout.count}</b><small>pieces to cut</small></div></div>
      {layout.unplaced.length>0&&<div className="tt-warnings">{layout.unplaced.length} piece{layout.unplaced.length>1?'es are':' is'} wider than the fabric: {[...new Set(layout.unplaced.map(p=>p.name))].join(', ')}. Use wider fabric or allow turning.</div>}
      <div className="tt-layout"><svg viewBox={`0 0 ${layout.fabricW} ${Math.max(layout.length,10)}`} role="img" aria-label="Cutting layout preview"><rect width={layout.fabricW} height={Math.max(layout.length,10)} className="tt-fabric"/>
       {layout.placed.map((p,i)=>{const s=placedShape(p),hue=(([...new Set(layout.placed.map(q=>q.id))].indexOf(p.id))*53)%360,f=q=>q.map(v=>v.join(',')).join(' ');return <g key={i}><polygon points={f(s.pts)} fill={`hsl(${hue} 70% 55% / .25)`} stroke={`hsl(${hue} 70% 45%)`} strokeWidth=".4"/>{s.sa&&<polygon points={f(s.sa)} fill="none" stroke={`hsl(${hue} 70% 45%)`} strokeWidth=".25" strokeDasharray="1.2 .9"/>}<text x={p.x+p.w/2} y={p.y+p.h/2} fontSize="2.6" textAnchor="middle" className="tt-layout-text">{p.name}</text></g>})}</svg></div>
      <div className="tt-row"><button className="btn btn-ghost btn-sm" onClick={downloadLayout}><Download size={13}/> Layout SVG</button><button className="btn btn-primary btn-sm" onClick={genCutAi} disabled={busyKind==='cut'}><Wand2 size={13}/>{busyKind==='cut'?'Thinking…':'AI cutting advice'}</button></div>
      <p className="tt-note">This is a safe estimate using each piece's bounding box. An experienced cutter can often nest tighter.</p>
     </>}
     {cutAi&&<div className="tt-ai-result">{cutAi.summary&&<p>{cutAi.summary}</p>}{cutAi.cutting_layout?.notes&&<p>{cutAi.cutting_layout.notes}</p>}{cutAi.warnings?.length>0&&<div className="tt-warnings">{cutAi.warnings.map((w,i)=><div key={i}>{w}</div>)}</div>}</div>}
    </div>}

    {tab==='sew'&&<div className="tt-panel">
     <div className="tt-panel-head"><div><strong>Sewing order</strong><small>AI builds a step-by-step plan from your pieces.</small></div></div>
     <button className="btn btn-primary tt-ai-btn" onClick={genStitch} disabled={busyKind==='sew'||!summary.length}><ListOrdered size={15}/>{busyKind==='sew'?'Planning…':stitch?'Regenerate plan':'Generate sewing order'}</button>
     {!summary.length&&<p className="tt-note">Add at least one pattern piece first.</p>}
     {stitch?.warnings?.length>0&&<div className="tt-warnings">{stitch.warnings.map((w,i)=><div key={i}>{w}</div>)}</div>}
     {stitch?.stitch_plan?.length>0?<ol className="tt-plan">{stitch.stitch_plan.map((s,i)=><li key={i} className={sewDone.includes(i)?'done':''}><button onClick={()=>setSewDone(d=>d.includes(i)?d.filter(x=>x!==i):[...d,i])}><span>{sewDone.includes(i)?<Check size={12}/>:s.step||i+1}</span><div><b>{s.operation}</b>{s.notes&&<small>{s.notes}</small>}</div></button></li>)}</ol>
      :stitch&&<p className="tt-note">The AI did not return a plan. Try again with more pieces on the board.</p>}
    </div>}

    {tab==='check'&&<div className="tt-panel">
     <div className="tt-panel-head"><div><strong>Before you cut</strong><small>{checked.length} of {CHECKS.length} complete</small></div><b className="tt-pct">{pct}%</b></div>
     <div className="tt-progress"><i style={{width:`${pct}%`}}/></div>
     <ul className="tt-checks">{CHECKS.map((c,i)=><li key={c}><button className={checked.includes(i)?'on':''} onClick={()=>toggleCheck(i)}><span><Check size={12}/></span>{c}</button></li>)}</ul>
    </div>}
    </div>
   </aside>
  </div>
 </div>
}
