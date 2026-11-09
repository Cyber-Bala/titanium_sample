import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { chapters, SPACE_END, stationCenter, stationHalf } from "./chapters";
import { AVENUE_HALF, buildCity } from "./city";

export interface SceneHandle {
  setProgress(p: number): void;
  dispose(): void;
  resize(): void;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const earthVert = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz;
  gl_Position=projectionMatrix*viewMatrix*w; }
`;
const earthFrag = /* glsl */ `
uniform sampler2D tDay; uniform sampler2D tNight; uniform sampler2D tSpec; uniform vec3 uSun;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 N=normalize(vN); vec3 L=normalize(uSun); vec3 V=normalize(cameraPosition-vW);
  float d=dot(N,L);
  vec3 day=texture2D(tDay,vUv).rgb; vec3 night=texture2D(tNight,vUv).rgb; float spec=texture2D(tSpec,vUv).r;
  float lit=smoothstep(-0.12,0.28,d);
  vec3 dayCol=day*(0.03+1.15*max(d,0.0));
  vec3 H=normalize(L+V); float sp=pow(max(dot(N,H),0.0),70.0)*spec*0.9;
  float fres=pow(1.0-max(dot(N,V),0.0),3.0);
  vec3 col=mix(night*vec3(1.2,0.95,0.6)*1.4+day*0.012, dayCol+sp, lit);
  col+=vec3(0.15,0.4,0.8)*fres*0.5*smoothstep(-0.3,0.4,d);
  gl_FragColor=vec4(col,1.0);
  #include <colorspace_fragment>
}
`;
const atmoVert = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);
  vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }
`;
const atmoFrag = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main(){ float f=pow(0.74-dot(-vN,vV),3.2); f=clamp(f,0.0,1.0);
  gl_FragColor=vec4(vec3(0.25,0.6,1.0)*f*1.5,f); }
`;

export function createScene(
  canvas: HTMLCanvasElement,
  opts: { low: boolean; onProgress: (n: number) => void; onReady: () => void },
): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.low, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.low ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.Fog(0x070d18, 70, 330);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.4;

  const sun = new THREE.Vector3(-0.55, 0.3, 0.75).normalize();
  const dir = new THREE.DirectionalLight(0xfff4e6, 1.5);
  dir.position.copy(sun).multiplyScalar(100);
  const rim = new THREE.DirectionalLight(0x39c7e8, 1.2);
  rim.position.set(30, 10, -60);
  scene.add(dir, rim, new THREE.HemisphereLight(0x8bd9ff, 0x05070d, 0.35));

  // ---- loading
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, loaded, total) => opts.onProgress(loaded / total);
  let disposed = false;
  manager.onLoad = () => !disposed && opts.onReady();
  const draco = new DRACOLoader(manager).setDecoderPath("/draco/");
  const gltf = new GLTFLoader(manager).setDRACOLoader(draco);
  const tex = new THREE.TextureLoader(manager);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const T = (file: string, srgb = true) => {
    const t = tex.load(`/assets/tex/${file}`);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    return t;
  };

  const tame = (root: THREE.Object3D, cap = 1.5) =>
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "emissiveIntensity" in m) m.emissiveIntensity = Math.min(m.emissiveIntensity, cap);
    });

  // ---- real dusk HDRI (Poly Haven, CC0) for city reflections + sky
  let cityEnv: THREE.Texture | null = null;
  let cityBg: THREE.Texture | null = null;
  new RGBELoader(manager).load("/assets/tex/venice_sunset_1k.hdr", (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    cityBg = hdr;
    cityEnv = pmrem.fromEquirectangular(hdr).texture;
  });
  const spaceBg = new THREE.Color(0x05070d);

  // ---- stars (follow camera so they read as infinitely far)
  const starCount = opts.low ? 700 : 1600;
  const sp = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1500);
    sp.set([v.x, v.y, v.z], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const sm = new THREE.PointsMaterial({ color: 0xdfeaff, size: opts.low ? 3 : 2.4, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  const stars = new THREE.Points(sg, sm);
  stars.frustumCulled = false;
  scene.add(stars);

  // ---- nebula sky (procedural, follows camera)
  const nebula = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uT: { value: 0 }, uAmt: { value: 1 }, uCity: { value: 0 } },
      vertexShader: "varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `
        uniform float uT; uniform float uAmt; uniform float uCity; varying vec3 vD;
        float h(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
        float n(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
        float fbm(vec3 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=0.5;}return v;}
        void main(){
          vec3 d=normalize(vD);
          float a=fbm(d*2.2+vec3(0.0,uT*0.003,0.0));
          float b=fbm(d*3.6+vec3(9.0,3.0,uT*0.002));
          vec3 base=mix(vec3(0.012,0.02,0.05),vec3(0.03,0.05,0.12),d.y*0.5+0.5);
          vec3 teal=vec3(0.05,0.35,0.55)*smoothstep(0.45,0.85,a);
          vec3 violet=vec3(0.32,0.1,0.5)*smoothstep(0.5,0.9,b)*0.8;
          vec3 amber=vec3(0.55,0.28,0.1)*smoothstep(0.62,0.95,fbm(d*5.0+7.0))*0.5;
          vec3 col=base+(teal+violet+amber)*0.55*uAmt*(1.0-0.5*uCity);
          float hz=exp(-abs(d.y)*5.5);
          col+=mix(vec3(0.95,0.42,0.22),vec3(0.35,0.18,0.55),smoothstep(-0.05,0.45,d.y))*hz*0.85*uCity;
          col=mix(col,vec3(0.02,0.03,0.06),smoothstep(0.0,-0.35,d.y)*uCity);
          gl_FragColor=vec4(col,1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  nebula.frustumCulled = false;
  nebula.renderOrder = -10;
  scene.add(nebula);

  // ---- Earth
  const earth = new THREE.Group();
  const seg = opts.low ? 64 : 128;
  const earthMat = new THREE.ShaderMaterial({
    uniforms: { tDay: { value: T("earth_atmos_2048.jpg") }, tNight: { value: T("earth_lights_2048.png") }, tSpec: { value: T("earth_specular_2048.jpg", false) }, uSun: { value: sun } },
    vertexShader: earthVert,
    fragmentShader: earthFrag,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, seg, seg), earthMat);
  const cloudMap = T("earth_clouds_1024.png", false);
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: cloudMap, transparent: true, opacity: 0.9, depthWrite: false, roughness: 1, metalness: 0, fog: false });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.008, seg, seg), cloudMat);
  const atmoMat = new THREE.ShaderMaterial({ vertexShader: atmoVert, fragmentShader: atmoFrag, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.13, 96, 96), atmoMat);
  earth.add(body, clouds, atmo);
  scene.add(earth);

  // procedural panel-line / scratch map: bump + roughness variation so metal reads as worn, not CG-clean
  const grunge = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#b8b8b8";
    g.fillRect(0, 0, 512, 512);
    let sd = 4242;
    const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? 255 : 40},${r() < 0.5 ? 255 : 40},${r() < 0.5 ? 255 : 40},${0.04 + r() * 0.1})`;
      g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3);
    }
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 3;
    for (const k of [0.5]) { g.strokeRect(10, 10, 492, 492); g.beginPath(); g.moveTo(256, 10); g.lineTo(256, 502); g.moveTo(10, 256); g.lineTo(502, 256); g.stroke(); void k; }
    g.strokeStyle = "rgba(255,255,255,0.28)";
    g.lineWidth = 1;
    for (let i = 0; i < 70; i++) { g.beginPath(); const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60); g.stroke(); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  })();
  const wear = (root: THREE.Object3D) =>
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "roughnessMap" in m && !m.userData.worn && m.emissiveIntensity <= 0.01 && m.emissive.getHex() === 0) {
        m.userData.worn = true;
        m.roughnessMap = grunge;
        m.bumpMap = grunge;
        m.bumpScale = 0.9;
        m.needsUpdate = true;
      }
    });

  // ---- spacecraft
  const ship = new THREE.Group();
  const pivot = ship;
  const shipRoot = new THREE.Group();
  pivot.add(shipRoot);
  scene.add(pivot);
  const trailGeo = new THREE.ConeGeometry(0.16, 2.4, 20, 1, true);
  trailGeo.rotateZ(Math.PI / 2);
  trailGeo.translate(-4.9, 0, 0);
  const trailMat = new THREE.MeshBasicMaterial({ color: 0x39c7e8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  shipRoot.add(trail);
  gltf.load("/assets/models/spacecraft.glb", (g) => { tame(g.scene, 0.6); shipRoot.add(g.scene); });

  // ---- city route
  const N = chapters.length;
  const SIDE_X = AVENUE_HALF + 16;
  const stationZ = chapters.map((_, i) => -(130 + i * 85));
  const zStart = 300;
  const zEnd = stationZ[N - 1] - 90;
  const up = new THREE.Vector3(0, 1, 0);
  const pts: THREE.Vector3[] = [
    new THREE.Vector3(0, 340, 320), new THREE.Vector3(0, 240, 210), new THREE.Vector3(0, 120, 80),
    new THREE.Vector3(0, 46, -10), new THREE.Vector3(0, 15, -70),
  ];
  for (let i = 0; i < N; i++) pts.push(new THREE.Vector3(Math.sin(i * 1.3) * 4, 11 + Math.sin(i * 0.9 + 1) * 2.5, stationZ[i] + 20));
  pts.push(new THREE.Vector3(0, 13, zEnd));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const uTable: number[] = [];
  {
    const samples = 6000;
    const zs: number[] = [];
    for (let k = 0; k <= samples; k++) zs.push(curve.getPointAt(k / samples).z);
    stationZ.forEach((z) => {
      let bi = 0, bd = 1e9;
      zs.forEach((zz, k) => { const d = Math.abs(zz - z); if (d < bd) { bd = d; bi = k; } });
      uTable.push(bi / samples);
    });
  }
  const U = (i: number) => uTable[i];
  const rightAt = (u: number) => {
    const t = curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
    return new THREE.Vector3().crossVectors(t, up).normalize();
  };
  const plazas = chapters.map((c, i) => ({ x: c.side * SIDE_X, z: stationZ[i] }));
  const city = buildCity({ low: opts.low, plazas, zStart, zEnd, manager });
  city.group.visible = false;
  scene.add(city.group);

  const stationObjs: { group: THREE.Group; spins: THREE.Object3D[] }[] = [];
  const stationPos: THREE.Vector3[] = [];
  chapters.forEach((c, i) => {
    const group = new THREE.Group();
    group.position.set(plazas[i].x, 0.05, plazas[i].z);
    group.lookAt(new THREE.Vector3(0, 0.05, plazas[i].z));
    group.visible = false;
    scene.add(group);
    stationPos.push(group.position.clone());
    const spins: THREE.Object3D[] = [];
    stationObjs.push({ group, spins });
    gltf.load(`/assets/models/${c.model}.glb`, (g) => {
      tame(g.scene, 1.6);
      wear(g.scene);
      g.scene.traverse((o) => { if (o.name.startsWith("spin_")) spins.push(o); });
      group.add(g.scene);
    });
  });

  // original transforming mech-vehicle ("TITAN"): vehicle on the road, robot at each stop
  const titanPivot = new THREE.Group();
  const titanRoot = new THREE.Group();
  titanPivot.add(titanRoot);
  titanPivot.visible = false;
  scene.add(titanPivot);
  let titanMixer: THREE.AnimationMixer | null = null;
  const titanActions: THREE.AnimationAction[] = [];
  let titanDur = 1;
  gltf.load("/assets/models/titan.glb", (g) => {
    tame(g.scene, 0.7);
    wear(g.scene);
    g.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (o.name.startsWith("Glow") || o.name.startsWith("PackFlame"))) {
        const mm = (m.material as THREE.MeshStandardMaterial).clone();
        mm.emissiveIntensity = 0.18;
        mm.color.multiplyScalar(0.35);
        m.material = mm;
      }
    });
    titanRoot.add(g.scene);
    titanMixer = new THREE.AnimationMixer(g.scene);
    g.animations.forEach((clip) => {
      const act = titanMixer!.clipAction(clip);
      act.setLoop(THREE.LoopOnce, 1);
      act.clampWhenFinished = true;
      act.play();
      act.setEffectiveTimeScale(0);
      titanActions.push(act);
      titanDur = Math.max(titanDur, clip.duration);
    });
  });
  // TITANIUM wordmark above the hub plaza
  const wordmark = new THREE.Group();
  gltf.load("/assets/models/titanium-text.glb", (g) => {
    g.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ color: 0xdfe8f2, metalness: 1, roughness: 0.2, emissive: 0x1a6a88, emissiveIntensity: 0.6 });
    });
    g.scene.scale.setScalar(6.5);
    wordmark.add(g.scene);
  });
  wordmark.position.set(0, 58, plazas[0].z - 20);
  wordmark.visible = false;
  scene.add(wordmark);

  // ---- post
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!opts.low) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.4, 1.25);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---- progress -> route parameter (smootherstep between station centres => natural dwell)
  const centres = chapters.map((_, i) => stationCenter(i));
  const uOf = (P: number) => {
    if (P <= centres[0]) return lerp(0.0, U(0), smoother(Math.max(0, (P - SPACE_END) / (centres[0] - SPACE_END))));
    if (P >= centres[N - 1]) return lerp(U(N - 1), 1, smoother(Math.min(1, (P - centres[N - 1]) / (1 - centres[N - 1]))));
    let i = 0;
    while (i < N - 2 && P > centres[i + 1]) i++;
    return lerp(U(i), U(i + 1), smoother((P - centres[i]) / (centres[i + 1] - centres[i])));
  };

  let dtG = 0.016;
  let progress = 0;
  let target = 0;
  let raf = 0;
  let last = performance.now();
  const clock = new THREE.Clock();
  const camPos = new THREE.Vector3();
  const lookAtV = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function spacePhase(P: number, t: number) {
    const p = P / SPACE_END; // 0..1 inside space phase
    const wide = camera.aspect > 1;
    const approach = smooth(0, 0.6, p);
    const entry = smooth(0.6, 1, p);
    earth.position.set(wide ? lerp(3.6, 0, approach) : lerp(1.2, 0, approach), lerp(-0.6, -0.2, approach) - entry * 5.2, lerp(-52, -9, approach) + entry * 6);
    earth.scale.setScalar(lerp(1, 4.2, approach) * lerp(1, 1.5, entry));
    earth.rotation.set(0.25, t * 0.03 + p * 0.8, 0);
    clouds.rotation.y = t * 0.012;
    camera.position.set(0, lerp(0.3, 0.1, approach), 4.2);
    camera.lookAt(0, 0, -6);
    const hx = wide ? 2.1 : 0.5;
    pivot.position.set(
      lerp(hx, wide ? 1.5 : 0.3, smooth(0, 0.5, p)) + Math.sin(t * 0.3) * 0.04,
      lerp(-0.9, 1.0, smooth(0, 0.5, p)) + Math.sin(t * 0.4) * 0.03 + entry * 0.8,
      lerp(-2.0, -6.5, smooth(0.1, 0.7, p)) - entry * 18,
    );
    pivot.rotation.set(0.05, Math.PI / 2 - 0.75 + p * 0.55, -0.06 + Math.sin(t * 0.25) * 0.012);
    pivot.scale.setScalar(0.5);
    const boost = smooth(0.04, 0.2, p);
    trail.scale.set(0.5 + boost * 0.6, 0.7 + boost * 0.2, 0.7 + boost * 0.2);
    trailMat.opacity = 0.14 + boost * 0.16;
    sm.opacity = 0.85 * (1 - smooth(0.7, 1, p) * 0.0);
    stars.position.copy(camera.position);
    nebula.position.copy(camera.position);
    (nebula.material as THREE.ShaderMaterial).uniforms.uT.value = t;
    scene.fog = null;
    (nebula.material as THREE.ShaderMaterial).uniforms.uCity.value = 0;
    dir.color.setHex(0xfff4e6);
    dir.intensity = 1.5;
    dir.position.copy(sun).multiplyScalar(100);
    scene.background = spaceBg;
    scene.environment = envTex;
    scene.environmentIntensity = 0.4;
    nebula.visible = true;
    stars.visible = true;
    earth.visible = true;
    ship.visible = true;
    titanPivot.visible = false;
    city.group.visible = false;
    wordmark.visible = false;
    atmo.scale.setScalar(1);
    clouds.visible = true;
    cloudMat.opacity = 0.9;
    for (const s of stationObjs) s.group.visible = false;
    renderMain();
  }

  const faceDummy = new THREE.Object3D();
  const basisQ = new THREE.Quaternion();
  const fogCity = new THREE.Fog(0x7a5f6e, 70, 760);
  function routePhase(P: number, t: number) {
    const u = uOf(P);
    const uc = Math.max(0.0005, u - 0.0016);
    const us = Math.min(0.9995, u + 0.0085);
    const cp = curve.getPointAt(uc);
    const sp2 = curve.getPointAt(us);
    const tangent = curve.getTangentAt(us);
    let ci = 0, best = 9;
    for (let i = 0; i < N; i++) {
      const d = Math.abs(P - centres[i]);
      if (d < best) { best = d; ci = i; }
    }
    const dwell = P < centres[0] - stationHalf ? 0 : 1 - smooth(0.25, 1.1, best / stationHalf);
    const ch = chapters[ci];
    const rightV = rightAt(u);
    camPos.copy(cp).add(tmp.set(0, 2.4, 0)).addScaledVector(rightV, -ch.side * dwell * (ch.wide ? 13 : 4));
    camera.position.copy(camPos);
    const sPos = stationPos[ci];
    lookAtV.copy(curve.getPointAt(Math.min(0.999, u + 0.02)));
    const focus = tmp.copy(sPos).addScaledVector(rightV, -ch.side * (ch.wide ? 25 : 15));
    focus.y += ch.wide ? 9 : 3;
    lookAtV.lerp(focus, dwell * 0.85);
    camera.lookAt(lookAtV);

    // transform progress: vehicle while travelling, robot while dwelling
    const k = smooth(0.35, 0.75, dwell);
    const camDir = lookAtV.clone().sub(camPos).normalize();
    const flat = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
    const heldXZ = camPos.clone().addScaledVector(flat, 25).addScaledVector(rightV, ch.side * dwell * (ch.wide ? 20 : 0));
    const travel = sp2.clone().add(tmp.set(0, -1.6, 0));
    const held = new THREE.Vector3(heldXZ.x, travel.y, heldXZ.z).lerp(travel, 1 - dwell * 0.9);
    held.y = lerp(travel.y + Math.sin(t * 0.8) * 0.15, 0, k);
    titanPivot.position.copy(held);
    const xAxis = tangent.clone().normalize();
    const zA = new THREE.Vector3().crossVectors(xAxis, up).normalize();
    const yA = new THREE.Vector3().crossVectors(zA, xAxis).normalize();
    basis.makeBasis(xAxis, yA, zA);
    basisQ.setFromRotationMatrix(basis);
    faceDummy.position.copy(held);
    faceDummy.lookAt(camera.position.x, held.y, camera.position.z);
    titanPivot.quaternion.copy(basisQ).slerp(faceDummy.quaternion, k);
    titanPivot.scale.setScalar(lerp(0.5, 0.95, k));
    if (titanMixer && titanActions.length) {
      for (const a of titanActions) a.time = (1 - k) * titanDur * 0.999;
      titanMixer.update(0);
    }

    stationObjs.forEach((s, i) => {
      s.group.visible = Math.abs(P - centres[i]) < stationHalf * 5;
      for (const o of s.spins) o.rotation.z = t * (0.15 + (i % 3) * 0.05) * (o.name.includes("B") || o.name.includes("2") ? -1 : 1);
    });
    wordmark.visible = true;
    wordmark.lookAt(0, wordmark.position.y, wordmark.position.z + 100);
    city.update(t, dtG);

    const nm = nebula.material as THREE.ShaderMaterial;
    nm.uniforms.uCity.value = 1;
    nm.uniforms.uT.value = t;
    nebula.visible = !cityBg;
    if (cityBg && cityEnv) {
      scene.background = cityBg;
      scene.backgroundIntensity = 0.85;
      scene.backgroundBlurriness = 0.02;
      scene.backgroundRotation.y = 0.9;
      scene.environment = cityEnv;
      scene.environmentIntensity = 1.0;
      scene.environmentRotation.y = 0.9;
    }
    nebula.position.copy(camera.position);
    stars.visible = !cityBg;
    stars.position.copy(camera.position);
    dir.color.setHex(0xffb98a);
    dir.intensity = 2.3;
    dir.position.set(-60, 35, 80);
    scene.fog = fogCity;
    earth.visible = false;
    ship.visible = false;
    titanPivot.visible = true;
    city.group.visible = true;
    renderMain();
  }


  function renderMain() {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    dtG = dt;
    last = now;
    const t = clock.getElapsedTime();
    progress += (target - progress) * (1 - Math.exp(-dt * 6));
    if (progress < SPACE_END) spacePhase(progress, t);
    else routePhase(progress, t);
  }

  const onVis = () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("resize", resize);
  resize();
  frame();
  void bloom;

  return {
    setProgress: (p) => {
      target = p;
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      composer?.dispose();
      pmrem.dispose();
      envTex.dispose();
      draco.dispose();
      renderer.dispose();
    },
  };
}
