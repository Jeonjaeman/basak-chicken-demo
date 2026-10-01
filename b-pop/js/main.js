/* BASAK CHICKEN · POP */
(function () {
  'use strict';

  const root = document.documentElement;
  if (window.__basakSafety) clearTimeout(window.__basakSafety);

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const media = (q) => (window.matchMedia ? window.matchMedia(q).matches : false);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  /* Entrance tweens on elements that also have a CSS transform transition: mute the transition while GSAP drives it. */
  function trOff() { this.targets().forEach((el) => { el.style.transition = 'none'; }); }
  function trOn() { this.targets().forEach((el) => { el.style.transition = ''; }); }
  const quiet = { onStart: trOff, onComplete: trOn };

  const reduce = media('(prefers-reduced-motion: reduce)');
  const fine = media('(hover: hover) and (pointer: fine)');
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const hasGsap = !!(gsap && ST);
  const motion = hasGsap && !reduce && root.classList.contains('anim');
  if (!motion) root.classList.remove('anim');
  if (hasGsap) gsap.registerPlugin(ST);

  const shared = { snsProgress: 0, pointer: { x: 0, y: 0 } };
  let lenis = null;

  function run(name, fn) {
    try {
      fn();
    } catch (err) {
      root.classList.remove('anim');
      if (window.console && console.warn) console.warn('[basak] ' + name + ' skipped', err);
    }
  }

  function headerHeight() {
    const hd = $('.hd');
    return hd ? hd.offsetHeight : 0;
  }

  /* Smooth scroll */
  function initScroll() {
    if (!motion || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target) {
    const toTop = target === 0 || (target && (target.id === 'hero' || target.id === 'top'));
    const offset = !toTop && target && !target.matches('section') ? -(headerHeight() + 24) : 0;
    if (lenis) {
      lenis.scrollTo(toTop ? 0 : target, { offset, duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
      return;
    }
    if (toTop) {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    } else if (target) {
      const y = target.getBoundingClientRect().top + window.pageYOffset + offset;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  function focusTarget(el) {
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      const hash = a.getAttribute('href');
      if (!hash || hash.length < 2) return;
      const el = document.getElementById(hash.slice(1));
      if (!el) return;
      e.preventDefault();
      closeNav(false);
      scrollToTarget(el);
      focusTarget(el);
    });
  }

  /* Header + mobile nav */
  const burger = $('.hd__burger');
  const mnav = $('#mnav');
  let navOpen = false;

  function openNav() {
    if (!mnav || !burger || navOpen) return;
    navOpen = true;
    if (hasGsap) gsap.killTweensOf(mnav);
    mnav.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', '전체 메뉴 닫기');
    root.classList.add('mnav-open');
    if (lenis) lenis.stop();
    else root.style.overflow = 'hidden';
    if (hasGsap && !reduce) {
      gsap.fromTo(mnav, { clipPath: 'circle(0% at 92% 0%)' }, { clipPath: 'circle(150% at 92% 0%)', duration: 0.9, ease: 'expo.out' });
      gsap.fromTo($$('.mnav__list a', mnav), { yPercent: 120, rotation: 6, autoAlpha: 0 }, { yPercent: 0, rotation: 0, autoAlpha: 1, duration: 0.75, stagger: 0.06, ease: 'back.out(1.8)', delay: 0.1, clearProps: 'transform', ...quiet });
      gsap.fromTo($('.mnav__foot', mnav), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.4 });
    }
    const first = $('.mnav__list a', mnav);
    if (first) {
      /* The links start hidden while they animate in, so focus once the first one is visible. */
      if (hasGsap && !reduce) setTimeout(() => { if (navOpen) first.focus({ preventScroll: true }); }, 280);
      else first.focus({ preventScroll: true });
    }
  }

  function closeNav(returnFocus) {
    if (!mnav || !burger || !navOpen) return;
    navOpen = false;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', '전체 메뉴 열기');
    root.classList.remove('mnav-open');
    if (lenis) lenis.start();
    else root.style.overflow = '';
    const done = () => { mnav.hidden = true; };
    if (hasGsap && !reduce) {
      gsap.killTweensOf(mnav);
      gsap.to(mnav, { clipPath: 'circle(0% at 92% 0%)', duration: 0.5, ease: 'power3.in', onComplete: done });
    } else {
      done();
    }
    if (returnFocus) burger.focus();
  }

  function initNav() {
    if (!burger || !mnav) return;
    burger.addEventListener('click', () => (navOpen ? closeNav(true) : openNav()));
    document.addEventListener('keydown', (e) => {
      if (!navOpen) return;
      if (e.key === 'Escape') {
        closeNav(true);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [burger].concat($$('a', mnav));
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && i === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    });
    window.addEventListener('resize', () => {
      if (navOpen && window.innerWidth > 900) closeNav(false);
    });
  }

  function initActiveNav() {
    const links = $$('.hd__nav a[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach((l) => {
      const sec = document.getElementById(l.dataset.nav);
      if (sec) map.set(sec, l);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const link = map.get(en.target);
        if (!link) return;
        if (en.isIntersecting) {
          links.forEach((x) => {
            const on = x === link;
            x.classList.toggle('is-active', on);
            if (on) x.setAttribute('aria-current', 'location');
            else x.removeAttribute('aria-current');
          });
        } else if (link.classList.contains('is-active')) {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -54% 0px' });
    map.forEach((link, sec) => io.observe(sec));
  }

  function initQuick() {
    const top = $('.quick__btn--top');
    if (!top) return;
    top.addEventListener('click', () => {
      scrollToTarget(0);
      const logo = $('.hd__logo');
      if (logo) logo.focus({ preventScroll: true });
    });
  }

  /* Text split */
  function splitChars(el) {
    const text = el.textContent;
    const host = el.closest('h1, h2, h3') || el;
    host.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim());
    el.textContent = '';
    const frag = document.createDocumentFragment();
    const chars = [];
    Array.from(text).forEach((c) => {
      if (c === ' ') {
        frag.appendChild(document.createTextNode(' '));
        return;
      }
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      s.setAttribute('aria-hidden', 'true');
      frag.appendChild(s);
      chars.push(s);
    });
    el.appendChild(frag);
    return chars;
  }

  /* Hero */
  function initHero() {
    const hero = $('#hero');
    if (!hero) return;
    const line = $('.hero__line', hero);
    const chars = line ? splitChars(line) : [];
    if (!motion) return;

    const kicker = $('.hero__kicker', hero);
    const title = $('.hero__title', hero);
    const tag = $('.hero__tag', hero);
    const drop = $('.hero__prod-drop', hero);
    const stickerPop = $('.hero__sticker-pop', hero);
    const loop = $('.doodle--loop path', hero);
    const heartSvg = $('.doodle--heart', hero);
    const heart = $('.doodle--heart path', hero);
    const under = $('.doodle--under path', hero);
    const quick = $$('.quick__btn');
    const bgImg = $('.hero__bg img', hero);

    const tl = gsap.timeline({ delay: 0.15 });
    tl.fromTo(bgImg, { scale: 1.12 }, { scale: 1, duration: 2, ease: 'expo.out' }, 0)
      .fromTo('.hero__slab', { y: 0, yPercent: 101 }, { y: 0, yPercent: 0, duration: 1.2, ease: 'expo.out' }, 0.1)
      .fromTo(kicker, { autoAlpha: 0, y: 34, rotation: -5 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.9, ease: 'back.out(2)' }, 0.35)
      .set(title, { autoAlpha: 1 }, 0.45)
      .fromTo(chars, { yPercent: 120, scale: 0.5, rotation: (i) => (i % 2 ? 16 : -16), autoAlpha: 0 }, { yPercent: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 1, stagger: 0.07, ease: 'back.out(2.2)' }, 0.45)
      .fromTo(drop, { autoAlpha: 1, y: () => -window.innerHeight * 1.1, rotation: -24 }, {
        autoAlpha: 1, y: 0, rotation: 0, duration: 1.35, ease: 'bounce.out',
        onComplete: () => {
          gsap.to(drop, { y: -16, rotation: 1.5, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        }
      }, 0.6)
      .to(loop, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 1.05)
      .to(under, { strokeDashoffset: 0, duration: 0.85, ease: 'power3.inOut' }, 1.2)
      .fromTo(tag, { autoAlpha: 0, x: 70 }, { autoAlpha: 1, x: 0, duration: 1, ease: 'expo.out' }, 1.1)
      .fromTo(stickerPop, { autoAlpha: 0, scale: 0, rotation: -140 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 1.05, ease: 'back.out(2)' }, 1.35)
      .to(heart, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, 1.75)
      .to(heart, { fillOpacity: 1, duration: 0.25 }, 2.15)
      .fromTo(heartSvg, { scale: 0.6 }, { scale: 1, duration: 0.7, ease: 'back.out(4)' }, 2.1)
      .fromTo(quick, { autoAlpha: 0, scale: 0, x: 40 }, { autoAlpha: 1, scale: 1, x: 0, duration: 0.75, stagger: 0.09, ease: 'back.out(2.4)', clearProps: 'transform' }, 1.6);

    const scrub = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__prod', { yPercent: -28, ease: 'none', scrollTrigger: scrub });
    gsap.to('.hero__copy', { y: -90, ease: 'none', scrollTrigger: scrub });
    gsap.to('.hero__sticker', { y: -160, rotation: 120, ease: 'none', scrollTrigger: scrub });

    if (!fine) return;
    const layers = [
      { el: $('.hero__prod-par', hero), d: 34 },
      { el: $('.hero__sticker-par', hero), d: -64 },
      { el: $('.hero__copy-par', hero), d: 12 }
    ].filter((l) => l.el).map((l) => ({
      d: l.d,
      x: gsap.quickTo(l.el, 'x', { duration: 0.9, ease: 'power3' }),
      y: gsap.quickTo(l.el, 'y', { duration: 0.9, ease: 'power3' })
    }));
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      layers.forEach((l) => { l.x(nx * l.d); l.y(ny * l.d); });
    });
    hero.addEventListener('pointerleave', () => layers.forEach((l) => { l.x(0); l.y(0); }));
  }

  /* Section titles */
  function initTitlePops() {
    $$('.title-pop').forEach((el) => {
      const chars = splitChars(el);
      if (motion) {
        gsap.from(chars, {
          yPercent: 110, scale: 0.3, rotation: (i) => (i % 2 ? 22 : -22), autoAlpha: 0,
          duration: 1, stagger: 0.07, ease: 'back.out(2.4)',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        });
      }
      if (!fine || !hasGsap || reduce) return;
      chars.forEach((ch) => {
        ch.addEventListener('mouseenter', () => {
          if (gsap.isTweening(ch)) return;
          gsap.fromTo(ch, { y: 0, rotation: 0 }, { y: -20, rotation: gsap.utils.random(-12, 12), duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 });
        });
      });
    });
  }

  /* Brand */
  function initBrand() {
    const brand = $('#brand');
    if (!brand) return;
    initCardTilt(brand);
    if (!motion) return;

    gsap.fromTo($('.brand__ghost span', brand), { xPercent: 4 }, {
      xPercent: -34, ease: 'none',
      scrollTrigger: { trigger: brand, start: 'top bottom', end: 'bottom top', scrub: true }
    });

    gsap.timeline({ scrollTrigger: { trigger: $('.brand__head', brand), start: 'top 78%', once: true } })
      .fromTo('.brand__doodle', { scale: 0.4, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.9, ease: 'back.out(2.2)' }, 0)
      .to('.brand__doodle .draw', { strokeDashoffset: 0, duration: 1.1, stagger: 0.28, ease: 'power2.inOut' }, 0.1)
      .from('.brand__eyebrow', { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0.25)
      .from('.brand__title .mask > span', { yPercent: 110, rotation: 4, duration: 1, stagger: 0.12, ease: 'expo.out' }, 0.35)
      .from('.brand__desc', { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out' }, 0.6)
      .from('.brand__cta', { y: 24, scale: 0.8, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)', clearProps: 'transform' }, 0.7);

    const tilts = $$('.card__tilt', brand);
    const cards = $$('.card', brand);
    const tiltAngles = [-6, 5, -4, 6];
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 768px)', narrow: '(max-width: 767px)' }, (ctx) => {
      const wide = ctx.conditions.wide;
      gsap.from(tilts, {
        y: wide ? 180 : 40, x: wide ? 0 : 90, rotation: (i) => tiltAngles[i % 4], autoAlpha: 0,
        duration: 1.2, stagger: 0.11, ease: 'back.out(1.3)',
        scrollTrigger: { trigger: '.brand__cards', start: 'top 88%', once: true }
      });
      if (!wide) return;
      cards.forEach((card, i) => {
        const odd = i % 2 === 0;
        gsap.fromTo(card, { y: odd ? 50 : -30 }, {
          y: odd ? -50 : 60, ease: 'none',
          scrollTrigger: { trigger: '.brand__cards', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });
  }

  function initCardTilt(scope) {
    if (!hasGsap || !fine || reduce) return;
    $$('.card', scope).forEach((card) => {
      const t = $('.card__tilt', card);
      if (!t) return;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(t, { rotationX: -ny * 16, rotationY: nx * 16, scale: 1.02, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(t, { rotationX: 0, rotationY: 0, scale: 1, duration: 1.1, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
      });
    });
  }

  /* Videos */
  function initVideos() {
    const vids = $$('video');
    if (!vids.length) return;
    vids.forEach((v) => {
      v.muted = true;
      if (reduce) {
        v.removeAttribute('autoplay');
        v.pause();
      }
    });
    if (reduce || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting && v.hasAttribute('autoplay')) {
          const p = v.play();
          if (p && typeof p.catch === 'function') p.catch((err) => { if (err && err.name === 'NotAllowedError') v.removeAttribute('autoplay'); });
        } else if (!en.isIntersecting) {
          v.pause();
        }
      });
    }, { rootMargin: '120px 0px' });
    vids.forEach((v) => io.observe(v));
  }

  /* Menu switcher */
  function initMenu() {
    const sec = $('#menu');
    if (!sec) return;
    const stage = $('.menu__stage', sec);
    const imgs = $('.menu__imgs', sec);
    const shadow = $('.menu__shadow', sec);
    const badge = $('.menu__new', sec);
    const nameEl = $('.menu__name', sec);
    const enEl = $('.menu__en', sec);
    const descEl = $('.menu__desc', sec);
    const priceEl = $('.menu__price', sec);
    const priceNum = $('.menu__price strong', sec);
    const tabs = $$('.tab', sec);
    const lists = { chicken: $('#list-chicken'), side: $('#list-side') };
    if (!stage || !imgs || !nameEl || !enEl || !descEl || !priceNum || !lists.chicken || !lists.side) return;

    let list = 'chicken';
    let busy = false;
    let queued = null;
    let nameChars = splitChars(nameEl);

    const items = () => $$('.thumb', lists[list]);
    const read = (b) => ({
      name: b.dataset.name,
      en: b.dataset.en,
      desc: b.dataset.desc,
      price: Number(b.dataset.price) || 0,
      isNew: b.dataset.new === '1',
      src: $('img', b).getAttribute('src')
    });
    const fmt = (n) => n.toLocaleString('ko-KR');
    const liveEl = $('#menu-live', sec) || $('#menu-live');
    /* One announcement per change; the visible price counts up and would flood a live region. */
    const announce = (d) => { if (liveEl) liveEl.textContent = d.name + ', ' + fmt(d.price) + '원'; };
    let idx = Math.max(0, items().findIndex((b) => b.classList.contains('is-active')));
    let price = items()[idx] ? read(items()[idx]).price : 0;

    tabs.forEach((t) => t.setAttribute('tabindex', t.classList.contains('is-active') ? '0' : '-1'));

    function swapName(text, dir) {
      const old = nameChars;
      const enter = () => {
        nameEl.textContent = text;
        nameChars = splitChars(nameEl);
        gsap.from(nameChars, { yPercent: 110, autoAlpha: 0, rotation: 10 * dir, duration: 0.7, stagger: 0.035, ease: 'back.out(2.2)' });
      };
      if (!old.length) {
        enter();
        return;
      }
      gsap.to(old, { yPercent: -110, autoAlpha: 0, rotation: -8 * dir, duration: 0.28, stagger: 0.018, ease: 'power2.in', overwrite: 'auto', onComplete: enter });
    }

    function setInfo(d, dir) {
      if (!motion) {
        nameEl.textContent = d.name;
        nameChars = splitChars(nameEl);
        enEl.textContent = d.en;
        descEl.textContent = d.desc;
        priceNum.textContent = fmt(d.price);
        price = d.price;
        announce(d);
        return;
      }
      announce(d);
      swapName(d.name, dir);
      gsap.timeline()
        .to([enEl, descEl], { autoAlpha: 0, y: -10, duration: 0.22, ease: 'power2.in', overwrite: 'auto' })
        .add(() => { enEl.textContent = d.en; descEl.textContent = d.desc; })
        .fromTo([enEl, descEl], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
      const o = { v: price };
      gsap.to(o, { v: d.price, duration: 0.8, ease: 'power2.out', onUpdate: () => { priceNum.textContent = fmt(Math.round(o.v / 100) * 100); } });
      gsap.fromTo(priceEl, { scale: 0.82, rotation: -4 * dir }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(3)' });
      price = d.price;
    }

    function revealThumb(btn) {
      const ul = btn.closest('.thumbs');
      const li = btn.parentElement;
      if (!ul || !li || ul.scrollWidth <= ul.clientWidth + 2) return;
      const left = li.offsetLeft - (ul.clientWidth - li.offsetWidth) / 2;
      ul.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
    }

    function unlock() {
      busy = false;
      if (!queued) return;
      const q = queued;
      queued = null;
      if (q.tab) switchTab(q.tab);
      else go(q.next, q.dir);
    }

    function go(next, dir, force) {
      const all = items();
      if (!all.length) return;
      next = (next + all.length) % all.length;
      if (next === idx && !force) return;
      if (busy) {
        if (!queued || !queued.tab) queued = { next, dir };
        return;
      }
      busy = true;
      const btn = all[next];
      const d = read(btn);
      all.forEach((b, k) => {
        const on = k === next;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      revealThumb(btn);
      if (badge) badge.classList.toggle('is-off', !d.isNew);

      const oldImg = imgs.lastElementChild;
      const img = new Image(900, 900);
      img.className = 'menu__img';
      img.alt = d.name;
      img.decoding = 'async';
      img.src = d.src;
      imgs.appendChild(img);
      idx = next;
      setInfo(d, dir);

      const removeOld = () => { if (oldImg && oldImg !== img && oldImg.parentNode) oldImg.remove(); };
      if (!motion) {
        removeOld();
        unlock();
        return;
      }
      gsap.timeline({ onComplete: removeOld })
        .to(oldImg, { xPercent: -125 * dir, rotation: -230 * dir, autoAlpha: 0, duration: 0.7, ease: 'power3.in', overwrite: 'auto' }, 0)
        .to(shadow, { scaleX: 0.35, duration: 0.5, ease: 'power2.in', overwrite: 'auto' }, 0)
        .fromTo(img, { xPercent: 130 * dir, rotation: 250 * dir, autoAlpha: 0 }, { xPercent: 0, rotation: 0, autoAlpha: 1, duration: 1.05, ease: 'back.out(1.5)' }, 0.22)
        .to(shadow, { scaleX: 1, duration: 0.8, ease: 'back.out(2.5)', overwrite: 'auto' }, 0.72)
        .call(unlock, null, 0.62);
    }

    function switchTab(name) {
      if (name === list || !lists[name]) return;
      if (busy) {
        queued = { tab: name };
        return;
      }
      const prev = lists[list];
      const nextList = lists[name];
      tabs.forEach((t) => {
        const on = t.dataset.tab === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('tabindex', on ? '0' : '-1');
      });
      list = name;
      idx = -1;
      const show = () => {
        prev.classList.remove('is-active');
        nextList.classList.add('is-active');
        nextList.scrollLeft = 0;
        if (motion) {
          gsap.fromTo($$('.thumb', nextList), { y: 40, scale: 0.6, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.6, stagger: 0.06, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' });
        }
        go(0, 1, true);
      };
      if (!motion) {
        show();
        return;
      }
      busy = true;
      const prevThumbs = $$('.thumb', prev);
      gsap.to(prevThumbs, {
        y: 30, autoAlpha: 0, duration: 0.25, stagger: 0.03, ease: 'power2.in',
        onComplete: () => {
          gsap.set(prevThumbs, { clearProps: 'all' });
          busy = false;
          show();
        }
      });
    }

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => switchTab(t.dataset.tab));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        n.focus();
        switchTab(n.dataset.tab);
      });
    });

    Object.keys(lists).forEach((key) => {
      lists[key].addEventListener('click', (e) => {
        const b = e.target.closest('.thumb');
        if (!b || key !== list) return;
        const i = items().indexOf(b);
        if (i >= 0 && i !== idx) go(i, i > idx ? 1 : -1);
      });
    });

    const prevBtn = $('.menu__arrow--prev', sec);
    const nextBtn = $('.menu__arrow--next', sec);
    if (prevBtn) prevBtn.addEventListener('click', () => go(idx - 1, -1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(idx + 1, 1));

    let sx = 0;
    let sy = 0;
    let sid = null;
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      sid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      if (e.pointerType === 'mouse' && stage.setPointerCapture) {
        try { stage.setPointerCapture(e.pointerId); } catch (err) { sid = e.pointerId; }
      }
    });
    stage.addEventListener('pointerup', (e) => {
      if (sid !== e.pointerId) return;
      sid = null;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        const dir = dx < 0 ? 1 : -1;
        go(idx + dir, dir);
      }
    });
    stage.addEventListener('pointercancel', () => { sid = null; });

    if (motion && fine) {
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        gsap.to(imgs, { x: nx * 30, rotation: nx * 6, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
      });
      stage.addEventListener('pointerleave', () => {
        gsap.to(imgs, { x: 0, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
      });
    }

    if (!motion) return;
    gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 70%', once: true } })
      .from('.menu__sub', { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0.3)
      .from('.menu__tabs', { scale: 0.6, autoAlpha: 0, duration: 0.8, ease: 'back.out(2.4)', clearProps: 'transform' }, 0.4);

    if (badge) badge.classList.add('is-off');
    gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 78%', once: true } })
      .from(imgs.firstElementChild, { yPercent: -80, rotation: -40, autoAlpha: 0, duration: 1.3, ease: 'bounce.out' }, 0)
      .from(shadow, { scaleX: 0, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)' }, 0.55)
      .fromTo('.menu__wave', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.inOut' }, 0)
      .from('.menu__arrow', { scale: 0, rotation: -90, duration: 0.7, stagger: 0.1, ease: 'back.out(2.4)', clearProps: 'transform', ...quiet }, 0.6)
      .call(() => { if (badge) badge.classList.toggle('is-off', !read(items()[Math.max(0, idx)]).isNew); }, null, 0.9)
      .from('.menu__info > *', { y: 30, autoAlpha: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.4)
      .from($$('.thumb', lists.chicken), { y: 50, scale: 0.5, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' }, 0.5);
  }

  /* SNS: marquee + exploded layers */
  function initSns() {
    const sns = $('#sns');
    if (!sns || !motion) return;
    const rows = $$('.mq', sns);
    const layers = $$('.ex', sns);

    const rowState = rows.map((row, i) => {
      row.classList.add('is-driven');
      return { row, track: $('.mq__track', row), dir: Number(row.dataset.dir) || 1, w: 0, x: 0, seed: [0.35, 0.6, 0.15][i % 3] };
    });
    const measure = () => {
      rowState.forEach((r) => {
        const g = r.track && r.track.firstElementChild;
        const w = g ? g.offsetWidth : 0;
        r.x = r.w ? (r.x / r.w) * w : -w * r.seed;
        r.w = w;
      });
    };
    measure();
    ST.addEventListener('refresh', measure);

    let visible = false;
    let boost = 0;
    const watch = ST.create({ trigger: sns, start: 'top bottom', end: 'bottom top', onToggle: (self) => { visible = self.isActive; } });
    gsap.ticker.add((time, deltaMs) => {
      if (!visible) return;
      const dt = Math.min(deltaMs, 50) / 1000;
      const target = clamp(Math.abs(watch.getVelocity()) / 450, 0, 7);
      boost += (target - boost) * Math.min(1, dt * 5);
      const base = Math.max(46, window.innerWidth * 0.045);
      rowState.forEach((r, i) => {
        if (!r.w || !r.track) return;
        r.x += r.dir * base * (1 + boost) * (i === 1 ? 1.2 : 1) * dt;
        if (r.dir > 0 && r.x >= 0) r.x -= r.w;
        if (r.dir < 0 && r.x <= -r.w) r.x += r.w;
        r.track.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0)';
      });
    });

    rows.forEach((row, i) => {
      const dir = Number(row.dataset.dir) || 1;
      gsap.from(row, { xPercent: dir > 0 ? -22 : 22, autoAlpha: 0, duration: 1.5, delay: i * 0.1, ease: 'expo.out', scrollTrigger: { trigger: sns, start: 'top 72%', once: true } });
    });
    gsap.fromTo('.sns__mq', { rotation: 5 }, { rotation: -5, ease: 'none', scrollTrigger: { trigger: sns, start: 'top bottom', end: 'bottom top', scrub: true } });

    const vw = () => window.innerWidth / 100;
    const vh = () => window.innerHeight / 100;
    const k = () => (window.innerWidth < 768 ? 0.9 : 1);
    const cluster = [[-2.5, 3, -40], [3, 2, 30], [0, 0, 0], [-2, -2, -25], [2.5, -1.5, 35]];
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sns, start: 'top 60%', end: 'bottom bottom', scrub: 1.1, invalidateOnRefresh: true,
        onUpdate: (self) => { shared.snsProgress = self.progress; }
      }
    });
    layers.forEach((el, i) => {
      const css = (n) => parseFloat(el.style.getPropertyValue(n)) || 0;
      const X = css('--x');
      const Y = css('--y');
      const R = css('--r');
      const S = css('--s') || 1;
      const c = cluster[i % cluster.length];
      tl.fromTo(el,
        { x: () => c[0] * vw(), y: () => c[1] * vh(), xPercent: 0, yPercent: 0, rotation: c[2], scale: 0.32 },
        { x: () => X * vw() * k(), y: () => Y * vh(), xPercent: 0, yPercent: 0, rotation: R, scale: S, duration: 1, ease: 'power3.out' },
        i * 0.05);
    });

    if (fine) {
      const pars = layers.map((el) => {
        const p = $('.ex__par', el);
        return {
          d: parseFloat(el.dataset.depth) || 0.5,
          x: gsap.quickTo(p, 'x', { duration: 1, ease: 'power3' }),
          y: gsap.quickTo(p, 'y', { duration: 1, ease: 'power3' })
        };
      });
      sns.addEventListener('pointermove', (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        shared.pointer.x = nx;
        shared.pointer.y = ny;
        pars.forEach((p) => { p.x(nx * 90 * p.d); p.y(ny * 70 * p.d); });
      });
      sns.addEventListener('pointerleave', () => {
        shared.pointer.x = 0;
        shared.pointer.y = 0;
        pars.forEach((p) => { p.x(0); p.y(0); });
      });
    }

    gsap.timeline({ scrollTrigger: { trigger: sns, start: 'top 45%', once: true } })
      .from('.sns__label', { x: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0)
      .from('.sns__title .mask > span', { yPercent: 110, duration: 1, stagger: 0.12, ease: 'expo.out' }, 0.1)
      .from('.sns__links li', { y: 50, scale: 0.7, rotation: (i) => [-8, 6, -4][i % 3], autoAlpha: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(2.2)' }, 0.3);
  }

  /* SNS: three.js drumstick */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Script load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      const gl = window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
      if (!gl) return false;
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (err) {
      return false;
    }
  }

  function initDrumstick() {
    const sns = $('#sns');
    const wrap = $('.sns__3d');
    const canvas = $('.sns__canvas');
    if (!sns || !wrap || !canvas) return;

    let failed = false;
    let teardown = null;
    const fail = () => {
      if (failed) return;
      failed = true;
      sns.classList.add('is-fallback');
      if (teardown) teardown();
    };
    if (!window.Promise || !webglAvailable()) {
      fail();
      return;
    }

    let started = false;
    const start = () => {
      if (started || failed) return;
      started = true;
      const ready = window.THREE ? Promise.resolve() : loadScript('../vendor/three.min.js');
      ready
        .then(() => {
          if (!window.THREE) throw new Error('THREE missing');
          return window.THREE.GLTFLoader ? null : loadScript('../vendor/GLTFLoader.js');
        })
        .then(() => {
          if (!window.THREE.GLTFLoader) throw new Error('GLTFLoader missing');
          build(window.THREE);
        })
        .catch(fail);
    };

    if ('IntersectionObserver' in window) {
      const near = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          near.disconnect();
          start();
        }
      }, { rootMargin: '150% 0px' });
      near.observe(sns);
    }
    window.addEventListener('load', () => {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
      idle(start, { timeout: 2500 });
    });

    function build(THREE) {
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      } catch (err) {
        fail();
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 4);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a5a2b, 0.55));
      const key = new THREE.DirectionalLight(0xfff4e0, 1.25);
      key.position.set(2.5, 3, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffd27a, 0.7);
      rim.position.set(-3, 1.5, -2.5);
      scene.add(rim);

      const tilt = new THREE.Group();
      const outer = new THREE.Group();
      /* The model already sits diagonally with its best side toward +Z, so it needs no extra standing rotation. */
      const inner = new THREE.Group();
      outer.add(inner);
      tilt.add(outer);
      scene.add(tilt);
      outer.scale.setScalar(0.001);

      const look = { appear: 0 };
      let ready = false;
      let visible = false;
      let running = false;
      let raf = 0;
      let last = 0;
      let clock = 0;
      let lastSig = NaN;
      let autoA = 0;
      let dragA = 0;
      let vel = 0;
      let tiltX = 0;
      let tiltT = 0;
      let scrollA = 0;
      let scaleP = 0;
      let px = 0;
      let py = 0;
      let dragging = false;
      let pid = null;
      let lx = 0;
      let ly = 0;
      let lt = 0;

      function resize() {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        lastSig = NaN;
      }

      function frame(now) {
        raf = 0;
        if (!running) return;
        const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
        last = now;
        clock += dt;
        const ease = 1 - Math.pow(0.002, dt);
        const p = shared.snsProgress;
        scrollA += (p * Math.PI * 2 - scrollA) * ease;
        scaleP += (p - scaleP) * ease;
        px += (shared.pointer.x - px) * ease;
        py += (shared.pointer.y - py) * ease;
        if (!dragging) {
          dragA += vel * dt;
          vel *= Math.pow(0.08, dt);
          if (Math.abs(vel) < 0.002) vel = 0;
          tiltT *= Math.pow(0.02, dt);
        }
        if (!reduce) {
          const facing = (1 - Math.cos(autoA + dragA + scrollA)) / 2;
          autoA += 0.42 * (0.3 + 0.7 * facing) * dt;
        }
        tiltX += (tiltT - tiltX) * (1 - Math.pow(0.001, dt));
        outer.rotation.y = autoA + dragA + scrollA + px * 0.35;
        tilt.rotation.x = tiltX + py * 0.18;
        outer.position.y = reduce ? 0 : Math.sin(clock * 1.3) * 0.05;
        outer.scale.setScalar(Math.max(look.appear * (1 + 0.12 * scaleP), 0.001));
        const sig = outer.rotation.y * 1000 + tilt.rotation.x * 100 + outer.position.y * 10 + outer.scale.x;
        if (sig !== lastSig) {
          renderer.render(scene, camera);
          lastSig = sig;
        }
        raf = requestAnimationFrame(frame);
      }

      function sync() {
        const should = ready && visible && !failed && document.visibilityState === 'visible';
        if (should && !running) {
          running = true;
          last = 0;
          raf = requestAnimationFrame(frame);
        } else if (!should && running) {
          running = false;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        }
      }

      const io = new IntersectionObserver((entries) => {
        visible = entries.some((en) => en.isIntersecting);
        sync();
      }, { rootMargin: '80px 0px' });
      io.observe(sns);
      document.addEventListener('visibilitychange', sync);
      if ('ResizeObserver' in window) new ResizeObserver(resize).observe(wrap);
      else window.addEventListener('resize', resize);
      resize();

      teardown = () => {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        io.disconnect();
        document.removeEventListener('visibilitychange', sync);
        renderer.dispose();
      };

      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        fail();
      });

      canvas.addEventListener('pointerdown', (e) => {
        if (!ready) return;
        dragging = true;
        pid = e.pointerId;
        vel = 0;
        lx = e.clientX;
        ly = e.clientY;
        lt = performance.now();
        if (canvas.setPointerCapture) canvas.setPointerCapture(pid);
        wrap.classList.add('is-grabbing', 'is-touched');
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!dragging || e.pointerId !== pid) return;
        const now = performance.now();
        const dx = e.clientX - lx;
        const dy = e.clientY - ly;
        const dts = Math.max((now - lt) / 1000, 0.008);
        const dA = dx * 0.011;
        dragA += dA;
        vel = clamp(vel * 0.4 + (dA / dts) * 0.6, -14, 14);
        if (e.pointerType === 'mouse') tiltT = clamp(tiltT + dy * 0.005, -0.45, 0.45);
        lx = e.clientX;
        ly = e.clientY;
        lt = now;
      });
      const release = (e) => {
        if (!dragging || (e && e.pointerId !== pid)) return;
        dragging = false;
        if (performance.now() - lt > 90) vel *= 0.2;
        wrap.classList.remove('is-grabbing');
        if (canvas.hasPointerCapture && canvas.hasPointerCapture(pid)) canvas.releasePointerCapture(pid);
        pid = null;
      };
      canvas.addEventListener('pointerup', release);
      canvas.addEventListener('pointercancel', release);
      canvas.addEventListener('lostpointercapture', release);
      canvas.addEventListener('keydown', (e) => {
        if (!ready || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        e.preventDefault();
        vel = clamp(vel + (e.key === 'ArrowRight' ? 5 : -5), -14, 14);
        wrap.classList.add('is-touched');
      });

      const loader = new THREE.GLTFLoader();
      loader.load('assets/model/drumstick.glb', (gltf) => {
        const model = gltf && (gltf.scene || (gltf.scenes && gltf.scenes[0]));
        if (!model) {
          fail();
          return;
        }
        model.traverse((o) => {
          if (!o.isMesh) return;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            if (!m) return;
            m.metalness = 0;
            m.metalnessMap = null;
            m.roughness = 0.82;
            m.emissiveIntensity = 0.3;
            if (m.normalScale) m.normalScale.set(1, 1);
            m.needsUpdate = true;
          });
        });
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.position.sub(center);
        const fit = new THREE.Group();
        fit.add(model);
        fit.scale.setScalar(1.42 / maxDim);
        inner.add(fit);

        ready = true;
        wrap.classList.add('is-ready');
        canvas.setAttribute('tabindex', '0');
        if (hasGsap && !reduce) gsap.to(look, { appear: 1, duration: 1.3, ease: 'back.out(1.7)' });
        else look.appear = 1;
        sync();
      }, undefined, fail);
    }
  }

  /* Store */
  function initStore() {
    const sec = $('#store');
    if (!sec || !motion) return;
    gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 70%', once: true } })
      .from('.store__disc', { scale: 0, duration: 1, ease: 'back.out(1.6)' }, 0.1)
      .fromTo('.store__iso', { yPercent: 70, scale: 0.6, rotation: -10, autoAlpha: 0 }, { yPercent: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 1.4, ease: 'back.out(1.6)' }, 0.3)
      .from('.store__sub', { y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out' }, 0.35)
      .from('.store__copy .pill', { y: 30, scale: 0.8, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)', clearProps: 'transform', ...quiet }, 0.5)
      .from('.pin__in', { y: -140, scale: 0, autoAlpha: 0, duration: 1.1, stagger: 0.16, ease: 'bounce.out' }, 0.95);
    gsap.from('.scard', {
      y: 90, rotationX: -65, autoAlpha: 0, transformOrigin: '50% 100%', transformPerspective: 900,
      duration: 1.1, stagger: 0.12, ease: 'back.out(1.5)', clearProps: 'transform,opacity,visibility', ...quiet,
      scrollTrigger: { trigger: '.store__list', start: 'top 88%', once: true }
    });
  }

  /* Event */
  function initEvent() {
    const sec = $('#event');
    if (!sec || !motion) return;
    gsap.fromTo('.event__curve', { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 70%', once: true } })
      .from('.event__sub', { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0.35)
      .from('.event__head .pill', { x: 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out', clearProps: 'transform', ...quiet }, 0.45);
    const grid = { trigger: '.event__grid', start: 'top 85%', once: true };
    gsap.from($$('.ecard', sec), {
      x: (i) => (i ? 160 : -160), y: (i) => (i ? 140 : 90), rotation: (i) => (i ? 10 : -10), autoAlpha: 0,
      duration: 1.25, stagger: 0.14, ease: 'back.out(1.3)', clearProps: 'transform,opacity,visibility', ...quiet,
      scrollTrigger: grid
    });
    gsap.from($$('.ecard__over > *', sec), { x: -40, autoAlpha: 0, duration: 0.8, stagger: 0.08, delay: 0.55, ease: 'power3.out', scrollTrigger: grid });
  }

  /* Contact tiles */
  function initContact() {
    const sec = $('#contact');
    if (!sec || !motion) return;
    gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 80%', once: true } })
      .from($$('.tile', sec), { y: 80, scale: 0.86, rotation: (i) => (i ? 5 : -5), autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: 'back.out(1.8)', clearProps: 'transform,opacity,visibility', ...quiet }, 0)
      .from($$('.tile__big', sec), { yPercent: 40, autoAlpha: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out' }, 0.3)
      .from($$('.tile__arrow', sec), { scale: 0, rotation: -180, duration: 0.8, stagger: 0.12, ease: 'back.out(2.4)', clearProps: 'transform' }, 0.45);
  }

  /* Statement */
  function initStatement() {
    const sec = $('#statement');
    if (!sec || !motion) return;
    const mediaEl = $('.stmt__media', sec);
    const img = $('.stmt__media img', sec);
    const left = $('.stmt__side--l', sec);
    const right = $('.stmt__side--r', sec);
    const lines = $$('.stmt__big .ln > span', sec);
    const note = $('.stmt__note', sec);
    if (!mediaEl || !img || !left || !right || !lines.length) return;

    const mm = gsap.matchMedia();
    mm.add({ narrow: '(max-width: 767px)', wide: '(min-width: 768px)' }, (ctx) => {
      const narrow = ctx.conditions.narrow;
      const startClip = narrow ? 'inset(26% 12% 26% 12% round 24px)' : 'inset(18% 38% 18% 38% round 30px)';
      const linesTl = gsap.timeline({ paused: true })
        .fromTo(lines, { y: 0, yPercent: 110, rotation: 6 }, { y: 0, yPercent: 0, rotation: 0, duration: 0.9, stagger: 0.1, ease: 'back.out(1.6)' })
        .fromTo(note, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.3);
      let shown = false;
      const out = (sign) => (narrow
        ? { y: () => sign * window.innerHeight * 0.25, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }
        : { x: () => sign * window.innerWidth * 0.4, autoAlpha: 0, duration: 0.6, ease: 'power2.in' });

      gsap.timeline({
        scrollTrigger: {
          trigger: sec, start: 'top top', end: '+=200%', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (self.progress > 0.78 && !shown) {
              shown = true;
              linesTl.timeScale(1).play();
            } else if (self.progress < 0.7 && shown) {
              shown = false;
              linesTl.timeScale(1.6).reverse();
            }
          }
        }
      })
        .fromTo(mediaEl, { clipPath: startClip }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'power2.inOut' }, 0)
        .fromTo(img, { scale: 1.15 }, { scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
        .fromTo(left, { x: 0, y: 0, autoAlpha: 1 }, out(-1), 0)
        .fromTo(right, { x: 0, y: 0, autoAlpha: 1 }, out(1), 0)
        .to({}, { duration: 0.45 });

      return () => linesTl.kill();
    });
  }

  /* Footer */
  function initFooter() {
    const sel = $('.ft__family select');
    if (sel) {
      sel.addEventListener('change', () => {
        const v = sel.value;
        if (v && v.charAt(0) === '#') {
          const el = document.getElementById(v.slice(1));
          if (el) {
            scrollToTarget(el);
            focusTarget(el);
          }
        }
        sel.value = '';
      });
    }
    if (!motion) return;
    const ft = { trigger: '.ft', start: 'top 88%', once: true };
    gsap.from('.ft__top > *', { y: 50, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', scrollTrigger: ft });
    gsap.from('.ft__doodle', { rotation: -90, scale: 0, duration: 1, delay: 0.2, ease: 'back.out(2)', clearProps: 'transform', ...quiet, scrollTrigger: ft });
  }

  /* Boot */
  run('scroll', initScroll);
  run('anchors', initAnchors);
  run('nav', initNav);
  run('activeNav', initActiveNav);
  run('quick', initQuick);
  run('hero', initHero);
  run('titles', initTitlePops);
  run('brand', initBrand);
  run('videos', initVideos);
  run('menu', initMenu);
  run('sns', initSns);
  run('drumstick', initDrumstick);
  run('store', initStore);
  run('event', initEvent);
  run('contact', initContact);
  run('statement', initStatement);
  run('footer', initFooter);

  if (hasGsap) {
    const refresh = () => ST.refresh();
    window.addEventListener('load', refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  }
})();
