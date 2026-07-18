/* ── TimMetal hero — "scroll to pour" milk animation ──────────────
   Canvas paints the entire reveal: warm-black ground, ghost steel
   wordmark, creamy milk that fills from the bottom on a soft scroll
   lock, and the wordmark inverting to dark steel wherever the fluid
   has reached. Ported from the Claude Design prototype to vanilla JS. */
(function () {
  'use strict';

  var canvas  = document.getElementById('tm-canvas');
  var tagline = document.getElementById('tm-tagline');
  var nav     = document.getElementById('tm-nav');
  var hint    = document.getElementById('tm-hint');
  if (!canvas) return;

  var Hero = {
    // ---- animation state ----
    p: 0,            // displayed fill level 0..1 (eased)
    lastP: 0,        // previous frame's level (for fill speed)
    t: 0,            // wave clock
    amp: 0,          // current surface amplitude (px)
    complete: false,
    scrollAccum: 0,  // progress contributed by user scroll (monotonic)
    bubbles: [],
    start: null,
    fontReady: false,

    init: function () {
      var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.DURATION = reduce ? 700 : 2800; // auto-pour length (ms)

      this.setup();

      // Play the pour only on the first landing of a browser session. When the
      // visitor returns to the homepage (e.g. via the nav logo) we skip straight
      // to the finished frame so they never sit through the animation again.
      var seen = false;
      try { seen = sessionStorage.getItem('tm-hero-seen') === '1'; } catch (e) {}
      if (seen) { this.skip(); return; }

      // ---- listeners ----
      var self = this;
      this.onResize = function () { self.setup(); if (self.complete) self.draw(0); };
      addEventListener('resize', this.onResize);

      // Soft scroll lock: never block the user, just convert downward intent into pour speed.
      this.onWheel = function (e) {
        if (self.complete) return;
        e.preventDefault();
        self.scrollAccum += Math.max(0, e.deltaY) * 0.00075;
        self.hideHint();
      };
      addEventListener('wheel', this.onWheel, { passive: false });

      this.lastTouch = null;
      this.onTouchStart = function (e) { self.lastTouch = e.touches[0].clientY; };
      this.onTouchMove = function (e) {
        if (self.complete) return;
        e.preventDefault();
        var y = e.touches[0].clientY;
        if (self.lastTouch != null) {
          var dy = self.lastTouch - y;             // positive = pulling up = pour faster
          self.scrollAccum += Math.max(0, dy) * 0.0016;
        }
        self.lastTouch = y;
        self.hideHint();
      };
      addEventListener('touchstart', this.onTouchStart, { passive: false });
      addEventListener('touchmove', this.onTouchMove, { passive: false });

      this.onKey = function (e) {
        if (self.complete) return;
        if (['ArrowDown', 'PageDown', ' ', 'Spacebar'].indexOf(e.key) !== -1) {
          e.preventDefault();
          self.scrollAccum += 0.09;
          self.hideHint();
        }
      };
      addEventListener('keydown', this.onKey, { passive: false });

      // Hold the page during the brief pour; released the instant it completes.
      this.prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Make sure the heavy wordmark is loaded before measuring/drawing it on canvas.
      if (document.fonts && document.fonts.load) {
        document.fonts.load('900 120px Archivo').then(function () {
          self.fontReady = true; self.setup();
        });
      }

      this.loop = this.loop.bind(this);
      this.raf = requestAnimationFrame(this.loop);
    },

    hideHint: function () { if (hint) hint.style.opacity = '0'; },

    // Fast-forward to the completed state without animating — used on repeat
    // visits within a session. Paints the frozen "full" frame and reveals the
    // same chrome finish() would, but never locks scroll or binds pour input.
    skip: function () {
      var self = this;
      this.complete = true;
      this.p = 1; this.lastP = 1; this.amp = 0;
      this.draw(0);

      // Keep the frozen frame crisp once the heavy wordmark loads, and on resize.
      if (document.fonts && document.fonts.load) {
        document.fonts.load('900 120px Archivo').then(function () {
          self.fontReady = true; self.setup(); self.draw(0);
        });
      }
      addEventListener('resize', function () { self.setup(); self.draw(0); });

      // Reveal the nav/tagline the pour would normally unveil. The nav is
      // injected asynchronously by include.js, so reveal now if it's already
      // present and again once the partials land.
      function reveal() {
        var navEl = document.getElementById('tm-nav');
        if (navEl) navEl.style.opacity = '1';
        if (tagline) { tagline.style.opacity = '1'; tagline.style.transform = 'translateY(0)'; }
        if (hint) hint.style.opacity = '0';
      }
      reveal();
      document.addEventListener('partials:loaded', reveal);
    },

    // ---- sizing + DPR-aware canvas backing store ----
    setup: function () {
      var c = canvas; if (!c) return;
      var dpr = Math.min(devicePixelRatio || 1, 2);
      var w = c.clientWidth || innerWidth;
      var h = c.clientHeight || innerHeight;
      this.W = w; this.H = h; this.dpr = dpr;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      var ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx = ctx;
      this.computeFont();
    },

    // Scale the wordmark to fill ~82% of width, capped so it never crowds the frame.
    computeFont: function () {
      var ctx = this.ctx; if (!ctx) return;
      ctx.font = '900 100px Archivo, system-ui, sans-serif';
      try { ctx.letterSpacing = '-0.015em'; } catch (e) {}
      var w100 = ctx.measureText('Tim Metal').width || 480;
      var target = Math.min(this.W * 0.82, 1060);
      var fs = 100 * (target / w100);
      fs = Math.min(fs, this.H * 0.32, 240);
      this.fontSize = Math.max(fs, 30);
    },

    // Elegant ease — slow lift, confident middle, gentle settle.
    ease: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },

    // Organic surface: several incommensurate sines layered so it never reads as one robotic wave.
    surfaceY: function (x) {
      var baseY = this.H - this.p * this.H;
      var a = this.amp;
      if (a <= 0.02) return baseY;
      var y = baseY;
      y += Math.sin(x * 0.0090 + this.t * 1.5) * a;
      y += Math.sin(x * 0.0190 - this.t * 2.0) * a * 0.45;
      y += Math.sin(x * 0.0040 + this.t * 0.8) * a * 1.15;
      y += Math.sin(x * 0.0350 + this.t * 3.1) * a * 0.18;
      return y;
    },

    loop: function (ts) {
      if (!this.start) this.start = ts;
      var elapsed = ts - this.start;
      var auto = this.ease(Math.min(elapsed / this.DURATION, 1));
      // Take whichever is further along — scroll can only ever accelerate, never reverse.
      var target = Math.min(Math.max(auto, this.scrollAccum), 1);

      // Ease toward target so the surface glides rather than snaps.
      this.p += (target - this.p) * 0.14;
      if (target >= 1 && this.p > 0.997) this.p = 1;

      this.t += 0.016;
      var speed = Math.max(0, this.p - this.lastP);
      this.lastP = this.p;

      // Amplitude grows with pour speed (sloshing) and flattens as it tops out (settling).
      this.amp = Math.min(4 + speed * this.H * 1.4, 26) * (1 - 0.55 * this.p);
      if (this.p >= 0.999) this.amp = 0;

      this.draw(speed);

      if (this.p >= 1 && !this.complete) { this.finish(); return; }
      this.raf = requestAnimationFrame(this.loop);
    },

    finish: function () {
      this.complete = true;
      // Remember the pour ran so returning to home this session skips it.
      try { sessionStorage.setItem('tm-hero-seen', '1'); } catch (e) {}
      this.p = 1; this.amp = 0;
      this.bubbles = []; // clear any in-flight foam so the final white ground is spotless
      this.draw(0);
      document.body.style.overflow = this.prevOverflow || '';
      // Re-query: the nav is injected asynchronously by include.js, so the
      // reference captured at load time may have been null.
      var navEl = nav || document.getElementById('tm-nav');
      if (navEl) navEl.style.opacity = '1';
      if (tagline) { tagline.style.opacity = '1'; tagline.style.transform = 'translateY(0)'; }
      if (hint) hint.style.opacity = '0';
    },

    updateBubbles: function (speed) {
      if (speed > 0.0009 && this.bubbles.length < 46 && Math.random() < 0.5) {
        var x = Math.random() * this.W;
        var sy = this.surfaceY(x);
        this.bubbles.push({ x: x, y: sy + 8 + Math.random() * 42, r: 1 + Math.random() * 3.2, vy: 0.25 + Math.random() * 0.6, a: 0.5 + Math.random() * 0.4 });
      }
      for (var i = 0; i < this.bubbles.length; i++) {
        var b = this.bubbles[i];
        b.y -= b.vy;
        if (b.y < this.surfaceY(b.x) + 2) b.a -= 0.06; // dissolve at the surface
      }
      this.bubbles = this.bubbles.filter(function (b) { return b.a > 0.04 && b.y > 0; });
    },

    drawBubbles: function () {
      var ctx = this.ctx;
      for (var i = 0; i < this.bubbles.length; i++) {
        var b = this.bubbles[i];
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 7);
        ctx.fillStyle = 'rgba(255,255,255,' + (b.a * 0.5) + ')';
        ctx.fill();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = 'rgba(208,202,186,' + (b.a * 0.5) + ')';
        ctx.stroke();
      }
    },

    draw: function (speed) {
      var ctx = this.ctx; if (!ctx) return;
      var W = this.W, H = this.H;

      // 1) Warm-black ground with a soft central lift for depth (premium, not flat #000).
      ctx.fillStyle = '#050506';
      ctx.fillRect(0, 0, W, H);
      var vg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.5, Math.max(W, H) * 0.75);
      vg.addColorStop(0, '#0c0d10');
      vg.addColorStop(1, '#040405');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      // Shared text metrics
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 ' + this.fontSize + 'px Archivo, system-ui, sans-serif';
      try { ctx.letterSpacing = '-0.015em'; } catch (e) {}
      var cx = W / 2, cy = H * 0.46;

      // 2) Ghost wordmark — faint steel outline, the "empty" state.
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1.1, this.fontSize * 0.012);
      ctx.fillStyle = 'rgba(255,255,255,0.022)';
      ctx.fillText('Tim Metal', cx, cy);
      ctx.strokeStyle = 'rgba(126,132,140,0.66)';
      ctx.strokeText('Tim Metal', cx, cy);

      // 3) Build the wavy milk region once; reuse it for the fill AND the text clip
      //    so the inverted-text boundary tracks the fluid edge exactly (razor sharp).
      var S = 6;
      var path = new Path2D();
      path.moveTo(0, H);
      for (var x = 0; x <= W; x += S) path.lineTo(x, this.surfaceY(x));
      path.lineTo(W, H);
      path.closePath();

      // 4) Creamy milk body — warm off-white to avoid a harsh flashbang.
      var mg = ctx.createLinearGradient(0, Math.max(0, H - this.p * H - this.amp - 6), 0, H);
      mg.addColorStop(0, '#FCFBF7');
      mg.addColorStop(0.08, '#F8F5EE');
      mg.addColorStop(1, '#EFEBE1');
      ctx.fillStyle = mg;
      ctx.fill(path);

      // 5) Light catching the meniscus
      if (this.amp > 0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, this.surfaceY(0));
        for (var x2 = 0; x2 <= W; x2 += S) ctx.lineTo(x2, this.surfaceY(x2));
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur = 9;
        ctx.stroke();
        ctx.restore();
      }

      // 6) Foam bubbles near the rising surface
      this.updateBubbles(speed);
      this.drawBubbles();

      // 7) Revealed wordmark — solid dark-steel, clipped to the milk so it inverts
      //    instantly and stays sharp wherever the fluid has reached.
      ctx.save();
      ctx.clip(path);
      var tg = ctx.createLinearGradient(cx, cy - this.fontSize * 0.5, cx, cy + this.fontSize * 0.5);
      tg.addColorStop(0, '#0b0d10');
      tg.addColorStop(1, '#1b2026');
      ctx.fillStyle = tg;
      ctx.fillText('Tim Metal', cx, cy);
      ctx.restore();
    }
  };

  Hero.init();
})();
