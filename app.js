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
const language = () => localStorage.getItem('site_lang') || 'zh';
const productText = (product, field) => window.contentText('products', product.id, field, product[field] || product.desc || '');

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
    homeKnowledgeList.innerHTML = (siteData.knowledge || []).slice(0, 3).map((item, index) =>
      `<a href="article.html?type=knowledge&id=${encodeURIComponent(item.id)}" class="knowledge-item"><span>${String(index + 1).padStart(2, '0')}</span><strong>${window.contentText('knowledge', item.id, 'title', item.title)}</strong><span>↗</span></a>`
    ).join('');
  }
  const homeArticleGrid = document.querySelector('#homeArticleGrid');
  if (homeArticleGrid) {
    homeArticleGrid.innerHTML = (siteData.articles || []).slice(0, 3).map((item, index) => {
      const title = window.contentText('articles', item.id, 'title', item.title);
      const category = window.contentText('articles', item.id, 'category', item.category);
      return `<article class="${index === 0 ? 'article-feature' : ''}"><a href="article.html?type=articles&id=${encodeURIComponent(item.id)}" class="article-image home-article-image ${item.cover ? 'has-cover' : ''}" ${item.cover ? `style="background-image:url('${item.cover}')"` : ''}><span>${category}</span></a><div class="article-meta">${category} · ${item.date || ''}</div><h3>${title}</h3><a href="article.html?type=articles&id=${encodeURIComponent(item.id)}" class="arrow-link">${window.t('read_article')} →</a></article>`;
    }).join('');
  }
}

const sceneModal = document.querySelector('#sceneModal');
function openScene(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  const name = productText(product, 'name');
  const visual = document.querySelector('#sceneVisual');
  visual.style.backgroundImage = product.sceneImage ? `url("${product.sceneImage}")` : '';
  visual.innerHTML = product.sceneImage ? '' : `<span>${productText(product, 'category')}<br><strong>${name}</strong></span>`;
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
  document.querySelector('#optionGrid').innerHTML = (activeProduct.options || []).map((option, index) =>
    `<label>${window.t(`option_${option.name}`)}<select data-option-index="${index}">${option.values.map(value => `<option>${value}</option>`).join('')}</select></label>`
  ).join('');
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
  if (product) document.querySelector('[name="message"]').value = window.t('quote_product_format').replace('{product}', product);
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
document.querySelector('#searchToggle')?.addEventListener('click', () => {
  searchPanel.classList.add('open');
  document.querySelector('#searchInput').focus();
});
document.querySelector('#closeSearch')?.addEventListener('click', () => searchPanel.classList.remove('open'));
document.querySelector('#menuToggle')?.addEventListener('click', () => document.querySelector('.main-nav').classList.toggle('mobile-open'));
document.querySelector('#searchInput')?.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || !event.target.value.trim()) return;
  searchPanel.classList.remove('open');
  const toast = document.querySelector('#toast');
  toast.textContent = `${window.t('search_noted')} ${event.target.value.trim()}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
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
