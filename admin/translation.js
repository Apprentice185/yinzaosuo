(function () {
  "use strict";

  var WORKER_URL = "https://yinzaosuo-translation.xiaotanqingqing.workers.dev/translate";
  var TURNSTILE_SITE_KEY = "0x4AAAAAAF4lYL1edV-STb8i";
  var PAIRABLE_FIELDS = new Set([
    "title", "name", "desc", "materials", "crafts", "category_title",
    "category_desc", "tag", "summary", "body", "type"
  ]);
  var widgetId = null;
  var tokenResolver = null;
  var tokenRejecter = null;
  var scriptPromise = null;
  var statusNode = null;

  function showStatus(message, state) {
    if (!statusNode) {
      statusNode = document.createElement("div");
      statusNode.id = "translation-status";
      statusNode.setAttribute("role", "status");
      statusNode.setAttribute("aria-live", "polite");
      document.body.appendChild(statusNode);
    }
    statusNode.textContent = message;
    statusNode.setAttribute("data-state", state || "info");
    statusNode.style.display = "block";
  }

  function hideStatus() {
    if (statusNode) statusNode.style.display = "none";
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isBlank(value) {
    return value === undefined || value === null || value === "" ||
      (typeof value === "string" && value.trim() === "");
  }

  function collectTasks(source, target, sourcePath, targetPath, sameNameFields, tasks) {
    if (typeof source === "string") {
      if (isBlank(target) && source.trim()) {
        tasks.push({ kind: "text", sourcePath: sourcePath, targetPath: targetPath, text: source });
      }
      return;
    }

    if (Array.isArray(source)) {
      if (source.every(function (item) { return typeof item === "string"; })) {
        if ((!Array.isArray(target) || target.length === 0) && source.length) {
          tasks.push({ kind: "list", sourcePath: sourcePath, targetPath: targetPath, values: source.slice() });
        }
        return;
      }
      if (source.every(isPlainObject)) {
        source.forEach(function (item, index) {
          var targetItem = Array.isArray(target) ? target[index] : undefined;
          collectTasks(item, targetItem, sourcePath.concat(index), targetPath.concat(index), false, tasks);
        });
      }
      return;
    }

    if (!isPlainObject(source)) return;

    Object.keys(source).forEach(function (key) {
      var targetKey = null;
      if (key.slice(-3) === "_zh") {
        targetKey = key.slice(0, -3) + "_en";
      } else if (PAIRABLE_FIELDS.has(key)) {
        targetKey = key + "_en";
      } else if (sameNameFields || (isPlainObject(target) && Object.prototype.hasOwnProperty.call(target, key))) {
        targetKey = key;
      }
      if (!targetKey) return;

      var sourceValue = source[key];
      var targetValue = isPlainObject(target) ? target[targetKey] : undefined;
      var nestedPair = key.slice(-3) === "_zh" || targetKey.slice(-3) === "_en";
      collectTasks(
        sourceValue,
        targetValue,
        sourcePath.concat(key),
        targetPath.concat(targetKey),
        nestedPair || (sameNameFields && targetKey === key),
        tasks
      );
    });
  }

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("安全验证组件加载失败，请刷新后台重试。")); };
      document.head.appendChild(script);
    });
    return scriptPromise;
  }

  function getTurnstileToken() {
    return loadTurnstile().then(function () {
      var container = document.getElementById("translation-turnstile");
      if (!container) {
        container = document.createElement("div");
        container.id = "translation-turnstile";
        container.style.position = "fixed";
        container.style.right = "18px";
        container.style.bottom = "18px";
        container.style.zIndex = "99999";
        document.body.appendChild(container);
      }

      return new Promise(function (resolve, reject) {
        var timeout = window.setTimeout(function () {
          tokenResolver = null;
          tokenRejecter = null;
          reject(new Error("安全验证超时，请再次点击保存。"));
        }, 120000);

        tokenResolver = function (token) {
          window.clearTimeout(timeout);
          tokenResolver = null;
          tokenRejecter = null;
          resolve(token);
        };
        tokenRejecter = function (error) {
          window.clearTimeout(timeout);
          tokenResolver = null;
          tokenRejecter = null;
          reject(error);
        };

        if (widgetId === null) {
          widgetId = window.turnstile.render(container, {
            sitekey: TURNSTILE_SITE_KEY,
            execution: "execute",
            appearance: "interaction-only",
            callback: function (token) {
              if (tokenResolver) tokenResolver(token);
            },
            "error-callback": function () {
              if (tokenRejecter) tokenRejecter(new Error("安全验证未通过，请重试。"));
            },
            "expired-callback": function () {
              if (tokenRejecter) tokenRejecter(new Error("安全验证已过期，请重试。"));
            }
          });
        } else {
          window.turnstile.reset(widgetId);
        }
        window.turnstile.execute(widgetId);
      });
    });
  }

  async function translateText(text) {
    var token = await getTurnstileToken();
    var response;
    try {
      response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Turnstile-Token": token
        },
        body: JSON.stringify({
          text: text,
          sourceLanguage: "Chinese",
          targetLanguage: "English"
        })
      });
    } catch (error) {
      throw new Error("无法连接翻译服务，请检查网络后重试。");
    }

    var payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("翻译服务返回了无法识别的响应。");
    }
    if (!response.ok || !payload.translatedText) {
      throw new Error(payload.error || "翻译失败，请稍后重试。");
    }
    return payload.translatedText;
  }

  function toPlain(value) {
    return value && typeof value.toJS === "function" ? value.toJS() : value;
  }

  async function translateEntryData(data) {
    var plain = toPlain(data);
    var tasks = [];
    collectTasks(plain, plain, [], [], false, tasks);
    if (!tasks.length) return data;

    showStatus("正在检查中文内容并补全英文译文…", "working");
    var translated = [];
    for (var i = 0; i < tasks.length; i += 1) {
      var task = tasks[i];
      if (task.kind === "text") {
        showStatus("正在翻译英文内容（" + (i + 1) + "/" + tasks.length + "）…", "working");
        translated.push(await translateText(task.text));
      } else {
        var values = [];
        for (var j = 0; j < task.values.length; j += 1) {
          showStatus("正在翻译列表内容（" + (i + 1) + "/" + tasks.length + "，" + (j + 1) + "/" + task.values.length + "）…", "working");
          values.push(await translateText(task.values[j]));
        }
        translated.push(values);
      }
    }

    var updated = data;
    tasks.forEach(function (task, index) {
      var value = translated[index];
      if (task.kind === "list") {
        var sourceList = updated.getIn(task.sourcePath);
        if (sourceList && typeof sourceList.map === "function") {
          var cursor = 0;
          value = sourceList.map(function () {
            var result = valueFromArray(translated[index], cursor);
            cursor += 1;
            return result;
          });
        }
      }
      updated = updated.setIn(task.targetPath, value);
    });

    showStatus("英文译文已填入空白字段，正在保存内容…", "success");
    return updated;
  }

  function valueFromArray(values, index) {
    return values[index];
  }


  async function translateCurrentEntry() {
    if (!window.CMS || !window.CMS.editor || typeof window.CMS.editor.getCurrentEntry !== "function") {
      throw new Error("当前后台版本不支持独立翻译，请刷新页面后重试。");
    }
    var snapshot = window.CMS.editor.getCurrentEntry();
    if (!snapshot || !snapshot.data) throw new Error("请先打开一条内容，再使用一键翻译。");

    var tasks = [];
    collectTasks(snapshot.data, snapshot.data, [], [], false, tasks);
    if (!tasks.length) {
      showStatus("没有发现需要补充的英文内容。", "success");
      return { translated: 0, skipped: true };
    }

    var patches = [];
    for (var i = 0; i < tasks.length; i += 1) {
      var task = tasks[i];
      var translated;
      if (task.kind === "text") {
        showStatus("正在翻译英文内容（" + (i + 1) + "/" + tasks.length + "）…", "working");
        translated = await translateText(task.text);
      } else {
        translated = [];
        for (var j = 0; j < task.values.length; j += 1) {
          showStatus("正在翻译列表内容（" + (i + 1) + "/" + tasks.length + "，" + (j + 1) + "/" + task.values.length + "）…", "working");
          translated.push(await translateText(task.values[j]));
        }
      }
      patches.push({
        path: task.targetPath.join("."),
        value: translated
      });
    }

    var result = window.CMS.editor.applyFieldPatch(patches);
    if (result && result.rejected && result.rejected.length) {
      throw new Error("部分英文栏位无法写入：" + result.rejected.map(function (item) { return item.path; }).join("、"));
    }
    showStatus("翻译完成，英文内容已填入表单；请检查后点击“发布”保存。", "success");
    return { translated: patches.length, result: result };
  }

  if (!window.CMS || typeof window.CMS.registerEventListener !== "function") {
    console.error("[印造所翻译] Decap CMS 事件接口不可用。");
    return;
  }

  window.CMS.registerEventListener({
    name: "preSave",
    handler: async function (context) {
      var entry = context && context.entry;
      var data = entry && entry.get && entry.get("data");
      if (!data || typeof data.toJS !== "function" || typeof data.setIn !== "function") return;
      try {
        return await translateEntryData(data);
      } catch (error) {
        console.error("[印造所翻译]", error);
        showStatus("自动翻译未完成：" + (error.message || "未知错误") + " 中文内容仍会继续保存；英文可稍后补译。", "error");
        return data;
      }
    }
  });

  window.YinzaosuoTranslation = {
    collectTasks: collectTasks,
    pairableFields: Array.from(PAIRABLE_FIELDS),
    translateCurrentEntry: translateCurrentEntry,
    translateText: translateText,
    showStatus: showStatus
  };
})();
