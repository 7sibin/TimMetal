/* ── TimMetal runtime i18n ───────────────────────────────────────
   English lives inline in the HTML (source of truth). Only other
   languages ship as dictionaries in /i18n/<lang>.json. This script
   resolves the active language (?lang → localStorage → 'en'), swaps
   [data-i18n] / [data-i18n-html] / [data-i18n-attr] nodes against the
   dictionary, caches the original English so switching back is lossless,
   exposes window.tmI18n for JS-built DOM (products.js, the home inline
   script), re-applies after the nav/footer partials load, and emits
   'tm:langchange' on switch. No build step; served over HTTP. */
(function () {
  'use strict';

  var SUPPORTED = ['en', 'sr'];   // add 'de','ru' here + a /i18n/<code>.json
  var DEFAULT = 'en';
  var STORE_KEY = 'tm-lang';

  function resolveLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && SUPPORTED.indexOf(q) !== -1) {
      try { localStorage.setItem(STORE_KEY, q); } catch (e) {}
      return q;
    }
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    return DEFAULT;
  }

  var lang = resolveLang();
  var dict = {};
  var warned = {};

  function translate(key) {
    if (lang === DEFAULT) return null;                 // english = cached inline
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    if (!warned[key]) { warned[key] = 1; console.warn('[i18n] missing "' + lang + '" key: ' + key); }
    return null;
  }

  function applyText(el) {
    if (el.__i18nText === undefined) el.__i18nText = el.textContent;
    var v = translate(el.getAttribute('data-i18n'));
    el.textContent = (v == null) ? el.__i18nText : v;
  }
  function applyHtml(el) {
    if (el.__i18nHtml === undefined) el.__i18nHtml = el.innerHTML;
    var v = translate(el.getAttribute('data-i18n-html'));
    el.innerHTML = (v == null) ? el.__i18nHtml : v;
  }
  function applyAttr(el) {
    el.__i18nAttr = el.__i18nAttr || {};
    el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
      var idx = pair.indexOf(':');
      if (idx === -1) return;
      var attr = pair.slice(0, idx).trim();
      var key = pair.slice(idx + 1).trim();
      if (el.__i18nAttr[attr] === undefined) el.__i18nAttr[attr] = el.getAttribute(attr);
      var v = translate(key);
      el.setAttribute(attr, (v == null) ? el.__i18nAttr[attr] : v);
    });
  }

  function apply(root) {
    root = root || document;
    Array.prototype.forEach.call(root.querySelectorAll('[data-i18n]'), applyText);
    Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-html]'), applyHtml);
    Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-attr]'), applyAttr);
    markSwitcher();
  }

  function t(key, enFallback) {
    var v = translate(key);
    return (v == null) ? enFallback : v;
  }

  function markSwitcher() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang-btn]'), function (b) {
      var on = b.getAttribute('data-lang-btn') === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function loadDict() {
    if (lang === DEFAULT) { dict = {}; return Promise.resolve(dict); }
    return fetch('/i18n/' + lang + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('i18n ' + lang + ' → ' + r.status); return r.json(); })
      .then(function (json) { dict = json || {}; return dict; })
      .catch(function (err) { console.error('[i18n]', err); dict = {}; return dict; });
  }

  function setLang(next) {
    if (SUPPORTED.indexOf(next) === -1 || next === lang) { markSwitcher(); return; }
    lang = next;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    document.documentElement.lang = lang;
    try {
      var u = new URL(location.href);
      if (lang === DEFAULT) u.searchParams.delete('lang'); else u.searchParams.set('lang', lang);
      history.replaceState(null, '', u);
    } catch (e) {}
    loadDict().then(function () {
      apply(document);
      document.dispatchEvent(new Event('tm:langchange'));
    });
  }

  // Click delegation — works on the async-injected nav switcher.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-lang-btn]');
    if (!btn) return;
    e.preventDefault();
    setLang(btn.getAttribute('data-lang-btn'));
  });

  document.documentElement.lang = lang;

  window.tmI18n = {
    get lang() { return lang; },
    t: t, apply: apply, setLang: setLang, ready: null
  };

  var dictPromise = loadDict();
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  window.tmI18n.ready = dictPromise.then(function () { ready(function () { apply(document); }); });
  document.addEventListener('partials:loaded', function () { dictPromise.then(function () { apply(document); }); });
})();
