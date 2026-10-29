const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const contentRoot = path.join(root, 'content');
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
      while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) block.push(lines[++index].replace(/^\s{2}/, ''));
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
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeUrl(url) {
  const value = url.trim();
  return /^(https?:|\/|\.\/|\.\.\/|#)/i.test(value) ? value : '';
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

function normalizeProduct(product) {
  return {
    ...product,
    id: String(product.id),
    title: product.title || product.name || '',
    title_en: product.title_en || product.name_en || product.title || product.name || '',
    image: product.image || product.thumb || '',
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

function normalizeTemplate(template) {
  const item = { ...template, id: String(template.id) };
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
  return {
    ...item,
    id: String(item.id),
    title: item.title || '',
    title_en: item.title_en || item.title || '',
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
  const visible = products.filter(product => (product.show_in_archive || product.image) && categoryDefaults[product.category]);
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
  const nonIndexablePages = new Set(['index.html', 'article.html', 'product.html']);
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
      queue.push(path.relative(root, resolved));
    }
  }
  for (const product of data.products) routes.add(`/product.html?id=${encodeURIComponent(product.id)}`);
  for (const item of data.knowledge) routes.add(`/article.html?type=knowledge&id=${encodeURIComponent(item.id)}`);
  for (const item of data.news) routes.add(`/article.html?type=articles&id=${encodeURIComponent(item.id)}`);
  for (const item of data.solutions) routes.add(`/article.html?type=solutions&id=${encodeURIComponent(item.id)}`);
  const urls = [...routes].sort().map(route => `  <url><loc>${escapeHtml(`${siteUrl}${route}`)}</loc></url>`);
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}

function main() {
  const products = filesIn('products', '.json')
    .map(file => normalizeProduct(JSON.parse(fs.readFileSync(file, 'utf8'))))
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const templates = filesIn('templates', '.json')
    .map(file => normalizeTemplate(JSON.parse(fs.readFileSync(file, 'utf8'))));
  const solutions = readMarkdownCollection('solutions').map(item => normalizeArticle(item, 'solutions'));
  const knowledge = readMarkdownCollection('knowledge').map(item => normalizeArticle(item, 'knowledge'));
  const news = readMarkdownCollection('news')
    .map(item => normalizeArticle(item, 'news'))
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const data = {
    products,
    catalog: buildCatalog(products),
    solutions,
    knowledge,
    news,
    templates,
    translations: buildTranslations(products, knowledge, news, templates, solutions)
  };
  fs.writeFileSync(outputFile, `window.CMS_CONTENT = ${JSON.stringify(data)};\n`, 'utf8');
  buildSitemap(data);
  console.log(`Generated ${path.relative(root, outputFile)} and sitemap.xml (${products.length} products, ${knowledge.length} knowledge articles, ${news.length} news, ${templates.length} templates, ${solutions.length} solutions).`);
}

main();
