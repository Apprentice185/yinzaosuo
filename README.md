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
- 后台发布会写入统一的数据版本号；已经打开的首页、产品详情、模板、知识库和资讯页会自动刷新，之后打开的页面也会读取最新数据。
- 修改首页文案、文章和页脚内容直接编辑 `index.html`。
- 视觉变量与响应式样式集中在 `styles.css`。

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

## SEO 与站点地图

公开页面已添加页面描述、Open Graph 基础标签和 canonical 地址；详情页会按内容更新标题、描述及 canonical。`sitemap.xml` 列出官网静态页面、商品详情和文章详情地址。新增或删除商品、文章后，请同步更新 sitemap 中对应 URL。

## 首页精工材质档案库

- 首页双语产品档案位于 `assets/js/products-data.js`，分别维护 `zh` 和 `en` 两套分类与产品；每个产品包含背景图、简介、材质和工艺标签。
- 分类切换、参数抽屉和 CN / EN 无刷新切换逻辑位于 `assets/js/product-catalog.js`，瑞士风格布局位于 `assets/css/product-catalog.css`。
- 新增产品时，在中英文相同分类下各新增一条产品记录，并为两种语言补齐 `name`、`desc`、`materials`、`crafts` 和 `image`；分类 ID 保持一致。

## 当前后台说明

当前 `admin.html` 是无需安装环境即可使用的本地 CMS 原型，发布内容后会保存到当前浏览器的 `localStorage`，同一浏览器打开前台会立即看到更新。图片可以填写项目内相对路径，例如 `assets/images/products/P009-thumb.webp`。后台拖拽上传会暂存为浏览器内图片数据；如需发布，请将图片文件放入仓库，再将字段改为相对路径，避免导出的 `site-data.js` 再次膨胀。

### 发布后台修改

1. 打开 `admin.html`，修改内容后点击“保存到本浏览器”。
2. 确认本地前台显示正确后，点击“导出线上数据”，下载新的 `site-data.js`。
3. 用下载的文件替换项目根目录中的 `site-data.js`。如果浏览器自动下载为 `site-data (1).js`，请先改回 `site-data.js`。
4. 保持 `sync.ps1` 运行，脚本会自动提交并推送修改；GitHub Pages 构建完成后，主页、产品页、模板页和文章页都会使用新数据。

注意：不要只点击“保存到本浏览器”，这一步只影响当前浏览器；必须导出并替换 `site-data.js` 才会发布到 GitHub。

要实现真正的线上后台发布，让手机或其他电脑也能看到同一份数据，需要下一步接入服务器数据库、图片存储和管理员登录。当前静态版本没有服务器，因此不能把浏览器本地保存直接同步到线上所有用户。
