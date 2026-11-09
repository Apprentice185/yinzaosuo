(function () {
  "use strict";

  var ALLOWED_TAGS = new Set([
    "a", "b", "blockquote", "br", "code", "div", "em", "figcaption", "figure",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol",
    "p", "pre", "span", "strong", "table", "tbody", "td", "th", "thead",
    "tr", "u", "ul"
  ]);
  var DROP_TAGS = new Set([
    "audio", "base", "button", "embed", "form", "iframe", "input", "link",
    "math", "meta", "object", "option", "script", "select", "source", "style",
    "svg", "template", "textarea", "video"
  ]);
  var ALLOWED_STYLES = new Set([
    "background-color", "background-image", "border", "border-bottom",
    "border-color", "border-left", "border-radius", "border-right", "border-top",
    "color", "display", "font-family", "font-size", "font-size-adjust",
    "font-stretch", "font-style", "font-variant", "font-weight", "line-height",
    "margin", "margin-bottom", "margin-left", "margin-right", "margin-top",
    "max-width", "padding", "padding-bottom", "padding-left", "padding-right",
    "padding-top", "text-align", "text-decoration", "vertical-align", "width"
  ]);

  function escape(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(value, allowMailto) {
    var trimmed = String(value || "").trim();
    if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) return "";
    if (trimmed.charAt(0) === "#" || trimmed.charAt(0) === "/" || trimmed.slice(0, 2) === "./" || trimmed.slice(0, 3) === "../") {
      return trimmed;
    }
    try {
      var url = new URL(trimmed, document.baseURI);
      if (url.protocol === "https:" || url.protocol === "http:") return trimmed;
      if (allowMailto && (url.protocol === "mailto:" || url.protocol === "tel:")) return trimmed;
    } catch (error) {
      return "";
    }
    return "";
  }

  function sanitizedStyle(source, target) {
    var style = source.style;
    if (!style) return;
    for (var index = 0; index < style.length; index += 1) {
      var property = style[index].toLowerCase();
      if (!ALLOWED_STYLES.has(property)) continue;
      var value = style.getPropertyValue(property).trim();
      if (!value || /expression\s*\(|javascript:|@import|[{}]/i.test(value)) continue;
      if (property === "background-image") {
        var image = value.match(/^url\(\s*(['"]?)(.*?)\1\s*\)$/i);
        var imageUrl = image && safeUrl(image[2], false);
        if (!imageUrl) continue;
        value = 'url("' + imageUrl.replace(/["\\]/g, "") + '")';
      } else if (/url\s*\(/i.test(value)) {
        continue;
      }
      target.style.setProperty(property, value);
    }
  }

  function copyNode(node, outputDocument) {
    if (node.nodeType === 3) return outputDocument.createTextNode(node.nodeValue);
    if (node.nodeType !== 1) return outputDocument.createDocumentFragment();

    var tag = node.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) return outputDocument.createDocumentFragment();
    if (!ALLOWED_TAGS.has(tag)) {
      var unwrapped = outputDocument.createDocumentFragment();
      Array.prototype.forEach.call(node.childNodes, function (child) {
        unwrapped.appendChild(copyNode(child, outputDocument));
      });
      return unwrapped;
    }

    var clean = outputDocument.createElement(tag);
    Array.prototype.forEach.call(node.attributes, function (attribute) {
      var name = attribute.name.toLowerCase();
      var value = attribute.value;
      if (name === "class" && /^[a-z0-9 _-]{1,200}$/i.test(value)) {
        clean.setAttribute("class", value);
      } else if (name === "title" || name === "alt") {
        clean.setAttribute(name, value);
      } else if (name === "width" || name === "height" || name === "colspan" || name === "rowspan") {
        if (/^\d{1,4}$/.test(value)) clean.setAttribute(name, value);
      } else if (name === "style") {
        sanitizedStyle(node, clean);
      } else if (name === "href" && tag === "a") {
        var href = safeUrl(value, true);
        if (href) clean.setAttribute("href", href);
      } else if (name === "src" && tag === "img") {
        var src = safeUrl(value, false);
        if (src) clean.setAttribute("src", src);
      } else if (name === "target" && tag === "a" && value === "_blank") {
        clean.setAttribute("target", "_blank");
      }
    });

    if (tag === "a" && clean.getAttribute("target") === "_blank") {
      clean.setAttribute("rel", "noopener noreferrer");
    }
    Array.prototype.forEach.call(node.childNodes, function (child) {
      clean.appendChild(copyNode(child, outputDocument));
    });
    return clean;
  }

  function sanitize(html) {
    var parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
    var fragment = document.createDocumentFragment();
    Array.prototype.forEach.call(parsed.body.childNodes, function (node) {
      fragment.appendChild(copyNode(node, document));
    });
    return fragment;
  }

  window.ContentSanitizer = { escape: escape, safeUrl: safeUrl, sanitize: sanitize };
})();
