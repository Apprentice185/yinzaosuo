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

  assert.match(english, /<title[^>]*>Large Format Print Media & Printed Graphics – Trade Range \| YINZAOSUO<\/title>/);
  assert.match(english, /meta name="description" content="[^"]*wholesale[^"]*photo paper[^"]*PP synthetic paper[^"]*self-adhesive vinyl[^"]*outdoor PVC printing film/i);
  assert.match(chinese, /<title[^>]*>大幅面喷绘材料批发目录｜印造所<\/title>/);
  assert.match(chinese, /meta name="description" content="[^"]*光面与绸面写真相纸[^"]*PP合成纸[^"]*自粘背胶[^"]*户外PVC喷绘膜/);
  assert.match(i18n, /products_page_title: 'Large Format Print Media & Printed Graphics – Trade Range \| YINZAOSUO'/);
  assert.match(i18n, /products_page_title: '大幅面喷绘材料批发目录'/);
});

test('all five core products have product-specific SEO titles and descriptions in each language tree', () => {
  const ids = [
    'YS-GLOSS-PHOTO-PAPER',
    'YS-SATIN-PHOTO-PAPER',
    'YS-SYNTHETIC-PAPER',
    'YS-ADHESIVE-VINYL',
    'YS-OUTDOOR-PVC-RIGID-FILM'
  ];

  for (const id of ids) {
    const english = JSON.parse(read(`content/en/products/${id}.json`));
    const chinese = JSON.parse(read(`content/zh/products/${id}.json`));
    for (const [item, lang] of [[english, 'en'], [chinese, 'zh']]) {
      for (const field of ['detail_seo_title', 'detail_seo_description']) {
        assert.equal(typeof item[field], 'string', `${id} (${lang}) is missing ${field}`);
        const minimumLength = field === 'detail_seo_title' ? 15 : 35;
        assert.ok(item[field].trim().length > minimumLength, `${id} (${lang}) has weak ${field}`);
        assert.ok(item[field].length < 260, `${id} (${lang}) has an excessively long ${field}`);
      }
    }
    assert.match(english.detail_seo_title, /Wholesale/i, `${id} English title should target trade intent`);
    assert.match(chinese.detail_seo_title, /批发/, `${id} Chinese title should target wholesale intent`);
  }
});

test('adhesive vinyl claims stay within confirmed product specifications', () => {
  const english = JSON.parse(read('content/en/products/YS-ADHESIVE-VINYL.json'));
  const chinese = JSON.parse(read('content/zh/products/YS-ADHESIVE-VINYL.json'));

  for (const item of [english, chinese]) {
    const text = JSON.stringify(item);
    assert.doesNotMatch(text, /white or black adhesive|白胶或黑胶|白胶|黑胶/i);
  }

  assert.match(chinese.detail_desc, /120gsm或140gsm底纸/);
  assert.match(english.detail_desc, /120 gsm or 140 gsm release liner/i);
  assert.match(english.detail_seo_description, /120 gsm or 140 gsm release liner/i);
  assert.match(english.desc, /120 gsm or 140 gsm release liner/i);
  assert.ok(english.materials.every(value => !/[\u3400-\u9fff]/.test(value)));
});

test('knowledge guides do not publish unconfirmed adhesive-colour options', () => {
  const guideEn = read('content/en/knowledge/k2026111001.md');
  const guideZh = read('content/zh/knowledge/k2026111001.md');
  const linerEn = read('content/en/knowledge/k2026111003.md');
  const linerZh = read('content/zh/knowledge/k2026111003.md');

  for (const content of [guideEn, guideZh, linerEn, linerZh]) {
    assert.doesNotMatch(content, /white[- ]glue|black[- ]glue|white adhesive|black adhesive|白胶|黑胶/i);
  }

  assert.match(guideEn, /have not been confirmed/i);
  assert.match(guideZh, /尚未确认/);
  assert.match(linerEn, /have not yet been confirmed/i);
  assert.match(linerZh, /目前尚未确认/);
});

test('knowledge guides target real print-media buying questions in both language trees', () => {
  const ids = [
    'k2026111001.md',
    'k2026111002.md',
    'k2026111003.md'
  ];

  for (const file of ids) {
    for (const lang of ['en', 'zh']) {
      const source = read(`content/${lang}/knowledge/${file}`);
      assert.match(source, /title: ".+"/, `${file} (${lang}) needs a title`);
      assert.match(source, /seo_title: ".+"/, `${file} (${lang}) needs an SEO title`);
      assert.match(source, /seo_description: ".+"/, `${file} (${lang}) needs an SEO description`);
      assert.doesNotMatch(source, /publish_to/, `${file} (${lang}) must not carry publish_to after the split`);
      assert.match(source, /\]\(\.\/products\//, `${file} (${lang}) should link into the product range`);
    }
  }
});

test('robots.txt advertises both language-specific sitemaps', () => {
  const robots = read('robots.txt');
  assert.match(robots, /Sitemap: https:\/\/yinzaosuo\.com\/sitemap\.xml/);
  assert.match(robots, /Sitemap: https:\/\/yinzaosuo\.com\/zh\/sitemap\.xml/);
});
