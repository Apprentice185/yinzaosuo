const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { articleSlug, parseFrontmatter, renderStaticArticle, renderStaticText, slugify } = require('./generate-content');

const articleTemplate = fs.readFileSync(path.join(__dirname, '..', 'article.html'), 'utf8');
const productTemplate = fs.readFileSync(path.join(__dirname, '..', 'product.html'), 'utf8');

test('article slugs prefer an explicit path and fall back to the English title', () => {
  assert.equal(slugify('  Paper & Print: A Guide  '), 'paper-print-a-guide');
  assert.equal(articleSlug({ id: 'K1234567890', slug: 'K1234567890', title: '印刷指南', title_en: 'A Print Guide' }), 'a-print-guide');
  assert.equal(articleSlug({ id: 'K1', slug: 'custom-print-guide', title: '印刷指南' }), 'custom-print-guide');
});

test('static text rendering removes markup and escapes article text', () => {
  const html = renderStaticText('<h2>Safe &amp; useful</h2><p>First line</p><script>window.pwned=1</script><img src=x onerror=alert(1)>');
  assert.equal(html, '<p>Safe &amp; useful</p><p>First line</p>');
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
    publish_to: 'both',
    title: '印刷指南',
    title_en: 'A practical print guide',
    seo_title_en: 'Custom SEO title',
    seo_description_en: 'A useful guide for print buyers.',
    category: '工艺解析',
    category_en: 'Print knowledge',
    date: '2026-03-09',
    content: '<p>中文正文</p>',
    content_en: '<h2>Safe &amp; useful</h2><script>window.pwned=1</script><p>Print article.</p>'
  }, 'knowledge', articleTemplate);

  assert.match(html, /<title>Custom SEO title \| YINZAOSUO<\/title>/);
  assert.match(html, /<meta name="description" content="A useful guide for print buyers\.">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/yinzaosuo\.com\/articles\/safe-print-guide\/">/);
  assert.match(html, /<h1 id="articleTitle">A practical print guide<\/h1>/);
  assert.match(html, /<p>Safe &amp; useful<\/p><p>Print article\.<\/p>/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"datePublished":"2026-03-09"/);
  assert.match(html, /hreflang="zh-CN"/);
  assert.doesNotMatch(html, /<script>window\.pwned=1<\/script>/);
  assert.doesNotMatch(html, /article\.html\?type=/);
});


test('static product output includes unique SEO metadata, canonical URL and readable product details', () => {
  const { renderStaticProduct } = require('./generate-content');
  const html = renderStaticProduct({
    id: 'YS-GLOSS-PHOTO-PAPER',
    title: '光面写真相纸',
    title_en: 'Gloss Photo Paper',
    desc: '光面写真相纸规格。',
    desc_en: 'Gloss photo paper for posters.',
    price: 'USD 18.60/m²',
    publish_to: 'both'
  }, {
    id: 'YS-GLOSS-PHOTO-PAPER',
    name_zh: '光面写真相纸',
    name_en: 'Gloss Photo Paper',
    seo_title_en: 'Gloss Photo Paper Wholesale',
    seo_description_en: '1520 mm wide, 200 gsm, 50 m rolls.',
    desc_en: 'Gloss photo paper for posters and displays.',
    image: '/pic/gloss-photo-paper.jpg',
    publish_to: 'both',
    detail_en: {
      lead: 'For posters and retail displays.',
      highlights: ['1520 mm width', '200 gsm', '50 m per roll'],
      applications: ['Posters'],
      finishing: ['Gloss or matte lamination'],
      delivery: ['Rigid paper tube roll packing'],
      artwork: 'Supply print-ready files.',
      brief: 'Share dimensions and quantity.',
      caveat: 'Confirm freight by destination.'
    }
  }, productTemplate);

  assert.match(html, /<title>Gloss Photo Paper Wholesale \\| YINZAOSUO<\\/title>/);
  assert.match(html, /<meta name="description" content="1520 mm wide, 200 gsm, 50 m rolls\\.">/);
  assert.match(html, /<link rel="canonical" href="https:\\/\\/yinzaosuo\\.com\\/products\\/ys-gloss-photo-paper\\/">/);
  assert.match(html, /<h1 id="productName">Gloss Photo Paper<\\/h1>/);
  assert.match(html, /1520 mm width/);
  assert.match(html, /"@type":"Product"/);
  assert.match(html, /hreflang="zh-CN"/);
});
