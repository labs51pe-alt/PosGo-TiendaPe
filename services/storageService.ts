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
  DEMO_TEMPLATE: 'lumina_demo_template' // New Key for caching template
};

// ID ESPECIAL PARA LA PLANTILLA MAESTRA EN LA NUBE
const DEMO_TEMPLATE_ID = '00000000-0000-0000-0000-000000000000'; 

// Helper to check if we are in DEMO mode or REAL mode
const isDemo = () => {
    const session = localStorage.getItem(KEYS.SESSION);
    if (!session) return true;
    const user = JSON.parse(session);
    return user.id === 'test-user-demo'; 
};

// Cache for store_id to avoid repeated fetches
let cachedStoreId: string | null = null;

const getStoreId = async (): Promise<string | null> => {
    if (isDemo()) return null;
    if (cachedStoreId) return cachedStoreId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
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
          const { data, error } = await supabase.from('leads').upsert({
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

  // === GESTIÓN DE PLANTILLA DEMO (CLOUD + LOCAL FALLBACK) ===
  
  // 1. OBTENER PLANTILLA
  getDemoTemplate: async (): Promise<Product[]> => {
      // INTENTAR SIEMPRE DESDE LA NUBE PRIMERO
      // (Para asegurar que los usuarios Demo reciban las últimas actualizaciones del Super Admin)
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

                  const variants = p.variants || [];
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

              // Guardar en caché local para uso offline futuro
              console.log("Template fetched from cloud successfully.");
              localStorage.setItem(KEYS.DEMO_TEMPLATE, JSON.stringify(mapped));
              return mapped;
          }
      } catch (e) {
          console.warn("Error fetching cloud template, falling back to local cache.", e);
      }

      // 2. Fallback a caché local si la nube falla (o estaba vacía)
      const cached = localStorage.getItem(KEYS.DEMO_TEMPLATE);
      if (cached) {
          return JSON.parse(cached);
      }

      // 3. Fallback final
      return MOCK_PRODUCTS;
  },

  // 2. GUARDAR PLANTILLA (Solo Super Admin)
  saveDemoProductToTemplate: async (product: Product): Promise<{ success: boolean; error?: string }> => {
      // 1. SIEMPRE GUARDAR EN LOCAL PRIMERO (Optimistic UI / Offline support)
      try {
          const currentTemplate = await StorageService.getDemoTemplate(); // Lee de cache si no hay nube
          
          const index = currentTemplate.findIndex(p => p.id === product.id);
          let newTemplate;
          if (index >= 0) {
              newTemplate = currentTemplate.map(p => p.id === product.id ? product : p);
          } else {
              newTemplate = [...currentTemplate, product];
          }
          localStorage.setItem(KEYS.DEMO_TEMPLATE, JSON.stringify(newTemplate));
      } catch (e) {
          console.error("Error updating local template cache", e);
      }

      // 2. INTENTAR GUARDAR EN NUBE (Permisivo)
      try {
          console.log("Attempting save demo product to cloud...", product.id);

          // VALIDAR ID
          const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          let finalId = product.id;
          if (!finalId || !isValidUUID(finalId)) {
              finalId = crypto.randomUUID();
          }

          // A. Asegurar que existe la Tienda Demo (Foreign Key)
          // Nota: Si el usuario no tiene permisos, esto podría fallar, pero lo intentamos.
          const { data: storeExists } = await supabase
              .from('stores')
              .select('id')
              .eq('id', DEMO_TEMPLATE_ID)
              .maybeSingle();
          
          if (!storeExists) {
              await supabase.from('stores').upsert({
                  id: DEMO_TEMPLATE_ID,
                  settings: DEFAULT_SETTINGS,
                  created_at: new Date().toISOString()
              });
          }

          // B. Guardar/Actualizar Producto
          const payload: any = {
              id: finalId,
              name: product.name,
              price: product.price,
              stock: product.stock,
              category: product.category,
              barcode: product.barcode,
              variants: product.variants || [], 
              store_id: DEMO_TEMPLATE_ID
          };
          
          const { error: prodError } = await supabase.from('products').upsert(payload);
          
          if (prodError) {
              console.error("Cloud Save Failed (RLS or Network):", prodError.message);
              // RETORNAMOS ÉXITO LOCAL PERO CON AVISO
              return { success: true, error: "Guardado LOCALMENTE. (Nube: " + prodError.message + ")" };
          }
          
          // C. Gestionar Imágenes
          if (product.images) {
              await supabase.from('product_images').delete()
                  .eq('product_id', finalId)
                  .eq('store_id', DEMO_TEMPLATE_ID);
              
              if (product.images.length > 0) {
                  const imageInserts = product.images.map(imgData => ({
                      product_id: finalId,
                      image_data: imgData, 
                      store_id: DEMO_TEMPLATE_ID
                  }));
                  
                  await supabase.from('product_images').insert(imageInserts);
              }
          }
          return { success: true };

      } catch (err: any) {
          console.error("Exception saving to cloud:", err);
          return { success: true, error: "Guardado LOCALMENTE (Excepción: " + err.message + ")" };
      }
  },

  deleteDemoProduct: async (productId: string) => {
      // 1. Delete Local
      const cached = localStorage.getItem(KEYS.DEMO_TEMPLATE);
      if (cached) {
          const list = JSON.parse(cached);
          const updated = list.filter((p: Product) => p.id !== productId);
          localStorage.setItem(KEYS.DEMO_TEMPLATE, JSON.stringify(updated));
      }

      // 2. Delete Cloud
      try {
        await supabase.from('product_images').delete().eq('product_id', productId).eq('store_id', DEMO_TEMPLATE_ID);
        await supabase.from('products').delete().eq('id', productId).eq('store_id', DEMO_TEMPLATE_ID);
      } catch (e) {
          console.warn("Could not delete from cloud", e);
      }
  },

  // === PRODUCTOS (MODO NORMAL) ===
  getProducts: async (): Promise<Product[]> => {
    if (isDemo()) {
        const s = localStorage.getItem(KEYS.PRODUCTS);
        // Si no hay nada en local, intentar cargar la plantilla (fallback de seguridad)
        if (!s) {
            const template = await StorageService.getDemoTemplate();
            localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(template));
            return template;
        }
        return JSON.parse(s);
    } else {
        const storeId = await getStoreId();
        if(!storeId) return []; 

        const { data: productsData, error: productsError } = await supabase.from('products').select('*').eq('store_id', storeId);
        if (productsError || !productsData) return [];

        const { data: imagesData } = await supabase.from('product_images').select('*').eq('store_id', storeId);
        
        return productsData.map((p: any) => {
            const prodImages = imagesData 
                ? imagesData.filter((img: any) => img.product_id === p.id).map((img: any) => img.image_data)
                : [];

            const variants = p.variants || [];
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
  },
  
  saveProductWithImages: async (product: Product) => {
      if (isDemo()) {
          // En DEMO, solo guardamos en LocalStorage del navegador del usuario
          const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
          const index = products.findIndex((p: any) => p.id === product.id);
          let updatedProducts;
          if (index >= 0) {
              updatedProducts = products.map((p: any) => p.id === product.id ? product : p);
          } else {
              updatedProducts = [...products, product];
          }
          localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(updatedProducts));
      } else {
          const storeId = await getStoreId();
          if (!storeId) return;

          const payload: any = {
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                category: product.category,
                barcode: product.barcode,
                variants: product.variants || [],
                store_id: storeId
          };
          // removed 'has_variants' to avoid schema errors
          
          await supabase.from('products').upsert(payload);

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
      }
  },

  saveProducts: async (products: Product[]) => {
    if (isDemo()) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    } else {
        const storeId = await getStoreId();
        if (!storeId) return;

        for (const p of products) {
            const payload: any = {
                id: p.id,
                name: p.name,
                price: p.price,
                stock: p.stock,
                category: p.category,
                barcode: p.barcode,
                variants: p.variants || [],
                store_id: storeId
            };
            // removed 'has_variants'
            await supabase.from('products').upsert(payload);
        }
    }
  },

  // === TRANSACTIONS & OTHERS ===
  getTransactions: async (): Promise<Transaction[]> => {
    if (isDemo()) {
        const s = localStorage.getItem(KEYS.TRANSACTIONS);
        return s ? JSON.parse(s) : [];
    } else {
        const storeId = await getStoreId();
        if(!storeId) return [];
        const { data, error } = await supabase.from('transactions').select('*').eq('store_id', storeId).order('date', { ascending: false });
        if (error || !data) return [];
        return data.map((t: any) => ({
            id: t.id,
            date: t.date,
            items: t.items,
            subtotal: Number(t.subtotal),
            tax: Number(t.tax),
            discount: Number(t.discount),
            total: Number(t.total),
            paymentMethod: t.payment_method,
            payments: t.payments,
            profit: Number(t.profit),
            shiftId: t.shift_id
        }));
    }
  },
  saveTransaction: async (transaction: Transaction) => {
    if (isDemo()) {
        const currentString = localStorage.getItem(KEYS.TRANSACTIONS);
        const current = currentString ? JSON.parse(currentString) : [];
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([transaction, ...current]));
    } else {
        const storeId = await getStoreId();
        if (!storeId) return;
        const { error } = await supabase.from('transactions').insert({
            id: transaction.id,
            shift_id: transaction.shiftId,
            store_id: storeId,
            total: transaction.total,
            subtotal: transaction.subtotal,
            tax: transaction.tax,
            discount: transaction.discount,
            items: transaction.items,
            payments: transaction.payments,
            payment_method: transaction.paymentMethod,
            date: transaction.date
        });
        if (error) console.error("Error saving transaction", error);
    }
  },

  getPurchases: async (): Promise<Purchase[]> => {
    const s = localStorage.getItem(KEYS.PURCHASES);
    return s ? JSON.parse(s) : [];
  },
  savePurchase: async (purchase: Purchase) => {
    const s = localStorage.getItem(KEYS.PURCHASES);
    const current = s ? JSON.parse(s) : [];
    localStorage.setItem(KEYS.PURCHASES, JSON.stringify([purchase, ...current]));
  },

  getSettings: async (): Promise<StoreSettings> => {
    if (isDemo()) {
        const s = localStorage.getItem(KEYS.SETTINGS);
        return s ? JSON.parse(s) : DEFAULT_SETTINGS;
    } else {
        const storeId = await getStoreId();
        if (!storeId) return DEFAULT_SETTINGS;
        const { data } = await supabase.from('stores').select('settings').eq('id', storeId).single();
        return data?.settings || DEFAULT_SETTINGS;
    }
  },
  saveSettings: async (settings: StoreSettings) => {
    if (isDemo()) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } else {
        const storeId = await getStoreId();
        if (storeId) {
             await supabase.from('stores').update({ settings }).eq('id', storeId);
        }
    }
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (isDemo()) {
        const s = localStorage.getItem(KEYS.CUSTOMERS);
        return s ? JSON.parse(s) : [];
    } else {
        const storeId = await getStoreId();
        if(!storeId) return [];
        const { data } = await supabase.from('customers').select('*').eq('store_id', storeId);
        return data || [];
    }
  },
  
  getSuppliers: (): Supplier[] => {
    const s = localStorage.getItem(KEYS.SUPPLIERS);
    return s ? JSON.parse(s) : [];
  },
  saveSupplier: (supplier: Supplier) => {
    const s = localStorage.getItem(KEYS.SUPPLIERS);
    const current = s ? JSON.parse(s) : [];
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify([...current, supplier]));
  },

  getShifts: async (): Promise<CashShift[]> => {
    if (isDemo()) {
        const s = localStorage.getItem(KEYS.SHIFTS);
        return s ? JSON.parse(s) : [];
    } else {
        const storeId = await getStoreId();
        if(!storeId) return [];
        const { data } = await supabase.from('cash_shifts').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
        if (!data) return [];
        return data.map((s: any) => ({
            id: s.id,
            startTime: s.start_time,
            endTime: s.end_time,
            startAmount: Number(s.start_amount),
            endAmount: Number(s.end_amount),
            status: s.status,
            totalSalesCash: Number(s.total_sales_cash),
            totalSalesDigital: Number(s.total_sales_digital)
        }));
    }
  },
  saveShift: async (shift: CashShift) => {
    if (isDemo()) {
        const s = localStorage.getItem(KEYS.SHIFTS);
        const shifts = s ? JSON.parse(s) : [];
        const idx = shifts.findIndex((x: any) => x.id === shift.id);
        if (idx >= 0) shifts[idx] = shift;
        else shifts.unshift(shift);
        localStorage.setItem(KEYS.SHIFTS, JSON.stringify(shifts));
    } else {
         const storeId = await getStoreId();
         if (!storeId) return;
         const payload: any = {
             id: shift.id,
             start_time: shift.startTime,
             end_time: shift.endTime,
             start_amount: shift.startAmount,
             end_amount: shift.endAmount,
             status: shift.status,
             total_sales_cash: shift.totalSalesCash,
             total_sales_digital: shift.totalSalesDigital,
             store_id: storeId
         };
         await supabase.from('cash_shifts').upsert(payload);
    }
  },
  
  getMovements: async (): Promise<CashMovement[]> => {
      if (isDemo()) {
          const s = localStorage.getItem(KEYS.MOVEMENTS);
          return s ? JSON.parse(s) : [];
      } else {
           const storeId = await getStoreId();
           if(!storeId) return [];
           const { data } = await supabase.from('cash_movements').select('*').eq('store_id', storeId);
           if (!data) return [];
           return data.map((m: any) => ({
               id: m.id,
               shiftId: m.shift_id,
               type: m.type,
               amount: Number(m.amount),
               description: m.description,
               timestamp: m.timestamp
           }));
      }
  },
  saveMovement: async (movement: CashMovement) => {
      if (isDemo()) {
          const s = localStorage.getItem(KEYS.MOVEMENTS);
          const moves = s ? JSON.parse(s) : [];
          localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify([...moves, movement]));
      } else {
          const storeId = await getStoreId();
          if (!storeId) return;
          await supabase.from('cash_movements').insert({
              id: movement.id,
              shift_id: movement.shiftId,
              store_id: storeId,
              type: movement.type,
              amount: movement.amount,
              description: movement.description,
              timestamp: movement.timestamp
          });
      }
  },

  getActiveShiftId: (): string | null => {
      return localStorage.getItem(KEYS.ACTIVE_SHIFT_ID);
  },
  setActiveShiftId: (id: string | null) => {
      if(id) localStorage.setItem(KEYS.ACTIVE_SHIFT_ID, id);
      else localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
  },

  resetDemoData: async () => {
      // 1. DESCARGAR LA PLANTILLA MÁS RECIENTE DE LA NUBE (Con fallback a cache)
      const template = await StorageService.getDemoTemplate();
      
      // 2. SOBREESCRIBIR LOCALSTORAGE CON LA PLANTILLA
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(template));
      
      // 3. LIMPIAR EL RESTO DE DATOS DE SESIONES ANTERIORES
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(KEYS.PURCHASES, JSON.stringify([]));
      localStorage.setItem(KEYS.SHIFTS, JSON.stringify([]));
      localStorage.setItem(KEYS.MOVEMENTS, JSON.stringify([]));
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify([]));
      localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify([]));
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.removeItem(KEYS.ACTIVE_SHIFT_ID);
  }
};