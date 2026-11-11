(() => {
  const nav = document.querySelector('.main-nav');
  const actions = document.querySelector('.nav-actions');
  if (!nav || !actions) return;

  let button = document.querySelector('#menuToggle');
  if (!button) {
    button = document.createElement('button');
    button.className = 'menu-btn';
    button.id = 'menuToggle';
    button.type = 'button';
    button.textContent = '☰';
    actions.append(button);
  }
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', window.t ? window.t('nav_menu') : '打开菜单');
  window.registerLanguageRenderer?.(() => button.setAttribute('aria-label', window.t('nav_menu')));

  const setOpen = open => {
    nav.classList.toggle('mobile-open', open);
    button.setAttribute('aria-expanded', String(open));
  };

  const langBtn = document.querySelector('#languageToggle');
  if (langBtn) {
    const homeParent = langBtn.parentNode;
    const homeNext = langBtn.nextSibling;
    const mq = window.matchMedia('(max-width: 800px)');
    const placeLang = () => {
      if (mq.matches) {
        if (langBtn.parentNode !== nav) nav.appendChild(langBtn);
      } else if (langBtn.parentNode !== homeParent) {
        homeParent.insertBefore(langBtn, homeNext);
      }
    };
    placeLang();
    if (mq.addEventListener) mq.addEventListener('change', placeLang);
    else if (mq.addListener) mq.addListener(placeLang);
  }
  button.addEventListener('click', () => setOpen(!nav.classList.contains('mobile-open')));
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });
})();
