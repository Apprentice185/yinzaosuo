(function () {
  const catalog = window.CMS_CONTENT?.catalog || window.PRODUCTS_DATA;
  const tabList = document.querySelector('#productCategoryTabs');
  const productGrid = document.querySelector('#productGrid');
  const count = document.querySelector('#productCategoryCount');
  const description = document.querySelector('#productCategoryDescription');
  if (!catalog || !tabList || !productGrid) return;

  const categories = catalog.zh.categories;
  const params = new URLSearchParams(location.search);
  const requestedCategory = params.get('category');
  let language = localStorage.getItem('site_lang') || 'zh';
  let activeCategory = categories.some(category => category.id === requestedCategory)
    ? requestedCategory
    : categories.some(category => category.id === sessionStorage.getItem('productCatalogCategory'))
      ? sessionStorage.getItem('productCatalogCategory')
      : categories[0].id;

  function makeChip(text, className, fullText = text) {
    const chip = document.createElement('span');
    chip.className = className;
    chip.textContent = text;
    chip.title = fullText;
    return chip;
  }

  function makeGroup(label, values, className, limit) {
    const group = document.createElement('div');
    group.className = 'archive-tag-group';
    const heading = document.createElement('span');
    heading.className = 'archive-tag-heading';
    heading.textContent = label;
    const chips = document.createElement('div');
    chips.className = `archive-tags ${className}`;
    values.slice(0, limit).forEach(value => chips.append(makeChip(value, 'archive-chip')));
    if (values.length > limit) chips.append(makeChip(`+${values.length - limit}`, 'archive-chip archive-chip-more', values.slice(limit).join(' / ')));
    group.append(heading, chips);
    return group;
  }

  function makeCard(item, index, total) {
    const card = document.createElement('article');
    card.className = 'archive-card';
    card.dataset.productId = item.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    const visual = document.createElement('div');
    visual.className = 'archive-visual';
    if (item.image) {
      visual.style.setProperty('--product-image', `url("${item.image}")`);
    } else {
      visual.classList.add('archive-visual-placeholder');
      const placeholder = document.createElement('span');
      placeholder.className = 'archive-image-placeholder';
      placeholder.textContent = window.t('archive_image_pending');
      visual.append(placeholder);
    }

    const indexLabel = document.createElement('span');
    indexLabel.className = 'archive-index';
    indexLabel.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

    const drawer = document.createElement('div');
    drawer.className = 'archive-parameter-drawer';
    drawer.setAttribute('aria-label', window.t('archive_specs'));
    drawer.append(
      makeGroup(window.t('archive_materials'), item.materials, 'archive-materials-full', Number.MAX_SAFE_INTEGER),
      makeGroup(window.t('archive_crafts'), item.crafts, 'archive-crafts-full', Number.MAX_SAFE_INTEGER)
    );
    visual.append(indexLabel, drawer);

    const content = document.createElement('div');
    content.className = 'archive-card-content';
    const name = document.createElement('h3');
    name.id = `archive-product-${activeCategory}-${index}`;
    name.textContent = item.name;
    card.setAttribute('aria-labelledby', name.id);
    const summary = document.createElement('p');
    summary.className = 'archive-card-summary';
    summary.textContent = item.desc;
    const button = document.createElement('button');
    button.className = 'archive-parameter-button';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.textContent = window.t('archive_specs');
    button.addEventListener('click', () => {
      const expanded = card.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(expanded));
      button.textContent = expanded ? window.t('archive_close') : window.t('archive_specs');
    });
    content.append(name, summary, makeGroup(window.t('archive_materials'), item.materials, 'archive-materials', 2), makeGroup(window.t('archive_crafts'), item.crafts, 'archive-crafts', 3), button);
    card.append(visual, content);
    return card;
  }

  function renderTabs(locale) {
    tabList.replaceChildren();
    locale.categories.forEach(category => {
      const button = document.createElement('button');
      button.className = 'product-category-tab';
      button.type = 'button';
      button.id = `product-tab-${category.id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'productGrid');
      button.setAttribute('aria-selected', String(category.id === activeCategory));
      button.tabIndex = category.id === activeCategory ? 0 : -1;
      const number = document.createElement('span');
      number.className = 'product-category-number';
      number.textContent = category.num;
      const label = document.createElement('span');
      label.className = 'product-category-label';
      label.textContent = category.title;
      button.append(number, label);
      button.addEventListener('click', () => selectCategory(category.id, true));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const currentIndex = categories.findIndex(item => item.id === category.id);
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : (currentIndex + (event.key === 'ArrowRight' ? 1 : categories.length - 1)) % categories.length;
        selectCategory(categories[nextIndex].id, true);
      });
      tabList.append(button);
    });
  }

  function render() {
    const locale = catalog[language];
    const category = locale.categories.find(item => item.id === activeCategory);
    if (!category) return;
    tabList.setAttribute('aria-label', window.t('archive_tabs_label'));
    productGrid.setAttribute('aria-labelledby', `product-tab-${activeCategory}`);
    description.textContent = category.desc;
    count.textContent = `${String(category.items.length).padStart(2, '0')} ${window.t('archive_count_suffix')}`;
    renderTabs(locale);
    productGrid.replaceChildren(...category.items.map((item, index) => makeCard(item, index, category.items.length)));
  }

  function selectCategory(categoryId, focusTab = false) {
    activeCategory = categoryId;
    sessionStorage.setItem('productCatalogCategory', categoryId);
    render();
    if (focusTab) document.querySelector(`#product-tab-${categoryId}`).focus();
  }

  window.renderProductCatalog = lang => {
    language = lang === 'en' ? 'en' : 'zh';
    render();
  };
  window.renderProductCatalog(language);
})();
