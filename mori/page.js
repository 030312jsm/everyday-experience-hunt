// 갤러리, 04장 라이브러리와 06장 근거 자료 그리기, 키보드로 넘기기
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var gal = $('#gal'), gg = $('#gg'), gt = $('#gt'), gm = $('#gm');

  function openGal(title, meta, list) {
    gt.textContent = title; gm.textContent = meta;
    gg.className = ''; gg.innerHTML = '';
    list.forEach(function (it) {
      var im = new Image(); im.alt = ''; im.loading = 'lazy'; im.src = it.src;
      if (it.e) im.className = 'e';
      im.onclick = function () {
        if (gg.classList.contains('one')) { gg.classList.remove('one'); im.classList.remove('z'); im.scrollIntoView({ block: 'center' }); }
        else { gg.classList.add('one'); im.classList.add('z'); gal.scrollTop = 0; }
      };
      gg.appendChild(im);
    });
    gal.hidden = false; gal.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function closeGal() { gal.hidden = true; document.body.style.overflow = ''; }
  $('#gx').onclick = closeGal;

  // 04 에셋 라이브러리: f가 없는 칸은 Midjourney로 만드는 중인 컷
  var LIB = [
    { f: 'img/v/lib_beach.webp', k: '환경 · 기억 속 풍경', d: '원경' },
    { n: 'L03', t: '밤거리의 가게', k: '환경', d: '원경' },
    { f: 'img/s5/87.webp', k: '공간', d: '원경' },
    { f: 'img/s5/102.webp', k: '공간 · 병의 벽', d: '원경' },
    { f: 'img/s5/89.webp', k: '상황', d: '중경' },
    { f: 'img/s5/96.webp', k: '사람 · 공간', d: '중경' },
    { n: 'L02', t: '손님 한 사람', k: '인물', d: '중경' },
    { n: 'L04', t: '병을 고르는 손', k: '상황', d: '중경' },
    { f: 'img/s5/93.webp', k: '장면', d: '탑뷰' },
    { f: 'img/s5/103.webp', k: '장면', d: '탑뷰' },
    { n: 'L01', t: '촉감 병 하나', k: '제품', d: '근경' },
    { f: 'img/s5/91.webp', k: '사물 · 병과 받침', d: '근경' },
    { n: 'L05', t: '기계가 병을 알아보는 순간', k: '사물', d: '근경' },
    { f: 'img/s5/92.webp', k: '디테일 · 빈 홈', d: '근경' },
    { f: 'img/s5/90.webp', k: '디테일 · 손', d: '근경' },
    { n: 'L06', t: '라벨 손글씨', k: '디테일', d: '초근경' },
    { f: 'img/v/lib_moonwater.webp', k: '질감 · 달 그늘의 물결', d: '근경' },
    { n: 'L07', t: '비 갠 뒤의 이끼', k: '질감', d: '초근경' },
    { n: 'L08', t: '아무도 밟지 않은 구름', k: '질감', d: '초근경' },
    { n: 'L09', t: '손바닥과 빛 고리', k: '상징', d: '추상' }
  ];
  (function () {
    var box = $('#assets'), have = LIB.filter(function (a) { return a.f; });
    $('#libcount').innerHTML = '<b>' + have.length + '</b>장 · 제작 중 <b>' + (LIB.length - have.length) + '</b> · 목표 20장';
    LIB.forEach(function (a) {
      var f = document.createElement('figure'); f.className = 'a' + (a.f ? '' : ' todo');
      f.innerHTML = (a.f ? '<img loading="lazy" alt="" src="' + a.f + '">' : '<div class="ph"><span>' + a.n + '</span>' + a.t + '</div>') +
        '<figcaption><b>' + a.k + '</b> · ' + a.d + (a.f ? '' : ' · 제작 중') + '</figcaption>';
      if (a.f) f.onclick = function () {
        openGal('Visual Asset Library', have.length + '장 · 모두 AI 생성', have.map(function (x) { return { src: x.f }; }));
      };
      box.appendChild(f);
    });
  })();

  // 06 근거 자료: 무드 판
  var VTN = ['매끄러운 세라믹 표면 / 유기적 곡면', '무광, 패브릭', '선형적인, Art', '나무재질의 정갈한 느낌', '흑백의 대비가 명확한 단색조', '무채도 반투명 중첩', '반들반들한 은백색', '몸과 손을 따라 감기는 가는 선과 입자', '비정형적인, 유선형', '마디마다 끼운 반투명 조각'];
  fetch('img/s3/items.json').then(function (r) { return r.json(); }).then(function (d) {
    var box = $('#boards');
    VTN.forEach(function (name, i) {
      var list = d.items.filter(function (it) { return it.c === i + 1; }).map(function (it) {
        return { src: 'img/s3/i/' + ('00' + it.n).slice(-3) + '.webp', e: it.e };
      });
      var ex = list.filter(function (it) { return it.e; }).length;
      var meta = list.length + '장 · AI 생성 ' + (list.length - ex) + ' · 외부 출처 ' + ex;
      var b = document.createElement('button'); b.type = 'button';
      b.innerHTML = '<div class="im"><img loading="lazy" alt="" src="img/s3/b' + (i + 1) + '.webp"></div><b>' + name + '</b><small>' + meta + '</small>';
      b.onclick = function () { openGal(('0' + (i + 1)).slice(-2) + '  ' + name, meta, list); };
      box.appendChild(b);
    });
  });

  // 06 근거 자료: 키워드 파생 트랙
  var PROMPT = {
    'A 미니멀': 'a thin sensor glove and a hand, minimalist, vast negative space --ar 4:5',
    'A-1 미니멀-사진': '+ studio photography, soft diffused light',
    'A-2 미니멀-수묵': '+ Korean ink wash painting on hanji',
    'A-3 미니멀-선 그래픽': '+ single continuous line drawing',
    'A-1-1 비치는 메시': '+ translucent mesh fabric',
    'A-1-2 석고': '+ white plaster cast',
    'A-1-3 긴 그림자': '+ single hard side light, long shadow',
    'A-2-1 진한 한 획': '+ one bold confident brushstroke',
    'A-2-2 옅은 번짐': '+ pale diluted wash, soft bleeding edges',
    'A-2-3 마른 붓': '+ dry brush texture, broken lines',
    'A-3-1 가는 펜 선': '+ fine black pen on white paper',
    'A-3-2 도면': '+ technical line drawing, vintage patent illustration',
    'A-3-3 점과 선': '+ line drawing, dots marking each joint connected by thin lines'
  };
  var TRACKS = [
    { t: 'minimal', name: '미니멀', d: '기본 프롬프트에 스타일 3갈래를 더하고, 갈래마다 재질·기법 3가지를 다시 더해 9갈래로 파생.' },
    { t: 'ceramic', name: '세라믹 · 유기적 곡면', d: '섹션 3 키워드 “매끄러운 세라믹 표면 / 유기적 곡면”에서 출발한 키워드 묶음 4개.' },
    { t: 'matte', name: '무광 · 패브릭 · 무채색', d: '섹션 3 키워드 “무광, 패브릭”에서 출발한 키워드 묶음 3개.' },
    { t: 'organic', name: '비정형 · 유선형', d: '섹션 3 키워드 “비정형적인, 유선형”에서 출발한 키워드 묶음. 한글과 영문 키워드를 함께 시험.' }
  ];
  function node(label, list, prompt, sq) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'node';
    var th = list.slice(0, 4).map(function (it) { return '<img loading="lazy" alt="" src="img/s4/' + it.f + '">'; }).join('');
    b.innerHTML = '<b>' + label + '<small>' + list.length + '장</small></b>' + (prompt ? '<code>' + prompt + '</code>' : '') + '<div class="thumbs' + (sq ? ' sq' : '') + '">' + th + '</div>';
    b.onclick = function () { openGal(label, list.length + '장 · AI 생성' + (prompt ? ' · ' + prompt : ''), list.map(function (it) { return { src: 'img/s4/' + it.f }; })); };
    return b;
  }
  function el(cls) { var d = document.createElement('div'); d.className = cls; return d; }
  fetch('img/s4/items.json').then(function (r) { return r.json(); }).then(function (items) {
    var box = $('#tracks');
    TRACKS.forEach(function (T, ti) {
      var mine = items.filter(function (it) { return it.t === T.t; });
      var keys = [];
      mine.forEach(function (it) { if (keys.indexOf(it.k) < 0) keys.push(it.k); });
      var by = function (k) { return mine.filter(function (it) { return it.k === k; }); };
      var sec = el('track');
      sec.innerHTML = '<h3><span>' + (ti + 1) + '</span>' + T.name + ' <small class="note">' + mine.length + '장</small></h3><p>' + T.d + '</p>';
      if (T.t === 'minimal') {
        var tree = el('tree'), l0 = el('lv0'), l1 = el('lv1'), l2 = el('lv2');
        l0.appendChild(node('A 미니멀', by('A 미니멀'), PROMPT['A 미니멀']));
        ['A-1 미니멀-사진', 'A-2 미니멀-수묵', 'A-3 미니멀-선 그래픽'].forEach(function (k, i) {
          l1.appendChild(node(k, by(k), PROMPT[k]));
          var col = el('col');
          [1, 2, 3].forEach(function (j) {
            var kk = keys.filter(function (x) { return x.indexOf('A-' + (i + 1) + '-' + j) === 0; })[0];
            if (kk) col.appendChild(node(kk, by(kk), PROMPT[kk]));
          });
          l2.appendChild(col);
        });
        tree.appendChild(l0); tree.appendChild(l1); tree.appendChild(l2);
        sec.appendChild(tree);
      } else {
        var bs = el('bundles');
        keys.forEach(function (k) { bs.appendChild(node(k, by(k), '', true)); });
        sec.appendChild(bs);
      }
      box.appendChild(sec);
    });
  });

  // → ← 로 다음 멈춤 지점까지 넘기기 (05장 가게 안에서는 둘러보기 단계를 넘김)
  var stops = [].slice.call(document.querySelectorAll('[data-stop]'));
  function cur() {
    var y = innerHeight * 0.3, k = 0;
    stops.forEach(function (s, i) { if (s.getBoundingClientRect().top <= y) k = i; });
    return k;
  }
  addEventListener('keydown', function (e) {
    if (!gal.hidden) { if (e.key === 'Escape') closeGal(); return; }
    var fwd = e.key === 'ArrowRight' || e.key === 'PageDown', back = e.key === 'ArrowLeft' || e.key === 'PageUp';
    if (!fwd && !back) return;
    e.preventDefault();
    var T = window.moriTour;
    if (T && T.on()) { if (fwd ? T.next() : T.prev()) return; }
    var i = cur() + (fwd ? 1 : -1);
    if (fwd && i >= stops.length) { $('#foot').scrollIntoView({ behavior: 'smooth' }); return; }
    if (stops[Math.max(0, i)]) stops[Math.max(0, i)].scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 위쪽 막대에서 지금 장 표시
  var links = [].slice.call(document.querySelectorAll('#bar nav a[href^="#"]'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  addEventListener('scroll', function () {
    var y = innerHeight * 0.4, on = -1;
    secs.forEach(function (s, i) { if (s.getBoundingClientRect().top <= y) on = i; });
    links.forEach(function (a, i) { a.classList.toggle('on', i === on); });
  }, { passive: true });

  // 3D를 못 띄우면 첫 화면을 사진으로 대신함
  setTimeout(function () { if (!window.moriTour) document.body.classList.add('nogl'); }, 8000);
})();
