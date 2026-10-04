import React,{useEffect,useRef,useState} from 'react';
import {BOARD_W,BOARD_H,uid,clamp,num,fmt,isLine,lineLen,anchor,bbox,shift,snapPt,saPoints,mkPiece,syncPiece,pieceEdges,edgePoints,nodesOf,moveNode,moveControl,toggleCurve,insertNode,removeNode,edited} from './geometry.js';
import {tileOf} from './fabrics.js';

const Dim=({a,b,unit})=>{const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,t=fmt(Math.hypot(b.x-a.x,b.y-a.y),unit),w=t.length*1.5+2.4;return <g className="tt-dim"><rect x={mx-w/2} y={my-2.7} width={w} height={4.6} rx="1.2"/><text x={mx} y={my+.7} textAnchor="middle" fontSize="2.5">{t}</text></g>};
const dartPath=o=>{const w=(o.w||3)/2;return `M${o.x2-w} ${o.y2}L${o.x} ${o.y}L${o.x2+w} ${o.y2}`};
const LINE_TOOLS=['measure','seam','stitch','grainline','piece','dart','calibrate','split','spread'];

export default function Board({ops,tool,setTool,selected,setSelected,zoom,unit,showSA,snap,photo,setPhoto,fabricOn,garmentFabric,highlight,onCommit,onLive,onBegin,onCalibrate,onToolLine,cursorRef}){
 const wrap=useRef(null),svg=useRef(null),mv=useRef(null);
 const [draft,setDraft]=useState(null),[trace,setTrace]=useState([]),[hover,setHover]=useState(null),[ppu,setPpu]=useState(3);

 useEffect(()=>{
  const el=wrap.current;if(!el)return;
  const calc=()=>{const cs=getComputedStyle(el),aw=el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=el.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);setPpu(Math.max(1,Math.min(aw/BOARD_W,ah/BOARD_H)))};
  calc();const ro=new ResizeObserver(calc);ro.observe(el);return()=>ro.disconnect();
 },[]);

 const raw=e=>{const r=svg.current.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width*BOARD_W,0,BOARD_W),y:clamp((e.clientY-r.top)/r.height*BOARD_H,0,BOARD_H)}};
 const sn=(p,ex)=>snapPt(p,ops,snap,ex);

 const finishTrace=(pts=trace)=>{
  if(pts.length<3){setTrace([]);return}
  const p=mkPiece({name:`Piece ${ops.filter(o=>o.type==='piece').length+1}`},pts.map(q=>[+q[0].toFixed(2),+q[1].toFixed(2)]));
  onCommit([...ops,p]);setTrace([]);setSelected(p.id);setTool('select');
 };
 useEffect(()=>{setTrace(t=>t.length?[]:t)},[tool]); // leaving the trace tool discards a half-drawn outline
 useEffect(()=>{
  if(tool!=='trace')return;
  const k=e=>{
   if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
   if(e.key==='Enter'){e.preventDefault();finishTrace()}
   else if(e.key==='Escape'){e.preventDefault();trace.length?setTrace([]):setTool('select')}
   else if(e.key==='Backspace'){e.preventDefault();setTrace(t=>t.slice(0,-1))}
  };
  window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);
 });

 const startMove=o=>e=>{if(tool!=='select')return;e.stopPropagation();setSelected(o.id);mv.current={kind:'move',id:o.id,orig:o,all:ops,start:raw(e),begun:false}};
 const startNode=(o,i)=>e=>{
  e.stopPropagation();
  if(e.altKey){onCommit(ops.map(x=>x.id===o.id?syncPiece({...x,path:removeNode(x.path,i),block:edited(x.block)}):x));return}
  mv.current={kind:'node',id:o.id,idx:i,begun:false};
 };
 const startControl=(o,k,which)=>e=>{e.stopPropagation();mv.current={kind:'ctrl',id:o.id,k,which,begun:false}};
 const startPhoto=e=>{if(tool!=='photo')return;e.stopPropagation();mv.current={kind:'photo',orig:photo,start:raw(e),begun:true}};
 const edgeDown=(o,edge)=>e=>{
  if(e.shiftKey){e.stopPropagation();const q=raw(e);onCommit(ops.map(x=>x.id===o.id?syncPiece({...x,path:insertNode(x.path,edge.k,[q.x,q.y]),block:edited(x.block)}):x));return}
  startMove(o)(e);
 };
 const edgeDouble=(o,edge)=>e=>{e.stopPropagation();if(edge.closing)return;onCommit(ops.map(x=>x.id===o.id?syncPiece({...x,path:toggleCurve(x.path,edge.k),block:edited(x.block)}):x))};

 const down=e=>{
  if(tool==='select'){setSelected(null);return}
  if(tool==='photo')return;
  const p=sn(raw(e));
  if(tool==='trace'){
   if(trace.length>=3&&Math.hypot(p.x-trace[0][0],p.y-trace[0][1])<3)return finishTrace();
   setTrace(t=>[...t,[p.x,p.y]]);return;
  }
  if(LINE_TOOLS.includes(tool)){setDraft({start:p,cur:p});return}
  if(tool==='notch')return onCommit([...ops,{id:uid(),type:'notch',x:p.x,y:p.y}]);
  if(tool==='annotation'){const text=window.prompt('Note text');if(text)onCommit([...ops,{id:uid(),type:'annotation',x:p.x,y:p.y,text:text.slice(0,120)}])}
 };
 const move=e=>{
  const r=raw(e);
  if(cursorRef.current)cursorRef.current.textContent=`x ${num(r.x,unit)}  y ${num(r.y,unit)} ${unit}`;
  const m=mv.current;
  if(m){
   if(m.kind==='photo'){setPhoto({...m.orig,x:m.orig.x+r.x-m.start.x,y:m.orig.y+r.y-m.start.y});return}
   if(!m.begun){if(m.kind==='move'&&Math.hypot(r.x-m.start.x,r.y-m.start.y)<.6)return;m.begun=true;onBegin()}
   if(m.kind==='move'){
    const a=anchor(m.orig),t=sn({x:a[0]+r.x-m.start.x,y:a[1]+r.y-m.start.y},m.id),dx=t.x-a[0],dy=t.y-a[1];
    onLive(m.all.map(o=>(o.id===m.id||o.parent===m.id)?shift(o,dx,dy):o));
   }else{
    const t=sn(r,m.id);
    onLive(ops.map(o=>{
     if(o.id!==m.id)return o;
     const path=m.kind==='node'?moveNode(o.path,m.idx,[t.x,t.y]):moveControl(o.path,m.k,m.which,[r.x,r.y]);
     return syncPiece({...o,path,block:edited(o.block)});
    }));
   }
   return;
  }
  if(draft)setDraft({...draft,cur:sn(r)});
  if(tool==='trace')setHover(sn(r));
 };
 const up=()=>{
  if(mv.current){mv.current=null;return}
  if(!draft)return;
  const a=draft.start,b=draft.cur,len=Math.hypot(b.x-a.x,b.y-a.y);
  if(tool==='piece'){
   if(Math.abs(b.x-a.x)>3&&Math.abs(b.y-a.y)>3){const p=mkPiece({name:`Piece ${ops.filter(o=>o.type==='piece').length+1}`},[[a.x,a.y],[b.x,a.y],[b.x,b.y],[a.x,b.y]]);onCommit([...ops,p]);setSelected(p.id)}
  }else if(tool==='calibrate'){if(len>2)onCalibrate(a,b)}
  else if(tool==='split'||tool==='spread'){if(len>2)onToolLine(tool,[a.x,a.y],[b.x,b.y])}
  else if(tool==='dart'){const bp=len>2?b:{x:a.x,y:a.y+10};onCommit([...ops,{id:uid(),type:'dart',x:a.x,y:a.y,x2:bp.x,y2:bp.y,w:3}])}
  else if(len>2)onCommit([...ops,{id:uid(),type:tool,x1:a.x,y1:a.y,x2:b.x,y2:b.y,allowance:tool==='seam'?1:0}]);
  setDraft(null);
 };
 const cls=id=>`tt-op${selected===id?' tt-selected':''}`;
 const selOp=ops.find(o=>o.id===selected);
 const size=BOARD_W*ppu*zoom/100;
 const fabOf=o=>fabricOn?(o.fabric||garmentFabric):null;
 const pieces=ops.filter(o=>o.type==='piece');
 const hl=(highlight||[]).map(h=>{const p=pieces.find(o=>o.id===h.pid);if(!p)return null;const {pts,edges}=pieceEdges(p),e=edges.find(x=>x.k===h.k);return e?edgePoints(pts,e):null}).filter(Boolean);

 return <div className="tt-board-wrap" ref={wrap}>
  <svg ref={svg} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className={`tt-board tool-${tool}`} style={{width:size,height:size*BOARD_H/BOARD_W,touchAction:'none'}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} onDoubleClick={()=>{if(tool==='trace'&&trace.length>=4)finishTrace(trace.slice(0,-1))}} role="application" aria-label="Tailor pattern board">
   <defs>
    <pattern id="tt-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" strokeOpacity=".09" strokeWidth=".18"/></pattern>
    <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L6 3 L0 6 z" fill="currentColor"/></marker>
    {fabricOn&&pieces.map(o=>{const f=fabOf(o);if(!f)return null;const t=tileOf(f),b=bbox(o.points);return <pattern key={o.id} id={`fab-${o.id}`} patternUnits="userSpaceOnUse" width={t.w} height={t.h} patternTransform={`translate(${b.x} ${b.y}) rotate(${f.rot||0}) scale(${(f.scale||100)/100})`} dangerouslySetInnerHTML={{__html:t.markup}}/>})}
   </defs>
   <rect width={BOARD_W} height={BOARD_H} fill="url(#tt-grid)"/>
   {photo?.src&&photo.visible!==false&&<image href={photo.src} x={photo.x} y={photo.y} width={photo.w} height={photo.h} opacity={photo.opacity??.55} preserveAspectRatio="none" className={tool==='photo'?'tt-photo grab':'tt-photo'} onPointerDown={startPhoto}/>}
   {showSA&&pieces.map(o=>{const s=saPoints(o);return s&&<polygon key={`sa-${o.id}`} className="tt-sa" points={s.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' ')}/>})}
   {ops.map(o=>{
    const common={key:o.id,className:cls(o.id),onPointerDown:startMove(o)};
    if(o.type==='piece'){
     const b=bbox(o.points),f=fabOf(o),halo=f?{paintOrder:'stroke',stroke:'#fff',strokeWidth:.6}:{};
     const cx=b.x+b.w/2+(o.fold?1.5:0),cy=b.y+b.h/2,fs=clamp(b.w/((o.name||'').length*.62||1),1.5,3),tiny=b.h<14||b.w<14;
     return <g {...common}>
      <polygon points={o.points.map(p=>p.join(',')).join(' ')} className="tt-piece" style={f?{fill:`url(#fab-${o.id})`}:undefined}/>
      {o.fold&&<><line className="tt-fold" x1={b.x} y1={b.y+3} x2={b.x} y2={b.y+b.h-3} markerStart="url(#arrow)" markerEnd="url(#arrow)"/><text className="tt-fold-label" transform={`translate(${b.x+2.2} ${b.y+b.h/2}) rotate(-90)`} textAnchor="middle" fontSize="1.9">PLACE ON FOLD</text></>}
      <text x={cx} y={tiny?cy+fs*.35-(b.h<14?2.2:0):cy-1} textAnchor="middle" fontSize={fs} fontWeight="700" fill="currentColor" style={halo}>{o.name}</text>
      {!tiny&&<><text x={cx} y={cy+2.6} textAnchor="middle" fontSize="2" fill="currentColor" opacity={f?1:.65} style={halo}>{`Cut ${o.cut||1}${o.fold?' · on fold':''}`}</text><text x={cx} y={cy+5.2} textAnchor="middle" fontSize="2" fill="currentColor" opacity={f?1:.55} style={halo}>{`${num(b.w,unit)} × ${num(b.h,unit)} ${unit}`}</text></>}
     </g>}
    if(o.type==='notch')return <g {...common}><circle cx={o.x} cy={o.y} r="1.3" fill="#fff" stroke="currentColor" strokeWidth=".7"/></g>;
    if(o.type==='dart')return <g {...common}><path d={dartPath(o)} fill="rgba(230,98,57,.1)" stroke="currentColor" strokeWidth=".6"/><path d={`M${o.x} ${o.y}L${o.x2} ${o.y2}`} stroke="currentColor" strokeWidth=".3" strokeDasharray="1 .8"/><path className="tt-hit" d={dartPath(o)} fill="none" stroke="transparent" strokeWidth="3"/></g>;
    if(o.type==='annotation')return <g {...common}><text x={o.x} y={o.y} fontSize="3" fill="currentColor">{o.text}</text></g>;
    const a={x:o.x1,y:o.y1},b={x:o.x2,y:o.y2},L=lineLen(o)||1,px=-(b.y-a.y)/L*1.4,py=(b.x-a.x)/L*1.4;
    return <g {...common}>
     {o.type==='measure'
      ?<><path className="tt-measure" d={`M${a.x} ${a.y}L${b.x} ${b.y}M${a.x-px} ${a.y-py}L${a.x+px} ${a.y+py}M${b.x-px} ${b.y-py}L${b.x+px} ${b.y+py}`} fill="none" strokeWidth=".5"/><Dim a={a} b={b} unit={unit}/></>
      :<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeWidth={o.type==='stitch'?'.45':o.type==='grainline'?'.55':'.8'} strokeDasharray={o.type==='stitch'?'2 1':undefined} markerStart={o.type==='grainline'?'url(#arrow)':undefined} markerEnd={o.type==='grainline'?'url(#arrow)':undefined}/>}
     <line className="tt-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="3.2"/>
    </g>;
   })}
   {hl.map((pts,i)=><polyline key={i} className="tt-hl" points={pts.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' ')} fill="none"/>)}
   {selOp&&isLine(selOp)&&selOp.type!=='measure'&&<Dim a={{x:selOp.x1,y:selOp.y1}} b={{x:selOp.x2,y:selOp.y2}} unit={unit}/>}
   {selOp?.type==='piece'&&tool==='select'&&selOp.path&&(()=>{
    const {pts,edges}=pieceEdges(selOp),nodes=nodesOf(selOp.path),segs=selOp.path.segs;
    return <g>
     {edges.map(e=><polyline key={`h${e.k}`} className="tt-edge-hit" points={edgePoints(pts,e).map(p=>p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth="3" onPointerDown={edgeDown(selOp,e)} onDoubleClick={edgeDouble(selOp,e)}/>)}
     {segs.map((s,k)=>s.c1&&<g key={`c${k}`} className="tt-ctrl"><line x1={nodes[k][0]} y1={nodes[k][1]} x2={s.c1[0]} y2={s.c1[1]}/><line x1={nodes[k+1][0]} y1={nodes[k+1][1]} x2={s.c2[0]} y2={s.c2[1]}/>
      <rect x={s.c1[0]-1} y={s.c1[1]-1} width="2" height="2" transform={`rotate(45 ${s.c1[0]} ${s.c1[1]})`} onPointerDown={startControl(selOp,k,'c1')}/><rect x={s.c2[0]-1} y={s.c2[1]-1} width="2" height="2" transform={`rotate(45 ${s.c2[0]} ${s.c2[1]})`} onPointerDown={startControl(selOp,k,'c2')}/></g>)}
     {nodes.map((p,i)=><circle key={`n${i}`} className="tt-handle" cx={p[0]} cy={p[1]} r={nodes.length>14?1:1.5} onPointerDown={startNode(selOp,i)}/>)}
    </g>})()}
   {tool==='trace'&&trace.length>0&&<g className="tt-trace">
    <polyline points={[...trace,...(hover?[[hover.x,hover.y]]:[])].map(p=>p.join(',')).join(' ')} fill="none" strokeWidth=".6" strokeDasharray="2 1"/>
    {trace.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={i===0&&trace.length>=3?2.2:1.1} className={i===0?'first':''}/>)}
   </g>}
   {draft&&(tool==='piece'
    ?<rect className="tt-draft" x={Math.min(draft.start.x,draft.cur.x)} y={Math.min(draft.start.y,draft.cur.y)} width={Math.abs(draft.cur.x-draft.start.x)} height={Math.abs(draft.cur.y-draft.start.y)} fill="rgba(230,98,57,.08)" strokeWidth=".6" strokeDasharray="2 1"/>
    :<><line className={`tt-draft${tool==='split'||tool==='spread'?' tt-slash':''}`} x1={draft.start.x} y1={draft.start.y} x2={draft.cur.x} y2={draft.cur.y} strokeWidth={tool==='split'||tool==='spread'?.9:.7} strokeDasharray={tool==='split'?'3 1.2':'2 1'}/>{(tool==='measure'||tool==='calibrate')&&<Dim a={draft.start} b={draft.cur} unit={unit}/>}</>)}
  </svg>
 </div>
}
