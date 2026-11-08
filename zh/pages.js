const storedData = JSON.parse(localStorage.getItem('printData') || 'null');
const storedSiteData = storedData ? { ...printData, ...storedData, products: storedData.products || printData.products } : printData;
const managedContent = window.CMS_CONTENT || {};
const managedNews = (managedContent.news || []).map(item => ({
  ...item,
  category: item.tag || item.category,
  excerpt: item.summary || item.excerpt
}));
const data = {
  ...storedSiteData,
  knowledge: Array.isArray(managedContent.knowledge) ? managedContent.knowledge : storedSiteData.knowledge,
  articles: Array.isArray(managedContent.news) ? managedNews : storedSiteData.articles,
  templates: Array.isArray(managedContent.templates) ? managedContent.templates : storedSiteData.templates,
  solutions: managedContent.solutions || []
};
const pageDataVersion = localStorage.getItem('printDataVersion') || '';
const language = () => localStorage.getItem('site_lang') || 'zh';
const text = (type, item, field) => window.contentText(type, item.id, field, item[field] || '');
const articleUrl = (type, id) => `article.html?type=${type}&id=${encodeURIComponent(id)}`;
const filterState = { knowledge: '全部', articles: '全部' };
let templateFilter = '全部';
let activeTemplateId = '';

function reloadWhenPublished() {
  if ((localStorage.getItem('printDataVersion') || '') !== pageDataVersion) window.location.reload();
}
window.addEventListener('storage', event => {
  if (['printData', 'printDataVersion', 'contentCategories'].includes(event.key)) reloadWhenPublished();
});
window.addEventListener('pageshow', reloadWhenPublished);

function categoryText(type, category) {
  const item = data[type].find(entry => entry.category === category);
  return item ? text(type, item, 'category') : category;
}

function renderContent(type) {
  const target = document.querySelector(type === 'knowledge' ? '#knowledgeGrid' : '#articleGrid');
  if (!target) return;
  const items = data[type].filter(item => filterState[type] === '全部' || item.category === filterState[type]);
  target.innerHTML = items.map((item, index) => {
    const category = text(type, item, 'category');
    return `<article class="long-card"><div class="long-card-visual visual-${index % 4}${item.cover ? ' has-image' : ' is-placeholder'}" ${item.cover ? `style="background-image:url('${item.cover}')"` : ''}>${item.cover ? '' : `<span>${category}</span>`}</div><div class="article-meta">${category} · ${item.date || window.t('date_source')}</div><h2>${text(type, item, 'title')}</h2><p>${text(type, item, 'excerpt')}</p><a class="text-link" href="${articleUrl(type, item.id)}">${window.t('read_article')} <span>↗</span></a></article>`;
  }).join('');
}

function renderSolutions() {
  const target = document.querySelector('#solutionsGrid');
  if (!target) return;
  target.innerHTML = data.solutions.map((item, index) => {
    const category = window.contentText('solutions', item.id, 'category', item.tag || '');
    const summary = window.contentText('solutions', item.id, 'excerpt', item.summary || '');
    return `<article class="long-card"><div class="long-card-visual visual-${index % 4}${item.cover ? ' has-image' : ' is-placeholder'}" ${item.cover ? `style="background-image:url('${item.cover}')"` : ''}>${item.cover ? '' : `<span>${category}</span>`}</div><div class="article-meta">${category} · ${item.date || window.t('date_source')}</div><h2>${window.contentText('solutions', item.id, 'title', item.title)}</h2><p>${summary}</p><a class="text-link" href="${articleUrl('solutions', item.id)}">${window.t('read_article')} <span>↗</span></a></article>`;
  }).join('');
}

function renderContentFilters(type) {
  const target = document.querySelector(type === 'knowledge' ? '#knowledgeFilters' : '#articleFilters');
  if (!target) return;
  const categories = [...new Set(data[type].map(item => item.category).filter(Boolean))];
  if (filterState[type] !== '全部' && !categories.includes(filterState[type])) filterState[type] = '全部';
  target.replaceChildren();
  ['全部', ...categories].forEach(category => {
    const button = document.createElement('button');
    button.className = filterState[type] === category ? 'active' : '';
    button.dataset.filter = category;
    button.textContent = category === '全部' ? window.t('filter_all') : categoryText(type, category);
    button.addEventListener('click', () => {
      filterState[type] = category;
      renderContentFilters(type);
      renderContent(type);
    });
    target.append(button);
  });
}

function templateField(item, field) {
  return window.contentText('templates', item.id, field, item[field] ?? '');
}

function templatePrice(item) {
  const amount = item.price.replace(/^¥\s*/, '').replace(/\s*起$/, '');
  return language() === 'en' ? `${window.t('template_price_from')} ¥${amount}` : item.price;
}

function templateSize(item) {
  return templateField(item, 'size');
}

function renderTemplateFilters() {
  const target = document.querySelector('#templateFilters');
  if (!target) return;
  const styles = [...new Set(data.templates.map(item => item.style).filter(Boolean))];
  if (templateFilter !== '全部' && !styles.includes(templateFilter)) templateFilter = '全部';
  target.replaceChildren();
  ['全部', ...styles].forEach(style => {
    const button = document.createElement('button');
    button.className = templateFilter === style ? 'active' : '';
    button.dataset.filter = style;
    button.textContent = style === '全部' ? window.t('template_filter_all') : templateField(data.templates.find(item => item.style === style), 'style');
    button.addEventListener('click', () => {
      templateFilter = style;
      renderTemplateFilters();
      renderTemplates();
    });
    target.append(button);
  });
}

function imageOrPlaceholder(url, className, label) {
  return url ? `<img class="${className}" src="${url}" alt="">` : `<div class="${className} image-placeholder"><span class="placeholder-label">${label}</span><span class="placeholder-frame" aria-hidden="true"></span><small class="placeholder-spec">PROTOTYPE / SPEC PENDING</small><small class="placeholder-dimensions">— × — mm</small></div>`;
}

function renderTemplates() {
  const target = document.querySelector('#templateGrid');
  if (!target) return;
  const search = document.querySelector('#templateSearch').value.toLowerCase().trim();
  const items = data.templates.filter(item => {
    const tags = templateField(item, 'tags') || item.tags || [];
    return (templateFilter === '全部' || item.style === templateFilter)
      && `${item.id}${templateField(item, 'title')}${templateField(item, 'style')}${tags.join('')}`.toLowerCase().includes(search);
  });
  target.innerHTML = items.map(item => `<article class="template-card" data-id="${item.id}">${imageOrPlaceholder(item.thumb, 'template-thumb', window.t('image_pending'))}<div class="template-info"><div><span>${templateField(item, 'category')} · ${templateField(item, 'style')}</span><h2>${templateField(item, 'title')}</h2></div><strong>${templatePrice(item)}</strong><p>${templateSize(item)}</p></div></article>`).join('');
  target.querySelectorAll('.template-card').forEach(card => card.addEventListener('click', () => openTemplate(card.dataset.id)));
}

function openTemplate(id) {
  const item = data.templates.find(template => template.id === id);
  if (!item) return;
  activeTemplateId = id;
  const title = templateField(item, 'title');
  const category = templateField(item, 'category');
  const style = templateField(item, 'style');
  const tags = templateField(item, 'tags') || item.tags || [];
  const gallery = document.querySelector('#detailGallery');
  const galleryItems = [item.designImage, item.sizeImage, item.sceneImage];
  gallery.innerHTML = galleryItems.map((url, index) => url
    ? `<img class="detail-image ${index === 0 ? 'active' : ''}" src="${url}" alt="${title}">`
    : `<div class="detail-image image-placeholder ${index === 0 ? 'active' : ''}"><span class="placeholder-label">${window.t('image_detail_pending').replace('{n}', index + 1)}</span><span class="placeholder-frame" aria-hidden="true"></span><small class="placeholder-spec">PROTOTYPE / SPEC PENDING</small><small class="placeholder-dimensions">— × — mm</small></div>`).join('');
  document.querySelector('#detailTitle').textContent = title;
  document.querySelector('#detailMeta').textContent = language() === 'en'
    ? `${item.id} · ${category} · ${window.t('template_style')}: ${style} · ${templateSize(item)}`
    : `${item.id}　·　${item.category}　·　风格：${item.style}　·　${item.size}`;
  const detailTags = document.querySelector('#detailTags');
  detailTags.replaceChildren();
  tags.forEach(tag => {
    const element = document.createElement('span');
    element.textContent = tag;
    detailTags.append(element);
  });
  if (item.file_url) {
    const wrapper = document.createElement('span');
    const link = document.createElement('a');
    link.href = item.file_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = window.t('template_download');
    wrapper.append(link);
    detailTags.append(wrapper);
  }
  document.querySelector('#detailPrice').textContent = `${window.t('template_price_label')}: ${templatePrice(item)}`;
  document.querySelector('#templateModal').classList.add('open');
  document.querySelectorAll('.gallery-dot').forEach((dot, index) => {
    dot.onclick = () => {
      document.querySelectorAll('.detail-image').forEach(image => image.classList.remove('active'));
      document.querySelectorAll('.detail-image')[index].classList.add('active');
      document.querySelectorAll('.gallery-dot').forEach(item => item.classList.remove('active'));
      dot.classList.add('active');
    };
  });
  document.querySelector('#detailCopy').onclick = async () => {
    const values = { id: item.id, title, category, style, size: templateSize(item), price: templatePrice(item) };
    const message = window.t('template_copy_message').replace(/\{(\w+)\}/g, (_, key) => values[key]);
    try {
      await navigator.clipboard.writeText(message);
    } catch (error) {
      window.prompt(window.t('copy_template_prompt'), message);
    }
    const toast = document.querySelector('#copyToast');
    toast.textContent = window.t('template_copy_done');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2600);
  };
}

function renderArticle() {
  if (!document.querySelector('#articlePage')) return;
  const params = new URLSearchParams(location.search);
  const requestedType = params.get('type');
  const type = requestedType === 'articles' || requestedType === 'news'
    ? 'articles'
    : requestedType === 'solutions' ? 'solutions' : 'knowledge';
  const item = data[type].find(entry => entry.id === params.get('id')) || data[type][0];
  if (!item) return;
  const title = text(type, item, 'title');
  const excerpt = text(type, item, 'excerpt');
  document.title = language() === 'en' ? `${title} | Print Atelier` : item.seoTitle || `${item.title}｜印造所`;
  document.querySelector('meta[name="description"]').content = language() === 'en' ? excerpt : item.seoDescription || item.excerpt || item.title;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = language() === 'en' ? excerpt : item.seoDescription || item.excerpt || item.title;
  const url = new URL(`article.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(item.id)}`, 'https://yinzaosuo.com/');
  document.querySelector('link[rel="canonical"]').href = url.href;
  document.querySelector('meta[property="og:url"]').content = url.href;
  document.querySelector('#articleCategory').textContent = text(type, item, 'category');
  document.querySelector('#articleTitle').textContent = title;
  document.querySelector('#articleDate').textContent = language() === 'en'
    ? `${text(type, item, 'category')} · ${item.date || 'Print Atelier'}`
    : `${item.category}　·　${item.date || '印造所知识库'}`;
  const cover = document.querySelector('#articleCover');
  cover.hidden = !item.cover;
  cover.src = item.cover || '';
  document.querySelector('#articleBody').innerHTML = text(type, item, 'content');
}

function renderAll() {
  renderContentFilters('knowledge');
  renderContent('knowledge');
  renderContentFilters('articles');
  renderContent('articles');
  renderSolutions();
  renderTemplateFilters();
  renderTemplates();
  if (activeTemplateId && document.querySelector('#templateModal')?.classList.contains('open')) openTemplate(activeTemplateId);
  renderArticle();
}

document.querySelector('#templateSearch')?.addEventListener('input', renderTemplates);
document.querySelector('#closeTemplate')?.addEventListener('click', () => document.querySelector('#templateModal').classList.remove('open'));
document.querySelector('#templateModal')?.addEventListener('click', event => {
  if (event.target.id === 'templateModal') event.target.classList.remove('open');
});
window.registerLanguageRenderer(renderAll);
renderAll();
