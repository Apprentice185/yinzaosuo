(function () {
  "use strict";

  // Admin workspace helpers. This file intentionally does NOT touch the
  // entry editor's own toolbar: saving, publishing and deleting run
  // through Decap's native controls. (The pre-redesign build injected a
  // custom action bar with a translation button and a proxy Save button
  // that scraped the DOM for the native one; when Decap's markup moved
  // on, the proxy Save silently stopped working, so the whole layer was
  // removed on 2026-11-17.) What remains: row actions on collection
  // lists (删除 / 复制 / 排序) and the sidebar regrouping below.

  var root = document.getElementById("nc-root");
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
    var nodes = root.querySelectorAll("button,[role='button']");
    for (var i = 0; i < nodes.length; i++) {
      if (/^(保存|保存中…?|正在保存…?|Save|Saving…?|Save changes|保存更改)$/i.test(text(nodes[i]))) {
        return nodes[i];
      }
    }
    return null;
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
    window.setTimeout(callback || function () {}, 150);
    return true;
  }

  function finishDuplicate(route) {
    var collection = route.split("/")[2];
    var idPrefix = { en_products: "P", zh_products: "P", en_knowledge: "K", zh_knowledge: "K", en_solutions: "S", zh_solutions: "S", zh_materials: "M" }[collection];
    if (!idPrefix) {
      pendingAction = null;
      return;
    }
    var id = idPrefix + Date.now().toString(36).toUpperCase();
    if (applyPatch("id", id, function () {
      // Collections whose identifier is the id itself (products, materials)
      // only need the id patched; slug-identified collections (articles)
      // also need a fresh slug.
      if (collection === "en_products" || collection === "zh_products" || collection === "zh_materials") return;
      applyPatch("slug", id);
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

  // --- Collections sidebar: regroup Decap's flat list into two visual
  // --- cards (海外版 / 国内版). No Decap-managed node is moved or removed:
  // --- we only retitle the native heading, strip the label prefixes,
  // --- add marker classes, and insert one foreign <li> row (the domestic
  // --- group title) ahead of the domestic group. The native global search
  // --- stays in place in the DOM; workspace.css pins it into the top
  // --- header bar with position:fixed (class yz-topsearch). mount()
  // --- re-applies everything after React re-renders, and every write is
  // --- guarded so repeat runs are no-ops.
  function sidebarGroupOf(name) {
    if (name.indexOf("en_") === 0) return "en";
    if (name.indexOf("zh_") === 0) return "zh";
    return null;
  }

  function stripSidebarPrefix(link) {
    for (var i = 0; i < link.childNodes.length; i++) {
      var node = link.childNodes[i];
      if (node.nodeType !== 3) continue;
      var stripped = node.nodeValue.replace(/^\s*(海外版|国内版)\s*·\s*/, "");
      if (stripped !== node.nodeValue) node.nodeValue = stripped;
    }
  }

  function layoutSidebar() {
    var links = root.querySelectorAll('a[data-testid][href*="/collections/"]');
    var entries = [];
    Array.prototype.forEach.call(links, function (link) {
      var match = (link.getAttribute("href") || "").match(/#\/collections\/([A-Za-z0-9_]+)$/);
      if (!match || link.getAttribute("data-testid") !== match[1]) return;
      var item = link.closest("li");
      var group = sidebarGroupOf(match[1]);
      if (group && item) entries.push({ link: link, item: item, group: group });
    });
    if (!entries.length) return;
    var list = entries[0].item.parentElement;
    if (!list || list.tagName !== "UL") return;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].item.parentElement !== list) return; // unexpected DOM; bail out
    }
    var container = list.parentElement;
    if (!container) return;
    container.classList.add("yz-grouped");
    list.classList.add("yz-group-list");

    var heading = container.querySelector(":scope > h2");
    var searchWrap = null;
    Array.prototype.forEach.call(container.children, function (child) {
      if (child !== list && child !== heading && child.querySelector && child.querySelector("input")) {
        searchWrap = child;
      }
    });
    // The native search is no longer a sidebar card piece: tag it so the
    // CSS can pin it into the top header bar. Remove the round-1 card
    // marker in case an older cached script already applied it.
    if (searchWrap) {
      searchWrap.classList.remove("yz-group-mid");
      searchWrap.classList.add("yz-topsearch");
    }
    if (heading) {
      heading.classList.add("yz-group-start");
      var headingText = text(heading);
      if (entries[0].group === "en" && (headingText === "集合" || headingText === "Collections")) {
        heading.textContent = "海外版";
      }
    } else {
      entries[0].item.classList.add("yz-group-start");
    }

    var overseas = [];
    var domestic = [];
    entries.forEach(function (entry) {
      stripSidebarPrefix(entry.link);
      (entry.group === "en" ? overseas : domestic).push(entry);
    });
    if (overseas.length) overseas[overseas.length - 1].item.classList.add("yz-group-end");
    if (!domestic.length) return;
    domestic[domestic.length - 1].item.classList.add("yz-group-end");
    // Round 1 inserted a per-card filter box ahead of the domestic group;
    // the user asked for it to go away — the only search box now is the
    // native one, up in the header bar. That row is our own foreign node
    // (not Decap-managed), so removing a stale copy is safe.
    var staleFilter = list.querySelector(":scope > .yz-group-search-li");
    if (staleFilter) staleFilter.remove();
    if (!list.querySelector(":scope > .yz-group-title-li")) {
      var titleItem = document.createElement("li");
      titleItem.className = "yz-group-title-li yz-group-start";
      var title = document.createElement("div");
      title.className = "yz-group-title";
      title.textContent = "国内版";
      titleItem.appendChild(title);
      list.insertBefore(titleItem, domestic[0].item);
    }
  }

  function shortenNewEntryLink() {
    var links = root.querySelectorAll('a[href*="/collections/"][href$="/new"]');
    Array.prototype.forEach.call(links, function (link) {
      if (link.children.length) return; // plain-text label only
      var match = text(link).match(/^[+＋]\s*(海外版|国内版)\s*·\s*(.+)$/);
      if (match) link.textContent = "+ " + match[2];
    });
  }

  function mount() {
    if (!root) return;
    addRowActions();
    layoutSidebar();
    shortenNewEntryLink();
    if (pendingAction) schedulePendingAction();
  }

  if (root) {
    var observer = new MutationObserver(mount);
    observer.observe(root, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
  window.addEventListener("hashchange", function () {
    window.setTimeout(mount, 0);
    schedulePendingAction(250);
  });
})();
