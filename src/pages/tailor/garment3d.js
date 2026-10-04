/* Reads the pattern pieces on a board and describes the garment as rings of circumference against height (cm),
   one for the bodice and one for the skirt. components/garmentFit.js fits these onto a 3D fit model's real body.
   Supports bodice (to the underarm) and skirt pieces. */
import {pieceEdges} from './geometry.js';

/* Horizontal extent of the polygon at height y (max x - min x of the crossings). */
function crossings(pts,y){
 const xs=[];
 for(let i=0;i<pts.length;i++){const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%pts.length];
  if((y1<=y&&y2>y)||(y2<=y&&y1>y))xs.push(x1+(x2-x1)*(y-y1)/(y2-y1))}
 return xs;
}
/* Full width this piece contributes around the garment at height y. */
const topY=p=>Math.min(...p.points.map(q=>q[1]));
/* y is LOCAL: measured down from the top of the piece, so pieces placed anywhere on the board line up. */
function widthAt(p,ly){
 const xs=crossings(p.points,topY(p)+ly);if(!xs.length)return 0;
 const maxX=Math.max(...xs),minX=Math.min(...xs),fold=Math.min(...p.points.map(q=>q[0]));
 return p.fold?2*(maxX-fold)*(p.cut||1):(maxX-minX)*(p.cut||1);
}
const one=(ops,id)=>ops.find(o=>o.type==='piece'&&o.block?.id===id);
const yRange=p=>{const ys=p.points.map(q=>q[1]),t=Math.min(...ys);return [0,Math.max(...ys)-t]};
const sample=(y0,y1,n,f)=>Array.from({length:n+1},(_,i)=>{const y=y0+(y1-y0)*i/n;return {h:y-y0,C:f(Math.min(y,y1-1e-3))}});

export function buildProfile(ops){
 const bf=one(ops,'bodice-front'),bb=one(ops,'bodice-back'),sf=one(ops,'skirt-front'),sb=one(ops,'skirt-back');
 const tubes=[],notes=[];let drop=0,waistC=null;
 if(bf&&bb){
  const {pts,edges}=pieceEdges(bf),ah=edges.find(e=>/armhole/i.test(e.name)),arm=(ah?pts[ah.i1][1]:topY(bf)+20)-topY(bf);
  const [,bot]=yRange(bf),waist=bot,n=24;
  const prof=sample(arm,waist,n,y=>widthAt(bf,y)+widthAt(bb,y));
  // where the waist falls on this pattern: the end of the first side-seam edge when the bodice runs below the waist, else its bottom
  const sides=edges.filter(e=>/side seam/i.test(e.name)),wy=sides.length>1?pts[sides[0].i1][1]-topY(bf):waist;
  tubes.push({kind:'torso',pieceId:bf.id,rings:prof,top:0,waistH:Math.max(1,Math.min(wy,bot)-arm)});drop=waist-arm;waistC=prof[prof.length-1].C;
 }
 const skirts=[sf,sb].filter(Boolean);
 if(skirts.length){
  const lead=sf||sb,[y0,y1]=yRange(lead),L=y1-y0,n=30;let rings;
  if(/circle/i.test(lead.name)){ // circle skirt: waist ring -> hem ring of a hanging cone
   const R=Math.max(...lead.points.map(q=>q[0]))-Math.min(...lead.points.map(q=>q[0])),r=waistC?waistC/(2*Math.PI):R*.2,H=Math.max(10,(R-r)*.92);
   rings=Array.from({length:n+1},(_,i)=>{const t=i/n;return {h:H*t,C:2*Math.PI*(r+(R-r)*t)}});
  }else{
   rings=sample(y0,y1,n,y=>skirts.reduce((t,p)=>t+widthAt(p,y),0));
   const top=rings[0].C,ref=waistC||top;
   if(top>ref*1.25){ // gathered: hangs from the waist, then opens up
    const hemC=rings[rings.length-1].C;rings=rings.map((r,i)=>{const t=i/n,k=t*t*(3-2*t);return {h:r.h,C:ref*1.05+(hemC-ref*1.05)*Math.min(1,k*1.15)}});notes.push('Gathered skirt shown hanging from the waist.');
   }
  }
  tubes.push({kind:'skirt',pieceId:lead.id,rings,top:drop});
 }
 const height=tubes.reduce((m,t)=>Math.max(m,t.top+t.rings[t.rings.length-1].h),0);
 return {tubes,height,hasTorso:!!(bf&&bb),notes};
}
function pieceWaistY(p){const {pts,edges}=pieceEdges(p),w=edges.find(e=>/^waist$/i.test(e.name)),t=topY(p);return (w?Math.max(pts[w.i0][1],pts[w.i1===0?pts.length-1:w.i1][1]):Math.max(...p.points.map(q=>q[1])))-t}
