/* ==========================================================================
   MECH-TECH ADMIN — product manager logic
   Password gate + product CRUD against /api/products, image upload against
   /api/upload. No framework — vanilla DOM, mirrors the patterns already
   used in js/main.js (delegated listeners, feature-guarded by element
   existence).
   ========================================================================== */
(function () {
  "use strict";

  var CATEGORY_LABELS = {
    cutting: "Cutting",
    forming: "Forming",
    drilling: "Drilling & Milling",
    turning: "Turning",
    cnc: "CNC",
    finishing: "Finishing"
  };

  var loginView = document.getElementById("login-view");
  var dashboardView = document.getElementById("dashboard-view");
  var logoutBtn = document.getElementById("logout-btn");
  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");
  var passwordInput = document.getElementById("admin-password");

  var grid = document.getElementById("admin-grid");
  var emptyNote = document.getElementById("admin-empty");
  var statusNote = document.getElementById("admin-status");
  var filterbar = document.querySelector(".admin-toolbar .filterbar");
  var addBtn = document.getElementById("add-product-btn");

  var modal = document.getElementById("product-modal");
  var form = document.getElementById("product-form");
  var modalTitle = document.getElementById("product-modal-title");
  var specsEditor = document.getElementById("specs-editor");
  var addSpecBtn = document.getElementById("add-spec-btn");
  var imageInput = document.getElementById("pf-image-input");
  var imagePreview = document.getElementById("image-preview");
  var imageRemoveBtn = document.getElementById("image-remove-btn");
  var imageHiddenInput = form.querySelector("input[name='image']");
  var imageError = document.getElementById("image-error");
  var specsError = document.getElementById("specs-error");
  var saveBtn = document.getElementById("product-save-btn");

  var products = [];
  var activeCategory = "all";

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function setStatus(msg, isError) {
    statusNote.textContent = msg;
    statusNote.hidden = !msg;
    statusNote.style.color = isError ? "#d64545" : "";
  }

  /* ---------------- Auth ---------------- */

  function showDashboard() {
    loginView.hidden = true;
    logoutBtn.hidden = false;
    dashboardView.hidden = false;
    loadProducts();
  }

  function showLogin() {
    dashboardView.hidden = true;
    logoutBtn.hidden = true;
    loginView.hidden = false;
    passwordInput.value = "";
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.style.display = "none";
    fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput.value })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("bad login");
        showDashboard();
      })
      .catch(function () {
        loginError.style.display = "block";
        passwordInput.focus();
      });
  });

  logoutBtn.addEventListener("click", function () {
    fetch("/api/admin-logout", { method: "POST" }).then(showLogin);
  });

  showLogin();

  /* ---------------- Load + render ---------------- */

  function loadProducts() {
    fetch("/api/products", { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        products = data;
        renderGrid();
      })
      .catch(function () {
        setStatus("Could not load products. Refresh to try again.", true);
      });
  }

  function renderGrid() {
    var visible = products.filter(function (p) {
      return activeCategory === "all" || p.category === activeCategory;
    });
    grid.innerHTML = visible.map(cardMarkup).join("");
    emptyNote.classList.toggle("is-visible", visible.length === 0);

    grid.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var product = products.find(function (p) { return p.id === btn.getAttribute("data-edit"); });
        if (product) openModal(product);
      });
    });
    grid.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteProduct(btn.getAttribute("data-delete"));
      });
    });
  }

  function cardMarkup(product) {
    var media = product.image
      ? '<div class="card__media">' +
          (product.badge ? '<span class="product-card__badge">' + escapeHtml(product.badge) + "</span>" : "") +
          '<img src="' + escapeHtml(product.image) + '" alt="" loading="lazy">' +
        "</div>"
      : '<div class="card__media"><svg class="card__media-icon" aria-hidden="true"><use href="#i-gear"/></svg></div>';

    var specs = (product.specs || [])
      .map(function (s) { return "<li>" + escapeHtml(s.label) + " <b>" + escapeHtml(s.value) + "</b></li>"; })
      .join("");

    return (
      '<article class="card admin-card">' + media +
        '<div class="card__body">' +
          '<span class="admin-card__category">' + escapeHtml(CATEGORY_LABELS[product.category] || product.category) + "</span>" +
          '<h2 class="card__title">' + escapeHtml(product.title) + "</h2>" +
          '<ul class="spec-list">' + specs + "</ul>" +
          '<div class="card__actions">' +
            '<button class="btn btn--ghost btn--sm" data-edit="' + escapeHtml(product.id) + '" type="button">Edit</button>' +
            '<button class="btn btn--ghost btn--sm" data-delete="' + escapeHtml(product.id) + '" type="button">Delete</button>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  /* ---------------- Filter chips ---------------- */

  if (filterbar) {
    var chips = filterbar.querySelectorAll(".chip");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) {
          c.classList.remove("is-active");
          c.setAttribute("aria-pressed", "false");
        });
        chip.classList.add("is-active");
        chip.setAttribute("aria-pressed", "true");
        activeCategory = chip.getAttribute("data-filter");
        renderGrid();
      });
    });
  }

  /* ---------------- Delete ---------------- */

  function deleteProduct(id) {
    var product = products.find(function (p) { return p.id === id; });
    if (!product) return;
    if (!window.confirm('Delete "' + product.title + '"? This cannot be undone.')) return;

    fetch("/api/products?id=" + encodeURIComponent(id), { method: "DELETE" })
      .then(function (res) {
        if (res.status === 401) { showLogin(); throw new Error("unauthorized"); }
        if (!res.ok && res.status !== 204) throw new Error("delete failed");
        setStatus('Deleted "' + product.title + '".', false);
        loadProducts();
      })
      .catch(function (err) {
        if (err.message !== "unauthorized") setStatus("Could not delete that product.", true);
      });
  }

  /* ---------------- Specs editor (1-3 rows) ---------------- */

  function specRowMarkup(label, value) {
    return (
      '<div class="spec-row">' +
        '<input type="text" placeholder="Label (e.g. Type)" class="spec-label" value="' + escapeHtml(label || "") + '">' +
        '<input type="text" placeholder="Value" class="spec-value" value="' + escapeHtml(value || "") + '">' +
        '<button type="button" class="spec-row__remove" aria-label="Remove row">&times;</button>' +
      "</div>"
    );
  }

  function addSpecRow(label, value) {
    if (specsEditor.children.length >= 3) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = specRowMarkup(label, value);
    var row = wrap.firstChild;
    row.querySelector(".spec-row__remove").addEventListener("click", function () {
      row.remove();
      syncAddSpecBtn();
    });
    specsEditor.appendChild(row);
    syncAddSpecBtn();
  }

  function syncAddSpecBtn() {
    addSpecBtn.hidden = specsEditor.children.length >= 3;
  }

  addSpecBtn.addEventListener("click", function () { addSpecRow("", ""); });

  function readSpecs() {
    return Array.prototype.map
      .call(specsEditor.querySelectorAll(".spec-row"), function (row) {
        return {
          label: row.querySelector(".spec-label").value.trim(),
          value: row.querySelector(".spec-value").value.trim()
        };
      })
      .filter(function (s) { return s.label && s.value; });
  }

  /* ---------------- Image upload (client-side resize, then POST) ---------------- */

  var MAX_DIMENSION = 1000;

  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale);
          var h = Math.round(img.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  imageInput.addEventListener("change", function () {
    var file = imageInput.files[0];
    if (!file) return;
    imageError.style.display = "none";

    resizeImage(file)
      .then(function (dataUrl) {
        return fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: "image/jpeg", dataUrl: dataUrl })
        });
      })
      .then(function (res) {
        if (res.status === 401) { showLogin(); throw new Error("unauthorized"); }
        if (!res.ok) throw new Error("upload failed");
        return res.json();
      })
      .then(function (data) {
        imageHiddenInput.value = data.url;
        renderImagePreview(data.url);
      })
      .catch(function (err) {
        if (err.message !== "unauthorized") imageError.style.display = "block";
      });
  });

  imageRemoveBtn.addEventListener("click", function () {
    imageHiddenInput.value = "";
    imageInput.value = "";
    renderImagePreview("");
  });

  function renderImagePreview(url) {
    if (url) {
      imagePreview.innerHTML = '<img src="' + escapeHtml(url) + '" alt="">';
      imageRemoveBtn.hidden = false;
    } else {
      imagePreview.innerHTML = "<span>No photo — will show the default gear icon</span>";
      imageRemoveBtn.hidden = true;
    }
  }

  /* ---------------- Modal open/close ---------------- */

  function openModal(product) {
    form.reset();
    specsEditor.innerHTML = "";
    Array.prototype.forEach.call(form.querySelectorAll(".form-field.has-error"), function (f) {
      f.classList.remove("has-error");
    });
    imageError.style.display = "none";
    specsError.style.display = "none";

    if (product) {
      modalTitle.textContent = "Edit Product";
      form.querySelector("[name='id']").value = product.id;
      form.querySelector("[name='title']").value = product.title;
      form.querySelector("[name='category']").value = product.category;
      form.querySelector("[name='badge']").value = product.badge || "";
      form.querySelector("[name='quoteMachine']").value = product.quoteMachine;
      imageHiddenInput.value = product.image || "";
      renderImagePreview(product.image || "");
      (product.specs && product.specs.length ? product.specs : [{ label: "", value: "" }]).forEach(function (s) {
        addSpecRow(s.label, s.value);
      });
    } else {
      modalTitle.textContent = "Add Product";
      form.querySelector("[name='id']").value = "";
      imageHiddenInput.value = "";
      renderImagePreview("");
      addSpecRow("", "");
    }

    modal.hidden = false;
    void modal.offsetHeight;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    window.setTimeout(function () { modal.hidden = true; }, 250);
  }

  addBtn.addEventListener("click", function () { openModal(null); });

  document.addEventListener("click", function (e) {
    if (e.target.closest("#product-modal [data-modal-close]")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  /* ---------------- Save (create/update) ---------------- */

  function setFieldError(name, hasError) {
    var field = form.querySelector("[name='" + name + "']");
    var wrap = field ? field.closest(".form-field") : null;
    if (wrap) wrap.classList.toggle("has-error", hasError);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var id = form.querySelector("[name='id']").value;
    var title = form.querySelector("[name='title']").value.trim();
    var category = form.querySelector("[name='category']").value;
    var quoteMachine = form.querySelector("[name='quoteMachine']").value.trim();
    var badge = form.querySelector("[name='badge']").value.trim();
    var image = imageHiddenInput.value || null;
    var specs = readSpecs();

    setFieldError("title", !title);
    setFieldError("category", !category);
    setFieldError("quoteMachine", !quoteMachine);
    specsError.style.display = specs.length === 0 ? "block" : "none";

    if (!title || !category || !quoteMachine || specs.length === 0) return;

    var payload = {
      title: title,
      category: category,
      quoteMachine: quoteMachine,
      badge: badge,
      image: image,
      specs: specs
    };
    var url = id ? "/api/products?id=" + encodeURIComponent(id) : "/api/products";
    var method = id ? "PUT" : "POST";

    saveBtn.disabled = true;
    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (res.status === 401) { showLogin(); throw new Error("unauthorized"); }
        if (!res.ok) return res.json().then(function (body) { throw body; });
        return res.json();
      })
      .then(function () {
        closeModal();
        setStatus(id ? "Product updated." : "Product added.", false);
        loadProducts();
      })
      .catch(function (err) {
        if (err && err.message === "unauthorized") return;
        setStatus((err && err.error) || "Could not save this product.", true);
      })
      .finally(function () {
        saveBtn.disabled = false;
      });
  });
})();
