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
