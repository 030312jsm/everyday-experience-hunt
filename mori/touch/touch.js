// mori · 병을 열어 만져 보기 (three.js)
// 가게 3D 장면(store.js)을 그대로 불러와 그 위에 덧붙임:
// 받침 위 구름 병의 코르크를 끌어 열면 구름이 쏟아지고, 안개가 걷히면 가게가 구름 바다 위 밤하늘로 바뀜.
// 구름 바다는 마우스가 지나간 자리가 파였다가 천천히 다시 차오름(자국 버퍼에 남김).
import * as THREE from 'three';
import * as S from '../store.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const X = S.X, { scene, camera, renderer, cam, tween, camTo, jars, TOP, GLSL } = X;
const $ = (s) => document.querySelector(s);
const canvas = $('#gl'), hint = $('#hint'), again = $('#again'), muteBtn = $('#mute'), body = document.body;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches, Q = calm ? 0.25 : 1;   // Q: 연출 길이 배율
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const out3 = (k) => 1 - Math.pow(1 - k, 3);

// ── 가게 장면을 "구름 병이 받침에 놓인 상태"로 맞춤 ─────────────────────
// 주소 끝에 ?k=wave 를 붙이면 No. 07 "어느 7월의 밤, 파도가 다녀간 자리"(밤 바닷가 모래와 파도), 없으면 No. 13 구름
// ?k=moss 는 No. 03 "비가 그친 뒤의 이끼 계단"(이끼 낀 돌계단)
const KQ = new URLSearchParams(location.search).get('k'), WAVE = KQ === 'wave', MOSS = KQ === 'moss';
const KIND = WAVE ? 1 : MOSS ? 4 : 3, J = jars[KIND], KD = S.KINDS[KIND];
document.title = `mori · ${KD.name}`;
$('.kicker').textContent = `No. ${KD.no} · mori에서 처음 만나는 촉감`; $('h1').textContent = KD.name; $('#sense').textContent = KD.sense;
document.querySelectorAll('#kinds a').forEach((a) => { if (a.dataset.k === (WAVE ? 'wave' : MOSS ? 'moss' : 'cloud')) a.setAttribute('aria-current', 'page'); });
S.setActive(true); S.setMode('tour'); S.place(KIND);
X.setDock(1); J.light.intensity = 0.65; X.sway = 0.05;
const jp = X.dockTop();                                // 병이 놓인 자리
const narrow = () => camera.aspect < 0.8;
const P_JAR = () => ({ p: V(jp.x - 0.08, jp.y + 0.3, jp.z + (narrow() ? 1.2 : 0.98)), t: V(jp.x, jp.y + 0.17, jp.z) });
const P_SEA = () => { const k = THREE.MathUtils.clamp((camera.aspect - 0.7) / 0.9, 0, 1);   // 넓은 화면일수록 병을 왼쪽에 둠
  return { p: V(jp.x + 0.04 + 0.38 * k, jp.y + 0.5, jp.z + 1.22), t: V(jp.x + 0.06 + 0.44 * k, jp.y + 0.22, jp.z - 0.7) }; };   // 위쪽에 밤하늘과 달이 들어오게 조금 들어 올림
const setCam = (P) => { cam.p.copy(P.p); cam.t.copy(P.t); };
if (window.__moriSmooth) camTo(P_JAR(), 1.6); else setCam(P_JAR());   // 둘러보기에서 이어 들어오면 카메라가 병 앞으로 부드럽게 다가감
const shop = scene.children.filter((o) => o !== J.g);  // 하늘로 바뀔 때 숨길 것들(가게 전체와 조명)

// ── 자국 버퍼: 구름 바다 위 6m 정사각형, 손이 지나간 깊이를 0~1로 저장 ──
const SEA_Y = TOP + 0.03, TR = WAVE || MOSS ? 5 : 6, TN = WAVE ? 1536 : MOSS ? 1024 : 768;   // 모래는 손가락 굵기 홈이 보이게 더 촘촘히(한 칸 약 3mm), 이끼는 약 5mm
// 파도: 8.5초마다 한 번 밀려왔다 빠짐. 모래 셰이더와 자국 버퍼가 같은 식을 씀
const WAVE_FN = /* glsl */`
  uniform float uZ0;
  float shoreZ(float x){return uZ0+.45*(fbm(vec2(x*.35,3.7))-.5);}            // 물이 쉬는 자리(물가 선), 좌우로 굽음
  float peakOf(float n,float x){return (.7+.9*hash(vec2(n,7.3)))*(.75+.5*fbm(vec2(x*.7,n*3.1)));}   // 이번 파도가 올라오는 거리(혀 모양)
  float frontAt(float t,float x){float n=floor(t/8.5),u=fract(t/8.5),pk=peakOf(n,x);
    if(u<.28){float k=u/.28;return pk*(1.-pow(1.-k,3.));}                      // 빠르게 밀려 올라옴
    if(u<.8)return pk*pow(1.-(u-.28)/.52,1.6);                                 // 천천히 빠짐
    return 0.;}
  float sinceWet(float s,float t,float x){float best=99.;                       // 물이 빠진 뒤 지난 시간(초)
    for(int j=0;j<2;j++){float n=floor(t/8.5)-float(j),pk=peakOf(n,x);
      if(s>0.&&s<pk){float ts=n*8.5+8.5*(.28+.52*(1.-pow(s/pk,.625)));if(t>ts)best=min(best,t-ts);}}
    return best;}
`;
const Fc = new THREE.Vector2(jp.x + 0.5, jp.z - 0.5); // 버퍼의 가운데(카메라가 내려다보는 곳)
const half = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
const mkRT = () => new THREE.WebGLRenderTarget(TN, TN, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
let rtA = mkRT(), rtB = mkRT();
// R: 손이 스친 깊이(얕고 경계 없이), GB: 손이 움직인 방향과 빠르기(구름이 그쪽으로 끌려감)
// 모래(WAVE)일 때는 R: 그은 홈의 깊이(지워지지 않음, 파도가 덮으면 지워짐), G: R을 넓게 흐린 것(G-R = 홈 양옆으로 밀려 쌓인 모래)
const tU = { uPrev: { value: rtA.texture }, uA: { value: new THREE.Vector2(9, 9) }, uB: { value: new THREE.Vector2(9, 9) }, uVel: { value: new THREE.Vector2() }, uStr: { value: 0 }, uRad: { value: 0.015 }, uK: { value: 1 }, uDecay: { value: 1 }, uVDecay: { value: 1 },
  uTime: { value: 0 }, uZ0: { value: Fc.y - 1.7 } };   // 물가 선: 병에서 2.2m 앞(앞쪽에 마른 모래가 보이게)
const tScene = new THREE.Scene(), tCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
tScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: tU,
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: GLSL + WAVE_FN + /* glsl */`
    uniform sampler2D uPrev;uniform vec2 uA,uB,uVel;uniform float uStr,uRad,uK,uDecay,uVDecay,uTime;varying vec2 vUv;
    float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-9),0.,1.);return length(pa-ba*h);}
    void main(){
      ${WAVE ? `{
      float px=1./${TN}.;
      vec2 p=vec2(${Fc.x},${Fc.y})+(vUv-.5)*${TR}.;                     // 이 칸의 실제 위치(미터)
      float r=texture2D(uPrev,vUv).r*uDecay;                              // uDecay=0이면 비움(병에 다시 담을 때)
      float s=p.y-shoreZ(p.x);
      if(s<frontAt(uTime,p.x)+.03)r*=pow(.86,uK);                         // 파도가 덮은 자리는 자국이 풀어짐
      r=max(r,uStr*exp(-pow(seg(vUv,uA,uB)/uRad,2.)));
      float g=0.;for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++)g+=texture2D(uPrev,vUv+vec2(float(i),float(j))*px*2.).r;
      gl_FragColor=vec4(r,g/25.,0.,1.);return;}` : ''}
      ${MOSS ? `{
      // 이끼: R 눌린 깊이, G 그 깊이가 되돌아오는 빠르기(용수철), BA 결이 누운 방향과 정도
      float px=1./${TN}.;
      vec4 c=texture2D(uPrev,vUv)*uDecay;
      vec4 n=(texture2D(uPrev,vUv+vec2(px,0.))+texture2D(uPrev,vUv-vec2(px,0.))+texture2D(uPrev,vUv+vec2(0.,px))+texture2D(uPrev,vUv-vec2(0.,px)))*.25*uDecay;
      float dt=uK/60.,d=mix(c.r,n.r,min(.15*uK,.5)),v=c.g;
      v+=(-30.*d-5.5*v)*dt;d+=v*dt;                                     // 떼면 부드럽게 올라와 살짝 넘쳤다가 가라앉음
      float w=exp(-pow(seg(vUv,uA,uB)/uRad,2.)),hold=uStr*w;
      if(hold>d){d=mix(d,hold,min(1.,.4*uK));v=0.;}                     // 손이 누르는 동안은 눌린 채
      vec2 b=mix(c.ba,n.ba,min(.1*uK,.4))*uVDecay;                      // 누운 결은 천천히 다시 일어남
      b=mix(b,uVel,w*.5);
      gl_FragColor=vec4(d,v,b);return;}` : ''}
      float px=2./${TN}.;
      vec4 c=texture2D(uPrev,vUv);
      vec4 n=(texture2D(uPrev,vUv+vec2(px,0.))+texture2D(uPrev,vUv-vec2(px,0.))+texture2D(uPrev,vUv+vec2(0.,px))+texture2D(uPrev,vUv-vec2(0.,px)))*.25;
      vec4 v=mix(c,n,min(.25*uK,.7));                                 // 번지며 흐려짐: 모양이 남지 않음
      v.r*=uDecay;v.gb*=uVDecay;
      float w=exp(-pow(seg(vUv,uA,uB)/uRad,2.));                       // 경계 없는 부드러운 닿음
      v.r=max(v.r,uStr*w);
      v.gb=mix(v.gb,uVel,w*.6);                                        // 손이 지나간 방향으로 구름이 끌려감
      gl_FragColor=vec4(v.rgb,1.);
    }`,
})));

// ── 구름 바다 ───────────────────────────────────────────────────────
// 손이 닿는 가운데는 촘촘하고 멀어질수록 성긴 격자(지평선까지 덮음)
const seaGeo = (() => {
  const n = 340, pos = new Float32Array((n + 1) * (n + 1) * 3), idx = [];
  const w = (u) => Math.sign(u) * (0.9 * Math.abs(u) + 54 * Math.pow(Math.abs(u), 4));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const o = (j * (n + 1) + i) * 3;
    pos[o] = Fc.x + w(i / n * 2 - 1); pos[o + 1] = SEA_Y; pos[o + 2] = Fc.y + w(j / n * 2 - 1);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
})();
const MOON = 'normalize(vec3(.17,.115,-.98))';        // 달 방향: 정면에서 오른쪽으로 10도, 지평선 위 6.5도(막 떠오른 달)
const seaU = {
  uTrail: { value: rtA.texture }, uTime: { value: 0 }, uR: { value: 0 }, uSky: { value: 0 },
  uJar: { value: new THREE.Vector2(jp.x, jp.z) }, uFc: { value: Fc }, uTR: { value: TR },
  uWell: { value: new THREE.Vector2(jp.x - 0.45, jp.z - 0.07) },   // 따뜻한 빛이 올라오는 자리(홈과 받침 사이)
  uDeep: { value: null }, uDeepOn: { value: 0 },                    // 파인 자리 아래에 보일 영상(나중에 Higgsfield 구름 바다 영상)
  uSrc: { value: new THREE.Vector2(jp.x, jp.z) },                   // 쏟은 내용물이 떨어진 자리(여기서부터 번져 나감)
  uPile: { value: 0 }, uPileR: { value: 0.06 },                     // 떨어진 자리에 쌓이는 더미의 높이와 너비(m)
  uLeaf: { value: null }, uPeb: { value: null }, uPebH: { value: null },   // Fab(Megascans) 바닥 사진: 젖은 낙엽, 해변 자갈과 그 높이
  uMossC: { value: null }, uMossN: { value: null }, uStoneC: { value: null }, uStoneN: { value: null },   // 이끼·이끼 낀 돌 사진(색, 요철)
  uSandC: { value: null }, uSandN: { value: null }, uWetC: { value: null }, uWetN: { value: null },       // 물결 모래·젖은 모래 사진
  uSurfK: { value: new THREE.Vector3(1, 1, 1) },                                                         // 사진 밝기를 장면 밝기에 맞추는 배율
};
const fabURL = (f) => new URL(`../assets/fab/${f}`, import.meta.url).href;
const fabTex = (f, color = true) => { const t = new THREE.TextureLoader().load(fabURL(f)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (color) t.colorSpace = THREE.SRGBColorSpace; return t; };
if (MOSS) {
  seaU.uLeaf.value = fabTex('leaves.jpg');
  Object.assign(seaU, { uMossC: { value: fabTex('surf/moss_b.jpg') }, uMossN: { value: fabTex('surf/moss_n.jpg', false) }, uStoneC: { value: fabTex('surf/stone_b.jpg') }, uStoneN: { value: fabTex('surf/stone_n.jpg', false) } });
  seaU.uSurfK.value.set(2.2, 1.0, 0.8);
}
if (WAVE) {
  seaU.uPeb.value = fabTex('pebbles.jpg'); seaU.uPebH.value = fabTex('pebbles_h.jpg', false);
  Object.assign(seaU, { uSandC: { value: fabTex('surf/sand_b.jpg') }, uSandN: { value: fabTex('surf/sand_n.jpg', false) }, uWetC: { value: fabTex('surf/wet_b.jpg') }, uWetN: { value: fabTex('surf/wet_n.jpg', false) } });
  seaU.uSurfK.value.set(4.2, 0.9, 1);
}
const SEA_FN = GLSL + /* glsl */`
  uniform sampler2D uTrail;uniform float uTime,uR,uSky,uTR;uniform vec2 uJar,uFc,uWell,uSrc;
  // 쏟은 자리에서 번진 가장자리까지 남은 거리(0보다 작으면 아직 안 닿음). 가장자리는 들쭉날쭉
  uniform float uPile,uPileR;uniform sampler2D uLeaf,uPeb,uPebH,uMossC,uMossN,uStoneC,uStoneN,uSandC,uSandN,uWetC,uWetN;uniform vec3 uSurfK;
  float pile(vec2 p){vec2 d=p-uSrc;return uPile*exp(-dot(d,d)/(uPileR*uPileR));}          // 쏟은 자리에 쌓이는 더미
  vec2 pileG(vec2 p){return -2.*(p-uSrc)/(uPileR*uPileR)*pile(p);}
  float spreadF(vec2 p){return uR>=60.?9.:uR-(.25+.6*fbm(p*3.+uTime*.25))*min(1.,uR*.8)-length(p-uSrc);}
  vec3 frontGlow(float f){return vec3(1.,.93,.8)*exp(-f*f/.004)*.3*(1.-uSky);}   // 번져 나가는 끝이 젖은 듯 빛남
  // 뭉게구름 잡음: 값이 접히는 자리에 골이 생겨 봉우리가 둥글게 부풂
  float puff(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*abs(2.*vnoise(p)-1.);p=m*p;a*=.5;}return v;}
  float billow(vec2 p){vec2 q=p*.5+vec2(uTime*.010,uTime*.006);
    float big=smoothstep(.22,.82,fbm(q+1.6*vec2(fbm(q*.8+3.1),fbm(q*.8-1.7))));
    return big*.62+puff(p*1.5+vec2(uTime*.016,0.)+big*.8)*.62;}
  float height(vec2 p){float d=length(p-uJar);
    float a=mix(.07,.24,smoothstep(.2,2.5,d))+.45*smoothstep(4.,45.,d);   // 병 둘레는 낮게, 멀리는 낮고 잔잔한 구름 바다(하늘이 보이게)
    return billow(p)*a+fbm(p*.07+7.)*smoothstep(6.,40.,d)*.6;}
  float detail(vec2 p){return puff(p*5.+uTime*.02)*.6+puff(p*13.-uTime*.03)*.3;}
  // 손이 스친 깊이와, 구름이 끌려간 거리(미터)
  float dent(vec2 uv){return texture2D(uTrail,uv).r;}
  vec2 drag(vec2 uv){return texture2D(uTrail,uv).gb*.09;}
`;
const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({
  uniforms: seaU,
  vertexShader: SEA_FN + /* glsl */`
    varying vec3 vW;varying vec3 vN;varying float vH,vDist;
    void main(){
      vec2 p=position.xz,uv=(p-uFc)/uTR+.5,q=p-drag(uv);float e=.03+length(p-cameraPosition.xz)*.012;
      float y=height(q)+pile(p),yx=height(q+vec2(e,0.))+pile(p+vec2(e,0.)),yz=height(q+vec2(0.,e))+pile(p+vec2(0.,e));
      float d=dent(uv);
      vec3 pos=vec3(p.x,position.y+y-d*.05,p.y);
      vN=normalize(vec3(-(yx-y)/e*1.8,1.,-(yz-y)/e*1.8));vH=billow(q);
      vec4 w=modelMatrix*vec4(pos,1.);vW=w.xyz;vDist=length(w.xyz-cameraPosition);
      gl_Position=projectionMatrix*viewMatrix*w;
    }`,
  fragmentShader: SEA_FN + /* glsl */`
    uniform sampler2D uDeep;uniform float uDeepOn;
    varying vec3 vW;varying vec3 vN;varying float vH,vDist;
    void main(){
      vec2 p=vW.xz;float dj=length(p-uJar);
      float sf=spreadF(p);if(sf<0.)discard;        // 쏟은 자리에서 번져 나가는 가장자리
      vec2 tuv=(p-uFc)/uTR+.5;float px=2./${TN}.;
      float d=texture2D(uTrail,tuv).r;
      float dx=dent(tuv+vec2(px,0.))-dent(tuv-vec2(px,0.));
      float dz=dent(tuv+vec2(0.,px))-dent(tuv-vec2(0.,px));
      vec2 q=p-drag(tuv)*1.6;                                                    // 잔결은 더 많이 끌려감(스친 자리의 결이 흐트러짐)
      float e=.012,t0=detail(q),tx=detail(q+vec2(e,0.)),tz=detail(q+vec2(0.,e));
      vec3 N=normalize(vN+vec3(dx,0.,dz)*2.8+vec3(-(tx-t0),0.,-(tz-t0))/e*.035);
      vec3 Vw=normalize(cameraPosition-vW),L=${MOON};
      float h=clamp(vH-d*1.2+(t0-.45)*.35,0.,1.2);
      vec3 col=mix(vec3(.05,.07,.15),vec3(.80,.84,.94),smoothstep(.08,1.,h));   // 골은 푸른 그늘, 봉우리는 흰빛
      col*=mix(.5,1.,smoothstep(.12,.6,t0));                                    // 접힌 골은 더 어둡게
      float wrap=max((dot(N,L)+.3)/1.3,0.);
      float ct=dot(-Vw,L),ph=(1.-.3025)/pow(1.3025-1.1*ct,1.5)*.25;                    // 달 쪽을 볼수록 구름이 비쳐 밝아짐(부피 구름과 같은 식)
      vec3 sky=col*(vec3(.045,.06,.11)+vec3(.66,.76,1.)*(wrap*.8+ph*.9*smoothstep(.1,.6,h)));
      sky+=vec3(.5,.62,.9)*pow(1.-max(dot(N,Vw),0.),2.5)*.3*smoothstep(.25,1.,h);   // 달을 등진 봉우리의 은빛 가장자리
      float near=exp(-dot(p-uWell,p-uWell)/1.2);
      vec3 amber=vec3(1.,.55,.22);
      sky+=amber*(smoothstep(.55,0.,h)*.08*near+pow(d,3.)*(.12+.3*near));       // 아래에서 올라오는 따뜻한 빛(깊이 판 자리에서만 조금)
      vec3 deep=vec3(.012,.02,.05)+amber*(.1*near+.15*d);
      if(uDeepOn>.5)deep=mix(deep,texture2D(uDeep,tuv).rgb,.8);
      sky=mix(sky,deep,smoothstep(.8,1.,d)*.55);                                // 깊이 파인 자리는 바닥이 비침
      sky=mix(sky,vec3(.035,.05,.10),(1.-exp(-vDist*.045)));                    // 먼 곳은 지평선 색으로
      vec3 shopc=col*vec3(1.1,.84,.6)*(.3+.7*max(dot(N,normalize(vec3(.25,1.,.45))),0.))+amber*pow(d,3.)*.6;
      gl_FragColor=vec4(mix(shopc,sky,uSky)+frontGlow(sf),1.);
    }`,
}));
sea.frustumCulled = false; sea.visible = false;
scene.add(sea);

// ── No. 07 밤 바닷가: 같은 격자를 모래와 파도로 칠함 ─────────────────────
// 가까이는 마른 모래(물결 자국, 알갱이), 물가는 젖어 달빛이 비치고, 8.5초마다 얇은 물이 밀려와 그은 자국을 지우고 빠짐
if (WAVE) sea.material = new THREE.ShaderMaterial({
  uniforms: { ...seaU, uZ0: tU.uZ0 },
  vertexShader: SEA_FN + WAVE_FN + /* glsl */`
    varying vec3 vW;varying float vDist;
    void main(){
      vec2 p=position.xz,uv=(p-uFc)/uTR+.5;vec2 t=texture2D(uTrail,uv).rg;
      float s=p.y-shoreZ(p.x);
      vec3 pos=vec3(p.x,position.y-t.r*.012+max(t.g-t.r,0.)*.008-.03*smoothstep(0.,-2.,s)+pile(p),p.y);   // 그은 홈과 양옆 둔덕, 바다 쪽은 조금 낮게
      vec4 w=modelMatrix*vec4(pos,1.);vW=w.xyz;vDist=length(w.xyz-cameraPosition);
      gl_Position=projectionMatrix*viewMatrix*w;
    }`,
  fragmentShader: SEA_FN + WAVE_FN + /* glsl */`
    varying vec3 vW;varying float vDist;
    // 바람 물결 자국: 바람 맞는 쪽은 완만하게 오르고 반대쪽은 가파르게 떨어지는 단면, 마루가 굽고 갈라지며 높이도 들쭉날쭉
    float ripple(vec2 p){
      vec2 q=p+vec2(fbm(p*.8),fbm(p*.8+5.2))*.4;
      float f=fract((dot(q,vec2(.2,1.))*52.+3.*fbm(q*2.3))/6.2832);
      float pr=f<.72?f/.72:(1.-f)/.28;
      return smoothstep(0.,1.,pr)*(.35+.65*vnoise(p*2.7));
    }
    // 세포 잡음: 거품 방울, 조개껍데기 자리
    float wor(vec2 p){vec2 i=floor(p),f=fract(p);float m=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y);m=min(m,length(g+vec2(hash(i+g),hash(i+g+19.))-f));}return m;}
    float trailH(vec2 uv){vec2 t=texture2D(uTrail,uv).rg;return -t.r+max(t.g-t.r,0.)*.7;}
    float waterH(vec2 p){return fbm(p*vec2(1.1,2.6)+vec2(uTime*.12,uTime*.35))+.5*fbm(p*vec2(4.,9.)-vec2(0.,uTime*.8));}
    void main(){
      vec2 p=vW.xz;float dj=length(p-uJar);
      float sf=spreadF(p);if(sf<0.)discard;                 // 쏟은 자리에서 번져 나가는 가장자리
      vec3 V=normalize(cameraPosition-vW),L=${MOON};
      vec2 uv=(p-uFc)/uTR+.5;float px=1./${TN}.;
      float inT=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
      float tr=texture2D(uTrail,uv).r*inT;
      float tx=(trailH(uv+vec2(px,0.))-trailH(uv-vec2(px,0.)))*inT,tz=(trailH(uv+vec2(0.,px))-trailH(uv-vec2(0.,px)))*inT;
      float s=p.y-shoreZ(p.x),fr=frontAt(uTime,p.x),sw=sinceWet(s,uTime,p.x),u=fract(uTime/8.5);
      // 모래 겉면: 그은 홈, 물결 자국, 알갱이 하나하나, 조개 조각, 물이 닿았던 끝의 해초 줄
      float nk=1.-smoothstep(1.5,6.,vDist);                                      // 잔결은 가까이에서만(멀면 반짝이 잡음이 됨)
      float wet=s<fr?1.:exp(-sw/5.);                                          // 물이 빠지면 5초쯤에 걸쳐 마름
      wet=max(wet,smoothstep(.6,0.,s)*.8);                                     // 물가 가까이는 늘 젖어 있음
      float ripAmt=smoothstep(1.3,2.3,s)*(1.-smoothstep(4.,9.,vDist))*(1.-wet),e=.003,r0=ripple(p),rx=ripple(p+vec2(e,0.)),rz=ripple(p+vec2(0.,e));
      vec2 gc=floor(p*650.);float g1=hash(gc),g2=hash(gc+3.7),g3=hash(gc+9.1);   // 알갱이 하나하나
      vec3 gN=vec3(g1-.5,0.,g2-.5)*(1.-wet*.7)*nk;
      vec2 pg=pileG(p);
      vec3 tn=mix(texture2D(uSandN,p*.5).xyz,texture2D(uWetN,p*.5).xyz,wet)*2.-1.;   // Megascans 물결 모래·젖은 모래 사진(한 장 2m)의 요철
      vec3 N=normalize(vec3(-tx*1.3-pg.x,1.,-tz*1.3-pg.y)+vec3(-(rx-r0),0.,-(rz-r0))/e*.002*ripAmt+gN*.25+vec3(tn.x,0.,tn.y)*.55*(.4+.6*nk));
      vec3 dry=texture2D(uSandC,p*.5).rgb*uSurfK.x*(.9+.2*fbm(p*.5))*vec3(.9,.93,1.);   // 마른 물결 모래(사진) 위에 넓은 얼룩, 달빛 아래라 조금 차갑게
      dry*=mix(1.,mix(.55,1.35,step(.5,g3)),step(.86,g1)*nk);                 // 어두운 광물 알갱이와 흰 석영 알갱이
      dry=mix(dry,dry*vec3(.92,.9,.86),r0*ripAmt*.5);                         // 물결 마루는 조금 밝고 골은 고운 모래가 고여 어두움
      float wrack=exp(-pow((s-1.75-.3*fbm(vec2(p.x*.6,1.)))/.14,2.))*smoothstep(.45,.7,fbm(p*7.));   // 파도가 가장 높이 올라온 자리에 남은 해초·조개 부스러기 줄
      dry=mix(dry,vec3(.16,.14,.1),wrack*.75);
      vec3 sand=mix(dry,texture2D(uWetC,p*.5).rgb*uSurfK.y,wet)*(1.-.16*tr);   // 젖은 모래(사진)와 그은 홈 안쪽은 어둡게
      float rill=pow(1.-abs(sin(p.x*95.+5.*fbm(p*vec2(2.,9.)))),14.)*wet*smoothstep(.2,1.,s)*nk;   // 물이 빠지며 남긴 가는 물길
      sand*=1.-rill*.25;
      float pit=step(.993,hash(floor(p*260.)))*wet*(1.-step(s,fr))*nk;        // 젖은 모래의 작은 숨구멍
      sand*=1.-pit*.6;
      vec2 sc=p*14.;float sh=step(.965,hash(floor(sc)+.5))*smoothstep(.16,.08,length(fract(sc)-.5-.3*(vec2(hash(floor(sc)+1.3),hash(floor(sc)+2.9))-.5)))*nk*(1.-step(s,fr));   // 드문드문 조개 조각
      sand=mix(sand,vec3(.78,.74,.68),sh*.8);
      vec2 pq=p*.5;float pb=smoothstep(.1,.35,s)*smoothstep(1.4,.9,s)*smoothstep(.48,.6,fbm(p*.9+17.));   // 물가에 드문드문 모인 자갈(Megascans 사진)
      float pm=pb*smoothstep(.4,.6,texture2D(uPebH,pq).r+pb*.35-.25);           // 자갈 윗부분만 모래 위로 드러남
      sand=mix(sand,texture2D(uPeb,pq).rgb*mix(1.,.55,wet),pm);
      float wrap=max((dot(N,L)+.3)/1.3,0.);                                    // 낮게 뜬 달이라 물결 그늘이 생김(너무 검지 않게)
      vec3 col=sand*(vec3(.05,.06,.09)+vec3(.68,.71,.86)*wrap*.95);
      vec3 H=normalize(L+V);
      col+=vec3(.7,.75,.9)*pow(max(dot(N,H),0.),mix(8.,140.,wet))*mix(.02,.55,wet);   // 젖은 모래에 비친 달
      col+=vec3(.9,.93,1.)*step(.985,g2)*pow(max(dot(normalize(N+gN*2.),H),0.),60.)*1.6*nk*(1.-wet);   // 달빛에 반짝이는 석영 알갱이
      // 물: 밀려온 얇은 물(s<fr)과 바다(s<0)
      float seaK=smoothstep(0.,-.5,s),water=max(step(s,fr)*min(1.,.35+smoothstep(0.,.25,fr-s)),seaK);
      if(water>0.){
        float a=mix(2.,6.,seaK),wh=waterH(p),wx=waterH(p+vec2(.03,0.))-wh,wz=waterH(p+vec2(0.,.03))-wh;
        vec3 Nw=normalize(vec3(-wx*a,1.,-wz*a));
        vec3 R=reflect(-V,Nw);float f=.02+.98*pow(1.-max(dot(Nw,V),0.),5.);
        vec3 refl=mix(vec3(.035,.05,.10),vec3(.006,.01,.03),clamp(R.y*2.,0.,1.));
        vec3 wc=mix(col*.8,vec3(.008,.016,.035),seaK);                           // 얕은 물은 아래 모래가 비침
        wc=mix(wc,refl,f)+vec3(.85,.85,.8)*(pow(max(dot(R,L),0.),500.)*3.+pow(max(dot(R,L),0.),40.)*.12);   // 달빛 길
        col=mix(col,wc,water);
      }
      // 거품: 밀려오는 물의 끝, 물이 빠진 뒤 남는 거품, 물가에서 부서지는 파도
      float lace=smoothstep(.38,.72,fbm(p*vec2(9.,14.)+vec2(0.,uTime*.3)))*mix(1.,smoothstep(.25,.55,wor(p*vec2(34.,46.)+vec2(0.,uTime*.4))),.7*nk);   // 거품은 방울이 엉긴 그물 모양
      float edge=fr-s,foam=step(.04,fr)*smoothstep(0.,.025,edge)*smoothstep(.18,.03,edge)*(.4+.6*lace);
      foam+=step(fr,s)*exp(-sw/.8)*smoothstep(.66,.85,fbm(p*vec2(16.,22.)))*.35;   // 물이 빠진 자리에 잠깐 남는 잔거품(드물게)
      foam+=exp(-pow((s+.35)/.09,2.))*lace*(.25+.75*smoothstep(.3,0.,u)*step(u,.3));
      col=mix(col,vec3(.62,.67,.78)*(.45+.55*wrap),clamp(foam,0.,1.)*.85);
      col+=vec3(1.,.6,.3)*exp(-dj*dj/.04)*.035;                                 // 병 아래의 아주 약한 온기
      col=mix(col,vec3(.035,.05,.10),1.-exp(-vDist*.045));                      // 먼 곳은 지평선 색으로
      vec3 shopc=dry*vec3(1.1,.84,.6)*(.3+.7*max(dot(N,normalize(vec3(.25,1.,.45))),0.));
      gl_FragColor=vec4(mix(shopc,col,uSky)+frontGlow(sf),1.);
    }`,
});

// ── No. 03 이끼 계단: 같은 격자를 이끼 덮인 돌계단으로 ─────────────────────
// 병 앞 30cm부터 46cm 너비, 10cm 높이의 디딤돌 8단이 멀어지며 내려가고, 그 너머는 이끼 낀 숲 바닥.
// 쓸면 결이 손 방향으로 누워 벨벳처럼 빛깔이 바뀌었다가 천천히 일어남. 꾹 누르면 물이 배어 나오고, 떼면 탄력 있게 되돌아옴
const MOSS_FN = /* glsl */`
  vec4 mossK(vec2 p){                                                        // 몇 번째 단, 단 안의 위치, 가장 가까운 이음매까지 거리(m), 디딤돌 번호
    float k=clamp((uJar.y-.45-p.y+.06*(fbm(vec2(p.x*.8,1.3))-.5))/.46,0.,5.),i=floor(k),sx=p.x/.62+hash(vec2(i,3.));
    return vec4(i,k-i,(.5-abs(fract(sx)-.5))*.62,floor(sx));
  }
  vec4 cellM(vec2 p){vec2 i=floor(p),f=fract(p),v=vec2(0.);float m=9.,id=0.;   // 세포 무늬: 거리, 무작위 값, 중심에서 이 점까지의 방향
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y),o=g+vec2(hash(i+g),hash(i+g+19.))-f;float d=length(o);if(d<m){m=d;id=hash(i+g+7.);v=-o;}}
    return vec4(m,id,v);}
  float mossH(vec2 p){
    vec4 s=mossK(p);float i=s.x,f=s.y,k=i+f;                                  // 병이 놓인 자리 너머로 5단 올라감, 모서리가 조금씩 굽음
    float h=.1*(i+smoothstep(.86,1.,f));                                      // 단마다 앞면(6cm)이 있고 위 끝이 둥긂
    h+=.012*(hash(vec2(i,s.w))-.5)*step(f,.86);                              // 디딤돌마다 높이가 조금씩 다름
    float side=smoothstep(1.,1.5,abs(p.x-uFc.x));                            // 계단 폭 2m, 양옆은 조금 높은 이끼 언덕
    h=mix(h,.1*k+.12+.12*fbm(p*1.3),side);
    h+=.022*smoothstep(.35,.8,fbm(p*3.1))+.006*vnoise(p*25.);                // 이끼 방석
    float far=length(p-uJar);
    return h-.7*smoothstep(4.,14.,far)+.25*(fbm(p*.12)-.5)*smoothstep(5.,25.,far);   // 계단 너머는 내려가는 숲 바닥(달이 보이게)
  }
`;
if (MOSS) sea.material = new THREE.ShaderMaterial({
  uniforms: seaU,
  vertexShader: SEA_FN + MOSS_FN + /* glsl */`
    varying vec3 vW,vN;varying float vDist;
    void main(){
      vec2 p=position.xz,uv=(p-uFc)/uTR+.5;float e=.008+length(p-cameraPosition.xz)*.01;
      float inT=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
      float y=mossH(p)+pile(p),yx=mossH(p+vec2(e,0.))+pile(p+vec2(e,0.)),yz=mossH(p+vec2(0.,e))+pile(p+vec2(0.,e));
      vN=normalize(vec3(-(yx-y)/e,1.,-(yz-y)/e));
      vec3 pos=vec3(p.x,position.y+y-texture2D(uTrail,uv).r*inT*.02,p.y);      // 눌리면 2cm까지 들어감(튀어 오르면 살짝 솟음)
      vec4 w=modelMatrix*vec4(pos,1.);vW=w.xyz;vDist=length(w.xyz-cameraPosition);
      gl_Position=projectionMatrix*viewMatrix*w;
    }`,
  fragmentShader: SEA_FN + MOSS_FN + /* glsl */`
    varying vec3 vW,vN;varying float vDist;
    void main(){
      vec2 p=vW.xz;float dj=length(p-uJar);
      float sf=spreadF(p);if(sf<0.)discard;                 // 쏟은 자리에서 번져 나가는 가장자리
      vec3 Vw=normalize(cameraPosition-vW),L=${MOON};
      vec2 uv=(p-uFc)/uTR+.5;float px=1./${TN}.;
      float inT=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
      vec4 tr=texture2D(uTrail,uv)*inT;float d=max(tr.r,0.);vec2 b=tr.ba;
      float dx=(dent(uv+vec2(px,0.))-dent(uv-vec2(px,0.)))*inT,dz=(dent(uv+vec2(0.,px))-dent(uv-vec2(0.,px)))*inT;
      float lay=clamp(length(b)*1.5+d*1.1,0.,1.);                              // 결이 누운 정도
      float nk=1.-smoothstep(1.2,4.5,vDist);                                   // 잔결은 가까이에서만(멀면 반짝이 잡음이 됨)
      vec2 q=p*230.+b*14.;float f1=vnoise(q),f2=vnoise(q+17.),tuft=vnoise(p*70.)*.5+f1*.5;   // 결 무늬가 누운 쪽으로 밀림
      vec4 sk=mossK(p);
      float onSt=(1.-smoothstep(1.,1.5,abs(p.x-uFc.x)))*step(.02,sk.x+sk.y)*step(sk.x+sk.y,4.98);   // 계단 위에서만(앞바닥과 맨 윗단 너머는 제외)
      // 계단 앞면의 기울기는 픽셀마다 계단 식으로 직접 셈(정점이 성겨서 보간한 법선에 사선 줄무늬가 생겼음)
      float rt=clamp((sk.y-.86)/.14,0.,1.);
      vec3 nV=normalize(mix(vN,normalize(vec3(vN.x/max(vN.y,.2),1.,.217*6.*rt*(1.-rt)/.14)),(1.-smoothstep(1.,1.5,abs(p.x-uFc.x)))*step(.02,sk.x+sk.y)));
      float tread=smoothstep(.6,.85,nV.y);
      vec4 cu=cellM(p*15.);float dome=1.-smoothstep(.15,.8,cu.x);              // 이끼 방석: 손톱만 한 둥근 덩이가 빽빽이 붙어 있음
      float jn=smoothstep(.035,.006,sk.z)*onSt;                                 // 디딤돌 사이 이음매(짙고 축축한 이끼가 차 있음)
      float nose=max(smoothstep(.95,1.,sk.y),smoothstep(.06,0.,sk.y))*onSt;      // 계단 모서리는 밟혀서 이끼가 닳음
      float st=(1.-smoothstep(.45,.75,nV.y))*smoothstep(.05,.35,fbm(p*9.));   // 계단 앞면은 대부분 돌이 드러남(이끼는 윗면에 앉음, 실제 사진 기준)
      st=max(st,smoothstep(.74,.8,fbm(p*1.6+5.))*(1.-smoothstep(.9,1.3,abs(p.x-uFc.x)))*.8);   // 디딤돌 위에도 몇 군데 맨돌
      st=max(st,nose*smoothstep(.45,.7,fbm(p*14.+2.))*.9)*(1.-jn);
      float pud=smoothstep(.78,.84,fbm(p*4.+9.)+.3*smoothstep(.6,.84,sk.y))*smoothstep(.84,.8,sk.y)*smoothstep(.5,.65,sk.y)*tread*onSt*(1.-jn);   // 디딤돌 안쪽, 다음 단 앞면 밑에 고인 작은 빗물
      vec4 lf=cellM(p*3.6+5.);float la=lf.y*31.;vec2 lq=mat2(cos(la),-sin(la),sin(la),cos(la))*lf.zw;
      float leaf=step(.9,lf.y)*smoothstep(.015,-.015,length(vec2(lq.x,lq.y*2.6))-.17)*tread*(1.-pud);   // 떨어져 젖은 잎(드문드문)
      float lp=smoothstep(.6,.7,fbm(p*1.7+31.))*tread*onSt*(1.-pud)*(1.-jn);   // 젖은 낙엽이 모여 깔린 자리(Megascans 사진)
      float mo=(1.-lay)*(1.-st)*(1.-leaf)*(1.-pud)*(1.-lp);                    // 이끼가 일어서 드러난 정도
      vec2 suv=mix(vec2(p.x,vW.y*1.2),p,tread)*.5;                              // 디딤돌 위는 위에서, 앞면은 옆에서 본 좌표(돌 사진 한 장이 2m)
      vec3 mT=texture2D(uMossC,suv*4.).rgb*uSurfK.x,sT=texture2D(uStoneC,suv).rgb*uSurfK.y;   // Megascans 이끼(0.5m 한 장)와 이끼 낀 돌 사진(앞면은 옆에서 본 좌표라 늘어나지 않음)
      vec3 mN=texture2D(uMossN,suv*4.).xyz*2.-1.,sN=texture2D(uStoneN,suv).xyz*2.-1.;
      vec3 N=normalize(nV+vec3(dx,0.,dz)*4.+(vec3(f1-.5,0.,f2-.5)*.5*(1.-lay)+vec3(b.x,0.,b.y)*.7+vec3(cu.z,0.,cu.w)*.6*mo+vec3(mN.x,0.,mN.y)*.7*mo+vec3(sN.x,0.,sN.y)*.9*st)*nk);
      N=normalize(mix(N,vec3(0.,1.,0.),pud));
      vec3 moss=mT*mix(.8,1.15,smoothstep(.3,.75,fbm(p*2.2)));                  // 사진 이끼 위에 넓은 얼룩만 더함
      moss=mix(moss,vec3(.14,.2,.045),smoothstep(.58,.8,fbm(p*4.5+11.))*.35);   // 노란 기가 도는 별이끼 무리
      moss=mix(moss,vec3(.085,.065,.035),smoothstep(.7,.86,fbm(p*3.3+27.))*.4*onSt);   // 말라서 갈색으로 바랜 자리
      moss=mix(moss,vec3(.20,.25,.10),smoothstep(.55,.9,tuft)*(1.-lay)*.55*nk);   // 일어선 이끼 끝은 조금 밝게
      moss=mix(moss,vec3(.018,.04,.018),jn*.75);
      float nap=dot(b,normalize(Vw.xz+1e-4));
      moss*=(.6+.5*mix(dome,.6,lay))*(1.-.35*lay)*(1.+clamp(nap*1.2,-.3,.3));   // 방석 사이는 그늘, 누운 결은 어둡고 결 방향에 따라 밝기가 달라짐(벨벳처럼)
      vec3 stone=sT*(.85+.3*fbm(p*4.));                                         // 비에 젖은 이끼 낀 돌(사진)
      stone*=1.-.35*(1.-tread)*smoothstep(.45,.8,vnoise(vec2(p.x*55.,vW.y*5.)));   // 계단 앞면으로 흘러내린 물자국
      vec4 lc=cellM(p*7.+3.);float lk=step(.6,lc.y);
      stone=mix(stone,vec3(.29,.32,.25)*(.75+.5*vnoise(p*110.)),smoothstep(.4,.28,lc.x)*lk*.3);   // 돌에 핀 회녹색 지의류(사진에도 있어 옅게)
      stone+=vec3(.16,.18,.13)*smoothstep(.05,0.,abs(lc.x-.37))*lk*.2;
      vec3 alb=mix(moss,stone,st);
      alb=mix(alb,mix(vec3(.19,.085,.03),vec3(.26,.16,.05),fract(lf.y*13.))*(1.-.4*smoothstep(.012,0.,abs(lq.y))),leaf);   // 잎맥이 보이는 갈색·호박색 잎
      alb=mix(alb,texture2D(uLeaf,p*2.78).rgb*uSurfK.z,lp);                     // 낙엽 사진은 한 장이 0.36m
      alb*=1.-.65*pud;
      float wrap=max((dot(N,L)+.5)/1.5,0.);
      float ao=1.-.6*smoothstep(.62,.85,sk.y)*step(sk.y,.86)*tread*onSt;         // 다음 단 모서리 밑, 디딤돌 안쪽 구석은 빛이 덜 듦
      ao*=1.-.3*(1.-tread)*smoothstep(.95,.86,sk.y)*onSt;                         // 계단 앞면 아래쪽도 어둡게
      ao*=.75+.25*dome;                                                          // 이끼 방석 사이 틈
      vec3 col=alb*(vec3(.06,.08,.11)+vec3(.62,.72,.95)*wrap)*ao;
      col+=vec3(.25,.4,.15)*pow(max(dot(-Vw,L),0.),3.)*smoothstep(.5,.85,tuft)*mo*(1.-jn)*.35*nk;   // 달을 마주 보면 이끼 끝이 비침
      vec3 H=normalize(L+Vw);float sh=max(max(lay,st),max(max(leaf,lp)*.7,pud));
      col+=vec3(.7,.78,.95)*pow(max(dot(N,H),0.),mix(18.,160.,sh))*mix(.03,.5,max(max(lay,st*.25),leaf*.4));   // 누운 자리, 젖은 돌과 잎은 물기로 번들거림
      vec3 R=reflect(-Vw,vec3(0.,1.,0.));
      col=mix(col,vec3(.012,.018,.035)+vec3(.03,.04,.07)*smoothstep(-.1,.6,R.y)+vec3(.9,.95,1.)*pow(max(dot(R,L),0.),500.)*3.*(.7+.3*vnoise(p*40.+uTime)),pud*.85);   // 고인 물에 비친 밤하늘과 달
      float seep=smoothstep(.35,.95,d);                                        // 꾹 누르면 물이 배어 나옴
      col=mix(col,col*.5+vec3(.6,.7,.9)*pow(max(dot(R,L),0.),30.)*.6,seep*.8);
      vec2 g=p*140.,c=floor(g);
      float bd=step(.993,hash(c))*smoothstep(.32,.1,length(fract(g)-.5-.25*(vec2(hash(c+3.),hash(c+7.))-.5)));
      col+=vec3(.85,.9,1.)*bd*mo*nk*(.15+1.8*pow(max(dot(N,H),0.),40.));   // 비가 그친 뒤 이끼 끝에 맺힌 물방울(쓸면 사라짐)
      vec2 sg=p*55.,sc=floor(sg);
      float spo=step(.985,hash(sc+41.))*smoothstep(.14,.05,length(fract(sg)-.5))*mo*(1.-jn)*nk;
      col=mix(col,vec3(.5,.24,.1)*(.2+.8*wrap),spo);                           // 이끼 포자낭: 가늘게 솟은 끝의 작은 적갈색 알
      col+=vec3(1.,.6,.3)*exp(-dj*dj/.04)*.035;                                // 병 아래의 아주 약한 온기
      col=mix(col,vec3(.035,.05,.10),1.-exp(-vDist*.13));                      // 먼 곳은 비 갠 밤안개에 묻힘
      vec3 shopc=alb*vec3(1.1,.84,.6)*(.3+.7*max(dot(N,normalize(vec3(.25,1.,.45))),0.));
      gl_FragColor=vec4(mix(shopc,col,uSky)+frontGlow(sf),1.);
    }`,
});

// ── 이끼에서 튀는 물방울: 꾹 눌렀다 떼거나 빠르게 쓸면 몇 방울 튀어 오름 ─────
const drops = MOSS ? (() => {
  const N = 48, pos = new Float32Array(N * 3), life = new Float32Array(N), vel = Array.from({ length: N }, () => V(0, 0, 0));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('life', new THREE.BufferAttribute(life, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float life;varying float vL;void main(){vL=life;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=life>0.?13./-mv.z:0.;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying float vL;void main(){vec2 c=gl_PointCoord-.5;float r=length(c);if(r>.5)discard;gl_FragColor=vec4(vec3(.75,.85,1.)*(smoothstep(.5,.2,r)*.45+smoothstep(.16,0.,length(c+.12))*.9)*min(vL*6.,1.),1.);}',
  }));
  pts.frustumCulled = false; pts.visible = false; scene.add(pts);
  let k = 0;
  return {
    pts,
    spray(at, n, up) {
      for (let j = 0; j < n; j++) {
        const i = k++ % N, a = Math.random() * 6.283, s = 0.12 + Math.random() * 0.3;
        pos.set([at.x, at.y + 0.008, at.z], i * 3); vel[i].set(Math.cos(a) * s, up * (0.5 + Math.random() * 0.6), Math.sin(a) * s); life[i] = 0.22 + Math.random() * 0.18;
      }
    },
    step(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        vel[i].y -= 9.8 * dt; pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; life[i] -= dt;
      }
      g.attributes.position.needsUpdate = g.attributes.life.needsUpdate = true;
    },
  };
})() : null;

// ── 부드러운 김·먼지: 가장자리가 잡음으로 흩어지는 둥근 알갱이 ─────────────
// 구름 덩이가 병 밖으로 나오면 이것으로 흩어지고, 모래가 떨어진 자리의 먼지도 이것으로 그림
// 이끼 계단의 반딧불: 계단 위를 느리게 떠다니며 깜빡임(비 갠 여름밤의 생기)
const fire = MOSS ? (() => {
  const N = 26, p = new Float32Array(N * 3), s = new Float32Array(N);
  for (let i = 0; i < N; i++) { p.set([Fc.x + (Math.random() - 0.5) * 6, SEA_Y + 0.3 + Math.random() * 0.9, jp.z - 0.8 - Math.random() * 4.5], i * 3); s[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('seed', new THREE.BufferAttribute(s, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uTime: seaU.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime;attribute float seed;varying float vA;
      void main(){float t=uTime*(.12+.1*seed)+seed*50.;
        vec3 q=position+vec3(sin(t*1.1)+.5*sin(t*2.3+seed*9.),.25*sin(t*1.7+seed*4.),cos(t*.9)+.5*cos(t*1.9+seed*6.))*.45;
        vA=pow(max(sin(uTime*(.5+.5*seed)+seed*30.),0.),3.);                               // 느리게 켜졌다 꺼짐
        vec4 mv=modelViewMatrix*vec4(q,1.);gl_PointSize=clamp(70./-mv.z,3.,10.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: 'varying float vA;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vec3(.8,1.,.42)*vA*smoothstep(.5,.05,r)*2.6,1.);}',
  }));
  pts.frustumCulled = false; pts.visible = false; scene.add(pts); return pts;
})() : null;
const mist = (() => {
  const N = 900, pos = new Float32Array(N * 3), tint = new Float32Array(N * 3), size = new Float32Array(N), life = new Float32Array(N), seed = new Float32Array(N), alpha = new Float32Array(N);
  const life0 = new Float32Array(N), grow = new Float32Array(N), drag = new Float32Array(N), grav = new Float32Array(N), vel = Array.from({ length: N }, () => V(0, 0, 0));
  const g = new THREE.BufferGeometry();
  [['position', pos, 3], ['tint', tint, 3], ['size', size, 1], ['life', life, 1], ['seed', seed, 1], ['alpha', alpha, 1]].forEach(([n, a, s]) => g.setAttribute(n, new THREE.BufferAttribute(a, s)));
  const U = { uPx: { value: 800 } };
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'uniform float uPx;attribute vec3 tint;attribute float size,life,seed,alpha;varying vec3 vT;varying float vA,vS;void main(){vT=tint;vS=seed;vA=alpha*smoothstep(0.,.35,life)*smoothstep(1.,.85,life);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=vA>0.?size*uPx/-mv.z:0.;gl_Position=projectionMatrix*mv;}',
    fragmentShader: GLSL + /* glsl */`
      varying vec3 vT;varying float vA,vS;
      void main(){
        vec2 c=gl_PointCoord-.5;float r=length(c)*2.;
        float n=fbm(c*3.2+vS*17.)+.5*fbm(c*7.+vS*5.);                    // 가장자리가 뭉게뭉게 흩어짐
        float a=smoothstep(1.,.15,r+(n-.75)*.9);
        if(a<.01)discard;
        gl_FragColor=vec4(vT*mix(.72,1.08,1.-gl_PointCoord.y)*(.9+.2*n),a*vA);   // 위는 밝고 아래는 그늘
      }`,
  }));
  pts.frustumCulled = false; pts.renderOrder = 2; scene.add(pts);
  let k = 0;
  return {
    pts,
    emit(x, y, z, vx, vy, vz, s, l, col, a, gr = 0.6, dr = 1.2, gv = 0) {
      const i = k++ % N; pos.set([x, y, z], i * 3); vel[i].set(vx, vy, vz); size[i] = s; life0[i] = l; life[i] = 1;
      tint.set(col, i * 3); alpha[i] = a; grow[i] = gr; drag[i] = dr; grav[i] = gv; seed[i] = Math.random();
    },
    step(dt) {
      U.uPx.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        const o = i * 3; life[i] -= dt / life0[i];
        vel[i].y -= grav[i] * dt; vel[i].multiplyScalar(Math.max(0, 1 - drag[i] * dt));
        pos[o] += vel[i].x * dt; pos[o + 1] += vel[i].y * dt; pos[o + 2] += vel[i].z * dt; size[i] *= 1 + grow[i] * dt;
        const fl = SEA_Y + size[i] * 0.22;
        if (pos[o + 1] < fl) { pos[o + 1] = fl; if (vel[i].y < 0) { const h = Math.hypot(vel[i].x, vel[i].z) + 1e-4, sp = -vel[i].y * 0.6; vel[i].x += vel[i].x / h * sp; vel[i].z += vel[i].z / h * sp; vel[i].y = 0; } }   // 바닥에 닿으면 옆으로 깔리며 퍼짐
      }
      ['position', 'tint', 'size', 'life', 'seed', 'alpha'].forEach((n) => { g.attributes[n].needsUpdate = true; });
    },
  };
})();

// ── 병에서 쏟아지는 줄기 ─────────────────────────────────────────────
// 입구에서 바닥까지 이어진 한 줄기(리본)로 그리고, 떨어진 자리에서 알갱이·물방울·김이 튐.
// 구름은 느리게 흘러내리며 넓어지는 김, 파도는 금빛 모래와 물, 이끼는 끊겼다 이어지는 이끼 덩이와 물
const POUR = WAVE ? { g: 9.8, v: 0.5, w: 0.03, kind: 0, c1: [0.8, 0.66, 0.42], c2: [0.55, 0.7, 0.9], rate: 420, a: 0.95, mats: [[0.78, 0.64, 0.42, 0.006, 0.8], [0.6, 0.74, 0.92, 0.006, 1]] }
  : MOSS ? { g: 9.8, v: 0.45, w: 0.034, kind: 1, c1: [0.14, 0.24, 0.08], c2: [0.55, 0.7, 0.88], rate: 300, a: 0.95, mats: [[0.14, 0.24, 0.08, 0.012, 0.6], [0.62, 0.74, 0.92, 0.006, 1]] }
  : { g: 3.2, v: 0.25, w: 0.08, kind: 2, c1: [0.96, 0.97, 1], c2: [0.78, 0.84, 0.97], rate: 160, a: 0.3, mats: [[0.95, 0.96, 1, 0.07, 1]] };
const spill = (() => {
  // 1) 줄기: 입구에서 포물선을 따라 바닥까지 이어지는 띠. 화면을 향해 펼침
  const S = 48, sPos = new Float32Array(S * 2 * 3), sUv = new Float32Array(S * 2 * 2), idx = [];
  for (let i = 0; i < S; i++) { sUv.set([0, i / (S - 1), 1, i / (S - 1)], i * 4); if (i < S - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sg.setAttribute('uv', new THREE.BufferAttribute(sUv, 2)); sg.setIndex(idx);
  const sU = { uMix: { value: 0 }, uTime: { value: 0 }, uC1: { value: new THREE.Vector3(...POUR.c1) }, uC2: { value: new THREE.Vector3(...POUR.c2) }, uLit: { value: new THREE.Vector3(1.15, 0.95, 0.78) } };
  const ribbon = new THREE.Mesh(sg, new THREE.ShaderMaterial({
    uniforms: sU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);}',
    fragmentShader: GLSL + /* glsl */`
      uniform float uTime,uMix;uniform vec3 uC1,uC2,uLit;varying vec2 vUv;
      void main(){
        float x=vUv.x*2.-1.,y=vUv.y,core=1.-x*x;
        float n=fbm(vec2(x*2.5,y*7.-uTime*9.)),gr=vnoise(vec2(x*30.,y*160.-uTime*70.));   // 아래로 흘러내리는 결과 알갱이
        vec3 c;float a;
        ${POUR.kind === 0 ? `                                                                // 모래: 촘촘한 금빛 알갱이 줄기, 가끔 물이 섞여 반짝임
        c=uC1*(.6+.7*gr)*(.85+.3*n);c=mix(c,uC2*1.3,smoothstep(.62,.8,n)*.5);
        a=smoothstep(.0,.35,core*(.55+.7*n))*(.75+.25*gr);
        vec3 wc=uC2*(.45+.5*n)+vec3(1.,.95,.85)*pow(1.-abs(x),6.)*smoothstep(.5,.8,fbm(vec2(x*4.,y*3.-uTime*12.)))*.8;   // 물: 매끈하게 늘어진 줄기에 빛이 맺힘
        c=mix(c,wc,uMix);a=mix(a,core*(.55+.3*n),uMix);`
      : POUR.kind === 1 ? `                                                               // 이끼: 덩이가 끊겼다 이어지고 물이 실처럼 흐름
        float lump=smoothstep(.42,.6,fbm(vec2(x*1.5,y*4.-uTime*7.)));
        c=uC1*(.7+.6*gr);c=mix(c,uC2*1.2,(1.-lump)*.8);
        a=core*mix(.35,1.,lump)*smoothstep(.05,.3,core);`
      : `                                                                                  // 구름: 부드럽게 흘러내리며 퍼지는 김
        c=mix(uC2,uC1,n);a=pow(core,1.4)*(.25+.6*n)*.85;`}
        a*=smoothstep(0.,.05,y);                                                         // 입구에서 자연스럽게 시작
        gl_FragColor=vec4(c*uLit,a);
      }`,
  }));
  ribbon.frustumCulled = false; ribbon.visible = false; scene.add(ribbon);

  // 2) 튀는 것: 떨어진 자리에서 튀어 오르는 알갱이·물방울, 구름은 바닥을 타고 퍼지는 김
  const N = 900, flat = new Uint8Array(N), pos = new Float32Array(N * 3), tint = new Float32Array(N * 3), size = new Float32Array(N), life = new Float32Array(N), vel = Array.from({ length: N }, () => V(0, 0, 0));
  const g = new THREE.BufferGeometry();
  [['position', pos, 3], ['tint', tint, 3], ['size', size, 1], ['life', life, 1]].forEach(([n, a, s]) => g.setAttribute(n, new THREE.BufferAttribute(a, s)));
  const U = { uPx: { value: 800 }, uA: { value: POUR.a } };
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'uniform float uPx;attribute vec3 tint;attribute float size,life;varying vec3 vT;varying float vL;void main(){vT=tint;vL=life;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=life>0.?max(size*uPx/-mv.z,1.5):0.;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform float uA;varying vec3 vT;varying float vL;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vT*(1.15-r),uA*smoothstep(.5,.15,r)*min(vL*5.,1.));}',
  }));
  pts.frustumCulled = false; scene.add(pts);
  let k = 0, carry = 0, age = -1, tail = -1;
  const mouth = V(0, 0, 0), dir = V(0, 0, 0), p = V(0, 0, 0), q = V(0, 0, 0), side = V(0, 0, 0), tan = V(0, 0, 0), land = new THREE.Vector2();
  const at = (t, out) => out.set(mouth.x + dir.x * POUR.v * t, mouth.y + dir.y * POUR.v * t - 0.5 * POUR.g * t * t, mouth.z + dir.z * POUR.v * t);
  const emit = (x, y, z, vx, vy, vz, m, s) => {
    const i = k++ % N; flat[i] = 0; pos.set([x, y, z], i * 3); vel[i].set(vx, vy, vz);
    tint.set([m[0], m[1], m[2]].map((c) => c * (0.8 + Math.random() * 0.4)), i * 3); size[i] = m[3] * s; life[i] = 1.4;
  };
  const pick = () => { if (WAVE) return POUR.mats[Math.random() < content.mix ? 1 : 0]; const r = Math.random(); return POUR.mats.find((x) => r <= x[4]); };
  return {
    pts, ribbon, on: false, flow: 1, landed: 0, land,
    emit(x, y, z, vx, vy, vz, m) { emit(x, y, z, vx, vy, vz, m, 0.7 + Math.random() * 0.6); },
    burst(x, y, z, n, up, mats) { for (let j = 0; j < n; j++) { const a = Math.random() * 6.283, s = 0.1 + Math.random() * 0.35; emit(x, y, z, Math.cos(a) * s, up * (0.4 + Math.random() * 0.8), Math.sin(a) * s, mats[Math.floor(Math.random() * mats.length)], 0.6 + Math.random() * 0.8); } },
    mark(x, z) { if (!this.landed++) land.set(x, z); else land.lerp(new THREE.Vector2(x, z), 0.05); },
    step(dt, time) {
      sU.uMix.value += ((WAVE ? content.mix : 0) - sU.uMix.value) * Math.min(1, dt * 8);
      U.uPx.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)); sU.uTime.value = time;
      J.g.localToWorld(mouth.set(0, 0.205, 0)); dir.set(0, 1, 0).applyQuaternion(J.g.quaternion);
      const flowing = this.on && this.flow > 0.03;
      if (flowing && age < 0) { age = 0; tail = -1; }
      if (!flowing && age >= 0 && tail < 0) tail = 0;
      if (age >= 0) {
        age += dt; if (tail >= 0) tail += dt;
        const vy = dir.y * POUR.v, tEnd = (vy + Math.sqrt(vy * vy + 2 * POUR.g * Math.max(0.001, mouth.y - SEA_Y))) / POUR.g;   // 바닥에 닿는 데 걸리는 시간
        const t0 = tail < 0 ? 0 : Math.min(tEnd, tail * 1.4), t1 = Math.min(tEnd, age * 1.4);   // 머리가 내려가며 길어지고, 그치면 꼬리가 떨어져 내려감
        if (t0 >= tEnd - 1e-3) { age = -1; ribbon.visible = false; }
        else {
          ribbon.visible = true;
          for (let i = 0; i < S; i++) {
            const t = t0 + (t1 - t0) * (i / (S - 1)), u = t / tEnd;
            at(t, p); at(t + 0.01, q); tan.subVectors(q, p).normalize();
            side.subVectors(camera.position, p).cross(tan).normalize().multiplyScalar(POUR.w * (POUR.kind === 2 ? 1 + 1.6 * u : 1 - 0.35 * u) * Math.min(1, age * 4) * (0.35 + 0.65 * this.flow));
            sPos.set([p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z], i * 6);
          }
          sg.attributes.position.needsUpdate = true;
          if (tail < 0) for (let j = 0; j < Math.round(POUR.rate * 0.25 * this.flow * dt + Math.random() * 0.6); j++) {   // 줄기 가장자리에서 흩날리는 알갱이·물방울
            const t = Math.random() * t1; at(t, p);
            emit(p.x, p.y, p.z, dir.x * POUR.v + (Math.random() - 0.5) * 0.12, dir.y * POUR.v - POUR.g * t, dir.z * POUR.v + (Math.random() - 0.5) * 0.12, pick(), 0.6 + Math.random() * 0.5);
          }
          if (t1 >= tEnd - 1e-3 && tail < 0) {                                          // 바닥에 닿는 동안: 그 자리에 쌓이며 튐
            at(tEnd, p); this.mark(p.x, p.z);
            if (Math.random() < dt * 30 * this.flow) mist.emit(p.x + (Math.random() - 0.5) * 0.04, SEA_Y + 0.02, p.z + (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.2, 0.05 + Math.random() * 0.08, (Math.random() - 0.5) * 0.2,
              0.05 + Math.random() * 0.04, 1 + Math.random(), WAVE ? [0.8, 0.68, 0.5] : [0.62, 0.7, 0.8], WAVE ? 0.18 : 0.14, 0.9, 2, -0.02);   // 떨어진 자리에서 피어오르는 고운 먼지·물보라
            for (carry += POUR.rate * this.flow * dt; carry >= 1; carry--) {
              const a = Math.random() * 6.283, s = (POUR.kind === 2 ? 0.25 : 0.15) + Math.random() * 0.35;
              emit(p.x, SEA_Y + 0.005, p.z, Math.cos(a) * s, POUR.kind === 2 ? 0.05 : 0.35 + Math.random() * 0.7, Math.sin(a) * s, pick(), 0.7 + Math.random() * 0.6);
            }
          }
        }
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        const o = i * 3; life[i] -= dt;
        if (!flat[i]) vel[i].y -= (POUR.kind === 2 ? 0.6 : 9.8) * dt;
        pos[o] += vel[i].x * dt; pos[o + 1] += vel[i].y * dt; pos[o + 2] += vel[i].z * dt;
        if (POUR.kind === 2) { size[i] = Math.min(size[i] * (1 + dt * 1.5), 0.2); vel[i].multiplyScalar(1 - dt * 1.2); life[i] = Math.min(life[i], 0.9); }   // 김은 부풀며 느려짐
        else if (pos[o + 1] < SEA_Y) life[i] = 0;
      }
      ['position', 'tint', 'size', 'life'].forEach((n) => { g.attributes[n].needsUpdate = true; });
    },
  };
})();

// ── 병 속 내용물이 중력대로 움직임 ─────────────────────────────────────
// 파도(물과 모래): 병이 어떻게 기울든 윗면은 늘 수평. 그 수평면이 입구 턱보다 높아진 만큼만 흘러나옴(물이 위라 먼저, 모래는 나중).
// 구름·이끼(덩이): 병 안에서는 중력 쪽으로 미끄러지고 구르다 입구를 넘으면 밖으로 떨어져 바닥에 닿고, 바닥이 번질 때 스며들 듯 가라앉음
renderer.localClippingEnabled = true;
const content = (() => {
  const R = 0.066, TOPY = 0.2, BOT = 0.004, G = 9.8, RN = 0.058;   // 병 안쪽 반지름, 입구 높이, 바닥, 중력, 입구 반지름
  let active = false, flow = 0, mix = 0, left = 1;
  const kids = J.inner.children.slice(), saved = kids.map((m) => ({ m, p: m.position.clone(), r: m.rotation.clone(), s: m.scale.clone() }));
  const gL = V(0, 0, 0), qi = new THREE.Quaternion(), tmp = V(0, 0, 0);

  // ── 덩이(구름, 이끼) ──
  let bodies = [], blk = null;
  const makeBodies = () => {
    bodies = [];
    let list = kids;
    if (MOSS) {                                   // 흙·흙 윗면·이끼 언덕은 한 덩어리로 같이 미끄러짐
      blk = new THREE.Group(); J.inner.add(blk); kids.slice(0, 3).forEach((m) => blk.attach(m));
      bodies.push({ m: blk, p: V(0, 0.035, 0), o: V(0, -0.035, 0), rr: R - 0.002, ra: 0.034, rs: 0.04, v: V(0, 0, 0) });
      list = kids.slice(3);
    }
    list.forEach((m) => {
      m.geometry.computeBoundingSphere();
      const r = m.geometry.boundingSphere.radius * Math.max(m.scale.x, m.scale.y) * 0.8;
      bodies.push({ m, p: m.position.clone(), o: V(0, 0, 0), rr: Math.min(r, R - 0.004), ra: r, rs: r, v: V(0, 0, 0) });
    });
  };
  const stepBodies = (dt) => {
    qi.copy(J.g.quaternion).invert();
    gL.set(0, -G * (KIND === 3 ? 0.45 : 1), 0).applyQuaternion(qi);                 // 병 기준으로 본 중력(구름은 가벼움)
    let exited = 0;
    for (const b of bodies) {
      if (b.world) continue;
      b.v.addScaledVector(gL, dt).multiplyScalar(1 - dt * (KIND === 3 ? 2.5 : 0.8));
      b.p.addScaledVector(b.v, dt);
      const rr = Math.hypot(b.p.x, b.p.z), lim = R - b.rr;
      if (rr > lim) { const k = lim / rr; b.p.x *= k; b.p.z *= k; const vr = (b.v.x * b.p.x + b.v.z * b.p.z) / Math.max(lim, 1e-4); if (vr > 0) { b.v.x -= vr * b.p.x / Math.max(lim, 1e-4); b.v.z -= vr * b.p.z / Math.max(lim, 1e-4); } b.v.multiplyScalar(1 - Math.min(1, dt * 5)); }   // 유리벽에 닿으면 미끄러지며 마찰
      if (b.p.y < BOT + b.ra) { b.p.y = BOT + b.ra; if (b.v.y < 0) b.v.y *= -0.15; b.v.x *= 1 - Math.min(1, dt * 6); b.v.z *= 1 - Math.min(1, dt * 6); }
      if (b.p.y > TOPY + b.ra * 0.3) {                                                   // 입구를 넘음 → 밖으로 떨어짐
        b.world = true; exited++;
        const wv = b.v.clone().applyQuaternion(J.g.quaternion);
        scene.attach(b.m); if (b.m === blk) b.m.visible = false;   // 이끼 흙덩이는 부스러기로 풀어짐(구름 덩이는 그대로 보이며 떨어짐)
        b.wv = wv.add(V((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15)); b.av = V((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        continue;
      }
      b.m.position.copy(b.p).add(b.o);
    }
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {   // 덩이끼리 겹치지 않게 밀어냄
      const a = bodies[i], c = bodies[j]; if (a.world || c.world) continue;
      tmp.subVectors(c.p, a.p); const d = tmp.length(), md = (a.rs + c.rs) * 0.8;
      if (d < md && d > 1e-5) { tmp.multiplyScalar((md - d) / d * 0.5); a.p.sub(tmp); c.p.add(tmp); }
    }
    for (const b of bodies) {                                                            // 밖으로 나온 덩이: 떨어지고 구르다 바닥에 닿음
      if (!b.world) continue;
      const m = b.m;
      if (KIND === 3 && !b.gone && Math.random() < dt * 12) {                          // 구름: 떨어지는 덩이 뒤로 옅은 김 한 가닥씩
        mist.emit(m.position.x, m.position.y, m.position.z, b.wv.x * 0.3, b.wv.y * 0.3, b.wv.z * 0.3, b.ra * 0.9, 0.9 + Math.random() * 0.5, [0.95, 0.96, 1], 0.16, 0.8, 2, 0.1);
      }
      if (b.m === blk && !b.landed) {                                                   // 이끼 흙덩이: 떨어지는 동안 흙·이끼 부스러기가 쏟아짐
        const n = Math.round(dt * 520 + Math.random()), C = [[0.13, 0.22, 0.07, 0.011], [0.2, 0.14, 0.09, 0.009], [0.1, 0.17, 0.06, 0.015], [0.55, 0.68, 0.86, 0.005]];
        for (let j = 0; j < n; j++) spill.emit(m.position.x + (Math.random() - 0.5) * 0.08, m.position.y + (Math.random() - 0.5) * 0.06, m.position.z + (Math.random() - 0.5) * 0.08,
          b.wv.x + (Math.random() - 0.5) * 0.25, b.wv.y * (0.6 + Math.random() * 0.5), b.wv.z + (Math.random() - 0.5) * 0.25, C[Math.floor(Math.random() * C.length)]);
      }
      if (!b.landed) {
        b.wv.y -= G * (KIND === 3 ? 0.45 : 1) * dt; if (KIND === 3) b.wv.multiplyScalar(1 - dt * 1.2);
        m.position.addScaledVector(b.wv, dt); m.rotation.x += b.av.x * dt; m.rotation.z += b.av.z * dt;
        if (m.position.y < SEA_Y + b.ra * 0.6) {
          m.position.y = SEA_Y + b.ra * 0.6; b.wv.y *= -0.2; b.wv.x *= 0.5; b.wv.z *= 0.5; b.av.multiplyScalar(0.4);
          if (!b.hit) {                                                                  // 처음 닿는 순간
            b.hit = 1; const P = m.position;
            if (KIND === 3) for (let j = 0; j < 6; j++) { const a = Math.random() * 6.283, sp = 0.15 + Math.random() * 0.25; mist.emit(P.x, SEA_Y + 0.02, P.z, Math.cos(a) * sp, 0.02, Math.sin(a) * sp, b.ra * 1.3, 1.2 + Math.random(), [0.95, 0.96, 1], 0.14, 0.4, 1.4, 0); }   // 바닥에 닿으면 옅게 번짐
            if (MOSS) spill.burst(P.x, SEA_Y + 0.01, P.z, 10 + Math.round(b.ra * 300), 1, [[0.14, 0.22, 0.07, 0.008], [0.2, 0.15, 0.1, 0.007], [0.6, 0.72, 0.9, 0.005]]);   // 이끼 부스러기·흙·물방울
          }
          if (Math.abs(b.wv.y) < 0.08) { b.landed = 0.001; spill.mark(m.position.x, m.position.z); if (KIND === 3) b.gone = 1; }
        }
      } else {
        b.landed += dt; m.position.x += b.wv.x * dt; m.position.z += b.wv.z * dt; b.wv.multiplyScalar(1 - dt * 3);
        if (b.landed > 0.5) { const k = Math.max(0.001, 1 - (b.landed - 0.5) / 2.2); m.scale.setScalar(k * (b.s0 ??= m.scale.x)); if (k <= 0.001) m.visible = false; }   // 번지는 바닥에 스며들듯 가라앉음
      }
    }
    return exited;
  };

  // ── 물과 모래(파도) ──
  let fill = null;
  const makeFill = () => {
    const [sandM, , sideM, topM] = kids.map((m) => m.material);
    const pS = new THREE.Plane(V(0, -1, 0), 0), pW = new THREE.Plane(V(0, -1, 0), 0), pWS = new THREE.Plane(V(0, 1, 0), 0);
    const geo = new THREE.CylinderGeometry(R - 0.0006, R - 0.0006, TOPY - BOT, 48, 1, false);
    const mk = (src, planes) => { const m = src.clone(); m.clippingPlanes = planes; m.side = THREE.DoubleSide; return m; };
    const sand = new THREE.Mesh(geo, mk(sandM, [pS])), water = new THREE.Mesh(geo, mk(sideM, [pW, pWS]));
    sand.position.y = water.position.y = (TOPY + BOT) / 2; J.g.add(sand, water);
    // 윗면(수평): 넓은 판을 그 높이에 두고 병 안쪽만 남김
    const cap = (col, spec) => {
      const u = { uInv: { value: new THREE.Matrix4() }, uCol: { value: new THREE.Vector3(...col) }, uSpec: { value: spec } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
        uniforms: u, vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
        fragmentShader: GLSL + `uniform mat4 uInv;uniform vec3 uCol;uniform float uSpec;varying vec3 vW;
          void main(){vec3 l=(uInv*vec4(vW,1.)).xyz;if(length(l.xz)>${R - 0.0006}||l.y<${BOT}||l.y>${TOPY})discard;
            float n=vnoise(vW.xz*700.),r=vnoise(vW.xz*90.+vW.y*40.);
            gl_FragColor=vec4(uCol*(.8+.35*n)+uSpec*vec3(1.,.9,.75)*smoothstep(.55,.9,r)*.6,1.);}`,
      }));
      m.frustumCulled = false; scene.add(m); return { m, u };
    };
    const cS = cap([0.78, 0.6, 0.36], 0), cW = cap([0.1, 0.2, 0.36], 1);
    const N = 700, pts = new Float32Array(N * 3), ys = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = Math.random() * 6.283, r = R * Math.sqrt(Math.random()); pts.set([Math.cos(a) * r, BOT + Math.random() * (TOPY - BOT), Math.sin(a) * r], i * 3); }
    fill = { sand, water, pS, pW, pWS, cS, cW, pts, ys, N, vs: 0.306, vw: 0.296 };
  };
  const level = (f) => { const { ys, N } = fill; if (f <= 0) return ys[0] - 1e-3; if (f >= 1) return ys[N - 1] + 1e-3; return ys[Math.min(N - 1, Math.floor(f * N))]; };
  const stepFill = (dt) => {
    J.g.updateMatrixWorld(); const e = J.g.matrixWorld.elements, { pts, ys, N } = fill;
    for (let i = 0; i < N; i++) { const o = i * 3; ys[i] = e[1] * pts[o] + e[5] * pts[o + 1] + e[9] * pts[o + 2] + e[13]; }
    ys.sort();
    const hs = level(fill.vs), hw = level(fill.vs + fill.vw);
    const ay = e[5] / Math.hypot(e[4], e[5], e[6]), mouthY = e[5] * TOPY + e[13], lip = mouthY - RN * Math.sqrt(Math.max(0, 1 - ay * ay));   // 입구 테두리에서 가장 낮은 곳
    const qw = 45 * Math.max(0, hw - Math.max(lip, hs)) ** 1.5, qs = 26 * Math.max(0, hs - lip) ** 1.5;   // 턱을 넘은 높이만큼 흘러나옴
    fill.vw = Math.max(0, fill.vw - qw * dt); fill.vs = Math.max(0, fill.vs - qs * dt);
    flow = Math.min(1, (qw + qs) / 0.25); mix = qw / (qw + qs + 1e-6);
    fill.pS.constant = hs; fill.pW.constant = hw; fill.pWS.constant = -hs;
    fill.sand.visible = fill.vs > 0.002; fill.water.visible = fill.vw > 0.002;
    const inv = J.g.matrixWorld.clone().invert(), c = J.g.localToWorld(V(0, 0.1, 0));
    [[fill.cS, hs, fill.vs], [fill.cW, hw, fill.vw]].forEach(([cp, h, v]) => { cp.m.visible = v > 0.002; cp.m.position.set(c.x, h, c.z); cp.u.uInv.value.copy(inv); });
    left = (fill.vs + fill.vw) / 0.602;
  };

  return {
    get flow() { return flow; }, get mix() { return mix; }, get left() { return left; },
    start() {
      active = true; flow = 0; left = 1;
      if (WAVE) { J.inner.visible = false; makeFill(); } else makeBodies();
    },
    step(dt) {
      if (!active) return;
      if (WAVE) { stepFill(dt); return; }
      const ex = stepBodies(dt);
      flow = Math.min(1, flow * Math.exp(-dt * 2.5) + ex * 0.45);                     // 덩이가 빠져나갈 때마다 김·물줄기가 따라 흐름
      left = bodies.filter((b) => !b.world).length / bodies.length;
    },
    reset() {                                                                          // 다시 담을 때: 모두 제자리로
      active = false; flow = 0;
      if (fill) { [fill.sand, fill.water].forEach((m) => m.removeFromParent()); [fill.cS, fill.cW].forEach((c) => c.m.removeFromParent()); fill = null; }
      saved.forEach(({ m, p, r, s }) => { J.inner.add(m); m.position.copy(p); m.rotation.copy(r); m.scale.copy(s); m.visible = true; });
      if (blk) { blk.removeFromParent(); blk = null; }
      bodies = [];
    },
  };
})();

// ── 밤하늘, 안개 막, 하늘에서 쓰는 빛 ─────────────────────────────────
const skyU = { uRise: { value: -0.16 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: GLSL + /* glsl */`
    uniform float uRise;varying vec3 vD;
    void main(){
      vec3 d=normalize(vD),L=normalize(${MOON}+vec3(0.,uRise,0.));               // uRise<0이면 달이 구름 아래에 있음
      vec3 c=mix(vec3(.035,.055,.11),vec3(.004,.008,.024),pow(clamp(d.y*1.5,0.,1.),.55));
      float m=max(dot(d,L),0.),up=smoothstep(-.09,.02,L.y);
      c+=vec3(.42,.52,.78)*(pow(m,900.)*.5+pow(m,60.)*.2+pow(m,7.)*.07)*up;      // 달무리
      c+=vec3(.2,.26,.42)*exp(-abs(d.y)*11.)*pow(max(dot(normalize(d.xz),normalize(L.xz)),0.),10.)*.55*up;   // 달 아래 지평선이 밝아짐
      vec3 g=floor(d*230.);c+=step(.9984,hash(g.xy+g.z*7.))*vec3(.8,.85,1.)*smoothstep(.03,.35,d.y)*(1.-pow(m,30.))*.9;  // 별(달 곁은 묻힘)
      vec2 mu=(d.xy-L.xy)/.03;float rr=dot(mu,mu);                               // 달: 반지름 약 1.7도
      vec3 face=vec3(1.5,1.42,1.22)*(.72+.28*fbm(mu*1.7+4.))*(1.-.3*rr);         // 얼룩과 가장자리 어두워짐
      c=mix(c,face,smoothstep(1.,.86,rr));
      gl_FragColor=vec4(c,1.);
    }`,
}));
sky.visible = false; scene.add(sky);
// uMode 1: 쏟은 자리(uC)에서 동그랗게 번져 화면을 덮고(uIn), 다시 가운데부터 걷힘(uOut). 0: 아래에서 피어오르는 안개(다시 담을 때)
const veilU = { uVeil: { value: 0 }, uTime: { value: 0 }, uSky: { value: 0 },
  uMode: { value: 0 }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uIn: { value: 0 }, uOut: { value: 0 }, uAsp: { value: 1 },
  uCol: { value: new THREE.Color(...(WAVE ? [0.22, 0.34, 0.48] : MOSS ? [0.08, 0.16, 0.08] : [0.8, 0.84, 0.94])) } };
const veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: veilU, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: GLSL + /* glsl */`
    uniform float uVeil,uTime,uSky,uMode,uIn,uOut,uAsp;uniform vec2 uC;uniform vec3 uCol;varying vec2 vUv;
    void main(){
      float n=fbm(vUv*vec2(3.2,2.)+vec2(uTime*.15,-uTime*.4))*.6+fbm(vUv*7.-uTime*.2)*.4;
      if(uMode>.5){
        vec2 q=(vUv-uC)*vec2(uAsp,1.);float d=length(q)+(fbm(q*2.2+uTime*.3)-.5)*.35+(n-.5)*.12;   // 가장자리가 물결처럼 들쭉날쭉
        float a=(1.-smoothstep(uIn-.18,uIn,d))*smoothstep(uOut-.25,uOut,d);
        vec3 c=uCol*(.55+.6*n)+mix(uCol,vec3(1.),.5)*exp(-pow((d-uIn)/.06,2.))*step(uOut,.01);   // 밀려가는 끝이 거품처럼 밝음
        gl_FragColor=vec4(c,a);return;
      }
      float a=smoothstep(0.,1.,uVeil*1.9-(1.-n)*.9-(1.-vUv.y)*.25*(1.-uVeil));   // 아래에서 피어올라 화면을 덮음
      vec3 c=mix(vec3(.80,.68,.54),vec3(.52,.58,.74),uSky)*(.5+.5*n);
      gl_FragColor=vec4(c,a);
    }`,
}));
veil.frustumCulled = false; veil.renderOrder = 999; scene.add(veil);
const moon = new THREE.DirectionalLight(0x9db4ff, 1.5); moon.position.set(1.7, 1.15, -9.8);
const under = new THREE.PointLight(0xffa860, 0.3, 1.6, 2);   // 병 아래 따뜻한 빛(병이 번쩍이지 않게 약하게) under.position.set(jp.x - 0.2, SEA_Y + 0.02, jp.z + 0.05);
const amb = new THREE.AmbientLight(0x243154, 0.9);
const mine = [moon, under, amb]; mine.forEach((l) => { l.visible = false; scene.add(l); });

// ── Fab(Quixel Megascans) 소품: 이끼 계단의 바위·고사리, 바닷가의 유목·조개 ─────────
// 바닥 높이는 셰이더와 같은 식을 자바스크립트로 옮겨 계산하고, 쏟은 자리에서 번진 가장자리가 지나가면 나타남
const props = (() => {
  if (!WAVE && !MOSS) return null;
  const fr = (x) => x - Math.floor(x), ss = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (x, y) => { let px = fr(x * 123.34), py = fr(y * 456.21); const d = px * (px + 45.32) + py * (py + 45.32); return fr((px + d) * (py + d)); };
  const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy; };
  const fbm = (x, y) => { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * vn(x, y); [x, y] = [1.6 * x - 1.2 * y, 1.2 * x + 1.6 * y]; a *= 0.5; } return v; };
  const mossH = (x, z) => {                                                                // MOSS_FN의 mossH와 같은 식
    const k = THREE.MathUtils.clamp((jp.z - 0.45 - z + 0.06 * (fbm(x * 0.8, 1.3) - 0.5)) / 0.46, 0, 5), i = Math.floor(k), f = k - i, sx = x / 0.62 + hash(i, 3);
    let h = 0.1 * (i + ss(0.86, 1, f)) + 0.012 * (hash(i, Math.floor(sx)) - 0.5) * (f <= 0.86 ? 1 : 0);
    const side = ss(1, 1.5, Math.abs(x - Fc.x)); h = h * (1 - side) + (0.1 * k + 0.12 + 0.12 * fbm(x * 1.3, z * 1.3)) * side;
    h += 0.022 * ss(0.35, 0.8, fbm(x * 3.1, z * 3.1)) + 0.006 * vn(x * 25, z * 25);
    const far = Math.hypot(x - jp.x, z - jp.z); return h - 0.7 * ss(4, 14, far) + 0.25 * (fbm(x * 0.12, z * 0.12) - 0.5) * ss(5, 25, far);
  };
  const shoreZ = (x) => tU.uZ0.value + 0.45 * (fbm(x * 0.35, 3.7) - 0.5);
  const ground = (x, z) => SEA_Y + (MOSS ? mossH(x, z) : -0.03 * ss(0, -2, z - shoreZ(x)));
  const g = new THREE.Group(); scene.add(g);
  const items = [];
  // 받은 모델을 크기(가장 긴 쪽, m)에 맞추고 바닥 가운데를 원점으로 둠
  const fit = (src, size) => {
    const o = src.clone(true), box = new THREE.Box3().setFromObject(o), sz = box.getSize(V(0, 0, 0)), c = box.getCenter(V(0, 0, 0));
    const k = size / Math.max(sz.x, sz.z); o.position.set(-c.x, -box.min.y, -c.z); const w = new THREE.Group(); w.add(o); w.scale.setScalar(k); w.userData.h = sz.y * k; return w;
  };
  // 발밑 접촉 그림자: 물건이 바닥에 닿은 자리를 부드럽게 어둡게(떠 보이지 않게). 바닥이 직접 그린 셰이더라 그림자 지도 대신 씀
  const blobMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(0,0,0,.8)'); gr.addColorStop(0.45, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })() });
  const blob = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat); m.renderOrder = 1; return m; };
  // embed: 물건 높이의 몇 할을 바닥에 묻을지(바위는 20~40%가 자연스러움)
  const put = (src, x, z, size, ry, embed = 0.25) => {
    const w = fit(src, size), k = w.scale.x; w.rotation.y = ry; w.position.set(x, ground(x, z) - embed * w.userData.h, z); w.visible = false;
    w.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material; o.castShadow = o.receiveShadow = true;
      m.envMapIntensity = MOSS ? 0.3 : 0.45; if (m.map) m.map.anisotropy = 8;            // 쏟은 뒤에는 밤하늘 사진이 은은하게 비침(세면 돌이 하얗게 뜸)
      if (MOSS && !m.userData.night) { m.userData.night = 1; m.color.multiply(new THREE.Color(0.6, 0.66, 0.64)); }   // 비 갠 밤빛으로 차갑고 어둡게
      if (m.map && !m.emissiveMap) {                                                     // 달을 등진 면이 새까매지지 않을 만큼만 밝힘
        m.emissiveMap = m.map; if (m.alphaTest > 0) m.emissive.setRGB(0.12, 0.15, 0.11); else if (WAVE) m.emissive.setRGB(0.06, 0.07, 0.09); else m.emissive.setRGB(0.035, 0.045, 0.05);
      }
    });
    const d = blob(); d.scale.set(size * 1.3 / k, 1, size * 1.1 / k); d.position.y = (embed * w.userData.h + 0.006) / k; w.add(d);
    g.add(w); items.push(w);
  };
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // 매번 같은 배치가 나오게 정해진 순서의 난수
  const around = (cx, cz, r0, r1) => { const a = rnd() * 6.283, r = r0 + (r1 - r0) * rnd(); return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; };
  const load = (f) => new GLTFLoader().loadAsync(fabURL(f)).then((r) => r.scene);
  let ready = null;
  if (MOSS) ready = Promise.all([load('mossy_rock_formation.glb'), load('mossy_rock.glb'), load('fern/fern.gltf')]).then(([big, rock, fern]) => {
    const ferns = ['SM_rmAsg_VarA', 'SM_rmAsg_VarB', 'SM_rmAsg_VarC', 'SM_rmAsg_VarD'].map((n) => fern.getObjectByName(n)).filter(Boolean);
    // 무리 하나 = 큰 바위 1 + 중간 2~3 + 작은 돌 5~7 + 바위 밑동의 고사리. 크기 ±25%, 회전 무작위, 높이의 25~40%를 묻음
    const cluster = (cx, cz, size, mids, smalls, nf) => {
      put(big, cx, cz, size * (0.85 + 0.3 * rnd()), rnd() * 6.28, 0.3);
      for (let i = 0; i < mids; i++) { const [x, z] = around(cx, cz, size * 0.45, size * 0.8); put(rock, x, z, size * (0.26 + 0.14 * rnd()), rnd() * 6.28, 0.3); }
      for (let i = 0; i < smalls; i++) { const [x, z] = around(cx, cz, size * 0.35, size * 1.2); put(rock, x, z, size * (0.06 + 0.07 * rnd()), rnd() * 6.28, 0.4); }
      for (let i = 0; i < nf; i++) { const [x, z] = around(cx, cz, size * 0.5, size * 0.95); put(ferns[i % ferns.length], x, z, 0.3 + 0.25 * rnd(), rnd() * 6.28, 0); }
    };
    cluster(Fc.x - 1.95, jp.z - 2.6, 1.6, 3, 7, 5);                                         // 왼쪽 언덕 아래
    cluster(Fc.x + 2.05, jp.z - 3.7, 1.3, 2, 5, 4);                                         // 오른쪽 언덕 위쪽
    for (let i = 0; i < 4; i++) {                                                           // 계단 가장자리, 다음 단 앞면 밑에 쓸려 와 멈춘 작은 돌
      const s = i % 2 ? 1 : -1, z = jp.z - 0.45 - 0.46 * (i + 0.8);
      put(rock, Fc.x + s * (0.82 + 0.15 * rnd()), z, 0.12 + 0.08 * rnd(), rnd() * 6.28, 0.35);
    }
    for (let i = 0; i < 8; i++) {                                                           // 계단 가장자리 이음매를 따라 듬성듬성 고사리
      const s = i % 2 ? 1 : -1; put(ferns[i % ferns.length], Fc.x + s * (0.95 + 0.3 * rnd()), jp.z - 0.9 - 2.4 * (i / 7), 0.26 + 0.16 * rnd(), rnd() * 6.28, 0);
    }
  });
  if (WAVE) ready = Promise.all([load('driftwood.glb'), load('seashells.glb')]).then(([wood, shells]) => {
    const z0 = (x, s) => shoreZ(x) + s;                                                    // 물가 선에서 s만큼 뭍 쪽(1.75 근처가 파도가 가장 높이 올라온 해초 줄)
    const one = (n) => { const o = shells.clone(true), drop = []; o.traverse((m) => { if (m.isMesh && !m.name.includes(`_00${n}_`)) drop.push(m); }); drop.forEach((m) => m.removeFromParent()); return o; };   // 세트의 조개 셋을 하나씩 따로
    const sh = [0, 1, 2].map(one);
    // 유목은 해초 줄에 물가와 나란히 누움. 조개는 유목에 걸려 모이고, 나머지는 해초 줄을 따라 드문드문
    const log = (x, s, size, n) => {
      const z = z0(x, s); put(wood, x, z, size, (rnd() - 0.5) * 0.6, 0.35);
      for (let i = 0; i < n; i++) { const [sx, sz] = around(x, z + 0.06, size * 0.25, size * 0.6); put(sh[i % 3], sx, sz, 0.035 + 0.025 * rnd(), rnd() * 6.28, 0.3); }
    };
    log(Fc.x + 1.4, 1.8, 1.4, 4); log(Fc.x - 1.75, 1.65, 0.85, 3);
    for (let i = 0; i < 4; i++) { const x = Fc.x - 1 + 2.2 * rnd(); put(sh[i % 3], x, z0(x, 1.7 + 0.15 * rnd()), 0.035 + 0.02 * rnd(), rnd() * 6.28, 0.3); }
  });
  const jb = blob(); jb.scale.set(0.34, 1, 0.2); jb.visible = false; g.add(jb);                // 눕힌 빈 병 밑 그림자
  return {
    get ready() { return ready; },
    step() {                                                                               // 번진 가장자리가 닿은 소품만 보임
      const sky = seaU.uSky.value > 0, r = seaU.uR.value, src = seaU.uSrc.value;
      for (const w of items) w.visible = sky && (r >= 60 || r - Math.hypot(w.position.x - src.x, w.position.z - src.y) > 0.1);
      const P = J.g.position; jb.visible = sky && Math.abs(J.g.rotation.z) > 1.2 && P.y < SEA_Y + 0.2;
      if (jb.visible) jb.position.set(P.x, ground(P.x, P.z) + 0.006, P.z);
    },
  };
})();
// ── 부피 구름(레이마칭) ─────────────────────────────────────────────
// 가까운 구름(카메라에서 9m 안)을 표면 한 장이 아니라 얇은 구름층으로 그림: 빛이 안으로 스미고 가장자리가 흩어짐.
// 먼 구름과 휴대폰은 위의 표면 방식을 그대로 씀.
// 기본으로 켬. 주소 끝에 ?flat 을 붙이면 예전 표면 방식으로 비교해 볼 수 있음. 폭 760px 이하 화면에서는 끔(휴대폰 성능)
const vol = KIND === 3 && !new URLSearchParams(location.search).has('flat') && half && innerWidth > 760 ? (() => {
  // 1) 이어 붙여도 티가 안 나는 3D 잡음(48³): R 부드러운 잡음, G 세포 잡음
  const NS = 48, data = new Uint8Array(NS * NS * NS * 2);
  const tab = (P, n = 1) => { const a = new Float32Array(P * P * P * n); for (let i = 0; i < a.length; i++) a[i] = Math.random(); return a; };
  const sm = (t) => t * t * (3 - 2 * t);
  const vn = (T, P, x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = sm(x - xi), fy = sm(y - yi), fz = sm(z - zi);
    const X0 = xi % P, X1 = (xi + 1) % P, Y0 = (yi % P) * P, Y1 = ((yi + 1) % P) * P, Z0 = (zi % P) * P * P, Z1 = ((zi + 1) % P) * P * P;
    const ab = T[X0 + Y0 + Z0] + (T[X1 + Y0 + Z0] - T[X0 + Y0 + Z0]) * fx, cd = T[X0 + Y1 + Z0] + (T[X1 + Y1 + Z0] - T[X0 + Y1 + Z0]) * fx;
    const ef = T[X0 + Y0 + Z1] + (T[X1 + Y0 + Z1] - T[X0 + Y0 + Z1]) * fx, gh = T[X0 + Y1 + Z1] + (T[X1 + Y1 + Z1] - T[X0 + Y1 + Z1]) * fx;
    const p0 = ab + (cd - ab) * fy, p1 = ef + (gh - ef) * fy; return p0 + (p1 - p0) * fz;
  };
  const wl = (T, C, x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let m = 9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy, cz = zi + dz, k = (((cx % C) + C) % C + (((cy % C) + C) % C) * C + (((cz % C) + C) % C) * C * C) * 3;
      const ex = cx + T[k] - x, ey = cy + T[k + 1] - y, ez = cz + T[k + 2] - z, d = ex * ex + ey * ey + ez * ez; if (d < m) m = d;
    }
    return Math.sqrt(m);
  };
  const T4 = tab(4), T8 = tab(8), T16 = tab(16), W4 = tab(4, 3), W8 = tab(8, 3);
  for (let z = 0, o = 0; z < NS; z++) for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++, o += 2) {
    const u = x / NS, v = y / NS, w = z / NS;
    data[o] = 255 * (0.5 * vn(T4, 4, u * 4, v * 4, w * 4) + 0.3 * vn(T8, 8, u * 8, v * 8, w * 8) + 0.2 * vn(T16, 16, u * 16, v * 16, w * 16));
    data[o + 1] = 255 * (1 - Math.min(1, 0.65 * wl(W4, 4, u * 4, v * 4, w * 4) + 0.35 * wl(W8, 8, u * 8, v * 8, w * 8)));
  }
  const n3 = new THREE.Data3DTexture(data, NS, NS, NS);
  n3.format = THREE.RGFormat; n3.type = THREE.UnsignedByteType; n3.minFilter = n3.magFilter = THREE.LinearFilter;
  n3.wrapS = n3.wrapT = n3.wrapR = THREE.RepeatWrapping; n3.unpackAlignment = 1; n3.needsUpdate = true;

  // 2) 구름 꼭대기 높이를 16m 정사각형 그림으로 구워 둠(R: 높이에서 손자국을 뺀 값, G: 손자국). 걸음마다 무거운 잡음을 다시 계산하지 않으려고
  const HS = 16, HN = 1024, rtOpt = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const rtH = new THREE.WebGLRenderTarget(HN, HN, rtOpt), rtV = new THREE.WebGLRenderTarget(4, 4, rtOpt);
  const HS2 = 96, rtH2 = new THREE.WebGLRenderTarget(HN, HN, rtOpt);   // 먼 구름용 높이 지도(96m, 거칠지만 넓게)
  const full = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const quad = (mat) => { const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return sc; };
  const hsU = { value: HS }; let fr = 0;
  const hScene = quad(new THREE.ShaderMaterial({
    uniforms: { ...seaU, uHS: hsU }, vertexShader: full,
    fragmentShader: SEA_FN + /* glsl */`
      uniform float uHS;varying vec2 vUv;
      void main(){vec2 p=uFc+(vUv-.5)*uHS;vec2 uv=(p-uFc)/uTR+.5,g=drag(uv);gl_FragColor=vec4(height(p-g)-dent(uv)*.1,dent(uv),g);}`,
  }));

  // 3) 구름층을 화면 절반 해상도로 걸어가며 그림
  const vU = {
    uH: { value: rtH.texture }, uH2: { value: rtH2.texture }, uHS2: { value: HS2 }, uN3: { value: n3 }, uInvVP: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
    uTime: seaU.uTime, uFc: seaU.uFc, uWell: seaU.uWell, uHS: { value: HS }, uY: { value: SEA_Y },
    uLift: { value: 0.08 }, uSoft: { value: 0.14 }, uDen: { value: 26 }, uEro: { value: 1 },   // 다듬는 값: 표면 위로 올리는 높이, 가장자리 두께, 짙기, 깎임
    uMoon: { value: 1 }, uAmb: { value: 1 }, uShade: { value: 1 },                             // 달빛 세기, 그늘 밝기, 구름끼리 드리우는 그늘 세기
  };
  const vScene = quad(new THREE.ShaderMaterial({
    uniforms: vU, vertexShader: full,
    fragmentShader: GLSL + /* glsl */`
      precision highp sampler3D;
      uniform sampler2D uH,uH2;uniform float uHS2;float gF=0.;                    // gF: 0 가까움 ~ 1 멂(멀수록 잔결을 줄임)
      uniform sampler3D uN3;uniform mat4 uInvVP;uniform vec3 uCam;uniform float uTime,uHS,uY,uLift,uSoft,uDen,uEro,uMoon,uAmb,uShade;uniform vec2 uFc,uWell;varying vec2 vUv;
      // 그 자리의 구름 밀도 0~1. 꼭대기 아래로 갈수록 차고, 3D 잡음으로 가장자리를 깎아 흩어지게 함. dn: 손자국
      float dens(vec3 p,out float dn){
        vec2 q1=(p.xz-uFc)/uHS+.5;float w=smoothstep(.4,.47,max(abs(q1.x-.5),abs(q1.y-.5)));   // 가까운 지도 → 먼 지도로 부드럽게 넘어감
        vec4 m=texture2D(uH,q1);if(w>0.)m=mix(m,vec4(texture2D(uH2,(p.xz-uFc)/uHS2+.5).r,0.,0.,0.),w);dn=m.g;
        float base=(uY+uLift+m.r-p.y)/uSoft;if(base<=0.)return 0.;
        vec3 q=(p-vec3(m.b,0.,m.a)*2.)*vec3(1.5,2.1,1.5)*mix(1.,.3,gF)+vec3(uTime*.02,0.,uTime*.012);   // 스친 방향으로 김의 결이 끌려감
        vec2 n=texture(uN3,q*.6).rg;float n2=texture(uN3,q*2.3).r;
        float er=((1.-n.r)*.75+(1.-n.g)*.55+(1.-n2)*.3)*mix(1.,.65,gF);
        return clamp(base*1.5-er*uEro*(.85+dn*.8),0.,1.);
      }
      void main(){
        vec4 nd=uInvVP*vec4(vUv*2.-1.,1.,1.);vec3 ro=uCam,rd=normalize(nd.xyz/nd.w-uCam),L=${MOON};
        if(rd.y>-.002){gl_FragColor=vec4(0.);return;}
        float t=max((uY+1.4-ro.y)/rd.y,0.),tEnd=min((uY-.3-ro.y)/rd.y,38.);          // 지평선 가까이(38m)까지
        float jit=fract(52.9829189*fract(dot(gl_FragCoord.xy+fract(uTime*7.)*31.,vec2(.06711056,.00583715))));
        t+=jit*(.01+t*.025);                                                       // 줄무늬가 안 보이게 출발점을 흩음
        float g=.55,ct=dot(rd,L),ph=(1.-g*g)/pow(1.+g*g-2.*g*ct,1.5)*.25;          // 달 쪽을 볼수록 밝게 비침
        float T=1.;vec3 C=vec3(0.);
        for(int i=0;i<96;i++){
          if(t>tEnd||T<.03)break;
          gF=smoothstep(8.,30.,t);
          vec3 p=ro+rd*t;float dt=.01+t*mix(.025,.04,gF),dn,dl;float d=dens(p,dn);
          if(d>0.){
            float Tl=exp(-uShade*(dens(p+L*.06,dl)*1.2+dens(p+L*.18,dl)*2.2+dens(p+L*.45,dl)*3.4));   // 달빛이 다른 구름 덩이에 가려진 정도
            float hf=clamp((p.y-(uY-.1))/.5,0.,1.),near=exp(-dot(p.xz-uWell,p.xz-uWell)/1.2);
            vec3 col=vec3(.66,.76,1.)*uMoon*Tl*(.3+1.5*ph)*(1.-.45*exp(-d*3.))
              +vec3(.04,.06,.12)*uAmb*(.35+.65*hf)
              +vec3(1.,.55,.22)*(dn*dn*(.12+.5*near)+.1*near*(1.-hf));              // 아래에서 올라오는 따뜻한 빛
            col=mix(col,vec3(.035,.05,.10),1.-exp(-t*.045));                        // 먼 곳은 지평선 색으로(표면 구름과 같은 값)
            float a=(1.-exp(-d*uDen*dt))*(1.-smoothstep(20.,38.,t));
            C+=T*a*col;T*=1.-a;
          }else dt*=1.8;
          t+=dt;
        }
        gl_FragColor=vec4(C,1.-T);
      }`,
  }));
  const size = new THREE.Vector2();
  const resize = () => { renderer.getDrawingBufferSize(size); rtV.setSize(Math.max(4, size.x >> 1), Math.max(4, size.y >> 1)); over.material.uniforms.uPx.value.set(1 / rtV.width, 1 / rtV.height); };
  // 4) 그린 구름층을 하늘·먼 구름 위에 덮음(병보다 먼저 그려 병이 가려지지 않게)
  const over = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { uV: { value: rtV.texture }, uPx: { value: new THREE.Vector2() } }, vertexShader: full,
    // 절반 해상도로 그린 것을 네 점 평균으로 올려 알갱이를 눌러 줌
    fragmentShader: 'uniform sampler2D uV;uniform vec2 uPx;varying vec2 vUv;void main(){gl_FragColor=(texture2D(uV,vUv+uPx)+texture2D(uV,vUv-uPx)+texture2D(uV,vUv+uPx*vec2(1.,-1.))+texture2D(uV,vUv-uPx*vec2(1.,-1.)))*.25;}',
    depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  }));
  over.frustumCulled = false; over.renderOrder = -1; over.visible = false; scene.add(over); resize();
  sky.renderOrder = -3; sea.renderOrder = -2;
  const vp = new THREE.Matrix4();
  return {
    over, resize, vU,
    frame() {
      camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      vU.uInvVP.value.copy(vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)).invert();
      vU.uCam.value.copy(camera.position);
      if (fr++ % 3 === 0) { hsU.value = HS2; renderer.setRenderTarget(rtH2); renderer.render(hScene, tCam); }   // 먼 지도는 세 번에 한 번만(천천히 변함)
      hsU.value = HS; renderer.setRenderTarget(rtH); renderer.render(hScene, tCam);
      renderer.setRenderTarget(rtV); renderer.render(vScene, tCam);
      renderer.setRenderTarget(null);
    },
  };
})() : null;
const bgShop = scene.background.clone(), bgSky = new THREE.Color(0x05080f);
// 쏟은 뒤 물건에 비치는 주변 빛: 가게 실내 반사 대신 실제 밤하늘 사진(Poly Haven Clarens Night 02, CC0)
const envShop = scene.environment; let envNight = null;
new RGBELoader().load(new URL('../assets/env/night.hdr', import.meta.url).href, (t) => {
  t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); envNight = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
  if (seaU.uSky.value > 0) scene.environment = envNight;
});
function world(isSky) {
  scene.environment = isSky && envNight ? envNight : envShop; X.setAO(!isSky);   // 가게 구석 그늘(SSAO)은 가게에서만
  shop.forEach((o) => { o.visible = !isSky; });
  sky.visible = isSky; mine.forEach((l) => { l.visible = isSky; });
  scene.background.copy(isSky ? bgSky : bgShop);
  seaU.uSky.value = veilU.uSky.value = isSky ? 1 : 0;
  if (vol) vol.over.visible = isSky;
  if (drops) drops.pts.visible = isSky;
  if (fire) fire.visible = isSky;
  if (!isSky) { disU.uDisR.value = -1; disObjs.forEach((o) => { o.visible = true; }); }
}

// ── 가게가 쏟은 자리부터 녹아 사라짐 ───────────────────────────────────
// 가게의 모든 재질에 "uDisC에서 uDisR 안쪽은 지움, 경계는 내용물 빛으로 빛남"을 덧붙임(처음 불러올 때 한 번).
// 병과 같은 재질을 쓰는 가게 물건은 재질을 복제해서 붙임(병은 지워지면 안 되므로). 직접 만든 셰이더는 물건째 숨김
const disU = { uDisR: { value: -1 }, uDisC: { value: V(0, 0, 0) }, uDisCol: { value: new THREE.Color(...(WAVE ? [1, 0.78, 0.45] : MOSS ? [0.45, 0.85, 0.5] : [0.75, 0.85, 1])) } };
const DIS_FN = /* glsl */`
  uniform float uDisR;uniform vec3 uDisC,uDisCol;varying vec3 vDisW;
  float disH(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float disN(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(disH(i),disH(i+vec3(1,0,0)),f.x),mix(disH(i+vec3(0,1,0)),disH(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(disH(i+vec3(0,0,1)),disH(i+vec3(1,0,1)),f.x),mix(disH(i+vec3(0,1,1)),disH(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
const jarMats = new Set(); J.g.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => jarMats.add(m)); });
const disObjs = [], clones = new Map();
function patchDis(m) {
  if (m.userData.dis) return m; m.userData.dis = true;
  m.onBeforeCompile = (sh) => {
    if (!sh.fragmentShader.includes('#include <dithering_fragment>')) return;
    Object.assign(sh.uniforms, disU);
    sh.vertexShader = 'varying vec3 vDisW;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 dW=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        dW=instanceMatrix*dW;
      #endif
      vDisW=(modelMatrix*dW).xyz;`);
    sh.fragmentShader = DIS_FN + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      if(uDisR>0.){float e=length(vDisW-uDisC)-uDisR+disN(vDisW*2.5)*.9;if(e<0.)discard;gl_FragColor.rgb+=uDisCol*exp(-e*e/.01)*2.5;}`);   // 녹는 경계가 빛남
  };
  m.customProgramCacheKey = () => 'mori-dis';
  m.needsUpdate = true;
  return m;
}
shop.forEach((root) => root.traverse((o) => {
  if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return;
  const ms = [].concat(o.material);
  if (!o.isMesh || ms.some((m) => m.isShaderMaterial)) { disObjs.push(o); return; }
  const fix = (m) => { if (!jarMats.has(m)) return patchDis(m); if (!clones.has(m)) clones.set(m, patchDis(m.clone())); return clones.get(m); };
  o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
}));
const disCtr = new Map(), box = new THREE.Box3();
function dissolveStep() {   // 직접 만든 셰이더 물건은 경계가 지나가면 통째로 숨김
  disObjs.forEach((o) => {
    if (!disCtr.has(o)) disCtr.set(o, box.setFromObject(o).getCenter(V(0, 0, 0)));
    if (disU.uDisR.value > disCtr.get(o).distanceTo(disU.uDisC.value)) o.visible = false;
  });
}

// ── 병: 코르크와 안의 구름 덩이 ───────────────────────────────────────
const cork = J.cork, cork0 = cork.position.clone(), lumps = J.inner.children.slice(), lump0 = lumps.map((m) => m.position.clone());
const lumpMats = []; J.inner.traverse((o) => { if (o.material && !lumpMats.includes(o.material)) lumpMats.push(o.material); });   // 병 속 내용물 재질(구름 덩이, 모래와 물 층)
const lump0Mat = lumpMats.map((m) => [m.transparent, m.opacity]);
const fadeLumps = (a) => lumpMats.forEach((m, i) => { m.transparent = a < 1 || lump0Mat[i][0]; m.opacity = a * lump0Mat[i][1]; });
let state = 'sealed', pull = 0, dragY = null;
const corkAt = () => { const v = cork.getWorldPosition(V(0, 0, 0)).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
const nearCork = (e) => { const [cx, cy] = corkAt(); return Math.hypot(e.clientX - cx, e.clientY - cy) < Math.max(56, innerHeight * 0.09); };
const wait = (sec) => tween(Math.max(0.01, sec * Q), () => {}, (k) => k);

async function open() {
  if (state !== 'sealed') return;
  state = 'opening'; audio(); dragY = null; pull = 0;
  body.classList.remove('grab', 'grabbing'); body.classList.replace('sealed', 'open');
  hint.style.opacity = 0; J.g.rotation.z = 0;
  sfx('cork', { gain: 0.9 });
  // 1) 코르크가 튀어 오름
  const c = cork.position.clone();
  tween(0.9 * Q, (k) => { cork.position.set(c.x + 0.1 * k, c.y + 0.5 * k, c.z + 0.06 * k); cork.rotation.set(0.9 * k, 0, 1.6 * k); }, out3).then(() => { cork.visible = false; });
  J.light.intensity = 0;
  await wait(0.25);
  // 2) 병이 들리며 오른쪽으로 기울어 입구가 바닥을 향함(병 가운데를 축으로 돎). 속 내용물은 content가 중력대로 움직임
  const g0 = J.g.position.clone(), H = 0.1;
  const tilt = (a, dx, dy) => { J.g.rotation.z = a; J.g.position.set(g0.x + dx + Math.sin(a) * H, g0.y + H + dy - Math.cos(a) * H, g0.z); };
  sea.visible = true; seaU.uR.value = 0; spill.landed = 0; spill.flow = 0; spill.on = true; content.start();
  camTo({ p: V(jp.x + 0.08, jp.y + 0.36, jp.z + 1.15), t: V(jp.x + 0.2, jp.y + 0.24, jp.z) }, 1.8 * Q);   // 병 속과 줄기가 한눈에 들어오게
  const ss = (k) => k * k * (3 - 2 * k);
  await tween(1.3 * Q, (k) => tilt(-2.05 * ss(Math.max(0, (k - 0.15) / 0.85)), 0.06 * ss(k), 0.28 * ss(Math.min(1, k / 0.6))), (k) => k);   // 먼저 들고, 이어서 기울임
  sfx(WAVE ? 'sandpour' : MOSS ? 'waterpour' : 'whoosh', { gain: WAVE ? 0.8 : 0.6, rate: KIND === 3 ? 0.7 : 1, pan: panAt(J.g.position), fade: [3, 0.8] });   // 쏟아지는 소리
  // 3) 다 빠질 때까지 점점 더 거꾸로 세우며 털듯이 흔듦. 떨어진 자리에 내용물이 쌓이고 고임
  await tween(3.4 * Q, (k) => {
    tilt(-2.05 - 0.5 * ss(k) - 0.1 * Math.sin(k * Math.PI * 6) * (1 - k), 0.06, 0.28);
    if (spill.landed) {
      seaU.uSrc.value.copy(spill.land); seaU.uR.value = Math.max(seaU.uR.value, 0.8 * (1 - content.left));
      const amt = Math.pow(1 - content.left, 0.7);                                    // 쏟은 만큼 더미가 쌓이고 넓어짐
      seaU.uPile.value = (WAVE ? 0.05 : MOSS ? 0.035 : 0.06) * amt; seaU.uPileR.value = 0.04 + 0.08 * amt;
    }
  }, (k) => k);
  spill.on = false;
  if (!spill.landed) seaU.uSrc.value.set(g0.x + 0.25, g0.z);
  await wait(0.25);                                                                     // 줄기의 꼬리가 떨어져 내림
  // 4) 쏴악: 고인 자리에서 바닥이 번지고, 그 뒤를 따라 가게가 쏟은 자리부터 빛나는 경계와 함께 녹아 사라지며 밤하늘이 드러남
  sfx('swell', { gain: 0.7 }); if (MOSS) sfx('squelch', { gain: 0.4, pan: panAt(J.g.position) });
  sky.visible = true; mine.forEach((l) => { l.visible = true; }); if (vol) vol.over.visible = true; if (envNight) scene.environment = envNight; X.setAO(false);   // 녹기 시작할 때부터 밤하늘이 비침, 그늘 패스는 끔(녹는 가게·바닥 셰이더와 맞지 않음)
  disU.uDisC.value.set(seaU.uSrc.value.x, SEA_Y, seaU.uSrc.value.y);
  skyU.uRise.value = -0.16; tween(16 * Q, (k) => { skyU.uRise.value = -0.16 * (1 - k); }, out3);   // 달이 천천히 떠오름
  const r0 = seaU.uR.value, pile0 = seaU.uPile.value;
  tween(2.8 * Q, (k) => {
    const r = 0.1 + 50 * k * k;                                                        // 처음엔 천천히, 점점 빨리
    disU.uDisR.value = r; dissolveStep();
    seaU.uPile.value = pile0 * (1 - ss(Math.min(1, k / 0.4))); seaU.uPileR.value += 0.002;   // 더미가 무너지며 사방으로 번짐
    seaU.uR.value = Math.max(r0 + 9 * out3(Math.min(1, k / 0.55)), r + 1);            // 바닥이 늘 녹는 경계보다 앞서 번짐
    seaU.uSky.value = Math.max(0.001, Math.min(1, k * 1.4));                           // 바닥 빛도 가게 불빛에서 달빛으로
  }, (k) => k);
  const p1 = J.g.position.clone(), a1 = J.g.rotation.z, rest = V(g0.x - 0.07, SEA_Y + 0.075, g0.z + 0.02);
  tween(0.8 * Q, (k) => {                                                                 // 빈 병이 툭 내려앉으며 옆으로 누움(살짝 튕김)
    const f = Math.min(1, (k / 0.45) ** 2), u = Math.max(0, (k - 0.45) / 0.55);
    J.g.rotation.z = THREE.MathUtils.lerp(a1, -Math.PI / 2, out3(Math.min(1, k / 0.6)));
    J.g.position.set(THREE.MathUtils.lerp(p1.x, rest.x, k), THREE.MathUtils.lerp(p1.y, rest.y, f) + 0.015 * Math.sin(u * Math.PI) * (1 - u), THREE.MathUtils.lerp(p1.z, rest.z, k));
  });
  wait(0.36).then(() => sfx('glass', { gain: 0.6, pan: panAt(J.g.position) }));            // 빈 병이 바닥에 닿는 소리
  camTo({ p: V(jp.x + 0.1, jp.y + 0.8, jp.z + 2.4), t: V(jp.x + 0.3, jp.y + 0.3, jp.z - 0.8) }, 2.4 * Q);   // 크게 물러나 가게가 사라지는 걸 보여 줌
  await wait(2.8);
  world(true); seaU.uR.value = 80;
  camTo(P_SEA(), 2.6 * Q);
  await wait(1.2);
  state = 'open'; moved = 0;
  hint.textContent = WAVE ? '꾹 누른 채 모래에 그어 보세요. 파도가 다녀가면 지워져요'
    : MOSS ? '쓸면 결이 누워요. 꾹 눌렀다 떼 보세요' : '천천히 쓸어 보세요. 꾹 누르면 더 깊이 들어가요';
  hint.style.opacity = 1; again.hidden = false;
}
async function reseal() {
  if (state !== 'open') return;
  state = 'closing'; again.hidden = true; hint.style.opacity = 0; pressed = false;
  sfx('whoosh', { gain: 0.45, rate: 0.85 }); wait(0.9).then(() => sfx('glass', { gain: 0.5 }));
  body.classList.add('veil');
  await tween(0.8 * Q, (k) => { veilU.uVeil.value = k; });
  world(false); seaU.uR.value = 0; sea.visible = false; tU.uDecay.value = 0;   // 자국 버퍼도 비움
  cork.visible = true; cork.position.copy(cork0); cork.rotation.set(0, 0, 0);
  J.g.rotation.set(0, 0, 0); J.g.position.copy(X.dockTop());                                 // 눕혀 둔 병을 받침 위에 다시 세움
  content.reset(); seaU.uPile.value = 0;
  lumps.forEach((m, i) => { m.position.copy(lump0[i]); m.scale.setScalar(1); });
  fadeLumps(1); J.inner.visible = true; J.inner.scale.set(1, 1, 1); J.inner.position.y = 0; J.light.intensity = 0.65;
  setCam(P_JAR());
  body.classList.replace('open', 'sealed'); body.classList.remove('veil', 'sky');
  await tween(1.0 * Q, (k) => { veilU.uVeil.value = 1 - k; });
  state = 'sealed'; hint.textContent = '코르크를 위로 끌어 올리세요'; hint.style.opacity = 1;
}
again.onclick = reseal;
$('#uncork').onclick = open;

// ── 포인터: 코르크 끌기와 구름 만지기 ──────────────────────────────────
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(V(0, 1, 0), -(SEA_Y + (WAVE ? 0 : 0.04))), hit = V(0, 0, 0);
// 마우스 광선이 실제 구름 겉면(울퉁불퉁한 높이)에 닿는 점을 GPU에서 찾아 1픽셀로 돌려받음.
// 평평한 바닥판으로 계산하면 봉우리가 높은 곳에서 손자국이 커서보다 뒤쪽에 찍힘
const pickRT = half && !WAVE ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.FloatType, depthBuffer: false }) : null, pickBuf = new Float32Array(4);
const pickU = { ...seaU, uRo: { value: V(0, 0, 0) }, uRd: { value: V(0, -1, 0) }, uY: { value: SEA_Y } };
const pickScene = new THREE.Scene();
pickScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: pickU, vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: SEA_FN + (MOSS ? MOSS_FN : '') + /* glsl */`
    uniform vec3 uRo,uRd;uniform float uY;
    float gap(float t){vec3 p=uRo+uRd*t;vec2 uv=(p.xz-uFc)/uTR+.5;return p.y-(uY+${MOSS ? 'mossH(p.xz)-dent(uv)*.02' : 'height(p.xz-drag(uv))-dent(uv)*.05'});}
    void main(){
      float a=0.,b=-1.;
      for(int i=1;i<=64;i++){float t=float(i)*.16;if(gap(t)<0.){b=t;break;}a=t;}
      if(b<0.){gl_FragColor=vec4(0.);return;}
      for(int i=0;i<10;i++){float m=(a+b)*.5;if(gap(m)<0.)b=m;else a=m;}
      gl_FragColor=vec4(uRo+uRd*b,1.);
    }`,
})));
// GPU에서 답을 받아 올 때 기다리지 않음: 한 프레임에 한 번만 그리고, 결과는 다 그려진 뒤(보통 다음 프레임)에 꺼내 씀.
// 예전처럼 마우스가 움직일 때마다 바로 읽으면 그때마다 그래픽카드가 끝날 때까지 멈춰서 화면이 끊겼음
const glc = renderer.getContext(), pickPBO = pickRT ? glc.createBuffer() : null;
let pickWant = false, pickFence = null;
if (pickPBO) { glc.bindBuffer(glc.PIXEL_PACK_BUFFER, pickPBO); glc.bufferData(glc.PIXEL_PACK_BUFFER, 16, glc.STREAM_READ); glc.bindBuffer(glc.PIXEL_PACK_BUFFER, null); }
function pickStep() {
  if (pickFence) {
    if (glc.clientWaitSync(pickFence, 0, 0) === glc.TIMEOUT_EXPIRED) return;                  // 아직이면 다음 프레임에
    glc.deleteSync(pickFence); pickFence = null;
    glc.bindBuffer(glc.PIXEL_PACK_BUFFER, pickPBO); glc.getBufferSubData(glc.PIXEL_PACK_BUFFER, 0, pickBuf); glc.bindBuffer(glc.PIXEL_PACK_BUFFER, null);
    takeHit(pickBuf[3] < 0.5 ? null : hit.set(pickBuf[0], pickBuf[1], pickBuf[2]));
  }
  if (!pickWant) return;
  pickWant = false;
  renderer.setRenderTarget(pickRT); renderer.render(pickScene, tCam);
  glc.bindBuffer(glc.PIXEL_PACK_BUFFER, pickPBO); glc.readPixels(0, 0, 1, 1, glc.RGBA, glc.FLOAT, 0); glc.bindBuffer(glc.PIXEL_PACK_BUFFER, null);
  renderer.setRenderTarget(null);
  pickFence = glc.fenceSync(glc.SYNC_GPU_COMMANDS_COMPLETE, 0); glc.flush();
}

// 손은 마우스를 바로 따라오지 않고 조금 늦게, 부드럽게 따라감(cur가 tgt를 쫓음). 바닥 구름 위에서만 닿음
const uvNow = new THREE.Vector2(9, 9), uvLast = new THREE.Vector2(9, 9), tgt = V(0, 0, 0), cur = V(0, 0, 0), fwd = V(0, 0, 0);
const FOLLOW = 6;     // 따라오는 빠르기(클수록 바로 붙음)
let pressed = false, onFloor = false, fresh = true, speed = 0, moved = 0, press = 0;
function takeHit(h) {
  const ok = !!h && Math.abs(hit.x - Fc.x) < TR * 0.46 && Math.abs(hit.z - Fc.y) < TR * 0.46;
  if (ok !== onFloor) body.classList.toggle('sky', !ok);
  onFloor = ok;
  if (!ok) { fresh = true; return false; }
  tgt.copy(hit);
  if (fresh) cur.copy(hit);
  return true;
}
function seaAt(e) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (!pickRT) return takeHit(ray.ray.intersectPlane(plane, hit));
  pickU.uRo.value.copy(ray.ray.origin); pickU.uRd.value.copy(ray.ray.direction); pickWant = true;   // 실제 겉면은 다음 프레임에 GPU가 알려 줌
  return onFloor || takeHit(ray.ray.intersectPlane(plane, hit));                                    // 아직 답이 없으면 평평한 판으로 먼저 판정
}
canvas.addEventListener('pointerdown', (e) => {
  if (state === 'sealed' && nearCork(e)) { audio(); dragY = e.clientY; canvas.setPointerCapture(e.pointerId); body.classList.add('grabbing'); return; }
  if (state === 'open' && seaAt(e)) { pressed = true; canvas.setPointerCapture(e.pointerId); sfx(WAVE ? 'sandscratch' : MOSS ? 'squelch' : 'whoosh', { gain: WAVE ? 0.4 : 0.45, at: WAVE ? Math.random() * 10 : 0, dur: WAVE ? 0.3 : 1.4, rate: KIND === 3 ? 1.25 : 1, pan: panAt(hit) }); }
});
canvas.addEventListener('pointermove', (e) => {
  if (state === 'sealed') {
    if (dragY === null) { body.classList.toggle('grab', nearCork(e)); return; }
    const dy = Math.min(0, e.clientY - dragY); pull = Math.min(1, -dy / 95);
    if (pull >= 1) open();
  } else if (state === 'open') seaAt(e);
});
const lift = (e) => {
  if (drops && pressed && state === 'open' && press > 0.3) { drops.spray(cur, Math.round(4 + 8 * press), 1); sfx('drip', { gain: 0.55, rate: 0.85 + Math.random() * 0.4, pan: panAt(cur) }); }   // 눌렀던 이끼가 튀어 오르며 물방울
  pressed = false; body.classList.remove('grabbing');
  if (dragY === null || state !== 'sealed') return;
  const dy = e.clientY - dragY; dragY = null;
  if (dy < -55) return open();
  pull = 0;
  if (Math.abs(dy) < 6) { hint.classList.remove('nudge'); void hint.offsetWidth; hint.classList.add('nudge'); }
};
canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);
canvas.addEventListener('pointerleave', () => { fresh = true; onFloor = false; });

// ── 물방울 커서(마우스일 때만) ─────────────────────────────────────────
// 조금 늦게 따라오고, 움직이면 꼭지가 뒤로 늘어짐. 누르면 차오르며 시계 반대 방향으로 45도 기욺
const drop = $('#drop'), D = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, px: innerWidth / 2, py: innerHeight / 2, ang: 0, s: 0, k: 0, down: 0 };
if (matchMedia('(pointer: fine)').matches) body.classList.add('drop');
addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; D.tx = e.clientX; D.ty = e.clientY; body.classList.toggle('in', e.target === canvas); });
addEventListener('pointerdown', (e) => { if (e.target === canvas) { D.down = 1; body.classList.add('pressing'); } });
addEventListener('pointerup', () => { D.down = 0; body.classList.remove('pressing'); });
document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) body.classList.remove('in'); });
X.hooks.push((dt) => {
  const f = 1 - Math.exp(-dt * 10);
  D.x += (D.tx - D.x) * f; D.y += (D.ty - D.y) * f;
  const vx = D.x - D.px, vy = D.y - D.py; D.px = D.x; D.py = D.y;
  const sp = calm ? 0 : Math.min(1, Math.hypot(vx, vy) / Math.max(dt, 1e-3) / 900);   // 초당 900px이면 가장 길게
  D.s += (sp - D.s) * (1 - Math.exp(-dt * 8));
  const want = sp > 0.08 ? Math.atan2(vy, vx) * 180 / Math.PI - 90 : 0;               // 꼭지가 움직임 반대쪽을 향하게, 멈추면 위로
  D.ang += ((((want - D.ang) % 360) + 540) % 360 - 180) * (1 - Math.exp(-dt * 9));
  D.ang = (((D.ang + 180) % 360) + 360) % 360 - 180;                                  // 같은 각도를 -180~180 안으로
  D.k += (D.down - D.k) * (1 - Math.exp(-dt * 14));
  drop.style.transform = `translate(${D.x - 20}px,${D.y - 23}px) rotate(${D.ang - 45 * D.k}deg) scale(${1 - 0.25 * D.s},${1 + 0.5 * D.s})`;
});
addEventListener('resize', () => { if (state === 'sealed') setCam(P_JAR()); else if (state === 'open') setCam(P_SEA()); if (vol) vol.resize(); });

// ── 매 프레임 ───────────────────────────────────────────────────────
let corkY = cork0.y;
X.hooks.push((dt, time) => {
  seaU.uTime.value = veilU.uTime.value = tU.uTime.value = time;
  sky.position.copy(camera.position);
  if (state === 'sealed') {            // 끄는 만큼 코르크가 올라오고 병이 떨림
    corkY += (cork0.y + pull * 0.045 - corkY) * Math.min(1, dt * 18);
    cork.position.y = corkY;
    J.g.rotation.z = pull > 0.1 ? Math.sin(time * 46) * 0.012 * pull : 0;
  }
  if (sea.visible) {
    const on = state === 'open' && (onFloor || pressed);
    fwd.copy(cur);
    if (on) {                                   // 손이 마우스 쪽으로 천천히 미끄러짐
      cur.lerp(tgt, 1 - Math.exp(-dt * FOLLOW));
      const d = cur.distanceTo(fwd);
      speed = speed * 0.8 + (d / Math.max(dt, 1e-3)) * 0.2; moved += d; if (moved > 6) hint.style.opacity = 0;
    }
    uvNow.set((cur.x - Fc.x) / TR + 0.5, (cur.z - Fc.y) / TR + 0.5);
    if (fresh || !on) uvLast.copy(uvNow);
    press += ((pressed ? 1 : 0) - press) * (1 - Math.exp(-dt * (pressed ? 2.5 : 5)));   // 누르면 천천히 가라앉고, 떼면 조금 빨리 뜸
    const iv = on && !fresh ? 1 / Math.max(dt, 1e-3) : 0;
    tU.uVel.value.set((cur.x - fwd.x) * iv, (cur.z - fwd.z) * iv).clampLength(0, 1.2);   // 손의 빠르기(m/s)
    tU.uA.value.copy(uvLast); tU.uB.value.copy(uvNow);
    if (WAVE) {                                         // 모래: 누른 채 그으면 손가락 굵기의 홈, 그냥 지나가면 아주 옅은 자국
      tU.uStr.value = on ? 0.12 + 0.88 * press : 0;
      tU.uRad.value = (0.008 + 0.006 * press) / TR;
    } else if (MOSS) {                                  // 이끼: 스치면 살짝, 누르면 손끝 크기로 들어감
      tU.uStr.value = on ? 0.18 + 0.82 * press : 0;
      tU.uRad.value = (0.045 + 0.03 * press) / TR;
      if (on && speed > 0.8 && Math.random() < dt * speed * 3) { drops.spray(cur, 1, 0.7); sfx('drip', { gain: 0.2, rate: 1 + Math.random() * 0.5, pan: panAt(cur) }); }   // 빠르게 쓸면 가끔 한 방울
    } else {
      tU.uStr.value = on ? 0.1 + 0.32 * press : 0;     // 스칠 때는 거의 안 파이고, 눌러도 얕게
      tU.uRad.value = (0.08 + 0.05 * press) / TR;
    }
    tU.uK.value = Math.min(3, dt * 60);
    tU.uVDecay.value = Math.exp(-dt / (MOSS ? 1.4 : 0.9));   // 끌려간 결은 1초쯤 뒤 제자리로(이끼 결은 조금 더 천천히 일어남)
    if (tU.uDecay.value > 0) tU.uDecay.value = WAVE || MOSS ? 1 : Math.exp(-dt / 1.6);   // 구름은 파인 자리가 금방 차오름, 모래는 파도가 올 때까지 남음, 이끼는 용수철로 돌아옴
    tU.uPrev.value = rtA.texture;
    renderer.setRenderTarget(rtB); renderer.render(tScene, tCam); renderer.setRenderTarget(null);
    [rtA, rtB] = [rtB, rtA]; seaU.uTrail.value = rtA.texture;
    if (on) { uvLast.copy(uvNow); fresh = false; }
    tU.uDecay.value = tU.uDecay.value || 1;
    if (vol && seaU.uSky.value) vol.frame();
    if (drops) drops.step(dt);
  }
  if (!onFloor) speed *= Math.pow(0.9, dt * 60);
  if (pickRT) pickStep(); content.step(dt); props?.step(); spill.flow = content.flow;
  mist.step(dt);
  spill.step(dt, time);
  sound(time);
});

// ── 소리: 실제 녹음 효과음 ─────────────────────────────────────────────
// Pixabay 효과음(Pixabay Content License, 출처 표기 없이 사용 가능). 파일과 원본 주소는 sound/출처.md
// 손이 닿는 소리와 한 번씩 나는 소리는 화면에서 닿은 쪽(왼쪽·오른쪽)에서 들림
const VOL = 0.6;
const SND = ['cork', 'drip', 'forest', 'glass', 'sandpour', 'sandscratch', 'squelch', 'swell', 'waterpour', 'waves', 'whoosh', 'wind'];
const RUB = WAVE || MOSS ? 'sandscratch' : 'whoosh', AMB = WAVE ? 'waves' : MOSS ? 'forest' : 'wind';   // 쓸 때 소리, 배경 소리
let AC = null, master, tPan, tGain, tLP, ambGain, muted = false;
const buf = {};
function audio() {
  if (AC) { AC.resume(); return; }
  AC = new (window.AudioContext || window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = muted ? 0 : VOL; master.connect(AC.destination);
  tPan = AC.createStereoPanner(); tPan.connect(master);
  tGain = AC.createGain(); tGain.gain.value = 0; tGain.connect(tPan);
  tLP = AC.createBiquadFilter(); tLP.type = 'lowpass'; tLP.frequency.value = 3000; tLP.connect(tGain);
  ambGain = AC.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
  const loopTo = (b, dest) => { const s = AC.createBufferSource(); s.buffer = b; s.loop = true; s.connect(dest); s.start(0, Math.random() * b.duration); };
  SND.forEach((n) => fetch(`touch/sound/${n}.mp3`).then((r) => r.arrayBuffer()).then((a) => AC.decodeAudioData(a)).then((b) => {
    buf[n] = b;
    if (n === RUB) loopTo(b, tLP);
    if (n === AMB) loopTo(b, ambGain);
  }).catch(() => {}));
}
// 소리를 놓을 자리: pan이 있으면 그 방향(-1 왼쪽 ~ 1 오른쪽)에서 들림
const out = (pan) => { if (pan === undefined) return master; const p = AC.createStereoPanner(); p.pan.value = pan; p.connect(master); return p; };
const panAt = (w) => THREE.MathUtils.clamp(w.clone().project(camera).x, -1, 1) * 0.9;   // 화면 위 가로 위치 → 좌우
// 한 번 재생: gain 크기, pan 좌우, rate 빠르기(음높이), at 시작 지점(초), dur 길이(초), fade [몇 초 뒤, 몇 초에 걸쳐] 사라짐
function sfx(n, o = {}) {
  if (!AC || !buf[n]) return;
  const s = AC.createBufferSource(), g = AC.createGain(), t = AC.currentTime, v = o.gain ?? 1;
  s.buffer = buf[n]; s.playbackRate.value = o.rate || 1; g.gain.value = v;
  if (o.fade) { g.gain.setValueAtTime(v, t + o.fade[0]); g.gain.linearRampToValueAtTime(0.0001, t + o.fade[0] + o.fade[1]); }
  s.connect(g); g.connect(out(o.pan)); s.start(t, o.at || 0, o.dur);
}
function sound(time) {
  if (!AC) return; const t = AC.currentTime, on = state === 'open';
  const rub = on ? Math.min(0.9, speed / 2.2) + (pressed ? 0.12 : 0) : 0;            // 빨리 쓸수록 크게
  tGain.gain.setTargetAtTime(rub * (RUB === 'whoosh' ? 0.7 : 1), t, 0.08);
  if (on) tPan.pan.setTargetAtTime(panAt(cur), t, 0.06);
  tLP.frequency.setTargetAtTime(MOSS ? 700 + speed * 500 : WAVE ? 5000 : 1500 + speed * 2500, t, 0.1);   // 이끼는 먹먹하고 눅눅하게
  let amb = seaU.uSky.value ? (WAVE ? 0.5 : MOSS ? 0.7 : 0.55) : 0;
  if (WAVE && seaU.uSky.value) { const u = (time / 8.5) % 1; amb *= 0.65 + (u < 0.28 ? 0.5 * (u / 0.28) : u < 0.8 ? 0.5 * (1 - (u - 0.28) / 0.52) : 0); }   // 화면의 파도가 밀려올 때 조금 커짐
  ambGain.gain.setTargetAtTime(amb, t, 0.6);
}
const showMute = () => { muteBtn.textContent = muted ? '소리 켜기' : '소리 끄기'; muteBtn.setAttribute('aria-pressed', muted); };
muteBtn.onclick = () => { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : VOL, AC.currentTime, 0.05); showMute(); };
showMute();

console.assert(lumps.length > 0 && cork.isMesh && half !== undefined, 'mori touch: 병 부품을 찾지 못함');
window.mori = { vol, drops, spill, content, cam, J, open, reseal, get state() { return state; }, corkAt, seaU, tU, P_SEA, P_JAR, renderer };

// ── 미리 데우기: 밤하늘로 넘어가는 순간 처음 쓰는 셰이더(조명 조합이 바뀌면 모든 재질이 다시 컴파일됨)와 텍스처를
// 불러올 때 미리 만들어 둠. 안 하면 쏟은 뒤 전환 때 0.1~0.3초씩 멈칫함
const warmRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
function warm() {
  const hidden = []; scene.traverse((o) => { if (!o.visible && (!o.isLight || mine.includes(o))) { hidden.push(o); o.visible = true; } });   // 꺼 둔 조명은 그대로(조명 수가 달라지면 다른 조합이 됨)
  const texs = new Set(); scene.traverse((o) => [].concat(o.material || []).forEach((m) => {
    Object.values(m).forEach((v) => v?.isTexture && texs.add(v)); Object.values(m.uniforms || {}).forEach((u) => u.value?.isTexture && texs.add(u.value));
  }));
  texs.forEach((t) => { if (t.image || t.isRenderTargetTexture) renderer.initTexture(t); });
  const cc = () => renderer.compileAsync ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera);   // 가능하면 그래픽 드라이버가 뒤에서 나눠 컴파일(화면을 멈추지 않음)
  renderer.setRenderTarget(warmRT);                    // 실제로는 블룸용 버퍼에 그리므로(톤매핑·색공간이 화면과 다름) 같은 조건으로 컴파일
  cc();                                                // 가게 불빛과 달빛이 함께 켜진 전환 중의 조합
  world(true); cc();                                   // 달빛만 남은 열린 뒤의 조합
  renderer.setRenderTarget(null);
  world(false); hidden.forEach((o) => { o.visible = false; });
}
warm(); props?.ready?.then(warm);
