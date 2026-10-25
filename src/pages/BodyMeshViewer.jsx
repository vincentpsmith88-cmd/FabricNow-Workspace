import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {fetchBlob} from '../api.js';

export default function BodyMeshViewer({scanId}){
 const host=useRef(null);
 useEffect(()=>{
  let renderer,frame,controls,scene,observer,objectUrl,disposed=false;
  const el=host.current;if(!el||!scanId)return;
  (async()=>{
   try{
    const blob=await fetchBlob(`/api/body-measurements/scans/${scanId}/files/body.glb`);objectUrl=URL.createObjectURL(blob);
    if(disposed)return;
    scene=new THREE.Scene();scene.background=new THREE.Color(0xf5f7fb);
    const camera=new THREE.PerspectiveCamera(38,1,.1,2000);camera.position.set(0,90,220);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x8793a5,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(100,150,100);scene.add(light);
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
    new GLTFLoader().load(objectUrl,g=>{if(disposed)return;const model=g.scene;scene.add(model);const box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.sub(center);camera.position.set(0,box.getSize(new THREE.Vector3()).y*.8,box.getSize(new THREE.Vector3()).y*2.2);controls.target.set(0,0,0);controls.update();},undefined,()=>{});
    const resize=()=>{const w=el.clientWidth||600,h=el.clientHeight||420;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};observer=new ResizeObserver(resize);observer.observe(el);resize();
    const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};animate();
   }catch(e){el.dataset.error=e.message}
  })();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();renderer?.dispose();if(renderer?.domElement?.parentNode)renderer.domElement.parentNode.removeChild(renderer.domElement);if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[scanId]);
 return <div ref={host} className="bm-mesh-viewer"><span>Drag to rotate · Scroll to zoom</span></div>
}
