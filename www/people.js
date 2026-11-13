/* people.js — yaşayan sokaklar
   Her yaya 18 kemikli iskeletli (SkinnedMesh) tek çizim: kalça/diz/ayak bileği, omuz/dirsek/el, gövde burulması, baş takibi.
   Davranışlar: yürüme (adım uzunluğuna bağlı yürüyüş döngüsü, yaşlı/genç hız farkı, telefonla yazışarak yürüme),
   vitrine bakma, gruplar halinde sohbet (konuşan el kol hareketi yapar, dinleyen başını sallar), bankta oturma,
   otobüs durağında bekleme (saate bakma, yola bakma), yaya geçidinde bekleme (ışıklı geçitte yeşili, ışıksızda boşluğu kollar),
   karşıya geçme (yaklaşan araçta koşar), trafiğe tepki (hızlı geçen araca bakar, üzerine gelen araçtan sıçrayıp kaçar,
   kornaya dönüp yumruk sallar), yağmurda şemsiye. Yayalar oyuncunun çevresinde görüş dışında yeniden konumlanır. */
(function () {
  'use strict';
  const R = THREE, PE = window.People = { cross: [], list: [] };
  const RING = 18.6, PER = 152, CW = 17.4;
  const rr = (a, b) => a + Math.random() * (b - a), pk = a => a[(Math.random() * a.length) | 0], cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));

  const SKIN = [0xf1d2b8, 0xe8c09f, 0xd9a882, 0xc68e64, 0xa8714a, 0x7d5034, 0x5c3a26, 0xf5dccb];
  const HAIR = [0x16110d, 0x241810, 0x3b2617, 0x5a3a22, 0x7a5532, 0xa58256, 0x8e8b88, 0xc9c6c2, 0x0d0d0f];
  const TOP = [0xf2f2ee, 0x1b1d22, 0x2b3a55, 0x6b7280, 0x8a2f2f, 0x3f5b3a, 0xc9b79c, 0x5b4a6b, 0xa65e2e, 0x2f6b78, 0xe8d9b5, 0x7a1f3d, 0x9aa4ae, 0x303030];
  const JACK = [0x1c1e22, 0x2d2a26, 0x3b4252, 0x5a4632, 0x6b5b45, 0x26334a, 0x4a4a48, 0x7b3a24, 0x2f3d2f, 0x8c7a62];
  const PANTS = [0x1f2a44, 0x2b3142, 0x15161a, 0x3a3f4a, 0x4d4337, 0x6b6250, 0x2d3d5c, 0x55504a, 0x3b5a7a];
  const SHOE = [0x111111, 0x2a1c12, 0xf0f0f0, 0x4a3a2a, 0x1b2230, 0x7a7a7a];
  const SCARF = [0x6b2737, 0x2c3e66, 0x3d5a46, 0xb08d57, 0x1d1d22, 0x8a5a7a, 0xa33a2a];

  /* ---------- iskelet (bağlama pozu, mutlak koordinat) ---------- */
  const BONES = [
    ['root', null, 0, 0, 0], ['hips', 'root', 0, .95, 0], ['spine', 'hips', 0, 1.08, 0], ['chest', 'spine', 0, 1.3, 0], ['neck', 'chest', 0, 1.5, 0], ['head', 'neck', 0, 1.6, 0],
    ['uaL', 'chest', .205, 1.43, 0], ['faL', 'uaL', .205, 1.16, 0], ['haL', 'faL', .205, .9, 0],
    ['uaR', 'chest', -.205, 1.43, 0], ['faR', 'uaR', -.205, 1.16, 0], ['haR', 'faR', -.205, .9, 0],
    ['thL', 'hips', .095, .92, 0], ['knL', 'thL', .095, .5, 0], ['ftL', 'knL', .095, .08, 0],
    ['thR', 'hips', -.095, .92, 0], ['knR', 'thR', -.095, .5, 0], ['ftR', 'knR', -.095, .08, 0]];
  const BI = {}; BONES.forEach((b, i) => BI[b[0]] = i);
  const ABS = {}; BONES.forEach(b => ABS[b[0]] = [b[2], b[3], b[4]]);
  const HY = .95;

  /* ---------- paylaşılan geometriler ---------- */
  let G = null;
  function geos() {
    if (G) return G;
    const V2 = (x, y) => new R.Vector2(x, y);
    G = {
      torLoM: new R.LatheGeometry([V2(.001, .84), V2(.16, .845), V2(.172, .93), V2(.16, 1.04), V2(.152, 1.14)], 10),
      torUpM: new R.LatheGeometry([V2(.152, 1.13), V2(.172, 1.24), V2(.19, 1.35), V2(.18, 1.43), V2(.12, 1.49), V2(.04, 1.52)], 10),
      torLoF: new R.LatheGeometry([V2(.001, .84), V2(.168, .845), V2(.18, .93), V2(.145, 1.05), V2(.138, 1.14)], 10),
      torUpF: new R.LatheGeometry([V2(.138, 1.13), V2(.165, 1.25), V2(.172, 1.33), V2(.165, 1.42), V2(.11, 1.48), V2(.04, 1.51)], 10),
      thigh: new R.CylinderGeometry(.088, .066, .43, 9), knee: new R.SphereGeometry(.066, 8, 6), shin: new R.CylinderGeometry(.063, .045, .42, 9),
      shoe: new R.SphereGeometry(.07, 8, 6), ua: new R.CylinderGeometry(.056, .047, .28, 8), elbow: new R.SphereGeometry(.049, 7, 5), fa: new R.CylinderGeometry(.046, .036, .27, 8),
      hand: new R.SphereGeometry(.045, 7, 5), shoulder: new R.SphereGeometry(.074, 8, 6), neck: new R.CylinderGeometry(.048, .056, .13, 8),
      head: new R.SphereGeometry(.105, 14, 11), jaw: new R.SphereGeometry(.08, 10, 7), nose: new R.SphereGeometry(.02, 6, 5), eye: new R.SphereGeometry(.012, 6, 4),
      brow: new R.BoxGeometry(.042, .009, .012), ear: new R.SphereGeometry(.022, 6, 5), lip: new R.BoxGeometry(.04, .009, .01),
      cap: new R.SphereGeometry(.113, 14, 8, 0, Math.PI * 2, 0, Math.PI * .56), hairL: new R.BoxGeometry(.2, .3, .08), bun: new R.SphereGeometry(.052, 8, 6), tail: new R.CylinderGeometry(.03, .018, .22, 6),
      scarf: new R.SphereGeometry(.123, 14, 10, Math.PI / 2 + .95, Math.PI * 2 - 1.9, 0, Math.PI * .7), drape: new R.CylinderGeometry(.085, .18, .2, 12, 1, true),
      visor: new R.BoxGeometry(.16, .015, .1), beard: new R.SphereGeometry(.07, 8, 6), glasses: new R.BoxGeometry(.13, .022, .012),
      coat: new R.CylinderGeometry(.2, .27, .52, 12, 1, true), skirt: new R.CylinderGeometry(.17, .26, .38, 12, 1, true), slv: new R.CylinderGeometry(.062, .058, .13, 8),
      pack: new R.BoxGeometry(.28, .34, .13), bag: new R.BoxGeometry(.25, .2, .08), strap: new R.BoxGeometry(.04, .62, .015), shop: new R.BoxGeometry(.24, .3, .1), phone: new R.BoxGeometry(.045, .085, .012),
      strip: new R.BoxGeometry(.07, .33, .012)
    };
    return G;
  }

  /* ---------- görünüm ---------- */
  function build(opt) {
    const g = geos(), parts = [];
    const fem = Math.random() < .5, elder = Math.random() < .14, sk = pk(SKIN);
    const hair = elder ? pk([0x8e8b88, 0xc9c6c2, 0xa9a6a2, 0x5a3a22]) : pk(HAIR), top = pk(TOP), pants = pk(PANTS), shoe = pk(SHOE);
    const jacket = Math.random() < .45 ? pk(JACK) : 0, coat = jacket && Math.random() < .3, scarf = fem && Math.random() < .22, skirt = fem && !coat && Math.random() < .35;
    const shorts = !fem && !jacket && Math.random() < .12, short = !jacket && Math.random() < .35;
    const P = (b, geo, c, x, y, z, o) => { o = o || {}; parts.push({ b: BI[b], g: geo, c, x, y, z, rx: o.rx || 0, ry: o.ry || 0, rz: o.rz || 0, sx: o.sx || 1, sy: o.sy || 1, sz: o.sz || 1 }); };
    const wide = fem ? .62 : .68;
    // gövde
    const outer = jacket || top;
    P('spine', fem ? g.torLoF : g.torLoM, coat ? jacket : (skirt ? top : pants), 0, 0, 0, { sz: wide });
    P('hips', g.torLoM, pants, 0, -.05, 0, { sx: .97, sy: 1, sz: wide * .98 });
    P('chest', fem ? g.torUpF : g.torUpM, outer, 0, 0, 0, { sz: wide });
    if (jacket) P('chest', g.strip, top, 0, 1.3, (fem ? .172 : .19) * wide + .004);
    for (const sx of [-1, 1]) P('chest', g.shoulder, outer, sx * .195, 1.415, 0, { sz: .9 });
    if (coat) P('hips', g.coat, jacket, 0, .67, 0, { sz: .78 });
    if (skirt) P('hips', g.skirt, Math.random() < .5 ? top : pk(PANTS), 0, .76, 0, { sz: .8 });
    // baş
    P('neck', g.neck, sk, 0, 1.535, 0);
    P('head', g.head, sk, 0, 1.672, 0, { sx: .9, sy: 1.1, sz: 1 }); P('head', g.jaw, sk, 0, 1.61, .022, { sx: .95, sy: .8, sz: 1.05 });
    P('head', g.nose, sk, 0, 1.665, .1, { sx: .8, sy: 1.15, sz: 1.3 });
    for (const sx of [-1, 1]) { P('head', g.eye, 0x1a1512, sx * .035, 1.69, .09); P('head', g.brow, hair, sx * .037, 1.712, .093, { rz: sx * -.12 }); P('head', g.ear, sk, sx * .094, 1.665, 0, { sx: .45, sz: .75 }); }
    P('head', g.lip, (sk & 0xfefefe) >> 1 | 0x402020, 0, 1.617, .094);
    if (scarf) { const sc = pk(SCARF); P('head', g.scarf, sc, 0, 1.672, -.005, { sx: .95, sy: 1.12, sz: 1.05 }); P('neck', g.drape, sc, 0, 1.5, -.01, { sz: .85 }); }
    else {
      const style = elder && !fem && Math.random() < .4 ? 3 : fem ? pk([1, 1, 2, 4, 0]) : pk([0, 0, 0, 5, 3]);
      if (style !== 3 || Math.random() < .6) P('head', g.cap, hair, 0, 1.675, -.01, { sx: .93, sy: style === 3 ? .8 : 1.08, sz: 1.04, rx: -.3 });
      if (style === 1) P('head', g.hairL, hair, 0, 1.58, -.075);
      if (style === 2) P('head', g.bun, hair, 0, 1.77, -.07);
      if (style === 4) P('head', g.tail, hair, 0, 1.62, -.12, { rx: .35 });
      if (style === 5) { const hc = pk([0x1b1d22, 0x8a2f2f, 0x26334a, 0xe8d9b5]); P('head', g.cap, hc, 0, 1.69, -.005, { sx: .96, sy: .9, sz: 1.06, rx: -.15 }); P('head', g.visor, hc, 0, 1.735, .11, { rx: .15 }); }
      if (!fem && !elder && Math.random() < .25) P('head', g.beard, hair, 0, 1.6, .035, { sx: 1.12, sy: .85, sz: .95 });
      if (!fem && elder && Math.random() < .4) P('head', g.beard, hair, 0, 1.6, .035, { sx: 1.1, sy: .8, sz: .9 });
    }
    if (Math.random() < .2) P('head', g.glasses, 0x111111, 0, 1.692, .098);
    // kollar
    for (const s of ['L', 'R']) {
      const x = s === 'L' ? .205 : -.205, sl = short ? sk : outer;
      P('ua' + s, g.ua, sl, x, 1.295, 0); if (short) P('ua' + s, g.slv, outer, x, 1.375, 0);
      P('fa' + s, g.elbow, sl, x, 1.16, 0); P('fa' + s, g.fa, (short || (!jacket && Math.random() < .2)) ? sk : outer, x, 1.03, 0);
      P('ha' + s, g.hand, sk, x, .865, 0, { sx: .8, sy: 1.45, sz: .55 });
    }
    // bacaklar
    const legC = skirt ? (Math.random() < .5 ? sk : 0x1a1a1f) : pants;
    for (const s of ['L', 'R']) {
      const x = s === 'L' ? .095 : -.095;
      P('th' + s, g.thigh, shorts ? pants : legC, x, .71, 0);
      P('kn' + s, g.knee, shorts ? sk : legC, x, .5, 0); P('kn' + s, g.shin, shorts ? sk : legC, x, .29, 0);
      P('ft' + s, g.shoe, shoe, x, .055, .045, { sx: .78, sy: .62, sz: 1.95 });
    }
    // aksesuar
    const acc = Math.random();
    if (acc < .18) P('chest', g.pack, pk([0x1b1d22, 0x2b3a55, 0x6b2737, 0x3f5b3a, 0x4a4a48]), 0, 1.27, -.17);
    else if (acc < .36 && fem) { const bc = pk([0x2a1c12, 0x111111, 0x7a1f3d, 0xb08d57]); P('hips', g.bag, bc, .21, .95, .02); P('chest', g.strap, bc, .02, 1.25, .12 * wide + .01, { rz: .5 }); }
    else if (acc < .46) P('haR', g.shop, pk([0xf2f2ee, 0xd9c7a3, 0x8a2f2f, 0x2f6b78]), -.205, .7, .02);
    const phone = opt.phone;
    if (phone) P('haL', g.phone, 0x0b0b0d, .205, .83, .04);
    return { parts, fem, elder, sc: elder ? rr(.9, .97) : fem ? rr(.93, 1.0) : rr(.98, 1.07) };
  }

  function skinGeo(parts) {
    let nv = 0, ni = 0; parts.forEach(p => { nv += p.g.attributes.position.count; ni += p.g.index ? p.g.index.count : p.g.attributes.position.count; });
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4), I = new Uint32Array(ni);
    const m = new R.Matrix4(), nm = new R.Matrix3(), q = new R.Quaternion(), e = new R.Euler(), s = new R.Vector3(), t = new R.Vector3(), v = new R.Vector3(), col = new R.Color();
    let o = 0, oi = 0;
    for (const p of parts) {
      m.compose(t.set(p.x, p.y, p.z), q.setFromEuler(e.set(p.rx, p.ry, p.rz)), s.set(p.sx, p.sy, p.sz)); nm.getNormalMatrix(m); col.setHex(p.c);
      const pa = p.g.attributes.position, na = p.g.attributes.normal, n = pa.count;
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m); P[(o + i) * 3] = v.x; P[(o + i) * 3 + 1] = v.y; P[(o + i) * 3 + 2] = v.z;
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N[(o + i) * 3] = v.x; N[(o + i) * 3 + 1] = v.y; N[(o + i) * 3 + 2] = v.z;
        C[(o + i) * 3] = col.r; C[(o + i) * 3 + 1] = col.g; C[(o + i) * 3 + 2] = col.b; SI[(o + i) * 4] = p.b; SW[(o + i) * 4] = 1;
      }
      if (p.g.index) { const ix = p.g.index.array; for (let i = 0; i < ix.length; i++) I[oi + i] = ix[i] + o; oi += ix.length; }
      else { for (let i = 0; i < n; i++) I[oi + i] = o + i; oi += n; }
      o += n;
    }
    const bg = new R.BufferGeometry();
    bg.setAttribute('position', new R.BufferAttribute(P, 3)); bg.setAttribute('normal', new R.BufferAttribute(N, 3)); bg.setAttribute('color', new R.BufferAttribute(C, 3));
    bg.setAttribute('skinIndex', new R.Uint16BufferAttribute(SI, 4)); bg.setAttribute('skinWeight', new R.BufferAttribute(SW, 4)); bg.setIndex(new R.BufferAttribute(I, 1));
    bg.computeBoundingSphere(); bg.boundingSphere.radius += .6;
    return bg;
  }

  let pedM = null, umbM = [], umbG = null;
  function makePed(kind) {
    const phone = kind === 'walk' ? Math.random() < .2 : Math.random() < .35;
    const A = build({ phone });
    if (!pedM) {
      pedM = FX.Q === 0 ? new R.MeshLambertMaterial({ vertexColors: true, skinning: true }) : new R.MeshStandardMaterial({ vertexColors: true, roughness: .74, metalness: 0, skinning: true, envMapIntensity: .55 });
      umbG = new R.Group();
      [0x111114, 0x1d2c4f, 0x7a1f2a, 0x2f4f3a, 0x5a5a60].forEach(c => umbM.push(FX.Q === 0 ? new R.MeshLambertMaterial({ color: c, side: R.DoubleSide }) : new R.MeshStandardMaterial({ color: c, roughness: .45, side: R.DoubleSide })));
    }
    const mesh = new R.SkinnedMesh(skinGeo(A.parts), pedM), bones = {}, list = [];
    for (const [n, par, x, y, z] of BONES) { const b = new R.Bone(); b.name = n; const pa = par ? ABS[par] : [0, 0, 0]; b.position.set(x - pa[0], y - pa[1], z - pa[2]); bones[n] = b; list.push(b); if (par) bones[par].add(b); }
    mesh.add(bones.root); mesh.updateMatrixWorld(true); mesh.bind(new R.Skeleton(list));
    mesh.castShadow = true; mesh.receiveShadow = false;
    const grp = new R.Group(); grp.add(mesh); grp.rotation.order = 'YXZ'; grp.scale.setScalar(A.sc);
    const p = { kind, m: grp, mesh, B: bones, fem: A.fem, elder: A.elder, phone, x: 0, z: 0, y: .3, yaw: 0, ko: 0, kof: 0, vx: 0, vz: 0,
      cx: 0, cz: 0, s: 0, dir: 1, lat: 0, latT: 0, base: rr(-.35, .55), sp: A.elder ? rr(.8, 1.05) : rr(1.15, 1.6), v: 0, ph: rr(0, 6.28), st: kind, tSt: 0,
      look: null, lookT: 0, headY: 0, react: null, rt: 0, idle: (Math.random() * 3) | 0, seed: Math.random() * 100, umb: null, umbOn: Math.random() < .6, talkAmp: 0 };
    // şemsiye (göğüs kemiğine bağlı, yalnız yağmurda görünür)
    const u = new R.Group(), um = pk(umbM);
    const cn = new R.Mesh(new R.ConeGeometry(.56, .24, 10, 1, true), um); cn.position.set(-.1, .84, .2); u.add(cn);
    const sh = new R.Mesh(new R.CylinderGeometry(.011, .011, .95, 5), umbM[0]); sh.position.set(-.1, .38, .22); u.add(sh);
    u.visible = false; bones.chest.add(u); p.umb = u;
    return p;
  }

  /* ---------- kaldırım geometrisi ---------- */
  /* o verilirse sonuç o nesneye yazılır (her karede yeni nesne yok → bellek çöpü/kasılma azalır) */
  function perim(cx, cz, s, lat, o) {
    s = ((s % PER) + PER) % PER; const sd = (s / 38) | 0, t = s % 38 - 19, r = RING + lat; o = o || {}; o.sd = sd; o.t = t;
    if (sd === 0) { o.x = cx + t; o.z = cz - r; o.dx = 1; o.dz = 0; o.nx = 0; o.nz = -1; }
    else if (sd === 1) { o.x = cx + r; o.z = cz + t; o.dx = 0; o.dz = 1; o.nx = 1; o.nz = 0; }
    else if (sd === 2) { o.x = cx - t; o.z = cz + r; o.dx = -1; o.dz = 0; o.nx = 0; o.nz = 1; }
    else { o.x = cx - r; o.z = cz - t; o.dx = 0; o.dz = -1; o.nx = -1; o.nz = 0; }
    return o;
  }
  const PA = {}, PB = {}, PC = {}, CWS = [-CW, CW];   // walkStep'in tekrar kullanılan geçici nesneleri
  PE.perim = perim;
  const NB = [[0, -54], [54, 0], [0, 54], [-54, 0]];
  const blockOK = (cx, cz) => Math.abs(cx) <= 270 && Math.abs(cz) <= 270;
  const nearC = v => { let b = C[0]; for (const k of C) if (Math.abs(k - v) < Math.abs(b - v)) b = k; return b; };

  /* ---------- sokak mobilyası: bank + otobüs durağı ---------- */
  const FURN = {}, BENCH = [], STOP = [];
  function furniture(scene, rects) {
    const VE = window.VEH, P = [], hs = (i, j, k) => { const x = Math.sin(i * 12.9898 + j * 78.233 + k * 37.719) * 43758.5453; return x - Math.floor(x); };
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) for (let sd = 0; sd < 4; sd++) {
      const cx = i * 54, cz = j * 54, [ox, oz] = NB[sd]; if (!blockOK(cx + ox, cz + oz) && hs(i, j, sd + 9) > .3) continue;
      const h = hs(i, j, sd);
      if (h < .17) FURN[cx + ',' + cz + ',' + sd] = 'b'; else if (h < .27) FURN[cx + ',' + cz + ',' + sd] = 's';
    }
    const bm = [], sm = [];
    for (const k in FURN) {
      const [cx, cz, sd] = k.split(',').map(Number), f = FURN[k];
      const q = perim(cx, cz, sd * 38 + 19, f === 'b' ? -.62 : .62), yaw = Math.atan2(q.nx, q.nz);
      if (f === 'b') { bm.push([q.x, q.z, yaw]); for (const o of [-.42, .42]) BENCH.push({ x: q.x + q.dx * o + q.nx * .12, z: q.z + q.dz * o + q.nz * .12, yaw, occ: null }); rects.push([q.x, q.z, q.dx ? .9 : .3, q.dx ? .3 : .9]); }
      else { sm.push([q.x, q.z, yaw]); for (const o of [-.9, 0, .9]) STOP.push({ x: q.x + q.dx * o - q.nx * .05, z: q.z + q.dz * o - q.nz * .05, yaw, occ: null, sd: q }); rects.push([q.x, q.z, q.dx ? 1.65 : .62, q.dx ? .62 : 1.65]); }
    }
    const MX = VE.MX, seg = [];
    // bank (arkalık binaya dönük, oturan yola bakar)
    const wood = 0x7a5232, iron = 0x26272b;
    for (let i = 0; i < 4; i++) seg.push({ g: new R.BoxGeometry(1.8, .035, .1), c: wood, mx: MX(0, .45, -.18 + i * .12) });
    for (let i = 0; i < 3; i++) seg.push({ g: new R.BoxGeometry(1.8, .09, .03), c: wood, mx: MX(0, .62 + i * .13, -.27, -.15) });
    for (const x of [-.75, .75]) { seg.push({ g: new R.BoxGeometry(.05, .45, .05), c: iron, mx: MX(x, .225, .14) }); seg.push({ g: new R.BoxGeometry(.05, .85, .05), c: iron, mx: MX(x, .43, -.25) }); seg.push({ g: new R.BoxGeometry(.05, .04, .5), c: iron, mx: MX(x, .43, -.05) }); }
    const bG = VE.mergeCol(seg), mm = FX.Q === 0 ? new R.MeshLambertMaterial({ vertexColors: true }) : new R.MeshStandardMaterial({ vertexColors: true, roughness: .7 });
    const inst = (geo, mat, arr, y) => { const im = new R.InstancedMesh(geo, mat, Math.max(1, arr.length)), o = new R.Object3D(); arr.forEach((a, i) => { o.position.set(a[0], y || .3, a[1]); o.rotation.set(0, a[2], 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.count = arr.length; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im; };
    inst(bG, mm, bm);
    // durak: çelik çerçeve, cam arka/yan, çatı, ışıklı reklam panosu
    const st = [], steel = 0x5b6168;
    for (const x of [-1.55, 1.55]) for (const z of [-.5, .5]) st.push({ g: new R.BoxGeometry(.07, 2.5, .07), c: steel, mx: MX(x, 1.25, z) });
    st.push({ g: new R.BoxGeometry(3.4, .08, 1.3), c: 0x3a3f45, mx: MX(0, 2.52, 0) });
    st.push({ g: new R.BoxGeometry(3, .06, .32), c: 0x7a6040, mx: MX(0, .48, -.38) });
    st.push({ g: new R.BoxGeometry(.06, .45, .06), c: steel, mx: MX(-1.2, .23, -.38) }); st.push({ g: new R.BoxGeometry(.06, .45, .06), c: steel, mx: MX(1.2, .23, -.38) });
    st.push({ g: new R.BoxGeometry(.6, .18, .02), c: 0x1d4ea8, mx: MX(-1.2, 2.3, .55) });
    const sG = VE.mergeCol(st); inst(sG, mm, sm);
    const gl = FX.Q === 0 ? new R.MeshLambertMaterial({ color: 0x9fb5c0, transparent: true, opacity: .25 }) : new R.MeshStandardMaterial({ color: 0xa8c0cc, roughness: .05, metalness: 0, transparent: true, opacity: .22, envMapIntensity: 1.5, depthWrite: false });
    const gG = VE.mergeCol([{ g: new R.BoxGeometry(3.1, 2.2, .02), c: 0xffffff, mx: MX(0, 1.3, -.55) }]); inst(gG, gl, sm);
    PE.adM = new R.MeshBasicMaterial({ color: 0xffffff });
    {
      const c = FX.cv(64, 128), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#f2efe6'); g.addColorStop(1, '#d8d2c2'); x.fillStyle = g; x.fillRect(0, 0, 64, 128);
      x.fillStyle = '#c62828'; x.fillRect(6, 10, 52, 30); x.fillStyle = '#20242a'; x.fillRect(6, 48, 52, 6); x.fillRect(6, 60, 38, 6); x.fillStyle = '#2e7d32'; x.beginPath(); x.arc(32, 98, 18, 0, 7); x.fill();
      PE.adM.map = new R.CanvasTexture(c);
    }
    inst(new R.BoxGeometry(.06, 1.8, 1.1).translate(1.62, 1.2, 0), PE.adM, sm).castShadow = false;
  }

  /* ---------- oluşturma ---------- */
  const GROUPS = [];
  let N0 = 0;
  PE.build = function (scene, peds, rects) {
    furniture(scene, rects);
    const n = [40, 80, 115, 145][FX.q] || 80;
    const nW = Math.round(n * .62), nT = Math.round(n * .18), nS = Math.round(n * .09), nB = n - nW - nT - nS;
    for (let i = 0; i < nW; i++) peds.push(makePed('walk'));
    for (let i = 0; i < nT;) { const k = Math.min(nT - i, Math.random() < .55 ? 2 : 3); const gr = { members: [], x: 0, z: 0, sp: 0, tN: 0 }; for (let j = 0; j < k; j++) { const p = makePed('talk'); p.grp = gr; gr.members.push(p); peds.push(p); } GROUPS.push(gr); i += k; }
    for (let i = 0; i < nS; i++) peds.push(makePed('sit'));
    for (let i = 0; i < nB; i++) peds.push(makePed('stop'));
    peds.forEach(p => scene.add(p.m)); PE.list = peds.slice(); N0 = peds.length;
    PE.reset(peds, true);
  };
  PE.reset = function (peds, any) { GROUPS.forEach(g => g.placed = false); BENCH.forEach(b => b.occ = null); STOP.forEach(b => b.occ = null); peds.forEach(p => place(p, any)); };

  /* ---------- konumlandırma ---------- */
  const camDir = new R.Vector3();
  function okSpot(x, z, any) {
    const d = Math.hypot(x - car.x, z - car.z); if (d > 112) return false; if (any) return true;
    if (d < 22) return false;
    if (typeof cam === 'undefined') return d > 60;
    cam.getWorldDirection(camDir); const front = (x - cam.position.x) * camDir.x + (z - cam.position.z) * camDir.z;
    return front < 0 || d > 72;
  }
  function randomBlock() { const bi = cl(Math.round(car.x / 54) + ((Math.random() * 5) | 0) - 2, -5, 5), bj = cl(Math.round(car.z / 54) + ((Math.random() * 5) | 0) - 2, -5, 5); return [bi * 54, bj * 54]; }
  function place(p, any) {
    p.ko = 0; p.kof = 0; p.react = null; p.m.rotation.x = 0; leaveCross(p);
    if (p.kind === 'walk') {
      for (let k = 0; k < 30; k++) {
        const [cx, cz] = randomBlock(), s = Math.random() * PER, q = perim(cx, cz, s, p.base);
        if (k < 29 && !okSpot(q.x, q.z, any)) continue;
        Object.assign(p, { cx, cz, s, dir: Math.random() < .5 ? -1 : 1, lat: p.base, latT: p.base, st: 'walk', v: p.sp, x: q.x, z: q.z, yaw: Math.atan2(q.dx, q.dz) }); break;
      }
    } else if (p.kind === 'talk') {
      const g = p.grp;
      if (!g.placed) {
        for (let k = 0; k < 30; k++) {
          const [cx, cz] = randomBlock(), sd = (Math.random() * 4) | 0, t = rr(3, 15) * (Math.random() < .5 ? -1 : 1), q = perim(cx, cz, sd * 38 + 19 + t, .2);
          if (Math.abs(Math.abs(t) - 9) < 1.2 || (k < 29 && !okSpot(q.x, q.z, any))) continue;
          if (k < 29 && GROUPS.some(o => o !== g && o.placed && Math.hypot(o.x - q.x, o.z - q.z) < 3)) continue;   // iki sohbet grubu üst üste konmasın
          g.x = q.x; g.z = q.z; g.q = q; break;
        }
        g.placed = true; g.sp = 0; g.tN = 0;
        g.members.forEach((m, i) => { const a = i / g.members.length * Math.PI * 2 + Math.random() * .4, r = g.members.length === 2 ? .42 : .52; m.x = g.x + Math.cos(a) * r; m.z = g.z + Math.sin(a) * r; m.yaw = Math.atan2(g.x - m.x, g.z - m.z); m.st = 'talk'; m.lookT = 0; });
      }
    } else {
      const arr = p.kind === 'sit' ? BENCH : STOP;
      if (p.slot) { if (p.slot.occ === p) p.slot.occ = null; p.slot = null; }   // yalnızca kendi yerini boşalt (başkasının yerini silip iki kişiyi üst üste koyuyordu)
      let best = null;
      for (let k = 0; k < 40; k++) { const b = arr[(Math.random() * arr.length) | 0]; if (!b || b.occ) continue; if (okSpot(b.x, b.z, any)) { best = b; break; } }
      if (!best) { p.st = 'hide'; p.m.visible = false; return; }
      best.occ = p; p.slot = best; p.x = best.x; p.z = best.z; p.yaw = best.yaw + (p.kind === 'stop' ? rr(-.4, .4) : 0); p.st = p.kind;
    }
  }

  /* ---------- yaya geçidi ---------- */
  function leaveCross(p) { const i = PE.cross.indexOf(p); if (i >= 0) PE.cross.splice(i, 1); }
  function crossInfo(p, q) {
    const [ox, oz] = NB[q.sd], ncx = p.cx + ox, ncz = p.cz + oz; if (!blockOK(ncx, ncz)) return null;
    const t2 = -q.t, s2 = ((q.sd + 2) % 4) * 38 + t2 + 19, a = perim(p.cx, p.cz, q.sd * 38 + q.t + 19, 1.05), b = perim(ncx, ncz, s2, 1.05);
    const ax = (q.sd === 1 || q.sd === 3) ? 0 : 1;           // geçilen yoldaki araçların ekseni
    const road = ax === 0 ? (p.cx + ox / 2) : (p.cz + oz / 2);
    const iX = ax === 0 ? road : nearC(a.x), iZ = ax === 0 ? nearC(a.z) : road;
    return { ncx, ncz, s2, x0: a.x, z0: a.z, x1: b.x, z1: b.z, ax, road, sig: typeof isLit === 'function' ? isLit(iX, iZ) : iX === 27, mx: (a.x + b.x) / 2, mz: (a.z + b.z) / 2, iX, iZ };
  }
  function safeToCross(k) {
    if (k.sig && light(k.ax, k.iX, k.iZ) !== 'r') return false;
    // ışıklıda da yakındaki araca bak (sarıda girip geçmekte olan araç olabilir)
    const lim = k.sig ? 14 : 32;
    for (const c of ais) {
      if (!c.on || c.ax !== k.ax || Math.abs(c.rc - k.road) > 1) continue;
      const along = k.ax === 0 ? (k.mz - c.z) * c.dir : (k.mx - c.x) * c.dir;
      if (along > -4 && along < lim && c.v > .8) return false;
      if (Math.abs(along) < 4) return false;
    }
    const dx = k.mx - car.x, dz = k.mz - car.z, d = Math.hypot(dx, dz);
    if (d < 34 && Math.abs(car.v) > 2 && (dx * Math.sin(car.a) + dz * Math.cos(car.a)) * Math.sign(car.v) > -3) return false;
    return true;
  }

  /* ---------- güncelleme ---------- */
  let lastHorn = 0, CUR = [];
  /* kalabalık: önündeki yayaya çarpmamak için ya onu takip et (aynı yöne benzer hızda yürüyorsa) ya da yana kay */
  const SEEN = new Set(), CRO = { fv: null, lat: null, blk: false };   // her karede yeniden oluşturulmaz (bellek çöpü → kasılma)
  function crowd(p, q) {
    const hx = q.dx * p.dir, hz = q.dz * p.dir; let fv = null, lat = null, blk = false; const seen = SEEN; seen.clear();
    for (const o of CUR) {
      if (o === p || o.st === 'hide' || o.ko > 0 || o.st === 'cross') continue;
      // sohbet grubu tek engel sayılır (merkez + yarıçap); tek tek üyeler arasından geçmeye çalışmaz
      let ox = o.x, oz = o.z, hw = .3, g = o.st === 'talk' && o.grp;
      if (g) { if (seen.has(g)) continue; seen.add(g); ox = g.x; oz = g.z; let r = 0; for (const m of g.members) r = Math.max(r, Math.hypot(m.x - g.x, m.z - g.z)); hw = r + .3; }
      const dx = ox - p.x, dz = oz - p.z; if (Math.abs(dx) > 3.5 || Math.abs(dz) > 3.5) continue;
      const f = dx * hx + dz * hz, l = dx * q.nx + dz * q.nz;
      if (f <= -(hw + .5) || f > 2.4 + hw || Math.abs(l) > hw + .3) continue;   // yan yanayken de kaçınmayı sürdür
      const same = !g && o.st === 'walk' && o.dir === p.dir && o.cx === p.cx && o.cz === p.cz;
      if (same) {
        // tam yan yana/iç içe: yalnızca biri (seed'i küçük olan) yavaşlayıp geride kalır, diğeri onu yok sayar → kilitlenme olmaz
        if (Math.abs(f) < .45) { if ((p.seed || 0) < (o.seed || 0)) fv = fv === null ? .25 : Math.min(fv, .25); continue; }
        if (f > 0 && f < 1.4) fv = fv === null ? Math.min(o.v, p.v) : Math.min(fv, o.v);   // aynı yöne: sollama yok, takip et
        continue;
      }
      const up = cl(p.lat + l + hw + .3, -.6, 1.3), dn = cl(p.lat + l - hw - .3, -.6, 1.3), c0 = p.lat + l;   // engelin iki yanı
      const okU = up - c0 >= hw + .25, okD = c0 - dn >= hw + .25;
      let want = null; if (okU && okD) want = Math.abs(up - p.lat) < Math.abs(dn - p.lat) ? up : dn; else if (okU) want = up; else if (okD) want = dn;
      if (want === null) { if (f < hw + 1) { fv = fv === null ? 0 : Math.min(fv, 0); blk = true; } }   // geçecek yer yok
      else if (lat === null || Math.abs(want - p.lat) < Math.abs(lat - p.lat)) lat = want;
    }
    CRO.fv = fv; CRO.lat = lat; CRO.blk = blk; return CRO;
  }
  PE.update = function (peds, dt, now) {
    CUR = peds;
    const t = now / 1000, horn = (typeof hn !== 'undefined' && hn) ? 1 : 0, cs = Math.abs(car.v), fx = Math.sin(car.a), fz = Math.cos(car.a);
    const rain = FX.weather === 'rain';
    const hornNew = horn && !lastHorn; lastHorn = horn;
    for (const gr of GROUPS) gr.done = false;
    for (const p of peds) {
      if (p.st === 'hide') { if (Math.random() < dt * .5) place(p, false); continue; }
      const dx = p.x - car.x, dz = p.z - car.z, d = Math.hypot(dx, dz);
      // uzaklaşanları oyuncunun çevresine taşı
      if (d > 125 && p.ko <= 0 && p.st !== 'cross') {
        if (p.kind === 'talk') { if (!p.grp.done) { p.grp.placed = false; p.grp.done = true; p.grp.members.forEach(m => place(m, false)); } }
        else place(p, false);
        continue;
      }
      const vis = d < 95; p.m.visible = vis;
      // tepkiler
      if (p.ko <= 0) {
        if (hornNew && d < 30) { p.look = 'car'; p.lookT = 2.5; if (Math.random() < .3 && p.st !== 'sit') { p.react = 'fist'; p.rt = 1.8; } }
        if (cs > 6 && d < 13) { p.look = 'car'; p.lookT = Math.max(p.lookT, 1.2);
          const fd = -(dx * fx + dz * fz) * Math.sign(car.v) * -1, ld = Math.abs(dx * fz - dz * fx);
          if (fd > 0 && fd < cs * 1.1 + 2 && ld < 2.6 && p.react !== 'jump' && p.st !== 'sit') { p.react = 'jump'; p.rt = .9; const sgn = (dx * fz - dz * fx) > 0 ? 1 : -1; p.jx = fz * sgn * 3.2; p.jz = -fx * sgn * 3.2; }
        }
      }
      if (p.lookT > 0) p.lookT -= dt; else if (p.look === 'car') p.look = null;
      if (p.rt > 0) { p.rt -= dt; if (p.rt <= 0) p.react = null; }
      // durumlar
      if (p.ko > 0) koStep(p, dt);
      else if (p.st === 'walk') walkStep(p, dt, t, rain);
      else if (p.st === 'wait') waitStep(p, dt, t);
      else if (p.st === 'cross') crossStep(p, dt, t);
      else if (p.st === 'stand') { p.tSt -= dt; p.v = Math.max(0, p.v - dt * 3); if (p.tSt <= 0) { p.st = 'walk'; } }
      else if (p.st === 'talk') talkStep(p, dt, t);
      if (p.react === 'jump' && p.ko <= 0) {
        const k = Math.min(1, p.rt * 2);
        if (p.st === 'walk' || p.st === 'stand') {   // kaldırımda: yan adım (şerit koordinatına çevrilir), kısa duraksama
          const q = perim(p.cx, p.cz, p.s, p.lat); p.s += (p.jx * q.dx + p.jz * q.dz) * dt * k * .4; p.lat = cl(p.lat + (p.jx * q.nx + p.jz * q.nz) * dt * k, -.6, 1.3);
          const q2 = perim(p.cx, p.cz, p.s, p.lat); p.x = q2.x; p.z = q2.z; if (p.st === 'walk') { p.st = 'stand'; p.tSt = 1.2; p.look = 'car'; p.lookT = 1.5; }
        } else if (p.st !== 'cross') { p.x += p.jx * dt * k * .5; p.z += p.jz * dt * k * .5; }
      }
      // yerleştir + canlandır
      p.m.position.set(p.x, p.y, p.z); p.m.rotation.y = p.yaw;
      if (p.umb) p.umb.visible = rain && p.umbOn && p.ko <= 0 && p.st !== 'sit' && vis;
      if (vis) animate(p, dt, t, rain);
    }
  };

  function walkStep(p, dt, t, rain) {
    const cr = crowd(p, perim(p.cx, p.cz, p.s, p.lat, PA));
    if (cr.blk) { p.blkT = (p.blkT || 0) + dt; if (p.blkT > 1.5) { p.dir = -p.dir; p.blkT = 0; } } else p.blkT = 0;   // yol kapalıysa geri dön
    let sp = p.sp * (rain ? 1.15 : 1) * (p.phone && p.st === 'walk' ? .85 : 1);
    if (cr.fv !== null) sp = Math.min(sp, cr.fv);
    p.v += (sp - p.v) * Math.min(1, dt * (cr.fv !== null ? 4 : 2));
    const s0 = p.s; p.s += p.dir * p.v * dt;
    // mobilya çevresinde şerit değiştir
    if (p.fkB !== p.cx * 1e4 + p.cz) { p.fkB = p.cx * 1e4 + p.cz; p.fk = [0, 1, 2, 3].map(sd => p.cx + ',' + p.cz + ',' + sd); }   // mobilya anahtarı blok değişince bir kez kurulur
    const q0 = perim(p.cx, p.cz, p.s, p.lat, PB), f = FURN[p.fk[q0.sd]];
    let lt = p.base * (p.dir > 0 ? 1 : .6) + (p.dir > 0 ? .1 : -.15);
    if (f && Math.abs(q0.t) < 2.4) lt = f === 'b' ? Math.max(lt, .3) : Math.min(lt, -.38);
    if (cr.lat !== null) lt = cr.lat;
    p.latT = lt; p.lat += (p.latT - p.lat) * Math.min(1, dt * (cr.lat !== null ? 3.5 : 1.5));
    const q = perim(p.cx, p.cz, p.s, p.lat, PC); p.x = q.x; p.z = q.z; p.y += (.3 - p.y) * Math.min(1, dt * 8);
    p.yaw += wrapA(Math.atan2(q.dx * p.dir, q.dz * p.dir) - p.yaw) * Math.min(1, dt * 5);
    p.ph += p.v / 1.38 * Math.PI * 2 * dt;
    // yaya geçidine geldi mi?
    const sd0 = (((s0 % PER) + PER) % PER / 38) | 0, t0 = ((s0 % PER) + PER) % PER % 38 - 19;
    if (sd0 === q.sd) for (const cwt of CWS) if ((t0 - cwt) * (q.t - cwt) < 0 && Math.random() < .22) {
      const k = crossInfo(p, { sd: q.sd, t: cwt }); if (!k) break;
      // aynı geçitte bekleyen/geçenler varsa yan yana dur (üst üste değil)
      let n = 0; for (const o of CUR) if (o !== p && (o.st === 'wait' || o.st === 'cross') && o.ck && Math.abs(o.ck.x0 - k.x0) + Math.abs(o.ck.z0 - k.z0) < .6) n++;
      p.cOff = [0, .55, -.55, 1.1, -1.1][n % 5];
      p.ck = k; p.st = 'wait'; p.tSt = 0; p.wx0 = p.x; p.wz0 = p.z; return;
    }
    if (Math.random() < dt * .012) { p.st = 'stand'; p.tSt = rr(2, 6); p.look = 'shop'; p.lookT = p.tSt; }
  }
  function waitStep(p, dt, t) {
    const k = p.ck; p.tSt += dt; p.v = Math.max(0, p.v - dt * 3);
    // kaldırım kenarına yürü
    const pr = cPerp(k), off = p.cOff || 0;
    const tx = k.x0 + pr[0] * off, tz = k.z0 + pr[1] * off, ddx = tx - p.x, ddz = tz - p.z, dd = Math.hypot(ddx, ddz);
    if (dd > .05) { const st = Math.min(dd, 1.2 * dt); p.x += ddx / dd * st; p.z += ddz / dd * st; p.ph += 1.2 / 1.38 * Math.PI * 2 * dt; p.v = 1.1; }
    p.yaw += wrapA(Math.atan2(k.x1 - k.x0, k.z1 - k.z0) - p.yaw) * Math.min(1, dt * 4);
    p.look = 'road'; p.lookT = .2;
    if (p.tSt > 1 && safeToCross(k)) { p.st = 'cross'; p.cd = 0; p.clen = Math.hypot(k.x1 - k.x0, k.z1 - k.z0); PE.cross.push(p); return; }
    if (p.tSt > 45) { p.st = 'walk'; p.dir = -p.dir; }
  }
  /* geçit çizgisine dik birim vektör: yürüme yönünün sağı (karşıdan gelen için ters taraf) */
  function cPerp(k) { const dx = k.x1 - k.x0, dz = k.z1 - k.z0, l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; }
  function crossStep(p, dt, t) {
    const k = p.ck;
    let run = 0; const dx = p.x - car.x, dz = p.z - car.z, d = Math.hypot(dx, dz);
    if (d < 22 && Math.abs(car.v) > 4) run = 1;
    for (const c of ais) { if (c.on && c.v > 3 && Math.abs(c.x - p.x) + Math.abs(c.z - p.z) < 16) { run = Math.max(run, .6); break; } }
    const sp = p.sp * 1.1 + run * 1.9; p.v += (sp - p.v) * Math.min(1, dt * 3);
    p.cd += p.v * dt; const u = Math.min(1, p.cd / p.clen);
    // geçitte sağdan yürü (karşıdan gelenle çarpışmasın) + bekleme sırasındaki yan kayma
    const pr = cPerp(k), off = (p.cOff || 0) + .4 * Math.min(1, u * 5, (1 - u) * 5);
    p.x = k.x0 + (k.x1 - k.x0) * u + pr[0] * off; p.z = k.z0 + (k.z1 - k.z0) * u + pr[1] * off;
    const onRoad = p.cd > .4 && p.clen - p.cd > .4; p.y += ((onRoad ? .03 : .3) - p.y) * Math.min(1, dt * 14);
    p.yaw += wrapA(Math.atan2(k.x1 - k.x0, k.z1 - k.z0) - p.yaw) * Math.min(1, dt * 6);
    p.ph += p.v / (1.38 + run * .7) * Math.PI * 2 * dt; p.run = run;
    if (run && d < 25) { p.look = 'car'; p.lookT = .3; }
    if (u >= 1) { leaveCross(p); p.cx = k.ncx; p.cz = k.ncz; p.s = k.s2; p.lat = 1.05; p.st = 'walk'; p.run = 0; }
  }
  function talkStep(p, dt, t) {
    const g = p.grp; if (!g) return;
    if (g.members[0] === p) { g.tN -= dt; if (g.tN <= 0) { g.sp = (g.sp + 1 + ((Math.random() * (g.members.length - 1)) | 0)) % g.members.length; g.tN = rr(2.5, 6); } }
    p.talkAmp += ((g.members[g.sp] === p ? 1 : 0) - p.talkAmp) * Math.min(1, dt * 3);
    if (!p.look || p.look === 'spk') { p.look = 'spk'; p.lookT = 1; p.lx = g.members[g.sp] === p ? g.x : g.members[g.sp].x; p.lz = g.members[g.sp] === p ? g.z : g.members[g.sp].z; }
  }
  function koStep(p, dt) {
    if (p.kof === 0) leaveCross(p);
    p.ko -= dt; p.x += p.vx * dt; p.z += p.vz * dt; p.vx *= Math.pow(.05, dt); p.vz *= Math.pow(.05, dt);
    const target = p.ko > 1.2 ? 1 : 0; p.kof += (target - p.kof) * Math.min(1, dt * (target ? 7 : 2.2));
    p.m.rotation.x = -Math.PI / 2 * p.kof; p.y += ((p.st === 'cross' ? .03 : .3) + .12 * p.kof - p.y) * Math.min(1, dt * 10);
    if (p.ko <= 0) { p.ko = 0; p.kof = 0; p.m.rotation.x = 0; if (p.st === 'cross') PE.cross.push(p); if (p.kind === 'sit' || p.kind === 'stop' || p.kind === 'talk') place(p, false); }
  }

  /* ---------- poz ---------- */
  function animate(p, dt, t, rain) {
    const B = p.B, run = p.run || 0;
    // bacak/kol kemikleri yaya başına bir kez bulunur (eskiden her karede 'th' + L gibi metin birleştirilip aranıyordu → bellek çöpü)
    const LG = p.LG || (p.LG = ['L', 'R'].map(L => ({ th: B['th' + L], kn: B['kn' + L], ft: B['ft' + L], ua: B['ua' + L], fa: B['fa' + L] })));
    for (const k in B) B[k].rotation.set(0, 0, 0);
    B.hips.position.set(0, HY, 0);
    const moving = (p.st === 'walk' || p.st === 'cross' || (p.st === 'wait' && p.v > .5)) && p.ko <= 0;
    const old = p.elder ? 1 : 0, umb = p.umb && p.umb.visible;
    if (p.ko > 0) {
      const f = p.kof; B.uaL.rotation.z = 1.3 * f; B.uaR.rotation.z = -1.3 * f; B.thL.rotation.z = .18 * f; B.thR.rotation.z = -.18 * f; B.knL.rotation.x = .25 * f; B.head.rotation.y = .4 * f;
      return;
    }
    if (moving) {
      const ph = p.ph, s = Math.sin(ph), A = (.4 + .32 * run) * (old ? .7 : 1) * cl(p.v / 1.3, .4, 1.4);
      for (let k = 0; k < 2; k++) {
        const sk = Math.sin(ph + k * Math.PI), ck = Math.cos(ph + k * Math.PI), sg = k ? -1 : 1, g = LG[k];
        const hip = -A * sk - .05, knee = .1 + (.7 + .6 * run) * Math.pow(Math.max(0, ck), 1.3) + (run ? .3 : 0);
        g.th.rotation.x = hip; g.kn.rotation.x = knee; g.ft.rotation.x = -hip * .3 - knee * .4 + Math.max(0, -ck) * .12;
        g.ua.rotation.x = A * .8 * sk; g.ua.rotation.z = sg * (.06 + run * .08);
        g.fa.rotation.x = -(.2 + Math.max(0, -sk) * .35 * A + run * 1.1);
      }
      B.hips.position.y = HY - .012 - run * .04 + (.02 + run * .03) * Math.cos(2 * ph);
      B.hips.rotation.y = .09 * s; B.hips.rotation.z = .03 * Math.cos(2 * ph + .5);
      B.spine.rotation.x = .04 + run * .2 + old * .16; B.chest.rotation.y = -.13 * s; B.head.rotation.y = .04 * s; B.head.rotation.x = -.02 - old * .1;
      if (p.phone && !run && !umb) { B.uaL.rotation.x = -.25; B.faL.rotation.x = -1.3; B.faL.rotation.y = -.25; B.head.rotation.x = .42; }
    } else if (p.st === 'sit') {
      B.hips.position.set(0, .47, -.08);
      for (let k = 0; k < 2; k++) { const g = LG[k]; g.th.rotation.x = -1.48; g.kn.rotation.x = 1.42 + (k === 0 ? .08 : -.05); g.ft.rotation.x = .06; }
      B.thL.rotation.z = .07; B.thR.rotation.z = -.07; B.spine.rotation.x = -.06; B.chest.rotation.x = .05 + Math.sin(t * 1.4 + p.seed) * .012;
      if (p.phone) { B.uaL.rotation.x = -.3; B.faL.rotation.x = -1.35; B.uaR.rotation.x = -.3; B.faR.rotation.x = -1.3; B.faR.rotation.y = .3; B.faL.rotation.y = -.3; B.head.rotation.x = .45; }
      else { B.uaL.rotation.x = -.38; B.faL.rotation.x = -.75; B.uaR.rotation.x = -.38; B.faR.rotation.x = -.75; idleHead(p, t); }
    } else {
      // ayakta: nefes, ağırlık aktarımı
      const br = Math.sin(t * 1.5 + p.seed) * .014, sw = Math.sin(t * .35 + p.seed);
      B.chest.rotation.x = br; B.hips.rotation.z = .025 * sw; B.hips.position.x = .02 * sw;
      B[sw > 0 ? 'knR' : 'knL'].rotation.x = .1; B[sw > 0 ? 'thR' : 'thL'].rotation.x = -.04;
      B.uaL.rotation.z = .07; B.uaR.rotation.z = -.07; B.faL.rotation.x = -.14; B.faR.rotation.x = -.14;
      B.spine.rotation.x = old * .14;
      if (p.st === 'talk') {
        const a = p.talkAmp, g1 = Math.sin(t * 3.1 + p.seed), g2 = Math.sin(t * 4.3 + p.seed * 2);
        B.uaR.rotation.x = -.35 * a + .2 * g1 * a; B.faR.rotation.x = -.14 - (1.0 + .35 * g2) * a; B.uaR.rotation.z = -.07 - .2 * a; B.faR.rotation.y = .4 * a;
        if (g2 > .3) { B.uaL.rotation.x = -.2 * a; B.faL.rotation.x = -.14 - .9 * a * (g2 - .3); }
        B.head.rotation.x = .05 * Math.sin(t * (a > .5 ? 5 : 1.6) + p.seed) * (a > .5 ? 1 : .6);
        B.chest.rotation.y = .06 * g1 * a;
        if (p.phone && a < .3 && p.idle === 2) { B.uaL.rotation.x = -.45; B.uaL.rotation.z = -.15; B.faL.rotation.x = -1.7; B.faL.rotation.y = -.9; B.uaR.rotation.x = -.45; B.uaR.rotation.z = .15; B.faR.rotation.x = -1.7; B.faR.rotation.y = .9; }
      } else if (p.st === 'stop' || p.st === 'wait') {
        const ph = (t * .13 + p.seed) % 3;
        if (p.phone && p.st === 'stop') { B.uaL.rotation.x = -.25; B.faL.rotation.x = -1.35; B.head.rotation.x = .45; B.uaR.rotation.x = -.2; B.faR.rotation.x = -1.2; B.faR.rotation.y = .3; }
        else if (ph < .5) { B.uaL.rotation.x = -.55; B.uaL.rotation.z = -.15; B.faL.rotation.x = -1.6; B.faL.rotation.y = -.5; B.head.rotation.x = .38; B.head.rotation.y = .25; }
        else if (p.idle === 1) { B.uaL.rotation.x = .1; B.uaL.rotation.z = .16; B.faL.rotation.x = -.45; B.uaR.rotation.x = .1; B.uaR.rotation.z = -.16; B.faR.rotation.x = -.45; }
        else if (p.idle === 2) { B.uaL.rotation.x = -.45; B.uaL.rotation.z = -.15; B.faL.rotation.x = -1.7; B.faL.rotation.y = -.9; B.uaR.rotation.x = -.45; B.uaR.rotation.z = .15; B.faR.rotation.x = -1.7; B.faR.rotation.y = .9; }
        if (p.st === 'stop' && !p.look) { p.look = 'bus'; p.lookT = 0; }
        if (p.st === 'stop' && p.look === 'bus') { const q = p.slot && p.slot.sd; if (q) { p.lx = p.x + q.dx * 20 * (Math.sin(t * .2 + p.seed) > 0 ? 1 : -1); p.lz = p.z + q.dz * 20 * (Math.sin(t * .2 + p.seed) > 0 ? 1 : -1); } }
      } else if (p.st === 'stand') {
        if (p.phone) { B.uaL.rotation.x = -.6; B.uaL.rotation.z = .55; B.faL.rotation.x = -2.25; B.head.rotation.z = .1; }
        else if (p.idle === 1) { B.uaL.rotation.x = .1; B.uaL.rotation.z = .16; B.faL.rotation.x = -.45; B.uaR.rotation.x = .1; B.uaR.rotation.z = -.16; B.faR.rotation.x = -.45; }
      }
    }
    // şemsiye tutuşu
    if (umb) { B.uaR.rotation.x = -.55; B.uaR.rotation.z = .1; B.faR.rotation.x = -1.25; B.faR.rotation.y = .2; B.haR.rotation.x = .3; }
    // tepki pozları
    if (p.react === 'jump') {
      const k = Math.sin(Math.min(1, (.9 - p.rt) / .9) * Math.PI);
      B.uaL.rotation.x = -1.8 * k; B.uaR.rotation.x = -1.8 * k; B.uaL.rotation.z = .5 * k; B.uaR.rotation.z = -.5 * k; B.faL.rotation.x = -.7 * k; B.faR.rotation.x = -.7 * k;
      B.spine.rotation.x = -.25 * k; B.hips.position.y += .12 * k; B.thL.rotation.x = -.35 * k; B.knL.rotation.x = .6 * k;
    } else if (p.react === 'fist') {
      const k = Math.min(1, p.rt * 3, (1.8 - p.rt) * 4);
      B.uaR.rotation.x = -2.5 * k; B.uaR.rotation.z = -.25 * k; B.faR.rotation.x = -(.6 + .4 * Math.sin(t * 19)) * k; B.haR.rotation.x = -.4 * k;
    }
    // bakış yönü
    let tx = null, tz = null;
    if (p.look === 'car') { tx = car.x; tz = car.z; }
    else if ((p.look === 'spk' || p.look === 'bus') && p.lx !== undefined) { tx = p.lx; tz = p.lz; }
    else if (p.look === 'road' && p.ck) { const k = p.ck, sgn = Math.sin(t * .9 + p.seed) > 0 ? 1 : -1, ddx = k.x1 - k.x0, ddz = k.z1 - k.z0, l = Math.hypot(ddx, ddz) || 1; tx = p.x - ddz / l * 12 * sgn + ddx / l * 4; tz = p.z + ddx / l * 12 * sgn + ddz / l * 4; }
    else if (p.look === 'shop') { const q = perim(p.cx, p.cz, p.s, 0, PA); tx = p.x - q.nx * 5; tz = p.z - q.nz * 5; }
    let hy = 0;
    if (tx !== null) hy = cl(wrapA(Math.atan2(tx - p.x, tz - p.z) - p.yaw), -1.25, 1.25);
    else if (p.st === 'stop' || p.st === 'stand' || p.st === 'talk') hy = Math.sin(t * .3 + p.seed * 3) * .5;
    p.headY += (hy - p.headY) * Math.min(1, dt * 4);
    B.head.rotation.y += p.headY * .65; B.neck.rotation.y = p.headY * .15; B.chest.rotation.y += p.headY * .2;
  }
  function idleHead(p, t) { p.B.head.rotation.x = .05 + Math.sin(t * .4 + p.seed) * .05; }
})();
