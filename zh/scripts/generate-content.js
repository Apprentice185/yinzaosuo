// Chinese build: reads content/zh only and writes into zh/.
// The language split is explicit (CMS_LANG), replacing the old
// CMS_SITE_ROOT bilingual-dataset switch.
process.env.CMS_LANG = 'zh';
require('../../scripts/generate-content.js').main();
