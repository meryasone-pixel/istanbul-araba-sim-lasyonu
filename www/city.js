/* city.js — şehir dokusu
   Binalar cephe türüne göre birleştirilir (4 malzeme = 4 çizim), cam ofis kuleleri, çatı detayları (klima, su deposu, anten),
   şehir dışında silüet, sokak lambaları + ıslak zemine düşen ışık havuzları, granit bordür, her kavşakta yaya geçidi + durma çizgisi,
   daha dolgun ağaçlar. */
(function () {
  'use strict';
  const R = THREE, CI = window.City = {};
  const lists = { 0: [], 1: [], 2: [], 3: [] }, roof = [];

  // indeksli birleştirme (konum, normal, uv, renk)
  function merge(items) {
    let nv = 0, ni = 0; items.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), C = new Float32Array(nv * 3), I = new Uint32Array(ni); let o = 0, oi = 0;
    items.forEach(g => {
      const n = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); U.set(g.attributes.uv.array, o * 2); C.set(g.attributes.color.array, o * 3);
      const ix = g.index.array; for (let i = 0; i < ix.length; i++) I[oi + i] = ix[i] + o; oi += ix.length; o += n; g.dispose();
    });
    const bg = new R.BufferGeometry(); bg.setAttribute('position', new R.BufferAttribute(P, 3)); bg.setAttribute('normal', new R.BufferAttribute(N, 3)); bg.setAttribute('uv', new R.BufferAttribute(U, 2)); bg.setAttribute('color', new R.BufferAttribute(C, 3)); bg.setIndex(new R.BufferAttribute(I, 1));
    bg.computeBoundingSphere(); return bg;
  }
  const col = new R.Color();
  function boxG(w, h, d, x, y, z, tint) {
    const g = new R.BoxGeometry(w, h, d), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w + d) / 12, uv.getY(i) * h / 6);
    g.translate(x, y, z); col.setHex(tint);
    const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    g.setAttribute('color', new R.BufferAttribute(c, 3)); return g;
  }
  const lighten = (hex, k) => { col.setHex(hex); col.lerp(new R.Color(1, 1, 1), k); return col.getHex(); };

  CI.bld = function (x, z, w, d, h, tower) {
    let type = tower ? 2 : [0, 0, 0, 1, 1, 3, 3][(Math.random() * 7) | 0];
    type = 0;   // tek grafik ayarı: bütün binalar aynı cephe türü
    const tint = type === 2 ? [0xcfd8e0, 0xb8c6d2, 0xd6dce0, 0xa9b9c4][(Math.random() * 4) | 0] : lighten(pal[(Math.random() * pal.length) | 0], type === 3 ? .55 : .35);
    lists[type].push(boxG(w, h, d, x, h / 2 + .3, z, tint));
    rects.push([x, z, w / 2, d / 2]);
    // çatı detayları
    const n = h > 30 ? 3 : (Math.random() * 3) | 0;
    for (let i = 0; i < n; i++) {
      const k = Math.random();
      if (k < .45) roof.push([x + rnd(-w / 3, w / 3), h + .3 + .45, z + rnd(-d / 3, d / 3), 1.2, .9, .9, 0x9a9da2]);         // klima
      else if (k < .75) roof.push([x + rnd(-w / 3, w / 3), h + .3 + .8, z + rnd(-d / 3, d / 3), 1.4, 1.6, 1.4, 0xd9d4c8]);  // su deposu
      else roof.push([x + rnd(-w / 3, w / 3), h + .3 + 2, z + rnd(-d / 3, d / 3), .08, 4, .08, 0x55585c]);                // anten
    }
    if (type !== 2 && Math.random() < .5) roof.push([x, h + .3 + .35, z, w + .3, .7, d + .3, lighten(0x8f8a84, .1)]);        // korkuluk duvarı
  };
  // ilçe modülü için: renk → cephe malzemesi
  const nmCache = {};
  CI.nm = function (c) {
    if (nmCache[c]) return nmCache[c];
    const t = [0, 1, 3][Math.abs(c) % 3], m = FX.facadeMat(t, c, false); bm.push(m); return (nmCache[c] = m);
  };
  CI.flush = function () {
    for (const t in lists) {
      if (!lists[t].length) continue;
      const m = FX.facadeMat(+t, 0xffffff, true); bm.push(m);
      const me = new R.Mesh(merge(lists[t]), m); me.castShadow = me.receiveShadow = true; scene.add(me); lists[t] = [];
    }
    if (roof.length) inst(new R.BoxGeometry(1, 1, 1), mat(0xffffff), roof.length, p => { for (const r of roof) p(r[0], r[1], r[2], 0, r[3], r[4], r[5], r[6]); }, true).castShadow = true;
  };

  CI.skyline = function () {};   // uzak silüet yalnız yüksek grafikteydi: kaldırıldı

  // kaldırımlar + bordür
  CI.sidewalks = function () {
    const n = 121, pm = FX.makePaving(10);
    const sw = new R.InstancedMesh(new R.BoxGeometry(40, .3, 40), pm, n), o = new R.Object3D(); let k = 0;
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) { o.position.set(i * 54, .15, j * 54); o.updateMatrix(); sw.setMatrixAt(k++, o.matrix); }
    sw.receiveShadow = true; sw.frustumCulled = false; scene.add(sw);
    const cm = mat(0x8f8a82);
    inst(new R.BoxGeometry(1, 1, 1), cm, n * 4, p => { for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) { const x = i * 54, z = j * 54; p(x, .16, z - 19.88, 0, 40, .32, .26); p(x, .16, z + 19.88, 0, 40, .32, .26); p(x - 19.88, .16, z, 0, .26, .32, 40); p(x + 19.88, .16, z, 0, .26, .32, 40); } }, true).receiveShadow = true;
  };

  // yaya geçitleri + durma çizgileri (tüm kavşaklar)
  CI.crossings = function () {
    const m = new R.MeshLambertMaterial({ color: 0xbcb6a8 });
    const ms = FX.wetify ? FX.wetify(m, { pud: 0, refl: .6 }) : m;
    ms.polygonOffset = true; ms.polygonOffsetFactor = -1; ms.polygonOffsetUnits = -1;   // yere yapışık çizgi titremesin (hafif: güçlüsü teker altını örtüyordu)
    const its = []; for (const x of C) for (const z of C) its.push([x, z]);
    // sahildeki son kavşaklarda doğuya (denize) giden bir yol yok: o tarafa yaya geçidi/durma çizgisi çizilmez (deniz duvarının içinde kalıyordu)
    const SEA = 305, A = [], B = [];   // sahil yolu x≈297±7; deniz duvarı x≈306–310
    const IN = v => Math.abs(v) <= 300;   // harita kenarındaki kavşakta dışarıda yol yok: o tarafa yaya geçidi / durma çizgisi çizilmez
    for (const [x, z] of its) for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const o = -5.6 + i * 1.4; if (IN(z + s * 9.6)) A.push([x + o, z + s * 9.6, 0]); if (IN(x + s * 9.6)) A.push([x + s * 9.6, z + o, Math.PI / 2]); }
    for (const [x, z] of its) { if (IN(z - 12.3)) B.push([x + 3.5, z - 12.3, 0]); if (IN(z + 12.3)) B.push([x - 3.5, z + 12.3, 0]); if (IN(x - 12.3)) B.push([x - 12.3, z - 3.5, Math.PI / 2]); if (IN(x + 12.3)) B.push([x + 12.3, z + 3.5, Math.PI / 2]); }
    const A2 = A.filter(q => q[0] < SEA), B2 = B.filter(q => q[0] < SEA);
    const st = inst(new R.BoxGeometry(.7, .004, 3), ms, A2.length, p => { for (const q of A2) p(q[0], .024, q[1], q[2]); }, true);   // asfaltın (y .02) hemen üstünde: eskiden 6 cm havadaydı, teker içine gömülüyordu
    const sl = inst(new R.BoxGeometry(6.4, .004, .4), ms, B2.length, p => { for (const q of B2) p(q[0], .024, q[1], q[2]); }, true);
    st.receiveShadow = sl.receiveShadow = true;
    CI.marks = [st, sl];
  };

  // sokak lambaları
  CI.lamps = function () {
    const L = [];
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      const cx = i * 54, cz = j * 54;
      for (const t of [-9, 9]) { L.push([cx + t, cz - 19.6, 0, -1]); L.push([cx + 19.6, cz + t, 1, 0]); L.push([cx - t, cz + 19.6, 0, 1]); L.push([cx - 19.6, cz - t, -1, 0]); }
    }
    for (const l of L) rects.push([l[0], l[1], .16, .16]);
    const pole = mat(0x2a2c30);
    inst(new R.CylinderGeometry(.08, .12, 7.4, 8), pole, L.length, p => { for (const l of L) p(l[0], 3.7 + .3, l[1]); }, true).castShadow = true;
    inst(new R.BoxGeometry(.08, .08, 1.7), pole, L.length, p => { for (const l of L) p(l[0] + l[2] * .8, 7.55, l[1] + l[3] * .8, Math.atan2(l[2], l[3])); }, true);
    inst(new R.BoxGeometry(.32, .14, .7), pole, L.length, p => { for (const l of L) p(l[0] + l[2] * 1.55, 7.5, l[1] + l[3] * 1.55, Math.atan2(l[2], l[3])); }, true);
    CI.headM = new R.MeshBasicMaterial({ color: 0x777777 });
    inst(new R.BoxGeometry(.26, .04, .6), CI.headM, L.length, p => { for (const l of L) p(l[0] + l[2] * 1.55, 7.42, l[1] + l[3] * 1.55, Math.atan2(l[2], l[3])); }, true);
    CI.L = L;
  };
  CI.setTime = function (m) {
    const k = m === 'night' ? 1 : m === 'dusk' ? .55 : 0;
    if (CI.headM) CI.headM.color.setRGB(.45 + 3.4 * k, .42 + 2.5 * k, .38 + 1.4 * k);
    if (CI.poolM) { CI.poolM.color.setRGB(.42 * k, .3 * k, .17 * k); CI.pools.visible = k > 0; }
    if (CI.hills) CI.hills.material.color.setHex(m === 'night' ? 0x07080c : m === 'dusk' ? 0x4a3a44 : 0x8e9aa6);
    if (window.People && People.adM) People.adM.color.setScalar(.9 + k * 1.6);
  };

  // daha dolgun ağaç tepeleri (iki küme) — birleştirilmiş geometri
  CI.treeGeo = function () {
    return new R.IcosahedronGeometry(1, 0);
  };
})();
