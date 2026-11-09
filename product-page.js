const storedProductData = JSON.parse(localStorage.getItem('printData') || 'null');
const siteProductData = storedProductData
  ? { ...printData, ...storedProductData, products: storedProductData.products || printData.products }
  : printData;
const legacyProducts = siteProductData.products || [];
const activeLanguage = localStorage.getItem('site_lang') || 'en';
const catalogueProducts = [
  ...(window.PRODUCTS_DATA?.[activeLanguage]?.categories || []).flatMap(category => category.items.map(item => ({
    ...item,
    category: category.title,
    intro: item.desc,
    options: Array.isArray(item.options) ? item.options : []
  }))),
  ...(window.CMS_CONTENT?.products || [])
    .filter(item => !(window.PRODUCTS_DATA?.[activeLanguage]?.categories || []).some(category => category.items.some(existing => existing.id === item.id)))
    .map(item => ({
      id: item.id,
      name: item[activeLanguage === 'en' ? 'title_en' : 'title'] || item.title,
      desc: item[activeLanguage === 'en' ? 'desc_en' : 'desc'] || item.desc,
      intro: item[activeLanguage === 'en' ? 'desc_en' : 'desc'] || item.desc,
      image: item.image,
      category: item[activeLanguage === 'en' ? 'category_title_en' : 'category_title'] || 'Photo & Wide-Format Print Media',
      options: [],
      seoTitle: item[activeLanguage === 'en' ? 'seo_title_en' : 'seo_title_zh'] || '',
      seoDescription: item[activeLanguage === 'en' ? 'seo_description_en' : 'seo_description_zh'] || ''
    }))
];
const managedCatalogue = window.CMS_CONTENT?.catalogue || [];
const productData = {
  ...siteProductData,
  products: [...catalogueProducts.map(item => { const managed = managedCatalogue.find(entry => entry.id === item.id); const lang = localStorage.getItem('site_lang') || 'en'; return managed ? { ...item, name: managed[lang === 'en' ? 'name_en' : 'name_zh'] || item.name, image: managed.image || item.image, desc: managed[lang === 'en' ? 'desc_en' : 'desc_zh'] || item.desc, detail: managed[lang === 'en' ? 'detail_en' : 'detail_zh'] || item.detail, seoTitle: managed[lang === 'en' ? 'seo_title_en' : 'seo_title_zh'] || item.seoTitle, seoDescription: managed[lang === 'en' ? 'seo_description_en' : 'seo_description_zh'] || item.seoDescription } : item; }), ...legacyProducts.filter(item => !catalogueProducts.some(current => current.id === item.id))]
};
const productId = new URLSearchParams(location.search).get('id') || document.querySelector('.product-detail-page')?.dataset.productId;
let product = productData.products.find(item => item.id === productId) || null;
const language = () => localStorage.getItem('site_lang') || 'en';
const productText = field => field === 'name' ? product.name : field === 'intro' ? (product.desc || '') : window.contentText('products', product.id, field, product[field] || product.desc || '');
const escapeContent = window.ContentSanitizer.escape;
const setSanitizedHtml = (target, html) => target.replaceChildren(window.ContentSanitizer.sanitize(html));
let missingProductMessage;

function renderMissingProduct() {
  const section = document.querySelector('.product-detail-page');
  const layout = document.querySelector('.product-detail-layout');
  if (!missingProductMessage) {
    missingProductMessage = document.createElement('div');
    missingProductMessage.className = 'container content-not-found';
    const heading = document.createElement('h1');
    heading.textContent = window.t('content_not_found_title');
    const message = document.createElement('p');
    message.textContent = window.t('product_not_found');
    const link = document.createElement('a');
    link.className = 'button button-dark';
    link.href = 'products.html';
    link.textContent = window.t('products_page_title');
    missingProductMessage.append(heading, message, link);
    section.prepend(missingProductMessage);
  } else {
    missingProductMessage.querySelector('h1').textContent = window.t('content_not_found_title');
    missingProductMessage.querySelector('p').textContent = window.t('product_not_found');
    missingProductMessage.querySelector('a').textContent = window.t('products_page_title');
  }
  missingProductMessage.hidden = false;
  layout.style.display = 'none';
  document.title = window.t('content_not_found_title');
}

function optionLabel(name) {
  return window.I18N[language()].optionLabels[name] || name;
}

function optionValue(value) {
  const translated = window.I18N[language()].optionValues[value] || value;
  if (language() !== 'en') return translated;
  return translated
    .replace(/(\d+)\s*张/g, '$1 sheets')
    .replace(/(\d+)\s*本/g, '$1 copies')
    .replace(/(\d+)\s*个/g, '$1 units')
    .replace(/(\d+)\s*克/g, '$1 gsm')
    .replace(/(\d+)\s*mm/g, '$1 mm')
    .replace(/(\d+)\s*cm/g, '$1 cm')
    .replace(/(\d+)g\b/g, '$1 gsm');
}

function referencePrice() {
  return product.price || window.t('price_quote_only');
}
function renderProductDetails() {
  if (!product) {
    renderMissingProduct();
    return;
  }
  missingProductMessage?.remove();
  document.querySelector('.product-detail-layout').style.display = '';
  const localizedCategory = (window.PRODUCTS_DATA?.[language()]?.categories || [])
    .find(category => category.items.some(item => item.id === productId));
  const localizedItem = localizedCategory?.items.find(item => item.id === productId);
  if (localizedItem) { const managed = managedCatalogue.find(entry => entry.id === productId); const lang = language(); product = { ...localizedItem, name: managed?.[lang === 'en' ? 'name_en' : 'name_zh'] || localizedItem.name, image: managed?.image || localizedItem.image, desc: managed?.[lang === 'en' ? 'desc_en' : 'desc_zh'] || localizedItem.desc, detail: managed?.[lang === 'en' ? 'detail_en' : 'detail_zh'] || localizedItem.detail, category: localizedCategory.title, intro: localizedItem.desc, options: localizedItem.options || [] }; }
  const currentValues = [...document.querySelectorAll('#detailOptions select')].map(select => select.selectedIndex);
  const title = `${product.seoTitle || productText('name')} | YINZAOSUO`;
  const description = language() === 'en'
    ? product.seoDescription || productText('intro')
    : product.seoDescription || product.intro || product.desc || product.name;
  document.title = language() === 'en' ? title : product.seoTitle || `${product.name}｜印造所`;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = description;

  const url = new URL(`/products/${String(product.id).toLowerCase()}/`, 'https://yinzaosuo.com/');
  document.querySelector('link[rel="canonical"]').href = url.href;
  document.querySelector('meta[property="og:url"]').content = url.href;
  const alternates = [
    ['en', url.href],
    ['zh-CN', `https://yinzaosuo.com/zh/products/${String(product.id).toLowerCase()}/`],
    ['x-default', url.href]
  ];
  for (const [locale, href] of alternates) {
    let link = document.querySelector(`link[rel="alternate"][hreflang="${locale}"]`);
    if (!link) { link = document.createElement('link'); link.rel = 'alternate'; link.hreflang = locale; document.head.append(link); }
    link.href = href;
  }
  document.querySelector('#productCategory').textContent = `${productText('category')} · ${product.id}`;
  document.querySelector('#productName').textContent = productText('name');
  document.querySelector('#productIntro').textContent = productText('intro') || product.desc;
  document.querySelector('#productPrice').textContent = referencePrice();
  const structuredData = { '@context': 'https://schema.org', '@type': 'Product', name: productText('name'), description, brand: { '@type': 'Brand', name: 'YINZAOSUO' }, image: product.image || product.thumb || undefined };
  let schema = document.querySelector('#productStructuredData');
  if (!schema) { schema = document.createElement('script'); schema.id = 'productStructuredData'; schema.type = 'application/ld+json'; document.head.append(schema); }
  schema.textContent = JSON.stringify(structuredData);

  const imageContainer = document.querySelector('#productImage');
  imageContainer.replaceChildren();
  const imageSource = String(product.image || product.thumb || '').replace(/^\/?new\//, '/');
  imageContainer.classList.remove('is-placeholder');
  if (imageSource) {
    try {
      const imageUrl = new URL(imageSource, `${window.location.origin}/`);
      if (!['http:', 'https:'].includes(imageUrl.protocol)) throw new Error('Unsupported image URL protocol');
      const image = document.createElement('img');
      image.src = imageUrl.href;
      image.alt = productText('name');
      image.decoding = 'async';
      imageContainer.append(image);
    } catch (error) {
      console.error(`Invalid image URL for product ${product.id}:`, error);
    }
  }
  if (!imageContainer.childElementCount) {
    imageContainer.classList.add('is-placeholder');
    const label = document.createElement('span');
    label.className = 'placeholder-label';
    label.textContent = `${window.t('image_pending')} · ${productText('name')}`;
    const spec = document.createElement('small');
    spec.className = 'placeholder-spec';
    spec.textContent = 'PROTOTYPE / SPEC PENDING';
    const dimensions = document.createElement('small');
    dimensions.className = 'placeholder-dimensions';
    dimensions.textContent = '— × — mm';
    imageContainer.append(label, spec, dimensions);
  }

  const options = product.options || [];
  setSanitizedHtml(document.querySelector('#detailOptions'), options.map((option, index) =>
    `<label>${escapeContent(optionLabel(option.name))}<select data-option-index="${index}">${option.values.map(value => `<option>${escapeContent(optionValue(value))}</option>`).join('')}</select></label>`
  ).join(''));
  document.querySelectorAll('#detailOptions select').forEach((select, index) => {
    select.selectedIndex = currentValues[index] || 0;
  });
}

document.querySelector('#productQuote').addEventListener('click', () => {
  if (!product) return;
  const selections = [...document.querySelectorAll('#detailOptions select')].map(select => {
    const option = product.options[select.dataset.optionIndex];
    return `${optionLabel(option.name)}: ${select.value}`;
  }).join('; ');
  const productName = productText('name');
  localStorage.setItem('pendingQuote', `${productName} (${selections})`);
  window.location.href = 'index.html#quoteModal';
});


function renderProductInformation() {
  const root = document.querySelector('#productInformation');
  if (!root || !product || !product.detail) {
    if (root) root.hidden = true;
    return;
  }
  const detail = product.detail;
  root.hidden = false;
  const labels = language() === 'en'
    ? { eyebrow: 'PRODUCT DETAILS', title: 'Made around your project requirements.', highlights: 'PRODUCTION OPTIONS', applications: 'TYPICAL APPLICATIONS', finishing: 'FINISHING & PROCESSING', delivery: 'DELIVERY FORMATS', artworkTitle: 'Artwork support', briefTitle: 'What to include in your enquiry', quote: 'Discuss your project ↗' }
    : { eyebrow: '产品详情', title: '根据项目需求定制生产。', highlights: '生产与定制能力', applications: '适用场景', finishing: '加工与后道处理', delivery: '交付形式', artworkTitle: '设计文件支持', briefTitle: '询价时建议提供的信息', quote: '咨询项目需求 ↗' };
  document.querySelector('#productInfoEyebrow').textContent = labels.eyebrow;
  document.querySelector('#productInfoTitle').textContent = labels.title;
  document.querySelector('#productInfoLead').textContent = detail.lead;
  document.querySelector('#productHighlightsLabel').textContent = labels.highlights;
  document.querySelector('#productApplicationsLabel').textContent = labels.applications;
  document.querySelector('#productFinishingLabel').textContent = labels.finishing;
  document.querySelector('#productDeliveryLabel').textContent = labels.delivery;
  document.querySelector('#productArtworkTitle').textContent = labels.artworkTitle;
  document.querySelector('#productBriefTitle').textContent = labels.briefTitle;
  document.querySelector('#productInformationQuote').textContent = labels.quote;
  const renderList = (selector, values) => {
    const list = document.querySelector(selector);
    list.replaceChildren();
    (values || []).forEach(value => {
      const item = document.createElement('li');
      item.textContent = value;
      list.append(item);
    });
  };
  renderList('#productHighlights', detail.highlights);
  renderList('#productApplications', detail.applications);
  renderList('#productFinishing', detail.finishing);
  renderList('#productDelivery', detail.delivery);
  document.querySelector('#productArtwork').textContent = detail.artwork;
  document.querySelector('#productBrief').textContent = detail.brief;
  document.querySelector('#productCaveat').textContent = detail.caveat;
}

document.querySelector('#productInformationQuote')?.addEventListener('click', () => {
  if (!product) return;
  localStorage.setItem('pendingQuote', productText('name'));
});

window.registerLanguageRenderer(renderProductDetails);
window.registerLanguageRenderer(renderProductInformation);
renderProductDetails();
renderProductInformation();
