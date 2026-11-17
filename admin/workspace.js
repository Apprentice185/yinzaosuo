(function () {
  "use strict";

  // Admin workspace helpers:
  //   - collection-list row actions (删除 / 复制 / 排序)
  //   - the sidebar regrouping into 海外版 / 国内版 cards (below)
  //   - the entry editor's single 保存 button (owner requirement,
  //     2026-11-17): the editor shows ONLY this button — grey and
  //     disabled while there are no unsaved changes, teal and clickable
  //     once there are, back to grey after Decap confirms the save.
  //     Decap's native publish dropdown and 删除内容 button stay in
  //     the DOM (this button and the row actions drive them in code)
  //     but are visually hidden. Two guards keep this from silently
  //     breaking the way the pre-redesign proxy Save did: the Decap
  //     build is pinned to an exact version in admin/index.html, and
  //     a failed save surfaces an alert instead of failing quietly.

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

  // --- Entry editor: a single 保存 button -------------------------------
  // Dirty state is read from Decap itself: the publish toggle reads
  // 发布 while the entry has unsaved changes (or is new) and 已发布
  // once everything is saved; the toolbar status line shows
  // 含未保存的修改 while dirty. Saving runs Decap's own 立即发布 menu
  // action in code, so what lands in the repo is exactly what the
  // native control would have committed.
  var saveButton = null;
  var saveInFlight = false;
  var saveFlightTimer = null;

  function inEntryEditor() {
    return window.location.hash.indexOf("/collections/") !== -1 &&
      window.location.hash.indexOf("/entries/") !== -1;
  }

  function findPublishToggle() {
    var nodes = root.querySelectorAll("button,[role='button']");
    for (var i = 0; i < nodes.length; i++) {
      var label = text(nodes[i]);
      if (label === "发布" || label === "已发布" || label === "Publish" || label === "Published") return nodes[i];
    }
    return null;
  }

  function findDeleteButton(scope) {
    var nodes = scope.querySelectorAll("button,[role='button']");
    for (var i = 0; i < nodes.length; i++) {
      var label = text(nodes[i]);
      if (label === "删除内容" || label === "Delete entry") return nodes[i];
    }
    return null;
  }

  function scopeHasUnsaved(scope) {
    var nodes = scope.querySelectorAll("span,div,p,small");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].childElementCount === 0 && text(nodes[i]) === "含未保存的修改") return true;
    }
    return false;
  }

  function hasUnsavedChanges(toggle) {
    var scope = toggle;
    for (var up = 0; up < 6 && scope.parentElement; up++) {
      scope = scope.parentElement;
      if (scopeHasUnsaved(scope)) return true;
      if (scope === root) break;
    }
    return false;
  }

  function setSaveState(state) {
    if (!saveButton) return;
    // Write only on change: mount() runs from a MutationObserver, so an
    // unconditional textContent assignment would mutate the DOM on every
    // pass and retrigger itself forever.
    var label = state === "saving" ? "保存中…" : "保存";
    var disabled = state !== "dirty";
    if (saveButton.dataset.state !== state) saveButton.dataset.state = state;
    if (saveButton.disabled !== disabled) saveButton.disabled = disabled;
    if (saveButton.textContent !== label) saveButton.textContent = label;
  }

  function syncSaveButton() {
    if (!saveButton) return;
    var toggle = findPublishToggle();
    if (saveInFlight) {
      if (toggle && text(toggle) === "已发布" && !hasUnsavedChanges(toggle)) {
        saveInFlight = false;
        if (saveFlightTimer) { window.clearTimeout(saveFlightTimer); saveFlightTimer = null; }
      } else {
        setSaveState("saving");
        return;
      }
    }
    if (!toggle) { setSaveState("clean"); return; }
    var label = text(toggle);
    var dirty = label === "发布" || label === "Publish" || hasUnsavedChanges(toggle);
    setSaveState(dirty ? "dirty" : "clean");
  }

  function findPublishNowItem() {
    var nodes = root.querySelectorAll("button,[role='menuitem'],a");
    for (var i = 0; i < nodes.length; i++) {
      var label = text(nodes[i]);
      if (label === "立即发布" || label === "Publish now") return nodes[i];
    }
    return null;
  }

  function saveFailed(message) {
    saveInFlight = false;
    if (saveFlightTimer) { window.clearTimeout(saveFlightTimer); saveFlightTimer = null; }
    syncSaveButton();
    window.alert(message);
  }

  function beginSaveFlight() {
    saveInFlight = true;
    setSaveState("saving");
    if (saveFlightTimer) window.clearTimeout(saveFlightTimer);
    saveFlightTimer = window.setTimeout(function () {
      saveFlightTimer = null;
      saveInFlight = false;
      var toggle = findPublishToggle();
      if (toggle && (text(toggle) === "发布" || hasUnsavedChanges(toggle))) {
        saveFailed("保存似乎没有成功，请再点一次「保存」。");
      } else {
        syncSaveButton();
      }
    }, 25000);
  }

  function pollForPublishItem(attempt) {
    var item = findPublishNowItem();
    if (item) { item.click(); return; }
    if (attempt >= 30) {
      saveFailed("保存未完成：没有找到发布菜单，请刷新页面后重试。");
      return;
    }
    window.setTimeout(function () { pollForPublishItem(attempt + 1); }, 100);
  }

  function onSaveClick() {
    if (saveInFlight || !saveButton || saveButton.disabled) return;
    var item = findPublishNowItem();
    if (item) { beginSaveFlight(); item.click(); return; }
    var toggle = findPublishToggle();
    if (!toggle) {
      window.alert("保存未完成：没有找到发布按钮，请刷新页面后重试。");
      return;
    }
    beginSaveFlight();
    toggle.click();
    pollForPublishItem(0);
  }

  function enhanceEditor() {
    if (!inEntryEditor()) { saveButton = null; return; }
    var toggle = findPublishToggle();
    if (!toggle) { saveButton = null; return; }
    if (!toggle.classList.contains("yz-native-hidden")) toggle.classList.add("yz-native-hidden");
    var scope = toggle;
    for (var up = 0; up < 5 && scope.parentElement; up++) {
      scope = scope.parentElement;
      var remove = findDeleteButton(scope);
      if (remove) {
        if (!remove.classList.contains("yz-native-hidden")) remove.classList.add("yz-native-hidden");
        break;
      }
      if (scope === root) break;
    }
    var existing = root.querySelector(".yz-save-button");
    if (existing && existing.__yzWired) {
      saveButton = existing;
    } else {
      // A same-class element without our wiring (e.g. a cloned node) is
      // useless — clicking it would do nothing. Replace it.
      if (existing) existing.remove();
      saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "yz-save-button";
      saveButton.textContent = "保存";
      saveButton.disabled = true;
      saveButton.dataset.state = "clean";
      saveButton.__yzWired = true;
      saveButton.addEventListener("click", onSaveClick);
      var anchor = toggle;
      var wrap = toggle.parentElement;
      if (wrap && wrap !== root && wrap.children.length <= 2) anchor = wrap;
      if (anchor.parentElement) anchor.parentElement.insertBefore(saveButton, anchor);
      else toggle.parentElement.insertBefore(saveButton, toggle);
    }
    syncSaveButton();
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
    enhanceEditor();
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
