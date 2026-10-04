import { analyzeBody, fitGarment } from './garmentFit.js';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

/**
 * In-page three.js viewer for the FBX fitting bodies.
 *
 * Lighting is a proper three-point studio rig plus image-based lighting, attached to the camera so the
 * body is evenly and flatteringly lit from every angle while you orbit:
 *   key (warm, soft shadows) · fill (cool) · two rim lights (edge separation) · hemisphere + environment.
 * Backdrop is CSS (see .fmv in redesign.css) so lighting presets can restyle it without touching WebGL.
 */
export const LIGHTING = {
  studio:   { label: 'Studio',   exposure: .9,  env: .2,  hemi: [0xcfd8ff, 0x14122a, .22], key: [0xfff0e0, 2.3], fill: [0xbfd2ff, .4], rimA: [0xffb08a, 2.8], rimB: [0x9db8ff, 2.1], floor: 0x24214a, shadow: .45 },
  daylight: { label: 'Daylight', exposure: .85,  env: .4,  hemi: [0xffffff, 0xcfc8da, .45], key: [0xffffff, 2.0], fill: [0xe4eeff, .6], rimA: [0xffffff, 1.2], rimB: [0xfff1e6, 1.0], floor: 0xe4e0ec, shadow: .28 },
  noir:     { label: 'Spotlight', exposure: .9,  env: .12, hemi: [0x8890b0, 0x050507, .12], key: [0xffffff, 1.9], fill: [0x8da0d0, .2], rimA: [0xff7a45, 4.4], rimB: [0xff9a72, 3.0], floor: 0x121116, shadow: .6 },
};

const FILE_CACHE = new Map(); // file -> Promise<Object3D>
const RING = 0xe66239;

function createRuntime(el, M, cb) {
  const { THREE, OrbitControls, FBXLoader, RoomEnvironment, SkeletonUtils } = M;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;outline:none;touch-action:none';
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 1, 4.5);
  scene.add(camera);

  // ---- light rig (children of the camera => consistent lighting from every viewing angle)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
  scene.add(hemi);
  const rig = {};
  const OFFSETS = { key: [-1.6, 6.2, 2.6], fill: [3.4, 1.2, 3.2], rimA: [-3.6, 2.4, -3.8], rimB: [3.6, 2.8, -3.6] };
  Object.keys(OFFSETS).forEach((name) => {
    const l = new THREE.DirectionalLight(0xffffff, 1);
    camera.add(l); camera.add(l.target);
    rig[name] = l;
  });
  const key = rig.key;
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 9;
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.06;
  Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 2.2, bottom: -1.2, near: 0.5, far: 18 });

  // ---- turntable
  const platformMat = new THREE.MeshLambertMaterial({ color: 0x24214a });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.74, 0.03, 120), platformMat);
  platform.position.y = -0.015; platform.receiveShadow = true; scene.add(platform);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.755, 0.762, 160), new THREE.MeshBasicMaterial({ color: RING, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.085, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: THREE.DoubleSide }));
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.001; scene.add(ring2);
  const catcherMat = new THREE.ShadowMaterial({ opacity: 0.5 });
  const catcher = new THREE.Mesh(new THREE.CircleGeometry(1.35, 64), catcherMat);
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.0005; catcher.receiveShadow = true; scene.add(catcher);

  const holder = new THREE.Group(); scene.add(holder);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.075;
  controls.enablePan = false; controls.rotateSpeed = 0.8; controls.zoomSpeed = 0.8;
  controls.autoRotateSpeed = 1.6;
  controls.minPolarAngle = Math.PI * 0.2; controls.maxPolarAngle = Math.PI * 0.56;
  controls.addEventListener('start', () => { tween = null; cb.onInteract?.(); });

  let tween = null;
  let heightM = 1.75, targetHeightM = 1.75;
  let current = null;
  let raf = 0, last = performance.now(), disposed = false;

  function setLighting(name) {
    const p = LIGHTING[name] || LIGHTING.studio;
    renderer.toneMappingExposure = p.exposure;
    scene.environmentIntensity = p.env;
    hemi.color.setHex(p.hemi[0]); hemi.groundColor.setHex(p.hemi[1]); hemi.intensity = p.hemi[2];
    [['key', p.key], ['fill', p.fill], ['rimA', p.rimA], ['rimB', p.rimB]].forEach(([n, [c, i]]) => { rig[n].color.setHex(c); rig[n].intensity = i; });
    platformMat.color.setHex(p.floor);
    catcherMat.opacity = p.shadow;
  }

  function placeLights() {
    const D = camera.position.distanceTo(controls.target);
    Object.entries(OFFSETS).forEach(([n, o]) => { rig[n].position.set(o[0], o[1] + 0, o[2] - D); rig[n].target.position.set(0, 0, -D); });
    // offsets are relative to the orbit target, expressed in camera space
  }

  function frame(h) {
    controls.target.set(0, h * 0.52, 0);
    const dist = (h * 1.32) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.radius = Math.max(dist, 2.2); sph.phi = Math.PI * 0.47;
    off.setFromSpherical(sph);
    camera.position.copy(controls.target).add(off);
    controls.minDistance = sph.radius * 0.45; controls.maxDistance = sph.radius * 1.9;
    controls.update();
  }

  function normalize(obj) {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const k = 1 / (size.y || 1);
    obj.scale.multiplyScalar(k);
    obj.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(obj);
    const c = b2.getCenter(new THREE.Vector3());
    obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
  }

  function prepare(obj) {
    // The supplied FBX files carry the Blender scene's own lights (a 1000-intensity point light) and cameras.
    // Left in, they blow the body out to flat white no matter how the studio rig is set — strip them.
    const strip = [];
    obj.traverse((o) => { if (o.isLight || o.isCamera) strip.push(o); });
    strip.forEach((o) => o.parent && o.parent.remove(o));
    obj.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true; child.receiveShadow = true; child.frustumCulled = false;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const next = mats.map((m) => {
        if (!m) return m;
        // FBX arrives as Phong/Lambert; PBR responds correctly to the studio lights + environment.
        const std = new THREE.MeshStandardMaterial({
          color: m.color ? m.color.clone() : 0xd9c3b0, map: m.map || null, normalMap: m.normalMap || null,
          roughness: 0.62, metalness: 0, side: m.side === THREE.DoubleSide ? THREE.DoubleSide : THREE.FrontSide,
          transparent: false, opacity: 1,
        });
        if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
        // Pure-white albedo clips to a flat silhouette under any strong light; tone it to a soft mannequin grey-beige.
        const hsl = {}; std.color.getHSL(hsl);
        if (!std.map && hsl.l > 0.6) std.color.setHSL(0.07, 0.12, 0.56);
        else if (std.map) std.color.multiplyScalar(0.82);
        std.roughness = 0.72;
        return std;
      });
      child.material = Array.isArray(child.material) ? next : next[0];
    });
  }

  function load(file) {
    if (!FILE_CACHE.has(file)) {
      FILE_CACHE.set(file, new Promise((resolve, reject) => {
        new FBXLoader().load(`/models/${encodeURIComponent(file)}`, resolve, undefined, (e) => { FILE_CACHE.delete(file); reject(e instanceof Error ? e : new Error('Could not load this model file.')); });
      }));
    }
    return FILE_CACHE.get(file);
  }

  async function loadModel(file, cm, landmarks) {
    const src = await load(file);
    if (disposed) return;
    const clone = SkeletonUtils.clone(src);
    prepare(clone); normalize(clone);
    if (current) holder.remove(current);
    disposeGarment();
    current = clone; holder.add(clone);
    currentFile = file; currentLandmarks = landmarks || null; currentCm = cm;
    heightM = targetHeightM = cm / 100;
    holder.scale.setScalar(heightM);
    frame(heightM);
    applyGarment();
  }

  /* ---------- garment fitted to the loaded body (patterns from Tailor Tools) ---------- */
  const BODY_CACHE = new Map();
  let garmentSpec = null, garmentGroup = null, garmentToken = 0, currentFile = null, currentLandmarks = null, currentCm = 175;
  function disposeGarment() {
    garmentToken++;
    if (!garmentGroup) return;
    holder.remove(garmentGroup);
    garmentGroup.traverse((o) => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
    garmentGroup = null;
  }
  /* The body's triangles in the holder's own space (height = 1, feet on y = 0), measured once per model file. */
  function bodyData() {
    if (BODY_CACHE.has(currentFile)) return BODY_CACHE.get(currentFile);
    holder.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert(), v = new THREE.Vector3(), pos = [], idx = [];
    let base = 0;
    current.traverse((c) => {
      if (!c.isMesh || !c.geometry?.attributes?.position) return;
      const m = new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld), a = c.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        if (c.isSkinnedMesh && c.getVertexPosition) c.getVertexPosition(i, v); else v.set(a.getX(i), a.getY(i), a.getZ(i));
        v.applyMatrix4(m); pos.push(v.x, v.y, v.z);
      }
      const ix = c.geometry.index;
      if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + base); else for (let i = 0; i < a.count; i++) idx.push(i + base);
      base += a.count;
    });
    const P = Float32Array.from(pos), I = Uint32Array.from(idx);
    const body = analyzeBody(P, I, { landmarks: currentLandmarks }) || analyzeBody(P, I);
    BODY_CACHE.set(currentFile, body);
    return body;
  }
  function makeTexture(f) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const tex = new THREE.Texture(img), k = 100 / (f.scale || 100);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
        tex.repeat.set(k / f.tile[0], k / f.tile[1]); tex.center.set(0, 0); tex.rotation = -(f.rot || 0) * Math.PI / 180; tex.needsUpdate = true;
        resolve(tex);
      };
      img.onerror = () => reject(new Error('Could not draw the fabric.'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(f.svg);
    });
  }
  async function applyGarment() {
    disposeGarment();
    const token = garmentToken;
    if (!garmentSpec || !current || garmentSpec.visible === false) { cb.onGarmentInfo?.({ status: 'none' }); return; }
    try {
      const body = bodyData();
      if (!body) { cb.onGarmentInfo?.({ status: 'error', message: "This model's body could not be measured, so the garment can't be fitted." }); return; }
      const fit = fitGarment(garmentSpec.profile, body, { heightCm: currentCm, meas: garmentSpec.meas, patternHeightCm: garmentSpec.patternHeightCm });
      const group = new THREE.Group();
      for (const m of fit.meshes) {
        const f = garmentSpec.fabrics[m.kind] || garmentSpec.fabrics.torso || garmentSpec.fabrics.skirt;
        const tex = await makeTexture(f);
        if (token !== garmentToken || disposed) { tex.dispose(); return; }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3)); g.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
        g.setIndex(new THREE.BufferAttribute(m.indices, 1)); g.computeVertexNormals();
        group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: .86, metalness: 0 })));
      }
      if (token !== garmentToken || disposed) return;
      holder.add(group); garmentGroup = group;
      cb.onGarmentInfo?.({ status: 'ok', notes: fit.notes });
    } catch (e) { cb.onGarmentInfo?.({ status: 'error', message: e?.message || 'The garment could not be fitted.' }); }
  }
  function setGarment(spec) { garmentSpec = spec || null; applyGarment(); }

  function setHeight(cm) { targetHeightM = cm / 100; }
  function goTo(deg) {
    const to = THREE.MathUtils.degToRad(deg);
    let from = controls.getAzimuthalAngle();
    let d = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    tween = { from, d, t: 0 };
  }
  function reset() { frame(targetHeightM); goTo(0); }
  function snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); }
  function resize() {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // keep the full body in frame on tall/narrow stages
    camera.zoom = Math.min(1, camera.aspect / 0.78); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (Math.abs(heightM - targetHeightM) > 0.0005) { heightM += (targetHeightM - heightM) * Math.min(1, dt * 9); holder.scale.setScalar(heightM); controls.target.y = heightM * 0.52; }
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 0.75);
      const e = 1 - Math.pow(1 - tween.t, 3);
      const off = camera.position.clone().sub(controls.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      sph.theta = tween.from + tween.d * e;
      off.setFromSpherical(sph); camera.position.copy(controls.target).add(off);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
    placeLights();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  return {
    setLighting, loadModel, setHeight, setGarment, goTo, reset, snapshot,
    setAutoRotate: (v) => { controls.autoRotate = !!v; },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      disposeGarment(); envTex.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
      renderer.domElement.remove();
    },
  };
}

const FitModelViewer = forwardRef(function FitModelViewer({ model, scale = 1, view, lighting = 'studio', autoRotate = false, garment = null, onGarmentInfo, onInteract, className = '' }, ref) {
  const mount = useRef(null);
  const [rt, setRt] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const onInteractRef = useRef(onInteract); onInteractRef.current = onInteract;
  const infoRef = useRef(onGarmentInfo); infoRef.current = onGarmentInfo;
  const heightCm = model ? model.measurements.height * (model.child ? 1 : scale) : 175;
  const heightRef = useRef(heightCm); heightRef.current = heightCm;
  const lightingRef = useRef(lighting); lightingRef.current = lighting;

  useImperativeHandle(ref, () => ({ snapshot: () => rt?.snapshot(), reset: () => rt?.reset() }), [rt]);

  useEffect(() => {
    let dead = false; let runtime = null;
    (async () => {
      try {
        const [THREE, oc, fbx, re, su] = await Promise.all([
          import('three'),
          import('three/addons/controls/OrbitControls.js'),
          import('three/addons/loaders/FBXLoader.js'),
          import('three/addons/environments/RoomEnvironment.js'),
          import('three/addons/utils/SkeletonUtils.js'),
        ]);
        if (dead || !mount.current) return;
        runtime = createRuntime(mount.current, { THREE, OrbitControls: oc.OrbitControls, FBXLoader: fbx.FBXLoader, RoomEnvironment: re.RoomEnvironment, SkeletonUtils: su }, { onInteract: () => onInteractRef.current?.(), onGarmentInfo: (i) => infoRef.current?.(i) });
        runtime.setLighting(lightingRef.current);
        setRt(runtime);
      } catch (e) {
        if (!dead) { setError('3D preview is not supported in this browser (WebGL is required).'); setStatus('error'); }
      }
    })();
    return () => { dead = true; runtime?.dispose(); setRt(null); };
  }, []);

  useEffect(() => { rt?.setLighting(lighting); }, [rt, lighting]);
  useEffect(() => { rt?.setAutoRotate(autoRotate); }, [rt, autoRotate]);
  useEffect(() => { rt?.setHeight(heightCm); }, [rt, heightCm]);
  useEffect(() => { rt?.setGarment(garment); }, [rt, garment]);
  useEffect(() => { if (rt && view) rt.goTo(view.deg); }, [rt, view]); // eslint-disable-line

  useEffect(() => {
    if (!rt || !model) return undefined;
    let dead = false;
    setStatus('loading'); setError('');
    rt.loadModel(model.file, heightRef.current, model.landmarks)
      .then(() => { if (!dead) setStatus('ready'); })
      .catch((e) => { if (!dead) { setError(e?.message || 'This model could not be loaded.'); setStatus('error'); } });
    return () => { dead = true; };
  }, [rt, model]);

  return (
    <div className={`fmv ${className}`} data-lighting={lighting}>
      <div className="fmv-canvas" ref={mount} aria-label={model ? `${model.label} 3D fitting avatar` : '3D viewer'} role="img" />
      {status === 'loading' && <div className="fmv-overlay" aria-live="polite"><span className="fmv-spin" /><small>Loading fitting avatar…</small></div>}
      {status === 'error' && <div className="fmv-overlay fmv-error" role="alert"><strong>Couldn’t show this model</strong><small>{error}</small></div>}
    </div>
  );
});
export default FitModelViewer;
