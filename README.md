# 印造所官网

这是一个无构建依赖的静态官网，双击 `index.html` 即可预览。

## GitHub Pages

仓库地址：https://github.com/Apprentice185/yinzaosuo

官网地址：https://yinzaosuo.com/

自定义域名在 GitHub Pages 中通过仓库根目录的 `CNAME` 文件配置。域名 DNS 需要指向 GitHub Pages，且首次生效可能需要等待 DNS 与 HTTPS 证书配置完成。

仓库中的 GitHub Actions 会在 `main` 分支有新提交时自动部署网站。第一次使用时，请在仓库 `Settings -> Pages` 中将 Source 设置为 `GitHub Actions`。

## 本地自动同步

当前目录是 `C:\BaiduSyncdisk\yinzaosuo`。在 VS Code 中打开这个目录后运行任务 `自动同步到 GitHub`，脚本会监听本地文件变化，等待短暂防抖后自动执行 `git add`、`git commit` 和 `git push`。

自动推送需要本机 Git 已经具备 GitHub 写入权限。若 GitHub 提示登录或权限不足，请先在终端完成 GitHub 身份验证。

## 后期维护

- 商品、分类和起售价集中在 `site-data.js` 的产品数据中。
- 模板、知识库和品牌资讯集中在 `site-data.js`，新增内容时复制同样的数据结构即可。
- `templates.html` 是模板素材库，支持分类筛选、关键词搜索和详情弹窗。
- `knowledge.html` 与 `journal.html` 是完整内容子页面，支持分类筛选和全文弹窗。
- `article.html` 是知识文章与品牌资讯的独立详情页。
- `admin.html` 是内容维护后台：模板可以新增风格分组，并把图片直接拖进缩略图、设计图、尺寸图、实景图四个上传框；知识和资讯不在界面显示编号，只维护标题、分类、摘要、文章封面和正文。
- 文章编辑器支持正文、小标题、字号、加粗、对齐、插图、图片大小与对齐、视频外链。
- 后台左侧可以新增、重命名、删除模板品类、模板风格、知识分类和资讯分类；也可以删除模板、知识文章和资讯文章。删除分类不会删除内容，关联内容会自动变为“未分类”。
- 后台“产品中心”可以维护产品编号、产品品类、名称、缩略图、场景图、产品介绍、价格和规格；规格名称与选项值可以自由新增和删除。
- 首页产品卡片点击后打开场景弹窗，点击“详细了解该产品”进入 [product.html](product.html)；详情页选择规格后点击“带着选项去咨询”，会把选择内容带回报价表单。
- 后台“保存到本浏览器”只更新当前浏览器的 `localStorage`；它不是线上发布，其他设备和访客看不到这些编辑。
- 修改首页文案、文章和页脚内容直接编辑 `index.html`。
- 视觉变量与响应式样式集中在 `styles.css`。

## 全站中英文切换

- 所有公开页面共用页眉右侧的 CN / EN 开关；当前语言保存在 `localStorage.site_lang`，页面跳转后仍然生效。后台不显示语言开关。
- 静态页面文案统一维护在 `assets/js/i18n.js` 的 `window.I18N.zh` 与 `window.I18N.en` 字典中。HTML 使用 `data-i18n`、`data-i18n-placeholder` 等属性绑定翻译键；不要在页面脚本里另写一份英文文案。
- 知识、资讯、模板和产品详情的英文内容也集中在 `i18n.js` 的 `I18N.en.content`，并按 `site-data.js` 中的稳定 ID 对应。新增内容时，在对应类型下补充同 ID 的英文 `title`、`category`、`excerpt` 和 `content` 等字段；缺失翻译会显示“英文翻译待补充”，不会将中文正文伪装成英文。
- 当前长文章英文稿是便于浏览的摘要/改写，并非逐句完整翻译；其中一篇原始记录没有正文，英文页会明确提示英文稿待补充。需要完整译文时，请直接更新 `I18N.en.content` 中对应文章 ID 的 `content`。

## 产品图片替换

- 首页产品档案卡片使用 `assets/js/products-data.js` 每条产品记录的 `image` 字段；每条记录有稳定 ID（`PA001`–`PA012`），中文 `zh` 和英文 `en` 记录的 ID 一一对应。
- 已移除无法确认与实际产品匹配的示例图库链接。图片缺省时页面显示“产品图片待补充”，不会用不相关的照片冒充产品图。
- 将真实产品图放入仓库 `assets/images/products/`，例如 `assets/images/products/PA001.webp`。随后在 `products-data.js` 中找到 `id: "PA001"`，分别把 `zh` 和 `en` 记录的 `image: ""` 改为 `image: "assets/images/products/PA001.webp"`。请先核对图片与实物，勿覆盖或删除已有图片。
- 产品详情页使用 `site-data.js` 的 `thumb`、`sceneImage` 字段；新增产品时使用仓库相对路径，例如 `assets/images/products/P009-thumb.webp`。图片上传后台仅暂存为浏览器内数据，正式发布前应改成仓库内的图片路径。

## 在线询价表单配置

- 官网继续使用 GitHub Pages 静态托管，询价表单通过 Formspree 转发，无需自建服务器。
- Formspree endpoint 已配置在 `index.html` 的 `quoteForm` `action`。在 Formspree 后台确认该表单已启用，并将收件邮箱验证为你的目标邮箱；发布后提交测试询价，确认表单记录和邮件通知均正常。
- 发布后用线上 HTTPS 页面提交测试。未配置时页面会明确提示尚未启用，并展示微信二维码与邮箱；提交失败时会保留已填写内容并提示备用联系方式。
- Formspree 会接收客户提交的姓名、联系方式和项目需求。正式启用前请检查服务商的隐私条款，并在需要时补充适用的隐私告知。

## 新增商品和文章

直接编辑 `site-data.js` 中对应数组，复制同类项目并修改字段即可。`id` 必须唯一且保持稳定；详情页目前使用该 ID 作为查询参数。`slug` 可作为未来改用友好 URL 的标识。图片请保存为项目内文件，并在数据中填写相对路径；不要把图片 Base64 粘贴进数据或文章 HTML。

商品数据模板：

```json
{
  "id": "P009",
  "slug": "P009",
  "category": "包装与周边",
  "name": "品牌手提袋",
  "desc": "适合活动与门店使用的定制手提袋。",
  "intro": "可按品牌视觉定制尺寸、纸张与提绳。",
  "price": "¥起",
  "tag": "人气推荐",
  "thumb": "assets/images/products/P009-thumb.webp",
  "sceneImage": "assets/images/products/P009-scene.webp",
  "options": [
    { "name": "尺寸", "values": ["小号", "中号", "大号"] }
  ],
  "seoTitle": "品牌手提袋定制｜印造所",
  "seoDescription": "了解品牌手提袋的尺寸、材质与定制方式。"
}
```

文章数据模板（知识文章和品牌资讯分别加入 `knowledge`、`articles` 数组）：

```json
{
  "id": "A003",
  "slug": "A003",
  "title": "品牌物料如何统一视觉",
  "category": "品牌案例",
  "date": "2026-10-28",
  "excerpt": "用简短文字概括文章内容，便于列表展示和搜索摘要。",
  "cover": "assets/images/articles/A003-cover.webp",
  "tags": ["品牌物料", "印刷"],
  "content": "<p>文章正文 HTML。</p>",
  "seoTitle": "品牌物料如何统一视觉｜印造所",
  "seoDescription": "补充适合搜索结果展示的文章摘要。"
}
```

文章详情和商品详情会读取 `seoTitle`、`seoDescription` 更新页面标题、描述和 canonical 地址。图片可统一放在 `assets/images/` 下，并使用清晰的文件名与合适尺寸；仓库当前已有的内嵌图片已迁移到 `assets/images/content/`。

模板素材维护在 `site-data.js` 的 `templates` 数组，记录字段包括 `id`、`title`、`category`、`style`、`tags`、`tone`、`size`、`price` 以及图片路径 `thumb`、`designImage`、`sizeImage`、`sceneImage`。英文标题、品类、风格和标签按相同 ID 写在 `assets/js/i18n.js` 的 `I18N.en.content.templates` 中。新增或修改内容时，中英文沿用同一 ID；未准备真实图片时可先留空，页面会显示待上传占位，不会错配其他商品图。

## SEO 与站点地图

公开页面已添加页面描述、Open Graph 基础标签和 canonical 地址；详情页会按内容更新标题、描述及 canonical。`sitemap.xml` 列出官网静态页面、商品详情和文章详情地址。新增或删除商品、文章后，请同步更新 sitemap 中对应 URL。

## 首页精工材质档案库

- 首页双语产品档案位于 `assets/js/products-data.js`，分别维护 `zh` 和 `en` 两套分类与产品；每个产品包含简介、材质、工艺标签和可选的真实产品图。
- 分类切换和参数抽屉位于 `assets/js/product-catalog.js`，档案布局位于 `assets/css/product-catalog.css`；全站语言切换和统一字典位于 `assets/js/i18n.js`，开关样式位于 `assets/css/site-locale.css`。
- 新增产品时，沿用稳定 ID，在中文和英文分类中各新增一条记录，并补齐 `name`、`desc`、`materials`、`crafts`；分类 ID 保持一致。图片先核验再填入同一个相对路径。

## 当前后台说明

当前 `admin.html` 是无需安装环境即可使用的本地 CMS 原型。编辑后点击“保存到本浏览器”只写入本机 `localStorage`；点击“导出 site-data.js”下载内容数据文件，也不会自动上传或部署。后台不再要求保存 GitHub Token。拖拽上传图片会暂存为浏览器内图片数据，不适合作为线上图片文件。

## Decap CMS（初始配置）

- 新的可视化后台入口为 `/admin/`，配置文件为 `admin/config.yml`。产品与材质记录会保存为 `content/products/*.json`，知识与案例会保存为 `content/knowledge/*.md`，上传图片进入 `assets/images/products/`。
- GitHub backend 需要先配置可用的 GitHub OAuth 认证服务；仅添加 `backend: github` 配置并不能完成登录。Decap CMS 官方 GitHub backend 文档说明该认证依赖服务端，启用前需配置 OAuth provider/auth service。
- 当前网站前端仍从 `site-data.js`、`assets/js/products-data.js` 读取内容，`sitemap.xml` 也仍需手动维护。因此，这份 CMS 配置目前只是编辑入口与内容格式的初始规划；新建的 JSON/Markdown 尚不会自动显示在公开页面，也不会自动更新 sitemap。要实现发布闭环，还需将前端改为读取这些文件，并增加 sitemap 自动生成/校验流程。

### 发布后台修改

1. 在 `admin.html` 编辑内容并保存到本浏览器；这个保存只是草稿。
2. 点击“导出 site-data.js”，把导出的文件放回仓库根目录，替换同名文件。
3. 把新图片放进仓库并将图片字段改为相对路径；勿将 Base64 图片留在数据中。
4. 在 `assets/js/i18n.js` 的 `I18N.en.content` 下按内容 ID 增加或更新英文译稿；首页档案图片或中英文产品信息则编辑 `assets/js/products-data.js`。
5. 本地检查中文和英文页面、图片及详情链接后，将修改提交并推送到 `main`。仓库现有 GitHub Actions 会构建并部署 GitHub Pages；线上站点只会在这一步之后更新。

这条仓库数据文件 + GitHub Pages 工作流不需要付费后台或自建服务器。不要在公开静态页面内保存 GitHub Token；如果以后需要多人在线编辑和实时发布，应另行设计有身份验证的后台服务。
