(function () {
  "use strict";

  var root = document.getElementById("nc-root");
  var ACTION_KEY = "yinzaosuo-admin-entry-action";
  var injectedActions = null;
  var nativeStatusButton = null;
  var formSnapshot = null;
  var formDirty = false;
  var publishing = false;
  var translating = false;
  var baselineTimer = null;
  var baselineRoute = null;
  var publishTimer = null;
  var observer = null;

  function cleanText(node) {
    return (node && (node.innerText || node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function isStatusButton(node) {
    return [cleanText(node), node && node.getAttribute("aria-label"), node && node.getAttribute("title")]
      .filter(Boolean).some(function (value) {
        return /^(已发布|未发布|发布|Published|Unpublished|Publish|Draft|草稿)$/i.test(value.trim());
      });
  }

  function findNativeStatusButton() {
    if (!root) return null;
    var candidates = Array.prototype.slice.call(root.querySelectorAll("button,[role='button']"));
    for (var i = 0; i < candidates.length; i += 1) {
      var candidate = candidates[i];
      if (candidate.closest(".yinzaosuo-editor-actions")) continue;
      if (candidate.disabled || !isStatusButton(candidate)) continue;
      // The status control is unique to the entry editor. Do not require the
      // delete action to share an ancestor: Decap versions render these in
      // separate toolbar containers, which previously prevented injection.
      return candidate;
    }
    return null;
  }

  function isEditorScreen() {
    if (!root) return false;
    var status = findNativeStatusButton();
    var hasFields = !!root.querySelector("input[name],textarea[name],select[name],[contenteditable='true']");
    return !!status && hasFields;
  }

  function readFormSnapshot() {
    if (!root) return "";
    var controls = Array.prototype.slice.call(root.querySelectorAll("input:not([type='file']),textarea,select,[contenteditable='true']"));
    return controls.map(function (node, index) {
      var value;
      if (node.isContentEditable) value = node.innerHTML;
      else if (node.type === "checkbox" || node.type === "radio") value = String(node.checked);
      else if (node.tagName === "SELECT" && node.multiple) {
        value = Array.prototype.map.call(node.selectedOptions, function (option) { return option.value; }).join(",");
      } else value = node.value;
      return [
        node.name || node.getAttribute("data-testid") || node.getAttribute("aria-label") || "control",
        node.type || node.tagName,
        index,
        String(value == null ? "" : value)
      ].join("::");
    }).join("\n");
  }

  function updateDirtyState() {
    if (formSnapshot !== null) formDirty = readFormSnapshot() !== formSnapshot;
    updateButtonStates();
  }

  function updateButtonStates() {
    if (!injectedActions) return;
    var translate = injectedActions.querySelector('[data-action="translate"]');
    var publish = injectedActions.querySelector('[data-action="publish"]');
    if (translate) {
      translate.disabled = translating;
      translate.textContent = translating ? "翻译中…" : "一键翻译";
    }
    if (publish) {
      publish.disabled = !formDirty || publishing;
      publish.textContent = publishing ? "发布中…" : "发布";
      publish.setAttribute("aria-disabled", String(publish.disabled));
    }
  }

  function setBaseline() {
    if (!isEditorScreen()) return;
    formSnapshot = readFormSnapshot();
    formDirty = false;
    updateButtonStates();
  }

  function scheduleBaseline() {
    var route = window.location.hash || window.location.pathname;
    if (route === baselineRoute && formSnapshot !== null) return;
    baselineRoute = route;
    if (baselineTimer) window.clearTimeout(baselineTimer);
    formSnapshot = null;
    formDirty = false;
    baselineTimer = window.setTimeout(function () {
      if (isEditorScreen()) setBaseline();
    }, 900);
  }

  function injectEditorActions(statusButton) {
    if (!statusButton || !statusButton.parentElement) return;
    if (injectedActions && injectedActions.isConnected && nativeStatusButton === statusButton) {
      statusButton.classList.add("yinzaosuo-native-status-hidden");
      updateButtonStates();
      return;
    }
    removeEditorActions();
    nativeStatusButton = statusButton;

    var group = document.createElement("div");
    group.className = "yinzaosuo-editor-actions";
    group.setAttribute("aria-label", "内容操作");

    var translate = document.createElement("button");
    translate.type = "button";
    translate.dataset.action = "translate";
    translate.textContent = "一键翻译";
    translate.addEventListener("click", runTranslation);

    var publish = document.createElement("button");
    publish.type = "button";
    publish.dataset.action = "publish";
    publish.textContent = "发布";
    publish.addEventListener("click", runPublish);

    group.appendChild(translate);
    group.appendChild(publish);
    statusButton.insertAdjacentElement("afterend", group);
    statusButton.classList.add("yinzaosuo-native-status-hidden");
    injectedActions = group;
    updateButtonStates();
  }

  function removeEditorActions() {
    if (injectedActions && injectedActions.parentElement) injectedActions.parentElement.removeChild(injectedActions);
    if (nativeStatusButton) nativeStatusButton.classList.remove("yinzaosuo-native-status-hidden");
    injectedActions = null;
    nativeStatusButton = null;
  }

  function targetName(name, names) {
    if (names.has(name.slice(0, -3) + "_en") && name.slice(-3) === "_zh") {
      return name.slice(0, -3) + "_en";
    }

    // Support nested object and list fields such as detail_zh.lead and
    // nav_items[0].label_zh, not just top-level *_zh controls.
    var leafMatch = name.match(/(^|[.\\]])([^.[\\]]+)_zh$/);
    if (leafMatch) {
      var nestedCandidate = name.slice(0, name.length - 3) + "_en";
      if (names.has(nestedCandidate)) return nestedCandidate;
    }

    var dot = name.indexOf(".");
    var bracket = name.indexOf("[");
    var cut = dot < 0 ? bracket : (bracket < 0 ? dot : Math.min(dot, bracket));
    var base = cut < 0 ? name : name.slice(0, cut);
    var suffix = cut < 0 ? "" : name.slice(cut);
    var pairable = ["title", "name", "desc", "materials", "crafts", "category", "category_title", "category_desc", "tag", "summary", "body", "type", "announcement", "brand_tagline"];
    var candidate = base.slice(-3) === "_zh" ? base.slice(0, -3) + "_en" + suffix : pairable.indexOf(base) !== -1 ? base + "_en" + suffix : null;
    return candidate && names.has(candidate) ? candidate : null;
  }

  function setControlValue(control, value) {
    if (control.isContentEditable) {
      control.innerHTML = value;
    } else {
      var proto = control.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype :
        control.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      var descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      if (!descriptor || !descriptor.set) return;
      descriptor.set.call(control, value);
    }
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function collectTranslatableControls() {
    var map = new Map();
    root.querySelectorAll("input[name],textarea[name],select[name],[contenteditable='true'][name]").forEach(function (control) {
      if (control.disabled || control.readOnly || ["hidden", "file", "checkbox", "radio", "number"].indexOf(control.type) !== -1) return;
      if (!map.has(control.name)) map.set(control.name, []);
      map.get(control.name).push(control);
    });
    return map;
  }

  async function runTranslation() {
    var api = window.YinzaosuoTranslation;
    if (!api || typeof api.translateText !== "function") {
      window.alert("翻译服务尚未加载，请刷新后台后重试。");
      return;
    }
    if (translating) return;
    translating = true;
    updateButtonStates();
    try {
      var controls = collectTranslatableControls();
      var names = new Set(Array.from(controls.keys()));
      var jobs = [];
      controls.forEach(function (sources, sourceName) {
        var destinationName = targetName(sourceName, names);
        if (!destinationName) return;
        var destinations = controls.get(destinationName) || [];
        sources.forEach(function (source, index) {
          var destination = destinations[index];
          var sourceText = (source.value || source.innerText || "").trim();
          var destinationText = destination ? (destination.value || destination.innerText || "").trim() : "";
          if (sourceText && destination && !destinationText) jobs.push({ target: destination, text: sourceText });
        });
      });
      if (!jobs.length) {
        api.showStatus("没有发现需要补充的英文输入项；已有英文内容不会覆盖。", "success");
        return;
      }
      for (var i = 0; i < jobs.length; i += 1) {
        api.showStatus("正在翻译（" + (i + 1) + "/" + jobs.length + "）…", "working");
        var translated = await api.translateText(jobs[i].text);
        setControlValue(jobs[i].target, translated);
      }
      updateDirtyState();
      api.showStatus("翻译完成，英文已填入对应输入框。请检查后点击发布保存。", "success");
    } catch (error) {
      if (api && api.showStatus) api.showStatus(error.message || "翻译失败", "error");
      window.alert(error.message || "翻译失败，请稍后重试。");
    } finally {
      translating = false;
      updateButtonStates();
    }
  }

  function findPublishMenuItem() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll("[role='menuitem'],button"));
    return candidates.find(function (node) {
      if (node.closest(".yinzaosuo-editor-actions") || node.classList.contains("yinzaosuo-native-status-hidden")) return false;
      return /^(立即)?发布$|^Publish( now)?$/i.test(cleanText(node));
    });
  }

  function runPublish() {
    if (!formDirty || publishing) return;
    var trigger = nativeStatusButton && nativeStatusButton.isConnected ? nativeStatusButton : findNativeStatusButton();
    if (!trigger) {
      window.alert("没有找到 CMS 发布入口，内容尚未提交。");
      return;
    }
    publishing = true;
    document.body.classList.add("yinzaosuo-publish-menu-suppressed");
    updateButtonStates();
    trigger.click();
    window.setTimeout(function () {
      var option = findPublishMenuItem();
      if (!option) {
        document.body.classList.remove("yinzaosuo-publish-menu-suppressed");
        publishing = false;
        updateButtonStates();
        window.alert("没有找到 CMS 的发布操作，内容尚未提交。");
        return;
      }
      option.click();
      window.setTimeout(function () {
        document.body.classList.remove("yinzaosuo-publish-menu-suppressed");
      }, 350);
      if (publishTimer) window.clearTimeout(publishTimer);
      publishTimer = window.setTimeout(function () {
        if (publishing) {
          publishing = false;
          updateButtonStates();
          window.alert("暂时没有收到 CMS 的发布完成确认。请检查发布状态；内容不会被标记为已保存。");
        }
      }, 45000);
    }, 120);
  }

  function registerPublishEvents() {
    if (!window.CMS || typeof window.CMS.registerEventListener !== "function") return;
    window.CMS.registerEventListener({
      name: "postPublish",
      handler: function () {
        if (publishTimer) window.clearTimeout(publishTimer);
        window.setTimeout(function () {
          formSnapshot = readFormSnapshot();
          formDirty = false;
          publishing = false;
          updateButtonStates();
        }, 500);
      }
    });
  }

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
      [["delete", "删除"], ["duplicate", "复制"], ["order", "调顺序"]].forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = item[1];
        button.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          openEntryForAction(item[0], anchor);
        });
        actions.appendChild(button);
      });
      card.appendChild(actions);
    });
  }

  function clickNativeEntryAction(action) {
    if (action === "delete") {
      var del = Array.prototype.slice.call(root.querySelectorAll("button,[role='button']"))
        .find(function (node) { return /^删除(内容|条目)?$|^Delete$/i.test(cleanText(node)); });
      if (del) del.click();
      else window.alert("没有找到删除按钮，请在编辑页面操作。");
    } else if (action === "duplicate") {
      var trigger = nativeStatusButton || findNativeStatusButton();
      if (!trigger) { window.alert("没有找到复制入口。"); return; }
      document.body.classList.add("yinzaosuo-publish-menu-suppressed");
      trigger.click();
      window.setTimeout(function () {
        var duplicate = Array.prototype.slice.call(document.querySelectorAll("[role='menuitem'],button"))
          .find(function (node) { return /^(复制|复制内容|Duplicate)$/i.test(cleanText(node)); });
        document.body.classList.remove("yinzaosuo-publish-menu-suppressed");
        if (duplicate) duplicate.click();
        else window.alert("没有找到复制选项。");
      }, 120);
    }
  }

  function processPendingAction() {
    var raw = sessionStorage.getItem(ACTION_KEY);
    if (!raw || !root) return;
    var pending;
    try { pending = JSON.parse(raw); } catch (error) { sessionStorage.removeItem(ACTION_KEY); return; }
    if (!pending || Date.now() - pending.createdAt > 120000) { sessionStorage.removeItem(ACTION_KEY); return; }
    if (pending.href && window.location.href !== pending.href) return;
    if (pending.action === "order") {
      var field = root.querySelector('input[name="sort_order"],input[name$=".sort_order"]');
      if (!field) return;
      sessionStorage.removeItem(ACTION_KEY);
      setControlValue(field, String(pending.value));
      window.setTimeout(function () { updateDirtyState(); }, 50);
      return;
    }
    sessionStorage.removeItem(ACTION_KEY);
    clickNativeEntryAction(pending.action);
  }

  function refreshWorkspace() {
    if (!root) return;
    var status = findNativeStatusButton();
    if (status && isEditorScreen()) {
      injectEditorActions(status);
      scheduleBaseline();
    } else {
      removeEditorActions();
      if (formSnapshot !== null) {
        formSnapshot = null;
        formDirty = false;
        baselineRoute = null;
      }
    }
    addCardActions();
    processPendingAction();
  }

  function start() {
    if (!root) return;
    root.addEventListener("input", function (event) {
      if (event.target && (event.target.matches("input,textarea,select") || event.target.isContentEditable)) {
        window.setTimeout(updateDirtyState, 0);
      }
    }, true);
    root.addEventListener("change", function (event) {
      if (event.target && event.target.matches("input,textarea,select")) window.setTimeout(updateDirtyState, 0);
    }, true);
    window.addEventListener("hashchange", function () {
      formSnapshot = null;
      formDirty = false;
      baselineRoute = null;
      window.setTimeout(refreshWorkspace, 50);
    });
    registerPublishEvents();
    refreshWorkspace();
    observer = new MutationObserver(function () {
      refreshWorkspace();
      updateDirtyState();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();