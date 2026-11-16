(() => {
  // Chinese homepage settings renderer (phase 2): applies
  // content/zh/settings/home.json (via the generated content index) to the
  // domestic homepage — hero copy, module visibility/order and the FAQ list.
  // Mirrors the EN home-settings.js behaviour with the *_zh fields.
  const home = window.CMS_CONTENT?.siteSettings?.home || {};
  const applyCopy = () => {
    const copy = {
      eyebrow_purpose: home.eyebrow_zh,
      hero_title: home.hero_title_zh,
      hero_description: home.hero_description_zh,
      hero_social_proof: home.hero_note_zh
    };
    Object.entries(copy).forEach(([key, value]) => {
      if (typeof value !== 'string' || !value.trim()) return;
      const node = document.querySelector(`[data-i18n="${key}"]`);
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
      if (first && first.parentElement === main) main.insertBefore(first, map.trust || map.products || map.process || first);
    }
  };
  const applyFaq = () => {
    const host = document.querySelector('#faq .faq-list');
    if (!host || !Array.isArray(home.faq_items) || !home.faq_items.length) return;
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
      question.textContent = item.question_zh || '';
      const icon = document.createElement('span');
      icon.className = 'faq-toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '+';
      summary.append(number, question, icon);
      const answerWrap = document.createElement('div');
      answerWrap.className = 'faq-answer';
      const answer = document.createElement('p');
      answer.textContent = item.answer_zh || '';
      answerWrap.append(answer);
      details.append(summary, answerWrap);
      return details;
    }));
  };
  applyCopy();
  applyModules();
  applyFaq();
})();
