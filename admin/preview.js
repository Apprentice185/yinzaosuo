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
    "/assets/css/hero-media.css",
    "/assets/css/home-featured-materials.css",
    "/assets/css/product-catalog.css",
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

  // --- Full-page previews for the EN Shipping / About entries ---------
  // These mirror shipping.html / about.html section for section with the
  // production class names (the preview iframe loads the site's own
  // stylesheets), so the editor shows each page as it will be published.
  // Inline <em> / <a> segments are preserved with the same rule the live
  // company-settings.js uses: the static segment text is looked up in
  // the edited value and wrapped back into an element.

  function richEm(valueText, emText) {
    if (!valueText) return "";
    if (emText && valueText.indexOf(emText) !== -1) {
      var at = valueText.indexOf(emText);
      var parts = [];
      if (at > 0) parts.push(valueText.slice(0, at));
      parts.push(h("em", { key: "em" }, emText));
      var rest = valueText.slice(at + emText.length);
      if (rest) parts.push(rest);
      return parts;
    }
    return valueText;
  }

  function richLink(valueText, linkText, href, className, arrow) {
    if (!valueText) return "";
    if (linkText && valueText.indexOf(linkText) !== -1) {
      var at = valueText.indexOf(linkText);
      var parts = [];
      if (at > 0) parts.push(valueText.slice(0, at));
      var linkChildren = arrow ? [linkText, h("span", { key: "arr" }, " ↗")] : linkText;
      var linkProps = { key: "link", href: href };
      if (className) linkProps.className = className;
      parts.push(h("a", linkProps, linkChildren));
      var rest = valueText.slice(at + linkText.length);
      if (rest) parts.push(rest);
      return parts;
    }
    return valueText;
  }

  function listOf(props, key) {
    var result = value(props, key, []);
    return Array.isArray(result) ? result : [];
  }

  function stepCards(items, marker) {
    return h("div", { className: "steps" }, items.map(function (item, index) {
      var mark = marker === "term" ? (item.term || "") : marker === "dot" ? "·" : ("0" + (index + 1)).slice(-2);
      return h("div", { className: "step", key: index },
        h("span", {}, mark),
        h("h3", {}, item.title || ""),
        h("p", {}, item.body || "")
      );
    }));
  }

  function enAnnouncement(spanText, restText) {
    return h("div", { className: "announcement" }, h("span", {}, spanText), " · " + restText);
  }

  function enHeader(active) {
    var links = ["Products", "Solutions", "Knowledge", "Shipping", "About"];
    return h("header", { className: "site-header" },
      h("div", { className: "container nav-wrap" },
        h("a", { className: "brand", href: "#" },
          h("span", { className: "brand-mark" }, "印"),
          h("span", {}, "YINZAOSUO", h("small", {}, "PRINT PRODUCTION & DISPLAY SUPPLY"))
        ),
        h("nav", { className: "main-nav" }, links.map(function (label) {
          var props = { key: label, href: "#" };
          if (active === label) props.className = "active";
          return h("a", props, label);
        })),
        h("div", { className: "nav-actions" },
          h("span", { className: "language-switch" }, "CN / EN"),
          h("span", { className: "quote-btn" }, "Get a quote ↗")
        )
      )
    );
  }

  function enFooter() {
    return h("footer", { className: "site-footer" },
      h("div", { className: "container footer-top" },
        h("div", { className: "footer-brand" },
          h("a", { className: "brand brand-light", href: "#" },
            h("span", { className: "brand-mark" }, "印"),
            h("span", {}, "YINZAOSUO", h("small", {}, "PRINT PRODUCTION & DISPLAY SUPPLY"))
          ),
          h("p", {}, "Print Materials.", h("br", {}), "Global Supply.")
        ),
        h("nav", { className: "footer-links" },
          h("div", {}, h("strong", {}, "Products"),
            h("a", { href: "#" }, "All products"),
            h("a", { href: "#" }, "PVC Foam Board"),
            h("a", { href: "#" }, "Gloss Photo Paper"),
            h("a", { href: "#" }, "One-Way Vision Film"),
            h("a", { href: "#" }, "Self-Adhesive Vinyl"),
            h("a", { href: "#" }, "Printed PVC Banners")),
          h("div", {}, h("strong", {}, "Company"),
            h("a", { href: "#" }, "About us"),
            h("a", { href: "#" }, "Shipping & delivery"),
            h("a", { href: "#" }, "Contact us")),
          h("div", {}, h("strong", {}, "Resources"),
            h("a", { href: "#" }, "Print knowledge"),
            h("a", { href: "#" }, "Solutions"),
            h("a", { href: "#" }, "FAQ"),
            h("a", { href: "#" }, "Delivery"))),
        h("div", { className: "footer-contact" },
          h("div", { className: "footer-contact-content" },
            h("div", { className: "footer-contact-details" },
              h("div", { className: "footer-contact-item" },
                h("span", {}, "Business email"),
                h("a", { href: "#" }, "xiaotanqingqing@outlook.com"),
                h("small", {}, "For quotations, artwork files and order details")),
              h("div", { className: "footer-contact-item" },
                h("span", {}, "Phone"),
                h("a", { href: "#" }, "+86 134 0296 9091"),
                h("small", {}, "International calls are welcome"))),
            h("div", { className: "footer-wechat" },
              h("span", { className: "footer-contact-label" }, "WhatsApp QR"),
              h("img", { className: "qr-code footer-whatsapp-qr", src: "/pic/whatsapp-qr-placeholder.svg", alt: "WhatsApp QR" }),
              h("small", {}, "Scan to start a WhatsApp chat."))))
      ),
      h("div", { className: "container footer-bottom" },
        h("span", {}, "© 2026 印造所 YINZAOSUO. All Rights Reserved."),
        h("span", {}, "Commercial visuals & custom print · Custom service guide"))
    );
  }

  function sectionHeading(eyebrow, headingNode, extra) {
    var inner = h("div", { key: "head" },
      h("p", { className: "eyebrow" }, eyebrow),
      h("h2", {}, headingNode));
    var children = extra ? [inner].concat(extra) : [inner];
    return h("div", { className: "section-heading compact" }, children);
  }

  var ShippingPreview = createClass({
    render: function () {
      var p = this.props;
      return h("div", { className: "site-preview" },
        enAnnouncement("YINZAOSUO for Australia", "Wide-format media and print supply for the Australian trade"),
        enHeader("Shipping"),
        h("main", {},
          h("section", { className: "page-hero page-hero-photo", style: { backgroundImage: "url('/assets/images/products/ys-outdoor-pvc-rigid-film.webp')" } },
            h("div", { className: "container" },
              h("p", { className: "eyebrow" }, value(p, "eyebrow", "SHIPPING & DELIVERY")),
              h("h1", {}, richEm(value(p, "title", ""), "shipped to print businesses worldwide.")),
              h("p", {}, value(p, "intro", "")),
              h("div", { className: "hero-actions" },
                h("span", { className: "button" }, "Get a quote ↗"),
                h("span", { className: "button button-ghost" }, "Products")))),
          h("section", { className: "section page-content" },
            h("div", { className: "container" },
              sectionHeading("HOW YOUR ORDER TRAVELS", richEm(value(p, "steps_heading", ""), "to your dock.")),
              stepCards(listOf(p, "steps"), "num"))),
          h("section", { className: "section" },
            h("div", { className: "container" },
              sectionHeading("TRADE TERMS", richEm(value(p, "trade_terms_heading", ""), "your choice."), [
                h("p", { className: "heading-description", key: "desc" }, value(p, "trade_terms_intro", ""))
              ]),
              stepCards(listOf(p, "trade_terms"), "term"))),
          h("section", { className: "section section-tint" },
            h("div", { className: "container" },
              sectionHeading("TRANSIT TIMES & TERMS", richEm(value(p, "transit_heading", ""), "Your quotation is the promise."), [
                h("p", { className: "heading-description", key: "desc" }, value(p, "transit_body", "")),
                h("p", { key: "note" }, richLink(value(p, "australia_note", ""), "See the page for Australian buyers", "australia.html"))
              ]))),
          h("section", { className: "section" },
            h("div", { className: "container" },
              sectionHeading("PACKED FOR THE JOURNEY", richEm(value(p, "packing_heading", ""), "because it does.")),
              stepCards(listOf(p, "packing"), "num"),
              h("p", { style: { marginTop: "38px" } }, h("span", { className: "button button-dark" }, "Get a quote ↗"))))),
        enFooter()
      );
    }
  });

  var AboutPreview = createClass({
    render: function () {
      var p = this.props;
      var email = value(p, "contact_email", "");
      return h("div", { className: "site-preview" },
        enAnnouncement("About YINZAOSUO", "An independent print production studio in China"),
        enHeader("About"),
        h("main", {},
          h("section", { className: "page-hero page-hero-photo", style: { backgroundImage: "url('/assets/images/products/ys-gloss-photo-paper.webp')" } },
            h("div", { className: "container" },
              h("p", { className: "eyebrow" }, value(p, "eyebrow", "ABOUT YINZAOSUO")),
              h("h1", {}, richEm(value(p, "title", ""), "run personally, from enquiry to shipment.")),
              h("p", {}, value(p, "intro", "")),
              h("div", { className: "hero-actions" },
                h("span", { className: "button" }, "Get a quote ↗"),
                h("span", { className: "button button-ghost" }, "Products")))),
          h("section", { className: "section page-content" },
            h("div", { className: "container" },
              sectionHeading("THE STUDIO", richEm(value(p, "studio_heading", ""), "Direct by design.")),
              listOf(p, "studio_paragraphs").map(function (paragraph, index) {
                return h("p", { key: index }, String(paragraph));
              }))),
          h("section", { className: "section section-tint" },
            h("div", { className: "container" },
              sectionHeading("HOW AN ORDER FLOWS", richEm(value(p, "steps_heading", ""), "step by step.")),
              stepCards(listOf(p, "steps"), "num"))),
          h("section", { className: "section" },
            h("div", { className: "container" },
              sectionHeading("WHO IT IS FOR", richEm(value(p, "audience_heading", ""), "not the end customer.")),
              h("p", {}, value(p, "audience_intro", "")),
              stepCards(listOf(p, "audience"), "dot"),
              h("p", {}, richLink(value(p, "audience_note", ""), "supply page for the Australian trade", "australia.html", "text-link", true)))),
          h("section", { className: "section section-tint" },
            h("div", { className: "container" },
              sectionHeading("WORK WITH ME", richEm(value(p, "cta_heading", ""), "not a sales pitch."), [
                h("p", { className: "heading-description", key: "desc" }, value(p, "cta_body", ""))
              ]),
              h("p", {},
                h("span", { className: "button button-dark" }, "Request a quote ↗"),
                " ",
                h("span", { className: "button button-outline" }, email ? "Email " + email : "Email"))))),
        enFooter()
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

  // --- Homepage previews -------------------------------------------------
  // Every entry under a 首页 collection (homepage content, site settings
  // and the three showcase windows) previews the homepage itself. The
  // entry being edited supplies its own slice; everything else is read
  // from the currently published content index so the preview shows the
  // real page. Static section copy mirrors index.html / zh/index.html.

  var HOME_COPY = {
    en: {
      announcement: "Custom print production & display supply · Global trade enquiries welcome",
      nav: ["Products", "Solutions", "Knowledge", "Shipping", "About"],
      quote: "Get a quote ↗",
      trust: [["Production partners", "Coordinated manufacturing in China"], ["Custom specifications", "Materials, sizes, and finishing options"], ["Order coordination", "Specification review · production follow-up"], ["Delivery assurance", "Sea freight to main Australian ports in around 40 days · Export packing photographed for your confirmation before dispatch"]],
      featuredEyebrow: "CORE MATERIAL RANGE", featuredTitle: "Core Wide-Format Media",
      featuredIntro: "Roll media for trade printers, sign makers and display suppliers, with clear specifications for trade enquiries.",
      featuredNote: "Reference prices; freight and final terms are confirmed by destination and order.", featuredAll: "Browse all products ↗",
      archiveEyebrow: "PRODUCT / CAPABILITIES", archiveTitle: "Custom Print & Display Supply",
      archiveIntro: "Explore made-to-order printed graphics, finishing services, and display systems for trade projects.", archiveAll: "Browse the full material range ↗",
      materialsLabel: "Materials", craftsLabel: "Crafts", viewSpecs: "View specifications ↗",
      processEyebrow: "A SIMPLE PROCESS", processTitle: "A clear process for trade orders.", processTitleEm: "From specification to delivery.",
      processIntro: "Share your product, dimensions, quantity, and destination. We coordinate manufacturing with our China-based production partners and discuss suitable packing and freight options for each order.",
      processCta: "Plan a custom project ↗",
      processSteps: [["Define your brief", "Browse our products or tell us the application, finished dimensions, and delivery requirements."], ["Confirm specifications", "We review the product, quantity, finished size, finishing requirements, and destination before preparing a project quotation."], ["Check artwork", "Basic file checks and simple adjustments are complimentary. Extensive edits or original design work are quoted separately."], ["Coordinate delivery", "Once the quotation and production details are approved, we coordinate manufacturing, packing, and the agreed freight arrangement."]],
      knowledgeEyebrow: "PRINT KNOWLEDGE", knowledgeTitle: "Know the production details.", knowledgeTitleEm: "Prepare better print orders.",
      knowledgeIntro: "Explore practical guidance on artwork preparation, finished dimensions, hemming, eyelets, pole pockets, lamination, trimming, packing, and delivery formats for trade print orders.",
      knowledgeAll: "Explore the print knowledge library ↗", knowledgeFigure: "/pic/26cda1c3-d0dd-4d9b-83b3-3c3f1d0417af.webp",
      aboutEyebrow: "ABOUT YINZAOSUO", aboutTitle: "A sourcing partner for print businesses.", aboutTitleEm: "Built around your specifications.",
      aboutIntro: "We connect print businesses worldwide with production partners in China, focusing on selected print materials, clear specifications, and order-by-order coordination.", aboutLink: "Contact YINZAOSUO ↗",
      faqEyebrow: "NEED TO KNOW", faqTitle: "Questions?", faqTitleEm: "We have thought ahead.", faqIntro: "If you cannot find an answer, tell us about your project. We usually reply within one business day.",
      heroPrimary: "Explore core products ↗", heroSecondary: "Get a quote ↗",
      footerTagline: ["Print Materials.", "Global Supply."],
      footerCols: [["Products", ["All products", "PVC Foam Board", "Gloss Photo Paper", "One-Way Vision Film", "Self-Adhesive Vinyl", "Printed PVC Banners"]], ["Company", ["About us", "Shipping & delivery", "Contact us"]], ["Resources", ["Print knowledge", "Solutions", "FAQ", "Delivery"]]],
      emailLabel: "Business email", emailNote: "For quotations, artwork files and order details", phoneLabel: "Phone", phoneNote: "International calls are welcome", qrLabel: "WhatsApp QR", qrNote: "Scan to start a WhatsApp chat.", qrSrc: "/pic/whatsapp-qr-placeholder.svg",
      footerBottom: ["© 2026 印造所 YINZAOSUO. All Rights Reserved.", "Commercial visuals & custom print · Custom service guide"],
      showcaseEmpty: "No showcase picks yet — the site shows its built-in default cards."
    },
    zh: {
      announcement: "定制印刷与展示物料 · 欢迎全球贸易询价",
      nav: ["产品大全", "场景方案", "资讯", "配送时效", "素材中心"],
      quote: "获取报价 ↗",
      trust: [["生产协同", "中国合作工厂协同生产"], ["灵活定制", "尺寸、材质、工艺自由组合"], ["专人服务", "文件检查 · 打样 · 售后"], ["物流配送保障", "同城次日达 · 送货上门"]],
      featuredEyebrow: "核心材料系列", featuredTitle: "核心大幅面打印材料",
      featuredIntro: "面向印刷贸易商、广告制作商与展示供应商的卷材产品，规格清晰，支持批量询价。",
      featuredNote: "以上为参考价格，运费及最终交易条件按目的地和订单确认。", featuredAll: "浏览全部产品 ↗",
      archiveEyebrow: "产品与工艺", archiveTitle: "精工材质档案库",
      archiveIntro: "从纸张、包装到空间呈现，逐项了解材质选择与加工能力。", archiveAll: "浏览完整物料体系 ↗",
      materialsLabel: "可选材质", craftsLabel: "加工工艺", viewSpecs: "查看产品规格 ↗",
      processEyebrow: "服务流程", processTitle: "专人顾问定制，", processTitleEm: "每一步都稳妥。",
      processIntro: "从材质与工艺沟通、文件校验到打样交付，印造所顾问全程跟进。",
      processCta: "定制我的项目 ↗",
      processSteps: [["选定意向", "浏览物料库挑选心仪的材质工艺，或直接提出场景需求。"], ["专人对接", "通过微信、电话或邮件联系我们，由专人核对特种纸与工艺选型。"], ["审稿校色", "发送设计源文件，免费协助校验出血线、矢量刀模与 CMYK 色差风险。"], ["精工交付", "确认打样效果后精工排产，顺丰特快直发安全送达。"]],
      knowledgeEyebrow: "印刷知识", knowledgeTitle: "先了解，再下单。", knowledgeTitleEm: "少走弯路。",
      knowledgeIntro: "纸张怎么选？专色和四色有什么区别？出血线到底要留多少？把印刷里那些“专业黑话”，说成你听得懂的话。",
      knowledgeAll: "进入完整印刷知识库 ↗", knowledgeFigure: "/zh/assets/images/products/pa001.jpg",
      aboutEyebrow: "关于印造所", aboutTitle: "把印刷做好，", aboutTitleEm: "让品牌表达更清晰。",
      aboutIntro: "印造所专注企业印刷与品牌物料，从需求沟通、材料与工艺选择到生产交付，帮助每一次品牌表达落到实处。", aboutLink: "联系印造所 ↗",
      faqEyebrow: "常见问题", faqTitle: "还有问题？", faqTitleEm: "我们先替你想到了。", faqIntro: "如果没有找到答案，欢迎把项目发给我们，通常会在一个工作日内回复。",
      heroPrimary: "开始选购 ↗", heroSecondary: "获取报价 ↗",
      footerTagline: ["把每一次表达，", "做成值得留下的东西。"],
      footerCols: [["产品", ["产品大全", "PVC 发泡板", "光面相纸", "单透膜", "自粘背胶", "PVC 横幅"]], ["公司", ["关于我们", "联系我们", "服务流程"]], ["资源", ["资讯", "场景方案", "常见问题", "配送时效", "素材中心"]]],
      emailLabel: "邮箱", emailNote: "用于报价、文件与订单沟通", phoneLabel: "电话", phoneNote: "周一至周日 09:00–21:00", qrLabel: "微信扫码咨询", qrNote: "扫码开始咨询", qrSrc: "/zh/pic/QR code.png",
      footerBottom: ["© 2026 印造所 全球印刷与展示物料供应. All Rights Reserved.", "商业视觉与特种物料定制 · 定制服务须知"],
      showcaseEmpty: "橱窗尚未挑选内容，网站显示默认卡片。"
    }
  };

  // Card copy for the five long-standing homepage material cards (EN),
  // identical to the live cards; other products render from their data.
  var PREVIEW_CARD_COPY = {
    "YS-GLOSS-PHOTO-PAPER": { kicker: "01 / PHOTO PAPER", desc: "A bright, glossy surface for posters, promotions and indoor displays.", specs: "1520mm · 200gsm · 50m/roll · USD 18.60/m²", visual: "gloss", label: "GLOSS" },
    "YS-SATIN-PHOTO-PAPER": { kicker: "02 / PHOTO PAPER", desc: "A softer surface appearance for posters, retail graphics and displays.", specs: "1520mm · 200gsm · 50m/roll · USD 18.60/m²", visual: "satin", label: "SATIN" },
    "YS-SYNTHETIC-PAPER": { kicker: "03 / SYNTHETIC MEDIA", desc: "Polypropylene-based print media for posters and promotional graphics.", specs: "1520mm · 180gsm · 50m/roll · USD 12.60/m²", visual: "synthetic", label: "PP" },
    "YS-ADHESIVE-VINYL": { kicker: "04 / SELF-ADHESIVE", desc: "Printable adhesive media for signage, retail graphics and applied displays.", specs: "1520mm · 50m/roll · 120gsm liner USD 13.60/m²; 140gsm USD 14.60/m²", visual: "vinyl", label: "ADHESIVE" },
    "YS-OUTDOOR-PVC-RIGID-FILM": { kicker: "05 / OUTDOOR PVC", desc: "PVC media with a waterproof matte coating for outdoor print projects.", specs: "1270mm · 240gsm · 50m/roll · USD 25.90/m²", visual: "pvc", label: "PVC" }
  };

  function readKeys(props, keys) {
    var out = {};
    keys.forEach(function (key) {
      var result = props.entry.getIn(["data", key]);
      if (result && typeof result.toJS === "function") result = result.toJS();
      if (result !== undefined && result !== null) out[key] = result;
    });
    return out;
  }

  function absSitePath(lang, path) {
    var text = String(path || "").trim();
    if (!text) return "";
    if (/^(https?:)?\/\//.test(text) || text.charAt(0) === "/") return text;
    return (lang === "zh" ? "/zh/" : "/") + text;
  }

  function previewHeader(lang, copy, global) {
    var items = null;
    if (global && Array.isArray(global.nav_items)) {
      items = global.nav_items.filter(function (n) { return n.enabled !== false; })
        .map(function (n) { return n["label_" + lang] || n.label_en || n.label_zh || ""; })
        .filter(Boolean);
    }
    if (!items || !items.length) items = copy.nav;
    return h("header", { className: "site-header" },
      h("div", { className: "container nav-wrap" },
        h("a", { className: "brand", href: "#" },
          h("span", { className: "brand-mark" }, "印"),
          h("span", {}, "YINZAOSUO", h("small", {}, "PRINT PRODUCTION & DISPLAY SUPPLY"))),
        h("nav", { className: "main-nav" }, items.map(function (label, i) {
          return h("a", { key: i, href: "#" }, label);
        })),
        h("div", { className: "nav-actions" },
          h("span", { className: "language-switch" }, "CN / EN"),
          h("span", { className: "quote-btn" }, copy.quote))));
  }

  function previewFooter(lang, copy, global) {
    var email = (global && global.contact_email) || "xiaotanqingqing@outlook.com";
    var phone = (global && global.contact_phone) || "+86 134 0296 9091";
    var tagline = global && global["footer_tagline_" + lang];
    return h("footer", { className: "site-footer" },
      h("div", { className: "container footer-top" },
        h("div", { className: "footer-brand" },
          h("a", { className: "brand brand-light", href: "#" },
            h("span", { className: "brand-mark" }, "印"),
            h("span", {}, "YINZAOSUO", h("small", {}, "PRINT PRODUCTION & DISPLAY SUPPLY"))),
          tagline ? h("p", {}, tagline) : h("p", {}, copy.footerTagline[0], h("br", {}), copy.footerTagline[1])),
        h("nav", { className: "footer-links" }, copy.footerCols.map(function (col, i) {
          return h("div", { key: i }, h("strong", {}, col[0]), col[1].map(function (label, j) {
            return h("a", { key: j, href: "#" }, label);
          }));
        })),
        h("div", { className: "footer-contact" },
          h("div", { className: "footer-contact-content" },
            h("div", { className: "footer-contact-details" },
              h("div", { className: "footer-contact-item" }, h("span", {}, copy.emailLabel), h("a", { href: "#" }, email), h("small", {}, copy.emailNote)),
              h("div", { className: "footer-contact-item" }, h("span", {}, copy.phoneLabel), h("a", { href: "#" }, phone), h("small", {}, copy.phoneNote))),
            h("div", { className: "footer-wechat" },
              h("span", { className: "footer-contact-label" }, copy.qrLabel),
              h("img", { className: "qr-code footer-whatsapp-qr", src: copy.qrSrc, alt: copy.qrLabel }),
              h("small", {}, copy.qrNote))))),
      h("div", { className: "container footer-bottom" },
        h("span", {}, (global && global["footer_copyright_" + lang]) || copy.footerBottom[0]),
        h("span", {}, (global && global["footer_region_" + lang]) || copy.footerBottom[1])));
  }

  function makeHomepagePreview(lang, mode) {
    var copy = HOME_COPY[lang];
    return createClass({
      getInitialState: function () { return { remote: null }; },
      componentDidMount: function () {
        var self = this;
        if (typeof fetch !== "function") return;
        fetch(lang === "zh" ? "/zh/assets/js/content-index.js" : "/assets/js/content-index.js")
          .then(function (r) { return r.text(); })
          .then(function (text) {
            var w = {};
            new Function("window", text)(w);
            if (w.CMS_CONTENT) self.setState({ remote: w.CMS_CONTENT });
          })
          .catch(function () { /* entry-only preview still renders */ });
      },
      render: function () {
        var p = this.props;
        var remote = (this.state && this.state.remote) || {};
        var rSettings = remote.siteSettings || {};
        var home = mode === "home"
          ? readKeys(p, ["hero_slides", "hero_image", "eyebrow_en", "eyebrow_zh", "hero_title_en", "hero_title_zh", "hero_description_en", "hero_description_zh", "hero_note_en", "hero_note_zh", "modules", "module_order", "faq_items"])
          : (rSettings.home || {});
        var global = mode === "global"
          ? readKeys(p, ["announcement_en", "announcement_zh", "contact_email", "contact_phone", "nav_items", "footer_tagline_en", "footer_tagline_zh", "footer_copyright_en", "footer_copyright_zh", "footer_region_en", "footer_region_zh"])
          : (rSettings.global || {});
        var rShow = rSettings.showcase || {};
        var showcase = {
          core: Array.isArray(rShow.core) ? rShow.core : [],
          custom: Array.isArray(rShow.custom) ? rShow.custom : [],
          knowledge: Array.isArray(rShow.knowledge) ? rShow.knowledge : []
        };
        if (mode === "core") showcase.core = value(p, "products", []);
        if (mode === "custom") showcase.custom = value(p, "products", []);
        if (mode === "knowledge") showcase.knowledge = value(p, "articles", []);
        var products = Array.isArray(remote.products) ? remote.products : [];
        var articles = (Array.isArray(remote.knowledge) ? remote.knowledge : []).filter(function (a) { return !a.hidden; });
        var byId = {};
        products.forEach(function (item) { byId[item.id] = item; });
        var bySlug = {};
        articles.forEach(function (item) { bySlug[item.slug] = item; });

        function materialCard(id, index) {
          var product = byId[id];
          if (!product) return h("div", { className: "home-material-card", key: id || index },
            h("div", { className: "home-material-copy" }, h("h3", {}, String(id)), h("p", {}, "…")));
          var cc = lang === "en" ? (PREVIEW_CARD_COPY[id] || {}) : {};
          return h("a", { className: "home-material-card", key: id, href: "#" },
            h("span", { className: "home-material-visual" + (cc.visual ? " " + cc.visual : "") },
              product.image ? h("img", { src: absSitePath(lang, product.image), alt: product.name || product.title || "" }) : null,
              cc.label ? h("span", { className: "home-material-visual-label" }, cc.label) : null),
            h("div", { className: "home-material-copy" },
              h("span", { className: "home-material-kicker" }, cc.kicker || [product.category_num, product.category_label].filter(Boolean).join(" / ")),
              h("h3", {}, product.name || product.title || ""),
              h("p", {}, cc.desc || product.desc || ""),
              h("strong", {}, cc.specs || (Array.isArray(product.materials) ? product.materials.join(" · ") : "")),
              h("span", { className: "home-material-link" }, copy.viewSpecs)));
        }

        function archiveCard(id, index, total) {
          var product = byId[id];
          if (!product) return h("div", { className: "archive-card", key: id || index },
            h("div", { className: "archive-card-content" }, h("h3", {}, String(id)), h("p", { className: "archive-card-summary" }, "…")));
          return h("a", { className: "archive-card", key: id, href: "#" },
            h("div", { className: "archive-visual" },
              product.image ? h("img", { src: absSitePath(lang, product.image), alt: product.name || product.title || "" }) : null,
              h("span", { className: "archive-index" }, String(index + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0"))),
            h("div", { className: "archive-card-content" },
              h("h3", {}, product.name || product.title || ""),
              h("p", { className: "archive-card-summary" }, product.desc || ""),
              archiveGroupNode(copy.materialsLabel, product.materials, "archive-materials", 2),
              archiveGroupNode(copy.craftsLabel, product.crafts, "archive-crafts", 3)));
        }

        function archiveGroupNode(label, values, className, limit) {
          var list = Array.isArray(values) ? values : [];
          return h("div", { className: "archive-tag-group" },
            h("span", { className: "archive-tag-heading" }, label),
            h("div", { className: "archive-tags " + className },
              list.slice(0, limit).map(function (v, i) { return h("span", { className: "archive-chip", key: i }, String(v)); }),
              list.length > limit ? h("span", { className: "archive-chip archive-chip-more" }, "+" + (list.length - limit)) : null));
        }

        var slides = Array.isArray(home.hero_slides) ? home.hero_slides : [];
        var heroImage = "";
        if (slides.length && slides[0].image) heroImage = mode === "home" ? assetUrl(p, slides[0].image) : absSitePath(lang, slides[0].image);
        else if (home.hero_image) heroImage = mode === "home" ? assetUrl(p, home.hero_image) : absSitePath(lang, home.hero_image);

        var heroNode = h("section", { className: "hero hero-fullbleed", key: "hero", style: heroImage ? { backgroundImage: "url('" + heroImage + "')" } : {} },
          h("div", { className: "hero-shade" }),
          h("div", { className: "container hero-content" },
            h("div", { className: "hero-copy" },
              h("p", { className: "eyebrow" }, home["eyebrow_" + lang] || ""),
              h("h1", {}, home["hero_title_" + lang] || ""),
              h("p", { className: "hero-text" }, home["hero_description_" + lang] || ""),
              h("div", { className: "hero-actions" },
                h("span", { className: "button button-dark" }, copy.heroPrimary),
                h("span", { className: "button button-outline" }, copy.heroSecondary)),
              h("div", { className: "hero-note" }, h("span", {}, home["hero_note_" + lang] || "")))));

        var sectionNodes = {
          trust: h("section", { className: "trust-strip", key: "trust" },
            h("div", { className: "container trust-grid" }, copy.trust.map(function (item, i) {
              return h("div", { key: i }, h("strong", {}, item[0]), h("span", {}, item[1]));
            }))),
          featured: h("section", { className: "home-featured-materials section", key: "featured" },
            h("div", { className: "container" },
              h("div", { className: "section-heading compact" },
                h("div", {}, h("p", { className: "eyebrow" }, copy.featuredEyebrow), h("h2", {}, copy.featuredTitle)),
                h("p", { className: "heading-description" }, copy.featuredIntro)),
              showcase.core.length
                ? h("div", { className: "home-material-grid" }, showcase.core.slice(0, 6).map(materialCard))
                : h("p", { className: "preview-empty" }, copy.showcaseEmpty),
              h("div", { className: "home-material-footer" }, h("span", {}, copy.featuredNote), h("span", { className: "text-link" }, copy.featuredAll)))),
          products: h("section", { className: "product-archive-section section", key: "products" },
            h("div", { className: "container" },
              h("div", { className: "section-heading compact" },
                h("div", {}, h("p", { className: "eyebrow" }, copy.archiveEyebrow), h("h2", {}, copy.archiveTitle)),
                h("p", { className: "heading-description" }, copy.archiveIntro)),
              showcase.custom.length
                ? h("div", { className: "product-archive-grid" }, showcase.custom.slice(0, 6).map(function (id, i) { return archiveCard(id, i, Math.min(showcase.custom.length, 6)); }))
                : h("p", { className: "preview-empty" }, copy.showcaseEmpty),
              h("div", { className: "product-archive-more-wrap" }, h("span", { className: "product-archive-more" }, copy.archiveAll)))),
          process: h("section", { className: "process section", key: "process" },
            h("div", { className: "container" },
              h("div", { className: "process-intro" },
                h("p", { className: "eyebrow" }, copy.processEyebrow),
                h("h2", {}, copy.processTitle, h("br", {}), h("em", {}, copy.processTitleEm)),
                h("p", {}, copy.processIntro),
                h("span", { className: "button button-outline" }, copy.processCta)),
              h("div", { className: "steps" }, copy.processSteps.map(function (step, i) {
                return h("div", { className: "step", key: i }, h("span", {}, String(i + 1).padStart(2, "0")), h("h3", {}, step[0]), h("p", {}, step[1]));
              })))),
          knowledge: (function () {
            var picks = showcase.knowledge.map(function (slug) { return bySlug[slug]; });
            var firstCover = picks.length && picks[0] && picks[0].cover ? absSitePath(lang, picks[0].cover) : copy.knowledgeFigure;
            return h("section", { className: "editorial section", key: "knowledge" },
              h("div", { className: "container editorial-grid" },
                h("figure", { className: "editorial-image" }, h("img", { src: firstCover, alt: "" })),
                h("div", { className: "editorial-copy" },
                  h("p", { className: "eyebrow" }, copy.knowledgeEyebrow),
                  h("h2", {}, h("span", { className: "title-line" }, copy.knowledgeTitle), h("em", { className: "title-line" }, copy.knowledgeTitleEm)),
                  h("p", {}, copy.knowledgeIntro),
                  showcase.knowledge.length
                    ? h("div", { className: "knowledge-list" }, showcase.knowledge.slice(0, 5).map(function (slug, i) {
                        var article = bySlug[slug];
                        return h("a", { className: "knowledge-item", key: slug, href: "#" },
                          h("span", {}, String(i + 1).padStart(2, "0")),
                          h("strong", {}, article ? article.title : slug),
                          h("span", {}, "↗"));
                      }))
                    : h("p", { className: "preview-empty" }, copy.showcaseEmpty),
                  h("span", { className: "text-link" }, copy.knowledgeAll))));
          })(),
          about: h("section", { className: "section section-tint", key: "about" },
            h("div", { className: "container" },
              h("div", { className: "section-heading compact" },
                h("div", {}, h("p", { className: "eyebrow" }, copy.aboutEyebrow),
                  h("h2", {}, copy.aboutTitle, h("br", {}), h("em", {}, copy.aboutTitleEm)))),
              h("p", { className: "heading-description" }, copy.aboutIntro),
              h("span", { className: "text-link" }, copy.aboutLink))),
          faq: h("section", { className: "faq section", key: "faq" },
            h("div", { className: "container faq-grid" },
              h("div", {},
                h("p", { className: "eyebrow" }, copy.faqEyebrow),
                h("h2", {}, copy.faqTitle, h("br", {}), h("em", {}, copy.faqTitleEm)),
                h("p", {}, copy.faqIntro)),
              h("div", { className: "faq-list" }, (Array.isArray(home.faq_items) ? home.faq_items : []).map(function (item, i) {
                return h("details", { key: i, open: i === 0 },
                  h("summary", {},
                    h("span", { className: "faq-number" }, String(i + 1).padStart(2, "0")),
                    h("span", { className: "faq-question" }, item["question_" + lang] || ""),
                    h("span", { className: "faq-toggle-icon" }, "+")),
                  h("div", { className: "faq-answer" }, h("p", {}, item["answer_" + lang] || "")));
              }))))
        };

        var modules = home.modules || {};
        var order = Array.isArray(home.module_order) && home.module_order.length
          ? home.module_order
          : ["trust", "products", "process", "knowledge", "about", "faq"];
        var mainChildren = [heroNode];
        var featuredPlaced = false;
        order.forEach(function (key) {
          if (key === "trust" && modules.trust !== false) {
            mainChildren.push(sectionNodes.trust);
            mainChildren.push(sectionNodes.featured);
            featuredPlaced = true;
          } else if (key === "products" && modules.products !== false) {
            mainChildren.push(sectionNodes.products);
          } else if (key === "process" && modules.process !== false) {
            mainChildren.push(sectionNodes.process);
          } else if (key === "knowledge" && modules.knowledge !== false) {
            mainChildren.push(sectionNodes.knowledge);
          } else if (key === "about" && modules.about !== false) {
            mainChildren.push(sectionNodes.about);
          } else if (key === "faq" && modules.faq !== false) {
            mainChildren.push(sectionNodes.faq);
          }
        });
        if (!featuredPlaced) mainChildren.splice(1, 0, sectionNodes.featured);

        var announcementText = global["announcement_" + lang] || copy.announcement;
        return h("div", { className: "site-preview" },
          h("div", { className: "announcement" }, announcementText),
          previewHeader(lang, copy, global),
          h("main", {}, mainChildren),
          previewFooter(lang, copy, global)
        );
      }
    });
  }

  CMS.registerPreviewTemplate("en_products", ProductPreview);
  CMS.registerPreviewTemplate("zh_products", ProductPreview);
  CMS.registerPreviewTemplate("en_solutions", articlePreview());
  CMS.registerPreviewTemplate("zh_solutions", articlePreview());
  CMS.registerPreviewTemplate("en_knowledge", articlePreview());
  CMS.registerPreviewTemplate("zh_knowledge", articlePreview());
  CMS.registerPreviewTemplate("zh_materials", MaterialPreview);
  CMS.registerPreviewTemplate("en_home_page", makeHomepagePreview("en", "home"));
  CMS.registerPreviewTemplate("zh_home_page", makeHomepagePreview("zh", "home"));
  CMS.registerPreviewTemplate("en_site_global", makeHomepagePreview("en", "global"));
  CMS.registerPreviewTemplate("zh_site_global", makeHomepagePreview("zh", "global"));
  CMS.registerPreviewTemplate("en_showcase_core", makeHomepagePreview("en", "core"));
  CMS.registerPreviewTemplate("en_showcase_custom", makeHomepagePreview("en", "custom"));
  CMS.registerPreviewTemplate("en_showcase_knowledge", makeHomepagePreview("en", "knowledge"));
  CMS.registerPreviewTemplate("zh_showcase_core", makeHomepagePreview("zh", "core"));
  CMS.registerPreviewTemplate("zh_showcase_custom", makeHomepagePreview("zh", "custom"));
  CMS.registerPreviewTemplate("zh_showcase_knowledge", makeHomepagePreview("zh", "knowledge"));
  CMS.registerPreviewTemplate("en_shipping_page", ShippingPreview);
  CMS.registerPreviewTemplate("en_about_page", AboutPreview);
  CMS.registerPreviewTemplate("zh_delivery_page", DeliveryPreview);
})();
