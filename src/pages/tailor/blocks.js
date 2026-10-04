/* Parametric basic blocks, style variations and garment starters. All numbers are cm; 1 board unit = 1 cm.
   Blocks are BASIC BLOCKS: always verify fit with a toile before cutting good fabric. */
import {bbox,uid,BOARD_W,BOARD_H,syncPiece,shift,pathPoints,edgeLength} from './geometry.js';

export const SIZES={XS:{bust:82,waist:64,hip:88},S:{bust:87,waist:69,hip:93},M:{bust:92,waist:74,hip:98},L:{bust:98,waist:80,hip:104},XL:{bust:104,waist:86,hip:110}};
export const DEFAULT_MEAS={...SIZES.M,backLength:40,skirtLength:60,sleeveLength:60,inseam:78,rise:26};
export const MEAS_FIELDS=[['bust','Bust'],['waist','Waist'],['hip','Hip'],['backLength','Back waist length'],['skirtLength','Skirt length'],['sleeveLength','Sleeve length'],['inseam','Inseam'],['rise','Rise (crotch depth)']];

export const DEFAULT_STYLE={neckline:'round',fit:'fitted',bodiceLen:'waist',sleeve:'set-in',sleeveLen:'full',skirt:'a-line',skirtLen:'knee',flare:50,leg:'straight',legLen:'full'};
export const STYLE_GROUPS=[
 {family:'bodice',label:'Bodice',fields:[
  {k:'neckline',label:'Neckline',opts:[['round','Round'],['scoop','Scoop'],['v-neck','V-neck'],['square','Square'],['sweetheart','Sweetheart'],['boat','Boat']]},
  {k:'fit',label:'Fit',opts:[['fitted','Fitted'],['relaxed','Relaxed'],['loose','Loose']]},
  {k:'bodiceLen',label:'Length',opts:[['waist','To waist'],['hip','To hip'],['tunic','Tunic']]}]},
 {family:'sleeve',label:'Sleeve',fields:[
  {k:'sleeve',label:'Style',opts:[['set-in','Set-in'],['puff','Puff'],['bell','Bell'],['bishop','Bishop'],['cap','Cap']]},
  {k:'sleeveLen',label:'Length',opts:[['short','Short'],['elbow','Elbow'],['three-quarter','¾'],['full','Full']]}]},
 {family:'skirt',label:'Skirt',fields:[
  {k:'skirt',label:'Style',opts:[['pencil','Pencil'],['straight','Straight'],['a-line','A-line'],['flared','Flared'],['circle','Circle'],['gathered','Gathered'],['mermaid','Mermaid']]},
  {k:'skirtLen',label:'Length',opts:[['mini','Mini'],['knee','Knee'],['midi','Midi'],['maxi','Maxi'],['custom','Measured']]},
  {k:'flare',label:'Flare / fullness',range:[0,100]}]},
 {family:'trouser',label:'Trousers',fields:[
  {k:'leg',label:'Leg',opts:[['straight','Straight'],['wide','Wide'],['tapered','Tapered'],['flared','Flared']]},
  {k:'legLen',label:'Length',opts:[['full','Full'],['ankle','Ankle'],['cropped','Cropped'],['shorts','Shorts']]}]}
];
const r2=v=>+v.toFixed(2);
const bz=(p0,c1,c2,p,t)=>{const u=1-t;return [u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p[0],u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p[1]]};
class PB{constructor(x,y,closeName){this.path={start:[x,y],segs:[],closeName};this.cur=[x,y]}
 L(x,y,name){this.path.segs.push({p:[x,y],name});this.cur=[x,y];return this}
 C(c1,c2,p,name){this.path.segs.push({c1,c2,p,name});this.cur=p;return this}}

const edgeSum=(g,name)=>{const {pts,edges}=pathPoints(g.path);return edges.filter(e=>(e.name||'')===name).reduce((t,e)=>t+edgeLength(pts,e),0)};
const ease=st=>({fitted:2.5,relaxed:5,loose:8}[st.fit]??2.5);
function neck(m,st,back){
 const nk=st.neckline,n0=m.bust/20+4;let nW=n0+(back?.8:0),nd=back?2:n0+1.5;
 if(nk==='scoop'){nW=n0+1.5+(back?.5:0);nd=back?3.5:n0+5.5}
 if(nk==='v-neck'){nW=n0+.5+(back?.8:0);nd=back?2:n0+9}
 if(nk==='square'){nW=n0+1.5+(back?.5:0);nd=back?3:n0+4}
 if(nk==='sweetheart'){nW=n0+3.5;nd=back?3:n0+4}
 if(nk==='boat'){nW=n0+5;nd=back?3.5:4.5}
 return {nW,nd,nk};
}
/* Every generator returns {name,cut,fold,path,notches,grain,darts}. */
function bodice(m,st,back){
 const bust=m.bust,e=ease(st),cw=bust/4+e,arm=bust/8+10,BL=m.backLength,sdF=5,sdB=4.5;
 const L=BL+({waist:0,hip:20,tunic:36}[st.bodiceLen]||0),hemW=m.hip/4+3+(e-2.5);
 const {nW,nd,nk}=neck(m,st,back),sd=back?sdB:sdF;
 const dartW=st.fit==='fitted'?2.5:st.fit==='relaxed'?1.5:0;
 const fN=neck(m,st,false),sxF=bust/8+7.5,shF=Math.hypot(sxF-fN.nW,sdF);
 const sx=back?nW+Math.sqrt(Math.max(1,(shF+.4)**2-sdB**2)):sxF; // back shoulder is 0.4 cm longer than the front (ease)
 const ww=(m.waist+4)/4+dartW+(e-2.5)*.8; // front and back share the side-seam point; equal darts take up the difference
 const b=new PB(0,nd,back?'Centre back (fold)':'Centre front (fold)');
 if(back||nk==='round'||nk==='scoop'||nk==='boat'){
  if(back)b.C([nW*.5,nd],[nW*.85,nd*.3],[nW,0],'Neckline');
  else b.C([nW*.55,nd],[nW,nd*.55],[nW,0],'Neckline');
 }else if(nk==='v-neck')b.L(nW,0,'Neckline');
 else if(nk==='square'){b.L(nW,nd,'Neckline');b.L(nW,0,'Neckline')}
 else{b.C([nW*.1,nd-2],[nW*.25,nd-3.8],[nW*.5,nd-3.6],'Neckline');b.C([nW*.75,nd-3.4],[nW,nd*.4],[nW,0],'Neckline')}
 b.L(sx,sd,'Shoulder');
 const A0=[sx,sd],A1=[sx-2,sd+(arm-sd)*.5],A2=[cw-4,arm-.8],A3=[cw,arm];
 b.C(A1,A2,A3,'Armhole');
 b.L(ww,BL,'Side seam');
 if(L>BL){b.L(hemW,L,'Side seam');b.L(0,L,'Hem')}else b.L(0,L,'Waist');
 return {name:back?'Back Bodice':'Front Bodice',cut:1,fold:true,path:b.path,notches:[A3,bz(A0,A1,A2,A3,.5),[(nW+sx)/2,sd/2]],grain:[cw*.35,arm*.55,cw*.35,L-4],
  darts:dartW&&L<=BL?[{x:ww*(back?.55:.62),y:BL-(back?13:14),x2:ww*(back?.55:.62),y2:BL,w:dartW}]:[]};
}
function sleeve(m,st){
 const bust=m.bust,arm=bust/8+10,puff=st.sleeve==='puff';let bw=bust/3+2+(puff?5:0);
 const lens={short:20,elbow:32,'three-quarter':46,full:m.sleeveLength};let L=st.sleeve==='cap'?9:Math.min(lens[st.sleeveLen]||m.sleeveLength,m.sleeveLength);
 // size the cap so it is a little longer than the front + back armholes (ease), as a pattern maker would
 const aLen=edgeSum(bodice(m,st,false),'Armhole')+edgeSum(bodice(m,st,true),'Armhole'),want=aLen+(puff?8:3);
 const capLen=h=>{const {pts}=pathPoints({start:[0,h],segs:[{c1:[bw*.1,h*.35],c2:[bw*.3,0],p:[bw/2,0]},{c1:[bw*.7,0],c2:[bw*.9,h*.35],p:[bw,h]}]});let t=0;for(let i=0;i<pts.length-1;i++)t+=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);return t};
 let lo=2,hi=arm*1.4;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(capLen(mid)<want)lo=mid;else hi=mid}
 const capH=(lo+hi)/2,wr=bust/9+9.5;let hemW=bw-(bw-wr)*Math.min(1,L/m.sleeveLength);
 if(puff)hemW=bw*.85;
 if(st.sleeve==='bell')hemW=bw*1.35+L/60*14;
 if(st.sleeve==='bishop'){L+=5;hemW=bw*1.1}
 if(st.sleeve==='cap')hemW=bw*.95;
 L=Math.max(L,capH+(st.sleeve==='cap'?7:6));hemW=Math.max(hemW,bw*.7);
 const mid=bw/2,b=new PB(0,capH,'Underarm seam');
 b.C([bw*.1,capH*.35],[bw*.3,0],[mid,0],'Sleeve cap');b.C([bw*.7,0],[bw*.9,capH*.35],[bw,capH],'Sleeve cap');
 b.L(mid+hemW/2,L,'Underarm seam');b.L(mid-hemW/2,L,'Hem');
 return {name:`Sleeve${st.sleeve==='set-in'?'':' ('+st.sleeve+')'}`,cut:2,fold:false,path:b.path,notches:[[mid,0],[0,capH],[bw,capH]],grain:L-4>capH+3?[mid,capH+3,mid,L-4]:null,darts:[]};
}
function skirt(m,st,back){
 const lens={mini:45,knee:58,midi:75,maxi:105,custom:m.skirtLength};let L=lens[st.skirtLen]||m.skirtLength;
 const ws=m.waist/4+1+(back?3:2.5)+(ease(st)-2.5)*.8,hw=m.hip/4+2,hipY=20,fl=st.flare/100,sty=st.skirt;
 if(sty==='circle'){
  if(back)return null;
  const r=(m.waist+4+3.2*(ease(st)-2.5))/(2*Math.PI);L=Math.min(L,84-r);const R=r+L,k=.5523,b=new PB(0,-R,'Fold');
  b.C([R*k,-R],[R,-R*k],[R,0],'Hem');b.C([R,R*k],[R*k,R],[0,R],'Hem');b.L(0,r,'Fold');b.C([r*k,r],[r,r*k],[r,0],'Waist');b.C([r,-r*k],[r*k,-r],[0,-r],'Waist');
  return {name:'Circle Skirt',cut:1,fold:true,path:b.path,notches:[[R,0]],grain:null,darts:[]};
 }
 if(sty==='gathered'){
  const W=(m.hip/2+3)*(1.3+fl*1.2),b=new PB(0,0,'Side seam');
  b.L(W,0,'Waist');b.L(W,L,'Side seam');b.L(0,L,'Hem');
  return {name:back?'Back Skirt':'Front Skirt',cut:1,fold:false,path:b.path,notches:[[W/4,0],[W/2,0],[W*.75,0]],grain:[W/2,6,W/2,L-4],darts:[]};
 }
 const b=new PB(0,0,back?'Centre back':'Centre front (fold)');
 b.L(ws,0,'Waist');b.L(hw,hipY,'Side seam');
 if(sty==='mermaid'){b.C([hw,L*.5],[hw*.95,L*.58],[hw*.92,L*.66],'Side seam');b.C([hw*.95,L*.8],[hw*1.5,L*.88],[hw*1.55,L],'Side seam')}
 else if(sty==='flared'){const ex=8+fl*28;b.C([hw,hipY+(L-hipY)*.35],[hw+ex*.45,L*.68],[hw+ex,L],'Side seam')}
 else{b.L(sty==='pencil'?hw*.88:sty==='straight'?hw:hw+fl*14,L,'Side seam')}
 b.L(0,L,'Hem');
 const dw=back?3:2.5;
 return {name:back?'Back Skirt':'Front Skirt',cut:back?2:1,fold:!back,path:b.path,notches:[[hw,hipY]],grain:[hw*.45,hipY+4,hw*.45,L-4],darts:[{x:ws*.5,y:back?12:10,x2:ws*.5,y2:0,w:dw}]};
}
function trouser(m,st,back){
 const H=m.hip,hipW=H/4+(back?2.5:1.5),wW=m.waist/4+(back?4.5:3),ext=back?H/10+1.5:H/16,R=m.rise,hipY=20;
 const leg={straight:back?21:19,wide:back?30:28,tapered:back?16:14,flared:back?28:26}[st.leg];
 let L=R+m.inseam+({full:0,ankle:-6,cropped:-18,shorts:-(m.inseam-18)}[st.legLen]||0);
 const cx=hipW,xc=(hipW+ext)/2,hemW=st.legLen==='shorts'?(hipW+ext)*.95:leg;
 const b=new PB(hipW-wW,0,'Side seam');
 if(back)b.L(cx+2.5,-1.5,'Waist');else b.L(cx,0,'Waist');
 b.L(cx,R-7,'Crotch');b.C([cx,R-2],[cx+ext*.55,R],[cx+ext,R],'Crotch');
 b.L(xc+hemW/2,L,'Inseam');b.L(xc-hemW/2,L,'Hem');b.L(0,hipY,'Side seam');
 return {name:back?'Back Trouser':'Front Trouser',cut:2,fold:false,path:b.path,notches:[[cx+ext,R],[0,hipY]],grain:[xc,R+4,xc,L-5],
  darts:back?[{x:(hipW-wW)+wW*.5,y:11,x2:(hipW-wW)+wW*.5,y2:0,w:2.5}]:[]};
}
function rect(name,w,h,cut,extra={}){const b=new PB(0,0,'');b.L(w,0,'').L(w,h,'').L(0,h,'');return {name,cut,fold:false,path:b.path,notches:[],grain:[w/2,3,w/2,h-3],darts:[],...extra}}
function collar(m,st){
 const len=(edgeSum(bodice(m,st,false),'Neckline')+edgeSum(bodice(m,st,true),'Neckline'))*.99,b=new PB(0,0,'Fold');
 b.L(len,0,'Neck edge').L(len+3,7.5,'Outer edge').L(0,6.5,'Outer edge');
 return {name:'Collar',cut:2,fold:true,path:b.path,notches:[[len,0]],grain:[len*.5,1.5,len*.5,5.5],darts:[]};
}
export const BLOCKS=[
 {id:'bodice-front',label:'Front bodice',family:'bodice',make:(m,s)=>bodice(m,s,false)},
 {id:'bodice-back',label:'Back bodice',family:'bodice',make:(m,s)=>bodice(m,s,true)},
 {id:'sleeve',label:'Sleeve',family:'sleeve',make:sleeve},
 {id:'skirt-front',label:'Front skirt',family:'skirt',make:(m,s)=>skirt(m,s,false)},
 {id:'skirt-back',label:'Back skirt',family:'skirt',make:(m,s)=>skirt(m,s,true)},
 {id:'trouser-front',label:'Front trouser',family:'trouser',make:(m,s)=>trouser(m,s,false)},
 {id:'trouser-back',label:'Back trouser',family:'trouser',make:(m,s)=>trouser(m,s,true)},
 {id:'waistband',label:'Waistband',make:m=>rect('Waistband',m.waist+4,8,1,{grain:[3,6.5,m.waist+1,6.5]})},
 {id:'collar',label:'Collar',family:'bodice',make:collar},
 {id:'cuff',label:'Cuff',make:m=>rect('Cuff',m.bust/9+9.5+4,12,2)},
 {id:'pocket',label:'Pocket bag',make:()=>rect('Pocket bag',16,19,2,{grain:[13,3,13,16]})}
];
export const STARTERS=[
 {id:'blouse',label:'Blouse',blocks:['bodice-front','bodice-back','sleeve','collar'],bodiceLen:'hip'},
 {id:'dress',label:'Dress',blocks:['bodice-front','bodice-back','skirt-front','skirt-back','sleeve']},
 {id:'skirt',label:'Skirt',blocks:['skirt-front','skirt-back','waistband']},
 {id:'trousers',label:'Trousers',blocks:['trouser-front','trouser-back','waistband','pocket']}
];

/* Build board ops (piece + notches/grainline/darts) for a block at the origin. Returns [] when a style has no such piece. */
export function buildBlock(id,m,style=DEFAULT_STYLE,over={}){
 const def=BLOCKS.find(b=>b.id===id);if(!def)return [];
 const st={...DEFAULT_STYLE,...style,...over},g=def.make(m,st);if(!g)return [];
 const {pts}=pathPoints(g.path),b=bbox(pts),dx=-b.x,dy=-b.y,pid=uid();
 const piece=shift(syncPiece({id:pid,type:'piece',name:g.name,cut:g.cut,fold:!!g.fold,allowance:1,path:g.path,block:{id,family:def.family||null}}),dx,dy);
 const ops=[syncPiece(piece)];
 g.notches.forEach(([x,y])=>ops.push({id:uid(),parent:pid,type:'notch',x:r2(x+dx),y:r2(y+dy)}));
 if(g.grain)ops.push({id:uid(),parent:pid,type:'grainline',x1:r2(g.grain[0]+dx),y1:r2(g.grain[1]+dy),x2:r2(g.grain[2]+dx),y2:r2(g.grain[3]+dy),allowance:0});
 g.darts.forEach(d=>ops.push({id:uid(),parent:pid,type:'dart',x:r2(d.x+dx),y:r2(d.y+dy),x2:r2(d.x2+dx),y2:r2(d.y2+dy),w:d.w}));
 return ops;
}
/* First-fit placement of whole piece groups onto free board space. */
export function placeGroups(groups,existing){
 const occupied=existing.filter(o=>o.type==='piece').map(o=>bbox(o.points)),out=[];let overflow=false;
 for(const g of groups){
  const piece=g.find(o=>o.type==='piece');if(!piece)continue;
  const b=bbox(piece.points),M=4;let spot=null;
  for(let y=6;y+b.h<=BOARD_H-4&&!spot;y+=2)for(let x=6;x+b.w<=BOARD_W-4;x+=2){
   if(!occupied.some(r=>x<r.x+r.w+M&&x+b.w+M>r.x&&y<r.y+r.h+M&&y+b.h+M>r.y)){spot={x,y};break}
  }
  if(!spot){overflow=true;spot={x:6,y:Math.max(0,BOARD_H-b.h-4)}}
  occupied.push({x:spot.x,y:spot.y,w:b.w,h:b.h});
  const dx=spot.x-b.x,dy=spot.y-b.y;out.push(...g.map(o=>shift(o,dx,dy)));
 }
 return {ops:out,overflow};
}
export function starterOps(id,m,existing,style=DEFAULT_STYLE){
 const s=STARTERS.find(x=>x.id===id);
 return placeGroups(s.blocks.map(bid=>buildBlock(bid,m,style,s.bodiceLen?{bodiceLen:s.bodiceLen}:{})),existing);
}
export const blockOps=(id,m,existing,style=DEFAULT_STYLE)=>placeGroups([buildBlock(id,m,style)],existing);

/* Rebuild every block piece on the board with new measurements / style, keeping position, id and user settings. */
export function restyleAll(ops,m,style){
 const out=[],drop=new Set();
 for(const o of ops){
  if(o.type!=='piece'||!o.block||o.block.edited){continue}
  const g=buildBlock(o.block.id,m,style);
  if(!g.length){drop.add(o.id);continue}
  const np=g[0],b0=bbox(o.points),b1=bbox(np.points),dx=b0.x-b1.x,dy=b0.y-b1.y;
  const moved=g.map(x=>shift(x,dx,dy)),piece=moved[0];
  out.push({oldId:o.id,piece:{...piece,id:o.id,allowance:o.allowance??1,fabric:o.fabric},kids:moved.slice(1).map(k=>({...k,parent:o.id}))});
 }
 const byId=new Map(out.map(x=>[x.oldId,x]));
 const kept=ops.filter(o=>!(o.parent&&(byId.has(o.parent)||drop.has(o.parent)))&&!drop.has(o.id)).map(o=>byId.has(o.id)?byId.get(o.id).piece:o);
 return [...kept,...out.flatMap(x=>x.kids)];
}

export function mapProjectMeasurements(src){
 const out={};if(!src||typeof src!=='object')return out;
 for(const [k,v] of Object.entries(src)){
  const n=parseFloat(typeof v==='object'?v?.value:v);if(!isFinite(n)||n<=0)continue;const key=k.toLowerCase();
  if(/bust|chest/.test(key))out.bust=n;else if(/waist/.test(key)&&/length|back/.test(key))out.backLength=n;else if(/waist/.test(key))out.waist=n;
  else if(/hip/.test(key))out.hip=n;else if(/sleeve/.test(key))out.sleeveLength=n;else if(/inseam/.test(key))out.inseam=n;else if(/rise|crotch/.test(key))out.rise=n;else if(/skirt/.test(key))out.skirtLength=n;
 }
 return out;
}
