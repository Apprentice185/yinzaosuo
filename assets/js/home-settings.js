(() => {
  const home = window.CMS_CONTENT?.siteSettings?.home || {};
  const language = () => localStorage.getItem('site_lang') === 'zh' ? 'zh' : 'en';
  const applyCopy = () => {
    const lang = language();
    const copy = {
      eyebrow_purpose: home[lang === 'zh' ? 'eyebrow_zh' : 'eyebrow_en'],
      hero_title: home[lang === 'zh' ? 'hero_title_zh' : 'hero_title_en'],
      hero_description: home[lang === 'zh' ? 'hero_description_zh' : 'hero_description_en'],
      hero_social_proof: home[lang === 'zh' ? 'hero_note_zh' : 'hero_note_en']
    };
    Object.entries(copy).forEach(([key, value]) => {
      if (typeof value !== 'string' || !value.trim()) return;
      const node = document.querySelector('[data-i18n="' + key + '"]');
      if (node) node.textContent = value;
    });
  };
  const applyModules = () => {
    const map = {
      trust: document.querySelector('.trust-strip'),
      products: document.querySelector('#products'),
      process: document.querySelector('#process'),
      knowledge: document.querySelector('#knowledge'),
      journal: document.querySelector('#journal'),
      about: document.querySelector('#about'),
      faq: document.querySelector('#faq')
    };
    Object.entries(map).forEach(([key, node]) => {
      if (node) node.hidden = home.modules?.[key] === false;
    });
    const main = document.querySelector('main#top');
    const ordered = (Array.isArray(home.module_order) ? home.module_order : [])
      .filter(key => map[key] && map[key].parentElement);
    if (main && ordered.length) {
      const anchors = ordered.map(key => map[key]).filter(Boolean);
      const first = anchors[0];
      anchors.forEach(node => main.append(node));
      // Keep the hero at the top and move only the configured content sections.
      if (first && first.parentElement === main) main.insertBefore(first, map.trust || map.products || map.process || first);
    }
  };
  const applyFaq = () => {
    const host = document.querySelector('#faq .faq-list');
    if (!host || !Array.isArray(home.faq_items) || !home.faq_items.length) return;
    const lang = language();
    host.replaceChildren(...home.faq_items.map((item, index) => {
      const details = document.createElement('details');
      if (index === 0) details.open = true;
      const summary = document.createElement('summary');
      const number = document.createElement('span');
      number.className = 'faq-number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = String(index + 1).padStart(2, '0');
      const question = document.createElement('span');
      question.className = 'faq-question';
      question.textContent = item[lang === 'zh' ? 'question_zh' : 'question_en'] || '';
      const icon = document.createElement('span');
      icon.className = 'faq-toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '+';
      summary.append(number, question, icon);
      const answerWrap = document.createElement('div');
      answerWrap.className = 'faq-answer';
      const answer = document.createElement('p');
      answer.textContent = item[lang === 'zh' ? 'answer_zh' : 'answer_en'] || '';
      answerWrap.append(answer);
      details.append(summary, answerWrap);
      return details;
    }));
  };
  applyCopy();
  applyModules();
  applyFaq();
  window.addEventListener('storage', event => {
    if (event.key === 'site_lang') { applyCopy(); applyFaq(); }
  });
  document.querySelector('#languageToggle')?.addEventListener('click', () => {
    window.setTimeout(() => { applyCopy(); applyFaq(); }, 0);
  });
})();