import * as THREE from "three";

/** Procedural multi-district world along a winding road. Each festival station sits in its own district. */
export const AVENUE_HALF = 22;

interface District {
  name: string;
  tint: [number, number, number];
  hMul: number;
  cols: number;
  ground: string | null; // null = water (road becomes a bridge)
  trees?: boolean;
  industrial?: boolean;
  neon?: boolean;
  fog: number;
  fogFar: number;
  dir: number;
  dirI: number;
  envI: number;
}

export const DISTRICTS: District[] = [
  { name: "downtown", tint: [1, 1, 1], hMul: 1, cols: 6, ground: "#1a2230", fog: 0x7a5f6e, fogFar: 760, dir: 0xffb98a, dirI: 2.3, envI: 1.0 },
  { name: "stadium", tint: [0.8, 0.95, 1.25], hMul: 0.8, cols: 5, ground: "#1b2736", fog: 0x58708f, fogFar: 780, dir: 0xffd2b0, dirI: 2.3, envI: 1.0 },
  { name: "foundry", tint: [1.3, 0.78, 0.5], hMul: 0.42, cols: 5, ground: "#2a211b", industrial: true, fog: 0x8a5a3c, fogFar: 620, dir: 0xff9a5a, dirI: 2.6, envI: 0.8 },
  { name: "gardens", tint: [1.1, 1.05, 0.95], hMul: 0.3, cols: 4, ground: "#2f5a36", trees: true, fog: 0x7f9a74, fogFar: 880, dir: 0xffe0b0, dirI: 2.4, envI: 1.1 },
  { name: "harbor", tint: [1, 1, 1], hMul: 1, cols: 0, ground: null, fog: 0x4f86a8, fogFar: 1100, dir: 0xffc79a, dirI: 2.4, envI: 1.3 },
  { name: "neon", tint: [1.35, 0.5, 1.35], hMul: 1.05, cols: 6, ground: "#120d1c", neon: true, fog: 0x7a3a86, fogFar: 640, dir: 0xff7ad0, dirI: 1.8, envI: 0.8 },
  { name: "glass", tint: [0.55, 1.05, 1.3], hMul: 1.35, cols: 6, ground: "#14202e", fog: 0x3f7f9a, fogFar: 800, dir: 0xbfe6ff, dirI: 2.0, envI: 1.0 },
  { name: "finance", tint: [1.35, 1.05, 0.6], hMul: 1.25, cols: 6, ground: "#241f18", fog: 0x9a8248, fogFar: 760, dir: 0xffd28a, dirI: 2.4, envI: 1.0 },
  { name: "campus", tint: [1.15, 0.95, 0.8], hMul: 0.28, cols: 4, ground: "#35603a", trees: true, fog: 0x8aa07a, fogFar: 900, dir: 0xffe6bf, dirI: 2.4, envI: 1.1 },
  { name: "gate", tint: [1, 1, 1], hMul: 1, cols: 0, ground: null, fog: 0xe39a6a, fogFar: 1200, dir: 0xffa860, dirI: 2.8, envI: 1.3 },
];

export function moodAt(fi: number) {
  const a = Math.max(0, Math.min(DISTRICTS.length - 1, Math.floor(fi)));
  const b = Math.min(DISTRICTS.length - 1, a + 1);
  const t = fi - a;
  const e = t * t * (3 - 2 * t);
  const A = DISTRICTS[a], B = DISTRICTS[b];
  return {
    fog: new THREE.Color(A.fog).lerp(new THREE.Color(B.fog), e),
    fogFar: A.fogFar + (B.fogFar - A.fogFar) * e,
    dir: new THREE.Color(A.dir).lerp(new THREE.Color(B.dir), e),
    dirI: A.dirI + (B.dirI - A.dirI) * e,
    envI: A.envI + (B.envI - A.envI) * e,
  };
}

function windowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#070c16";
  g.fillRect(0, 0, 256, 256);
  const cols = 8, rows = 8;
  const cw = 256 / cols, ch = 256 / rows;
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const r = rnd();
      if (r < 0.34) g.fillStyle = r < 0.1 ? "#8fe3ff" : r < 0.24 ? "#ffd39a" : "#ffb070";
      else g.fillStyle = r < 0.6 ? "#101a2c" : "#0b1322";
      g.fillRect(x * cw + 6, y * ch + 5, cw - 12, ch - 10);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function laneTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = "#39c7e8";
  g.fillRect(30, 0, 6, 512);
  g.fillRect(476, 0, 6, 512);
  g.fillStyle = "#cfe3f5";
  for (let i = 0; i < 4; i++) {
    g.fillRect(144, i * 128 + 20, 6, 70);
    g.fillRect(256 - 3, i * 128 + 20, 6, 70);
    g.fillRect(362, i * 128 + 20, 6, 70);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function puffTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.9)");
  gr.addColorStop(0.5, "rgba(210,225,255,0.35)");
  gr.addColorStop(1, "rgba(200,220,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export interface City {
  group: THREE.Group;
  update(t: number, dt: number): void;
  dispose(): void;
}

export function buildCity(opts: {
  low: boolean;
  road: THREE.CatmullRomCurve3; // 3D centreline (y = deck height)
  stationS: number[]; // arc length of each station along the road
  plazas: THREE.Vector3[];
  manager?: THREE.LoadingManager;
}): City {
  const { road, stationS } = opts;
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const rng = (() => {
    let s = 987654321;
    return () => ((s = (s * 48271) % 2147483647) / 2147483647);
  })();
  const up = new THREE.Vector3(0, 1, 0);
  const roadLen = road.getLength();
  const frame = (s: number) => {
    const u = Math.min(1, Math.max(0, s / roadLen));
    const P = road.getPointAt(u);
    const T = road.getTangentAt(u);
    T.y = 0;
    T.normalize();
    const N = new THREE.Vector3().crossVectors(T, up).normalize();
    return { P, T, N };
  };
  // district index for an arc length: nearest station (district boundaries at midpoints)
  const districtAt = (s: number) => {
    let best = 0, bd = 1e9;
    stationS.forEach((ss, i) => { const d = Math.abs(ss - s); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  // ---- world bounds + painted ground (cut out where the district is water)
  const samples = road.getPoints(400);
  const bb = new THREE.Box3().setFromPoints(samples);
  const margin = 340;
  const minX = bb.min.x - margin, maxX = bb.max.x + margin, minZ = bb.min.z - margin - 200, maxZ = bb.max.z + margin + 200;
  const Wd = maxX - minX, Hd = maxZ - minZ;
  const pxScale = Math.min(4096 / Wd, 4096 / Hd);
  const cvs = document.createElement("canvas");
  cvs.width = Math.ceil(Wd * pxScale);
  cvs.height = Math.ceil(Hd * pxScale);
  const g = cvs.getContext("2d")!;
  const toPx = (x: number, z: number) => [(x - minX) * pxScale, (z - minZ) * pxScale] as const;
  g.lineJoin = "round";
  g.lineCap = "butt";
  const stepS = 12;
  for (let s = -300; s < roadLen + 300; s += stepS) {
    const di = districtAt(s);
    const gc = DISTRICTS[di].ground;
    if (!gc) continue;
    const a = frame(Math.min(roadLen, Math.max(0, s))), b = frame(Math.min(roadLen, Math.max(0, s + stepS + 1)));
    const pa = a.P.clone().addScaledVector(a.T, Math.min(0, s) + Math.max(0, s - roadLen));
    const pb = b.P.clone().addScaledVector(b.T, Math.min(0, s + stepS) + Math.max(0, s + stepS - roadLen));
    g.strokeStyle = gc;
    g.lineWidth = 2 * 300 * pxScale;
    g.beginPath();
    const [ax, az] = toPx(pa.x, pa.z), [bx, bz] = toPx(pb.x, pb.z);
    g.moveTo(ax, az);
    g.lineTo(bx, bz);
    g.stroke();
  }
  // block grid lines + speckle for texture
  g.globalCompositeOperation = "source-atop";
  g.strokeStyle = "rgba(255,255,255,0.06)";
  g.lineWidth = Math.max(1, 1.2 * pxScale);
  const gridStep = 60 * pxScale;
  for (let x = 0; x < cvs.width; x += gridStep) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, cvs.height); g.stroke(); }
  for (let y = 0; y < cvs.height; y += gridStep) { g.beginPath(); g.moveTo(0, y); g.lineTo(cvs.width, y); g.stroke(); }
  for (let i = 0; i < 30000; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * cvs.width, Math.random() * cvs.height, 2, 2);
  }
  const gTex = new THREE.CanvasTexture(cvs);
  gTex.colorSpace = THREE.SRGBColorSpace;
  gTex.anisotropy = 8;
  disposables.push(gTex);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(Wd, Hd),
    new THREE.MeshStandardMaterial({ map: gTex, transparent: true, alphaTest: 0.5, roughness: 0.85, metalness: 0.05 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  group.add(ground);
  disposables.push(ground.geometry);

  // water (reflects the real sunset HDRI)
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(7000, 7000),
    new THREE.MeshStandardMaterial({ color: 0x0c3350, roughness: 0.07, metalness: 0.9, envMapIntensity: 1.5 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set((minX + maxX) / 2, -2, (minZ + maxZ) / 2);
  group.add(water);
  disposables.push(water.geometry);

  // ---- road ribbons following the curve (incl. elevation)
  const tl = new THREE.TextureLoader(opts.manager);
  const pbr = (file: string, srgb: boolean, rx: number, ry: number) => {
    const t = tl.load(`/assets/tex/${file}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    disposables.push(t);
    return t;
  };
  const ribbon = (offA: number, offB: number, yOff: number, vScale: number) => {
    const seg = Math.ceil(roadLen / 5);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [], nor: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const s = (i / seg) * roadLen;
      const { P, N } = frame(s);
      pos.push(P.x + N.x * offA, P.y + yOff, P.z + N.z * offA, P.x + N.x * offB, P.y + yOff, P.z + N.z * offB);
      uv.push(0, s / vScale, 1, s / vScale);
      nor.push(0, 1, 0, 0, 1, 0);
      if (i < seg) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    disposables.push(geo);
    return geo;
  };
  const asphalt = new THREE.MeshStandardMaterial({
    map: pbr("asphalt_02_diff_1k.jpg", true, 3.2, 1),
    normalMap: pbr("asphalt_02_nor_gl_1k.jpg", false, 3.2, 1),
    roughnessMap: pbr("asphalt_02_rough_1k.jpg", false, 3.2, 1),
    color: 0x8d97a8, roughness: 0.75, metalness: 0, envMapIntensity: 1.3, side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(ribbon(-AVENUE_HALF, AVENUE_HALF, 0.05, 14), asphalt));
  const lt = laneTexture();
  disposables.push(lt);
  group.add(new THREE.Mesh(ribbon(-AVENUE_HALF, AVENUE_HALF, 0.09, 40), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, opacity: 0.85, side: THREE.DoubleSide })));
  const kerbMat = new THREE.MeshBasicMaterial({ color: 0x2aa8c8, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(ribbon(AVENUE_HALF + 0.2, AVENUE_HALF + 0.8, 0.3, 40), kerbMat));
  group.add(new THREE.Mesh(ribbon(-AVENUE_HALF - 0.8, -AVENUE_HALF - 0.2, 0.3, 40), kerbMat));
  // deck underside so elevated stretches read as a bridge
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x2a3444, metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(ribbon(-AVENUE_HALF - 1.5, AVENUE_HALF + 1.5, -1.6, 40), deckMat));
  disposables.push(kerbMat, deckMat);

  // bridge piers + glowing rails wherever the road is over water
  const m4 = new THREE.Matrix4();
  const pierPos: THREE.Vector3[] = [];
  const railPos: { p: THREE.Vector3; q: THREE.Quaternion }[] = [];
  const basis = new THREE.Matrix4();
  for (let s = 0; s < roadLen; s += 34) {
    if (DISTRICTS[districtAt(s)].ground) continue;
    const { P, N, T } = frame(s);
    for (const side of [-1, 1]) {
      pierPos.push(P.clone().addScaledVector(N, side * 14));
    }
    basis.makeBasis(T, up, N);
    for (const side of [-1, 1]) railPos.push({ p: P.clone().addScaledVector(N, side * (AVENUE_HALF + 1)).setY(P.y + 1.2), q: new THREE.Quaternion().setFromRotationMatrix(basis) });
  }
  const pierGeo = new THREE.CylinderGeometry(1.6, 2.2, 1, 12);
  pierGeo.translate(0, -0.5, 0);
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x3a4658, metalness: 0.6, roughness: 0.5 });
  const piers = new THREE.InstancedMesh(pierGeo, pierMat, Math.max(1, pierPos.length));
  pierPos.forEach((p, i) => {
    m4.compose(new THREE.Vector3(p.x, p.y - 1.5, p.z), new THREE.Quaternion(), new THREE.Vector3(1, p.y + 0.5, 1));
    piers.setMatrixAt(i, m4);
  });
  piers.count = pierPos.length;
  group.add(piers);
  const railGeo = new THREE.BoxGeometry(34, 0.25, 0.25);
  const railMat = new THREE.MeshBasicMaterial({ color: 0x66e0ff });
  const rails = new THREE.InstancedMesh(railGeo, railMat, Math.max(1, railPos.length));
  railPos.forEach((r, i) => { m4.compose(r.p, r.q, new THREE.Vector3(1, 1, 1)); rails.setMatrixAt(i, m4); });
  rails.count = railPos.length;
  group.add(rails);
  disposables.push(pierGeo, pierMat, railGeo, railMat);

  // ---- buildings per district (instanced, tinted per district)
  const winTex = windowTexture();
  const bMat = new THREE.MeshStandardMaterial({ map: winTex, color: 0xc7d4e8, roughness: 0.3, metalness: 0.65 });
  bMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
      #ifdef USE_MAP
        vec3 isc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        float uS = abs(normal.x) > 0.5 ? isc.z : isc.x;
        vMapUv = uv * vec2(uS, isc.y) / 9.0;
        if (abs(normal.y) > 0.5) vMapUv = vec2(0.004, 0.004);
      #endif`,
    );
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      totalEmissiveRadiance += diffuseColor.rgb * 2.4 * smoothstep(0.3, 0.55, dot(diffuseColor.rgb, vec3(0.333)));`,
    );
  };
  interface B { p: THREE.Vector3; q: THREE.Quaternion; w: number; d: number; h: number; c: number; side: number; N: THREE.Vector3; di: number }
  const list: B[] = [];
  const grid = new Map<string, { x: number; z: number; r: number }[]>();
  const cell = 40;
  const key = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const free = (x: number, z: number, r: number) => {
    for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) {
      const arr = grid.get(`${Math.floor(x / cell) + gx},${Math.floor(z / cell) + gz}`);
      if (arr) for (const o of arr) if (Math.hypot(o.x - x, o.z - z) < (o.r + r) * 0.8) return false;
    }
    return true;
  };
  const claim = (x: number, z: number, r: number) => {
    const k = key(x, z);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k)!.push({ x, z, r });
  };
  const step = 26;
  for (let s = -200; s < roadLen + 200; s += step) {
    const di = districtAt(s);
    const D = DISTRICTS[di];
    if (!D.ground) continue;
    const { P, T, N } = frame(Math.min(roadLen, Math.max(0, s)));
    if (s < 0) P.addScaledVector(T, s);
    if (s > roadLen) P.addScaledVector(T, s - roadLen);
    const cols = Math.min(D.cols, opts.low ? 3 : 9);
    for (const side of [-1, 1]) {
      let off = AVENUE_HALF + 4;
      for (let c = 0; c < cols; c++) {
        const w = 14 + rng() * 14;
        const d = 16 + rng() * 12;
        const jitter = (rng() - 0.5) * 6;
        const center = P.clone().addScaledVector(N, side * (off + d / 2)).addScaledVector(T, jitter);
        off += d + 3 + rng() * 5;
        if (opts.plazas.some((pl) => Math.hypot(pl.x - center.x, pl.z - center.z) < 32 + w * 0.5)) continue;
        if (rng() < 0.08) continue;
        const rr = Math.max(w, d) * 0.6;
        if (!free(center.x, center.z, rr)) continue;
        const near = c < 2;
        let h = (near ? 28 + rng() * 55 : 45 + rng() * 120 + c * 14) * D.hMul;
        if (rng() < 0.07) h += 110 * D.hMul;
        h = Math.max(10, h);
        basis.makeBasis(T, up, N);
        list.push({ p: center, q: new THREE.Quaternion().setFromRotationMatrix(basis), w, d, h, c, side, N: N.clone(), di });
        claim(center.x, center.z, rr);
      }
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(box, bMat, list.length);
  const col = new THREE.Color();
  list.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.p.x, 0, b.p.z), b.q, new THREE.Vector3(b.w, b.h, b.d));
    inst.setMatrixAt(i, m4);
    const t = DISTRICTS[b.di].tint;
    col.setRGB(t[0], t[1], t[2]);
    inst.setColorAt(i, col);
  });
  inst.frustumCulled = false;
  group.add(inst);
  disposables.push(box, bMat, winTex);

  const crowned = list.filter((b) => b.h > 60);
  const crown = new THREE.InstancedMesh(box, bMat, crowned.length);
  crowned.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.p.x, b.h, b.p.z), b.q, new THREE.Vector3(b.w * 0.68, b.h * 0.22, b.d * 0.68));
    crown.setMatrixAt(i, m4);
    const t = DISTRICTS[b.di].tint;
    col.setRGB(t[0], t[1], t[2]);
    crown.setColorAt(i, col);
  });
  crown.frustumCulled = false;
  group.add(crown);
  const spireGeo = new THREE.CylinderGeometry(0.15, 0.5, 30, 6);
  spireGeo.translate(0, 15, 0);
  const spireMat = new THREE.MeshStandardMaterial({ color: 0x8794a8, metalness: 0.9, roughness: 0.3 });
  const spires = new THREE.InstancedMesh(spireGeo, spireMat, crowned.length);
  crowned.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.p.x, b.h * 1.22, b.p.z), new THREE.Quaternion(), new THREE.Vector3(1, 0.6 + (i % 4) * 0.35, 1));
    spires.setMatrixAt(i, m4);
  });
  group.add(spires);
  disposables.push(spireGeo, spireMat);

  // ---- district dressing: trees, foundry chimneys + containers, neon bars
  const place = (di: number, count: number, minOff: number, maxOff: number, fn: (p: THREE.Vector3, s: number, T: THREE.Vector3) => void) => {
    let tries = 0, made = 0;
    const sMid = stationS[di];
    while (made < count && tries < count * 8) {
      tries++;
      const s = sMid + (rng() - 0.5) * 230;
      if (s < 0 || s > roadLen) continue;
      const { P, T, N } = frame(s);
      const side = rng() < 0.5 ? -1 : 1;
      const p = P.clone().addScaledVector(N, side * (minOff + rng() * (maxOff - minOff)));
      if (opts.plazas.some((pl) => Math.hypot(pl.x - p.x, pl.z - p.z) < 28)) continue;
      if (!free(p.x, p.z, 4)) continue;
      claim(p.x, p.z, 4);
      fn(p, s, T);
      made++;
    }
  };
  const treeSpots: THREE.Vector3[] = [];
  const chimneys: THREE.Vector3[] = [];
  const containers: { p: THREE.Vector3; yaw: number; c: number; stack: number }[] = [];
  DISTRICTS.forEach((D, di) => {
    if (D.trees) place(di, opts.low ? 70 : 190, 25, 150, (p) => treeSpots.push(p));
    if (D.industrial) {
      place(di, 16, 34, 110, (p) => chimneys.push(p));
      place(di, opts.low ? 30 : 80, 25, 90, (p, _s, T) => containers.push({ p, yaw: Math.atan2(-T.z, T.x), c: Math.floor(rng() * 5), stack: 1 + Math.floor(rng() * 3) }));
    }
  });
  if (treeSpots.length) {
    const leafGeo = new THREE.IcosahedronGeometry(1, 1);
    leafGeo.translate(0, 1, 0);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeSpots.length);
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x3a2b1f, roughness: 1 }), treeSpots.length);
    treeSpots.forEach((p, i) => {
      const h = 7 + rng() * 9;
      m4.compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion(), new THREE.Vector3(1.2, h * 0.45, 1.2));
      trunks.setMatrixAt(i, m4);
      const r = 3 + rng() * 3.2;
      m4.compose(new THREE.Vector3(p.x, h * 0.35, p.z), new THREE.Quaternion(), new THREE.Vector3(r, r * 1.15, r));
      leaves.setMatrixAt(i, m4);
      col.setHSL(0.27 + rng() * 0.08, 0.45, 0.16 + rng() * 0.1);
      leaves.setColorAt(i, col);
    });
    group.add(trunks, leaves);
    disposables.push(leafGeo, leafMat, trunkGeo);
  }
  if (chimneys.length) {
    const chGeo = new THREE.CylinderGeometry(2.2, 3.4, 1, 14);
    chGeo.translate(0, 0.5, 0);
    const chMat = new THREE.MeshStandardMaterial({ color: 0x4a403a, roughness: 0.8, metalness: 0.3 });
    const ch = new THREE.InstancedMesh(chGeo, chMat, chimneys.length);
    const tipGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.8, 14);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff8a3a });
    const tips = new THREE.InstancedMesh(tipGeo, tipMat, chimneys.length);
    chimneys.forEach((p, i) => {
      const h = 45 + rng() * 40;
      m4.compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
      ch.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(p.x, h + 0.2, p.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      tips.setMatrixAt(i, m4);
    });
    group.add(ch, tips);
    disposables.push(chGeo, chMat, tipGeo, tipMat);
  }
  if (containers.length) {
    const cGeo = new THREE.BoxGeometry(12, 5, 5);
    cGeo.translate(0, 2.5, 0);
    const cMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.5 });
    const palette = [0xc0392b, 0x2e6fa8, 0xd8a53a, 0x3a7d5a, 0x8a8f98].map((x) => new THREE.Color(x));
    const total = containers.reduce((n, c) => n + c.stack, 0);
    const cont = new THREE.InstancedMesh(cGeo, cMat, total);
    let k = 0;
    containers.forEach((c) => {
      for (let st = 0; st < c.stack; st++) {
        m4.compose(new THREE.Vector3(c.p.x, st * 5, c.p.z), new THREE.Quaternion().setFromAxisAngle(up, c.yaw), new THREE.Vector3(1, 1, 1));
        cont.setMatrixAt(k, m4);
        cont.setColorAt(k, palette[c.c]);
        k++;
      }
    });
    group.add(cont);
    disposables.push(cGeo, cMat);
  }
  // neon bars on the entertainment district's buildings
  const neonB = list.filter((b) => DISTRICTS[b.di].neon && b.c < 3);
  if (neonB.length) {
    const nGeo = new THREE.BoxGeometry(0.7, 1, 0.7);
    nGeo.translate(0, 0.5, 0);
    const nMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const neon = new THREE.InstancedMesh(nGeo, nMat, neonB.length * 2);
    const cols2 = [new THREE.Color(0xff3df0), new THREE.Color(0x30e6ff), new THREE.Color(0xffb02e)];
    neonB.forEach((b, i) => {
      for (let k2 = 0; k2 < 2; k2++) {
        const T2 = new THREE.Vector3(1, 0, 0).applyQuaternion(b.q);
        const N2 = new THREE.Vector3(0, 0, 1).applyQuaternion(b.q);
        const p = b.p.clone().addScaledVector(T2, (k2 ? 1 : -1) * b.w * 0.5).addScaledVector(N2, -b.side * b.d * 0.5);
        m4.compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion(), new THREE.Vector3(1, b.h * 0.9, 1));
        neon.setMatrixAt(i * 2 + k2, m4);
        neon.setColorAt(i * 2 + k2, cols2[(i + k2) % 3]);
      }
    });
    group.add(neon);
    disposables.push(nGeo, nMat);
  }

  // holographic billboards on road-facing facades
  const boardTexts: [string, string][] = [["TITANIUM 2027", "#39c7e8"], ["BEYOND THE KNOWN.", "#f2b66d"], ["REC · CHENNAI", "#8bd9ff"], ["ROLL OUT", "#39c7e8"], ["ONE PLANET.", "#f2b66d"]];
  const boardTex = boardTexts.map(([text, c0]) => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 320;
    const gg = c.getContext("2d")!;
    gg.fillStyle = "rgba(4,10,20,0.82)";
    gg.fillRect(0, 0, 1024, 320);
    gg.strokeStyle = c0;
    gg.lineWidth = 8;
    gg.strokeRect(10, 10, 1004, 300);
    gg.fillStyle = c0;
    gg.shadowColor = c0;
    gg.shadowBlur = 28;
    gg.font = "700 120px 'Space Grotesk', sans-serif";
    gg.textAlign = "center";
    gg.textBaseline = "middle";
    gg.fillText(text, 512, 165);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    disposables.push(t);
    return t;
  });
  list.filter((b) => b.c === 0 && b.h > 35).forEach((b, i) => {
    const every = DISTRICTS[b.di].neon ? 1 : 3;
    if (i % every !== 0) return;
    const mat = new THREE.MeshBasicMaterial({ map: boardTex[i % boardTex.length], toneMapped: false, transparent: true });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(24, 7.5), mat);
    pl.position.copy(b.p).addScaledVector(b.N, -b.side * (b.d / 2 + 0.3));
    pl.position.y = 18 + ((i * 7) % 24);
    const look = b.p.clone().addScaledVector(b.N, -b.side * 100);
    look.y = pl.position.y;
    pl.lookAt(look);
    group.add(pl);
    disposables.push(mat, pl.geometry);
  });

  const beaconGeo = new THREE.BoxGeometry(1.2, 6, 1.2);
  beaconGeo.translate(0, 3, 0);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff4a3a });
  const tall = list.filter((b) => b.h > 110);
  const beacons = new THREE.InstancedMesh(beaconGeo, beaconMat, tall.length);
  tall.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.p.x, b.h, b.p.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    beacons.setMatrixAt(i, m4);
  });
  group.add(beacons);
  disposables.push(beaconGeo, beaconMat);

  // street lamps along both kerbs
  const lampN = Math.floor(roadLen / 22) * 2;
  const lampGeo = new THREE.BoxGeometry(0.35, 9, 0.35);
  lampGeo.translate(0, 4.5, 0);
  const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x1b2535, metalness: 0.8, roughness: 0.4 }), lampN);
  const headGeo = new THREE.BoxGeometry(1.4, 0.2, 0.5);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffe2b0 }), lampN);
  for (let i = 0; i < lampN; i++) {
    const side = i % 2 ? 1 : -1;
    const { P, N } = frame(Math.floor(i / 2) * 22);
    m4.compose(P.clone().addScaledVector(N, side * (AVENUE_HALF + 0.8)), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    lamps.setMatrixAt(i, m4);
    m4.compose(P.clone().addScaledVector(N, side * (AVENUE_HALF - 0.4)).setY(P.y + 9.1), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    heads.setMatrixAt(i, m4);
  }
  group.add(lamps, heads);
  disposables.push(lampGeo, headGeo);

  // flying traffic along the road
  const carCount = opts.low ? 90 : 220;
  const carGeo = new THREE.BoxGeometry(3, 0.4, 1.1);
  const carMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cars = new THREE.InstancedMesh(carGeo, carMat, carCount);
  const carData = Array.from({ length: carCount }, () => ({
    off: (rng() < 0.5 ? -1 : 1) * (6 + rng() * 14),
    y: 18 + rng() * 40,
    s: rng() * roadLen,
    v: (rng() < 0.5 ? -1 : 1) * (10 + rng() * 26),
  }));
  carData.forEach((c, i) => {
    col.set(c.v < 0 ? 0xff5a4a : rng() < 0.5 ? 0xbfe9ff : 0xffd9a0).multiplyScalar(0.55);
    cars.setColorAt(i, col);
  });
  cars.frustumCulled = false;
  group.add(cars);
  disposables.push(carGeo, carMat);

  // cloud deck for the descent
  const puff = puffTexture();
  const pm = new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  const start = road.getPointAt(0);
  for (let i = 0; i < (opts.low ? 18 : 34); i++) {
    const sp = new THREE.Sprite(pm);
    const s = 120 + rng() * 160;
    sp.scale.set(s, s * 0.5, 1);
    sp.position.set(start.x + (rng() - 0.5) * 520, 150 + rng() * 120, start.z - rng() * 520 + 200);
    group.add(sp);
  }
  disposables.push(puff, pm);

  const dummy = new THREE.Object3D();
  return {
    group,
    update(t, dt) {
      for (let i = 0; i < carCount; i++) {
        const c = carData[i];
        c.s += c.v * dt;
        if (c.s > roadLen) c.s = 0;
        if (c.s < 0) c.s = roadLen;
        const { P, T, N } = frame(c.s);
        dummy.position.copy(P).addScaledVector(N, c.off);
        dummy.position.y = P.y + c.y + Math.sin(t * 0.5 + i) * 0.1;
        basis.makeBasis(T, up, N);
        dummy.quaternion.setFromRotationMatrix(basis);
        dummy.updateMatrix();
        cars.setMatrixAt(i, dummy.matrix);
      }
      cars.instanceMatrix.needsUpdate = true;
      beaconMat.color.setHex(Math.sin(t * 3) > 0 ? 0xff4a3a : 0x5a1410);
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      inst.dispose();
    },
  };
}
