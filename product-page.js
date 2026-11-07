const storedProductData = JSON.parse(localStorage.getItem('printData') || 'null');
const siteProductData = storedProductData
  ? { ...printData, ...storedProductData, products: storedProductData.products || printData.products }
  : printData;
const legacyProducts = siteProductData.products || [];
const catalogueProducts = (window.PRODUCTS_DATA?.[localStorage.getItem('site_lang') || 'en']?.categories || [])
  .flatMap(category => category.items.map(item => ({
    ...item,
    category: category.title,
    intro: item.desc,
    options: Array.isArray(item.options) ? item.options : []
  })));
const productData = {
  ...siteProductData,
  products: [...catalogueProducts, ...legacyProducts.filter(item => !catalogueProducts.some(current => current.id === item.id))]
};
const productId = new URLSearchParams(location.search).get('id');
let product = productData.products.find(item => item.id === productId) || productData.products[0];
const language = () => localStorage.getItem('site_lang') || 'en';
const productText = field => window.contentText('products', product.id, field, product[field] || product.desc || '');

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
  return window.t('price_quote_only');
}
function renderProductDetails() {
  const localizedCategory = (window.PRODUCTS_DATA?.[language()]?.categories || [])
    .find(category => category.items.some(item => item.id === productId));
  const localizedItem = localizedCategory?.items.find(item => item.id === productId);
  if (localizedItem) product = { ...localizedItem, category: localizedCategory.title, intro: localizedItem.desc, options: localizedItem.options || [] };
  const currentValues = [...document.querySelectorAll('#detailOptions select')].map(select => select.selectedIndex);
  const title = `${productText('name')} | YINZAOSUO`;
  const description = language() === 'en'
    ? productText('intro')
    : product.seoDescription || product.intro || product.desc || product.name;
  document.title = language() === 'en' ? title : product.seoTitle || `${product.name}｜印造所`;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = description;

  const url = new URL(`product.html?id=${encodeURIComponent(product.id)}`, 'https://yinzaosuo.com/');
  document.querySelector('link[rel="canonical"]').href = url.href;
  document.querySelector('meta[property="og:url"]').content = url.href;
  document.querySelector('#productCategory').textContent = `${productText('category')} · ${product.id}`;
  document.querySelector('#productName').textContent = productText('name');
  document.querySelector('#productIntro').textContent = productText('intro') || product.desc;
  document.querySelector('#productPrice').textContent = referencePrice();

  const imageContainer = document.querySelector('#productImage');
  imageContainer.replaceChildren();
  const imageSource = product.image || product.thumb;
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
  document.querySelector('#detailOptions').innerHTML = options.map((option, index) =>
    `<label>${optionLabel(option.name)}<select data-option-index="${index}">${option.values.map(value => `<option>${optionValue(value)}</option>`).join('')}</select></label>`
  ).join('');
  document.querySelectorAll('#detailOptions select').forEach((select, index) => {
    select.selectedIndex = currentValues[index] || 0;
  });
}

document.querySelector('#productQuote').addEventListener('click', () => {
  const selections = [...document.querySelectorAll('#detailOptions select')].map(select => {
    const option = product.options[select.dataset.optionIndex];
    return `${optionLabel(option.name)}: ${select.value}`;
  }).join('; ');
  const productName = productText('name');
  localStorage.setItem('pendingQuote', window.t('quote_product_format').replace('{product}', `${productName} (${selections})`));
  window.location.href = 'index.html#quoteModal';
});


function renderProductInformation() {
  const detail = product.detail;
  const root = document.querySelector('#productInformation');
  if (!root || !detail) {
    if (root) root.hidden = true;
    return;
  }
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

window.registerLanguageRenderer(renderProductDetails);
window.registerLanguageRenderer(renderProductInformation);
renderProductDetails();
renderProductInformation();
