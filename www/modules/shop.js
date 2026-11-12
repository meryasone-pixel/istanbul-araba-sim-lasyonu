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
    const IAP = [
      { id: (cfg.ids && cfg.ids.vip) || 'vip_pack', kind: 'nc', title: 'VIP Sürücü Paketi', desc: 'Tüm kazançlara +%50 altın • 5000 altın • VIP kaplama ve korna', gold: 5000 },
      { id: (cfg.ids && cfg.ids.noads) || 'remove_ads', kind: 'nc', title: 'Reklam Kaldırma', desc: 'Reklamları kalıcı olarak kapatır' },
      { id: 'starter_pack', kind: 'nc', title: '⭐ Başlangıç Paketi (tek seferlik)', desc: '3000 altın • Gün Batımı kaplaması • Gün Batımı neonu', gold: 3000 },
      { id: 'gold_1000', kind: 'c', title: '1000 Altın', gold: 1000 },
      { id: 'gold_5500', kind: 'c', title: '5500 Altın', desc: '+%10 bonus', gold: 5500 },
      { id: 'gold_12000', kind: 'c', title: '12000 Altın', desc: '+%20 bonus', gold: 12000 }
    ];
    const ITEMS = [
      { id: 'lv_stripes', cat: 'livery', name: 'Yarış Şeritleri', cur: 'gold', price: 800, tex: 'stripes' },
      { id: 'lv_checker', cat: 'livery', name: 'Damalı Bayrak', cur: 'gold', price: 1200, tex: 'checker' },
      { id: 'lv_camo', cat: 'livery', name: 'Kamuflaj', cur: 'gold', price: 1200, tex: 'camo' },
      { id: 'lv_flame', cat: 'livery', name: 'Alev', cur: 'gold', price: 2000, tex: 'flame' },
      { id: 'lv_vipgold', cat: 'livery', name: 'VIP Altın', cur: 'gold', price: 0, vip: true, tex: 'gold' },
      { id: 'ne_pink', cat: 'neon', name: 'Pembe Neon', cur: 'gold', price: 600, color: 0xff2fd2 },
      { id: 'ne_cyan', cat: 'neon', name: 'Turkuaz Neon', cur: 'gold', price: 600, color: 0x19e0cf },
      { id: 'lv_sunset', cat: 'livery', name: 'Boğaz Gün Batımı', cur: 'gold', price: 0, pack: 'starter_pack', tex: 'sunset' },
      { id: 'ne_sunset', cat: 'neon', name: 'Gün Batımı Neonu', cur: 'gold', price: 0, pack: 'starter_pack', color: 0xff8a3d },
      { id: 'ne_rainbow', cat: 'neon', name: 'Gökkuşağı', cur: 'gold', price: 2500, rainbow: true },
      { id: 'ri_gold', cat: 'rim', name: 'Altın Jant', cur: 'gold', price: 700, color: 0xffc400 },
      { id: 'ri_red', cat: 'rim', name: 'Kırmızı Jant', cur: 'gold', price: 500, color: 0xd32f2f },
      { id: 'ri_chrome', cat: 'rim', name: 'Krom Jant', cur: 'gold', price: 800, color: 0xf2f5f8, emissive: 0x333333 },
      { id: 'ri_neon', cat: 'rim', name: 'Neon Mavi Jant', cur: 'gold', price: 1000, color: 0x2979ff, emissive: 0x1144aa },
      { id: 'hn_ship', cat: 'horn', name: 'Vapur Düdüğü', cur: 'gold', price: 800, horn: { f: [98, 147], type: 'sawtooth', lp: 700 } },
      { id: 'hn_taxi', cat: 'horn', name: 'Taksi Bip-Bip', cur: 'gold', price: 400, horn: { f: [440, 554], type: 'square', lp: 1800, double: true } },
      { id: 'hn_sport', cat: 'horn', name: 'Spor Korna', cur: 'gold', price: 600, horn: { f: [523, 659, 784], type: 'sawtooth', lp: 2400 } },
      { id: 'hn_melody', cat: 'horn', name: 'Melodi', cur: 'gold', price: 800, horn: { seq: [392, 494, 587, 784], type: 'triangle', lp: 2200 } },
      { id: 'hn_vip', cat: 'horn', name: 'VIP Korna', cur: 'gold', price: 0, vip: true, horn: { seq: [523, 659, 784, 1047], type: 'sine', lp: 3000 } }
    ];
    const CATS = [['iap', '💰 Altın & VIP'], ['livery', '🎨 Kaplama'], ['neon', '✨ Neon'], ['rim', '🛞 Jant'], ['horn', '📯 Korna']];
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
    const isAdFree = () => !!S.iap[IAP[1].id];
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
        init(onGrant) {
          const C = window.CdvPurchase; if (!C) return Promise.reject(new Error('cordova-plugin-purchase yok'));
          const st = this.st = C.store, P = this.P = C.Platform.GOOGLE_PLAY;
          st.register(IAP.map(p => ({ id: p.id, type: p.kind === 'c' ? C.ProductType.CONSUMABLE : C.ProductType.NON_CONSUMABLE, platform: P })));
          st.when().approved(t => {                      // SUNUCU DOĞRULAMASI için: t.verify() ve .verified() kullanın (README)
            t.products.forEach(pr => onGrant(pr.id, t.transactionId));
            t.finish();
          });
          return st.initialize([P]).then(() => { this.ready = true; });
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
    async function initProvider() {
      try {
        provider = cfg.mock === true ? providers.mock : (window.CdvPurchase ? providers.play : null);
        if (provider) await provider.init(grant);
      } catch (e) { console.warn('[IST shop] ödeme sağlayıcı başlatılamadı:', e.message); provider = null; }
    }

    /* ---------------- satın alma / kuşanma ---------------- */
    function buyIap(id) {
      if (!provider) return IST.toast('Mağaza bu cihazda bağlı değil');
      provider.purchase(id).then(r => { if (r && !r.pending) grant(id, r.txn); }).catch(e => IST.toast(e.message || 'Satın alma başarısız'));
    }
    function buyItem(id) {
      const it = item(id); if (!it || S.owned[id]) return false;
      if (it.vip && !isVip()) { IST.toast('Bu ürün VIP Sürücü Paketi gerektirir'); return false; }
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
      else if (kind === 'camo') { const cl = ['#6b7a3a', '#4d5a2a', '#8c8a54', '#2f3a1e']; for (let i = 0; i < 26; i++) { x.fillStyle = cl[i % 4]; x.beginPath(); x.ellipse(Math.random() * 128, Math.random() * 128, 10 + Math.random() * 18, 6 + Math.random() * 12, Math.random() * 3, 0, 7); x.fill(); } }
      else if (kind === 'flame') { const g = x.createLinearGradient(0, 128, 0, 0); g.addColorStop(0, '#d32f2f'); g.addColorStop(.5, '#ff9800'); g.addColorStop(1, '#fff'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else if (kind === 'gold') { const g = x.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, '#fff3b0'); g.addColorStop(.5, '#e0b030'); g.addColorStop(1, '#fff3b0'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else if (kind === 'sunset') { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#3b2a7a'); g.addColorStop(.5, '#e0527a'); g.addColorStop(1, '#ffb347'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      const t = new R.CanvasTexture(c); t.wrapS = t.wrapT = R.RepeatWrapping; t.repeat.set(.3, .3); return (texCache[kind] = t);
    }
    let neon = null;
    function applyAll() {
      try {
        if (typeof bodyM === 'undefined') return;
        const eq = S.eq;   // süsler artık serbest sürüşte de görünür
        const lv = eq.livery ? item(eq.livery) : null;
        bodyM.map = lv ? makeTex(lv.tex) : null; bodyM.needsUpdate = true;
        const ri = eq.rim ? item(eq.rim) : null;
        if (ri && typeof rimP !== 'undefined') { rimP.color.setHex(ri.color); if (rimP.emissive) rimP.emissive.setHex(ri.emissive || 0); }
        else if (typeof rimP !== 'undefined' && rimP.emissive) rimP.emissive.setHex(0);
        const ne = eq.neon ? item(eq.neon) : null, R = R_();
        if (R && typeof shell !== 'undefined') {
          if (!neon) { neon = new R.Mesh(new R.PlaneGeometry(2.8, 6.2), new R.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, blending: R.AdditiveBlending, depthWrite: false })); neon.rotation.x = -Math.PI / 2; neon.position.y = .09; shell.add(neon); }
          neon.visible = !!ne; if (ne && !ne.rainbow) neon.material.color.setHex(ne.color);
        }
      } catch (e) { console.error('[IST shop] uygulama hatası', e); }
    }
    (function rainbow() { const it = S.eq.neon && item(S.eq.neon); if (neon && neon.visible && it && it.rainbow) { try { neon.material.color.setHSL((performance.now() / 2500) % 1, 1, .55); } catch (e) {} } requestAnimationFrame(rainbow); })();

    if (typeof window.buildPlayer === 'function') {          // araç yeniden kurulunca süsleri tekrar uygula
      const bp = window.buildPlayer;
      window.buildPlayer = function () { const r = bp.apply(this, arguments); applyAll(); return r; };
    }

    /* özel korna sesleri */
    let HN = null;
    const curHorn = () => { const it = S.eq.horn && item(S.eq.horn); return it && it.horn ? it.horn : null; };
    function tone(h, f, t0, dur, vol) {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = h.type || 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = h.lp || 2000;
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .02); g.gain.setValueAtTime(vol, t0 + dur); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur + .12);
      o.connect(lp); lp.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + .15); return { o, g };
    }
    if (typeof window.hornOn === 'function') {
      const on = window.hornOn, off = window.hornOff;
      window.hornOn = function () {
        const h = curHorn(); if (!h) return on.apply(this, arguments);
        try { startAudio(); } catch (e) {} if (typeof ac === 'undefined' || !ac || HN) return;
        const t = ac.currentTime;
        if (h.seq) { h.seq.forEach((f, i) => tone(h, f, t + i * .11, .1, .08)); HN = { once: true, until: t + h.seq.length * .11 + .2 }; setTimeout(() => { HN = null; }, h.seq.length * 110 + 200); }
        else if (h.double) { tone(h, h.f[0], t, .12, .07); tone(h, h.f[1], t + .2, .12, .07); HN = { once: true }; setTimeout(() => { HN = null; }, 450); }
        else { HN = { voices: h.f.map(f => tone(h, f, t, 30, .08)), t0: t }; }
      };
      window.hornOff = function () {
        if (!curHorn() && !HN) return off.apply(this, arguments);
        if (!HN || HN.once) return;
        const h = HN, end = Math.max(ac.currentTime, h.t0 + .22); HN = null;
        h.voices.forEach(v => { v.g.gain.cancelScheduledValues(0); v.g.gain.setValueAtTime(.08, end); v.g.gain.exponentialRampToValueAtTime(.0001, end + .14); v.o.stop(end + .16); });
      };
    }

    /* VIP: tüm altın kazançlarına +%50 (oyun koduna dokunmadan, kazanç olayından) */
    IST.bus.on('gold:gain', e => { if (isVip() && e.amount > 0) { const b = Math.floor(e.amount * .5); if (b > 0 && IST.gold.add(b)) IST.toast('VIP bonus +' + b + ' altın'); } });

    /* ---------------- arayüz ---------------- */
    const panel = IST.ui.panel('ist-shop', '🛒 Mağaza');
    let tab = 'iap';
    panel.onOpen = () => refresh();
    function refresh() {
      const b = panel.body; if (!b || !panel.isOpen) return; b.textContent = '';
      const top = document.createElement('div'); top.textContent = '💰 ' + IST.gold.get() + ' altın' + (isVip() ? '   ⭐ VIP' : ''); b.appendChild(top);
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
        IAP.slice().sort((x, y) => (y.id === 'starter_pack') - (x.id === 'starter_pack')).forEach(p => {
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
        const s = document.createElement('small'); s.textContent = own ? (eqp ? 'Takılı' : 'Sahipsin') : (it.vip && !isVip() ? 'VIP gerekli' : it.pack && !S.iap[it.pack] ? 'Başlangıç Paketi gerekli' : (priceOf(it) < it.price ? '🔥 ' + priceOf(it) + ' altın (indirimde, normal ' + it.price + ')' : it.price + ' altın')); d.appendChild(s);
        const bt = document.createElement('button'); bt.className = 'ist-btn' + (eqp ? ' ok' : '');
        bt.textContent = own ? (eqp ? 'Çıkar' : 'Tak') : 'Satın al'; bt.onclick = () => (own ? equip(it.id) : buyItem(it.id));
        row.append(d, bt); b.appendChild(row);
      });
    }
    IST.ui.menuButton('bShop', '🛒 Mağaza', () => panel.open());
    /* araba yenileme: mağazadan çıkarıldı, ana menüde ayrı düğme */
    if (typeof repairCar === 'function') {
      const short = () => !repFree() && G.money < rpCost() && adOk();   // parası yetmiyor ama reklam var → reklamla ücretsiz tamir
      const rb = IST.ui.menuButton('bRepair', '🔧 Arabayı yenile', () => { if (short()) adRepair().then(upRep); else { repairCar(); upRep(); } }, { inGame: true, before: 'bEng' });
      function upRep() { try { rb.textContent = needRp() ? '🔧 Arabayı yenile — ' + (repFree() ? 'ÜCRETSİZ' : short() ? '📺 reklamla ücretsiz' : rpCost() + ' altın') + ' (hasar %' + Math.round(dmg) + ')' : '🔧 Araba sağlam ✓'; } catch (e) {} }
      upRep(); setInterval(upRep, 1000);
    }
    initProvider().then(refresh);
    IST.bus.on('ready', applyAll); applyAll();
    IST.bus.on('mission:done', () => { if (!S.iap.starter_pack && !S.nudged) { S.nudged = 1; save(); setTimeout(() => IST.toast('⭐ Başlangıç Paketi Mağaza\'da seni bekliyor'), 2500); } });

    IST.shop = { catalog: { iap: IAP, items: ITEMS }, isVip, isAdFree, giveItem(id) { const it = item(id); if (!it || S.owned[id]) return false; S.owned[id] = 1; save(); refresh(); IST.bus.emit('shop:changed', { id }); return true; },   // günlük ödül gibi ücretsiz hediyeler için
      openGold() { tab = 'iap'; if (panel.isOpen) refresh(); else panel.open(); }, buyItem, equip, owned: id => !!S.owned[id], open: () => panel.open(), restore: () => (provider ? provider.restore() : Promise.resolve()), _grant: grant, _state: S };
  });
})();
