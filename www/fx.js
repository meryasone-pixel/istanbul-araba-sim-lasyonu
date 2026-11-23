/* fx.js — Boğaz Drive çizim yardımcıları
   Oyun tek grafik ayarıyla çalışır (eski "Düşük"): basit ışıklı malzemeler, efekt yok → zayıf telefonlarda da akıcı.
   Orta/Yüksek efektleri (yansıma, parlama, ıslak yol, yağmur, gök kubbe) ve onların dokuları kaldırıldı. */
(function () {
  'use strict';
  const R = THREE, FX = window.FX = {};

  FX.q = 0;          // eski kalite değişkeni: yayalar okuyor, hep 0 (tek ayar)

  /* ---------- yardımcılar ---------- */
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; };
  const srand = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const tex = (c, rep) => { const t = new R.CanvasTexture(c); t.wrapS = t.wrapT = R.RepeatWrapping; if (rep) t.repeat.set(rep, rep); t.anisotropy = 4; return t; };
  FX.cv = cv;

  // yumuşak değer gürültüsü (küçük rastgele tuvali büyüterek) — döşenebilir
  function noiseLayer(x, size, cells, alpha, rnd, lo, hi) {
    const s = cv(cells, cells), sx = s.getContext('2d'), d = sx.createImageData(cells, cells);
    for (let i = 0; i < cells * cells; i++) { const v = (lo + (hi - lo) * rnd()) | 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    sx.putImageData(d, 0, 0);
    x.save(); x.globalAlpha = alpha; x.imageSmoothingEnabled = true;
    const k = size / cells;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) x.drawImage(s, a * size - k / 2, b * size - k / 2, size + k, size + k);
    x.restore();
  }

  /* ---------- prosedürel dokular (yalnız kullanılanlar) ---------- */
  const T = FX.T = {};
  function makeTextures() {
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
    // yumuşak ışık lekesi (sokak lambası havuzu, far izi) + araç altı gölge lekesi
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
  // tür: 0 sıvalı apartman (cumbalı/panjurlu), 1 taş/tuğla tarihî, 3 beton modern
  FX.facade = function (type) {
    if (T['fac' + type]) return T['fac' + type];
    const s = 128, k = s / 256, rnd = srand(11 + type * 7);
    const a = cv(s), ax = a.getContext('2d'), e = cv(s), ex = e.getContext('2d');
    ex.fillStyle = '#000'; ex.fillRect(0, 0, s, s);
    const R_ = (c, x, y, w, h) => { ax.fillStyle = c; ax.fillRect(x * k, y * k, w * k, h * k); };
    const win = (x, y, w, h, frame, glass) => {
      R_(frame, x - 4, y - 4, w + 8, h + 8); R_(glass, x, y, w, h);
      const g = ax.createLinearGradient(x * k, y * k, (x + w) * k, (y + h) * k); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.06)');
      ax.fillStyle = g; ax.fillRect(x * k, y * k, w * k, h * k);
      ex.fillStyle = '#fff'; ex.fillRect(x * k, y * k, w * k, h * k);
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
    } else {
      R_('#b5b2ad', 0, 0, 256, 256); noiseLayer(ax, s, 24, .2, rnd, 70, 210);
      for (const fy of [0, 128]) { R_('#9c9994', 0, fy + 100, 256, 28); ax.fillStyle = 'rgba(0,0,0,.15)'; ax.fillRect(0, (fy + 126) * k, s, 2 * k);
        win(8, fy + 22, 240, 70, '#4a4d52', '#29313a'); for (let x = 8; x < 250; x += 60) R_('#4a4d52', x, fy + 22, 4, 70); }
    }
    return (T['fac' + type] = { map: tex(a), emissiveMap: tex(e) });
  };

  /* ---------- malzemeler (basit ışıklı: hızlı) ---------- */
  FX.mat = (c, o) => new R.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  FX.capCol = c => { const mx = Math.max(c.r, c.g, c.b); if (mx > .74) c.multiplyScalar(.74 / mx); return c; };
  // çok açık boyalar (beyaz/gümüş) ışık gibi parlamasın → en açık tonu sınırla
  FX.paint = c => new R.MeshLambertMaterial({ color: FX.capCol(new R.Color(c)) });
  FX.glass = () => new R.MeshLambertMaterial({ color: 0x1c2a35 });
  FX.chrome = () => new R.MeshLambertMaterial({ color: 0xa7adb3 });
  FX.wetify = m => m;          // eski ıslak yol efekti kaldırıldı (çağıran yerler bozulmasın diye boş)
  FX.makeSea = () => new R.MeshLambertMaterial({ color: 0x1d6b86 });
  FX.roadMat = null;
  FX.makeRoad = () => (FX.roadMat = new R.MeshLambertMaterial({ color: 0x3b3a42 }));
  FX.makePaving = () => new R.MeshLambertMaterial({ color: 0x9c9288 });
  FX.facadeMat = function (type, color, vcol) {
    const F = FX.facade(type);
    return new R.MeshLambertMaterial({ color, map: F.map, emissiveMap: F.emissiveMap, emissive: 0, vertexColors: !!vcol });
  };

  /* ---------- zaman: sis ve güneş yönü (ışık renkleri index.html'de) ---------- */
  const v3 = (x, y, z) => new R.Vector3(x, y, z).normalize();
  FX.TIME = {
    day: { dir: v3(.55, .72, .42), fog: 0xc9dbe6, fogN: 120, fogF: 700 },
    dusk: { dir: v3(-.82, .2, .52), fog: 0xc68570, fogN: 80, fogF: 560 },
    night: { dir: v3(.32, .62, -.5), fog: 0x161926, fogN: 50, fogF: 470 }
  };
  FX.sunOff = new R.Vector3(60, 80, 30);
  FX.reflHide = []; FX.dyn = [];

  /* ---------- çizim ---------- */
  let ren, scn, cam;
  FX.init = function (renderer, scene, camera) { ren = renderer; scn = scene; cam = camera; makeTextures(); };
  FX.resize = () => {};
  FX.setTime = function (m) {
    const P = FX.TIME[m]; if (!P) return;
    FX.sunOff.copy(P.dir).multiplyScalar(110);
  };
  FX.update = () => {};
  FX.render = function () { ren.setRenderTarget(null); ren.render(scn, cam); };
})();
