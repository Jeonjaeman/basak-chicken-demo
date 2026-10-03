/* BASAK CHICKEN · A BOLD EDITORIAL */
(function () {
  'use strict';

  window.BASAK_READY = true;

  var win = window;
  var doc = document;
  var root = doc.documentElement;

  /* Utilities */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function pad(n, len) { n = String(n); while (n.length < len) { n = '0' + n; } return n; }
  function media(q) { return !!(win.matchMedia && win.matchMedia(q).matches); }
  function safe(name, fn) {
    try { return fn(); } catch (err) {
      if (win.console && console.warn) { console.warn('[basak] ' + name + ' skipped', err); }
      return null;
    }
  }
  function setVar(el, name, value) {
    if (!el) { return; }
    var cache = el.__vars || (el.__vars = {});
    if (cache[name] === value) { return; }
    cache[name] = value;
    el.style.setProperty(name, value);
  }

  var reduced = media('(prefers-reduced-motion: reduce)');
  var finePointer = media('(hover: hover) and (pointer: fine)');
  var hasGsap = typeof win.gsap !== 'undefined';
  var hasST = hasGsap && typeof win.ScrollTrigger !== 'undefined';
  var hasIO = 'IntersectionObserver' in win;
  if (hasST) { win.gsap.registerPlugin(win.ScrollTrigger); }

  var raf = function (fn) { return win.requestAnimationFrame(fn); };
  var idle = win.requestIdleCallback
    ? function (fn) { win.requestIdleCallback(fn, { timeout: 1500 }); }
    : function (fn) { setTimeout(fn, 250); };

  var vw = win.innerWidth;
  var vh = win.innerHeight;

  /* Scroll core */
  var lenis = null;
  var scrollFns = [];
  var resizeFns = [];
  var watchers = [];
  var scrollState = { y: win.pageYOffset || 0, vel: 0, t: 0 };
  var scrollQueued = false;

  function onScroll(fn) { scrollFns.push(fn); }
  function onResize(fn) { resizeFns.push(fn); }

  function runScroll(now) {
    scrollQueued = false;
    var y = win.pageYOffset || root.scrollTop || 0;
    var dt = scrollState.t ? Math.max(8, now - scrollState.t) : 16;
    var dy = y - scrollState.y;
    if (dy !== 0) { scrollState.vel = lerp(scrollState.vel, dy / dt * 1000, .5); }
    scrollState.y = y;
    scrollState.t = now;
    for (var i = 0; i < scrollFns.length; i++) { scrollFns[i](y); }
  }
  function requestScroll() {
    if (!scrollQueued) { scrollQueued = true; raf(runScroll); }
  }
  win.addEventListener('scroll', requestScroll, { passive: true });

  var resizeTimer = 0;
  win.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      vw = win.innerWidth;
      vh = win.innerHeight;
      for (var i = 0; i < resizeFns.length; i++) { resizeFns[i](); }
      requestScroll();
    }, 140);
  });

  /* Scroll watchers: run a callback with the element rect while it is near the viewport */
  function watch(el, fn, margin) {
    var w = { el: el, fn: fn, on: !hasIO };
    watchers.push(w);
    if (hasIO) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          w.on = en.isIntersecting;
          fn(el.getBoundingClientRect());
        });
      }, { rootMargin: (margin || '25%') + ' 0px' });
      io.observe(el);
    }
    fn(el.getBoundingClientRect());
    return w;
  }
  onScroll(function () {
    for (var i = 0; i < watchers.length; i++) {
      if (watchers[i].on) { watchers[i].fn(watchers[i].el.getBoundingClientRect()); }
    }
  });
  onResize(function () {
    for (var i = 0; i < watchers.length; i++) { watchers[i].fn(watchers[i].el.getBoundingClientRect()); }
  });

  function initLenis() {
    if (reduced || typeof win.Lenis === 'undefined') { return; }
    lenis = new win.Lenis({ lerp: .1, smoothWheel: true });
    if (hasST) { lenis.on('scroll', win.ScrollTrigger.update); }
    if (hasGsap) {
      win.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      win.gsap.ticker.lagSmoothing(0);
    } else {
      var loop = function (t) { lenis.raf(t); raf(loop); };
      raf(loop);
    }
  }

  function headOffset() {
    return parseFloat(getComputedStyle(root).getPropertyValue('--head-h-s')) || 72;
  }
  function scrollToEl(target) {
    var top = target === 0 || (target && target.id === 'kv');
    var off = top || (target && target.id === 'film') ? 0 : -headOffset() - 8;
    if (lenis) {
      lenis.scrollTo(top ? 0 : target, {
        offset: off,
        duration: 1.5,
        easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
      });
      return;
    }
    var y = top ? 0 : target.getBoundingClientRect().top + win.pageYOffset + off;
    win.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }

  /* Frame sequence store (shared by intro and film) */
  var FRAME_COUNT = 120;
  var Frames = {
    imgs: [],
    ok: [],
    proms: [],
    errors: 0,
    firstFailed: false,
    started: false,
    listeners: [],
    src: function (i) { return 'assets/frames/f_' + pad(i + 1, 3) + '.webp'; },
    emit: function (i, failed) {
      for (var k = 0; k < this.listeners.length; k++) { this.listeners[k](i, failed); }
    },
    load: function (i) {
      var self = this;
      if (self.proms[i]) { return self.proms[i]; }
      var img = new Image();
      img.decoding = 'async';
      self.imgs[i] = img;
      self.proms[i] = new Promise(function (resolve) {
        img.onload = function () {
          var done = function () { self.ok[i] = true; self.emit(i, false); resolve(true); };
          if (img.decode) { img.decode().then(done, done); } else { done(); }
        };
        img.onerror = function () {
          self.errors++;
          if (i === 0) { self.firstFailed = true; }
          self.emit(i, true);
          resolve(false);
        };
      });
      img.src = self.src(i);
      return self.proms[i];
    },
    loadRange: function (a, b) {
      var list = [];
      for (var i = a; i < b; i++) { list.push(this.load(i)); }
      return list;
    },
    loadRest: function () {
      var self = this;
      if (self.started) { return; }
      self.started = true;
      var next = 0;
      var active = 0;
      var pump = function () {
        while (active < 4 && next < FRAME_COUNT) {
          if (self.proms[next]) { next++; continue; }
          active++;
          self.load(next++).then(function () { active--; pump(); });
        }
      };
      idle(pump);
    },
    nearest: function (i) {
      if (this.ok[i]) { return i; }
      for (var d = 1; d < FRAME_COUNT; d++) {
        if (i - d >= 0 && this.ok[i - d]) { return i - d; }
        if (i + d < FRAME_COUNT && this.ok[i + d]) { return i + d; }
      }
      return -1;
    }
  };

  /* Intro loader */
  function initIntro(onDone) {
    var intro = $('.intro');
    var num = $('.intro__num');
    var bar = $('.intro__bar');
    var finished = false;
    function finish() {
      if (finished) { return; }
      finished = true;
      root.classList.remove('is-loading');
      root.classList.add('is-loaded');
      onDone();
    }
    if (!intro || !num) { finish(); return; }
    root.classList.add('is-loading');

    var total = 0;
    var done = 0;
    function task(promise, weight) {
      total += weight;
      var settle = function () { done += weight; };
      promise.then(settle, settle);
    }
    if (!reduced && $('.film__canvas')) {
      Frames.loadRange(0, 24).forEach(function (p) { task(p, 1); });
    }
    var video = $('.kv__video');
    if (video) {
      task(new Promise(function (resolve) {
        if (video.readyState >= 3) { resolve(); return; }
        video.addEventListener('canplay', resolve, { once: true });
        video.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 4000);
      }), 8);
    }
    if (doc.fonts && doc.fonts.ready) { task(doc.fonts.ready, 3); }

    var start = 0;
    var shown = 0;
    var minTime = reduced ? 200 : 1100;
    function tick(now) {
      if (!start) { start = now; }
      var elapsed = now - start;
      var real = total ? done / total : 1;
      if (elapsed > 4000) { real = 1; }
      var goal = Math.min(real, clamp(elapsed / minTime, 0, 1)) * 100;
      shown += (goal - shown) * .14;
      if (goal - shown < .5) { shown = goal; }
      num.textContent = pad(Math.round(shown), 3);
      if (bar) { bar.style.setProperty('--p', (shown / 100).toFixed(3)); }
      if (shown >= 100) { setTimeout(finish, reduced ? 0 : 220); return; }
      raf(tick);
    }
    raf(tick);
  }

  /* Header, scroll spy, mobile menu */
  function initHeader() {
    var header = $('.header');
    if (!header) { return; }
    onScroll(function (y) { root.classList.toggle('is-scrolled', y > 8); });

    var links = $$('.gnb a[data-spy]');
    var sections = links.map(function (a) { return doc.getElementById(a.getAttribute('data-spy')); });
    var current = -2;
    onScroll(function () {
      var line = vh * .38;
      var found = -1;
      for (var i = 0; i < sections.length; i++) {
        if (!sections[i]) { continue; }
        var r = sections[i].getBoundingClientRect();
        if (r.top <= line && r.bottom > line) { found = i; }
      }
      if (found === current) { return; }
      current = found;
      links.forEach(function (a, i) {
        a.classList.toggle('is-current', i === found);
        if (i === found) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
      });
    });

    var burger = $('.burger');
    var mnav = $('#mnav');
    if (!burger || !mnav) { return; }
    function setMenu(open) {
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
      mnav.setAttribute('aria-hidden', String(!open));
      if (lenis) { if (open) { lenis.stop(); } else { lenis.start(); } }
      if (open) {
        var first = $('a', mnav);
        if (first) { setTimeout(function () { first.focus({ preventScroll: true }); }, 380); }
      }
    }
    burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); burger.focus(); }
    });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    onResize(function () { if (vw > 1180 && root.classList.contains('menu-open')) { setMenu(false); } });
  }

  /* In-page anchors */
  function initAnchors() {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) { return; }
      var id = a.getAttribute('href').slice(1);
      var target = id ? doc.getElementById(id) : null;
      if (!target) { return; }
      e.preventDefault();
      scrollToEl(target);
      if (win.history && history.replaceState) { history.replaceState(null, '', '#' + id); }
      if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); }
      target.focus({ preventScroll: true });
    });
    var top = $('.totop');
    if (top) {
      top.addEventListener('click', function () {
        scrollToEl(0);
        var logo = $('.header .logo');
        if (logo) { logo.focus({ preventScroll: true }); }
      });
    }
  }

  /* Reveal on view (class toggle, CSS does the motion) */
  function initReveals() {
    var els = $$('[data-reveal]');
    if (!hasIO || reduced) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .12 });
    /* A box clipped to inset(50%) has no visible area, so it never intersects.
       Watch its parent instead and open the box from there. */
    var boxIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        $$('.box-reveal', en.target).forEach(function (box) {
          if (box.parentNode === en.target) { box.classList.add('is-in'); }
        });
        boxIO.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
    els.forEach(function (el) {
      if (el.classList.contains('box-reveal') && el.parentNode) { boxIO.observe(el.parentNode); }
      else { io.observe(el); }
    });
  }

  /* KV slider */
  function initKV() {
    var kv = $('#kv');
    if (!kv) { return null; }
    var box = $('.kv__box', kv);
    var slides = $$('.kv__slide', kv);
    if (!box || slides.length < 2) { return null; }
    var videos = slides.map(function (s) { return $('video', s); });
    var bar = $('.kv__progress', kv);
    var curEl = $('.kv__cur', kv);
    var toggle = $('.kv__toggle', kv);
    var api = { onChange: null, started: false };
    var cur = 0;
    var busy = false;
    var cleanup = 0;
    var userPaused = false;
    var focusPaused = false;
    var inView = true;
    var auto = !reduced;

    if (reduced) {
      videos.forEach(function (v) { if (v) { v.removeAttribute('autoplay'); v.pause(); } });
    }

    function canPlay() { return !reduced && inView && !doc.hidden && !userPaused; }
    function running() { return api.started && auto && !userPaused && !focusPaused && inView && !doc.hidden; }
    function syncPause() { kv.classList.toggle('is-paused', !running()); }

    function playOnly(i, reset) {
      var v = videos[i];
      if (!v) { return; }
      if (!canPlay()) { if (!v.paused) { v.pause(); } return; }
      if (reset) { try { v.currentTime = 0; } catch (err) { v.load(); } }
      var p = v.play();
      if (p && p.catch) { p.catch(function () { return null; }); }
    }
    function restartBar() {
      if (!bar) { return; }
      bar.classList.remove('is-run');
      void bar.offsetWidth;
      if (auto && api.started) { bar.classList.add('is-run'); }
    }

    function go(n, dir) {
      n = (n + slides.length) % slides.length;
      if (busy || n === cur) { return; }
      if (dir === undefined) { dir = n > cur ? 1 : -1; }
      busy = true;
      var back = dir < 0;
      var prev = slides[cur];
      var next = slides[n];
      var prevIndex = cur;

      prev.classList.remove('is-shown', 'is-wipe', 'is-active');
      prev.classList.toggle('is-back', back);
      prev.classList.add('is-prev');
      prev.setAttribute('aria-hidden', 'true');

      next.classList.remove('is-prev');
      next.classList.toggle('is-back', back);
      next.style.transition = 'none';
      next.style.clipPath = back ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
      next.classList.add('is-active');
      next.removeAttribute('aria-hidden');
      void next.offsetWidth;
      next.style.transition = '';
      next.classList.add('is-wipe', 'is-shown');
      next.style.clipPath = 'inset(0 0 0 0)';

      cur = n;
      if (curEl) { curEl.textContent = String(n + 1); }
      playOnly(n, true);
      restartBar();
      if (api.onChange) { api.onChange(n, dir); }

      clearTimeout(cleanup);
      cleanup = setTimeout(function () {
        prev.classList.remove('is-prev', 'is-back');
        next.classList.remove('is-wipe', 'is-back');
        next.style.clipPath = '';
        var pv = videos[prevIndex];
        if (pv && !pv.paused) { pv.pause(); }
        busy = false;
      }, reduced ? 40 : 1260);
    }
    api.go = go;

    slides.forEach(function (s, i) { if (i !== 0) { s.setAttribute('aria-hidden', 'true'); } });

    if (bar) {
      bar.addEventListener('animationend', function () { if (running()) { go(cur + 1, 1); } });
    }
    var prevBtn = $('.kv__prev', kv);
    var nextBtn = $('.kv__next', kv);
    if (prevBtn) { prevBtn.addEventListener('click', function () { go(cur - 1, -1); }); }
    if (nextBtn) { nextBtn.addEventListener('click', function () { go(cur + 1, 1); }); }

    if (toggle) {
      if (!auto) { toggle.hidden = true; }
      toggle.addEventListener('click', function () {
        userPaused = !userPaused;
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.setAttribute('aria-label', userPaused ? '자동 재생 시작' : '자동 재생 일시정지');
        if (userPaused) { var v = videos[cur]; if (v) { v.pause(); } } else { playOnly(cur, false); }
        syncPause();
      });
    }

    kv.addEventListener('focusin', function () { focusPaused = true; syncPause(); });
    kv.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !kv.contains(e.relatedTarget)) { focusPaused = false; syncPause(); }
    });

    doc.addEventListener('keydown', function (e) {
      if (!inView || e.defaultPrevented) { return; }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }
      var t = e.target;
      if (t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || (t.closest && t.closest('[role="tablist"]')))) { return; }
      var r = box.getBoundingClientRect();
      if (r.bottom < vh * .3 || r.top > vh * .7) { return; }
      go(e.key === 'ArrowLeft' ? cur - 1 : cur + 1, e.key === 'ArrowLeft' ? -1 : 1);
    });

    var sx = 0;
    var sy = 0;
    var swiping = false;
    box.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') { return; }
      swiping = true; sx = e.clientX; sy = e.clientY;
    }, { passive: true });
    box.addEventListener('pointerup', function (e) {
      if (!swiping) { return; }
      swiping = false;
      var dx = e.clientX - sx;
      var dy = e.clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) { go(dx < 0 ? cur + 1 : cur - 1, dx < 0 ? 1 : -1); }
    }, { passive: true });
    box.addEventListener('pointercancel', function () { swiping = false; });

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (api.started) { playOnly(cur, false); }
        syncPause();
      }, { threshold: .05 }).observe(box);
    }
    doc.addEventListener('visibilitychange', function () {
      if (api.started) { playOnly(cur, false); }
      syncPause();
    });

    api.start = function () {
      if (api.started) { return; }
      api.started = true;
      slides[0].classList.add('is-shown');
      playOnly(0, false);
      restartBar();
      syncPause();
    };
    syncPause();
    return api;
  }

  /* three.js embers inside the KV box */
  var EMBER_VERT = [
    'uniform float uTime;',
    'uniform float uH;',
    'uniform float uScale;',
    'uniform float uBoost;',
    'attribute vec4 aSeed;',
    'varying float vAlpha;',
    'varying float vHue;',
    'void main() {',
    '  vec3 p = position;',
    '  float life = mod(p.y + uTime * aSeed.x, uH);',
    '  float t = life / uH;',
    '  p.y = life - uH * 0.5;',
    '  p.x += sin(uTime * (0.5 + aSeed.y) + aSeed.y * 6.2831) * (0.18 + aSeed.y * 0.32) + t * 0.7;',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  float flicker = 0.62 + 0.38 * sin(uTime * (4.0 + aSeed.y * 6.0) + aSeed.y * 50.0);',
    '  float bokeh = step(2.0, aSeed.z);',
    '  vAlpha = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.5, 1.0, t)) * flicker * mix(1.0, 0.3, bokeh) * (1.0 + uBoost * 0.9);',
    '  vHue = aSeed.w;',
    '  gl_PointSize = aSeed.z * uScale / -mv.z;',
    '}'
  ].join('\n');
  var EMBER_FRAG = [
    'varying float vAlpha;',
    'varying float vHue;',
    'void main() {',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float d = length(c);',
    '  if (d > 0.5) discard;',
    '  float glow = smoothstep(0.5, 0.0, d);',
    '  glow *= glow;',
    '  float core = smoothstep(0.16, 0.0, d);',
    '  vec3 ember = mix(vec3(1.0, 0.27, 0.06), vec3(1.0, 0.70, 0.24), vHue);',
    '  vec3 col = ember * glow + vec3(1.0, 0.93, 0.78) * core * 0.9;',
    '  gl_FragColor = vec4(col, clamp(glow + core, 0.0, 1.0) * vAlpha);',
    '}'
  ].join('\n');

  function webglAvailable() {
    try {
      var c = doc.createElement('canvas');
      return !!(win.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (err) { return false; }
  }

  function initEmbers(kvApi) {
    var canvas = $('.kv__embers');
    if (!canvas) { return null; }
    var box = canvas.parentNode;
    var T = win.THREE;
    if (reduced || !T || !webglAvailable()) { canvas.parentNode.removeChild(canvas); return null; }

    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (err) { renderer = null; }
    if (!renderer) { canvas.parentNode.removeChild(canvas); return null; }
    renderer.setClearColor(0x000000, 0);

    var count = vw < 768 ? 80 : 160;
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(50, 1, .1, 100);
    camera.position.set(0, 0, 10);
    var positions = new Float32Array(count * 3);
    var seeds = new Float32Array(count * 4);
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new T.BufferAttribute(seeds, 4));
    var uniforms = { uTime: { value: 0 }, uH: { value: 14 }, uScale: { value: 40 }, uBoost: { value: 0 } };
    var mat = new T.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: EMBER_VERT,
      fragmentShader: EMBER_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: T.AdditiveBlending
    });
    var points = new T.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    function rand(a, b) { return a + Math.random() * (b - a); }
    function layout() {
      var w = box.clientWidth || 1;
      var h = box.clientHeight || 1;
      var pr = Math.min(win.devicePixelRatio || 1, 1.75);
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      var visH = 2 * Math.tan(25 * Math.PI / 180) * 10;
      var visW = visH * camera.aspect;
      var spanH = visH * 1.7;
      uniforms.uH.value = spanH;
      uniforms.uScale.value = 44 * pr * clamp(h / 720, .6, 1.4);
      for (var i = 0; i < count; i++) {
        var z = rand(-7, 4);
        var depth = (10 - z) / 10;
        var side = Math.random() < .7 ? rand(-.12, 1) : rand(-1, -.12);
        positions[i * 3] = side * visW * .5 * depth * 1.05;
        positions[i * 3 + 1] = rand(0, spanH);
        positions[i * 3 + 2] = z;
        seeds[i * 4] = rand(.35, 1.05);
        seeds[i * 4 + 1] = Math.random();
        seeds[i * 4 + 2] = Math.random() < .08 ? rand(2.2, 3.4) : rand(.45, 1.5);
        seeds[i * 4 + 3] = Math.random();
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSeed.needsUpdate = true;
    }
    layout();
    onResize(layout);

    var running = false;
    var inView = true;
    var lost = false;
    var last = 0;
    var mx = 0;
    var my = 0;
    var cx = 0;
    var cy = 0;
    var boost = 0;
    function frame(now) {
      if (!running) { return; }
      var dt = last ? Math.min(.05, (now - last) / 1000) : .016;
      last = now;
      boost = Math.max(0, boost - dt * .8);
      uniforms.uTime.value += dt * (1 + boost * 2.4);
      uniforms.uBoost.value = boost;
      cx += (mx - cx) * .045;
      cy += (my - cy) * .045;
      camera.position.x = cx * 1.1;
      camera.position.y = cy * .6;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf(frame);
    }
    function sync() {
      var should = !lost && inView && !doc.hidden && root.classList.contains('is-loaded');
      if (should && !running) { running = true; last = 0; raf(frame); }
      if (!should) { running = false; }
    }
    if (hasIO) {
      new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; sync(); }).observe(box);
    }
    doc.addEventListener('visibilitychange', sync);
    if (finePointer) {
      win.addEventListener('pointermove', function (e) {
        mx = (e.clientX / vw - .5) * 2;
        my = -(e.clientY / vh - .5) * 2;
      }, { passive: true });
    }
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      lost = true;
      running = false;
      canvas.style.visibility = 'hidden';
    });
    if (kvApi) { kvApi.onChange = function () { boost = 1; }; }
    return { sync: sync };
  }

  /* Brand story: words fill from gray to black on scroll */
  function initBrandWords() {
    var el = $('[data-words]');
    if (!el || reduced) { return; }
    var words = [];
    var frag = doc.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) { return; }
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
          var s = doc.createElement('span');
          s.className = 'w';
          s.textContent = part;
          frag.appendChild(s);
          words.push(s);
        });
      } else if (node.nodeType === 1) {
        node.classList.add('w');
        frag.appendChild(node);
        words.push(node);
      }
    });
    el.textContent = '';
    el.appendChild(frag);
    el.classList.add('is-split');

    var lit = -1;
    watch(el, function (r) {
      var start = vh * .84;
      var end = vh * .4;
      var span = r.height + (start - end);
      var p = clamp((start - r.top) / span, 0, 1);
      var n = Math.round(p * words.length);
      if (n === lit) { return; }
      lit = n;
      for (var i = 0; i < words.length; i++) { words[i].classList.toggle('is-on', i < n); }
    }, '10%');
  }

  /* Menu sticky stage */
  function initMenuStage() {
    var menu = $('#menu');
    var stage = menu ? $('.mstage', menu) : null;
    var list = stage ? $('.mstage__list', stage) : null;
    if (!list || reduced) { return; }
    var items = $$('.mitem', list);
    var n = items.length;
    if (n < 2) { return; }
    var pnls = items.map(function (it) { return $('.pnl', it); });
    var cuts = pnls.map(function (p) { return $('.pnl__cut', p); });
    var imgs = cuts.map(function (c) { return $('img', c); });
    var words = pnls.map(function (p) { return $('.pnl__words', p); });
    var curEl = $('.mstage__cur', stage);
    var dots = $$('.mstage__dots i', stage);

    menu.style.setProperty('--n', String(n));
    menu.classList.add('is-stage');
    items.forEach(function (it) { it.classList.remove('is-active'); });

    var active = 0;
    var armed = false;
    var stageTop = 110;
    var stageH = 680;
    function measure() {
      stageTop = parseFloat(getComputedStyle(list).top) || 0;
      stageH = list.offsetHeight || 1;
    }
    measure();
    onResize(measure);

    function setActive(i) {
      if (i === active) { return; }
      var back = i < active;
      var old = items[active];
      menu.classList.toggle('is-back', back);
      items.forEach(function (it) { it.classList.remove('is-out'); });
      void menu.offsetWidth;
      old.classList.remove('is-active');
      old.classList.add('is-out');
      items[i].classList.add('is-active');
      if (imgs[active]) { setVar(imgs[active], '--rx', '0deg'); setVar(imgs[active], '--ry', '0deg'); }
      active = i;
      if (curEl) { curEl.textContent = pad(i + 1, 2); }
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
    }

    var HOLD = .25;
    var TAIL = .06;
    watch(stage, function (r) {
      var dist = Math.max(1, r.height - stageH);
      var p = clamp((stageTop - r.top) / dist, 0, 1);
      var q = clamp(p / (1 - TAIL), 0, 1) * (n - 1);
      var w = [1];
      var k;
      for (k = 1; k < n; k++) {
        var local = clamp(q - (k - 1), 0, 1);
        w[k] = ease(clamp((local - HOLD) / (1 - HOLD), 0, 1));
      }
      var idx = 0;
      for (k = 0; k < n; k++) {
        var wk = w[k];
        var nx = k + 1 < n ? w[k + 1] : 0;
        if (k > 0) { setVar(pnls[k], '--clip', ((1 - wk) * 100).toFixed(2) + '%'); }
        setVar(cuts[k], '--cy', ((1 - wk) * 12 - nx * 6).toFixed(2) + '%');
        setVar(cuts[k], '--cs', (1 - nx * .06).toFixed(4));
        setVar(words[k], '--wy', (-(1 - wk) * 16 + nx * 10).toFixed(2) + '%');
        if (k > 0 && wk >= .5) { idx = k; }
      }
      if (!armed) {
        if (r.top > vh * .72 || !root.classList.contains('is-loaded')) { return; }
        armed = true;
        active = idx;
        items[idx].classList.add('is-active');
        if (curEl) { curEl.textContent = pad(idx + 1, 2); }
        dots.forEach(function (d, k2) { d.classList.toggle('is-on', k2 === idx); });
        return;
      }
      setActive(idx);
    }, '10%');

    if (finePointer) {
      var tilted = null;
      var reset = function () {
        if (tilted) { setVar(tilted, '--rx', '0deg'); setVar(tilted, '--ry', '0deg'); tilted = null; }
      };
      list.addEventListener('pointermove', function (e) {
        var p = pnls[active];
        var r = p.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { reset(); return; }
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        var img = imgs[active];
        if (tilted && tilted !== img) { reset(); }
        tilted = img;
        setVar(img, '--ry', (x * 18).toFixed(2) + 'deg');
        setVar(img, '--rx', (-y * 14).toFixed(2) + 'deg');
      });
      list.addEventListener('pointerleave', reset);
    }
  }

  /* Film chapter: 120 frames on canvas */
  function initFilm() {
    var film = $('#film');
    if (!film || reduced) { return; }
    var canvas = $('.film__canvas', film);
    var sticky = $('.film__sticky', film);
    var ctx = canvas && canvas.getContext ? canvas.getContext('2d', { alpha: false }) : null;
    if (!ctx || !sticky) { return; }

    film.classList.add('is-pin');
    var N = FRAME_COUNT;
    var beats = $$('.beat', film);
    var finalA = $('.film__final-a', film);
    var finalB = $('.film__final-b', film);
    var rail = $('.film__rail', film);
    var railNum = $('.film__rail-num', film);
    var RANGES = [[.05, .3], [.34, .58], [.62, .82]];
    var target = 0;
    var cur = 0;
    var shownIdx = -1;
    var needs = true;
    var running = false;
    var failed = false;
    var beatNow = 0;

    function fail() {
      if (failed) { return; }
      failed = true;
      running = false;
      film.classList.remove('is-pin');
      root.classList.remove('is-film');
      sticky.style.removeProperty('--fx');
      beats.concat([finalA, finalB, rail]).forEach(function (el) {
        if (el) { el.removeAttribute('style'); el.__vars = {}; }
      });
      if (hasST) { win.ScrollTrigger.refresh(); }
      requestScroll();
    }

    function size() {
      var dpr = Math.min(win.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth || vw;
      var h = canvas.clientHeight || vh;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.imageSmoothingQuality = 'high';
      needs = true;
      kick();
    }

    function draw(idx, sp) {
      var img = Frames.imgs[idx];
      if (!img || !img.naturalWidth) { return false; }
      var W = canvas.width;
      var H = canvas.height;
      var s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      var dw = img.naturalWidth * s;
      var dh = img.naturalHeight * s;
      var fx = H > W ? .5 + .24 * sp : .5;
      ctx.drawImage(img, (W - dw) * fx, (H - dh) * .5, dw, dh);
      return true;
    }

    function ui(sp) {
      for (var b = 0; b < beats.length && b < RANGES.length; b++) {
        var a = RANGES[b][0];
        var z = RANGES[b][1];
        var vin = clamp((sp - a) / .05, 0, 1);
        var vout = clamp((z - sp) / .05, 0, 1);
        var v = Math.min(vin, vout);
        var y = sp < (a + z) / 2 ? (1 - easeOut(vin)) * 56 : -(1 - easeOut(vout)) * 56;
        var el = beats[b];
        setVar(el, 'opacity', v.toFixed(3));
        setVar(el, '--y', y.toFixed(1) + 'px');
        setVar(el, '--v', easeOut(v).toFixed(3));
        setVar(el, 'visibility', v > .001 ? 'visible' : 'hidden');
      }
      var fa = easeOut(clamp((sp - .86) / .05, 0, 1));
      var fb = easeOut(clamp((sp - .885) / .05, 0, 1));
      if (finalA) { setVar(finalA, 'opacity', fa.toFixed(3)); setVar(finalA, 'transform', 'translateY(' + ((1 - fa) * 70).toFixed(1) + 'px)'); }
      if (finalB) { setVar(finalB, 'opacity', fb.toFixed(3)); setVar(finalB, 'transform', 'translateY(' + ((1 - fb) * 90).toFixed(1) + 'px)'); }
      if (rail) { setVar(rail, '--rp', sp.toFixed(4)); }
      var bn = sp < .32 ? 1 : sp < .6 ? 2 : 3;
      if (bn !== beatNow && railNum) { beatNow = bn; railNum.textContent = pad(bn, 2); }
    }

    function loop() {
      if (failed) { running = false; return; }
      var diff = target - cur;
      if (Math.abs(diff) < .02) { cur = target; } else { cur += diff * .12; }
      var sp = cur / (N - 1);
      var idx = Frames.nearest(Math.round(cur));
      if (idx >= 0 && (idx !== shownIdx || needs)) {
        if (draw(idx, sp)) { shownIdx = idx; needs = false; }
      }
      ui(sp);
      if (cur !== target) { raf(loop); } else { running = false; }
    }
    function kick() {
      if (!running && !failed) { running = true; raf(loop); }
    }

    Frames.listeners.push(function (i, isError) {
      if (isError) {
        if (i === 0 || Frames.errors > 24) { fail(); }
        return;
      }
      if (Frames.nearest(Math.round(cur)) !== shownIdx) { needs = true; kick(); }
    });
    if (Frames.firstFailed) { fail(); return; }

    size();
    onResize(size);

    watch(film, function (r) {
      if (failed) { return; }
      var dist = Math.max(1, r.height - vh);
      var p = clamp(-r.top / dist, 0, 1);
      target = p * (N - 1);
      var fx = p < .08 ? ease(p / .08) : p > .94 ? ease((1 - p) / .06) : 1;
      setVar(sticky, '--fx', fx.toFixed(4));
      root.classList.toggle('is-film', r.top < 40 && r.bottom > vh * .5);
      kick();
    }, '10%');
  }

  /* Scroll-linked parallax (GSAP ScrollTrigger) */
  function initParallax() {
    if (!hasST || reduced) { return; }
    var gsap = win.gsap;
    var setup = function () {
      var list = $('.camp-list');
      $$('.camp').forEach(function (el) {
        var s = parseFloat(el.getAttribute('data-speed')) || 0;
        gsap.fromTo(el, { y: -s * .5 }, {
          y: s * .5,
          ease: 'none',
          scrollTrigger: { trigger: list, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
      var bg = $('.store__bg');
      if (bg) {
        gsap.fromTo(bg, { yPercent: -7 }, {
          yPercent: 7,
          ease: 'none',
          scrollTrigger: { trigger: '.store__box', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
    };
    if (gsap.matchMedia) {
      gsap.matchMedia().add('(min-width: 641px)', setup);
    } else if (vw > 640) {
      setup();
    }
  }

  /* Media list: hover, focus or tap swaps the stacked image */
  function initMedia() {
    var sec = $('#media');
    if (!sec) { return; }
    var rows = $$('.media__row', sec);
    var figs = $$('.media__fig', sec);
    var grid = $('.media__grid', sec);
    if (!rows.length || rows.length !== figs.length) { return; }
    var cur = 0;
    var hover = false;
    var focusIn = false;
    var inView = false;
    var auto = !reduced;
    var begun = false;

    function running() { return auto && !hover && !focusIn && inView && !doc.hidden; }
    function sync() { sec.classList.toggle('is-paused', !running()); }
    function restart(row) {
      rows.forEach(function (r) { r.classList.remove('is-run'); });
      if (!auto) { return; }
      void row.offsetWidth;
      row.classList.add('is-run');
    }
    function set(i, focus) {
      i = (i + rows.length) % rows.length;
      if (i === cur) { if (focus) { rows[i].focus(); } return; }
      rows.forEach(function (r, k) {
        var on = k === i;
        r.classList.toggle('is-active', on);
        r.setAttribute('aria-selected', String(on));
        r.tabIndex = on ? 0 : -1;
      });
      figs.forEach(function (f) { f.classList.remove('is-prev'); });
      var old = figs[cur];
      var nf = figs[i];
      old.classList.remove('is-active');
      old.classList.add('is-prev');
      void nf.offsetWidth;
      nf.classList.add('is-active');
      cur = i;
      restart(rows[i]);
      if (focus) { rows[i].focus(); }
    }

    rows.forEach(function (row, i) {
      row.addEventListener('mouseenter', function () { set(i); });
      row.addEventListener('focus', function () { set(i); });
      row.addEventListener('click', function () { set(i); });
    });
    var tablist = $('.media__list', sec);
    if (tablist) {
      tablist.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); set(cur + 1, true); }
        else if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); set(cur - 1, true); }
        else if (k === 'Home') { e.preventDefault(); set(0, true); }
        else if (k === 'End') { e.preventDefault(); set(rows.length - 1, true); }
      });
    }
    if (grid && finePointer) {
      grid.addEventListener('mouseenter', function () { hover = true; sync(); });
      grid.addEventListener('mouseleave', function () { hover = false; sync(); });
    }
    sec.addEventListener('focusin', function () { focusIn = true; sync(); });
    sec.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !sec.contains(e.relatedTarget)) { focusIn = false; sync(); }
    });
    sec.addEventListener('animationend', function (e) {
      if (e.animationName === 'media-line' && running()) { set(cur + 1); }
    });
    doc.addEventListener('visibilitychange', sync);
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && !begun) { begun = true; restart(rows[cur]); }
        sync();
      }, { threshold: .25 }).observe(sec);
    }
    sync();
  }

  /* Franchise: consult form */
  function initFranchise() {
    var form = $('.apply__form');
    var done = $('.apply__done');
    if (!form || !done) { return; }
    var f = { name: $('#f-name'), tel: $('#f-tel'), region: $('#f-region'), agree: $('#f-agree') };
    if (!f.name || !f.tel || !f.region || !f.agree) { return; }
    var keys = ['name', 'tel', 'region', 'agree'];
    var msgs = {
      name: '이름을 두 글자 이상 입력해 주세요.',
      tel: '휴대폰 번호를 확인해 주세요. 예) 010-1234-5678',
      region: '희망 지역을 골라 주세요.',
      agree: '개인정보 수집에 동의해야 접수할 수 있어요.'
    };
    function valid(key) {
      var v;
      if (key === 'name') { v = f.name.value.trim(); return v.length >= 2 && /^[가-힣a-zA-Z\s]+$/.test(v); }
      if (key === 'tel') { v = f.tel.value.replace(/\D/g, ''); return /^01[016789]\d{7,8}$/.test(v); }
      if (key === 'region') { return !!f.region.value; }
      return f.agree.checked;
    }
    function setErr(key, on) {
      var el = f[key];
      var field = el.closest('.field');
      var err = $('#e-' + key);
      if (field) { field.classList.toggle('is-error', on); }
      el.setAttribute('aria-invalid', on ? 'true' : 'false');
      if (err) { err.textContent = on ? msgs[key] : ''; }
    }
    f.tel.addEventListener('input', function () {
      var d = f.tel.value.replace(/\D/g, '').slice(0, 11);
      var out = d;
      if (d.length >= 4 && d.length < 8) { out = d.slice(0, 3) + '-' + d.slice(3); }
      else if (d.length === 10) { out = d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6); }
      else if (d.length >= 8) { out = d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7); }
      f.tel.value = out;
    });
    keys.forEach(function (k) {
      var ev = k === 'region' || k === 'agree' ? 'change' : 'input';
      f[k].addEventListener(ev, function () {
        var field = f[k].closest('.field');
        if (field && field.classList.contains('is-error') && valid(k)) { setErr(k, false); }
      });
      f[k].addEventListener('blur', function () {
        if (k === 'agree') { return; }
        var filled = k === 'region' ? !!f.region.value : f[k].value.trim() !== '';
        if (filled) { setErr(k, !valid(k)); }
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      keys.forEach(function (k) {
        var ok = valid(k);
        setErr(k, !ok);
        if (!ok && !first) { first = f[k]; }
      });
      if (first) { first.focus(); return; }
      var btn = $('button[type="submit"]', form);
      var label = btn ? $('.pill__txt', btn) : null;
      if (btn) { btn.disabled = true; }
      if (label) { label.textContent = '보내는 중'; }
      setTimeout(function () {
        form.classList.add('is-leaving');
        setTimeout(function () {
          form.hidden = true;
          done.hidden = false;
          done.focus({ preventScroll: true });
          if (hasST) { win.ScrollTrigger.refresh(); }
        }, reduced ? 0 : 460);
      }, reduced ? 0 : 650);
    });
  }

  /* Marquee above the footer, speeds up with scroll velocity */
  function initMarquee() {
    var wrap = $('.marquee');
    var track = wrap ? $('.marquee__track', wrap) : null;
    var seq = track ? $('.marquee__seq', track) : null;
    if (!seq) { return null; }
    var segW = 1;
    function fill() {
      $$('.marquee__seq', track).forEach(function (s, i) { if (i > 0) { track.removeChild(s); } });
      segW = seq.offsetWidth || 1;
      var copies = Math.max(2, Math.ceil(vw * 2 / segW) + 1);
      for (var i = 1; i < copies; i++) { track.appendChild(seq.cloneNode(true)); }
    }
    fill();
    onResize(fill);
    if (reduced) { return { refit: fill }; }

    var x = 0;
    var speed = 0;
    var spin = 0;
    var running = false;
    var inView = false;
    var last = 0;
    function frame(now) {
      if (!running) { return; }
      var dt = last ? Math.min(.05, (now - last) / 1000) : .016;
      last = now;
      scrollState.vel *= Math.pow(.9, dt * 60);
      var boost = Math.min(Math.abs(scrollState.vel) / 900, 6);
      speed = lerp(speed, 70 + boost * 170, .08);
      x -= speed * dt;
      if (x <= -segW) { x += segW; }
      spin = (spin + speed * dt * .3) % 360;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      track.style.setProperty('--spin', spin.toFixed(1) + 'deg');
      raf(frame);
    }
    function sync() {
      var should = inView && !doc.hidden;
      if (should && !running) { running = true; last = 0; raf(frame); }
      if (!should) { running = false; }
    }
    if (hasIO) {
      new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; sync(); }, { rootMargin: '10% 0px' }).observe(wrap);
    } else {
      inView = true;
      sync();
    }
    doc.addEventListener('visibilitychange', sync);
    return { refit: fill };
  }

  /* Store open status, Seoul time */
  function initStoreStatus() {
    var shops = $$('.shop[data-open]');
    if (!shops.length) { return; }
    function toMin(s) { var p = String(s).split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
    function nowMin() {
      try {
        var t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
        return toMin(t);
      } catch (err) {
        var d = new Date();
        return d.getHours() * 60 + d.getMinutes();
      }
    }
    function render() {
      var now = nowMin();
      shops.forEach(function (s) {
        var st = $('.shop__status', s);
        if (!st) { return; }
        var open = toMin(s.getAttribute('data-open'));
        var close = toMin(s.getAttribute('data-close'));
        var isOpen = now >= open && now < close;
        st.classList.toggle('is-open', isOpen);
        st.textContent = isOpen ? '지금 영업 중' : now < open ? '오늘 ' + s.getAttribute('data-open') + ' 오픈' : '오늘 영업 종료';
      });
    }
    render();
    setInterval(render, 60000);
  }

  /* Boot */
  if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
  var initialHash = win.location.hash ? win.location.hash.slice(1) : '';
  if (!initialHash) { win.scrollTo(0, 0); }

  safe('lenis', initLenis);
  safe('header', initHeader);
  safe('anchors', initAnchors);
  safe('menu', initMenuStage);
  safe('film', initFilm);
  safe('brand', initBrandWords);
  var kvApi = safe('kv', initKV);
  var embers = safe('embers', function () { return initEmbers(kvApi); });
  safe('media', initMedia);
  safe('franchise', initFranchise);
  var marquee = safe('marquee', initMarquee);
  safe('stores', initStoreStatus);
  if (lenis) { lenis.stop(); }

  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(function () {
      if (marquee) { marquee.refit(); }
      if (hasST) { win.ScrollTrigger.refresh(); }
      requestScroll();
    });
  }

  initIntro(function () {
    if (lenis) { lenis.start(); }
    safe('reveals', initReveals);
    safe('parallax', initParallax);
    if (kvApi) { kvApi.start(); }
    if (embers) { embers.sync(); }
    if (!reduced) { Frames.loadRest(); }
    if (hasST) { win.ScrollTrigger.refresh(); }
    requestScroll();
    if (initialHash) {
      var t = doc.getElementById(initialHash);
      if (t) { setTimeout(function () { scrollToEl(t); }, 400); }
    }
  });
})();
