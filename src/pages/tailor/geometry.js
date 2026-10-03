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
export const anchor=o=>o.points?o.points[0]:isLine(o)?[o.x1,o.y1]:[o.x,o.y];
export const bbox=pts=>{const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}};
export const polyArea=pts=>{let a=0;for(let i=0;i<pts.length;i++){const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%pts.length];a+=x1*y2-x2*y1}return Math.abs(a/2)};
export function shift(o,dx,dy){const r={...o};if(o.points)r.points=o.points.map(([x,y])=>[x+dx,y+dy]);['x','y','x1','y1','x2','y2'].forEach(k=>{if(typeof o[k]==='number')r[k]=o[k]+(k[0]==='x'?dx:dy)});return r}
/* Mirror an op about the vertical line x=cx, then shift by sx. */
export function mirrorOp(o,cx,sx=0){const r={...o},mx=v=>2*cx-v+sx;if(o.points)r.points=o.points.map(([x,y])=>[mx(x),y]).reverse();['x','x1','x2'].forEach(k=>{if(typeof o[k]==='number')r[k]=mx(o[k])});return r}
export function snapPt(p,ops,on,exclude){
 if(!on)return p;let best=null,bd=2.2;
 for(const o of ops){if(o.id===exclude||o.parent===exclude)continue;const pts=o.points||(isLine(o)?[[o.x1,o.y1],[o.x2,o.y2]]:[]);for(const q of pts){const d=Math.hypot(q[0]-p.x,q[1]-p.y);if(d<bd){bd=d;best=q}}}
 return best?{x:best[0],y:best[1]}:{x:Math.round(p.x),y:Math.round(p.y)};
}
export function bezier(p0,p1,p2,p3,n=10){const out=[];for(let i=1;i<=n;i++){const t=i/n,u=1-t;out.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]])}return out}
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
export const pieceChildren=(ops,id)=>ops.filter(o=>o.parent===id);
