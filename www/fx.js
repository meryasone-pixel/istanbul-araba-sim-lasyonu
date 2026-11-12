/* fx.js — Boğaz Drive render hattı
   HDR sahne hedefi (MSAA), çok kademeli bloom, ACES film ton eşleme, sinematik renk derecelendirme,
   prosedürel gökyüzü (güneş/ay, bulut, yıldız, şehir ışığı), PMREM çevre yansıması (araç boyası, cam),
   ıslak asfalt (su birikintisi, yağmur halkaları, düzlemsel ayna yansıması), yağmur parçacıkları,
   hız bulanıklığı + kromatik sapma + film greni.
   Kalite: 0 Düşük (eski görünüm) · 1 Orta · 2 Yüksek · 3 Ultra */
(function () {
  'use strict';
  const R = THREE, FX = window.FX = {};

  /* ---------- kalite ---------- */
  let q = 1;
  try {
    const s = JSON.parse(localStorage.getItem('ist-set') || '{}');
    if (s.q !== undefined) q = +s.q;
    else q = (window.matchMedia && matchMedia('(pointer:coarse)').matches) ? 1 : 2;
  } catch (e) {}
  FX.Q = q;               // malzeme katmanı (açılışta sabit)
  FX.q = q;               // canlı kalite (efektler)
  FX.weather = 'wet';     // dry | wet | rain
  FX.night = 0; FX.dusk = 0;
  try { const w = localStorage.getItem('ist-wx'); if (w) FX.weather = w; } catch (e) {}

  /* ---------- yardımcılar ---------- */
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; };
  const srand = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const tex = (c, rep) => { const t = new R.CanvasTexture(c); t.wrapS = t.wrapT = R.RepeatWrapping; if (rep) t.repeat.set(rep, rep); t.anisotropy = 4; return t; };
  FX.cv = cv; FX.srand = srand; FX.tex = tex;

  // yumuşak değer gürültüsü (küçük rastgele tuvali büyüterek) — döşenebilir
  function noiseLayer(x, size, cells, alpha, rnd, lo, hi) {
    const s = cv(cells, cells), sx = s.getContext('2d'), d = sx.createImageData(cells, cells);
    for (let i = 0; i < cells * cells; i++) { const v = (lo + (hi - lo) * rnd()) | 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    sx.putImageData(d, 0, 0);
    x.save(); x.globalAlpha = alpha; x.imageSmoothingEnabled = true;
    // döşenebilirlik için 3x3 çiz
    const k = size / cells;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) x.drawImage(s, a * size - k / 2, b * size - k / 2, size + k, size + k);
    x.restore();
  }
  function heightToNormal(src, strength) {
    const w = src.width, h = src.height, sd = src.getContext('2d').getImageData(0, 0, w, h).data, o = cv(w, h), ox = o.getContext('2d'), od = ox.createImageData(w, h);
    const H = (x, y) => sd[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      od.data[i] = (-dx / l * .5 + .5) * 255; od.data[i + 1] = (dy / l * .5 + .5) * 255; od.data[i + 2] = (1 / l * .5 + .5) * 255; od.data[i + 3] = 255;
    }
    ox.putImageData(od, 0, 0); return o;
  }

  /* ---------- prosedürel dokular ---------- */
  const T = FX.T = {};
  function makeTextures() {
    const big = q >= 2 ? 512 : 256, rnd = srand(7);
    // asfalt: agrega greni + lekeler
    {
      const c = cv(big), x = c.getContext('2d'); x.fillStyle = '#3c3c40'; x.fillRect(0, 0, big, big);
      noiseLayer(x, big, 8, .35, rnd, 30, 90); noiseLayer(x, big, 32, .25, rnd, 40, 80);
      const d = x.getImageData(0, 0, big, big);
      for (let i = 0; i < big * big; i++) { const n = (rnd() - .5) * 46 + (rnd() < .04 ? 40 : 0); d.data[i * 4] += n; d.data[i * 4 + 1] += n; d.data[i * 4 + 2] += n * 1.05; }
      x.putImageData(d, 0, 0);
      T.asphalt = tex(c);
      const hc = cv(big), hx = hc.getContext('2d'); hx.fillStyle = '#808080'; hx.fillRect(0, 0, big, big);
      const hd = hx.getImageData(0, 0, big, big); for (let i = 0; i < big * big; i++) { const v = 128 + (rnd() - .5) * 150; hd.data[i * 4] = hd.data[i * 4 + 1] = hd.data[i * 4 + 2] = v; } hx.putImageData(hd, 0, 0);
      T.asphaltN = tex(heightToNormal(hc, 2.2));
    }
    // birikinti maskesi (büyük ölçek) — R: birikinti, G: ince varyasyon
    {
      const c = cv(256), x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
      noiseLayer(x, 256, 6, 1, rnd, 0, 255); noiseLayer(x, 256, 12, .5, rnd, 0, 255); noiseLayer(x, 256, 28, .25, rnd, 0, 255);
      T.puddle = tex(c); T.puddle.anisotropy = 1;
    }
    // kaldırım: 0.5 m beton karo + derz
    {
      const s = big, c = cv(s), x = c.getContext('2d'), n = 8, k = s / n; x.fillStyle = '#8e8a84'; x.fillRect(0, 0, s, s);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 128 + (rnd() - .5) * 26 | 0; x.fillStyle = `rgb(${v + 14},${v + 8},${v})`; x.fillRect(i * k + 1, j * k + 1, k - 2, k - 2); }
      noiseLayer(x, s, 32, .18, rnd, 60, 200);
      x.fillStyle = 'rgba(40,36,32,.55)'; for (let i = 0; i <= n; i++) { x.fillRect(i * k - 1, 0, 2, s); x.fillRect(0, i * k - 1, s, 2); }
      T.paving = tex(c);
      const hc = cv(s), hx = hc.getContext('2d'); hx.fillStyle = '#aaa'; hx.fillRect(0, 0, s, s); hx.fillStyle = '#333'; for (let i = 0; i <= n; i++) { hx.fillRect(i * k - 1.5, 0, 3, s); hx.fillRect(0, i * k - 1.5, s, 3); }
      T.pavingN = tex(heightToNormal(hc, 3));
    }
    // su: dalga normal haritası
    {
      const c = cv(256), x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
      noiseLayer(x, 256, 8, .7, rnd, 0, 255); noiseLayer(x, 256, 20, .5, rnd, 0, 255); noiseLayer(x, 256, 48, .3, rnd, 0, 255);
      T.waterN = tex(heightToNormal(c, 5));
    }
    // jant: 5 kollu alaşım
    {
      const c = cv(128), x = c.getContext('2d'); x.fillStyle = '#16171a'; x.fillRect(0, 0, 128, 128);
      const g = x.createRadialGradient(64, 64, 6, 64, 64, 62); g.addColorStop(0, '#e8eaee'); g.addColorStop(.8, '#a5a9b0'); g.addColorStop(1, '#5d6066');
      x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
      x.fillStyle = '#121316'; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + .63; x.beginPath(); x.moveTo(64 + Math.cos(a - .22) * 22, 64 + Math.sin(a - .22) * 22); x.lineTo(64 + Math.cos(a - .38) * 54, 64 + Math.sin(a - .38) * 54); x.lineTo(64 + Math.cos(a + .38) * 54, 64 + Math.sin(a + .38) * 54); x.lineTo(64 + Math.cos(a + .22) * 22, 64 + Math.sin(a + .22) * 22); x.fill(); }
      x.fillStyle = '#2a2c30'; x.beginPath(); x.arc(64, 64, 11, 0, 7); x.fill(); x.fillStyle = '#c9ccd2'; x.beginPath(); x.arc(64, 64, 6, 0, 7); x.fill();
      T.rim = new R.CanvasTexture(c);
    }
    // plaka (jenerik)
    {
      const c = cv(128, 32), x = c.getContext('2d'); x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 128, 32); x.fillStyle = '#1d4ea8'; x.fillRect(0, 0, 14, 32);
      x.fillStyle = '#111'; x.font = 'bold 21px monospace'; x.textAlign = 'center'; x.fillText('34 BD 2026', 71, 24); x.strokeStyle = '#111'; x.lineWidth = 2; x.strokeRect(1, 1, 126, 30);
      T.plate = new R.CanvasTexture(c);
    }
    // yumuşak ışık lekesi (sokak lambası havuzu, far izi)
    {
      const c = cv(128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      T.glow = new R.CanvasTexture(c);
      const s = cv(64), sx = s.getContext('2d'), g2 = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g2.addColorStop(0, 'rgba(0,0,0,.85)'); g2.addColorStop(.6, 'rgba(0,0,0,.45)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = g2; sx.fillRect(0, 0, 64, 64);
      T.blob = new R.CanvasTexture(s);
    }
    // araç altı far/stop izi: ön beyaz koni, arka kırmızı
    {
      const c = cv(64, 256), x = c.getContext('2d'); x.globalCompositeOperation = 'lighter';
      let g = x.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, 'rgba(255,236,200,0)'); g.addColorStop(.7, 'rgba(255,236,200,.45)'); g.addColorStop(1, 'rgba(255,236,200,.8)');
      x.fillStyle = g; x.beginPath(); x.moveTo(2, 0); x.lineTo(62, 0); x.lineTo(46, 120); x.lineTo(18, 120); x.fill();
      g = x.createLinearGradient(0, 216, 0, 256); g.addColorStop(0, 'rgba(255,30,20,.0)'); g.addColorStop(.5, 'rgba(255,30,20,.5)'); g.addColorStop(1, 'rgba(255,30,20,0)');
      x.fillStyle = g; x.fillRect(8, 216, 48, 40);
      T.carGlow = new R.CanvasTexture(c);
    }
  }

  /* ---------- cephe dokuları: 6 m x 6 m karo (2 kat x 2 pencere) ---------- */
  // tür: 0 sıvalı apartman (cumbalı/panjurlu), 1 taş/tuğla tarihî, 2 cam ofis kulesi, 3 beton modern
  FX.facade = function (type) {
    if (T['fac' + type]) return T['fac' + type];
    const s = q >= 2 ? 256 : 128, k = s / 256, rnd = srand(11 + type * 7);
    const a = cv(s), ax = a.getContext('2d'), e = cv(s), ex = e.getContext('2d'), r = cv(s), rx = r.getContext('2d');
    ex.fillStyle = '#000'; ex.fillRect(0, 0, s, s); rx.fillStyle = 'rgb(0,235,0)'; rx.fillRect(0, 0, s, s);
    const R_ = (c, x, y, w, h) => { ax.fillStyle = c; ax.fillRect(x * k, y * k, w * k, h * k); };
    const win = (x, y, w, h, frame, glass) => {
      R_(frame, x - 4, y - 4, w + 8, h + 8); R_(glass, x, y, w, h);
      const g = ax.createLinearGradient(x * k, y * k, (x + w) * k, (y + h) * k); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.06)');
      ax.fillStyle = g; ax.fillRect(x * k, y * k, w * k, h * k);
      ex.fillStyle = '#fff'; ex.fillRect(x * k, y * k, w * k, h * k);
      rx.fillStyle = 'rgb(0,18,0)'; rx.fillRect(x * k, y * k, w * k, h * k);
    };
    if (type === 0) {
      R_('#ddd6cb', 0, 0, 256, 256); noiseLayer(ax, s, 16, .12, rnd, 90, 230);
      for (const fy of [0, 128]) {
        R_('#c9c1b4', 0, fy + 118, 256, 10);                                 // kat silmesi
        for (const fx of [0, 128]) {
          win(fx + 34, fy + 26, 60, 78, '#f1ede6', '#2b3440');
          R_('#5d6a5a', fx + 18, fy + 22, 13, 86); R_('#5d6a5a', fx + 97, fy + 22, 13, 86);   // panjur
          ax.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 9; i++) ax.fillRect((fx + 18) * k, (fy + 26 + i * 9) * k, 13 * k, 2 * k), ax.fillRect((fx + 97) * k, (fy + 26 + i * 9) * k, 13 * k, 2 * k);
          R_('#3a3a3a', fx + 30, fy + 104, 68, 4); R_('#3a3a3a', fx + 30, fy + 90, 3, 16); R_('#3a3a3a', fx + 95, fy + 90, 3, 16); // balkon korkuluğu
        }
      }
    } else if (type === 1) {
      R_('#cdbca6', 0, 0, 256, 256);
      for (let y = 0; y < 256; y += 16) for (let x = (y / 16 % 2) * 16 - 16; x < 256; x += 32) { const v = (rnd() - .5) * 26; ax.fillStyle = `rgb(${198 + v | 0},${180 + v | 0},${158 + v | 0})`; ax.fillRect((x + 1) * k, (y + 1) * k, 30 * k, 14 * k); }
      for (const fy of [0, 128]) { R_('#b9a78e', 0, fy + 116, 256, 12); for (const fx of [0, 128]) { R_('#a8957a', fx + 30, fy + 18, 68, 8); win(fx + 38, fy + 30, 52, 76, '#e7dfd2', '#26303a'); R_('#e7dfd2', fx + 62, fy + 30, 4, 76); } }
    } else if (type === 2) {
      R_('#5d7286', 0, 0, 256, 256);
      for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
        const g = ax.createLinearGradient(x * k, y * k, (x + 64) * k, (y + 64) * k), v = rnd() * 30;
        g.addColorStop(0, `rgb(${80 + v | 0},${104 + v | 0},${126 + v | 0})`); g.addColorStop(1, `rgb(${46 + v | 0},${62 + v | 0},${80 + v | 0})`);
        ax.fillStyle = g; ax.fillRect(x * k, y * k, 64 * k, 64 * k);
        ex.fillStyle = '#fff'; ex.fillRect((x + 3) * k, (y + 3) * k, 58 * k, 52 * k);
        rx.fillStyle = 'rgb(0,10,0)'; rx.fillRect(x * k, y * k, 64 * k, 64 * k);
      }
      ax.fillStyle = '#2b3138'; for (let i = 0; i <= 4; i++) { ax.fillRect(i * 64 * k - 2 * k, 0, 4 * k, s); ax.fillRect(0, i * 64 * k - 3 * k, s, 6 * k); }
      rx.fillStyle = 'rgb(0,90,0)'; for (let i = 0; i <= 4; i++) { rx.fillRect(i * 64 * k - 2 * k, 0, 4 * k, s); rx.fillRect(0, i * 64 * k - 3 * k, s, 6 * k); }
    } else {
      R_('#b5b2ad', 0, 0, 256, 256); noiseLayer(ax, s, 24, .2, rnd, 70, 210);
      for (const fy of [0, 128]) { R_('#9c9994', 0, fy + 100, 256, 28); ax.fillStyle = 'rgba(0,0,0,.15)'; ax.fillRect(0, (fy + 126) * k, s, 2 * k);
        win(8, fy + 22, 240, 70, '#4a4d52', '#29313a'); for (let x = 8; x < 250; x += 60) R_('#4a4d52', x, fy + 22, 4, 70); }
    }
    return (T['fac' + type] = { map: tex(a), emissiveMap: tex(e), roughnessMap: tex(r) });
  };
  // zemin kat dükkân vitrinleri (12 m x 4.4 m, 4 dükkân)
  function shopTex() {
    if (T.shop) return T.shop;
    const w = q >= 2 ? 512 : 256, h = w / 4, k = w / 512, rnd = srand(5), a = cv(w, h), ax = a.getContext('2d'), e = cv(w, h), ex = e.getContext('2d');
    const SIGN = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#00838f', '#ef6c00', '#ad1457'], AW = ['#7b1f1f', '#1b3a5c', '#2f4f2f', '#5a3d1e', '#3d3d3d'];
    ax.fillStyle = '#3a3633'; ax.fillRect(0, 0, w, h); ex.fillStyle = '#000'; ex.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x0 = i * 128 * k, sc = SIGN[(rnd() * SIGN.length) | 0];
      ax.fillStyle = sc; ax.fillRect(x0 + 6 * k, 6 * k, 116 * k, 22 * k);
      ax.fillStyle = 'rgba(255,255,255,.85)'; for (let j = 0; j < 5; j++) ax.fillRect(x0 + (22 + j * 17) * k, 12 * k, 11 * k, 10 * k);   // soyut harfler
      ex.fillStyle = sc; ex.fillRect(x0 + 6 * k, 6 * k, 116 * k, 22 * k); ex.fillStyle = '#fff'; for (let j = 0; j < 5; j++) ex.fillRect(x0 + (22 + j * 17) * k, 12 * k, 11 * k, 10 * k);
      ax.fillStyle = AW[(rnd() * AW.length) | 0]; ax.fillRect(x0 + 4 * k, 30 * k, 120 * k, 12 * k);
      ax.fillStyle = 'rgba(255,255,255,.2)'; for (let j = 0; j < 8; j++) ax.fillRect(x0 + (4 + j * 15) * k, 30 * k, 7 * k, 12 * k);
      const g = ax.createLinearGradient(0, 44 * k, 0, 124 * k); g.addColorStop(0, '#2c3a44'); g.addColorStop(1, '#151a1f'); ax.fillStyle = g; ax.fillRect(x0 + 10 * k, 46 * k, 108 * k, 78 * k);
      ax.fillStyle = 'rgba(210,190,150,.35)'; for (let j = 0; j < 6; j++) ax.fillRect(x0 + (16 + j * 17) * k, (80 + rnd() * 20) * k, 10 * k, 30 * k);  // raflar
      ax.fillStyle = '#5a5550'; ax.fillRect(x0 + 62 * k, 46 * k, 4 * k, 78 * k);
      const ge = ex.createLinearGradient(0, 46 * k, 0, 124 * k); ge.addColorStop(0, '#fff2d0'); ge.addColorStop(1, '#a58a5a'); ex.fillStyle = ge; ex.fillRect(x0 + 10 * k, 46 * k, 108 * k, 78 * k);
    }
    return (T.shop = { map: tex(a), emissiveMap: tex(e) });
  }

  /* ---------- malzemeler ---------- */
  const UNI = FX.uni = { uTime: { value: 0 }, uWet: { value: .75 }, uRain: { value: 0 }, uNight: { value: 0 }, tRefl: { value: null }, mRefl: { value: new R.Matrix4() }, uReflOn: { value: 0 }, tPud: { value: null } };
  FX.mat = function (c, o) {
    if (FX.Q === 0) return new R.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
    return new R.MeshStandardMaterial(Object.assign({ color: c, roughness: .82, metalness: 0, envMapIntensity: .45 }, o || {}));
  };
  FX.paint = function (c, metallic) {
    if (FX.Q === 0) return new R.MeshLambertMaterial({ color: c });
    return new R.MeshPhysicalMaterial({ color: c, roughness: metallic ? .32 : .42, metalness: metallic ? .55 : .05, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.1 });
  };
  FX.glass = () => FX.Q === 0 ? new R.MeshLambertMaterial({ color: 0x1c2a35 }) : new R.MeshStandardMaterial({ color: 0x0d1318, roughness: .04, metalness: .3, envMapIntensity: 1.6 });
  FX.chrome = () => FX.Q === 0 ? new R.MeshLambertMaterial({ color: 0xa7adb3 }) : new R.MeshStandardMaterial({ color: 0xd8dce2, roughness: .16, metalness: 1, envMapIntensity: 1.2 });

  const GLSL_HASH = `
  float fxH(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }`;

  // ıslak yüzey (asfalt / kaldırım): birikinti, yağmur halkaları, ayna yansıması
  FX.wetify = function (m, opt) {
    if (FX.Q === 0) return m;
    opt = Object.assign({ pud: 1, refl: 1, scale: .035 }, opt || {});
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, UNI);
      sh.uniforms.uPudK = { value: opt.pud }; sh.uniforms.uReflK = { value: opt.refl }; sh.uniforms.uPS = { value: opt.scale };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec4 vRC; uniform mat4 mRefl;')
        .replace('#include <fog_vertex>', '#include <fog_vertex>\n#ifdef USE_INSTANCING\nvWP=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;\n#else\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;\n#endif\nvRC=mRefl*vec4(vWP,1.);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec4 vRC; uniform float uTime,uWet,uRain,uReflOn,uPudK,uReflK,uPS; uniform sampler2D tRefl,tPud; ${GLSL_HASH}
        float fxWet; float fxPud;
        vec2 fxRipple(vec2 p, float t){ vec2 i=floor(p), f=fract(p)-.5; float h=fxH(i); float ph=fract(t*.9+h); vec2 c=(vec2(fxH(i+3.1),fxH(i+7.7))-.5)*.5; vec2 d=f-c; float r=length(d);
          float ring=sin((r-ph*.45)*55.)*(1.-ph)*smoothstep(.45*ph+.06,.45*ph,r)*smoothstep(.45*ph-.12,.45*ph,r); return normalize(d+1e-4)*ring; }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        { float pm=texture2D(tPud,vWP.xz*uPS).r*.8+texture2D(tPud,vWP.xz*uPS*3.7).g*.35;
          fxPud=smoothstep(.62,.7,pm+uWet*.18)*uPudK*step(.05,uWet);
          fxWet=clamp(uWet,0.,1.)*mix(.65,1.,fxPud);
          diffuseColor.rgb*=mix(1.,.42,fxWet*(.55+.45*fxPud));
          roughnessFactor=mix(roughnessFactor,mix(.32,.03,fxPud),fxWet); }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { normal=normalize(mix(normal,normalize(vNormal),fxPud*fxWet));
          if(uRain>.01){ vec2 rp=fxRipple(vWP.xz*1.6,uTime)+fxRipple(vWP.xz*1.6+17.3,uTime*1.13+.5); normal=normalize(normal+(viewMatrix*vec4(rp.x,0.,rp.y,0.)).xyz*uRain*.55); } }`)
        .replace('#include <tonemapping_fragment>', `
        if(uReflOn>.5&&fxWet>.01){
          vec3 V=normalize(vViewPosition); float ndv=clamp(dot(normal,V),0.,1.);
          float F=.035+.965*pow(1.-ndv,5.);
          vec3 vn=normal-(viewMatrix*vec4(0.,1.,0.,0.)).xyz;
          vec4 rc=vRC; rc.xy+=vn.xy*(.06+.25*(1.-fxPud))*rc.w;
          float sp=mix(.018,.0025,fxPud)*rc.w; vec3 rf=vec3(0.);
          rf+=texture2DProj(tRefl,rc).rgb*.3; rf+=texture2DProj(tRefl,rc+vec4(0.,sp,0.,0.)).rgb*.2; rf+=texture2DProj(tRefl,rc-vec4(0.,sp,0.,0.)).rgb*.2;
          rf+=texture2DProj(tRefl,rc+vec4(sp*.35,sp*2.3,0.,0.)).rgb*.15; rf+=texture2DProj(tRefl,rc-vec4(sp*.35,sp*2.3,0.,0.)).rgb*.15;
          float k=clamp(fxWet*mix(.35,1.,fxPud)*(.18+.82*F)*uReflK,0.,.92);
          gl_FragColor.rgb=mix(gl_FragColor.rgb,rf,k);
        }
        #include <tonemapping_fragment>`);
    };
    m.customProgramCacheKey = () => 'wet' + opt.pud + opt.refl;
    return m;
  };
  FX.makeSea = function () {
    if (FX.Q === 0) return new R.MeshLambertMaterial({ color: 0x1d6b86 });
    const n = T.waterN.clone(); n.needsUpdate = true; n.repeat.set(90, 180); FX._water = n;
    return new R.MeshStandardMaterial({ color: 0x1d6b86, roughness: .1, metalness: .15, normalMap: n, normalScale: new R.Vector2(.45, .45), envMapIntensity: 1.25 });
  };
  FX.roadMat = null;
  FX.makeRoad = function (rep) {
    if (FX.Q === 0) return FX.roadMat = new R.MeshLambertMaterial({ color: 0x3b3a42 });
    const map = T.asphalt.clone(), nrm = T.asphaltN.clone(); map.needsUpdate = nrm.needsUpdate = true; map.repeat.set(rep, rep); nrm.repeat.set(rep, rep);
    const m = new R.MeshStandardMaterial({ color: 0xffffff, map, normalMap: nrm, normalScale: new R.Vector2(.55, .55), roughness: .92, metalness: 0, envMapIntensity: .45 });
    return FX.roadMat = FX.wetify(m, { pud: 1, refl: 1 });
  };
  FX.makePaving = function (rep) {
    if (FX.Q === 0) return new R.MeshLambertMaterial({ color: 0x9c9288 });
    const map = T.paving.clone(), nrm = T.pavingN.clone(); map.needsUpdate = nrm.needsUpdate = true; map.repeat.set(rep, rep); nrm.repeat.set(rep, rep);
    return FX.wetify(new R.MeshStandardMaterial({ color: 0xffffff, map, normalMap: nrm, normalScale: new R.Vector2(.6, .6), roughness: .88, envMapIntensity: .45 }), { pud: .35, refl: .7, scale: .06 });
  };
  // cephe malzemesi: pencere ışıkları bina başına rastgele, zemin katta dükkân vitrinleri, çatı düz
  FX.facadeMat = function (type, color, vcol) {
    const F = FX.facade(type);
    if (FX.Q === 0) return new R.MeshLambertMaterial({ color, map: F.map, emissiveMap: F.emissiveMap, emissive: 0, vertexColors: !!vcol });
    const S = shopTex();
    const m = new R.MeshStandardMaterial({ color, map: F.map, emissiveMap: F.emissiveMap, emissive: 0x000000, roughnessMap: F.roughnessMap, roughness: 1, metalness: type === 2 ? .35 : 0, envMapIntensity: type === 2 ? 1.1 : .5, vertexColors: !!vcol });
    m.onBeforeCompile = sh => {
      sh.uniforms.tShop = { value: S.map }; sh.uniforms.tShopE = { value: S.emissiveMap }; sh.uniforms.uNight = UNI.uNight;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
        .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz; vWN=normalize(mat3(modelMatrix)*objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; uniform sampler2D tShop,tShopE; uniform float uNight; ${GLSL_HASH}
        float fxShop; float fxRoof; vec2 fxSU; float fxSeed;`)
        .replace('#include <map_fragment>', `
        fxRoof=step(.6,vWN.y); fxShop=(1.-fxRoof)*step(vWP.y,${type === 2 ? '5.0' : '4.6'})*step(.6,vWP.y);
        fxSeed=0.;
        #ifdef USE_COLOR
          fxSeed=floor(vColor.r*40.+.5)+floor(vColor.g*40.+.5)*3.+floor(vColor.b*40.+.5)*7.;
        #endif
        fxSeed+=floor(dot(vWP.xz,vec2(.013,.017))*3.);
        fxSU=vec2(vUv.x*.5+fxH(vec2(fxSeed,1.7))*.75,(vWP.y-.6)/4.0);
        #include <map_fragment>
        if(fxShop>.5){ vec3 sc=texture2D(tShop,fxSU).rgb; diffuseColor.rgb=sc; }
        if(fxRoof>.5){ diffuseColor.rgb=vec3(.27,.26,.25)*(.85+.3*fxH(floor(vWP.xz*1.3))); }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        if(fxShop>.5) roughnessFactor=mix(.85,.08,step(.18,fxSU.y)*step(fxSU.y,.95)); if(fxRoof>.5) roughnessFactor=.95;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec2 cell=floor(vUv*2.)+vec2(fxSeed); float h=fxH(cell+floor(vWN.xz*3.+.5)); float lit=step(.6,h);
          vec3 wc=mix(vec3(1.,.72,.42),vec3(.72,.85,1.),step(.86,h));
          totalEmissiveRadiance*=lit*wc*(.75+.5*fxH(cell*1.7));
          if(fxShop>.5){ float on=step(.18,fxH(vec2(floor(fxSU.x*4.),fxSeed))); totalEmissiveRadiance=texture2D(tShopE,fxSU).rgb*on*uNight*vec3(1.05,.95,.8); }
          if(fxRoof>.5) totalEmissiveRadiance=vec3(0.); }`);
    };
    m.customProgramCacheKey = () => 'fac' + type + (vcol ? 'v' : '');
    return m;
  };

  /* ---------- gökyüzü ---------- */
  const SKYV = `varying vec3 vDir; void main(){ vec4 wp=modelMatrix*vec4(position,1.); vDir=wp.xyz-cameraPosition; vec4 p=projectionMatrix*viewMatrix*wp; gl_Position=p.xyww; gl_Position.z*=.99999; }`;
  const SKYF = `varying vec3 vDir; uniform vec3 uTop,uMid,uHor,uGnd,uSunC,uSunD,uCloudC,uGlow; uniform float uCloud,uStars,uTime,uSunS,uOct;
    float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float h3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
    float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ if(float(i)>=uOct) break; s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
    void main(){ vec3 d=normalize(vDir); float h=d.y; vec3 c;
      if(h>0.){ c=mix(uHor,uMid,smoothstep(0.,.22,h)); c=mix(c,uTop,smoothstep(.18,.85,h)); }
      else c=mix(uHor,uGnd,smoothstep(0.,-.12,h));
      float sd=max(dot(d,uSunD),0.);
      c+=uSunC*(pow(sd,6.)*.28+pow(sd,48.)*.5)*smoothstep(-.1,.05,h);
      c+=uGlow*exp(-max(h,0.)*9.);
      float cl=0.;
      if(h>0.&&uCloud>0.){ vec2 p=d.xz/(h+.15)*1.3+vec2(uTime*.006,uTime*.002); float n=fbm(p); cl=smoothstep(.5,.85,n)*uCloud*smoothstep(0.,.12,h);
        vec3 cc=mix(uCloudC,uCloudC*.55,smoothstep(.6,.95,n))+uSunC*pow(sd,5.)*.6; c=mix(c,cc,cl*.9); }
      c+=uSunC*uSunS*smoothstep(.99935,.9997,sd)*(1.-cl);
      if(uStars>0.&&h>0.){ vec3 q=d*260.; vec3 id=floor(q); float r=h3(id); vec3 f=fract(q)-.5; float st=step(.9965,r)*smoothstep(.32,0.,length(f))*(.5+.5*sin(uTime*3.+r*90.));
        c+=vec3(st*uStars*(1.-cl)*smoothstep(0.,.25,h)*1.4); }
      gl_FragColor=vec4(c,1.);
      #include <encodings_fragment>
    }`;
  const skyMat = new R.ShaderMaterial({
    uniforms: { uTop: { value: new R.Color() }, uMid: { value: new R.Color() }, uHor: { value: new R.Color() }, uGnd: { value: new R.Color(0x3a3836) }, uSunC: { value: new R.Color() }, uSunD: { value: new R.Vector3(0, 1, 0) },
      uCloudC: { value: new R.Color() }, uGlow: { value: new R.Color(0) }, uCloud: { value: .5 }, uStars: { value: 0 }, uTime: UNI.uTime, uSunS: { value: 6 }, uOct: { value: q >= 2 ? 5 : 3 } },
    vertexShader: SKYV, fragmentShader: SKYF, side: R.BackSide, depthWrite: false, fog: false });
  FX.skyMat = skyMat;

  /* ---------- zaman / atmosfer ön ayarları ---------- */
  const v3 = (x, y, z) => new R.Vector3(x, y, z).normalize();
  FX.TIME = {
    day: { top: 0x2f6fbe, mid: 0x76abdc, hor: 0xd4e4ee, gnd: 0x5d5a55, sun: [1.15, 1.05, .92], dir: v3(.55, .72, .42), sunS: 7, cloud: .55, cloudC: 0xf3f5f8, stars: 0, glow: [0, 0, 0],
      grade: { expo: 1.18, sat: 1.06, con: 1.07, lift: [0, .004, .014], gain: [1.03, 1.0, .965], vig: .28, bloom: .28, th: 1.05 }, fog: 0xc9dbe6, fogN: 120, fogF: 700 },
    dusk: { top: 0x16203e, mid: 0x5e4a72, hor: 0xf39456, gnd: 0x3c3036, sun: [1.9, .9, .42], dir: v3(-.82, .2, .52), sunS: 5, cloud: .62, cloudC: 0x9a5f73, stars: .15, glow: [.12, .05, .02],
      grade: { expo: 1.12, sat: 1.1, con: 1.1, lift: [0, .018, .04], gain: [1.08, .98, .87], vig: .38, bloom: .55, th: .95 }, fog: 0xc68570, fogN: 80, fogF: 560 },
    night: { top: 0x01030a, mid: 0x060b1a, hor: 0x1b2032, gnd: 0x100e10, sun: [.42, .5, .72], dir: v3(.32, .62, -.5), sunS: 3, cloud: .38, cloudC: 0x23222c, stars: 1, glow: [.3, .17, .08],
      grade: { expo: 1.32, sat: 1.04, con: 1.12, lift: [0, .012, .034], gain: [1.06, .97, .88], vig: .48, bloom: .7, th: .92 }, fog: 0x161926, fogN: 50, fogF: 470 }
  };
  const GR = FX.grade = { expo: 1.15, sat: 1.05, con: 1.08, lift: new R.Vector3(), gain: new R.Vector3(1, 1, 1), vig: .35, bloom: .5, th: .95 };
  FX.sunOff = new R.Vector3(60, 80, 30);

  /* ---------- post-proses ---------- */
  const QV = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
  const quadScene = new R.Scene(), quadCam = new R.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new R.Mesh(new R.PlaneGeometry(2, 2)); quad.frustumCulled = false; quadScene.add(quad);
  const brightM = new R.ShaderMaterial({ uniforms: { t: { value: null }, uTh: { value: 1 } }, vertexShader: QV, depthTest: false, depthWrite: false,
    fragmentShader: `varying vec2 vUv; uniform sampler2D t; uniform float uTh; void main(){ vec3 c=min(texture2D(t,vUv).rgb,vec3(10.)); float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(uTh,uTh+.45,l),1.); }` });
  const blurM = new R.ShaderMaterial({ uniforms: { t: { value: null }, uD: { value: new R.Vector2() } }, vertexShader: QV, depthTest: false, depthWrite: false,
    fragmentShader: `varying vec2 vUv; uniform sampler2D t; uniform vec2 uD; void main(){ vec3 c=texture2D(t,vUv).rgb*.2270270;
      c+=(texture2D(t,vUv+uD*1.3846154).rgb+texture2D(t,vUv-uD*1.3846154).rgb)*.3162162; c+=(texture2D(t,vUv+uD*3.2307692).rgb+texture2D(t,vUv-uD*3.2307692).rgb)*.0702703; gl_FragColor=vec4(c,1.); }` });
  const copyM = new R.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: QV, depthTest: false, depthWrite: false, fragmentShader: `varying vec2 vUv; uniform sampler2D t; void main(){ gl_FragColor=texture2D(t,vUv); }` });
  const compM = new R.ShaderMaterial({
    uniforms: { tS: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, uBloom: { value: .5 }, uExpo: { value: 1.1 }, uSat: { value: 1 }, uCon: { value: 1 }, uLift: { value: new R.Vector3() }, uGain: { value: new R.Vector3(1, 1, 1) },
      uVig: { value: .35 }, uGrain: { value: .025 }, uTime: UNI.uTime, uBlur: { value: 0 }, uCA: { value: .0015 }, uRes: { value: new R.Vector2(1, 1) }, uFlash: { value: 0 } },
    vertexShader: QV, depthTest: false, depthWrite: false,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tS,tB0,tB1,tB2; uniform float uBloom,uExpo,uSat,uCon,uVig,uGrain,uTime,uBlur,uCA,uFlash; uniform vec3 uLift,uGain; uniform vec2 uRes;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
      float hh(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec2 uv=vUv, dc=uv-.5; float r2=dot(dc,dc);
        vec3 c; c.g=texture2D(tS,uv).g; c.r=texture2D(tS,uv-dc*uCA*r2*4.).r; c.b=texture2D(tS,uv+dc*uCA*r2*4.).b;
        if(uBlur>.0005){ vec3 a=c; for(int i=1;i<=6;i++){ a+=texture2D(tS,uv-dc*uBlur*float(i)*smoothstep(.02,.3,r2)).rgb; } c=a/7.; }
        vec3 b=texture2D(tB0,uv).rgb*.55+texture2D(tB1,uv).rgb*.4+texture2D(tB2,uv).rgb*.35;
        c+=b*uBloom;
        vec3 lin=pow(max(c,0.),vec3(2.2))*uExpo;
        lin=aces(lin);
        c=pow(lin,vec3(1./2.2));
        float l=dot(c,vec3(.2126,.7152,.0722));
        c=mix(vec3(l),c,uSat);
        c=(c-.5)*uCon+.5;
        c+=uLift*pow(1.-l,2.);
        c*=mix(vec3(1.),uGain,smoothstep(.25,1.,l));
        c*=1.-uVig*smoothstep(.12,.75,r2*1.9);
        c+=(hh(uv*uRes+fract(uTime)*91.)-.5)*uGrain;
        c+=uFlash;
        gl_FragColor=vec4(clamp(c,0.,1.),1.); }` });

  let ren, scn, cam, rtS, rtR, bA = [], bB = [], levels = 3, ftype = R.UnsignedByteType, msaa = false, sky, envGen, envRT, envScene, rain, reflHide = [], reflCam = new R.PerspectiveCamera(), sz = new R.Vector2();
  FX.reflHide = reflHide; FX.dyn = [];
  FX.post = () => FX.q > 0;
  FX.refl = () => FX.q >= 2;

  function mkRT(w, h, ms) {
    const o = { type: ftype, format: R.RGBAFormat, minFilter: R.LinearFilter, magFilter: R.LinearFilter, depthBuffer: true, stencilBuffer: false };
    let t;
    if (ms && R.WebGLMultisampleRenderTarget) { t = new R.WebGLMultisampleRenderTarget(w, h, o); t.samples = FX.q >= 3 ? 4 : FX.q >= 2 ? 4 : 2; }
    else t = new R.WebGLRenderTarget(w, h, o);
    t.texture.generateMipmaps = false; return t;
  }
  function freeRTs() { [rtS, rtR, ...bA, ...bB].forEach(t => t && t.dispose()); rtS = rtR = null; bA = []; bB = []; }
  function buildRTs() {
    freeRTs(); if (!FX.post()) return;
    ren.getDrawingBufferSize(sz); const w = Math.max(2, sz.x | 0), h = Math.max(2, sz.y | 0);
    rtS = mkRT(w, h, msaa);
    if (FX.refl()) { const k = FX.q >= 3 ? .75 : .5; rtR = mkRT(Math.max(2, w * k | 0), Math.max(2, h * k | 0), false); }
    levels = FX.q >= 2 ? 3 : 2;
    for (let i = 0; i < 3; i++) { const d = 2 << i, bw = Math.max(2, w / d | 0), bh = Math.max(2, h / d | 0); bA.push(mkRT(bw, bh)); bB.push(mkRT(bw, bh)); bA[i].depthBuffer = bB[i].depthBuffer = false; }
    compM.uniforms.uRes.value.set(w, h);
  }
  function pass(m, target) { quad.material = m; ren.setRenderTarget(target); ren.render(quadScene, quadCam); }

  /* ---------- yağmur ---------- */
  function makeRain() {
    const N = [0, 900, 1800, 2600][FX.q] || 900, pos = new Float32Array(N * 6), sd = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = Math.random() * 80 - 40, y = Math.random() * 30, z = Math.random() * 80 - 40;
      for (let k = 0; k < 2; k++) { pos[i * 6 + k * 3] = x; pos[i * 6 + k * 3 + 1] = y; pos[i * 6 + k * 3 + 2] = z; sd[i * 2 + k] = k; }
    }
    const g = new R.BufferGeometry(); g.setAttribute('position', new R.BufferAttribute(pos, 3)); g.setAttribute('aEnd', new R.BufferAttribute(sd, 1));
    const m = new R.ShaderMaterial({ uniforms: { uTime: UNI.uTime, uCam: { value: new R.Vector3() }, uA: { value: .3 }, uC: { value: new R.Color(.7, .75, .85) } }, transparent: true, depthWrite: false, blending: R.AdditiveBlending, fog: false,
      vertexShader: `attribute float aEnd; uniform float uTime; uniform vec3 uCam; varying float vA;
        void main(){ vec3 p=position; float sp=17.+fract(p.x*7.13)*6.; p.y=mod(p.y-uTime*sp,30.); p.xz=uCam.xz+mod(p.xz-uCam.xz+vec2(uTime*1.2,0.)+40.,80.)-40.; p.y+=uCam.y-8.;
          p+=vec3(-.05,.62,0.)*aEnd; vA=mix(.15,1.,aEnd); gl_Position=projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform float uA; uniform vec3 uC; varying float vA; void main(){ gl_FragColor=vec4(uC*uA*vA,1.); }` });
    const l = new R.LineSegments(g, m); l.frustumCulled = false; l.renderOrder = 10; l.visible = false; return l;
  }

  /* ---------- başlatma ---------- */
  FX.init = function (renderer, scene, camera) {
    ren = renderer; scn = scene; cam = camera;
    makeTextures();
    UNI.tPud.value = T.puddle;
    if (FX.Q === 0) return;
    const gl = renderer.getContext(), ext = renderer.extensions, w2 = renderer.capabilities.isWebGL2;
    if ((w2 && ext.has('EXT_color_buffer_float')) || (!w2 && ext.has('OES_texture_half_float') && ext.has('EXT_color_buffer_half_float'))) ftype = R.HalfFloatType;
    msaa = w2 && !!R.WebGLMultisampleRenderTarget;
    // gök kubbe
    sky = new R.Mesh(new R.SphereGeometry(1000, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -1000; scene.add(sky); FX.dyn.push(sky);
    // çevre (yansıma) haritası için ayrı küçük sahne
    envScene = new R.Scene(); const es = new R.Mesh(new R.SphereGeometry(40, 32, 16), skyMat); envScene.add(es);
    const gd = new R.Mesh(new R.CircleGeometry(38, 24), new R.MeshBasicMaterial({ color: 0x2e2c2b })); gd.rotation.x = -Math.PI / 2; gd.position.y = -1.5; envScene.add(gd); FX._envGround = gd;
    // şehir silüeti yansıması: ufukta pencereli bant (gece parlar)
    {
      const c = cv(256, 32), x = c.getContext('2d'); const rr = srand(3);
      for (let i = 0; i < 90; i++) { const bx = rr() * 256, bh = 6 + rr() * 22, bw = 4 + rr() * 10; x.fillStyle = '#1a1a1e'; x.fillRect(bx, 32 - bh, bw, bh); x.fillStyle = 'rgba(255,190,110,.9)'; for (let k = 0; k < 6; k++) x.fillRect(bx + rr() * bw, 32 - rr() * bh, 1, 1); }
      const t = new R.CanvasTexture(c); t.wrapS = R.RepeatWrapping; t.repeat.set(3, 1);
      const band = new R.Mesh(new R.CylinderGeometry(36, 36, 6, 32, 1, true), new R.MeshBasicMaterial({ map: t, side: R.BackSide, alphaTest: .5 })); band.position.y = 1.5; envScene.add(band); FX._envBand = band;
    }
    envGen = new R.PMREMGenerator(renderer);
    rain = makeRain(); scene.add(rain); reflHide.push(rain);
    buildRTs();
  };
  let lastSz = '';
  FX.resize = function () { if (!ren || FX.Q === 0) return; ren.getDrawingBufferSize(sz); const k = sz.x + 'x' + sz.y + ':' + FX.q; if (k === lastSz) return; lastSz = k; buildRTs(); };
  FX.setQuality = function (nq) { FX.q = FX.Q === 0 ? 0 : Math.max(1, nq | 0); if (ren && FX.Q > 0) { if (rain) { scn.remove(rain); rain.geometry.dispose(); const i = reflHide.indexOf(rain); if (i >= 0) reflHide.splice(i, 1); } rain = makeRain(); scn.add(rain); reflHide.push(rain); lastSz = ''; FX.resize(); applyWeather(); } };

  function updateEnv() {
    if (!envGen) return;
    if (envRT) envRT.dispose();
    envRT = envGen.fromScene(envScene, .02, .1, 200);
    scn.environment = envRT.texture;
  }
  const col = (u, hex) => u.value.setHex(hex);
  FX.setTime = function (m) {
    const P = FX.TIME[m]; if (!P) return;
    FX.night = m === 'night' ? 1 : 0; FX.dusk = m === 'dusk' ? 1 : 0; UNI.uNight.value = m === 'night' ? 1 : m === 'dusk' ? .65 : 0;
    const G = P.grade; Object.assign(GR, { expo: G.expo, sat: G.sat, con: G.con, vig: G.vig, bloom: G.bloom, th: G.th }); GR.lift.set(...G.lift); GR.gain.set(...G.gain);
    FX.sunOff.copy(P.dir).multiplyScalar(110);
    FX.fog = P;
    if (FX.Q === 0) return;
    const U = skyMat.uniforms; col(U.uTop, P.top); col(U.uMid, P.mid); col(U.uHor, P.hor); col(U.uGnd, P.gnd); U.uSunC.value.setRGB(...P.sun); U.uSunD.value.copy(P.dir);
    col(U.uCloudC, P.cloudC); U.uCloud.value = P.cloud * (FX.weather === 'rain' ? 1.6 : FX.weather === 'wet' ? 1.2 : 1); U.uStars.value = FX.weather === 'rain' ? 0 : P.stars; U.uGlow.value.setRGB(...P.glow); U.uSunS.value = FX.weather === 'rain' ? 0 : P.sunS;
    if (FX._envGround) FX._envGround.material.color.setHex(m === 'night' ? 0x08080a : m === 'dusk' ? 0x2a2224 : 0x55524e);
    if (FX._envBand) { FX._envBand.material.color.setScalar(m === 'night' ? 1.4 : m === 'dusk' ? .45 : .25); }
    if (FX.weather === 'rain') { // bulutlu, gri gök
      const k = .55; ['uTop', 'uMid', 'uHor'].forEach(n => { const c = U[n].value, l = c.r * .3 + c.g * .5 + c.b * .2; c.lerp(new R.Color(l, l, l * 1.05), k); });
      U.uCloudC.value.multiplyScalar(.8);
    }
    updateEnv();
  };
  function applyWeather() {
    const w = FX.weather;
    UNI.uWet.value = w === 'dry' ? 0 : w === 'wet' ? .72 : 1;
    UNI.uRain.value = w === 'rain' ? 1 : 0;
    if (rain) rain.visible = w === 'rain' && FX.q > 0;
  }
  FX.setWeather = function (w) { FX.weather = w; try { localStorage.setItem('ist-wx', w); } catch (e) {} applyWeather(); };
  applyWeather();

  /* ---------- kare ---------- */
  let speed = 0, flash = 0;
  FX.flash = k => { flash = Math.max(flash, k); };
  FX.update = function (dt, v) { UNI.uTime.value += dt; if (FX._water) { FX._water.offset.x += dt * .004; FX._water.offset.y += dt * .0025; } speed = v; flash *= Math.pow(.02, dt); };

  const RP = new R.Vector3(), RN = new R.Vector3(0, 1, 0), CP = new R.Vector3(), V = new R.Vector3(), TG = new R.Vector3(), LA = new R.Vector3(), RM = new R.Matrix4(), PL = new R.Plane(), CL = new R.Vector4(), Q4 = new R.Vector4();
  const dummyT = new R.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, R.RGBAFormat); dummyT.needsUpdate = true;
  UNI.tRefl.value = dummyT;
  function reflectPass() {
    RP.set(0, .02, 0);
    CP.setFromMatrixPosition(cam.matrixWorld);
    V.subVectors(RP, CP); if (V.dot(RN) > 0) { UNI.uReflOn.value = 0; return; }
    V.reflect(RN).negate(); V.add(RP);
    RM.extractRotation(cam.matrixWorld);
    LA.set(0, 0, -1).applyMatrix4(RM).add(CP);
    TG.subVectors(RP, LA); TG.reflect(RN).negate(); TG.add(RP);
    reflCam.position.copy(V); reflCam.up.set(0, 1, 0).applyMatrix4(RM).reflect(RN); reflCam.lookAt(TG);
    reflCam.far = cam.far; reflCam.near = cam.near; reflCam.updateMatrixWorld(); reflCam.projectionMatrix.copy(cam.projectionMatrix);
    const tm = UNI.mRefl.value; tm.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1); tm.multiply(reflCam.projectionMatrix); tm.multiply(reflCam.matrixWorldInverse);
    PL.setFromNormalAndCoplanarPoint(RN, RP); PL.applyMatrix4(reflCam.matrixWorldInverse);
    CL.set(PL.normal.x, PL.normal.y, PL.normal.z, PL.constant);
    const pm = reflCam.projectionMatrix, e = pm.elements;
    Q4.x = (Math.sign(CL.x) + e[8]) / e[0]; Q4.y = (Math.sign(CL.y) + e[9]) / e[5]; Q4.z = -1; Q4.w = (1 + e[10]) / e[14];
    CL.multiplyScalar(2 / CL.dot(Q4)); e[2] = CL.x; e[6] = CL.y; e[10] = CL.z + 1 - .003; e[14] = CL.w;
    const vis = reflHide.map(o => o.visible); reflHide.forEach(o => { o.visible = false; });
    const su = ren.shadowMap.needsUpdate; ren.shadowMap.needsUpdate = false;
    UNI.uReflOn.value = 0; UNI.tRefl.value = dummyT;
    ren.setRenderTarget(rtR); ren.render(scn, reflCam);
    ren.shadowMap.needsUpdate = su;
    reflHide.forEach((o, i) => { o.visible = vis[i]; });
    UNI.tRefl.value = rtR.texture; UNI.uReflOn.value = 1;
  }

  FX.render = function () {
    if (sky) sky.position.copy(cam.position);
    if (rain) rain.material.uniforms.uCam.value.copy(cam.position);
    if (!FX.post() || !rtS) { UNI.uReflOn.value = 0; ren.setRenderTarget(null); ren.render(scn, cam); return; }
    if (FX.refl() && rtR && UNI.uWet.value > .01) reflectPass(); else UNI.uReflOn.value = 0;
    ren.setRenderTarget(rtS); ren.render(scn, cam);
    // bloom
    brightM.uniforms.t.value = rtS.texture; brightM.uniforms.uTh.value = GR.th; pass(brightM, bA[0]);
    for (let i = 0; i < levels; i++) {
      if (i > 0) { copyM.uniforms.t.value = bA[i - 1].texture; pass(copyM, bA[i]); }
      blurM.uniforms.t.value = bA[i].texture; blurM.uniforms.uD.value.set(1 / bA[i].width, 0); pass(blurM, bB[i]);
      blurM.uniforms.t.value = bB[i].texture; blurM.uniforms.uD.value.set(0, 1 / bA[i].height); pass(blurM, bA[i]);
    }
    const U = compM.uniforms;
    U.tS.value = rtS.texture; U.tB0.value = bA[0].texture; U.tB1.value = bA[1].texture; U.tB2.value = (levels > 2 ? bA[2] : bA[1]).texture;
    U.uBloom.value = GR.bloom * (FX.weather === 'rain' ? 1.25 : 1); U.uExpo.value = GR.expo; U.uSat.value = GR.sat * (FX.weather === 'rain' ? .9 : 1); U.uCon.value = GR.con; U.uLift.value.copy(GR.lift); U.uGain.value.copy(GR.gain); U.uVig.value = GR.vig;
    const sp = Math.max(0, Math.abs(speed) - 16) / 50; U.uBlur.value = Math.min(.018, sp * .02); U.uCA.value = .0012 + Math.min(.004, sp * .004); U.uGrain.value = FX.night ? .035 : .022; U.uFlash.value = flash;
    pass(compM, null);
  };
})();
