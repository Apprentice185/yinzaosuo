(() => {
  // Company pages renderer (phase 2): shipping.html and about.html take
  // their body copy from content/en/settings/company.json, exposed by the
  // generator as CMS_CONTENT.siteSettings.company and edited in the backend
  // as the "Company info" file collection. Elements opt in with
  // data-company="shipping.steps.0.title" style paths. The static HTML
  // carries the same copy as a no-JS fallback (phase 1 transcribed it
  // verbatim into company.json).
  const company = window.CMS_CONTENT?.siteSettings?.company;
  if (!company) return;
  const resolve = dottedPath => dottedPath.split('.')
    .reduce((node, key) => (node == null ? undefined : node[key]), company);
  const setText = (element, value) => {
    if (typeof value !== 'string' || !value.trim()) return;
    // Preserve a single inline element (<em> heading emphasis or an <a>
    // inside a note) when its text appears verbatim in the new value.
    // A trailing arrow glyph inside a link ("… trade ↗") is ignored for
    // matching; the cloned link keeps it.
    let inner = null;
    let matchText = '';
    for (const child of element.children) {
      if (child.tagName !== 'EM' && child.tagName !== 'A') continue;
      const candidate = child.textContent.replace(/[\s↗→]+$/u, '');
      if (candidate && value.includes(candidate)) {
        inner = child;
        matchText = candidate;
        break;
      }
    }
    if (!inner) {
      element.textContent = value;
      return;
    }
    const at = value.indexOf(matchText);
    const parts = [];
    if (at > 0) parts.push(document.createTextNode(value.slice(0, at)));
    parts.push(inner.cloneNode(true));
    const rest = value.slice(at + matchText.length);
    if (rest) parts.push(document.createTextNode(rest));
    element.replaceChildren(...parts);
  };
  document.querySelectorAll('[data-company]').forEach(element => {
    setText(element, resolve(element.dataset.company));
  });
  document.querySelectorAll('[data-company-email]').forEach(element => {
    const email = resolve(element.dataset.companyEmail);
    if (typeof email === 'string' && email.trim()) {
      element.href = `mailto:${email.trim()}`;
      element.textContent = `Email ${email.trim()}`;
    }
  });
})();
