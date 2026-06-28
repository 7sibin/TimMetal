/* ── TimMetal partial includes ───────────────────────────────────
   Single source of truth for shared chrome (nav, footer). Each page
   marks an insertion point with <div data-include="name"></div>; this
   script fetches /partials/<name>.html and replaces the placeholder
   with its contents. Root-absolute paths keep it working from any URL
   depth (/, /products, …). Requires the site to be served over HTTP
   (fetch does not work from file://). */
(function () {
  'use strict';

  function inject(el) {
    var name = el.getAttribute('data-include');
    return fetch('/partials/' + name + '.html')
      .then(function (res) {
        if (!res.ok) throw new Error('include "' + name + '" → ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        el.replaceWith(tpl.content);
      })
      .catch(function (err) { console.error('[include]', err); });
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    var slots = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
    Promise.all(slots.map(inject)).then(function () {
      // On pages without the hero pour, reveal the nav right away. On the
      // homepage the hero canvas owns the reveal, so leave it hidden.
      if (!document.getElementById('tm-canvas')) {
        var nav = document.getElementById('tm-nav');
        if (nav) { nav.style.opacity = '1'; nav.style.pointerEvents = 'auto'; }
      }
      document.dispatchEvent(new Event('partials:loaded'));
    });
  });
})();
