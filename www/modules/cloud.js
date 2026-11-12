/* Bulut kaydı: oyunun bütün ilerlemesi (altın, arabalar, parçalar, mağaza, bölgeler, görevler) Firebase'e yedeklenir.
   Yeni telefonda / uygulama silinip kurulunca "kurtarma kodu" ile geri yüklenir. Ek paket yok: Firebase'in REST adresleri kullanılır.
   Ayar (index.html): window.IST_CONFIG.cloud = { apiKey: '...', projectId: '...' }  — boşken bulut kapalıdır, düğme görünmez.
   Firebase'de gerekenler ve güvenlik kuralları: ../../BULUT-KURULUM.md ve ../../firestore.rules */
(function () {
  'use strict';
  if (!window.IST) return;
  window.IST.register('cloud', function (IST) {
    const cfg = IST.cfg.cloud || {}, on = !!(cfg.apiKey && cfg.projectId);
    const store = IST.storage('ist-cloud'), S = store.load({ code: '', rt: '', last: 0, hash: '' });
    const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // karışan karakterler yok (0/O, 1/I)
    if (!S.code) { const a = new Uint32Array(20); crypto.getRandomValues(a); S.code = Array.from(a, n => ABC[n % 32]).join(''); store.save(S); }
    const save = () => store.save(S), fmt = c => c.match(/.{1,4}/g).join('-'), clean = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const SKIP = { 'ist-cloud': 1, 'ist-chat': 1 };   // bulut bilgisi ve eski sohbet ayarı yedeklenmez
    let tok = null, tokExp = 0, busy = false, restoring = false, err = '';

    /* ---------- Firebase: isimsiz giriş + belge okuma/yazma ---------- */
    async function auth() {
      if (tok && Date.now() < tokExp - 60000) return tok;
      let r = null;
      if (S.rt) r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + cfg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(S.rt) });
      if (r && r.ok) { const j = await r.json(); tok = j.id_token; S.rt = j.refresh_token; tokExp = Date.now() + (+j.expires_in || 3600) * 1000; save(); return tok; }
      r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + cfg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
      if (!r.ok) throw new Error('giriş ' + r.status);
      const j = await r.json(); tok = j.idToken; S.rt = j.refreshToken; tokExp = Date.now() + (+j.expiresIn || 3600) * 1000; save(); return tok;
    }
    const docUrl = c => 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(cfg.projectId) + '/databases/(default)/documents/saves/' + c;
    function snapshot() {
      try { if (typeof saveG === 'function') saveG(); } catch (e) {}
      const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('ist-') === 0 && !SKIP[k]) o[k] = localStorage.getItem(k); }
      return JSON.stringify(o);
    }
    const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };

    async function upload(force, leaving) {
      if (!on || busy || restoring) return false;
      const data = snapshot(), h = hash(data); if (!force && h === S.hash) return true;
      busy = true;
      try {
        const t = await auth();
        const r = await fetch(docUrl(S.code), { method: 'PATCH', keepalive: !!leaving && data.length < 60000, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
          body: JSON.stringify({ fields: { data: { stringValue: data }, ts: { integerValue: String(Date.now()) }, v: { integerValue: '1' } } }) });
        if (!r.ok) throw new Error('kayıt ' + r.status);
        S.hash = h; S.last = Date.now(); err = ''; save(); refresh(); return true;
      } catch (e) { err = 'Kaydedilemedi — internet bağlantısını kontrol et'; refresh(); return false; }
      finally { busy = false; }
    }
    async function restore(code) {
      const c = clean(code); if (c.length !== 20) { IST.toast('Kod 20 karakter olmalı'); return; }
      try {
        const t = await auth(), r = await fetch(docUrl(c), { headers: { Authorization: 'Bearer ' + t } });
        if (r.status === 404 || r.status === 403) { IST.toast('Bu koda ait kayıt bulunamadı'); return; }
        if (!r.ok) throw new Error('okuma ' + r.status);
        const j = await r.json(), o = JSON.parse(j.fields.data.stringValue);
        restoring = true; window.noSv = true;   // yeniden başlarken eski ilerleme geri yüklenenin üstüne yazılmasın
        Object.keys(localStorage).forEach(k => { if (k.indexOf('ist-') === 0 && !SKIP[k]) localStorage.removeItem(k); });
        Object.keys(o).forEach(k => { if (k.indexOf('ist-') === 0 && !SKIP[k]) localStorage.setItem(k, o[k]); });
        S.code = c; S.hash = ''; save();        // bu telefon artık aynı kayda yazmaya devam eder
        IST.toast('İlerleme geri yüklendi, oyun yeniden başlıyor…'); location.reload();
      } catch (e) { restoring = false; IST.toast('Geri yüklenemedi — internet bağlantısını kontrol et'); }
    }

    /* ---------- arayüz ---------- */
    const panel = IST.ui.panel('ist-cloud', '☁ Bulut kaydı');
    let sure = false;
    panel.onOpen = () => { sure = false; refresh(); upload(false); };
    function refresh() {
      const b = panel.body; if (!b || !panel.isOpen) return; b.textContent = '';
      const p = document.createElement('small'); p.textContent = 'İlerlemen (altın, arabalar, parçalar, bölgeler, görevler) otomatik olarak internete yedeklenir. Telefon değiştirirsen ya da oyunu silip yeniden kurarsan aşağıdaki kodla geri yükleyebilirsin.'; b.appendChild(p);
      const st = document.createElement('div'); st.className = 'ist-row'; const sd = document.createElement('div');
      sd.textContent = err ? '⚠ ' + err : S.last ? '✅ Son yedek: ' + new Date(S.last).toLocaleString('tr-TR') : '⏳ Henüz yedeklenmedi';
      const sb = document.createElement('button'); sb.className = 'ist-btn'; sb.textContent = busy ? 'Kaydediliyor…' : 'Şimdi yedekle'; sb.disabled = busy;
      sb.onclick = async () => { sb.disabled = true; sb.textContent = 'Kaydediliyor…'; const ok = await upload(true); IST.toast(ok ? '☁ Yedeklendi' : 'Yedeklenemedi'); };
      st.append(sd, sb); b.appendChild(st);
      // kurtarma kodu
      const cr = document.createElement('div'); cr.className = 'ist-row'; const cd = document.createElement('div');
      const cn = document.createElement('small'); cn.textContent = 'Kurtarma kodun — bir yere not al, kimseyle paylaşma:';
      const cv = document.createElement('b'); cv.textContent = fmt(S.code); cv.style.cssText = 'font:700 18px monospace;letter-spacing:1px;user-select:all;-webkit-user-select:all';
      cd.append(cn, cv);
      const cp = document.createElement('button'); cp.className = 'ist-btn'; cp.textContent = 'Kopyala';
      cp.onclick = () => { const t = fmt(S.code); (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => IST.toast('Kod kopyalandı'), () => IST.toast('Kodu basılı tutup kopyalayabilirsin')); };
      cr.append(cd, cp); b.appendChild(cr);
      // geri yükleme
      const h = document.createElement('small'); h.textContent = 'Başka telefondaki ilerlemeni buraya getirmek için o telefondaki kodu gir:'; h.style.display = 'block'; h.style.marginTop = '10px'; b.appendChild(h);
      const rr = document.createElement('div'); rr.className = 'ist-row';
      const inp = document.createElement('input'); inp.className = 'ist-in'; inp.placeholder = 'XXXX-XXXX-XXXX-XXXX-XXXX'; inp.maxLength = 30; inp.setAttribute('aria-label', 'Kurtarma kodu'); inp.autocapitalize = 'characters';
      const rb = document.createElement('button'); rb.className = 'ist-btn'; rb.textContent = 'Geri yükle';
      rb.onclick = () => {
        if (clean(inp.value).length !== 20) return IST.toast('Kod 20 karakter olmalı');
        if (clean(inp.value) === S.code) return IST.toast('Bu zaten bu telefonun kodu');
        if (!sure) { sure = true; rb.textContent = 'Eminim, yükle'; rb.style.background = '#c62828'; IST.toast('Dikkat: bu telefondaki ilerleme, koddaki ilerlemeyle değiştirilecek'); return; }
        rb.disabled = true; restore(inp.value);
      };
      rr.append(inp, rb); b.appendChild(rr);
    }

    if (!on) { IST.cloud = { enabled: false }; return; }   // ayarlanmadıysa düğme ve otomatik yedek yok
    IST.ui.menuButton('bCloud', '☁ Bulut kaydı', () => panel.open());
    // otomatik yedek: açılıştan kısa süre sonra, her 90 sn'de bir (değişiklik varsa), satın alma/harcama sonrası ve uygulamadan çıkarken
    setTimeout(() => upload(false), 8000);
    setInterval(() => upload(false), 90000);
    let deb = null; const soon = () => { clearTimeout(deb); deb = setTimeout(() => upload(false), 3000); };
    ['shop:changed', 'gold:spend', 'mission:done', 'district:enter'].forEach(e => IST.bus.on(e, soon));
    document.addEventListener('visibilitychange', () => { if (document.hidden) upload(false, true); });
    IST.cloud = { enabled: true, upload, restore, get code() { return fmt(S.code); } };
  });
})();
