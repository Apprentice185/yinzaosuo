(function () {
  "use strict";
  var root = document.getElementById("nc-root");
  var PAIRABLE = new Set(["title","name","desc","materials","crafts","category_title","category_desc","tag","summary","body","type"]);
  var busy = false;
  var bypassPublishClick = false;

  function labelOf(el) { return (el.innerText || el.textContent || "").replace(/\\s+/g," ").trim(); }
  function publishTrigger() {
    return Array.from(root.querySelectorAll("button")).find(function (b) {
      return /^(已发布|发布|Published|Publish)$/.test(labelOf(b));
    });
  }
  function clickImmediatePublish() {
    var trigger = publishTrigger();
    if (!trigger || trigger.disabled) return;
    bypassPublishClick = true;
    trigger.click();
    bypassPublishClick = false;
    window.setTimeout(function () {
      var item = Array.from(document.querySelectorAll("[role='menuitem'],button")).find(function (el) {
        return /^(立即发布|Publish now)$/.test(labelOf(el));
      });
      if (item) item.click();
      else window.alert("没有找到“立即发布”选项，请刷新后台后重试。");
    }, 150);
  }
  function setControlValue(control, value) {
    var proto = control.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function controlsByName() {
    var map = new Map();
    root.querySelectorAll("input[name],textarea[name]").forEach(function (el) {
      if (!map.has(el.name)) map.set(el.name, []);
      map.get(el.name).push(el);
    });
    return map;
  }
  function targetName(name) {
    if (name.endsWith("_zh")) return name.slice(0,-3) + "_en";
    if (PAIRABLE.has(name)) return name + "_en";
    var match = name.match(/^(.+_zh)([.[])/);
    if (match) return match[1].slice(0,-3) + "_en" + name.slice(match[1].length);
    var nested = name.match(/^([^.[]+)([.[])/);
    if (nested && PAIRABLE.has(nested[1])) return nested[1] + "_en" + name.slice(nested[1].length);
    return null;
  }
  async function translateForm() {
    if (!window.YinzaosuoTranslation || typeof window.YinzaosuoTranslation.translateText !== "function") {
      throw new Error("翻译模块尚未加载，请刷新后台。");
    }
    var controls = controlsByName();
    var jobs = [];
    controls.forEach(function (sources, name) {
      var target = targetName(name);
      if (!target || !controls.has(target)) return;
      var targets = controls.get(target);
      sources.forEach(function (source, index) {
        var value = (source.value || "").trim();
        var dest = targets[index];
        if (!value || !dest || (dest.value || "").trim() || source.disabled) return;
        jobs.push({ source: source, target: dest, value: value });
      });
    });
    if (!jobs.length) {
      window.YinzaosuoTranslation.showStatus("没有发现需要补充的英文输入项。", "success");
      return;
    }
    for (var i=0;i<jobs.length;i++) {
      window.YinzaosuoTranslation.showStatus("正在翻译（"+(i+1)+"/"+jobs.length+"）…","working");
      var result = await window.YinzaosuoTranslation.translateText(jobs[i].value);
      setControlValue(jobs[i].target, result);
    }
    window.YinzaosuoTranslation.showStatus("翻译完成，英文已填入对应输入框。请检查后点击发布保存。","success");
  }
  function decorateToolbar() {
    var trigger = publishTrigger();
    if (!trigger) return;
    var parent = trigger.parentElement;
    if (!parent) return;
    trigger.classList.add("yinzaosuo-publish-trigger");
    var changed = /^(发布|Publish)$/.test(labelOf(trigger));
    trigger.textContent = changed ? "发布" : "发布";
    trigger.disabled = !changed;
    trigger.setAttribute("aria-label", changed ? "发布当前修改" : "没有未保存的修改");
    if (!parent.querySelector(".yinzaosuo-toolbar-translate")) {
      var translate = document.createElement("button");
      translate.type = "button";
      translate.className = "yinzaosuo-toolbar-translate";
      translate.textContent = "一键翻译";
      translate.addEventListener("click", async function () {
        if (busy) return;
        busy = true; translate.disabled = true; translate.textContent = "翻译中…";
        try { await translateForm(); }
        catch (error) {
          window.YinzaosuoTranslation && window.YinzaosuoTranslation.showStatus(error.message || "翻译失败","error");
          window.alert(error.message || "翻译失败，请重试。");
        } finally { busy = false; translate.disabled = false; translate.textContent = "一键翻译"; }
      });
      parent.insertBefore(translate, trigger);
    }
    if (!trigger.dataset.yinzaosuoBound) {
      trigger.dataset.yinzaosuoBound = "1";
      trigger.addEventListener("click", function (event) {
        if (bypassPublishClick) return;
        if (!/^(发布|Publish)$/.test(labelOf(trigger))) {
          event.preventDefault(); event.stopImmediatePropagation();
          return;
        }
        event.preventDefault(); event.stopImmediatePropagation();
        clickImmediatePublish();
      }, true);
    }
    var dropdown = trigger.closest("[class*='Dropdown'],[class*='dropdown']");
    if (dropdown) dropdown.classList.add("yinzaosuo-publish-wrap");
  }
  function start() {
    if (!root) return;
    var observer = new MutationObserver(decorateToolbar);
    observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["disabled"]});
    decorateToolbar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
