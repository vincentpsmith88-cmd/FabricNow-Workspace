/* Pattern manipulation: split a piece along a line (princess / panel / yoke seams) and slash-and-spread. */
import {edited,uid,bbox,polyArea,dist,pointInPoly,splitPolygon,slashSpread,pathFromPoints,syncPiece,pathPoints,edgeLength,edgePoints,isLine} from './geometry.js';

const strip=o=>{const {path,block,...r}=o;return r};
const onFoldEdge=(pts,minX)=>pts.filter(p=>Math.abs(p[0]-minX)<.05).length>=2;
function grain(pid,pts){const b=bbox(pts);return {id:uid(),parent:pid,type:'grainline',x1:+(b.x+b.w/2).toFixed(2),y1:+(b.y+b.h*.15).toFixed(2),x2:+(b.x+b.w/2).toFixed(2),y2:+(b.y+b.h*.85).toFixed(2),allowance:0}}
const along=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

/* Split piece `id` with line a->b. opts.dropDarts removes the piece's darts (princess seams replace them). */
export function splitPiece(ops,id,a,b,opts={}){
 const piece=ops.find(o=>o.id===id);if(!piece)return {error:'Select a pattern piece to split.'};
 const res=splitPolygon(piece.points,a,b);
 if(!res)return {error:'The split line must cross the piece exactly twice. Draw it straight across from one edge to the other.'};
 const [A,B,{p1,p2}]=res;
 if(polyArea(A)<2||polyArea(B)<2)return {error:'That line leaves a sliver. Move it away from the edge.'};
 const minX=Math.min(...piece.points.map(p=>p[0])),made=[],kids=[];
 [A,B].forEach((poly,i)=>{
  const fold=!!piece.fold&&onFoldEdge(poly,minX),pid=uid();
  const np=syncPiece({...strip(piece),id:pid,name:`${piece.name} ${i?'B':'A'}`,fold,cut:piece.fold&&!fold?(piece.cut||1)*2:(piece.cut||1),path:pathFromPoints(poly),block:undefined});
  made.push(np);
  // keep notches / darts that fall inside this panel
  ops.filter(c=>c.parent===id&&(c.type==='notch'||(c.type==='dart'&&!opts.dropDarts))).forEach(c=>{if(pointInPoly([c.x,c.y],poly))kids.push({...c,id:uid(),parent:pid})});
  if(ops.some(c=>c.parent===id&&c.type==='grainline'))kids.push(grain(pid,poly));
  // matching balance notches along the new seam
  [1/3,2/3].forEach(t=>{const q=along(p1,p2,t);kids.push({id:uid(),parent:pid,type:'notch',x:+q[0].toFixed(2),y:+q[1].toFixed(2)})});
 });
 return {ops:[...ops.filter(o=>o.id!==id&&o.parent!==id),...made,...kids],selectId:made[0].id,names:made.map(m=>m.name)};
}
/* Slash and spread piece `id` along line a->b opening the cut by `amount` cm. */
export function spreadPiece(ops,id,a,b,amount){
 const piece=ops.find(o=>o.id===id);if(!piece)return {error:'Select a pattern piece first.'};
 if(piece.fold)return {error:'This piece is cut on the fold. Turn off "Cut on fold" in the Inspector first, then spread.'};
 const r=slashSpread(piece.points,a,b,amount);
 if(!r)return {error:'The slash line must cross the piece exactly twice (edge to edge).'};
 const np=syncPiece({...piece,path:pathFromPoints(r.pts),block:edited(piece.block)});
 const kids=ops.filter(c=>c.parent===id).map(c=>{
  if(c.type==='notch'||c.type==='annotation'){if(!r.left([c.x,c.y]))return c;const q=r.rot([c.x,c.y]);return {...c,x:q[0],y:q[1]}}
  if(c.type==='dart'||isLine(c)){const k=isLine(c)?['x1','y1','x2','y2']:['x','y','x2','y2'];if(!r.left([c[k[0]],c[k[1]]]))return c;const q1=r.rot([c[k[0]],c[k[1]]]),q2=r.rot([c[k[2]],c[k[3]]]);return {...c,[k[0]]:q1[0],[k[1]]:q1[1],[k[2]]:q2[0],[k[3]]:q2[1]}}
  return c;
 });
 return {ops:ops.map(o=>o.id===id?np:o).map(o=>kids.find(k=>k.id===o.id)||o)};
}
/* Preset split lines for the most common design seams. Returns {a,b} (a line that crosses the piece) or null. */
export function presetLine(piece,kind,edgesInfo){
 const b=bbox(piece.points);
 if(kind==='yoke'){const y=b.y+b.h*.22;return {a:[b.x-5,y],b:[b.x+b.w+5,y]}}
 if(kind==='hipband'){const y=b.y+b.h*.35;return {a:[b.x-5,y],b:[b.x+b.w+5,y]}}
 if(kind==='panel'){const x=b.x+b.w*.55;return {a:[x,b.y-5],b:[x,b.y+b.h+5]}}
 if(kind==='princess'){
  const {pts,edges}=edgesInfo,sh=edges.find(e=>/shoulder/i.test(e.name)),wa=edges.find(e=>/waist|hem/i.test(e.name));
  if(!sh||!wa)return null;
  const s=edgePoints(pts,sh),w=edgePoints(pts,wa),p=along(s[0],s[s.length-1],.5),q=along(w[0],w[w.length-1],.55);
  const dx=q[0]-p[0],dy=q[1]-p[1];return {a:[p[0]-dx*.2,p[1]-dy*.2],b:[q[0]+dx*.2,q[1]+dy*.2]};
 }
 return null;
}
export {pathPoints,edgeLength};
