/* Tek satırlık entegrasyon: index.html'e  <script src="modules/loader.js"></script>  eklemek yeterli.
   Ayarlar için bundan ÖNCE:  <script>window.IST_CONFIG={shop:{mock:false},cloud:{apiKey:'...',projectId:'...'}}</script> */
(function () {
  var cur = document.currentScript, base = cur ? cur.src.replace(/[^\/]*$/, '') : 'modules/';
  var files = ['core.js', 'districts.js', 'shop.js', 'economy.js', 'ads.js', 'cloud.js'], i = 0;
  function next() {
    if (i >= files.length) { if (window.IST) window.IST.boot(); return; }
    var s = document.createElement('script'); s.src = base + files[i++];
    s.onload = next; s.onerror = function () { console.error('[IST] yüklenemedi: ' + s.src); next(); };
    document.head.appendChild(s);
  }
  next();
})();
