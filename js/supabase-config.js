/**
 * Supabase Client Configuration & Database Utilities
 * Using Supabase JS v2 from CDN
 */

const SUPABASE_URL = "https://wdgxidyubxpnhrerdtdw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xTemYGhpMKTLCl6ys6g18Q_sMFQd13m";

// Initialize Supabase Client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Product Database Operations
const ProductService = {
  // Fetch all products
  async getAll() {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
      .from("Product")
      .select("*")
      .order("id", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Fetch only available products
  async getAvailable() {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
      .from("Product")
      .select("*")
      .eq("is_available", true)
      .order("id", { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get single product by ID
  async getById(id) {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
      .from("Product")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Add new product
  async create(product) {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
      .from("Product")
      .insert([{
        Company_name: product.Company_name,
        Product_Name: product.Product_Name,
        Description: product.Description,
        Image_url: product.Image_url,
        Discount_amount: parseInt(product.Discount_amount, 10) || 0,
        is_available: product.is_available !== undefined ? product.is_available : true
      }])
      .select();

    if (error) throw error;
    return data;
  },

  // Update product
  async update(id, updates) {
    if (!supabase) throw new Error("Supabase client not initialized");
    const payload = {};
    if (updates.Company_name !== undefined) payload.Company_name = updates.Company_name;
    if (updates.Product_Name !== undefined) payload.Product_Name = updates.Product_Name;
    if (updates.Description !== undefined) payload.Description = updates.Description;
    if (updates.Image_url !== undefined) payload.Image_url = updates.Image_url;
    if (updates.Discount_amount !== undefined) payload.Discount_amount = parseInt(updates.Discount_amount, 10) || 0;
    if (updates.is_available !== undefined) payload.is_available = updates.is_available;

    const { data, error } = await supabase
      .from("Product")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data;
  },

  // Toggle availability
  async toggleAvailability(id, currentStatus) {
    return this.update(id, { is_available: !currentStatus });
  },

  // Delete product
  async delete(id) {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
      .from("Product")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return data;
  }
};

// Order Database Operations
const OrderService = {
  // Fetch all orders with linked Product details
  async getAll() {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
      .from("Order")
      .select("*, Product(*)")
      .order("id", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create an order
  async create(orderData) {
    if (!supabase) throw new Error("Supabase client not initialized");
    // Ensure numeric phone number
    const cleanPhone = String(orderData.Customer_ph_no).replace(/[^0-9]/g, "");
    const numericPhone = cleanPhone ? parseInt(cleanPhone, 10) : 0;

    const { data, error } = await supabase
      .from("Order")
      .insert([{
        Order_id: parseInt(orderData.Order_id, 10),
        Customer_name: orderData.Customer_name.trim(),
        "Customer_ph_no.": numericPhone,
        Custmer_address: orderData.Custmer_address.trim()
      }])
      .select("*, Product(*)");

    if (error) throw error;
    return data;
  },

  // Search orders by Customer phone number
  async searchByPhone(phoneQuery) {
    if (!supabase) throw new Error("Supabase client not initialized");
    const cleanPhone = String(phoneQuery).replace(/[^0-9]/g, "");
    if (!cleanPhone) return [];

    const { data, error } = await supabase
      .from("Order")
      .select("*, Product(*)")
      .eq("Customer_ph_no.", parseInt(cleanPhone, 10))
      .order("id", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Delete order (for admin management)
  async delete(id) {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
      .from("Order")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return data;
  }
};

// UI Notification Toast Helper
function showToast(message, type = "success") {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const icon = type === "success" ? "✓" : (type === "error" ? "✕" : "ℹ");
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.classList.add("toast-fadeout");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
