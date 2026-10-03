import React,{useEffect,useRef,useState} from 'react';
import {api,API,downloadFile} from '../api.js';
import {useToast} from '../toast.jsx';
import {Bot,Check,ChevronDown,Circle,Download,Eraser,Hand,Layers3,Minus,Move,Plus,Ruler,Save,Scissors,Sparkles,Square,Trash2,Wand2,ZoomIn,ZoomOut,CheckCircle2} from 'lucide-react';
import './tailor-tools.css';

const TOOLS=[
 ['select','Select','V',Hand,'Click a piece or mark to inspect it'],
 ['piece','Pattern piece','P',Square,'Pattern pieces are placed from the library'],
 ['seam','Seam','S',Minus,'Drag to draw a seam line'],
 ['dart','Dart','D',ChevronDown,'Click to drop a dart'],
 ['notch','Notch','N',Circle,'Click to place a notch'],
 ['grainline','Grainline','G',Move,'Drag to draw a grainline'],
 ['stitch','Stitch','T',Scissors,'Drag to draw a stitch line'],
 ['measure','Measure','M',Ruler,'Drag to measure a distance'],
 ['annotation','Note','A',Layers3,'Click to add a note']
];
const CHECKS=['Grainline is defined','Seam allowances are checked','Notches match joining pieces','Measurements are verified','Stitch order is documented'];
const DEFAULT_OPS=[{id:'piece-1',type:'piece',name:'Front Bodice',x:18,y:20,w:48,h:62,points:[[18,20],[60,20],[66,30],[62,78],[18,82]],cut:2},{id:'piece-2',type:'piece',name:'Back Bodice',x:78,y:20,w:48,h:62,points:[[78,20],[120,20],[126,30],[122,78],[78,82]],cut:1}];

function uid(){return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}

function Board({ops,tool,onChange,selected,setSelected,zoom}){
 const svg=useRef(null),[drag,setDrag]=useState(null);
 const point=e=>{const r=svg.current.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width*140,0,140),y:clamp((e.clientY-r.top)/r.height*180,0,180)}};
 const down=e=>{
  if(tool==='select'){if(e.target===e.currentTarget||e.target.tagName==='rect')setSelected(null);return}
  const p=point(e);
  if(['measure','seam','stitch','grainline'].includes(tool)){setDrag({start:p,current:p});return}
  if(tool==='notch'){onChange([...ops,{id:uid(),type:'notch',x:p.x,y:p.y}]);return}
  if(tool==='annotation'){const text=window.prompt('Note text');if(text)onChange([...ops,{id:uid(),type:'annotation',x:p.x,y:p.y,text:text.slice(0,120)}]);return}
  if(tool==='dart'){onChange([...ops,{id:uid(),type:'dart',x:p.x,y:p.y,x2:p.x+8,y2:p.y+10}])}
 };
 const move=e=>{if(drag)setDrag({...drag,current:point(e)})};
 const up=()=>{if(!drag)return;const a=drag.start,b=drag.current;if(Math.hypot(b.x-a.x,b.y-a.y)>2)onChange([...ops,{id:uid(),type:tool,x1:a.x,y1:a.y,x2:b.x,y2:b.y,allowance:tool==='seam'?1:0}]);setDrag(null)};
 const pick=id=>e=>{if(tool==='select'){e.stopPropagation();setSelected(id)}};
 const cls=id=>`tt-op${selected===id?' tt-selected':''}`;
 return <div className="tt-board-wrap">
  <svg ref={svg} viewBox="0 0 140 180" className="tt-board" style={{width:`${zoom}%`}} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} role="application" aria-label="Tailor pattern board">
   <defs>
    <pattern id="tt-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" strokeOpacity=".09" strokeWidth=".18"/></pattern>
    <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker>
   </defs>
   <rect width="140" height="180" fill="url(#tt-grid)"/>
   {ops.map(o=>{
    if(o.type==='piece')return <g key={o.id} onClick={pick(o.id)} className={cls(o.id)}><polygon points={o.points.map(p=>p.join(',')).join(' ')} className="tt-piece"/><text x={o.x+o.w/2} y={o.y+o.h/2} textAnchor="middle" fontSize="3" fontWeight="700" fill="currentColor">{o.name}</text><text x={o.x+o.w/2} y={o.y+o.h/2+5} textAnchor="middle" fontSize="2.4" fill="currentColor" opacity=".6">Cut {o.cut||1}</text></g>;
    if(o.type==='notch')return <circle key={o.id} onClick={pick(o.id)} className={cls(o.id)} cx={o.x} cy={o.y} r="1.5" fill="#fff" stroke="currentColor" strokeWidth=".7"/>;
    if(o.type==='dart')return <path key={o.id} onClick={pick(o.id)} className={cls(o.id)} d={`M ${o.x} ${o.y} L ${o.x2} ${o.y2} M ${o.x} ${o.y} L ${o.x-5} ${o.y2}`} fill="none" stroke="currentColor" strokeWidth=".7"/>;
    if(o.type==='annotation')return <text key={o.id} onClick={pick(o.id)} className={cls(o.id)} x={o.x} y={o.y} fontSize="3" fill="currentColor">{o.text}</text>;
    if(o.type==='grainline')return <line key={o.id} onClick={pick(o.id)} className={cls(o.id)} x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke="currentColor" strokeWidth=".55" markerEnd="url(#arrow)"/>;
    return <line key={o.id} onClick={pick(o.id)} className={cls(o.id)} x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} stroke="currentColor" strokeWidth={o.type==='stitch'?'.45':'.8'} strokeDasharray={o.type==='stitch'?'2 1':undefined}/>;
   })}
   {drag&&<line x1={drag.start.x} y1={drag.start.y} x2={drag.current.x} y2={drag.current.y} className="tt-draft" strokeWidth=".7" strokeDasharray="2 1"/>}
  </svg>
 </div>
}

export default function TailorTools(){
 const toast=useToast();
 const [boards,setBoards]=useState([]),[board,setBoard]=useState(null),[ops,setOps]=useState(DEFAULT_OPS),[tool,setTool]=useState('select'),[selected,setSelected]=useState(null),[projects,setProjects]=useState([]),[projectId,setProjectId]=useState(''),[ai,setAi]=useState(null),[request,setRequest]=useState('Check the construction, seam placement, allowances and stitch sequence for this pattern.'),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[unit,setUnit]=useState('cm'),[zoom,setZoom]=useState(88),[tab,setTab]=useState('ai'),[checked,setChecked]=useState([]);
 useEffect(()=>{Promise.allSettled([api('/api/tailor-tools/boards'),api('/api/workspace-suite/projects?limit=50')]).then(([b,p])=>{if(b.status==='fulfilled'){setBoards(b.value.boards||[]);if(b.value.boards?.[0]){setBoard(b.value.boards[0]);setOps(b.value.boards[0].operations?.length?b.value.boards[0].operations:DEFAULT_OPS);setUnit(b.value.boards[0].unit||'cm')}}if(p.status==='fulfilled')setProjects(p.value.projects||[])})},[]);
 useEffect(()=>{const k=e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.metaKey||e.ctrlKey)return;const t=TOOLS.find(x=>x[2].toLowerCase()===e.key.toLowerCase());if(t)setTool(t[0]);if((e.key==='Delete'||e.key==='Backspace')&&selected){setOps(o=>o.filter(x=>x.id!==selected));setSelected(null)}};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[selected]);
 const create=async()=>{try{const d=await api('/api/tailor-tools/boards',{method:'POST',body:JSON.stringify({name:'Tailor Board',projectId:projectId||null,unit})});setBoard(d.board);setBoards(b=>[d.board,...b]);setOps(DEFAULT_OPS);toast.success('Tailor board created.')}catch(e){toast.error(e.message)}};
 const save=async()=>{if(!board)return create();setSaving(true);try{const d=await api(`/api/tailor-tools/boards/${board.id}`,{method:'PUT',body:JSON.stringify({operations:ops,projectId:projectId||board.projectId||null,unit,aiContext:ai||{}})});setBoard(d.board);setBoards(bs=>bs.map(x=>x.id===d.board.id?d.board:x));toast.success('Tailor board saved.')}catch(e){toast.error(e.message)}finally{setSaving(false)}};
 const ask=async()=>{setBusy(true);try{const p=projects.find(x=>x.id===projectId)||null;const d=await api('/api/tailor-tools/ai',{method:'POST',body:JSON.stringify({request,project:p,board:{...board,operations:ops},measurements:p?.measurements||{},fabric:p?.fabric||''})});setAi(d);toast.success('AI analysis ready. Review suggestions before applying.')}catch(e){toast.error(e.message)}finally{setBusy(false)}};
 const applySuggestion=s=>{if(!s?.operations?.length)return;setOps(o=>[...o,...s.operations.map(x=>({...x,id:uid()}))]);toast.success('AI suggestion added to the board.')};
 const removeSelected=()=>{if(!selected)return;setOps(o=>o.filter(x=>x.id!==selected));setSelected(null)};
 const toggleCheck=i=>setChecked(c=>c.includes(i)?c.filter(x=>x!==i):[...c,i]);
 const selectedOp=ops.find(o=>o.id===selected);
 const currentProject=projects.find(x=>x.id===projectId);
 const activeTool=TOOLS.find(t=>t[0]===tool);
 const pct=Math.round(checked.length/CHECKS.length*100);

 return <div className="tt-page">
  <header className="tt-hero">
   <div className="tt-hero-copy">
    <span className="tt-eyebrow"><Scissors size={13}/> Tailor Tools</span>
    <h2>Draft the pattern. <span>Build it right.</span></h2>
    <p>Seams, allowances, notches, darts, grainlines and stitch plans on one precise board — with AI review before anything changes.</p>
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
     <div className="tt-title"><strong>{board?.name||'Tailor board'}</strong><span className="tt-pill">{currentProject?`Linked · ${currentProject.name}`:'Unsaved draft'}</span></div>
     <div className="tt-stage-ctrl">
      <select value={projectId} onChange={e=>setProjectId(e.target.value)} aria-label="Linked project"><option value="">No project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <div className="tt-seg">{['cm','mm','in'].map(u=><button key={u} className={unit===u?'on':''} onClick={()=>setUnit(u)}>{u}</button>)}</div>
     </div>
    </div>

    <div className="tt-canvas-area">
     <nav className="tt-rail" aria-label="Drawing tools">
      {TOOLS.map(([id,label,key,Icon])=><button key={id} className={tool===id?'active':''} onClick={()=>setTool(id)} aria-label={label}><Icon size={18}/><span className="tt-tip">{label}<kbd>{key}</kbd></span></button>)}
     </nav>
     <Board ops={ops} tool={tool} onChange={setOps} selected={selected} setSelected={setSelected} zoom={zoom}/>
     {selected&&<button className="tt-delete-selected" onClick={removeSelected}><Trash2 size={14}/> Delete</button>}
     <div className="tt-zoom"><button onClick={()=>setZoom(z=>clamp(z-10,40,140))} aria-label="Zoom out"><ZoomOut size={15}/></button><b>{zoom}%</b><button onClick={()=>setZoom(z=>clamp(z+10,40,140))} aria-label="Zoom in"><ZoomIn size={15}/></button></div>
    </div>

    <div className="tt-status">
     <span><i className="tt-dot"/> {activeTool[1]} · {activeTool[4]}</span>
     <span>{ops.length} objects · {unit}</span>
     <button onClick={()=>{setOps(DEFAULT_OPS);setSelected(null)}}><Eraser size={13}/> Reset</button>
    </div>
   </section>

   <aside className="tt-side">
    <div className="tt-tabs" role="tablist">
     {[['ai','AI Tailor',Bot],['inspect','Inspector',Layers3],['check','Checklist',CheckCircle2]].map(([id,l,I])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'on':''} onClick={()=>setTab(id)}><I size={14}/>{l}</button>)}
    </div>

    {tab==='ai'&&<div className="tt-panel">
     <div className="tt-panel-head"><div className="tt-ai-badge"><Sparkles size={15}/></div><div><strong>Ask your AI tailor</strong><small>Reviews construction. You approve every change.</small></div></div>
     <textarea value={request} onChange={e=>setRequest(e.target.value)} rows={4} placeholder="Ask about seam placement, darts, fit, cutting or stitch order…"/>
     <button className="btn btn-primary tt-ai-btn" onClick={ask} disabled={busy}><Wand2 size={15}/>{busy?'Analyzing…':'Analyze pattern'}</button>
     {ai&&<div className="tt-ai-result">
      <div className="tt-confidence"><span>Detected garment</span><b>{ai.garment_type||'Not confirmed'}</b><em>{Math.round((Number(ai.confidence)||0)*100)}%</em><i style={{width:`${Math.round((Number(ai.confidence)||0)*100)}%`}}/></div>
      <p>{ai.summary}</p>
      {ai.warnings?.length>0&&<div className="tt-warnings">{ai.warnings.map((w,i)=><div key={i}>{w}</div>)}</div>}
      {ai.suggestions?.map((s,i)=><div className="tt-suggestion" key={i}><strong>{s.title}</strong><p>{s.reason}</p><button className="btn btn-ghost btn-sm" onClick={()=>applySuggestion(s)}><Check size={13}/> Apply to board</button></div>)}
     </div>}
    </div>}

    {tab==='inspect'&&<div className="tt-panel">
     <div className="tt-panel-head"><div><strong>Selected object</strong><small>Click an object on the board to inspect it.</small></div></div>
     {selectedOp?<dl className="tt-detail"><div><dt>Type</dt><dd>{selectedOp.type}</dd></div>{selectedOp.name&&<div><dt>Piece</dt><dd>{selectedOp.name}</dd></div>}{selectedOp.cut!==undefined&&<div><dt>Cut qty</dt><dd>{selectedOp.cut}</dd></div>}{selectedOp.allowance!==undefined&&<div><dt>Allowance</dt><dd>{selectedOp.allowance} {unit}</dd></div>}</dl>:<div className="tt-empty"><Hand size={22}/><p>Nothing selected</p></div>}
     <button className="btn btn-ghost btn-sm tt-danger" disabled={!selected} onClick={removeSelected}><Trash2 size={13}/> Delete selected</button>
    </div>}

    {tab==='check'&&<div className="tt-panel">
     <div className="tt-panel-head"><div><strong>Before you cut</strong><small>{checked.length} of {CHECKS.length} complete</small></div><b className="tt-pct">{pct}%</b></div>
     <div className="tt-progress"><i style={{width:`${pct}%`}}/></div>
     <ul className="tt-checks">{CHECKS.map((c,i)=><li key={c}><button className={checked.includes(i)?'on':''} onClick={()=>toggleCheck(i)}><span><Check size={12}/></span>{c}</button></li>)}</ul>
    </div>}
   </aside>
  </div>
 </div>
}