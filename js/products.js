/* ── TimMetal products ───────────────────────────────────────────
   One script, two pages, one data source (/products.json):

     • /products            → catalogue (products.html, #tm-catalog-list)
                              renders each product as a link to its route.
     • /products/<slug>     → detail   (product.html, #tm-detail-root)
                              renders the single product matched by the
                              slug in the URL.

   Edit products in /products.json — names, copy, specs, capacities —
   that is the single source of truth. Translatable prose fields there are
   bilingual objects ({en, sr}); pick() selects the active language and
   plain strings (codes/units) pass through unchanged. The `key` field
   doubles as the URL slug (e.g. /products/cheese-vat). The line-art icons
   below are presentation-only, keyed by `key`; a product with no matching
   icon shows an empty figure box. The view re-renders on tm:langchange. */
(function () {
  'use strict';

  // Inner SVG paths (viewBox 0 0 120 70), reused on catalogue + detail.
  var ICONS = {
    'cheese-vat': '<path d="M20 24 H100 V46 a14 14 0 0 1 -14 14 H34 a14 14 0 0 1 -14 -14 Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><line x1="60" y1="9" x2="60" y2="42" stroke="currentColor" stroke-width="1.6"/><line x1="47" y1="42" x2="73" y2="42" stroke="currentColor" stroke-width="1.6"/><line x1="22" y1="33" x2="98" y2="33" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 4"/>',
    'milk-tank': '<line x1="60" y1="4" x2="60" y2="12" stroke="currentColor" stroke-width="1.6"/><rect x="44" y="12" width="32" height="44" rx="7" stroke="currentColor" stroke-width="1.6"/><line x1="44" y1="24" x2="76" y2="24" stroke="currentColor" stroke-width="1.2"/><line x1="44" y1="44" x2="76" y2="44" stroke="currentColor" stroke-width="1.2"/><line x1="50" y1="56" x2="48" y2="66" stroke="currentColor" stroke-width="1.6"/><line x1="70" y1="56" x2="72" y2="66" stroke="currentColor" stroke-width="1.6"/>',
    'pre-press': '<path d="M16 16 H104 L90 52 H30 Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><line x1="34" y1="30" x2="86" y2="30" stroke="currentColor" stroke-width="1.2"/><rect x="46" y="34" width="12" height="12" stroke="currentColor" stroke-width="1.4"/><rect x="62" y="34" width="12" height="12" stroke="currentColor" stroke-width="1.4"/>',
    'press': '<line x1="34" y1="10" x2="34" y2="60" stroke="currentColor" stroke-width="1.6"/><line x1="86" y1="10" x2="86" y2="60" stroke="currentColor" stroke-width="1.6"/><line x1="30" y1="12" x2="90" y2="12" stroke="currentColor" stroke-width="1.6"/><line x1="60" y1="12" x2="60" y2="30" stroke="currentColor" stroke-width="1.6"/><rect x="46" y="30" width="28" height="12" stroke="currentColor" stroke-width="1.6"/><rect x="40" y="48" width="40" height="12" stroke="currentColor" stroke-width="1.4"/>'
  };

  var HAIR = 'rgba(20,23,26,0.14)';
  var MONO = "'Space Mono', monospace";

  // Pick the active-language variant of a bilingual field; pass plain
  // strings (codes/units) through unchanged.
  function pick(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      var l = (window.tmI18n && window.tmI18n.lang) || 'en';
      return (v[l] != null) ? v[l] : v.en;
    }
    return v;
  }
  function t(key, en) { return window.tmI18n ? window.tmI18n.t(key, en) : en; }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // The product's route, e.g. cheese-vat → /products/cheese-vat
  function routeOf(p) { return '/products/' + encodeURIComponent(p.key); }

  // A figure box with the product's line-art (or empty if no icon).
  function figure(p, height, svgWidth) {
    var inner = ICONS[p.key];
    var svg = inner
      ? '<svg width="' + svgWidth + '" viewBox="0 0 120 70" fill="none" style="color:#14171A; opacity:0.34;">' + inner + '</svg>'
      : '';
    return '<div style="position:relative; width:100%; height:' + height + '; border:1px solid ' + HAIR + '; background:#EFEAE0; display:flex; align-items:center; justify-content:center;">' +
      '<span style="position:absolute; top:12px; left:14px; font-family:' + MONO + '; font-size:10px; letter-spacing:0.18em; color:rgba(20,23,26,0.35);">FIG. ' + esc(p.num) + '</span>' +
      svg + '</div>';
  }

  function plainBox(label, height) {
    return '<div style="position:relative; width:100%; height:' + height + '; border:1px solid ' + HAIR + '; background:#EFEAE0;">' +
      '<span style="position:absolute; top:12px; left:14px; font-family:' + MONO + '; font-size:10px; letter-spacing:0.18em; color:rgba(20,23,26,0.35);">' + label + '</span></div>';
  }

  // ── Catalogue ──────────────────────────────────────────────────
  // Each row is an anchor to the product's own route.
  function catalogRow(p, i) {
    var reverse = (i % 2 === 1) ? ' flex-direction:row-reverse;' : '';
    var tags = (p.tags || []).map(function (tag) { return '<span>' + esc(pick(tag)) + '</span>'; }).join('');
    return '' +
      '<a href="' + routeOf(p) + '" class="tm-row tm-rise" style="display:flex; flex-wrap:wrap;' + reverse + ' gap:clamp(28px,4vw,64px); align-items:center; padding:clamp(36px,5.5vh,68px) 0; border-bottom:1px solid ' + HAIR + '; text-decoration:none; color:inherit;">' +
        '<div style="flex:1 1 380px; min-width:280px;">' + figure(p, 'clamp(240px,34vh,360px)', '42%') + '</div>' +
        '<div style="flex:1 1 380px; min-width:280px;">' +
          '<div style="display:flex; align-items:center; gap:14px; font-family:' + MONO + '; font-size:11px; letter-spacing:0.2em;"><span style="color:var(--tm-red);">' + esc(p.num) + '</span><span style="color:#76797e;">' + esc(pick(p.cat)) + '</span></div>' +
          '<h3 style="margin:16px 0 0; font-weight:800; font-size:clamp(28px,3.4vw,46px); line-height:1.0; letter-spacing:-0.025em;">' + esc(pick(p.name)) + '</h3>' +
          '<p style="margin:18px 0 0; max-width:46ch; font-size:clamp(14px,1.1vw,16px); line-height:1.62; color:#4a4e53;">' + esc(pick(p.blurb)) + '</p>' +
          '<div style="margin-top:24px; display:flex; flex-wrap:wrap; gap:26px; font-family:' + MONO + '; font-size:11px; letter-spacing:0.12em; color:#76797e;">' + tags + '</div>' +
          '<span class="tm-link" style="margin-top:26px; display:inline-flex; align-items:center; gap:9px; font-family:' + MONO + '; font-size:12px; letter-spacing:0.16em; color:#14171A;">' + t('products.view', 'View system') + ' <span class="tm-arrow">&rarr;</span></span>' +
        '</div>' +
      '</a>';
  }

  // ── Detail ─────────────────────────────────────────────────────
  function specRow(s) {
    return '' +
      '<div style="display:flex; justify-content:space-between; align-items:baseline; gap:20px; padding:14px 0; border-bottom:1px solid rgba(20,23,26,0.12);">' +
        '<span style="font-family:' + MONO + '; font-size:11px; letter-spacing:0.14em; color:#76797e; white-space:nowrap;">' + esc(pick(s.label)) + '</span>' +
        '<span style="font-weight:600; font-size:14px; color:#14171A; text-align:right;">' + esc(pick(s.value)) + '</span>' +
      '</div>';
  }

  function detailHTML(list, i) {
    var p = list[i];
    var prev = list[(i + list.length - 1) % list.length];
    var next = list[(i + 1) % list.length];
    return '' +
      '<div class="tm-rise" style="max-width:1200px; margin:0 auto;">' +

        '<a href="/products" class="tm-link" style="display:inline-flex; align-items:center; gap:10px; text-decoration:none; font-family:' + MONO + '; font-size:12px; letter-spacing:0.18em; color:#76797e;"><span>&larr;</span> ' + t('products.all', 'ALL SYSTEMS') + '</a>' +

        '<div style="margin-top:clamp(26px,4vh,46px); display:flex; align-items:center; gap:12px; font-family:' + MONO + '; font-size:12px; letter-spacing:0.2em;"><span style="width:28px; height:2px; background:var(--tm-red);"></span><span style="color:var(--tm-red);">' + esc(p.num) + '</span><span style="color:#76797e;">// ' + esc(pick(p.cat)) + '</span></div>' +
        '<h1 style="margin:18px 0 0; font-weight:800; font-size:clamp(38px,6vw,84px); line-height:0.96; letter-spacing:-0.03em; max-width:14ch; text-wrap:balance;">' + esc(pick(p.name)) + '</h1>' +
        '<p style="margin:18px 0 0; font-family:' + MONO + '; font-size:clamp(12px,1.1vw,14px); letter-spacing:0.06em; color:#4a4e53;">' + esc(pick(p.tagline)) + '</p>' +

        '<div style="margin-top:clamp(40px,6vh,72px); display:flex; flex-wrap:wrap; gap:clamp(36px,5vw,76px); align-items:flex-start;">' +

          '<div style="flex:1.4 1 460px; min-width:300px;">' +
            figure(p, 'clamp(300px,46vh,460px)', '44%') +
            '<div style="margin-top:14px; display:grid; grid-template-columns:repeat(3,1fr); gap:14px;">' +
              plainBox(t('products.detail', 'DETAIL'), 'clamp(90px,12vh,120px)') +
              plainBox(t('products.detail', 'DETAIL'), 'clamp(90px,12vh,120px)') +
              plainBox(t('products.detail', 'DETAIL'), 'clamp(90px,12vh,120px)') +
            '</div>' +
          '</div>' +

          '<div data-sticky-col style="flex:1 1 340px; min-width:280px;">' +
            '<p style="margin:0; font-size:clamp(15px,1.25vw,17px); line-height:1.66; color:#4a4e53;">' + esc(pick(p.desc)) + '</p>' +
            '<div style="margin-top:clamp(30px,4vh,44px); font-family:' + MONO + '; font-size:11px; letter-spacing:0.2em; color:var(--tm-red-deep);">' + t('products.specs', 'SPECIFICATIONS') + '</div>' +
            '<div style="margin-top:16px; border-top:1px solid rgba(20,23,26,0.14);">' + (p.specs || []).map(specRow).join('') + '</div>' +
            '<a href="/#rfq" class="tm-submit" style="margin-top:32px; display:inline-flex; align-items:center; gap:14px; padding:16px 30px; background:#14171A; border:1px solid #14171A; text-decoration:none; font-family:' + MONO + '; font-size:12px; letter-spacing:0.24em; color:#fff;">' + t('products.quote', 'REQUEST A QUOTE') + ' <span style="font-size:14px;">&rarr;</span></a>' +
            '<p style="margin:16px 0 0; font-size:12px; line-height:1.55; color:#9a9da1;">' + t('products.leadtime', 'Custom configurations available &middot; 4&ndash;8 week lead time.') + '</p>' +
          '</div>' +

        '</div>' +

        '<div style="margin-top:clamp(56px,9vh,110px); padding-top:clamp(28px,4vh,44px); border-top:1px solid rgba(20,23,26,0.14); display:flex; justify-content:space-between; gap:20px; flex-wrap:wrap;">' +
          '<a href="' + routeOf(prev) + '" class="tm-link" style="display:inline-flex; align-items:center; gap:12px; text-decoration:none; text-align:left; font-family:\'Archivo\', sans-serif; color:#14171A;"><span style="font-size:18px;">&larr;</span><span><span style="display:block; font-family:' + MONO + '; font-size:10px; letter-spacing:0.2em; color:#9a9da1;">' + t('products.prev', 'PREVIOUS') + '</span><span style="display:block; margin-top:4px; font-weight:800; font-size:18px; letter-spacing:-0.01em;">' + esc(pick(prev.name)) + '</span></span></a>' +
          '<a href="' + routeOf(next) + '" class="tm-link" style="display:inline-flex; align-items:center; gap:12px; text-decoration:none; text-align:right; font-family:\'Archivo\', sans-serif; color:#14171A;"><span><span style="display:block; font-family:' + MONO + '; font-size:10px; letter-spacing:0.2em; color:#9a9da1;">' + t('products.next', 'NEXT') + '</span><span style="display:block; margin-top:4px; font-weight:800; font-size:18px; letter-spacing:-0.01em;">' + esc(pick(next.name)) + '</span></span><span style="font-size:18px;">&rarr;</span></a>' +
        '</div>' +

      '</div>';
  }

  function notFoundHTML() {
    return '<div style="max-width:1200px; margin:0 auto;">' +
      '<a href="/products" class="tm-link" style="display:inline-flex; align-items:center; gap:10px; text-decoration:none; font-family:' + MONO + '; font-size:12px; letter-spacing:0.18em; color:#76797e;"><span>&larr;</span> ' + t('products.all', 'ALL SYSTEMS') + '</a>' +
      '<h1 style="margin:clamp(26px,4vh,46px) 0 0; font-weight:800; font-size:clamp(34px,5vw,64px); line-height:1.0; letter-spacing:-0.03em;">' + t('products.nf.title', 'System not found.') + '</h1>' +
      '<p style="margin:20px 0 0; font-size:clamp(15px,1.25vw,17px); color:#4a4e53;">' + t('products.nf.body', 'That product does not exist (or was renamed). Browse the full catalogue instead.') + '</p>' +
      '</div>';
  }

  // Slug priority: ?system= (handy for local testing without rewrites),
  // then the last path segment (/products/<slug> on Vercel).
  function getSlug() {
    var q = new URLSearchParams(location.search).get('system');
    if (q) return q;
    var seg = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop() || '');
    if (seg && seg !== 'product' && seg !== 'product.html' && seg !== 'products' && seg !== 'products.html') {
      return seg;
    }
    return null;
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function () {
    var catalogList = document.getElementById('tm-catalog-list');
    var detailRoot = document.getElementById('tm-detail-root');
    if (!catalogList && !detailRoot) return;

    var PRODUCTS = null;

    function render() {
      if (!PRODUCTS) return;
      if (catalogList) {
        catalogList.innerHTML = PRODUCTS.map(catalogRow).join('');
      }
      if (detailRoot) {
        var slug = getSlug();
        var i = -1;
        for (var k = 0; k < PRODUCTS.length; k++) {
          if (PRODUCTS[k].key === slug) { i = k; break; }
        }
        if (i === -1) {
          detailRoot.innerHTML = notFoundHTML();
        } else {
          detailRoot.innerHTML = detailHTML(PRODUCTS, i);
          document.title = pick(PRODUCTS[i].name) + ' — TimMetal';
        }
      }
      // Register the freshly injected rows / detail with the reveal observer.
      if (window.TMMotion) window.TMMotion.scan();
    }

    fetch('/products.json')
      .then(function (res) {
        if (!res.ok) throw new Error('products.json → ' + res.status);
        return res.json();
      })
      .then(function (data) {
        PRODUCTS = data;
        // Render once i18n has resolved so labels use the active language.
        (window.tmI18n ? window.tmI18n.ready : Promise.resolve()).then(render);
      })
      .catch(function (err) { console.error('[products]', err); });

    // Re-render when the language changes.
    document.addEventListener('tm:langchange', render);
  });
})();
