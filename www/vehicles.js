/* vehicles.js — trafikteki ve oyuncunun araçları
   Tipler: 0 sedan · 1 hatchback · 2 SUV · 3 minibüs/van · 4 yarış arabası · 5 motosiklet · 6 taksi · 7 spor coupe
   Her araç: çamurluk kavisli yan profil (extrude), içeri eğimli cam kabin + A/B/C sütunlar, vernikli (clearcoat) boya,
   5 kollu alaşım jant, gündüz farı (DRL), HDR far/stop lambaları, plaka, ayna, ızgara, tampon.
   Trafik araçlarında aynı malzemeli parçalar tek geometride birleştirilir (araç başına ~10 çizim). */
(function () {
  'use strict';
  const R = THREE, V = window.VEH = {};

  // [L, W, H(tavan), zb, zr(tavan arka), zf(tavan ön), zw, bt(bel çizgisi), ov(çıkıntı), wr(teker yarıçapı)]
  const TY = {
    0: { L: 4.62, W: 1.84, yb: .3, wr: .34, ov: .98, top: [[-2.31, .74], [-2.24, .98], [-1.32, 1.02], [1.08, .98], [2.06, .84], [2.3, .66], [2.32, .42]], gl: [[-1.32, 1.02], [-.72, 1.43], [.48, 1.45], [1.1, .98]], bp: [-.12], head: .74, tail: .86 },
    1: { L: 3.96, W: 1.76, yb: .3, wr: .33, ov: .72, top: [[-1.99, .76], [-1.95, 1.0], [.95, .98], [1.78, .84], [1.97, .64], [1.98, .42]], gl: [[-1.95, 1.0], [-1.8, 1.46], [.33, 1.49], [.97, .97]], bp: [-.5], head: .76, tail: 1.08 },
    2: { L: 4.66, W: 1.95, yb: .42, wr: .39, ov: .92, top: [[-2.34, .92], [-2.3, 1.12], [1.05, 1.12], [2.1, 1.02], [2.32, .84], [2.33, .5]], gl: [[-2.3, 1.12], [-2.16, 1.72], [.55, 1.74], [1.1, 1.11]], bp: [-.2, -1.25], head: .9, tail: 1.18 },
    3: { L: 4.96, W: 1.98, yb: .34, wr: .36, ov: .86, top: [[-2.48, 1.0], [1.55, 1.0], [2.3, .95], [2.47, .76], [2.48, .42]], gl: [[-2.47, 1.0], [-2.45, 2.0], [1.2, 2.04], [1.97, 1.0]], bp: [-1.55, -.6, .35], head: .82, tail: 1.2 },
    4: { L: 4.46, W: 1.99, yb: .26, wr: .35, ov: .95, top: [[-2.24, .66], [-2.12, .86], [-1.0, .92], [.9, .86], [2.0, .66], [2.24, .46], [2.23, .34]], gl: [[-1.15, .92], [-.45, 1.22], [.25, 1.23], [.95, .85]], bp: [], head: .62, tail: .72, wing: 1 },
    6: { L: 4.62, W: 1.84, yb: .3, wr: .34, ov: .98, top: [[-2.31, .74], [-2.24, .98], [-1.32, 1.02], [1.08, .98], [2.06, .84], [2.3, .66], [2.32, .42]], gl: [[-1.32, 1.02], [-.72, 1.43], [.48, 1.45], [1.1, .98]], bp: [-.12], head: .74, tail: .86, taxi: 1 },
    7: { L: 4.52, W: 1.9, yb: .28, wr: .35, ov: .96, top: [[-2.27, .72], [-2.15, .95], [-1.1, .98], [1.0, .93], [2.05, .76], [2.27, .55], [2.27, .36]], gl: [[-1.25, .98], [-.4, 1.32], [.35, 1.34], [1.05, .92]], bp: [], head: .68, tail: .82 }
  };
  TY[5] = { L: 2.2, W: .8, yb: .3, wr: .36, ov: .15, top: [], gl: [[-.4, .9], [-.3, 1.4], [.3, 1.4], [.5, .9]], bp: [], head: 1, tail: .86 };
  const CT = window.CT = [];
  for (let t = 0; t <= 7; t++) { const d = TY[t], g = d.gl; CT[t] = [d.L, d.W, Math.max(g[1][1], g[2][1]), g[0][0], g[1][0], g[2][0], g[3][0], (g[0][1] + g[3][1]) / 2, d.ov, d.wr]; }
  V.TY = TY;
  V.SPD = { 0: 1, 1: .95, 2: 1, 3: .82, 4: 1.3, 5: 1.15, 6: 1.05, 7: 1.2 };
  // trafik dağılımı (İstanbul: bol taksi)
  V.MIX = [0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 6, 6, 6, 3, 3, 7, 7, 4, 5, 5];
  V.PAINT = [[0xf2f2f0, 0], [0xf2f2f0, 0], [0x111214, 1], [0x111214, 0], [0xa8acb1, 1], [0xa8acb1, 1], [0x5a5e63, 1], [0x1d2c4f, 1], [0x8f1d1d, 1], [0x2a3a2e, 1], [0xc8b99a, 1], [0x5b3a29, 1], [0x2f5d8a, 1], [0xb5b8bc, 1]];
  V.pickType = () => V.MIX[(Math.random() * V.MIX.length) | 0];

  /* ---------- paylaşılan malzemeler ---------- */
  let M = null;
  function mats() {
    if (M) return M;
    const T = FX.T, std = (o) => FX.Q === 0 ? new R.MeshLambertMaterial({ color: o.color }) : new R.MeshStandardMaterial(Object.assign({ roughness: .8, metalness: 0 }, o));
    M = {
      glass: FX.glass(), chrome: FX.chrome(),
      trim: std({ color: 0x141416, roughness: .55 }), tire: std({ color: 0x18181a, roughness: .92 }), grille: std({ color: 0x0b0b0c, roughness: .4, metalness: .4 }),
      rim: FX.Q === 0 ? new R.MeshLambertMaterial({ map: T.rim }) : new R.MeshStandardMaterial({ map: T.rim, roughness: .28, metalness: .85, envMapIntensity: 1.2 }),
      plate: new R.MeshBasicMaterial({ map: T.plate }),
      head: new R.MeshBasicMaterial({ color: 0xdadada }), drl: new R.MeshBasicMaterial({ color: new R.Color(2.2, 2.3, 2.5) }),
      sign: new R.MeshBasicMaterial({ color: 0xffd23a }),
      glow: new R.MeshBasicMaterial({ map: T.carGlow, transparent: true, blending: R.AdditiveBlending, depthWrite: false, color: new R.Color(.9, .9, .9) }),
      blob: new R.MeshBasicMaterial({ map: T.blob, transparent: true, depthWrite: false, opacity: .8 }),
      rider: FX.Q === 0 ? new R.MeshLambertMaterial({ vertexColors: true }) : new R.MeshStandardMaterial({ vertexColors: true, roughness: .7 }),
      paints: {}
    };
    // taksi tepe lambası dokusu
    const c = FX.cv(128, 32), x = c.getContext('2d'); x.fillStyle = '#ffd23a'; x.fillRect(0, 0, 128, 32); x.fillStyle = '#111'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('TAKSİ', 64, 24);
    M.sign.map = new R.CanvasTexture(c); M.sign.color.setRGB(1, 1, 1);
    M.glow.visible = false;
    return M;
  }
  V.paint = (c, met) => { const m = mats(), k = c + ':' + met; return m.paints[k] || (m.paints[k] = FX.paint(c, met)); };
  V.setNight = function (n, dusk) {
    const m = mats(); const k = n ? 1 : dusk ? .55 : 0;
    m.head.color.setRGB(.82 + 2.6 * k, .82 + 2.45 * k, .8 + 2.1 * k);
    m.sign.color.setScalar(1 + k * 1.3);
    m.glow.visible = k > 0; m.glow.color.setScalar(k * 1.1);
    V.night = k;
  };
  V.tail = (c, brake) => { if (!c) return; const k = V.night || 0; c.setRGB(brake ? 3.4 : .45 + 1.0 * k, brake ? .16 : .03 + .03 * k, brake ? .1 : .03 + .02 * k); };

  /* ---------- geometri yardımcıları ---------- */
  function extrude(pts, width, bevel) {
    const sh = new R.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
    const b = bevel === undefined ? .07 : bevel;
    const g = new R.ExtrudeGeometry(sh, { depth: width - 2 * b, bevelEnabled: b > 0, bevelSize: b * .8, bevelThickness: b, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -(width - 2 * b) / 2); g.rotateY(-Math.PI / 2); return g;
  }
  // gövde yan profili: üst çizgi + kavisli çamurluklar
  function bodyProfile(d) {
    const h = d.L / 2, ax = h - d.ov, ra = d.wr + .075, yb = d.yb, pts = [[-h + .02, yb]];
    d.top.forEach(p => pts.push(p));
    pts.push([h - .02, yb]);
    const arch = zc => { pts.push([zc + ra, yb]); for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; pts.push([zc + Math.cos(a) * ra, d.wr + Math.sin(a) * ra]); } pts.push([zc - ra, yb]); };
    arch(ax); arch(-ax);
    return pts;
  }
  function bar(g, m, z0, y0, z1, y1, x, tw, th) {
    const len = Math.hypot(z1 - z0, y1 - y0), q = new R.Mesh(new R.BoxGeometry(tw, th, len + th * .5), m);
    q.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2); q.rotation.x = -Math.atan2(y1 - y0, z1 - z0); g.add(q); return q;
  }
  const add = (g, geo, m, x, y, z, rx, ry, rz) => { const q = new R.Mesh(geo, m); q.position.set(x, y, z); q.rotation.set(rx || 0, ry || 0, rz || 0); g.add(q); return q; };

  // aynı malzemeli çocukları birleştir
  V.bake = function (g, keep) {
    g.updateMatrixWorld(true);
    const by = new Map();
    g.children.slice().forEach(ch => {
      if (!ch.isMesh || (keep && keep.has(ch))) return;
      ch.updateMatrix();
      let geo = ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone();
      geo.applyMatrix4(ch.matrix);
      if (!by.has(ch.material)) by.set(ch.material, []); by.get(ch.material).push(geo);
      g.remove(ch); ch.geometry.dispose();
    });
    by.forEach((list, m) => {
      let n = 0; list.forEach(x => n += x.attributes.position.count);
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
      list.forEach(x => {
        P.set(x.attributes.position.array, o * 3); N.set(x.attributes.normal.array, o * 3);
        if (x.attributes.uv) U.set(x.attributes.uv.array, o * 2);
        o += x.attributes.position.count; x.dispose();
      });
      const bg = new R.BufferGeometry(); bg.setAttribute('position', new R.BufferAttribute(P, 3)); bg.setAttribute('normal', new R.BufferAttribute(N, 3)); bg.setAttribute('uv', new R.BufferAttribute(U, 2));
      bg.computeBoundingSphere();
      const me = new R.Mesh(bg, m); me.castShadow = !!(m.userData && m.userData.cast); g.add(me);
    });
    return g;
  };

  function decals(g, d, m) {
    const h = d.L / 2;
    const bl = add(g, new R.PlaneGeometry(d.W + .55, d.L + .5), m.blob, 0, .045, 0, -Math.PI / 2); bl.renderOrder = 1;
    const gl = add(g, new R.PlaneGeometry(d.W + 1.6, d.L + 12), m.glow, 0, .05, 4.2, -Math.PI / 2, 0, Math.PI); gl.renderOrder = 2;
    return [bl, gl];
  }

  /* ---------- otomobil ---------- */
  window.carMesh = function (col, t, c, body, pl) {
    if (t === 5) return window.motoMesh(col, c, pl, body);
    if (!TY[t]) t = 0;
    const m = mats(), d = TY[t], h = d.L / 2, W = d.W, g = new R.Group(), ax = h - d.ov;
    let paint = body;
    if (!paint) { let pc = col, met = 1; if (d.taxi) { pc = 0xf2b90c; met = 0; } else if (c) { const p = V.PAINT[(Math.random() * V.PAINT.length) | 0]; pc = p[0]; met = p[1]; } paint = V.paint(pc, met); }
    paint.userData.cast = true;
    const glass = pl ? (typeof glP !== 'undefined' ? glP : m.glass) : m.glass;
    // gövde
    add(g, extrude(bodyProfile(d), W), paint, 0, 0, 0);
    // cam kabin (içe eğimli)
    const gw = W - .3; add(g, extrude(d.gl, gw, .04), glass, 0, 0, 0);
    // tavan
    { const a = d.gl[1], b = d.gl[2]; bar(g, paint, a[0] + .02, a[1] + .015, b[0] - .02, b[1] + .015, 0, gw + .04, .07); }
    // sütunlar
    for (const sx of [-1, 1]) {
      const x = sx * (gw / 2 + .005), G = d.gl;
      bar(g, paint, G[3][0], G[3][1], G[2][0], G[2][1], x, .06, .085);       // A
      bar(g, paint, G[0][0], G[0][1], G[1][0], G[1][1], x, .06, .11);        // C
      d.bp.forEach(z => { const yT = G[1][1] + (G[2][1] - G[1][1]) * (z - G[1][0]) / (G[2][0] - G[1][0]); bar(g, paint, z, (G[0][1] + G[3][1]) / 2 - .02, z + .02, yT, x, .06, .1); });
      // ayna
      add(g, new R.BoxGeometry(.2, .11, .13), paint, sx * (W / 2 + .06), G[3][1] + .06, G[3][0] - .12);
      add(g, new R.BoxGeometry(.03, .08, .1), m.chrome, sx * (W / 2 + .165), G[3][1] + .06, G[3][0] - .12);
      // kapı kolları
      for (const z of [G[3][0] - .55, (G[0][0] + G[3][0]) / 2 - .35]) add(g, new R.BoxGeometry(.03, .035, .16), m.chrome, sx * (W / 2 + .065), (G[0][1] + G[3][1]) / 2 - .1, z);
      // yan alt marşpiyel
      add(g, new R.BoxGeometry(.05, .1, 2 * ax - 2 * (d.wr + .12)), m.trim, sx * (W / 2 + .04), d.yb + .07, 0);
    }
    // farlar, DRL, stoplar, ızgara, tampon, plaka
    for (const sx of [-1, 1]) {
      add(g, new R.BoxGeometry(.42, .12, .08), pl ? hM : m.head, sx * (W / 2 - .36), d.head, h + .055);
      add(g, new R.BoxGeometry(.44, .025, .07), m.drl, sx * (W / 2 - .36), d.head - .085, h + .05);
      add(g, new R.BoxGeometry(.11, .07, .07), m.trim, sx * (W / 2 - .1), d.head - .02, h + .05);
    }
    add(g, new R.BoxGeometry(W - 1.05, .2, .06), m.grille, 0, d.head - .04, h + .05);
    add(g, new R.BoxGeometry(W * .55, .1, .06), m.grille, 0, d.yb + .14, h + .055);
    add(g, new R.BoxGeometry(W - .12, .1, .12), m.trim, 0, d.yb + .03, h - .02);
    add(g, new R.BoxGeometry(W - .12, .1, .12), m.trim, 0, d.yb + .03, -h + .02);
    add(g, new R.PlaneGeometry(.52, .12), m.plate, 0, d.yb + .3, h + .09);
    add(g, new R.PlaneGeometry(.52, .12), m.plate, 0, d.yb + .34, -h - .09, 0, Math.PI);
    const tl = pl ? tM : new R.MeshBasicMaterial({ color: 0x701010 });
    for (const sx of [-1, 1]) add(g, new R.BoxGeometry(.5, .11, .07), tl, sx * (W / 2 - .3), d.tail, -h - .045);
    add(g, new R.BoxGeometry(W - 1.2, .035, .06), tl, 0, d.tail + .02, -h - .04);
    // sinyaller
    const mL = new R.MeshBasicMaterial({ color: 0x4a2c00 }), mR = new R.MeshBasicMaterial({ color: 0x4a2c00 }), sb = new R.BoxGeometry(.13, .07, .07);
    for (const sx of [-1, 1]) { const mm = sx > 0 ? mL : mR; add(g, sb, mm, sx * (W / 2 - .1), d.head - .02, h + .07); add(g, sb, mm, sx * (W / 2 - .12), d.tail - .1, -h - .06); add(g, new R.BoxGeometry(.04, .04, .1), mm, sx * (W / 2 + .14), d.gl[3][1] + .02, d.gl[3][0] - .12); }
    // yarış kanadı / taksi lambası / van tavan
    if (d.wing) { add(g, new R.BoxGeometry(W - .25, .05, .36), paint, 0, d.top[1][1] + .32, -h + .26); for (const sx of [-.6, .6]) add(g, new R.BoxGeometry(.05, .3, .14), m.trim, sx, d.top[1][1] + .16, -h + .28); for (const sx of [-1, 1]) add(g, new R.BoxGeometry(.04, .25, .45), m.trim, sx * (W / 2 - .12), d.top[1][1] + .3, -h + .26); }
    if (d.taxi) { const sg = add(g, new R.BoxGeometry(.62, .19, .26), m.sign, 0, d.gl[1][1] + .14, (d.gl[1][0] + d.gl[2][0]) / 2); sg.rotation.y = Math.PI / 2; }
    if (t === 3) add(g, new R.BoxGeometry(W - .5, .04, 1.6), m.trim, 0, d.gl[1][1] + .06, -.5);
    // tekerler
    if (!pl) for (const sx of [-1, 1]) for (const z of [ax, -ax]) {
      add(g, new R.CylinderGeometry(d.wr, d.wr, .26, 18), m.tire, sx * (W / 2 - .17), d.wr, z, 0, 0, Math.PI / 2);
      add(g, new R.CircleGeometry(d.wr * .68, 16), m.rim, sx * (W / 2 - .17 + .133), d.wr, z, 0, sx * Math.PI / 2, 0);
    }
    if (c) {
      c.sL = mL; c.sR = mR; c.tl = tl; c.type = t; if (c.vm) c.vm *= V.SPD[t] || 1;
      V.bake(g);
      if (FX.Q > 0) decals(g, d, m);
    } else g.userData = { mL, mR };
    return g;
  };

  /* ---------- motosiklet + sürücü ---------- */
  const UP = new R.Vector3(0, 1, 0);
  function mergeCol(parts) {
    let n = 0; const geos = parts.map(p => { const g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); g.applyMatrix4(p.mx); n += g.attributes.position.count; return [g, p.c]; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), cc = new R.Color(); let o = 0;
    geos.forEach(([g, c]) => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); cc.setHex(c); for (let i = 0; i < g.attributes.position.count; i++) { C[(o + i) * 3] = cc.r; C[(o + i) * 3 + 1] = cc.g; C[(o + i) * 3 + 2] = cc.b; } o += g.attributes.position.count; g.dispose(); });
    const bg = new R.BufferGeometry(); bg.setAttribute('position', new R.BufferAttribute(P, 3)); bg.setAttribute('normal', new R.BufferAttribute(N, 3)); bg.setAttribute('color', new R.BufferAttribute(C, 3)); return bg;
  }
  V.mergeCol = mergeCol;
  const MX = (x, y, z, rx, ry, rz, s) => new R.Matrix4().compose(new R.Vector3(x, y, z), new R.Quaternion().setFromEuler(new R.Euler(rx || 0, ry || 0, rz || 0)), s || new R.Vector3(1, 1, 1));
  function seg(parts, a, b, r1, r2, c) {
    const d = new R.Vector3().subVectors(b, a), l = d.length(), q = new R.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
    parts.push({ g: new R.CylinderGeometry(r2, r1, l, 8), c, mx: new R.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), q, new R.Vector3(1, 1, 1)) });
    parts.push({ g: new R.SphereGeometry(Math.max(r1, r2) * 1.02, 8, 6), c, mx: MX(b.x, b.y, b.z) });
  }
  V.seg = seg; V.MX = MX;
  function rider(jacket, helmet) {
    const P = [], v = (x, y, z) => new R.Vector3(x, y, z), pants = 0x1d2027, boot = 0x111111, glove = 0x18181a;
    const hip = v(0, .98, -.32), top = v(0, 1.45, -.02);
    seg(P, hip, top, .17, .19, jacket);
    P.push({ g: new R.SphereGeometry(.15, 12, 10), c: helmet, mx: MX(0, 1.63, .06, 0, 0, 0, v(1, 1.02, 1.1)) });
    P.push({ g: new R.SphereGeometry(.1, 10, 6, -Math.PI * .3, Math.PI * .6, Math.PI * .35, Math.PI * .3), c: 0x0a0c10, mx: MX(0, 1.62, .1, 0, 0, 0, v(1.45, 1.4, 1.5)) });
    for (const sx of [-1, 1]) {
      const sh = v(sx * .2, 1.41, -.04), el = v(sx * .27, 1.2, .35), hd = v(sx * .3, 1.13, .72);
      seg(P, sh, el, .06, .055, jacket); seg(P, el, hd, .052, .045, jacket);
      P.push({ g: new R.SphereGeometry(.05, 6, 5), c: glove, mx: MX(hd.x, hd.y, hd.z) });
      const hp = v(sx * .14, .98, -.3), kn = v(sx * .22, .92, .26), ft = v(sx * .21, .44, .08);
      seg(P, hp, kn, .09, .075, pants); seg(P, kn, ft, .065, .05, pants);
      P.push({ g: new R.BoxGeometry(.11, .1, .26), c: boot, mx: MX(ft.x, ft.y - .02, ft.z + .06) });
    }
    return mergeCol(P);
  }
  window.motoMesh = function (col, c, pl, body) {
    const m = mats(), g = new R.Group();
    let paint = body; if (!paint) { const p = V.PAINT[(Math.random() * V.PAINT.length) | 0]; paint = V.paint([0xc62828, 0x111214, 0x1d4ea8, 0xf2f2f0, 0xe0a100, 0x2e7d32][(Math.random() * 6) | 0] || p[0], 1); }
    paint.userData.cast = true;
    const frame = m.trim, eng = m.grille, bx = (w, h, d) => new R.BoxGeometry(w, h, d);
    if (!pl) for (const z of [.95, -.95]) {
      add(g, new R.CylinderGeometry(.36, .36, .15, 18), m.tire, 0, .36, z, 0, 0, Math.PI / 2);
      for (const sx of [-1, 1]) add(g, new R.CircleGeometry(.25, 14), m.rim, sx * .078, .36, z, 0, sx * Math.PI / 2, 0);
    }
    add(g, bx(.3, .36, .55), eng, 0, .56, -.02);                                      // motor
    add(g, bx(.08, .08, .7), m.chrome, .16, .38, -.55, -.12);                          // egzoz
    add(g, extrude([[-.35, .86], [-.2, 1.05], [.38, 1.1], [.55, .92], [.42, .78], [-.2, .8]], .36, .04), paint, 0, 0, 0);   // depo
    add(g, extrude([[-1.0, .88], [-.95, .98], [-.3, .98], [-.25, .9]], .3, .03), m.trim, 0, 0, 0);    // sele
    add(g, extrude([[-1.12, .9], [-.9, 1.02], [-.5, .98], [-.55, .86]], .26, .03), paint, 0, 0, 0);    // arka kuyruk
    add(g, extrude([[.55, .78], [.62, 1.25], [.78, 1.32], [.92, .92], [.75, .75]], .44, .05), paint, 0, 0, 0);   // ön kaporta
    add(g, extrude([[.66, 1.25], [.7, 1.42], [.78, 1.34]], .32, .01), m.glass, 0, 0, 0);       // ön cam
    for (const sx of [-1, 1]) { const f = add(g, bx(.045, .75, .045), m.chrome, sx * .1, .7, .86); f.rotation.x = -.38; }
    add(g, bx(.72, .04, .05), frame, 0, 1.12, .72);
    add(g, bx(.18, .12, .08), pl ? hM : m.head, 0, 1.0, .95);
    add(g, bx(.2, .025, .06), m.drl, 0, .92, .94);
    const tl = pl ? tM : new R.MeshBasicMaterial({ color: 0x701010 }); add(g, bx(.18, .07, .05), tl, 0, .92, -1.15);
    add(g, new R.PlaneGeometry(.22, .12), m.plate, 0, .76, -1.12, 0, Math.PI);
    const mL = new R.MeshBasicMaterial({ color: 0x4a2c00 }), mR = new R.MeshBasicMaterial({ color: 0x4a2c00 }), sb = bx(.1, .06, .07);
    add(g, sb, mL, .38, 1.12, .74); add(g, sb, mR, -.38, 1.12, .74); add(g, sb, mL, .14, .9, -1.12); add(g, sb, mR, -.14, .9, -1.12);
    for (const sx of [-1, 1]) add(g, bx(.1, .06, .03), m.chrome, sx * .3, 1.3, .7);
    const rd = add(g, rider([0x262a33, 0x5a2121, 0x1f3a5a, 0x3a3a3a, 0x0f0f10][(Math.random() * 5) | 0], [0xe9e9e9, 0x111111, 0xc62828, 0x1d4ea8][(Math.random() * 4) | 0]), m.rider, 0, 0, 0);
    rd.castShadow = true;
    if (c) {
      c.sL = mL; c.sR = mR; c.tl = tl; c.type = 5; if (c.vm) c.vm *= V.SPD[5];
      V.bake(g, new Set([rd]));
      if (FX.Q > 0) decals(g, { L: 2.4, W: .9 }, m);
    } else g.userData = { mL, mR, moto: true };
    return g;
  };
})();
