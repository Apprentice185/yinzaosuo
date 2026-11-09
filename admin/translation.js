(function () {
  "use strict";

  var TRANSLATION_URL = "https://api.mymemory.translated.net/get";
  var MAX_SEGMENT_BYTES = 450;
  var MAX_CONCURRENT_REQUESTS = 3;
  var PAIRABLE_FIELDS = new Set([
    "title", "name", "desc", "materials", "crafts", "category_title",
    "category_desc", "tag", "summary", "seo_title", "seo_description",
    "body", "type"
  ]);
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

  function collectTasks(source, target, sourcePath, targetPath, sameNameFields, tasks, overwrite) {
    if (typeof source === "string") {
      if ((overwrite || isBlank(target)) && source.trim()) {
        tasks.push({ kind: "text", sourcePath: sourcePath, targetPath: targetPath, text: source });
      }
      return;
    }

    if (Array.isArray(source)) {
      if (source.every(function (item) { return typeof item === "string"; })) {
        if ((overwrite || !Array.isArray(target) || target.length === 0) && source.length) {
          tasks.push({ kind: "list", sourcePath: sourcePath, targetPath: targetPath, values: source.slice() });
        }
        return;
      }
      if (source.every(isPlainObject)) {
        source.forEach(function (item, index) {
          var targetItem = Array.isArray(target) ? target[index] : undefined;
          collectTasks(item, targetItem, sourcePath.concat(index), targetPath.concat(index), false, tasks, overwrite);
        });
      }
      return;
    }

    if (!isPlainObject(source)) return;

    Object.keys(source).forEach(function (key) {
      if (!sameNameFields && key.slice(-3) === "_en") return;
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
        tasks,
        overwrite
      );
    });
  }

  function utf8Length(value) {
    return new TextEncoder().encode(value).length;
  }

  function splitText(text) {
    var remaining = Array.from(text);
    var segments = [];
    while (remaining.length) {
      var current = "";
      var count = 0;
      while (count < remaining.length && utf8Length(current + remaining[count]) <= MAX_SEGMENT_BYTES) {
        current += remaining[count];
        count += 1;
      }
      if (count === remaining.length) {
        segments.push(current);
        break;
      }

      var splitAt = -1;
      for (var i = current.length - 1; i >= Math.floor(current.length * 0.6); i -= 1) {
        if (/[。！？；，.!?;\s]/.test(current[i])) {
          splitAt = i + 1;
          break;
        }
      }
      if (splitAt < 1) splitAt = current.length;
      segments.push(current.slice(0, splitAt));
      remaining = Array.from(current.slice(splitAt)).concat(remaining.slice(count));
    }
    return segments;
  }

  async function translateSegment(text) {
    var url = new URL(TRANSLATION_URL);
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", "zh-CN|en");
    var response;
    try {
      response = await fetch(url.toString());
    } catch (error) {
      throw new Error("无法连接免密翻译服务，请检查网络后重试。");
    }
    var payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("翻译服务返回了无法识别的响应。");
    }
    if (!response.ok || Number(payload.responseStatus) !== 200 || !payload.responseData || !payload.responseData.translatedText) {
      if (response.status === 429 || Number(payload.responseStatus) === 429) {
        throw new Error("免密翻译服务已达到免费额度或暂时限流，请稍后再试。");
      }
      throw new Error(payload.responseDetails || "翻译失败，请稍后重试。");
    }
    var translated = document.createElement("textarea");
    translated.innerHTML = payload.responseData.translatedText;
    return translated.value || payload.responseData.translatedText;
  }

  async function translateTexts(texts, onProgress) {
    var segments = [];
    texts.forEach(function (text, textIndex) {
      splitText(text).forEach(function (segment) {
        segments.push({ text: segment, textIndex: textIndex });
      });
    });

    var results = new Array(segments.length);
    var nextIndex = 0;
    var completed = 0;
    async function runWorker() {
      while (nextIndex < segments.length) {
        var index = nextIndex;
        nextIndex += 1;
        var result = await translateSegment(segments[index].text);
        results[index] = result;
        completed += 1;
        if (onProgress) onProgress(completed, segments.length);
      }
    }
    await Promise.all(Array.from(
      { length: Math.min(MAX_CONCURRENT_REQUESTS, segments.length) },
      runWorker
    ));

    var translatedTexts = texts.map(function () { return ""; });
    segments.forEach(function (segment, index) {
      translatedTexts[segment.textIndex] += results[index];
    });
    return translatedTexts;
  }

  async function translateText(text) {
    var translated = await translateTexts([text]);
    return translated[0];
  }

  function toPlain(value) {
    return value && typeof value.toJS === "function" ? value.toJS() : value;
  }

  async function translateEntryData(data) {
    var plain = toPlain(data);
    var tasks = [];
    collectTasks(plain, plain, [], [], false, tasks, true);
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

    showStatus("英文译文已更新，请检查后保存。", "success");
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
    collectTasks(snapshot.data, snapshot.data, [], [], false, tasks, true);
    if (!tasks.length) {
      showStatus("没有发现需要补充的英文内容。", "success");
      return { translated: 0, skipped: true };
    }

    var texts = [];
    tasks.forEach(function (task) {
      if (task.kind === "text") texts.push(task.text);
      else texts = texts.concat(task.values);
    });
    showStatus("正在翻译 " + texts.length + " 项英文内容…", "working");
    var translatedTexts = await translateTexts(texts, function (completed, total) {
      showStatus("正在翻译英文内容（" + completed + "/" + total + "）…", "working");
    });
    var translatedIndex = 0;
    var patches = tasks.map(function (task) {
      var translated;
      if (task.kind === "text") {
        translated = translatedTexts[translatedIndex];
        translatedIndex += 1;
      } else {
        translated = translatedTexts.slice(translatedIndex, translatedIndex + task.values.length);
        translatedIndex += task.values.length;
      }
      return {
        path: task.targetPath.join("."),
        value: translated
      };
    });

    var result = window.CMS.editor.applyFieldPatch(patches);
    if (result && result.rejected && result.rejected.length) {
      throw new Error("部分英文栏位无法写入：" + result.rejected.map(function (item) { return item.path; }).join("、"));
    }
    showStatus("翻译完成，英文内容已更新；请检查后点击“保存”。", "success");
    return { translated: patches.length, result: result };
  }

  // Translation runs only when the user clicks the translation button.
  // Do not hook preSave: network translation must never block ordinary saves.

  window.YinzaosuoTranslation = {
    collectTasks: collectTasks,
    pairableFields: Array.from(PAIRABLE_FIELDS),
    translateCurrentEntry: translateCurrentEntry,
    translateText: translateText,
    showStatus: showStatus
  };
})();
