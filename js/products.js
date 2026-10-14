/**
 * Products Catalog & Instant Order Logic (Lumina Store)
 * Wrapped in an IIFE to prevent variable collisions in production
 */
(function (window) {
  'use strict';

  var allProducts = [];
  var selectedProductForOrder = null;

  // Initialize on DOM load
  document.addEventListener("DOMContentLoaded", function () {
    loadProducts();
    setupFilterListeners();
    setupOrderModalListeners();
  });

  // Fetch and render products
  async function loadProducts() {
    var grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = '<div class="spinner"></div>';

    try {
      if (!window.ProductService) {
        throw new Error("ProductService is still loading. Please refresh.");
      }
      var products = await window.ProductService.getAll();
      allProducts = products;

      populateBrandFilter(products);
      renderProducts(products);
    } catch (error) {
      console.error("Failed to load products:", error);
      grid.innerHTML = 
        '<div class="empty-state">' +
          '<svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' +
          '</svg>' +
          '<h3>Unable to load products</h3>' +
          '<p>' + escapeHtml(error.message || "Please check your network connection.") + '</p>' +
          '<button class="btn btn-primary" onclick="window.loadProducts()">Try Again</button>' +
        '</div>';
      if (typeof window.showToast === "function") {
        window.showToast("Error loading catalog from Supabase", "error");
      }
    }
  }

  // Render product cards
  function renderProducts(products) {
    var grid = document.getElementById("productGrid");
    var countBadge = document.getElementById("productCount");
    if (!grid) return;

    if (countBadge) {
      countBadge.textContent = products.length + " Items";
    }

    if (products.length === 0) {
      grid.innerHTML = 
        '<div class="empty-state">' +
          '<svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>' +
          '</svg>' +
          '<h3>No Products Found</h3>' +
          '<p>Try adjusting your search criteria or add new items from the Admin Panel.</p>' +
          '<a href="admin.html" class="btn btn-primary">Go to Admin Panel</a>' +
        '</div>';
      return;
    }

    grid.innerHTML = products.map(function (product) {
      var isAvailable = product.is_available !== false;
      var fallbackImg = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80";
      var imageUrl = product.Image_url && product.Image_url.trim() !== "" ? product.Image_url : fallbackImg;
      var discountBadge = product.Discount_amount > 0 
        ? '<div class="card-badge-top-right"><span class="badge badge-amber">Save $' + product.Discount_amount + '</span></div>' 
        : '';
      var orderButton = isAvailable
        ? '<button class="btn btn-primary btn-sm" onclick="window.openOrderModal(' + product.id + ')">' +
            '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px;height:16px;">' +
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>' +
            '</svg>' +
            ' Order Now' +
          '</button>'
        : '<button class="btn btn-secondary btn-sm" disabled style="opacity: 0.55; cursor: not-allowed;">Unavailable</button>';

      return (
        '<article class="product-card" id="product-' + product.id + '">' +
          '<div class="card-media-wrapper">' +
            '<img src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(product.Product_Name) + '" class="card-media" loading="lazy" onerror="this.onerror=null; this.src=\'' + fallbackImg + '\';">' +
            '<div class="card-badge-top-left">' +
              '<span class="badge ' + (isAvailable ? 'badge-emerald' : 'badge-rose') + '">' +
                (isAvailable ? '● In Stock' : '✕ Sold Out') +
              '</span>' +
            '</div>' +
            discountBadge +
          '</div>' +
          '<div class="card-body">' +
            '<div class="card-company">' + escapeHtml(product.Company_name || 'Brand') + '</div>' +
            '<h2 class="card-title" title="' + escapeHtml(product.Product_Name) + '">' + escapeHtml(product.Product_Name) + '</h2>' +
            '<p class="card-desc" title="' + escapeHtml(product.Description) + '">' + escapeHtml(product.Description) + '</p>' +
            '<div class="card-footer">' +
              '<div class="discount-tag">' +
                '<span class="discount-label">Special Discount</span>' +
                '<span class="discount-val">$' + Number(product.Discount_amount || 0).toLocaleString() + ' <small style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">OFF</small></span>' +
              '</div>' +
              orderButton +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  // Brand filter populator
  function populateBrandFilter(products) {
    var brandSelect = document.getElementById("filterCompany");
    if (!brandSelect) return;

    var brands = [];
    products.forEach(function (p) {
      if (p.Company_name && brands.indexOf(p.Company_name) === -1) {
        brands.push(p.Company_name);
      }
    });
    brands.sort();
    
    brandSelect.innerHTML = '<option value="">All Brands (' + products.length + ')</option>' +
      brands.map(function (b) { return '<option value="' + escapeHtml(b) + '">' + escapeHtml(b) + '</option>'; }).join("");
  }

  // Search & Filter listeners
  function setupFilterListeners() {
    var searchInput = document.getElementById("searchProduct");
    var brandSelect = document.getElementById("filterCompany");
    var availabilitySelect = document.getElementById("filterAvailability");
    var sortSelect = document.getElementById("sortProducts");

    function applyFilters() {
      var filtered = allProducts.slice();

      var q = (searchInput && searchInput.value) ? searchInput.value.toLowerCase().trim() : "";
      if (q) {
        filtered = filtered.filter(function (p) {
          return (p.Product_Name && p.Product_Name.toLowerCase().indexOf(q) !== -1) ||
                 (p.Company_name && p.Company_name.toLowerCase().indexOf(q) !== -1) ||
                 (p.Description && p.Description.toLowerCase().indexOf(q) !== -1);
        });
      }

      var brand = brandSelect ? brandSelect.value : "";
      if (brand) {
        filtered = filtered.filter(function (p) { return p.Company_name === brand; });
      }

      var avail = availabilitySelect ? availabilitySelect.value : "all";
      if (avail === "in_stock") {
        filtered = filtered.filter(function (p) { return p.is_available !== false; });
      } else if (avail === "out_of_stock") {
        filtered = filtered.filter(function (p) { return p.is_available === false; });
      }

      var sort = sortSelect ? sortSelect.value : "newest";
      if (sort === "discount_desc") {
        filtered.sort(function (a, b) { return (b.Discount_amount || 0) - (a.Discount_amount || 0); });
      } else if (sort === "discount_asc") {
        filtered.sort(function (a, b) { return (a.Discount_amount || 0) - (b.Discount_amount || 0); });
      } else if (sort === "name_asc") {
        filtered.sort(function (a, b) { return (a.Product_Name || "").localeCompare(b.Product_Name || ""); });
      } else {
        filtered.sort(function (a, b) { return (b.id || 0) - (a.id || 0); });
      }

      renderProducts(filtered);
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (brandSelect) brandSelect.addEventListener("change", applyFilters);
    if (availabilitySelect) availabilitySelect.addEventListener("change", applyFilters);
    if (sortSelect) sortSelect.addEventListener("change", applyFilters);
  }

  // Quick Order Modal
  function openOrderModal(productId) {
    var product = allProducts.find(function (p) { return p.id === productId; });
    if (!product) return;

    selectedProductForOrder = product;

    document.getElementById("modalProductThumb").src = product.Image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800";
    document.getElementById("modalProductTitle").textContent = product.Product_Name;
    document.getElementById("modalProductCompany").textContent = product.Company_name;
    document.getElementById("modalProductDiscount").textContent = "$" + Number(product.Discount_amount || 0).toLocaleString() + " OFF";
    document.getElementById("orderProductIdInput").value = product.id;

    document.getElementById("orderCustomerName").value = "";
    document.getElementById("orderCustomerPhone").value = "";
    document.getElementById("orderCustomerAddress").value = "";

    var modal = document.getElementById("orderModal");
    if (modal) modal.classList.add("open");
    var nameField = document.getElementById("orderCustomerName");
    if (nameField) nameField.focus();
  }

  function closeOrderModal() {
    var modal = document.getElementById("orderModal");
    if (modal) modal.classList.remove("open");
    selectedProductForOrder = null;
  }

  // Order Form Submit Handler
  function setupOrderModalListeners() {
    var orderForm = document.getElementById("orderForm");
    var modal = document.getElementById("orderModal");

    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeOrderModal();
      });
    }

    if (orderForm) {
      orderForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        var submitBtn = document.getElementById("submitOrderBtn");
        var name = document.getElementById("orderCustomerName").value.trim();
        var phone = document.getElementById("orderCustomerPhone").value.trim();
        var address = document.getElementById("orderCustomerAddress").value.trim();
        var productId = document.getElementById("orderProductIdInput").value;

        if (!name || !phone || !address) {
          if (typeof window.showToast === "function") {
            window.showToast("Please fill in all checkout fields", "error");
          }
          return;
        }

        var numericPhone = phone.replace(/[^0-9]/g, "");
        if (numericPhone.length < 5) {
          if (typeof window.showToast === "function") {
            window.showToast("Please enter a valid numeric phone number", "error");
          }
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;margin:0;border-width:2px;"></div> Processing Order...';

          var newOrder = await window.OrderService.create({
            Order_id: productId,
            Customer_name: name,
            Customer_ph_no: numericPhone,
            Custmer_address: address
          });

          closeOrderModal();
          if (typeof window.showToast === "function") {
            window.showToast("🎉 Order Placed Successfully! (Order #" + newOrder[0].id + ")", "success");
          }

          showOrderSuccessModal(newOrder[0], selectedProductForOrder);
        } catch (err) {
          console.error("Order error:", err);
          if (typeof window.showToast === "function") {
            window.showToast("Failed to place order: " + (err.message || ""), "error");
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Confirm & Place Order";
        }
      });
    }
  }

  function showOrderSuccessModal(order, product) {
    var modal = document.getElementById("orderSuccessModal");
    if (!modal) return;

    var elId = document.getElementById("successOrderId");
    var elCust = document.getElementById("successCustomerName");
    var elPhone = document.getElementById("successPhone");
    var elAddr = document.getElementById("successAddress");
    var elProd = document.getElementById("successProductName");

    if (elId) elId.textContent = "#" + order.id;
    if (elCust) elCust.textContent = order.Customer_name;
    if (elPhone) elPhone.textContent = order["Customer_ph_no."] || order.Customer_ph_no;
    if (elAddr) elAddr.textContent = order.Custmer_address;
    if (elProd) elProd.textContent = product ? product.Product_Name : "Selected Item";
    
    modal.classList.add("open");
  }

  function closeSuccessModal() {
    var modal = document.getElementById("orderSuccessModal");
    if (modal) modal.classList.remove("open");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Expose handlers on window
  window.openOrderModal = openOrderModal;
  window.closeOrderModal = closeOrderModal;
  window.closeSuccessModal = closeSuccessModal;
  window.loadProducts = loadProducts;

})(window);
