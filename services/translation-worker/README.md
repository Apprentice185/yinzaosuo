# 印造所翻译服务（Cloudflare Worker）

该服务为静态 GitHub Pages 后台提供安全的服务端翻译代理。浏览器只访问 Worker，不接触 SiliconFlow API Key。

## 使用的模型

- Provider：SiliconFlow
- Model：`tencent/Hunyuan-MT-7B`
- API：`https://api.siliconflow.cn/v1/chat/completions`

模型当前在 SiliconFlow 官方价格页标注为免费；免费模型仍可能有速率、并发或平台政策限制，价格与可用性以服务商实时页面为准。

## 你需要在 Cloudflare 完成的首次设置

这部分必须由有 Cloudflare 账号权限的人操作。我无法代替你登录 Cloudflare、创建账号资源或查看你的 API Key。**不要把任何 Secret 发到聊天或写进 GitHub 文件。**

### A. 创建 Turnstile

1. 打开 [Cloudflare Turnstile 控制台](https://dash.cloudflare.com/?to=/:account/turnstile) 并登录。
2. 点击 **Add widget**。
3. 名称填写 `印造所后台翻译`。
4. 域名只添加 `yinzaosuo.com`。
5. Widget Mode 选择 Managed，保存。
6. 页面会显示 **Site Key** 和 **Secret Key**：
   - Site Key 是公开值，后续需要提供给我写入后台配置。
   - Secret Key 是私密值，只放进 Worker Secret，不能发给我。

### B. 创建并连接 Worker

1. 打开 [Cloudflare Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)。
2. 选择 **Create application** → **Workers** → **Import a repository**（如果界面先要求连接 GitHub，按提示授权）。
3. 选择仓库 `Apprentice185/yinzaosuo`。
4. Root directory / Path 设置为 `services/translation-worker`。
5. Worker 名称使用 `yinzaosuo-translation`。
6. 如果界面要求 Build command，留空；Deploy command 填 `npx wrangler deploy`。
7. 完成首次部署。Worker 的代码来自仓库该目录，后续更新可由 GitHub 自动部署。

如果你的 Cloudflare 账户界面没有 Import a repository，可以选择 **Create Worker → Hello World**，先创建名为 `yinzaosuo-translation` 的 Worker；之后在 Worker 的 Settings / Build 页连接仓库，Root directory 仍为 `services/translation-worker`。

### C. 设置服务端密钥（只在 Cloudflare）

1. 打开刚创建的 Worker → **Settings** → **Variables and Secrets**。
2. 点击 **Add**，类型选择 **Secret**。
3. 新增以下两项，分别粘贴对应值：
   - Variable name：`SILICONFLOW_API_KEY`；Value：从 [SiliconFlow API Keys](https://cloud.siliconflow.cn/account/ak) 创建并复制的 API Key。
   - Variable name：`TURNSTILE_SECRET`；Value：刚才 Turnstile 创建时显示的 Secret Key。
4. 保存并点击 **Deploy**，让密钥绑定到运行版本。

SiliconFlow 账号/API Key 需要你本人创建和管理；免费模型不代表平台永远保证免费或无限调用。

### D. 把两个公开配置值发给我

完成 A、B 后，只需把以下两项发在当前对话：
- Worker URL（形如 `https://yinzaosuo-translation.<你的账户子域>.workers.dev`）
- Turnstile Site Key（公开值）

**不要发送** SiliconFlow API Key、Turnstile Secret Key、Cloudflare Global API Key 或其他密码。

收到这两个公开值后，我可以继续把后台翻译按钮接入，并完成浏览器端联调。当前 Worker 只开放 `POST /translate`，限制来源、Turnstile 校验、请求体 20 KB、单条文本 6000 字符，并固定上游模型和地址。

## 本地部署（可选）

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

`POST /translate`

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
- 通过流式读取限制整个请求体大小，不能只依赖可能缺失的 Content-Length。
- 限制单次文本长度。
- 固定模型和上游 API 地址，不允许客户端指定任意 URL 或模型。
- 不记录原文、译文或密钥。
- 正式上线仍建议结合 Cloudflare Rate Limiting 规则限制单 IP 请求频率。

注意：CORS 不是身份验证；Turnstile 也不能替代速率限制。