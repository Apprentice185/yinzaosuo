(function () {
  "use strict";
  var ACTION_KEY = "yinzaosuo-admin-entry-action";
  var root = document.getElementById("nc-root");
  var editorActions = document.getElementById("admin-editor-actions");
  var translateButton = document.getElementById("admin-translate-button");
  var publishButton = document.getElementById("admin-publish-button");
  var translating = false;
  var pendingProcessed = false;
  var formDirty = false;
  var formSnapshot = null;

  function textOf(node) {
    return (node && (node.innerText || node.textContent) || "").replace(/\s+/g, " ").trim();
  }
  function findButton(scope, matcher) {
    return Array.prototype.slice.call((scope || document).querySelectorAll("button,[role='menuitem']"))
      .find(function (node) { return matcher(textOf(node)); });
  }
  function isEditorScreen() {
    if (!root) return false;
    // Decap versions differ in their internal class names. Detect the editor by
    // its route and actual editable controls rather than relying on one CSS class.
    var hash = window.location.hash || "";
    if (/\/entries\/[^/?#]+/.test(hash)) return true;
    if (root.querySelector(".nc-entryEditor,[class*='EntryEditor'],[data-testid*='entry-editor']")) return true;
    return !!root.querySelector("input[name],textarea[name],[contenteditable='true']");
  }
  function nativePublishButton() {
    var toolbar = root && (root.querySelector(".nc-entryEditor-toolbar") || root);
    return findButton(toolbar, function (text) {
      return /^(已发布|发布|Published|Publish|未发布|Unpublished)$/i.test(text);
    });
  }
  function hideNativePublishControl() {
    var native = nativePublishButton();
    if (!native) return null;
    // Hide the complete status/dropdown group, while retaining the hidden trigger for programmatic publishing.
    var wrapper = native;
    for (var i = 0; i < 4 && wrapper.parentElement && wrapper.parentElement !== root; i++) {
      var parent = wrapper.parentElement;
      var buttons = parent.querySelectorAll("button,[role='button']");
      if (buttons.length > 2) break;
      wrapper = parent;
      if (/已发布|发布|Published|Publish|未发布|Unpublished/i.test(textOf(wrapper))) break;
    }
    wrapper.classList.add("yinzaosuo-native-publish-hidden");
    native.classList.add("yinzaosuo-native-publish-hidden");
    return native;
  }
  function readFormSnapshot() {
    return Array.prototype.map.call(root.querySelectorAll("input[name],textarea[name],select[name],[contenteditable='true']"), function (node) {
      var key = node.name || node.getAttribute("data-testid") || "editable";
      var value = node.isContentEditable ? node.innerHTML : (node.type === "checkbox" || node.type === "radio" ? String(node.checked) : node.value);
      return key + "=" + String(value == null ? "" : value);
    }).join("\n");
  }
  function updateDirtyState() {
    if (formSnapshot !== null) formDirty = readFormSnapshot() !== formSnapshot;
  }
  function updateToolbar() {
    if (editorActions) editorActions.hidden = !isEditorScreen();
    if (publishButton) publishButton.disabled = !formDirty;
    hideNativePublishControl();
  }
  function captureEditorBaseline() {
    if (!isEditorScreen()) return;
    window.setTimeout(function () {
      formSnapshot = readFormSnapshot();
      formDirty = false;
      updateToolbar();
    }, 600);
  }
  function runNativePublish() {
    var trigger = nativePublishButton();
    if (!trigger || (publishButton && publishButton.disabled)) return;
    trigger.click();
    window.setTimeout(function () {
      var option = findButton(document, function (text) {
        return /^(立即)?发布$|^Publish( now)?$/i.test(text);
      });
      if (option) {
        option.click();
        window.setTimeout(function () {
          formSnapshot = readFormSnapshot();
          formDirty = false;
          updateToolbar();
        }, 1400);
      } else {
        window.alert("没有找到 Decap 的“发布”操作，内容尚未提交。");
      }
    }, 180);
  }
  function setControlValue(control, value) {
    var proto = control.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (!descriptor || !descriptor.set) return;
    descriptor.set.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function targetName(name) {
    if (name.slice(-3) === "_zh") return name.slice(0, -3) + "_en";
    var pairable = ["title","name","desc","materials","crafts","category_title","category_desc","tag","summary","body","type"];
    var dot = name.indexOf(".");
    var bracket = name.indexOf("[");
    var cut = dot < 0 ? bracket : (bracket < 0 ? dot : Math.min(dot, bracket));
    var base = cut < 0 ? name : name.slice(0, cut);
    var suffix = cut < 0 ? "" : name.slice(cut);
    if (base.slice(-3) === "_zh") return base.slice(0, -3) + "_en" + suffix;
    if (pairable.indexOf(base) !== -1) return base + "_en" + suffix;
    if (pairable.indexOf(name) !== -1) return name + "_en";
    return null;
  }
  function controlsByName() {
    var map = new Map();
    root.querySelectorAll("input[name],textarea[name]").forEach(function (control) {
      if (!map.has(control.name)) map.set(control.name, []);
      map.get(control.name).push(control);
    });
    return map;
  }
  async function translateForm() {
    var api = window.YinzaosuoTranslation;
    if (!api || typeof api.translateText !== "function") throw new Error("翻译服务尚未加载，请刷新后台后重试。");
    var controls = controlsByName();
    var jobs = [];
    controls.forEach(function (sources, name) {
      var target = targetName(name);
      if (!target || !controls.has(target)) return;
      sources.forEach(function (source, index) {
        var dest = controls.get(target)[index];
        var value = (source.value || "").trim();
        if (value && dest && !(dest.value || "").trim() && !source.disabled) jobs.push({ target: dest, value: value });
      });
    });
    if (!jobs.length) {
      api.showStatus("没有发现需要补充的英文输入项，已有英文内容不会覆盖。", "success");
      return;
    }
    for (var i = 0; i < jobs.length; i++) {
      api.showStatus("正在翻译（" + (i + 1) + "/" + jobs.length + "）…", "working");
      setControlValue(jobs[i].target, await api.translateText(jobs[i].value));
    }
    api.showStatus("翻译完成，英文已填入对应输入框。请检查后点击发布保存。", "success");
  }
  if (translateButton) translateButton.addEventListener("click", async function () {
    if (translating) return;
    translating = true;
    translateButton.disabled = true;
    translateButton.textContent = "翻译中…";
    try { await translateForm(); }
    catch (error) {
      if (window.YinzaosuoTranslation) window.YinzaosuoTranslation.showStatus(error.message || "翻译失败", "error");
      window.alert(error.message || "翻译失败，请稍后重试。");
    } finally {
      translating = false;
      translateButton.textContent = "一键翻译";
      updateToolbar();
      translateButton.disabled = false;
    }
  });
  if (publishButton) publishButton.addEventListener("click", runNativePublish);

  function storeAction(action, href, value) {
    sessionStorage.setItem(ACTION_KEY, JSON.stringify({ action: action, href: href, value: value, createdAt: Date.now() }));
  }
  function openEntryForAction(action, anchor) {
    var href = anchor.getAttribute("href");
    if (!href) return;
    var value = null;
    if (action === "order") {
      value = window.prompt("请输入新的排序数字（数字越小越靠前）", "10");
      if (value === null || value.trim() === "" || !Number.isFinite(Number(value))) return;
      value = Number(value);
    }
    storeAction(action, anchor.href, value);
    anchor.click();
  }
  function addCardActions() {
    if (!root) return;
    root.querySelectorAll("a[href*='/collections/'][href*='/entries/']").forEach(function (anchor) {
      var card = anchor.closest("li") || anchor.parentElement;
      if (!card || card.querySelector(".yinzaosuo-entry-actions")) return;
      card.classList.add("yinzaosuo-entry-card");
      var actions = document.createElement("div");
      actions.className = "yinzaosuo-entry-actions";
      [["delete","删除"],["duplicate","复制"],["order","调顺序"]].forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = item[1];
        button.addEventListener("click", function (event) {
          event.preventDefault(); event.stopPropagation();
          openEntryForAction(item[0], anchor);
        });
        actions.appendChild(button);
      });
      card.appendChild(actions);
    });
  }
  function clickNativeEntryAction(action) {
    if (action === "delete") {
      var del = findButton(root, function (text) { return /^删除(内容|条目)?$|^Delete$/i.test(text); });
      if (del) del.click(); else window.alert("没有找到删除按钮，请在编辑页面操作。");
    } else if (action === "duplicate") {
      var trigger = nativePublishButton();
      if (!trigger) { window.alert("没有找到复制入口，请在编辑页面打开发布菜单。"); return; }
      trigger.click();
      window.setTimeout(function () {
        var duplicate = findButton(document, function (text) { return /^(复制|复制内容|Duplicate)$/i.test(text); });
        if (duplicate) duplicate.click(); else window.alert("没有找到复制选项，请检查发布菜单。");
      }, 180);
    }
  }
  function processPendingAction() {
    if (pendingProcessed) return;
    var raw = sessionStorage.getItem(ACTION_KEY);
    if (!raw) return;
    var pending;
    try { pending = JSON.parse(raw); } catch (error) { sessionStorage.removeItem(ACTION_KEY); return; }
    if (!pending || Date.now() - pending.createdAt > 120000) { sessionStorage.removeItem(ACTION_KEY); return; }
    if (pending.href && window.location.href !== pending.href) return;
    if (pending.action === "order") {
      var field = root.querySelector('input[name="sort_order"],input[name$=".sort_order"]');
      if (!field) return;
      pendingProcessed = true;
      sessionStorage.removeItem(ACTION_KEY);
      setControlValue(field, String(pending.value));
      window.setTimeout(runNativePublish, 350);
      return;
    }
    pendingProcessed = true;
    sessionStorage.removeItem(ACTION_KEY);
    clickNativeEntryAction(pending.action);
  }
  function refreshWorkspace() {
    updateToolbar();
    addCardActions();
    processPendingAction();
  }
  function start() {
    if (!root) return;
    function handleEdit(event) {
      if (event.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable)) {
        updateDirtyState();
        updateToolbar();
      }
    }
    root.addEventListener("input", handleEdit, true);
    root.addEventListener("change", handleEdit, true);
    window.addEventListener("hashchange", function () {
      formSnapshot = null;
      formDirty = false;
      refreshWorkspace();
      captureEditorBaseline();
    });
    refreshWorkspace();
    captureEditorBaseline();
    var observer = new MutationObserver(refreshWorkspace);
    observer.observe(root, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();