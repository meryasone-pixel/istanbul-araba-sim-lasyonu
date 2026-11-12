/* İstanbul Sürüş – modül çekirdeği: olay yolu, kayıt sistemi, ortak arayüz.
   Oyunun mevcut kodunu DEĞİŞTİRMEZ; yalnızca onun açık (global) fonksiyon/değişkenlerini okur. */
(function (g) {
  'use strict';
  const IST = g.IST = g.IST || {};
  IST.cfg = Object.assign({ chat: {}, shop: {}, districts: {} }, g.IST_CONFIG || {});

  /* ---- olay yolu ---- */
  const L = {};
  IST.bus = {
    on(e, f) { (L[e] = L[e] || []).push(f); return () => IST.bus.off(e, f); },
    off(e, f) { L[e] = (L[e] || []).filter(x => x !== f); },
    emit(e, d) { (L[e] || []).slice().forEach(f => { try { f(d); } catch (err) { console.error('[IST]', e, err); } }); }
  };

  /* ---- yerel kayıt ---- */
  IST.storage = key => ({
    load(def) { try { return Object.assign({}, def, JSON.parse(localStorage.getItem(key) || '{}')); } catch (e) { return Object.assign({}, def); } },
    save(v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  });

  IST.toast = t => { try { if (typeof msg === 'function') msg(t); } catch (e) {} };

  /* ---- altın (mevcut oyun parası G.money) ---- */
  let lastGold = null;
  IST.gold = {
    get() { return typeof G !== 'undefined' ? G.money : 0; },
    add(n) {
      if (typeof G === 'undefined') return false;
      if (G.money + n < 0) return false;
      G.money += n; lastGold = G.money;
      try { if (typeof mon !== 'undefined') mon.textContent = '💰 ' + G.money; } catch (e) {}
      try { if (typeof saveG === 'function') saveG(); } catch (e) {}
      return true;
    }
  };
  function watchGold() {          // oyunun kendi kazanç/harcamalarını dışarıdan izler
    setInterval(() => {
      if (typeof G === 'undefined') return;
      const m = G.money;
      if (lastGold === null) { lastGold = m; return; }
      const d = m - lastGold;
      if (d !== 0) { lastGold = m; IST.bus.emit(d > 0 ? 'gold:gain' : 'gold:spend', { amount: Math.abs(d) }); }
    }, 250);
  }

  /* ---- oyunu panel açıkken dondur ---- */
  IST.freeze = on => { try { if (typeof gOpen !== 'undefined') gOpen = !!on; } catch (e) {} };

  /* ---- arayüz yardımcıları ---- */
  let cssDone = false;
  function injectCss() {
    if (cssDone || typeof document === 'undefined') return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = '.ist-panel{position:fixed;top:0;right:0;bottom:0;width:min(52vw,480px);display:none;z-index:32;font:15px system-ui;color:#fff;background:#15153cee;overflow-y:auto;overscroll-behavior:contain;padding:12px 14px 30px}' +
      '.ist-panel h3{margin:0 0 8px;font-size:19px}.ist-x{position:absolute;right:10px;top:8px;border:0;border-radius:8px;background:#8a2b2b;color:#fff;padding:6px 10px;font:inherit}' +
      '.ist-row{display:flex;align-items:center;gap:8px;margin:6px 0;padding:8px;border-radius:10px;background:#ffffff14}.ist-row>div{flex:1}.ist-row small{opacity:.75;display:block}' +
      '.ist-btn{border:0;border-radius:9px;padding:8px 12px;background:#2b6cff;color:#fff;font:inherit}.ist-btn[disabled]{background:#555;opacity:.7}.ist-btn.ok{background:#2e7d32}' +
      '.ist-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.ist-tabs button{border:2px solid #555;border-radius:9px;padding:6px 10px;background:#33336a;color:#fff;font:inherit}.ist-tabs button.on{border-color:#ffd54a}' +
      '.ist-msgs{height:46vh;overflow-y:auto;background:#00000040;border-radius:10px;padding:6px;margin:6px 0}.ist-msg{margin:3px 0;word-break:break-word}.ist-msg b{color:#9fd3ff}.ist-msg i{opacity:.6;font-size:12px}' +
      '.ist-in{width:100%;box-sizing:border-box;padding:10px;border-radius:9px;border:0;font:inherit}';
    document.head.appendChild(s);
  }
  IST.ui = {
    panel(id, title) {
      injectCss();
      const el = document.createElement('div'); el.id = id; el.className = 'ist-panel';
      el.innerHTML = '<button class="ist-x" aria-label="Kapat">✕</button><h3></h3><div class="ist-body"></div>';
      el.querySelector('h3').textContent = title;
      document.body.appendChild(el);
      const api = {
        el, body: el.querySelector('.ist-body'), isOpen: false, onClose: null, onOpen: null,
        open() { api.isOpen = true; el.style.display = 'block'; IST.freeze(true); if (api.onOpen) api.onOpen(); },
        close() { api.isOpen = false; el.style.display = 'none'; IST.freeze(false); if (api.onClose) api.onClose(); }
      };
      el.querySelector('.ist-x').onclick = api.close;
      return api;
    },
    /* oyun içi ☰ menüsüne (ve yoksa sayfaya) düğme ekler */
    menuButton(id, label, fn) {
      const b = document.createElement('button'); b.id = id; b.className = 'tb'; b.textContent = label; b.onclick = fn;
      const anchor = document.getElementById('bG');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor); else document.body.appendChild(b);
      return b;
    },
    esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  };

  /* ---- modül kaydı ---- */
  const mods = [];
  IST.register = (name, init) => mods.push({ name, init });
  IST.boot = () => {
    injectCss();
    mods.forEach(m => { try { m.init(IST); } catch (e) { console.error('[IST] modül başlatılamadı:', m.name, e); } });
    watchGold();
    IST.bus.emit('ready');
  };
})(typeof window !== 'undefined' ? window : globalThis);
