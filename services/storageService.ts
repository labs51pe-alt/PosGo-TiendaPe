
import { UserProfile, Product, Transaction, Purchase, StoreSettings, Customer, Supplier, CashShift, CashMovement, Lead, Store } from '../types';
import { MOCK_PRODUCTS, DEFAULT_SETTINGS } from '../constants';
import { supabase } from './supabase';

const KEYS = {
  SESSION: 'lumina_session',
  PRODUCTS: 'lumina_products',
  TRANSACTIONS: 'lumina_transactions',
  PURCHASES: 'lumina_purchases',
  SETTINGS: 'lumina_settings',
  CUSTOMERS: 'lumina_customers',
  SUPPLIERS: 'lumina_suppliers',
  SHIFTS: 'lumina_shifts',
  MOVEMENTS: 'lumina_movements',
  ACTIVE_SHIFT_ID: 'lumina_active_shift',
  DEMO_TEMPLATE: 'lumina_demo_template'
};

// ID RESERVADO PARA LA PLANTILLA MAESTRA EN LA NUBE
const DEMO_TEMPLATE_ID = '00000000-0000-0000-0000-000000000000'; 

const isDemo = () => {
    const session = localStorage.getItem(KEYS.SESSION);
    if (!session) return true;
    const user = JSON.parse(session);
    return user.id === 'test-user-demo' || user.email?.endsWith('@demo.posgo'); 
};

// Cache for store_id
let cachedStoreId: string | null = null;

const getStoreId = async (): Promise<string | null> => {
    if (isDemo()) return null;
    if (cachedStoreId) return cachedStoreId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
    if (data) {
        cachedStoreId = data.store_id;
        return data.store_id;
    }
    return null;
};

export const StorageService = {
  // === AUTH ===
  saveSession: (user: UserProfile) => localStorage.setItem(KEYS.SESSION, JSON.stringify(user)),
  getSession: (): UserProfile | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  },
  clearSession: async () => {
    localStorage.removeItem(KEYS.SESSION);
    cachedStoreId = null;
    await supabase.auth.signOut();
  },

  // === SUPER ADMIN / LEADS ===
  saveLead: async (lead: Omit<Lead, 'id' | 'created_at'>) => {
      try {
          const { error } = await supabase.from('leads').upsert({
              name: lead.name,
              business_name: lead.business_name,
              phone: lead.phone,
              status: 'NEW'
          }, { onConflict: 'phone' }).select();
          
          if (error) throw error;
      } catch (e) {
          console.error("Critical error saving lead:", e);
      }
  },
  getLeads: async (): Promise<Lead[]> => {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
  },
  deleteLead: async (leadId: string) => {
      await supabase.from('leads').delete().eq('id', leadId);
  },
  getAllStores: async (): Promise<Store[]> => {
      const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
      if (error || !data) return [];
      return data;
  },
  deleteStore: async (storeId: string) => {
      await supabase.from('stores').delete().eq('id', storeId);
  },

  // === GESTIÓN DE PLANTILLA DEMO (CLOUD) ===
  
  // 1. Obtener Plantilla (Forzando Cloud si es posible)
  getDemoTemplate: async (forceCloud = true): Promise<Product[]> => {
      if (!forceCloud) {
          const cached = localStorage.getItem(KEYS.DEMO_TEMPLATE);
          if (cached) return JSON.parse(cached);
      }

      try {
          const { data: productsData, error: prodError } = await supabase
              .from('products')
              .select('*')
              .eq('store_id', DEMO_TEMPLATE_ID);
          
          if (!prodError && productsData && productsData.length > 0) {
              const { data: imagesData } = await supabase
                  .from('product_images')
                  .select('*')
                  .eq('store_id', DEMO_TEMPLATE_ID);

              const mapped = productsData.map((p: any) => {
                  const prodImages = imagesData 
                      ? imagesData
                          .filter((img: any) => img.product_id === p.id)
                          .map((img: any) => img.image_data)
                      : [];

                  let variants = [];
                  if (typeof p.variants === 'string') {
                      try { variants = JSON.parse(p.variants); } catch(e) {}
                  } else if (Array.isArray(p.variants)) {
                      variants = p.variants;
                  }

                  return {
                      id: p.id,
                      name: p.name,
                      price: Number(p.price),
                      category: p.category,
                      stock: Number(p.stock),
                      barcode: p.barcode,
                      hasVariants: variants.length > 0, 
                      variants: variants,
                      images: prodImages 
                  };
              });

              localStorage.setItem(KEYS.DEMO_TEMPLATE, JSON.stringify(mapped));
              return mapped;
          }
      } catch (e) {
          console.warn("Error fetching cloud template:", e);
      }

      const cached = localStorage.getItem(KEYS.DEMO_TEMPLATE);
      return cached ? JSON.parse(cached) : MOCK_PRODUCTS;
  },

  // 2. Guardar Producto en Plantilla (Super Admin)
  saveDemoProductToTemplate: async (product: Product): Promise<{ success: boolean; error?: string }> => {
      try {
          // 1. VERIFY SESSION
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return { success: false, error: "⚠️ No hay sesión Cloud activa." };

          // 2. ENSURE STORE EXISTS
          await supabase.from('stores').upsert({ id: DEMO_TEMPLATE_ID, settings: DEFAULT_SETTINGS });

          // 3. SAVE PRODUCT
          const payload: any = {
              id: product.id,
              name: product.name,
              price: product.price,
              stock: product.stock,
              category: product.category,
              barcode: product.barcode,
              variants: product.variants || [], 
              store_id: DEMO_TEMPLATE_ID
          };
          
          const { data: savedData, error: prodError } = await supabase.from('products').upsert(payload).select();
          
          if (prodError) throw prodError;
          if (!savedData || savedData.length === 0) {
              return { success: false, error: "⚠️ Bloqueo RLS: Los cambios no se persistieron en la nube." };
          }

          // 4. SAVE IMAGES
          await supabase.from('product_images').delete().eq('product_id', product.id).eq('store_id', DEMO_TEMPLATE_ID);
          if (product.images && product.images.length > 0) {
              const imageInserts = product.images.map(imgData => ({
                  product_id: product.id,
                  image_data: imgData, 
                  store_id: DEMO_TEMPLATE_ID
              }));
              const { error: imgError } = await supabase.from('product_images').insert(imageInserts);
              if (imgError) console.warn("Image save error:", imgError.message);
          }

          // Force local cache update of template
          await StorageService.getDemoTemplate(true);

          return { success: true };
      } catch (err: any) {
          console.error("Cloud template error:", err);
          return { success: false, error: err.message || "Error desconocido" };
      }
  },

  deleteDemoProduct: async (productId: string) => {
      await supabase.from('product_images').delete().eq('product_id', productId).eq('store_id', DEMO_TEMPLATE_ID);
      await supabase.from('products').delete().eq('id', productId).eq('store_id', DEMO_TEMPLATE_ID);
      await StorageService.getDemoTemplate(true);
  },

  // === PRODUCTOS (MODO NORMAL / DEMO) ===
  getProducts: async (): Promise<Product[]> => {
    if (isDemo()) {
        const s = localStorage.getItem(KEYS.PRODUCTS);
        if (!s) {
            const template = await StorageService.getDemoTemplate(true);
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(template));
            return template;
        }
        return JSON.parse(s);
    } else {
        const storeId = await getStoreId();
        if(!storeId) return []; 
        const { data: productsData } = await supabase.from('products').select('*').eq('store_id', storeId);
        if (!productsData) return [];
        const { data: imagesData } = await supabase.from('product_images').select('*').eq('store_id', storeId);
        return productsData.map((p: any) => {
            const prodImages = imagesData ? imagesData.filter((img: any) => img.product_id === p.id).map((img: any) => img.image_data) : [];
            let variants = Array.isArray(p.variants) ? p.variants : [];
            return { id: p.id, name: p.name, price: Number(p.price), category: p.category, stock: Number(p.stock), barcode: p.barcode, hasVariants: variants.length > 0, variants: variants, images: prodImages };
        });
    }
  },
  
  saveProductWithImages: async (product: Product) => {
      if (isDemo()) {
          const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
          const index = products.findIndex((p: any) => p.id === product.id);
          let updated = index >= 0 ? products.map((p: any) => p.id === product.id ? product : p) : [...products, product];
          localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(updated));
      } else {
          const storeId = await getStoreId();
          if (!storeId) return;
          await supabase.from('products').upsert({ id: product.id, name: product.name, price: product.price, stock: product.stock, category: product.category, barcode: product.barcode, variants: product.variants || [], store_id: storeId });
          if (product.images) {
              await supabase.from('product_images').delete().eq('product_id', product.id).eq('store_id', storeId);
              if (product.images.length > 0) {
                  const imageInserts = product.images.map(imgData => ({ product_id: product.id, image_data: imgData, store_id: storeId }));
                  await supabase.from('product_images').insert(imageInserts);
              }
          }
      }
  },

  saveProducts: async (products: Product[]) => {
    if (isDemo()) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    } else {
        const storeId = await getStoreId();
        if (!storeId) return;
        for (const p of products) {
            await supabase.from('products').upsert({ id: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category, barcode: p.barcode, variants: p.variants || [], store_id: storeId });
        }
    }
  },

  // === PURCHASES ===
  // Fix: Added getPurchases
  getPurchases: async (): Promise<Purchase[]> => {
    if (isDemo()) return JSON.parse(localStorage.getItem(KEYS.PURCHASES) || '[]');
    const storeId = await getStoreId();
    if (!storeId) return [];
    const { data } = await supabase.from('purchases').select('*').eq('store_id', storeId).order('date', { ascending: false });
    return (data || []).map((p: any) => ({ 
      ...p, 
      supplierId: p.supplier_id,
      items: typeof p.items === 'string' ? JSON.parse(p.items) : p.items 
    }));
  },

  // Fix: Added savePurchase
  savePurchase: async (purchase: Purchase) => {
    if (isDemo()) {
      const current = JSON.parse(localStorage.getItem(KEYS.PURCHASES) || '[]');
      localStorage.setItem(KEYS.PURCHASES, JSON.stringify([purchase, ...current]));
    } else {
      const storeId = await getStoreId();
      if (storeId) await supabase.from('purchases').insert({ 
        id: purchase.id,
        date: purchase.date,
        supplier_id: purchase.supplierId,
        total: purchase.total,
        items: purchase.items,
        store_id: storeId 
      });
    }
  },

  // === CUSTOMERS & SUPPLIERS ===
  // Fix: Added getCustomers
  getCustomers: async (): Promise<Customer[]> => {
    if (isDemo()) return JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    const storeId = await getStoreId();
    if (!storeId) return [];
    const { data } = await supabase.from('customers').select('*').eq('store_id', storeId);
    return data || [];
  },

  // Fix: Added getSuppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    if (isDemo()) return JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
    const storeId = await getStoreId();
    if (!storeId) return [];
    const { data } = await supabase.from('suppliers').select('*').eq('store_id', storeId);
    return data || [];
  },
  
  // Fix: Added saveSupplier
  saveSupplier: async (supplier: Supplier) => {
    if (isDemo()) {
        const current = JSON.parse(localStorage.getItem(KEYS.SUPPLIERS) || '[]');
        localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify([...current, supplier]));
    } else {
        const storeId = await getStoreId();
        if (storeId) await supabase.from('suppliers').insert({ ...supplier, store_id: storeId });
    }
  },

  // === TRANSACTIONS ===
  getTransactions: async (): Promise<Transaction[]> => {
    if (isDemo()) return JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
    const storeId = await getStoreId();
    if(!storeId) return [];
    const { data } = await supabase.from('transactions').select('*').eq('store_id', storeId).order('date', { ascending: false });
    return (data || []).map((t: any) => ({ ...t, items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items, payments: typeof t.payments === 'string' ? JSON.parse(t.payments) : t.payments }));
  },
  saveTransaction: async (t: Transaction) => {
    if (isDemo()) {
        const current = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([t, ...current]));
    } else {
        const storeId = await getStoreId();
        if (storeId) await supabase.from('transactions').insert({ ...t, store_id: storeId });
    }
  },

  // === SETTINGS ===
  getSettings: async (): Promise<StoreSettings> => {
    if (isDemo()) return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS));
    const storeId = await getStoreId();
    const { data } = await supabase.from('stores').select('settings').eq('id', storeId).single();
    return data?.settings || DEFAULT_SETTINGS;
  },
  saveSettings: async (settings: StoreSettings) => {
    if (isDemo()) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    else {
        const storeId = await getStoreId();
        if (storeId) await supabase.from('stores').update({ settings }).eq('id', storeId);
    }
  },

  // === SHIFTS & MOVEMENTS ===
  getShifts: async (): Promise<CashShift[]> => {
    if (isDemo()) return JSON.parse(localStorage.getItem(KEYS.SHIFTS) || '[]');
    const storeId = await getStoreId();
    const { data } = await supabase.from('cash_shifts').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    return (data || []).map((s: any) => ({ ...s, startTime: s.start_time, endTime: s.end_time, startAmount: Number(s.start_amount), endAmount: Number(s.end_amount), totalSalesCash: Number(s.total_sales_cash), totalSalesDigital: Number(s.total_sales_digital) }));
  },
  saveShift: async (shift: CashShift) => {
    if (isDemo()) {
        const shifts = JSON.parse(localStorage.getItem(KEYS.SHIFTS) || '[]');
        const idx = shifts.findIndex((x: any) => x.id === shift.id);
        if (idx >= 0) shifts[idx] = shift; else shifts.unshift(shift);
        localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
    } else {
         const storeId = await getStoreId();
         if (storeId) await supabase.from('cash_shifts').upsert({ id: shift.id, start_time: shift.startTime, end_time: shift.endTime, start_amount: shift.startAmount, end_amount: shift.endAmount, status: shift.status, total_sales_cash: shift.totalSalesCash, total_sales_digital: shift.totalSalesDigital, store_id: storeId });
    }
  },

  // Fix: Added getMovements
  getMovements: async (): Promise<CashMovement[]> => {
    if (isDemo()) return JSON.parse(localStorage.getItem(KEYS.MOVEMENTS) || '[]');
    const storeId = await getStoreId();
    if (!storeId) return [];
    const { data } = await supabase.from('cash_movements').select('*').eq('store_id', storeId).order('timestamp', { ascending: false });
    return (data || []).map((m: any) => ({
      ...m,
      shiftId: m.shift_id
    }));
  },

  // Fix: Added saveMovement
  saveMovement: async (move: CashMovement) => {
    if (isDemo()) {
      const current = JSON.parse(localStorage.getItem(KEYS.MOVEMENTS) || '[]');
      localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify([...current, move]));
    } else {
      const storeId = await getStoreId();
      if (storeId) await supabase.from('cash_movements').insert({ 
        id: move.id,
        shift_id: move.shiftId,
        type: move.type,
        amount: move.amount,
        description: move.description,
        timestamp: move.timestamp,
        store_id: storeId 
      });
    }
  },

  getActiveShiftId: () => localStorage.getItem(KEYS.ACTIVE_SHIFT_ID),
  setActiveShiftId: (id: string | null) => id ? localStorage.setItem(KEYS.ACTIVE_SHIFT_ID, id) : localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID),

  resetDemoData: async () => {
      const template = await StorageService.getDemoTemplate(true);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(template));
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(KEYS.SHIFTS, JSON.stringify([]));
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      // Fix: Adding missing demo keys to reset
      localStorage.setItem(KEYS.PURCHASES, JSON.stringify([]));
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify([]));
      localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify([]));
      localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify([]));
      localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
  }
};
