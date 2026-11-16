/* Mobile language switch placement (restored 2026-11-16 pattern from the
   English site's site-nav.js): at <=800px the header language toggle moves
   into the bottom of the mobile menu panel as a segmented control
   (国内版 / 海外版); on desktop it returns to the header automatically.
   Menu open/close itself is handled by app.js / pages.js, not here. */
(() => {
  const nav = document.querySelector('.main-nav');
  const langBtn = document.querySelector('#languageToggle');
  if (!nav || !langBtn) return;

  const homeParent = langBtn.parentNode;
  const homeNext = langBtn.nextSibling;
  const mq = window.matchMedia('(max-width: 800px)');
  const spans = [...langBtn.querySelectorAll('[data-language]')];
  const homeLabels = spans.map(span => span.textContent);
  const panelLabels = { zh: '国内版', en: '海外版' };
  const placeLang = () => {
    if (mq.matches) {
      if (langBtn.parentNode !== nav) nav.appendChild(langBtn);
      spans.forEach(span => {
        const label = panelLabels[span.dataset.language];
        if (label) span.textContent = label;
      });
    } else {
      if (langBtn.parentNode !== homeParent) homeParent.insertBefore(langBtn, homeNext);
      spans.forEach((span, index) => { span.textContent = homeLabels[index]; });
    }
  };
  placeLang();
  // site-settings.js re-renders .main-nav on DOMContentLoaded via
  // replaceChildren(), which detaches the moved toggle on mobile.
  // Re-place after that render and whenever the nav children change.
  document.addEventListener('DOMContentLoaded', placeLang);
  new MutationObserver(() => {
    if (mq.matches && !nav.contains(langBtn)) placeLang();
  }).observe(nav, { childList: true });
  if (mq.addEventListener) mq.addEventListener('change', placeLang);
  else if (mq.addListener) mq.addListener(placeLang);
})();
