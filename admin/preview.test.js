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
    "en_products", "en_solutions", "en_knowledge", "en_home_page", "en_site_global", "en_shipping_page", "en_about_page",
    "zh_products", "zh_solutions", "zh_knowledge", "zh_materials", "zh_delivery_page", "zh_home_page", "zh_site_global",
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
    en_products: { name: "PVC Banner", title: "PVC Banner", detail_image: "pic/product.jpg", materials: ["PVC"], detail: { lead: "Lead", highlights: ["Custom sizes"] } },
    zh_products: { name: "PVC 横幅", title: "PVC 横幅", image: "pic/product.jpg", materials: ["铜版纸"], detail: { lead: "产品导语", highlights: ["可定制"] } },
    en_solutions: { title: "Event solution", cover: "pic/cover.jpg", body: "Body" },
    zh_solutions: { title: "活动方案", cover: "pic/cover.jpg", body: "正文" },
    en_knowledge: { title: "Print knowledge", cover: "pic/cover.jpg", body: "Body" },
    zh_knowledge: { title: "印刷知识", cover: "pic/cover.jpg", body: "正文" },
    zh_materials: { title: "开业海报素材", gallery: [{ image: "pic/material.jpg" }], description: "素材介绍" },
    en_home_page: { hero_title_en: "Homepage title", hero_slides: [{ image: "pic/banner.jpg" }] },
    zh_home_page: { hero_title_zh: "首页标题", hero_slides: [{ image: "pic/banner.jpg" }] },
    en_site_global: { announcement_en: "Announcement", contact_email: "hello@example.com" },
    zh_site_global: { announcement_zh: "公告", contact_email: "hello@example.com" },
    en_shipping_page: { eyebrow: "SHIPPING", title: "Shipping", intro: "Intro", steps: [{ title: "Step", body: "Body" }], trade_terms: [{ term: "FOB", title: "Term", body: "Body" }], packing: [{ title: "Pack", body: "Body" }], australia_note: "Note" },
    en_about_page: { eyebrow: "ABOUT", title: "About", intro: "Intro", studio_paragraphs: ["Para"], steps: [{ title: "Step", body: "Body" }], audience: [{ title: "Who", body: "Body" }], contact_email: "hello@example.com" },
    zh_delivery_page: { title: "配送时效", intro: "导语", timetable: [{ label: "上午确认", condition: "11:00 前", body: "当天下午送达" }] },
  };

  for (const [name, component] of registrations.entries()) {
    assert.doesNotThrow(() => component.render.call({ props: props(samples[name] || {}) }), name);
  }
});
