const storedSiteData = JSON.parse(localStorage.getItem('printData') || 'null');
const siteData = storedSiteData ? { ...printData, ...storedSiteData, productCategories: storedSiteData.productCategories || printData.productCategories, products: storedSiteData.products || printData.products } : printData;
const pageDataVersion = localStorage.getItem('printDataVersion') || '';
function reloadWhenPublished() { if ((localStorage.getItem('printDataVersion') || '') !== pageDataVersion) window.location.reload(); }
window.addEventListener('storage', event => { if (event.key === 'printData' || event.key === 'printDataVersion' || event.key === 'contentCategories') reloadWhenPublished(); });
window.addEventListener('pageshow', reloadWhenPublished);
const categories = (siteData.productCategories || []).map(name => [name, `${name}产品与定制方案`]);
const products = siteData.products || [];
const knowledgeItems = siteData.knowledge || [];
const articleItems = siteData.articles || [];
const categoryGrid = document.querySelector('#categoryGrid');
const productGrid = document.querySelector('#productGrid');
categoryGrid.innerHTML = categories.map(([name, desc]) => `<a class="category-card" href="#solutions" data-category-link="${name}"><h3>${name}</h3><p>${desc}</p><span class="visual"></span></a>`).join('');
document.querySelector('#homeKnowledgeList').innerHTML = knowledgeItems.slice(0, 3).map((item, index) => `<a href="article.html?type=knowledge&id=${encodeURIComponent(item.id)}" class="knowledge-item"><span>${String(index + 1).padStart(2, '0')}</span><strong>${item.title}</strong><span>↗</span></a>`).join('');
document.querySelector('#homeArticleGrid').innerHTML = articleItems.slice(0, 3).map((item, index) => `<article class="${index === 0 ? 'article-feature' : ''}"><a href="article.html?type=articles&id=${encodeURIComponent(item.id)}" class="article-image home-article-image ${item.cover ? 'has-cover' : ''}" ${item.cover ? `style="background-image:url('${item.cover}')"` : ''}><span>${item.category}</span></a><div class="article-meta">${item.category} · ${item.date || ''}</div><h3>${item.title}</h3><a href="article.html?type=articles&id=${encodeURIComponent(item.id)}" class="arrow-link">阅读全文 →</a></article>`).join('');
function renderProducts(filter = 'all', reverse = false) {
  let list = filter === 'all' ? [...products] : products.filter(product => product.category === filter);
  if (reverse) list.reverse();
  productGrid.innerHTML = list.map(product => `<article class="product-card" data-product-id="${product.id}"><div class="product-photo" ${product.thumb ? `style="background-image:url('${product.thumb}')"` : ''}>${product.tag ? `<span class="product-badge">${product.tag}</span>` : ''}</div><div class="product-info"><h3>${product.name}</h3><p>${product.desc}</p><strong>${product.price} <small>｜含基础工艺</small></strong><a class="product-detail-link" href="product.html?id=${encodeURIComponent(product.id)}">详细了解 ↗</a></div></article>`).join('');
  document.querySelectorAll('.product-card').forEach(card => card.addEventListener('click', () => openScene(card.dataset.productId)));
  document.querySelectorAll('.product-detail-link').forEach(link => link.addEventListener('click', event => event.stopPropagation()));
}
renderProducts();
document.querySelectorAll('[data-category-link]').forEach(link => link.addEventListener('click', () => { const category = link.dataset.categoryLink; const tab = document.querySelector(`[data-filter="${category}"]`); if (tab) { document.querySelectorAll('#filterTabs button').forEach(item => item.classList.remove('active')); tab.classList.add('active'); renderProducts(category); } }));
const filterTabs = document.querySelector('#filterTabs');
filterTabs.innerHTML = `<button class="active" data-filter="all">全部</button>${(siteData.productCategories || []).map(category => `<button data-filter="${category}">${category}</button>`).join('')}`;
let reverseSort = false;
document.querySelector('#sortProducts').addEventListener('click', () => { reverseSort = !reverseSort; renderProducts(document.querySelector('.filter-tabs .active').dataset.filter, reverseSort); });
document.querySelectorAll('#filterTabs button').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('#filterTabs button').forEach(item => item.classList.remove('active')); button.classList.add('active'); renderProducts(button.dataset.filter, reverseSort); }));
const sceneModal = document.querySelector('#sceneModal');
function openScene(id) { const product = products.find(item => item.id === id); if (!product) return; const visual = document.querySelector('#sceneVisual'); visual.style.backgroundImage = product.sceneImage ? `url("${product.sceneImage}")` : ''; visual.innerHTML = product.sceneImage ? '' : `<span>${product.category}<br><strong>${product.name}</strong></span>`; document.querySelector('#sceneTitle').textContent = product.name; document.querySelector('#sceneDesc').textContent = product.intro || product.desc; document.querySelector('#sceneDetail').href = `product.html?id=${encodeURIComponent(product.id)}`; sceneModal.classList.add('open'); }
document.querySelector('#closeScene').addEventListener('click', () => sceneModal.classList.remove('open'));
sceneModal.addEventListener('click', event => { if (event.target === sceneModal) sceneModal.classList.remove('open'); });
const productModal = document.querySelector('#productModal');
let activeProduct = null;
function openProduct(id) { activeProduct = products.find(item => item.id === id); if (!activeProduct) return; document.querySelector('#optionTitle').textContent = activeProduct.name; document.querySelector('#optionDesc').textContent = activeProduct.desc; document.querySelector('#optionPrice').textContent = `${activeProduct.price}｜基础制作参考`; document.querySelector('#optionGrid').innerHTML = (activeProduct.options || []).map((option, index) => `<label>${option.name}<select data-option-index="${index}">${option.values.map(value => `<option>${value}</option>`).join('')}</select></label>`).join(''); productModal.classList.add('open'); }
function closeProduct() { productModal.classList.remove('open'); }
document.querySelector('#closeProduct').addEventListener('click', closeProduct);
productModal.addEventListener('click', event => { if (event.target === productModal) closeProduct(); });
document.querySelector('#optionQuote').addEventListener('click', () => { const selections = [...document.querySelectorAll('#optionGrid select')].map(select => `${activeProduct.options[select.dataset.optionIndex].name}：${select.value}`).join('；'); closeProduct(); openQuote(`${activeProduct.name}（${selections}）`); });
sceneModal.addEventListener('click', event => { if (event.target.id === 'sceneDetail') { sceneModal.classList.remove('open'); } });
const quoteModal = document.querySelector('#quoteModal');
function openQuote(product = '') { quoteModal.classList.add('open'); document.body.style.overflow = 'hidden'; if (product) document.querySelector('[name="message"]').value = `我想了解：${product}`; }
function closeQuote() { quoteModal.classList.remove('open'); document.body.style.overflow = ''; }
document.querySelectorAll('[data-open-quote]').forEach(button => button.addEventListener('click', () => openQuote()));
document.querySelector('[data-close-quote]').addEventListener('click', closeQuote);
quoteModal.addEventListener('click', event => { if (event.target === quoteModal) closeQuote(); });
document.querySelector('#quoteForm').addEventListener('submit', event => { event.preventDefault(); closeQuote(); document.querySelector('#toast').classList.add('show'); event.target.reset(); setTimeout(() => document.querySelector('#toast').classList.remove('show'), 3500); });
const searchPanel = document.querySelector('#searchPanel');
document.querySelector('#searchToggle').addEventListener('click', () => { searchPanel.classList.add('open'); document.querySelector('#searchInput').focus(); });
document.querySelector('#closeSearch').addEventListener('click', () => searchPanel.classList.remove('open'));
document.querySelector('#menuToggle').addEventListener('click', () => document.querySelector('.main-nav').classList.toggle('mobile-open'));
document.querySelector('#searchInput').addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.value.trim()) { searchPanel.classList.remove('open'); document.querySelector('#toast').textContent = `已记录搜索：${event.target.value.trim()}`; document.querySelector('#toast').classList.add('show'); setTimeout(() => document.querySelector('#toast').classList.remove('show'), 2500); } });
if (window.location.hash === '#quoteModal') { const pendingQuote = localStorage.getItem('pendingQuote') || ''; localStorage.removeItem('pendingQuote'); openQuote(pendingQuote); }