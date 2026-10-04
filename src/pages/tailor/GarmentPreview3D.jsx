import React,{useEffect,useRef,useState} from 'react';
import {buildProfile,tubeMesh,axesFor} from './garment3d.js';
import {tileOf,tileSvg} from './fabrics.js';

/* 3D fabric preview: builds a garment shell from the pattern pieces and shows it on a simple dress form.
   three.js is loaded only when this opens. Sleeves are not modelled. */
const loadTile=(f)=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Could not draw the fabric'));i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(tileSvg(f,24))});

export default function GarmentPreview3D({ops,garmentFabric,onClose}){
 const host=useRef(null),[state,setState]=useState({status:'loading',notes:[]});
 useEffect(()=>{
  let stop=()=>{},dead=false;
  (async()=>{
   try{
    const profile=buildProfile(ops);
    if(!profile.tubes.length){setState({status:'unsupported',notes:[]});return}
    const THREE=await import('three');
    const {OrbitControls}=await import('three/examples/jsm/controls/OrbitControls.js');
    if(dead)return;
    const el=host.current,S=.1; // 1 scene unit = 10 cm
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;outline:none';el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(32,1,.1,200);
    scene.add(new THREE.HemisphereLight(0xffffff,0x998f88,1.05));
    const key=new THREE.DirectionalLight(0xffffff,1.6);key.position.set(5,9,7);scene.add(key);
    const rim=new THREE.DirectionalLight(0xffd9c4,.7);rim.position.set(-6,4,-7);scene.add(rim);
    const group=new THREE.Group();group.scale.setScalar(S);scene.add(group);
    const disposables=[];
    for(const tube of profile.tubes){
     const m=tubeMesh(tube,72),g=new THREE.BufferGeometry();
     g.setAttribute('position',new THREE.BufferAttribute(m.positions,3));g.setAttribute('uv',new THREE.BufferAttribute(m.uvs,2));g.setIndex(new THREE.BufferAttribute(m.indices,1));g.computeVertexNormals();
     const piece=ops.find(o=>o.id===tube.pieceId),f=piece?.fabric||garmentFabric,t=tileOf(f);
     const img=await loadTile(f);if(dead)return;
     const tex=new THREE.Texture(img);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
     const k=100/(f?.scale||100);tex.repeat.set(k/t.w,k/t.h);tex.center.set(0,0);tex.rotation=-(f?.rot||0)*Math.PI/180;tex.needsUpdate=true;
     const mat=new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:.88,metalness:0});
     group.add(new THREE.Mesh(g,mat));disposables.push(g,mat,tex);
    }
    // dress form: shoulder cap + neck + pole + base
    const form=new THREE.MeshStandardMaterial({color:0xd8d2cc,roughness:.8});disposables.push(form);
    const top=profile.tubes.find(t=>t.kind==='torso'),H=profile.height;
    if(top){
     const [a,b]=axesFor(top.rings[0].C),cap=new THREE.Mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI/2),form);
     cap.scale.set(a*.92,11,b*.92);cap.position.y=0;group.add(cap);
     const neck=new THREE.Mesh(new THREE.CylinderGeometry(4.2,5,9,24),form);neck.position.y=11+3;group.add(neck);disposables.push(cap.geometry,neck.geometry);
    }
    const poleTop=-(top?H*.35:0),floor=-(H+12);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(1,1,Math.abs(floor-poleTop),12),form);pole.position.y=(floor+poleTop)/2;group.add(pole);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(22,24,2.5,48),new THREE.MeshStandardMaterial({color:0x34304f,roughness:.6}));base.position.y=floor-1;group.add(base);
    disposables.push(pole.geometry,base.geometry,base.material);
    const midY=-(H*.42)*S+ (top?0.4:0);
    cam.position.set(0,midY+.6,Math.max(9,H*S*2.15));
    const ctl=new OrbitControls(cam,renderer.domElement);ctl.target.set(0,midY,0);ctl.enableDamping=true;ctl.autoRotate=true;ctl.autoRotateSpeed=1.4;ctl.minDistance=4;ctl.maxDistance=30;ctl.update();
    const resize=()=>{const w=el.clientWidth||600,h=el.clientHeight||500;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};
    resize();const ro=new ResizeObserver(resize);ro.observe(el);
    let raf=0;const loop=()=>{raf=requestAnimationFrame(loop);ctl.update();renderer.render(scene,cam)};loop();
    const stopSpin=()=>{ctl.autoRotate=false};renderer.domElement.addEventListener('pointerdown',stopSpin);
    setState({status:'ready',notes:profile.notes});
    stop=()=>{cancelAnimationFrame(raf);ro.disconnect();ctl.dispose();disposables.forEach(d=>d.dispose?.());renderer.dispose();renderer.domElement.remove()};
   }catch(e){if(!dead)setState({status:'error',msg:e.message,notes:[]})}
  })();
  return()=>{dead=true;stop()};
 },[]);
 return <div className="tt-modal" role="dialog" aria-label="3D fabric preview" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="tt-modal-card">
   <div className="tt-modal-head"><div><strong>3D fabric preview</strong><small>Drag to turn · scroll to zoom. Sleeves are not shown.</small></div><button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button></div>
   <div className="tt-3d" ref={host}>
    {state.status==='loading'&&<div className="tt-3d-msg"><span className="ui-spinner" style={{'--spinner-size':'22px'}}/></div>}
    {state.status==='unsupported'&&<div className="tt-3d-msg"><b>Nothing to preview yet</b><p>Add a bodice and skirt (or a dress, skirt or blouse starter) from the Design tab. Trousers and hand-drawn pieces can't be shown in 3D yet.</p></div>}
    {state.status==='error'&&<div className="tt-3d-msg"><b>The 3D preview could not start</b><p>{state.msg||'Your browser may not support WebGL.'}</p></div>}
   </div>
   {state.notes?.length>0&&<div className="tt-modal-foot">{state.notes.join(' ')}</div>}
  </div>
 </div>;
}
