/* ShopManager: gerçek parayla altın (IAP) + oyun içi altın mağazası. Tek para birimi: altın (oyunun mevcut G.money değeri).
   - Görünüm eşyaları (kaplama, neon, jant, korna) oyunun buildPlayer/hornOn fonksiyonlarına SARMALAYICI ile bağlanır; oyun dosyası değişmez.
   - IAP için cordova-plugin-purchase (Google Play Faturalandırma) gerekir; yoksa satın alma KAPALI kalır (sahte onay yalnızca IST_CONFIG.shop.mock=true ile). */
(function () {
  'use strict';
  if (!window.IST) return;
  window.IST.register('shop', function (IST) {
    const cfg = IST.cfg.shop || {}, store = IST.storage('ist-shop');
    const S = store.load({ owned: {}, eq: { livery: '', neon: '', rim: '', horn: '' }, iap: {}, txns: [] });
    S.eq = Object.assign({ livery: '', neon: '', rim: '', horn: '' }, S.eq);
    const save = () => store.save(S);

    /* ---------------- katalog ---------------- */
    /* yalnızca 2 ürün: Premium (tek seferlik, reklamsız dahil) + altın paketi (tekrar alınabilir) */
    const IAP = [
      { id: (cfg.ids && cfg.ids.vip) || 'vip_pack', kind: 'nc', title: '⭐ Premium Paket', desc: 'Reklamsız oyun • Tüm kazançlara +%50 altın • 5000 altın • Premium kaplamalar ve korna', gold: 5000 },
      { id: 'gold_5500', kind: 'c', title: '5500 Altın', gold: 5500 }
    ];
    const ITEMS = [
      { id: 'lv_stripes', cat: 'livery', name: 'Yarış Şeritleri', cur: 'gold', price: 800, tex: 'stripes' },
      { id: 'lv_checker', cat: 'livery', name: 'Damalı Bayrak', cur: 'gold', price: 1200, tex: 'checker', full: true },
      { id: 'lv_camo', cat: 'livery', name: 'Kamuflaj', cur: 'gold', price: 1200, tex: 'camo', full: true },
      { id: 'lv_flame', cat: 'livery', name: 'Alev', cur: 'gold', price: 2000, tex: 'flame' },
      { id: 'lv_vipgold', cat: 'livery', name: 'VIP Altın', cur: 'gold', price: 0, vip: true, tex: 'gold', full: true },
      { id: 'lv_sunset', cat: 'livery', name: 'Boğaz Gün Batımı', cur: 'gold', price: 0, vip: true, tex: 'sunset', full: true },
      /* mağaza jantları kaldırıldı (kullanıcı isteği; jant rengi garajda) */
      /* neonlar kaldırıldı (kullanıcı isteği): eski kayıtlarda takılı neon varsa bulunamaz → görünmez */
      { id: 'hn_ship', cat: 'horn', name: 'Vapur Düdüğü', cur: 'gold', price: 800, horn: { kind: 'hold', lp: 520, q: 3, att: .2, rel: .8, min: 1, vib: [4.5, 1.2], voices: [{ type: 'sawtooth', f: 73.4, v: .07 }, { type: 'sawtooth', f: 110, v: .06 }, { type: 'square', f: 146.8, v: .022 }] } },   // derin, uzun vapur düdüğü (tek basışta en az 1 sn)
      { id: 'hn_taxi', cat: 'horn', name: 'Taksi Bip-Bip', cur: 'gold', price: 400, horn: { kind: 'beeps', lp: 2300, beeps: [[0, .12], [.19, .15]], voices: [{ type: 'square', f: 415, v: .05 }, { type: 'square', f: 523, v: .045 }] } },   // klasik çift tonlu araba kornası: bip-bip
      { id: 'hn_sport', cat: 'horn', name: 'Spor Korna', cur: 'gold', price: 600, horn: { kind: 'hold', lp: 3600, q: 1.5, att: .012, rel: .08, min: .18, voices: [{ type: 'sawtooth', f: 554, v: .05 }, { type: 'sawtooth', f: 698, v: .045 }, { type: 'square', f: 1108, v: .012 }] } },   // keskin, parlak spor araba kornası
      { id: 'hn_melody', cat: 'horn', name: 'Melodi', cur: 'gold', price: 800, horn: { kind: 'seq', lp: 2800, gap: .025, notes: [[392, .11], [523, .11], [659, .11], [784, .22], [659, .11], [784, .36]], voices: [{ type: 'square', v: .035 }, { type: 'triangle', mul: 2, v: .03 }] } },   // neşeli kısa korna melodisi
      { id: 'hn_vip', cat: 'horn', name: 'VIP Korna', cur: 'gold', price: 0, vip: true, horn: { kind: 'bell', lp: 6000, v: .07, dec: 1.6, notes: [[523, 0], [659, .1], [784, .2], [1047, .3]] } }   // lüks çan akoru
    ];
    const CATS = [['iap', '💰 Altın & Premium'], ['livery', '🎨 Kaplama'], ['horn', '📯 Korna']];
    const item = id => ITEMS.find(x => x.id === id);

    /* günün fırsatı: her gün bir ürün %30 indirimli (gün içinde sabit kalır, alınca zincirleme indirim olmaz) */
    const DEAL = 0.7, dayNo = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
    function dealItem() {
      const d = dayNo();
      if (!S.deal || S.deal.day !== d) {
        const pool = ITEMS.filter(i => !i.vip && !i.pack && i.price > 0 && !S.owned[i.id]);
        S.deal = { day: d, id: pool.length ? pool[d % pool.length].id : '' }; save();
      }
      return item(S.deal.id) || null;
    }
    const priceOf = it => { const dl = dealItem(); return dl && dl.id === it.id ? Math.round(it.price * DEAL) : it.price; };

    const isVip = () => !!S.iap[IAP[0].id];
    const isAdFree = () => isVip() || !!S.iap.remove_ads;   // Premium reklamları da kapatır
    const gameFree = () => typeof freeMode !== 'undefined' && freeMode === true;   // oyunun 'let freeMode' değişkeni (ortak global kapsam)

    /* ---------------- ödeme sağlayıcıları ---------------- */
    const providers = {
      mock: {
        name: 'mock', init() {}, price: () => 'TEST',
        purchase(id) { return new Promise((res, rej) => { if (typeof confirm === 'function' && !confirm('[TEST] ' + id + ' satın alınsın mı? (gerçek ödeme yok)')) return rej(new Error('İptal edildi')); res({ id, txn: 'mock-' + Date.now() }); }); },
        restore() { return Promise.resolve([]); }
      },
      play: {   /* cordova-plugin-purchase v13  (npm i cordova-plugin-purchase && npx cap sync) */
        name: 'play', ready: false, pending: {},
        init(onGrant, onOwned) {
          const C = window.CdvPurchase; if (!C) return Promise.reject(new Error('cordova-plugin-purchase yok'));
          const st = this.st = C.store, P = this.P = C.Platform.GOOGLE_PLAY;
          st.register(IAP.map(p => ({ id: p.id, type: p.kind === 'c' ? C.ProductType.CONSUMABLE : C.ProductType.NON_CONSUMABLE, platform: P })));
          st.when().approved(t => {                      // SUNUCU DOĞRULAMASI için: t.verify() ve .verified() kullanın (README)
            t.products.forEach(pr => onGrant(pr.id, t.transactionId));
            t.finish();
          }).productUpdated(p => { if (p && p.owned) onOwned(p.id); });   // daha önce alınmış tek seferlik ürünler (yeniden kurulum / geri yükleme)
          return st.initialize([P]).then(() => { this.ready = true; IAP.forEach(x => { const p = st.get(x.id, P); if (p && p.owned) onOwned(x.id); }); });
        },
        price(id) { try { const p = this.st.get(id, this.P), o = p && p.getOffer(); return (o && o.pricingPhases[0].price) || ''; } catch (e) { return ''; } },
        purchase(id) {
          const p = this.st.get(id, this.P), o = p && p.getOffer(); if (!o) return Promise.reject(new Error('Ürün bulunamadı'));
          return this.st.order(o).then(err => { if (err) throw new Error(err.message || 'Satın alma tamamlanmadı'); return { id, pending: true }; });
        },
        restore() { return this.st.restorePurchases(); }
      }
    };
    let provider = null;
    function grant(id, txn) {                         // tek noktadan hak tanımlama (aynı işlem iki kez işlenmez)
      if (txn && S.txns.indexOf(txn) >= 0) return;
      const p = IAP.find(x => x.id === id); if (!p) return;
      const bonus = (p.kind === 'nc' && S.owned['bonus_' + id]) ? 0 : (p.gold || 0);
      if (bonus && !IST.gold.add(bonus)) { IST.toast('Altın eklenemedi, tekrar dene'); return; }
      if (txn) { S.txns.push(txn); if (S.txns.length > 100) S.txns.shift(); }
      if (p.kind === 'nc') { S.iap[id] = true; if (bonus) S.owned['bonus_' + id] = 1; }
      save(); IST.bus.emit('shop:changed', { id }); refresh(); applyAll();
      IST.toast(p.title + ' etkinleştirildi');
    }
    /* daha önce satın alınmış tek seferlik ürünü (Premium) geri ver — altın bonusu tekrar verilmez */
    function markOwned(id) {
      const p = IAP.find(x => x.id === id); if (!p || p.kind !== 'nc' || S.iap[id]) return;
      S.iap[id] = true; save(); IST.bus.emit('shop:changed', { id }); refresh(); applyAll();
      IST.toast(p.title + ' geri yüklendi');
    }
    /* Android uygulamasında ödeme eklentisi 'deviceready' sonrası kullanılabilir. Yavaş telefonlarda (ör. J7) bu sinyal
       sayfa ağır yüklendiği için 5-10 sn gecikebiliyor: 30 sn'ye kadar bekle (sinyal zaten geldiyse Cordova hemen çağırır). */
    function waitStore() {
      const native = !!(window.cordova || (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()));
      if (!native) return Promise.resolve();
      return new Promise(r => { let done = false; const f = () => { if (!done) { done = true; r(); } }; document.addEventListener('deviceready', f, { once: true }); setTimeout(f, 30000); });
    }
    async function initProvider() {
      try {
        if (cfg.mock !== true) await waitStore();
        provider = cfg.mock === true ? providers.mock : (window.CdvPurchase ? providers.play : null);
        if (provider) await provider.init(grant, markOwned);
      } catch (e) { console.warn('[IST shop] ödeme sağlayıcı başlatılamadı:', e.message); provider = null; }
    }

    /* ---------------- satın alma / kuşanma ---------------- */
    function buyIap(id) {
      if (!provider) return IST.toast('Mağaza bu cihazda bağlı değil');
      provider.purchase(id).then(r => { if (r && !r.pending) grant(id, r.txn); }).catch(e => IST.toast(e.message || 'Satın alma başarısız'));
    }
    function buyItem(id) {
      const it = item(id); if (!it || S.owned[id]) return false;
      if (it.vip && !isVip()) { IST.toast('Bu ürün Premium Paket gerektirir'); return false; }
      if (it.pack && !S.iap[it.pack]) { IST.toast('Bu ürün Başlangıç Paketi gerektirir'); return false; }
      if (!IST.gold.add(-priceOf(it))) { IST.toast('Yetersiz altın — altın paketlerine bak'); tab = 'iap'; refresh(); return false; }
      S.owned[id] = 1; S.eq[it.cat] = id; save(); applyAll(); refresh(); IST.bus.emit('shop:changed', { id }); return true;
    }
    function equip(id) { const it = item(id); if (!it || !S.owned[id]) return; S.eq[it.cat] = S.eq[it.cat] === id ? '' : id; save(); applyAll(); refresh(); }

    /* ---------------- görünümü araca uygulama (sarmalayıcılar) ---------------- */
    const R_ = () => (typeof THREE !== 'undefined' ? THREE : null);
    const texCache = {};
    function makeTex(kind) {
      if (texCache[kind]) return texCache[kind];
      const R = R_(); if (!R || typeof document === 'undefined') return null;
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128);
      if (kind === 'stripes') { x.fillStyle = '#222'; x.fillRect(40, 0, 14, 128); x.fillRect(74, 0, 14, 128); }
      else if (kind === 'checker') { for (let i = 0; i < 8; i++)for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#fff' : '#222'; x.fillRect(i * 16, j * 16, 16, 16); } }
      else if (kind === 'camo') { let sd = 7; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;   // askeri kamuflaj: zeytin zemin + koyu yeşil/kahve/siyah lekeler (her seferinde aynı)
        x.fillStyle = '#6f7a3c'; x.fillRect(0, 0, 128, 128); const cl = ['#3f4d22', '#7a5a35', '#1f2414', '#93945a']; for (let i = 0; i < 40; i++) { x.fillStyle = cl[i % 4]; const ex = rn() * 128, ey = rn() * 128, rx = 8 + rn() * 16, ry = 5 + rn() * 10, ro = rn() * 3; for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) { x.beginPath(); x.ellipse(ex + ox, ey + oy, rx, ry, ro, 0, 7); x.fill(); } } }
      else if (kind === 'flame') { const g = x.createLinearGradient(0, 128, 0, 0); g.addColorStop(0, '#d32f2f'); g.addColorStop(.5, '#ff9800'); g.addColorStop(1, '#fff'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else if (kind === 'gold') { const g = x.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, '#b8860b'); g.addColorStop(.3, '#ffd75a'); g.addColorStop(.5, '#fff1a8'); g.addColorStop(.7, '#e8b923'); g.addColorStop(1, '#a8740a'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }   // parlak altın
      else if (kind === 'sunset') { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#ffb347'); g.addColorStop(.45, '#f0607a'); g.addColorStop(1, '#3b2a7a'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(255,236,150,.9)'; x.beginPath(); x.arc(64, 70, 18, 0, 7); x.fill(); }   // gün batımı: üstte turuncu gökyüzü, altta mor deniz, ortada güneş
      const t = new R.CanvasTexture(c); t.wrapS = t.wrapT = R.RepeatWrapping; t.repeat.set(.3, .3); return (texCache[kind] = t);
    }
    let neon = null;
    /* neon: arabanın altını komple kaplayan dikdörtgen yerine yalnız iki yanda ince ışık şeritleri (2.8×6.2 ölçeğinde; aşağıda araca göre ölçeklenir) */
    function neonStrips(R) {
      const a = new R.PlaneGeometry(.55, 5.4), b = new R.PlaneGeometry(.55, 5.4); a.translate(-1.12, 0, 0); b.translate(1.12, 0, 0);
      const g = new R.BufferGeometry(), P = new Float32Array(24), U = new Float32Array(16), I = [];
      [a, b].forEach((q, k) => { P.set(q.attributes.position.array, k * 12); U.set(q.attributes.uv.array, k * 8); q.index.array.forEach(i => I.push(i + k * 4)); });
      g.setAttribute('position', new R.BufferAttribute(P, 3)); g.setAttribute('uv', new R.BufferAttribute(U, 2)); g.setIndex(I); return g;
    }
    function applyAll() {
      try {
        if (typeof bodyM === 'undefined') return;
        const eq = S.eq;   // süsler artık serbest sürüşte de görünür
        const lv = eq.livery ? item(eq.livery) : null;
        const fl = typeof pcur !== 'undefined' && pcur && pcur.userData && pcur.userData.flame;   // alev: ayrı ateş renkli katman (boyayla çarpılmaz)
        if (fl) fl.visible = !!lv && lv.tex === 'flame';
        bodyM.map = lv && !(fl && lv.tex === 'flame') ? makeTex(lv.tex) : null; bodyM.needsUpdate = true;
        window.lvFull = !!(lv && lv.full); if (typeof look === 'function') { try { look(); } catch (e) {} }   // tam kaplamada gövde beyaz: desen kendi renginde görünsün
        const ri = eq.rim ? item(eq.rim) : null;
        if (ri && typeof rimP !== 'undefined') { rimP.color.setHex(ri.color); if (rimP.emissive) rimP.emissive.setHex(ri.emissive || 0); }
        else if (typeof rimP !== 'undefined' && rimP.emissive) rimP.emissive.setHex(0);
        const ne = eq.neon ? item(eq.neon) : null, R = R_();
        if (R && typeof shell !== 'undefined') {
          if (!neon) { neon = new R.Mesh(neonStrips(R), new R.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, blending: R.AdditiveBlending, depthWrite: false })); neon.rotation.x = -Math.PI / 2; neon.position.y = .09; shell.add(neon); }
          neon.visible = !!ne && !(typeof boatM !== 'undefined' && boatM); if (ne && !ne.rainbow) neon.material.color.setHex(ne.color);
          // neon her aracın kendi boyutunda (eskiden her araca 2.8×6.2 m çiziliyordu; motosiklette kocaman dikdörtgen oluyordu)
          try { const t = GM[G.model][1]; let w = 1.1, l = 2.7; if (t !== 5 && typeof CT !== 'undefined' && CT[t]) { l = CT[t][0] + .9; w = CT[t][1] + .9; } neon.scale.set(w / 2.8, l / 6.2, 1); } catch (e) {}
        }
      } catch (e) { console.error('[IST shop] uygulama hatası', e); }
    }
    (function rainbow() { const it = S.eq.neon && item(S.eq.neon); if (neon && neon.visible && it && it.rainbow) { try { neon.material.color.setHSL((performance.now() / 2500) % 1, 1, .55); } catch (e) {} } requestAnimationFrame(rainbow); })();

    if (typeof window.buildPlayer === 'function') {          // araç yeniden kurulunca süsleri tekrar uygula
      const bp = window.buildPlayer;
      window.buildPlayer = function () { const r = bp.apply(this, arguments); applyAll(); return r; };
    }

    /* özel korna sesleri — her korna adına uygun, sentezle (dosya yok):
       hold  = basılı tuttukça çalar (vapur, spor)  ·  beeps = kısa bip-bip (taksi)
       seq   = kısa melodi  ·  bell = zil/çan akoru (VIP) */
    let HN = null;
    const curHorn = () => { const it = S.eq.horn && item(S.eq.horn); return it && it.horn ? it.horn : null; };
    function hVoice(ctx, bus, type, f, v, t0, att, vib) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t0); o._l = l; }
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + att); o.connect(g); g.connect(bus); o.start(t0); return { o, g, v };
    }
    function hEnd(vs, t, rel) {
      vs.forEach(x => { x.g.gain.cancelScheduledValues(t); x.g.gain.setValueAtTime(x.v, t); x.g.gain.exponentialRampToValueAtTime(.0001, t + rel); x.o.stop(t + rel + .05); if (x.o._l) x.o._l.stop(t + rel + .05); });
    }
    function playHorn(ctx, dest, h, t) {
      const bus = ctx.createBiquadFilter(); bus.type = 'lowpass'; bus.frequency.value = h.lp || 2400; bus.Q.value = h.q || .8; bus.connect(dest);
      if (h.kind === 'hold') {
        const vs = h.voices.map(v => hVoice(ctx, bus, v.type, v.f, v.v, t, h.att || .02, h.vib));
        return { stop: te => hEnd(vs, Math.max(te, t + (h.min || .2)), h.rel || .12) };
      }
      let len = 0;
      if (h.kind === 'beeps') h.beeps.forEach(([s, d]) => { const vs = h.voices.map(v => hVoice(ctx, bus, v.type, v.f, v.v, t + s, h.att || .008)); hEnd(vs, t + s + d, h.rel || .04); len = Math.max(len, s + d + .1); });
      if (h.kind === 'seq') { let s = 0; h.notes.forEach(([f, d]) => { const vs = h.voices.map(v => hVoice(ctx, bus, v.type, f * (v.mul || 1), v.v, t + s, .01)); hEnd(vs, t + s + d - .015, .03); s += d + (h.gap || .02); }); len = s + .1; }
      if (h.kind === 'bell') h.notes.forEach(([f, s]) => [[1, 1], [2.76, .3], [5.4, .1]].forEach(([m, a]) => {   // çan: temel + iki metalik kısmi ton, uzun sönüm
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m;
        g.gain.setValueAtTime(.0001, t + s); g.gain.exponentialRampToValueAtTime(h.v * a, t + s + .006); g.gain.exponentialRampToValueAtTime(.0001, t + s + h.dec / m ** .3);
        o.connect(g); g.connect(bus); o.start(t + s); o.stop(t + s + h.dec + .1); len = Math.max(len, s + h.dec);
      }));
      return { once: true, len };
    }
    if (typeof window.hornOn === 'function') {
      const on = window.hornOn, off = window.hornOff;
      window.hornOn = function () {
        const h = curHorn(); if (!h) return on.apply(this, arguments);
        try { startAudio(); } catch (e) {} if (typeof ac === 'undefined' || !ac || HN) return;
        const p = playHorn(ac, typeof aOut === 'function' ? aOut() : ac.destination, h, ac.currentTime);
        HN = p; if (p.once) setTimeout(() => { if (HN === p) HN = null; }, p.len * 1000);
      };
      window.hornOff = function () {
        if (!curHorn() && !HN) return off.apply(this, arguments);
        if (!HN || HN.once) return;
        HN.stop(ac.currentTime); HN = null;
      };
    }

    /* VIP: tüm altın kazançlarına +%50 (oyun koduna dokunmadan, kazanç olayından) */
    IST.bus.on('gold:gain', e => { if (isVip() && e.amount > 0) { const b = Math.floor(e.amount * .5); if (b > 0 && IST.gold.add(b)) IST.toast('Premium bonus +' + b + ' altın'); } });

    /* ---------------- arayüz ---------------- */
    const panel = IST.ui.panel('ist-shop', '🛒 Mağaza');
    let tab = 'iap';
    panel.onOpen = () => refresh();
    function refresh() {
      const b = panel.body; if (!b || !panel.isOpen) return; b.textContent = '';
      const top = document.createElement('div'); top.textContent = '💰 ' + IST.gold.get() + ' altın' + (isVip() ? '   ⭐ Premium' : ''); b.appendChild(top);
      const tabs = document.createElement('div'); tabs.className = 'ist-tabs';
      CATS.forEach(c => { const t = document.createElement('button'); t.textContent = c[1]; if (c[0] === tab) t.className = 'on'; t.onclick = () => { tab = c[0]; refresh(); }; tabs.appendChild(t); });
      b.appendChild(tabs);
      { const dl = dealItem();
        if (dl && !S.owned[dl.id]) {
          const dr = document.createElement('div'); dr.className = 'ist-row'; const dd = document.createElement('div'), dn = document.createElement('b'), ds = document.createElement('small');
          dn.textContent = '🔥 Günün fırsatı: ' + dl.name; ds.textContent = priceOf(dl) + ' altın (normal ' + dl.price + ') • bugün geçerli'; dd.append(dn, ds);
          const db = document.createElement('button'); db.className = 'ist-btn'; db.textContent = 'Al'; db.onclick = () => buyItem(dl.id); dr.append(dd, db); b.appendChild(dr);
        } }
      if (tab === 'iap') {
        if (!provider) { const n = document.createElement('small'); n.textContent = 'Not: Google Play ödemesi bu cihazda hazır değil (eklenti/ürünler eksik).'; b.appendChild(n); }
        IAP.forEach(p => {
          const owned = p.kind === 'nc' && S.iap[p.id], row = document.createElement('div'); row.className = 'ist-row';
          const d = document.createElement('div'); const nm = document.createElement('b'); nm.textContent = p.title; d.appendChild(nm);
          if (p.desc) { const s = document.createElement('small'); s.textContent = p.desc; d.appendChild(s); }
          const bt = document.createElement('button'); bt.className = 'ist-btn' + (owned ? ' ok' : '');
          bt.textContent = owned ? 'Sahipsin ✓' : (provider && provider.price(p.id)) || 'Satın al'; bt.disabled = !!owned || !provider; bt.onclick = () => buyIap(p.id);
          row.append(d, bt); b.appendChild(row);
        });
        const rs = document.createElement('button'); rs.className = 'ist-btn'; rs.textContent = 'Satın alımları geri yükle'; rs.disabled = !provider;
        rs.onclick = () => provider.restore().then(() => IST.toast('Geri yükleme istendi')).catch(() => IST.toast('Geri yüklenemedi')); b.appendChild(rs);
        return;
      }
      ITEMS.filter(i => i.cat === tab).forEach(it => {
        const row = document.createElement('div'), own = !!S.owned[it.id], eqp = S.eq[it.cat] === it.id; row.className = 'ist-row';
        const d = document.createElement('div'); const nm = document.createElement('b'); nm.textContent = it.name + (it.vip ? ' ⭐' : ''); d.appendChild(nm);
        const s = document.createElement('small'); s.textContent = own ? (eqp ? 'Takılı' : 'Sahipsin') : (it.vip && !isVip() ? 'Premium gerekli' : it.pack && !S.iap[it.pack] ? 'Başlangıç Paketi gerekli' : (priceOf(it) < it.price ? '🔥 ' + priceOf(it) + ' altın (indirimde, normal ' + it.price + ')' : it.price + ' altın')); d.appendChild(s);
        const bt = document.createElement('button'); bt.className = 'ist-btn' + (eqp ? ' ok' : '');
        bt.textContent = own ? (eqp ? 'Çıkar' : 'Tak') : 'Satın al'; bt.onclick = () => (own ? equip(it.id) : buyItem(it.id));
        row.append(d, bt); b.appendChild(row);
      });
    }
    /* başlangıç ekranındaki Mağaza düğmesi kaldırıldı: mağaza oyun içi ☰ menüsündeki Garaj / Mağaza'nın içinde */
    /* araba yenileme: mağazadan çıkarıldı, ana menüde ayrı düğme */
    if (typeof repairCar === 'function') {
      const short = () => !repFree() && G.money < rpCost() && adOk();   // parası yetmiyor ama reklam var → reklamla ücretsiz tamir
      const rb = IST.ui.menuButton('bRepair', '🔧 Arabayı yenile', () => { if (short()) adRepair().then(upRep); else { repairCar(); upRep(); } }, { inGame: true, before: 'bEng' });
      function upRep() { try { rb.textContent = needRp() ? '🔧 Arabayı yenile — ' + (repFree() ? 'ÜCRETSİZ' : short() ? '📺 reklamla ücretsiz' : rpCost() + ' altın') + ' (hasar %' + Math.round(dmg) + ')' : '🔧 Araba sağlam ✓'; } catch (e) {} }
      upRep(); setInterval(upRep, 1000);
    }
    initProvider().then(refresh);
    IST.bus.on('ready', applyAll); applyAll();
    IST.bus.on('mission:done', () => { if (!isVip() && !S.nudged) { S.nudged = 1; save(); setTimeout(() => IST.toast('⭐ Premium Paket Mağaza\'da seni bekliyor'), 2500); } });

    IST.shop = { catalog: { iap: IAP, items: ITEMS }, isVip, isAdFree, giveItem(id) { const it = item(id); if (!it || S.owned[id]) return false; S.owned[id] = 1; save(); refresh(); IST.bus.emit('shop:changed', { id }); return true; },   // günlük ödül gibi ücretsiz hediyeler için
      _playHorn: playHorn, openGold() { tab = 'iap'; if (panel.isOpen) refresh(); else panel.open(); }, buyItem, equip, owned: id => !!S.owned[id], open: () => panel.open(), restore: () => (provider ? provider.restore() : Promise.resolve()), _grant: grant, _state: S };
  });
})();
