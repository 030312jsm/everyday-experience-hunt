// 브금: 가게에 들어갈 때부터 작게 깔림. 촉감 풍경이 열리면 touch.js가 level(0)으로 끄고, 병에 다시 담으면 되돌림.
// 바깥 틀(index.html)에 하나만 두고 안쪽 화면(app.html)이 그것을 빌려 씀 → 다른 병으로 넘어가며 안쪽 화면이 새로 불려도 음악은 끊기지 않음.
// app.html만 따로 열면 여기서 직접 만듦.
(() => {
  let up; try { up = parent !== window && parent.moriBgm; } catch { /* 다른 사이트 안에 들어가 있으면 빌릴 수 없음 */ }
  window.moriBgm = up || {
    ac: null, g: null, k: 1, muted: false,
    start() {
      if (this.ac) { this.level(1); return this.ac.resume(); }
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.g = this.ac.createGain(); this.g.gain.value = 0; this.g.connect(this.ac.destination);
      fetch('touch/sound/bgm_b.mp3').then((r) => r.arrayBuffer()).then((a) => this.ac.decodeAudioData(a)).then((b) => {
        const s = this.ac.createBufferSource(); s.buffer = b; s.loop = true; s.connect(this.g); s.start(); this.level(this.k, 1.2);
      }).catch(() => {});
    },
    level(k, tc = 0.8) { this.k = k; this.g?.gain.setTargetAtTime(this.muted ? 0 : 0.3 * k, this.ac.currentTime, tc); },   // k: 0~1 크기, tc: 바뀌는 빠르기(초)
    mute(m) { this.muted = m; this.level(this.k, 0.05); },
  };
})();
