/* Cutting layout: shelf-packs piece footprints (bounding boxes incl. seam allowance) onto a fabric width.
   Grain runs along the fabric length (Y). Estimate only — real marker-making can usually do better. */
import {bbox,polyArea,fullOutline,saPoints} from './geometry.js';

export function computeLayout(ops,{fabricW,withAllowance=true,rotate=false,gap=1}){
 const items=[];
 for(const o of ops.filter(x=>x.type==='piece')){
  const outline=fullOutline(o),b=bbox(outline),a=withAllowance?(o.allowance??1):0;
  const w=b.w+2*a,h=b.h+2*a,area=polyArea(outline);
  for(let i=0;i<Math.max(1,o.cut||1);i++)items.push({id:o.id,name:o.name,copy:i+1,outline,b,a,w,h,area,piece:o});
 }
 items.sort((p,q)=>q.h-p.h);
 const shelves=[],placed=[],unplaced=[];
 for(const it of items){
  let w=it.w,h=it.h,rot=false;
  if(w>fabricW){if(rotate&&h<=fabricW){[w,h]=[h,w];rot=true}else{unplaced.push(it);continue}}
  let shelf=shelves.find(s=>s.x+w<=fabricW&&h<=s.h+1e-6);
  if(!shelf){shelf={y:shelves.reduce((t,s)=>t+s.h+gap,0),h,x:0};shelves.push(shelf)}
  placed.push({...it,x:shelf.x,y:shelf.y,w,h,rot});
  shelf.x+=w+gap;
 }
 const length=shelves.length?shelves.reduce((t,s)=>t+s.h,0)+gap*(shelves.length-1):0;
 const used=placed.reduce((t,p)=>t+p.area,0);
 return {placed,unplaced,length,efficiency:length?used/(fabricW*length):0,fabricW,count:items.length};
}
/* Polygon points of a placed item in layout space. */
export function placedShape(p){
 let pts=p.outline.map(([x,y])=>[x-p.b.x+p.a,y-p.b.y+p.a]);
 let sa=null;
 if(p.a>0){const s=saPoints({...p.piece,points:p.outline,fold:false,allowance:p.a});if(s)sa=s.map(([x,y])=>[x-p.b.x+p.a,y-p.b.y+p.a])}
 if(p.rot){const W=p.b.h+2*p.a;const rot=q=>q.map(([x,y])=>[y,W-x]);pts=rot(pts);sa=sa&&rot(sa)}
 const mv=q=>q.map(([x,y])=>[x+p.x,y+p.y]);
 return {pts:mv(pts),sa:sa&&mv(sa)};
}
export function layoutSvg(layout,title='Cutting layout'){
 const W=layout.fabricW,H=Math.max(layout.length,10),hue=i=>`hsl(${(i*53)%360} 70% 55%)`;
 const ids=[...new Set(layout.placed.map(p=>p.id))];
 const shapes=layout.placed.map(p=>{const s=placedShape(p),c=hue(ids.indexOf(p.id)),f=q=>q.map(v=>v.map(n=>n.toFixed(2)).join(',')).join(' ');const cx=p.x+p.w/2,cy=p.y+p.h/2;return `<polygon points="${f(s.pts)}" fill="${c}" fill-opacity=".22" stroke="${c}" stroke-width=".4"/>${s.sa?`<polygon points="${f(s.sa)}" fill="none" stroke="${c}" stroke-width=".25" stroke-dasharray="1.2 .9"/>`:''}<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="2.4" text-anchor="middle" fill="#222">${String(p.name).replace(/[<&]/g,'')}</text>`}).join('');
 return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}cm" height="${H.toFixed(1)}cm" viewBox="0 0 ${W} ${H.toFixed(1)}"><title>${title}</title><rect width="100%" height="100%" fill="#fff" stroke="#999" stroke-width=".4"/>${shapes}</svg>`;
}
