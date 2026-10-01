/* BASAK CHICKEN · WARM */
(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('is-ready');

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const prefersReduced = !!(reduceQuery && reduceQuery.matches);
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const hasGSAP = !!(gsap && ScrollTrigger);
  const hasSwiper = typeof window.Swiper === 'function';
  const hasLenis = typeof window.Lenis === 'function';

  if (!hasGSAP || prefersReduced) root.classList.add('no-motion');
  const MOTION = !root.classList.contains('no-motion');

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.config({ nullTargetWarn: false });
  }

  function safe(name, fn) {
    try {
      fn();
    } catch (err) {
      root.classList.add('no-motion');
      if (window.console && typeof console.warn === 'function') console.warn('[basak] ' + name + ' skipped', err);
    }
  }

  /* ---------- Shared state ---------- */
  const header = $('.site-header');
  const dock = $('[data-mascot-dock]');
  const footer = $('.site-footer');
  const menuApi = { setFilter: function () { return false; }, focus: function () { return false; } };
  const siteMenu = { isOpen: function () { return false; }, close: function () { return false; } };
  let lenis = null;
  let lockCount = 0;
  let heroDark = false;
  let heroInView = true;

  function lockScroll() {
    lockCount += 1;
    if (lockCount === 1) {
      const sbw = Math.max(0, window.innerWidth - root.clientWidth);
      root.style.setProperty('--sbw', sbw + 'px');
      root.classList.add('scroll-locked');
      if (lenis) lenis.stop();
    }
  }
  function unlockScroll() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      root.classList.remove('scroll-locked');
      if (lenis) lenis.start();
    }
  }

  function inertTargets() {
    return [$('.skip-link'), header, $('#main'), footer, dock].filter(Boolean);
  }
  function setInert(on, except) {
    inertTargets().forEach((el) => {
      if (except && el === except) return;
      el.inert = on;
    });
  }

  function focusables(container) {
    if (!container) return [];
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter((el) => el.getClientRects().length > 0 && window.getComputedStyle(el).visibility !== 'hidden');
  }
  function trapTab(e, list) {
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    const inside = list.indexOf(active) !== -1;
    if (e.shiftKey) {
      if (active === first || !inside) { e.preventDefault(); last.focus(); }
    } else if (active === last || !inside) {
      e.preventDefault();
      first.focus();
    }
  }

  function headerOffset() {
    return window.innerWidth <= 768 ? 62 : 68;
  }
  function scrollToEl(target) {
    if (!target) return;
    const offset = target.id === 'hero' ? 0 : -(headerOffset() - 2);
    if (lenis) {
      lenis.scrollTo(target, { offset: offset, duration: 1.4 });
      return;
    }
    const top = target.getBoundingClientRect().top + window.pageYOffset + offset;
    window.scrollTo({ top: top, behavior: prefersReduced ? 'auto' : 'smooth' });
  }
  function focusTarget(target) {
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  function updateHeaderTone() {
    if (header) header.classList.toggle('on-dark', heroDark && heroInView);
  }

  /* ---------- Smooth scroll ---------- */
  safe('lenis', () => {
    if (!MOTION || !hasLenis) return;
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  });

  /* ---------- Header state + mascot dock ---------- */
  let ticking = false;
  function onScrollFrame() {
    ticking = false;
    const y = window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 40);
    if (dock && footer) {
      const vh = window.innerHeight;
      const footerTop = footer.getBoundingClientRect().top - 50;
      const overlap = Math.max(0, vh - footerTop);
      dock.style.setProperty('--dock-y', (-overlap).toFixed(1) + 'px');
      const dockTop = vh - overlap - dock.offsetHeight - 30;
      dock.classList.toggle('is-tucked', dockTop < headerOffset() + 20);
    }
  }
  function requestScrollFrame() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScrollFrame);
  }
  window.addEventListener('scroll', requestScrollFrame, { passive: true });
  window.addEventListener('resize', requestScrollFrame);
  onScrollFrame();

  /* ---------- Full menu overlay ---------- */
  safe('site-menu', () => {
    const btn = $('.menu-toggle');
    const panel = $('#site-menu');
    if (!btn || !panel) return;
    let open = false;
    let focusTimer = 0;
    panel.inert = true;

    function setOrigin() {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) + 40;
      panel.style.setProperty('--cx', cx.toFixed(1) + 'px');
      panel.style.setProperty('--cy', cy.toFixed(1) + 'px');
      panel.style.setProperty('--r', radius.toFixed(1) + 'px');
    }
    function openMenu() {
      if (open) return;
      open = true;
      window.clearTimeout(focusTimer);
      setOrigin();
      panel.inert = false;
      panel.scrollTop = 0;
      panel.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', '전체 메뉴 닫기');
      if (header) header.classList.add('menu-open');
      setInert(true, header);
      lockScroll();
      focusTimer = window.setTimeout(() => {
        const first = $('a', panel);
        if (first) first.focus({ preventScroll: true });
      }, MOTION ? 420 : 0);
    }
    function closeMenu(opts) {
      if (!open) return;
      open = false;
      window.clearTimeout(focusTimer);
      panel.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', '전체 메뉴 열기');
      if (header) header.classList.remove('menu-open');
      panel.inert = true;
      setInert(false);
      unlockScroll();
      if (!opts || opts.returnFocus !== false) btn.focus({ preventScroll: true });
    }

    btn.addEventListener('click', () => {
      if (open) closeMenu();
      else openMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      } else if (e.key === 'Tab') {
        trapTab(e, focusables(header).concat(focusables(panel)));
      }
    });
    window.addEventListener('resize', () => { if (open) setOrigin(); });

    siteMenu.isOpen = () => open;
    siteMenu.close = closeMenu;
  });

  /* ---------- In-page links ---------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const go = () => {
      if (link.dataset.menuFilter) menuApi.setFilter(link.dataset.menuFilter);
      if (link.dataset.menuFocus) menuApi.focus(link.dataset.menuFocus);
      scrollToEl(target);
      focusTarget(target);
    };
    if (siteMenu.isOpen()) {
      siteMenu.close({ returnFocus: false });
      window.setTimeout(go, MOTION ? 380 : 0);
    } else {
      go();
    }
  });

  /* ---------- Reveal helpers ---------- */
  function markIn(list) {
    list.forEach((el) => el.classList.add('is-in'));
  }
  function reveal(targets, fromVars, toVars, triggerEl, start) {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!list.length) return null;
    if (!MOTION) {
      markIn(list);
      return null;
    }
    const vars = Object.assign(
      { autoAlpha: 1, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      toVars,
      {
        scrollTrigger: { trigger: triggerEl || list[0], start: start || 'top 84%', once: true },
        onStart: () => markIn(list)
      }
    );
    return gsap.fromTo(list, Object.assign({ autoAlpha: 0 }, fromVars), vars);
  }

  function splitChars(el) {
    if (el.splitChars) return el.splitChars;
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const nodes = Array.from(el.childNodes);
    const chars = [];
    el.textContent = '';
    nodes.forEach((node) => {
      if (node.nodeType !== 3) {
        el.appendChild(node);
        return;
      }
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          el.appendChild(document.createTextNode(' '));
          return;
        }
        const word = document.createElement('span');
        word.className = 'word';
        word.setAttribute('aria-hidden', 'true');
        Array.from(part).forEach((ch) => {
          const c = document.createElement('span');
          c.className = 'char';
          c.textContent = ch;
          word.appendChild(c);
          chars.push(c);
        });
        el.appendChild(word);
      });
    });
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    el.appendChild(sr);
    el.splitChars = chars;
    return chars;
  }

  safe('titles', () => {
    if (!MOTION) return;
    $$('[data-split]').forEach((el) => {
      const chars = splitChars(el);
      gsap.fromTo(chars,
        { yPercent: 70, autoAlpha: 0, rotate: (i) => (i % 2 ? 12 : -12) },
        {
          yPercent: 0,
          autoAlpha: 1,
          rotate: 0,
          duration: 0.75,
          ease: 'back.out(2)',
          stagger: 0.045,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          onStart: () => el.classList.add('is-in')
        });
    });
  });

  safe('small-reveals', () => {
    $$('.hand-label[data-reveal]').forEach((el) => {
      reveal(el, { y: 16, rotate: -14 }, { y: 0, rotate: -4, duration: 0.9, ease: 'back.out(2.2)' });
    });
    $$('.section-desc[data-reveal], .sns__desc[data-reveal], .promo__title[data-reveal]').forEach((el) => {
      reveal(el, { y: 26 }, { y: 0, duration: 0.9, delay: 0.18 });
    });
    $$('.sns__handle[data-reveal]').forEach((el) => {
      reveal(el, {}, { duration: 0.8, delay: 0.3 });
    });
    const filter = $('.filter[data-reveal]');
    reveal(filter, { y: 22, scale: 0.92 }, { y: 0, scale: 1, duration: 0.9, ease: 'back.out(2)', delay: 0.25 });
    const divider = $('.divider');
    if (divider && MOTION) {
      gsap.fromTo(divider, { clipPath: 'inset(0% 50% 0% 50%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath',
        scrollTrigger: { trigger: divider, start: 'top 92%', once: true }
      });
      gsap.fromTo($('.divider__badge', divider), { rotate: -200, scale: 0.3 }, {
        rotate: 0, scale: 1, duration: 1.2, ease: 'back.out(2)', clearProps: 'transform',
        scrollTrigger: { trigger: divider, start: 'top 92%', once: true }
      });
    }
  });

  /* ---------- Hero slider ---------- */
  safe('hero', () => {
    const hero = $('#hero');
    if (!hero) return;
    const slides = $$('.hero-slide', hero);
    const video = $('.hero-slide__video', hero);
    const pagination = $('.hero__pagination', hero);
    const countCur = $('.hero__count-cur', hero);
    let swiper = null;
    let activeSlide = slides[0] || null;
    let prevSlide = null;

    if (video && !MOTION) {
      video.removeAttribute('autoplay');
      video.pause();
    }

    function syncVideo() {
      if (!video) return;
      const shouldPlay = MOTION && heroInView && !document.hidden && activeSlide && activeSlide.contains(video);
      if (shouldPlay) {
        if (video.paused) {
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => video.setAttribute('data-blocked', 'true'));
        }
      } else if (!video.paused) {
        video.pause();
      }
    }

    function showCopy(slide, first) {
      if (!MOTION || !slide) return;
      const lines = $$('.line__inner', slide);
      const kicker = $('.hero-slide__kicker span', slide);
      const doodle = $('.doodle path', slide);
      const btn = $('.hero-slide__btn', slide);
      gsap.killTweensOf([kicker, doodle, btn].concat(lines).filter(Boolean));
      const tl = gsap.timeline({ delay: first ? 0.2 : 0.3 });
      /* CSS parks the lines at translateY(112%); GSAP reads that as a pixel y, so reset y along with yPercent. */
      tl.fromTo(lines, { yPercent: 112, y: 0 }, { yPercent: 0, y: 0, duration: 1.15, ease: 'expo.out', stagger: 0.12 }, 0);
      if (kicker) tl.fromTo(kicker, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.05);
      if (doodle) tl.fromTo(doodle, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.95, ease: 'power2.inOut' }, 0.35);
      if (btn) {
        tl.fromTo(btn, { autoAlpha: 0, y: 24, scale: 0.9 }, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.85, ease: 'back.out(1.8)',
          onStart: () => { btn.style.transition = 'none'; },
          onComplete: () => {
            gsap.set(btn, { clearProps: 'transform' });
            btn.style.transition = '';
          }
        }, 0.5);
      }
    }
    function hideCopy(slide) {
      if (!MOTION || !slide) return;
      const lines = $$('.line__inner', slide);
      const others = [$('.hero-slide__kicker span', slide), $('.hero-slide__btn', slide)].filter(Boolean);
      gsap.killTweensOf(lines.concat(others));
      gsap.to(lines, { yPercent: -112, duration: 0.6, ease: 'power3.in', stagger: 0.05 });
      gsap.to(others, { autoAlpha: 0, duration: 0.4, ease: 'power1.out' });
    }
    function kenBurns(slide) {
      if (!MOTION || !slide) return;
      const img = $('.hero-slide__img', slide);
      if (!img) return;
      gsap.fromTo(img, { scale: 1.02 }, { scale: 1.14, duration: 8, ease: 'none', overwrite: true });
    }
    function setActive(index, first) {
      const slide = slides[index];
      if (!slide) return;
      if (prevSlide && prevSlide !== slide) hideCopy(prevSlide);
      activeSlide = slide;
      slides.forEach((s) => { s.inert = s !== slide; });
      showCopy(slide, first);
      kenBurns(slide);
      heroDark = slide.dataset.tone === 'dark';
      hero.classList.toggle('is-dark', heroDark);
      updateHeaderTone();
      if (countCur) countCur.textContent = String(index + 1).padStart(2, '0');
      syncVideo();
      prevSlide = slide;
    }

    if (hasSwiper) {
      swiper = new window.Swiper($('.hero__swiper', hero), {
        effect: 'fade',
        fadeEffect: { crossFade: true },
        speed: MOTION ? 1100 : 0,
        rewind: true,
        autoplay: MOTION ? { delay: 5500, disableOnInteraction: false } : false,
        pagination: {
          el: pagination,
          clickable: true,
          bulletClass: 'hero-dot',
          bulletActiveClass: 'is-active',
          renderBullet: (i, cls) => '<button type="button" class="' + cls + '"><span class="hero-dot__fill"></span></button>'
        },
        navigation: { prevEl: $('.hero__prev', hero), nextEl: $('.hero__next', hero) },
        keyboard: { enabled: true, onlyInViewport: true },
        a11y: {
          prevSlideMessage: '이전 슬라이드',
          nextSlideMessage: '다음 슬라이드',
          paginationBulletMessage: '{{index}}번째 슬라이드 보기',
          slideLabelMessage: '{{index}} / {{slidesLength}}'
        },
        on: {
          init: (s) => {
            hero.classList.add('is-ready');
            setActive(s.activeIndex, true);
          },
          slideChangeTransitionStart: (s) => setActive(s.activeIndex, false),
          autoplayTimeLeft: (s, time, progress) => {
            if (pagination) pagination.style.setProperty('--p', Math.min(1, Math.max(0, 1 - progress)).toFixed(4));
          }
        }
      });
    } else {
      setActive(0, true);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        heroInView = entries[0].isIntersecting;
        if (swiper && swiper.autoplay && MOTION) {
          if (heroInView && swiper.autoplay.paused) swiper.autoplay.resume();
          else if (!heroInView && swiper.autoplay.running && !swiper.autoplay.paused) swiper.autoplay.pause();
        }
        updateHeaderTone();
        syncVideo();
      }, { threshold: 0.02 }).observe(hero);
    }
    document.addEventListener('visibilitychange', syncVideo);

    if (MOTION) {
      gsap.to($$('.hero-slide__media', hero), {
        yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
      gsap.to($$('.hero-slide__copy', hero), {
        yPercent: -10, opacity: 0.15, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  });

  /* ---------- Menu carousel ---------- */
  safe('menu', () => {
    const section = $('#menu');
    if (!section) return;
    const el = $('.menu__swiper', section);
    const cards = $$('.menu-card', section);
    const filterWrap = $('.filter', section);
    const buttons = $$('.filter__btn', section);
    const indicator = $('.filter__indicator', section);
    let current = 'all';
    let swiper = null;
    let busy = null;

    function activeBtn() {
      return buttons.find((b) => b.classList.contains('is-active')) || buttons[0];
    }
    function moveIndicator(btn, instant) {
      if (!indicator || !btn || !filterWrap) return;
      if (instant) indicator.style.transition = 'none';
      indicator.style.width = btn.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
      if (instant) {
        void indicator.offsetWidth;
        indicator.style.transition = '';
      }
    }
    if (filterWrap) {
      filterWrap.classList.add('filter--ready');
      moveIndicator(activeBtn(), true);
      window.addEventListener('resize', () => moveIndicator(activeBtn(), true));
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveIndicator(activeBtn(), true));
    }

    if (hasSwiper && el) {
      swiper = new window.Swiper(el, {
        slidesPerView: 'auto',
        spaceBetween: 0,
        speed: 700,
        grabCursor: true,
        watchOverflow: true,
        freeMode: { enabled: true, momentum: true, momentumRatio: 0.7, momentumVelocityRatio: 0.8 },
        mousewheel: { forceToAxis: true, sensitivity: 0.8 },
        navigation: { prevEl: $('.menu__prev', section), nextEl: $('.menu__next', section) },
        scrollbar: { el: $('.menu__scrollbar', section), draggable: true },
        a11y: {
          prevSlideMessage: '이전 메뉴',
          nextSlideMessage: '다음 메뉴',
          slideLabelMessage: '{{index}} / {{slidesLength}}'
        }
      });
      section.classList.add('is-ready');
    }

    function matches(card, cat) {
      return cat === 'all' || card.dataset.cat === cat;
    }
    function innerOf(list) {
      return list.map((c) => $('.menu-card__inner', c)).filter(Boolean);
    }
    function plateOf(list) {
      return list.map((c) => $('.menu-card__plate', c)).filter(Boolean);
    }
    function finish() {
      if (el) el.classList.remove('is-filtering');
      if (swiper) {
        swiper.update();
        swiper.slideTo(0, 0);
      }
    }

    function setFilter(cat) {
      if (!cat || cat === current) return;
      if (busy) {
        busy.progress(1);
        busy = null;
      }
      current = cat;
      buttons.forEach((b) => {
        const on = b.dataset.filter === cat;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) moveIndicator(b);
      });
      const leaving = cards.filter((c) => !c.classList.contains('is-out') && !matches(c, cat));
      const entering = cards.filter((c) => c.classList.contains('is-out') && matches(c, cat));

      if (!MOTION) {
        leaving.forEach((c) => c.classList.add('is-out'));
        entering.forEach((c) => c.classList.remove('is-out'));
        finish();
        return;
      }

      if (el) el.classList.add('is-filtering');
      if (swiper) swiper.slideTo(0, 650);
      let targetW = 0;
      if (entering.length) {
        entering.forEach((c) => c.classList.remove('is-out'));
        targetW = entering[0].offsetWidth;
        gsap.set(entering, { width: 0 });
        gsap.set(innerOf(entering), { autoAlpha: 0, y: 40 });
        gsap.set(plateOf(entering), { autoAlpha: 0, scale: 0.5, rotate: -20 });
      }

      const tl = gsap.timeline({ onComplete: () => { busy = null; finish(); } });
      busy = tl;
      if (leaving.length) {
        tl.to(innerOf(leaving), { autoAlpha: 0, y: 30, duration: 0.3, ease: 'power2.in' }, 0)
          .to(leaving, { width: 0, duration: 0.6, ease: 'power3.inOut', stagger: 0.03 }, 0.08)
          .add(() => {
            leaving.forEach((c) => c.classList.add('is-out'));
            gsap.set(leaving, { clearProps: 'width' });
            gsap.set(innerOf(leaving), { clearProps: 'opacity,visibility,transform' });
          });
      }
      if (entering.length) {
        const at = leaving.length ? 0.55 : 0;
        tl.to(entering, { width: targetW, duration: 0.75, ease: 'power3.out', stagger: 0.05 }, at)
          .to(innerOf(entering), { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, at + 0.15)
          .to(plateOf(entering), { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.9, ease: 'back.out(2.2)', stagger: 0.05 }, at + 0.2)
          .add(() => {
            gsap.set(entering, { clearProps: 'width' });
            gsap.set(innerOf(entering), { clearProps: 'opacity,visibility,transform' });
            gsap.set(plateOf(entering), { clearProps: 'opacity,visibility,transform' });
          });
      }
    }

    function focusItem(key) {
      const card = cards.find((c) => c.dataset.key === key);
      if (!card) return;
      if (!matches(card, current)) setFilter('all');
      window.setTimeout(() => {
        const visible = cards.filter((c) => !c.classList.contains('is-out'));
        const idx = visible.indexOf(card);
        if (swiper && idx > -1) swiper.slideTo(idx, MOTION ? 900 : 0);
        card.classList.remove('is-spot');
        void card.offsetWidth;
        card.classList.add('is-spot');
        window.setTimeout(() => card.classList.remove('is-spot'), 1200);
      }, busy ? 1300 : 900);
    }

    buttons.forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.filter)));
    menuApi.setFilter = setFilter;
    menuApi.focus = focusItem;

    if (MOTION && el) {
      const plates = plateOf(cards);
      ScrollTrigger.create({
        trigger: el,
        start: 'top 84%',
        once: true,
        onEnter: () => {
          el.classList.add('is-in');
          gsap.fromTo(cards, { yPercent: 102 }, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.07, clearProps: 'transform' });
          gsap.fromTo(plates, { autoAlpha: 0, scale: 0.4, y: 70, rotate: -25 }, {
            autoAlpha: 1, scale: 1, y: 0, rotate: 0, duration: 0.95, ease: 'back.out(2.2)', stagger: 0.07, delay: 0.3, clearProps: 'all'
          });
        }
      });
    } else if (el) {
      el.classList.add('is-in');
    }
  });

  /* ---------- Promise ---------- */
  safe('promise', () => {
    const sec = $('#promise');
    if (!sec) return;
    const items = $$('.promise__item', sec);
    const cardsWrap = $('.promise__cards', sec);
    reveal(items, { y: 110, rotate: (i) => [-4, 0, 4][i % 3] }, {
      y: 0, rotate: 0, duration: 1.1, ease: 'power4.out', stagger: 0.14
    }, cardsWrap, 'top 82%');
    if (!MOTION) return;

    gsap.fromTo($$('.promise-card__icon', sec), { scale: 0, rotate: -35 }, {
      scale: 1, rotate: 0, duration: 1, ease: 'back.out(2.6)', stagger: 0.14, delay: 0.35, clearProps: 'transform',
      scrollTrigger: { trigger: cardsWrap, start: 'top 82%', once: true }
    });

    const shapes = $$('.shape', sec);
    gsap.fromTo(shapes, { scale: 0, rotate: -120 }, {
      scale: 1, rotate: 0, duration: 1, ease: 'back.out(2.4)', stagger: { each: 0.07, from: 'random' },
      scrollTrigger: { trigger: sec, start: 'top 78%', once: true }
    });
    shapes.forEach((shape) => {
      const depth = parseFloat(shape.dataset.depth) || 0.5;
      gsap.fromTo(shape, { y: depth * 90 }, {
        y: depth * -120, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });
  });

  /* ---------- Franchise banner ---------- */
  safe('franchise', () => {
    const sec = $('#franchise');
    if (!sec) return;
    const card = $('.franchise__card', sec);
    if (!MOTION) {
      if (card) card.classList.add('is-in');
      return;
    }
    gsap.fromTo($('.franchise__bg', sec), { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.fromTo($('.franchise__bg img', sec), { scale: 1.2 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 15%', scrub: true }
    });
    if (!card) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: sec, start: 'top 45%', once: true },
      onStart: () => card.classList.add('is-in')
    });
    tl.fromTo(card, { autoAlpha: 0, y: 260 }, {
      autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', clearProps: 'transform,opacity,visibility'
    }, 0)
      .fromTo($('.franchise__lead', card), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.3)
      .fromTo($$('.franchise__title .line__inner', card), { yPercent: 110 }, {
        yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.1
      }, 0.35)
      .fromTo($('.ribbon', card), { rotate: -38, y: -50, autoAlpha: 0 }, {
        rotate: -4, y: 0, autoAlpha: 1, duration: 1.6, ease: 'elastic.out(1.1, 0.35)'
      }, 0.45)
      .fromTo($('.franchise__actions', card), { autoAlpha: 0, y: 24 }, {
        autoAlpha: 1, y: 0, duration: 0.8, ease: 'back.out(1.6)', clearProps: 'transform'
      }, 0.6);
  });

  /* ---------- Franchise modal ---------- */
  safe('modal', () => {
    const modal = $('#franchise-modal');
    if (!modal) return;
    const panel = $('.modal__panel', modal);
    const form = $('[data-franchise-form]', modal);
    const formView = $('[data-modal-form-view]', modal);
    const doneView = $('[data-modal-done]', modal);
    const doneTitle = $('.modal__done-title', modal);
    const submitBtn = $('.form__submit', modal);
    const submitLabel = $('.form__submit-label', modal);
    const fields = {
      name: $('#f-name', modal),
      tel: $('#f-tel', modal),
      region: $('#f-region', modal),
      agree: $('#f-agree', modal)
    };
    const rules = {
      name: (el) => (el.value.trim().length >= 2 ? '' : '성함을 두 글자 이상 입력해 주세요.'),
      tel: (el) => (/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(el.value.trim()) ? '' : '연락처를 정확히 입력해 주세요. 예: 010-1234-5678'),
      region: (el) => (el.value ? '' : '희망지역을 선택해 주세요.'),
      agree: (el) => (el.checked ? '' : '개인정보 수집 및 이용에 동의해 주세요.')
    };
    let open = false;
    let tried = false;
    let lastFocus = null;
    let hideTimer = 0;
    let submitTimer = 0;

    function showError(key, msg) {
      const el = fields[key];
      if (!el) return;
      const err = $('#' + el.id + '-err', modal);
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      if (err) err.textContent = msg;
    }
    function validate(key) {
      const el = fields[key];
      if (!el) return true;
      const msg = rules[key](el);
      showError(key, msg);
      return !msg;
    }
    function validateAll() {
      let firstBad = null;
      Object.keys(rules).forEach((key) => {
        if (!validate(key) && !firstBad) firstBad = fields[key];
      });
      return firstBad;
    }
    function formatTel(value) {
      const d = value.replace(/\D/g, '').slice(0, 11);
      if (d.indexOf('02') === 0) {
        const n = d.slice(0, 10);
        if (n.length > 9) return n.slice(0, 2) + '-' + n.slice(2, 6) + '-' + n.slice(6);
        if (n.length > 5) return n.slice(0, 2) + '-' + n.slice(2, 5) + '-' + n.slice(5);
        if (n.length > 2) return n.slice(0, 2) + '-' + n.slice(2);
        return n;
      }
      if (d.length > 10) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
      if (d.length > 6) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
      if (d.length > 3) return d.slice(0, 3) + '-' + d.slice(3);
      return d;
    }
    function resetForm() {
      window.clearTimeout(submitTimer);
      if (form) form.reset();
      tried = false;
      Object.keys(fields).forEach((key) => showError(key, ''));
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.removeAttribute('aria-disabled');
      }
      if (submitLabel) submitLabel.textContent = '상담 신청하기';
      if (formView) formView.hidden = false;
      if (doneView) doneView.hidden = true;
    }
    function openModal(trigger) {
      if (open) return;
      if (siteMenu.isOpen()) siteMenu.close({ returnFocus: false });
      open = true;
      window.clearTimeout(hideTimer);
      lastFocus = trigger || document.activeElement;
      modal.hidden = false;
      void modal.offsetWidth;
      modal.classList.add('is-open');
      setInert(true);
      lockScroll();
      if (panel) panel.scrollTop = 0;
      window.setTimeout(() => {
        const target = doneView && !doneView.hidden ? doneTitle : fields.name;
        if (target) target.focus({ preventScroll: true });
      }, 80);
    }
    function closeModal() {
      if (!open) return;
      open = false;
      modal.classList.remove('is-open');
      setInert(false);
      unlockScroll();
      hideTimer = window.setTimeout(() => {
        modal.hidden = true;
        if (doneView && !doneView.hidden) resetForm();
      }, MOTION ? 420 : 0);
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    }

    if (fields.tel) {
      fields.tel.addEventListener('input', () => {
        fields.tel.value = formatTel(fields.tel.value);
        if (tried) validate('tel');
      });
    }
    ['name', 'region', 'agree'].forEach((key) => {
      const el = fields[key];
      if (!el) return;
      el.addEventListener(key === 'name' ? 'input' : 'change', () => {
        if (tried) validate(key);
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest) return;
      const opener = e.target.closest('[data-modal-open]');
      if (opener && opener.getAttribute('data-modal-open') === modal.id) {
        e.preventDefault();
        openModal(opener);
        return;
      }
      if (open && modal.contains(e.target) && e.target.closest('[data-modal-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'Tab') {
        trapTab(e, focusables(panel));
      }
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        tried = true;
        const bad = validateAll();
        if (bad) {
          bad.focus();
          const field = bad.closest('.field');
          if (MOTION && field) gsap.fromTo(field, { x: -10 }, { x: 0, duration: 0.6, ease: 'elastic.out(1.2, 0.3)', clearProps: 'transform' });
          return;
        }
        if (submitBtn) {
          submitBtn.classList.add('is-loading');
          submitBtn.setAttribute('aria-disabled', 'true');
        }
        if (submitLabel) submitLabel.textContent = '접수 중';
        submitTimer = window.setTimeout(() => {
          if (formView) formView.hidden = true;
          if (doneView) doneView.hidden = false;
          if (panel) panel.scrollTop = 0;
          if (doneTitle) doneTitle.focus({ preventScroll: true });
        }, 750);
      });
    }
  });

  /* ---------- News ticker + promo ---------- */
  safe('news', () => {
    const ticker = $('[data-ticker]');
    if (!ticker) return;
    const items = $$('.ticker__item', ticker);
    const dots = $$('.ticker__dot', ticker);
    let index = 0;
    let timer = 0;
    let hold = false;
    let inView = false;

    items.forEach((it, i) => it.setAttribute('aria-hidden', i === 0 ? 'false' : 'true'));

    function render(next) {
      const target = (next + items.length) % items.length;
      if (target === index) return;
      const prev = items[index];
      index = target;
      items.forEach((it, i) => {
        const on = i === index;
        if (on) it.classList.remove('is-leaving', 'no-trans');
        it.classList.toggle('is-current', on);
        it.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      if (prev) {
        prev.classList.add('is-leaving');
        window.setTimeout(() => {
          if (prev.classList.contains('is-current')) return;
          prev.classList.add('no-trans');
          prev.classList.remove('is-leaving');
          void prev.offsetWidth;
          prev.classList.remove('no-trans');
        }, 760);
      }
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === index);
        d.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
    }
    function schedule() {
      window.clearInterval(timer);
      timer = 0;
      if (MOTION && !hold && inView) timer = window.setInterval(() => render(index + 1), 3000);
    }

    dots.forEach((d, i) => d.addEventListener('click', () => {
      render(i);
      schedule();
    }));
    ticker.addEventListener('mouseenter', () => { hold = true; schedule(); });
    ticker.addEventListener('mouseleave', () => { hold = false; schedule(); });
    ticker.addEventListener('focusin', () => { hold = true; schedule(); });
    ticker.addEventListener('focusout', (e) => {
      if (ticker.contains(e.relatedTarget)) return;
      hold = false;
      schedule();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        schedule();
      }).observe(ticker);
    } else {
      inView = true;
      schedule();
    }

    const more = $('.ticker__more', ticker);
    const all = $('#news-all');
    if (more && all) {
      more.addEventListener('click', () => {
        const willOpen = more.getAttribute('aria-expanded') !== 'true';
        more.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        all.classList.toggle('is-open', willOpen);
        const label = $('.ticker__more-label', more);
        if (label) label.textContent = willOpen ? '접기' : '더보기';
        if (hasGSAP) window.setTimeout(() => ScrollTrigger.refresh(), 650);
      });
    }

    reveal(ticker, { clipPath: 'inset(0% 100% 0% 0% round 60px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 60px)', duration: 1.2, ease: 'expo.inOut',
      clearProps: 'clipPath,opacity,visibility'
    }, ticker, 'top 88%');
    reveal($$('.coupon'), { y: -70, rotate: (i) => (i ? 9 : -9), scale: 1.08 }, {
      y: 0, rotate: 0, scale: 1, duration: 1, ease: 'back.out(1.7)', stagger: 0.15
    }, $('.promo__list'), 'top 85%');
  });

  /* ---------- SNS ---------- */
  safe('sns', () => {
    const sec = $('#sns');
    if (!sec || !MOTION) return;
    const grid = $('.sns__grid', sec);
    gsap.fromTo($$('.sns-item__link', sec), { clipPath: 'inset(100% 0% 0% 0% round 24px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.3, ease: 'expo.out',
      stagger: { each: 0.12, from: 'center' }, clearProps: 'clipPath',
      scrollTrigger: { trigger: grid, start: 'top 86%', once: true }
    });
    gsap.fromTo($$('.sns-item__media', sec), { scale: 1.35 }, {
      scale: 1, duration: 1.6, ease: 'expo.out',
      stagger: { each: 0.12, from: 'center' }, clearProps: 'transform',
      scrollTrigger: { trigger: grid, start: 'top 86%', once: true }
    });
    gsap.fromTo($('.sns__half', sec), { scale: 0.6, yPercent: 30 }, {
      scale: 1, yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'center center', scrub: true }
    });
    gsap.matchMedia().add('(min-width: 769px)', () => {
      $$('.sns-item', sec).forEach((item, i) => {
        const dir = i % 2 ? 1 : -1;
        gsap.fromTo(item, { y: dir * -60 }, {
          y: dir * 60, ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
        });
      });
    });
  });

  /* ---------- Store + order ---------- */
  safe('store', () => {
    const sec = $('#store');
    if (!sec) return;
    const stores = [
      { name: '성수점', addr: '서울 성동구 연무장길 00', hours: 'OPEN 11:00 ~ 23:00' },
      { name: '연남점', addr: '서울 마포구 동교로 00', hours: 'OPEN 11:30 ~ 24:00' },
      { name: '판교점', addr: '경기 성남시 분당구 판교역로 00', hours: 'OPEN 11:00 ~ 22:00' }
    ];
    const swap = $('[data-store-swap]', sec);
    const nameEl = $('[data-store-name]', sec);
    const addrEl = $('[data-store-addr]', sec);
    const hoursEl = $('[data-store-hours]', sec);
    const indexEl = $('[data-store-index]', sec);
    const nextBtn = $('[data-store-next]', sec);
    let storeIdx = 0;
    let swapping = false;

    function applyStore() {
      const s = stores[storeIdx];
      if (nameEl) nameEl.textContent = s.name;
      if (addrEl) addrEl.textContent = s.addr;
      if (hoursEl) hoursEl.textContent = s.hours;
      if (indexEl) indexEl.textContent = String(storeIdx + 1).padStart(2, '0');
    }
    if (nextBtn && swap) {
      nextBtn.addEventListener('click', () => {
        if (swapping) return;
        storeIdx = (storeIdx + 1) % stores.length;
        if (!MOTION) {
          applyStore();
          return;
        }
        swapping = true;
        swap.classList.add('is-swapping');
        window.setTimeout(() => {
          applyStore();
          swap.classList.remove('is-swapping');
          swapping = false;
        }, 360);
      });
    }

    const steps = {
      delivery: ['배달앱에서 바삭치킨 검색', '먹고 싶은 메뉴 담기', '갓 튀긴 치킨을 문 앞에서'],
      pickup: ['가까운 매장 확인하기', '전화로 미리 주문하기', '도착하면 바로 픽업']
    };
    const orderBtns = $$('[data-order]', sec);
    const stepsEl = $('[data-order-steps]', sec);
    function renderSteps(key) {
      stepsEl.textContent = '';
      steps[key].forEach((text, i) => {
        const li = document.createElement('li');
        const num = document.createElement('span');
        num.textContent = '0' + (i + 1);
        li.appendChild(num);
        li.appendChild(document.createTextNode(text));
        stepsEl.appendChild(li);
      });
    }
    if (stepsEl) {
      orderBtns.forEach((b) => b.addEventListener('click', () => {
        const key = b.dataset.order;
        if (!steps[key] || b.classList.contains('is-active')) return;
        orderBtns.forEach((o) => {
          const on = o === b;
          o.classList.toggle('is-active', on);
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        if (!MOTION) {
          renderSteps(key);
          return;
        }
        stepsEl.classList.add('is-swapping');
        window.setTimeout(() => {
          renderSteps(key);
          stepsEl.classList.remove('is-swapping');
          gsap.fromTo(stepsEl.children, { y: 16, autoAlpha: 0 }, {
            y: 0, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.8)', stagger: 0.07, clearProps: 'all'
          });
        }, 260);
      }));
    }

    const grid = $('.store__grid', sec);
    reveal($('.store-card', sec), { x: -160, rotate: -4 }, { x: 0, rotate: 0, duration: 1.2, ease: 'expo.out' }, grid, 'top 80%');
    reveal($('.order-card', sec), { x: 160, rotate: 4 }, { x: 0, rotate: 0, duration: 1.2, ease: 'expo.out', delay: 0.08 }, grid, 'top 80%');
    if (!MOTION) return;
    gsap.fromTo($('.store-card__img', sec), { scale: 0.6, y: 50, rotate: -10 }, {
      scale: 1, y: 0, rotate: 0, duration: 1.1, ease: 'back.out(1.8)', delay: 0.35, clearProps: 'transform',
      scrollTrigger: { trigger: grid, start: 'top 80%', once: true }
    });
    gsap.fromTo($('.store-card__pin', sec), { y: -90, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1, ease: 'bounce.out', delay: 0.8,
      scrollTrigger: { trigger: grid, start: 'top 80%', once: true }
    });
  });

  /* ---------- Footer ---------- */
  safe('footer', () => {
    if (!footer) return;
    reveal($$('[data-reveal]', footer), { y: 40 }, { y: 0, duration: 0.9, stagger: 0.08 }, footer, 'top 90%');
    if (!MOTION) return;
    const giant = $('.footer__giant', footer);
    if (giant) {
      gsap.fromTo($$('span', giant), { yPercent: 100 }, {
        yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: giant, start: 'top 98%', once: true }
      });
    }
  });

  /* ---------- Floating mascot ---------- */
  safe('mascot', () => {
    if (!dock) return;
    const btn = $('.mascot', dock);
    window.setTimeout(() => dock.classList.add('is-in'), MOTION ? 2000 : 0);
    if (!btn) return;
    btn.addEventListener('click', () => {
      btn.classList.remove('is-hop');
      void btn.offsetWidth;
      btn.classList.add('is-hop');
      window.setTimeout(() => btn.classList.remove('is-hop'), 800);
      const target = $('#store');
      if (target) {
        scrollToEl(target);
        focusTarget(target);
      }
    });
  });

  /* ---------- Layout refresh ---------- */
  if (MOTION) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
