/* Shared geometry + unit helpers for Tailor Tools. Board scale: 1 unit = 1 cm. */
export const BOARD_W=140, BOARD_H=180;
export const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const toUnit=(v,u)=>u==='mm'?v*10:u==='in'?v/2.54:v;
export const fromUnit=(v,u)=>u==='mm'?v/10:u==='in'?v*2.54:v;
export const num=(v,u)=>{const x=toUnit(v,u);return u==='mm'?String(Math.round(x)):x.toFixed(u==='in'?2:1)};
export const fmt=(v,u)=>`${num(v,u)} ${u}`;
export const isLine=o=>typeof o.x1==='number';
export const lineLen=o=>Math.hypot(o.x2-o.x1,o.y2-o.y1);
export const bbox=pts=>{const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}};
export const polyArea=pts=>{let a=0;for(let i=0;i<pts.length;i++){const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%pts.length];a+=x1*y2-x2*y1}return Math.abs(a/2)};
export const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function bezier(p0,p1,p2,p3,n=10){const out=[];for(let i=1;i<=n;i++){const t=i/n,u=1-t;out.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]])}return out}

/* ---------- Pattern pieces are stored as a PATH (straight + cubic-curve edges). `points` is the sampled polygon,
   always kept in sync, so seam allowance, layout, export and the server keep working from `points`. ---------- */
export const pathFromPoints=pts=>({start:[pts[0][0],pts[0][1]],segs:pts.slice(1).map(p=>({p:[p[0],p[1]]}))});
/* Sample a path into a polygon and describe every edge (incl. the closing edge back to the start). */
export function pathPoints(path,n=10){
 const pts=[path.start.slice()],edges=[];let cur=path.start;
 path.segs.forEach((s,k)=>{
  const i0=pts.length-1;
  if(s.c1&&s.c2)pts.push(...bezier(cur,s.c1,s.c2,s.p,n));else pts.push(s.p.slice());
  edges.push({k,name:s.name||'',i0,i1:pts.length-1,curve:!!(s.c1&&s.c2)});cur=s.p;
 });
 edges.push({k:path.segs.length,name:path.closeName||'',i0:pts.length-1,i1:0,closing:true});
 return {pts,edges};
}
export function edgeLength(pts,e){
 let L=0;
 if(e.closing)return dist(pts[pts.length-1],pts[0]);
 for(let i=e.i0;i<e.i1;i++)L+=dist(pts[i],pts[i+1]);return L;
}
export function edgePoints(pts,e){return e.closing?[pts[pts.length-1],pts[0]]:pts.slice(e.i0,e.i1+1)}
/* Re-derive points/bbox from the path. Returns a new piece object. */
export function syncPiece(o){
 if(!o.path)return o;
 const {pts}=pathPoints(o.path);
 return {...o,points:pts.map(p=>[+p[0].toFixed(3),+p[1].toFixed(3)]),...bbox(pts)};
}
export function mkPiece(fields,pts){const o={id:uid(),type:'piece',cut:1,allowance:1,...fields,path:pathFromPoints(pts)};return syncPiece(o)}
export const pieceEdges=o=>o.path?pathPoints(o.path):{pts:o.points,edges:o.points.map((p,i)=>({k:i,name:'',i0:i,i1:(i+1)%o.points.length,closing:i===o.points.length-1}))};
/* Ensure legacy pieces (points only) have a path. */
export const withPath=o=>o.type==='piece'&&!o.path&&o.points?.length>=3?syncPiece({...o,path:pathFromPoints(o.points)}):o;

const mapPath=(path,f)=>({...path,start:f(path.start),segs:path.segs.map(s=>({...s,p:f(s.p),...(s.c1?{c1:f(s.c1),c2:f(s.c2)}:{})}))});
export function shift(o,dx,dy){
 const r={...o},f=([x,y])=>[x+dx,y+dy];
 if(o.points)r.points=o.points.map(f);
 if(o.path)r.path=mapPath(o.path,f);
 ['x','y','x1','y1','x2','y2'].forEach(k=>{if(typeof o[k]==='number')r[k]=o[k]+(k[0]==='x'?dx:dy)});
 return r;
}
/* Mirror an op about the vertical line x=cx, then shift by sx. */
export function mirrorOp(o,cx,sx=0){
 const r={...o},mx=v=>2*cx-v+sx,f=([x,y])=>[mx(x),y];
 if(o.points)r.points=o.points.map(f);
 if(o.path)r.path=mapPath(o.path,f);
 ['x','x1','x2'].forEach(k=>{if(typeof o[k]==='number')r[k]=mx(o[k])});
 return o.type==='piece'?syncPiece(r):r;
}
export const anchor=o=>o.points?o.points[0]:isLine(o)?[o.x1,o.y1]:[o.x,o.y];
export function snapPt(p,ops,on,exclude){
 if(!on)return p;let best=null,bd=2.2;
 for(const o of ops){if(o.id===exclude||o.parent===exclude)continue;const pts=o.points||(isLine(o)?[[o.x1,o.y1],[o.x2,o.y2]]:[]);for(const q of pts){const d=Math.hypot(q[0]-p.x,q[1]-p.y);if(d<bd){bd=d;best=q}}}
 return best?{x:best[0],y:best[1]}:{x:Math.round(p.x),y:Math.round(p.y)};
}
/* Offset a polygon outward by d (miter joins). */
export function offsetPoly(pts,d){
 const n=pts.length;let A=0;for(let i=0;i<n;i++){const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%n];A+=x1*y2-x2*y1}
 const s=A>=0?1:-1;
 const nrm=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [s*dy/l,-s*dx/l]};
 return pts.map((p,i)=>{const n1=nrm(pts[(i-1+n)%n],p),n2=nrm(p,pts[(i+1)%n]);const k=Math.max(.35,1+n1[0]*n2[0]+n1[1]*n2[1]);return [p[0]+d*(n1[0]+n2[0])/k,p[1]+d*(n1[1]+n2[1])/k]});
}
/* Seam-allowance outline. A piece cut on the fold gets no allowance on its fold edge (left edge). */
export function saPoints(o){
 const a=o.allowance??1;if(!(a>0))return null;
 let pts=offsetPoly(o.points,a);
 if(o.fold){const mx=Math.min(...o.points.map(p=>p[0]));pts=pts.map(([x,y])=>[Math.max(mx,x),y])}
 return pts;
}
/* Full (unfolded) outline of a piece — mirrors a fold piece about its left edge. */
export function fullOutline(o){
 if(!o.fold)return o.points;
 const mx=Math.min(...o.points.map(p=>p[0]));
 return [...o.points,...o.points.map(([x,y])=>[2*mx-x,y]).reverse()];
}
/* A hand-edited block piece keeps its identity (so seams are still checked) but no longer follows style changes. */
export const edited=b=>b?{...b,edited:true}:b;
export const pieceChildren=(ops,id)=>ops.filter(o=>o.parent===id);

/* ---------- Curve editing on a path ---------- */
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
export const nodesOf=path=>[path.start,...path.segs.map(s=>s.p)];
export function toggleCurve(path,k){
 const nodes=nodesOf(path),a=nodes[k],b=k+1<nodes.length?nodes[k+1]:nodes[0];
 if(k>=path.segs.length)return path; // closing edge stays straight
 const segs=path.segs.map(s=>({...s}));
 if(segs[k].c1){delete segs[k].c1;delete segs[k].c2}
 else{const L=dist(a,b)||1,nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L,bow=L*.18;segs[k].c1=[lerp(a,b,1/3)[0]+nx*bow,lerp(a,b,1/3)[1]+ny*bow];segs[k].c2=[lerp(a,b,2/3)[0]+nx*bow,lerp(a,b,2/3)[1]+ny*bow]}
 return {...path,segs};
}
/* Insert a node on segment k at the point nearest to q (works for lines and curves, de Casteljau). */
export function insertNode(path,k,q){
 const nodes=nodesOf(path);
 if(k>=path.segs.length){const A=nodes[nodes.length-1],B=nodes[0],dx=B[0]-A[0],dy=B[1]-A[1],t=clamp(((q[0]-A[0])*dx+(q[1]-A[1])*dy)/(dx*dx+dy*dy||1),.05,.95);return {...path,segs:[...path.segs,{p:lerp(A,B,t)}]}}
 const a=nodes[k],s=path.segs[k],segs=path.segs.slice();
 if(!s.c1){const A=a,B=s.p,dx=B[0]-A[0],dy=B[1]-A[1],t=clamp(((q[0]-A[0])*dx+(q[1]-A[1])*dy)/(dx*dx+dy*dy||1),.05,.95),m=lerp(A,B,t);
  segs.splice(k,1,{...s,p:m,c1:undefined,c2:undefined},{p:B.slice(),name:s.name});segs.forEach(x=>{if(!x.c1){delete x.c1;delete x.c2}});return {...path,segs}}
 let bt=.5,bd=1e9;for(let i=1;i<40;i++){const t=i/40,u=1-t,pt=[u*u*u*a[0]+3*u*u*t*s.c1[0]+3*u*t*t*s.c2[0]+t*t*t*s.p[0],u*u*u*a[1]+3*u*u*t*s.c1[1]+3*u*t*t*s.c2[1]+t*t*t*s.p[1]],d=dist(pt,q);if(d<bd){bd=d;bt=t}}
 const t=bt,p01=lerp(a,s.c1,t),p12=lerp(s.c1,s.c2,t),p23=lerp(s.c2,s.p,t),p012=lerp(p01,p12,t),p123=lerp(p12,p23,t),m=lerp(p012,p123,t);
 segs.splice(k,1,{c1:p01,c2:p012,p:m,name:s.name},{c1:p123,c2:p23,p:s.p,name:s.name});return {...path,segs};
}
export function removeNode(path,idx){
 const nodes=nodesOf(path);if(nodes.length<=3||idx<0)return path;
 if(idx===0){const [first,...rest]=path.segs;return {...path,start:first.p.slice(),segs:rest.map(s=>({...s}))}}
 const segs=path.segs.slice(),removed=segs[idx-1];segs.splice(idx-1,1);
 if(segs[idx-1]){const n={...segs[idx-1]};delete n.c1;delete n.c2;segs[idx-1]=n}
 return {...path,segs};
}
/* Move node idx by (dx,dy); its handles move with it. */
export function moveNode(path,idx,to){
 const nodes=nodesOf(path),from=nodes[idx],dx=to[0]-from[0],dy=to[1]-from[1],segs=path.segs.map(s=>({...s}));
 const mv=p=>[p[0]+dx,p[1]+dy];
 if(idx===0)return {...path,start:to.slice(),segs:segs.map((s,i)=>i===0&&s.c1?{...s,c1:mv(s.c1)}:s)};
 segs[idx-1]={...segs[idx-1],p:to.slice(),...(segs[idx-1].c2?{c2:mv(segs[idx-1].c2)}:{})};
 if(segs[idx]&&segs[idx].c1)segs[idx]={...segs[idx],c1:mv(segs[idx].c1)};
 return {...path,segs};
}
export function moveControl(path,k,which,to){const segs=path.segs.map(s=>({...s}));segs[k][which]=to.slice();return {...path,segs}}

/* ---------- Pattern manipulation on polygons ---------- */
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
/* Intersections of the infinite line a->b with polygon edges: [{pt,i,t}] where i is the edge start index. */
export function lineHits(pts,a,b){
 const out=[],n=pts.length;
 for(let i=0;i<n;i++){
  const p=pts[i],q=pts[(i+1)%n],s1=cross(a,b,p),s2=cross(a,b,q);
  if((s1>0&&s2<0)||(s1<0&&s2>0)||(s1===0&&s2!==0&&false)){const t=s1/(s1-s2);out.push({pt:[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t],i,t})}
 }
 return out;
}
export function pointInPoly(pt,pts){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>pt[1])!==(yj>pt[1])&&pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi)c=!c}return c}
/* Split a polygon with a line. Returns [polyA,polyB,{i1,i2}] or null (line must cross exactly twice). */
export function splitPolygon(pts,a,b){
 const hits=lineHits(pts,a,b);if(hits.length!==2)return null;
 let [h1,h2]=hits;if(h1.i>h2.i)[h1,h2]=[h2,h1];
 const n=pts.length,A=[h1.pt],B=[h2.pt];
 for(let i=h1.i+1;i<=h2.i;i++)A.push(pts[i]);A.push(h2.pt);
 for(let i=(h2.i+1)%n,c=0;c<n;i=(i+1)%n,c++){B.push(pts[i]);if(i===h1.i)break}B.push(h1.pt);
 return [A,B,{p1:h1.pt,p2:h2.pt}];
}
/* Slash and spread: cut along line a->b (edge to edge). The side on the left of a->b swings about the hinge (far hit) so the
   edge near `a` opens by `amount` cm. Negative amount closes (overlaps). Returns {pts,rotate(pt)} or null. */
export function slashSpread(pts,a,b,amount){
 const hits=lineHits(pts,a,b);if(hits.length!==2)return null;
 const d1=dist(hits[0].pt,a),d2=dist(hits[1].pt,a),[open,hinge]=d1<=d2?[hits[0],hits[1]]:[hits[1],hits[0]];
 const L=dist(open.pt,hinge.pt);if(L<1)return null;
 const theta=-amount/L,c=Math.cos(theta),s=Math.sin(theta),H=hinge.pt;
 const rot=p=>[H[0]+(p[0]-H[0])*c-(p[1]-H[1])*s,H[1]+(p[0]-H[0])*s+(p[1]-H[1])*c];
 const left=p=>cross(open.pt,hinge.pt,p)>0; // the LEFT side of open->hinge is the side that swings
 const n=pts.length,F=[],G=[];
 for(let i=(open.i+1)%n,k=0;k<n;i=(i+1)%n,k++){F.push(pts[i]);if(i===hinge.i)break}
 for(let i=(hinge.i+1)%n,k=0;k<n;i=(i+1)%n,k++){G.push(pts[i]);if(i===open.i)break}
 const fLeft=left(F[Math.floor(F.length/2)]);
 const out=fLeft?[open.pt,...F.map(rot),H,...G,rot(open.pt)]:[open.pt,...F,H,...G.map(rot),rot(open.pt)];
 return {pts:out,rot,left,open:open.pt,hinge:H};
}
