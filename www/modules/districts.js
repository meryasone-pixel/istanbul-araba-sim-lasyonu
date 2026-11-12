/* DistrictManager – Ortaköy, Boğaziçi Köprüsü geçiş hattı, Caddebostan sahil yolu.
   Fatih haritasına DOKUNMAZ: bölgeye girerken Fatih nesneleri gizlenir, ortak diziler (rects, ints, peds, ais, coins, C) geçici olarak
   yedeklenip boşaltılır; çıkarken birebir geri yüklenir. Bölge, kendi Group'unda tek seferlik üretilir (modüler: DEFS dizisine yeni kayıt eklemek yeter). */
(function () {
  'use strict';
  if (!window.IST) return;
  window.IST.register('districts', function (IST) {
    const store = IST.storage('ist-districts');
    const P = store.load({ unlocked: {}, missions: 0, earned: 0 });
    const save = () => store.save(P);
    const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

    /* ================= inşa yardımcıları ================= */
    function Builder() {
      const R = THREE, g = new R.Group(), rc = [], cache = {}, sideCache = {}; g.userData.__ist = true;
      const M = c => cache[c] || (cache[c] = mat(c));
      let winTex = null;
      function windows() {
        if (winTex) return winTex;
        const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#44546a';
        x.fillRect(8, 10, 18, 24); x.fillRect(38, 10, 18, 24); x.fillStyle = '#fbe29a'; x.fillRect(11, 13, 12, 8); x.fillRect(41, 13, 12, 8);
        winTex = new R.CanvasTexture(c); winTex.wrapS = winTex.wrapT = R.RepeatWrapping; return winTex;
      }
      const B = {
        g, rects: rc, R, net: [], walk: [],
        mesh(geo, m, x, y, z) { const o = new R.Mesh(geo, typeof m === 'number' ? M(m) : m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; },
        box(w, h, d, c, x, y, z, ry) { const o = B.mesh(new R.BoxGeometry(w, h, d), c, x, y + h / 2, z); if (ry) o.rotation.y = ry; return o; },
        rect(x, z, hw, hd) { rc.push([x, z, hw, hd]); },
        solid(w, h, d, c, x, y, z) { B.rect(x, z, w / 2, d / 2); return B.box(w, h, d, c, x, y, z); },
        plane(w, d, c, x, y, z) { const o = new R.Mesh(new R.PlaneGeometry(w, d), typeof c === 'number' ? M(c) : c); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.receiveShadow = true; g.add(o); return o; },
        sea(w, d, x, z, y) { return B.plane(w, d, sea.material, x, y, z); },
        road(x0, z0, x1, z1, w, c) { const rm = c || (window.FX && FX.roadMat) || 0x3b3a42; return z0 === z1 ? B.plane(Math.abs(x1 - x0), w, rm, (x0 + x1) / 2, .03, z0) : B.plane(w, Math.abs(z1 - z0), rm, x0, .03, (z0 + z1) / 2); },
        dash(x0, z0, x1, z1) {           // kesik şerit çizgisi
          const len = Math.hypot(x1 - x0, z1 - z0); if (len < 3) return;
          let mm; if (typeof dash2 !== 'undefined') { const t = dash2.clone(); t.needsUpdate = true; t.repeat.set(len / 7.6, 1); mm = new R.MeshBasicMaterial({ map: t, transparent: true }); } else mm = new R.MeshBasicMaterial({ color: 0xffffff });
          const geo = new R.PlaneGeometry(len, .3); geo.rotateX(-Math.PI / 2); const o = new R.Mesh(geo, mm); o.position.set((x0 + x1) / 2, .06, (z0 + z1) / 2); if (x0 === x1) o.rotation.y = Math.PI / 2; g.add(o);
        },
        bldg(w, d, h, c, x, z) {          // Fatih'teki bld() ile aynı pencere dokusu/gece ışığı (nm) + çarpışma
          const geo = new R.BoxGeometry(w, h, d), uv = geo.attributes.uv;
          for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w + d) / 12, uv.getY(i) * h / 6);
          const m = sideCache[c] || (sideCache[c] = (typeof nm === 'function' ? nm(c) : new R.MeshLambertMaterial({ color: c })));
          const o = new R.Mesh(geo, m); o.position.set(x, h / 2 + .3, z); o.castShadow = o.receiveShadow = true; g.add(o); B.rect(x, z, w / 2, d / 2); return o;
        },
        people(n, rand) {                 // yaya çizgileri (B.walk) boyunca gezen, kol-bacak sallayan insanlar
          if (!B.walk.length || !n) return null;
          const IM = (geo, cnt) => { const m = new R.InstancedMesh(geo, new R.MeshLambertMaterial({ color: 0xffffff }), cnt); m.frustumCulled = false; g.add(m); return m; };
          const mT = IM(new R.CylinderGeometry(.2, .165, .54, 8), n), mP = IM(new R.CylinderGeometry(.165, .17, .2, 8), n), mH = IM(new R.SphereGeometry(.115, 8, 6), n),
            mR = IM(new R.SphereGeometry(.127, 8, 6, 0, Math.PI * 2, 0, Math.PI * .58), n), mL = IM(new R.CylinderGeometry(.085, .06, .86, 6), 2 * n),
            mS = IM(new R.BoxGeometry(.13, .08, .28), 2 * n), mA = IM(new R.CylinderGeometry(.052, .042, .56, 6), 2 * n), mD = IM(new R.SphereGeometry(.05, 6, 5), 2 * n),
            o = new R.Object3D(), l = new R.Object3D(), col = new R.Color(), B0 = new R.Matrix4(), OUT = new R.Matrix4(), TM = new R.Matrix4(),
            skins = [0xf1c9a5, 0xe0b48f, 0xc68e5f, 0x8d5a3b, 0xf6d7bd, 0xa86f47], hairs = [0x1a1410, 0x2b1d12, 0x4a3020, 0x7a4b25, 0xb08a4a, 0x8a8a8a, 0x0e0e10],
            shirts = [0xd32f2f, 0x1976d2, 0x388e3c, 0xf9a825, 0x6a1b9a, 0x37474f, 0xe0e0e0, 0xef6c00, 0x3a7d7b, 0x9c6644], pants = [0x2b2d42, 0x3d405b, 0x594a3c, 0x1f2a44, 0x4a4e69, 0x14161c],
            pk = a => a[(rand() * a.length) | 0], W = [];
          const put = (m, i, c) => m.setColorAt(i, col.setHex(c));
          for (let i = 0; i < n; i++) {
            const L = B.walk[(rand() * B.walk.length) | 0], sh = pk(shirts), pn = pk(pants), sk = pk(skins);
            W.push({ L, t: rand(), dir: rand() < .5 ? 1 : -1, sp: .8 + rand() * .9, down: 0, x: 0, z: 0, ph: rand() * 6, sc: .92 + rand() * .1 });
            put(mT, i, sh); put(mP, i, pn); put(mH, i, sk); put(mR, i, pk(hairs));
            for (let k = 0; k < 2; k++) { put(mL, 2 * i + k, pn); put(mS, 2 * i + k, 0x15151a); put(mA, 2 * i + k, sh); put(mD, 2 * i + k, sk); }
          }
          const part = (m, i, x, y, z, rx, sz) => { l.position.set(x, y, z); l.rotation.set(rx || 0, 0, 0); l.scale.set(1, 1, sz || 1); l.updateMatrix(); OUT.multiplyMatrices(B0, l.matrix); m.setMatrixAt(i, OUT); },
            limb = (m, i, px, py, ang, ox, oy, oz) => { l.position.set(px, py, 0); l.rotation.set(ang, 0, 0); l.scale.set(1, 1, 1); l.updateMatrix(); TM.makeTranslation(ox, oy, oz); OUT.multiplyMatrices(B0, l.matrix).multiply(TM); m.setMatrixAt(i, OUT); };
          const all = [mT, mP, mH, mR, mL, mS, mA, mD];
          const api = { W, update(dt, hit) {
            for (let i = 0; i < n; i++) {
              const w = W[i], L = w.L, len = Math.hypot(L.x1 - L.x0, L.z1 - L.z0) || 1;
              if (w.down > 0) w.down -= dt; else { w.t += w.dir * w.sp * dt / len; if (w.t > 1 || w.t < 0) { w.dir = -w.dir; w.t = Math.max(0, Math.min(1, w.t)); } w.ph += dt * 7; }
              w.x = L.x0 + (L.x1 - L.x0) * w.t; w.z = L.z0 + (L.z1 - L.z0) * w.t;
              if (hit && w.down <= 0 && hit(w)) w.down = 3;
              const lay = w.down > 0, ry = Math.atan2((L.x1 - L.x0) * w.dir, (L.z1 - L.z0) * w.dir), sw = lay ? 0 : Math.sin(w.ph) * .7, bob = lay ? 0 : Math.abs(Math.sin(w.ph)) * .03;
              o.position.set(w.x, lay ? .3 : .05 + bob, w.z); o.rotation.set(lay ? 1.5 : 0, ry, 0); o.scale.set(w.sc, w.sc, w.sc); o.updateMatrix(); B0.copy(o.matrix);
              part(mT, i, 0, 1.26, 0, 0, .62); part(mP, i, 0, .97, 0, 0, .65); part(mH, i, 0, 1.7, 0, 0); part(mR, i, 0, 1.72, -.015, -.35);
              for (let k = 0; k < 2; k++) {
                const sd = k ? -1 : 1, j = 2 * i + k;
                limb(mL, j, sd * .095, .88, sd * sw, 0, -.43, 0); limb(mS, j, sd * .095, .88, sd * sw, 0, -.82, .06);
                limb(mA, j, sd * .27, 1.47, -sd * sw * .85, 0, -.28, 0); limb(mD, j, sd * .27, 1.47, -sd * sw * .85, 0, -.58, 0);
              }
            }
            all.forEach(m => { m.instanceMatrix.needsUpdate = true; });
          } };
          api.update(0); all.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; }); return api;
        },
        trees(pts) {
          if (!pts.length) return; const t = new R.InstancedMesh(new R.CylinderGeometry(.25, .3, 2, 5), M(0x6d4c41), pts.length), k = new R.InstancedMesh(new R.IcosahedronGeometry(1.7, 0), M(0x4f9a4a), pts.length), o = new R.Object3D();
          pts.forEach((p, i) => { const s = p[2] || 1; o.scale.set(s, s, s); o.position.set(p[0], s, p[1]); o.updateMatrix(); t.setMatrixAt(i, o.matrix); o.position.set(p[0], 3.2 * s, p[1]); o.updateMatrix(); k.setMatrixAt(i, o.matrix); });
          t.frustumCulled = k.frustumCulled = false; g.add(t, k);
        },
        lamps(pts) {
          if (!pts.length) return; const p = new R.InstancedMesh(new R.CylinderGeometry(.12, .15, 6, 6), M(0x37474f), pts.length), l = new R.InstancedMesh(new R.SphereGeometry(.4, 8, 6), new R.MeshBasicMaterial({ color: 0xffe9a8 }), pts.length), o = new R.Object3D();
          pts.forEach((q, i) => { o.position.set(q[0], 3, q[1]); o.updateMatrix(); p.setMatrixAt(i, o.matrix); o.position.set(q[0], 6.2, q[1]); o.updateMatrix(); l.setMatrixAt(i, o.matrix); });
          p.frustumCulled = l.frustumCulled = false; g.add(p, l);
        },
        ring(x0, x1, z0, z1, c) {          // bölge sınır duvarı
          B.solid(x1 - x0, 3, 2, c, (x0 + x1) / 2, 0, z0); B.solid(x1 - x0, 3, 2, c, (x0 + x1) / 2, 0, z1);
          B.solid(2, 3, z1 - z0, c, x0, 0, (z0 + z1) / 2); B.solid(2, 3, z1 - z0, c, x1, 0, (z0 + z1) / 2);
        },
        cable(pts, r, c) {                 // bezier kablo (tüp) -> tüp üzerindeki noktaları döndürür
          const V = R.Vector3, cu = new R.QuadraticBezierCurve3(new V(...pts[0]), new V(...pts[1]), new V(...pts[2]));
          B.mesh(new R.TubeGeometry(cu, 24, r, 5, false), c, 0, 0, 0); return cu;
        },
        hangers(cu, n, deckY, c) {
          const v = []; for (let i = 1; i < n; i++) { const p = cu.getPoint(i / n); v.push(new R.Vector3(p.x, p.y, p.z), new R.Vector3(p.x, deckY, p.z)); }
          g.add(new R.LineSegments(new R.BufferGeometry().setFromPoints(v), new R.LineBasicMaterial({ color: c }))); },
        finish() { g.updateMatrixWorld(true); g.traverse(o => { o.matrixAutoUpdate = false; }); return g; }
      };
      return B;
    }
    /* ================= ortak: yol ağı, bina doldurma, park ================= */
    const rr = (r, a, b) => a + r() * (b - a);
    const PAL = [0xd9a066, 0xe6c9a0, 0xb86b4b, 0xcdb08a, 0xa8845f, 0xe9d8bd, 0xc77d5a, 0x9aa3a8, 0xe8d5b5, 0xf2c9a0];
    const segs = (a, b, cuts, m) => {          // kesişen yolların içini atlayarak [a,b] aralıkları
      const pts = [a]; cuts.filter(k => k.c > a && k.c < b).sort((p, q) => p.c - q.c).forEach(k => { pts.push(k.c - k.h - m, k.c + k.h + m); }); pts.push(b);
      const out = []; for (let i = 0; i < pts.length; i += 2) if (pts[i + 1] - pts[i] > 4) out.push([pts[i], pts[i + 1]]); return out;
    };
    /* vx: dikey yollar {c,h,a?,b?,dash?}  hz: yatay yollar. Her yolun iki ucu başka bir yolda biter (çıkmaz sokak yok). */
    function roads(B, vx, hz, o) {
      o = o || {}; const za = Math.min.apply(0, hz.map(h => h.c)), zb = Math.max.apply(0, hz.map(h => h.c)), xa = Math.min.apply(0, vx.map(v => v.c)), xb = Math.max.apply(0, vx.map(v => v.c));
      vx.forEach(v => { v.a = v.a === undefined ? za : v.a; v.b = v.b === undefined ? zb : v.b; B.road(v.c, v.a, v.c, v.b, v.h * 2); B.net.push({ ax: 'v', c: v.c, a: v.a, b: v.b }); });
      hz.forEach(h => { h.a = h.a === undefined ? xa : h.a; h.b = h.b === undefined ? xb : h.b; B.road(h.a, h.c, h.b, h.c, h.h * 2); B.net.push({ ax: 'h', c: h.c, a: h.a, b: h.b }); });
      vx.forEach(v => {
        const cuts = hz.filter(h => h.c > v.a && h.c < v.b);
        segs(v.a, v.b, cuts, 1).forEach(sg => { (v.dash || [0]).forEach(d => B.dash(v.c + d, sg[0], v.c + d, sg[1]));
          [-1, 1].forEach(sd => { const off = sd * (v.h + 1.5); B.plane(3, sg[1] - sg[0], 0xcfc8bb, v.c + off, .04, (sg[0] + sg[1]) / 2); B.walk.push({ x0: v.c + sd * (v.h + 2.2), z0: sg[0], x1: v.c + sd * (v.h + 2.2), z1: sg[1] }); }); });
      });
      hz.forEach(h => {
        const cuts = vx.filter(v => v.c > h.a && v.c < h.b);
        segs(h.a, h.b, cuts, 1).forEach(sg => { (h.dash || [0]).forEach(d => B.dash(sg[0], h.c + d, sg[1], h.c + d));
          [-1, 1].forEach(sd => { const off = sd * (h.h + 1.5); B.plane(sg[1] - sg[0], 3, 0xcfc8bb, (sg[0] + sg[1]) / 2, .04, h.c + off); B.walk.push({ x0: sg[0], z0: h.c + sd * (h.h + 2.2), x1: sg[1], z1: h.c + sd * (h.h + 2.2) }); }); });
      });
      /* sokak ağaçları + lambalar */
      const tr = [], lp = [];
      vx.forEach(v => segs(v.a, v.b, hz.filter(h => h.c > v.a && h.c < v.b), 8).forEach(sg => { for (let z = sg[0] + 6; z < sg[1] - 2; z += 15) [-1, 1].forEach(sd => tr.push([v.c + sd * (v.h + .9), z, .85])); for (let z = sg[0] + 10; z < sg[1]; z += 34) lp.push([v.c + (v.h + .4), z]); }));
      hz.forEach(h => segs(h.a, h.b, vx.filter(v => v.c > h.a && v.c < h.b), 8).forEach(sg => { for (let x = sg[0] + 6; x < sg[1] - 2; x += 15) [-1, 1].forEach(sd => tr.push([x, h.c + sd * (h.h + .9), .85])); for (let x = sg[0] + 10; x < sg[1]; x += 34) lp.push([x, h.c - (h.h + .4)]); }));
      B.trees(tr); B.lamps(lp);
    }
    function park(B, r, x0, x1, z0, z1) {
      B.plane(x1 - x0, z1 - z0, 0x5f8f4e, (x0 + x1) / 2, .045, (z0 + z1) / 2); const t = [];
      for (let x = x0 + 6; x < x1 - 3; x += 11) for (let z = z0 + 6; z < z1 - 3; z += 11) t.push([x + rr(r, -2, 2), z + rr(r, -2, 2), rr(r, .8, 1.25)]);
      B.trees(t); B.box(2.6, .5, .9, 0x8d6e63, (x0 + x1) / 2, 0, z1 - 3); B.box(2.6, .5, .9, 0x8d6e63, (x0 + x1) / 2, 0, z0 + 3);
      B.walk.push({ x0: x0 + 3, z0: (z0 + z1) / 2, x1: x1 - 3, z1: (z0 + z1) / 2 });
    }
    /* iki yol dizisi arasındaki her hücreyi binalarla doldurur */
    function fill(B, r, xs, zs, o) {
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
        const x0 = xs[i].c + xs[i].h + 3, x1 = xs[i + 1].c - xs[i + 1].h - 3, z0 = zs[j].c + zs[j].h + 3, z1 = zs[j + 1].c - zs[j + 1].h - 3;
        if (x1 - x0 < 12 || z1 - z0 < 12) continue;
        if (o.park && o.park(i, j, r)) { park(B, r, x0, x1, z0, z1); continue; }
        const cap = o.cap ? o.cap(i, j, x0, x1) : 40, lo = o.lo || 12;
        for (let z = z0; z < z1 - 10;) { const d = Math.min(z1 - z, rr(r, 16, 25)); if (d < 11) break;
          for (let x = x0; x < x1 - 10;) { const w = Math.min(x1 - x, rr(r, 15, 26)); if (w < 11) break;
            if (r() > .05) B.bldg(w - 1.2, d - 1.2, Math.min(cap, rr(r, lo, 34)), PAL[(r() * PAL.length) | 0], x + w / 2, z + d / 2); x += w; }
          z += d; }
      }
    }
    const stone = 0xe9e2d0, domeC = 0x9fb0b5;

    /* ================= 1) ORTAKÖY + BOĞAZİÇİ KÖPRÜSÜ + ANADOLU YAKASI ================= */
    function buildOrtakoy(B) {
      const r = rng(11), R = B.R, AX = -130;
      /* zemin: iki yaka + aradaki boğaz (deniz -8 m) */
      B.sea(3000, 3000, 0, -7.5, -8);
      B.plane(2400, 900, 0x9a958a, 0, 0, 550); B.plane(2400, 885, 0x9a958a, 0, 0, -557.5);
      /* iki kıyıda rıhtım duvarı (köprü geçişi hariç) */
      [[100, 1], [-115, -1]].forEach(q => { const z = q[0]; [[-600, -143], [-117, 600]].forEach(p => { const w = p[1] - p[0], cx = (p[0] + p[1]) / 2; B.box(w, 8, 2.6, 0xb5a58c, cx, -8, z); B.rect(cx, z + q[1] * 1.6, w / 2, 1.2); }); });
      /* ---- AVRUPA YAKASI (güney): ring yol + dikey/yatay yollar ---- */
      const vx = [-278, -204, AX, -60, 10, 80, 150, 238].map(c => ({ c, h: c === AX ? 13 : 6, dash: c === AX ? [-7.8, -4.2, 0, 4.2, 7.8] : [0] }));
      const vE = vx.map(v => Object.assign({}, v, { a: v.c === AX ? 100 : 166, b: 288 }));
      const hE = [{ c: 166, h: 6 }, { c: 226, h: 6 }, { c: 288, h: 6 }];
      roads(B, vE, hE);
      fill(B, r, vx, hE, { cap: (i, j, x0, x1) => (x1 > AX - 20 && x0 < AX + 20 ? 16 : 32), park: (i, j, rr_) => (i === 4 && j === 1) });
      /* kıyı önü: batı bloğu + doğu ucu */
      [[-269, -146], [208, 247]].forEach(p => { for (let x = p[0]; x < p[1] - 10;) { const w = Math.min(p[1] - x, rr(r, 15, 24)); if (w < 11) break; B.bldg(w - 1.2, 20, rr(r, 10, 20), PAL[(r() * PAL.length) | 0], x + w / 2, 132); B.bldg(w - 1.2, 14, rr(r, 10, 18), PAL[(r() * PAL.length) | 0], x + w / 2, 110); x += w; } });
      /* meydan + Büyük Mecidiye Camii (denize bakar) */
      B.plane(319, 52, 0xd9cfbd, 45.5, .05, 126); B.walk.push({ x0: -100, z0: 108, x1: 200, z1: 108 }, { x0: -100, z0: 145, x1: 200, z1: 145 }, { x0: 30, z0: 108, x1: 30, z1: 150 }, { x0: 120, z0: 108, x1: 120, z1: 150 });
      const cx = 60, cz = 128; B.solid(30, 14, 22, stone, cx, 0, cz);
      B.mesh(new R.SphereGeometry(8, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeC, cx, 14, cz);
      [[-10, -7], [10, -7], [-10, 7], [10, 7]].forEach(p => B.mesh(new R.SphereGeometry(3.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeC, cx + p[0], 14, cz + p[1]));
      [-1, 1].forEach(sd => { const mx = cx + sd * 17, mz = cz - 12.5; B.mesh(new R.CylinderGeometry(1.2, 1.4, 38, 10), stone, mx, 19, mz); B.mesh(new R.CylinderGeometry(2, 2, .7, 10), stone, mx, 26, mz); B.mesh(new R.ConeGeometry(1.5, 7, 10), 0x8a9aa0, mx, 41.5, mz); B.rect(mx, mz, 1.6, 1.6); });
      for (let i = -2; i <= 2; i++) { B.box(2, 6, .4, 0x39404a, cx + i * 5.5, 3, cz - 11.1); B.box(1.6, 3.4, .4, 0x39404a, cx + i * 5.5, 8.4, cz - 11.1); }
      const stall = [0xe53935, 0xfb8c00, 0x43a047, 0x1e88e5, 0x8e24aa, 0xfdd835];
      for (let i = 0; i < 16; i++) { const x = -92 + i * 18, z = 151; B.solid(3, 2.4, 2.4, stall[i % 6], x, 0, z); B.box(3.8, .2, 3, 0xffffff, x, 2.5, z); }
      const tr = [], lp = []; for (let x = -100; x <= 200; x += 14) { tr.push([x, 104, 1]); lp.push([x + 6, 103]); } B.trees(tr); B.lamps(lp);
      for (let i = 0; i < 6; i++) { const x = -20 + i * 40; B.box(3.2, 1, 9, i % 2 ? 0xffffff : 0x1e88e5, x, -8.6, 86); B.box(2, 1.2, 3, 0xf5f5f5, x, -7.6, 85); }
      /* ---- BOĞAZİÇİ KÖPRÜSÜ (Ortaköy'ü Anadolu yakasına bağlar) ---- */
      B.box(26, 1.6, 215, 0x55555e, AX, -1.6, -7.5); B.plane(23, 215, 0x2e2e34, AX, .03, -7.5);
      for (const d of [-7.8, -4.2, 4.2, 7.8]) B.dash(AX + d, -115, AX + d, 100);
      B.solid(1, .9, 215, 0xb0b0b0, AX, 0, -7.5); B.solid(1, .9, 60, 0xb0b0b0, AX, 0, 130);        // orta bariyer (köprü + gişe yaklaşımı)
      [-12.4, 12.4].forEach(d => B.solid(.8, 1.3, 215, 0x9ea3a8, AX + d, 0, -7.5));
      B.plane(.5, 215, 0xffd54a, AX - 11.2, .05, -7.5); B.plane(.5, 215, 0xffffff, AX + 11.2, .05, -7.5);
      [50, -65].forEach(z => { [-14.5, 14.5].forEach(d => { B.box(3, 88, 4, 0xd0d4d8, AX + d, -9, z); B.rect(AX + d, z, 1.6, 2.2); }); B.box(32, 3, 4, 0xd0d4d8, AX, 44, z); B.box(32, 3, 4, 0xd0d4d8, AX, 70, z); });
      [-14.5, 14.5].forEach(d => {
        const x = AX + d, e = B.cable([[x, 78, 50], [x, 6, -7.5], [x, 78, -65]], .5, 0xe2e5e9); B.hangers(e, 22, .6, 0xdfe3e8);
        B.cable([[x, 78, 50], [x, 48, 125], [x, 30, 205]], .5, 0xe2e5e9); B.cable([[x, 78, -65], [x, 48, -140], [x, 30, -220]], .5, 0xe2e5e9);
        B.box(2, 30, 2, 0xd0d4d8, x, 0, 205); B.box(2, 30, 2, 0xd0d4d8, x, 0, -220);
      });
      B.net.push({ ax: 'v', c: AX, a: -115, b: 100 });
      /* ---- ANADOLU YAKASI (kuzey): Beylerbeyi çevresi ---- */
      const vA = vx.map(v => Object.assign({}, v, { a: -288, b: v.c === AX ? -115 : -180 })), hA = [{ c: -288, h: 6 }, { c: -234, h: 6 }, { c: -180, h: 6 }];
      roads(B, vA, hA);
      fill(B, r, vx, hA, { cap: (i, j, x0, x1) => (x1 > AX - 20 && x0 < AX + 20 ? 16 : 30), park: (i, j) => (i === 2 && j === 0) });
      [[-269, -146], [208, 247]].forEach(p => { for (let x = p[0]; x < p[1] - 10;) { const w = Math.min(p[1] - x, rr(r, 15, 24)); if (w < 11) break; B.bldg(w - 1.2, 18, rr(r, 10, 20), PAL[(r() * PAL.length) | 0], x + w / 2, -150); x += w; } });
      B.plane(319, 50, 0xd9cfbd, 45.5, .05, -140); B.plane(150, 22, 0x5f8f4e, 40, .055, -128); B.walk.push({ x0: -100, z0: -120, x1: 200, z1: -120 }, { x0: -100, z0: -168, x1: 200, z1: -168 }, { x0: 40, z0: -168, x1: 40, z1: -120 });
      const px = 40, pz = -152; B.solid(100, 10, 16, 0xf1e7d0, px, 0, pz); B.box(102, 1.2, 18, 0x8a8f94, px, 10, pz); B.solid(22, 14, 18, 0xf1e7d0, px, 0, pz);
      B.mesh(new R.SphereGeometry(6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeC, px, 14, pz);
      for (let i = -7; i <= 7; i++) B.box(2, 4, .3, 0x39404a, px + i * 6.2, 2.8, pz + 8.1);
      const t2 = [], l2 = []; for (let x = -100; x <= 200; x += 14) { t2.push([x, -118, 1]); l2.push([x + 6, -117]); } B.trees(t2); B.lamps(l2);
      /* ring duvarları (kıyı tarafı açık) */
      B.solid(2, 3, 200, 0xb9b2a4, -290, 0, 200); B.solid(2, 3, 200, 0xb9b2a4, 250, 0, 200); B.solid(540, 3, 2, 0xb9b2a4, -20, 0, 300);
      B.solid(2, 3, 190, 0xb9b2a4, -290, 0, -205); B.solid(2, 3, 190, 0xb9b2a4, 250, 0, -205); B.solid(540, 3, 2, 0xb9b2a4, -20, 0, -300);
      B.peds = B.people(120, r);
    }

    /* ================= 2) CADDEBOSTAN SAHİL YOLU ================= */
    function buildCaddebostan(B) {
      const r = rng(23), R = B.R;
      B.plane(2400, 1500, 0x9a958a, -20, 0, -700); B.plane(1200, 100, 0x9a958a, -20, 0, 100); B.sea(1600, 1400, -20, 750, -.8);
      B.plane(1200, 14, 0xe8d3a1, -17, .02, 37);                                  // kumsal
      B.plane(520, 36, 0xcfc7b8, -17, .04, 18); B.plane(520, 3, 0xb5524a, -17, .05, 16.5);   // yaya yolu + bisiklet yolu
      const xs = [-278, -212, -146, -80, -14, 52, 118, 184, 244], vx = xs.map(c => ({ c, h: 6 }));
      const hz = [{ c: -288, h: 6 }, { c: -224, h: 6 }, { c: -150, h: 6 }, { c: -76, h: 6 }, { c: 0, h: 9.2, dash: [-4.4, 4.4] }];
      roads(B, vx, hz);
      B.box(522, .3, 2.4, 0x5a8f4e, -17, 0, 0);                                    // orta refüj
      fill(B, r, vx, hz, { cap: (i, j) => (j === 3 ? 20 : 46), lo: 14, park: (i, j) => (j === 3 && (i % 2 === 0)) });
      B.solid(522, 1.2, 1.6, 0xe4ddd0, -17, 0, 30.5); B.solid(522, .6, .8, 0xc4bdb0, -17, 0, 10.2);   // deniz seti + kaldırım bordürü
      [10, 13, 20, 24].forEach(z => B.walk.push({ x0: -270, z0: z, x1: 236, z1: z }));
      const lp = []; for (let x = -270; x < 240; x += 24) lp.push([x, 12]); B.lamps(lp); const tr = []; for (let x = -270; x < 240; x += 18) tr.push([x, 26, 1]); B.trees(tr);
      for (let i = 0; i < 18; i++) { const x = -270 + i * 28, c = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047][i % 4]; B.box(.12, 2.6, .12, 0xffffff, x, 0, 37); B.mesh(new R.ConeGeometry(1.8, .8, 8), c, x, 2.9, 37); B.box(1, .3, 2.2, 0xffffff, x + 2.2, 0, 38); }
      for (let i = 0; i < 5; i++) { const x = -230 + i * 100; B.solid(8, 3.4, 5, [0xf2f2f2, 0xffe0b2][i % 2], x, 0, 21); B.box(9, .3, 6, [0xe53935, 0x1e88e5, 0xfdd835][i % 3], x, 3.4, 21); }
      B.box(5, .5, 42, 0x8d6e63, 60, -.3, 52); [8, 20, 32].forEach(z => { B.box(.4, 2, .4, 0x5d4037, 58, -1.3, 36 + z); B.box(.4, 2, .4, 0x5d4037, 62, -1.3, 36 + z); });
      B.solid(2, 3, 350, 0xb9b2a4, -290, 0, -125); B.solid(2, 3, 350, 0xb9b2a4, 262, 0, -125); B.solid(554, 3, 2, 0xb9b2a4, -14, 0, -300);
      B.peds = B.people(110, r);
    }

    /* ================= bölge tanımları ================= */
    const DEFS = [
      { id: 'ortakoy', name: 'Ortaköy & Boğaziçi Köprüsü', icon: '🕌', unlock: { missions: 3, earned: 600, gold: 800 }, spawn: { x: -250, z: 169, a: Math.PI / 2 }, build: buildOrtakoy,
        area: (x, z) => (Math.abs(x + 130) < 15 && z > -115 && z < 100 ? 'Boğaziçi Köprüsü' : z < -115 ? 'Anadolu Yakası' : 'Ortaköy') },
      { id: 'caddebostan', name: 'Caddebostan Sahil Yolu', icon: '🏖', unlock: { missions: 6, earned: 2000, gold: 2500 }, spawn: { x: -270, z: 5, a: Math.PI / 2 }, build: buildCaddebostan }
    ];
    const def = id => DEFS.find(d => d.id === id);
    const progressOk = d => P.missions >= d.unlock.missions || P.earned >= d.unlock.earned;
    const isUnlocked = id => IST.cfg.districts.devUnlockAll === true || !!P.unlocked[id] || progressOk(def(id));   // devUnlockAll: yalnızca denemek için

    /* ================= dünya değiştirme (Fatih'i bozmadan) ================= */
    const world = { cur: null, hidden: [], saved: null, group: {}, ret: null };
    function canEnter() {
      if (typeof playing === 'undefined' || !playing) return 'Önce oyuna başla';
      if (typeof boatM !== 'undefined' && boatM) return 'Tekneden çık';
      if (typeof cm !== 'undefined' && cm) return 'Önce görevi bitir';
      return '';
    }
    function enter(id) {
      const d = def(id); if (!d || world.cur) return false;
      const why = canEnter(); if (why) { IST.toast(why); return false; }
      if (!isUnlocked(id)) { IST.toast('Bu bölge kilitli'); return false; }
      world.hidden = []; scene.children.forEach(o => { if (o.isLight || o === car3 || (o.userData && o.userData.__ist)) return; world.hidden.push([o, o.visible]); o.visible = false; });
      const sv = world.saved = { arr: {}, C: C.slice(), SH: SH.slice(), DK: DK.slice() };
      [['rects', rects], ['ints', ints], ['peds', peds], ['ais', ais], ['coins', coins]].forEach(p => { sv.arr[p[0]] = p[1].splice(0); });
      for (let i = 0; i < C.length; i++) C[i] = 1e6; SH[0] = SH[1] = 1e6; DK[0] = DK[1] = 1e6;
      let gr = world.group[id];
      if (!gr) { const B = Builder(); d.build(B); gr = world.group[id] = { g: B.finish(), rects: B.rects, net: B.net, peds: B.peds }; scene.add(gr.g); }
      if (!gr.cars) gr.cars = makeCars(gr);
      gr.g.visible = true; gr.rects.forEach(r => rects.push(r)); gr.cars.forEach(c => { c.on = true; ais.push(c); });
      world.ret = { x: car.x, z: car.z, a: car.a }; world.cur = d;
      car.x = d.spawn.x; car.z = d.spawn.z; car.a = d.spawn.a; car.v = 0;
      try { cam.position.set(car.x - Math.sin(car.a) * 11, 5.2, car.z - Math.cos(car.a) * 11); } catch (e) {}
      lastT = 0; requestAnimationFrame(loop);
      IST.toast(d.icon + ' ' + d.name); IST.bus.emit('district:enter', { id });
      refreshBtn(); return true;
    }
    function exit(silent) {
      if (!world.cur) return false;
      const id = world.cur.id, gr = world.group[id], sv = world.saved;
      if (gr) gr.g.visible = false;
      [['rects', rects], ['ints', ints], ['peds', peds], ['ais', ais], ['coins', coins]].forEach(p => { p[1].splice(0); sv.arr[p[0]].forEach(x => p[1].push(x)); });
      for (let i = 0; i < C.length; i++) C[i] = sv.C[i]; SH[0] = sv.SH[0]; SH[1] = sv.SH[1]; DK[0] = sv.DK[0]; DK[1] = sv.DK[1];
      world.hidden.forEach(h => { h[0].visible = h[1]; }); world.hidden = [];
      if (!silent && world.ret) { car.x = world.ret.x; car.z = world.ret.z; car.a = world.ret.a; car.v = 0; }
      world.cur = null; world.saved = null;
      try { applyTraffic(); } catch (e) {}
      if (!silent) IST.toast('Fatih'); IST.bus.emit('district:exit', { id }); refreshBtn(); return true;
    }

    /* bölgedeki trafik: yol ağı (B.net) üzerinde gidip gelen araçlar; yol sonunda U dönüşü yapar */
    function makeCars(gr) {
      const net = gr.net.filter(r => Math.abs(r.b - r.a) > 40), out = [], N = Math.min(26, 8 + net.length * 3);
      if (!net.length) return out;
      for (let n = 0; n < N; n++) {
        const r = net[n % net.length], ax = r.ax === 'h' ? 1 : 0, dir = Math.random() < .5 ? -1 : 1, s = r.a + 15 + Math.random() * (r.b - r.a - 30);
        const c = { ax, dir, rc: r.c, ln: 0, v: 0, cd: 0, vm: 8 + Math.random() * 4, m: new R.Group(), on: true, dist: { a: r.a, b: r.b } };
        if (ax) { c.x = s; c.z = lane(c); } else { c.z = s; c.x = lane(c); }
        c.a = hd(c); c.m.add(carMesh(aiPal[n % aiPal.length], (n * 3) % 6, c)); gr.g.add(c.m); out.push(c);
      }
      return out;
    }
    if (typeof window.aiStep === 'function') {
      const o = window.aiStep;
      window.aiStep = function (c, dt) {
        o.apply(this, arguments);
        if (c.dist) { const s = c.ax ? c.x : c.z; if ((c.dir > 0 && s > c.dist.b - 8) || (c.dir < 0 && s < c.dist.a + 8)) { c.dir = -c.dir; c.cd = 2; } }
      };
    }

    /* bölgedeki yayalar: yürür; araç çarparsa oyunun kendi kuralı (−15 puan, −50 ₺) uygulanır */
    const gFree = () => typeof freeMode !== 'undefined' && freeMode === true;
    function hitPed(w) {
      if (typeof car === 'undefined' || Math.hypot(w.x - car.x, w.z - car.z) > 1.8 || Math.abs(car.v) < 2.5) return false;
      try { if (typeof pts === 'function') pts(-15); if (typeof fine === 'function') fine(50, 1); } catch (e) {}
      IST.toast(gFree() ? 'Yayaya çarptın' : 'Yayaya çarptın −50 ₺'); car.v *= .85; return true;
    }
    function tickPeds(dt) { const gr = world.cur && world.group[world.cur.id]; if (gr && gr.peds && !(typeof gOpen !== 'undefined' && gOpen)) gr.peds.update(dt, hitPed); }
    let lastT = 0;
    function loop(t) { if (!world.cur) return; tickPeds(Math.min(.05, (t - lastT) / 1000 || 0)); lastT = t; requestAnimationFrame(loop); }

    /* oyunun mevcut fonksiyonlarına SARMALAYICI (kaynak dosya değişmez) */
    if (typeof window.reset === 'function') { const o = window.reset; window.reset = function () { if (world.cur) exit(true); return o.apply(this, arguments); }; }
    if (typeof window.area === 'function') { const o = window.area; window.area = function () { return world.cur ? (world.cur.area ? world.cur.area(car.x, car.z) : world.cur.name) : o.apply(this, arguments); }; }
    if (typeof window.doneM === 'function') { const o = window.doneM; window.doneM = function () { const r = o.apply(this, arguments); P.missions++; save(); IST.bus.emit('mission:done'); refresh(); return r; }; }
    IST.bus.on('gold:gain', e => { P.earned += e.amount; save(); });

    /* ================= arayüz ================= */
    const panel = IST.ui.panel('ist-districts', '🏙 Bölgeler');
    panel.onOpen = refresh;
    function unlockWithGold(id) { const d = def(id); if (IST.gold.add(-d.unlock.gold)) { P.unlocked[id] = true; save(); IST.toast(d.name + ' açıldı'); refresh(); } else { IST.toast('Yetersiz altın'); try { panel.close(); if (IST.shop && IST.shop.openGold) IST.shop.openGold(); } catch (e) {} } }
    function refresh() {
      const b = panel.body; if (!b || !panel.isOpen) return; b.textContent = '';
      const info = document.createElement('small'); info.textContent = 'Görev: ' + P.missions + ' tamamlandı • Toplam kazanç: ' + P.earned + ' ₺'; b.appendChild(info);
      if (world.cur) { const row = document.createElement('div'); row.className = 'ist-row'; const t = document.createElement('div'); t.textContent = '📍 Şu an: ' + world.cur.name;
        const bt = document.createElement('button'); bt.className = 'ist-btn'; bt.textContent = "Fatih'e dön"; bt.onclick = () => { panel.close(); exit(); }; row.append(t, bt); b.appendChild(row); }
      DEFS.forEach(d => {
        const row = document.createElement('div'), un = isUnlocked(d.id); row.className = 'ist-row';
        const t = document.createElement('div'), nm = document.createElement('b'), sm = document.createElement('small'); nm.textContent = d.icon + ' ' + d.name; t.appendChild(nm);
        sm.textContent = un ? 'Açık' : '🔒 ' + Math.min(P.missions, d.unlock.missions) + '/' + d.unlock.missions + ' görev  veya  ' + Math.min(P.earned, d.unlock.earned) + '/' + d.unlock.earned + ' ₺ kazanç'; t.appendChild(sm);
        row.appendChild(t);
        const bt = document.createElement('button'); bt.className = 'ist-btn';
        if (un) { bt.textContent = world.cur && world.cur.id === d.id ? 'Buradasın' : 'Git'; bt.disabled = !!(world.cur && world.cur.id === d.id); bt.onclick = () => { const why = world.cur ? '' : canEnter(); if (why) return IST.toast(why); panel.close(); if (world.cur) exit(true); enter(d.id); }; }
        else { bt.textContent = d.unlock.gold + ' altınla aç'; bt.onclick = () => unlockWithGold(d.id); }
        row.appendChild(bt); b.appendChild(row);
      });
    }
    let btn = null;
    function refreshBtn() { if (btn) btn.textContent = world.cur ? "↩ Fatih'e dön" : '🏙 Bölgeler'; }
    btn = IST.ui.menuButton('bDist', '🏙 Bölgeler', () => { if (world.cur && !panel.isOpen) { exit(); return; } panel.open(); });
    IST.districts = { DEFS, enter, exit, _tick: tickPeds, isUnlocked, progress: P, get current() { return world.cur; }, _world: world };
  });
})();
