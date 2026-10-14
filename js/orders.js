/**
 * Orders Tracking & History Logic (Lumina Store)
 */

let allOrders = [];

document.addEventListener("DOMContentLoaded", () => {
  loadOrders();
  setupOrderSearch();
});

// Load all orders
async function loadOrders() {
  const container = document.getElementById("ordersList");
  if (!container) return;

  container.innerHTML = '<div class="spinner"></div>';

  try {
    const orders = await OrderService.getAll();
    allOrders = orders;
    renderOrders(orders);
    updateOrdersStats(orders);
  } catch (error) {
    console.error("Failed to load orders:", error);
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <h3>Unable to load orders</h3>
        <p>Please check your network or Supabase database connectivity.</p>
        <button class="btn btn-primary" onclick="loadOrders()">Retry</button>
      </div>
    `;
    showToast("Error retrieving orders from Supabase", "error");
  }
}

// Render Order Cards
function renderOrders(orders) {
  const container = document.getElementById("ordersList");
  const countBadge = document.getElementById("totalOrdersBadge");
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${orders.length} Orders`;
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <h3>No Orders Found</h3>
        <p>There are no customer orders matching your query yet. You can browse products and place an order anytime.</p>
        <a href="index.html" class="btn btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const prod = order.Product || {};
    const fallbackImg = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80";
    const imageUrl = prod.Image_url && prod.Image_url.trim() !== "" ? prod.Image_url : fallbackImg;
    const phone = order["Customer_ph_no."] || order.Customer_ph_no || "N/A";
    const address = order.Custmer_address || "Standard Delivery Address";
    
    // Format timestamp
    const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) : "Recently placed";

    return `
      <article class="order-item-card" id="order-card-${order.id}">
        <img 
          src="${escapeHtml(imageUrl)}" 
          alt="${escapeHtml(prod.Product_Name || 'Ordered Product')}" 
          class="order-product-thumb"
          onerror="this.onerror=null; this.src='${fallbackImg}';"
        />

        <div class="order-details-info">
          <div class="order-meta-header">
            <span class="order-id-tag">Order #${order.id}</span>
            <span class="badge badge-emerald">● Confirmed</span>
            <span class="order-date">${dateStr}</span>
          </div>

          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-top: 0.25rem;">
            ${escapeHtml(prod.Product_Name || 'Product ID: #' + order.Order_id)}
          </h3>

          <div style="font-size: 0.85rem; color: var(--accent-cyan); font-weight: 600;">
            ${escapeHtml(prod.Company_name || 'Brand Item')}
          </div>

          <div class="order-customer-box">
            <div class="order-customer-row">
              <svg style="width:16px;height:16px;flex-shrink:0;color:var(--text-muted);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <span>Customer: <strong>${escapeHtml(order.Customer_name)}</strong></span>
            </div>

            <div class="order-customer-row" style="margin-top: 3px;">
              <svg style="width:16px;height:16px;flex-shrink:0;color:var(--text-muted);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              <span>Phone: <strong>${escapeHtml(String(phone))}</strong></span>
            </div>

            <div class="order-customer-row" style="margin-top: 3px;">
              <svg style="width:16px;height:16px;flex-shrink:0;color:var(--text-muted);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>Destination: <strong style="color:var(--text-secondary);">${escapeHtml(address)}</strong></span>
            </div>
          </div>
        </div>

        <div class="order-right-actions">
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Discount Applied</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #34d399; font-family: var(--font-display);">
              $${Number(prod.Discount_amount || 0).toLocaleString()} OFF
            </div>
          </div>

          <button class="btn btn-secondary btn-sm" onclick="printReceipt(${order.id})">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print Slip
          </button>
        </div>
      </article>
    `;
  }).join("");
}

// Search orders by Customer phone number
function setupOrderSearch() {
  const phoneSearchInput = document.getElementById("searchPhoneInput");
  const searchBtn = document.getElementById("btnSearchOrders");
  const clearBtn = document.getElementById("btnClearSearch");

  if (searchBtn && phoneSearchInput) {
    searchBtn.addEventListener("click", () => {
      const query = phoneSearchInput.value.trim();
      if (!query) {
        renderOrders(allOrders);
        return;
      }
      
      const cleanQ = query.replace(/[^0-9]/g, "");
      const matched = allOrders.filter(o => {
        const ph = String(o["Customer_ph_no."] || o.Customer_ph_no || "");
        return ph.includes(cleanQ);
      });

      renderOrders(matched);
      showToast(`Found ${matched.length} order(s) for query`, "info");
    });

    phoneSearchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        searchBtn.click();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (phoneSearchInput) phoneSearchInput.value = "";
      renderOrders(allOrders);
    });
  }
}

// Update Top stats on orders page
function updateOrdersStats(orders) {
  const totalEl = document.getElementById("statTotalOrders");
  const totalSavingsEl = document.getElementById("statTotalSavings");

  if (totalEl) totalEl.textContent = orders.length;
  if (totalSavingsEl) {
    const totalSavings = orders.reduce((sum, o) => sum + (o.Product?.Discount_amount || 0), 0);
    totalSavingsEl.textContent = `$${totalSavings.toLocaleString()}`;
  }
}

// Print single order receipt slip
function printReceipt(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const prod = order.Product || {};
  const phone = order["Customer_ph_no."] || order.Customer_ph_no || "N/A";
  const address = order.Custmer_address || "N/A";

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lumina Order Slip #${order.id}</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; color: #111; max-width: 600px; margin: 0 auto; }
        .header { border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
        .brand { font-size: 24px; font-weight: bold; letter-spacing: 1px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; }
        .label { color: #666; }
        .value { font-weight: 600; }
        .box { background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #888; font-size: 13px; margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">LUMINA E-COMMERCE</div>
        <div>ORDER #${order.id}</div>
      </div>
      <div class="row">
        <span class="label">Date:</span>
        <span class="value">${new Date(order.created_at).toLocaleString()}</span>
      </div>
      <div class="row">
        <span class="label">Customer Name:</span>
        <span class="value">${order.Customer_name}</span>
      </div>
      <div class="row">
        <span class="label">Phone:</span>
        <span class="value">${phone}</span>
      </div>
      <div class="row">
        <span class="label">Shipping Address:</span>
        <span class="value">${address}</span>
      </div>

      <div class="box">
        <div class="row">
          <span class="label">Product Item:</span>
          <span class="value">${prod.Product_Name || 'Product ID: #' + order.Order_id}</span>
        </div>
        <div class="row">
          <span class="label">Brand:</span>
          <span class="value">${prod.Company_name || 'Standard'}</span>
        </div>
        <div class="row">
          <span class="label">Discount Granted:</span>
          <span class="value" style="color: #059669;">$${prod.Discount_amount || 0} OFF</span>
        </div>
      </div>

      <div class="footer">
        Thank you for choosing Lumina. No login required • Direct Dispatch Order.
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
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
