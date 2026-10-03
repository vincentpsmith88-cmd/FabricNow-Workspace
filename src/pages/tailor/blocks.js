/* Parametric basic blocks + garment starters. All numbers are cm; 1 board unit = 1 cm.
   These are BASIC BLOCKS: always verify fit with a toile before cutting good fabric. */
import {bezier,bbox,uid,BOARD_W,BOARD_H} from './geometry.js';

export const SIZES={
 XS:{bust:82,waist:64,hip:88},S:{bust:87,waist:69,hip:93},M:{bust:92,waist:74,hip:98},L:{bust:98,waist:80,hip:104},XL:{bust:104,waist:86,hip:110}
};
export const DEFAULT_MEAS={...SIZES.M,backLength:40,skirtLength:60,sleeveLength:60,inseam:78,rise:26};
export const MEAS_FIELDS=[['bust','Bust'],['waist','Waist'],['hip','Hip'],['backLength','Back waist length'],['skirtLength','Skirt length'],['sleeveLength','Sleeve length'],['inseam','Inseam'],['rise','Rise (crotch depth)']];

const norm=(pts)=>{const b=bbox(pts);return pts.map(([x,y])=>[+(x-b.x).toFixed(2),+(y-b.y).toFixed(2)])};
const r2=v=>+v.toFixed(2);

/* Each generator returns {name,cut,fold,points,notches:[[x,y]],grain:[x1,y1,x2,y2],darts:[{x,y,x2,y2,w}]} in local coords (pre-normalised). */
function bodice(m,{back=false,len}={}){
 const bust=m.bust,neckW=bust/20+4+(back?.8:0),nd=back?2:neckW+1.5,sx=bust/8+7.5,sd=back?4:5;
 const cw=bust/4+2.5,arm=bust/8+10,ww=m.waist/4+3.5,L=len||m.backLength,hemW=Math.max(ww,m.hip/4+3);
 const neck=back?[[0,nd],...bezier([0,nd],[neckW*.5,nd],[neckW*.85,nd*.3],[neckW,0],8)]:[[0,nd],...bezier([0,nd],[neckW*.55,nd],[neckW,nd*.55],[neckW,0],10)];
 const armhole=bezier([sx,sd],[sx-2,sd+(arm-sd)*.5],[cw-4,arm-.8],[cw,arm],12);
 const pts=[...neck,[sx,sd],...armhole,[ww,m.backLength]];
 if(L>m.backLength)pts.push([hemW,L],[0,L]);else pts.push([0,L]);
 return {name:back?'Back Bodice':'Front Bodice',cut:1,fold:true,points:pts,notches:[[cw,arm],[(neckW+sx)/2,(sd)/2]],grain:[cw*.35,arm*.55,cw*.35,L-4],
  darts:back?[]:[{x:ww*.62,y:m.backLength-14,x2:ww*.62,y2:m.backLength,w:2.5}]};
}
function sleeve(m){
 const bust=m.bust,arm=bust/8+10,bw=bust/3+2,capH=arm*.62,L=m.sleeveLength,wr=bust/9+9.5,mid=bw/2;
 const left=bezier([0,capH],[bw*.1,capH*.35],[bw*.3,0],[mid,0],10);
 const right=bezier([mid,0],[bw*.7,0],[bw*.9,capH*.35],[bw,capH],10);
 const pts=[[0,capH],...left,...right,[mid+wr/2,L],[mid-wr/2,L]];
 return {name:'Sleeve',cut:2,fold:false,points:pts,notches:[[mid,0],[0,capH],[bw,capH]],grain:[mid,capH+3,mid,L-4],darts:[]};
}
function skirt(m,{back=false}={}){
 const ws=m.waist/4+1+(back?3:2.5),hw=m.hip/4+2,L=m.skirtLength,hipY=20;
 const pts=[[0,0],[ws,0],[hw,hipY],[hw,L],[0,L]];
 return {name:back?'Back Skirt':'Front Skirt',cut:back?2:1,fold:!back,points:pts,notches:[[hw,hipY]],grain:[hw*.45,hipY+4,hw*.45,L-4],
  darts:[{x:ws*.5,y:back?12:10,x2:ws*.5,y2:0,w:back?3:2.5}]};
}
function trouser(m,{back=false}={}){
 const H=m.hip,hipW=H/4+(back?2.5:1.5),wW=m.waist/4+(back?4.5:3),ext=back?H/10+1.5:H/16,R=m.rise,L=R+m.inseam,hemW=back?21:19,hipY=20;
 const xc=(hipW+ext)/2,cx=hipW;
 const top=back?[[hipW-wW,0],[cx+2.5,-1.5]]:[[hipW-wW,0],[cx,0]];
 const crotch=bezier([back?cx:cx,R-7],[cx,R-2],[cx+ext*.55,R],[cx+ext,R],10);
 const pts=[...top,[cx,R-7],...crotch,[xc+hemW/2,L],[xc-hemW/2,L],[0,hipY]];
 return {name:back?'Back Trouser':'Front Trouser',cut:2,fold:false,points:pts,notches:[[cx+ext,R],[0,hipY]],grain:[xc,R+4,xc,L-5],
  darts:back?[{x:(hipW-wW)+wW*.5,y:11,x2:(hipW-wW)+wW*.5,y2:0,w:2.5}]:[]};
}
const rect=(name,w,h,cut,extra={})=>({name,cut,fold:false,points:[[0,0],[w,0],[w,h],[0,h]],notches:[],grain:[w/2,3,w/2,h-3],darts:[],...extra});
function collar(m){const neckC=(m.bust/20+4)*2+(m.bust/20+4+1.5)*2-4,len=neckC/2;return {name:'Collar',cut:2,fold:true,points:[[0,0],[len,0],[len+3,7.5],[0,6.5]],notches:[[len,0]],grain:[len*.5,1.5,len*.5,5.5],darts:[]}}

export const BLOCKS=[
 {id:'bodice-front',label:'Front bodice',make:m=>bodice(m)},
 {id:'bodice-back',label:'Back bodice',make:m=>bodice(m,{back:true})},
 {id:'sleeve',label:'Sleeve',make:sleeve},
 {id:'skirt-front',label:'Front skirt',make:m=>skirt(m)},
 {id:'skirt-back',label:'Back skirt',make:m=>skirt(m,{back:true})},
 {id:'trouser-front',label:'Front trouser',make:m=>trouser(m)},
 {id:'trouser-back',label:'Back trouser',make:m=>trouser(m,{back:true})},
 {id:'waistband',label:'Waistband',make:m=>rect('Waistband',m.waist+4,8,1,{grain:[3,6.5,m.waist+1,6.5]})},
 {id:'collar',label:'Collar',make:collar},
 {id:'cuff',label:'Cuff',make:m=>rect('Cuff',m.bust/9+9.5+4,12,2)},
 {id:'pocket',label:'Pocket bag',make:()=>rect('Pocket bag',16,19,2,{grain:[13,3,13,16]})}
];
export const STARTERS=[
 {id:'blouse',label:'Blouse',blocks:['bodice-front','bodice-back','sleeve','collar'],len:m=>m.backLength+24},
 {id:'dress',label:'Dress',blocks:['bodice-front','bodice-back','skirt-front','skirt-back','sleeve']},
 {id:'skirt',label:'Skirt',blocks:['skirt-front','skirt-back','waistband']},
 {id:'trousers',label:'Trousers',blocks:['trouser-front','trouser-back','waistband','pocket']}
];

/* Build board ops (piece + child notches/grainline/darts) for a block, at origin (0,0). */
export function buildBlock(id,m,opts={}){
 const def=BLOCKS.find(b=>b.id===id);if(!def)return [];
 let g=id==='bodice-front'?bodice(m,{len:opts.len}):id==='bodice-back'?bodice(m,{back:true,len:opts.len}):def.make(m);
 const b=bbox(g.points),dx=-b.x,dy=-b.y,pid=uid(),pts=norm(g.points),nb=bbox(pts);
 const ops=[{id:pid,type:'piece',name:g.name,cut:g.cut,fold:!!g.fold,allowance:1,points:pts,...nb}];
 g.notches.forEach(([x,y])=>ops.push({id:uid(),parent:pid,type:'notch',x:r2(x+dx),y:r2(y+dy)}));
 if(g.grain)ops.push({id:uid(),parent:pid,type:'grainline',x1:r2(g.grain[0]+dx),y1:r2(g.grain[1]+dy),x2:r2(g.grain[2]+dx),y2:r2(g.grain[3]+dy),allowance:0});
 g.darts.forEach(d=>ops.push({id:uid(),parent:pid,type:'dart',x:r2(d.x+dx),y:r2(d.y+dy),x2:r2(d.x2+dx),y2:r2(d.y2+dy),w:d.w}));
 return ops;
}
const groupBox=(ops,pid)=>{const p=ops.find(o=>o.id===pid);return bbox(p.points)};
/* First-fit placement of whole piece groups onto free board space. */
export function placeGroups(groups,existing){
 const occupied=existing.filter(o=>o.type==='piece').map(o=>bbox(o.points));
 const out=[];let overflow=false;
 for(const g of groups){
  const piece=g.find(o=>o.type==='piece'),b=bbox(piece.points),M=4;
  let spot=null;
  for(let y=6;y+b.h<=BOARD_H-4&&!spot;y+=2)for(let x=6;x+b.w<=BOARD_W-4;x+=2){
   if(!occupied.some(r=>x<r.x+r.w+M&&x+b.w+M>r.x&&y<r.y+r.h+M&&y+b.h+M>r.y)){spot={x,y};break}
  }
  if(!spot){overflow=true;spot={x:6,y:BOARD_H-b.h-4<0?0:BOARD_H-b.h-4}}
  occupied.push({x:spot.x,y:spot.y,w:b.w,h:b.h});
  const dx=spot.x-b.x,dy=spot.y-b.y;
  out.push(...g.map(o=>{const r={...o};if(o.points){r.points=o.points.map(([x,y])=>[+(x+dx).toFixed(2),+(y+dy).toFixed(2)]);const nb=bbox(r.points);Object.assign(r,nb)}['x','y','x1','y1','x2','y2'].forEach(k=>{if(typeof o[k]==='number'&&!o.points)r[k]=+(o[k]+(k[0]==='x'?dx:dy)).toFixed(2)});return r}));
 }
 return {ops:out,overflow};
}
export function starterOps(id,m,existing){
 const s=STARTERS.find(x=>x.id===id);
 const groups=s.blocks.map(bid=>buildBlock(bid,m,{len:s.len?s.len(m):undefined}));
 return placeGroups(groups,existing);
}
export function blockOps(id,m,existing){return placeGroups([buildBlock(id,m)],existing)}

/* Best-effort mapping from a workspace project's free-form measurements. */
export function mapProjectMeasurements(src){
 const out={};if(!src||typeof src!=='object')return out;
 for(const [k,v] of Object.entries(src)){
  const n=parseFloat(typeof v==='object'?v?.value:v);if(!isFinite(n)||n<=0)continue;const key=k.toLowerCase();
  if(/bust|chest/.test(key))out.bust=n;else if(/waist/.test(key)&&/length|back/.test(key))out.backLength=n;else if(/waist/.test(key))out.waist=n;
  else if(/hip/.test(key))out.hip=n;else if(/sleeve/.test(key))out.sleeveLength=n;else if(/inseam/.test(key))out.inseam=n;else if(/rise|crotch/.test(key))out.rise=n;else if(/skirt/.test(key))out.skirtLength=n;
 }
 return out;
}
