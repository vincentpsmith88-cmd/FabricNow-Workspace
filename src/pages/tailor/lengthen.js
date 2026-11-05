/* Lengthen or shorten a pattern piece by a real measurement (board unit = cm).
   Lengthen: cut across the piece at `at` (0 = top, 1 = bottom), slide everything below straight down by `delta`, and extend
   the side edges so a flared skirt keeps its flare (flare:false keeps the sides parallel instead). Shorten: trims from the hem. */
import {bbox,syncPiece,pathFromPoints,lineHits,edited} from './geometry.js';

const EPS=1e-6;
const hitsAt=(pts,y)=>{const h=[];for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];if((p[1]-y)*(q[1]-y)<0){const t=(y-p[1])/(q[1]-p[1]);h.push({x:p[0]+(q[0]-p[0])*t,i})}}return h};

export function lengthenPoints(pts,delta,{at=.6,flare=true}={}){
 const b=bbox(pts),y0=b.y+b.h*at,yb=b.y+b.h;
 if(Math.abs(delta)<EPS)return {pts};
 if(delta<0)return shortenPoints(pts,-delta);
 const top=hitsAt(pts,y0);
 if(top.length<2)return {error:'The piece is too narrow to lengthen at that height. Try a different position.'};
 /* the two side edges: from the cut line out to the widest points below it (the hem corners) */
 const xs0=top.map(h=>h.x),L0=Math.min(...xs0),R0=Math.max(...xs0);
 const lower=pts.filter(p=>p[1]>y0+EPS);
 const vL=lower.reduce((a,p)=>p[0]<a[0]?p:a,lower[0]),vR=lower.reduce((a,p)=>p[0]>a[0]?p:a,lower[0]);
 const rL=flare&&vL[1]-y0>EPS?(vL[0]-L0)/(vL[1]-y0):0,rR=flare&&vR[1]-y0>EPS?(vR[0]-R0)/(vR[1]-y0):0;
 const XL=y=>L0+rL*(y-y0),XR=y=>R0+rR*(y-y0);
 const move=([x,y])=>{const w=XR(y)-XL(y),u=Math.abs(w)>1e-3?(x-XL(y))/w:.5,y2=y+delta,w2=XR(y2)-XL(y2);return [XL(y2)+u*w2,y2]};
 const hitSet=new Map(top.map(h=>[h.i,h]));
 const out=[];
 for(let i=0;i<pts.length;i++){
  const p=pts[i],q=pts[(i+1)%pts.length];
  out.push(p[1]<=y0+EPS?p.slice():move(p));
  const h=hitSet.get(i);
  if(h){const c=[h.x,y0];const up=p[1]<y0; // walking down across the line: keep upper copy, then lower copy; walking up: reverse
   if(up)out.push(c,move(c));else out.push(move(c),c)}
 }
 return {pts:out.map(p=>[+p[0].toFixed(3),+p[1].toFixed(3)])};
}
/* Trim `amount` cm off the hem (bottom) with a straight horizontal cut. */
export function shortenPoints(pts,amount){
 const b=bbox(pts),yc=b.y+b.h-amount;
 if(amount>=b.h*.9)return {error:'That would remove almost the whole piece. Use a smaller amount.'};
 const out=[];
 for(let i=0;i<pts.length;i++){
  const p=pts[i],q=pts[(i+1)%pts.length],pin=p[1]<=yc,qin=q[1]<=yc;
  if(pin)out.push(p.slice());
  if(pin!==qin){const t=(yc-p[1])/(q[1]-p[1]);out.push([p[0]+(q[0]-p[0])*t,yc])}
 }
 return out.length>=3?{pts:out.map(p=>[+p[0].toFixed(3),+p[1].toFixed(3)])}:{error:'Could not shorten that piece.'};
}

/* Apply to piece `id` on the ops list. `mode` is 'add' (change by value) or 'set' (make the piece this long). Values are cm.
   Marks, grainlines and notches below the cut line follow the hem down. */
export function lengthenPiece(ops,id,{mode='add',value,at=.6,flare=true}){
 const piece=ops.find(o=>o.id===id&&o.type==='piece');if(!piece)return {error:'Select a pattern piece first.'};
 const cur=bbox(piece.points).h,delta=mode==='set'?value-cur:value;
 if(!Number.isFinite(delta))return {error:'Type a length first.'};
 if(mode==='set'&&value<=0)return {error:'The length must be more than zero.'};
 const r=lengthenPoints(piece.points,delta,{at,flare});if(r.error)return r;
 const b=bbox(piece.points),y0=b.y+b.h*at;
 const np=syncPiece({...piece,path:pathFromPoints(r.pts),block:edited(piece.block)});
 const kids=ops.map(o=>{
  if(o.parent!==id||delta<=0)return o;
  const mv=(y)=>y>y0?y+delta:y;
  if(typeof o.x1==='number')return {...o,y1:mv(o.y1),y2:mv(o.y2)};
  if(typeof o.y==='number')return {...o,y:mv(o.y),...(typeof o.y2==='number'?{y2:mv(o.y2)}:{})};
  return o;
 });
 return {ops:kids.map(o=>o.id===id?np:o),delta,length:bbox(np.points).h};
}
export {lineHits};

/* Stretch a piece sideways by `ratio` about its left edge (used to widen the hem facing when a flared skirt gets longer). */
export function widenPiece(piece,ratio){
 const b=bbox(piece.points),pts=piece.points.map(([x,y])=>[+(b.x+(x-b.x)*ratio).toFixed(3),y]);
 return syncPiece({...piece,path:pathFromPoints(pts),block:edited(piece.block)});
}

/* A whole-board copy with the dress length set to `length` cm: every length-carrying piece (the skirt panels) is set from the
   lead panel's change, and the hem facing is widened to match. Used to save "mini / knee / midi / maxi" as extra boards. */
export function versionOps(ops,{length,at=.6,flare=true}){
 const grow=ops.filter(o=>o.type==='piece'&&o.plan?.grow);
 if(!grow.length)return {error:'Import the Fabric Now plan first. There is no skirt panel on this board.'};
 const lead=grow.find(o=>o.plan.n===5)||grow[0];
 const r=lengthenPiece(ops,lead.id,{mode:'set',value:length,at,flare});if(r.error)return r;
 let out=r.ops;
 for(const g of grow.filter(o=>o.id!==lead.id)){const q=lengthenPiece(out,g.id,{mode:'add',value:r.delta,at,flare});if(!q.error)out=q.ops}
 const hf=out.find(o=>o.type==='piece'&&o.plan?.n===21),nl=out.find(o=>o.id===lead.id);
 const ratio=flare?bbox(nl.points).w/bbox(lead.points).w:1;
 if(hf&&ratio>1.001)out=out.map(o=>o.id===hf.id?widenPiece(o,ratio):o);
 return {ops:out,delta:r.delta};
}
