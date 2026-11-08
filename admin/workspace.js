(function () {
  "use strict";

  var ACTION_KEY = "yinzaosuo-admin-entry-action";
  var editorActions = document.getElementById("admin-editor-actions");
  var translateButton = document.getElementById("admin-translate-button");
  var publishButton = document.getElementById("admin-publish-button");
  var lastSnapshot = null;
  var observer = null;

  function textOf(node) {
    return (node && (node.innerText || node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function findButton(root, matcher) {
    return Array.prototype.slice.call((root || document).querySelectorAll("button,[role='menuitem']"))
      .find(function (node) { return matcher(textOf(node)); });
  }

  function nativePublishButton() {
    return findButton(document.getElementById("nc-root"), function (text) {
      return /^(发布|已发布|Publish|Published)$/i.test(text);
    });
  }

  function runNativePublish() {
    var snapshot = window.CMS && window.CMS.editor && window.CMS.editor.getCurrentEntry();
    if (!snapshot || (!snapshot.hasChanged && !snapshot.newRecord)) {
      window.alert("当前内容没有未保存的修改。");
      return;
    }
    var trigger = nativePublishButton();
    if (!trigger) {
      window.alert("没有找到后台原生发布入口，请刷新后台后重试。");
      return;
    }
    trigger.click();
    window.setTimeout(function () {
      var option = findButton(document, function (text) {
        return /^(立即发布|Publish now)$/i.test(text);
      });
      if (option) option.click();
      else window.alert("没有找到“立即发布”选项，请检查发布菜单。");
    }, 120);
  }

  function updateEditorActions(snapshot) {
    lastSnapshot = snapshot;
    if (!editorActions) return;
    editorActions.hidden = !snapshot;
    if (translateButton) translateButton.disabled = !snapshot;
    if (publishButton) publishButton.disabled = !snapshot || (!snapshot.hasChanged && !snapshot.newRecord);
    var native = nativePublishButton();
    if (native) native.classList.add("yinzaosuo-native-publish-hidden");
  }

  if (translateButton) {
    translateButton.addEventListener("click", async function () {
      if (!window.YinzaosuoTranslation || typeof window.YinzaosuoTranslation.translateCurrentEntry !== "function") {
        window.alert("翻译模块尚未加载，请刷新后台后重试。");
        return;
      }
      translateButton.disabled = true;
      translateButton.textContent = "翻译中…";
      try {
        await window.YinzaosuoTranslation.translateCurrentEntry();
      } catch (error) {
        window.alert(error.message || "翻译失败，请稍后重试。");
      } finally {
        translateButton.textContent = "一键翻译";
        translateButton.disabled = !lastSnapshot;
      }
    });
  }

  if (publishButton) publishButton.addEventListener("click", runNativePublish);

  function storeAction(action, href, value) {
    sessionStorage.setItem(ACTION_KEY, JSON.stringify({
      action: action,
      href: href,
      value: value,
      createdAt: Date.now()
    }));
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
    var links = document.querySelectorAll("#nc-root a[href*='/collections/'][href*='/entries/']");
    links.forEach(function (anchor) {
      var card = anchor.closest("li") || anchor.parentElement;
      if (!card || card.querySelector(".yinzaosuo-entry-actions")) return;
      card.classList.add("yinzaosuo-entry-card");
      var actions = document.createElement("div");
      actions.className = "yinzaosuo-entry-actions";
      [
        ["delete", "删除"],
        ["duplicate", "复制"],
        ["order", "调顺序"]
      ].forEach(function (item) {
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
      var del = findButton(document.getElementById("nc-root"), function (text) {
        return /^删除(内容|条目)?$|^Delete$/i.test(text);
      });
      if (del) del.click();
      else window.alert("没有找到删除按钮，请在编辑页面操作。");
      return;
    }
    if (action === "duplicate") {
      var trigger = nativePublishButton();
      if (!trigger) {
        window.alert("没有找到复制入口，请在编辑页面打开发布菜单。");
        return;
      }
      trigger.click();
      window.setTimeout(function () {
        var duplicate = findButton(document, function (text) {
          return /^(复制|复制内容|Duplicate)$/i.test(text);
        });
        if (duplicate) duplicate.click();
        else window.alert("没有找到复制选项，请检查发布菜单。");
      }, 120);
    }
  }

  function processPendingAction(snapshot) {
    var raw = sessionStorage.getItem(ACTION_KEY);
    if (!raw || !snapshot) return;
    var pending;
    try { pending = JSON.parse(raw); } catch (error) {
      sessionStorage.removeItem(ACTION_KEY);
      return;
    }
    if (!pending || Date.now() - pending.createdAt > 120000) {
      sessionStorage.removeItem(ACTION_KEY);
      return;
    }
    if (pending.href && window.location.href !== pending.href) return;
    if (pending.action === "order") {
      if (!snapshot.fields.some(function (field) { return field.name === "sort_order"; })) {
        sessionStorage.removeItem(ACTION_KEY);
        window.alert("该内容类型暂不支持排序，请刷新列表后重试。");
        return;
      }
      sessionStorage.removeItem(ACTION_KEY);
      var result = window.CMS.editor.applyFieldPatch([{ path: "sort_order", value: pending.value }]);
      if (result && result.rejected && result.rejected.length) {
        window.alert("排序值写入失败，请手动修改排序字段。");
        return;
      }
      window.setTimeout(runNativePublish, 250);
      return;
    }
    sessionStorage.removeItem(ACTION_KEY);
    clickNativeEntryAction(pending.action);
  }

  var editorConnected = false;
  function connectEditorApi() {
    if (editorConnected) return;
    var api = window.CMS && window.CMS.editor;
    if (!api || typeof api.onEditorChange !== "function" || typeof api.getCurrentEntry !== "function") {
      window.setTimeout(connectEditorApi, 300);
      return;
    }
    editorConnected = true;
    api.onEditorChange(function (snapshot) {
      updateEditorActions(snapshot);
      if (snapshot) processPendingAction(snapshot);
    });
    updateEditorActions(api.getCurrentEntry());
  }

  function start() {
    connectEditorApi();
    addCardActions();
    observer = new MutationObserver(function () {
      addCardActions();
      var native = nativePublishButton();
      if (native) native.classList.add("yinzaosuo-native-publish-hidden");
    });
    var root = document.getElementById("nc-root");
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
