const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("collects flat Chinese/English pairs and skips filled translations by default", () => {
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

test("collects existing English values when overwrite is requested", () => {
  const source = {
    title: "最新中文标题",
    title_en: "Old English title",
    materials: ["新材质"],
    materials_en: ["Old material"]
  };
  const tasks = [];
  const context = {
    window: { CMS: { registerEventListener() {} } },
    document: { createElement() {}, body: { appendChild() {} } },
    console, Set, Array, Object, Promise, fetch() {}
  };
  vm.runInNewContext(fs.readFileSync("admin/translation.js", "utf8"), context);
  context.window.YinzaosuoTranslation.collectTasks(source, source, [], [], false, tasks, true);
  assert.deepEqual(tasks.map(item => item.targetPath), [["title_en"], ["materials_en"]]);
});

test("translates all entry fields with one Turnstile token and one batch request", async () => {
  const patches = [];
  let turnstileRenders = 0;
  let turnstileExecutions = 0;
  let requests = 0;
  let turnstileOptions;
  const context = {
    window: {
      CMS: {
        editor: {
          getCurrentEntry: () => ({
            data: {
              title: "产品标题",
              title_en: "Old title",
              materials: ["特种纸", "烫金"],
              materials_en: ["Old paper", "Old foil"]
            }
          }),
          applyFieldPatch: value => {
            patches.push(...value);
            return {};
          }
        }
      },
      turnstile: {
        render: (_container, options) => {
          turnstileRenders += 1;
          turnstileOptions = options;
          return "widget";
        },
        execute: () => {
          turnstileExecutions += 1;
          turnstileOptions.callback("verified-token");
        },
        reset() {}
      },
      setTimeout,
      clearTimeout
    },
    document: {
      head: { appendChild() {} },
      body: { appendChild() {} },
      getElementById() { return null; },
      createElement() {
        return { style: {}, setAttribute() {} };
      }
    },
    console, Set, Array, Object, Promise,
    fetch: async (_url, options) => {
      requests += 1;
      assert.equal(options.headers["X-Turnstile-Token"], "verified-token");
      assert.deepEqual(JSON.parse(options.body).texts, ["产品标题", "特种纸", "烫金"]);
      return {
        ok: true,
        json: async () => ({ translatedTexts: ["Product title", "Special paper", "Foil stamping"] })
      };
    }
  };
  vm.runInNewContext(fs.readFileSync("admin/translation.js", "utf8"), context);

  await context.window.YinzaosuoTranslation.translateCurrentEntry();

  assert.equal(turnstileRenders, 1);
  assert.equal(turnstileExecutions, 1);
  assert.equal(requests, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(patches)), [
    { path: "title_en", value: "Product title" },
    { path: "materials_en", value: ["Special paper", "Foil stamping"] }
  ]);
});
