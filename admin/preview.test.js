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
  for (const name of ["products", "catalogue", "solutions", "knowledge", "news", "templates", "home", "global"]) {
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
    products: { title: "样品产品", image: "pic/product.jpg", materials: ["铜版纸"] },
    catalogue: { name_zh: "PVC 横幅", detail_zh: { lead: "产品导语", highlights: ["可定制"] } },
    solutions: { title: "活动方案", cover_image: "pic/cover.jpg", body: "正文" },
    knowledge: { title: "印刷知识", cover: "pic/cover.jpg", body: "正文" },
    news: { title: "品牌资讯", cover: "pic/cover.jpg", body: "正文" },
    templates: { title: "迎宾牌模板", thumb: "pic/template.jpg" },
    home: { hero_title_zh: "首页标题", hero_slides: [{ image: "pic/banner.jpg" }] },
    global: { announcement_zh: "公告", contact_email: "hello@example.com" },
  };

  for (const [name, component] of registrations.entries()) {
    assert.doesNotThrow(() => component.render.call({ props: props(samples[name] || {}) }), name);
  }
});
