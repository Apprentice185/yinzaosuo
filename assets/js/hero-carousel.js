(() => {
  const root = document.querySelector('.hero-fullbleed');
  if (!root) return;

  const settings = window.CMS_CONTENT?.siteSettings?.home || {};
  const configuredSlides = Array.isArray(settings.hero_slides) ? settings.hero_slides : [];
  const slidesHost = root.querySelector('#heroSlides');
  const dotsHost = root.querySelector('#heroDots');

  // CMS images are rooted at the live site; reject stale /new/ paths after the migration.
  if (configuredSlides.length >= 2 && slidesHost && dotsHost) {
    const validSlides = configuredSlides
      .map(slide => String(slide.image || '').trim())
      .filter(Boolean)
      .map(image => image.replace(/^\/new\//, '/'));
    if (validSlides.length >= 2) {
      slidesHost.replaceChildren();
      dotsHost.replaceChildren();
      validSlides.forEach((image, index) => {
        const frame = document.createElement('div');
        frame.className = `hero-slide${index === 0 ? ' is-active' : ''}`;
        const img = document.createElement('img');
        img.src = new URL(image, document.baseURI).href;
        img.alt = '';
        img.loading = index === 0 ? 'eager' : 'lazy';
        if (index === 0) img.fetchPriority = 'high';
        img.addEventListener('error', () => {
          frame.classList.add('is-image-error');
          console.warn('Homepage banner image could not be loaded:', image);
        }, { once: true });
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
  }

  const slides = [...root.querySelectorAll('.hero-slide')];
  const dots = [...root.querySelectorAll('#heroDots button')];
  const prev = root.querySelector('#heroPrev');
  const next = root.querySelector('#heroNext');
  const pause = root.querySelector('#heroPause');
  if (slides.length < 2) return;

  let index = 0;
  let timer = null;
  let manuallyPaused = false;
  let isHovered = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = n => {
    index = (n + slides.length) % slides.length;
    const activeImage = slides[index].querySelector('img');
    if (activeImage) activeImage.loading = 'eager';
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };
  const stop = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    stop();
    if (manuallyPaused || reducedMotion || document.hidden || isHovered) return;
    timer = window.setTimeout(() => {
      show(index + 1);
      schedule();
    }, 5000);
  };
  const interact = action => {
    action();
    schedule();
  };

  prev?.addEventListener('click', () => interact(() => show(index - 1)));
  next?.addEventListener('click', () => interact(() => show(index + 1)));
  dots.forEach((dot, i) => dot.addEventListener('click', () => interact(() => show(i))));
  pause?.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    pause.textContent = manuallyPaused ? '▶' : 'Ⅱ';
    pause.setAttribute('aria-label', manuallyPaused ? 'Resume banner rotation' : 'Pause banner rotation');
    schedule();
  });

  let touchStartX = 0;
  let touchStartY = 0;
  root.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    stop();
  }, { passive: true });
  root.addEventListener('touchend', event => {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      show(index + (deltaX < 0 ? 1 : -1));
    }
    schedule();
  }, { passive: true });
  root.addEventListener('touchcancel', schedule, { passive: true });

  root.addEventListener('mouseenter', () => { isHovered = true; stop(); });
  root.addEventListener('mouseleave', () => { isHovered = false; schedule(); });
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget)) schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  show(0);
  schedule();
})();