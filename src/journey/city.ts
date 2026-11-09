import * as THREE from "three";

/** Procedural futuristic city along a long avenue (-Z). Ground at y=0. */
export const AVENUE_HALF = 22;

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

function roadTexture(): THREE.CanvasTexture {
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

function groundTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0a101a";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#16202f";
  g.fillRect(0, 0, 256, 4);
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
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

export function buildCity(opts: { low: boolean; plazas: { x: number; z: number }[]; zStart: number; zEnd: number; manager?: THREE.LoadingManager }): City {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const rng = (() => {
    let s = 987654321;
    return () => ((s = (s * 48271) % 2147483647) / 2147483647);
  })();

  // ground + avenue (CC0 Poly Haven asphalt / concrete)
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
  const gTex = pbr("concrete_floor_02_diff_1k.jpg", true, 220, 220);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2800, 2800), new THREE.MeshStandardMaterial({ map: gTex, color: 0x6f7a8c, roughness: 0.85, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, (opts.zStart + opts.zEnd) / 2);
  group.add(ground);
  const len = opts.zStart - opts.zEnd + 400;
  const rep = len / 14;
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(AVENUE_HALF * 2, len),
    new THREE.MeshStandardMaterial({
      map: pbr("asphalt_02_diff_1k.jpg", true, 3.2, rep),
      normalMap: pbr("asphalt_02_nor_gl_1k.jpg", false, 3.2, rep),
      roughnessMap: pbr("asphalt_02_rough_1k.jpg", false, 3.2, rep),
      color: 0x8d97a8, roughness: 0.75, metalness: 0.0, envMapIntensity: 1.3,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.05, (opts.zStart + opts.zEnd) / 2);
  group.add(road);
  const rTex = roadTexture();
  rTex.repeat.set(1, len / 40);
  const lanes = new THREE.Mesh(new THREE.PlaneGeometry(AVENUE_HALF * 2, len), new THREE.MeshBasicMaterial({ map: rTex, transparent: true, depthWrite: false, opacity: 0.85, toneMapped: true }));
  lanes.rotation.x = -Math.PI / 2;
  lanes.position.set(0, 0.08, (opts.zStart + opts.zEnd) / 2);
  group.add(lanes);
  disposables.push(rTex);

  // buildings (instanced, window UVs follow instance size)
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
  const list: { x: number; z: number; w: number; d: number; h: number; c: number }[] = [];
  const step = 30;
  for (let z = opts.zStart + 260; z > opts.zEnd - 260; z -= step) {
    for (const side of [-1, 1]) {
      const cols = opts.low ? 4 : 7;
      let xOff = AVENUE_HALF + 4;
      for (let c = 0; c < cols; c++) {
        const w = 14 + rng() * 14;
        const d = 16 + rng() * 10;
        const x = side * (xOff + w / 2);
        xOff += w + 3 + rng() * 4;
        const zz = z + (rng() - 0.5) * 6;
        // keep plazas clear
        if (opts.plazas.some((p) => Math.abs(p.x - x) < 26 + w / 2 && Math.abs(p.z - zz) < 26 + d / 2)) continue;
        if (rng() < 0.08) continue;
        const near = c < 2;
        let h = near ? 28 + rng() * 55 : 45 + rng() * 120 + c * 14;
        if (rng() < 0.07) h += 110;
        list.push({ x, z: zz, w, d, h, c });
      }
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(box, bMat, list.length);
  const m4 = new THREE.Matrix4();
  list.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.x, 0, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
    inst.setMatrixAt(i, m4);
  });
  inst.frustumCulled = false;
  group.add(inst);
  disposables.push(box, bMat, winTex);

  // setback crowns + spires
  const crowned = list.filter((b) => b.h > 60);
  const crown = new THREE.InstancedMesh(box, bMat, crowned.length);
  crowned.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.x, b.h, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w * 0.68, b.h * 0.22, b.d * 0.68));
    crown.setMatrixAt(i, m4);
  });
  crown.frustumCulled = false;
  group.add(crown);
  const spireGeo = new THREE.CylinderGeometry(0.15, 0.5, 30, 6);
  spireGeo.translate(0, 15, 0);
  const spireMat = new THREE.MeshStandardMaterial({ color: 0x8794a8, metalness: 0.9, roughness: 0.3 });
  const spires = new THREE.InstancedMesh(spireGeo, spireMat, crowned.length);
  crowned.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.x, b.h * 1.22, b.z), new THREE.Quaternion(), new THREE.Vector3(1, 0.6 + (i % 4) * 0.35, 1));
    spires.setMatrixAt(i, m4);
  });
  group.add(spires);
  disposables.push(spireGeo, spireMat);

  // holographic billboards on avenue-facing facades
  const boardTexts: [string, string][] = [["TITANIUM 2027", "#39c7e8"], ["BEYOND THE KNOWN.", "#f2b66d"], ["REC · CHENNAI", "#8bd9ff"], ["ROLL OUT", "#39c7e8"], ["ONE PLANET.", "#f2b66d"]];
  const boardTex = boardTexts.map(([text, col]) => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 320;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(4,10,20,0.82)";
    g.fillRect(0, 0, 1024, 320);
    g.strokeStyle = col;
    g.lineWidth = 8;
    g.strokeRect(10, 10, 1004, 300);
    g.fillStyle = col;
    g.shadowColor = col;
    g.shadowBlur = 28;
    g.font = "700 120px 'Space Grotesk', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 512, 165);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    disposables.push(t);
    return t;
  });
  const near = list.filter((b) => b.c === 0 && b.h > 45);
  near.forEach((b, i) => {
    if (i % 3 !== 0) return;
    const side = b.x > 0 ? 1 : -1;
    const mat = new THREE.MeshBasicMaterial({ map: boardTex[i % boardTex.length], toneMapped: false, transparent: true });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(24, 7.5), mat);
    pl.position.set(b.x - side * (b.w / 2 + 0.3), 22 + ((i * 7) % 24), b.z);
    pl.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(pl);
    disposables.push(mat, pl.geometry);
  });

  // rooftop beacons
  const beaconGeo = new THREE.BoxGeometry(1.2, 6, 1.2);
  beaconGeo.translate(0, 3, 0);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff4a3a, fog: true });
  const tall = list.filter((b) => b.h > 110);
  const beacons = new THREE.InstancedMesh(beaconGeo, beaconMat, tall.length);
  tall.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.x, b.h, b.z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    beacons.setMatrixAt(i, m4);
  });
  group.add(beacons);
  disposables.push(beaconGeo, beaconMat);

  // street lamps
  const lampCount = Math.floor(len / 22) * 2;
  const lampGeo = new THREE.BoxGeometry(0.35, 9, 0.35);
  lampGeo.translate(0, 4.5, 0);
  const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x1b2535, metalness: 0.8, roughness: 0.4 }), lampCount);
  const headGeo = new THREE.BoxGeometry(1.4, 0.2, 0.5);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffe2b0 }), lampCount);
  for (let i = 0; i < lampCount; i++) {
    const side = i % 2 ? 1 : -1;
    const z = opts.zStart + 200 - Math.floor(i / 2) * 22;
    m4.compose(new THREE.Vector3(side * (AVENUE_HALF + 0.8), 0, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    lamps.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(side * (AVENUE_HALF - 0.4), 9.1, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    heads.setMatrixAt(i, m4);
  }
  group.add(lamps, heads);
  disposables.push(lampGeo, headGeo);

  // flying traffic
  const carCount = opts.low ? 90 : 220;
  const carGeo = new THREE.BoxGeometry(1.1, 0.4, 3);
  const carMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cars = new THREE.InstancedMesh(carGeo, carMat, carCount);
  const carData = Array.from({ length: carCount }, () => ({
    x: (rng() < 0.5 ? -1 : 1) * (11 + rng() * 11),
    y: 22 + rng() * 40,
    z: opts.zEnd - 200 + rng() * (len + 200),
    v: (rng() < 0.5 ? -1 : 1) * (10 + rng() * 26),
  }));
  const col = new THREE.Color();
  carData.forEach((c, i) => {
    col.set(c.v < 0 ? 0xff5a4a : rng() < 0.5 ? 0xbfe9ff : 0xffd9a0).multiplyScalar(0.55);
    cars.setColorAt(i, col);
  });
  cars.frustumCulled = false;
  group.add(cars);
  disposables.push(carGeo, carMat);

  // cloud deck for the descent
  const puff = puffTexture();
  const puffs: THREE.Sprite[] = [];
  const pm = new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  for (let i = 0; i < (opts.low ? 18 : 34); i++) {
    const sp = new THREE.Sprite(pm);
    const s = 120 + rng() * 160;
    sp.scale.set(s, s * 0.5, 1);
    sp.position.set((rng() - 0.5) * 520, 150 + rng() * 120, opts.zStart + 200 - rng() * 520);
    puffs.push(sp);
    group.add(sp);
  }
  disposables.push(puff, pm);

  // soft ground fog haze
  const dummy = new THREE.Object3D();
  return {
    group,
    update(t, dt) {
      for (let i = 0; i < carCount; i++) {
        const c = carData[i];
        c.z += c.v * dt;
        if (c.z > opts.zStart + 250) c.z = opts.zEnd - 250;
        if (c.z < opts.zEnd - 250) c.z = opts.zStart + 250;
        dummy.position.set(c.x, c.y + Math.sin(t * 0.5 + i) * 0.1, c.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        cars.setMatrixAt(i, dummy.matrix);
      }
      cars.instanceMatrix.needsUpdate = true;
      beaconMat.color.setHex(Math.sin(t * 3) > 0 ? 0xff4a3a : 0x5a1410);
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      ground.geometry.dispose();
      road.geometry.dispose();
      inst.dispose();
    },
  };
}
