/* Import a Fabric Now "Basic Plan" (the numbered piece_NN_outline.svg files) onto the Tailor board.
   The outlines are in image pixels, so one real measurement sets the scale for the whole sheet. Board unit = 1 cm. */
import {mkPiece,bbox,BOARD_W,BOARD_H} from './geometry.js';

/* Piece order of the Fabric Now Basic Plan sheet (piece_01 ... piece_21). `grow` marks pieces that carry the dress length. */
export const PLAN_PIECES=[
 {n:1,name:'Front Bodice',cut:2},{n:2,name:'Back Bodice',cut:1,fold:true},{n:3,name:'Sleeve',cut:2},{n:4,name:'Sleeve',cut:2},
 {n:5,name:'Front Skirt Panel',cut:2,grow:true},{n:6,name:'Back Skirt Panel',cut:2,grow:true},
 {n:7,name:'Waist Belt / Tie',cut:1},{n:8,name:'Waist Belt / Tie',cut:1},{n:9,name:'Neckline Facing',cut:1,fold:true},
 {n:10,name:'Front Facing',cut:2},{n:11,name:'Front Facing',cut:2},{n:12,name:'Back Facing',cut:1,fold:true},
 {n:13,name:'Front Tie (Left)',cut:1},{n:14,name:'Front Tie (Right)',cut:1},{n:15,name:'Pocket',cut:2},{n:16,name:'Pocket',cut:2},
 {n:17,name:'Sleeve Cuff',cut:2},{n:18,name:'Sleeve Cuff',cut:2},{n:19,name:'Inner Belt Loop',cut:2},{n:20,name:'Inner Belt Loop',cut:2},
 {n:21,name:'Hem Facing',cut:1}
];
/* The piece number is read from the file name, e.g. piece_05_outline.svg -> 5. */
export const pieceNo=name=>{const m=/piece[_\s-]*0*(\d+)/i.exec(name||'');return m?+m[1]:null};

/* Read the polygon out of one outline SVG (M / L / Z commands, plus H / V and relative forms). Returns [[x,y],...] in pixels. */
export function parseOutlineSvg(text){
 const doc=new DOMParser().parseFromString(text,'image/svg+xml'),d=doc.querySelector('path')?.getAttribute('d');
 if(!d)return null;
 const t=d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g)||[];const pts=[];let i=0,cmd='',x=0,y=0,sx=0,sy=0;
 const nx=()=>parseFloat(t[i++]);
 while(i<t.length){
  if(/[a-zA-Z]/.test(t[i]))cmd=t[i++];
  const rel=cmd===cmd.toLowerCase(),C=cmd.toUpperCase();
  if(C==='Z'){x=sx;y=sy;continue}
  if(C==='M'||C==='L'){const a=nx(),b=nx();x=rel?x+a:a;y=rel?y+b:b;if(C==='M'){sx=x;sy=y;cmd=rel?'l':'L'}pts.push([x,y])}
  else if(C==='H'){const a=nx();x=rel?x+a:a;pts.push([x,y])}
  else if(C==='V'){const b=nx();y=rel?y+b:b;pts.push([x,y])}
  else return null; // curves are not used by the plan outlines
 }
 const clean=pts.filter((p,k)=>k===0||Math.hypot(p[0]-pts[k-1][0],p[1]-pts[k-1][1])>1e-6);
 if(clean.length>2&&Math.hypot(clean[0][0]-clean[clean.length-1][0],clean[0][1]-clean[clean.length-1][1])<1e-6)clean.pop();
 return clean.length>=3?clean:null;
}

/* Turn parsed outlines into board pieces. `cmPerPx` is the real-world scale. Pieces are packed in rows below existing work. */
export function planOps(items,cmPerPx,existing=[]){
 const placed=existing.filter(o=>o.type==='piece');
 const gap=4,startY=placed.length?Math.max(...placed.map(o=>bbox(o.points).y+bbox(o.points).h))+gap:4;
 let x=4,y=startY,rowH=0,overflow=false;const out=[];
 for(const it of items){
  const meta=PLAN_PIECES.find(p=>p.n===it.n)||{name:`Plan piece ${it.n}`,cut:1};
  const ox=Math.min(...it.pts.map(p=>p[0])),oy=Math.min(...it.pts.map(p=>p[1]));
  const pts=it.pts.map(p=>[(p[0]-ox)*cmPerPx,(p[1]-oy)*cmPerPx]),b=bbox(pts);
  if(x+b.w>BOARD_W-4&&x>4){x=4;y+=rowH+gap;rowH=0}
  if(y+b.h>BOARD_H-2)overflow=true;
  out.push(mkPiece({name:meta.name,cut:meta.cut,fold:!!meta.fold,plan:{sheet:'fabricnow-basic',n:it.n,grow:!!meta.grow}},pts.map(p=>[+(p[0]+x).toFixed(2),+(p[1]+y).toFixed(2)])));
  x+=b.w+gap;rowH=Math.max(rowH,b.h);
 }
 return {ops:out,overflow};
}
