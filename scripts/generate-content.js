const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
// Content is split per language: the English build reads content/en and
// writes to the repository root; the Chinese build reads content/zh and
// writes to zh/. Language is chosen explicitly (--lang=zh or CMS_LANG=zh),
// never inferred from a shared bilingual dataset.
const lang = (() => {
  const arg = process.argv.find(entry => entry.startsWith('--lang='));
  const value = (arg ? arg.slice('--lang='.length) : process.env.CMS_LANG || 'en').toLowerCase();
  if (!['en', 'zh'].includes(value)) throw new Error(`Unsupported content language: ${value}`);
  return value;
})();
const isChineseBuild = lang === 'zh';
const root = isChineseBuild ? path.join(repositoryRoot, 'zh') : repositoryRoot;
const contentRoot = path.join(repositoryRoot, 'content', lang);
const counterpartRoot = path.join(repositoryRoot, 'content', isChineseBuild ? 'en' : 'zh');
const sitePrefix = isChineseBuild ? '/zh' : '';
const outputFile = path.join(root, 'assets', 'js', 'content-index.js');
const siteUrl = 'https://yinzaosuo.com';

const categoryDefaults = {
  wideformat: {
    num: '01',
    zh: '写真与大幅面印刷材料',
    en: 'Photo & Wide-Format Print Media',
    desc: '面向印刷贸易商、广告制作商与标识供应商的写真相纸、合成纸、背胶及PVC喷绘材料。',
    desc_en: 'Photo papers, PP synthetic paper, self-adhesive vinyl and PVC print media for trade printers and sign makers.'
  },
  commercial: {
    num: '01',
    zh: '商务印制类',
    en: 'Commercial Print',
    desc: '品牌视觉落地与商务事务物料，提供标准及特种工艺解决方案',
    desc_en: 'Brand identity assets and business print collaterals with bespoke finishes.'
  },
  packaging: {
    num: '02',
    zh: '包装定制类',
    en: 'Packaging',
    desc: '从产品包装到品牌标签，兼顾保护、识别与开箱体验',
    desc_en: 'Packaging and labels designed for protection, recognition, and unboxing.'
  },
  exhibition: {
    num: '03',
    zh: '广告加工类',
    en: 'Exhibition',
    desc: '面向活动、零售与空间展示的广告物料和制作服务',
    desc_en: 'Display graphics and production for events, retail, and branded spaces.'
  },
};

function filesIn(folder, extension) {
  const directory = path.join(contentRoot, folder);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(file => file.toLowerCase().endsWith(extension))
    .sort((a, b) => a.localeCompare(b))
    .map(file => path.join(directory, file));
}

function parseYamlValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('"')) {
    try { return JSON.parse(trimmed); } catch { return trimmed.slice(1, -1); }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).replace(/''/g, "'");
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed); } catch { return trimmed; }
  }
  return trimmed.replace(/\s+#.*$/, '');
}

function parseNestedYaml(lines) {
  const result = [];
  let current = null;
  for (const line of lines) {
    const item = line.match(/^\s*-\s*(.*)$/);
    if (item) {
      if (current) result.push(current);
      if (/^[\w-]+:/.test(item[1])) {
        const [key, ...rest] = item[1].split(':');
        current = { [key]: parseYamlValue(rest.join(':')) };
      } else {
        current = parseYamlValue(item[1]);
      }
      continue;
    }
    const property = line.match(/^\s+([\w-]+):\s*(.*)$/);
    if (property && current && typeof current === 'object') current[property[1]] = parseYamlValue(property[2]);
  }
  if (current) result.push(current);
  return result;
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('Missing YAML frontmatter');
  const lines = match[1].split(/\r?\n/);
  const fields = {};
  for (let index = 0; index < lines.length; index += 1) {
    const field = lines[index].match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!field) continue;
    const [, name, raw = ''] = field;
    if (/^[|>][+-]?$/.test(raw)) {
      const block = [];
      while (index + 1 < lines.length && (/^\s+/.test(lines[index + 1]) || !lines[index + 1].trim())) {
        const line = lines[++index];
        block.push(line.trim() ? line.replace(/^\s{2}/, '') : '');
      }
      fields[name] = block.join(raw.startsWith('>') ? ' ' : '\n');
    } else if (raw.trim()) {
      fields[name] = parseYamlValue(raw);
    } else {
      const nested = [];
      while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) nested.push(lines[++index]);
      fields[name] = parseNestedYaml(nested);
    }
  }
  return { fields, body: match[2].trim() };
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

function articleSlug(item) {
  const configuredSlug = String(item.slug || '').trim();
  if (
    configuredSlug &&
    configuredSlug !== String(item.id || '') &&
    !/^[a-z]*\d{8,}$/i.test(configuredSlug)
  ) {
    const slug = slugify(configuredSlug);
    if (slug) return slug;
  }
  return slugify(item.title) || slugify(item.id) || 'article';
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    copy: '©',
    gt: '>',
    hellip: '…',
    laquo: '«',
    ldquo: '“',
    lsquo: '‘',
    lt: '<',
    mdash: '—',
    nbsp: ' ',
    ndash: '–',
    quot: '"',
    raquo: '»',
    rdquo: '”',
    rsquo: '’'
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, reference) => {
    if (reference[0] !== '#') return named[reference.toLowerCase()] ?? entity;
    const codePoint = reference[1].toLowerCase() === 'x'
      ? Number.parseInt(reference.slice(2), 16)
      : Number.parseInt(reference.slice(1), 10);
    return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

function renderStaticText(html) {
  const source = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(?:img|input|button|form|iframe|video|audio)\b[^>]*>/gi, ' ');
  const allowedTags = new Set(['h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'strong', 'b', 'em', 'i', 'code', 'pre', 'a', 'br']);
  const tagPattern = /<\/?([a-z][a-z0-9:-]*)\b([^>]*)>/gi;
  let output = '';
  let cursor = 0;
  let anchorOpen = false;

  for (const match of source.matchAll(tagPattern)) {
    output += escapeHtml(decodeHtmlEntities(source.slice(cursor, match.index)));
    const rawTag = match[0];
    const closing = /^<\//.test(rawTag);
    const tag = match[1].toLowerCase();

    if (allowedTags.has(tag)) {
      if (tag === 'a') {
        if (closing) {
          if (anchorOpen) output += '</a>';
          anchorOpen = false;
        } else {
          const hrefMatch = match[2].match(/\bhref\s*=\s*(["'])(.*?)\1/i);
          const href = hrefMatch ? safeUrl(decodeHtmlEntities(hrefMatch[2])) : '';
          anchorOpen = Boolean(href);
          if (anchorOpen) output += '<a href="' + escapeHtml(href) + '" rel="noopener noreferrer">';
        }
      } else if (tag === 'br') {
        if (!closing) output += '<br>';
      } else {
        output += closing ? '</' + tag + '>' : '<' + tag + '>';
      }
    }
    cursor = match.index + rawTag.length;
  }

  output += escapeHtml(decodeHtmlEntities(source.slice(cursor)));
  return output
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .trim();
}

function renderStaticArticle(item, collection, template) {
  const isEnglish = !isChineseBuild;
  const title = item.seo_title || item.title;
  const heading = item.title;
  const description = item.seo_description || item.excerpt || item.title;
  const canonicalUrl = `${siteUrl}${item.url}`;
  const image = safeMediaUrl(item.cover);
  const imageUrl = image ? new URL(image, `${siteUrl}/`).href : '';
  const body = item.content;
  const articleType = collection === 'news' ? 'NewsArticle' : 'Article';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': articleType,
    headline: heading,
    description,
    datePublished: item.date || undefined,
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    author: { '@type': 'Organization', name: 'YINZAOSUO', url: siteUrl },
    publisher: { '@type': 'Organization', name: 'YINZAOSUO', url: siteUrl },
    image: imageUrl || undefined
  };
  const jsonLd = JSON.stringify(structuredData)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const baseUrl = `${siteUrl}${sitePrefix || ''}/`;
  let html = /<base\b/i.test(template)
    ? template
    : template.replace('<head>', `<head><base href="${escapeHtml(baseUrl)}">`);
  html = html.replace(/<meta name="robots" content="noindex,follow">/i, '');
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)} | ${isEnglish ? 'YINZAOSUO' : '印造所'}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*"[^>]*>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*"[^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`);
  if (item.hasCounterpart) {
    const englishUrl = `${siteUrl}/articles/${encodeURIComponent(item.slug)}/`;
    const chineseUrl = `${siteUrl}/zh/articles/${encodeURIComponent(item.slug)}/`;
    html = html.replace('</head>', `<link rel="alternate" hreflang="en" href="${englishUrl}"><link rel="alternate" hreflang="zh-CN" href="${chineseUrl}"><link rel="alternate" hreflang="x-default" href="${englishUrl}"></head>`);
  }
  if (imageUrl) html = html.replace('</head>', `<meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:alt" content="${escapeHtml(title)}"></head>`);
  html = html.replace('</head>', `<script id="productStructuredData" type="application/ld+json">${jsonLd}</script></head>`);
  html = html.replace(
    '<main id="articlePage">',
    `<main id="articlePage" data-article-type="${escapeHtml(collection === 'knowledge' ? 'knowledge' : collection === 'news' ? 'articles' : 'solutions')}" data-article-id="${escapeHtml(item.id)}">`
  );
  html = html.replace(/<p class="eyebrow" id="articleCategory">[\s\S]*?<\/p>/, `<p class="eyebrow" id="articleCategory">${escapeHtml(item.category)}</p>`);
  html = html.replace(/<h1 id="articleTitle">[\s\S]*?<\/h1>/, `<h1 id="articleTitle">${escapeHtml(heading)}</h1>`);
  html = html.replace(
    /<p class="article-date" id="articleDate">[\s\S]*?<\/p>/,
    `<p class="article-date" id="articleDate">${escapeHtml([item.category, item.date].filter(Boolean).join(' · '))}</p>`
  );
  html = html.replace(
    /<img id="articleCover"[^>]*>/,
    `<img id="articleCover" class="article-cover" alt="${escapeHtml(title)}"${imageUrl ? ` src="${escapeHtml(imageUrl)}"` : ' hidden'}>`
  );
  html = html.replace(
    /<div class="article-detail-body" id="articleBody"><\/div>/,
    `<div class="article-detail-body" id="articleBody">${renderStaticText(body)}</div>`
  );
  return html;
}

function writeArticlePages(collections) {
  const template = fs.readFileSync(path.join(root, 'article.html'), 'utf8');
  const routes = new Set();
  for (const { collection, items } of collections) {
    for (const item of items) {
      const route = `/articles/${encodeURIComponent(item.slug)}/`;
      if (routes.has(route)) throw new Error(`Duplicate article URL: ${route}`);
      routes.add(route);
      const output = path.join(root, 'articles', item.slug, 'index.html');
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, renderStaticArticle(item, collection, template), 'utf8');
    }
  }
}

function renderStaticArticleCard(item, index) {
  const isEnglish = !isChineseBuild;
  const category = item.category;
  const title = item.title;
  const excerpt = item.excerpt;
  const cover = safeMediaUrl(item.cover);
  const visual = cover
    ? `<div class="long-card-visual visual-${index % 4} has-image" style="background-image:url('${escapeHtml(cover)}')"></div>`
    : `<div class="long-card-visual visual-${index % 4} is-placeholder"><span>${escapeHtml(category)}</span></div>`;
  const meta = [category, item.date].filter(Boolean).join(' · ');
  const readMore = isEnglish ? 'Read article' : '阅读全文';
  return `<article class="long-card">${visual}<div class="article-meta">${escapeHtml(meta)}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(excerpt)}</p><a class="text-link" href="${escapeHtml(item.url)}">${readMore} <span>↗</span></a></article>`;
}

function renderStaticProductCard(item) {
  const name = item.name || '';
  const image = safeMediaUrl(item.image);
  const visual = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`
    : '';
  return `<a class="archive-card" href="products/${slugify(item.id)}/" data-product-id="${escapeHtml(String(item.id))}"><div class="archive-visual">${visual}</div><div class="archive-card-content"><h3>${escapeHtml(name)}</h3><p class="archive-card-summary">${escapeHtml(item.desc || '')}</p></div></a>`;
}

function renderStaticProductList(records) {
  const covered = new Set();
  const sections = [];
  for (const category of buildCatalog(records).categories) {
    if (!category.items.length) continue;
    category.items.forEach(item => covered.add(String(item.id)));
    sections.push({ title: category.title, desc: category.desc, items: category.items });
  }
  const coreOrder = ['YS-PVC-FOAM-BOARD', 'YS-GLOSS-PHOTO-PAPER', 'YS-SATIN-PHOTO-PAPER', 'YS-ONE-WAY-VISION', 'YS-SYNTHETIC-PAPER', 'YS-COLD-LAMINATION-FILM', 'YS-PVC-MESH', 'YS-PVC-BANNER', 'YS-ADHESIVE-VINYL', 'YS-KT-BOARD', 'YS-OUTDOOR-PVC-RIGID-FILM', 'YS-ROLL-UP', 'YS-X-BANNER', 'YS-DOOR-STAND'];
  const extras = records
    .filter(item => item.hasDetail && !covered.has(String(item.id)))
    .sort((a, b) => coreOrder.indexOf(String(a.id)) - coreOrder.indexOf(String(b.id)))
    .map(item => ({
      id: String(item.id),
      name: item.name || item.title,
      desc: item.detail_desc || '',
      image: productGalleryOf(item)[0] || ''
    }));
  if (extras.length) {
    const defaults = categoryDefaults.exhibition;
    sections.push({
      title: isChineseBuild ? defaults.zh : defaults.en,
      desc: isChineseBuild ? defaults.desc : defaults.desc_en,
      items: extras
    });
  }
  return sections.map(section => `<section class="all-products-category"><div class="all-products-category-heading"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.desc)}</p></div><div class="product-archive-grid">${section.items.map(renderStaticProductCard).join('')}</div></section>`).join('');
}

function injectStaticList(html, containerId, pageKey, innerHtml) {
  const openPattern = new RegExp(`(<[^>]*\\bid="${containerId}"[^>]*>)`);
  if (!openPattern.test(html)) return null;
  const stripped = html.replace(/<!--static-list:[\w.-]+-->[\s\S]*?<!--\/static-list-->/g, '');
  if (!innerHtml) return stripped;
  return stripped.replace(openPattern, `$1<!--static-list:${pageKey}-->${innerHtml}<!--/static-list-->`);
}

function writeListPages(data) {
  const pages = [
    { file: 'products.html', container: 'allProductCategories', render: () => renderStaticProductList(data.records) },
    { file: 'solutions.html', container: 'solutionsGrid', render: () => data.solutions.map(renderStaticArticleCard).join('') },
    { file: 'knowledge.html', container: 'knowledgeGrid', render: () => data.knowledge.map(renderStaticArticleCard).join('') },
    { file: 'journal.html', container: 'articleGrid', render: () => data.news.map(renderStaticArticleCard).join('') }
  ];
  for (const page of pages) {
    const filePath = path.join(root, page.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping static list pre-render: ${page.file} not found`);
      continue;
    }
    const source = fs.readFileSync(filePath, 'utf8');
    const output = injectStaticList(source, page.container, page.file, page.render());
    if (output === null) {
      console.warn(`Skipping static list pre-render: no #${page.container} container in ${page.file}`);
      continue;
    }
    if (output !== source) fs.writeFileSync(filePath, output, 'utf8');
  }
}

// Materials images hosted on Tencent COS: masters are stored uncompressed,
// the site serves on-the-fly processed variants (resize + WebP) per slot.
// Non-COS URLs and URLs that already carry a query string pass through.
const COS_IMAGE_BASE = 'https://yinzaosuo-img-1256424564.cos.ap-shanghai.myqcloud.com/';
const MATERIAL_IMAGE_PARAMS = {
  card: 'thumbnail/800x/format/webp/quality/75',
  main: 'thumbnail/1600x/format/webp/quality/80',
  thumb: 'thumbnail/300x/format/webp/quality/70'
};
function materialImageVariant(url, params) {
  const value = String(url || '');
  if (!value.startsWith(COS_IMAGE_BASE) || value.includes('?')) return value;
  return `${value}?imageMogr2/${params}`;
}

function normalizeMaterial(item) {
  const gallery = (Array.isArray(item.gallery) ? item.gallery : [])
    .map(entry => (typeof entry === 'string' ? entry : entry?.image))
    .map(image => safeMediaUrl(String(image || '').trim()))
    .filter(Boolean);
  return {
    id: String(item.id),
    title: item.title || '',
    gallery,
    description: item.description || '',
    sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 10,
    hidden: item.hidden === true,
    status: item.hidden === true ? 'hidden' : 'published'
  };
}

// Retitles a copied page shell (zh/xian.html is the layout reference for the
// new zh pages) with the target page's own metadata.
function retitleShell(shell, { title, description, url }) {
  let html = shell.split('https://yinzaosuo.com/zh/xian.html').join(url);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(title)}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeHtml(url)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeHtml(url)}">`);
  return html;
}

function replaceShellMain(shell, mainHtml) {
  return shell.replace(/<main>[\s\S]*?<\/main>/, `<main>\n${mainHtml}\n  </main>`);
}

// The delivery page (zh only) is generated from content/zh/settings/
// delivery.json; every visible string comes from that file. Headings and
// card eyebrow labels that have no delivery.json field （覆盖范围 / 下单流程 /
// 常见问题 / 我们的做法 / 常见对比 / 西安本地服务） are layout literals copied
// from the layout reference page zh/xian.html, whose copy delivery.json was
// transcribed from in phase 1.
function renderDeliveryMain(delivery) {
  const title = String(delivery.title || '');
  const comma = title.indexOf('，');
  const heading = comma > 0
    ? `${escapeHtml(title.slice(0, comma + 1))}<em>${escapeHtml(title.slice(comma + 1))}</em>`
    : escapeHtml(title);
  const timetableCards = (Array.isArray(delivery.timetable) ? delivery.timetable : []).map(entry => `
        <article class="long-card"><div class="article-meta">${escapeHtml(entry.label || '')}</div><h3>${escapeHtml(entry.condition || '')}</h3><p>${escapeHtml(entry.body || '')}</p></article>`).join('');
  const stepCards = (Array.isArray(delivery.steps) ? delivery.steps : []).map((entry, index) => `
        <article class="long-card"><div class="article-meta">第 ${index + 1} 步</div><h3>${escapeHtml(entry.title || '')}</h3><p>${escapeHtml(entry.body || '')}</p></article>`).join('');
  const faqItems = (Array.isArray(delivery.faq) ? delivery.faq : []).map(entry => `
      <p><strong>${escapeHtml(entry.question || '')}</strong>${escapeHtml(entry.answer || '')}</p>`).join('');
  const phoneDigits = String(delivery.contact_phone || '').replace(/[^\d]/g, '');
  const phoneHref = phoneDigits ? `tel:+86${phoneDigits}` : '';
  return `
    <section class="page-hero page-hero-photo" style="background-image:url('assets/images/products/ys-kt-board.webp')"><div class="container">
      <p class="eyebrow">西安本地服务</p>
      <h1>${heading}</h1>
      <p>${escapeHtml(delivery.intro || '')}</p><div class="hero-actions"><button type="button" class="button" data-open-quote>获取报价 <span>↗</span></button><a class="button button-ghost" href="products.html">产品大全</a></div>
    </div></section>
    <section class="section page-content"><div class="container">
      <h2>${escapeHtml(delivery.timetable_heading || '')}</h2>
      <p>${escapeHtml(delivery.timetable_note || '')}</p>
      <div class="article-page-grid">${timetableCards}
      </div>
      <h2>覆盖范围</h2>
      <p>${escapeHtml(delivery.coverage || '')}</p>
      <p>${escapeHtml(delivery.regions_note || '')}</p>
      <h2>${escapeHtml(delivery.van_heading || '')}</h2>
      <div class="article-page-grid">
        <article class="long-card"><div class="article-meta">我们的做法</div><h3>${escapeHtml(delivery.van_ours?.title || '')}</h3><p>${escapeHtml(delivery.van_ours?.body || '')}</p></article>
        <article class="long-card"><div class="article-meta">常见对比</div><h3>${escapeHtml(delivery.van_compare?.title || '')}</h3><p>${escapeHtml(delivery.van_compare?.body || '')}</p></article>
      </div>
      <h2>下单流程</h2>
      <div class="article-page-grid">${stepCards}
      </div>
      <h2>常见问题</h2>${faqItems}
      <div class="hero-actions"><button type="button" class="button" data-open-quote>获取报价 <span>↗</span></button>${phoneHref ? `<a class="button button-ghost" href="${phoneHref}">电话 / 微信：${escapeHtml(delivery.contact_phone)}</a>` : ''}</div>
    </div></section>`;
}

function renderDeliveryPage(delivery, shell) {
  const titled = retitleShell(shell, {
    title: '西安广告材料配送时效｜印造所',
    description: String(delivery.intro || ''),
    url: `${siteUrl}/zh/delivery.html`
  });
  return replaceShellMain(titled, renderDeliveryMain(delivery));
}

function writeDeliveryPage() {
  if (!isChineseBuild) return;
  const settingsPath = path.join(contentRoot, 'settings', 'delivery.json');
  if (!fs.existsSync(settingsPath)) return;
  const delivery = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const shell = fs.readFileSync(path.join(root, 'xian.html'), 'utf8');
  fs.writeFileSync(path.join(root, 'delivery.html'), renderDeliveryPage(delivery, shell), 'utf8');
}

function renderMaterialCard(item) {
  const cover = materialImageVariant(item.gallery[0], MATERIAL_IMAGE_PARAMS.card);
  const visual = cover
    ? `<div class="long-card-visual has-image" style="background-image:url('${escapeHtml(cover)}')"></div>`
    : `<div class="long-card-visual is-placeholder"><span>素材中心</span></div>`;
  return `<article class="long-card">${visual}<h2>${escapeHtml(item.title)}</h2><a class="text-link" href="materials/${slugify(item.id)}/">查看素材 <span>↗</span></a></article>`;
}

function renderMaterialsListPage(materials, shell) {
  const cards = materials.length
    ? materials.map(renderMaterialCard).join('')
    : '<p class="materials-empty">素材持续更新中，敬请期待。</p>';
  const titled = retitleShell(shell, {
    title: '素材中心｜印造所',
    description: '印造所素材中心：挑选喜欢的画面，点进详情即可询价制作。',
    url: `${siteUrl}/zh/materials.html`
  });
  const withCss = titled.replace('</head>', '<link rel="stylesheet" href="assets/css/materials.css"></head>');
  const main = `
    <section class="page-hero"><div class="container">
      <p class="eyebrow">素材中心</p>
      <h1>素材中心</h1>
      <p>选中喜欢的画面，点进详情即可询价制作。</p>
    </div></section>
    <section class="section page-content"><div class="container">
      <div class="knowledge-page-grid" id="materialsGrid">${cards}</div>
    </div></section>`;
  return replaceShellMain(withCss, main);
}

function renderMaterialDetailPage(item, shell) {
  const slug = slugify(item.id);
  const title = item.title;
  const mainImage = item.gallery[0] || '';
  const gallery = mainImage
    ? `<div class="material-main"><img id="materialMainImage" src="${escapeHtml(materialImageVariant(mainImage, MATERIAL_IMAGE_PARAMS.main))}" alt="${escapeHtml(title)}"></div>
      <div class="material-thumbs" id="materialThumbs">${item.gallery.map((image, index) => `<button type="button" class="material-thumb${index === 0 ? ' is-active' : ''}" data-material-image="${escapeHtml(materialImageVariant(image, MATERIAL_IMAGE_PARAMS.main))}" aria-label="查看第 ${index + 1} 张图"><img src="${escapeHtml(materialImageVariant(image, MATERIAL_IMAGE_PARAMS.thumb))}" alt=""></button>`).join('')}</div>`
    : '<div class="material-main material-main-empty"><span>素材中心</span></div>';
  const titled = retitleShell(shell, {
    title: `${title}｜素材中心｜印造所`,
    description: item.description || title,
    url: `${siteUrl}/zh/materials/${slug}/`
  });
  const withAssets = titled
    .replace('</head>', '<link rel="stylesheet" href="assets/css/materials.css"></head>')
    .replace('</body>', '<script src="assets/js/material-detail.js"></script></body>');
  const main = `
    <section class="section material-detail"><div class="container material-detail-layout">
      <div class="material-gallery">${gallery}
      </div>
      <div class="material-copy">
        <p class="eyebrow">素材中心</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="material-description">${escapeHtml(item.description || '')}</p>
        <button type="button" class="button button-dark" id="materialQuote" data-material-title="${escapeHtml(title)}">咨询这款素材 <span>↗</span></button>
        <p class="material-back"><a class="text-link" href="materials.html">← 返回素材中心</a></p>
      </div>
    </div></section>`;
  return replaceShellMain(withAssets, main);
}

function writeMaterialsPages(materials) {
  if (!isChineseBuild) return;
  const shell = fs.readFileSync(path.join(root, 'xian.html'), 'utf8');
  fs.writeFileSync(path.join(root, 'materials.html'), renderMaterialsListPage(materials, shell), 'utf8');
  for (const item of materials) {
    const directory = path.join(root, 'materials', slugify(item.id));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'index.html'), renderMaterialDetailPage(item, shell), 'utf8');
  }
}

function safeUrl(url) {
  const value = url.trim();
  return /^(https?:|\/|\.\/|\.\.\/|#)/i.test(value) ? value : '';
}

function safeMediaUrl(url) {
  const value = String(url || '').trim();
  if (!value || /^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return '';
  return value;
}

function renderMarkdown(markdown) {
  const body = String(markdown || '').trim();
  if (!body) return '';
  if (/^\s*</.test(body)) return body;

  const inline = source => {
    let text = escapeHtml(source);
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy" decoding="async">`);
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const href = safeUrl(url);
      return href ? `<a href="${href}">${label}</a>` : label;
    });
    return text;
  };

  const output = [];
  let paragraph = [];
  let listType = '';
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = '';
  };

  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const list = line.match(/^\s*([-*]|\d+\.)\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (list) {
      flushParagraph();
      const type = /^\d/.test(list[1]) ? 'ol' : 'ul';
      if (type !== listType) {
        closeList();
        output.push(`<${type}>`);
        listType = type;
      }
      output.push(`<li>${inline(list[2])}</li>`);
    } else if (!line.trim()) {
      flushParagraph();
      closeList();
    } else {
      closeList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  closeList();
  return output.join('');
}

function readMarkdownCollection(name) {
  return filesIn(name, '.md').map(file => {
    const { fields, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    return { ...fields, id: fields.id || fields.slug || path.basename(file, '.md'), body };
  });
}

// Visibility is per-language now: an entry exists in exactly one language
// tree (or both, as two independent files), and `hidden: true` in that
// tree's file is the only publication switch. There is no publish_to.
// A product's detail gallery: the Decap `detail_gallery` list when it has
// entries, otherwise the legacy single detail image, otherwise the list
// image. List cards borrow the first gallery image, so a product only
// needs its gallery maintained.
function productGalleryOf(record) {
  const entries = Array.isArray(record.detail_gallery) ? record.detail_gallery : [];
  const gallery = entries
    .map(entry => (typeof entry === 'string' ? entry : entry?.image))
    .map(image => safeMediaUrl(String(image || '').trim()))
    .filter(Boolean);
  if (gallery.length) return gallery;
  const single = safeMediaUrl(String(record.detail_image || record.image || '').trim());
  return single ? [single] : [];
}

function normalizeProductRecord(record) {
  const item = { ...record, id: String(record.id) };
  item.hidden = record.hidden === true;
  item.status = item.hidden ? 'hidden' : 'published';
  item.title = record.title || record.name || '';
  item.image = typeof record.image === 'string' ? record.image : '';
  item.desc = record.desc || record.intro || '';
  item.intro = record.intro || record.desc || '';
  item.materials = Array.isArray(record.materials) ? record.materials : [];
  item.crafts = Array.isArray(record.crafts) ? record.crafts : [];
  item.sort_order = Number.isFinite(Number(record.sort_order)) ? Number(record.sort_order) : 10;
  item.show_in_archive = record.show_in_archive !== false;
  // Merged records carry the old list layer (products) and detail layer
  // (catalogue) in one file; these flags rebuild the two runtime views.
  item.hasDetail = Boolean(record.name || record.detail || record.detail_desc || record.detail_seo_title || record.detail_seo_description || record.detail_image || (Array.isArray(record.detail_gallery) && record.detail_gallery.length > 0));
  item.hasListLayer = record.category !== undefined || record.sort_order !== undefined || record.show_in_archive !== undefined;
  item.hasCounterpart = false;
  return item;
}

function deduplicateRecords(records) {
  const unique = new Map();
  for (const record of records) {
    const id = String(record.id);
    if (!unique.has(id)) unique.set(id, record);
  }
  return [...unique.values()];
}

function catalogueViewOf(record) {
  return {
    id: record.id,
    hidden: record.hidden,
    status: record.status,
    name: record.name || '',
    image: productGalleryOf(record)[0] || '',
    desc: record.detail_desc || '',
    seo_title: record.detail_seo_title || '',
    seo_description: record.detail_seo_description || '',
    detail: record.detail,
    image_credit: record.detail_image_credit || record.image_credit || '',
    sort_order: record.sort_order
  };
}

// hreflang counterpart detection: a page links to its other-language twin
// only when a visible entry with the same id/slug exists in the other
// language's content tree.
function counterpartProductIds() {
  const directory = path.join(counterpartRoot, 'products');
  if (!fs.existsSync(directory)) return new Set();
  const ids = new Set();
  for (const file of fs.readdirSync(directory).filter(entry => entry.toLowerCase().endsWith('.json'))) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
      if (record && record.id && record.hidden !== true) ids.add(String(record.id));
    } catch { /* best-effort: a broken counterpart file just means no hreflang */ }
  }
  return ids;
}

function counterpartArticleSlugs(collection) {
  const directory = path.join(counterpartRoot, collection);
  if (!fs.existsSync(directory)) return new Set();
  const slugs = new Set();
  for (const file of fs.readdirSync(directory).filter(entry => entry.toLowerCase().endsWith('.md'))) {
    try {
      const { fields } = parseFrontmatter(fs.readFileSync(path.join(directory, file), 'utf8'));
      if (fields.hidden === true) continue;
      const slug = articleSlug({ ...fields, id: fields.id || fields.slug || path.basename(file, '.md') });
      if (slug) slugs.add(slug);
    } catch { /* best-effort, as above */ }
  }
  return slugs;
}

function normalizeTemplate(template) {
  const item = { ...template, id: String(template.id), hidden: template.hidden === true };
  item.status = item.hidden ? 'hidden' : 'published';
  if (item.file_url && !/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(item.file_url)) {
    throw new Error(`Template ${item.id} has an unsupported file_url: ${item.file_url}`);
  }
  item.title = item.title || '';
  item.type = item.type || item.category || item.style || '';
  item.category = item.category || item.type;
  item.style = item.style || item.type;
  item.style_en = item.style_en || item.type_en || '';
  item.size = item.size || item.size_spec || '';
  item.thumb = item.thumb || '';
  item.designImage = item.designImage || item.thumb;
  item.sizeImage = item.sizeImage || '';
  item.sceneImage = item.sceneImage || '';
  item.price = item.price || '';
  item.tags = Array.isArray(item.tags) ? item.tags : [];
  return item;
}

function normalizeArticle(item, collection) {
  const isKnowledge = collection === 'knowledge';
  const galleryImages = collection === 'solutions' && Array.isArray(item.gallery)
    ? item.gallery.map(entry => entry?.image).filter(Boolean)
    : [];
  for (const image of galleryImages) {
    if (!safeUrl(image)) throw new Error(`Solution ${item.id} has an unsupported gallery image URL: ${image}`);
  }
  const gallery = galleryImages.map(image => `<p><img src="${safeUrl(image)}" alt="" loading="lazy" decoding="async"></p>`).join('');
  const body = `${renderMarkdown(item.body)}${gallery}`;
  const slug = articleSlug(item);
  if (!slug) throw new Error(`Article ${item.id || item.title || ''} needs a URL slug`);
  return {
    ...item,
    id: String(item.id),
    slug,
    route: `/articles/${encodeURIComponent(slug)}/`,
    url: `${sitePrefix}/articles/${encodeURIComponent(slug)}/`,
    title: item.title || '',
    category: item.category || (isKnowledge
      ? (isChineseBuild ? '印前知识' : 'Print Knowledge')
      : (isChineseBuild ? '品牌动态' : 'News')),
    seo_title: item.seo_title || '',
    seo_description: item.seo_description || '',
    date: item.date || '',
    cover: item.cover || item.thumbnail || item.cover_image || '',
    excerpt: item.summary || item.description || '',
    sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 10,
    hidden: item.hidden === true,
    status: item.hidden === true ? 'hidden' : 'published',
    hasCounterpart: false,
    content: body
  };
}

function buildCatalog(records) {
  const visible = records.filter(record => record.show_in_archive && categoryDefaults[record.category]);
  const catalog = { categories: [] };
  for (const [categoryId, defaults] of Object.entries(categoryDefaults)) {
    const categoryProducts = visible
      .filter(record => record.category === categoryId)
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    if (!categoryProducts.length) continue;
    const first = categoryProducts[0];
    catalog.categories.push({
      id: categoryId,
      num: String(catalog.categories.length + 1).padStart(2, '0'),
      title: first.category_title || (isChineseBuild ? defaults.zh : defaults.en),
      desc: first.category_desc || (isChineseBuild ? defaults.desc : defaults.desc_en),
      items: categoryProducts.map(record => ({
        id: record.id,
        name: record.title,
        image: productGalleryOf(record)[0] || '',
        desc: record.desc,
        materials: record.materials,
        crafts: record.crafts
      }))
    });
  }
  return catalog;
}

function buildSitemap(data) {
  const routes = new Set(['/']);
  const nonIndexablePages = new Set(['admin.html', 'index.html', 'article.html', 'product.html', 'bj.html', 'ys.html']);
  const excludedPages = new Set(['admin.html', 'bj.html', 'ys.html']);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.html?$/i.test(entry.name) || excludedPages.has(entry.name)) continue;
    if (!nonIndexablePages.has(entry.name)) routes.add(`/${entry.name}`);
  }
  const queue = ['index.html'];
  const visited = new Set();
  while (queue.length) {
    const relative = queue.shift();
    if (visited.has(relative)) continue;
    visited.add(relative);
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) continue;
    if (!nonIndexablePages.has(relative)) routes.add(`/${relative.split(path.sep).join('/')}`);
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/href\s*=\s*(['"])(.*?)\1/gi)) {
      const href = match[2].trim();
      if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) continue;
      const target = href.split(/[?#]/, 1)[0];
      if (!/\.html?$/i.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), target);
      if (!resolved.startsWith(`${root}${path.sep}`)) continue;
      const relativeTarget = path.relative(root, resolved);
      if (relativeTarget.split(path.sep).some(segment => segment.toLowerCase() === 'admin')) continue;
      queue.push(relativeTarget);
    }
  }
  for (const product of data.records) routes.add(`/products/${slugify(product.id)}/`);
  for (const material of data.materials || []) routes.add(`/materials/${slugify(material.id)}/`);
  for (const item of [...data.knowledge, ...data.news, ...data.solutions]) routes.add(item.route);
  if (!isChineseBuild) routes.delete('/templates.html');
  const metadata = {
    '/': { changefreq: 'weekly', priority: '1.0' },
    '/templates.html': { changefreq: 'weekly', priority: '0.8' },
    '/products.html': { changefreq: 'weekly', priority: '0.8' }
  };
  const urls = [...routes].sort().map(route => {
    const details = metadata[route];
    const tags = details
      ? `<changefreq>${details.changefreq}</changefreq><priority>${details.priority}</priority>`
      : '';
    const publicRoute = sitePrefix ? (route === '/' ? `${sitePrefix}/` : `${sitePrefix}${route}`) : route;
    return `  <url><loc>${escapeHtml(`${siteUrl}${publicRoute}`)}</loc>${tags}</url>`;
  });
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}


// Core trade media that cross-link to each other at the bottom of their
// generated product pages. Display-stand hardware (roll-up, X-banner,
// door stand) is deliberately excluded: it is not print media.
const RELATED_MEDIA_IDS = [
  'YS-GLOSS-PHOTO-PAPER',
  'YS-SATIN-PHOTO-PAPER',
  'YS-SYNTHETIC-PAPER',
  'YS-ADHESIVE-VINYL',
  'YS-OUTDOOR-PVC-RIGID-FILM',
  'YS-PVC-BANNER',
  'YS-PVC-MESH'
];

// Name fallback used only when the caller does not pass the catalogue
// (writeProductPages always passes it, so production pages use the
// catalogue records themselves).
const RELATED_MEDIA_FALLBACK = {
  'YS-GLOSS-PHOTO-PAPER': { name_en: 'Gloss Photo Paper', name_zh: '光面写真相纸' },
  'YS-SATIN-PHOTO-PAPER': { name_en: 'Satin Photo Paper', name_zh: '绸面写真相纸' },
  'YS-SYNTHETIC-PAPER': { name_en: 'Outdoor PP Synthetic Paper', name_zh: '户外PP合成纸' },
  'YS-ADHESIVE-VINYL': { name_en: 'Self-Adhesive Vinyl', name_zh: '自粘背胶' },
  'YS-OUTDOOR-PVC-RIGID-FILM': { name_en: 'Outdoor PVC Printing Film', name_zh: '户外PVC喷绘膜' },
  'YS-PVC-BANNER': { name_en: 'Printed PVC Banners', name_zh: 'PVC 横幅喷绘' },
  'YS-PVC-MESH': { name_en: 'Printed PVC Mesh Banners', name_zh: 'PVC 网格布喷绘' }
};

function renderRelatedMedia(record, records) {
  const currentId = String(record.id);
  if (!RELATED_MEDIA_IDS.includes(currentId)) return '';
  const isEnglish = !isChineseBuild;
  const byId = new Map((Array.isArray(records) ? records : []).map(item => [String(item.id), item]));
  const cards = RELATED_MEDIA_IDS
    .filter(otherId => otherId !== currentId)
    .map(otherId => {
      const found = byId.get(otherId);
      const fallback = RELATED_MEDIA_FALLBACK[otherId] || {};
      const item = found || { name: isEnglish ? fallback.name_en : fallback.name_zh, detail_desc: '', detail_image: '' };
      const name = item.name || item.title;
      if (!name) return '';
      const desc = item.detail_desc || '';
      const image = productGalleryOf(item)[0] || '';
      const visual = image
        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`
        : '';
      return `<a class="archive-card" href="products/${slugify(otherId)}/" data-product-id="${escapeHtml(otherId)}"><div class="archive-visual">${visual}</div><div class="archive-card-content"><h3>${escapeHtml(name)}</h3><p class="archive-card-summary">${escapeHtml(desc)}</p></div></a>`;
    })
    .filter(Boolean)
    .join('');
  if (!cards) return '';
  const eyebrow = isEnglish ? 'RELATED MEDIA' : '相关材料';
  const heading = isEnglish ? 'Related media' : '相关产品材料';
  return `<section class="section product-related-media"><div class="container"><p class="eyebrow">${eyebrow}</p><h2>${heading}</h2><div class="product-archive-grid">${cards}</div></div></section>`;
}

function renderStaticProduct(record, template, records) {
  const isEnglish = !isChineseBuild;
  const id = String(record.id);
  const slug = slugify(id);
  const name = record.name || record.title;
  const description = record.detail_seo_description || record.seo_description || record.detail_desc || record.desc || name;
  const seoTitle = record.detail_seo_title || record.seo_title || name;
  const seoTitleBase = String(seoTitle).replace(/\s*(?:\||｜)\s*(?:YINZAOSUO|印造所)\s*$/i, '');
  const intro = record.detail_desc || record.desc || record.intro || description;
  const detail = record.detail;
  const gallery = productGalleryOf(record);
  const image = gallery[0] || '';
  const imageCredit = record.detail_image_credit || record.image_credit || '';
  const imageUrl = image ? new URL(image, `${siteUrl}/`).href : '';
  const canonicalUrl = `${siteUrl}${sitePrefix}/products/${slug}/`;
  const category = record.category_label
    || (record.category === 'wideformat' ? (isEnglish ? 'Photo & Wide-Format Print Media' : '写真与大幅面印刷材料') : record.category)
    || (isEnglish ? 'Print Media' : '印刷材料');
  const price = record.price && (!isEnglish || /^USD\s/i.test(record.price)) ? record.price : '';
  // NOTE (2026-11-16): no Product JSON-LD here. Google's Product rich result
  // requires offers/review/aggregateRating; these are quote-only B2B pages
  // with no published price, so emitting a bare Product block makes GSC
  // report "Product snippet: 1 invalid item" on every product page.
  // Restore it only together with a real, published offers.price.
  const baseUrl = `${siteUrl}${sitePrefix || ''}/`;
  let html = /<base\b/i.test(template)
    ? template
    : template.replace('<head>', `<head><base href="${escapeHtml(baseUrl)}">`);
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seoTitleBase)} | ${isEnglish ? 'YINZAOSUO' : '印造所'}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(seoTitleBase)} | ${isEnglish ? 'YINZAOSUO' : '印造所'}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*"[^>]*>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*"[^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`);
  if (imageUrl) {
    html = html.replace('</head>', `<meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:alt" content="${escapeHtml(name)}"></head>`);
  }
  if (record.hasCounterpart) {
    const englishUrl = `${siteUrl}/products/${slug}/`;
    const chineseUrl = `${siteUrl}/zh/products/${slug}/`;
    html = html.replace('</head>', `<link rel="alternate" hreflang="en" href="${englishUrl}"><link rel="alternate" hreflang="zh-CN" href="${chineseUrl}"><link rel="alternate" hreflang="x-default" href="${englishUrl}"></head>`);
  }
  html = html.replace('<section class="product-detail-page">', `<section class="product-detail-page" data-product-id="${escapeHtml(id)}">`);
  html = html.replace(/<p class="eyebrow" id="productCategory">[\s\S]*?<\/p>/, `<p class="eyebrow" id="productCategory">${escapeHtml(category)}</p>`);
  html = html.replace(/<h1 id="productName">[\s\S]*?<\/h1>/, `<h1 id="productName">${escapeHtml(name)}</h1>`);
  html = html.replace(/<p class="product-detail-intro" id="productIntro">[\s\S]*?<\/p>/, `<p class="product-detail-intro" id="productIntro">${escapeHtml(intro)}</p>`);
  html = html.replace(/<strong class="product-detail-price" id="productPrice">[\s\S]*?<\/strong>/, `<strong class="product-detail-price" id="productPrice">${escapeHtml(price || (isEnglish ? 'Request a quote' : '欢迎询价'))}</strong>`);
  html = html.replace(/<div class="product-detail-image" id="productImage"><\/div>/, `<div class="product-detail-image" id="productImage">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" decoding="async">` : ''}</div>`);
  if (imageCredit) {
    html = html.replace(/(<div class="product-detail-image" id="productImage">[\s\S]*?<\/div>)/, `$1<p class="product-image-credit">${escapeHtml(imageCredit)}</p>`);
    html = html.replace('</head>', '<style>.product-image-credit{margin:8px 2px 0;font-size:12px;line-height:1.5;color:#777}</style></head>');
  }
  if (gallery.length > 1) {
    const thumbs = gallery.map((entry, index) => {
      const thumbUrl = new URL(entry, `${siteUrl}/`).href;
      return `<button type="button" class="product-thumb${index === 0 ? ' is-active' : ''}" data-product-image="${escapeHtml(thumbUrl)}" aria-label="${escapeHtml(isEnglish ? `View image ${index + 1}` : `查看第 ${index + 1} 张图`)}"><img src="${escapeHtml(thumbUrl)}" alt="" loading="lazy" decoding="async"></button>`;
    }).join('');
    html = html.replace(/(<div class="product-detail-image" id="productImage">[\s\S]*?<\/div>)/, `$1<div class="product-thumbs" id="productThumbs">${thumbs}</div>`);
    html = html.replace('</head>', '<style>.product-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.product-thumbs .product-thumb{width:72px;height:72px;padding:0;border:2px solid #e2e2e2;border-radius:8px;overflow:hidden;background:#fff;cursor:pointer}.product-thumbs .product-thumb.is-active{border-color:#17221e}.product-thumbs .product-thumb img{width:100%;height:100%;object-fit:cover;display:block}</style></head>');
    html = html.replace('</body>', '<script src="assets/js/product-gallery.js"></script></body>');
  }
  if (detail) {
    html = html.replace(/<section class="product-information" id="productInformation"[^>]*>/, '<section class="product-information" id="productInformation">');
    html = html.replace(/<h2 id="productInfoTitle">[\s\S]*?<\/h2>/, `<h2 id="productInfoTitle">${escapeHtml(isEnglish ? 'Product specifications & ordering' : '产品详情与采购信息')}</h2>`);
    html = html.replace(/<p id="productInfoLead"><\/p>/, `<p id="productInfoLead">${escapeHtml(detail.lead || '')}</p>`);
    const lists = [
      ['productHighlights', detail.highlights],
      ['productApplications', detail.applications],
      ['productFinishing', detail.finishing],
      ['productDelivery', detail.delivery]
    ];
    for (const [idName, values] of lists) {
      const listHtml = (values || []).map(value => `<li>${escapeHtml(value)}</li>`).join('');
      html = html.replace(new RegExp(`(<ul id="${idName}">)[\\s\\S]*?(<\\/ul>)`), `$1${listHtml}$2`);
    }
    html = html.replace(/<p id="productArtwork"><\/p>/, `<p id="productArtwork">${escapeHtml(detail.artwork || '')}</p>`);
    html = html.replace(/<p id="productBrief"><\/p>/, `<p id="productBrief">${escapeHtml(detail.brief || '')}</p>`);
    html = html.replace(/<p class="product-information-caveat" id="productCaveat"><\/p>/, `<p class="product-information-caveat" id="productCaveat">${escapeHtml(detail.caveat || '')}</p>`);
  } else {
    html = html.replace(/<section class="product-information" id="productInformation"[^>]*>/, '<section class="product-information" id="productInformation" hidden>');
  }
  const relatedMedia = renderRelatedMedia(record, records);
  if (relatedMedia) html = html.replace('</main>', `${relatedMedia}</main>`);
  return html;
}

function writeProductPages(records) {
  const template = fs.readFileSync(path.join(root, 'product.html'), 'utf8');
  for (const record of records) {
    const slug = slugify(String(record.id));
    const output = path.join(root, 'products', slug, 'index.html');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, renderStaticProduct(record, template, records), 'utf8');
  }
}

// Product images are stored in the repository as base64 text files
// (<name>.jpg.b64 / <name>.webp.b64) because the push channel only
// accepts UTF-8 text. Decode them into real image files in the build
// workspace so the deployed site serves normal images at the usual
// paths. No-op when the directory or files are absent (e.g. the
// Chinese build root).
function decodeBase64Images() {
  const directory = path.join(root, 'assets', 'images', 'products');
  if (!fs.existsSync(directory)) return;
  const encodedFiles = fs.readdirSync(directory)
    .filter(file => /\.jpe?g\.b64$/i.test(file) || /\.webp\.b64$/i.test(file))
    .sort((a, b) => a.localeCompare(b));
  for (const file of encodedFiles) {
    const encoded = fs.readFileSync(path.join(directory, file), 'utf8');
    const output = path.join(directory, file.slice(0, -'.b64'.length));
    fs.writeFileSync(output, Buffer.from(encoded, 'base64'));
  }
}

function main() {
  decodeBase64Images();
  const records = deduplicateRecords(filesIn('products', '.json')
    .map(file => JSON.parse(fs.readFileSync(file, 'utf8'))))
    .map(normalizeProductRecord)
    .filter(record => !record.hidden)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const productCounterparts = counterpartProductIds();
  for (const record of records) record.hasCounterpart = productCounterparts.has(record.id);
  const settingsFile = path.join(contentRoot, 'settings', 'home.json');
  const homeSettings = fs.existsSync(settingsFile)
    ? JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
    : {};
  const heroImage = String(homeSettings.hero_image || '').trim();
  if (heroImage && !safeMediaUrl(heroImage)) throw new Error(`Unsupported homepage hero image URL: ${heroImage}`);
  const heroSlides = Array.isArray(homeSettings.hero_slides)
    ? homeSettings.hero_slides.map((slide, index) => {
        const image = String(slide?.image || '').trim();
        if (!image || !safeMediaUrl(image)) throw new Error(`Homepage hero slide ${index + 1} has an invalid image URL`);
        return { image };
      }).filter(slide => slide.image)
    : [];
  if (heroSlides.length && (heroSlides.length < 3 || heroSlides.length > 5)) {
    throw new Error('Homepage hero carousel must contain 3 to 5 slides');
  }
  const globalSettingsFile = path.join(contentRoot, 'settings', 'site.json');
  const globalSettings = fs.existsSync(globalSettingsFile) ? JSON.parse(fs.readFileSync(globalSettingsFile, 'utf8')) : {};
  const siteSettings = {
    global: globalSettings,
    home: {
      ...homeSettings,
      hero_slides: heroSlides,
      modules: homeSettings.modules || {},
      module_order: Array.isArray(homeSettings.module_order) ? homeSettings.module_order : [],
      faq_items: Array.isArray(homeSettings.faq_items) ? homeSettings.faq_items : []
    }
  };
  // Company pages content (EN only) is edited in the backend as two
  // separate file entries — Shipping and About — and rendered
  // client-side from here under the shared "company" settings key.
  const shippingSettingsFile = path.join(contentRoot, 'settings', 'shipping.json');
  const aboutSettingsFile = path.join(contentRoot, 'settings', 'about.json');
  if (fs.existsSync(shippingSettingsFile) || fs.existsSync(aboutSettingsFile)) {
    siteSettings.company = {
      shipping: fs.existsSync(shippingSettingsFile) ? JSON.parse(fs.readFileSync(shippingSettingsFile, 'utf8')) : {},
      about: fs.existsSync(aboutSettingsFile) ? JSON.parse(fs.readFileSync(aboutSettingsFile, 'utf8')) : {}
    };
  }
  const requiredProductIds = ['YS-SYNTHETIC-PAPER', 'YS-GLOSS-PHOTO-PAPER', 'YS-SATIN-PHOTO-PAPER', 'YS-PVC-MESH', 'YS-PVC-BANNER', 'YS-ADHESIVE-VINYL', 'YS-KT-BOARD', 'YS-OUTDOOR-PVC-RIGID-FILM', 'YS-ROLL-UP', 'YS-X-BANNER', 'YS-DOOR-STAND'];
  const recordsById = new Map(records.map(record => [record.id, record]));
  const missingProductIds = requiredProductIds.filter(id => !recordsById.has(id));
  if (missingProductIds.length) throw new Error(`Missing core product records: ${missingProductIds.join(', ')}`);
  for (const id of requiredProductIds) {
    const item = recordsById.get(id);
    const detail = item.detail;
    if (!item.name || !item.detail_desc || !detail || !detail.lead || !detail.artwork || !detail.brief || !detail.caveat) {
      throw new Error(`Core product record ${id} is missing required ${lang} content`);
    }
    for (const field of ['highlights', 'applications', 'finishing', 'delivery']) {
      if (!Array.isArray(detail[field]) || detail[field].length === 0) {
        throw new Error(`Core product record ${id} has no ${lang} ${field}`);
      }
    }
  }
  const templates = filesIn('templates', '.json')
    .map(file => normalizeTemplate(JSON.parse(fs.readFileSync(file, 'utf8'))))
    .filter(item => !item.hidden);
  const materials = filesIn('materials', '.json')
    .map(file => normalizeMaterial(JSON.parse(fs.readFileSync(file, 'utf8'))))
    .filter(item => !item.hidden)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const solutions = readMarkdownCollection('solutions').map(item => normalizeArticle(item, 'solutions')).filter(item => !item.hidden);
  const knowledge = readMarkdownCollection('knowledge').map(item => normalizeArticle(item, 'knowledge')).filter(item => !item.hidden);
  const news = readMarkdownCollection('news')
    .map(item => normalizeArticle(item, 'news'))
    .filter(item => !item.hidden)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  for (const [collection, items] of [['solutions', solutions], ['knowledge', knowledge], ['news', news]]) {
    const counterparts = counterpartArticleSlugs(collection);
    for (const item of items) item.hasCounterpart = counterparts.has(item.slug);
  }
  const products = records.filter(record => record.hasListLayer);
  const catalogue = [...records]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(record => record.hasDetail)
    .map(catalogueViewOf);
  const data = {
    products,
    siteSettings,
    catalog: { [lang]: buildCatalog(records) },
    catalogue,
    records,
    solutions,
    knowledge,
    news,
    templates,
    materials
  };
  writeProductPages(records);
  writeArticlePages([
    { collection: 'knowledge', items: knowledge },
    { collection: 'news', items: news },
    { collection: 'solutions', items: solutions }
  ]);
  writeListPages(data);
  writeDeliveryPage();
  writeMaterialsPages(materials);
  const { records: _records, ...indexData } = data;
  fs.writeFileSync(outputFile, `window.CMS_CONTENT = ${JSON.stringify(indexData)};\n`, 'utf8');
  buildSitemap(data);
  console.log(`Generated ${path.relative(root, outputFile)} and sitemap.xml (${products.length} products, ${knowledge.length} knowledge articles, ${news.length} news, ${templates.length} templates, ${solutions.length} solutions).`);
}

if (require.main === module) main();

module.exports = { articleSlug, decodeBase64Images, injectStaticList, main, normalizeMaterial, parseFrontmatter, renderDeliveryPage, renderMaterialDetailPage, renderMaterialsListPage, renderRelatedMedia, renderStaticArticle, renderStaticProduct, renderStaticProductList, renderStaticText, slugify };
