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
      /* süs nesneleri: hepsi türüne göre tek bir InstancedMesh'te toplanır (finish'te), çizim çağrısı artmaz */
      const dr = rng(7), drr = (a, b) => a + dr() * (b - a), dpk = a => a[(dr() * a.length) | 0], DQ = {};
      const lowQ = () => !!(window.FX && FX.Q === 0);
      const GEO = {
        box: () => new R.BoxGeometry(1, 1, 1),
        roof: () => { const q = new R.ConeGeometry(Math.SQRT1_2, 1, 4); q.rotateY(Math.PI / 4); return q; },
        trunk: () => new R.CylinderGeometry(.75, 1, 1, 6),
        crown: () => (window.City && City.treeGeo ? City.treeGeo() : new R.IcosahedronGeometry(1, 0)),
        bush: () => new R.IcosahedronGeometry(1, 1),
        cyl: () => new R.CylinderGeometry(1, 1, 1, 14)
      }, SHADOW = { box: true, roof: true, trunk: true, crown: true };
      const TC = [0x4f7a3a, 0x5d8c43, 0x3f6b34, 0x6b9a4d, 0x7fa356, 0x8a9a3e, 0x557f3c];
      const TILE = [0xb5523b, 0xa4462f, 0xc0644a, 0x8f3d2c];
      const FLW = [0xe53935, 0xfdd835, 0xf06292, 0xffffff, 0xab47bc, 0xff9800];
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
        deco(k, x, y, z, sx, sy, sz, ry, c) { (DQ[k] || (DQ[k] = [])).push([x, y, z, sx, sy, sz, ry || 0, c]); },
        lowQ, dr, drr, dpk, FLW,
        bush(x, z, s, c) { B.deco('bush', x, .45 * s, z, s, .8 * s, s, dr() * 6.28, c); },
        bench(x, z, ry) {                  // oturak + sırtlık + ayak
          const sx = Math.sin(ry), sz = Math.cos(ry);
          B.deco('box', x, .25, z, 2, .45, .45, ry, 0x4e4e52);
          B.deco('box', x, .5, z, 2.4, .1, .7, ry, 0x8d6e63);
          B.deco('box', x - sx * .32, .85, z - sz * .32, 2.4, .45, .1, ry, 0x8d6e63);
          B.rect(x, z, Math.abs(sz) * 1.2 + Math.abs(sx) * .4, Math.abs(sx) * 1.2 + Math.abs(sz) * .4);
        },
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
          const o = new R.Mesh(geo, m); o.position.set(x, h / 2 + .3, z); o.castShadow = o.receiveShadow = true; g.add(o); B.rect(x, z, w / 2, d / 2);
          const top = h + .3, dk = new R.Color(c).multiplyScalar(.74).getHex();
          B.deco('box', x, .75, z, w + .16, 1, d + .16, 0, dk);                         // zemin kat kuşağı
          if (h < 20 && dr() < .5) {                                                     // kiremit çatı
            B.deco('box', x, top + .15, z, w + .5, .3, d + .5, 0, 0xe8e0d0);
            B.deco('roof', x, top + .3 + Math.min(w, d) * .14, z, w + .4, Math.min(w, d) * .28, d + .4, 0, dpk(TILE));
          } else {                                                                       // düz çatı: korniş + çatı üstü
            B.deco('box', x, top - .05, z, w + .5, .5, d + .5, 0, dk);
            if (!lowQ()) {
              if (dr() < .6) B.deco('box', x + drr(-w / 4, w / 4), top + .55, z + drr(-d / 4, d / 4), 2, 1, 1.4, 0, 0xb8bcc0);
              if (dr() < .35) B.deco('cyl', x + drr(-w / 4, w / 4), top + .9, z + drr(-d / 4, d / 4), 1, 1.8, 1, 0, 0xdedede);
            }
          }
          return o;
        },
        people(n, rand) {                 // yaya çizgileri (B.walk) boyunca gezen, kol-bacak sallayan insanlar
          if (!B.walk.length || !n) return null;
          /* yürüme çizgilerini yollardan kes: yaya taşıt yoluna girmez (eskiden bazı çizgiler yolun ortasına uzanıyordu) */
          { const RD = B.net.map(r => { const h = (r.h || r.lo + 3) + .4; return r.ax === 'v' ? [r.c - h, r.c + h, Math.min(r.a, r.b), Math.max(r.a, r.b)] : [Math.min(r.a, r.b), Math.max(r.a, r.b), r.c - h, r.c + h]; });
            const out = [];
            for (const L of B.walk) {
              const dx = L.x1 - L.x0, dz = L.z1 - L.z0, len = Math.hypot(dx, dz) || 1, cut = [];
              for (const [xa, xb, za, zb] of RD) {   // Liang–Barsky: çizginin dikdörtgen içindeki [t0,t1] aralığı
                let t0 = 0, t1 = 1, ok = true;
                for (const [p, q] of [[-dx, L.x0 - xa], [dx, xb - L.x0], [-dz, L.z0 - za], [dz, zb - L.z0]]) {
                  if (p === 0) { if (q < 0) { ok = false; break; } } else { const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r); }
                }
                if (ok && t0 < t1) cut.push([t0, t1]);
              }
              cut.sort((a, b) => a[0] - b[0]); let s = 0;
              for (const [a, b] of cut.concat([[1, 1]])) { if ((a - s) * len >= 4) out.push({ x0: L.x0 + dx * s, z0: L.z0 + dz * s, x1: L.x0 + dx * a, z1: L.z0 + dz * a }); s = Math.max(s, b); }
            }
            if (out.length) { B.walk.length = 0; out.forEach(l => B.walk.push(l)); } }
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
          /* aynı çizgidekiler: sağdan yürü (karşıdan gelenle yan yana geç), aynı yöne gidende sollama yok — öndekini takip et */
          const byL = new Map(); W.forEach(w => { if (!byL.has(w.L)) byL.set(w.L, []); byL.get(w.L).push(w); });
          const api = { W, update(dt, hit) {
            for (let i = 0; i < n; i++) {
              const w = W[i], L = w.L, len = Math.hypot(L.x1 - L.x0, L.z1 - L.z0) || 1;
              let sp = w.sp; for (const o of byL.get(L)) { if (o === w || o.dir !== w.dir || o.down > 0) continue; const ah = (o.t - w.t) * w.dir * len; if (ah > 0 && ah < 1.3) sp = Math.min(sp, o.sp * Math.max(0, (ah - .6) / .7)); }
              if (w.down > 0) w.down -= dt; else { w.t += w.dir * sp * dt / len; if (w.t > 1 || w.t < 0) { w.dir = -w.dir; w.t = Math.max(0, Math.min(1, w.t)); } w.ph += dt * 7 * Math.min(1, sp / w.sp + .2); }
              w.k = (w.k === undefined ? w.dir : w.k) + (w.dir - (w.k === undefined ? w.dir : w.k)) * Math.min(1, dt * 2);   // dönüşte yumuşak yan geçiş
              const off = w.k * .4, nx = -(L.z1 - L.z0) / len, nz = (L.x1 - L.x0) / len;
              w.x = L.x0 + (L.x1 - L.x0) * w.t + nx * off; w.z = L.z0 + (L.z1 - L.z0) * w.t + nz * off;
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
        /* ağaç: gövde + dolgun tepe; her ağacın gövdesine çarpışma kutusu eklenir (araç artık içinden geçmez) */
        trees(pts, op) {
          op = op || {}; const lq = lowQ();
          pts.forEach(p => {
            const s = (p[2] || 1) * drr(.88, 1.12), c = dpk(TC);
            B.deco('trunk', p[0], s, p[1], .2 * s, 2 * s, .2 * s, 0, 0x5b4636);
            B.deco('crown', p[0], 2.9 * s, p[1], 1.35 * s, 1.5 * s, 1.35 * s, dr() * 6.28, c);
            if (!lq && dr() < .55) B.deco('crown', p[0] + drr(-.4, .4), 3.9 * s, p[1] + drr(-.4, .4), .8 * s, .9 * s, .8 * s, dr() * 6.28, dpk(TC));
            if (op.pit) B.deco('box', p[0], .06, p[1], 1.3, .06, 1.3, 0, 0x5a4632);       // ağaç dibi toprak
            B.rect(p[0], p[1], .45, .45);
          });
        },
        /* sokak lambası: kaide + direk + yola uzanan kol + fener; q = [x, z, yön açısı] */
        lamps(pts) {
          if (!pts.length) return;
          const l = new R.InstancedMesh(new R.SphereGeometry(.32, 10, 6), new R.MeshBasicMaterial({ color: 0xffe9a8 }), pts.length), o = new R.Object3D();
          pts.forEach((q, i) => {
            const a = q[2] || 0, sx = Math.sin(a), sz = Math.cos(a);
            B.deco('cyl', q[0], .25, q[1], .28, .5, .28, 0, 0x2f3a40);
            B.deco('cyl', q[0], 3.3, q[1], .1, 6.2, .1, 0, 0x37474f);
            B.deco('box', q[0] + sx * .7, 6.3, q[1] + sz * .7, .1, .1, 1.5, a, 0x37474f);
            B.deco('box', q[0] + sx * 1.4, 6.2, q[1] + sz * 1.4, .5, .22, .8, a, 0x263238);
            o.position.set(q[0] + sx * 1.4, 6.04, q[1] + sz * 1.4); o.scale.set(1, .45, 1); o.updateMatrix(); l.setMatrixAt(i, o.matrix);
            B.rect(q[0], q[1], .3, .3);
          });
          l.frustumCulled = false; g.add(l);
        },
        /* çalı çiti (çarpışmalı) */
        hedge(x0, z0, x1, z1) {
          const len = Math.hypot(x1 - x0, z1 - z0); if (len < 1) return; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hz = z0 === z1;
          B.deco('box', cx, .45, cz, hz ? len : .8, .9, hz ? .8 : len, 0, 0x3f6b34);
          B.rect(cx, cz, hz ? len / 2 : .4, hz ? .4 : len / 2);
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
        finish() {
          const dm = mat(0xffffff, { roughness: .9 }), o = new R.Object3D(), col = new R.Color();
          Object.keys(DQ).forEach(k => {
            const L = DQ[k], im = new R.InstancedMesh(GEO[k](), dm, L.length);
            L.forEach((q, i) => { o.position.set(q[0], q[1], q[2]); o.rotation.set(0, q[6], 0); o.scale.set(q[3], q[4], q[5]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.setHex(q[7])); });
            im.castShadow = !!SHADOW[k]; im.receiveShadow = true; im.frustumCulled = false; g.add(im);
          });
          g.updateMatrixWorld(true); g.traverse(o => { o.matrixAutoUpdate = false; }); return g; }
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
      vx.forEach(v => { v.a = v.a === undefined ? za : v.a; v.b = v.b === undefined ? zb : v.b; B.road(v.c, v.a, v.c, v.b, v.h * 2); B.net.push({ ax: 'v', c: v.c, a: v.a, b: v.b, lo: v.lo || (v.h > 8 ? 6 : 2.6), h: v.h }); });
      hz.forEach(h => { h.a = h.a === undefined ? xa : h.a; h.b = h.b === undefined ? xb : h.b; B.road(h.a, h.c, h.b, h.c, h.h * 2); B.net.push({ ax: 'h', c: h.c, a: h.a, b: h.b, lo: h.lo || (h.h > 8 ? 6 : 2.6), h: h.h }); });
      vx.forEach(v => {
        const cuts = hz.filter(h => h.c > v.a && h.c < v.b);
        segs(v.a, v.b, cuts, 1).forEach(sg => { (v.dash || [0]).forEach(d => B.dash(v.c + d, sg[0], v.c + d, sg[1]));
          [-1, 1].forEach(sd => { const off = sd * (v.h + 1.5); B.plane(3, sg[1] - sg[0], 0xcfc8bb, v.c + off, .04, (sg[0] + sg[1]) / 2); if (!B.lowQ()) B.deco('box', v.c + sd * (v.h + .12), .09, (sg[0] + sg[1]) / 2, .25, .18, sg[1] - sg[0], 0, 0xa9a39a); B.walk.push({ x0: v.c + sd * (v.h + 2.2), z0: sg[0], x1: v.c + sd * (v.h + 2.2), z1: sg[1] }); }); });
      });
      hz.forEach(h => {
        const cuts = vx.filter(v => v.c > h.a && v.c < h.b);
        segs(h.a, h.b, cuts, 1).forEach(sg => { (h.dash || [0]).forEach(d => B.dash(sg[0], h.c + d, sg[1], h.c + d));
          [-1, 1].forEach(sd => { const off = sd * (h.h + 1.5); B.plane(sg[1] - sg[0], 3, 0xcfc8bb, (sg[0] + sg[1]) / 2, .04, h.c + off); if (!B.lowQ()) B.deco('box', (sg[0] + sg[1]) / 2, .09, h.c + sd * (h.h + .12), sg[1] - sg[0], .18, .25, 0, 0xa9a39a); B.walk.push({ x0: sg[0], z0: h.c + sd * (h.h + 2.2), x1: sg[1], z1: h.c + sd * (h.h + 2.2) }); }); });
      });
      /* sokak ağaçları + lambalar */
      const tr = [], lp = [];
      vx.forEach(v => segs(v.a, v.b, hz.filter(h => h.c > v.a && h.c < v.b), 8).forEach(sg => { for (let z = sg[0] + 6; z < sg[1] - 2; z += 15) [-1, 1].forEach(sd => tr.push([v.c + sd * (v.h + .9), z, .85])); for (let z = sg[0] + 10; z < sg[1]; z += 34) lp.push([v.c + (v.h + .4), z, -Math.PI / 2]); }));
      hz.forEach(h => segs(h.a, h.b, vx.filter(v => v.c > h.a && v.c < h.b), 8).forEach(sg => { for (let x = sg[0] + 6; x < sg[1] - 2; x += 15) [-1, 1].forEach(sd => tr.push([x, h.c + sd * (h.h + .9), .85])); for (let x = sg[0] + 10; x < sg[1]; x += 34) lp.push([x, h.c - (h.h + .4), 0]); }));
      B.trees(tr, { pit: true }); B.lamps(lp);
    }
    /* park: çim, çapraz patikalar, çevre çiti, ortada havuzlu çeşme, çiçek tarhları, banklar, ağaçlar */
    function park(B, r, x0, x1, z0, z1) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0, pv = 0xd8c9a6, gap = 2.2;
      B.plane(W, D, 0x5f8f4e, cx, .045, cz);
      B.plane(W, 3, pv, cx, .05, cz); B.plane(3, D, pv, cx, .05, cz); B.plane(10, 10, 0xcfc3a6, cx, .052, cz);
      /* çevre çiti: patika ağızları açık */
      [z0 + .5, z1 - .5].forEach(z => { B.hedge(x0 + .5, z, cx - gap, z); B.hedge(cx + gap, z, x1 - .5, z); });
      [x0 + .5, x1 - .5].forEach(x => { B.hedge(x, z0 + 1, x, cz - gap); B.hedge(x, cz + gap, x, z1 - 1); });
      /* çeşme */
      B.deco('cyl', cx, .35, cz, 3.2, .7, 3.2, 0, 0xe2dccb); B.deco('cyl', cx, .66, cz, 2.85, .05, 2.85, 0, 0x5fa8c8);
      B.deco('cyl', cx, 1.3, cz, .35, 2, .35, 0, 0xe2dccb); B.deco('cyl', cx, 2.3, cz, 1.1, .25, 1.1, 0, 0xe2dccb); B.deco('cyl', cx, 2.44, cz, .95, .04, .95, 0, 0x7cc0dc);
      B.rect(cx, cz, 3.2, 3.2);
      /* çeşme çevresinde çiçek tarhları + banklar */
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(q => {
        const fx = cx + q[0] * 4.2, fz = cz + q[1] * 4.2; if (W < 22 || D < 22) return;
        B.deco('cyl', fx, .1, fz, 1.5, .2, 1.5, 0, 0x5a4632);
        for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28, rr_ = k ? 1 : 0; B.bush(fx + Math.cos(a) * rr_, fz + Math.sin(a) * rr_, rr(r, .3, .45), B.dpk(B.FLW)); }
      });
      if (D > 26) { B.bench(cx - 3, cz - 8, Math.PI / 2); B.bench(cx + 3, cz + 8, -Math.PI / 2); }
      if (W > 26) { B.bench(cx - 8, cz + 3, Math.PI); B.bench(cx + 8, cz - 3, 0); }
      /* ağaçlar (patika ve çeşmeden uzakta) + aralara çalı */
      const t = [];
      for (let x = x0 + 5; x < x1 - 3; x += 9) for (let z = z0 + 5; z < z1 - 3; z += 9) {
        const px = x + rr(r, -1.8, 1.8), pz = z + rr(r, -1.8, 1.8);
        if (Math.abs(px - cx) < 4 || Math.abs(pz - cz) < 4 || px < x0 + 2.5 || px > x1 - 2.5 || pz < z0 + 2.5 || pz > z1 - 2.5) continue;
        if (r() < .8) t.push([px, pz, rr(r, .85, 1.3)]); else B.bush(px, pz, rr(r, .7, 1.1), 0x4c7a3a);
      }
      B.trees(t);
      B.walk.push({ x0: x0 + 3, z0: cz + 1, x1: cx - 4.5, z1: cz + 1 }, { x0: cx + 4.5, z0: cz - 1, x1: x1 - 3, z1: cz - 1 },
        { x0: cx - 1, z0: z0 + 3, x1: cx - 1, z1: cz - 4.5 }, { x0: cx + 1, z0: cz + 4.5, x1: cx + 1, z1: z1 - 3 });
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
      const tr = [], lp = []; for (let x = -100; x <= 200; x += 14) { tr.push([x, 104, 1]); lp.push([x + 6, 103, 0]); if (x < 200) { B.bush(x + 3.5, 104, .7, B.dpk(B.FLW)); B.bush(x + 10.5, 104, .7, 0x4c7a3a); } } B.trees(tr, { pit: true }); B.lamps(lp);
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
      B.net.push({ ax: 'v', c: AX, a: -115, b: 100, lo: 6 });
      /* ---- ANADOLU YAKASI (kuzey): Beylerbeyi çevresi ---- */
      const vA = vx.map(v => Object.assign({}, v, { a: -288, b: v.c === AX ? -115 : -180 })), hA = [{ c: -288, h: 6 }, { c: -234, h: 6 }, { c: -180, h: 6 }];
      roads(B, vA, hA);
      fill(B, r, vx, hA, { cap: (i, j, x0, x1) => (x1 > AX - 20 && x0 < AX + 20 ? 16 : 30), park: (i, j) => (i === 2 && j === 0) });
      [[-269, -146], [208, 247]].forEach(p => { for (let x = p[0]; x < p[1] - 10;) { const w = Math.min(p[1] - x, rr(r, 15, 24)); if (w < 11) break; B.bldg(w - 1.2, 18, rr(r, 10, 20), PAL[(r() * PAL.length) | 0], x + w / 2, -150); x += w; } });
      B.plane(319, 50, 0xd9cfbd, 45.5, .05, -140); B.plane(150, 22, 0x5f8f4e, 40, .055, -128); B.walk.push({ x0: -100, z0: -120, x1: 200, z1: -120 }, { x0: -100, z0: -168, x1: 200, z1: -168 }, { x0: 40, z0: -168, x1: 40, z1: -120 });
      const px = 40, pz = -152; B.solid(100, 10, 16, 0xf1e7d0, px, 0, pz); B.box(102, 1.2, 18, 0x8a8f94, px, 10, pz); B.solid(22, 14, 18, 0xf1e7d0, px, 0, pz);
      B.mesh(new R.SphereGeometry(6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeC, px, 14, pz);
      for (let i = -7; i <= 7; i++) B.box(2, 4, .3, 0x39404a, px + i * 6.2, 2.8, pz + 8.1);
      const t2 = [], l2 = []; for (let x = -100; x <= 200; x += 14) { t2.push([x, -118, 1]); l2.push([x + 6, -117, Math.PI]); if (x < 200) { B.bush(x + 3.5, -118, .7, B.dpk(B.FLW)); B.bush(x + 10.5, -118, .7, 0x4c7a3a); } } B.trees(t2, { pit: true }); B.lamps(l2);
      for (let i = 0; i < 6; i++) B.bench(-60 + i * 45, -124, Math.PI);
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
      B.plane(520, 20.4, 0xcfc7b8, -17, .04, 19.8); B.plane(520, 3, 0xb5524a, -17, .05, 16.5);   // yaya yolu (bordürden deniz setine: z 9.6–30; eskiden ana yolun yarısını örtüyordu) + bisiklet yolu
      const xs = [-278, -212, -146, -80, -14, 52, 118, 184, 244], vx = xs.map(c => ({ c, h: 6 }));
      const hz = [{ c: -288, h: 6 }, { c: -224, h: 6 }, { c: -150, h: 6 }, { c: -76, h: 6 }, { c: 0, h: 9.2, dash: [-4.4, 4.4], lo: 6.8 }];
      roads(B, vx, hz);
      B.box(522, .3, 2.4, 0x5a8f4e, -17, 0, 0);                                    // orta refüj
      fill(B, r, vx, hz, { cap: (i, j) => (j === 3 ? 20 : 46), lo: 14, park: (i, j) => (j === 3 && (i % 2 === 0)) });
      B.solid(522, 1.2, 1.6, 0xe4ddd0, -17, 0, 30.5); B.solid(522, .6, .8, 0xc4bdb0, -17, 0, 10.2);   // deniz seti + kaldırım bordürü
      [10, 13, 20, 24].forEach(z => B.walk.push({ x0: -270, z0: z, x1: 236, z1: z }));
      const lp = []; for (let x = -270; x < 240; x += 24) lp.push([x, 12, Math.PI]); B.lamps(lp);
      const tr = []; for (let x = -270; x < 240; x += 18) {             // sahil ağaçları + aralarında çiçek tarhları ve banklar
        tr.push([x, 26, 1]); if (x + 9 >= 240) continue;
        B.deco('cyl', x + 9, .12, 26, 2, .24, 2, 0, 0x5a4632);
        for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; B.bush(x + 9 + Math.cos(a) * 1.1, 26 + Math.sin(a) * 1.1, .42, B.dpk(B.FLW)); } B.bush(x + 9, 26, .6, 0x4c7a3a);
        const kd = (((x + 4.5 + 230) % 100) + 100) % 100;                // büfelerin (her 100 m) üstüne bank koyma
        if (x % 36 === 0 && kd > 8 && kd < 92) B.bench(x + 4.5, 22.5, 0);
      }
      B.trees(tr, { pit: true });
      if (!B.lowQ()) for (let x = -268; x < 238; x += 4) if (xs.every(c => Math.abs(x - c) > 10)) B.bush(x, 0, B.drr(.45, .65), B.dr() < .3 ? B.dpk(B.FLW) : 0x4f7a3a);   // refüj çalı/çiçekleri
      for (let i = 0; i < 18; i++) { const x = -270 + i * 28, c = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047][i % 4]; B.box(.12, 2.6, .12, 0xffffff, x, 0, 37); B.mesh(new R.ConeGeometry(1.8, .8, 8), c, x, 2.9, 37); B.box(1, .3, 2.2, 0xffffff, x + 2.2, 0, 38); }
      for (let i = 0; i < 5; i++) { const x = -230 + i * 100; B.solid(8, 3.4, 5, [0xf2f2f2, 0xffe0b2][i % 2], x, 0, 21); B.box(9, .3, 6, [0xe53935, 0x1e88e5, 0xfdd835][i % 3], x, 3.4, 21); }
      B.box(5, .5, 42, 0x8d6e63, 60, -.3, 52); [8, 20, 32].forEach(z => { B.box(.4, 2, .4, 0x5d4037, 58, -1.3, 36 + z); B.box(.4, 2, .4, 0x5d4037, 62, -1.3, 36 + z); });
      B.solid(2, 3, 350, 0xb9b2a4, -290, 0, -125); B.solid(2, 3, 350, 0xb9b2a4, 262, 0, -125); B.solid(554, 3, 2, 0xb9b2a4, -14, 0, -300);
      B.peds = B.people(110, r);
    }

    /* ================= bölge tanımları ================= */
    const DEFS = [
      { id: 'ortakoy', name: 'Ortaköy & Boğaziçi Köprüsü', icon: '🕌', unlock: { missions: 5, earned: 3000, gold: 3000 }, spawn: { x: -250, z: 169, a: Math.PI / 2 }, build: buildOrtakoy,
        area: (x, z) => (Math.abs(x + 130) < 15 && z > -115 && z < 100 ? 'Boğaziçi Köprüsü' : z < -115 ? 'Anadolu Yakası' : 'Ortaköy') },
      { id: 'caddebostan', name: 'Caddebostan Sahil Yolu', icon: '🏖', unlock: { missions: 12, earned: 8000, gold: 6000, after: 'ortakoy' }, spawn: { x: -270, z: 5, a: Math.PI / 2 }, build: buildCaddebostan }
    ];
    const def = id => DEFS.find(d => d.id === id);
    /* bölge zinciri: unlock.after verilmişse önce o bölge açık olmalı (ilerlemeyle de altınla da) */
    const prevOk = d => !d.unlock.after || isUnlocked(d.unlock.after);
    const progressOk = d => prevOk(d) && (P.missions >= d.unlock.missions || P.earned >= d.unlock.earned);
    /* görev/kazançla açılan bölge de kalıcı kaydedilir: kurallar sonradan değişse bile oyuncu açtığı bölgeyi kaybetmez.
       devUnlockAll (yalnızca deneme) açıkken hiçbir şey kaydedilmez. */
    const isUnlocked = id => {
      if (IST.cfg.districts.devUnlockAll === true) return true;
      if (P.unlocked[id]) return true;
      if (progressOk(def(id))) { P.unlocked[id] = true; save(); return true; }
      return false;
    };
    P.tried = P.tried || {};   // deneme sürüşü yapılmış bölgeler (her bölge bir kez)

    /* ================= bölgeye özel görevler: 3 kontrol noktası, süre sınırı, altın ödülü ================= */
    const DM = {
      ortakoy: { name: '🌉 Köprü turu', desc: 'Boğaziçi Köprüsü dahil 3 kontrol noktasından geç', time: 120, reward: 150, pref: l => l.filter(r => Math.abs(r.c + 130) < 15) },
      caddebostan: { name: '🏖 Sahil turu', desc: 'Sahil yolu boyunca 3 kontrol noktasından geç', time: 120, reward: 200, pref: l => { const m = Math.max(...l.map(r => r.b - r.a)); return l.filter(r => r.b - r.a >= m * .6); } }
    };
    const dm = { on: null, ring: null };
    function dmPoints(gr, spec) {
      const long = (gr.net || []).filter(r => Math.abs(r.b - r.a) > 40); if (!long.length) return null;
      const pref = spec.pref ? spec.pref(long) : [], pts = [];
      for (let tries = 0; pts.length < 3 && tries < 400; tries++) {
        const pool = pts.length === 1 && pref.length ? pref : long, r = pool[(Math.random() * pool.length) | 0];
        const s = r.a + 15 + Math.random() * Math.max(1, r.b - r.a - 30), q = pos(r, s, laneX(r, 1)), pv = pts.length ? pts[pts.length - 1] : { x: car.x, z: car.z };
        if (Math.hypot(q[0] - pv.x, q[1] - pv.z) < 60) continue;
        pts.push({ x: q[0], z: q[1] });
      }
      return pts.length === 3 ? pts : null;
    }
    function dmRing(gr, p) {
      if (!dm.ring) { dm.ring = new R.Mesh(new R.CylinderGeometry(4, 4, 30, 20, 1, true), new R.MeshBasicMaterial({ color: 0x2ee06b, transparent: true, opacity: .3, side: R.DoubleSide, depthWrite: false })); dm.ring.userData.__ist = true; }
      gr.g.add(dm.ring); dm.ring.position.set(p.x, 15, p.z); dm.ring.visible = true;
    }
    function startDM() {
      if (!world.cur || dm.on || world.trial > 0) return;
      if (typeof cm !== 'undefined' && cm) return IST.toast('Önce görevi bitir');
      const spec = DM[world.cur.id], gr = world.group[world.cur.id]; if (!spec || !gr) return;
      const pts = dmPoints(gr, spec); if (!pts) return IST.toast('Görev başlatılamadı');
      dm.on = { spec, pts, k: 0, t: spec.time }; dmRing(gr, pts[0]);
      try { nav.style.display = 'block'; } catch (e) {}
      IST.toast(spec.name + ' başladı!');
    }
    function endDM() {
      if (!dm.on) return; dm.on = null; if (dm.ring) dm.ring.visible = false;
      try { mh.textContent = ''; nav.style.display = 'none'; } catch (e) {}
    }
    function tickDM(dt) {
      const m = dm.on; if (!m || (typeof gOpen !== 'undefined' && gOpen)) return;
      m.t -= dt; const c = m.pts[m.k];
      if (Math.hypot(c.x - car.x, c.z - car.z) < 8) {
        m.k++;
        if (m.k >= m.pts.length) {
          const r = m.spec.reward; endDM(); IST.gold.add(r); P.missions++; save(); checkUnlocks(); IST.bus.emit('mission:done');
          IST.toast('✅ ' + m.spec.name + ' tamam! +' + r + ' altın'); return;
        }
        dmRing(world.group[world.cur.id], m.pts[m.k]); IST.toast('Kontrol noktası ' + m.k + '/' + m.pts.length);
      }
      if (m.t <= 0) { endDM(); IST.toast('⏱ Süre doldu — tekrar dene'); return; }
      const c2 = m.pts[m.k];
      try { mh.textContent = m.spec.name + ' · Kontrol ' + (m.k + 1) + '/' + m.pts.length + ' · ' + Math.ceil(m.t) + ' sn'; arrow(c2.x, c2.z); } catch (e) {}
    }

    /* ================= kilitli bölge için 60 sn deneme sürüşü (her bölge bir kez) ================= */
    const TRIAL = 60;
    function tickTrial(dt) {
      if (!(world.trial > 0)) return;
      if (!(typeof gOpen !== 'undefined' && gOpen)) world.trial -= dt;
      try { mh.textContent = '🚗 Deneme sürüşü · ' + Math.max(0, Math.ceil(world.trial)) + ' sn'; } catch (e) {}
      if (world.trial <= 0) {
        const d = world.cur; exit();
        try { mh.textContent = ''; } catch (e) {}
        IST.toast('Deneme bitti! ' + (d ? d.name : 'Bölge') + ' bölgesini açmak için 🏙 Bölgeler menüsüne bak');
      }
    }

    const checkUnlocks = () => { try { DEFS.forEach(d => { if (IST.cfg.districts.devUnlockAll !== true && !P.unlocked[d.id] && isUnlocked(d.id)) IST.toast(d.icon + ' ' + d.name + ' açıldı!'); }); } catch (e) {} };

    /* ================= dünya değiştirme (Fatih'i bozmadan) ================= */
    const world = { cur: null, hidden: [], saved: null, group: {}, ret: null };
    function canEnter() {
      if (typeof playing === 'undefined' || !playing) return 'Önce oyuna başla';
      if (typeof boatM !== 'undefined' && boatM) return 'Tekneden çık';
      if (typeof cm !== 'undefined' && cm) return 'Önce görevi bitir';
      return '';
    }
    function enter(id, trial) {
      const d = def(id); if (!d || world.cur) return false;
      const why = canEnter(); if (why) { IST.toast(why); return false; }
      if (!isUnlocked(id) && !(trial === true && !P.tried[id])) { IST.toast('Bu bölge kilitli'); return false; }
      world.trial = 0; if (trial === true && !isUnlocked(id)) { P.tried[id] = 1; save(); world.trial = TRIAL; }
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
      endDM(); if (world.trial > 0) { world.trial = 0; try { mh.textContent = ''; } catch (e) {} }
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

    /* bölgedeki trafik: araçlar yol ağını (B.net) şerit çizgisi üzerinde takip eder; yol sonunda bağlı yola dönerek
       (ya da köprüde olduğu gibi aynı hatta devam ederek) yoluna devam eder. Yolun ortasında U dönüşü YOK: eski sürümde
       araçlar orta bariyere/kaldırıma çıkıp birbirlerinin içinden geçiyordu. */
    const laneX = (r, dir) => r.c + (r.ax === 'v' ? (dir > 0 ? -1 : 1) : (dir > 0 ? 1 : -1)) * r.lo;   // vehicles: sağdan gidiş
    const along = (r, x, z) => r.ax === 'v' ? z : x;
    const pos = (r, s, l) => r.ax === 'v' ? [l, s] : [s, l];
    function nextRoad(net, r, dir) {
      const e = dir > 0 ? r.b : r.a, opts = [];
      for (const n of net) {
        if (n === r) continue;
        if (n.ax === r.ax) { if (Math.abs(n.c - r.c) < .5 && Math.abs((dir > 0 ? n.a : n.b) - e) < .5) opts.push([n, dir, 3]); continue; }   // düz devam (köprü)
        if (Math.abs(n.c - e) > .5 || r.c < n.a - .5 || r.c > n.b + .5) continue;
        if (r.c < n.b - 10) opts.push([n, 1, 1]);
        if (r.c > n.a + 10) opts.push([n, -1, 1]);
      }
      if (!opts.length) return [r, -dir];
      let tot = 0; opts.forEach(o => tot += o[2]); let k = Math.random() * tot;
      for (const o of opts) { k -= o[2]; if (k <= 0) return [o[0], o[1]]; }
      return [opts[0][0], opts[0][1]];
    }
    function makeCars(gr) {
      const net = gr.net, long = net.filter(r => Math.abs(r.b - r.a) > 40), out = [], N = Math.min(26, 8 + long.length * 3);
      if (!long.length) return out;
      for (let n = 0, tries = 0; n < N && tries < 400; tries++) {
        const r = long[(Math.random() * long.length) | 0], dir = Math.random() < .5 ? -1 : 1, s = r.a + 15 + Math.random() * (r.b - r.a - 30), q = pos(r, s, laneX(r, dir));
        if (out.some(o => Math.hypot(o.x - q[0], o.z - q[1]) < 14)) continue;
        const c = { dist: { net, r, dir, nx: null }, ax: r.ax === 'h' ? 1 : 0, dir, rc: r.c, ln: 0, v: 0, cd: 0, vm: 8 + Math.random() * 4, m: new R.Group(), on: true, x: q[0], z: q[1] };
        c.a = r.ax === 'v' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        c.m.add(carMesh(aiPal[n % aiPal.length], (n * 3) % 6, c)); c.m.position.set(c.x, 0, c.z); c.m.rotation.y = c.a; gr.g.add(c.m); out.push(c); n++;
      }
      return out;
    }
    const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
    function distStep(c, dt) {
      const D = c.dist; let r = D.r, dir = D.dir;
      const s = along(r, c.x, c.z), e = dir > 0 ? r.b : r.a, left = (e - s) * dir;
      if (!D.nx) D.nx = nextRoad(D.net, r, dir);
      const [nr, nd] = D.nx, turning = nr !== r && nr.ax !== r.ax, uturn = nr === r;
      // kavşağa girince yeni yola geç (dönüş yayı, yeni şeridin üzerindeki hedef noktası takip edilerek çizilir)
      const sw = turning ? left < nr.lo + 3 : left < 1;
      if (sw || left < -2) { D.r = r = nr; D.dir = dir = nd; D.nx = null; c.ax = r.ax === 'h' ? 1 : 0; c.dir = dir; c.rc = r.c; }
      // hedef: şerit üzerinde 6 m ileri
      const s2 = along(r, c.x, c.z), tgt = pos(r, s2 + dir * 6, laneX(r, dir)), want0 = Math.atan2(tgt[0] - c.x, tgt[1] - c.z);
      const da = wrapA(want0 - c.a);
      let want = c.vm;
      const l2 = ((dir > 0 ? r.b : r.a) - s2) * dir;
      if ((turning || uturn) && l2 < 22) want = Math.min(want, uturn ? 3 : 5.5);
      if (Math.abs(da) > .25) want = Math.min(want, 5.5);
      const sn = Math.sin(c.a), cs = Math.cos(c.a);
      const chk = (ox, oz, gap) => { const x = ox - c.x, z = oz - c.z, fd = x * sn + z * cs, ld = Math.abs(x * cs - z * sn); if (fd > 0 && fd < 16 && ld < 2.3) want = Math.min(want, Math.max(0, fd - gap) * .9); };
      c.stk = c.v < .3 ? (c.stk || 0) + dt : 0;
      if (c.stk < 6) for (const o of ais) if (o !== c && o.on) chk(o.x, o.z, 6.5);
      chk(car.x, car.z, 6.5);
      c.v = Math.max(0, c.v + (c.v < want ? 3.5 : -9) * dt);
      c.a = wrapA(c.a + Math.max(-2.6 * dt, Math.min(2.6 * dt, da)));
      const px = c.x, pz = c.z;
      c.x += Math.sin(c.a) * c.v * dt; c.z += Math.cos(c.a) * c.v * dt;
      if (rectHit(c.x, c.z) && !rectHit(px, pz)) { c.x = px; c.z = pz; c.v = 0; }
      if (c.sL) { const bo = ((performance.now() / 350) | 0) % 2, sg = da > .12 ? 1 : da < -.12 ? -1 : 0; c.sL.color.setHex(sg > 0 && bo ? 0xffa000 : 0x4a2c00); c.sR.color.setHex(sg < 0 && bo ? 0xffa000 : 0x4a2c00); }
      VEH.tail(c.tl && c.tl.color, want < c.v - .4 || c.v < .4);
      c.m.position.set(c.x, 0, c.z); c.m.rotation.y = c.a; c.m.visible = Math.abs(c.x - car.x) < 200 && Math.abs(c.z - car.z) < 200;
    }
    if (typeof window.aiStep === 'function') {
      const o = window.aiStep;
      window.aiStep = function (c, dt) { if (c.dist && c.dist.net) return distStep(c, dt); return o.apply(this, arguments); };
    }

    /* bölgedeki yayalar: yürür; araç çarparsa oyunun kendi kuralı (−15 puan, −50 altın) uygulanır */
    const gFree = () => typeof freeMode !== 'undefined' && freeMode === true;
    function hitPed(w) {
      if (typeof car === 'undefined' || Math.hypot(w.x - car.x, w.z - car.z) > 1.8 || Math.abs(car.v) < 2.5) return false;
      try { if (typeof pts === 'function') pts(-15); if (typeof fine === 'function') fine(50, 1); } catch (e) {}
      IST.toast(gFree() ? 'Yayaya çarptın' : 'Yayaya çarptın −50 altın'); car.v *= .85; return true;
    }
    function tickPeds(dt) { const gr = world.cur && world.group[world.cur.id]; if (gr && gr.peds && !(typeof gOpen !== 'undefined' && gOpen)) gr.peds.update(dt, hitPed); }
    let lastT = 0;
    function loop(t) { if (!world.cur) return; const dt = Math.min(.05, (t - lastT) / 1000 || 0); tickPeds(dt); lastT = t; try { tickDM(dt); tickTrial(dt); } catch (e) { console.error('[IST districts]', e); } if (world.cur) requestAnimationFrame(loop); }

    /* oyunun mevcut fonksiyonlarına SARMALAYICI (kaynak dosya değişmez) */
    if (typeof window.reset === 'function') { const o = window.reset; window.reset = function () { if (world.cur) exit(true); return o.apply(this, arguments); }; }
    if (typeof window.area === 'function') { const o = window.area; window.area = function () { return world.cur ? (world.cur.area ? world.cur.area(car.x, car.z) : world.cur.name) : o.apply(this, arguments); }; }
    if (typeof window.doneM === 'function') { const o = window.doneM; window.doneM = function () { const r = o.apply(this, arguments); P.missions++; save(); checkUnlocks(); IST.bus.emit('mission:done'); refresh(); return r; }; }
    IST.bus.on('gold:gain', e => { P.earned += e.amount; save(); checkUnlocks(); });
    checkUnlocks();   // mevcut ilerlemeyle açık olan bölgeleri açılışta da kalıcı kaydet

    /* ================= arayüz ================= */
    const panel = IST.ui.panel('ist-districts', '🏙 Bölgeler');
    panel.onOpen = refresh;
    function unlockWithGold(id) { const d = def(id); if (!prevOk(d)) return IST.toast('Önce ' + def(d.unlock.after).name + ' bölgesini aç'); if (IST.gold.add(-d.unlock.gold)) { P.unlocked[id] = true; save(); IST.toast(d.name + ' açıldı'); refresh(); } else { IST.toast('Yetersiz altın'); try { panel.close(); if (IST.shop && IST.shop.openGold) IST.shop.openGold(); } catch (e) {} } }
    function refresh() {
      const b = panel.body; if (!b || !panel.isOpen) return; b.textContent = '';
      const info = document.createElement('small'); info.textContent = 'Görev: ' + P.missions + ' tamamlandı • Toplam kazanç: ' + P.earned + ' altın'; b.appendChild(info);
      if (world.cur) { const row = document.createElement('div'); row.className = 'ist-row'; const t = document.createElement('div'); t.textContent = '📍 Şu an: ' + world.cur.name;
        const bt = document.createElement('button'); bt.className = 'ist-btn'; bt.textContent = "Fatih'e dön"; bt.onclick = () => { panel.close(); exit(); }; row.append(t, bt); b.appendChild(row);
        const spec = DM[world.cur.id];
        if (spec) { const r2 = document.createElement('div'); r2.className = 'ist-row'; const t2 = document.createElement('div'), n2 = document.createElement('b'), s2 = document.createElement('small');
          n2.textContent = spec.name + ' · ' + spec.reward + ' altın'; s2.textContent = world.trial > 0 ? 'Deneme sürüşünde görev yapılamaz' : spec.desc + ' (' + spec.time + ' sn)'; t2.append(n2, s2);
          const b2 = document.createElement('button'); b2.className = 'ist-btn'; b2.textContent = dm.on ? 'Devam ediyor' : 'Başlat'; b2.disabled = !!dm.on || world.trial > 0;
          b2.onclick = () => { panel.close(); startDM(); }; r2.append(t2, b2); b.appendChild(r2); } }
      DEFS.forEach(d => {
        const row = document.createElement('div'), un = isUnlocked(d.id); row.className = 'ist-row';
        const t = document.createElement('div'), nm = document.createElement('b'), sm = document.createElement('small'); nm.textContent = d.icon + ' ' + d.name; t.appendChild(nm);
        sm.textContent = un ? 'Açık' : !prevOk(d) ? '🔒 Önce ' + def(d.unlock.after).name + ' bölgesini aç' : '🔒 ' + Math.min(P.missions, d.unlock.missions) + '/' + d.unlock.missions + ' görev  veya  ' + Math.min(P.earned, d.unlock.earned) + '/' + d.unlock.earned + ' altın kazanç'; t.appendChild(sm);
        row.appendChild(t);
        const bt = document.createElement('button'); bt.className = 'ist-btn';
        if (un) { bt.textContent = world.cur && world.cur.id === d.id ? 'Buradasın' : 'Git'; bt.disabled = !!(world.cur && world.cur.id === d.id); bt.onclick = () => { const why = world.cur ? '' : canEnter(); if (why) return IST.toast(why); panel.close(); if (world.cur) exit(true); enter(d.id); }; }
        else { bt.textContent = d.unlock.gold + ' altınla aç'; bt.disabled = !prevOk(d); bt.onclick = () => unlockWithGold(d.id); }
        if (!un && !P.tried[d.id] && !world.cur) {   // kilitli bölgeyi bir kez 60 sn deneme
          const tb = document.createElement('button'); tb.className = 'ist-btn'; tb.textContent = '🚗 ' + TRIAL + ' sn dene';
          tb.onclick = () => { const why = canEnter(); if (why) return IST.toast(why); panel.close(); enter(d.id, true); };
          row.appendChild(tb);
        }
        row.appendChild(bt); b.appendChild(row);
      });
    }
    let btn = null, dmBtn = null;
    function refreshBtn() {
      if (btn) btn.textContent = world.cur ? "↩ Fatih'e dön" : '🏙 Bölgeler';
      if (dmBtn) { const sp = world.cur && DM[world.cur.id]; dmBtn.style.display = sp && !(world.trial > 0) ? '' : 'none'; if (sp) dmBtn.textContent = '🎯 ' + sp.name.replace(/^\S+\s/, '') + ' · ' + sp.reward + ' altın'; }
    }
    btn = IST.ui.menuButton('bDist', '🏙 Bölgeler', () => { if (world.cur && !panel.isOpen) { exit(); return; } panel.open(); }, { inGame: true });
    /* bölge görevi düğmesi: yalnızca bir bölgedeyken (deneme sürüşü hariç) görünür */
    dmBtn = IST.ui.menuButton('bDM', '🎯 Bölge görevi', () => { if (dm.on) return IST.toast('Görev devam ediyor'); document.body.classList.remove('mn'); startDM(); }, { inGame: true, before: 'bDist' });
    refreshBtn();
    IST.districts = { DEFS, enter, exit, _tick: tickPeds, isUnlocked, progress: P, get current() { return world.cur; }, _world: world };
  });
})();
