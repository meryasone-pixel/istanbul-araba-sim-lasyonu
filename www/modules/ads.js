/* AdsManager: ödüllü reklam (bedava altın, görev ödülünü ikiye katla) + ara reklam (oyun bitince, sıklık sınırlı).
   Sağlayıcı: AdMob (@capacitor-community/admob, Capacitor köprüsünden) ya da test için mock.
   Sağlayıcı yoksa (tarayıcı, eklenti kurulu değil) tüm reklam özellikleri GİZLİ kalır; oyun aynen çalışır.
   Ödül yalnızca reklam gerçekten izlenince verilir. Oyunun kodunu DEĞİŞTİRMEZ (doneM'e sarmalayıcı + 'ended' durumunu izler). */
(function () {
  'use strict';
  if (!window.IST) return;
  window.IST.register('ads', function (IST) {
    const cfg = IST.cfg.ads || {};
    /* Varsayılanlar Google'ın TEST reklam kimlikleridir. Yayından önce index.html'deki IST_CONFIG.ads.ids içine kendi kimliklerini yaz. */
    const ids = Object.assign({ rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' }, cfg.ids || {});
    const DAILY_MAX = cfg.dailyMax || 5, COOLDOWN = cfg.cooldownMs || 180000, FREE_GOLD = cfg.freeGold || 100;
    const INTER_EVERY = cfg.interstitialEveryMs || 300000, GRACE = 120000;      // oturumun ilk 2 dk'sında ara reklam yok
    const store = IST.storage('ist-ads'), A = store.load({ day: '', count: 0, last: 0 });
    const save = () => store.save(A);
    const startT = Date.now();
    let provider = null, busy = false, lastInter = 0;

    const dayStr = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
    const roll = () => { const d = dayStr(); if (A.day !== d) { A.day = d; A.count = 0; save(); } };
    const left = () => { roll(); return Math.max(0, DAILY_MAX - A.count); };
    const wait = () => Math.max(0, A.last + COOLDOWN - Date.now());
    const adFree = () => !!(IST.shop && IST.shop.isAdFree && IST.shop.isAdFree());

    /* ---------------- sağlayıcılar ---------------- */
    const providers = {
      mock: {
        name: 'mock', init() { return Promise.resolve(); },
        rewarded() { return Promise.resolve(typeof confirm === 'function' ? confirm('[TEST] Reklam izlendi sayılsın mı?') : true); },
        interstitial() { IST.toast('[TEST] ara reklam'); return Promise.resolve(); }
      },
      admob: {
        name: 'admob', slot: null,
        async init() {
          const P = this.P = window.Capacitor.Plugins.AdMob;
          await P.initialize({ initializeForTesting: cfg.testing !== false });
          try {                                                    // AB/İngiltere için onay formu (varsa)
            const info = await P.requestConsentInfo();
            if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') await P.showConsentForm();
          } catch (e) { /* onay API'si yoksa/başarısızsa reklam akışı yine de sürer */ }
          const end = ok => { const s = this.slot; if (!s) return; this.slot = null; clearTimeout(s.t); s.res(!!(ok && s.rewarded)); };
          P.addListener('onRewardedVideoAdReward', () => { if (this.slot) this.slot.rewarded = true; });
          P.addListener('onRewardedVideoAdDismissed', () => end(true));
          P.addListener('onRewardedVideoAdFailedToShow', () => end(false));
          P.addListener('onRewardedVideoAdFailedToLoad', () => end(false));
        },
        rewarded() {
          return new Promise(res => {
            const P = this.P;
            this.slot = { rewarded: false, res, t: setTimeout(() => { this.slot = null; res(false); }, 180000) };
            P.prepareRewardVideoAd({ adId: ids.rewarded }).then(() => P.showRewardVideoAd()).catch(() => {
              if (this.slot) { clearTimeout(this.slot.t); this.slot = null; } res(false);
            });
          });
        },
        interstitial() { const P = this.P; return P.prepareInterstitial({ adId: ids.interstitial }).then(() => P.showInterstitial()).catch(() => {}); }
      }
    };
    const available = () => !!provider;

    /* tek giriş: ödüllü reklam; true = izlendi ve ödül hak edildi */
    async function watch() {
      if (!provider || busy) return false;
      busy = true;
      try { return await provider.rewarded(); } catch (e) { return false; } finally { busy = false; }
    }

    /* ---------------- 1) görev ödülünü ikiye katla ---------------- */
    let banner = null;
    function hideBanner() { if (banner) { clearTimeout(banner.t); banner.el.remove(); banner = null; } }
    function offerDouble(gain) {
      if (!provider || gain <= 0) return; hideBanner();
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:22%;z-index:33;display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:14px;background:#15153cee;color:#fff;font:700 15px system-ui';
      const bt = document.createElement('button'), no = document.createElement('button');
      bt.className = 'ist-btn'; bt.textContent = '📺 Reklam izle → +' + gain + ' altın daha';
      no.className = 'ist-btn'; no.style.background = '#555'; no.textContent = '✕';
      no.onclick = hideBanner;
      bt.onclick = async () => {
        bt.disabled = true; IST.freeze(true);
        const ok = await watch();
        IST.freeze(false); hideBanner();
        if (ok) { IST.gold.add(gain); IST.toast('📺 Görev ödülü ikiye katlandı +' + gain); } else IST.toast('Reklam tamamlanmadı, ödül yok');
      };
      el.append(bt, no); document.body.appendChild(el);
      banner = { el, t: setTimeout(hideBanner, 12000) };
    }
    if (typeof window.doneM === 'function') {
      const o = window.doneM;
      window.doneM = function () {
        const before = IST.gold.get(), r = o.apply(this, arguments), gain = IST.gold.get() - before;
        try { if (gain > 0) offerDouble(gain); } catch (e) {}
        return r;
      };
    }

    /* ---------------- 2) bedava altın paneli ---------------- */
    const panel = IST.ui.panel('ist-ads', '📺 Bedava Altın');
    let btn = null, tick = null;
    panel.onOpen = () => { refresh(); tick = setInterval(refresh, 1000); };
    panel.onClose = () => { clearInterval(tick); tick = null; };
    function refresh() {
      const b = panel.body; if (!b || !panel.isOpen) return; b.textContent = '';
      const info = document.createElement('small'); info.textContent = 'Reklam izle, ' + FREE_GOLD + ' altın kazan. Bugün kalan hak: ' + left() + ' / ' + DAILY_MAX; b.appendChild(info);
      const w = wait(), row = document.createElement('div'), bt = document.createElement('button');
      row.className = 'ist-row'; bt.className = 'ist-btn';
      bt.textContent = !left() ? 'Bugünlük bitti' : w > 0 ? 'Bekle ' + Math.ceil(w / 1000) + ' sn' : '📺 Reklam izle +' + FREE_GOLD;
      bt.disabled = busy || !left() || w > 0;
      bt.onclick = async () => {
        if (busy || !left() || wait() > 0) return;
        const ok = await watch();
        if (ok) { A.count++; A.last = Date.now(); save(); IST.gold.add(FREE_GOLD); IST.toast('📺 +' + FREE_GOLD + ' altın'); } else IST.toast('Reklam tamamlanmadı, ödül yok');
        refresh();
      };
      row.appendChild(bt); b.appendChild(row);
    }
    btn = IST.ui.menuButton('bAds', '📺 Bedava altın', () => panel.open());
    btn.style.display = 'none';                                  // sağlayıcı hazır olunca görünür

    /* ---------------- 3) ara reklam: oyun bitince, sıklık sınırlı, reklamsız pakette yok ---------------- */
    let wasEnded = false;
    setInterval(() => {
      let e = false; try { e = typeof ended !== 'undefined' && ended === true; } catch (x) {}
      if (e && !wasEnded && provider && cfg.interstitial !== false && !adFree() && !busy) {
        const now = Date.now();
        if (now - startT > GRACE && now - lastInter > INTER_EVERY) { lastInter = now; setTimeout(() => { try { provider.interstitial(); } catch (x) {} }, 1200); }
      }
      wasEnded = e;
    }, 700);

    /* ---------------- başlat ---------------- */
    (async () => {
      try {
        const nativeOk = !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob);
        provider = cfg.mock === true ? providers.mock : nativeOk ? providers.admob : null;
        if (provider) await provider.init();
      } catch (e) { console.warn('[IST ads] reklam başlatılamadı:', e && e.message); provider = null; }
      btn.style.display = provider ? '' : 'none';
    })();

    IST.ads = { available, watch, freeLeft: left, offerDouble, _state: A };
  });
})();
