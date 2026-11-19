// 가게 앞 → 둘러보기 → 병 고르기 → 기계에 올리기 → 병 열어 쏟기(touch/)
import * as S from './store.js';

const $ = (s) => document.querySelector(s);
const hero = $('#hero'), store = $('#store'), stepsEl = $('#steps'), cap = $('#cap'), choices = $('#choices');
const readout = $('#readout'), hint = $('#hint'), tip = $('#tip'), open = $('#open');
const prev = $('#tprev'), next = $('#tnext');
const LAST = S.STEPS.length - 1;
const NAME = { 1: 'wave', 3: 'cloud', 4: 'moss' }, KOF = { wave: 1, cloud: 3, moss: 4 };   // 열어서 쏟아 볼 수 있는 병
const TOUCH = Object.fromEntries(Object.entries(NAME).map(([k, n]) => [k, `./?k=${n}`]));

S.STEPS.forEach((s, i) => {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.innerHTML = `<i>${i + 1}</i>${s.t}`; b.onclick = () => S.go(i);
  li.appendChild(b); stepsEl.appendChild(li);
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
    b.type = 'button'; b.textContent = S.KINDS[k].name;
    b.classList.toggle('on', S.getStep() === 6 && k === S.getKind());
    b.onclick = () => fn(k);
    choices.appendChild(b);
  }
}
function openLink(n) {
  const url = TOUCH[S.getKind()];
  open.hidden = !(n >= 4 && url);
  if (url) open.href = url;
}

function render(n, ev) {
  if (ev === 'scan') { show('병을 읽는 중', S.getKind(), false); open.hidden = true; if (n === 6) jarButtons(S.swap); else choices.innerHTML = ''; return; }
  if (ev === 'known') { show('인식됨', S.getKind(), true); if (n === 6) jarButtons(S.swap); openLink(n); return; }
  if (ev === 'press') { hint.hidden = true; return; }
  [...stepsEl.children].forEach((li, i) => li.classList.toggle('on', i === n));
  cap.textContent = S.STEPS[n].d;
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
  tip.hidden = false; tip.textContent = S.KINDS[k].name;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
S.bind(render, hover);
S.setActive(true);

// ── 병 열기: 다른 페이지로 넘어가지 않고, 지금 보던 가게 장면에서 그대로 촉감 체험(touch/touch.js)으로 이어짐 ──
let touching = false;
async function startTouch(k, smooth) {
  if (touching) return; touching = true;
  if (location.search !== `?k=${NAME[k]}`) history.pushState(null, '', `./?k=${NAME[k]}`);   // touch.js가 주소의 k로 촉감을 정함
  const syncTop = () => { try { if (parent !== window) { parent.history.replaceState(null, '', `./?k=${NAME[k]}`); parent.document.title = document.title; } } catch { /* 다른 사이트 안이면 건너뜀 */ } };
  syncTop();                                                                       // 바깥 틀의 주소창도 지금 촉감으로
  const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'touch/touch.css' });
  await new Promise((r) => { css.onload = css.onerror = r; document.head.appendChild(css); });
  document.querySelector('link[href="style.css"]').disabled = true;
  document.querySelector('#bar').outerHTML = '<header id="bar"><a href="./" class="mark">mori</a><nav id="kinds" aria-label="촉감 고르기">'
    + '<a href="./?k=cloud" data-k="cloud">No. 13 구름</a><a href="./?k=wave" data-k="wave">No. 07 파도</a><a href="./?k=moss" data-k="moss">No. 03 이끼</a>'
    + '</nav><button id="mute" type="button" aria-pressed="false">소리 끄기</button></header>';
  document.querySelector('main').innerHTML = '<div id="copy"><p class="kicker"></p><h1></h1><p id="sense"></p></div>'
    + '<p id="hint" role="status">코르크를 위로 끌어 올리세요</p><button id="uncork" type="button" class="sr">코르크를 뽑아 병 열기</button><button id="again" type="button" hidden>병에 다시 담기</button>';
  tip.remove();
  document.querySelector('#gl').insertAdjacentHTML('afterend', '<svg id="drop" width="40" height="40" viewBox="-20 -20 40 40" aria-hidden="true"><path class="halo" d="M0-11C4-5 7-1 7 3A7 7 0 0 1-7 3C-7-1-4-5 0-11Z"/><path class="b" d="M0-11C4-5 7-1 7 3A7 7 0 0 1-7 3C-7-1-4-5 0-11Z"/></svg>');
  document.body.className = 'sealed';
  window.__moriSmooth = smooth;                                                   // 둘러보기에서 넘어오면 카메라가 끊기지 않고 병 앞으로 다가감
  await import('./touch/touch.js');
  syncTop();                                                                       // touch.js가 바꾼 제목을 탭 제목에도
  const root = document.documentElement;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('k', 'in')));   // 준비되면 어두운 덮개를 걷음(둘러보기에서 이어 들어온 경우엔 덮개 없이 그대로)
  document.querySelectorAll('#kinds a').forEach((a) => { a.onclick = (e) => {                   // 다른 촉감으로: 어둡게 덮고 넘어감. 브금은 끊지 않고(풍경에서 꺼져 있었다면 다시 올리며) 이어 감
    e.preventDefault(); if (a.getAttribute('aria-current')) return;
    root.classList.remove('in'); window.moriBgm?.level(1, 0.8); setTimeout(() => { location.href = a.href; }, 380);
  }; });
}
open.onclick = (e) => { e.preventDefault(); startTouch(S.getKind(), true); };
addEventListener('popstate', () => location.reload());                           // 뒤로 가기: 처음부터 다시
const k0 = KOF[new URLSearchParams(location.search).get('k')];
if (k0) { hero.hidden = true; startTouch(k0, false); }                              // 주소에 촉감이 있으면 바로 그 병 앞에서 시작

// ── 브금(bgm.js): 바깥 틀이 들고 있어 소리 끔 상태도 화면이 새로 불린 뒤 그대로 이어짐 ──
const bgm = window.moriBgm, shopMute = $('#mute');
const showMute = () => { shopMute.textContent = bgm.muted ? '소리 켜기' : '소리 끄기'; shopMute.setAttribute('aria-pressed', bgm.muted); };
shopMute.onclick = () => { bgm.mute(!bgm.muted); showMute(); }; showMute();

next.onclick = () => { const s = S.getStep(); if (s === 2) S.pick(S.getKind()); else S.go(s < LAST ? s + 1 : 0); };
prev.onclick = () => S.go(S.getStep() - 1);
$('#enter').onclick = () => { bgm.start(); hero.classList.add('out'); setTimeout(() => { hero.hidden = true; }, 800); store.hidden = false; S.setMode('tour'); };
addEventListener('keydown', (e) => {
  if (touching) return;
  if (!hero.hidden && (e.key === 'Enter' || e.key === 'ArrowRight')) { $('#enter').click(); return; }
  if (store.hidden) return;
  if (e.key === 'ArrowRight') next.click();
  if (e.key === 'ArrowLeft' && !prev.disabled) prev.click();
});
