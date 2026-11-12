/* Türkçe küfür/argo filtresi (tarayıcı + Node). Sunucu tarafı filtre ASIL güvencedir; istemci yalnızca hızlı geri bildirim verir.
   Liste BAŞLANGIÇ düzeyindedir: sürekli genişletilmeli (WordFilter.extend veya server/extra-words.json). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else { root.WordFilter = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b' };
  const SYM = { '@': 'a', '$': 's', '€': 'e', '£': 'l', '|': 'i', '§': 's' };

  function normalize(s) {
    s = String(s == null ? '' : s).replace(/İ/g, 'i').replace(/I/g, 'i').toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '').replace(/ı/g, 'i');
    s = s.replace(/[@$€£|§]/g, c => SYM[c]);
    return s.replace(/([a-z])!(?=[a-z])/g, '$1i');
  }
  const collapse = t => t.replace(/(.)\1+/g, '$1');
  const leet = t => (/[a-z*]/.test(t) ? t.replace(/[0134578]/g, c => LEET[c]) : t);
  const prep = w => collapse(normalize(w));

  const SEV_E = new Set(), SEV_P = [], MILD_E = new Set(), MILD_P = [], ALLOW = new Set();
  function add(list, sev) {
    (list || []).forEach(w => {
      const t = prep(w); if (!t) return;
      if (sev === 'allow') ALLOW.add(t);
      else if (sev === 'severe') { if (t.length >= 5) SEV_P.push(t); else SEV_E.add(t); }
      else { if (t.length >= 5) MILD_P.push(t); else MILD_E.add(t); }
    });
  }
  /* Başlangıç listesi (kasten kısa tutuldu) */
  add(['amk', 'aq', 'amq', 'ibne', 'pust', 'orospu', 'pezevenk', 'yavsak', 'siktir', 'sikeyim', 'sikerim', 'sikim',
    'amcik', 'amina', 'yarrak', 'kahpe', 'gavat', 'serefsiz', 'gotunu', 'gotveren'], 'severe');
  add(['salak', 'aptal', 'gerizekali', 'dangalak', 'ahmak', 'budala', 'lanet', 'defol'], 'mild');
  add(['sikke', 'sikayet', 'sikinti', 'sikici'], 'allow');

  function lookup(tok) {
    let t = collapse(leet(tok));
    if (t.length < 2 || ALLOW.has(t)) return null;
    if (t.indexOf('*') >= 0) {                 // s*ktir gibi maskeleme denemeleri
      if (t.replace(/\*/g, '').length < 2 || t.length < 4) return null;
      const re = new RegExp('^' + t.split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.') + '$');
      for (const w of SEV_P) if (w.length >= t.length && re.test(w.slice(0, t.length))) return 'severe';
      for (const w of MILD_P) if (w.length >= t.length && re.test(w.slice(0, t.length))) return 'mild';
      return null;
    }
    if (SEV_E.has(t)) return 'severe';
    for (const w of SEV_P) if (t.startsWith(w)) return 'severe';
    if (MILD_E.has(t)) return 'mild';
    for (const w of MILD_P) if (t.startsWith(w)) return 'mild';
    return null;
  }

  function scan(text) {
    const toks = normalize(text).split(/[^a-z0-9*]+/).filter(Boolean), hits = [], rank = { severe: 2, mild: 1 };
    let sev = null, run = '';
    const consider = w => { const r = lookup(w); if (r) { hits.push(w); if (!sev || rank[r] > rank[sev]) sev = r; } };
    toks.forEach((t, i) => {
      consider(t);
      if (t.length === 1) run += t; else { if (run.length >= 3) consider(run); run = ''; }
      if (i + 1 < toks.length && t.length > 1 && (t.length <= 3 || toks[i + 1].length <= 3)) consider(t + toks[i + 1]);
    });
    if (run.length >= 3) consider(run);
    return { severity: sev, hits };
  }

  const URL_RE = /(https?:\/\/|www\.)\S+|\b[\w-]+\.(com|net|org|info|tr|io|me|gg|ly|xyz|app|co)\b\S*/gi;
  const MAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  const PHONE_RE = /(?:\+?\d[\s().-]?){10,}/g;

  function maskMild(t) {
    return t.replace(/[\p{L}\p{N}*@$|€£]+/gu, tok => (lookup(normalize(tok)) === 'mild' ? '*'.repeat(tok.length) : tok));
  }

  function sanitize(text, opts) {
    opts = opts || {}; const max = opts.maxLen || 140;
    let t = String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return { ok: false, reason: 'Boş mesaj' };
    if (t.length > max) t = t.slice(0, max);
    t = t.replace(MAIL_RE, '***').replace(URL_RE, '***').replace(PHONE_RE, '***').replace(/(.)\1{4,}/g, '$1$1$1$1');
    const letters = t.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
    if (letters.length > 8 && letters.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length / letters.length > 0.7) t = t.toLocaleLowerCase('tr-TR');
    const r = scan(t);
    if (r.severity === 'severe') return { ok: false, reason: 'Uygunsuz ifade kullanıldı', severity: 'severe' };
    let masked = false;
    if (r.severity === 'mild') {
      const m = maskMild(t); masked = m !== t; t = m;
      if (scan(t).severity) return { ok: false, reason: 'Uygunsuz ifade kullanıldı', severity: 'mild' };
    }
    return { ok: true, text: t, masked };
  }

  return {
    check: scan, sanitize, normalize,
    extend(o) { o = o || {}; add(o.severe, 'severe'); add(o.mild, 'mild'); add(o.allow, 'allow'); }
  };
});
