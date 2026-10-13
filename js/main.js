(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Hero slider
     - any number of <article class="hero-slide"> inside [data-slider-track]
     - dots are generated; arrows/dots hide automatically for a single slide
     - autoplay with progress in the active dot, pauses on hover / focus / hidden tab
     - swipe (pointer events) + keyboard arrows
     - only the visible slide's video plays
     ------------------------------------------------------------------ */
  function initSlider(root) {
    const track = root.querySelector('[data-slider-track]');
    const slides = Array.from(track.children);
    const dotsWrap = root.querySelector('[data-slider-dots]');
    const prevBtn = root.querySelector('[data-slider-prev]');
    const nextBtn = root.querySelector('[data-slider-next]');
    const interval = Number(root.dataset.interval) || 8000;
    const count = slides.length;
    let index = 0;

    root.style.setProperty('--hero-interval', interval + 'ms');

    // playback is owned by JS: only the visible slide plays, and only while the hero is on screen
    let heroVisible = true;
    let activeSlide = null;
    const tryPlay = (v) => {
      if (!heroVisible || document.hidden) return;
      v.muted = true;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    };
    const playVideo = (slide) => {
      activeSlide = slide;
      const v = slide.querySelector('video');
      if (!v) return;
      if (v.preload === 'none') v.preload = 'auto';
      tryPlay(v);
      if (v.readyState < 3) {
        v.addEventListener('canplay', () => { if (activeSlide === slide && v.paused) tryPlay(v); }, { once: true });
      }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        const v = activeSlide && activeSlide.querySelector('video');
        if (!v) return;
        heroVisible ? tryPlay(v) : v.pause();
      }).observe(root);
    }
    document.addEventListener('visibilitychange', () => {
      const v = activeSlide && activeSlide.querySelector('video');
      if (v && !document.hidden) tryPlay(v);
    });
    const pauseVideo = (slide) => {
      const v = slide.querySelector('video');
      if (v && !v.paused) v.pause();
    };

    if (count < 2) {
      root.classList.add('is-single');
      if (slides[0]) playVideo(slides[0]);
      root.dispatchEvent(new CustomEvent('hero:change', { detail: { index: 0, slide: slides[0], slides } }));
      return;
    }

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hero__dot';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', `Slide ${i + 1}`);
      b.innerHTML = '<span class="hero__dot-fill"></span>';
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
      return b;
    });

    // narrow (tablet) banners: put the dots right under the active slide's CTA (see @container hero in CSS)
    const placeDots = () => {
      const content = slides[index].querySelector('.hero-slide__content');
      if (!content) return;
      const heroTop = root.getBoundingClientRect().top + root.clientTop;
      const bottom = content.getBoundingClientRect().bottom - heroTop;
      root.style.setProperty('--dots-top', `${Math.round(bottom + 20)}px`);
    };
    if ('ResizeObserver' in window) new ResizeObserver(placeDots).observe(root);
    if (document.fonts) document.fonts.ready.then(placeDots);

    function render() {
      track.style.transform = `translateX(${-index * 100}%)`;
      placeDots();
      slides.forEach((s, i) => {
        const active = i === index;
        s.setAttribute('aria-hidden', String(!active));
        s.inert = !active;
        active ? playVideo(s) : pauseVideo(s);
      });
      dots.forEach((d, i) => {
        d.setAttribute('aria-selected', String(i === index));
        d.tabIndex = i === index ? 0 : -1;
        // restart progress animation
        const fill = d.firstElementChild;
        fill.style.animation = 'none';
        void fill.offsetWidth;
        fill.style.animation = '';
      });
      // warm up the next slide's video
      const next = slides[(index + 1) % count].querySelector('video');
      if (next && next.preload === 'none') next.preload = 'auto';
      // let other modules (e.g. HTML/canvas banners in version-2) react to the active slide
      root.dispatchEvent(new CustomEvent('hero:change', { detail: { index, slide: slides[index], slides } }));
    }

    function goTo(i) {
      index = (i + count) % count;
      render();
    }
    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);

    prevBtn && prevBtn.addEventListener('click', prev);
    nextBtn && nextBtn.addEventListener('click', next);

    // autoplay is driven by the progress animation of the active dot
    if (!reduceMotion) {
      root.classList.add('is-autoplay');
      dotsWrap.addEventListener('animationend', (e) => {
        if (e.target.classList.contains('hero__dot-fill')) next();
      });
      const setPaused = (v) => root.classList.toggle('is-paused', v);
      root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPaused(true); });
      root.addEventListener('pointerleave', () => setPaused(false));
      root.addEventListener('focusin', () => setPaused(true));
      root.addEventListener('focusout', () => setPaused(false));
      document.addEventListener('visibilitychange', () => setPaused(document.hidden));
    }

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); dots[index].focus(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); dots[index].focus(); }
    });

    // swipe / drag
    const viewport = root.querySelector('.hero__viewport');
    let startX = 0, startY = 0, dx = 0, dragging = false, locked = null;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('a, button')) return;
      dragging = true; locked = null; dx = 0;
      startX = e.clientX; startY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const mx = e.clientX - startX, my = e.clientY - startY;
      if (locked === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
        locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
        if (locked === 'x') track.classList.add('is-dragging');
      }
      if (locked !== 'x') return;
      dx = mx;
      const w = viewport.clientWidth;
      track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
      if (Math.abs(dx) > w) dx = Math.sign(dx) * w;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      if (locked === 'x' && Math.abs(dx) > Math.min(80, viewport.clientWidth * 0.15)) {
        dx < 0 ? next() : prev();
      } else {
        render();
      }
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    render();
  }

  document.querySelectorAll('[data-slider]').forEach(initSlider);

  /* ------------------------------------------------------------------
     Sidebar: desktop = collapse, tablet/mobile = drawer
     ------------------------------------------------------------------ */
  const desktopMQ = window.matchMedia('(min-width: 1200px)');
  const toggleBtn = document.querySelector('[data-sidebar-toggle]');
  const setExpanded = () => {
    const open = desktopMQ.matches
      ? !document.body.classList.contains('sidebar-collapsed')
      : document.body.classList.contains('sidebar-open');
    toggleBtn.setAttribute('aria-expanded', String(open));
  };
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle(desktopMQ.matches ? 'sidebar-collapsed' : 'sidebar-open');
    setExpanded();
  });
  document.querySelectorAll('[data-sidebar-close]').forEach((el) =>
    el.addEventListener('click', () => { document.body.classList.remove('sidebar-open'); setExpanded(); })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      document.body.classList.remove('sidebar-open');
      setExpanded();
    }
  });
  desktopMQ.addEventListener('change', () => { document.body.classList.remove('sidebar-open'); setExpanded(); });
  setExpanded();

  document.querySelectorAll('[data-accordion]').forEach((btn) =>
    btn.addEventListener('click', () =>
      btn.setAttribute('aria-expanded', String(btn.getAttribute('aria-expanded') !== 'true'))
    )
  );

  /* ------------------------------------------------------------------
     Rotating hero phrase (flip / drum)
     ------------------------------------------------------------------ */
  document.querySelectorAll('[data-flip]').forEach((flip) => {
    const items = Array.from(flip.children);
    if (items.length < 2) return;
    const interval = Number(flip.dataset.interval) || 2300;
    let i = Math.max(0, items.findIndex((el) => el.classList.contains('is-current')));
    items[i].classList.add('is-current');
    setInterval(() => {
      if (document.hidden) return;
      const cur = items[i];
      i = (i + 1) % items.length;
      const next = items[i];
      cur.classList.remove('is-current');
      cur.classList.add('is-leaving');
      next.classList.remove('is-leaving');
      next.classList.add('is-current');
      // after it has fallen away, park it back above (without animating) for its next turn
      setTimeout(() => {
        cur.classList.add('is-reset');
        cur.classList.remove('is-leaving');
        void cur.offsetWidth;
        cur.classList.remove('is-reset');
      }, 600);
    }, interval);
  });

  /* ------------------------------------------------------------------
     Game list filters (New / Top / Favorites) — toggle chips
     ------------------------------------------------------------------ */
  document.querySelectorAll('.tabs').forEach((list) => {
    list.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      const on = tab.getAttribute('aria-pressed') !== 'true';
      list.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-pressed', String(t === tab && on)));
    });
  });

  /* ------------------------------------------------------------------
     Game cards: hover overlay (title / play / provider / favourite)
     ------------------------------------------------------------------ */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  document.querySelectorAll('.game').forEach((card) => {
    const img = card.querySelector('.game__img');
    const media = document.createElement('div');
    media.className = 'game__media';
    img.replaceWith(media);
    media.appendChild(img);

    const { title = '', subtitle = '', provider = '' } = card.dataset;
    card.insertAdjacentHTML('afterbegin',
      '<img class="game__glow game__glow--a" src="assets/img/blur-card-a.svg" alt="" />' +
      '<img class="game__glow game__glow--b" src="assets/img/blur-card-b.svg" alt="" />');
    card.insertAdjacentHTML('beforeend',
      `<div class="game__info">
         <div>
           <p class="game__title">${esc(title)}</p>
           ${subtitle ? `<p class="game__subtitle">${esc(subtitle)}</p>` : ''}
         </div>
         <a class="game__play" href="#" aria-label="Play ${esc(title)}">
           <img class="game__play-ico only-desktop" src="assets/icons/play.svg" alt="" />
           <img class="game__play-ico game__play-ico--hover only-desktop" src="assets/icons/play-hover.svg" alt="" />
           <img class="game__play-ico only-mobile" src="assets/icons/m-play.svg" alt="" />
           <img class="game__play-ico game__play-ico--hover only-mobile" src="assets/icons/m-play-hover.svg" alt="" />
         </a>
         <p class="game__provider">${esc(provider)}</p>
       </div>
       <button class="game__fav" type="button" aria-pressed="false" aria-label="Add ${esc(title)} to favourites">
         <img class="game__fav-ico game__fav-ico--default" src="assets/icons/fav.svg" alt="" />
         <img class="game__fav-ico game__fav-ico--hover" src="assets/icons/fav-hover.svg" alt="" />
         <img class="game__fav-ico game__fav-ico--pressed" src="assets/icons/fav-pressed.svg" alt="" />
       </button>`);
  });

  // favourite tag: Default → Hover (card hovered) → Pressed (toggled)
  document.addEventListener('click', (e) => {
    const fav = e.target.closest('.game__fav');
    if (!fav) return;
    const on = fav.getAttribute('aria-pressed') !== 'true';
    fav.setAttribute('aria-pressed', String(on));
  });
})();
