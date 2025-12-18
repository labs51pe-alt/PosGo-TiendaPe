
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

const mapProduct = (p: any, imagesData: any[] = []): Product => {
    const prodImages = imagesData 
        ? imagesData.filter((img: any) => img.product_id === p.id).map((img: any) => img.image_data)
        : [];
    return {
        id: p.id,
        name: p.name || '',
        price: Number(p.price) || 0,
        category: p.category || 'General',
        stock: Number(p.stock) || 0,
        barcode: p.barcode || '',
        hasVariants: p.hasVariants === true || (Array.isArray(p.variants) && p.variants.length > 0),
        variants: Array.isArray(p.variants) ? p.variants : [],
        isPack: p.isPack === true || (Array.isArray(p.packItems) && p.packItems.length > 0),
        packItems: Array.isArray(p.packItems) ? p.packItems : [],
        images: prodImages,
        description: p.description || '',
        cost: Number(p.cost) || 0
    };
};

export const StorageService = {
  saveSession: (user: UserProfile) => {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
      cachedStoreId = null;
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

  // Leads & Stores
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

              return productsData.map((p: any) => mapProduct(p, imagesData || []));
          }
      } catch (e) {
          console.error("Error fetching cloud template:", e);
      }
      return MOCK_PRODUCTS;
  },

  saveDemoProductToTemplate: async (product: Product): Promise<{ success: boolean; error?: string }> => {
      try {
          const storeId = DEMO_TEMPLATE_ID;
          
          // Asegurar tienda
          const { error: storeError } = await supabase.from('stores').upsert({ 
              id: storeId, 
              name: 'Plantilla Cloud PosGo!',
              settings: { ...DEFAULT_SETTINGS, name: 'Plantilla Cloud PosGo!' } 
          }, { onConflict: 'id' });

          if (storeError) {
              throw new Error("Error en Tienda Global: " + (storeError.message || JSON.stringify(storeError)));
          }

          // Limpieza de datos antes de enviar
          const payload = {
              id: product.id,
              name: product.name,
              price: Number(product.price) || 0,
              stock: Number(product.stock) || 0,
              category: product.category,
              barcode: product.barcode || '',
              description: product.description || '',
              cost: Number(product.cost) || 0,
              hasVariants: !!product.hasVariants,
              variants: Array.isArray(product.variants) ? product.variants : [], 
              isPack: !!product.isPack,
              packItems: Array.isArray(product.packItems) ? product.packItems : [],
              store_id: storeId
          };

          const { error: prodError } = await supabase.from('products').upsert(payload);
          
          if (prodError) {
              throw new Error("Error en Producto Global: " + (prodError.message || JSON.stringify(prodError)));
          }

          if (product.images) {
              await supabase.from('product_images').delete().eq('product_id', product.id).eq('store_id', storeId);
              if (product.images.length > 0) {
                  const imageInserts = product.images.map(imgData => ({
                      product_id: product.id,
                      image_data: imgData, 
                      store_id: storeId
                  }));
                  const { error: imgError } = await supabase.from('product_images').insert(imageInserts);
                  if (imgError) console.error("Error saving product template images:", imgError);
              }
          }

          return { success: true };
      } catch (err: any) {
          console.error("saveDemoProductToTemplate Catch:", err);
          const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
          return { success: false, error: errorMessage };
      }
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    const storeId = await getStoreId();
    if (storeId === DEMO_TEMPLATE_ID) return await StorageService.getDemoTemplate();

    const { data: productsData } = await supabase.from('products').select('*').eq('store_id', storeId);
    if (!productsData) return [];
    
    const { data: imagesData } = await supabase.from('product_images').select('*').eq('store_id', storeId);
    
    return productsData.map((p: any) => mapProduct(p, imagesData || []));
  },
  
  saveProductWithImages: async (product: Product) => {
      const storeId = await getStoreId();
      const { error: prodError } = await supabase.from('products').upsert({ 
          id: product.id, 
          name: product.name, 
          price: Number(product.price) || 0, 
          stock: Number(product.stock) || 0, 
          category: product.category, 
          barcode: product.barcode || '', 
          description: product.description || '',
          cost: Number(product.cost) || 0,
          hasVariants: !!product.hasVariants,
          variants: Array.isArray(product.variants) ? product.variants : [], 
          isPack: !!product.isPack,
          packItems: Array.isArray(product.packItems) ? product.packItems : [],
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
  },

  saveProducts: async (products: Product[]) => {
      const storeId = await getStoreId();
      for (const p of products) {
          await supabase.from('products').upsert({ 
              id: p.id, 
              name: p.name, 
              price: Number(p.price) || 0, 
              stock: Number(p.stock) || 0, 
              category: p.category, 
              barcode: p.barcode || '', 
              description: p.description || '',
              cost: Number(p.cost) || 0,
              hasVariants: !!p.hasVariants,
              variants: Array.isArray(p.variants) ? p.variants : [], 
              isPack: !!p.isPack,
              packItems: Array.isArray(p.packItems) ? p.packItems : [],
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
    const { error } = await supabase.from('shifts').upsert({ ...s, store_id: storeId });
    if (error) console.error("Error saving shift:", error);
  },

  getMovements: async (): Promise<CashMovement[]> => {
    const storeId = await getStoreId();
    const { data } = await supabase.from('movements').select('*').eq('store_id', storeId).order('timestamp', { ascending: false });
    return data || [];
  },

  saveMovement: async (m: CashMovement) => {
    const storeId = await getStoreId();
    const { error } = await supabase.from('movements').insert({ ...m, store_id: storeId });
    if (error) console.error("Error saving movement:", error);
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
    const { error } = await supabase.from('stores').update({ settings }).eq('id', storeId);
    if (error) console.error("Error saving settings:", error);
  },

  resetDemoData: async () => {
      localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
      cachedStoreId = null;
  }
};
