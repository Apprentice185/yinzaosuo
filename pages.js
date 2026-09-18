const storedData = JSON.parse(localStorage.getItem('printData') || 'null');
const data = storedData || printData;
const pageDataVersion = localStorage.getItem('printDataVersion') || '';
function reloadWhenPublished() { if ((localStorage.getItem('printDataVersion') || '') !== pageDataVersion) window.location.reload(); }
window.addEventListener('storage', event => { if (event.key === 'printData' || event.key === 'printDataVersion' || event.key === 'contentCategories') reloadWhenPublished(); });
window.addEventListener('pageshow', reloadWhenPublished);
const pageModal = document.querySelector('#contentModal');
function articleUrl(type, id) { return `article.html?type=${type}&id=${encodeURIComponent(id)}`; }
function renderContent(type, filter = '全部') {
  const items = data[type].filter(item => filter === '全部' || item.category === filter);
  const target = document.querySelector(type === 'knowledge' ? '#knowledgeGrid' : '#articleGrid');
  if (!target) return;
  target.innerHTML = items.map((item, index) => `<article class="long-card"><div class="long-card-visual visual-${index % 4}" ${item.cover ? `style="background-image:url('${item.cover}')"` : ''}>${item.cover ? '' : `<span>${item.category}</span>`}</div><div class="article-meta">${item.category} · ${item.date || 'PRINT NOTE'}</div><h2>${item.title}</h2><p>${item.excerpt}</p><a class="text-link" href="${articleUrl(type, item.id)}">阅读全文 <span>↗</span></a></article>`).join('');
}
function bindFilters(selector, type, targetSelector) {
  document.querySelectorAll(selector).forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll(selector).forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    renderContent(type, button.dataset.filter);
  }));
}
function renderDynamicFilters(selector, values, type) { const target = document.querySelector(selector); if (!target) return; target.innerHTML = ['全部', ...values].map(value => `<button class="${value === '全部' ? 'active' : ''}" data-filter="${value}">${value}</button>`).join(''); bindFilters(`${selector} button`, type); }
if (document.querySelector('#knowledgeGrid')) { renderDynamicFilters('#knowledgeFilters', [...new Set(data.knowledge.map(item => item.category).filter(Boolean))], 'knowledge'); renderContent('knowledge'); }
if (document.querySelector('#articleGrid')) { renderDynamicFilters('#articleFilters', [...new Set(data.articles.map(item => item.category).filter(Boolean))], 'articles'); renderContent('articles'); }

const templateGrid = document.querySelector('#templateGrid');
let templateFilter = '全部';
function imageOrPlaceholder(url, className) { return url ? `<img class="${className}" src="${url}" alt="">` : `<div class="${className} image-placeholder">待上传</div>`; }
function renderTemplates() {
  if (!templateGrid) return;
  const search = document.querySelector('#templateSearch').value.toLowerCase().trim();
  const items = data.templates.filter(item => (templateFilter === '全部' || item.style === templateFilter) && `${item.id}${item.title}${item.style}${item.tags.join('')}`.toLowerCase().includes(search));
  templateGrid.innerHTML = items.map(item => `<article class="template-card" data-id="${item.id}">${imageOrPlaceholder(item.thumb, 'template-thumb')}<div class="template-info"><div><span>${item.category} · ${item.style}</span><h2>${item.title}</h2></div><strong>${item.price}</strong><p>${item.size}</p></div></article>`).join('');
  templateGrid.querySelectorAll('.template-card').forEach(card => card.addEventListener('click', () => openTemplate(card.dataset.id)));
}
function openTemplate(id) {
  const item = data.templates.find(template => template.id === id);
  const modal = document.querySelector('#templateModal');
  const gallery = document.querySelector('#detailGallery');
  const galleryItems = [item.designImage, item.sizeImage, item.sceneImage];
  gallery.innerHTML = galleryItems.map((url, index) => url ? `<img class="detail-image ${index === 0 ? 'active' : ''}" src="${url}" alt="${item.title}">` : `<div class="detail-image image-placeholder ${index === 0 ? 'active' : ''}">第 ${index + 1} 张详情图待上传</div>`).join('');
  document.querySelector('#detailTitle').textContent = item.title;
  document.querySelector('#detailMeta').textContent = `${item.id}　·　${item.category}　·　风格：${item.style}　·　${item.size}`;
  document.querySelector('#detailTags').innerHTML = item.tags.map(tag => `<span>${tag}</span>`).join('');
  document.querySelector('#detailPrice').textContent = `制作价格参考：${item.price}`;
  document.querySelector('#templateModal').classList.add('open');
  document.querySelectorAll('.gallery-dot').forEach((dot, index) => dot.onclick = () => { document.querySelectorAll('.detail-image').forEach(image => image.classList.remove('active')); document.querySelectorAll('.detail-image')[index].classList.add('active'); document.querySelectorAll('.gallery-dot').forEach(item => item.classList.remove('active')); dot.classList.add('active'); });
  document.querySelector('#detailCopy').onclick = async () => { const message = `模板编号：${item.id}\n模板名称：${item.title}\n品类：${item.category}\n风格：${item.style}\n尺寸：${item.size}\n价格参考：${item.price}`; try { await navigator.clipboard.writeText(message); } catch (error) { window.prompt('请复制以下模板信息', message); } document.querySelector('#copyToast').classList.add('show'); setTimeout(() => document.querySelector('#copyToast').classList.remove('show'), 2600); };
}
if (templateGrid) {
  renderTemplates();
  const templateFilters = document.querySelector('#templateFilters');
  templateFilters.innerHTML = ['全部', ...new Set(data.templates.map(item => item.style).filter(Boolean))].map(value => `<button class="${value === '全部' ? 'active' : ''}" data-filter="${value}">${value === '全部' ? '全部风格' : value}</button>`).join('');
  document.querySelectorAll('#templateFilters button').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('#templateFilters button').forEach(item => item.classList.remove('active')); button.classList.add('active'); templateFilter = button.dataset.filter; renderTemplates(); }));
  document.querySelector('#templateSearch').addEventListener('input', renderTemplates);
  document.querySelector('#closeTemplate').addEventListener('click', () => document.querySelector('#templateModal').classList.remove('open'));
  document.querySelector('#templateModal').addEventListener('click', event => { if (event.target.id === 'templateModal') event.target.classList.remove('open'); });
}

const articlePage = document.querySelector('#articlePage');
if (articlePage) {
  const params = new URLSearchParams(location.search);
  const item = data[params.get('type')]?.find(entry => entry.id === params.get('id')) || data.knowledge[0];
  document.title = `${item.title}｜印造所`;
  document.querySelector('#articleCategory').textContent = item.category;
  document.querySelector('#articleTitle').textContent = item.title;
  document.querySelector('#articleDate').textContent = `${item.category}　·　${item.date || '印造所知识库'}`;
  const cover = document.querySelector('#articleCover');
  if (cover) { cover.hidden = !item.cover; cover.src = item.cover || ''; }
  document.querySelector('#articleBody').innerHTML = item.content;
}