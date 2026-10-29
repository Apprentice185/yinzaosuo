# 印造所官网

GitHub Pages 托管的纯静态官网。公开页面不依赖运行时后端；在线询价由 Formspree 转发。站点部署和内容索引由 GitHub Actions 完成。

## 本地预览与 CMS

需要 Node.js 20 或更高版本。首次使用先在仓库根目录生成本地内容索引和 sitemap：

```sh
npm run content:build
```

使用两个终端启动本地服务：

```sh
npm run cms
```

```sh
python -m http.server 8000
```

浏览器打开 `http://localhost:8000/admin/` 使用本地 Decap CMS，打开 `http://localhost:8000/` 预览网站。Local Backend 会把 CMS 修改直接写入工作区，无需 GitHub 登录。首次运行 `npm run cms` 可能需要联网下载 `decap-server`。

在线后台仍使用 `admin/config.yml` 中现有的 GitHub backend、OAuth Worker 地址和 `assets/images/products` 媒体目录。不要把访问令牌写入公开页面或仓库文件。

## 五个内容集合

| CMS 集合 | 文件目录 | 内容 |
|---|---|---|
| 产品中心 | `content/products/*.json` | 双语名称、分类、图片、简介、材质、工艺与排序 |
| 场景方案 | `content/solutions/*.md` | 双语标题、摘要、封面、图集与 Markdown 正文 |
| 印刷知识 | `content/knowledge/*.md` | 双语标题、分类、封面、SEO 摘要与正文 |
| 品牌资讯 | `content/news/*.md` | 双语标题、标签、封面、摘要与正文 |
| 模板素材 | `content/templates/*.json` | 双语标题、类型、预览图、尺寸及下载链接 |

产品记录保留 `id`、`title`、`title_en`、`category`、`image`、`desc`、`desc_en`、`materials`、`crafts`、`sort_order` 等字段。首页档案商品使用 `show_in_archive: true`；旧详情商品及其规格字段也保留在同一集合中。模板旧有的品类、风格、标签、价格、色调和图片字段同样保留。

新增内容时，在 `/admin/` 对应集合中创建记录，填写唯一且稳定的 ID 和中英文内容。文章正文使用 Markdown；内容图片上传到 `assets/images/products/`，或放入其他 `assets/images/` 子目录并在记录中填写相对路径。不要把图片 Base64 嵌入内容。

本地 CMS 保存后运行 `npm run content:build`，前端会从 `content/` 重新生成 `assets/js/content-index.js`，并更新根目录 `sitemap.xml`。提交内容和图片到 `main` 后，GitHub Actions 会再次生成这两个文件并部署 GitHub Pages；无需手动维护 JS 数据文件或 sitemap。

## 目录与维护

- `admin/config.yml`：Decap CMS 五个集合、OAuth 与媒体目录配置。
- `scripts/generate-content.js`：读取 JSON/Markdown 内容，生成静态前端索引和 XML sitemap。
- `assets/js/i18n.js`：全站静态文案的中英文字典和语言切换逻辑。CMS 内容的中英文翻译维护在同一条内容记录中。
- `assets/js/product-catalog.js`：首页产品档案卡片、分类切换和参数抽屉；产品数据由构建生成的内容索引提供。
- `styles.css`、`pages.css`、`assets/css/`：现有站点样式。
- `admin.html`：旧版浏览器本地内容原型；正式内容管理请使用 `/admin/`。

SEO 页面描述、Open Graph 与 canonical 由公开页面提供；文章和商品详情会按内容更新标题、描述及 canonical。sitemap 包含公开静态页面、商品详情以及知识、资讯和方案详情地址。

## 在线询价

首页表单通过 `index.html` 中的 Formspree endpoint `https://formspree.io/f/xeaagykr` 提交。请在 Formspree 后台确认表单已启用并验证收件邮箱；部署后通过 HTTPS 页面提交测试，确认记录和邮件通知均正常。Formspree 接收联系人、联系方式、项目类型和项目说明，无需自建服务器。
