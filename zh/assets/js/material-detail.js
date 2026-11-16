(() => {
  // Materials detail page (phase 2): thumbnail switching for the 3–5 image
  // gallery, and the enquiry button, which follows the same pattern as the
  // product detail pages — the message is stashed in localStorage and the
  // homepage quote modal picks it up via #quoteModal.
  const mainImage = document.querySelector('#materialMainImage');
  const thumbs = [...document.querySelectorAll('.material-thumb')];
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const image = thumb.dataset.materialImage;
      if (mainImage && image) mainImage.src = image;
      thumbs.forEach(entry => entry.classList.toggle('is-active', entry === thumb));
    });
  });
  const quote = document.querySelector('#materialQuote');
  quote?.addEventListener('click', () => {
    const title = quote.dataset.materialTitle || '';
    localStorage.setItem('pendingQuote', `你好，我需要标题为"${title}"的这款素材来制作画面`);
    window.location.href = 'index.html#quoteModal';
  });
})();
