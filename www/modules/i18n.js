/* Dil: Türkçe (asıl) + İngilizce. Oyunun kodundaki yazılara dokunmaz; ekrana çıkan Türkçe yazıyı İngilizcesiyle değiştirir.
   Dil seçimi: Ayarlar → 🌐 düğmesi (kaydedilir). İlk açılışta telefonun dili Türkçe değilse İngilizce başlar.
   Türkçe seçiliyken hiçbir şey çalışmaz (oyun eskisi gibi). */
(function () {
  var KEY = 'ist-lang', lang;
  try { lang = localStorage.getItem(KEY); } catch (e) {}
  if (lang !== 'tr' && lang !== 'en') lang = /^tr/i.test(navigator.language || 'tr') ? 'tr' : 'en';
  var IST = window.IST = window.IST || {};
  IST.lang = lang;
  IST.setLang = function (l) { try { localStorage.setItem(KEY, l); } catch (e) {} location.reload(); };
  function langBtn() { var b = document.getElementById('lang'); if (!b) return; b.textContent = lang === 'en' ? '🌐 Türkçe' : '🌐 English'; b.onclick = function () { IST.setLang(lang === 'en' ? 'tr' : 'en'); }; }
  if (document.body) langBtn(); else document.addEventListener('DOMContentLoaded', langBtn);
  if (lang !== 'en') return;
  document.documentElement.lang = 'en';

  var D = window.IST_EN || {}, P = window.IST_EN_RX || [], W = window.IST_EN_W || [];
  var TR = /[A-Za-zÇĞİÖŞÜçğıöşü]/, cache = new Map(), miss = window.__miss = new Set();
  function tr(s) {
    if (!TR.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), t = m[2], r = D[t];
    if (r === undefined) for (var i = 0; i < P.length; i++) { if (P[i][0].test(t)) { r = t.replace(P[i][0], P[i][1]); break; } }
    if (r === undefined) { r = t; for (var j = 0; j < W.length; j++) r = r.replace(W[j][0], W[j][1]); if (/[çğıöşüÇĞİÖŞÜ]/.test(r)) miss.add(t); }
    r = m[1] + r + m[3];
    if (cache.size > 3000) cache.clear();
    cache.set(s, r); cache.set(r, r);
    return r;
  }
  IST.t = tr;
  function node(n) {
    if (n.nodeType === 3) { var p = n.parentNode; if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return; var v = n.data, r = tr(v); if (r !== v) n.data = r; return; }
    if (n.nodeType !== 1 || n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE' || n.nodeName === 'CANVAS') return;
    ['title', 'aria-label', 'placeholder'].forEach(function (a) { var v = n.getAttribute(a); if (v) { var r = tr(v); if (r !== v) n.setAttribute(a, r); } });
    for (var c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  function start() {
    node(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') node(m.target);
        else for (var k = 0; k < m.addedNodes.length; k++) node(m.addedNodes[k]);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  /* tarayıcı pencereleri (onay kutusu) */
  var cf = window.confirm, al = window.alert;
  window.confirm = function (s) { return cf.call(window, tr(String(s))); };
  window.alert = function (s) { return al.call(window, tr(String(s))); };
})();
