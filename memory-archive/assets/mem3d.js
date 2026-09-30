// 개념 슬라이드 3D: ① 공중에 떠 있는 기억 조각 → ② 조각이 모여 하나의 장면이 되고 카메라가 그 안으로 → ③ 함께 감상
// 단계는 index.html이 #cTiles 의 data-step 으로 알려 준다. WebGL이 없으면 CSS 조각 연출이 그대로 남는다.
import * as THREE from './vendor/three.module.js';

const wrap = document.getElementById('cTiles');
const canvas = document.getElementById('mem3d');
const slide = document.getElementById('s2');
let R = null;
try { R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { R = null; }
if (R && wrap && slide) init();

function init() {
  wrap.classList.add('gl');
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.outputColorSpace = THREE.SRGBColorSpace;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xFFFFFF, 9, 30);
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  cam.position.set(0, 0, 13);

  const loader = new THREE.TextureLoader();
  const load = (s) => { const t = loader.load(s); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const base = ['img/key.jpg', 'img/p1.jpg', 'img/p2.jpg', 'img/p3.jpg', 'img/p4.jpg', 'img/trace.jpg', 'img/echo.jpg', 'img/ember.jpg'].map(load);

  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const geo = new THREE.PlaneGeometry(1, 1);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = 9, RW = 5, W = 9, H = W * 293 / 519, tw = W / C, th = H / RW;
  const frags = [];

  // 이번에 찾는 기억(여름밤 바다)을 이루는 조각들
  for (let r = 0; r < RW; r++) for (let c = 0; c < C; c++) {
    const t = base[0].clone(); t.repeat.set(1 / C, 1 / RW); t.offset.set(c / C, 1 - (r + 1) / RW); t.needsUpdate = true;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }));
    m.scale.set(tw * 0.99, th * 0.99, 1);
    const s = 0.9 + rnd() * 0.5;
    frags.push({ m, key: true, s, ph: rnd() * 6.28, d: rnd() * 0.55,
      home: V(-W / 2 + tw * (c + 0.5), H / 2 - th * (r + 0.5), 0),
      from: V((rnd() - 0.5) * 15, (rnd() - 0.5) * 8.5, 1.5 - rnd() * 12),
      rot: new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.7, (rnd() - 0.5) * 1.1, (rnd() - 0.5) * 0.35)) });
    scene.add(m);
  }
  // 다른 기억들(사람·장소 조각) — 공간 진입 때 뒤로 물러난다
  for (let i = 0; i < 38; i++) {
    const src = base[1 + Math.floor(rnd() * 7)], t = src.clone(), u = 0.22 + rnd() * 0.3;
    t.repeat.set(u, u); t.offset.set(rnd() * (1 - u), rnd() * (1 - u)); t.needsUpdate = true;
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }));
    const w = 0.9 + rnd() * 1.1; m.scale.set(w, w * (0.62 + rnd() * 0.3), 1);
    const from = V((rnd() - 0.5) * 21, (rnd() - 0.5) * 11, 2 - rnd() * 16);
    frags.push({ m, key: false, s: 1, ph: rnd() * 6.28, d: rnd() * 0.4, home: from.clone().add(V((rnd() - 0.5) * 6, (rnd() - 0.5) * 4, -16)), from,
      rot: new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.6, (rnd() - 0.5) * 1.0, (rnd() - 0.5) * 0.3)) });
    scene.add(m);
  }
  // 검색에 걸린 조각 하나에 호박색 테두리
  const hit = frags[22].m;
  const ring = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x2350F5, transparent: true }));
  ring.scale.set(1.08, 1.12, 1); hit.add(ring);

  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(canvas); size();

  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });

  let p = 0, camZ = 13;
  const q = new THREE.Quaternion(), I = new THREE.Quaternion(), tmp = new THREE.Vector3();
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (!slide.classList.contains('on')) return;
    const t = clock.getElapsedTime(), step = +(wrap.dataset.step || 0);
    const target = step >= 1 ? 1 : 0;
    p += (target - p) * (reduce ? 1 : 0.035);
    camZ += ((step === 0 ? 13 : step === 1 ? 7.6 : 9.2) - camZ) * (reduce ? 1 : 0.04);
    for (const f of frags) {
      const k = ease(Math.min(1, Math.max(0, (p - f.d * 0.45) / 0.72)));
      const bob = (1 - k) * 0.18;
      tmp.copy(f.from); tmp.y += Math.sin(t * 0.6 + f.ph) * bob; tmp.x += Math.cos(t * 0.4 + f.ph) * bob * 0.6;
      f.m.position.lerpVectors(tmp, f.home, k);
      q.copy(f.rot).slerp(I, f.key ? k : 0); f.m.quaternion.copy(q);
      // 모이면 조각이 이음새 없이 맞붙게 살짝 키운다
      if (f.key) { const s = f.s + (1 - f.s) * k, g = 0.97 + 0.035 * k; f.m.scale.set(tw * g * s, th * g * s, 1); f.m.material.opacity = 0.55 + 0.45 * Math.max(k, 0.6); }
      else f.m.material.opacity = 0.85 * (1 - k);
    }
    ring.material.opacity = (1 - p) * (0.6 + 0.4 * Math.sin(t * 2.2));
    cam.position.x += (mouse.x * 1.4 * (1 - p * 0.7) - cam.position.x) * 0.05;
    cam.position.y += (-mouse.y * 0.9 * (1 - p * 0.7) - cam.position.y) * 0.05;
    cam.position.z = camZ;
    cam.lookAt(0, 0, 0);
    R.render(scene, cam);
  }
  requestAnimationFrame(frame);
}
