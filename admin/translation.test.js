const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("collects flat Chinese/English field pairs and leaves filled translations alone", () => {
  const source = {
    title: "产品标题",
    title_en: "",
    desc: "产品介绍",
    desc_en: "Existing English",
    hero_title_zh: "首页标题",
    hero_title_en: "",
    publish_to: "both"
  };
  const tasks = [];
  const sandbox = { Set, Array, Object };
  vm.runInNewContext(fs.readFileSync("admin/translation.js", "utf8"), {
    window: { CMS: { registerEventListener() {} } },
    document: {},
    console,
    Set, Array, Object,
    Promise,
    fetch() {},
  });
  // The pure collector is exposed by the browser bundle in the test VM.
  const context = {
    window: { CMS: { registerEventListener() {} } },
    document: { createElement() {}, body: { appendChild() {} } },
    console, Set, Array, Object, Promise, fetch() {}
  };
  vm.runInNewContext(fs.readFileSync("admin/translation.js", "utf8"), context);
  context.window.YinzaosuoTranslation.collectTasks(source, source, [], [], false, tasks);
  assert.deepEqual(tasks.map(item => item.targetPath), [["title_en"], ["hero_title_en"]]);
});

test("collects nested detail fields and translated list values", () => {
  const source = {
    detail_zh: { lead: "详情导语", highlights: ["能力一", "能力二"] },
    detail_en: {},
    nav_items: [{ label_zh: "首页", label_en: "" }]
  };
  const tasks = [];
  const context = {
    window: { CMS: { registerEventListener() {} } },
    document: { createElement() {}, body: { appendChild() {} } },
    console, Set, Array, Object, Promise, fetch() {}
  };
  vm.runInNewContext(fs.readFileSync("admin/translation.js", "utf8"), context);
  context.window.YinzaosuoTranslation.collectTasks(source, source, [], [], false, tasks);
  assert.deepEqual(tasks.map(item => item.targetPath), [
    ["detail_en", "lead"],
    ["detail_en", "highlights"],
    ["nav_items", 0, "label_en"]
  ]);
  assert.equal(tasks[1].kind, "list");
});
