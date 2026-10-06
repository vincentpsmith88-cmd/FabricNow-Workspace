/* Flat (technical) sketches drawn from a design spec. Everything is vector, so a design is just a small JSON spec.
   Two views (front, back) are drawn into a 200 x 270 box each. Colours use currentColor so dark mode works. */

export const VOCAB={
 family:['top','dress','skirt','trousers','jumpsuit'],
 fit:['fitted','regular','boxy','oversized'],
 neckline:['round','scoop','v','square','boat','sweetheart','collar','stand','funnel','hood','lapel'],
 sleeve:['none','cap','short','elbow','three-quarter','long'],
 sleeveStyle:['set-in','puff','bell','bishop','raglan','drop'],
 topLength:['crop','waist','hip','tunic','long'],
 skirtLength:['mini','knee','midi','maxi'],
 legLength:['shorts','cropped','ankle','full'],
 skirt:['straight','pencil','a-line','flared','gathered','mermaid','circle','wrap','tiered'],
 waist:['seam','empire','drop','none','belt','elastic'],
 leg:['straight','wide','tapered','flared'],
 closure:['none','buttons','zip','wrap','tie'],
 pockets:['none','patch','welt','kangaroo'],
 hem:['straight','curved','peplum','bands'],
 details:['embroidery','piping','slit','ruffle','yoke','pleats','cuffs']
};
export const LENGTHS={top:VOCAB.topLength,dress:VOCAB.skirtLength,skirt:VOCAB.skirtLength,trousers:VOCAB.legLength,jumpsuit:VOCAB.legLength};
export const DEFAULT_SPEC={family:'top',fit:'regular',neckline:'round',sleeve:'short',sleeveStyle:'set-in',length:'hip',skirt:'a-line',waist:'seam',leg:'straight',closure:'none',pockets:'none',hem:'straight',details:[]};

const pick=(v,list,d)=>list.includes(v)?v:d;
export function normalizeSpec(s={}){
 const family=pick(s.family,VOCAB.family,'top'),len=LENGTHS[family],d=DEFAULT_SPEC;
 return {
  family,fit:pick(s.fit,VOCAB.fit,d.fit),neckline:pick(s.neckline,VOCAB.neckline,d.neckline),sleeve:pick(s.sleeve,VOCAB.sleeve,d.sleeve),
  sleeveStyle:pick(s.sleeveStyle,VOCAB.sleeveStyle,d.sleeveStyle),length:pick(s.length,len,family==='top'?'hip':family==='trousers'||family==='jumpsuit'?'full':'knee'),
  skirt:pick(s.skirt,VOCAB.skirt,d.skirt),waist:pick(s.waist,VOCAB.waist,d.waist),leg:pick(s.leg,VOCAB.leg,d.leg),closure:pick(s.closure,VOCAB.closure,d.closure),
  pockets:pick(s.pockets,VOCAB.pockets,d.pockets),hem:pick(s.hem,VOCAB.hem,d.hem),details:Array.isArray(s.details)?s.details.filter(x=>VOCAB.details.includes(x)).slice(0,5):[]
 };
}

/* ---------- tiny drawing kit ---------- */
const W=200,CX=100,mx=x=>W-x;
const f=n=>Math.round(n*10)/10;
const pts=a=>a.map(p=>f(p[0])+','+f(p[1])).join(' ');
const Qp=(a,c,b,n=9)=>{const o=[];for(let i=1;i<=n;i++){const t=i/n,u=1-t;o.push([u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]])}return o};
const Cp=(a,c1,c2,b,n=10)=>{const o=[];for(let i=1;i<=n;i++){const t=i/n,u=1-t;o.push([u*u*u*a[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*b[0],u*u*u*a[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*b[1]])}return o};
const mirror=l=>[...l].reverse().map(([x,y])=>[mx(x),y]);
const sym=left=>[...left,...mirror(left)];
const lerp=(a,b,t)=>a+(b-a)*t;
const poly=(p,cls='o',extra='')=>`<polygon class="${cls}" points="${pts(p)}" ${extra}/>`;
const line=(a,b,cls='d')=>`<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"/>`;
const pl=(p,cls='d')=>`<polyline class="${cls}" points="${pts(p)}"/>`;
const circ=(x,y,r=1.8)=>`<circle class="d" cx="${f(x)}" cy="${f(y)}" r="${r}" fill="none"/>`;
const symLine=(a,b,cls='d')=>line(a,b,cls)+line([mx(a[0]),a[1]],[mx(b[0]),b[1]],cls);

/* sizes */
const FIT={fitted:{sw:31,cw:35,drop:0,ease:0},regular:{sw:34,cw:39,drop:0,ease:3},boxy:{sw:38,cw:46,drop:4,ease:8},oversized:{sw:42,cw:53,drop:10,ease:14}};
const TOP_HEM={crop:104,waist:128,hip:156,tunic:184,long:214};
const SKIRT_DROP={mini:44,knee:78,midi:108,maxi:132};
const LEG_END={shorts:178,cropped:212,ankle:240,full:256};
const SLEEVE_END={none:0,cap:62,short:80,elbow:112,'three-quarter':140,long:176};

function neck(spec,back){
 const n=spec.neckline,nw=back?19:17,top=38;
 let nY=back?43:46,shoulderX=CX-nw;let L=[];
 if(!back){
  if(n==='scoop'){nY=64;L=[[CX,nY],...Qp([CX,nY],[CX-nw*1.1,nY],[CX-nw,top])]}
  else if(n==='v'||n==='lapel'){nY=n==='lapel'?96:74;L=[[CX,nY],[CX-nw,top]]}
  else if(n==='square'){nY=60;L=[[CX,nY],[CX-nw-1,nY],[CX-nw-1,top]];shoulderX=CX-nw-1}
  else if(n==='boat'){nY=47;shoulderX=CX-nw*1.9;L=[[CX,nY],...Qp([CX,nY],[CX-nw*1.2,nY],[shoulderX,top])]}
  else if(n==='sweetheart'){nY=62;L=[[CX,nY+4],...Cp([CX,nY+4],[CX-3,nY-8],[CX-nw*.75,nY-8],[CX-nw*.8,nY-1]),...Qp([CX-nw*.8,nY-1],[CX-nw*1.2,top+8],[CX-nw*1.15,top],6)];shoulderX=CX-nw*1.15}
  else if(n==='collar'||n==='stand'||n==='funnel'||n==='hood'){nY=50;L=[[CX,nY],...Qp([CX,nY],[CX-nw,nY],[CX-nw,top+2])]}
  else{L=[[CX,nY],...Qp([CX,nY],[CX-nw*1.05,nY],[CX-nw,top])]}
 }else{
  if(n==='boat'){shoulderX=CX-nw*1.9;L=[[CX,44],...Qp([CX,44],[CX-nw*1.2,44],[shoulderX,top])]}
  else if(n==='sweetheart'||n==='scoop'||n==='square'){nY=52;L=[[CX,nY],...Qp([CX,nY],[CX-nw,nY],[CX-nw,top])]}
  else L=[[CX,nY],...Qp([CX,nY],[CX-nw,nY],[CX-nw,top])];
 }
 return {L,shoulderX,nY};
}
const SLEEVE_LEN={cap:16,short:30,elbow:50,'three-quarter':70,long:94};
const SLEEVE_TAPER={cap:1,short:.95,elbow:.86,'three-quarter':.74,long:.62};
const sleeveGeom=(spec,fit)=>{
 if(spec.sleeve==='none')return null;
 const st=spec.sleeveStyle,sY=40+fit.drop*.4+(st==='drop'?8:0),S=[CX-fit.sw,sY],A=[CX-fit.cw,92+fit.drop*.5];
 const len=SLEEVE_LEN[spec.sleeve],ang=(spec.sleeve==='long'||spec.sleeve==='three-quarter'?26:spec.sleeve==='elbow'?38:52)*Math.PI/180+(st==='drop'?.1:0);
 const dir=[-Math.sin(ang),Math.cos(ang)],M=[(S[0]+A[0])/2,(S[1]+A[1])/2];
 let sa=[S[0]-A[0],S[1]-A[1]];const dot=sa[0]*dir[0]+sa[1]*dir[1];let u=[sa[0]-dot*dir[0],sa[1]-dot*dir[1]];const ul=Math.hypot(u[0],u[1])||1;u=[u[0]/ul,u[1]/ul];
 const w0=ul/2,H=[M[0]+dir[0]*len,M[1]+dir[1]*len];
 let taper=SLEEVE_TAPER[spec.sleeve];
 if(st==='bell')taper=spec.sleeve==='short'||spec.sleeve==='cap'?1.25:1.7;
 if(st==='puff')taper=.95;
 if(st==='bishop')taper=1.05;
 const hw=w0*taper,o=[H[0]+u[0]*hw,H[1]+u[1]*hw],i=[H[0]-u[0]*hw,H[1]-u[1]*hw];
 return {top:S,armBot:A,o,i,st,H,u,dir};
};
function drawSleeve(g){
 if(!g)return [];
 const {top,armBot,o,i,st}=g;
 const bulge=st==='puff'?9:st==='bishop'?7:0;
 if(!bulge)return [top,o,i,armBot];
 const mid=(a,b,k)=>[(a[0]+b[0])/2+k*g.dir[1]*-1*0,(a[1]+b[1])/2];
 return [top,...Qp(top,[(top[0]+o[0])/2-bulge,(top[1]+o[1])/2+2],o,6),...Qp(o,[(o[0]+i[0])/2-g.dir[0]*3,(o[1]+i[1])/2+4],i,5),...Qp(i,[(armBot[0]+i[0])/2+bulge*.6,(armBot[1]+i[1])/2],armBot,6)];
}
const sleevePair=(g,spec,fit)=>{const L=drawSleeve(g);if(!L.length)return '';const R=L.map(([x,y])=>[mx(x),y]);
 let s=poly(L,'o')+poly(R,'o');
 const {top,o,i,armBot,st}=g;
 const at=(p,q,t)=>[lerp(p[0],q[0],t),lerp(p[1],q[1],t)];
 if(st==='bishop'||spec.details.includes('cuffs')||(spec.hem==='bands'&&spec.sleeve!=='short'&&spec.sleeve!=='cap')){const p=at(o,top,.14),q=at(i,armBot,.14);s+=line(p,q,'d')+line([mx(p[0]),p[1]],[mx(q[0]),q[1]],'d')}
 if(st==='puff'){const p=at(o,top,.12),q=at(i,armBot,.12);s+=symLine(p,q,'d')+symLine(at(o,top,.2),at(i,armBot,.2),'g')}
 if(st==='raglan')s+=symLine([CX-18,40],[CX-fit.cw-1,92],'d');
 return s;
};

/* ---------- body (top part) ---------- */
function bodyPoints(spec,fit,back,hemY,opts={}){
 const {L:nL,shoulderX}=neck(spec,back),sY=40+fit.drop*.4+(spec.sleeveStyle==='drop'&&spec.sleeve!=='none'?8:0);
 const cw=fit.cw,waistY=opts.waistY,wIn=opts.waistIn||0;
 const left=[...nL,[shoulderX,38],[CX-fit.sw,sY]];
 const armBot=[CX-cw,92+fit.drop*.5];
 left.push(...Qp([CX-fit.sw,sY],[CX-cw+(spec.sleeve==='none'?-2:2),sY+10],armBot,8));
 if(waistY){left.push(...Qp(armBot,[CX-cw+1,(armBot[1]+waistY)/2],[CX-cw+wIn,waistY],6))}
 const hemHalf=opts.hemHalf??(cw+(spec.hem==='peplum'?0:fit.ease>10?2:0));
 if(spec.hem==='curved'&&!back){left.push([CX-hemHalf,hemY-8],...Qp([CX-hemHalf,hemY-8],[CX-hemHalf+4,hemY+2],[CX,hemY+2],6))}
 else if(spec.hem==='curved'&&back){left.push([CX-hemHalf,hemY-8],...Qp([CX-hemHalf,hemY-8],[CX-hemHalf+4,hemY+6],[CX,hemY+6],6))}
 else left.push([CX-hemHalf,hemY],[CX,hemY]);
 return {left,armBot};
}

function topDetails(spec,fit,back,hemY){
 let s='';const cw=fit.cw,n=spec.neckline;
 const nY=neck(spec,back).nY;
 // collars
 if(!back){
  if(n==='collar'){s+=poly([[CX-17,38],[CX-2,52],[CX-9,60],[CX-26,44],[CX-22,34]],'o')+poly([[CX+17,38],[CX+2,52],[CX+9,60],[CX+26,44],[CX+22,34]],'o')}
  if(n==='stand'){s+=poly([[CX-17,38],[CX-17,30],[CX,32],[CX+17,30],[CX+17,38],[CX,46]],'o')}
  if(n==='funnel'){s+=poly([[CX-19,40],[CX-24,22],[CX,26],[CX+24,22],[CX+19,40],[CX,48]],'o')+line([CX,26],[CX,48],'g')}
  if(n==='hood'){s+=pl([[CX-17,38],[CX-30,46],[CX-34,72],[CX-24,84]],'d')+pl([[CX+17,38],[CX+30,46],[CX+34,72],[CX+24,84]],'d')}
  if(n==='lapel'){s+=poly([[CX-17,38],[CX-2,76],[CX-8,100],[CX-30,66],[CX-26,40]],'o')+poly([[CX+17,38],[CX+2,76],[CX+8,100],[CX+30,66],[CX+26,40]],'o')+line([CX-8,100],[CX-8,hemY-2],'d')}
  if(n==='sweetheart'||n==='scoop'||n==='square'||n==='boat'||n==='v'||n==='round'){}
 }else{
  if(n==='collar'||n==='stand')s+=poly([[CX-18,38],[CX-18,32],[CX,34],[CX+18,32],[CX+18,38],[CX,44]],'o');
  if(n==='funnel')s+=poly([[CX-19,40],[CX-24,22],[CX,26],[CX+24,22],[CX+19,40],[CX,46]],'o');
  if(n==='hood')s+=poly([[CX-20,40],[CX-34,40],[CX-38,10],[CX,2],[CX+38,10],[CX+34,40],[CX+20,40],[CX,52]],'o')+line([CX,4],[CX,52],'g');
  if(n==='lapel')s+=poly([[CX-18,38],[CX-18,31],[CX,34],[CX+18,31],[CX+18,38],[CX,46]],'o');
 }
 if(!back){
  const top=nY+ (n==='v'||n==='lapel'?4:8);
  if(spec.closure==='buttons'&&n!=='lapel'){const y1=Math.min(top,70);s+=line([CX,y1],[CX,hemY-2],'d');for(let y=y1+8;y<hemY-6;y+=14)s+=circ(CX,y,1.7);s+=line([CX+5,y1],[CX+5,hemY-2],'g')}
  if(spec.closure==='buttons'&&n==='lapel'){for(let y=104;y<hemY-6;y+=18)s+=circ(CX-4,y,1.9)}
  if(spec.closure==='zip'){s+=line([CX,top-4],[CX,hemY-2],'d')+line([CX+2.4,top-4],[CX+2.4,hemY-2],'g')+`<rect class="d" x="${CX-1.8}" y="${top-1}" width="3.6" height="7" rx="1.2" fill="none"/>`}
  if(spec.closure==='wrap'){s+=pl([[CX+fit.sw-6,42],[CX-6,Math.min(hemY-2,126)]],'d')}
  if(spec.closure==='tie'){const y=Math.min(hemY-24,126);s+=`<path class="d" d="M${CX},${y} q-10,-8 -14,2 q8,8 14,-2 q10,-8 14,2 q-8,8 -14,-2 M${CX-2},${y+2} l-5,14 M${CX+2},${y+2} l5,14" fill="none"/>`}
  if(spec.pockets==='patch'){const y=Math.min(hemY-38,hemY>150?118:96);s+=`<rect class="d" x="${CX-cw+8}" y="${y}" width="20" height="22" rx="2" fill="none"/><rect class="d" x="${CX+cw-28}" y="${y}" width="20" height="22" rx="2" fill="none"/>`}
  if(spec.pockets==='welt'){const y=Math.min(hemY-34,hemY>150?112:92);s+=line([CX-cw+8,y],[CX-cw+22,y+14],'d')+line([CX+cw-8,y],[CX+cw-22,y+14],'d')}
  if(spec.pockets==='kangaroo'){const y=Math.min(hemY-44,112);s+=`<path class="d" d="M${CX-26},${y} h52 l6,34 h-64 z" fill="none"/>`}
 }else{
  s+=line([CX,hemY>0?(n==='hood'?52:46):46],[CX,hemY-2],'g');
  if(spec.pockets==='patch'&&spec.family!=='top'){}
 }
 if(spec.details.includes('yoke')){s+=pl([[CX-fit.cw+2,66],[CX,back?60:76],[CX+fit.cw-2,66]],'d')}
 if(spec.details.includes('piping')){s+=pl([[CX-fit.sw,42],[CX-fit.cw,92]],'g')+pl([[CX+fit.sw,42],[CX+fit.cw,92]],'g')}
 if(spec.details.includes('embroidery')&&!back){const y=nY+10;for(let k=-3;k<=3;k++){s+=`<path class="g" d="M${CX+k*7},${y} l3,8 l-3,8 l-3,-8 z"/>`}s+=line([CX-24,y-2],[CX+24,y-2],'g')+line([CX-24,y+18],[CX+24,y+18],'g')}
 if(spec.details.includes('darts')&&!back){s+=pl([[CX-fit.cw+4,100],[CX-18,118]],'g')+pl([[CX+fit.cw-4,100],[CX+18,118]],'g')}
 if(spec.hem==='bands'){s+=line([CX-cw+2,hemY-8],[CX+cw-2,hemY-8],'d')}
 return s;
}

function drawTop(spec,fit,back,hemY,opts={}){
 const {left}=bodyPoints(spec,fit,back,hemY,opts),body=poly(sym(left),'o');
 const sl=sleeveGeom(spec,fit);
 let s=(spec.sleeveStyle==='raglan'?'':'')+sleevePair(sl,spec,fit)+body+topDetails(spec,fit,back,hemY);
 if(spec.hem==='peplum'&&opts.peplum){const w=fit.cw;s+=poly(sym([[CX,hemY-2],[CX-w,hemY-2],...Qp([CX-w,hemY-2],[CX-w-10,hemY+12],[CX-w-16,hemY+30]),[CX,hemY+30]]),'o')+line([CX-w,hemY-2],[CX+w,hemY-2],'d')}
 return s;
}

/* ---------- skirts ---------- */
function skirtShape(spec,fit,top,hipHalf,waistHalf,drop){
 const k=spec.skirt,hem=top+drop,L=[[CX,top],[CX-waistHalf,top]];
 const fl=k==='a-line'?16:k==='flared'?30:k==='circle'?50:k==='gathered'?26:k==='tiered'?36:k==='wrap'?14:0;
 let hemHalf=hipHalf+fl;if(k==='pencil')hemHalf=hipHalf-8;
 if(k==='mermaid'){const knee=top+drop*.62;L.push(...Cp([CX-waistHalf,top],[CX-hipHalf,top+drop*.12],[CX-hipHalf+3,top+drop*.3],[CX-hipHalf+4,top+drop*.4]),[CX-hipHalf+2,knee],...Cp([CX-hipHalf+2,knee],[CX-hipHalf-4,knee+drop*.12],[CX-hipHalf-16,hem-8],[CX-hipHalf-26,hem]))}
 else if(k==='circle'||k==='flared'){L.push(...Cp([CX-waistHalf,top],[CX-hipHalf,top+drop*.12],[CX-hipHalf-fl*.4,top+drop*.55],[CX-hemHalf,hem]))}
 else if(k==='gathered'||k==='tiered'){L.push(...Cp([CX-waistHalf,top],[CX-hipHalf-4,top+drop*.12],[CX-hemHalf+6,top+drop*.7],[CX-hemHalf,hem]))}
 else{L.push([CX-hipHalf,top+Math.min(drop*.28,34)],[CX-hemHalf,hem])}
 L.push([CX,hem+(k==='circle'?3:0)]);
 let s=poly(sym(L),'o');
 if(k==='gathered'){for(let i=-4;i<=4;i++)s+=line([CX+i*(waistHalf/4.5),top+2],[CX+i*(hemHalf/4.4),hem-6],'g')}
 if(k==='tiered'){[.36,.68].forEach(t=>{const y=top+drop*t,w=lerp(waistHalf,hemHalf,t)+4;s+=`<path class="d" d="M${CX-w},${y} Q${CX},${y+6} ${CX+w},${y}" fill="none"/>`})}
 if(k==='wrap'){s+=pl([[CX+waistHalf-3,top],[CX-6,top+drop*.5],[CX-14,hem]],'d')}
 if(k==='circle'){s+=`<path class="g" d="M${CX-hemHalf+4},${hem-4} Q${CX},${hem+8} ${CX+hemHalf-4},${hem-4}" fill="none"/>`}
 if(spec.details.includes('slit')){s+=pl([[CX-6,hem],[CX-3,hem-34]],'d')+line([CX+6,hem],[CX+3,hem-34],'d')}
 if(spec.details.includes('ruffle')){s+=`<path class="d" d="M${CX-hemHalf+2},${hem-8} q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0" fill="none" style="transform:translateX(${Math.max(0,hemHalf-52)}px)"/>`}
 if(spec.details.includes('pleats')){for(let i=-3;i<=3;i++)if(i)s+=line([CX+i*(waistHalf/3.4),top+2],[CX+i*(hemHalf/3.4),hem-4],'g')}
 return {svg:s,hem};
}
function waistband(top,half,h=7,belt=false){return `<rect class="o" x="${CX-half}" y="${top-h}" width="${half*2}" height="${h}" rx="1.5"/>`+(belt?`<rect class="d" x="${CX-5}" y="${top-h}" width="10" height="${h}" rx="1" fill="none"/>`:'')}

function drawSkirtOnly(spec,fit,back){
 const top=112,half=fit.ease>8?30:26,hip=fit.ease>8?42:36;
 const sk=skirtShape({...spec},fit,top,hip,half,SKIRT_DROP[spec.length]+40);
 let s=sk.svg+waistband(top,half+1);
 if(spec.waist==='elastic')s+=`<line class="g" x1="${CX-half}" y1="${top-3}" x2="${CX+half}" y2="${top-3}"/>`;
 if(!back){if(spec.closure==='buttons')for(let y=top+10;y<sk.hem-10;y+=16)s+=circ(CX,y,1.7);if(spec.closure==='zip')s+=line([CX,top],[CX,sk.hem-30],'d');
  if(spec.pockets==='patch')s+=`<rect class="d" x="${CX-hip+6}" y="${top+16}" width="18" height="20" rx="2" fill="none"/><rect class="d" x="${CX+hip-24}" y="${top+16}" width="18" height="20" rx="2" fill="none"/>`;
  if(spec.pockets==='welt')s+=line([CX-half-2,top+6],[CX-half-12,top+26],'d')+line([CX+half+2,top+6],[CX+half+12,top+26],'d')}
 else{s+=line([CX,top],[CX,sk.hem-4],'g')}
 return s;
}

/* ---------- trousers ---------- */
function drawTrousers(spec,fit,back,rise=112,withBand=true){
 const hipH=fit.ease>8?42:38,wH=hipH-3,legEnd=LEG_END[spec.length],crotchY=rise+48,inner=7,shorts=spec.length==='shorts';
 const hem={straight:18,wide:31,tapered:13,flared:29}[spec.leg]+(fit.ease>8?3:0);
 const hemOut=shorts?hipH-3:hem+inner;
 const leg=[[CX-wH,rise],[CX-hipH,rise+22],[CX-hipH+1,crotchY]];
 if(spec.leg==='flared'&&!shorts)leg.push([CX-inner-hem*.55,crotchY+(legEnd-crotchY)*.55]);
 if(spec.leg==='tapered'&&!shorts)leg.push([CX-hipH+5,crotchY+(legEnd-crotchY)*.45]);
 leg.push([CX-hemOut,legEnd],[CX-inner,legEnd],[CX-4,crotchY+4],[CX,crotchY-8],[CX,rise]);
 const legR=leg.map(([x,y])=>[mx(x),y]);
 let s=poly(leg,'o')+poly(legR,'o');
 if(withBand)s+=`<rect class="o" x="${CX-wH}" y="${rise-8}" width="${wH*2}" height="8" rx="1.5"/>`;
 if(spec.waist==='belt')s+=`<rect class="d" x="${CX-5}" y="${rise-8}" width="10" height="8" fill="none"/>`;
 if(spec.waist==='elastic'||spec.waist==='none')s+=`<line class="g" x1="${CX-wH}" y1="${rise-3.5}" x2="${CX+wH}" y2="${rise-3.5}"/>`;
 if(!back){
  s+=line([CX,rise],[CX,crotchY-8],'d');
  if(spec.closure==='zip'||spec.closure==='buttons')s+=pl([[CX,rise],[CX+4,rise+16],[CX,rise+20]],'d');
  if(spec.closure==='buttons')s+=circ(CX,rise-4,1.4);
  if(spec.pockets==='welt')s+=symLine([CX-wH+2,rise+2],[CX-hipH+1,rise+24]);
  if(spec.pockets==='patch')s+=`<rect class="d" x="${CX-hipH+3}" y="${rise+36}" width="16" height="22" rx="2" fill="none"/><rect class="d" x="${CX+hipH-19}" y="${rise+36}" width="16" height="22" rx="2" fill="none"/>`;
  if(spec.details.includes('pleats'))s+=symLine([CX-10,rise],[CX-8,rise+28],'g')+symLine([CX-19,rise],[CX-16,rise+26],'g');
 }else{
  s+=line([CX,rise],[CX,crotchY-10],'g');
  s+=`<rect class="d" x="${CX-hipH+4}" y="${rise+14}" width="18" height="18" rx="2" fill="none"/><rect class="d" x="${CX+hipH-22}" y="${rise+14}" width="18" height="18" rx="2" fill="none"/>`;
  if(spec.details.includes('darts'))s+=symLine([CX-14,rise],[CX-12,rise+14],'g');
 }
 if(spec.details.includes('belt-loops')||spec.waist==='belt'){for(let i=-3;i<=3;i+=2)s+=`<rect class="g" x="${CX+i*9-1}" y="${rise-9}" width="2" height="10" fill="none"/>`}
 if(spec.details.includes('cuffs')){const k=legEnd-9;s+=line([CX-hemOut,k],[CX-inner,k],'d')+line([CX+hemOut,k],[CX+inner,k],'d')}
 if(spec.details.includes('slit'))s+=line([CX-hemOut,legEnd],[CX-hemOut+3,legEnd-18],'d');
 return s;
}

/* ---------- public ---------- */
function drawView(spec,back){
 const fit=FIT[spec.fit];let s='',yMax=200,tall=0;
 const sl=sleeveGeom(spec,fit);let xMin=Math.min(...(sl?[sl.o[0],sl.i[0],sl.top[0]]:[0]),CX-fit.cw);
 if(spec.family==='top'){
  const hemY=TOP_HEM[spec.length];s=drawTop(spec,fit,back,hemY,{peplum:spec.hem==='peplum'});yMax=hemY+(spec.hem==='peplum'?30:6);
 }else if(spec.family==='dress'){
  const wY={seam:124,empire:100,drop:146,none:0,belt:124,elastic:124}[spec.waist],sk=spec.skirt;
  if(spec.waist==='none'){
   const hemY=Math.min(258,SKIRT_DROP[spec.length]+112),flare=sk==='a-line'?10:sk==='flared'||sk==='circle'?24:sk==='pencil'?-8:0,o={hemHalf:fit.cw+flare+(fit.ease>8?4:0)};
   s=drawTop({...spec,hem:'straight'},fit,back,hemY,o);yMax=hemY+6;xMin=Math.min(xMin,CX-o.hemHalf);
   if(spec.details.includes('slit'))s+=line([CX-4,hemY],[CX-2,hemY-36],'d')+line([CX+4,hemY],[CX+2,hemY-36],'d');
   if(spec.details.includes('ruffle'))s+=`<path class="d" d="M${CX-o.hemHalf+2},${hemY-9} q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0 q6,6 12,0" fill="none" style="transform:translateX(${Math.max(0,o.hemHalf-48)}px)"/>`;
  }else{
   const waistIn=spec.fit==='fitted'?5:spec.fit==='regular'?3:0,top=drawTop({...spec,hem:'straight'},fit,back,wY,{waistY:wY-14,waistIn});
   const half=fit.cw-waistIn,hip=fit.cw+(spec.fit==='fitted'?-1:3),sks=skirtShape(spec,fit,wY,hip,half,SKIRT_DROP[spec.length]+(wY>110?12:34)+(spec.waist==='drop'?-12:0));
   s=sks.svg+top+`<line class="d" x1="${CX-half}" y1="${wY}" x2="${CX+half}" y2="${wY}"/>`;yMax=sks.hem+10;xMin=Math.min(xMin,CX-hip-({a:0}).a-(sk==='circle'?60:sk==='flared'?34:sk==='tiered'?40:sk==='gathered'?30:sk==='a-line'?18:0));
   if(spec.waist==='belt')s+=`<rect class="o" x="${CX-half-1}" y="${wY-4}" width="${(half+1)*2}" height="8" rx="1.5"/><rect class="d" x="${CX-5}" y="${wY-4}" width="10" height="8" fill="none"/>`;
   if(spec.waist==='empire')s+=`<line class="d" x1="${CX-half}" y1="${wY+4}" x2="${CX+half}" y2="${wY+4}"/>`;
   if(spec.pockets!=='none'&&!back)s+=symLine([CX-hip+2,wY+14],[CX-hip+10,wY+30],'d');
  }
 }else if(spec.family==='skirt'){
  s=drawSkirtOnly(spec,fit,back);yMax=112+SKIRT_DROP[spec.length]+46;tall=-1;xMin=CX-(fit.ease>8?42:36)-(spec.skirt==='circle'?50:spec.skirt==='flared'?30:spec.skirt==='gathered'?26:spec.skirt==='a-line'?16:0);
 }else if(spec.family==='trousers'){
  s=drawTrousers(spec,fit,back,112,true);yMax=LEG_END[spec.length]+4;tall=-1;xMin=CX-44;
 }else if(spec.family==='jumpsuit'){
  const waistY=122,top=drawTop({...spec,hem:'straight',closure:spec.closure==='tie'?'none':spec.closure},fit,back,waistY,{waistY:waistY-12,waistIn:spec.fit==='fitted'?5:3});
  s=drawTrousers({...spec,waist:'none',closure:'none'},fit,back,waistY,false)+top;yMax=LEG_END[spec.length]+4;
  s+=`<rect class="o" x="${CX-fit.cw+4}" y="${waistY-4}" width="${(fit.cw-4)*2}" height="8" rx="1.5"/>`+(spec.waist==='belt'?`<rect class="d" x="${CX-5}" y="${waistY-4}" width="10" height="8" fill="none"/>`:'');
 }
 const n=spec.neckline;
 const yMin=tall<0?(spec.family==='skirt'?102:100):(back&&n==='hood'?2:n==='funnel'?20:n==='hood'||n==='collar'||n==='stand'?28:34);
 return {svg:s,yMin,yMax,xMin:Math.max(0,xMin)};
}
/* Centre each view in its box and scale it up so every garment fills the card. */
function fitView(v){
 const h=v.yMax-v.yMin,sx=(CX-4)/Math.max(8,CX-v.xMin),k=Math.min(1.3,236/h,Math.max(.6,sx)),ty=(270-h*k)/2-v.yMin*k,tx=CX-CX*k;
 return `<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(k)})">${v.svg}</g>`;
}
export function flatInner(spec){
 const sp=normalizeSpec(spec);
 return {front:fitView(drawView(sp,false)),back:fitView(drawView(sp,true))};
}
/* One SVG string with both views side by side. Colours come from CSS: --ink (outline) and --paper (fill). */
export function flatSvg(spec,{label=true}={}){
 const {front,back}=flatInner(spec);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 280" role="img" aria-label="Front and back flat sketch"><style>.o{fill:var(--paper,#fff);stroke:var(--ink,#2A2740);stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round}.d{fill:none;stroke:var(--ink,#2A2740);stroke-width:1;stroke-linejoin:round;stroke-linecap:round}.g{fill:none;stroke:var(--ink,#2A2740);stroke-width:.7;opacity:.55;stroke-linecap:round}.lbl{font:600 7px sans-serif;fill:var(--ink,#2A2740);opacity:.45;letter-spacing:.14em}</style><g transform="translate(5 4)">${front}</g><g transform="translate(225 4)">${back}</g>${label?'<text class="lbl" x="105" y="277" text-anchor="middle">FRONT</text><text class="lbl" x="325" y="277" text-anchor="middle">BACK</text>':''}</svg>`;
}
