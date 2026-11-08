# 印造所翻译服务（Cloudflare Worker）

该服务为静态 GitHub Pages 后台提供安全的服务端翻译代理。浏览器只访问 Worker，不接触 SiliconFlow API Key。

## 使用的模型

- Provider：SiliconFlow
- Model：`tencent/Hunyuan-MT-7B`
- API：`https://api.siliconflow.cn/v1/chat/completions`

模型当前在 SiliconFlow 官方价格页标注为免费；免费模型仍可能有速率、并发或平台政策限制，价格与可用性以服务商实时页面为准。

## 部署前准备

1. 创建 Cloudflare Turnstile widget，域名限制为 `yinzaosuo.com`。
2. 在 Cloudflare Workers 中创建 Worker，或在本目录使用 Wrangler 部署。
3. 在 Worker Secrets 中设置：
   - `SILICONFLOW_API_KEY`：SiliconFlow API Key。
   - `TURNSTILE_SECRET`：Turnstile Secret Key。
4. 将 Turnstile Site Key 配置给后台页面（Site Key 可公开；Secret Key 只能留在 Worker）。
5. 绑定自定义 Worker 域名或使用 workers.dev 地址，并在后台配置对应接口地址。

不要把任何 Secret 写进 Git、CMS 配置、前端 JavaScript 或聊天消息。

## 本地部署

需要 Node.js 20+ 和 Wrangler：

```sh
npm install --global wrangler
wrangler login
cd services/translation-worker
wrangler deploy
```

设置密钥：

```sh
wrangler secret put SILICONFLOW_API_KEY
wrangler secret put TURNSTILE_SECRET
```

## 接口

`POST /translate`（当前 Worker 接收所有路径的 POST；上线后可按需收紧路由）

请求头：
- `Content-Type: application/json`
- `X-Turnstile-Token: <Turnstile response token>`
- `Origin: https://yinzaosuo.com`

请求体：

```json
{
  "text": "需要翻译的中文内容",
  "sourceLanguage": "Chinese",
  "targetLanguage": "English"
}
```

成功响应：

```json
{
  "translatedText": "Translated content",
  "model": "tencent/Hunyuan-MT-7B"
}
```

## 安全措施

- 只允许正式域名 Origin。
- 要求 Turnstile 服务端验证，避免把公开接口变成无门槛代理。
- API Key 和 Turnstile Secret 仅从 Worker Secret 读取。
- 限制请求体大小和单次文本长度。
- 固定模型和上游 API 地址，不允许客户端指定任意 URL 或模型。
- 不记录原文、译文或密钥。

注意：CORS 不是身份验证。Turnstile 能降低自动化滥用风险，但正式上线仍建议结合 Cloudflare Rate Limiting 规则限制单 IP 请求频率。
