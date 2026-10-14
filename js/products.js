/**
 * Products Catalog & Instant Order Logic (Lumina Store)
 */

let allProducts = [];
let selectedProductForOrder = null;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  setupFilterListeners();
  setupOrderModalListeners();
});

// Fetch and render products
async function loadProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const products = await ProductService.getAll();
    allProducts = products;

    populateBrandFilter(products);
    renderProducts(products);
  } catch (error) {
    console.error("Failed to load products:", error);
    grid.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <h3>Unable to load products</h3>
        <p>Please check your Supabase connection or try refreshing the page.</p>
        <button class="btn btn-primary" onclick="loadProducts()">Try Again</button>
      </div>
    `;
    showToast("Error loading catalog from Supabase", "error");
  }
}

// Render product cards
function renderProducts(products) {
  const grid = document.getElementById("productGrid");
  const countBadge = document.getElementById("productCount");
  if (!grid) return;

  if (countBadge) {
    countBadge.textContent = `${products.length} Items`;
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <h3>No Products Found</h3>
        <p>Try adjusting your search criteria or add new items from the Admin Panel.</p>
        <a href="admin.html" class="btn btn-primary">Go to Admin Panel</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(product => {
    const isAvailable = product.is_available !== false;
    const fallbackImg = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80";
    const imageUrl = product.Image_url && product.Image_url.trim() !== "" ? product.Image_url : fallbackImg;

    return `
      <article class="product-card" id="product-${product.id}">
        <div class="card-media-wrapper">
          <img 
            src="${escapeHtml(imageUrl)}" 
            alt="${escapeHtml(product.Product_Name)}" 
            class="card-media"
            loading="lazy"
            onerror="this.onerror=null; this.src='${fallbackImg}';"
          />
          <div class="card-badge-top-left">
            <span class="badge ${isAvailable ? 'badge-emerald' : 'badge-rose'}">
              ${isAvailable ? '● In Stock' : '✕ Sold Out'}
            </span>
          </div>
          ${product.Discount_amount > 0 ? `
            <div class="card-badge-top-right">
              <span class="badge badge-amber">
                Save $${product.Discount_amount}
              </span>
            </div>
          ` : ''}
        </div>

        <div class="card-body">
          <div class="card-company">${escapeHtml(product.Company_name || 'Brand')}</div>
          <h2 class="card-title" title="${escapeHtml(product.Product_Name)}">${escapeHtml(product.Product_Name)}</h2>
          <p class="card-desc" title="${escapeHtml(product.Description)}">${escapeHtml(product.Description)}</p>

          <div class="card-footer">
            <div class="discount-tag">
              <span class="discount-label">Special Discount</span>
              <span class="discount-val">$${Number(product.Discount_amount || 0).toLocaleString()} <small style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">OFF</small></span>
            </div>

            ${isAvailable ? `
              <button class="btn btn-primary btn-sm" onclick="openOrderModal(${product.id})">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
                Order Now
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.55; cursor: not-allowed;">
                Unavailable
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// Brand filter populator
function populateBrandFilter(products) {
  const brandSelect = document.getElementById("filterCompany");
  if (!brandSelect) return;

  const brands = [...new Set(products.map(p => p.Company_name).filter(Boolean))].sort();
  
  brandSelect.innerHTML = `<option value="">All Brands (${products.length})</option>` +
    brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
}

// Search & Filter listeners
function setupFilterListeners() {
  const searchInput = document.getElementById("searchProduct");
  const brandSelect = document.getElementById("filterCompany");
  const availabilitySelect = document.getElementById("filterAvailability");
  const sortSelect = document.getElementById("sortProducts");

  function applyFilters() {
    let filtered = [...allProducts];

    // Search query
    const q = (searchInput?.value || "").toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(p => 
        (p.Product_Name && p.Product_Name.toLowerCase().includes(q)) ||
        (p.Company_name && p.Company_name.toLowerCase().includes(q)) ||
        (p.Description && p.Description.toLowerCase().includes(q))
      );
    }

    // Brand
    const brand = brandSelect?.value;
    if (brand) {
      filtered = filtered.filter(p => p.Company_name === brand);
    }

    // Availability
    const avail = availabilitySelect?.value;
    if (avail === "in_stock") {
      filtered = filtered.filter(p => p.is_available !== false);
    } else if (avail === "out_of_stock") {
      filtered = filtered.filter(p => p.is_available === false);
    }

    // Sorting
    const sort = sortSelect?.value;
    if (sort === "discount_desc") {
      filtered.sort((a, b) => (b.Discount_amount || 0) - (a.Discount_amount || 0));
    } else if (sort === "discount_asc") {
      filtered.sort((a, b) => (a.Discount_amount || 0) - (b.Discount_amount || 0));
    } else if (sort === "name_asc") {
      filtered.sort((a, b) => (a.Product_Name || "").localeCompare(b.Product_Name || ""));
    } else {
      // Default: Newest first
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
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
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  selectedProductForOrder = product;

  document.getElementById("modalProductThumb").src = product.Image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800";
  document.getElementById("modalProductTitle").textContent = product.Product_Name;
  document.getElementById("modalProductCompany").textContent = product.Company_name;
  document.getElementById("modalProductDiscount").textContent = `$${Number(product.Discount_amount || 0).toLocaleString()} OFF`;
  document.getElementById("orderProductIdInput").value = product.id;

  // Clear previous customer inputs
  document.getElementById("orderCustomerName").value = "";
  document.getElementById("orderCustomerPhone").value = "";
  document.getElementById("orderCustomerAddress").value = "";

  const modal = document.getElementById("orderModal");
  modal.classList.add("open");
  document.getElementById("orderCustomerName").focus();
}

function closeOrderModal() {
  const modal = document.getElementById("orderModal");
  if (modal) modal.classList.remove("open");
  selectedProductForOrder = null;
}

// Order Form Submit Handler
function setupOrderModalListeners() {
  const orderForm = document.getElementById("orderForm");
  const modal = document.getElementById("orderModal");

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeOrderModal();
    });
  }

  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById("submitOrderBtn");
      const name = document.getElementById("orderCustomerName").value.trim();
      const phone = document.getElementById("orderCustomerPhone").value.trim();
      const address = document.getElementById("orderCustomerAddress").value.trim();
      const productId = document.getElementById("orderProductIdInput").value;

      if (!name || !phone || !address) {
        showToast("Please fill in all checkout fields", "error");
        return;
      }

      // Check numeric phone
      const numericPhone = phone.replace(/[^0-9]/g, "");
      if (numericPhone.length < 5) {
        showToast("Please enter a valid numeric phone number", "error");
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <div class="spinner" style="width:16px;height:16px;margin:0;border-width:2px;"></div>
          Processing Order...
        `;

        const newOrder = await OrderService.create({
          Order_id: productId,
          Customer_name: name,
          Customer_ph_no: numericPhone,
          Custmer_address: address
        });

        closeOrderModal();
        showToast(`🎉 Order Placed Successfully! (Order #${newOrder[0].id})`, "success");

        // Show confirmation popup
        showOrderSuccessModal(newOrder[0], selectedProductForOrder);
      } catch (err) {
        console.error("Order error:", err);
        showToast("Failed to place order. " + (err.message || ""), "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Confirm & Place Order`;
      }
    });
  }
}

// Show Post-Order Confirmation Modal
function showOrderSuccessModal(order, product) {
  const modal = document.getElementById("orderSuccessModal");
  if (!modal) return;

  document.getElementById("successOrderId").textContent = `#${order.id}`;
  document.getElementById("successCustomerName").textContent = order.Customer_name;
  document.getElementById("successPhone").textContent = order["Customer_ph_no."] || order.Customer_ph_no;
  document.getElementById("successAddress").textContent = order.Custmer_address;
  document.getElementById("successProductName").textContent = product ? product.Product_Name : "Selected Item";
  
  modal.classList.add("open");
}

function closeSuccessModal() {
  const modal = document.getElementById("orderSuccessModal");
  if (modal) modal.classList.remove("open");
}

// Utility HTML escape
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

