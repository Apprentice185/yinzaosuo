# 翻译服务说明

网站后台当前使用 MyMemory 的免密翻译接口，不依赖 Cloudflare Worker、API Key、Turnstile 或任何密钥。每次点击翻译会直接从浏览器请求 `https://api.mymemory.translated.net/get`。

MyMemory 文档说明匿名免费额度为每天 5,000 个字符，每段请求最多 500 字节；前端会将长文本拆成小段并限制并发。免费额度和可用性以服务商为准，达到额度或服务不可用时，后台会显示错误。

**隐私提示：** 后台中待翻译的文字会发送给 MyMemory。不要使用该功能翻译密码、个人信息或不应交给第三方处理的机密内容。详情见 [API 规范](https://mymemory.translated.net/doc/spec.php)、[使用额度](https://mymemory.translated.net/doc/usagelimits.php)和[服务条款](https://mymemory.translated.net/terms-and-conditions)。

`src/index.js` 是旧版 Cloudflare Worker 实现，仅保留作历史参考；当前网站不调用它，也不需要为网站翻译配置或部署它。
