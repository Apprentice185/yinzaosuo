/* Real-site-inspired previews for Decap CMS.
 * Uses the same production stylesheets and structural class names as the public site.
 */
(function () {
  if (!window.CMS || typeof createClass !== "function" || typeof h !== "function") return;

  [
    "/styles.css",
    "/pages.css",
    "/assets/css/site-locale.css",
    "/assets/css/product-information.css",
    "/assets/css/product-detail-media.css",
    "/assets/css/site-footer.css",
    "/admin/preview.css"
  ].forEach(function (file) {
    CMS.registerPreviewStyle(file);
  });

  function value(props, key, fallback) {
    var result = props.entry.getIn(["data", key]);
    if (result === undefined || result === null) return fallback || "";
    if (result && typeof result.toJS === "function") result = result.toJS();
    return result;
  }

  function first(props, keys, fallback) {
    for (var i = 0; i < keys.length; i += 1) {
      var result = value(props, keys[i], "");
      if (result !== "" && result !== null && result !== undefined) return result;
    }
    return fallback || "";
  }

  function assetUrl(props, path) {
    if (!path) return "";
    try {
      var asset = props.getAsset(path);
      if (asset && asset.url) return asset.url;
      if (asset && asset.path) return asset.path;
      if (asset && typeof asset.toString === "function") return asset.toString();
    } catch (error) {
      /* Keep the saved path as a fallback for existing media. */
    }
    return String(path);
  }

  function imageUrl(props, key) {
    return assetUrl(props, value(props, key, ""));
  }

  function header() {
    return h("header", { className: "site-header" },
      h("div", { className: "container nav-wrap" },
        h("a", { className: "brand", href: "#" },
          h("span", { className: "brand-mark" }, "印"),
          h("span", {}, "YINZAOSUO", h("small", {}, "PRINT PRODUCTION & DISPLAY SUPPLY"))
        ),
        h("nav", { className: "main-nav" },
          h("a", { href: "#" }, "产品中心"),
          h("a", { href: "#" }, "场景方案"),
          h("a", { href: "#" }, "印刷知识"),
          h("a", { href: "#" }, "品牌资讯"),
          h("a", { href: "#" }, "模板素材")
        ),
        h("div", { className: "nav-actions" },
          h("span", { className: "language-switch" }, "CN / EN"),
          h("span", { className: "quote-btn" }, "获取报价 ↗")
        )
      )
    );
  }

  function announcement(text) {
    return h("div", { className: "announcement" }, text || "印造所 · 印刷生产与展示物料");
  }

  function footer() {
    return h("footer", { className: "site-footer" },
      h("div", { className: "container footer-top" },
        h("div", { className: "footer-brand" },
          h("a", { className: "brand brand-light", href: "#" },
            h("span", { className: "brand-mark" }, "印"),
            h("span", {}, "YINZAOSUO", h("small", {}, "PRINT PRODUCTION & DISPLAY SUPPLY"))
          ),
          h("p", {}, "专业印刷生产与展示物料供应")
        ),
        h("div", { className: "footer-links" },
          h("div", {}, h("strong", {}, "产品中心"), h("a", { href: "#" }, "全部产品")),
          h("div", {}, h("strong", {}, "内容中心"), h("a", { href: "#" }, "印刷知识")),
          h("div", {}, h("strong", {}, "联系我们"), h("a", { href: "#" }, "获取报价"))
        )
      ),
      h("div", { className: "container footer-bottom" }, "© 2026 YINZAOSUO")
    );
  }

  function bulletList(items) {
    if (!Array.isArray(items) || !items.length) return h("p", { className: "preview-empty" }, "填写内容后将在这里显示");
    return h("ul", {}, items.map(function (item, index) {
      return h("li", { key: index }, String(item));
    }));
  }

  function articlePreview() {
    return createClass({
      render: function () {
        var p = this.props;
        var title = first(p, ["title"], "文章标题");
        var category = first(p, ["category"], "内容分类");
        var summary = first(p, ["summary"], "");
        var cover = imageUrl(p, "cover");
        var body = p.widgetFor("body") || h("p", {}, "正文内容将在这里显示");
        return h("div", { className: "site-preview" },
          announcement("印造所内容中心 · 内容详情"),
          header(),
          h("main", { className: "article-detail" },
            h("div", { className: "container article-detail-head" },
              h("a", { className: "back-link", href: "#" }, "← 返回内容列表"),
              h("p", { className: "eyebrow" }, category),
              h("h1", {}, title),
              h("p", { className: "article-date" }, value(p, "date", "发布日期")),
              summary ? h("p", { className: "preview-summary" }, summary) : null,
              cover ? h("img", { className: "article-cover", src: cover, alt: title }) : null
            ),
            h("div", { className: "container article-detail-layout" },
              h("div", { className: "article-detail-body" }, body),
              h("aside", {},
                h("div", { className: "aside-box" },
                  h("strong", {}, "印造所内容中心"),
                  h("p", {}, "关于纸张、工艺、品牌物料和实际案例，我们持续更新。")
                ),
                h("div", { className: "aside-box" },
                  h("strong", {}, "需要制作印品？"),
                  h("p", {}, "欢迎提交项目需求，获取定制报价。")
                )
              )
            )
          ),
          footer()
        );
      }
    });
  }

  // Merged product record (redesign phase 1): one preview covers both the
  // list layer (title/image/desc) and the detail layer (name/detail_*).
  var ProductPreview = createClass({
    render: function () {
      var p = this.props;
      var title = first(p, ["name", "title"], "产品名称");
      var intro = first(p, ["detail_desc", "desc", "intro"], "");
      var image = imageUrl(p, "detail_image") || imageUrl(p, "image");
      var detail = value(p, "detail", {}) || {};
      var materials = value(p, "materials", []);
      var crafts = value(p, "crafts", []);
      return h("div", { className: "site-preview" },
        announcement("产品中心 · 产品详情"),
        header(),
        h("main", {},
          h("section", { className: "product-detail-page" },
            h("div", { className: "container product-detail-layout" },
              h("div", {
                className: "product-detail-image",
                style: image ? { backgroundImage: "url('" + image + "')" } : {}
              }, !image ? h("strong", {}, "产品主图") : null),
              h("div", { className: "product-detail-copy" },
                h("p", { className: "eyebrow" }, first(p, ["category_label", "category_title", "category"], "PRODUCT")),
                h("h1", {}, title),
                h("p", { className: "product-detail-intro" }, intro || "产品介绍将在这里显示。"),
                h("div", { className: "preview-tags" },
                  (Array.isArray(materials) ? materials : []).concat(Array.isArray(crafts) ? crafts : []).map(function (tag, index) {
                    return h("span", { key: index }, String(tag));
                  })
                ),
                h("span", { className: "button button-dark" }, "获取报价 ↗")
              )
            )
          ),
          h("section", { className: "product-information" },
            h("div", { className: "container" },
              h("div", { className: "product-information-heading" },
                h("p", { className: "eyebrow" }, "PRODUCT DETAILS"),
                h("h2", {}, title),
                h("p", {}, detail.lead || "产品详情导语")
              ),
              h("div", { className: "product-information-grid" },
                [["生产与定制能力", detail.highlights], ["适用场景", detail.applications], ["加工与后道处理", detail.finishing], ["交付形式", detail.delivery]].map(function (section, index) {
                  return h("article", { className: "product-info-panel", key: index },
                    h("p", { className: "product-info-label" }, section[0]),
                    bulletList(section[1])
                  );
                })
              ),
              h("div", { className: "product-information-notes" },
                h("article", {}, h("h3", {}, "设计文件支持"), h("p", {}, detail.artwork || "")),
                h("article", {}, h("h3", {}, "询价时建议提供的信息"), h("p", {}, detail.brief || ""))
              ),
              h("p", { className: "product-information-caveat" }, detail.caveat || "")
            )
          )
        ),
        footer()
      );
    }
  });

  // Domestic materials centre (phase 2 front-end): switchable gallery on
  // the left, title + introduction + enquiry button on the right.
  var MaterialPreview = createClass({
    render: function () {
      var p = this.props;
      var title = first(p, ["title"], "素材标题");
      var gallery = value(p, "gallery", []);
      var firstImage = Array.isArray(gallery) && gallery.length ? gallery[0].image : "";
      var image = firstImage ? assetUrl(p, firstImage) : "";
      return h("div", { className: "site-preview" },
        announcement("素材中心 · 画面素材展示"),
        header(),
        h("main", { className: "template-detail container" },
          h("p", { className: "eyebrow" }, "素材中心"),
          h("div", { className: "detail-gallery" },
            image ? h("img", { className: "detail-image active", src: image, alt: title }) : h("div", { className: "image-placeholder" }, "素材主图")
          ),
          h("h1", {}, title),
          h("p", {}, value(p, "description", "素材介绍将在这里显示")),
          h("span", { className: "button button-dark" }, "用这款素材制作画面 ↗")
        ),
        footer()
      );
    }
  });

  var ShippingPreview = createClass({
    render: function () {
      var p = this.props;
      return h("div", { className: "site-preview" },
        announcement("公司信息 · Shipping"),
        header(),
        h("main", { className: "container global-settings-preview" },
          h("p", { className: "eyebrow" }, value(p, "eyebrow", "SHIPPING")),
          h("h1", {}, value(p, "title", "Shipping page title")),
          h("p", {}, value(p, "intro", ""))
        ),
        footer()
      );
    }
  });

  var AboutPreview = createClass({
    render: function () {
      var p = this.props;
      return h("div", { className: "site-preview" },
        announcement("公司信息 · About"),
        header(),
        h("main", { className: "container global-settings-preview" },
          h("p", { className: "eyebrow" }, value(p, "eyebrow", "ABOUT")),
          h("h1", {}, value(p, "title", "About page title")),
          h("p", {}, value(p, "intro", ""))
        ),
        footer()
      );
    }
  });

  var DeliveryPreview = createClass({
    render: function () {
      var p = this.props;
      var timetable = value(p, "timetable", []);
      return h("div", { className: "site-preview" },
        announcement("配送时效 · 西安专车整板配送"),
        header(),
        h("main", { className: "container global-settings-preview" },
          h("h1", {}, value(p, "title", "配送时效")),
          h("p", {}, value(p, "intro", "")),
          h("h2", {}, value(p, "timetable_heading", "配送时效表")),
          (Array.isArray(timetable) ? timetable : []).map(function (row, index) {
            return h("p", { key: index }, (row.label || "") + " · " + (row.condition || "") + " — " + (row.body || ""));
          }),
          h("p", {}, value(p, "coverage", ""))
        ),
        footer()
      );
    }
  });

  var HomePreview = createClass({
    render: function () {
      var p = this.props;
      var title = first(p, ["hero_title_zh", "hero_title_en"], "定制印刷生产，服务每一个商业项目");
      var description = first(p, ["hero_description_zh", "hero_description_en"], "填写首页介绍后，这里将展示真实首屏文案。");
      var slides = value(p, "hero_slides", []);
      var firstSlide = Array.isArray(slides) && slides.length ? slides[0].image : "";
      var image = firstSlide ? assetUrl(p, firstSlide) : "";
      return h("div", { className: "site-preview" },
        announcement("首页内容与 Banner"),
        header(),
        h("main", {},
          h("section", { className: "hero hero-fullbleed", style: image ? { backgroundImage: "url('" + image + "')" } : {} },
            h("div", { className: "hero-shade" }),
            h("div", { className: "container hero-content" },
              h("div", { className: "hero-copy" },
                h("p", { className: "eyebrow" }, first(p, ["eyebrow_zh", "eyebrow_en"], "印造所 · 专业印刷生产")),
                h("h1", {}, title),
                h("p", { className: "hero-text" }, description),
                h("span", { className: "button button-dark" }, "浏览产品 ↗")
              )
            )
          )
        ),
        footer()
      );
    }
  });

  var GlobalPreview = createClass({
    render: function () {
      var p = this.props;
      return h("div", { className: "site-preview" },
        announcement(first(p, ["announcement_zh", "announcement_en"], "顶部公告")),
        header(),
        h("main", { className: "container global-settings-preview" },
          h("p", { className: "eyebrow" }, "SITE SETTINGS"),
          h("h1", {}, "全局网站设置预览"),
          h("h2", {}, first(p, ["brand_tagline_zh", "brand_tagline_en"], "品牌副标题")),
          h("p", {}, "联系邮箱：" + value(p, "contact_email", "待填写")),
          h("p", {}, "联系电话：" + value(p, "contact_phone", "待填写")),
          h("p", {}, "SEO 标题：" + first(p, ["seo_home_title_zh", "seo_home_title_en"], "待填写")),
          h("p", {}, "SEO 描述：" + first(p, ["seo_home_description_zh", "seo_home_description_en"], "待填写"))
        ),
        footer()
      );
    }
  });

  CMS.registerPreviewTemplate("en_products", ProductPreview);
  CMS.registerPreviewTemplate("zh_products", ProductPreview);
  CMS.registerPreviewTemplate("en_solutions", articlePreview());
  CMS.registerPreviewTemplate("zh_solutions", articlePreview());
  CMS.registerPreviewTemplate("en_knowledge", articlePreview());
  CMS.registerPreviewTemplate("zh_knowledge", articlePreview());
  CMS.registerPreviewTemplate("zh_materials", MaterialPreview);
  CMS.registerPreviewTemplate("en_home_page", HomePreview);
  CMS.registerPreviewTemplate("zh_home_page", HomePreview);
  CMS.registerPreviewTemplate("en_site_global", GlobalPreview);
  CMS.registerPreviewTemplate("zh_site_global", GlobalPreview);
  CMS.registerPreviewTemplate("en_shipping_page", ShippingPreview);
  CMS.registerPreviewTemplate("en_about_page", AboutPreview);
  CMS.registerPreviewTemplate("zh_delivery_page", DeliveryPreview);
})();
