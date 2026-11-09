const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { articleSlug, renderStaticArticle, renderStaticText, slugify } = require('./generate-content');

const articleTemplate = fs.readFileSync(path.join(__dirname, '..', 'article.html'), 'utf8');

test('article slugs prefer an explicit path and fall back to the English title', () => {
  assert.equal(slugify('  Paper & Print: A Guide  '), 'paper-print-a-guide');
  assert.equal(articleSlug({ id: 'K1234567890', slug: 'K1234567890', title: '印刷指南', title_en: 'A Print Guide' }), 'a-print-guide');
  assert.equal(articleSlug({ id: 'K1', slug: 'custom-print-guide', title: '印刷指南' }), 'custom-print-guide');
});

test('static text rendering removes markup and escapes article text', () => {
  const html = renderStaticText('<h2>Safe &amp; useful</h2><p>First line</p><script>window.pwned=1</script><img src=x onerror=alert(1)>');
  assert.equal(html, '<p>Safe &amp; useful</p><p>First line</p>');
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
