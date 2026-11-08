(function () {
  "use strict";

  var root = document.getElementById("nc-root");
  var actionBar = null;
  var nativeSaveButton = null;
  var saveObserver = null;
  var pendingAction = null;
  var pendingActionTimer = null;

  function text(node) {
    return (node && (node.innerText || node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function findButton(pattern, scope) {
    var nodes = (scope || root).querySelectorAll("button,[role='button'],[role='menuitem']");
    for (var i = 0; i < nodes.length; i++) {
      if (pattern.test(text(nodes[i]))) return nodes[i];
    }
    return null;
  }

  function findStatus() {
    return findButton(/^(已发布|未发布|Published|Unpublished|草稿|Draft)$/);
  }

  function findNativeSave() {
    return findButton(/^(保存|Save)$/);
  }

  function syncSaveState() {
    if (!actionBar || !nativeSaveButton) return;
    var button = actionBar.querySelector("[data-action=save]");
    button.disabled = nativeSaveButton.disabled;
    button.setAttribute("aria-disabled", String(nativeSaveButton.disabled));
  }

  function save() {
    if (nativeSaveButton && !nativeSaveButton.disabled) nativeSaveButton.click();
  }

  async function translate() {
    var api = window.YinzaosuoTranslation;
    var button = actionBar && actionBar.querySelector("[data-action=translate]");
    if (!api || typeof api.translateCurrentEntry !== "function" || !button || button.disabled) return;
    button.disabled = true;
    button.textContent = "翻译中…";
    try {
      await api.translateCurrentEntry();
    } catch (error) {
      api.showStatus(error.message || "翻译失败", "error");
    } finally {
      button.disabled = false;
      button.textContent = "填入翻译内容";
      syncSaveState();
    }
  }

  function setRoute(route, action) {
    pendingAction = action;
    if (window.location.hash.replace(/^#/, "") === route) {
      runPendingAction();
    } else {
      window.location.hash = route;
    }
  }

  function schedulePendingAction(delay, attempt) {
    if (pendingActionTimer) return;
    pendingActionTimer = window.setTimeout(function () {
      pendingActionTimer = null;
      runPendingAction(attempt);
    }, delay || 0);
  }

  function failPendingAction() {
    pendingAction = null;
    window.alert("操作暂未完成，请打开条目后重试。");
  }

  function entryRoute(link) {
    var href = link.getAttribute("href") || "";
    var match = href.match(/#?(\/collections\/([^/]+)\/entries\/[^/?#]+)/);
    return match ? { route: match[1], collection: match[2] } : null;
  }

  function applyPatch(path, value, callback) {
    var api = window.CMS && window.CMS.editor;
    if (!api || typeof api.getCurrentEntry !== "function" || typeof api.applyFieldPatch !== "function") return false;
    var entry = api.getCurrentEntry();
    if (!entry || !entry.data) return false;
    var result = api.applyFieldPatch([{ path: path, value: value }]);
    if (result && result.rejected && result.rejected.length) {
      pendingAction = null;
      window.alert("无法更新字段：" + path);
      return true;
    }
    window.setTimeout(callback || syncSaveState, 150);
    return true;
  }

  function finishDuplicate(route) {
    var collection = route.split("/")[2];
    var idPrefix = { products: "P", templates: "T", knowledge: "K", news: "N", solutions: "S" }[collection];
    if (!idPrefix) {
      pendingAction = null;
      return;
    }
    var id = idPrefix + Date.now().toString(36).toUpperCase();
    if (applyPatch("id", id, function () {
      if (collection === "products") syncSaveState();
      else applyPatch("slug", id);
    })) {
      pendingAction = null;
    }
  }

  function runPendingAction(attempt) {
    if (!pendingAction) return;
    attempt = attempt || 0;
    var action = pendingAction;
    if (action.kind === "duplicate") {
      if (/\/new$/.test(window.location.hash)) {
        finishDuplicate(action.route);
        return;
      }
      if (window.location.hash.replace(/^#/, "") !== action.route) {
        schedulePendingAction(250, attempt + 1);
        return;
      }
      if (action.phase === "waiting-menu") {
        var duplicate = findButton(/^(Duplicate|复制)$/);
        if (duplicate) {
          action.phase = "waiting-new";
          duplicate.click();
        } else if (attempt < 20) schedulePendingAction(250, attempt + 1);
        else failPendingAction();
        return;
      }
      if (action.phase === "waiting-new") {
        if (attempt < 24) schedulePendingAction(250, attempt + 1);
        else failPendingAction();
        return;
      }
      var status = findStatus();
      if (status) {
        action.phase = "waiting-menu";
        status.click();
        schedulePendingAction(80);
        return;
      }
    } else if (action.kind === "delete") {
      if (window.location.hash.replace(/^#/, "") !== action.route) {
        schedulePendingAction(250, attempt + 1);
        return;
      }
      var remove = findButton(/^(Delete entry|Delete|删除内容|删除)$/);
      if (remove) {
        pendingAction = null;
        remove.click();
        return;
      }
      if (action.phase === "waiting-menu") {
        if (attempt < 20) schedulePendingAction(250, attempt + 1);
        else failPendingAction();
        return;
      }
      var deleteStatus = findStatus();
      if (deleteStatus) {
        action.phase = "waiting-menu";
        deleteStatus.click();
        schedulePendingAction(80);
        return;
      }
    } else if (action.kind === "sort") {
      if (window.location.hash.replace(/^#/, "") !== action.route) {
        schedulePendingAction(250, attempt + 1);
        return;
      }
      if (applyPatch("sort_order", action.value)) {
        pendingAction = null;
        window.setTimeout(function () {
          var saveButton = findNativeSave();
          if (saveButton && !saveButton.disabled) saveButton.click();
        }, 300);
        return;
      }
    }
    if (attempt < 24) schedulePendingAction(250, attempt + 1);
    else failPendingAction();
  }

  function addRowActions() {
    var links = root.querySelectorAll("a[href*='/collections/'][href*='/entries/']");
    Array.prototype.forEach.call(links, function (link) {
      var route = entryRoute(link);
      var card = link.parentElement;
      if (!route || !card || card.querySelector(":scope > .yinzaosuo-entry-actions")) return;
      var actions = document.createElement("div");
      actions.className = "yinzaosuo-entry-actions";
      [
        ["delete", "删除"],
        ["duplicate", "复制"],
        ["sort", "排序"]
      ].forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = item[1];
        button.dataset.action = item[0];
        if (item[0] === "duplicate" && route.collection === "catalogue") {
          button.disabled = true;
          button.title = "此产品集合不支持新增条目";
        }
        button.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (item[0] === "sort") {
            var value = window.prompt("请输入排序权重（数字越小越靠前）");
            if (value === null || !value.trim() || !Number.isFinite(Number(value))) return;
            setRoute(route.route, { kind: "sort", value: Number(value) });
          } else {
            setRoute(route.route, { kind: item[0], route: route.route });
          }
        });
        actions.appendChild(button);
      });
      card.appendChild(actions);
    });
  }

  function mountEditorActions() {
    var saveButton = findNativeSave();
    if (!saveButton || !saveButton.parentElement) return;
    if (actionBar && actionBar.isConnected && nativeSaveButton === saveButton) {
      syncSaveState();
      return;
    }
    if (actionBar) actionBar.remove();
    nativeSaveButton = saveButton;
    if (saveObserver) saveObserver.disconnect();
    saveObserver = new MutationObserver(syncSaveState);
    saveObserver.observe(saveButton, { attributes: true, attributeFilter: ["disabled"] });
    saveButton.classList.add("yinzaosuo-native-save-hidden");
    actionBar = document.createElement("div");
    actionBar.className = "yinzaosuo-editor-actions";

    var saveAction = document.createElement("button");
    saveAction.type = "button";
    saveAction.dataset.action = "save";
    saveAction.textContent = "保存";
    saveAction.addEventListener("click", save);

    var translateAction = document.createElement("button");
    translateAction.type = "button";
    translateAction.dataset.action = "translate";
    translateAction.textContent = "填入翻译内容";
    translateAction.addEventListener("click", translate);

    actionBar.append(saveAction, translateAction);
    saveButton.insertAdjacentElement("afterend", actionBar);
    syncSaveState();
  }

  function mount() {
    if (!root) return;
    addRowActions();
    mountEditorActions();
    if (pendingAction) schedulePendingAction();
  }

  if (root) {
    var observer = new MutationObserver(mount);
    observer.observe(root, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
  window.addEventListener("hashchange", function () {
    actionBar = null;
    nativeSaveButton = null;
    if (saveObserver) saveObserver.disconnect();
    saveObserver = null;
    window.setTimeout(mount, 0);
    schedulePendingAction(250);
  });
})();
