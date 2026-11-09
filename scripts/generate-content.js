const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const root = process.env.CMS_SITE_ROOT
  ? path.resolve(repositoryRoot, process.env.CMS_SITE_ROOT)
  : repositoryRoot;
const contentRoot = path.join(repositoryRoot, 'content');
const isChineseBuild = root !== repositoryRoot;
const sitePrefix = isChineseBuild ? '/zh' : '';
const outputFile = path.join(root, 'assets', 'js', 'content-index.js');
const siteUrl = 'https://yinzaosuo.com';

const categoryDefaults = {
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
  wideformat: {
    num: '01',
    zh: '写真与大幅面印刷材料',
    en: 'Photo & Wide-Format Print Media',
    desc: '面向印刷贸易商、广告制作商与标识供应商的写真相纸、合成纸、背胶及PVC喷绘材料。',
    desc_en: 'Photo papers, PP synthetic paper, self-adhesive vinyl and PVC print media for trade printers and sign makers.'
  }
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
  return slugify(item.title_en) || slugify(item.title) || slugify(item.id) || 'article';
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
  const text = decodeHtmlEntities(String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<br\b[^>]*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|pre|section|tr)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return text
    ? text.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('')
    : '';
}

function renderStaticArticle(item, collection, template) {
  const isEnglish = !isChineseBuild;
  const title = isEnglish
    ? item.seo_title_en || item.title_en || item.title
    : item.seo_title || item.title;
  const heading = isEnglish ? item.title_en || item.title : item.title;
  const description = isEnglish
    ? item.seo_description_en || item.summary_en || item.description_en || item.title_en || item.title
    : item.seo_description || item.excerpt || item.title;
  const canonicalUrl = `${siteUrl}${item.url}`;
  const image = safeMediaUrl(item.cover);
  const imageUrl = image ? new URL(image, `${siteUrl}/`).href : '';
  const body = isEnglish ? item.content_en : item.content;
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
  if (item.publish_to === 'both') {
    const englishUrl = `${siteUrl}/articles/${encodeURIComponent(item.slug)}/`;
    const chineseUrl = `${siteUrl}/zh/articles/${encodeURIComponent(item.slug)}/`;
    html = html.replace('</head>', `<link rel="alternate" hreflang="en" href="${englishUrl}"><link rel="alternate" hreflang="zh-CN" href="${chineseUrl}"><link rel="alternate" hreflang="x-default" href="${englishUrl}"></head>`);
  }
  if (imageUrl) html = html.replace('</head>', `<meta property="og:image" content="${escapeHtml(imageUrl)}"></head>`);
  html = html.replace('</head>', `<script type="application/ld+json">${jsonLd}</script></head>`);
  html = html.replace(
    '<main id="articlePage">',
    `<main id="articlePage" data-article-type="${escapeHtml(collection === 'knowledge' ? 'knowledge' : collection === 'news' ? 'articles' : 'solutions')}" data-article-id="${escapeHtml(item.id)}">`
  );
  html = html.replace(/<p class="eyebrow" id="articleCategory">[\s\S]*?<\/p>/, `<p class="eyebrow" id="articleCategory">${escapeHtml(isEnglish ? item.category_en || item.category : item.category)}</p>`);
  html = html.replace(/<h1 id="articleTitle">[\s\S]*?<\/h1>/, `<h1 id="articleTitle">${escapeHtml(heading)}</h1>`);
  html = html.replace(
    /<p class="article-date" id="articleDate">[\s\S]*?<\/p>/,
    `<p class="article-date" id="articleDate">${escapeHtml([isEnglish ? item.category_en || item.category : item.category, item.date].filter(Boolean).join(' · '))}</p>`
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
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<img src="${safeUrl(url)}" alt="${alt}">`);
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

const publicationTargets = new Set(['both', 'domestic', 'international']);
const publicationStatuses = new Set(['published', 'hidden']);

function normalizePublication(item) {
  const publishTo = item.publish_to || 'both';
  const status = typeof item.hidden === 'boolean'
    ? item.hidden ? 'hidden' : 'published'
    : item.status || 'published';
  if (!publicationTargets.has(publishTo)) {
    throw new Error(`Content ${item.id || item.slug || ''} has an invalid publish_to value: ${publishTo}`);
  }
  if (!publicationStatuses.has(status)) {
    throw new Error(`Content ${item.id || item.slug || ''} has an invalid status value: ${status}`);
  }
  return { ...item, publish_to: publishTo, status };
}

function isPublishedForCurrentSite(item) {
  if (item.status !== 'published') return false;
  if (item.publish_to === 'both') return true;
  return isChineseBuild ? item.publish_to === 'domestic' : item.publish_to === 'international';
}

function normalizeProduct(product) {
  return {
    ...normalizePublication(product),
    id: String(product.id),
    title: product.title || product.name || '',
    title_en: product.title_en || product.name_en || product.title || product.name || '',
    image: isChineseBuild && typeof product.image_zh === 'string'
      ? product.image_zh
      : typeof product.image === 'string' ? product.image : product.thumb || '',
    desc: product.desc || product.intro || '',
    desc_en: product.desc_en || product.intro_en || product.desc || product.intro || '',
    intro: product.intro || product.desc || '',
    intro_en: product.intro_en || product.desc_en || product.intro || product.desc || '',
    category_legacy: product.category_legacy || product.category_title || product.category,
    category_legacy_en: product.category_legacy_en || product.category_title_en || product.category,
    materials: Array.isArray(product.materials) ? product.materials : [],
    materials_en: Array.isArray(product.materials_en) ? product.materials_en : product.materials || [],
    crafts: Array.isArray(product.crafts) ? product.crafts : [],
    crafts_en: Array.isArray(product.crafts_en) ? product.crafts_en : product.crafts || [],
    sort_order: Number.isFinite(Number(product.sort_order)) ? Number(product.sort_order) : 10,
    show_in_archive: product.show_in_archive !== false
  };
}

function deduplicateProducts(products) {
  const unique = new Map();
  for (const { file, product } of products) {
    const current = unique.get(product.id);
    if (!current) {
      unique.set(product.id, { file, product });
      continue;
    }

    const currentHasImage = Boolean(current.product.image);
    const candidateHasImage = Boolean(product.image);
    const currentHasCanonicalPath = path.basename(current.file, '.json') === product.id;
    const candidateHasCanonicalPath = path.basename(file, '.json') === product.id;
    if (
      (candidateHasImage && !currentHasImage) ||
      (candidateHasImage === currentHasImage && candidateHasCanonicalPath && !currentHasCanonicalPath)
    ) {
      unique.set(product.id, { file, product });
    }
  }
  return [...unique.values()].map(entry => entry.product);
}

function normalizeTemplate(template) {
  const item = normalizePublication({ ...template, id: String(template.id) });
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
  const gallery = galleryImages.map(image => `<p><img src="${safeUrl(image)}" alt=""></p>`).join('');
  const body = `${renderMarkdown(item.body)}${gallery}`;
  const bodyEn = `${renderMarkdown(item.body_en)}${gallery}`;
  const slug = articleSlug(item);
  if (!slug) throw new Error(`Article ${item.id || item.title || ''} needs a URL slug`);
  return {
    ...normalizePublication(item),
    id: String(item.id),
    slug,
    route: `/articles/${encodeURIComponent(slug)}/`,
    url: `${sitePrefix}/articles/${encodeURIComponent(slug)}/`,
    title: item.title || '',
    title_en: item.title_en || item.title || '',
    category_en: item.category_en || item.tag_en || item.category || item.tag || (isKnowledge ? 'Print Knowledge' : 'News'),
    seo_title: item.seo_title || '',
    seo_title_en: item.seo_title_en || '',
    seo_description: item.seo_description || '',
    seo_description_en: item.seo_description_en || '',
    category: item.category || item.tag || (isKnowledge ? '印前知识' : '品牌动态'),
    date: item.date || '',
    cover: item.cover || item.thumbnail || item.cover_image || '',
    excerpt: item.summary || item.description || '',
    excerpt_en: item.summary_en || item.description_en || item.summary || item.description || '',
    sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 10,
    content: body,
    content_en: bodyEn
  };
}

function buildCatalog(products) {
  const visible = products.filter(product => product.show_in_archive && categoryDefaults[product.category]);
  const catalog = { zh: { categories: [] }, en: { categories: [] } };
  for (const [categoryId, defaults] of Object.entries(categoryDefaults)) {
    const categoryProducts = visible
      .filter(product => product.category === categoryId)
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    const first = categoryProducts[0] || {};
    for (const lang of ['zh', 'en']) {
      const english = lang === 'en';
      catalog[lang].categories.push({
        id: categoryId,
        num: first.category_num || defaults.num,
        title: english ? first.category_title_en || defaults.en : first.category_title || defaults.zh,
        desc: english ? first.category_desc_en || defaults.desc_en : first.category_desc || defaults.desc,
        items: categoryProducts.map(product => ({
          id: product.id,
          name: english ? product.title_en : product.title,
          image: product.image,
          desc: english ? product.desc_en : product.desc,
          materials: english ? product.materials_en : product.materials,
          crafts: english ? product.crafts_en : product.crafts
        }))
      });
    }
  }
  return catalog;
}

function buildTranslations(products, knowledge, news, templates, solutions) {
  const translations = { zh: {}, en: {} };
  const add = (type, items, fields) => {
    for (const lang of ['zh', 'en']) {
      translations[lang][type] ||= {};
      for (const item of items) {
        const values = {};
        for (const [field, source] of Object.entries(fields)) {
          const value = item[lang === 'en' ? source.en : source.zh];
          if (value !== undefined && value !== '') values[field] = value;
        }
        translations[lang][type][item.id] = values;
      }
    }
  };
  add('products', products, {
    name: { zh: 'title', en: 'title_en' }, title: { zh: 'title', en: 'title_en' },
    desc: { zh: 'desc', en: 'desc_en' }, intro: { zh: 'intro', en: 'intro_en' },
    category: { zh: 'category_legacy', en: 'category_legacy_en' },
    materials: { zh: 'materials', en: 'materials_en' }, crafts: { zh: 'crafts', en: 'crafts_en' }
  });
  add('knowledge', knowledge, {
    title: { zh: 'title', en: 'title_en' }, category: { zh: 'category', en: 'category_en' },
    excerpt: { zh: 'excerpt', en: 'excerpt_en' }, content: { zh: 'content', en: 'content_en' }
  });
  add('articles', news, {
    title: { zh: 'title', en: 'title_en' }, category: { zh: 'category', en: 'tag_en' },
    excerpt: { zh: 'excerpt', en: 'excerpt_en' }, content: { zh: 'content', en: 'content_en' }
  });
  add('templates', templates, {
    title: { zh: 'title', en: 'title_en' }, category: { zh: 'category', en: 'type_en' },
    style: { zh: 'style', en: 'style_en' }, size: { zh: 'size', en: 'size_en' },
    tags: { zh: 'tags', en: 'tags_en' }, tone: { zh: 'tone', en: 'tone_en' }
  });
  add('solutions', solutions, {
    title: { zh: 'title', en: 'title_en' }, category: { zh: 'tag', en: 'tag_en' },
    excerpt: { zh: 'summary', en: 'summary_en' }, content: { zh: 'content', en: 'content_en' }
  });
  return translations;
}

function buildSitemap(data) {
  const routes = new Set(['/']);
  const nonIndexablePages = new Set(['admin.html', 'index.html', 'article.html', 'product.html']);
  const excludedPages = new Set(['admin.html']);
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
  for (const product of data.products) routes.add(`/product.html?id=${encodeURIComponent(product.id)}`);
  for (const item of [...data.knowledge, ...data.news, ...data.solutions]) routes.add(item.route);
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

function main() {
  const products = deduplicateProducts(filesIn('products', '.json')
    .map(file => ({
      file,
      product: normalizeProduct(JSON.parse(fs.readFileSync(file, 'utf8')))
    })))
    .filter(isPublishedForCurrentSite)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
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
  const catalogue = filesIn('catalogue', '.json').map(file => normalizePublication(JSON.parse(fs.readFileSync(file, 'utf8')))).filter(item => item && item.id).filter(isPublishedForCurrentSite);
  const requiredCatalogueIds = ['YS-PVC-BANNER', 'YS-PVC-MESH', 'YS-SYNTHETIC-PAPER', 'YS-ADHESIVE-VINYL', 'YS-ROLL-UP', 'YS-X-BANNER', 'YS-DOOR-STAND'];
  const catalogueById = new Map(catalogue.map(item => [String(item.id), item]));
  const missingCatalogueIds = requiredCatalogueIds.filter(id => !catalogueById.has(id));
  if (missingCatalogueIds.length) throw new Error(`Missing core catalogue records: ${missingCatalogueIds.join(', ')}`);
  for (const id of requiredCatalogueIds) {
    const item = catalogueById.get(id);
    for (const lang of ['zh', 'en']) {
      const detail = item[`detail_${lang}`];
      if (!item[`name_${lang}`] || !item[`desc_${lang}`] || !detail || !detail.lead || !detail.artwork || !detail.brief || !detail.caveat) {
        throw new Error(`Core catalogue record ${id} is missing required ${lang} content`);
      }
      for (const field of ['highlights', 'applications', 'finishing', 'delivery']) {
        if (!Array.isArray(detail[field]) || detail[field].length === 0) {
          throw new Error(`Core catalogue record ${id} has no ${lang} ${field}`);
        }
      }
    }
  }
  const templates = filesIn('templates', '.json')
    .map(file => normalizeTemplate(JSON.parse(fs.readFileSync(file, 'utf8'))))
    .filter(isPublishedForCurrentSite);
  const solutions = readMarkdownCollection('solutions').map(item => normalizeArticle(item, 'solutions')).filter(isPublishedForCurrentSite);
  const knowledge = readMarkdownCollection('knowledge').map(item => normalizeArticle(item, 'knowledge')).filter(isPublishedForCurrentSite);
  const news = readMarkdownCollection('news')
    .map(item => normalizeArticle(item, 'news'))
    .filter(isPublishedForCurrentSite)
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const data = {
    products,
    siteSettings,
    catalog: buildCatalog(products),
    catalogue,
    solutions,
    knowledge,
    news,
    templates,
    translations: buildTranslations(products, knowledge, news, templates, solutions)
  };
  writeArticlePages([
    { collection: 'knowledge', items: knowledge },
    { collection: 'news', items: news },
    { collection: 'solutions', items: solutions }
  ]);
  fs.writeFileSync(outputFile, `window.CMS_CONTENT = ${JSON.stringify(data)};\n`, 'utf8');
  buildSitemap(data);
  console.log(`Generated ${path.relative(root, outputFile)} and sitemap.xml (${products.length} products, ${knowledge.length} knowledge articles, ${news.length} news, ${templates.length} templates, ${solutions.length} solutions).`);
}

if (require.main === module) main();

module.exports = { articleSlug, main, parseFrontmatter, renderStaticArticle, renderStaticText, slugify };
