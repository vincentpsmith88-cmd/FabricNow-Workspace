/* Fits a pattern-derived garment (rings of circumference vs height) onto a loaded body mesh.
   Pure maths, no three.js. Body positions are in the viewer's normalised space: height = 1, feet at y = 0, +z faces the camera.
   The body is measured from its real cross-sections, not from the catalogue numbers. */
const K=72;                      // points around each ring
const TAU=Math.PI*2;

/* ---------- body analysis ---------- */
/* Exact cross-section of the mesh at height y: every triangle edge that crosses the plane gives a contour point.
   (Slicing triangles, not vertices, matters: these meshes have very few vertices per slice.) */
function contour(P,I,y){
 const pts=[],T=I?I.length:P.length/3;
 for(let t=0;t<T;t+=3){
  const ia=I?I[t]:t,ib=I?I[t+1]:t+1,ic=I?I[t+2]:t+2,ay=P[ia*3+1],by=P[ib*3+1],cy=P[ic*3+1];
  if((ay>y&&by>y&&cy>y)||(ay<=y&&by<=y&&cy<=y))continue;
  const e=[[ia,ib],[ib,ic],[ic,ia]],hit=[];
  for(const [u,v] of e){const uy=P[u*3+1],vy=P[v*3+1];if((uy>y)!==(vy>y)){const k=(y-uy)/(vy-uy);hit.push([P[u*3]+(P[v*3]-P[u*3])*k,P[u*3+2]+(P[v*3+2]-P[u*3+2])*k])}}
  if(hit.length===2){pts.push(hit[0],hit[1],[(hit[0][0]+hit[1][0])/2,(hit[0][1]+hit[1][1])/2])}
 }
 return pts;
}
function clusterSlice(pts,gap=.03){
 if(pts.length<8)return null;
 pts.sort((a,b)=>a[0]-b[0]);
 const cl=[[pts[0]]];for(let i=1;i<pts.length;i++){if(pts[i][0]-pts[i-1][0]>gap)cl.push([]);cl[cl.length-1].push(pts[i])}
 let best=null,bs=-1e9;
 for(const c of cl){if(c.length<6)continue;const x0=c[0][0],x1=c[c.length-1][0],score=(x1-x0)-Math.abs((x0+x1)/2)*1.5;if(score>bs){bs=score;best=c}}
 return best?{pts:best,clusters:cl.filter(c=>c.length>=6).length,w:best[best.length-1][0]-best[0][0],all:cl.filter(c=>c.length>=6)}:null;
}
/* Radial envelope of a slice around its centre: the max radius in each of K angular bins, gaps filled, lightly smoothed. */
function envelope(pts){
 let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const [x,z] of pts){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z)}
 const cx=(x0+x1)/2,cz=(z0+z1)/2,env=new Float32Array(K).fill(-1);
 for(const [x,z] of pts){const a=(Math.atan2(z-cz,x-cx)+TAU)%TAU,j=Math.floor(a/TAU*K)%K,r=Math.hypot(x-cx,z-cz);if(r>env[j])env[j]=r}
 for(let j=0;j<K;j++)if(env[j]<0){let l=j,r=j,dl=0,dr=0;while(env[(l+K)%K]<0&&dl<K){l--;dl++}while(env[(r+K)%K]<0&&dr<K){r++;dr++}
  const a=env[(l+K)%K],b=env[(r+K)%K];env[j]=dl+dr?(a*dr+b*dl)/(dl+dr):Math.max(a,b)}
 const out=new Float32Array(K);for(let j=0;j<K;j++)out[j]=env[(j+K-1)%K]*.25+env[j]*.5+env[(j+1)%K]*.25;
 for(let j=0;j<K;j++)out[j]=Math.max(out[j],env[j]); // smoothing must never cut into the body
 return {cx,cz,env:out};
}
const perim=env=>{let s=0;for(let j=0;j<K;j++){const a=env[j],b=env[(j+1)%K],t=TAU/K;s+=Math.sqrt(a*a+b*b-2*a*b*Math.cos(t))}return s};

/* landmarks (optional): known heights {yUA,yW,yH,yCrotch} in normalised units, e.g. from the model catalogue.
   Without them they are detected from the mesh, which works on some bodies but not all. */
export function analyzeBody(P,I=null,{landmarks=null,step=.005}={}){
 const rings=[],lo=landmarks?landmarks.yCrotch-.02:.3,hi=landmarks?landmarks.yUA+.005:.76;
 for(let y=lo;y<=hi+1e-9;y+=step){
  const s=clusterSlice(contour(P,I,y));if(!s)continue;
  const legs=s.all.length>=2&&s.all.filter(c=>Math.abs((c[0][0]+c[c.length-1][0])/2)<.14).length>=2;
  const e=envelope(s.pts);rings.push({y,w:s.w,clusters:s.clusters,legs,cx:e.cx,cz:e.cz,env:e.env,per:perim(e.env)});
 }
 if(rings.length<12)return null;
 let L=landmarks&&{...landmarks};
 if(!L){
  let yUA=null;
  for(let i=rings.findIndex(r=>r.y>=.5);i>0&&i<rings.length;i++){const r=rings[i],p=rings[i-1];if(r.w>p.w*1.3||(p.clusters>1&&r.clusters===1&&r.w>p.w*1.12)){yUA=p.y-step;break}}
  if(yUA==null)yUA=.7;
  const inR=(a,b)=>rings.filter(r=>r.y>=a&&r.y<=b);
  const waist=inR(yUA-.14,yUA-.03).reduce((m,r)=>r.per<m.per?r:m);
  const crotch=(rings.filter(r=>r.y<waist.y).sort((a,b)=>b.y-a.y).find(r=>r.legs)||{y:waist.y-.16}).y;
  const hip=inR(crotch+.012,waist.y-.03).reduce((m,r)=>r.per>m.per?r:m);
  L={yUA,yW:waist.y,yH:hip.y,yCrotch:crotch};
 }
 const at=y=>rings.reduce((m,r)=>Math.abs(r.y-y)<Math.abs(m.y-y)?r:m,rings[0]);
 // the garment top sits just under the arms: above this the arms fuse with the torso and the outline is not the body's
 L.yTop=L.yUA-.02;
 {const up=rings.filter(r=>r.y>=L.yW);for(let i=1;i<up.length;i++){const r=up[i],p=up[i-1];if(r.y>L.yTop)break;if(r.w>p.w*1.22||(p.clusters>1&&r.clusters===1)){L.yTop=Math.min(L.yTop,p.y-step*2);break}}}
 L.yTop=Math.max(L.yTop,L.yW+.02);
 // thigh / leg outlines below the crotch, so a close-fitting skirt can be kept clear of the legs
 const legs=[];
 for(let y=L.yCrotch;y>=.02;y-=.01){
  const s=clusterSlice(contour(P,I,y));if(!s)continue;
  const parts=s.all.filter(c=>Math.abs((c[0][0]+c[c.length-1][0])/2)<.11&&(c[c.length-1][0]-c[0][0])<.2);
  if(parts.length)legs.push({y,pts:parts.flat()});
 }
 return {rings:rings.filter(r=>r.y<=L.yTop+.004),legs,landmarks:L,per:{waist:at(L.yW).per,hip:at(L.yH).per,top:at(L.yTop).per}};
}

/* ---------- garment ---------- */
const smooth=(rs,n=2)=>rs.map((r,i)=>{const env=new Float32Array(K);let cx=0,cz=0,c=0;
 for(let d=-n;d<=n;d++){const q=rs[Math.min(rs.length-1,Math.max(0,i+d))];for(let j=0;j<K;j++)env[j]+=q.env[j];cx+=q.cx;cz+=q.cz;c++}
 for(let j=0;j<K;j++)env[j]=Math.max(env[j]/c,r.env[j]);return {...r,env,cx:cx/c,cz:cz/c}});
const lerp=(a,b,t)=>a+(b-a)*t;
function interpRing(rings,y){
 if(y<=rings[0].y)return rings[0];if(y>=rings[rings.length-1].y)return rings[rings.length-1];
 let i=0;while(rings[i+1].y<y)i++;const a=rings[i],b=rings[i+1],t=(y-a.y)/(b.y-a.y),env=new Float32Array(K);
 for(let j=0;j<K;j++)env[j]=lerp(a.env[j],b.env[j],t);return {env,cx:lerp(a.cx,b.cx,t),cz:lerp(a.cz,b.cz,t)};
}
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};

/* profile: {tubes:[{kind:'torso'|'skirt',pieceId,top,rings:[{h,C}]}]} from the pattern (cm).
   meas: the pattern's own body measurements (bust, waist, hip) so ease can be kept in proportion.
   heightCm: the model's height; patternHeightCm: the height the pattern was drafted for. */
export {contour,clusterSlice};
export function fitGarment(profile,body,{heightCm,meas={bust:92,waist:74,hip:98},patternHeightCm=172}={}){
 const L=body.landmarks,rings=smooth(body.rings,2),kLen=heightCm/patternHeightCm,margin=.0035;
 const hipRing=interpRing(rings,L.yH),meshes=[];
 const geometry=[];
 for(const tube of profile.tubes){
  const R=tube.rings,n=R.length;
  const wH=tube.kind==='torso'?Math.min(tube.waistH||R[n-1].h,R[n-1].h):0;
  // torso: the pattern's waist lands on the body's waist; anything below it (a hip-length blouse or tunic) hangs down from there
  const yOf=h=>tube.kind==='torso'
   ?(h<=wH?L.yTop-(L.yTop-L.yW)*(h/Math.max(1e-6,wH)):L.yW-((h-wH)*kLen)/heightCm)
   :L.yW-(h*kLen)/heightCm;
  const ref=h=>{ // the pattern's own body circumference at this height
   if(tube.kind==='torso')return h<=wH?lerp(meas.bust,meas.waist,h/Math.max(1e-6,wH)):lerp(meas.waist,meas.hip,Math.min(1,(h-wH)/20));
   return lerp(meas.waist,meas.hip,Math.min(1,h/20));
  };
  const radii=[],minR=[],centers=[],ys=[],pos=[],uv=[],idx=[];let vcm=tube.kind==='torso'?0:(L.yTop-L.yW)*heightCm;
  R.forEach((r,i)=>{
   const y=yOf(r.h);
   let ratio=r.C/ref(r.h);ratio=tube.kind==='torso'&&r.h<=wH?Math.min(1.12,Math.max(1.03,ratio)):Math.max(1.03,ratio);
   const base=y>=L.yH?interpRing(rings,y):hipRing; // below the hips the garment hangs from the hip ring
   let mean=0;for(let j=0;j<K;j++)mean+=base.env[j];mean/=K;
   let need=null;
   if(y<L.yH&&y>=L.yCrotch){ // between hip and crotch: stay outside the real outline at this height
    const q=interpRing(rings,y),off=Math.hypot(q.cx-base.cx,q.cz-base.cz);need=new Float32Array(K);
    for(let j=0;j<K;j++)need[j]=q.env[j]*1.025+off;
   }else if(y<L.yCrotch&&body.legs?.length){ // keep clear of the real legs at this height
    const lg=body.legs.reduce((m,q)=>Math.abs(q.y-y)<Math.abs(m.y-y)?q:m);need=new Float32Array(K);
    for(const [px,pz] of lg.pts){const a=(Math.atan2(pz-base.cz,px-base.cx)+TAU)%TAU,j=Math.floor(a/TAU*K)%K,d=Math.hypot(px-base.cx,pz-base.cz);if(d>need[j])need[j]=d}
    const raw=need.slice();for(let j=0;j<K;j++)need[j]=Math.max(raw[(j+K-1)%K],raw[j],raw[(j+1)%K])*1.025; // widen by one bin; read from a copy so the margin does not compound
   }
   const circ=ss(1.25,2.6,ratio); // very full skirts open up into a circle
   const want=new Float32Array(K),lo=new Float32Array(K);
   for(let j=0;j<K;j++){want[j]=lerp(base.env[j]*ratio,mean*ratio,circ)+margin;lo[j]=(need?need[j]:0)+margin;want[j]=Math.max(want[j],lo[j])}
   radii.push(want);minR.push(lo);centers.push([base.cx,base.cz]);ys.push(y);
  });
  // smooth along the height so the silhouette has no steps, but never go inside the body's clearance
  for(let pass=0;pass<3;pass++)for(let i=1;i<n-1;i++){const a=radii[i-1],b=radii[i],c=radii[i+1],o=new Float32Array(K);for(let j=0;j<K;j++)o[j]=Math.max(a[j]*.25+b[j]*.5+c[j]*.25,minR[i][j]);radii[i]=o}
  vcm=tube.kind==='torso'?0:(L.yTop-L.yW)*heightCm;let prevY=null;
  for(let i=0;i<n;i++){
   const y=ys[i];if(prevY!=null)vcm+=Math.abs(prevY-y)*heightCm;prevY=y;
   const [cx,cz]=centers[i],pts=[];
   for(let j=0;j<=K;j++){const jj=j%K,a=jj/K*TAU,rad=radii[i][jj];pts.push([cx+rad*Math.cos(a),y,cz+rad*Math.sin(a)])}
   let acc=0;pts.forEach((p,j)=>{if(j)acc+=Math.hypot(p[0]-pts[j-1][0],p[2]-pts[j-1][2]);pos.push(p[0],p[1],p[2]);uv.push(acc*heightCm,vcm)});
  }
  for(let i=0;i<n-1;i++)for(let j=0;j<K;j++){const a=i*(K+1)+j,b=a+K+1;idx.push(a,b,a+1,a+1,b,b+1)}
  meshes.push({kind:tube.kind,pieceId:tube.pieceId,positions:new Float32Array(pos),uvs:new Float32Array(uv),indices:new Uint32Array(idx)});
 }
 const per={waist:body.per.waist*heightCm,hip:body.per.hip*heightCm,top:body.per.top*heightCm};
 const notes=[];
 const rh=per.hip/meas.hip;
 if(Math.abs(rh-1)>.12)notes.push(`This model's hips are about ${Math.round(Math.abs(rh-1)*100)}% ${rh>1?'larger':'smaller'} than the pattern's size, so the garment was resized to fit the body. Use the matching size when you draft.`);
 return {meshes,notes,landmarks:L,measuredCm:per};
}
