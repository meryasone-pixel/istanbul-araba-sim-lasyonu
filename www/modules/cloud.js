/* Bulut kaydı: oyuncu Google hesabıyla giriş yaparsa bütün ilerleme (altın, arabalar, parçalar, mağaza, bölgeler, görevler)
   Firebase'de o hesaba (/users/{uid}) yedeklenir; yeni telefonda / oyun silinip kurulunca aynı hesapla girince geri gelir.
   Ek paket yok: Firebase'in REST adresleri kullanılır. Google girişi Android uygulamasında SocialLogin eklentisiyle yapılır.
   Ayar (index.html): window.IST_CONFIG.cloud = { apiKey, projectId, googleWebClientId } — boşken bulut kapalıdır, düğme görünmez.
   Firebase'de gerekenler ve güvenlik kuralları: ../../BULUT-KURULUM.md ve ../../firestore.rules */
(function () {
  'use strict';
  if (!window.IST) return;
  window.IST.register('cloud', function (IST) {
    const cfg = IST.cfg.cloud || {}, on = !!(cfg.apiKey && cfg.projectId);
    const store = IST.storage('ist-cloud'), S = store.load({ last: 0, hash: '' });   // S.g = { uid, email, name, rt }
    const save = () => store.save(S);
    const SKIP = { 'ist-cloud': 1, 'ist-chat': 1 };   // bulut bilgisi ve eski sohbet ayarı yedeklenmez
    const GCID = cfg.googleWebClientId || '', SL = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialLogin) || null;
    const gOn = () => on && !!GCID && !!SL();
    let gtok = null, gExp = 0, gBusy = false, slInit = false, busy = false, restoring = false, err = '';

    /* ---------- Firebase: oturum + belge okuma/yazma ---------- */
    const base = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(cfg.projectId) + '/databases/(default)/documents/';
    const userUrl = uid => base + 'users/' + encodeURIComponent(uid);
    const body = data => JSON.stringify({ fields: { data: { stringValue: data }, ts: { integerValue: String(Date.now()) }, v: { integerValue: '1' } } });
    async function gAuth() {                       // Google hesabının Firebase oturumu (yenileme anahtarıyla)
      if (!S.g) throw new Error('giriş yok');
      if (gtok && Date.now() < gExp - 60000) return gtok;
      const r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + cfg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(S.g.rt) });
      if (!r.ok) throw new Error('oturum ' + r.status);
      const j = await r.json(); gtok = j.id_token; S.g.rt = j.refresh_token; gExp = Date.now() + (+j.expires_in || 3600) * 1000; save(); return gtok;
    }
    function snapshot() {
      try { if (typeof saveG === 'function') saveG(); } catch (e) {}
      const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('ist-') === 0 && !SKIP[k]) o[k] = localStorage.getItem(k); }
      return JSON.stringify(o);
    }
    const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };

    async function upload(force, leaving) {      // yalnızca Google hesabıyla giriş yapılmışsa yedekler
      if (!on || !S.g || busy || restoring || window.noSv) return false;   // noSv: oyun sıfırlanıyor/geri yükleniyor, yarım veriyi hesaba yazma
      const data = snapshot(), h = hash(data); if (!force && h === S.hash) return true;
      busy = true;
      try {
        const t = await gAuth();
        const r = await fetch(userUrl(S.g.uid), { method: 'PATCH', keepalive: !!leaving && data.length < 60000, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: body(data) });
        if (!r.ok) throw new Error('kayıt ' + r.status);
        S.hash = h; S.last = Date.now(); err = ''; save(); refresh(); return true;
      } catch (e) { err = 'Kaydedilemedi — internet bağlantısını kontrol et'; refresh(); return false; }
      finally { busy = false; }
    }
    function apply(o) {                          // yedeği bu telefona yaz ve oyunu yeniden başlat
      restoring = true; window.noSv = true;      // yeniden başlarken eski ilerleme geri yüklenenin üstüne yazılmasın
      Object.keys(localStorage).forEach(k => { if (k.indexOf('ist-') === 0 && !SKIP[k]) localStorage.removeItem(k); });
      Object.keys(o).forEach(k => { if (k.indexOf('ist-') === 0 && !SKIP[k]) localStorage.setItem(k, o[k]); });
      S.hash = ''; save();
      IST.toast('İlerleme geri yüklendi, oyun yeniden başlıyor…'); setTimeout(() => location.reload(), 600);
    }

    /* ---------- Google ile giriş ---------- */
    async function gSignIn() {
      if (!gOn() || gBusy) return;
      gBusy = true; S.asked = 1; save(); refresh();
      try {
        const P = SL();
        if (!slInit) { await P.initialize({ google: { webClientId: GCID } }); slInit = true; }
        const res = await P.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
        const rr = (res && res.result) || {}, idt = rr.idToken;
        if (!idt) throw new Error('Google girişi tamamlanmadı');
        const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=' + cfg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postBody: 'id_token=' + encodeURIComponent(idt) + '&providerId=google.com', requestUri: 'http://localhost', returnSecureToken: true }) });
        if (!r.ok) throw new Error('giriş ' + r.status);
        const j = await r.json(), pf = rr.profile || {};
        await link(j.localId, j.refreshToken, j.idToken, +j.expiresIn, j.email || pf.email, j.displayName || pf.name, j.photoUrl || pf.imageUrl);
      } catch (e) { const m = String((e && e.message) || e); IST.toast(/cancel|iptal/i.test(m) ? 'Giriş iptal edildi' : 'Google ile giriş yapılamadı — internet bağlantısını kontrol et'); }
      finally { gBusy = false; refresh(); }
    }
    async function link(uid, rt, idTok, exp, email, name, photo) {   // hesabı bu telefona bağla; hesapta eski ilerleme varsa sor
      // Hesap, karar verilene kadar S.g'ye yazılmaz: aksi halde otomatik yedek bu telefondaki (yeni kurulumda boş) ilerlemeyi
      // hesaptaki eski ilerlemenin üstüne yazabilir.
      const acc = { uid, email: email || '', name: name || '', photo: String(photo || '').indexOf('https://') === 0 ? photo : '', rt };
      const r = await fetch(userUrl(uid), { headers: { Authorization: 'Bearer ' + idTok } });
      let o = null;
      if (r.ok) { const j = await r.json(); try { o = JSON.parse(j.fields.data.stringValue); } catch (e) {} }
      else if (r.status !== 404) throw new Error('okuma ' + r.status);
      S.g = acc; gtok = idTok; gExp = Date.now() + (exp || 3600) * 1000; S.hash = ''; save();
      if (o) {
        let en = false; try { en = localStorage.getItem('ist-lang') === 'en'; } catch (e) {}
        if (confirm(en ? 'This Google account already has saved progress.\n\nOK: load the account\'s progress onto this phone.\nCancel: save this phone\'s progress to the account.'
                       : 'Bu Google hesabında kayıtlı bir ilerleme var.\n\nTamam: hesaptaki ilerleme bu telefona yüklenir.\nİptal: bu telefondaki ilerleme hesaba kaydedilir.')) { apply(o); return; }
      }
      IST.toast('✅ Google hesabına bağlandı'); await upload(true);
    }
    function gSignOut() {
      S.g = null; gtok = null; S.hash = ''; S.last = 0; save(); refresh(); IST.toast('Google hesabından çıkış yapıldı');
      try { SL() && SL().logout({ provider: 'google' }).catch(() => {}); } catch (e) {}
    }
    async function gDelete() {                   // hesabı ve hesaptaki yedeği sil (telefondaki ilerleme kalır)
      try {
        const t = await gAuth();
        const d = await fetch(userUrl(S.g.uid), { method: 'DELETE', headers: { Authorization: 'Bearer ' + t } });
        if (!d.ok && d.status !== 404) throw new Error('silme ' + d.status);
        const a = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:delete?key=' + cfg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: t }) });
        if (!a.ok) throw new Error('hesap silme ' + a.status);
        gSignOut(); IST.toast('Hesap ve hesaptaki yedek silindi');
      } catch (e) { IST.toast('Silinemedi — internet bağlantısını kontrol et'); }
    }

    /* ---------- arayüz ---------- */
    const panel = IST.ui.panel('ist-cloud', '👤 Google hesabı');
    let delSure = false;
    panel.onOpen = () => { delSure = false; refresh(); upload(false); };
    function refresh() {
      const b = panel.body; if (!b || !panel.isOpen) return; b.textContent = '';
      if (!gOn()) { const n = document.createElement('small'); n.textContent = 'Google ile giriş yalnızca telefondaki Boğaz Drive uygulamasında kullanılabilir.'; b.appendChild(n); return; }
      const gr = document.createElement('div'); gr.className = 'ist-row'; const gd = document.createElement('div');
      if (!S.g) {
        const gt = document.createElement('small'); gt.textContent = 'Google hesabınla giriş yap: telefon değiştirsen ya da oyunu silsen bile aynı hesapla girince ilerlemen geri gelir.'; gd.appendChild(gt);
        const gb = document.createElement('button'); gb.className = 'ist-btn'; gb.textContent = gBusy ? 'Bağlanıyor…' : 'Google ile giriş yap'; gb.disabled = gBusy; gb.onclick = gSignIn;
        gr.append(gd, gb); b.appendChild(gr); return;
      }
      const gn = document.createElement('b'); gn.textContent = '✅ ' + (S.g.name || 'Google hesabı'); const ge = document.createElement('small'); ge.textContent = S.g.email; ge.style.display = 'block';
      gd.append(gn, ge);
      if (S.g.photo) {                            // Google profil resmi (yüklenemezse gizlenir)
        const im = document.createElement('img'); im.src = S.g.photo; im.alt = ''; im.referrerPolicy = 'no-referrer';
        im.style.cssText = 'width:44px;height:44px;border-radius:50%;object-fit:cover;flex:0 0 44px;margin-right:10px;border:2px solid #d4a84b';
        im.onerror = () => im.remove(); gr.appendChild(im);
      }
      const go = document.createElement('button'); go.className = 'ist-btn'; go.textContent = 'Çıkış yap'; go.onclick = gSignOut;
      gr.append(gd, go); b.appendChild(gr);
      const p = document.createElement('small'); p.textContent = 'İlerlemen (altın, arabalar, parçalar, bölgeler, görevler) otomatik olarak Google hesabına yedeklenir.'; b.appendChild(p);
      const st = document.createElement('div'); st.className = 'ist-row'; const sd = document.createElement('div');
      sd.textContent = err ? '⚠ ' + err : S.last ? '✅ Son yedek: ' + new Date(S.last).toLocaleString('tr-TR') : '⏳ Henüz yedeklenmedi';
      const sb = document.createElement('button'); sb.className = 'ist-btn'; sb.textContent = busy ? 'Kaydediliyor…' : 'Şimdi yedekle'; sb.disabled = busy;
      sb.onclick = async () => { sb.disabled = true; sb.textContent = 'Kaydediliyor…'; const ok = await upload(true); IST.toast(ok ? '☁ Yedeklendi' : 'Yedeklenemedi'); };
      st.append(sd, sb); b.appendChild(st);
      const dr = document.createElement('div'); dr.className = 'ist-row'; const dd = document.createElement('small'); dd.textContent = 'Hesabını ve hesaptaki yedeği silmek istersen:';
      const db = document.createElement('button'); db.className = 'ist-btn'; db.style.background = '#555'; db.textContent = 'Hesabı sil';
      db.onclick = () => { if (!delSure) { delSure = true; db.textContent = 'Eminim, sil'; db.style.background = '#c62828'; IST.toast('Dikkat: hesaptaki yedek kalıcı olarak silinecek'); return; } db.disabled = true; gDelete(); };
      dr.append(dd, db); b.appendChild(dr);
    }

    if (!on) { IST.cloud = { enabled: false }; return; }   // ayarlanmadıysa düğme ve otomatik yedek yok
    IST.ui.menuButton('bCloud', '👤 Google hesabı', () => panel.open());
    // otomatik yedek (giriş yapılmışsa): açılıştan kısa süre sonra, her 90 sn'de bir (değişiklik varsa), satın alma/harcama sonrası ve uygulamadan çıkarken
    setTimeout(() => upload(false), 8000);
    setInterval(() => upload(false), 90000);
    let deb = null; const soon = () => { clearTimeout(deb); deb = setTimeout(() => upload(false), 3000); };
    ['shop:changed', 'gold:spend', 'mission:done', 'district:enter'].forEach(e => IST.bus.on(e, soon));
    document.addEventListener('visibilitychange', () => { if (document.hidden) upload(false, true); });
    // ilk açılışta bir kez Google ile giriş önerisi (geçilebilir; sonra 👤 Google hesabı menüsünden da yapılabilir)
    setTimeout(() => { if (gOn() && !S.g && !S.asked) { S.asked = 1; save(); panel.open(); } }, 2500);
    IST.cloud = { enabled: true, upload, google: { signIn: gSignIn, signOut: gSignOut, get user() { return S.g ? { email: S.g.email, name: S.g.name } : null; } } };
  });
})();
