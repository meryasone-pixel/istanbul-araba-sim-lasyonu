/* EconomyManager: günlük giriş ödülü + seri (7 günlük döngü). Rakamlar görev ödülleriyle (60-100 altın) uyumlu; seri kopunca ceza/ücret yok;
   7. gün altın yerine özel korna (Melodi) verir. Gerçek para yönlendirmesi ve ücretli seri koruma YOKTUR.
   Oyunun kodunu DEĞİŞTİRMEZ; yalnızca IST.gold / IST.ui / IST.shop kullanır. */
(function () {
  'use strict';
  if (!window.IST) return;
  window.IST.register('economy', function (IST) {
    const store = IST.storage('ist-economy');
    const E = store.load({ last: '', streak: 0, total: 0 });
    const save = () => store.save(E);
    const REW = [20, 30, 40, 50, 60, 80, 150];             // 1..7. gün altın ödülü (7. gün: özel korna yoksa 150 altın)
    const GIFT = 'hn_melody';                               // 7. gün hediyesi (özel korna)
    const giftOpen = () => !!(IST.shop && IST.shop.giveItem && IST.shop.owned && !IST.shop.owned(GIFT));

    const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const today = () => fmt(new Date());
    const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fmt(d); };
    const gap = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
    const vip = () => !!(IST.shop && IST.shop.isVip && IST.shop.isVip());
    const reward = n => Math.round(REW[n - 1] * (vip() ? 1.5 : 1));

    /* durum: ready = bugünün ödülü alınabilir; broken = seri kopmuş (yeni seri 1. günden başlar, ceza yok); next = alınacak gün numarası */
    function state() {
      if (!E.last) return { ready: true, next: 1, broken: false };
      const g = gap(E.last, today());
      if (g <= 0) return { ready: false, next: (E.streak % 7) + 1, broken: false };   // bugün alındı (veya saat geri alındı)
      if (g === 1) return { ready: true, next: (E.streak % 7) + 1, broken: false };
      return { ready: true, next: 1, broken: E.streak > 0 };
    }
    function claim() {
      const s = state(); if (!s.ready) return false;
      if (s.next === 7 && giftOpen()) {
        if (!IST.shop.giveItem(GIFT)) return false;
        E.streak = 7; E.last = today(); E.total++; save(); IST.toast('🎁 7. gün hediyesi: Melodi kornası! (Mağaza → Korna)'); return true;
      }
      const r = reward(s.next);
      if (!IST.gold.add(r)) { IST.toast('Ödül eklenemedi'); return false; }
      E.streak = s.next; E.last = today(); E.total++; save();
      IST.toast('🎁 Günlük ödül +' + r + ' altın · seri ' + E.streak + '. gün'); return true;
    }
    const panel = IST.ui.panel('ist-daily', '🎁 Günlük Ödül');
    panel.onOpen = refresh;
    let btn = null;
    function label() { if (btn) btn.textContent = state().ready ? '🎁 Günlük ●' : '🎁 Günlük'; }
    function refresh() {
      label();
      const b = panel.body; if (!b || !panel.isOpen) return; b.textContent = '';
      const s = state();
      const info = document.createElement('small');
      info.textContent = s.broken ? 'Yeni bir seri başlıyor 🙂 1. günden devam.' : '🔥 Seri: ' + E.streak + ' gün • 7. günde özel korna seni bekliyor'; b.appendChild(info);
      for (let n = 1; n <= 7; n++) {
        const row = document.createElement('div'), t = document.createElement('div'), nm = document.createElement('b'), sm = document.createElement('small');
        row.className = 'ist-row'; nm.textContent = n + '. gün' + (n === 7 ? ' 🎉' : ''); sm.textContent = n === 7 && giftOpen() ? '🎵 Özel korna: Melodi' : '+' + reward(n) + ' altın'; t.append(nm, sm); row.appendChild(t);
        const done = n <= (s.broken ? 0 : s.ready ? s.next - 1 : E.streak);
        const cur = s.ready && n === s.next;
        const bt = document.createElement('button'); bt.className = 'ist-btn' + (done ? ' ok' : '');
        bt.textContent = done ? '✓' : cur ? 'Al' : '🔒'; bt.disabled = !cur;
        if (cur) bt.onclick = () => { claim(); refresh(); };
        row.appendChild(bt); b.appendChild(row);
      }
    }
    btn = IST.ui.menuButton('bDaily', '🎁 Günlük', () => panel.open());
    label();
    IST.bus.on('ready', () => setTimeout(() => { label(); if (state().ready) IST.toast('🎁 Günlük ödülün hazır! Ana ekrandaki 🎁 Günlük düğmesinden al'); }, 3000));
    IST.economy = { state, claim, progress: E };
  });
})();
