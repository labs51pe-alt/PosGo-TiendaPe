
import { UserProfile, Product, Transaction, Purchase, StoreSettings, Customer, Supplier, CashShift, CashMovement, Lead, Store } from '../types';
import { MOCK_PRODUCTS, DEFAULT_SETTINGS } from '../constants';
import { supabase } from './supabase';

const KEYS = {
  SESSION: 'posgo_session',
  PRODUCTS: 'posgo_products',
  TRANSACTIONS: 'posgo_transactions',
  PURCHASES: 'posgo_purchases',
  SETTINGS: 'posgo_settings',
  CUSTOMERS: 'posgo_customers',
  SUPPLIERS: 'posgo_suppliers',
  SHIFTS: 'posgo_shifts',
  MOVEMENTS: 'posgo_movements',
  ACTIVE_SHIFT_ID: 'posgo_active_shift'
};

const DEMO_TEMPLATE_ID = '00000000-0000-0000-0000-000000000000'; 

const isDemo = () => {
    const session = localStorage.getItem(KEYS.SESSION);
    if (!session) return true;
    try {
        const user = JSON.parse(session);
        return user.id === 'test-user-demo' || user.email?.endsWith('@demo.posgo');
    } catch {
        return true;
    }
};

let cachedStoreId: string | null = null;

const getStoreId = async (): Promise<string> => {
    if (isDemo()) return DEMO_TEMPLATE_ID;
    if (cachedStoreId) return cachedStoreId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEMO_TEMPLATE_ID;

    const { data } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
    if (data && data.store_id) {
        cachedStoreId = data.store_id;
        return data.store_id;
    }
    return DEMO_TEMPLATE_ID;
};

export const StorageService = {
  saveSession: (user: UserProfile) => {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
      cachedStoreId = null; // Forzar re-calculo del storeId al cambiar sesión
  },
  getSession: (): UserProfile | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    try {
        return s ? JSON.parse(s) : null;
    } catch {
        return null;
    }
  },
  clearSession: async () => {
    localStorage.removeItem(KEYS.SESSION);
    localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
    cachedStoreId = null;
    await supabase.auth.signOut();
  },

  // Leads & Stores (Super Admin)
  saveLead: async (lead: Omit<Lead, 'id' | 'created_at'>) => {
      try {
          await supabase.from('leads').upsert({
              name: lead.name,
              business_name: lead.business_name,
              phone: lead.phone,
              status: 'NEW'
          }, { onConflict: 'phone' });
      } catch (e) { console.error(e); }
  },
  getLeads: async (): Promise<Lead[]> => {
      const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      return data || [];
  },
  deleteLead: async (leadId: string) => {
      await supabase.from('leads').delete().eq('id', leadId);
  },
  getAllStores: async (): Promise<Store[]> => {
      const { data } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
      return data || [];
  },
  deleteStore: async (storeId: string) => {
      await supabase.from('stores').delete().eq('id', storeId);
  },

  // Template Management (Super Admin)
  getDemoTemplate: async (forceCloud = true): Promise<Product[]> => {
      try {
          const { data: productsData, error: prodError } = await supabase
              .from('products')
              .select('*')
              .eq('store_id', DEMO_TEMPLATE_ID);
          
          if (!prodError && productsData) {
              const { data: imagesData } = await supabase
                  .from('product_images')
                  .select('*')
                  .eq('store_id', DEMO_TEMPLATE_ID);

              return productsData.map((p: any) => {
                  const prodImages = imagesData 
                      ? imagesData.filter((img: any) => img.product_id === p.id).map((img: any) => img.image_data)
                      : [];
                  let variants = Array.isArray(p.variants) ? p.variants : [];
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
          }
      } catch (e) {
          console.error("Error fetching cloud template:", e);
      }
      return MOCK_PRODUCTS;
  },

  saveDemoProductToTemplate: async (product: Product): Promise<{ success: boolean; error?: string }> => {
      try {
          const storeId = DEMO_TEMPLATE_ID;
          await supabase.from('stores').upsert({ id: storeId, settings: DEFAULT_SETTINGS });

          const { error: prodError } = await supabase.from('products').upsert({
              id: product.id,
              name: product.name,
              price: product.price,
              stock: product.stock,
              category: product.category,
              barcode: product.barcode,
              variants: product.variants || [], 
              store_id: storeId
          });
          if (prodError) throw prodError;

          if (product.images) {
              await supabase.from('product_images').delete().eq('product_id', product.id).eq('store_id', storeId);
              if (product.images.length > 0) {
                  const imageInserts = product.images.map(imgData => ({
                      product_id: product.id,
                      image_data: imgData, 
                      store_id: storeId
                  }));
                  await supabase.from('product_images').insert(imageInserts);
              }
          }

          return { success: true };
      } catch (err: any) {
          return { success: false, error: err.message };
      }
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    const storeId = await getStoreId();
    if(!storeId) return isDemo() ? await StorageService.getDemoTemplate() : [];

    const { data: productsData } = await supabase.from('products').select('*').eq('store_id', storeId);
    if (!productsData) return [];
    
    const { data: imagesData } = await supabase.from('product_images').select('*').eq('store_id', storeId);
    
    return productsData.map((p: any) => {
        const prodImages = imagesData ? imagesData.filter((img: any) => img.product_id === p.id).map((img: any) => img.image_data) : [];
        let variants = Array.isArray(p.variants) ? p.variants : [];
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
  },
  
  saveProductWithImages: async (product: Product) => {
      const storeId = await getStoreId();
      await supabase.from('products').upsert({ 
          id: product.id, 
          name: product.name, 
          price: product.price, 
          stock: product.stock, 
          category: product.category, 
          barcode: product.barcode, 
          variants: product.variants || [], 
          store_id: storeId 
      });
      if (product.images) {
          await supabase.from('product_images').delete().eq('product_id', product.id).eq('store_id', storeId);
          if (product.images.length > 0) {
              const imageInserts = product.images.map(imgData => ({ 
                  product_id: product.id, 
                  image_data: imgData, 
                  store_id: storeId 
              }));
              await supabase.from('product_images').insert(imageInserts);
          }
      }
  },

  saveProducts: async (products: Product[]) => {
      const storeId = await getStoreId();
      for (const p of products) {
          await supabase.from('products').upsert({ 
              id: p.id, 
              name: p.name, 
              price: p.price, 
              stock: p.stock, 
              category: p.category, 
              barcode: p.barcode, 
              variants: p.variants || [], 
              store_id: storeId 
          });
      }
  },

  deleteDemoProduct: async (productId: string) => {
      const storeId = await getStoreId();
      await supabase.from('product_images').delete().eq('product_id', productId).eq('store_id', storeId);
      await supabase.from('products').delete().eq('id', productId).eq('store_id', storeId);
  },

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('transactions').select('*').eq('store_id', storeId).order('date', { ascending: false });
    return (data || []).map((t: any) => ({ 
        ...t, 
        items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items, 
        payments: typeof t.payments === 'string' ? JSON.parse(t.payments) : t.payments 
    }));
  },

  saveTransaction: async (t: Transaction) => {
    const storeId = await getStoreId();
    await supabase.from('transactions').insert({ ...t, store_id: storeId });
  },

  // Purchases
  getPurchases: async (): Promise<Purchase[]> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('purchases').select('*').eq('store_id', storeId).order('date', { ascending: false });
    return (data || []).map((p: any) => ({ 
        ...p, 
        items: typeof p.items === 'string' ? JSON.parse(p.items) : p.items 
    }));
  },

  savePurchase: async (p: Purchase) => {
    const storeId = await getStoreId();
    await supabase.from('purchases').insert({ ...p, store_id: storeId });
  },

  // People
  getCustomers: async (): Promise<Customer[]> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('customers').select('*').eq('store_id', storeId);
    return data || [];
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('suppliers').select('*').eq('store_id', storeId);
    return data || [];
  },

  saveSupplier: async (s: Supplier) => {
    const storeId = await getStoreId();
    await supabase.from('suppliers').upsert({ ...s, store_id: storeId });
  },

  // Cash Management
  getShifts: async (): Promise<CashShift[]> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('shifts').select('*').eq('store_id', storeId).order('startTime', { ascending: false });
    return data || [];
  },

  saveShift: async (s: CashShift) => {
    const storeId = await getStoreId();
    await supabase.from('shifts').upsert({ ...s, store_id: storeId });
  },

  getMovements: async (): Promise<CashMovement[]> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('movements').select('*').eq('store_id', storeId).order('timestamp', { ascending: false });
    return data || [];
  },

  saveMovement: async (m: CashMovement) => {
    const storeId = await getStoreId();
    await supabase.from('movements').insert({ ...m, store_id: storeId });
  },

  getActiveShiftId: (): string | null => localStorage.getItem(KEYS.ACTIVE_SHIFT_ID),
  
  setActiveShiftId: (id: string | null) => {
    if (id) localStorage.setItem(KEYS.ACTIVE_SHIFT_ID, id);
    else localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
  },

  // Settings
  getSettings: async (): Promise<StoreSettings> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('stores').select('settings').eq('id', storeId).single();
    return data?.settings || DEFAULT_SETTINGS;
  },

  saveSettings: async (settings: StoreSettings) => {
    const storeId = await getStoreId();
    await supabase.from('stores').update({ settings }).eq('id', storeId);
  },

  resetDemoData: async () => {
      localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
      cachedStoreId = null;
  }
};
