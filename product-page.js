const storedProductData = JSON.parse(localStorage.getItem('printData') || 'null');
const siteProductData = storedProductData
  ? { ...printData, ...storedProductData, products: storedProductData.products || printData.products }
  : printData;
const managedProducts = (window.CMS_CONTENT?.products || []).map(item => ({
  ...item,
  name: item.title,
  category: item.category_legacy || item.category_title || item.category,
  intro: item.intro || item.desc,
  thumb: item.thumb || item.image,
  options: Array.isArray(item.options) ? item.options : []
}));
const productData = {
  ...siteProductData,
  products: Array.isArray(window.CMS_CONTENT?.products) ? managedProducts : siteProductData.products || []
};
const productId = new URLSearchParams(location.search).get('id');
const product = productData.products.find(item => item.id === productId) || productData.products[0];
const language = () => localStorage.getItem('site_lang') || 'zh';
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
  if (!product.price) return window.t('price_reference');
  if (language() !== 'en') return `${product.price}｜${window.t('price_reference')}`;
  const amount = product.price.replace(/^¥\s*/, '').replace(/\s*起$/, '');
  return `${window.t('template_price_from')} ¥${amount} · ${window.t('price_reference')}`;
}

function renderProductDetails() {
  const currentValues = [...document.querySelectorAll('#detailOptions select')].map(select => select.selectedIndex);
  const title = `${productText('name')} | Print Atelier`;
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
    const placeholder = document.createElement('span');
    placeholder.textContent = `${window.t('image_pending')} · ${productText('name')}`;
    imageContainer.append(placeholder);
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

window.registerLanguageRenderer(renderProductDetails);
renderProductDetails();
