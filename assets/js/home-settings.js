(() => {
  const home = window.CMS_CONTENT?.siteSettings?.home || {};
  // This tree is the English site only, so the language is pinned here.
  // The legacy bilingual picker read localStorage 'site_lang', but
  // yinzaosuo.com/zh shares this origin and its scripts set that key to
  // 'zh' — after visiting the Chinese site, the FAQ below rendered the
  // (nonexistent) question_zh/answer_zh fields and came out blank.
  const language = () => 'en';
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
  // Homepage showcases: render the products / articles picked in the
  // backend (Core / Custom / Knowledge windows). Empty picks keep the
  // sections exactly as they are.
  const showcase = window.CMS_CONTENT?.siteSettings?.showcase || {};
  const productsById = new Map((window.CMS_CONTENT?.products || []).map(item => [item.id, item]));
  const CARD_COPY = {
    'YS-GLOSS-PHOTO-PAPER': { kicker: '01 / PHOTO PAPER', desc: 'A bright, glossy surface for posters, promotions and indoor displays.', specs: '1520mm · 200gsm · 50m/roll · USD 18.60/m²', visual: 'gloss', label: 'GLOSS', alt: 'Glossy photo posters displayed on a wall' },
    'YS-SATIN-PHOTO-PAPER': { kicker: '02 / PHOTO PAPER', desc: 'A softer surface appearance for posters, retail graphics and displays.', specs: '1520mm · 200gsm · 50m/roll · USD 18.60/m²', visual: 'satin', label: 'SATIN', alt: 'Framed satin photo prints in a gallery' },
    'YS-SYNTHETIC-PAPER': { kicker: '03 / SYNTHETIC MEDIA', desc: 'Polypropylene-based print media for posters and promotional graphics.', specs: '1520mm · 180gsm · 50m/roll · USD 12.60/m²', visual: 'synthetic', label: 'PP', alt: 'Printed synthetic paper menu on a restaurant table' },
    'YS-ADHESIVE-VINYL': { kicker: '04 / SELF-ADHESIVE', desc: 'Printable adhesive media for signage, retail graphics and applied displays.', specs: '1520mm · 50m/roll · 120gsm liner USD 13.60/m²; 140gsm USD 14.60/m²', visual: 'vinyl', label: 'ADHESIVE', alt: 'Vehicle wrapped in printed self-adhesive vinyl' },
    'YS-OUTDOOR-PVC-RIGID-FILM': { kicker: '05 / OUTDOOR PVC', desc: 'PVC media with a waterproof matte coating for outdoor print projects.', specs: '1270mm · 240gsm · 50m/roll · USD 25.90/m²', visual: 'pvc', label: 'PVC', alt: 'Printed outdoor PVC banners installed across a street' }
  };
  const resolveSitePath = path => {
    const value = String(path || '').trim();
    if (!value) return '';
    if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
    return '/' + value;
  };
  const pickProducts = ids => (Array.isArray(ids) ? ids : []).map(id => productsById.get(id)).filter(Boolean);
  const applyShowcaseCore = () => {
    const grid = document.querySelector('.home-material-grid');
    const picks = pickProducts(showcase.core).slice(0, 6);
    if (!grid || !picks.length) return;
    grid.replaceChildren(...picks.map(product => {
      const copy = CARD_COPY[product.id] || {};
      const card = document.createElement('a');
      card.className = 'home-material-card';
      card.href = '/products/' + String(product.id).toLowerCase() + '/';
      const visual = document.createElement('span');
      visual.className = 'home-material-visual' + (copy.visual ? ' ' + copy.visual : '');
      const img = document.createElement('img');
      img.src = resolveSitePath(product.image);
      img.alt = copy.alt || product.name || product.title || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { img.onerror = null; visual.textContent = 'Image temporarily unavailable'; visual.classList.add('image-unavailable'); };
      visual.append(img);
      if (copy.label) {
        const label = document.createElement('span');
        label.className = 'home-material-visual-label';
        label.textContent = copy.label;
        visual.append(label);
      }
      const body = document.createElement('div');
      body.className = 'home-material-copy';
      const kicker = document.createElement('span');
      kicker.className = 'home-material-kicker';
      kicker.textContent = copy.kicker || [product.category_num, (product.category_label || '').toUpperCase()].filter(Boolean).join(' / ');
      const title = document.createElement('h3');
      title.textContent = product.name || product.title || '';
      const desc = document.createElement('p');
      desc.textContent = copy.desc || product.desc || '';
      const specs = document.createElement('strong');
      specs.textContent = copy.specs || (Array.isArray(product.materials) ? product.materials.join(' · ') : '');
      const link = document.createElement('span');
      link.className = 'home-material-link';
      link.textContent = 'View specifications ↗';
      body.append(kicker, title, desc, specs, link);
      card.append(visual, body);
      return card;
    }));
  };
  const archiveGroup = (label, values, className, limit) => {
    const group = document.createElement('div');
    group.className = 'archive-tag-group';
    const heading = document.createElement('span');
    heading.className = 'archive-tag-heading';
    heading.textContent = label;
    const chips = document.createElement('div');
    chips.className = 'archive-tags ' + className;
    const list = Array.isArray(values) ? values : [];
    list.slice(0, limit).forEach(value => {
      const chip = document.createElement('span');
      chip.className = 'archive-chip';
      chip.textContent = value;
      chip.title = value;
      chips.append(chip);
    });
    if (list.length > limit) {
      const more = document.createElement('span');
      more.className = 'archive-chip archive-chip-more';
      more.textContent = '+' + (list.length - limit);
      more.title = list.slice(limit).join(' / ');
      chips.append(more);
    }
    group.append(heading, chips);
    return group;
  };
  const applyShowcaseCustom = () => {
    const grid = document.querySelector('#productGrid');
    const picks = pickProducts(showcase.custom).slice(0, 6);
    if (!grid || !picks.length) return;
    const tabs = document.querySelector('#productCategoryTabs');
    if (tabs) tabs.hidden = true;
    const summary = document.querySelector('.product-archive-summary');
    if (summary) summary.hidden = true;
    grid.removeAttribute('aria-labelledby');
    grid.replaceChildren(...picks.map((product, index) => {
      const card = document.createElement('a');
      card.className = 'archive-card';
      card.href = '/products/' + String(product.id).toLowerCase() + '/';
      card.dataset.productId = product.id;
      const visual = document.createElement('div');
      visual.className = 'archive-visual';
      const src = resolveSitePath(product.image);
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = product.name || product.title || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        visual.append(img);
      }
      const idx = document.createElement('span');
      idx.className = 'archive-index';
      idx.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(picks.length).padStart(2, '0');
      visual.append(idx);
      const content = document.createElement('div');
      content.className = 'archive-card-content';
      const name = document.createElement('h3');
      name.textContent = product.name || product.title || '';
      const summaryP = document.createElement('p');
      summaryP.className = 'archive-card-summary';
      summaryP.textContent = product.desc || '';
      content.append(name, summaryP, archiveGroup('Materials', product.materials, 'archive-materials', 2), archiveGroup('Crafts', product.crafts, 'archive-crafts', 3));
      card.append(visual, content);
      return card;
    }));
  };
  const applyShowcaseKnowledge = () => {
    const host = document.querySelector('#homeKnowledgeList');
    const picks = (Array.isArray(showcase.knowledge) ? showcase.knowledge : [])
      .map(slug => (window.CMS_CONTENT?.knowledge || []).find(item => item.slug === slug && !item.hidden))
      .filter(Boolean)
      .slice(0, 5);
    if (!host || !picks.length) return;
    host.replaceChildren(...picks.map((item, index) => {
      const a = document.createElement('a');
      a.className = 'knowledge-item';
      a.href = '/articles/' + item.slug + '/';
      const num = document.createElement('span');
      num.textContent = String(index + 1).padStart(2, '0');
      const strong = document.createElement('strong');
      strong.textContent = item.title || '';
      const arrow = document.createElement('span');
      arrow.textContent = '↗';
      a.append(num, strong, arrow);
      return a;
    }));
    const figureImg = document.querySelector('.editorial-image img');
    if (figureImg && picks[0].cover) figureImg.src = resolveSitePath(picks[0].cover);
  };
  applyCopy();
  applyModules();
  applyFaq();
  applyShowcaseCore();
  applyShowcaseCustom();
  applyShowcaseKnowledge();
  window.addEventListener('storage', event => {
    if (event.key === 'site_lang') { applyCopy(); applyFaq(); }
  });
  document.querySelector('#languageToggle')?.addEventListener('click', () => {
    window.setTimeout(() => { applyCopy(); applyFaq(); }, 0);
  });
})();