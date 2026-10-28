// 05장 둘러보기 화면과 3D 장면을 잇는 부분
import * as S from './store.js';

const $ = (s) => document.querySelector(s);
const stepsEl = $('#steps'), cap = $('#cap'), choices = $('#choices');
const readout = $('#readout'), hint = $('#hint'), tip = $('#tip');
const prev = $('#tprev'), next = $('#tnext');
const LAST = S.STEPS.length - 1;

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
  if (ev === 'scan') { show('병을 읽는 중', S.getKind(), false); jarButtons(S.swap); if (n !== 6) choices.innerHTML = ''; return; }
  if (ev === 'known') { show('인식됨', S.getKind(), true); if (n === 6) jarButtons(S.swap); return; }
  if (ev === 'press') { hint.hidden = true; return; }
  [...stepsEl.children].forEach((li, i) => li.classList.toggle('on', i === n));
  cap.textContent = S.STEPS[n].d;
  choices.innerHTML = '';
  if (n === 2) jarButtons(S.pick);
  if (n === 6) jarButtons(S.swap);
  if (n >= 4) show('인식됨', S.getKind(), true); else readout.hidden = true;
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
  S.setActive(heroR > 0 || storeR > 0);
  if (storeR > 0.55) S.setMode('tour');
  else if (heroR > 0.25) S.setMode('hero');
};
const th = Array.from({ length: 21 }, (_, i) => i / 20);
new IntersectionObserver((es) => es.forEach((e) => { heroR = e.intersectionRatio; sync(); }), { threshold: th }).observe($('#hero'));
new IntersectionObserver((es) => es.forEach((e) => { storeR = e.intersectionRatio; sync(); }), { threshold: th }).observe($('#store'));

window.moriTour = { on: () => storeR > 0.55, next: goNext, prev: goPrev };
