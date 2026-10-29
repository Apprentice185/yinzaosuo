(() => {
  const items = document.querySelectorAll('.faq-list details');
  if (!items.length) return;

  const updateHeight = (item) => {
    const answer = item.querySelector('.faq-answer');
    if (answer) answer.style.setProperty('--faq-answer-height', `${answer.scrollHeight}px`);
  };

  items.forEach((item) => {
    const summary = item.querySelector('summary');
    const answer = item.querySelector('.faq-answer');
    if (!summary || !answer) return;
    let closeTimer;

    if (item.open) updateHeight(item);

    const finishClose = () => {
      if (!item.classList.contains('is-closing')) return;
      item.open = false;
      item.classList.remove('is-closing');
    };

    summary.addEventListener('click', (event) => {
      event.preventDefault();

      if (item.open && !item.classList.contains('is-closing')) {
        updateHeight(item);
        void answer.offsetHeight;
        item.classList.add('is-closing');
        closeTimer = window.setTimeout(finishClose, 400);
        return;
      }

      window.clearTimeout(closeTimer);
      item.classList.remove('is-closing');
      item.open = true;
      updateHeight(item);
    });

    answer.addEventListener('transitionend', (event) => {
      if (event.propertyName !== 'max-height' || !item.classList.contains('is-closing')) return;
      window.clearTimeout(closeTimer);
      finishClose();
    });
  });

  window.addEventListener('resize', () => {
    items.forEach((item) => {
      if (item.open && !item.classList.contains('is-closing')) updateHeight(item);
    });
  });
})();
