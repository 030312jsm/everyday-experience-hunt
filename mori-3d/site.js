// 가게 앞 → 둘러보기 → 병 고르기 → 기계에 올리기 → 병 열어 쏟기(touch/)
import * as S from './store.js';

const $ = (s) => document.querySelector(s);
const hero = $('#hero'), store = $('#store'), stepsEl = $('#steps'), cap = $('#cap'), choices = $('#choices');
const readout = $('#readout'), hint = $('#hint'), tip = $('#tip'), open = $('#open');
const prev = $('#tprev'), next = $('#tnext');
const LAST = S.STEPS.length - 1;
const TOUCH = { 1: 'touch/?k=wave', 3: 'touch/', 4: 'touch/?k=moss' };   // 열어서 쏟아 볼 수 있는 병

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

next.onclick = () => { const s = S.getStep(); if (s === 2) S.pick(S.getKind()); else S.go(s < LAST ? s + 1 : 0); };
prev.onclick = () => S.go(S.getStep() - 1);
$('#enter').onclick = () => { hero.classList.add('out'); setTimeout(() => { hero.hidden = true; }, 800); store.hidden = false; S.setMode('tour'); };
addEventListener('keydown', (e) => {
  if (!hero.hidden && (e.key === 'Enter' || e.key === 'ArrowRight')) { $('#enter').click(); return; }
  if (store.hidden) return;
  if (e.key === 'ArrowRight') next.click();
  if (e.key === 'ArrowLeft' && !prev.disabled) prev.click();
});
