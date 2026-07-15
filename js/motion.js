/* ── TimMetal scroll reveal ──────────────────────────────────────
   Reveals elements tagged .tm-rise / .tm-stagger as they scroll into
   view. Progressive enhancement: we add .tm-motion to <html> up front
   so the hidden state (defined in styles.css) only ever applies when
   this script is running — no JS means the page is fully visible.

   window.TMMotion.scan() re-registers any newly injected targets, so
   JS-rendered content (products.js catalogue rows, product detail) can
   opt in after it renders. */
(function () {
  'use strict';

  document.documentElement.classList.add('tm-motion');

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var io = ('IntersectionObserver' in window) && new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  function scan() {
    var els = document.querySelectorAll('.tm-rise, .tm-stagger');
    Array.prototype.forEach.call(els, function (el) {
      if (el.dataset.tmSeen) return;
      el.dataset.tmSeen = '1';
      // No IO (or reduced motion): just show everything immediately.
      if (!io || reduce) { el.classList.add('is-in'); return; }
      io.observe(el);
    });
  }

  window.TMMotion = { scan: scan };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();
