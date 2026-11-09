const storedSiteData = JSON.parse(localStorage.getItem('printData') || 'null');
const legacySiteData = storedSiteData
  ? { ...printData, ...storedSiteData, productCategories: storedSiteData.productCategories || printData.productCategories, products: storedSiteData.products || printData.products }
  : printData;
const managedContent = window.CMS_CONTENT || {};
const managedProducts = (managedContent.products || []).map(item => ({
  ...item,
  name: item.title,
  category: item.category_legacy || item.category_title || item.category,
  intro: item.intro || item.desc,
  thumb: item.thumb || item.image,
  options: Array.isArray(item.options) ? item.options : []
}));
const managedNews = (managedContent.news || []).map(item => ({
  ...item,
  category: item.tag || item.category,
  excerpt: item.summary || item.excerpt
}));
const siteData = {
  ...legacySiteData,
  products: Array.isArray(managedContent.products) ? managedProducts : legacySiteData.products,
  knowledge: Array.isArray(managedContent.knowledge) ? managedContent.knowledge : legacySiteData.knowledge,
  articles: Array.isArray(managedContent.news) ? managedNews : legacySiteData.articles
};
const pageDataVersion = localStorage.getItem('printDataVersion') || '';
const products = siteData.products || [];
const language = () => localStorage.getItem('site_lang') || 'en';
const productText = (product, field) => window.contentText('products', product.id, field, product[field] || product.desc || '');
const escapeContent = window.ContentSanitizer.escape;
const setSanitizedHtml = (target, html) => target.replaceChildren(window.ContentSanitizer.sanitize(html));
const resolveContentImage = value => {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim(), `${window.location.origin}/`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

function reloadWhenPublished() {
  if ((localStorage.getItem('printDataVersion') || '') !== pageDataVersion) window.location.reload();
}
window.addEventListener('storage', event => {
  if (['printData', 'printDataVersion', 'contentCategories'].includes(event.key)) reloadWhenPublished();
});
window.addEventListener('pageshow', reloadWhenPublished);

function renderHomeContent() {
  const homeKnowledgeList = document.querySelector('#homeKnowledgeList');
  if (homeKnowledgeList) {
    setSanitizedHtml(homeKnowledgeList, (siteData.knowledge || []).slice(0, 3).map((item, index) =>
      `<a href="article.html?type=knowledge&id=${encodeURIComponent(item.id)}" class="knowledge-item"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeContent(window.contentText('knowledge', item.id, 'title', item.title))}</strong><span>↗</span></a>`
    ).join(''));
  }
  const homeArticleGrid = document.querySelector('#homeArticleGrid');
  if (homeArticleGrid) {
    const cards = (siteData.articles || []).slice(0, 3).map((item, index) => {
      const title = window.contentText('articles', item.id, 'title', item.title);
      const category = window.contentText('articles', item.id, 'category', item.category);
      const href = `article.html?type=articles&id=${encodeURIComponent(item.id)}`;
      const coverUrl = resolveContentImage(item.cover || item.thumbnail || item.thumb || item.image);
      const fallbackCover = !coverUrl;
      const coverSource = coverUrl || resolveContentImage('assets/images/products/pa003.jpg');
      const card = document.createElement('article');
      card.className = 'home-article-card';
      const cover = document.createElement('a');
      cover.className = `home-article-cover${coverSource ? '' : ' is-placeholder'}`;
      cover.href = href;
      cover.setAttribute('aria-label', title);
      if (coverSource) {
        const image = document.createElement('img');
        image.src = coverSource;
        image.alt = fallbackCover ? window.t('home_article_cover_alt') : title;
        image.loading = 'lazy';
        image.decoding = 'async';
        cover.append(image);
      }
      const categoryTag = document.createElement('span');
      categoryTag.className = 'home-article-category';
      categoryTag.textContent = category;
      const arrow = document.createElement('span');
      arrow.className = 'home-article-cover-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      cover.append(categoryTag, arrow);

      const meta = document.createElement('div');
      meta.className = 'home-article-meta';
      const date = document.createElement('time');
      date.textContent = item.date || '';
      if (item.date && !Number.isNaN(Date.parse(item.date))) date.dateTime = new Date(item.date).toISOString();
      const indexLabel = document.createElement('span');
      indexLabel.textContent = `№ ${String(index + 1).padStart(2, '0')}`;
      meta.append(date, indexLabel);

      const heading = document.createElement('h3');
      const titleLink = document.createElement('a');
      titleLink.href = href;
      titleLink.textContent = title;
      heading.append(titleLink);

      const readLink = document.createElement('a');
      readLink.className = 'home-article-read';
      readLink.href = href;
      readLink.append(document.createTextNode(window.t('read_article')));
      const readArrow = document.createElement('span');
      readArrow.setAttribute('aria-hidden', 'true');
      readArrow.textContent = '↗';
      readLink.append(readArrow);
      card.append(cover, meta, heading, readLink);
      return card;
    });
    homeArticleGrid.replaceChildren(...cards);
    homeArticleGrid.classList.toggle('is-two-column', cards.length === 2);
    homeArticleGrid.classList.toggle('is-one-column', cards.length === 1);
  }
}

const sceneModal = document.querySelector('#sceneModal');
function openScene(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  const name = productText(product, 'name');
  const visual = document.querySelector('#sceneVisual');
  const sceneImage = window.ContentSanitizer.safeUrl(product.sceneImage, false);
  visual.style.backgroundImage = sceneImage ? `url("${sceneImage}")` : '';
  visual.classList.toggle('is-placeholder', !sceneImage);
  setSanitizedHtml(visual, sceneImage ? '' : `<span>${escapeContent(productText(product, 'category'))}<br><strong>${escapeContent(name)}</strong></span>`);
  document.querySelector('#sceneTitle').textContent = name;
  document.querySelector('#sceneDesc').textContent = productText(product, 'intro');
  document.querySelector('#sceneDetail').href = `product.html?id=${encodeURIComponent(product.id)}`;
  sceneModal.classList.add('open');
}
document.querySelector('#closeScene')?.addEventListener('click', () => sceneModal.classList.remove('open'));
sceneModal?.addEventListener('click', event => {
  if (event.target === sceneModal || event.target.id === 'sceneDetail') sceneModal.classList.remove('open');
});

const productModal = document.querySelector('#productModal');
let activeProduct = null;
function openProduct(id) {
  activeProduct = products.find(item => item.id === id);
  if (!activeProduct) return;
  document.querySelector('#optionTitle').textContent = productText(activeProduct, 'name');
  document.querySelector('#optionDesc').textContent = productText(activeProduct, 'intro');
  document.querySelector('#optionPrice').textContent = `${activeProduct.price} · ${window.t('price_reference')}`;
  setSanitizedHtml(document.querySelector('#optionGrid'), (activeProduct.options || []).map((option, index) =>
    `<label>${escapeContent(window.t(`option_${option.name}`))}<select data-option-index="${index}">${option.values.map(value => `<option>${escapeContent(value)}</option>`).join('')}</select></label>`
  ).join(''));
  productModal.classList.add('open');
}
function closeProduct() {
  productModal?.classList.remove('open');
}
document.querySelector('#closeProduct')?.addEventListener('click', closeProduct);
productModal?.addEventListener('click', event => {
  if (event.target === productModal) closeProduct();
});
document.querySelector('#optionQuote')?.addEventListener('click', () => {
  const selections = [...document.querySelectorAll('#optionGrid select')].map(select => {
    const option = activeProduct.options[select.dataset.optionIndex];
    return `${window.t(`option_${option.name}`)}: ${select.value}`;
  }).join('; ');
  closeProduct();
  openQuote(`${productText(activeProduct, 'name')} (${selections})`);
});

const quoteModal = document.querySelector('#quoteModal');
const quoteForm = document.querySelector('#quoteForm');
const quoteStatus = document.querySelector('#quoteStatus');
function openQuote(product = '') {
  if (!quoteModal) return;
  quoteModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  quoteStatus.hidden = true;
  quoteStatus.textContent = '';
  quoteStatus.classList.remove('is-error');
  if (product) { const message = document.querySelector('[name="message"]'); if (message) message.value = product; }
}
function closeQuote() {
  quoteModal.classList.remove('open');
  document.body.style.overflow = '';
}
document.querySelectorAll('[data-open-quote]').forEach(button => button.addEventListener('click', () => openQuote()));
document.querySelector('[data-close-quote]')?.addEventListener('click', closeQuote);
quoteModal?.addEventListener('click', event => {
  if (event.target === quoteModal) closeQuote();
});
quoteForm?.addEventListener('submit', async event => {
  event.preventDefault();
  quoteStatus.hidden = false;
  quoteStatus.classList.remove('is-error');
  const submitButton = quoteForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = window.t('form_sending');
  try {
    const response = await fetch(quoteForm.action, {
      method: 'POST',
      body: new FormData(quoteForm),
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Form submission failed (${response.status})`);
    quoteStatus.textContent = window.t('form_success');
    quoteForm.reset();
  } catch (error) {
    console.error('Quote form submission failed:', error);
    quoteStatus.textContent = window.t('form_error');
    quoteStatus.classList.add('is-error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = window.t('form_submit');
  }
});

const searchPanel = document.querySelector('#searchPanel');
const searchInput = document.querySelector('#searchInput');
const searchResults = document.createElement('div');
searchResults.className = 'search-results';
searchResults.id = 'searchResults';
searchResults.hidden = true;
searchResults.setAttribute('role', 'list');
searchResults.setAttribute('aria-live', 'polite');
searchInput?.insertAdjacentElement('afterend', searchResults);
searchInput?.setAttribute('aria-controls', searchResults.id);

function searchContent(query) {
  const term = query.toLocaleLowerCase();
  const matches = [];
  for (const product of products) {
    const title = productText(product, 'name');
    const description = productText(product, 'intro');
    const details = [
      product.id,
      title,
      description,
      ...(product.materials || []),
      ...(product.crafts || [])
    ].join(' ').toLocaleLowerCase();
    if (details.includes(term)) {
      matches.push({ type: 'product', title, description, href: `product.html?id=${encodeURIComponent(product.id)}` });
    }
  }
  for (const [type, items] of [['knowledge', siteData.knowledge || []], ['articles', siteData.articles || []]]) {
    for (const item of items) {
      const title = window.contentText(type, item.id, 'title', item.title);
      const description = window.contentText(type, item.id, 'excerpt', item.excerpt || item.summary || '');
      const details = `${item.id} ${title} ${description} ${item.category || ''} ${item.content || ''}`.toLocaleLowerCase();
      if (details.includes(term)) {
        matches.push({
          type,
          title,
          description,
          href: `article.html?type=${type}&id=${encodeURIComponent(item.id)}`
        });
      }
    }
  }
  return matches.slice(0, 12);
}

function renderSearchResults(query) {
  searchResults.replaceChildren();
  if (!query) {
    searchResults.hidden = true;
    searchInput?.setAttribute('aria-expanded', 'false');
    return;
  }

  const matches = searchContent(query.trim());
  searchResults.hidden = false;
  searchInput?.setAttribute('aria-expanded', 'true');
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'search-results-empty';
    empty.textContent = window.t('search_no_results');
    searchResults.append(empty);
    return;
  }

  const labels = {
    product: window.t('search_type_product'),
    knowledge: window.t('search_type_knowledge'),
    articles: window.t('search_type_article')
  };
  matches.forEach(match => {
    const link = document.createElement('a');
    link.className = 'search-result';
    link.href = match.href;
    link.setAttribute('role', 'listitem');
    const type = document.createElement('span');
    type.className = 'search-result-type';
    type.textContent = labels[match.type];
    const content = document.createElement('span');
    const title = document.createElement('span');
    title.className = 'search-result-title';
    title.textContent = match.title;
    content.append(title);
    if (match.description) {
      const description = document.createElement('span');
      description.className = 'search-result-description';
      description.textContent = match.description;
      content.append(description);
    }
    link.append(type, content);
    searchResults.append(link);
  });
}

searchInput?.addEventListener('input', event => renderSearchResults(event.target.value.trim()));
document.querySelector('#searchToggle')?.addEventListener('click', () => {
  searchPanel?.classList.add('open');
  searchInput?.focus();
});
document.querySelector('#closeSearch')?.addEventListener('click', () => {
  searchPanel?.classList.remove('open');
  if (searchInput) searchInput.value = '';
  renderSearchResults('');
});
searchInput?.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    searchPanel?.classList.remove('open');
    renderSearchResults('');
  }
});

window.registerLanguageRenderer(() => {
  renderHomeContent();
  if (activeProduct && productModal.classList.contains('open')) openProduct(activeProduct.id);
});
renderHomeContent();
if (window.location.hash === '#quoteModal') {
  const pendingQuote = localStorage.getItem('pendingQuote') || '';
  localStorage.removeItem('pendingQuote');
  openQuote(pendingQuote);
}
