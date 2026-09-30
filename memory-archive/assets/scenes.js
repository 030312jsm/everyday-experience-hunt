// 표지 · TRACE · EMBER 3D. 각 장면은 자기 슬라이드가 보일 때만 그린다. WebGL이 없으면 캔버스만 비어 있고 글은 그대로다.
import * as THREE from './vendor/three.module.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader = new THREE.TextureLoader();
const mouse = { x: 0, y: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function stage(canvas, slide, build) {
  let R;
  try { R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  const tick = build(scene, cam, R);
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(canvas); size();
  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    if (!slide.classList.contains('on')) return;
    tick(clock.getElapsedTime());
    R.render(scene, cam);
  })();
}

// 둥근 모서리 사진 카드 텍스처 (이미지 일부를 잘라 흰 테두리와 함께)
function cardTex(img, sx, sy, sw, sh, W = 512) {
  const H = Math.round(W * sh / sw), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = W * 0.06, b = W * 0.025;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  rr(0, 0, W, H, r); g.fillStyle = '#fff'; g.fill();
  g.save(); rr(b, b, W - 2 * b, H - 2 * b, r * 0.7); g.clip();
  g.drawImage(img, sx * img.width, sy * img.height, sw * img.width, sh * img.height, b, b, W - 2 * b, H - 2 * b); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { t, aspect: H / W };
}
// 카드 아래 부드러운 그림자
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(17,18,20,.32)'); gr.addColorStop(1, 'rgba(17,18,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
const IMGS = ['img/key.jpg', 'img/p1.jpg', 'img/p2.jpg', 'img/p3.jpg', 'img/p4.jpg', 'img/trace.jpg', 'img/echo.jpg', 'img/ember.jpg'];

Promise.all(IMGS.map(loadImg)).then((imgs) => {
  cover(imgs); trace(imgs); ember(imgs);
});

/* ① 표지: 흰 공간에 떠 있는 기억 카드 */
function cover(imgs) {
  const slide = document.getElementById('s0'), canvas = document.getElementById('cov3d');
  if (!slide || !canvas) return;
  stage(canvas, slide, (scene, cam) => {
    cam.position.set(0, 0, 16);
    scene.fog = new THREE.Fog(0xffffff, 14, 34);
    const cards = [], geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 30; i++) {
      const img = imgs[i % imgs.length], u = 0.45 + rnd() * 0.5, v = u * (0.55 + rnd() * 0.5);
      const { t, aspect } = cardTex(img, rnd() * (1 - u), rnd() * Math.max(0, 1 - v), u, Math.min(v, 1));
      const w = 1.1 + rnd() * 1.4, g = new THREE.Group();
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true })); m.scale.set(w, w * aspect, 1);
      const sh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
      sh.scale.set(w * 1.5, w * aspect * 1.5, 1); sh.position.set(0.15, -0.35, -0.08);
      g.add(sh, m);
      // 가운데 제목 자리는 비워 두고 둘레에 흩어 놓는다
      let x, y, z; do { x = (rnd() - 0.5) * 24; y = (rnd() - 0.5) * 13; z = -rnd() * 9 + 1; } while (Math.abs(x) < 7.2 - z * 0.6 && Math.abs(y) < 3.2 - z * 0.35);   // 멀리 있는 카드일수록 화면 가운데로 모여 보이므로 더 넓게 비운다
      g.position.set(x, y, z);
      g.rotation.set((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.5);
      cards.push({ g, x, y, z, ph: rnd() * 6.28, sp: 0.2 + rnd() * 0.3, r0: g.rotation.clone() });
      scene.add(g);
    }
    return (t) => {
      for (const c of cards) {
        const a = reduce ? 0 : 1;
        c.g.position.y = c.y + Math.sin(t * c.sp + c.ph) * 0.25 * a;
        c.g.rotation.z = c.r0.z + Math.sin(t * c.sp * 0.7 + c.ph) * 0.05 * a;
      }
      cam.position.x += (mouse.x * 2.2 - cam.position.x) * 0.04;
      cam.position.y += (-mouse.y * 1.4 - cam.position.y) * 0.04;
      cam.lookAt(0, 0, -2);
    };
  });
}

/* ② TRACE: 실제 기록 / 직접 남긴 기억 / AI 추정 세 겹 */
function trace(imgs) {
  const fig = document.getElementById('trace3d'), slide = document.getElementById('s10');
  if (!fig || !slide) return;
  stage(fig.querySelector('canvas'), slide, (scene, cam) => {
    cam.position.set(6.5, 4.2, 9.5); cam.lookAt(0, 0, 0);
    const root = new THREE.Group(); scene.add(root);
    const geo = new THREE.PlaneGeometry(1, 1);
    const layers = [
      { z: 1.6, src: [0, 0, 5, 0], op: 1, edge: null, name: '실제 기록' },
      { z: 0, src: [1, 3, 2, 6], op: 1, edge: 0x2350F5, name: '직접 남긴 기억' },
      { z: -1.6, src: [7, 4, 6, 0], op: 0.38, edge: 'dash', name: 'AI 추정' },
    ];
    layers.forEach((L, li) => {
      const g = new THREE.Group(); g.position.z = L.z; root.add(g);
      // 층 바닥판(얇은 유리 같은 판)
      const pl = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
      pl.scale.set(6.2, 4.2, 1); pl.position.z = -0.02; g.add(pl);
      const ol = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xCFCFCB }));
      ol.scale.copy(pl.scale); g.add(ol);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const img = imgs[L.src[(r * 4 + c) % L.src.length]];
        const { t } = cardTex(img, rnd() * 0.5, rnd() * 0.4, 0.5, 0.5 * 0.72, 256);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: L.op, depthWrite: L.op === 1 }));
        m.scale.set(1.25, 0.9, 1); m.position.set(-2.1 + c * 1.4, 1.1 - r * 1.1, 0.01); g.add(m);
        if (L.edge === 0x2350F5) {
          const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x2350F5 }));
          e.scale.set(1.32, 0.97, 1); e.position.copy(m.position); g.add(e);
        } else if (L.edge === 'dash') {
          const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineDashedMaterial({ color: 0x8C8F97, dashSize: 0.08, gapSize: 0.06 }));
          e.scale.set(1.32, 0.97, 1); e.position.copy(m.position); e.computeLineDistances(); g.add(e);
        }
      }
    });
    return (t) => {
      const a = reduce ? 0 : 1;
      root.rotation.y = -0.45 + Math.sin(t * 0.35) * 0.28 * a + mouse.x * 0.3;
      root.rotation.x = -0.12 + mouse.y * 0.15;
      root.children.forEach((g, i) => { g.position.z = layers[i].z * (1 + 0.12 * Math.sin(t * 0.6) * a); });
    };
  });
}

/* ③ EMBER: 흰 클레이 방 → 물건 → 사진 → 따뜻한 조명 */
function ember(imgs) {
  const fig = document.getElementById('emImg'), slide = document.getElementById('em');
  if (!fig || !slide) return;
  stage(fig.querySelector('canvas'), slide, (scene, cam, R) => {
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    cam.position.set(7.2, 5.4, 8.6); cam.lookAt(0, 1.1, 0);
    scene.background = new THREE.Color(0xF6F6F4);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xDCD7CF, 1.6); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 8, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 }); scene.add(sun);
    const lamp = new THREE.PointLight(0xFFB36B, 0, 9, 1.6); lamp.position.set(0, 2.6, 0); lamp.castShadow = true; scene.add(lamp);

    const clay = (c = 0xF1EFEA) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 });
    const box = (w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
    // 공간: 바닥 · 뒷벽 · 옆벽 · 창문 구멍 느낌의 틀
    const mFloor = clay(), mWall = clay(0xF4F2EE);
    const room = new THREE.Group(); scene.add(room);
    room.add(box(8, 0.15, 6.5, 0, -0.075, 0, mFloor), box(8, 4, 0.15, 0, 2, -3.25, mWall), box(0.15, 4, 6.5, -4, 2, 0, mWall));
    const win = box(0.05, 1.6, 2.2, -3.92, 2.3, 0.4, new THREE.MeshStandardMaterial({ color: 0xDDE6EE, roughness: 0.3, emissive: 0xDDE6EE, emissiveIntensity: 0.3 }));
    room.add(win);
    // 물건: 식탁 · 의자 넷 · TV · 조명 · 액자 틀
    const mWood = clay(), mChair = clay(), mTv = clay(), objs = [];
    const add = (o) => { o.userData.s = o.scale.clone(); o.scale.setScalar(0.0001); room.add(o); objs.push(o); return o; };
    const table = new THREE.Group(); table.add(box(2.6, 0.12, 1.5, 0, 1.0, 0, mWood));
    [[-1.15, -0.6], [1.15, -0.6], [-1.15, 0.6], [1.15, 0.6]].forEach(([x, z]) => table.add(box(0.1, 0.95, 0.1, x, 0.47, z, mWood)));
    add(table);
    const chair = (x, z, ry) => { const g = new THREE.Group(); g.add(box(0.6, 0.08, 0.6, 0, 0.6, 0, mChair), box(0.6, 0.7, 0.08, 0, 0.98, -0.27, mChair));
      [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].forEach(([a, b]) => g.add(box(0.06, 0.6, 0.06, a, 0.3, b, mChair)));
      g.position.set(x, 0, z); g.rotation.y = ry; return add(g); };
    chair(-0.6, -1.15, 0); chair(0.6, -1.15, 0); chair(-0.6, 1.15, Math.PI); chair(0.6, 1.15, Math.PI);
    const tv = new THREE.Group(); tv.add(box(1.8, 0.5, 0.5, 0, 0.25, 0, mTv), box(1.5, 0.9, 0.08, 0, 1.05, 0, mTv));
    tv.position.set(2.4, 0, -2.8); add(tv);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.4, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xF1EFEA, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xFFB36B, emissiveIntensity: 0 }));
    shade.position.set(0, 2.85, 0); const cord = box(0.02, 1.1, 0.02, 0, 3.6, 0, clay()); const lampG = new THREE.Group(); lampG.add(shade, cord); add(lampG);
    // 액자 셋 (사진 단계에서 사진이 들어간다)
    const frames = [];
    [[-1.9, 2.6, 1.0, 0.75], [-0.6, 2.75, 0.8, 1.0], [0.6, 2.55, 1.1, 0.8]].forEach(([x, y, w, h], i) => {
      const f = new THREE.Group(); f.add(box(w + 0.12, h + 0.12, 0.05, 0, 0, 0, clay(0xE9E6E0)));
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
      pic.position.z = 0.03; f.add(pic); f.position.set(x, y, -3.15); add(f); frames.push({ pic, i });
    });
    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.78), new THREE.MeshStandardMaterial({ color: 0xDADAD6, roughness: 0.4 }));
    tvScreen.position.set(0, 1.05, 0.05); tv.add(tvScreen);
    const crops = [[0.30, 0.30, 0.25, 0.20], [0.55, 0.35, 0.20, 0.25], [0.12, 0.45, 0.25, 0.20]];
    const picTex = crops.map(([sx, sy, sw, sh]) => cardTex(imgs[7], sx, sy, sw, sh, 256).t);
    const tvTex = cardTex(imgs[0], 0.2, 0.3, 0.5, 0.3, 256).t;

    const warm = { floor: new THREE.Color(0xC49A70), wall: new THREE.Color(0xEBDCC6), wood: new THREE.Color(0x7B4E2F), chair: new THREE.Color(0x5E4130), tv: new THREE.Color(0x2B2B2E) };
    const base = new THREE.Color(0xF1EFEA), baseW = new THREE.Color(0xF4F2EE);
    let k = 0;
    return (t) => {
      const step = +(fig.dataset.k || 0);
      k += (step - k) * (reduce ? 1 : 0.05);
      const obj = Math.min(1, Math.max(0, k)), pic = Math.min(1, Math.max(0, k - 1)), full = Math.min(1, Math.max(0, k - 2));
      objs.forEach((o, i) => { const e = Math.min(1, Math.max(0, obj * 1.6 - i * 0.08)); const s = 1 - Math.pow(1 - e, 3); o.scale.set(o.userData.s.x * s || 0.0001, o.userData.s.y * s || 0.0001, o.userData.s.z * s || 0.0001); });
      frames.forEach((f) => { f.pic.material.map = pic > 0.02 ? picTex[f.i] : null; f.pic.material.color.setScalar(0.35 + 0.65 * pic); f.pic.material.needsUpdate = true; });
      tvScreen.material.map = pic > 0.02 ? tvTex : null; tvScreen.material.color.setScalar(0.5 + 0.5 * pic); tvScreen.material.needsUpdate = true;
      mFloor.color.copy(base).lerp(warm.floor, full); mWall.color.copy(baseW).lerp(warm.wall, full);
      mWood.color.copy(base).lerp(warm.wood, full); mChair.color.copy(base).lerp(warm.chair, full); mTv.color.copy(base).lerp(warm.tv, full);
      lamp.intensity = 14 * full; shade.material.emissiveIntensity = 1.4 * full;
      sun.intensity = 1.6 - 0.9 * full; hemi.intensity = 1.6 - 0.8 * full;
      scene.background.setRGB(0.965 - 0.05 * full, 0.965 - 0.07 * full, 0.957 - 0.1 * full);
      const a = reduce ? 0 : 1;
      cam.position.x = 7.2 + Math.sin(t * 0.25) * 0.6 * a + mouse.x * 1.2;
      cam.position.y = 5.4 - mouse.y * 0.8;
      cam.lookAt(0, 1.1, 0);
    };
  });
}
