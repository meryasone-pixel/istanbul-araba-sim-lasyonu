/* Global sohbet istemcisi. Sunucu: ../../server (WebSocket). Metinler her zaman textContent ile yazılır (XSS yok).
   Ayar: window.IST_CONFIG = { chat: { url: 'wss://sunucum.com/chat', token: '', mock: false } } */
(function () {
  'use strict';
  if (!window.IST) return;
  window.IST.register('chat', function (IST) {
    const cfg = IST.cfg.chat || {}, store = IST.storage('ist-chat');
    const S = store.load({ consent: false, id: '', nick: '', blocked: [] });
    if (!S.id) { S.id = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2) + Date.now().toString(36)); store.save(S); }
    if (!S.nick) { S.nick = 'Sürücü' + (1000 + Math.floor(Math.random() * 9000)); store.save(S); }

    let ws = null, wait = 1000, status = 'kapalı', lastSend = 0, me = null, timer = null;
    const panel = IST.ui.panel('ist-chat', '💬 Sohbet');
    panel.onOpen = () => { render(); connect(); };
    panel.onClose = () => { clearTimeout(timer); if (ws) { try { ws.close(); } catch (e) {} ws = null; } status = 'kapalı'; };

    /* ---------- bağlantı ---------- */
    function connect() {
      if (!S.consent || ws) return;
      if (cfg.mock) return mock();
      if (!cfg.url) { setStatus('Sohbet sunucusu ayarlanmamış'); return; }
      setStatus('bağlanıyor…');
      try { ws = new WebSocket(cfg.url); } catch (e) { return retry(); }
      ws.onopen = () => { wait = 1000; ws.send(JSON.stringify({ t: 'hello', id: S.id, nick: S.nick, token: cfg.token || '', v: 1 })); };
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onServer(m); };
      ws.onclose = () => { ws = null; if (panel.isOpen) retry(); };
      ws.onerror = () => {};
    }
    function retry() { setStatus('yeniden bağlanıyor…'); clearTimeout(timer); timer = setTimeout(connect, wait); wait = Math.min(wait * 2, 30000); }
    function mock() {                       // sunucusuz deneme modu: yalnızca yerel yankı
      status = 'deneme modu (yerel)'; me = { uid: 'local', nick: S.nick }; ws = { send: raw => { const m = JSON.parse(raw); if (m.t === 'msg') onServer({ t: 'msg', mid: 'x' + Date.now(), uid: 'local', nick: S.nick, text: m.text, ts: Date.now() }); }, close() {} };
      setStatus(status);
    }
    function onServer(m) {
      if (m.t === 'welcome') { me = m.you; setStatus('çevrimiçi'); (m.history || []).forEach(addMsg); }
      else if (m.t === 'msg') addMsg(m);
      else if (m.t === 'rej') sys('⚠ ' + m.reason);
      else if (m.t === 'muted') sys('🔇 ' + (m.reason || 'Susturuldun') + ' (' + Math.ceil((m.until - Date.now()) / 60000) + ' dk)');
      else if (m.t === 'sys') sys(m.text);
    }

    /* ---------- arayüz ---------- */
    let listEl = null, statEl = null;
    function setStatus(t) { status = t; if (statEl) statEl.textContent = '● ' + t; }
    function render() {
      const b = panel.body; b.textContent = '';
      if (!S.consent) return consentView(b);
      statEl = document.createElement('small'); b.appendChild(statEl); setStatus(status);
      const nickRow = document.createElement('div'); nickRow.className = 'ist-row';
      const ni = document.createElement('input'); ni.className = 'ist-in'; ni.maxLength = 16; ni.value = S.nick; ni.setAttribute('aria-label', 'Takma ad');
      const nb = document.createElement('button'); nb.className = 'ist-btn'; nb.textContent = 'Kaydet';
      nb.onclick = () => { const r = window.WordFilter.sanitize(ni.value, { maxLen: 16 }); if (!r.ok || r.masked || r.text.length < 2) { IST.toast('Bu takma ad uygun değil'); return; } S.nick = r.text; store.save(S); IST.toast('Takma ad kaydedildi (sonraki bağlantıda geçerli)'); };
      nickRow.append(ni, nb); b.appendChild(nickRow);
      listEl = document.createElement('div'); listEl.className = 'ist-msgs'; b.appendChild(listEl);
      const row = document.createElement('div'); row.className = 'ist-row';
      const inp = document.createElement('input'); inp.className = 'ist-in'; inp.maxLength = 140; inp.placeholder = 'Mesaj yaz…'; inp.setAttribute('aria-label', 'Mesaj');
      const sb = document.createElement('button'); sb.className = 'ist-btn'; sb.textContent = 'Gönder';
      const send = () => {
        const now = Date.now(); if (now - lastSend < 1200) return IST.toast('Biraz yavaş…');
        const r = window.WordFilter.sanitize(inp.value, { maxLen: 140 });
        if (!r.ok) return IST.toast('⚠ ' + r.reason);
        if (!ws || (ws.readyState !== undefined && ws.readyState !== 1)) return IST.toast('Bağlı değil');
        ws.send(JSON.stringify({ t: 'msg', text: r.text })); lastSend = now; inp.value = '';
      };
      sb.onclick = send; inp.onkeydown = e => { if (e.key === 'Enter') send(); };
      row.append(inp, sb); b.appendChild(row);
      const rules = document.createElement('small'); rules.textContent = 'Nazik ol. Küfür, hakaret, kişisel bilgi ve bağlantı paylaşımı yasaktır. Rahatsız edici mesajı ⚑ ile bildir.'; b.appendChild(rules);
    }
    function consentView(b) {
      const p = document.createElement('p'); p.textContent = 'Sohbet, internet üzerinden diğer oyuncularla yazışmanı sağlar. Mesajlar filtrelenir ve moderasyona tabidir. Kişisel bilgi (ad, telefon, adres, sosyal medya) paylaşma.'; b.appendChild(p);
      const lab = document.createElement('label'); const cb = document.createElement('input'); cb.type = 'checkbox';
      lab.append(cb, document.createTextNode(' 13 yaşından büyüğüm ve kuralları kabul ediyorum')); b.appendChild(lab);
      const go = document.createElement('button'); go.className = 'ist-btn'; go.style.marginTop = '10px'; go.textContent = 'Sohbete gir';
      go.onclick = () => { if (!cb.checked) return IST.toast('Önce onay kutusunu işaretle'); S.consent = true; store.save(S); render(); connect(); };
      b.appendChild(document.createElement('br')); b.appendChild(go);
    }
    function sys(t) { if (!listEl) return; const d = document.createElement('div'); d.className = 'ist-msg'; const i = document.createElement('i'); i.textContent = t; d.appendChild(i); listEl.appendChild(d); listEl.scrollTop = listEl.scrollHeight; }
    function addMsg(m) {
      if (!listEl || S.blocked.indexOf(m.uid) >= 0) return;
      const d = document.createElement('div'); d.className = 'ist-msg';
      const n = document.createElement('b'); n.textContent = m.nick + ': '; d.appendChild(n);
      d.appendChild(document.createTextNode(m.text));
      if (me && m.uid !== me.uid) {
        const rp = document.createElement('button'); rp.textContent = ' ⚑'; rp.title = 'Bildir'; rp.setAttribute('aria-label', 'Bildir');
        rp.style.cssText = 'background:none;border:0;color:#ffb74d;font:inherit';
        rp.onclick = () => { if (ws) ws.send(JSON.stringify({ t: 'report', mid: m.mid, reason: 'kullanıcı bildirimi' })); rp.disabled = true; };
        const bl = document.createElement('button'); bl.textContent = ' 🚫'; bl.title = 'Engelle'; bl.setAttribute('aria-label', 'Engelle');
        bl.style.cssText = 'background:none;border:0;color:#ef9a9a;font:inherit';
        bl.onclick = () => { S.blocked.push(m.uid); store.save(S); IST.toast(m.nick + ' engellendi'); d.remove(); };
        d.append(rp, bl);
      }
      listEl.appendChild(d); while (listEl.children.length > 120) listEl.removeChild(listEl.firstChild); listEl.scrollTop = listEl.scrollHeight;
    }

    IST.ui.menuButton('bChat', '💬 Sohbet', () => panel.open());
    IST.chat = { open: () => panel.open(), unblockAll: () => { S.blocked = []; store.save(S); } };
  });
})();
