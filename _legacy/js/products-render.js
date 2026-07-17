/* ==========================================================================
   MECH-TECH — live product grid (Products page)
   Fetches /api/products and injects .card markup identical to the previous
   hardcoded HTML, so js/main.js's filter/search and the quote-modal's
   delegated [data-quote] listener keep working unchanged. Dispatches
   "products:rendered" once cards are in the DOM so main.js can re-run its
   filter pass (products don't exist yet at DOMContentLoaded time).
   ========================================================================== */
(function () {
  "use strict";

  var grid = document.querySelector(".grid--products");
  if (!grid) return;

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function mediaMarkup(product) {
    if (product.image) {
      var badge = product.badge
        ? '<span class="product-card__badge">' + escapeHtml(product.badge) + "</span>"
        : "";
      return (
        '<div class="card__media">' + badge +
          '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.title) + '" loading="lazy" width="300" height="300">' +
        "</div>"
      );
    }
    return '<div class="card__media"><svg class="card__media-icon" aria-hidden="true"><use href="#i-gear"/></svg></div>';
  }

  function cardMarkup(product) {
    var specs = (product.specs || [])
      .map(function (s) { return "<li>" + escapeHtml(s.label) + " <b>" + escapeHtml(s.value) + "</b></li>"; })
      .join("");
    var datasheetMachine = product.quoteMachine + " – datasheet request";

    return (
      '<article class="card" data-category="' + escapeHtml(product.category) + '">' +
        mediaMarkup(product) +
        '<div class="card__body">' +
          '<h2 class="card__title">' + escapeHtml(product.title) + "</h2>" +
          '<ul class="spec-list">' + specs + "</ul>" +
          '<div class="card__actions">' +
            '<button class="btn btn--primary btn--sm" data-quote data-machine="' + escapeHtml(product.quoteMachine) + '" type="button">Request a Quote</button>' +
            '<button class="btn btn--ghost btn--sm" data-quote data-machine="' + escapeHtml(datasheetMachine) + '" type="button"><svg aria-hidden="true"><use href="#i-doc"/></svg> Datasheet</button>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  fetch("/api/products", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    })
    .then(function (products) {
      grid.innerHTML = products.map(cardMarkup).join("");
      window.dispatchEvent(new CustomEvent("products:rendered"));
    })
    .catch(function (err) {
      console.error("Mech-Tech: could not load products", err);
      grid.innerHTML =
        '<p class="filter-empty is-visible">Sorry, we could not load our product list right now. Please <a href="contact.html"><strong>contact us</strong></a> or try again shortly.</p>';
    });
})();
