(() => {
  // Chinese site settings renderer (phase 2): the domestic tree is
  // Chinese-only, so unlike the EN site-settings.js this always applies the
  // *_zh fields. It wires the navigation (nav_items), brand tagline, contact
  // email / phone and the homepage SEO title/description from
  // content/zh/settings/site.json via the generated content index.
  // Announcement and footer copy fields are intentionally NOT applied here:
  // the zh site.json copies of those fields still hold pre-split wording
  // that does not match the domestic pages' current copy, and the regional
  // pages (xian / jiangzhehuwan) carry their own local announcements.
  const settings = window.CMS_CONTENT?.siteSettings?.global || {};
  const apply = () => {
    document.querySelectorAll('.brand small').forEach(node => {
      if (settings.brand_tagline_zh) node.textContent = settings.brand_tagline_zh;
    });
    const nav = document.querySelector('.main-nav');
    if (nav && Array.isArray(settings.nav_items) && settings.nav_items.length) {
      const links = settings.nav_items
        .filter(item => item.enabled !== false && item.url)
        .map(item => {
          const anchor = document.createElement('a');
          anchor.href = item.url;
          anchor.textContent = item.label_zh || '';
          return anchor;
        });
      nav.replaceChildren(...links);
    }
    const email = String(settings.contact_email || '').trim();
    document.querySelectorAll('.footer-contact a[href^="mailto:"]').forEach(anchor => {
      if (email) {
        anchor.href = `mailto:${email}`;
        anchor.textContent = email;
      }
    });
    const phone = String(settings.contact_phone || '').trim();
    document.querySelectorAll('.footer-phone').forEach(anchor => {
      if (phone) {
        anchor.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
        anchor.textContent = phone;
      }
    });
    if (location.pathname === '/zh/' || location.pathname.endsWith('/zh/index.html')) {
      const title = settings.seo_home_title_zh;
      const description = settings.seo_home_description_zh;
      if (title) document.title = title;
      if (description) {
        const meta = document.querySelector('meta[name="description"]');
        const og = document.querySelector('meta[property="og:description"]');
        if (meta) meta.content = description;
        if (og) og.content = description;
      }
    }
  };
  document.addEventListener('DOMContentLoaded', apply);
})();
