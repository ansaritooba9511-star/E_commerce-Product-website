/**
 * Admin Panel Logic (Lumina Store)
 * Full CRUD for Products & Orders Management
 */

let adminProducts = [];
let adminOrders = [];
let editingProductId = null;

// Preset sample electronics images for 1-click convenience
const PRESET_PRODUCTS = [
  {
    Company_name: "Apple",
    Product_Name: "iPhone 16 Pro Max - 256GB Desert Titanium",
    Description: "Grade 5 titanium design, A18 Pro chip with 6-core GPU, next-gen Camera Control, and 4K 120 fps Dolby Vision.",
    Image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
    Discount_amount: 150,
    is_available: true
  },
  {
    Company_name: "Sony",
    Product_Name: "WH-1000XM5 Wireless Noise Cancelling Headphones",
    Description: "Industry-leading noise cancellation with two processors and 8 microphones. Ultra-comfortable lightweight design.",
    Image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    Discount_amount: 80,
    is_available: true
  },
  {
    Company_name: "Samsung",
    Product_Name: "Galaxy S24 Ultra - 512GB Titanium Gray",
    Description: "Galaxy AI features, 200MP camera with Quad Telephoto system, Snapdragon 8 Gen 3 for Galaxy, and built-in S Pen.",
    Image_url: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=80",
    Discount_amount: 200,
    is_available: true
  },
  {
    Company_name: "Apple",
    Product_Name: "MacBook Pro 16\" M3 Max Chip - Space Black",
    Description: "16-core CPU, 40-core GPU, Liquid Retina XDR display with up to 1600 nits peak brightness, 22 hours battery life.",
    Image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    Discount_amount: 350,
    is_available: true
  },
  {
    Company_name: "Bose",
    Product_Name: "QuietComfort Ultra Wireless Earbuds",
    Description: "Spatial audio, world-class active noise cancellation, and CustomTune sound calibration tailored to your ear canal.",
    Image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80",
    Discount_amount: 50,
    is_available: false
  }
];

document.addEventListener("DOMContentLoaded", () => {
  initAdmin();
  setupAdminTabs();
  setupAddProductModal();
  setupEditProductModal();
});

// Initialize Admin Dashboard
async function initAdmin() {
  await Promise.all([loadAdminProducts(), loadAdminOrders()]);
  updateAdminKPIs();
}

// Load Products for Admin
async function loadAdminProducts() {
  const tbody = document.getElementById("adminProductsTableBody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><div class="spinner"></div></td></tr>';

  try {
    adminProducts = await ProductService.getAll();
    renderAdminProductsTable(adminProducts);
    updateAdminKPIs();
  } catch (err) {
    console.error("Admin products error:", err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#f43f5e; padding: 2rem;">Failed to load products. Check Supabase connection.</td></tr>';
    showToast("Error loading products", "error");
  }
}

// Render Admin Products Table
function renderAdminProductsTable(products) {
  const tbody = document.getElementById("adminProductsTableBody");
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 3rem;">
          <div style="color:var(--text-secondary); margin-bottom: 1rem;">No products in database yet.</div>
          <button class="btn btn-primary btn-sm" onclick="seedSampleProducts()">Seed Sample Inventory</button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const fallbackImg = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800";
    const imgUrl = p.Image_url || fallbackImg;
    const isAvail = p.is_available !== false;

    return `
      <tr id="admin-prod-row-${p.id}">
        <td><strong style="color:#a5b4fc;">#${p.id}</strong></td>
        <td>
          <div class="table-product-meta">
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.Product_Name)}" class="table-product-thumb" onerror="this.src='${fallbackImg}'">
            <div>
              <div style="font-weight:700; color:var(--text-main);">${escapeHtml(p.Product_Name)}</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(p.Description).slice(0, 50)}...</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge badge-indigo">${escapeHtml(p.Company_name)}</span>
        </td>
        <td>
          <strong style="color:#34d399; font-family:var(--font-display);">$${Number(p.Discount_amount || 0).toLocaleString()}</strong>
        </td>
        <td>
          <label class="switch" title="Toggle availability">
            <input type="checkbox" ${isAvail ? "checked" : ""} onchange="handleToggleProductAvailability(${p.id}, ${isAvail})">
            <span class="slider"></span>
          </label>
        </td>
        <td>
          <span class="badge ${isAvail ? 'badge-emerald' : 'badge-rose'}">
            ${isAvail ? 'Available' : 'Unavailable'}
          </span>
        </td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEditModal(${p.id})" title="Edit details">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteProduct(${p.id})" title="Delete product">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Load Orders for Admin
async function loadAdminOrders() {
  const tbody = document.getElementById("adminOrdersTableBody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><div class="spinner"></div></td></tr>';

  try {
    adminOrders = await OrderService.getAll();
    renderAdminOrdersTable(adminOrders);
    updateAdminKPIs();
  } catch (err) {
    console.error("Admin orders error:", err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#f43f5e; padding: 2rem;">Failed to load orders.</td></tr>';
  }
}

// Render Admin Orders Table
function renderAdminOrdersTable(orders) {
  const tbody = document.getElementById("adminOrdersTableBody");
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 3rem; color:var(--text-secondary);">
          No customer orders placed yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const prod = o.Product || {};
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) : "-";
    const phone = o["Customer_ph_no."] || o.Customer_ph_no || "N/A";

    return `
      <tr id="admin-order-row-${o.id}">
        <td><strong style="color:#a5b4fc;">#${o.id}</strong></td>
        <td>${dateStr}</td>
        <td>
          <div style="font-weight:600; color:var(--text-main);">${escapeHtml(o.Customer_name)}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(String(phone))}</div>
        </td>
        <td>
          <div style="font-size:0.85rem; max-width:240px; color:var(--text-secondary); line-height:1.4;">
            ${escapeHtml(o.Custmer_address)}
          </div>
        </td>
        <td>
          <div style="font-weight:600; color:var(--text-main);">${escapeHtml(prod.Product_Name || 'Product #' + o.Order_id)}</div>
          <div style="font-size:0.75rem; color:var(--accent-cyan); font-weight:700;">${escapeHtml(prod.Company_name || '')}</div>
        </td>
        <td>
          <span class="badge badge-emerald">$${Number(prod.Discount_amount || 0).toLocaleString()} OFF</span>
        </td>
        <td style="text-align:right;">
          <button class="btn btn-danger btn-sm" onclick="handleDeleteOrder(${o.id})" title="Delete order">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// Update Top KPI Counters
function updateAdminKPIs() {
  const totalProds = adminProducts.length;
  const availProds = adminProducts.filter(p => p.is_available !== false).length;
  const outOfStock = totalProds - availProds;
  const totalOrders = adminOrders.length;

  document.getElementById("kpiTotalProducts").textContent = totalProds;
  document.getElementById("kpiAvailableProducts").textContent = availProds;
  document.getElementById("kpiOutOfStock").textContent = outOfStock;
  document.getElementById("kpiTotalOrders").textContent = totalOrders;
}

// Toggle Availability Handler
async function handleToggleProductAvailability(productId, currentStatus) {
  try {
    await ProductService.toggleAvailability(productId, currentStatus);
    showToast(`Product availability updated`, "success");
    await loadAdminProducts();
  } catch (err) {
    console.error("Toggle error:", err);
    showToast("Failed to toggle availability", "error");
    loadAdminProducts();
  }
}

// Delete Product Handler
async function handleDeleteProduct(productId) {
  if (!confirm(`Are you sure you want to delete Product #${productId}?`)) return;

  try {
    await ProductService.delete(productId);
    showToast(`Product #${productId} deleted`, "success");
    await loadAdminProducts();
  } catch (err) {
    console.error("Delete error:", err);
    showToast("Cannot delete: it might be linked to existing orders. " + (err.message || ""), "error");
  }
}

// Delete Order Handler
async function handleDeleteOrder(orderId) {
  if (!confirm(`Are you sure you want to remove Order #${orderId}?`)) return;

  try {
    await OrderService.delete(orderId);
    showToast(`Order #${orderId} removed`, "success");
    await loadAdminOrders();
  } catch (err) {
    console.error("Delete order error:", err);
    showToast("Failed to delete order", "error");
  }
}

// Add Product Modal & Form
function setupAddProductModal() {
  const form = document.getElementById("addProductForm");
  const modal = document.getElementById("addProductModal");
  const imgInput = document.getElementById("addProdImage");
  const previewImg = document.getElementById("addProdImagePreview");

  if (imgInput && previewImg) {
    imgInput.addEventListener("input", () => {
      const val = imgInput.value.trim();
      previewImg.src = val || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800";
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAddProductModal();
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submitAddProdBtn");

      const company = document.getElementById("addProdCompany").value.trim();
      const name = document.getElementById("addProdName").value.trim();
      const desc = document.getElementById("addProdDesc").value.trim();
      const img = document.getElementById("addProdImage").value.trim();
      const discount = document.getElementById("addProdDiscount").value;
      const isAvailable = document.getElementById("addProdAvailable").checked;

      if (!company || !name || !desc || !img) {
        showToast("Please fill all required fields", "error");
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving to Supabase...";

        await ProductService.create({
          Company_name: company,
          Product_Name: name,
          Description: desc,
          Image_url: img,
          Discount_amount: discount,
          is_available: isAvailable
        });

        showToast("Product created successfully!", "success");
        closeAddProductModal();
        form.reset();
        await loadAdminProducts();
      } catch (err) {
        console.error("Add product error:", err);
        showToast("Failed to create product: " + (err.message || ""), "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add Product";
      }
    });
  }
}

function openAddProductModal() {
  document.getElementById("addProductModal").classList.add("open");
}

function closeAddProductModal() {
  document.getElementById("addProductModal").classList.remove("open");
}

// Edit Product Modal & Form
function setupEditProductModal() {
  const form = document.getElementById("editProductForm");
  const modal = document.getElementById("editProductModal");
  const imgInput = document.getElementById("editProdImage");
  const previewImg = document.getElementById("editProdImagePreview");

  if (imgInput && previewImg) {
    imgInput.addEventListener("input", () => {
      const val = imgInput.value.trim();
      previewImg.src = val || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800";
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeEditProductModal();
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!editingProductId) return;

      const submitBtn = document.getElementById("submitEditProdBtn");
      const company = document.getElementById("editProdCompany").value.trim();
      const name = document.getElementById("editProdName").value.trim();
      const desc = document.getElementById("editProdDesc").value.trim();
      const img = document.getElementById("editProdImage").value.trim();
      const discount = document.getElementById("editProdDiscount").value;
      const isAvailable = document.getElementById("editProdAvailable").checked;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Updating Supabase...";

        await ProductService.update(editingProductId, {
          Company_name: company,
          Product_Name: name,
          Description: desc,
          Image_url: img,
          Discount_amount: discount,
          is_available: isAvailable
        });

        showToast(`Product #${editingProductId} updated!`, "success");
        closeEditProductModal();
        await loadAdminProducts();
      } catch (err) {
        console.error("Update error:", err);
        showToast("Failed to update product: " + (err.message || ""), "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Changes";
      }
    });
  }
}

function openEditModal(productId) {
  const p = adminProducts.find(item => item.id === productId);
  if (!p) return;

  editingProductId = productId;
  document.getElementById("editProdId").textContent = `#${p.id}`;
  document.getElementById("editProdCompany").value = p.Company_name || "";
  document.getElementById("editProdName").value = p.Product_Name || "";
  document.getElementById("editProdDesc").value = p.Description || "";
  document.getElementById("editProdImage").value = p.Image_url || "";
  document.getElementById("editProdDiscount").value = p.Discount_amount || 0;
  document.getElementById("editProdAvailable").checked = p.is_available !== false;
  document.getElementById("editProdImagePreview").src = p.Image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800";

  document.getElementById("editProductModal").classList.add("open");
}

function closeEditProductModal() {
  document.getElementById("editProductModal").classList.remove("open");
  editingProductId = null;
}

// 1-Click Inventory Seeding for User Convenience
async function seedSampleProducts() {
  const btn = event?.currentTarget;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Seeding Catalog...";
  }

  try {
    for (const item of PRESET_PRODUCTS) {
      await ProductService.create(item);
    }
    showToast("5 sample products seeded into Supabase!", "success");
    await loadAdminProducts();
  } catch (err) {
    console.error("Seeding error:", err);
    showToast("Error during seeding: " + (err.message || ""), "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Seed Sample Inventory";
    }
  }
}

// Admin Tab switcher
function setupAdminTabs() {
  const tabs = document.querySelectorAll(".admin-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.target;
      document.getElementById("adminProductsSection").style.display = target === "products" ? "block" : "none";
      document.getElementById("adminOrdersSection").style.display = target === "orders" ? "block" : "none";
    });
  });
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
