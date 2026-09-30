// 05 Mobility AI — 밤 도시 3D 경로 장면 (Three.js + 블룸)
// 단계 0 목적 말하기 · 1 비교 · 2 확인 · 3 지연 재추천. 단계 전환은 window.__m3.show(i)
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';

const gsap = window.gsap;
const stage = document.getElementById('m3');
const canvas = document.getElementById('m3c');
const lbWrap = document.getElementById('m3lb');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch (e) {
  stage.classList.add('nogl');
  const fb = document.createElement('p'); fb.className = 'm3fb';
  fb.textContent = '이 기기에서는 3D 장면을 표시할 수 없어 단계 설명만 보여 드립니다.';
  stage.appendChild(fb);
}
if (renderer) init();

function init() {
  const BG = 0x070B18, BLU = 0x3D7BFF, CYA = 0x6FD3FF, RED = 0xFF4D57, AMB = 0xFFB547, GRY = 0x5A6680, VIO = 0x8B7BFF;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.0105);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;

  const cam = new THREE.PerspectiveCamera(32, 16 / 10, 0.5, 500);
  const look = new THREE.Vector3();

  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // 빛: 달빛 + 도시 반사광
  scene.add(new THREE.HemisphereLight(0x4A62A8, 0x0A0F1E, 0.95));
  const moon = new THREE.DirectionalLight(0x9DB6FF, 0.9);
  moon.position.set(-40, 70, 20); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -80, right: 80, top: 60, bottom: -60, near: 10, far: 200 });
  scene.add(moon);

  // 땅 + 은은한 도로 격자
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 400),
    new THREE.MeshStandardMaterial({ color: 0x0C1224, roughness: 0.55, metalness: 0.3 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(260, 52, 0x1C2A52, 0x131C38);
  grid.position.y = 0.02; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);

  // 장소와 경로
  const P = {
    school: new THREE.Vector3(-14, 0, 8), term: new THREE.Vector3(-17, 0, -6),
    stA: new THREE.Vector3(-1, 0, -1), stB: new THREE.Vector3(38, 0, -20),
    home: new THREE.Vector3(46, 0, -11), termB: new THREE.Vector3(33, 0, -8),
  };
  const V3 = (x, z, y = 0) => new THREE.Vector3(x, y, z);
  const PATHS = {
    taxi: [P.school, V3(-10, 6), V3(-8, 2), V3(-5, 1), P.stA],
    ktx: [P.stA, V3(8, -8), V3(22, -16), V3(32, -19), P.stB],
    last: [P.stB, V3(42, -17), P.home],
    bus1: [P.school, V3(-16, 4), P.term],
    bus2: [P.term, V3(0, -12), V3(18, -10), P.termB],
    bus3: [P.termB, V3(40, -9), P.home],
    jam: [V3(-8, 2), V3(-5, 1), P.stA],
    sub: [V3(-10, 6), V3(-11.2, 2.4), V3(-8.6, -1.6), V3(-4, -2.6), P.stA],
  };
  const KEEP = [];
  Object.values(PATHS).forEach((pts) => new THREE.CatmullRomCurve3(pts.map((q) => q.clone().setY(0))).getSpacedPoints(140).forEach((q) => KEEP.push(q)));

  // ── 서울을 참고한 도시 바닥: 한강 + 둔치 + 강변도로 + 대로 + 공원 + 남산 ──
  const crv = (pts) => new THREE.CatmullRomCurve3(pts.map((q) => q.clone().setY(0)), false, 'centripetal');
  const offsetCurve = (c, d, n = 90) => new THREE.CatmullRomCurve3(Array.from({ length: n + 1 }, (_, i) => {
    const p = c.getPointAt(i / n), t = c.getTangentAt(i / n); return new THREE.Vector3(p.x - t.z * d, 0, p.z + t.x * d);
  }));
  const RIVER = crv([V3(17, 44), V3(20.5, 12), V3(18.2, -12), V3(21, -48)]), RW = 7;
  const RS = RIVER.getSpacedPoints(240);
  const onWater = (x, z) => RS.some((p) => Math.hypot(p.x - x, p.z - z) < RW / 2 + 0.2);
  const ROADS = [
    ...['taxi', 'last', 'bus1', 'bus2', 'bus3'].map((k) => crv(PATHS[k])),
    crv([V3(4, -18), V3(4, 20)]), crv([V3(-28, 15.5), V3(13, 15.5)]),          // 도심 대로
    crv([V3(26, -14), V3(56, -14)]), crv([V3(30, -28), V3(30, 0)]),            // 본가 동네 길
    offsetCurve(RIVER, -(RW / 2 + 2.2)), offsetCurve(RIVER, RW / 2 + 2.2),       // 강변도로 양쪽
  ];
  const PARKS = [{ c: V3(-22, 11.5), r: 2.6 }, { c: V3(-6, 11), r: 2.8 }, { c: V3(48, -21), r: 2.8 }, { c: V3(36, -3), r: 2.6 }];
  const HILL = { c: V3(9.5, 7), r: 3.8, h: 1.8 };
  const ROADK = [];
  ROADS.forEach((c) => c.getSpacedPoints(Math.ceil(c.getLength() / 0.6)).forEach((q) => ROADK.push(q)));

  // ── 건물: 종류마다 모양·창문·옥상을 다르게 ──
  function tex(kind) {
    const W = 64, H = kind === 'tower' || kind === 'glass' ? 256 : 128;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = kind === 'glass' ? '#0A1830' : '#0B1122'; g.fillRect(0, 0, W, H);
    const lit = (p) => rnd() < p;
    if (kind === 'office' || kind === 'tower') {            // 격자 창
      for (let y = 4; y < H - 4; y += 8) for (let x = 4; x < W - 4; x += 8) {
        if (!lit(kind === 'tower' ? 0.55 : 0.45)) continue;
        g.globalAlpha = 0.35 + rnd() * 0.65; g.fillStyle = rnd() > 0.9 ? '#FFFFFF' : '#8FB4FF'; g.fillRect(x, y, 4, 5);
      }
    } else if (kind === 'glass') {                            // 세로 유리 띠
      for (let x = 2; x < W; x += 6) { g.globalAlpha = 0.18 + rnd() * 0.3; g.fillStyle = '#5FD0FF'; g.fillRect(x, 0, 2, H); }
      for (let y = 0; y < H; y += 12) { g.globalAlpha = 0.12; g.fillStyle = '#BDEBFF'; g.fillRect(0, y, W, 1); }
      for (let i = 0; i < 30; i++) { g.globalAlpha = 0.6 + rnd() * 0.4; g.fillStyle = '#E6F7FF'; g.fillRect((rnd() * 10 | 0) * 6 + 2, rnd() * H, 2, 6); }
    } else if (kind === 'apt') {                              // 가로 띠 창(아파트)
      for (let y = 6; y < H - 4; y += 10) for (let x = 3; x < W - 3; x += 7) {
        if (!lit(0.62)) continue;
        g.globalAlpha = 0.45 + rnd() * 0.55; g.fillStyle = rnd() > 0.35 ? '#FFC873' : '#FFE3B0'; g.fillRect(x, y, 5, 4);
      }
      for (let y = 11; y < H; y += 10) { g.globalAlpha = 0.35; g.fillStyle = '#26314F'; g.fillRect(0, y, W, 2); }
    } else {                                                   // 낮은 주택
      for (let y = 30; y < H - 20; y += 34) for (let x = 10; x < W - 10; x += 22) {
        if (!lit(0.55)) continue; g.globalAlpha = 0.9; g.fillStyle = '#FFB75A'; g.fillRect(x, y, 10, 12);
      }
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const roof = new THREE.MeshStandardMaterial({ color: 0x151D36, roughness: 0.6, metalness: 0.5 });
  const side = (t, color, rough, metal, ei) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: ei });
  const M = {
    office: side(tex('office'), 0x24305A, 0.35, 0.55, 1.3),
    tower: side(tex('tower'), 0x1E2A50, 0.3, 0.6, 1.4),
    glass: side(tex('glass'), 0x163566, 0.08, 0.9, 1.6),
    apt: side(tex('apt'), 0x2E3654, 0.7, 0.2, 1.15),
    house: side(tex('house'), 0x2A2F45, 0.8, 0.1, 1.0),
  };
  const boxArr = (m) => [m, m, roof, roof, m, m];
  const mats = [boxArr(M.office), boxArr(M.apt), boxArr(M.office)];   // 랜드마크(학교)에서도 씀
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
    cap: new THREE.CylinderGeometry(0, 0.72, 1, 4, 1),
    rod: new THREE.CylinderGeometry(0.04, 0.07, 1, 6),
    tank: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    ring: new THREE.TorusGeometry(0.5, 0.05, 6, 28),
    lamp: new THREE.SphereGeometry(0.16, 8, 6),
  };
  const glowMat = (c, i) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x1D2746, roughness: 0.3, metalness: 0.8 });
  const houseRoof = new THREE.MeshStandardMaterial({ color: 0x3A2E3A, roughness: 0.7 });
  const crownC = glowMat(CYA, 2.2), crownA = glowMat(AMB, 2.2), heli = glowMat(0xFFFFFF, 1.6), redL = new THREE.MeshBasicMaterial({ color: RED });
  const boxOf = {}; const arrOf = (m) => (boxOf[m.uuid] ??= boxArr(m));

  // (지오메트리, 재질)별로 모았다가 인스턴스로 한 번에 만든다
  const bins = new Map();
  const put = (geo, mat, pos, scl, rotY = 0, shadow = true) => {
    const key = geo.uuid + (Array.isArray(mat) ? mat[0].uuid + 'a' : mat.uuid);
    if (!bins.has(key)) bins.set(key, { geo, mat, list: [], shadow });
    bins.get(key).list.push([pos, scl, rotY]);
  };
  const v = (x, y, z) => new THREE.Vector3(x, y, z);

  function building(x, z, s, h, zone) {
    const d = s * (0.7 + rnd() * 0.6), r = rnd();
    if (zone === 'house') {                                   // 주택: 낮은 몸통 + 뾰족 지붕
      const w = 1 + rnd() * 0.6, hh = 0.8 + rnd() * 0.5, ry = rnd() * Math.PI;
      put(G.box, arrOf(M.house), v(x, hh / 2, z), v(w, hh, w * 0.9), ry);
      put(G.cap, houseRoof, v(x, hh + 0.35, z), v(w * 1.05, 0.7, w * 1.05), ry + Math.PI / 4);
      return;
    }
    if (zone === 'apt' || (h < 5 && r < 0.45)) {             // 아파트: 긴 판상형 + 물탱크
      const len = s * 1.8, rot = rnd() < 0.5;
      put(G.box, arrOf(M.apt), v(x, h / 2, z), v(len, h, s * 0.55), rot ? Math.PI / 2 : 0);
      if (rnd() < 0.6) put(G.tank, capMat, v(x, h + 0.3, z), v(0.5, 0.6, 0.5));
      return;
    }
    if (h > 7 && r < 0.3) {                                   // 원통형 유리 타워 + 빛나는 왕관
      const dia = s * 1.05;
      put(G.cyl, M.glass, v(x, h / 2, z), v(dia, h, dia));
      put(G.ring, rnd() < 0.5 ? crownC : crownA, v(x, h - 0.15, z), v(dia * 1.02, dia * 1.02, 1), 0, false);
      return;
    }
    if (h > 6 && r < 0.55) {                                  // 계단식 타워(셋백) + 첨탑
      const t1 = h * 0.55, t2 = h * 0.3, t3 = h * 0.15;
      put(G.box, arrOf(M.tower), v(x, t1 / 2, z), v(s, t1, d));
      put(G.box, arrOf(M.tower), v(x, t1 + t2 / 2, z), v(s * 0.72, t2, d * 0.72));
      put(G.box, arrOf(M.glass), v(x, t1 + t2 + t3 / 2, z), v(s * 0.46, t3, d * 0.46));
      put(G.rod, capMat, v(x, h + 1.1, z), v(1, 2.2, 1));
      put(G.lamp, redL, v(x, h + 2.25, z), v(1, 1, 1), 0, false);
      return;
    }
    if (h > 5 && r < 0.75) {                                  // 피라미드 지붕 오피스
      put(G.box, arrOf(M.office), v(x, h / 2, z), v(s, h, s));
      put(G.cap, capMat, v(x, h + s * 0.4, z), v(s * 1.4, s * 0.8, s * 1.4), Math.PI / 4);
      return;
    }
    put(G.box, arrOf(h > 6 ? M.tower : M.office), v(x, h / 2, z), v(s, h, d));   // 기본 오피스
    if (h > 6 && rnd() < 0.5) put(G.ring, heli, v(x, h + 0.03, z), v(Math.min(s, d) * 0.7, Math.min(s, d) * 0.7, 1), 0, false);
    if (h > 8) put(G.lamp, redL, v(x, h + 0.2, z), v(1, 1, 1), 0, false);
  }

  function city(cx, cz, w, dd, n, hMax, hub, edgeZone) {
    for (let i = 0; i < n; i++) {
      const x = cx + (rnd() - 0.5) * w, z = cz + (rnd() - 0.5) * dd;
      if (Object.values(P).some((p) => Math.hypot(p.x - x, p.z - z) < 3.8)) continue;
      if (KEEP.some((p) => Math.hypot(p.x - x, p.z - z) < 2.6)) continue;
      if (PARKS.some((q) => Math.hypot(q.c.x - x, q.c.z - z) < q.r + 1.4) || Math.hypot(HILL.c.x - x, HILL.c.z - z) < HILL.r + 1.2) continue;
      const dist = Math.hypot(x - hub.x, z - hub.z);
      const s = 1.3 + rnd() * 1.9;
      if (ROADK.some((p) => Math.hypot(p.x - x, p.z - z) < s * 0.62 + 0.95)) continue;
      if (Object.values(P).some((p) => Math.hypot(p.x - x, p.z - z) < 2 + s)) continue;   // 아파트 판상형(길이 1.8s)까지 링을 안 가리게
      let h = 0.8 + Math.pow(rnd(), 1.8) * hMax * Math.max(0.2, 1 - dist / 20);
      const ds = Math.hypot(x - P.school.x, z - P.school.z);
      if (ds < 9 && z > P.school.z - 3) h = Math.min(h, 1.2 + ds * 0.15);
      building(x, z, s, h, dist > 13 && rnd() < 0.55 ? edgeZone : 'mix');
    }
  }
  city(-6, 2, 38, 32, 420, 15, V3(-4, -2), 'apt');
  city(40, -14, 28, 24, 260, 7, V3(38, -18), 'house');

  // 도로·강·공원 메쉬와 가로등·가로수
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1D2539, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
  const grass = new THREE.MeshStandardMaterial({ color: 0x15382B, roughness: 1, side: THREE.DoubleSide });
  const water = new THREE.MeshStandardMaterial({ color: 0x0E2448, roughness: 0.9, metalness: 0, envMapIntensity: 0.15, side: THREE.DoubleSide });
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x2A3350, roughness: 0.9 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2A3350, roughness: 0.5, metalness: 0.6 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xFFD6A0 });
  const leafA = new THREE.MeshStandardMaterial({ color: 0x1E4636, roughness: 0.9, flatShading: true });
  const leafB = new THREE.MeshStandardMaterial({ color: 0x2B5540, roughness: 0.9, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2A2320, roughness: 1 });
  const dashTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 4;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 30, 4);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
  })();
  G.trunk = new THREE.CylinderGeometry(0.04, 0.06, 1, 5); G.leaf = new THREE.IcosahedronGeometry(0.5, 0);
  const tree = (x, z, k = 1, y0 = 0) => {
    const sz = (0.42 + rnd() * 0.2) * k;
    put(G.trunk, trunkMat, v(x, y0 + 0.18, z), v(1, 0.36, 1));
    put(G.leaf, rnd() < 0.5 ? leafA : leafB, v(x, y0 + 0.36 + sz * 0.5, z), v(sz, sz * 1.15, sz), rnd() * 3);
  };
  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xFFB36A, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
    })(),
  });
  G.pool = new THREE.PlaneGeometry(1, 1);
  const lampPost = (x, z) => {
    put(G.rod, poleMat, v(x, 0.4, z), v(0.7, 0.8, 0.7), 0, false); put(G.lamp, lampMat, v(x, 0.82, z), v(0.4, 0.3, 0.4), 0, false);
    put(G.pool, poolMat, v(x, 0.036, z), v(1.3, 1.3, 1), 0, false);
  };
  const nearPlace = (x, z) => Object.values(P).some((q) => Math.hypot(q.x - x, q.z - z) < 2.4);
  const flatMesh = (geo, mat, y, x = 0, z = 0, lay = false) => {
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.position.set(x, y, z);
    if (lay) m.rotation.x = -Math.PI / 2; scene.add(m); return m;
  };

  flatMesh(ribbon(RIVER, RW + 3, 240, 0), grass, 0.021);                       // 둔치 녹지(한강공원)
  flatMesh(ribbon(RIVER, RW, 240, 0), water, 0.024);                           // 강물
  for (let i = 0; i < 150; i++) {                                              // 둔치 나무
    const u = rnd(), p = RIVER.getPointAt(u), t = RIVER.getTangentAt(u), sg = rnd() < 0.5 ? 1 : -1, off = RW / 2 + 0.35 + rnd() * 0.9;
    tree(p.x - t.z * off * sg, p.z + t.x * off * sg, 0.85);
  }
  ROADS.forEach((c) => {
    const len = c.getLength(), n = Math.ceil(len * 4);
    flatMesh(ribbon(c, 1.3, n, 0), roadMat, 0.028);
    const dt = dashTex.clone(); dt.repeat.x = len / 1.2; dt.needsUpdate = true;
    flatMesh(ribbon(c, 0.05, n, 0), new THREE.MeshBasicMaterial({ map: dt, color: 0xC9D1E6, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), 0.032);
    for (let d = 0.6, k = 0; d < len; d += 1.3, k++) {
      const p = c.getPointAt(d / len), t = c.getTangentAt(d / len), nx = -t.z, nz = t.x;
      if (onWater(p.x, p.z)) {                                                // 다리: 양쪽 난간 조명
        for (const s2 of [1, -1]) put(G.lamp, lampMat, v(p.x + nx * 0.72 * s2, 0.14, p.z + nz * 0.72 * s2), v(0.28, 0.28, 0.28), 0, false);
        continue;
      }
      const sg = ((k >> 1) % 2 ? 1 : -1) * (k % 2 ? -1 : 1), x = p.x + nx * 0.95 * sg, z = p.z + nz * 0.95 * sg;
      if (nearPlace(x, z)) continue;
      if (k % 2) tree(x, z); else lampPost(x, z);
    }
  });
  PARKS.forEach(({ c, r }) => {
    flatMesh(new THREE.CircleGeometry(r, 48), grass, 0.026, c.x, c.z, true);
    flatMesh(new THREE.RingGeometry(r * 0.55, r * 0.55 + 0.1, 48), pathMat, 0.03, c.x, c.z, true);
    for (let i = 0; i < r * r * 2.2; i++) {
      const a = rnd() * 6.283, d = Math.sqrt(rnd()) * (r - 0.35);
      if (Math.abs(d - r * 0.55 - 0.05) < 0.3) continue;
      tree(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d);
    }
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; lampPost(c.x + Math.cos(a) * (r * 0.55 + 0.3), c.z + Math.sin(a) * (r * 0.55 + 0.3)); }
  });
  {                                                                             // 남산: 숲 언덕 + 꼭대기 타워
    const { c, r, h } = HILL;
    const hm = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x10281F, roughness: 1 }));
    hm.scale.set(r, h, r); hm.position.set(c.x, 0, c.z); hm.receiveShadow = true; scene.add(hm);
    for (let i = 0; i < 80; i++) {
      const a = rnd() * 6.283, d = Math.sqrt(rnd()) * (r - 0.3);
      if (d < 0.5) continue;
      tree(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, 1, h * Math.sqrt(1 - (d / r) ** 2) - 0.12);
    }
    const tw = new THREE.Group(), tm = new THREE.MeshStandardMaterial({ color: 0x3A4668, roughness: 0.4, metalness: 0.6 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 2.6, 12), tm); shaft.position.y = 1.3;
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.42, 20), tm); pod.position.y = 2.45;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.07, 20), glowMat(0xDDE8FF, 1.6)); band.position.y = 2.5;
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.3, 6), tm); ant.position.y = 3.3;
    const tip = new THREE.Mesh(G.lamp, redL); tip.position.y = 3.98; tip.scale.setScalar(0.6);
    tw.add(shaft, pod, band, ant, tip); tw.position.set(c.x, h - 0.05, c.z); tw.traverse((o) => { o.castShadow = true; }); scene.add(tw);
  }

  const m4 = new THREE.Matrix4(), qy = new THREE.Quaternion(), eY = new THREE.Vector3(0, 1, 0), flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  bins.forEach(({ geo, mat, list, shadow }) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([pos, scl, ry], i) => { m4.compose(pos, geo === G.ring || geo === G.pool ? flat : qy.setFromAxisAngle(eY, ry), scl); im.setMatrixAt(i, m4); });
    im.castShadow = shadow; im.receiveShadow = true; scene.add(im);
  });

  // ── 랜드마크 ──
  const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202A48, roughness: 0.4, metalness: 0.6 });
  function ring(p, color, r = 1.6) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 12, 64), glow(color, 3));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.12, p.z); scene.add(m); return m;
  }
  const school = new THREE.Group();
  const sb = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 2.6), mats[1]); sb.position.y = 0.8; sb.castShadow = true;
  const sband = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.12, 2.7), glow(CYA, 1.1)); sband.position.y = 1.05;
  school.add(sb, sband); school.position.set(P.school.x - 2.6, 0, P.school.z + 1.2); scene.add(school);
  function station(p, rotY) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 2.2), dark); base.position.y = 0.15;
    const roofM = new THREE.MeshStandardMaterial({ color: 0x9CC2FF, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.28, emissive: BLU, emissiveIntensity: 0.25, side: THREE.DoubleSide });
    const rf = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 6, 24, 1, true, 0, Math.PI), roofM);
    rf.rotation.z = Math.PI / 2; rf.position.y = 0.3;
    const lip = new THREE.Mesh(new THREE.BoxGeometry(6, 0.06, 0.08), glow(CYA, 3)); lip.position.set(0, 0.34, 1.1);
    g.add(base, rf, lip); g.position.set(p.x, 0, p.z); g.rotation.y = rotY; scene.add(g); return g;
  }
  station(P.stA, 0.75); station(P.stB, 0.35);
  const house = new THREE.Group();
  const hb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.6), new THREE.MeshStandardMaterial({ color: 0x2A2F45, roughness: 0.7 })); hb.position.y = 0.6;
  const hr = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0x3A2E3A, roughness: 0.6 })); hr.position.y = 1.65; hr.rotation.y = Math.PI / 4;
  const hw = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.45), glow(AMB, 3)); hw.position.set(0.3, 0.62, 0.81);
  const hw2 = hw.clone(); hw2.position.x = -0.35;
  house.add(hb, hr, hw, hw2); house.position.set(P.home.x + 2.2, 0, P.home.z + 0.4); scene.add(house);
  const homeLight = new THREE.PointLight(AMB, 6, 9, 2); homeLight.position.set(P.home.x + 2.2, 1.2, P.home.z + 1.6); scene.add(homeLight);
  [P.term, P.termB].forEach((p) => { const t = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.8), dark); t.position.set(p.x, 0.25, p.z); scene.add(t); });
  const rings = [ring(P.school, CYA), ring(P.stA, BLU, 1.3), ring(P.stB, BLU, 1.3), ring(P.home, AMB)];

  // ── 경로: 가는 빛줄기(흐르는 빛 입자) + 은은한 번짐 + 그려지는 앞머리 ──
  function flowTex(kind) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 4;
    const g = c.getContext('2d');
    if (kind === 'dash') {                    // 비교용 보조 경로: 점선, 흐르지 않음
      g.fillStyle = 'rgba(255,255,255,.9)'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 16, 4);
    } else {                                   // 주 경로: 바탕 + 앞으로 흐르는 빛 꼬리
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 0, 256, 4);
      const gr = g.createLinearGradient(0, 0, 256, 0);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.72, 'rgba(255,255,255,.55)');
      gr.addColorStop(0.97, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,.55)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 4);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const headTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  // 바닥에 번지는 빛(경로 아래 납작한 띠, 가장자리로 갈수록 투명)
  const poolTex = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 64); return new THREE.CanvasTexture(c);
  })();
  function ribbon(curve, width, n = 320, y = 0.04) {
    const pos = [], uv = [], idx = [], p = new THREE.Vector3(), tg = new THREE.Vector3(), nrm = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const u = i / n; curve.getPointAt(u, p); curve.getTangentAt(u, tg);
      nrm.set(-tg.z, 0, tg.x).normalize().multiplyScalar(width / 2);
      pos.push(p.x + nrm.x, y, p.z + nrm.z, p.x - nrm.x, y, p.z - nrm.z);
      uv.push(u, 0, u, 1);
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function route(key, color, { core = 0.11, halo = 0.55, y = 0.5, lift = 0, dash = false, speed = 0.35 } = {}) {
    const pts = PATHS[key].map((p, i, a) => p.clone().setY(y + Math.sin((i / (a.length - 1)) * Math.PI) * lift));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const len = curve.getLength();
    const tx = flowTex(dash ? 'dash' : 'flow'); tx.repeat.set(len / (dash ? 2.2 : 7), 1);
    const coreGeo = new THREE.TubeGeometry(curve, 320, core * 1.35, 8, false);
    const haloGeo = ribbon(curve, halo * 5);
    const mat = new THREE.MeshBasicMaterial({ color, map: tx, transparent: true, opacity: 1, toneMapped: false });
    const hmat = new THREE.MeshBasicMaterial({ color, map: poolTex, transparent: true, opacity: dash ? 0.12 : 0.42, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(coreGeo, mat), hmesh = new THREE.Mesh(haloGeo, hmat);
    scene.add(hmesh, mesh);
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: headTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    head.scale.setScalar(2.4); head.visible = false; scene.add(head);
    const total = coreGeo.index.count, htotal = haloGeo.index.count;
    coreGeo.setDrawRange(0, 0); haloGeo.setDrawRange(0, 0);
    const o = { curve, mat, hmat, head, tx, dash, speed, _p: 0, pp: 0, baseHalo: hmat.opacity };
    o.set = (v) => {
      o.pp = v;
      coreGeo.setDrawRange(0, Math.floor(total * v / 6) * 6); haloGeo.setDrawRange(0, Math.floor(htotal * v / 6) * 6);
      head.visible = v > 0.01 && v < 0.995;
      if (head.visible) curve.getPointAt(v, head.position);
    };
    o.tick = (t) => { if (!dash) tx.offset.x = -t * speed; };
    return o;
  }
  const R = {
    taxi: route('taxi', CYA), ktx: route('ktx', BLU, { core: 0.14, halo: 0.75, y: 0.6, lift: 3.2, speed: 0.5 }), last: route('last', CYA),
    bus1: route('bus1', 0x9AA8C8, { dash: true, halo: 0.35 }), bus2: route('bus2', 0x9AA8C8, { dash: true, halo: 0.35, lift: 0.8 }), bus3: route('bus3', 0x9AA8C8, { dash: true, halo: 0.35 }),
    jam: route('jam', RED, { core: 0.14, halo: 0.7, y: 0.56, speed: 0.08 }), sub: route('sub', VIO, { core: 0.12, halo: 0.6, y: 0.52 }),
  };

  // KTX 열차
  const train = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const car = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.3, 6, 12), new THREE.MeshStandardMaterial({ color: 0xE9EEF8, metalness: 0.6, roughness: 0.25, emissive: 0x88AAFF, emissiveIntensity: 0.3 }));
    car.userData.i = i; train.add(car);
  }
  train.visible = false; scene.add(train);

  // 택시와 정체 차량
  function car(color) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.36, 0.46), new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 })); b.position.y = 0.3;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.42), new THREE.MeshStandardMaterial({ color: 0x0B1122, roughness: 0.2 })); cab.position.set(-0.05, 0.58, 0);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.36), glow(RED, 4)); tl.position.set(-0.47, 0.34, 0);
    g.add(b, cab, tl); g.visible = false; scene.add(g); return g;
  }
  const taxi = car(0xFFC23D);
  const jamCars = [0, 1, 2, 3].map(() => car(0x3B4666));

  // ── 라벨 (가격은 설명용 예시) ──
  const L = [];
  function label(pos, html, cls = 'pin') {
    const el = document.createElement('div'); el.className = 'lb';
    el.innerHTML = `<div class="${cls}">${html}</div>`;
    lbWrap.appendChild(el); const o = { el, pos: pos.clone(), on: false }; L.push(o); return o;
  }
  const lb = {
    say: label(P.school.clone().setY(3.2), '“금요일 저녁에 집에 갈래”', 'bub'),
    school: label(P.school.clone().setY(2.2), '학교<small>18:00 수업 끝</small>'),
    home: label(P.home.clone().setY(2.6), '본가'),
    ktx: label(V3(20, -15, 5.2), 'KTX 경로 · 가장 빨리<small>20:10 도착 · 환승 2번</small><em>31,400원</em>', 'pin b'),
    bus: label(V3(6, -11.5, 2.2), '고속버스 경로 · 가장 싸게<small>21:30 도착 · 환승 2번</small><em>14,450원</em>', 'pin g'),
    ok: label(P.stA.clone().setY(3), '예매 확인<small>택시 8,300 · KTX 21,600 · 버스 1,500</small><em>합계 31,400원</em>', 'pin b'),
    jam: label(V3(-3.5, 2.5, 2.6), '길이 막혀요<small>역 도착 18:44 · 열차 18:40</small>', 'pin r'),
    sub: label(V3(-12.5, -3.5, 2.6), '지하철로 바꾸기<small>역 도착 18:31 · 택시 4,800 + 지하철 1,550</small><em>1,950원 절약</em>', 'pin v'),
  };
  const showL = (keys) => Object.entries(lb).forEach(([k, o]) => { o.on = keys.includes(k); o.el.classList.toggle('on', o.on); });

  const C = [
    { p: [-6, 17, 26], t: [-14, 0.5, 7] },
    { p: [15, 88, 10], t: [15, 0, -4] },            // 비교: 평면도. 완전 수직이면 lookAt이 뒤집혀 화면이 빙글 돌아서 살짝 남쪽으로 기울임
    { p: [-2, 58, 58], t: [15, 0, -4] },
    { p: [-21, 26, 21], t: [-7, 0, 1] },
  ];
  cam.position.set(...C[0].p); look.set(...C[0].t); cam.lookAt(look);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(800, 500), 0.7, 0.5, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const st = { busO: 1, taxiT: 0 };
  let tl;
  function show(i) {
    if (tl) tl.kill();
    const d = reduce ? 0 : 1;
    tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    tl.to(cam.position, { x: C[i].p[0], y: C[i].p[1], z: C[i].p[2], duration: 1.8 * d }, 0)
      .to(look, { x: C[i].t[0], y: C[i].t[1], z: C[i].t[2], duration: 1.8 * d }, 0);
    const want = {
      taxi: i >= 1 ? 1 : 0, ktx: i >= 1 ? 1 : 0, last: i >= 1 ? 1 : 0,
      bus1: i === 1 ? 1 : 0, bus2: i === 1 ? 1 : 0, bus3: i === 1 ? 1 : 0,
      jam: i === 3 ? 1 : 0, sub: i === 3 ? 1 : 0,
    };
    const at = { taxi: 0.5, ktx: 0.95, last: 1.6, bus1: 0.7, bus2: 1.1, bus3: 1.7, jam: 1.7, sub: 2.9 };
    Object.entries(want).forEach(([k, w]) => {
      const r = R[k]; if (r._p === w) return;
      tl.to(r, { _p: w, duration: (w ? 1.2 : 0.45) * d, ease: w ? 'power2.inOut' : 'power1.in', onUpdate() { r.set(r._p); } }, w ? at[k] * d : 0);
    });
    tl.to(st, { busO: i === 1 ? 1 : 0.12, duration: 0.6 * d }, 0.2 * d);
    ['taxi', 'ktx', 'last'].forEach((k) => tl.to(R[k].hmat, { opacity: i === 2 ? 0.75 : R[k].baseHalo, duration: 0.6 * d }, 0.6 * d));
    train.visible = i === 1 || i === 2; taxi.visible = i === 3; jamCars.forEach((c) => (c.visible = i === 3));
    if (i === 3) { st.taxiT = 0; tl.to(st, { taxiT: 0.5, duration: 1.8 * d, ease: 'power2.out' }, 0.2 * d); }
    const keys = [['say', 'school', 'home'], ['school', 'home', 'ktx', 'bus'], ['school', 'home', 'ok'], ['school', 'jam']][i];
    showL([]); tl.call(() => showL(keys), null, (i === 3 ? 1.6 : 1.0) * d);
    if (i === 3) tl.call(() => { lb.sub.on = true; lb.sub.el.classList.add('on'); }, null, 3.6 * d);
  }

  function size() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(stage); size();

  let vis = false;
  new IntersectionObserver((es) => { vis = es[0].isIntersecting; }, { threshold: 0.05 }).observe(stage);
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  function place(obj, curve, t, y) {
    const u = Math.min(Math.max(t, 0.001), 0.999);
    curve.getPointAt(u, tmp); curve.getTangentAt(u, tan);
    obj.position.set(tmp.x, y ?? tmp.y, tmp.z); obj.rotation.set(0, Math.atan2(-tan.z, tan.x), 0);
  }
  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!vis) return;
    const t = (now - t0) / 1000;
    const sway = reduce ? 0 : Math.sin(t * 0.22) * 0.8;
    cam.position.x += sway - (cam.userData.sw || 0); cam.userData.sw = sway;
    cam.lookAt(look);
    ['bus1', 'bus2', 'bus3'].forEach((k) => { R[k].mat.opacity = 0.85 * st.busO; R[k].hmat.opacity = R[k].baseHalo * st.busO; });
    Object.values(R).forEach((r) => r.tick(t));
    rings.forEach((m, k) => { const s = 1 + Math.sin(t * 2 + k) * 0.06; m.scale.set(s, s, s); });
    if (train.visible) {
      const base = 0.06 + ((t * 0.06) % 0.88);
      train.children.forEach((c) => { place(c, R.ktx.curve, base - c.userData.i * 0.024); c.position.y += 0.25; c.rotation.z = Math.PI / 2; });
    }
    if (taxi.visible) {
      place(taxi, R.taxi.curve, st.taxiT, 0.05);
      jamCars.forEach((c, k) => place(c, R.jam.curve, 0.18 + k * 0.2, 0.05));
    }
    composer.render();
    const w = stage.clientWidth, h = stage.clientHeight;
    // 라벨: 투영 → 화면 안으로 → 서로 안 겹치게 밀어내기
    const vis2 = [];
    L.forEach((o) => {
      if (!o.on) return;
      tmp.copy(o.pos).project(cam);
      // 기준점이 화면 밖이면 가장자리에 붙이지 말고 숨긴다
      const inView = Math.abs(tmp.x) < 0.96 && Math.abs(tmp.y) < 0.96 && tmp.z < 1;
      o.el.classList.toggle('on', inView);
      if (!inView) return;
      const bw = o.el.offsetWidth, bh = o.el.offsetHeight;
      let x = (tmp.x * 0.5 + 0.5) * w - bw / 2, y = (-tmp.y * 0.5 + 0.5) * h - bh - 8;
      vis2.push({ o, x, y, bw, bh });
    });
    for (let it = 0; it < 6; it++) {
      for (let a = 0; a < vis2.length; a++) for (let b = a + 1; b < vis2.length; b++) {
        const A = vis2[a], B = vis2[b];
        const ox = Math.min(A.x + A.bw, B.x + B.bw) - Math.max(A.x, B.x) + 8;
        const oy = Math.min(A.y + A.bh, B.y + B.bh) - Math.max(A.y, B.y) + 8;
        if (ox > 0 && oy > 0) {
          if (oy < ox) { const s = (A.y < B.y ? -1 : 1) * oy / 2; A.y += s; B.y -= s; }
          else { const s = (A.x < B.x ? -1 : 1) * ox / 2; A.x += s; B.x -= s; }
        }
      }
      vis2.forEach((r) => { r.x = Math.min(Math.max(r.x, 24), w - r.bw - 24); r.y = Math.min(Math.max(r.y, 44), h - r.bh - 24); });
    }
    vis2.forEach((r) => { r.o.el.style.transform = `translate(${r.x}px, ${r.y}px)`; });
  }
  requestAnimationFrame(frame);
  show(0);
  window.__m3 = { show };
}
