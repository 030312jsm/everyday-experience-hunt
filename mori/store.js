// mori 가게 3D 장면: 첫 화면의 가게 앞 + 05장의 가게 안 둘러보기
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
  glass: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.04, envMapIntensity: 1.4, depthWrite: false }),
  cork: new THREE.MeshStandardMaterial({ color: 0x9b7a55, roughness: 0.9 }),
  street: new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.28, metalness: 0.3, envMapIntensity: 0.25 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 0.9 }),
  glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.42).multiplyScalar(2.2) }),
  paper: new THREE.MeshStandardMaterial({ color: 0xefe6d6, roughness: 0.9 }),
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

const CONTENT = {
  sand: 0xd9c39a, moss: 0x5f7a3c, cotton: 0xf0ece4, blue: 0x5d7ea8, rust: 0xb5653a,
  amber: 0xc99a4a, char: 0x3b3632, rose: 0xd9a5a0, silver: 0xaab4c4,
};
const palette = Object.values(CONTENT);
const nJar = SH.cols * SH.rows;
const jarGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.2, 20);
const fillGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.12, 20);
const corkGeo = new THREE.CylinderGeometry(0.062, 0.058, 0.04, 16);
const fillMat = new THREE.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.2 });
const glassI = new THREE.InstancedMesh(jarGeo, M.glass, nJar);
const fillI = new THREE.InstancedMesh(fillGeo, fillMat, nJar);
const corkI = new THREE.InstancedMesh(corkGeo, M.cork, nJar);
const cellPos = [];
const tmp = new THREE.Object3D(), col = new THREE.Color();
for (let c = 0, i = 0; c < SH.cols; c++) for (let r = 0; r < SH.rows; r++, i++) {
  const x = SH.x0 + c * SH.cw + SH.cw / 2, y = SH.y0 + r * SH.rh + 0.013;
  cellPos.push(new THREE.Vector3(x, y, SH.z));
  tmp.position.set(x, y + 0.1, SH.z); tmp.updateMatrix(); glassI.setMatrixAt(i, tmp.matrix);
  tmp.position.set(x, y + 0.065, SH.z); tmp.updateMatrix(); fillI.setMatrixAt(i, tmp.matrix);
  tmp.position.set(x, y + 0.22, SH.z); tmp.updateMatrix(); corkI.setMatrixAt(i, tmp.matrix);
  fillI.setColorAt(i, col.set(palette[(c * 7 + r * 3 + (c * r) % 5) % palette.length]));
}
scene.add(glassI, fillI, corkI);
for (const x of [-2, 2]) {
  const l = new THREE.PointLight(0xffb070, 3, 3.6, 2);
  l.position.set(x, 1.9, ROOM.z0 + 1.1);
  scene.add(l);
}

// ---------- 촉감 병 다섯 개 ----------
export const KINDS = [
  null,
  { id: 1, name: '어느 7월의 밤, 파도가 다녀간 자리', sense: '따뜻한 모래알 사이로 천천히 스며드는 서늘한 물결', fill: [0xc9a25c, 0x1f3b63] },
  { id: 2, name: '네가 잠든 쪽의 이불', sense: '남아 있는 온기와 손바닥을 천천히 덮는 부드러운 무게', fill: [0xefe4d0, 0xe6d7bd] },
  { id: 3, name: '아직 아무도 밟지 않은 구름', sense: '손을 깊이 받아주다가 아주 느리게 밀어 올리는 폭신함', fill: [0xf6f4f2, 0xdfe6f2] },
  { id: 4, name: '비가 그친 뒤의 이끼 계단', sense: '서늘하고 촉촉한 표면, 누르면 부드럽게 되돌아오는 탄성', fill: [0x4f6a2e, 0x7d8f45] },
  { id: 5, name: '달의 그늘에 고인 물결', sense: '차가운 비단 같은 표면 아래에서 낮게 번지는 파동', fill: [0x9aa8bd, 0x1d2737] },
];
// 눈높이 칸에 나란히 놓음 (열 8~12, 아래에서 넷째 줄)
const PICK_ROW = 3;
const jars = [null];
for (let k = 1; k <= 5; k++) {
  const K = KINDS[k];
  const g = new THREE.Group();
  const gl = new THREE.Mesh(jarGeo, M.glass); gl.position.y = 0.1;
  const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.07, 24), new THREE.MeshStandardMaterial({ color: K.fill[0], roughness: 0.7, emissive: new THREE.Color(K.fill[0]).multiplyScalar(0.12) }));
  lo.position.y = 0.04;
  const hi = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.06, 24), new THREE.MeshStandardMaterial({ color: K.fill[1], roughness: 0.4, emissive: new THREE.Color(K.fill[1]).multiplyScalar(0.12) }));
  hi.position.y = 0.105;
  const ck = new THREE.Mesh(corkGeo, M.cork); ck.position.y = 0.22;
  // 이름표
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.034, 0.002), M.paper);
  tag.position.set(0.06, 0.16, 0.055); tag.rotation.set(0, 0.5, 0.15);
  g.add(gl, lo, hi, ck, tag);
  g.traverse((o) => { o.userData.kind = k; o.castShadow = true; });
  const cell = (8 + k - 1) * SH.rows + PICK_ROW;
  hideCell(cell);
  const home = cellPos[cell].clone().setZ(SH.z);
  g.position.copy(home);
  scene.add(g);
  // 빛 대신 내용물이 스스로 밝아짐 (조명 수를 줄여 가볍게)
  const light = { set intensity(v) { lo.material.emissiveIntensity = hi.material.emissiveIntensity = 1 + v * 2.2; } };
  jars.push({ g, home, light, lift: 0 });
}
function hideCell(i) {
  [glassI, fillI, corkI].forEach((m) => { m.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); m.instanceMatrix.needsUpdate = true; });
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
const jarMeshes = jars.slice(1).flatMap((j) => j.g.children.filter((o) => o.isMesh));
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
