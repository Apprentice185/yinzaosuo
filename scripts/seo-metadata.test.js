const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('English and Chinese homepages target the current wholesale print-media range', () => {
  const english = read('index.html');
  const chinese = read('zh/index.html');
  const i18n = read('assets/js/i18n.js');

  assert.match(english, /<title[^>]*>Wholesale Large Format Print Media \| YINZAOSUO<\/title>/);
  assert.match(english, /meta name="description" content="[^"]*gloss and satin photo paper[^"]*PP synthetic paper[^"]*self-adhesive vinyl[^"]*outdoor PVC printing film/i);
  assert.match(chinese, /<title[^>]*>写真相纸与喷绘材料批发｜印造所<\/title>/);
  assert.match(chinese, /meta name="description" content="[^"]*光面与绸面写真相纸[^"]*PP合成纸[^"]*自粘背胶[^"]*户外PVC喷绘膜/);
  assert.match(i18n, /meta_home_title: 'Wholesale Large Format Print Media \| YINZAOSUO'/);
  assert.match(i18n, /meta_home_title: '写真相纸与喷绘材料批发｜印造所'/);
});

test('English and Chinese product-directory metadata describes the core media products', () => {
  const english = read('products.html');
  const chinese = read('zh/products.html');
  const i18n = read('assets/js/i18n.js');

  assert.match(english, /<title[^>]*>Wholesale Large Format Print Media \| YINZAOSUO<\/title>/);
  assert.match(english, /meta name="description" content="[^"]*wholesale[^"]*photo paper[^"]*PP synthetic paper[^"]*self-adhesive vinyl[^"]*outdoor PVC printing film/i);
  assert.match(chinese, /<title[^>]*>大幅面喷绘材料批发目录｜印造所<\/title>/);
  assert.match(chinese, /meta name="description" content="[^"]*光面与绸面写真相纸[^"]*PP合成纸[^"]*自粘背胶[^"]*户外PVC喷绘膜/);
  assert.match(i18n, /products_page_title: 'Wholesale Large Format Print Media'/);
  assert.match(i18n, /products_page_title: '大幅面喷绘材料批发目录'/);
});

test('all five core catalogue products have bilingual, product-specific SEO titles and descriptions', () => {
  const ids = [
    'YS-GLOSS-PHOTO-PAPER',
    'YS-SATIN-PHOTO-PAPER',
    'YS-SYNTHETIC-PAPER',
    'YS-ADHESIVE-VINYL',
    'YS-OUTDOOR-PVC-RIGID-FILM'
  ];

  for (const id of ids) {
    const item = JSON.parse(read(`content/catalogue/${id}.json`));
    for (const field of ['seo_title_zh', 'seo_title_en', 'seo_description_zh', 'seo_description_en']) {
      assert.equal(typeof item[field], 'string', `${id} is missing ${field}`);
      assert.ok(item[field].trim().length > 35, `${id} has weak ${field}`);
      assert.ok(item[field].length < 260, `${id} has an excessively long ${field}`);
    }
    assert.match(item.seo_title_en, /Wholesale/i, `${id} English title should target trade intent`);
    assert.match(item.seo_title_zh, /批发/, `${id} Chinese title should target wholesale intent`);
  }
});

test('robots.txt advertises both language-specific sitemaps', () => {
  const robots = read('robots.txt');
  assert.match(robots, /Sitemap: https:\/\/yinzaosuo\.com\/sitemap\.xml/);
  assert.match(robots, /Sitemap: https:\/\/yinzaosuo\.com\/zh\/sitemap\.xml/);
});
