(() => {
  const image = document.querySelector('#homeHeroImage');
  if (!image) return;

  const settings = window.CMS_CONTENT?.siteSettings?.home || {};
  const source = settings.hero_image || image.dataset.fallbackSrc;
  if (source) {
    try {
      const url = new URL(source, `${window.location.origin}/`);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported image URL protocol');
      image.src = url.href;
    } catch (error) {
      console.error('Invalid homepage hero image URL:', error);
    }
  }

  const renderAlt = language => {
    image.alt = language === 'en'
      ? settings.hero_image_alt_en || settings.hero_image_alt || image.alt
      : settings.hero_image_alt || image.alt;
  };
  window.registerLanguageRenderer(renderAlt);
  renderAlt(localStorage.getItem('site_lang') || 'zh');
})();
