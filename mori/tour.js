// 05장 둘러보기 화면과 3D 장면을 잇는 부분
import * as S from './store.js';

const $ = (s) => document.querySelector(s);
const stepsEl = $('#steps'), cap = $('#cap'), choices = $('#choices');
const readout = $('#readout'), hint = $('#hint'), tip = $('#tip');
const prev = $('#tprev'), next = $('#tnext');
const LAST = S.STEPS.length - 1;
// 단계마다 곁에 띄우는 에셋 라이브러리 사진
const REF = [
  [['img/lib/L03.webp', '환경 · 원경']],
  [['img/lib/L10.webp', '공간 · 원경'], ['img/s5/87.webp', '공간 · 원경']],
  [['img/lib/L04.webp', '상황 · 중경'], ['img/lib/L06.webp', '디테일 · 초근경']],
  [['img/lib/L01.webp', '제품 · 근경']],
  [['img/lib/L05.webp', '사물 · 근경'], ['img/lib/L09.webp', '상징 · 추상']],
  [['img/lib/L02.webp', '인물 · 중경'], ['img/lib/L08.webp', '질감 · 초근경']],
  [['img/v/lib_moonwater.webp', '질감 · 근경'], ['img/lib/L07.webp', '질감 · 초근경']],
];
const ref = $('#ref'), open = $('#open');
const NAME = { 1: 'wave', 3: 'cloud', 4: 'moss' }, KOF = { wave: 1, cloud: 3, moss: 4 };   // 열어서 쏟아 볼 수 있는 병
function openLink(n) {
  const name = NAME[S.getKind()];
  open.hidden = !(n >= 4 && name);
  if (name) open.href = `./?k=${name}`;
}

S.STEPS.forEach((s, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<i>${i + 1}</i>${s.t}`;
  b.onclick = () => S.go(i);
  li.appendChild(b);
  stepsEl.appendChild(li);
});

function show(small, k, withSense) {
  const K = S.KINDS[k];
  readout.hidden = false;
  readout.querySelector('small').textContent = small;
  readout.querySelector('b').textContent = K.name;
  readout.querySelector('p').textContent = withSense ? K.sense : '';
}
function jarButtons(fn) {
  choices.innerHTML = '';
  for (let k = 1; k <= 5; k++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = S.KINDS[k].name;
    b.classList.toggle('on', S.getStep() === 6 && k === S.getKind());
    b.onclick = () => fn(k);
    choices.appendChild(b);
  }
}

function render(n, ev) {
  if (ev === 'scan') { show('병을 읽는 중', S.getKind(), false); open.hidden = true; jarButtons(S.swap); if (n !== 6) choices.innerHTML = ''; return; }
  if (ev === 'known') { show('인식됨', S.getKind(), true); if (n === 6) jarButtons(S.swap); openLink(n); return; }
  if (ev === 'press') { hint.hidden = true; return; }
  [...stepsEl.children].forEach((li, i) => li.classList.toggle('on', i === n));
  cap.textContent = S.STEPS[n].d;
  ref.innerHTML = '<small>에셋 라이브러리</small>' + REF[n].map(([f, k]) => `<figure><img src="${f}" alt=""><figcaption>${k}</figcaption></figure>`).join('');
  choices.innerHTML = '';
  if (n === 2) jarButtons(S.pick);
  if (n === 6) jarButtons(S.swap);
  if (n >= 4) show('인식됨', S.getKind(), true); else readout.hidden = true;
  openLink(n);
  hint.hidden = !(n === 5 || n === 6);
  hint.textContent = n === 5 ? '홈을 누른 채 움직여 보기' : '병을 바꾼 뒤 다시 만져 보기';
  prev.disabled = n === 0;
  next.textContent = n === LAST ? '처음으로' : n === 2 ? '이 병으로' : '다음';
}
function hover(k, x, y) {
  if (!k) { tip.hidden = true; return; }
  tip.hidden = false;
  tip.textContent = S.KINDS[k].name;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
S.bind(render, hover);

function goNext() {
  const s = S.getStep();
  if (s === 2) { S.pick(S.getKind()); return true; }
  if (s < LAST) { S.go(s + 1); return true; }
  return false;
}
function goPrev() {
  const s = S.getStep();
  if (s > 0) { S.go(s - 1); return true; }
  return false;
}
next.onclick = () => { if (!goNext()) S.go(0); };
prev.onclick = goPrev;

// 첫 화면이나 05장 가게가 보일 때만 그림
let heroR = 1, storeR = 0;
const sync = () => {
  if (window.__moriTouch) return;                                       // 촉감 체험 중에는 슬라이드 위치와 상관없이 계속 그림
  S.setActive(heroR > 0 || storeR > 0);
  if (storeR > 0.55) S.setMode('tour');
  else if (heroR > 0.25) S.setMode('hero');
};
const th = Array.from({ length: 21 }, (_, i) => i / 20);
new IntersectionObserver((es) => es.forEach((e) => { heroR = e.intersectionRatio; sync(); }), { threshold: th }).observe($('#hero'));
new IntersectionObserver((es) => es.forEach((e) => { storeR = e.intersectionRatio; sync(); }), { threshold: th }).observe($('#store'));

window.moriTour = { on: () => storeR > 0.55, next: goNext, prev: goPrev };

// ── 병 열기: 다른 페이지로 넘어가지 않고, 05장 가게 장면에서 그대로 촉감 체험(touch/touch.js)으로 이어짐 ──
// 발표 슬라이드는 걷어 내고 같은 3D 화면 위에 촉감 화면을 띄움. 주소는 ./?k=… (그 주소로 바로 들어와도 같은 병 앞에서 시작)
async function startTouch(k, smooth) {
  if (window.__moriTouch) return; window.__moriTouch = true;
  if (location.search !== `?k=${NAME[k]}`) history.pushState(null, '', `./?k=${NAME[k]}`);
  const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'touch/touch.css' });
  await new Promise((r) => { css.onload = css.onerror = r; document.head.appendChild(css); });
  document.querySelector('link[href="style.css"]').disabled = true;
  ['#pg', '#foot', '#tip', '#gal'].forEach((s) => $(s)?.remove());
  $('#bar').outerHTML = '<header id="bar"><a href="./#store" class="mark">mori</a><nav id="kinds" aria-label="촉감 고르기">'
    + '<a href="./?k=cloud" data-k="cloud">No. 13 구름</a><a href="./?k=wave" data-k="wave">No. 07 파도</a><a href="./?k=moss" data-k="moss">No. 03 이끼</a>'
    + '</nav><button id="mute" type="button" aria-pressed="false">소리 끄기</button></header>';
  $('main').innerHTML = '<div id="copy"><p class="kicker"></p><h1></h1><p id="sense"></p></div>'
    + '<p id="hint" role="status">코르크를 위로 끌어 올리세요</p><button id="uncork" type="button" class="sr">코르크를 뽑아 병 열기</button><button id="again" type="button" hidden>병에 다시 담기</button>';
  $('#gl').insertAdjacentHTML('afterend', '<svg id="drop" width="40" height="40" viewBox="-20 -20 40 40" aria-hidden="true"><path class="halo" d="M0-11C4-5 7-1 7 3A7 7 0 0 1-7 3C-7-1-4-5 0-11Z"/><path class="b" d="M0-11C4-5 7-1 7 3A7 7 0 0 1-7 3C-7-1-4-5 0-11Z"/></svg>');
  document.body.className = 'sealed'; scrollTo(0, 0);
  window.__moriSmooth = smooth;                                         // 둘러보기에서 넘어오면 카메라가 끊기지 않고 병 앞으로 다가감
  S.setActive(true);
  await import('./touch/touch.js');
}
open.onclick = (e) => { e.preventDefault(); startTouch(S.getKind(), true); };
addEventListener('popstate', () => location.reload());
const k0 = KOF[new URLSearchParams(location.search).get('k')];
if (k0) startTouch(k0, false);
