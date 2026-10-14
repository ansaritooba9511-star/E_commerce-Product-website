/**
 * Supabase Client Configuration & Database Utilities (Lumina Store)
 * Wrapped in an IIFE to prevent any lexical identifier collisions in production
 */
(function (window) {
  'use strict';

  var SUPABASE_URL = "https://wdgxidyubxpnhrerdtdw.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_xTemYGhpMKTLCl6ys6g18Q_sMFQd13m";

  // Helper to safely get or initialize the Supabase client
  function getClient() {
    if (window._luminaSupabaseClient) {
      return window._luminaSupabaseClient;
    }
    if (window.supabase && typeof window.supabase.createClient === "function") {
      window._luminaSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return window._luminaSupabaseClient;
    }
    return null;
  }

  // Product Database Operations
  var ProductService = {
    // Fetch all products
    async getAll() {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized. Please ensure the Supabase CDN script loaded.");
      var res = await client
        .from("Product")
        .select("*")
        .order("id", { ascending: false });
      
      if (res.error) throw res.error;
      return res.data || [];
    },

    // Fetch only available products
    async getAvailable() {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var res = await client
        .from("Product")
        .select("*")
        .eq("is_available", true)
        .order("id", { ascending: false });
      
      if (res.error) throw res.error;
      return res.data || [];
    },

    // Get single product by ID
    async getById(id) {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var res = await client
        .from("Product")
        .select("*")
        .eq("id", id)
        .single();
      
      if (res.error) throw res.error;
      return res.data;
    },

    // Add new product
    async create(product) {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var res = await client
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

      if (res.error) throw res.error;
      return res.data;
    },

    // Update product
    async update(id, updates) {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var payload = {};
      if (updates.Company_name !== undefined) payload.Company_name = updates.Company_name;
      if (updates.Product_Name !== undefined) payload.Product_Name = updates.Product_Name;
      if (updates.Description !== undefined) payload.Description = updates.Description;
      if (updates.Image_url !== undefined) payload.Image_url = updates.Image_url;
      if (updates.Discount_amount !== undefined) payload.Discount_amount = parseInt(updates.Discount_amount, 10) || 0;
      if (updates.is_available !== undefined) payload.is_available = updates.is_available;

      var res = await client
        .from("Product")
        .update(payload)
        .eq("id", id)
        .select();

      if (res.error) throw res.error;
      return res.data;
    },

    // Toggle availability
    async toggleAvailability(id, currentStatus) {
      return this.update(id, { is_available: !currentStatus });
    },

    // Delete product
    async delete(id) {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var res = await client
        .from("Product")
        .delete()
        .eq("id", id);

      if (res.error) throw res.error;
      return res.data;
    }
  };

  // Order Database Operations
  var OrderService = {
    // Fetch all orders with linked Product details
    async getAll() {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var res = await client
        .from("Order")
        .select("*, Product(*)")
        .order("id", { ascending: false });

      if (res.error) throw res.error;
      return res.data || [];
    },

    // Create an order
    async create(orderData) {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var cleanPhone = String(orderData.Customer_ph_no).replace(/[^0-9]/g, "");
      var numericPhone = cleanPhone ? parseInt(cleanPhone, 10) : 0;

      var res = await client
        .from("Order")
        .insert([{
          Order_id: parseInt(orderData.Order_id, 10),
          Customer_name: orderData.Customer_name.trim(),
          "Customer_ph_no.": numericPhone,
          Custmer_address: orderData.Custmer_address.trim()
        }])
        .select("*, Product(*)");

      if (res.error) throw res.error;
      return res.data;
    },

    // Search orders by Customer phone number
    async searchByPhone(phoneQuery) {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var cleanPhone = String(phoneQuery).replace(/[^0-9]/g, "");
      if (!cleanPhone) return [];

      var res = await client
        .from("Order")
        .select("*, Product(*)")
        .eq("Customer_ph_no.", parseInt(cleanPhone, 10))
        .order("id", { ascending: false });

      if (res.error) throw res.error;
      return res.data || [];
    },

    // Delete order (for admin management)
    async delete(id) {
      var client = getClient();
      if (!client) throw new Error("Supabase client is not initialized.");
      var res = await client
        .from("Order")
        .delete()
        .eq("id", id);

      if (res.error) throw res.error;
      return res.data;
    }
  };

  // UI Notification Toast Helper
  function showToast(message, type) {
    if (!type) type = "success";
    var toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }

    var toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    
    var icon = type === "success" ? "✓" : (type === "error" ? "✕" : "ℹ");
    toast.innerHTML = 
      '<span class="toast-icon">' + icon + '</span>' +
      '<span class="toast-message">' + message + '</span>';

    toastContainer.appendChild(toast);

    // Auto remove after 3.5s
    setTimeout(function () {
      toast.classList.add("toast-fadeout");
      setTimeout(function () {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 400);
    }, 3500);
  }

  // Safely expose to window object without any global declaration collisions
  window.ProductService = ProductService;
  window.OrderService = OrderService;
  window.showToast = showToast;
  window.getSupabaseClient = getClient;

})(window);
