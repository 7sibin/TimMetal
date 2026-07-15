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
    // no-cache: always revalidate the partial so an edited nav/footer is
    // picked up immediately instead of a stale cached copy (fetch() reuses
    // heuristically-fresh cache entries that a page reload would revalidate).
    return fetch('/partials/' + name + '.html', { cache: 'no-cache' })
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

  // Mark the nav link for the current page as active. Only real subpage
  // routes qualify (/products, /products/<slug>, /about); the wordmark
  // and in-page anchor links (/#…) resolve to "/" and are never marked.
  function markActiveNav() {
    var nav = document.getElementById('tm-nav');
    if (!nav) return;
    // Normalise so it matches whether served clean (/about, on Vercel) or
    // as a file (/about.html, e.g. a plain local server).
    var path = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '');
    path = path.replace(/\/+$/, '') || '/';
    var links = nav.querySelectorAll('a[href]');
    Array.prototype.forEach.call(links, function (a) {
      var linkPath = a.pathname.replace(/\/+$/, '') || '/';
      if (linkPath === '/') return;
      if (path === linkPath || path.indexOf(linkPath + '/') === 0) {
        a.classList.add('tm-nav-active');
        a.style.color = 'var(--tm-ink)';
      }
    });
  }

  // Hamburger toggle for the mobile nav (≤640px). The panel and button
  // live in the nav partial; styles.css handles the show/hide. Here we
  // just flip .is-open + aria-expanded, and close on link click, Escape,
  // or an outside tap so navigation feels natural.
  function wireMobileNav() {
    var toggle = document.getElementById('tm-nav-toggle');
    var menu = document.getElementById('tm-nav-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
  }

  // Flip the fixed nav to light text whenever a dark (#141414) section — the
  // RFQ block / page footer — sits behind it, so the dark mono links never
  // vanish against the dark ground. Toggles .tm-nav-invert; styles.css does
  // the recolouring.
  function watchNavTheme() {
    var nav = document.getElementById('tm-nav');
    if (!nav) return;
    var darks = document.querySelectorAll('[style*="background:#141414"]');
    if (!darks.length) return;

    var ticking = false;
    function update() {
      ticking = false;
      var line = (nav.offsetHeight || 68) / 2;   // nav's vertical midline
      var onDark = false;
      for (var i = 0; i < darks.length; i++) {
        var r = darks[i].getBoundingClientRect();
        if (r.top <= line && r.bottom >= line) { onDark = true; break; }
      }
      nav.classList.toggle('tm-nav-invert', onDark);
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
  }

  ready(function () {
    var slots = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
    Promise.all(slots.map(inject)).then(function () {
      markActiveNav();
      wireMobileNav();
      watchNavTheme();
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
