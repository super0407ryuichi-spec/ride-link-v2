/* Decorative home media only. No route, map or persistence dependencies. */
(() => {
  'use strict';
  const hero = document.querySelector('.home-hero');
  const video = hero?.querySelector('video');
  const toggle = document.querySelector('#hero-motion-pause');
  const label = hero?.querySelector('.hero-motion-label');
  if (!video || !toggle || !label) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let visible = false;
  let loaded = false;
  let failed = false;
  let pending = false;
  video.muted = true;
  const allowed = () => visible && !document.hidden && !reduced.matches && !connection?.saveData && !toggle.checked && !failed;
  const updateLabel = () => {
    label.textContent = toggle.checked ? '背景を再生' : '背景を静止';
    label.previousElementSibling.textContent = toggle.checked ? '▶' : 'Ⅱ';
  };
  const fallback = () => {
    failed = true;
    video.pause();
    video.classList.remove('is-playing');
    hero.classList.remove('hero-media-ready');
  };
  const sync = () => {
    updateLabel();
    hero.classList.toggle('hero-media-static', reduced.matches || !!connection?.saveData);
    if (!allowed()) {
      video.pause();
      if (reduced.matches || connection?.saveData) video.classList.remove('is-playing');
      return;
    }
    if (!loaded) {
      const source = [...video.querySelectorAll('source')].find(s => video.canPlayType(s.type));
      if (!source) return fallback();
      video.src = source.dataset.src;
      loaded = true;
    }
    if (pending || !video.paused) return;
    pending = true;
    video.play().then(() => {
      pending = false;
      if (!allowed()) video.pause();
    }).catch(error => {
      pending = false;
      if (!allowed() || error.name === 'AbortError') return;
      // Autoplay can be blocked by the browser; offer a user-initiated retry.
      toggle.checked = true;
      updateLabel();
      video.classList.remove('is-playing');
      hero.classList.add('hero-media-ready');
    });
  };
  video.addEventListener('playing', () => {
    if (!allowed()) return video.pause();
    video.classList.add('is-playing');
    hero.classList.add('hero-media-ready');
  });
  video.addEventListener('error', fallback);
  toggle.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
  connection?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => video.pause());
  window.addEventListener('pageshow', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 }).observe(hero);
  } else {
    // Keep the poster on older browsers without viewport visibility tracking.
    fallback();
  }
})();