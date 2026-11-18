import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const registrations = new Map();
const styles = [];
const CMS = {
  registerPreviewStyle: (path) => styles.push(path),
  registerPreviewTemplate: (name, component) => registrations.set(name, component),
};
const context = {
  window: { CMS },
  CMS,
  createClass: (definition) => definition,
  h: (type, props, ...children) => ({ type, props: props || {}, children }),
};
vm.runInNewContext(readFileSync(new URL("./preview.js", import.meta.url), "utf8"), context);

test("registers shared production styles in the CMS preview iframe", () => {
  assert.ok(styles.includes("/styles.css"));
  assert.ok(styles.includes("/pages.css"));
  assert.ok(styles.includes("/admin/preview.css"));
});

test("registers a custom preview for every content collection and settings file", () => {
  for (const name of [
    "en_products", "en_solutions", "en_knowledge", "en_home_page", "en_site_global", "en_shipping_page", "en_about_page", "en_showcase_core", "en_showcase_custom", "en_showcase_knowledge",
    "zh_products", "zh_solutions", "zh_knowledge", "zh_materials", "zh_delivery_page", "zh_home_page", "zh_site_global", "zh_showcase_core", "zh_showcase_custom", "zh_showcase_knowledge",
  ]) {
    assert.ok(registrations.has(name), "missing preview: " + name);
  }
});

function props(data = {}) {
  return {
    entry: { getIn: (path) => path[0] === "data" ? data[path[1]] : undefined },
    getAsset: (path) => ({ url: "/preview/" + path, path: "/preview/" + path }),
    widgetFor: (name) => name === "body" ? { type: "markdown-body" } : null,
  };
}

test("all preview templates render with partial or empty content", () => {
  const samples = {
    en_products: { id: "YS-GLOSS-PHOTO-PAPER", name: "Gloss Photo Paper", title: "Gloss Photo Paper", detail_gallery: [{ image: "pic/product.jpg" }, { image: "pic/product-2.jpg" }], materials: ["PVC"], detail: { lead: "Lead", highlights: ["Custom sizes"] } },
    zh_products: { id: "YS-PVC-BANNER", name: "PVC 横幅", title: "PVC 横幅", detail_gallery: [{ image: "pic/product.jpg" }], materials: ["铜版纸"], detail: { lead: "产品导语", highlights: ["可定制"] } },
    en_solutions: { title: "Event solution", cover: "pic/cover.jpg", body: "Body" },
    zh_solutions: { title: "活动方案", cover: "pic/cover.jpg", body: "正文" },
    en_knowledge: { title: "Print knowledge", cover: "pic/cover.jpg", body: "Body" },
    zh_knowledge: { title: "印刷知识", cover: "pic/cover.jpg", body: "正文" },
    zh_materials: { title: "开业海报素材", gallery: [{ image: "pic/material.jpg" }], description: "素材介绍" },
    en_home_page: { hero_title_en: "Homepage title", hero_slides: [{ image: "pic/banner.jpg" }] },
    zh_home_page: { hero_title_zh: "首页标题", hero_slides: [{ image: "pic/banner.jpg" }] },
    en_site_global: { announcement_en: "Announcement", contact_email: "hello@example.com" },
    zh_site_global: { announcement_zh: "公告", contact_email: "hello@example.com" },
    en_showcase_core: { products: ["YS-GLOSS-PHOTO-PAPER", "YS-PVC-FOAM-BOARD"] },
    en_showcase_custom: { products: ["YS-KT-BOARD"] },
    en_showcase_knowledge: { articles: ["three-essential-print-production-concepts"] },
    zh_showcase_core: { products: [] },
    zh_showcase_custom: { products: ["YS-GLOSS-PHOTO-PAPER", "YS-PVC-FOAM-BOARD"] },
    zh_showcase_knowledge: { articles: ["three-essential-print-production-concepts"] },
    en_shipping_page: { eyebrow: "SHIPPING", title: "Shipping", intro: "Intro", steps: [{ title: "Step", body: "Body" }], trade_terms: [{ term: "FOB", title: "Term", body: "Body" }], packing: [{ title: "Pack", body: "Body" }], australia_note: "Note" },
    en_about_page: { eyebrow: "ABOUT", title: "About", intro: "Intro", studio_paragraphs: ["Para"], steps: [{ title: "Step", body: "Body" }], audience: [{ title: "Who", body: "Body" }], contact_email: "hello@example.com" },
    zh_delivery_page: { title: "配送时效", intro: "导语", timetable: [{ label: "上午确认", condition: "11:00 前", body: "当天下午送达" }] },
  };

  for (const [name, component] of registrations.entries()) {
    assert.doesNotThrow(() => component.render.call({ props: props(samples[name] || {}) }), name);
  }
});

test("product preview mirrors the live product page", () => {
  const en = registrations.get("en_products");
  const enOut = JSON.stringify(en.render.call({ props: props({
    id: "YS-GLOSS-PHOTO-PAPER", name: "Gloss Photo Paper", title: "Gloss Photo Paper",
    detail_gallery: [{ image: "pic/product.jpg" }, { image: "pic/product-2.jpg" }],
    materials: ["PVC"], detail: { lead: "Lead", highlights: ["Custom sizes"] },
  }) }));
  assert.ok(enOut.includes("/preview/pic/product.jpg"), "gallery first image is the main image");
  assert.ok(enOut.includes("/preview/pic/product-2.jpg"), "second gallery image renders as a thumbnail");
  assert.ok(enOut.includes("product-thumb"), "thumbnail strip present with more than one image");
  assert.ok(enOut.includes("Request a quote"), "price line falls back to Request a quote");
  assert.ok(enOut.includes("Ask about this configuration"), "live quote button copy");
  assert.ok(enOut.includes("Related media"), "related media section for a related-media id");
  assert.ok(enOut.includes("Shipping"), "EN header uses the current English nav");
  assert.ok(!enOut.includes("产品中心"), "EN preview must not show the old Chinese nav");

  const zh = registrations.get("zh_products");
  const zhOut = JSON.stringify(zh.render.call({ props: props({
    id: "YS-PVC-BANNER", name: "PVC 横幅", title: "PVC 横幅",
    detail_gallery: [{ image: "pic/product.jpg" }],
    materials: ["铜版纸"], detail: { lead: "产品导语", highlights: ["可定制"] },
  }) }));
  assert.ok(zhOut.includes("欢迎询价"), "ZH price line");
  assert.ok(zhOut.includes("带着选项去咨询"), "ZH quote button copy");
  assert.ok(zhOut.includes("配送时效"), "ZH header uses the current Chinese nav");
  assert.ok(!zhOut.includes("Shipping"), "ZH preview must not show the English nav");
  assert.ok(!zhOut.includes("product-thumb"), "single-image gallery has no thumbnail strip");

  const legacyOut = JSON.stringify(en.render.call({ props: props({
    id: "YS-KT-BOARD", name: "KT Board", title: "KT Board", detail_image: "pic/legacy.jpg",
  }) }));
  assert.ok(legacyOut.includes("/preview/pic/legacy.jpg"), "legacy detail_image still renders as fallback");
});
