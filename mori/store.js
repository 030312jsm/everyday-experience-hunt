// mori 가게 3D 장면: 첫 화면의 가게 앞 + 05장의 가게 안 둘러보기
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#gl');
const mobile = matchMedia('(max-width: 760px)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08070a);
scene.fog = new THREE.Fog(0x08070a, 10, 30);
const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 80);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.5, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- 재질 ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const grain = (base, line, n) => (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const y = Math.random() * h;
    g.strokeStyle = line; g.globalAlpha = 0.04 + Math.random() * 0.1; g.lineWidth = 0.5 + Math.random() * 2;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 3);
    g.stroke();
  }
  g.globalAlpha = 1;
};
const speckle = (base, n) => (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.05})`;
    const r = Math.random() * 3; g.fillRect(Math.random() * w, Math.random() * h, r, r);
  }
};
const oakTex = canvasTex(512, 512, grain('#a27a55', '#5a3b22', 140), [2, 1]);
const floorTex = canvasTex(1024, 1024, (g, w, h) => {
  grain('#3c2a1e', '#160d07', 260)(g, w, h);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
  for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
}, [5, 5]);
const stoneTex = canvasTex(512, 512, speckle('#857360', 9000), [3, 3]);
const plasterTex = canvasTex(512, 512, speckle('#7a6250', 7000), [4, 2]);

const M = {
  plaster: new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95, envMapIntensity: 0.15 }),
  facade: new THREE.MeshStandardMaterial({ color: 0x2e2722, roughness: 0.92, envMapIntensity: 0.12 }),
  oak: new THREE.MeshStandardMaterial({ map: oakTex, roughness: 0.66, envMapIntensity: 0.25 }),
  oakDark: new THREE.MeshStandardMaterial({ color: 0x4b3425, roughness: 0.55, envMapIntensity: 0.3 }),
  floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.48, envMapIntensity: 0.35 }),
  stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.6, envMapIntensity: 0.3 }),
  wellWall: new THREE.MeshStandardMaterial({ color: 0x8c7b66, roughness: 0.7, side: THREE.BackSide, envMapIntensity: 0.2 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a062, metalness: 1, roughness: 0.3, envMapIntensity: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.17, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3, depthWrite: false }),
  street: new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.28, metalness: 0.3, envMapIntensity: 0.25 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 0.9 }),
  glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.42).multiplyScalar(2.2) }),
};

function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  scene.add(m);
  return m;
}

// ---------- 방과 바깥 ----------
const ROOM = { x0: -5, x1: 5, z0: -6, z1: 4, h: 3.3 };
const floor = mesh(new THREE.PlaneGeometry(10, 10), M.floor, 0, 0, -1, false);
floor.rotation.x = -Math.PI / 2;
const ceil = mesh(new THREE.PlaneGeometry(10, 10), M.dark, 0, ROOM.h, -1, false);
ceil.rotation.x = Math.PI / 2;
const wallL = mesh(new THREE.PlaneGeometry(10, ROOM.h), M.plaster, ROOM.x0, ROOM.h / 2, -1, false);
wallL.rotation.y = Math.PI / 2;
const wallR = mesh(new THREE.PlaneGeometry(10, ROOM.h), M.plaster, ROOM.x1, ROOM.h / 2, -1, false);
wallR.rotation.y = -Math.PI / 2;
mesh(new THREE.PlaneGeometry(10, ROOM.h), M.plaster, 0, ROOM.h / 2, ROOM.z0, false);
// 왼쪽 안쪽 구석의 포스터 셋 (에셋 라이브러리 이미지로 만든 것): 하나는 선반 옆 뒷벽, 둘은 왼쪽 벽
[['wave', -4.5, ROOM.z0, 0], ['blanket', ROOM.x0, -5.3, Math.PI / 2], ['cloud', ROOM.x0, -4.4, Math.PI / 2]].forEach(([n, x, z, ry]) => {
  const tex = new THREE.TextureLoader().load(`img/v/poster_${n}.webp`);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  g.position.set(x, 1.62, z); g.rotation.y = ry;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.12, 0.03), M.oakDark);
  frame.position.z = 0.015;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.06), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.28, roughness: 0.85 }));
  p.position.z = 0.032;
  g.add(frame, p);
  scene.add(g);
});

const street = mesh(new THREE.PlaneGeometry(40, 20), M.street, 0, -0.01, 14, false);
street.rotation.x = -Math.PI / 2;
const curb = mesh(new THREE.BoxGeometry(40, 0.12, 2.2), M.facade, 0, 0.06, 5.1, false);

// 정면: 창과 문 구멍이 난 벽
const W = { x0: -4.1, x1: -0.7, y0: 0.75, y1: 2.65 };
const D = { x0: 0.35, x1: 1.55, y1: 2.45 };
const fs = new THREE.Shape();
fs.moveTo(-12, 0); fs.lineTo(12, 0); fs.lineTo(12, 7.5); fs.lineTo(-12, 7.5); fs.lineTo(-12, 0);
const hw = new THREE.Path(); hw.moveTo(W.x0, W.y0); hw.lineTo(W.x1, W.y0); hw.lineTo(W.x1, W.y1); hw.lineTo(W.x0, W.y1); hw.lineTo(W.x0, W.y0);
const hd = new THREE.Path(); hd.moveTo(D.x0, 0); hd.lineTo(D.x1, 0); hd.lineTo(D.x1, D.y1); hd.lineTo(D.x0, D.y1); hd.lineTo(D.x0, 0);
fs.holes.push(hw, hd);
mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.3, bevelEnabled: false }), M.facade, 0, 0, ROOM.z1 - 0.15);
// 창틀과 유리
mesh(new THREE.BoxGeometry(W.x1 - W.x0 + 0.08, 0.06, 0.42), M.oakDark, (W.x0 + W.x1) / 2, W.y0 - 0.03, ROOM.z1 + 0.02);
const winGlass = new THREE.MeshStandardMaterial({ color: 0x0b0806, transparent: true, opacity: 0.18, roughness: 0.08, metalness: 0.2, envMapIntensity: 0.25, depthWrite: false });
const glassPane = mesh(new THREE.PlaneGeometry(W.x1 - W.x0, W.y1 - W.y0), winGlass,(W.x0 + W.x1) / 2, (W.y0 + W.y1) / 2, ROOM.z1, false);
glassPane.castShadow = false;
// 문: 왼쪽 경첩을 축으로 안쪽으로 열림
const door = new THREE.Group();
door.position.set(D.x0, 0, ROOM.z1 - 0.02);
scene.add(door);
const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(D.x1 - D.x0 - 0.02, D.y1 - 0.02, 0.05), M.oakDark);
doorLeaf.position.set((D.x1 - D.x0) / 2, D.y1 / 2, 0);
doorLeaf.castShadow = true;
door.add(doorLeaf);
const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.7, 0.4).multiplyScalar(1.4) }));
slit.position.set(0.3, 1.35, 0.03);
door.add(slit);
const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 12), M.brass);
knob.position.set(D.x1 - D.x0 - 0.14, 1.05, 0.06);
door.add(knob);

// 간판
const fontReady = document.fonts ? document.fonts.load('500 160px "Cormorant Garamond"').catch(() => {}) : Promise.resolve();
const signMat = new THREE.MeshBasicMaterial({ transparent: true });
fontReady.then(() => {
  signMat.map = canvasTex(1024, 360, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#f4e7cf';
    g.font = '500 210px "Cormorant Garamond", Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = '28px';
    g.fillText('mori', w / 2 + 14, h / 2 - 10);
  });
  signMat.color = new THREE.Color(1.6, 1.45, 1.2);
  signMat.needsUpdate = true;
});
const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.4), signMat);
sign.position.set((D.x0 + D.x1) / 2, 2.95, ROOM.z1 + 0.17);
scene.add(sign);
const sconce = new THREE.PointLight(0xffb070, 6, 6, 2);
sconce.position.set((D.x0 + D.x1) / 2, 3.35, ROOM.z1 + 0.6);
scene.add(sconce);
// 멀리 있는 거리 불빛
for (const [x, y, z, s] of [[-9, 3.2, 9, 0.12], [8.5, 3.0, 11, 0.1], [-14, 2.6, 16, 0.14], [12, 2.4, 19, 0.12], [3, 3.4, 22, 0.1]]) {
  mesh(new THREE.SphereGeometry(s, 12, 8), M.glow, x, y, z, false);
  if (x < 0 && z < 12) { const l = new THREE.PointLight(0xffa860, 4, 9, 2); l.position.set(x, y, z); scene.add(l); }
}

// ---------- 둥근 카운터 ----------
const C = new THREE.Vector3(0, 0, -1.2);
const TOP = 1.05, R_OUT = 1.9, R_WELL = 1.24, WELL_R = 0.3, WELL_D = 0.13;
const SEATS = 6;
const seatAng = (i) => Math.PI / 2 + (i * Math.PI * 2) / SEATS; // 0번 자리는 문 쪽(+z)
const polar = (a, r, y) => new THREE.Vector3(C.x + Math.cos(a) * r, y, C.z + Math.sin(a) * r);

const topShape = new THREE.Shape();
topShape.absarc(0, 0, R_OUT, 0, Math.PI * 2, false);
for (let i = 0; i < SEATS; i++) {
  const a = seatAng(i), h = new THREE.Path();
  h.absarc(Math.cos(a) * R_WELL, -Math.sin(a) * R_WELL, WELL_R, 0, Math.PI * 2, true);
  topShape.holes.push(h);
}
const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3, curveSegments: 96 });
topGeo.rotateX(-Math.PI / 2);
mesh(topGeo, M.stone, C.x, TOP - 0.07, C.z);
// 몸통 윗면은 홈 바닥보다 낮게 (홈 안이 가려지지 않도록), 그 위는 옆면만
const BODY_TOP = 0.84;
mesh(new THREE.CylinderGeometry(R_OUT - 0.12, R_OUT - 0.2, BODY_TOP - 0.08, 96), M.stone, C.x, (BODY_TOP - 0.08) / 2 + 0.08, C.z);
mesh(new THREE.CylinderGeometry(R_OUT - 0.12, R_OUT - 0.12, TOP - 0.07 - BODY_TOP + 0.01, 96, 1, true), M.stone, C.x, (TOP - 0.07 + BODY_TOP) / 2, C.z);
mesh(new THREE.CylinderGeometry(R_OUT - 0.3, R_OUT - 0.3, 0.08, 64), M.dark, C.x, 0.04, C.z, false);
const ledRing = mesh(new THREE.TorusGeometry(R_OUT - 0.1, 0.012, 8, 160), M.glow, C.x, TOP - 0.09, C.z, false);
ledRing.rotation.x = Math.PI / 2;
const counterLight = new THREE.PointLight(0xffb070, 3, 4, 2);
counterLight.position.set(C.x, 0.25, C.z);
scene.add(counterLight);
mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 64), M.oak, C.x, TOP + 0.05, C.z);

// ---------- 홈 표면 셰이더 ----------
const GLSL = /* glsl */`
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*vnoise(p);p=m*p;a*=.5;}return v;}
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
float sandMask(vec2 p,float t){vec2 q=rot(p,1.7*length(p)-.5);return smoothstep(.44,.62,fbm(q*1.7+vec2(t*.015,0.))+.32*q.x);}
// 1 파도 2 이불 3 구름 4 이끼 5 달 그늘 물결
float field(vec2 p,int k,float t){
  if(k==1){vec2 q=rot(p,1.7*length(p)-.5);float s=sandMask(p,t);return mix(.22*fbm(q*5.+vec2(t*.12,-t*.07)),.55+.06*vnoise(p*150.)+.1*fbm(p*6.),s);}
  if(k==2){float f=sin(p.x*4.2+2.4*fbm(p*1.4+3.)+.9*sin(p.y*2.6));return .5+.38*f+.05*fbm(p*9.);}
  if(k==3){float c=fbm(p*2.1+vec2(0.,t*.012));return .12+.88*pow(smoothstep(.3,.8,c),.8)+.07*fbm(p*8.+t*.02);}
  if(k==4){float st=floor((p.y+1.)*1.6)/1.6;return .32*st+.42*fbm(p*3.)+.22*vnoise(p*36.);}
  if(k==5){return .5+.34*sin(p.x*3.2+5.*fbm(p*1.15+vec2(t*.035,0.)))*(.55+.45*fbm(p*2.));}
  return 0.;
}
float amp(int k){return k==1?.024:k==2?.05:k==3?.075:k==4?.05:k==5?.018:0.;}
float soft(int k){return k==1?.016:k==2?.035:k==3?.06:k==4?.022:k==5?.012:0.;}
`;

function surfaceMaterial(kind, fill) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uKind: { value: kind }, uFill: { value: fill },
      uHand: { value: new THREE.Vector2(9, 9) }, uPress: { value: 0 },
    },
    vertexShader: GLSL + /* glsl */`
      uniform float uTime,uFill,uPress;uniform int uKind;uniform vec2 uHand;
      varying vec2 vP;varying vec3 vW;varying float vH;
      void main(){
        vec2 p=uv*2.-1.;vP=p;
        float h=field(p,uKind,uTime);vH=h;
        vec2 d=p-uHand;float dent=uPress*soft(uKind)*exp(-dot(d,d)/.09);
        vec3 pos=position;pos.z+=uFill*h*amp(uKind)-dent;
        vec4 w=modelMatrix*vec4(pos,1.);vW=w.xyz;
        gl_Position=projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: GLSL + /* glsl */`
      uniform float uTime,uFill,uPress;uniform int uKind;uniform vec2 uHand;
      varying vec2 vP;varying vec3 vW;varying float vH;
      void main(){
        vec2 p=vP;float r=length(p);if(r>.985)discard;
        float t=uTime,h=vH;
        vec3 N=normalize(cross(dFdx(vW),dFdy(vW)));
        if(N.y<0.)N=-N;
        vec3 V=normalize(cameraPosition-vW);
        vec3 L=normalize(vec3(.25,1.,.45));
        vec3 col;float spec=.2,shin=12.;vec3 emi=vec3(0.);
        if(uKind==1){
          vec2 q=rot(p,1.7*r-.5);float s=sandMask(p,t);
          vec3 water=mix(vec3(.015,.05,.12),vec3(.1,.22,.38),fbm(q*5.+t*.1));
          vec3 sd=mix(vec3(.62,.44,.2),vec3(.9,.72,.42),.5*vnoise(p*170.)+.5*fbm(p*9.));
          col=mix(water,sd,s);spec=mix(1.6,.5,s);shin=mix(110.,30.,s);
          col+=step(.993,hash(floor(p*230.)))*vec3(1.,.82,.45)*(.6+s);
        }else if(uKind==2){
          col=mix(vec3(.55,.43,.31),vec3(.96,.9,.79),smoothstep(.1,.95,h));
          col*=.93+.07*sin(p.x*320.)*sin(p.y*320.);
          emi=vec3(.32,.2,.1)*(1.-h)*.5;spec=.12;shin=8.;
        }else if(uKind==3){
          col=mix(vec3(.5,.56,.7),vec3(1.,.98,.95),smoothstep(.15,.9,h));
          emi=vec3(.45,.3,.16)*smoothstep(.6,.1,h)*.6;spec=.18;shin=10.;
        }else if(uKind==4){
          col=mix(vec3(.05,.1,.04),vec3(.42,.52,.18),smoothstep(.2,1.,h)*(.6+.4*vnoise(p*48.)));
          spec=.55;shin=40.;
        }else if(uKind==5){
          col=mix(vec3(.03,.05,.09),vec3(.66,.72,.84),pow(clamp(h,0.,1.),1.6));spec=1.5;shin=70.;
        }
        vec3 empty=vec3(.86,.76,.62);
        float diff=max(dot(N,L),0.);
        vec3 Hh=normalize(L+V);float s=pow(max(dot(N,Hh),0.),shin)*spec;
        vec3 lit=col*(vec3(.22,.17,.13)+diff*vec3(1.05,.86,.66))+s*vec3(1.,.88,.7)+emi;
        vec3 off=empty*(.35+.25*diff)+vec3(.55,.36,.18)*(1.-r*r)*.9;
        vec3 c=mix(off,lit,uFill);
        c*=mix(.45,1.,smoothstep(1.,.78,r));
        gl_FragColor=vec4(c,1.);
      }`,
    extensions: { derivatives: true },
  });
}

const wells = [];
for (let i = 0; i < SEATS; i++) {
  const a = seatAng(i);
  const c = polar(a, R_WELL, TOP);
  const wall = mesh(new THREE.CylinderGeometry(WELL_R, WELL_R, TOP - BODY_TOP, 64, 1, true), M.wellWall, c.x, (TOP + BODY_TOP) / 2, c.z, false);
  wall.receiveShadow = true;
  const rim = mesh(new THREE.TorusGeometry(WELL_R + 0.004, 0.006, 8, 96), M.brass, c.x, TOP + 0.003, c.z, false);
  rim.rotation.x = Math.PI / 2;
  const seg = i === 0 ? (mobile ? 140 : 200) : 56;
  const kind = i === 0 ? 0 : [0, 3, 2, 1, 4, 5][i];
  const mat = surfaceMaterial(Math.max(kind, 1), i === 0 ? 0 : 1);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(WELL_R * 2, WELL_R * 2, seg, seg), mat);
  surf.rotation.x = -Math.PI / 2;
  surf.position.set(c.x, TOP - WELL_D + 0.01, c.z);
  scene.add(surf);
  const glow = { intensity: 0 };
  // 받침(도크)
  const da = a - 0.33, dp = polar(da, R_WELL + 0.14, TOP);
  mesh(new THREE.CylinderGeometry(0.06, 0.064, 0.03, 32), M.brass, dp.x, TOP + 0.015, dp.z);
  const dockGlow = mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.006, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.75, 0.45).multiplyScalar(i === 0 ? 0.25 : 1.8) }), dp.x, TOP + 0.033, dp.z, false);
  wells.push({ a, c, surf, mat, dock: dp, dockGlow, glow });
}
const hitDisc = new THREE.Mesh(new THREE.CircleGeometry(WELL_R, 48), new THREE.MeshBasicMaterial({ visible: false }));
hitDisc.rotation.x = -Math.PI / 2;
hitDisc.position.set(wells[0].c.x, TOP - 0.03, wells[0].c.z);
scene.add(hitDisc);

// 의자
for (let i = 0; i < SEATS; i++) {
  const p = polar(seatAng(i), 2.45, 0.34);
  mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.68, 40), M.oak, p.x, 0.34, p.z);
}

// 위에서 내리는 빛
const spot = new THREE.SpotLight(0xffc48a, 20, 9, 0.8, 0.85, 2);
spot.position.set(C.x, ROOM.h - 0.05, C.z + 0.3);
spot.target.position.copy(C);
spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024);
spot.shadow.bias = -0.0004;
scene.add(spot, spot.target);
scene.add(new THREE.HemisphereLight(0x4a3a2c, 0x120c08, 0.6));
// 천장에서 내려온 작은 등 (창밖에서도 가게 안이 따뜻하게 보이도록)
for (const [x, z] of [[-1.6, 0.2], [-2.6, -2.2], [1.7, -2.6], [2.6, 0.6]]) {
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 6), M.dark, x, ROOM.h - 0.45, z, false);
  mesh(new THREE.SphereGeometry(0.07, 20, 12), M.glow, x, ROOM.h - 0.95, z, false);
}
const pend = new THREE.PointLight(0xffb070, 5, 5, 2);
pend.position.set(-2.1, ROOM.h - 1.0, -0.8);
scene.add(pend);

// ---------- 병 선반 ----------
const SH = { cols: 20, rows: 7, x0: -4, cw: 0.4, y0: 0.45, rh: 0.38, z: ROOM.z0 + 0.16, d: 0.3 };
const shelfBack = canvasTex(1024, 360, (g, w, h) => {
  g.fillStyle = '#1a120c'; g.fillRect(0, 0, w, h);
  const cw = w / SH.cols, rh = h / SH.rows;
  for (let c = 0; c < SH.cols; c++) for (let r = 0; r < SH.rows; r++) {
    const x = c * cw + cw / 2, y = r * rh + rh * 0.62;
    const gr = g.createRadialGradient(x, y, 1, x, y, cw * 0.62);
    const k = 0.55 + Math.random() * 0.45;
    gr.addColorStop(0, `rgba(255,190,120,${k})`); gr.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = gr; g.fillRect(c * cw, r * rh, cw, rh);
  }
});
const backMat = new THREE.MeshBasicMaterial({ map: shelfBack, color: new THREE.Color(1.15, 1.0, 0.9) });
mesh(new THREE.PlaneGeometry(SH.cols * SH.cw, SH.rows * SH.rh), backMat, 0, SH.y0 + (SH.rows * SH.rh) / 2, ROOM.z0 + 0.01, false);
for (let r = 0; r <= SH.rows; r++) mesh(new THREE.BoxGeometry(SH.cols * SH.cw + 0.03, 0.026, SH.d), M.oak, 0, SH.y0 + r * SH.rh, SH.z, false);
for (let c = 0; c <= SH.cols; c++) mesh(new THREE.BoxGeometry(0.026, SH.rows * SH.rh, SH.d), M.oak, SH.x0 + c * SH.cw, SH.y0 + (SH.rows * SH.rh) / 2, SH.z, false);
mesh(new THREE.BoxGeometry(SH.cols * SH.cw + 0.03, SH.y0, SH.d + 0.04), M.oakDark, 0, SH.y0 / 2, SH.z, false);

// 병 모양: 둥근 바닥 모서리, 곧은 몸통, 좁아지는 어깨와 짧은 입술 (단면을 돌려 만든 LatheGeometry)
const JR = 0.075, JH = 0.2, R_IN = 0.066;
const jarPts = [new THREE.Vector2(0.0001, 0.002)];
for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); jarPts.push(new THREE.Vector2(JR - 0.014 + Math.cos(a) * 0.014, 0.014 + Math.sin(a) * 0.014)); }
for (let i = 1; i <= 8; i++) { const t = i / 8; jarPts.push(new THREE.Vector2(JR * (1 - 0.13 * t * t), JH * (0.8 + 0.12 * t))); }
jarPts.push(new THREE.Vector2(JR * 0.9, JH * 0.935), new THREE.Vector2(JR * 0.9, JH), new THREE.Vector2(JR * 0.85, JH));
const jarGeo = new THREE.LatheGeometry(jarPts, 40);
const corkTex = canvasTex(128, 128, speckle('#9b7a55', 2600));
const corkMat = new THREE.MeshStandardMaterial({ map: corkTex, bumpMap: corkTex, bumpScale: 0.002, roughness: 0.95 });
const corkGeo = new THREE.CylinderGeometry(0.066, 0.061, 0.042, 32);
const twineMat = new THREE.MeshStandardMaterial({ color: 0xb08a5c, roughness: 1 });
const twineGeo = new THREE.TorusGeometry(JR * 0.9 + 0.0015, 0.0016, 6, 48);
// 크라프트지 꼬리표: 위 두 모서리를 자른 모양
const TW = 0.044, TH = 0.064;
const tagGeo = (() => {
  const s = new THREE.Shape(), c = 0.01;
  s.moveTo(-TW / 2, 0); s.lineTo(TW / 2, 0); s.lineTo(TW / 2, TH - c); s.lineTo(TW / 2 - c, TH); s.lineTo(-TW / 2 + c, TH); s.lineTo(-TW / 2, TH - c); s.closePath();
  const g = new THREE.ShapeGeometry(s);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + TW / 2) / TW, p.getY(i) / TH);
  g.translate(0, -TH, 0);
  return g;
})();
function tagTex(no, lines) {
  const c = document.createElement('canvas'); c.width = 220; c.height = 320;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const draw = () => {
    const g = c.getContext('2d');
    speckle('#a9825a', 1800)(g, 220, 320);
    g.fillStyle = '#1a120c'; g.beginPath(); g.arc(110, 40, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1d12';
    if (no) {
      g.font = '500 30px "Cormorant Garamond", serif'; g.fillText('No. ' + no, 26, 112);
      g.font = '600 25px "Noto Serif KR", serif'; lines.forEach((l, i) => g.fillText(l, 26, 162 + i * 36));
      g.fillRect(26, 162 + lines.length * 36 - 8, 168, 1.5);
    } else {
      // 선반 병: 손글씨 같은 짧은 줄 몇 개
      g.strokeStyle = 'rgba(42,29,18,.75)'; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) { g.beginPath(); let x = 30; g.moveTo(x, 120 + i * 44); while (x < 150 + Math.random() * 40) { x += 10; g.lineTo(x, 120 + i * 44 + Math.sin(x * 0.4) * 4); } g.stroke(); }
    }
    t.needsUpdate = true;
  };
  draw();
  if (no && document.fonts) Promise.all([document.fonts.load('600 25px "Noto Serif KR"'), document.fonts.load('500 30px "Cormorant Garamond"')]).then(draw, () => {});
  return t;
}
// 두 점을 잇는 가는 끈
function strand(a, b, mat) {
  const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, d.length(), 4), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

const nJar = SH.cols * SH.rows;
const CONTENT = [0xd9c39a, 0x5f7a3c, 0xf0ece4, 0x5d7ea8, 0xb5653a, 0xc99a4a, 0x3b3632, 0xd9a5a0, 0xaab4c4];
const fillGeo = new THREE.CylinderGeometry(R_IN, R_IN, 0.12, 24);
const fillMat = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.2 });
const glassI = new THREE.InstancedMesh(jarGeo, M.glass, nJar);
const fillI = new THREE.InstancedMesh(fillGeo, fillMat, nJar);
const corkI = new THREE.InstancedMesh(corkGeo, corkMat, nJar);
const twineI = new THREE.InstancedMesh(twineGeo, twineMat, nJar);
const tagI = new THREE.InstancedMesh(tagGeo, new THREE.MeshStandardMaterial({ map: tagTex(), roughness: 0.95, side: THREE.DoubleSide }), nJar);
const cellPos = [];
const tmp = new THREE.Object3D(), col = new THREE.Color();
for (let c = 0, i = 0; c < SH.cols; c++) for (let r = 0; r < SH.rows; r++, i++) {
  const x = SH.x0 + c * SH.cw + SH.cw / 2, y = SH.y0 + r * SH.rh + 0.013;
  const rnd = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  cellPos.push(new THREE.Vector3(x, y, SH.z));
  tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 1, 1);
  tmp.position.set(x, y, SH.z); tmp.updateMatrix(); glassI.setMatrixAt(i, tmp.matrix);
  const s = 0.5 + rnd(1) * 0.75;
  tmp.position.set(x, y + 0.006 + 0.06 * s, SH.z); tmp.scale.set(1, s, 1); tmp.updateMatrix(); fillI.setMatrixAt(i, tmp.matrix);
  tmp.scale.set(1, 1, 1);
  tmp.position.set(x, y + 0.212, SH.z); tmp.updateMatrix(); corkI.setMatrixAt(i, tmp.matrix);
  tmp.position.set(x, y + 0.186, SH.z); tmp.rotation.set(Math.PI / 2, 0, 0); tmp.updateMatrix(); twineI.setMatrixAt(i, tmp.matrix);
  tmp.position.set(x + (rnd(2) - 0.5) * 0.04, y + 0.17, SH.z + JR + 0.006); tmp.rotation.set(0, (rnd(3) - 0.5) * 0.5, (rnd(4) - 0.5) * 0.4); tmp.updateMatrix(); tagI.setMatrixAt(i, tmp.matrix);
  fillI.setColorAt(i, col.set(CONTENT[(c * 7 + r * 3 + (c * r) % 5) % CONTENT.length]));
}
scene.add(glassI, fillI, corkI, twineI, tagI);
for (const x of [-2, 2]) {
  const l = new THREE.PointLight(0xffb070, 3, 3.6, 2);
  l.position.set(x, 1.9, ROOM.z0 + 1.1);
  scene.add(l);
}

// ---------- 촉감 병 다섯 개: 병마다 내용물을 따로 만듦 ----------
export const KINDS = [
  null,
  { id: 1, no: '07', tag: ['어느 7월의 밤,', '파도가 다녀간 자리'], name: '어느 7월의 밤, 파도가 다녀간 자리', sense: '따뜻한 모래알 사이로 천천히 스며드는 서늘한 물결', fill: [0xc9a25c, 0x1f3b63] },
  { id: 2, no: '09', tag: ['네가 잠든 쪽의', '이불'], name: '네가 잠든 쪽의 이불', sense: '남아 있는 온기와 손바닥을 천천히 덮는 부드러운 무게', fill: [0xefe4d0, 0xe6d7bd] },
  { id: 3, no: '13', tag: ['아직 아무도', '밟지 않은 구름'], name: '아직 아무도 밟지 않은 구름', sense: '손을 깊이 받아주다가 아주 느리게 밀어 올리는 폭신함', fill: [0xf6f4f2, 0xdfe6f2] },
  { id: 4, no: '03', tag: ['비가 그친 뒤의', '이끼 계단'], name: '비가 그친 뒤의 이끼 계단', sense: '서늘하고 촉촉한 표면, 누르면 부드럽게 되돌아오는 탄성', fill: [0x4f6a2e, 0x7d8f45] },
  { id: 5, no: '14', tag: ['달의 그늘에', '고인 물결'], name: '달의 그늘에 고인 물결', sense: '차가운 비단 같은 표면 아래에서 낮게 번지는 파동', fill: [0x9aa8bd, 0x1d2737] },
];
// 고르는 병은 빛이 굴절되는 유리 (선반 병보다 무거운 재질이라 다섯 개에만 씀)
const glassPick = new THREE.MeshPhysicalMaterial({ color: 0xfffaf2, roughness: 0.04, transmission: 1, thickness: 0.006, ior: 1.48, envMapIntensity: 1.1, clearcoat: 0.6, clearcoatRoughness: 0.08 });
// 내용물 재질: 스스로 조금 밝아지는 빛(emissive)을 같은 색으로 둠
function cm(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.9, emissive: new THREE.Color(color).multiplyScalar(0.12), ...o }); }
// 위에서 본 표면: 링으로 나눈 원판을 h(x, z)만큼 들어 올림
function surface(r, y, h, mat) {
  const g = new THREE.RingGeometry(0.0004, r, 48, 18), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = -p.getY(i); p.setXYZ(i, x, h(x, z), z); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.position.y = y; return m;
}
// 옆면 기둥: top(x, z)를 주면 윗가장자리가 그 높이만큼 오르내림 (모래 언덕, 물 경계)
function column(r, y, hgt, mat, top) {
  const g = new THREE.CylinderGeometry(r, r, hgt, 48, 6, true);
  if (top) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (p.getY(i) + hgt / 2) / hgt; p.setY(i, p.getY(i) + k * top(p.getX(i), p.getZ(i))); }
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, mat); m.position.y = y + hgt / 2; return m;
}
// 병 안쪽 가장자리를 따라 도는 가는 고리 (물거품, 수면 띠)
function rim(r, y, tube, mat) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 64), mat); m.rotation.x = Math.PI / 2; m.position.y = y; return m; }
// 울퉁불퉁한 덩어리 (구름, 돌): 정이십면체를 사인 합으로 부풀림
// 정이십면체는 면마다 꼭짓점이 따로라, 겹친 꼭짓점을 합쳐야 매끈하게 보임
const ball = (d) => { const g = new THREE.IcosahedronGeometry(1, d); g.deleteAttribute('normal'); return mergeVertices(g); };
function lump(r, sq, seed, mat, amp = 0.14, wall = 0) {
  const g = ball(3), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + amp * Math.sin(v.x * 5 + seed) * Math.sin(v.y * 6 + seed * 1.7) * Math.sin(v.z * 4 + seed * 0.6) + amp * 0.5 * Math.sin(v.x * 11 + v.z * 9 + seed);
    let x = v.x * k * r, z = v.z * k * r;
    // wall을 주면 유리벽에 눌린 것처럼 바깥쪽을 평평하게 자름
    const d = Math.hypot(x, z); if (wall && d > wall) { x *= wall / d; z *= wall / d; }
    p.setXYZ(i, x, v.y * k * r * sq, z);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
// 천: 한 방향으로 흐르는 주름을 겹쳐 구겨진 이불처럼, 유리벽에 닿은 쪽은 눌려 평평함
function cloth(r, sq, seed, mat) {
  const g = ball(4), p = g.attributes.position, v = new THREE.Vector3(), wall = R_IN - 0.002;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + 0.07 * Math.sin(v.y * 6 + v.x * 4 + seed) + 0.04 * Math.sin(v.x * 10 - v.z * 7 + seed * 2) + 0.015 * Math.sin(v.z * 18 + v.y * 9 + seed * 3);
    let x = v.x * k * r, z = v.z * k * r;
    const d = Math.hypot(x, z); if (d > wall) { x *= wall / d; z *= wall / d; }
    p.setXYZ(i, x, v.y * k * r * sq, z);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
const sandTex = canvasTex(256, 256, speckle('#c9a568', 9000));
const knitTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#efe4d0'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,96,66,.28)'; g.lineWidth = 2; for (let x = 0; x < w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } }, [3, 2]);
const mossTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3f5a22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { g.fillStyle = `hsla(${80 + Math.random() * 30},${40 + Math.random() * 30}%,${18 + Math.random() * 30}%,.8)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
const waveTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#18304f'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(232,196,120,.85)';
  for (let i = 0; i < 26; i++) { g.lineWidth = 0.6 + Math.random() * 2.2; g.beginPath(); for (let a = 0; a < 5.5; a += 0.1) { const rr = 8 + a * 18 + i * 1.6; g.lineTo(128 + Math.cos(a + i * 0.22) * rr, 128 + Math.sin(a + i * 0.22) * rr * 0.8); } g.stroke(); }
});
// 물기둥 옆면: 아래는 깊고 어둡게, 수면 가까이는 밝게 (v = 0 아래, 1 위)
const depthTex = (deep, mid, top, lines) => canvasTex(64, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, deep); gr.addColorStop(0.7, mid); gr.addColorStop(1, top);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = lines; g.lineWidth = 1;
  for (let i = 0; i < 9; i++) { const y = 6 + i * i * 2.4; g.globalAlpha = 0.5 - i * 0.05; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin(x * 0.2 + i) * 1.5); g.stroke(); }
  g.globalAlpha = 1;
});
const waveSideTex = depthTex('#0f1f38', '#22456f', '#5d86ae', 'rgba(236,206,140,.7)');
const moonSideTex = depthTex('#0b111c', '#1c2840', '#8796ad', 'rgba(220,228,240,.6)');
// 달 그늘 수면: 한쪽에서 번져 나가는 은빛 물결 자국
const moonTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#16202f'; g.fillRect(0, 0, w, h);
  for (let i = 1; i < 14; i++) { g.strokeStyle = `rgba(214,224,240,${0.55 - i * 0.035})`; g.lineWidth = 1.4; g.beginPath(); g.ellipse(150, 110, i * 12, i * 10, 0.3, 0, Math.PI * 2); g.stroke(); }
});
const soilTex = canvasTex(128, 128, speckle('#2e2016', 3000));
const BUILD = [
  null,
  // 1 파도: 모래 언덕 위로 금빛 물결이 도는 바닷물, 유리벽을 따라 흰 거품
  (mats) => {
    const sand = cm(0xd2ae72, { map: sandTex, bumpMap: sandTex, bumpScale: 0.002, roughness: 1 });
    const side = cm(0x2a4a78, { map: waveSideTex, roughness: 0.15, metalness: 0.1 });
    const water = cm(0x2a4a78, { map: waveTex, roughness: 0.1, metalness: 0.15 });
    const foam = cm(0xf3ede2, { roughness: 1, emissive: new THREE.Color(0xf3ede2).multiplyScalar(0.2) });
    mats.push(sand, side, water, foam);
    const dune = (x, z) => 0.011 * Math.sin(x * 38 + 0.6) + 0.006 * Math.sin(z * 52 + 1.1) + 0.0015 * Math.sin(Math.hypot(x, z) * 520);
    const sea = (x, z) => 0.0016 * Math.sin(x * 140 + z * 60) + 0.001 * Math.sin(z * 210);
    return [column(R_IN, 0.004, 0.06, sand, dune), surface(R_IN, 0.064, dune, sand),
      column(R_IN - 0.0006, 0.004, 0.118, side, sea), surface(R_IN - 0.0006, 0.122, sea, water), rim(R_IN - 0.0025, 0.123, 0.0022, foam)];
  },
  // 2 이불: 구겨 넣은 천 세 덩이
  (mats) => {
    const fab = cm(0xefe4d0, { map: knitTex, bumpMap: knitTex, bumpScale: 0.0015, roughness: 1 });
    mats.push(fab);
    return [[0, 0.036, 0, 0.066, 0.52, 0.4], [0.004, 0.083, -0.004, 0.062, 0.48, 2.1], [-0.005, 0.124, 0.004, 0.052, 0.55, 4.2]]
      .map(([x, y, z, r, sq, sd]) => { const m = cloth(r, sq, sd, fab); m.position.set(x, y, z); m.rotation.y = sd; return m; });
  },
  // 3 구름: 부푼 덩어리 열 개
  (mats) => {
    const puff = cm(0xf4f2ee, { roughness: 1, emissive: new THREE.Color(0xd8e0ee).multiplyScalar(0.16) });
    mats.push(puff);
    const P = [[0, 0.04, 0, 0.036], [0.028, 0.032, 0.02, 0.028], [-0.03, 0.035, -0.014, 0.03], [0.012, 0.035, -0.03, 0.027], [-0.012, 0.03, 0.03, 0.026], [0.014, 0.085, 0.006, 0.033], [-0.022, 0.08, 0.016, 0.028], [0.028, 0.078, -0.018, 0.025], [-0.008, 0.12, -0.01, 0.028], [0.02, 0.122, 0.014, 0.022]];
    return P.map(([x, y, z, r], i) => { const m = lump(r, 0.85, i * 1.9, puff, 0.1); m.position.set(x, y, z); return m; });
  },
  // 4 이끼: 흙 위로 이끼 언덕, 그 위에 이끼 낀 돌과 맨돌
  (mats) => {
    const soil = cm(0x2e2016, { map: soilTex, roughness: 1 }), moss = cm(0x4f6a2e, { map: mossTex, bumpMap: mossTex, bumpScale: 0.003, roughness: 1 }), rock = cm(0x6d665c, { map: stoneTex, roughness: 0.8 });
    mats.push(soil, moss, rock);
    const bed = (x, z) => 0.004 * Math.sin(x * 60) * Math.sin(z * 50);
    const mound = lump(0.064, 0.34, 0.7, moss, 0.18, R_IN - 0.001); mound.position.y = 0.042;
    const S = [[0.016, 0.07, 0.008, 0.026, moss], [-0.022, 0.064, -0.014, 0.022, moss], [-0.016, 0.06, 0.026, 0.016, rock], [0.03, 0.058, -0.026, 0.014, rock], [0.004, 0.09, -0.006, 0.014, rock]];
    return [column(R_IN, 0.004, 0.03, soil, bed), surface(R_IN, 0.034, bed, soil), mound, ...S.map(([x, y, z, r, m], i) => { const o = lump(r, 0.62, i * 2.3 + 1, m, 0.16); o.position.set(x, y, z); return o; })];
  },
  // 5 달 그늘 물결: 아래로 갈수록 어두운 물, 은빛 자국이 번지는 수면과 수면 띠
  (mats) => {
    const side = cm(0x1d2737, { map: moonSideTex, roughness: 0.12, metalness: 0.3, emissive: new THREE.Color(0x9aa8bd).multiplyScalar(0.06) });
    const top = cm(0x1d2737, { map: moonTex, roughness: 0.06, metalness: 0.4, emissive: new THREE.Color(0x9aa8bd).multiplyScalar(0.1) });
    const edge = cm(0xc9d3e2, { roughness: 0.3, metalness: 0.5, emissive: new THREE.Color(0xc9d3e2).multiplyScalar(0.18) });
    mats.push(side, top, edge);
    const ripple = (x, z) => 0.0014 * Math.sin(Math.hypot(x - 0.012, z + 0.01) * 420);
    return [column(R_IN, 0.004, 0.118, side, ripple), surface(R_IN, 0.122, ripple, top), rim(R_IN - 0.0015, 0.1225, 0.0012, edge)];
  },
];
// 눈높이 칸에 나란히 놓음 (열 8~12, 아래에서 넷째 줄)
const PICK_ROW = 3;
const jars = [null];
for (let k = 1; k <= 5; k++) {
  const K = KINDS[k];
  const g = new THREE.Group();
  const gl = new THREE.Mesh(jarGeo, glassPick);
  const mats = [];
  const inner = new THREE.Group(); inner.add(...BUILD[k](mats));
  const ck = new THREE.Mesh(corkGeo, corkMat); ck.position.y = 0.212;
  const tw = [0.184, 0.189].map((y) => { const m = new THREE.Mesh(twineGeo, twineMat); m.position.y = y; m.rotation.x = Math.PI / 2; return m; });
  // 목에 감은 끈에서 내려온 꼬리표
  const tagMat = new THREE.MeshStandardMaterial({ map: tagTex(K.no, K.tag), roughness: 0.95, side: THREE.DoubleSide });
  const tag = new THREE.Mesh(tagGeo, tagMat);
  tag.position.set(0.024, 0.152, JR + 0.008); tag.rotation.set(0, 0.18, -0.08);
  const str = strand(new THREE.Vector3(0.03, 0.186, JR * 0.9), new THREE.Vector3(0.024, 0.152, JR + 0.008), twineMat);
  g.add(gl, inner, ck, ...tw, tag, str);
  g.traverse((o) => { o.userData.kind = k; o.castShadow = o !== gl; });
  const cell = (8 + k - 1) * SH.rows + PICK_ROW;
  hideCell(cell);
  const home = cellPos[cell].clone().setZ(SH.z);
  g.position.copy(home);
  scene.add(g);
  // 빛 대신 내용물이 스스로 밝아짐 (조명 수를 줄여 가볍게)
  const light = { set intensity(v) { mats.forEach((m) => { m.emissiveIntensity = 1 + v * 2.2; }); } };
  jars.push({ g, home, light, lift: 0 });
}
function hideCell(i) {
  [glassI, fillI, corkI, twineI, tagI].forEach((m) => { m.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); m.instanceMatrix.needsUpdate = true; });
}
let kind = 1;
// 고를 수 있는 다섯 칸 앞에 빛 띠를 둠
{
  const y = SH.y0 + PICK_ROW * SH.rh + 0.004;
  const x = (jars[1].home.x + jars[5].home.x) / 2;
  mesh(new THREE.BoxGeometry(5 * SH.cw - 0.03, 0.008, 0.012), M.glow, x, y, SH.z + SH.d / 2 + 0.004, false);
}

// 인식할 때 병을 따라 올라가는 빛 띠
const scanMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.55).multiplyScalar(2.4), transparent: true, opacity: 0 });
const scan = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.003, 6, 48), scanMat);
scan.rotation.x = Math.PI / 2;
scene.add(scan);

// ---------- 카메라 자리 ----------
const W0 = wells[0];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const dockTop = () => W0.dock.clone().setY(TOP + 0.036);
const pickMid = jars[3].home;
const POSE = {
  hero: { p: V(0.6, 1.5, 10.5), t: V(-1.0, 1.75, 3.6) },
  front: { p: V(1.25, 1.6, 7.2), t: V(0.9, 1.45, 3.5) },
  hall: { p: V(1.1, 1.72, 2.9), t: V(-0.8, 1.05, -1.6) },
  shelf: { p: V(pickMid.x - 0.35, 1.7, ROOM.z0 + 2.7), t: V(pickMid.x - 0.35, pickMid.y + 0.05, ROOM.z0) },
  seat: { p: V(W0.c.x + 0.1, 1.8, W0.c.z + 1.2), t: V(W0.c.x - 0.02, TOP - 0.05, W0.c.z + 0.1) },
  // 넓은 화면에서는 왼쪽 안내판을 피해 홈을 오른쪽으로 비켜 놓음
  get touch() { const k = camera.aspect > 1 ? 1 : 0; return { p: V(W0.c.x - 0.1 * k, 1.58, W0.c.z + 0.6), t: V(W0.c.x - 0.17 * k, TOP - 0.1, W0.c.z) }; },
  swap: { p: V(W0.c.x + 0.05, 1.85, W0.c.z + 1.3), t: V(W0.c.x - 0.05, TOP - 0.05, W0.c.z + 0.12) },
};

const cam = { p: POSE.hero.p.clone(), t: POSE.hero.t.clone() };
const pointer = { x: 0, y: 0 };
addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });

// ---------- 시간에 따른 움직임 ----------
const io = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
let tweens = [];
function tween(dur, fn, ease = io) {
  return new Promise((res) => tweens.push({ t: 0, dur, fn, ease, res }));
}
function stopTweens() { tweens.forEach((tw) => tw.res()); tweens = []; }
function camTo(pose, dur = 1.6) {
  const p0 = cam.p.clone(), t0 = cam.t.clone();
  return tween(dur, (k) => { cam.p.lerpVectors(p0, pose.p, k); cam.t.lerpVectors(t0, pose.t, k); });
}
const lerp = (a, b, k) => a + (b - a) * k;
function setDoor(k) { door.rotation.y = 1.35 * k; }
function fly(obj, to, dur, arc) {
  const a = obj.position.clone(), b = to.clone();
  const m = a.clone().lerp(b, 0.5); m.y = Math.max(a.y, b.y) + arc;
  return tween(dur, (k) => {
    const u = 1 - k;
    obj.position.set(u * u * a.x + 2 * u * k * m.x + k * k * b.x, u * u * a.y + 2 * u * k * m.y + k * k * b.y, u * u * a.z + 2 * u * k * m.z + k * k * b.z);
  });
}
function setDock(f) {
  W0.dockGlow.material.color.setRGB(1, 0.75, 0.45).multiplyScalar(0.25 + 1.6 * f);
  W0.glow.intensity = 0.35 + 0.6 * f;
}
function wellFill(target, dur) {
  const f0 = W0.mat.uniforms.uFill.value;
  return tween(dur, (k) => { W0.mat.uniforms.uFill.value = lerp(f0, target, k); });
}
function recognize() {
  W0.mat.uniforms.uKind.value = kind;
  const base = dockTop();
  onStep(step, 'scan');
  return tween(1.3, (k) => {
    scan.position.set(base.x, base.y + 0.01 + k * 0.23, base.z);
    scanMat.opacity = Math.sin(k * Math.PI);
    setDock(k);
    jars[kind].light.intensity = 0.15 + 0.5 * k;
  }).then(() => { scanMat.opacity = 0; onStep(step, 'known'); });
}
// 상태를 애니메이션 없이 맞춤 (뒤로 가거나 건너뛸 때)
function settle(n) {
  setDoor(n >= 1 ? 1 : 0);
  for (let k = 1; k <= 5; k++) { jars[k].g.position.copy(jars[k].home); jars[k].light.intensity = 0; }
  if (n >= 3) jars[kind].g.position.copy(dockTop());
  W0.mat.uniforms.uKind.value = kind;
  W0.mat.uniforms.uFill.value = n >= 4 ? 1 : 0;
  setDock(n >= 4 ? 1 : 0);
  if (n >= 4) jars[kind].light.intensity = 0.65;
  scanMat.opacity = 0;
}

// ---------- 둘러보기 단계 ----------
export const STEPS = [
  { t: '가게 앞', d: '골목 끝, 불 켜진 작은 가게. 간판에는 소문자 mori.' },
  { t: '문을 열고 들어감', d: '둥근 카운터와 벽을 채운 촉감 병들. 자리마다 기계 하나: 병을 올리는 받침과 손이 들어가는 둥근 홈.' },
  { t: '선반에서 병 고르기', d: '병마다 다른 촉감. 마음이 가는 병을 하나 골라 꺼내기.' },
  { t: '기계에 병 올리기', d: '고른 병을 자리 옆 받침에 올림.' },
  { t: '기계가 병을 알아봄', d: '받침이 병을 읽고, 홈이 그 병의 촉감으로 천천히 차오름.' },
  { t: '손을 넣어 느끼기', d: '홈 위를 누른 채 움직여 보기. 손이 닿은 자리가 눌리고 천천히 돌아옴.' },
  { t: '다른 병으로 바꿔 보기', d: '병을 바꾸면 기계가 새 병을 알아보고, 같은 홈이 다른 촉감이 됨.' },
];
let step = -1, active = false, mode = 'hero';
let touchOn = false, pickOn = false, busy = false;

async function enter(n, dir) {
  stopTweens();
  const from = step;
  step = n;
  busy = false;
  pickOn = n === 2;
  touchOn = n === 5 || n === 6;
  canvas.classList.toggle('touch', touchOn || pickOn);
  onStep(n);
  const fwd = dir > 0 && n === from + 1;
  const P = [POSE.front, POSE.hall, POSE.shelf, POSE.seat, POSE.seat, POSE.touch, POSE.swap][n];
  if (!fwd) { settle(n); return camTo(P, 1.4); }
  if (n === 1) { camTo(POSE.front, 0.8); await tween(1.2, setDoor); return camTo(POSE.hall, 2.2); }
  if (n === 3) {
    const J = jars[kind];
    J.light.intensity = 0.5;
    await fly(J.g, J.home.clone().add(V(0, 0.05, 0.4)), 0.8, 0.02);
    camTo(POSE.seat, 2.4);
    return fly(J.g, dockTop(), 2.2, 0.5);
  }
  if (n === 4) { await recognize(); return wellFill(1, 2.4); }
  return camTo(P, 1.6);
}

let onStep = () => {}, onHover = () => {};
export function bind(cb, hoverCb) { onStep = cb; if (hoverCb) onHover = hoverCb; }
export function go(n) {
  n = Math.max(0, Math.min(STEPS.length - 1, n));
  if (n !== step) enter(n, n - step);
}
export const getStep = () => step;
export const getKind = () => kind;
// 선반에서 고르기 (2단계)
export function pick(k) {
  if (step !== 2) return;
  kind = k;
  go(3);
}
// 다른 병으로 바꾸기 (6단계)
export async function swap(k) {
  if (step !== 6 || busy || k === kind) return;
  busy = true;
  const old = jars[kind], J = jars[k];
  wellFill(0, 1.0);
  old.light.intensity = 0;
  setDock(0);
  await fly(old.g, old.home, 1.4, 0.6);
  kind = k;
  J.light.intensity = 0.4;
  await fly(J.g, dockTop(), 1.6, 0.6);
  await recognize();
  await wellFill(1, 2.0);
  busy = false;
}
export function setMode(m) {
  if (m === mode) return;
  mode = m;
  if (m === 'hero') { stopTweens(); step = -1; settle(-1); cam.p.copy(POSE.hero.p); cam.t.copy(POSE.hero.t); canvas.classList.remove('touch'); }
  if (m === 'tour' && step < 0) enter(0, 0);
}
export function setActive(a) { active = a; }

// ---------- 포인터: 병 고르기와 홈 누르기 ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const hand = { on: false, p: new THREE.Vector2(9, 9), amt: 0 };
const handLight = { intensity: 0, position: new THREE.Vector3() };
const jarMeshes = [];
jars.slice(1).forEach((j) => j.g.traverse((o) => { if (o.isMesh) jarMeshes.push(o); }));
let hoverKind = 0;
function aim(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
function handAt(e) {
  aim(e);
  const h = ray.intersectObject(hitDisc)[0];
  if (!h) return false;
  hand.p.set((h.point.x - W0.c.x) / WELL_R, -(h.point.z - W0.c.z) / WELL_R);
  handLight.position.set(h.point.x, TOP + 0.12, h.point.z);
  return true;
}
function hoverAt(e) {
  aim(e);
  const h = ray.intersectObjects(jarMeshes)[0];
  const k = h ? h.object.userData.kind : 0;
  if (k !== hoverKind) { hoverKind = k; canvas.style.cursor = k ? 'pointer' : ''; }
  onHover(k, e.clientX, e.clientY);
}
canvas.addEventListener('pointerdown', (e) => {
  if (pickOn) { hoverAt(e); if (hoverKind) pick(hoverKind); return; }
  if (touchOn && !busy && handAt(e)) { hand.on = true; canvas.setPointerCapture(e.pointerId); onStep(step, 'press'); }
});
canvas.addEventListener('pointermove', (e) => {
  if (pickOn) hoverAt(e);
  else if (touchOn && hand.on) handAt(e);
});
const release = () => { hand.on = false; };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

// ---------- 그리기 ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 58 : 40;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let time = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!active) return;
  update(dt);
  composer.render();
}
// 점검용: 화면이 가려져 프레임이 멈춰 있을 때 시간을 직접 흘려 봄
window.__moriDbg = () => ({ well: ((v) => [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)])(W0.c.clone().setY(TOP - 0.1).project(camera)), fill: W0.mat.uniforms.uFill.value, kind: W0.mat.uniforms.uKind.value, tweens: tweens.length, step, mode, active });
window.__moriTick = (sec) => { for (let t = 0; t < sec; t += 0.05) update(0.05); composer.render(); return camera.position.toArray().map((v) => +v.toFixed(2)); };
window.__moriLook = (p, t) => { cam.p.set(...p); cam.t.set(...t); camera.position.copy(cam.p); camera.lookAt(cam.t); composer.render(); };
function update(dt) {
  time += dt;
  for (const tw of tweens.slice()) {
    tw.t += dt;
    const k = Math.min(tw.t / tw.dur, 1);
    tw.fn(tw.ease(k));
    if (k >= 1) { tweens.splice(tweens.indexOf(tw), 1); tw.res(); }
  }
  // 고르는 중에는 손을 댄 병이 살짝 앞으로 나옴
  for (let k = 1; k <= 5; k++) {
    const J = jars[k], want = pickOn && hoverKind === k ? 1 : 0;
    const d = (want - J.lift) * Math.min(1, dt * 8);
    if (Math.abs(d) > 1e-5 && step === 2) { J.lift += d; J.g.position.z = J.home.z + J.lift * 0.08; J.light.intensity = J.lift * 0.5; }
  }
  hand.amt += ((hand.on ? 1 : 0) - hand.amt) * Math.min(1, dt * (hand.on ? 7 : 1.6));
  W0.mat.uniforms.uHand.value.copy(hand.p);
  W0.mat.uniforms.uPress.value = hand.amt;
  handLight.intensity = hand.amt * 0.5;
  for (const w of wells) w.mat.uniforms.uTime.value = time;
  const sway = mode === 'hero' ? 0.45 : touchOn || pickOn ? 0.03 : 0.12;
  const drift = mode === 'hero' ? Math.sin(time * 0.12) * 0.25 : 0;
  camera.position.copy(cam.p).add(V(pointer.x * sway + drift, -pointer.y * sway * 0.4, 0));
  camera.lookAt(cam.t);
}
frame();
