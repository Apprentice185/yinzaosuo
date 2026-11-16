const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { articleSlug, normalizeMaterial, parseFrontmatter, renderDeliveryPage, renderMaterialDetailPage, renderMaterialsListPage, renderStaticArticle, renderStaticText, slugify } = require('./generate-content');

const articleTemplate = fs.readFileSync(path.join(__dirname, '..', 'article.html'), 'utf8');
const productTemplate = fs.readFileSync(path.join(__dirname, '..', 'product.html'), 'utf8');
const xianShell = fs.readFileSync(path.join(__dirname, '..', 'zh', 'xian.html'), 'utf8');

test('article slugs prefer an explicit path and fall back to the title', () => {
  assert.equal(slugify('  Paper & Print: A Guide  '), 'paper-print-a-guide');
  assert.equal(articleSlug({ id: 'K1234567890', slug: 'K1234567890', title: 'A Print Guide' }), 'a-print-guide');
  assert.equal(articleSlug({ id: 'K1', slug: 'custom-print-guide', title: '印刷指南' }), 'custom-print-guide');
});

test('static text rendering removes markup and escapes article text', () => {
  const html = renderStaticText('<h2>Safe &amp; useful</h2><p>First line</p><script>window.pwned=1</script><img src=x onerror=alert(1)>');
  assert.equal(html, '<h2>Safe &amp; useful</h2><p>First line</p>');
});

test('static article rendering preserves semantic lists and safe internal links', () => {
  const html = renderStaticText('<h2>Media guide</h2><p>Read the <a href="./products/ys-gloss-photo-paper/" onclick="alert(1)">photo paper details</a>.</p><ul><li>Roll width</li><li>Roll length</li></ul>');
  assert.equal(html, '<h2>Media guide</h2><p>Read the <a href="./products/ys-gloss-photo-paper/" rel="noopener noreferrer">photo paper details</a>.</p><ul><li>Roll width</li><li>Roll length</li></ul>');
});

test('static article rendering strips unsafe links and active content', () => {
  const html = renderStaticText('<p onclick="alert(1)">Safe <a href="javascript:alert(1)">text</a></p><script>alert(1)</script>');
  assert.equal(html, '<p>Safe text</p>');
});

test('frontmatter block scalars preserve blank lines between paragraphs', () => {
  const parsed = parseFrontmatter('---\ntitle: "Example"\nbody_en: |\n  First paragraph\n\n  Second paragraph\n---\nChinese body');
  assert.equal(parsed.fields.body_en, 'First paragraph\n\nSecond paragraph');
  assert.equal(parsed.body, 'Chinese body');
});

test('static article output includes unique SEO metadata and safe structured data', () => {
  const html = renderStaticArticle({
    id: 'K1',
    slug: 'safe-print-guide',
    url: '/articles/safe-print-guide/',
    hasCounterpart: true,
    title: 'A practical print guide',
    seo_title: 'Custom SEO title',
    seo_description: 'A useful guide for print buyers.',
    category: 'Print knowledge',
    date: '2026-03-09',
    cover: '/assets/images/content/guide-cover.jpg',
    content: '<h2>Safe &amp; useful</h2><script>window.pwned=1</script><p>Print article.</p><ul><li>First item</li><li>Second item</li></ul>'
  }, 'knowledge', articleTemplate);

  assert.match(html, /<title>Custom SEO title \| YINZAOSUO<\/title>/);
  assert.match(html, /<meta name="description" content="A useful guide for print buyers\.">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/yinzaosuo\.com\/articles\/safe-print-guide\/">/);
  assert.match(html, /<h1 id="articleTitle">A practical print guide<\/h1>/);
  assert.match(html, /<h2>Safe &amp; useful<\/h2>\s*<p>Print article\.<\/p><ul><li>First item<\/li><li>Second item<\/li><\/ul>/);
  assert.match(html, /property="og:image:alt" content="Custom SEO title"/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"datePublished":"2026-03-09"/);
  assert.match(html, /hreflang="zh-CN"/);
  assert.doesNotMatch(html, /<script>window\.pwned=1<\/script>/);
  assert.doesNotMatch(html, /article\.html\?type=/);
});


test('materials normalization maps gallery entries and drops unusable images', () => {
  const item = normalizeMaterial({
    id: 'SCENE-01',
    title: '门店橱窗画面',
    gallery: [{ image: 'assets/images/materials/a.jpg' }, { image: 'javascript:alert(1)' }, 'assets/images/materials/b.jpg', {}],
    description: '橱窗展示画面。',
    sort_order: '3'
  });
  assert.equal(item.id, 'SCENE-01');
  assert.deepEqual(item.gallery, ['assets/images/materials/a.jpg', 'assets/images/materials/b.jpg']);
  assert.equal(item.sort_order, 3);
  assert.equal(item.hidden, false);
  assert.equal(normalizeMaterial({ id: 'X', hidden: true }).status, 'hidden');
});

test('delivery page renders the delivery.json timetable verbatim with its own canonical', () => {
  const html = renderDeliveryPage({
    title: '西安广告材料制作，专车整板送到门。',
    intro: 'KT板等广告材料在西安本地制作交付。',
    timetable_heading: '西安配送时效：按确认下单时间算',
    timetable_note: '时效以双方确认下单、开始制作为准。',
    timetable: [
      { label: '上午确认', condition: '11:00 前确认下单', body: '当天下午送达。' },
      { label: '晚间确认', condition: '19:00 后确认下单', body: '次日下午送达。' }
    ],
    coverage: '西安三环以内保证送达。',
    regions_note: '江浙沪皖由浙江嘉兴海盐合作工厂发货。',
    van_heading: '为什么用专车整板送',
    van_ours: { title: '整板不裁切，送货上门', body: '自有封闭式大面包车专送。' },
    van_compare: { title: '快递与自提的麻烦', body: '网购板材走快递，常常被裁成小块发货。' },
    steps: [{ title: '发需求与文件', body: '发来品类、尺寸、数量和设计文件。' }],
    faq: [{ question: '能开发票吗？', answer: '可以代开，确认订单时说明即可。' }],
    contact_phone: '134 0296 9091'
  }, xianShell);
  assert.ok(html.includes('<link rel="canonical" href="https://yinzaosuo.com/zh/delivery.html">'));
  assert.ok(html.includes('11:00 前确认下单'));
  assert.ok(html.includes('次日下午送达。'));
  assert.ok(html.includes('西安三环以内保证送达。'));
  assert.ok(html.includes('href="tel:+8613402969091"'));
  assert.doesNotMatch(html, /zh\/xian\.html/);
});

test('materials pages render an honest empty state and a detail page with gallery + quote hook', () => {
  const list = renderMaterialsListPage([], xianShell);
  assert.ok(list.includes('素材持续更新中，敬请期待。'));
  assert.ok(list.includes('<link rel="canonical" href="https://yinzaosuo.com/zh/materials.html">'));
  const detail = renderMaterialDetailPage(normalizeMaterial({
    id: 'SCENE-01',
    title: '门店橱窗画面',
    gallery: [{ image: 'assets/images/materials/a.jpg' }, { image: 'assets/images/materials/b.jpg' }],
    description: '橱窗展示画面。'
  }), xianShell);
  assert.ok(detail.includes('data-material-title="门店橱窗画面"'));
  assert.ok(detail.includes('assets/js/material-detail.js'));
  assert.ok(detail.includes('<link rel="canonical" href="https://yinzaosuo.com/zh/materials/scene-01/">'));
});

test('static product output includes SEO metadata, canonical URL and readable product details', () => {
  const { renderStaticProduct } = require('./generate-content');
  const html = renderStaticProduct({
    id: 'YS-GLOSS-PHOTO-PAPER',
    title: 'Gloss Photo Paper',
    name: 'Gloss Photo Paper',
    desc: 'Gloss photo paper for posters.',
    detail_seo_title: 'Gloss Photo Paper Wholesale',
    detail_seo_description: '1520 mm wide, 200 gsm, 50 m rolls.',
    detail_desc: 'Gloss photo paper for posters and displays.',
    detail_image: '/pic/gloss-photo-paper.jpg',
    price: 'USD 18.60/m²',
    hasCounterpart: true,
    detail: {
      lead: 'For posters and retail displays.',
      highlights: ['1520 mm width', '200 gsm', '50 m per roll'],
      applications: ['Posters'],
      finishing: ['Gloss or matte lamination'],
      delivery: ['Rigid paper tube roll packing'],
      artwork: 'Supply print-ready files.',
      brief: 'Share dimensions and quantity.',
      caveat: 'Confirm freight by destination.'
    }
  }, productTemplate, []);

  assert.ok(html.includes('<title>Gloss Photo Paper Wholesale | YINZAOSUO</title>'));
  assert.ok(html.includes('<meta name="description" content="1520 mm wide, 200 gsm, 50 m rolls.">'));
  assert.ok(html.includes('<link rel="canonical" href="https://yinzaosuo.com/products/ys-gloss-photo-paper/">'));
  assert.ok(html.includes('<h1 id="productName">Gloss Photo Paper</h1>'));
  assert.ok(html.includes('1520 mm width'));
  assert.doesNotMatch(html, /"@type":"Product"/);
  assert.doesNotMatch(html, /id="productStructuredData"/);
  assert.ok(html.includes('hreflang="zh-CN"'));
});
