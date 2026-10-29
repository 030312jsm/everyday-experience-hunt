// 갤러리, 00 과정 근거 자료와 04 라이브러리 그리기, 키보드로 넘기기
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

  // 04 에셋 라이브러리 20장 (img/lib/L01~L09는 Midjourney 추가 촬영분)
  var LIB = [
    { f: 'img/v/lib_beach.webp', k: '환경 · 기억 속 풍경', d: '원경' },
    { f: 'img/lib/L03.webp', k: '환경', d: '원경' },
    { f: 'img/s5/87.webp', k: '공간', d: '원경' },
    { f: 'img/lib/r14.webp', k: '공간 · 원형 카운터', d: '원경' },
    { f: 'img/s5/89.webp', k: '상황', d: '중경' },
    { f: 'img/s5/96.webp', k: '사람 · 공간', d: '중경' },
    { f: 'img/lib/L02.webp', k: '인물', d: '중경' },
    { f: 'img/lib/L04.webp', k: '상황', d: '중경' },
    { f: 'img/s5/93.webp', k: '장면', d: '탑뷰' },
    { f: 'img/s5/103.webp', k: '장면', d: '탑뷰' },
    { f: 'img/lib/L01.webp', k: '제품', d: '근경' },
    { f: 'img/lib/r13.webp', k: '상황 · 둘러앉은 손님', d: '중경' },
    { f: 'img/lib/L05.webp', k: '사물', d: '근경' },
    { f: 'img/s5/92.webp', k: '디테일 · 빈 홈', d: '근경' },
    { f: 'img/lib/r9.webp', k: '사람 · 카운터의 두 사람', d: '중경' },
    { f: 'img/lib/L06.webp', k: '디테일', d: '초근경' },
    { f: 'img/v/lib_moonwater.webp', k: '질감 · 달 그늘의 물결', d: '근경' },
    { f: 'img/lib/L07.webp', k: '질감', d: '초근경' },
    { f: 'img/lib/L08.webp', k: '질감', d: '초근경' },
    { f: 'img/lib/L09.webp', k: '상징', d: '추상' }
  ];
  (function () {
    var box = $('#assets'), have = LIB.filter(function (a) { return a.f; });
    LIB.forEach(function (a) {
      var f = document.createElement('figure'); f.className = 'a' + (a.f ? '' : ' todo');
      f.innerHTML = (a.f ? '<img loading="lazy" alt="" src="' + a.f + '">' : '<div class="ph"><span>' + a.n + '</span>' + a.t + '</div>') +
        '<figcaption><b>' + a.k + '</b>' + a.d + (a.f ? '' : ' · 제작 중') + '</figcaption>';
      if (a.f) f.onclick = function () {
        openGal('Visual Asset Library', have.length + '장 · 모두 AI 생성', have.map(function (x) { return { src: x.f }; }));
      };
      box.appendChild(f);
    });
  })();

  // 00 과정 근거: 무드 판
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

  // 00 과정 근거: 키워드 파생 트랙
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
  // 칸 하나: 이름과 장수, 미리보기 n장. 누르면 전체 이미지 (프롬프트는 갤러리 설명에)
  function node(label, list, prompt, n) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'node'; if (prompt) b.title = prompt;
    var th = list.slice(0, n).map(function (it) { return '<img loading="lazy" alt="" src="img/s4/' + it.f + '">'; }).join('');
    b.innerHTML = '<b><span>' + label + '</span><small>' + list.length + '장</small></b><div class="thumbs" style="grid-template-columns:repeat(' + n + ',1fr)">' + th + '</div>';
    b.onclick = function () { openGal(label, list.length + '장 · AI 생성' + (prompt ? ' · ' + prompt : ''), list.map(function (it) { return { src: 'img/s4/' + it.f }; })); };
    return b;
  }
  function el(cls) { var d = document.createElement('div'); d.className = cls; return d; }
  fetch('img/s4/items.json').then(function (r) { return r.json(); }).then(function (items) {
    var rest = el('trk3');
    TRACKS.forEach(function (T) {
      var mine = items.filter(function (it) { return it.t === T.t; });
      var keys = [];
      mine.forEach(function (it) { if (keys.indexOf(it.k) < 0) keys.push(it.k); });
      var by = function (k) { return mine.filter(function (it) { return it.k === k; }); };
      if (T.t === 'minimal') {
        // 미니멀: 기본 → 스타일 3갈래 → 갈래마다 재질·기법 3가지 (열 하나가 갈래 하나)
        var tree = el('tree4'), c0 = el('col');
        c0.appendChild(node('A 미니멀 (기본)', by('A 미니멀'), PROMPT['A 미니멀'], 4));
        tree.appendChild(c0);
        ['A-1 미니멀-사진', 'A-2 미니멀-수묵', 'A-3 미니멀-선 그래픽'].forEach(function (k, i) {
          var col = el('col');
          col.appendChild(node(k, by(k), PROMPT[k], 4));
          [1, 2, 3].forEach(function (j) {
            var kk = keys.filter(function (x) { return x.indexOf('A-' + (i + 1) + '-' + j) === 0; })[0];
            if (kk) col.appendChild(node(kk, by(kk), PROMPT[kk], 4));
          });
          tree.appendChild(col);
        });
        $('#track-min').appendChild(tree);
      } else {
        var col = el('tcol');
        col.innerHTML = '<h4>' + T.name + '<small>' + mine.length + '장</small></h4>';
        var g = el('tgrid');
        keys.forEach(function (k) { g.appendChild(node(k, by(k), '', 3)); });
        col.appendChild(g); rest.appendChild(col);
      }
    });
    $('#track-rest').appendChild(rest);
  });

  // 방향키로 한 장씩 넘기기 (05장 가게 안에서는 둘러보기 단계를 넘김)
  // 넘기는 중에 다시 누르면 화면 위치가 아니라 가려던 장을 기준으로 한 장 더 감
  var stops = [].slice.call(document.querySelectorAll('[data-stop]')), goal = -1, settle;
  function cur() {
    var y = innerHeight * 0.3, k = 0;
    stops.forEach(function (s, i) { if (s.getBoundingClientRect().top <= y) k = i; });
    return k;
  }
  addEventListener('scroll', function () { clearTimeout(settle); settle = setTimeout(function () { goal = -1; }, 160); }, { passive: true });
  addEventListener('keydown', function (e) {
    if (!gal.hidden) { if (e.key === 'Escape') closeGal(); return; }
    var fwd = ['ArrowRight', 'ArrowDown', 'PageDown', ' '].indexOf(e.key) >= 0, back = ['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(e.key) >= 0;
    if (!fwd && !back) return;
    e.preventDefault();
    var T = window.moriTour;
    if (goal < 0 && T && T.on()) { if (fwd ? T.next() : T.prev()) return; }
    var i = Math.max(0, (goal >= 0 ? goal : cur()) + (fwd ? 1 : -1));
    if (i >= stops.length) { $('#foot').scrollIntoView({ behavior: 'smooth' }); return; }
    goal = i;
    stops[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 아래쪽에 지금 슬라이드의 장 이름과 쪽 번호
  var slides = [].slice.call(document.querySelectorAll('.slide')), pgc = $('#pgc'), pgn = $('#pgn');
  function page() {
    var y = innerHeight * 0.5, k = 0;
    slides.forEach(function (s, i) { if (s.getBoundingClientRect().top <= y) k = i; });
    pgc.textContent = slides[k].getAttribute('data-ch');
    pgn.textContent = ('0' + (k + 1)).slice(-2) + ' / ' + slides.length;
  }
  addEventListener('scroll', page, { passive: true }); page();
  // 주소 끝에 #s7처럼 쓰면 그 쪽으로 바로 감
  var m = location.hash.match(/^#s(\d+)$/);
  if (m && slides[m[1] - 1]) setTimeout(function () { slides[m[1] - 1].scrollIntoView(); }, 300);

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
