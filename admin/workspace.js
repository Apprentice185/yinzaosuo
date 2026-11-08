(function () {
  "use strict";

  var root = document.getElementById("nc-root");
  var actionBar = null;
  var statusButton = null;
  var busy = false;

  function text(node) {
    return (node && (node.innerText || node.textContent) || "").replace(/\\s+/g, " ").trim();
  }

  function findStatus() {
    if (!root) return null;
    var nodes = root.querySelectorAll("button,[role='button']");
    for (var i = 0; i < nodes.length; i++) {
      var label = text(nodes[i]);
      if (/^(已发布|未发布|Published|Unpublished|草稿|Draft)$/.test(label)) return nodes[i];
    }
    return null;
  }

  function translate() {
    var api = window.YinzaosuoTranslation;
    if (!api || typeof api.translateText !== "function" || busy) return;
    var controls = Array.from(root.querySelectorAll("input[name],textarea[name],[contenteditable='true'][name]"))
      .filter(function (el) { return !el.disabled && !el.readOnly && !/^(hidden|file|checkbox|radio|number)$/.test(el.type || ""); });
    var byName = new Map();
    controls.forEach(function (el) {
      if (!byName.has(el.name)) byName.set(el.name, []);
      byName.get(el.name).push(el);
    });
    var jobs = [];
    byName.forEach(function (sources, name) {
      var targetName = name.replace(/_zh(?=\\.|\\[|$)/g, "_en");
      if (targetName === name) {
        if (!/^(title|name|desc|materials|crafts|category_title|category_desc|tag|summary|body|type)$/.test(name)) return;
        targetName = name + "_en";
      }
      var targets = byName.get(targetName) || [];
      sources.forEach(function (source, i) {
        var target = targets[i];
        var value = (source.value || source.innerText || "").trim();
        var existing = target && (target.value || target.innerText || "").trim();
        if (target && value && !existing) jobs.push({ target: target, value: value });
      });
    });
    if (!jobs.length) { api.showStatus("没有需要补充的英文内容；已有译文不会覆盖。", "success"); return; }
    busy = true;
    var button = actionBar && actionBar.querySelector("[data-action=translate]");
    if (button) { button.disabled = true; button.textContent = "翻译中…"; }
    (async function () {
      try {
        for (var i = 0; i < jobs.length; i++) {
          api.showStatus("正在翻译 " + (i + 1) + "/" + jobs.length, "working");
          var result = await api.translateText(jobs[i].value);
          var el = jobs[i].target;
          var proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, "value").set.call(el, result);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        api.showStatus("翻译完成，请检查后保存。", "success");
      } catch (error) {
        api.showStatus(error.message || "翻译失败", "error");
      } finally {
        busy = false;
        if (button) { button.disabled = false; button.textContent = "填入翻译内容"; }
      }
    })();
  }

  function save() {
    if (!statusButton || !statusButton.isConnected) statusButton = findStatus();
    if (!statusButton) { window.alert("暂时没有找到保存入口，请稍后重试。"); return; }
    statusButton.click();
    window.setTimeout(function () {
      var items = document.querySelectorAll("[role='menuitem'],[role='option'],button");
      for (var i = 0; i < items.length; i++) {
        if (/^(立即)?发布$|^Publish( now)?$/i.test(text(items[i]))) {
          items[i].click();
          return;
        }
      }
      window.alert("没有找到保存操作，内容尚未提交。");
    }, 120);
  }

  function mount() {
    if (!root) return;
    var status = findStatus();
    if (!status || !status.parentElement) return;
    if (actionBar && actionBar.isConnected && statusButton === status) return;
    if (actionBar) actionBar.remove();
    statusButton = status;
    status.classList.add("yinzaosuo-native-status-hidden");
    var siblings = Array.from(status.parentElement.querySelectorAll("button,[role='button']"));
    siblings.forEach(function (node) {
      if (/^(删除内容|Delete entry|Delete)$/i.test(text(node))) node.classList.add("yinzaosuo-native-delete-hidden");
    });
    actionBar = document.createElement("div");
    actionBar.className = "yinzaosuo-editor-actions";
    var saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "保存";
    saveButton.addEventListener("click", save);
    var translateButton = document.createElement("button");
    translateButton.type = "button";
    translateButton.dataset.action = "translate";
    translateButton.textContent = "填入翻译内容";
    translateButton.addEventListener("click", translate);
    actionBar.append(saveButton, translateButton);
    status.insertAdjacentElement("afterend", actionBar);
  }

  function retryMount() {
    [0, 400, 1000, 2200].forEach(function (delay) { window.setTimeout(mount, delay); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", retryMount, { once: true });
  else retryMount();
  window.addEventListener("hashchange", function () { actionBar = null; statusButton = null; retryMount(); });
})();