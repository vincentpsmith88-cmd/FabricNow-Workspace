import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Search,Star,Maximize2,X,Upload,LayoutGrid,Grid3x3,List,Clock} from 'lucide-react';
import {PRINTS,tileOf} from './fabrics.js';

/* A fabric browser that stays usable with a hundred or more fabrics:
   search, source and pattern filters, favourites, recently used, three sizes, "show more" paging,
   and a full-screen view for comparing many at once. */
const PAGE=24, RECENT_KEY='fabricnow.recentFabrics', FAV_KEY='fabricnow.favFabrics';
const read=(k)=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

const printItem=p=>({key:'p:'+p.id,kind:'print',id:p.id,name:p.name,group:'Built-in',text:`${p.name} built-in print`.toLowerCase(),p});
const libItem=f=>({key:'l:'+f.id,kind:'lib',id:f.id,name:f.name||'Untitled fabric',group:'Library',
  pattern:(f.pattern||'').trim(),text:[f.name,f.supplier,f.composition,f.color,f.pattern].filter(Boolean).join(' ').toLowerCase(),f});

function Thumb({it}){
  if(it.kind==='lib')return <img src={it.f.imageUrl} alt="" loading="lazy" decoding="async"/>;
  const t=tileOf({id:it.id});
  return <svg viewBox={`0 0 ${t.w*2} ${t.h*2}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g dangerouslySetInnerHTML={{__html:t.markup+`<g transform="translate(${t.w} 0)">${t.markup}</g><g transform="translate(0 ${t.h})">${t.markup}</g><g transform="translate(${t.w} ${t.h})">${t.markup}</g>`}}/></svg>;
}

function Browser({items,isOn,onPick,favs,toggleFav,recent,onUpload,big,onExpand,onClose,summary}){
  const [q,setQ]=useState(''),[src,setSrc]=useState('all'),[pat,setPat]=useState(''),[view,setView]=useState(big?'large':'small'),[shown,setShown]=useState(PAGE);
  const lib=items.filter(i=>i.kind==='lib');
  const patterns=useMemo(()=>{const m={};lib.forEach(i=>{if(i.pattern){const k=i.pattern.toLowerCase();m[k]=(m[k]||0)+1}});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k])=>k)},[lib.length]);
  const list=useMemo(()=>{
    const words=q.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(i=>(src==='all'||(src==='print'&&i.kind==='print')||(src==='lib'&&i.kind==='lib')||(src==='fav'&&favs.includes(i.key)))
      &&(!pat||i.pattern?.toLowerCase()===pat)&&words.every(w=>i.text.includes(w)));
  },[items,q,src,pat,favs]);
  useEffect(()=>{setShown(PAGE)},[q,src,pat]);
  const recents=!q&&src==='all'&&!pat?recent.map(k=>items.find(i=>i.key===k)).filter(Boolean).slice(0,8):[];
  const visible=big?list:list.slice(0,shown);
  const SRC=[['all','All',items.length],['print','Prints',items.length-lib.length],['lib','My library',lib.length],['fav','Saved',favs.filter(k=>items.some(i=>i.key===k)).length]];
  const Tile=({it})=>{
    const on=isOn(it),fav=favs.includes(it.key);
    return <div className={`fp-item${on?' on':''}`}>
      <button type="button" className="fp-pick" onClick={()=>onPick(it)} title={it.name} aria-pressed={on}><span className="fp-thumb"><Thumb it={it}/></span><span className="fp-name">{it.name}</span></button>
      <button type="button" className={`fp-star${fav?' on':''}`} onClick={()=>toggleFav(it.key)} aria-label={fav?'Remove from saved':'Save fabric'} title={fav?'Remove from saved':'Save for quick access'}><Star size={13} fill={fav?'currentColor':'none'}/></button>
    </div>;
  };
  return <div className={`fp${big?' fp-big':''}`}>
    <div className="fp-bar">
      <label className="fp-search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Search ${items.length} fabrics by name, colour, supplier…`} aria-label="Search fabrics" autoFocus={big}/>{q&&<button type="button" onClick={()=>setQ('')} aria-label="Clear search"><X size={14}/></button>}</label>
      <div className="fp-views" role="group" aria-label="Thumbnail size">
        {[['small','Small',Grid3x3],['large','Large',LayoutGrid],['list','List',List]].map(([k,l,Ic])=><button key={k} type="button" className={view===k?'on':''} onClick={()=>setView(k)} title={l} aria-label={l}><Ic size={14}/></button>)}
        {!big&&<button type="button" onClick={onExpand} title="Open the full browser" aria-label="Open the full browser"><Maximize2 size={14}/></button>}
        {big&&<button type="button" onClick={onClose} title="Close" aria-label="Close"><X size={15}/></button>}
      </div>
    </div>
    <div className="fp-chips" role="tablist">{SRC.map(([k,l,n])=><button key={k} type="button" role="tab" aria-selected={src===k} className={src===k?'on':''} onClick={()=>{setSrc(k);setPat('')}}>{l}<i>{n}</i></button>)}</div>
    {patterns.length>0&&src!=='print'&&<div className="fp-chips fp-pats">{patterns.map(k=><button key={k} type="button" className={pat===k?'on':''} onClick={()=>setPat(pat===k?'':k)}>{k}</button>)}</div>}
    {summary&&<div className="fp-using">Using <b>{summary}</b></div>}
    {recents.length>0&&<div className="fp-recent"><span><Clock size={12}/> Recently used</span><div>{recents.map(it=><button key={it.key} type="button" className={isOn(it)?'on':''} onClick={()=>onPick(it)} title={it.name}><Thumb it={it}/></button>)}</div></div>}
    <div className="fp-count" aria-live="polite">{list.length===0?'No fabrics match':big||list.length<=shown?`${list.length} fabric${list.length===1?'':'s'}`:`Showing ${shown} of ${list.length}`}</div>
    <div className={`fp-grid fp-${view}`}>
      {visible.map(it=><Tile key={it.key} it={it}/>)}
      {list.length===0&&<div className="fp-empty">{src==='fav'?'Tap the star on a fabric to keep it here.':'Try a shorter search or clear the filters.'}{(q||pat||src!=='all')&&<button type="button" className="btn btn-ghost btn-sm" onClick={()=>{setQ('');setPat('');setSrc('all')}}>Clear filters</button>}</div>}
    </div>
    {!big&&list.length>shown&&<button type="button" className="btn btn-ghost btn-sm fp-more" onClick={()=>setShown(s=>s+PAGE)}>Show {Math.min(PAGE,list.length-shown)} more</button>}
    <button type="button" className="btn btn-ghost btn-sm fp-upload" onClick={onUpload}><Upload size={14}/> Use my own fabric photo</button>
  </div>;
}

export default function FabricPicker({library=[],active,onPrint,onLibrary,onUpload}){
  const [open,setOpen]=useState(false),[favs,setFavs]=useState(()=>read(FAV_KEY)),[recent,setRecent]=useState(()=>read(RECENT_KEY));
  const items=useMemo(()=>[...PRINTS.map(printItem),...library.map(libItem)],[library]);
  const isOn=it=>it.kind==='print'?(!active.src&&active.id===it.id):(!!active.src&&active.name===it.name);
  const current=items.find(isOn);
  const toggleFav=k=>setFavs(l=>{const n=l.includes(k)?l.filter(x=>x!==k):[k,...l];write(FAV_KEY,n);return n});
  const pick=it=>{
    setRecent(l=>{const n=[it.key,...l.filter(x=>x!==it.key)].slice(0,12);write(RECENT_KEY,n);return n});
    if(it.kind==='print')onPrint(it.id);else onLibrary(it.f);
  };
  const pickAndKeep=it=>pick(it);
  const ref=useRef(null);
  useEffect(()=>{if(!open)return;const k=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',k);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',k);document.body.style.overflow=o}},[open]);
  const summary=active.src?(active.name||'your fabric photo'):current?.name;
  const common={items,isOn,onPick:pickAndKeep,favs,toggleFav,recent,onUpload:()=>{setOpen(false);onUpload()},summary};
  return <>
    <div ref={ref}><Browser {...common} onExpand={()=>setOpen(true)}/></div>
    {open&&createPortal(<div className="fp-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="fp-dialog" role="dialog" aria-modal="true" aria-label="Browse all fabrics"><Browser {...common} big onClose={()=>setOpen(false)}/></div></div>,document.body)}
  </>;
}
