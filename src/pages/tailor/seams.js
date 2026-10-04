/* Seam match checker: compares the lengths of edges that sew together. Lengths are measured along the real
   (curved) edge and reduced by any dart that closes on that edge. */
import {pieceEdges,edgeLength,edgePoints,dist,fmt} from './geometry.js';

const keyOf=o=>o.block?.id||'';
function distToPoly(p,poly){let best=1e9;for(let i=0;i<poly.length-1;i++){const a=poly[i],b=poly[i+1],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,dist(p,[a[0]+dx*t,a[1]+dy*t]))}return best}

/* Length of the selected edges of one piece, net of darts that end on them. */
export function sideLength(ops,item){
 const piece=ops.find(o=>o.id===item.pid);if(!piece)return null;
 const {pts,edges}=pieceEdges(piece);
 const chosen=edges.filter(e=>item.k!=null?e.k===item.k:(e.name||'').toLowerCase()===(item.name||'').toLowerCase());
 if(!chosen.length)return null;
 let len=0,take=0;
 for(const e of chosen){
  const ep=edgePoints(pts,e);len+=edgeLength(pts,e);
  for(const d of ops.filter(c=>c.parent===piece.id&&c.type==='dart'))if(distToPoly([d.x2,d.y2],ep)<1.2)take+=d.w||0;
 }
 const mult=item.mult??(piece.fold?2*(piece.cut||1):(piece.cut||1));
 return {gross:len*mult,net:(len-take)*mult,take:take*mult,piece,edges:chosen};
}
const total=(ops,items)=>{let net=0,take=0,hl=[];for(const it of items){const r=sideLength(ops,it);if(!r)return null;net+=r.net;take+=r.take;r.edges.forEach(e=>hl.push({pid:r.piece.id,k:e.k}))}return {net,take,hl}};

function judge(type,a,b){
 const d=b-a,ad=Math.abs(d),ratio=a?b/a:0;
 if(type==='sleeve'){
  if(d>=1.5&&d<=5)return ['ok',`Sleeve cap is ${d.toFixed(1)} cm longer than the armhole. That is normal ease.`];
  if(d>=.5&&d<1.5)return ['ease',`Only ${d.toFixed(1)} cm of cap ease. It may feel tight. Aim for 1.5 to 5 cm.`];
  if(d>5&&d<=7)return ['ease',`${d.toFixed(1)} cm of cap ease is a lot. Expect puckers unless the fabric eases well.`];
  return ['bad',d<.5?`The sleeve cap is shorter than the armhole by ${Math.abs(d).toFixed(1)} cm. It will not fit in.`:`The cap is ${d.toFixed(1)} cm longer than the armhole. Too much to ease in.`];
 }
 if(type==='sleeve-gather'){
  if(d>=4&&d<=14)return ['ok',`Gathered sleeve head: ${d.toFixed(1)} cm of fullness to gather into the armhole.`];
  return ['ease',d<4?`Only ${d.toFixed(1)} cm of fullness. It will not look puffed.`:`${d.toFixed(1)} cm of fullness is very full.`];
 }
 if(type==='waist'){
  if(ratio>=.97&&ratio<=1.03)return ['ok','The two waist edges match.'];
  if(ratio>1.03&&ratio<=1.12)return ['ease',`The lower piece is ${d.toFixed(1)} cm longer. Ease it in or add a dart.`];
  if(ratio>=1.2&&ratio<=3)return ['ok',`Gathered join: ${ratio.toFixed(1)} to 1 fullness. Gather the longer edge to fit.`];
  if(ratio<.97&&ratio>=.88)return ['ease',`The lower piece is ${Math.abs(d).toFixed(1)} cm shorter. Check you can stretch or ease it.`];
  return ['bad',`These waist edges differ by ${Math.abs(d).toFixed(1)} cm. They will not sew together without changing a piece.`];
 }
 if(ad<=.6)return ['ok','These edges match.'];
 if(ad<=1.6)return ['ease',`${ad.toFixed(1)} cm difference. Fine if you ease the longer edge in.`];
 return ['bad',`${ad.toFixed(1)} cm difference. These edges will not join cleanly.`];
}
export function evaluatePair(ops,pair,unit='cm'){
 const A=total(ops,pair.a),B=total(ops,pair.b);if(!A||!B)return null;
 const status=judge(pair.type||'seam',A.net,B.net);
 return {id:pair.id,title:pair.title,a:A.net,b:B.net,diff:B.net-A.net,status:status[0],msg:status[1],hl:[...A.hl,...B.hl],darts:A.take+B.take,custom:!!pair.custom,type:pair.type||'seam'};
}
/* Seams we can work out automatically from the block pieces on the board. */
export function autoPairs(ops){
 const by={};ops.filter(o=>o.type==='piece'&&o.block).forEach(o=>{(by[keyOf(o)]=by[keyOf(o)]||[]).push(o)});
 const one=id=>by[id]?.[0],P=[],add=(id,title,a,b,type)=>{if(a.every(x=>x.pid)&&b.every(x=>x.pid))P.push({id,title,a,b,type})};
 const bf=one('bodice-front'),bb=one('bodice-back'),sl=one('sleeve'),sf=one('skirt-front'),sb=one('skirt-back'),tf=one('trouser-front'),tb=one('trouser-back'),co=one('collar');
 const it=(p,name,mult)=>({pid:p?.id,name,...(mult!=null?{mult}:{})});
 if(bf&&bb){
  add('sh','Shoulder seam: front to back',[it(bf,'Shoulder',1)],[it(bb,'Shoulder',1)]);
  add('bs','Bodice side seam: front to back',[it(bf,'Side seam',1)],[it(bb,'Side seam',1)]);
 }
 if(bf&&bb&&sl)add('ah','Sleeve cap into armhole',[it(bf,'Armhole',1),it(bb,'Armhole',1)],[it(sl,'Sleeve cap',1)],/puff/i.test(sl.name)?'sleeve-gather':'sleeve');
 if(sf&&sb&&sf.points&&!/circle/i.test(sf.name))add('ss','Skirt side seam: front to back',[it(sf,'Side seam',1)],[it(sb,'Side seam',1)]);
 if(bf&&bb&&(sf||sb)){
  const sk=[sf,sb].filter(Boolean).map(p=>it(p,'Waist'));
  add('wa','Waist seam: bodice to skirt',[it(bf,'Waist'),it(bb,'Waist')],sk,'waist');
 }
 if(tf&&tb){
  add('ts','Trouser side seam: front to back',[it(tf,'Side seam',1)],[it(tb,'Side seam',1)]);
  add('ti','Trouser inseam: front to back',[it(tf,'Inseam',1)],[it(tb,'Inseam',1)]);
 }
 if(co&&bf&&bb)add('co','Collar to neckline',[it(bf,'Neckline'),it(bb,'Neckline')],[it(co,'Neck edge',2)]);
 return P;
}
export function allResults(ops,custom=[],unit='cm'){
 const res=[];
 for(const p of autoPairs(ops)){const r=evaluatePair(ops,p,unit);if(r)res.push(r)}
 for(const p of custom){const r=evaluatePair(ops,{...p,custom:true},unit);if(r)res.push(r)}
 return res;
}
export const edgeOptions=piece=>{const {pts,edges}=pieceEdges(piece);return edges.map(e=>({k:e.k,label:`${e.name||'Edge '+(e.k+1)} · ${edgeLength(pts,e).toFixed(1)} cm`}))};
