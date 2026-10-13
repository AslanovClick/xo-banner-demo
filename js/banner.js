/* =========================================================================
   version-2: HTML (Adobe Animate / CreateJS) banners inside hero slides
   - each slide holds <div class="hero-banner" data-banner data-src-desktop data-src-mobile>
   - the iframe is loaded only when its slide becomes active (desktop ≥ 768px, mobile below)
   - inactive / off-screen banners stop ticking, so only one animation runs at a time
   Must load before js/main.js (it listens for the slider's "hero:change" event).
   ========================================================================= */
(() => {
  'use strict';

  const mobileMQ = window.matchMedia('(max-width: 767.98px)');

  document.querySelectorAll('[data-slider]').forEach((root) => {
    const banners = Array.from(root.querySelectorAll('[data-banner]'));
    if (!banners.length) return;

    let activeBanner = null;
    let heroVisible = true;

    const srcFor = (banner) => (mobileMQ.matches ? banner.dataset.srcMobile : banner.dataset.srcDesktop);
    const frameOf = (banner) => banner.querySelector('iframe');

    // CreateJS lives in the iframe: run / stop its ticker → stage listener
    const setRunning = (banner, run) => {
      const frame = frameOf(banner);
      let w;
      try { w = frame.contentWindow; } catch (e) { return; }
      if (!w || !w.createjs || !w.stage) return;
      const ticker = w.createjs.Ticker;
      if (run) ticker.addEventListener('tick', w.stage);
      else ticker.removeEventListener('tick', w.stage);
    };

    const shouldRun = (banner) => banner === activeBanner && heroVisible && !document.hidden;
    const sync = () => banners.forEach((b) => setRunning(b, shouldRun(b)));

    const load = (banner) => {
      const frame = frameOf(banner);
      const src = srcFor(banner);
      if (frame.dataset.loaded === src) return;
      frame.dataset.loaded = src;
      frame.src = src;
      // the Animate stage is created after its images load — wait for it, then apply run/pause
      frame.addEventListener('load', () => {
        let tries = 0;
        const wait = setInterval(() => {
          let ready = false;
          try { ready = !!(frame.contentWindow && frame.contentWindow.stage); } catch (e) { /* not ready */ }
          if (ready || ++tries > 100) {
            clearInterval(wait);
            setRunning(banner, shouldRun(banner));
          }
        }, 100);
      }, { once: true });
    };

    root.addEventListener('hero:change', (e) => {
      const banner = e.detail.slide && e.detail.slide.querySelector('[data-banner]');
      activeBanner = banner || null;
      if (banner) load(banner);
      sync();
    });

    // switching between the desktop and mobile composition
    mobileMQ.addEventListener('change', () => {
      banners.forEach((b) => {
        if (b === activeBanner) load(b);
        else delete frameOf(b).dataset.loaded; // reload lazily next time it is shown
      });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        sync();
      }).observe(root);
    }
    document.addEventListener('visibilitychange', sync);
  });
})();
