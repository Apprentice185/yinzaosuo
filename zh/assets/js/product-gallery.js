(function () {
  "use strict";
  // Product detail gallery: thumbnail switching for the multi-image
  // detail gallery. The generator only emits the thumbs row and this
  // script when a product has more than one detail image.
  var main = document.getElementById("productImage");
  var thumbs = document.getElementById("productThumbs");
  if (!main || !thumbs) return;
  var mainImage = main.querySelector("img");
  if (!mainImage) return;
  thumbs.addEventListener("click", function (event) {
    var button = event.target && event.target.closest ? event.target.closest("[data-product-image]") : null;
    if (!button) return;
    var image = button.getAttribute("data-product-image");
    if (image) mainImage.src = image;
    var buttons = thumbs.querySelectorAll(".product-thumb");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle("is-active", buttons[i] === button);
    }
  });
})();
