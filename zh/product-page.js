const storedProductData = JSON.parse(localStorage.getItem('printData') || 'null');
const siteProductData = storedProductData
  ? { ...printData, ...storedProductData, products: storedProductData.products || printData.products }
  : printData;
const managedCatalogue = window.CMS_CONTENT?.catalogue || [];
const managedProducts = (window.CMS_CONTENT?.products || []).map(item => {
  const detail = managedCatalogue.find(entry => entry.id === item.id);
  return {
    ...item,
    name: item.title,
    category: item.category_legacy || item.category_title || item.category,
    intro: item.intro || item.desc,
    thumb: item.thumb || item.image,
    options: Array.isArray(item.options) ? item.options : [],
    detail: detail?.detail_zh,
    seoTitle: item.seo_title_zh || detail?.seo_title_zh || '',
    seoDescription: item.seo_description_zh || detail?.seo_description_zh || ''
  };
});
const legacyCatalogueProducts = (window.PRODUCTS_DATA?.zh?.categories || []).flatMap(category => category.items.map(item => {
  const detail = managedCatalogue.find(entry => entry.id === item.id);
  return {
    ...item,
    category: category.title,
    intro: item.desc,
    options: Array.isArray(item.options) ? item.options : [],
    detail: detail?.detail_zh || item.detail,
    seoTitle: detail?.seo_title_zh || item.seoTitle || '',
    seoDescription: detail?.seo_description_zh || item.seoDescription || ''
  };
}));
const productData = {
  ...siteProductData,
  products: [
    ...managedProducts,
    ...legacyCatalogueProducts.filter(item => !managedProducts.some(managed => managed.id === item.id)),
    ...(siteProductData.products || []).filter(item => !managedProducts.some(managed => managed.id === item.id) && !legacyCatalogueProducts.some(legacy => legacy.id === item.id))
  ]
};
const productId = new URLSearchParams(location.search).get('id') || document.querySelector('.product-detail-page')?.dataset.productId;
const product = productData.products.find(item => item.id === productId) || productData.products[0];
const language = () => localStorage.getItem('site_lang') || 'zh';
const productText = field => window.contentText('products', product.id, field, product[field] || product.desc || '');
const escapeContent = window.ContentSanitizer.escape;
const setSanitizedHtml = (target, html) => target.replaceChildren(window.ContentSanitizer.sanitize(html));

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
  if (/^USD\s/i.test(product.price)) return `${product.price}｜${window.t('price_reference')}`;
  if (language() === 'en') return window.t('price_quote_only');
  if (language() !== 'en') return `${product.price}｜${window.t('price_reference')}`;
  const amount = product.price.replace(/^¥\s*/, '').replace(/\s*起$/, '');
  return `${window.t('template_price_from')} ¥${amount} · ${window.t('price_reference')}`;
}

function renderProductDetails() {
  const currentValues = [...document.querySelectorAll('#detailOptions select')].map(select => select.selectedIndex);
  const title = language() === 'en' ? `${product.seo_title_en || productText('name')} | YINZAOSUO` : `${product.seoTitle || productText('name')}｜印造所`;
  const description = language() === 'en'
    ? productText('intro')
    : product.seoDescription || product.intro || product.desc || product.name;
  document.title = title;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = description;

  const url = new URL(`/zh/products/${String(product.id).toLowerCase()}/`, 'https://yinzaosuo.com/');
  document.querySelector('link[rel="canonical"]').href = url.href;
  document.querySelector('meta[property="og:url"]').content = url.href;
  const alternates = [
    ['en', `https://yinzaosuo.com/products/${String(product.id).toLowerCase()}/`],
    ['zh-CN', url.href],
    ['x-default', `https://yinzaosuo.com/products/${String(product.id).toLowerCase()}/`]
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
  const imageSource = String(product.image || product.thumb || '').trim().replace(/^\/?new\//, '/');
  imageContainer.classList.remove('is-placeholder', 'image-unavailable');
  const productImageFallbacks = {
  "YS-GLOSS-PHOTO-PAPER": [
    "https://www.webstaurantstore.com/images/products/large/538644/1968681.jpg"
  ],
  "YS-SATIN-PHOTO-PAPER": [
    "https://imagingspectrum.com/cdn/shop/files/prem-luster-roll.jpg?v=1711122770",
    "https://de2wfhoo6xqi5.cloudfront.net/orig/78e/4e2/472ab5862f2be87fa84e8ecdd404aac325.jpg"
  ],
  "YS-SYNTHETIC-PAPER": [
    "https://image.made-in-china.com/2f0j00JKabkAOciuqm/Eco-Solvent-PP-Synthetic-Paper-Double-Sides-Matte-240g-for-Printing.jpg"
  ],
  "YS-ADHESIVE-VINYL": [
    "https://image.made-in-china.com/2f0j00BsPGvtQdhDqV/White-Eco-Solvent-Large-Format-Vinyl-Media-Printing-PVC-Roll-Self-Adhesive-Vinyl.webp",
    "https://image.made-in-china.com/202f0j00UyhlJVrnMikj/Glossy-Matt-White-Eco-Solvent-Printing-PVC-Roll-Printable-Adhesive-Car-Wrap-Vinyl.webp"
  ],
  "YS-OUTDOOR-PVC-RIGID-FILM": [
    "https://avanceytec.com.mx/_next/image?q=75&url=https%3A%2F%2Fnew.avanceytec.com.mx%2Fimg%2Fp%2F2%2F3%2F7%2F5%2F1%2F23751.jpg&w=2048",
    "https://image.made-in-china.com/2f0j00KlqRZfahbzbA/510GSM-PVC-Flex-Backlit-Banner-Marketing-Solvent-Printed-Banners-Rollos-for-Printing-Machine.jpg"
  ]
}
  const imageCandidates = [imageSource, ...(productImageFallbacks[product.id] || [])]
    .filter((value, index, all) => value && all.indexOf(value) === index);
  if (imageCandidates.length) {
    const image = document.createElement('img');
    image.alt = productText('name');
    image.decoding = 'async';
    image.loading = 'eager';
    let imageIndex = 0;
    image.addEventListener('error', () => {
      imageIndex += 1;
      if (imageIndex < imageCandidates.length) {
        image.src = imageCandidates[imageIndex];
        return;
      }
      image.remove();
      imageContainer.classList.add('image-unavailable');
      const message = document.createElement('p');
      message.className = 'product-image-error';
      message.textContent = language() === 'en'
        ? 'Product photo is temporarily unavailable. Please contact us for a material reference.'
        : '产品图片暂时无法加载，请联系我们获取材料图片。';
      imageContainer.append(message);
    });
    image.src = imageCandidates[0];
    imageContainer.append(image);
  } else {
    imageContainer.classList.add('image-unavailable');
    const message = document.createElement('p');
    message.className = 'product-image-error';
    message.textContent = language() === 'en'
      ? 'Product photo is being prepared. Please contact us for a material reference.'
      : '产品图片正在整理中，请联系我们获取材料图片。';
    imageContainer.append(message);
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
  const selections = [...document.querySelectorAll('#detailOptions select')].map(select => {
    const option = product.options[select.dataset.optionIndex];
    return `${optionLabel(option.name)}: ${select.value}`;
  }).join('; ');
  const productName = productText('name');
  localStorage.setItem('pendingQuote', window.t('quote_product_format').replace('{product}', `${productName} (${selections})`));
  window.location.href = 'index.html#quoteModal';
});

window.registerLanguageRenderer(() => { renderProductDetails(); renderProductInformation(); });
renderProductDetails();
renderProductInformation();


function renderProductInformation() {
  const root = document.querySelector('#productInformation');
  if (!root || !product || !product.detail) { if (root) root.hidden = true; return; }
  const catalogueEntry = managedCatalogue.find(entry => entry.id === product.id);
  const detail = language() === 'en' ? catalogueEntry?.detail_en || product.detail : catalogueEntry?.detail_zh || product.detail;
  root.hidden = false;
  document.querySelector('#productInfoTitle').textContent = language() === 'en' ? 'Product specifications & ordering' : '产品详情与采购信息';
  document.querySelector('#productInfoLead').textContent = detail.lead || '';
  const groups = [
    ['productHighlights',language() === 'en' ? 'Specifications & options' : '生产规格与选项','highlights'],
    ['productApplications',language() === 'en' ? 'Applications' : '适用场景','applications'],
    ['productFinishing',language() === 'en' ? 'Finishing & lamination' : '加工与覆膜','finishing'],
    ['productDelivery',language() === 'en' ? 'Packing & delivery' : '包装与交付','delivery']
  ];
  for (const [id,label,key] of groups) {
    const list = document.getElementById(id);
    list.replaceChildren();
    const heading = document.querySelector('[data-info-label="'+id+'"]');
    if (heading) heading.textContent = label;
    for (const value of detail[key] || []) { const li = document.createElement('li'); li.textContent = value; list.append(li); }
  }
  document.querySelector('#productArtwork').textContent = detail.artwork || '';
  document.querySelector('#productBrief').textContent = detail.brief || '';
  root.querySelector('.product-information-notes article:first-child h3').textContent = language() === 'en' ? 'Artwork support' : '设计文件支持';
  root.querySelector('.product-information-notes article:last-child h3').textContent = language() === 'en' ? 'What to include in your enquiry' : '询价时请提供';
  document.querySelector('#productCaveat').textContent = detail.caveat || '';
}
