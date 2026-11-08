(() => {
  const root = document.querySelector('.hero-fullbleed');
  if (!root) return;

  const settings = window.CMS_CONTENT?.siteSettings?.home || {};
  const configuredSlides = Array.isArray(settings.hero_slides) ? settings.hero_slides : [];
  const slidesHost = root.querySelector('#heroSlides');
  const dotsHost = root.querySelector('#heroDots');

  // The CMS settings are the source of truth. Keep the HTML slides only as a safe fallback.
  if (configuredSlides.length >= 3 && slidesHost && dotsHost) {
    slidesHost.replaceChildren();
    dotsHost.replaceChildren();
    configuredSlides.forEach((slide, index) => {
      const image = String(slide.image || '').trim();
      if (!image) return;
      const frame = document.createElement('div');
      frame.className = `hero-slide${index === 0 ? ' is-active' : ''}`;
      const img = document.createElement('img');
      img.src = new URL(image, document.baseURI).href;
      img.alt = '';
      img.loading = index === 0 ? 'eager' : 'lazy';
      if (index === 0) img.fetchPriority = 'high';
      frame.append(img);
      slidesHost.append(frame);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show banner ${index + 1}`);
      if (index === 0) {
        dot.className = 'is-active';
        dot.setAttribute('aria-current', 'true');
      }
      dotsHost.append(dot);
    });
  }

  const slides = [...root.querySelectorAll('.hero-slide')];
  const dots = [...root.querySelectorAll('#heroDots button')];
  const prev = root.querySelector('#heroPrev');
  const next = root.querySelector('#heroNext');
  const pause = root.querySelector('#heroPause');
  if (slides.length < 2) return;

  let index = 0;
  let timer = null;
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = n => {
    index = (n + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };
  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };
  const start = () => {
    stop();
    if (!paused) timer = window.setInterval(() => show(index + 1), 5500);
  };
  prev?.addEventListener('click', () => { show(index - 1); start(); });
  next?.addEventListener('click', () => { show(index + 1); start(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); start(); }));
  pause?.addEventListener('click', () => {
    paused = !paused;
    pause.textContent = paused ? '▶' : 'Ⅱ';
    pause.setAttribute('aria-label', paused ? 'Resume banner rotation' : 'Pause banner rotation');
    start();
  });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  show(0);
  start();
})();