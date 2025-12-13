import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Product, CartItem, Transaction, StoreSettings, Purchase, CashShift, CashMovement, UserProfile, Customer, Supplier, PackItem } from '../types';
import { StorageService } from '../services/storageService';
import { Layout } from './Layout';
import { Cart } from './Cart';
import { Ticket } from './Ticket';
import { Auth } from './Auth';
import { AdminView } from './AdminView';
import { OnboardingTour } from './OnboardingTour';
import { InventoryView } from './InventoryView';
import { PurchasesView } from './PurchasesView';
import { ReportsView } from './ReportsView';
import { SettingsView } from './SettingsView';
import { CashControlModal } from './CashControlModal';
import { POSView } from './POSView';
import { SuperAdminView } from './SuperAdminView';
import { DEFAULT_SETTINGS, CATEGORIES } from '../constants';
import { Plus, Image as ImageIcon, X, Trash2, Edit2, Package, Search, Check, Save } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.POS);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [superAdminRefreshTrigger, setSuperAdminRefreshTrigger] = useState(0);

  // UI State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [showCashControl, setShowCashControl] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketType, setTicketType] = useState<'SALE' | 'REPORT'>('SALE');
  const [ticketData, setTicketData] = useState<any>(null);
  const [initialPurchaseSearch, setInitialPurchaseSearch] = useState('');
  
  // Product Form State - Variants
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantStock, setVariantStock] = useState('');
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Product Form State - Packs
  const [packSearchTerm, setPackSearchTerm] = useState('');

  // Initial Load (Async)
  useEffect(() => {
    const initApp = async () => {
        setLoading(true);
        const savedUser = StorageService.getSession();
        if (savedUser) { 
            setUser(savedUser); 
            if (savedUser.id === 'god-mode') {
                setView(ViewState.SUPER_ADMIN);
            } else if (savedUser.role === 'admin') {
                setView(ViewState.ADMIN);
            }
            
            // Load Data Async
            const [p, t, pur, set, c, sup, sh, mov] = await Promise.all([
                StorageService.getProducts(),
                StorageService.getTransactions(),
                StorageService.getPurchases(),
                StorageService.getSettings(),
                StorageService.getCustomers(),
                StorageService.getSuppliers(),
                StorageService.getShifts(),
                StorageService.getMovements()
            ]);
            
            setProducts(p);
            setTransactions(t);
            setPurchases(pur);
            setSettings(set);
            setCustomers(c);
            setSuppliers(sup);
            setShifts(sh);
            setMovements(mov);
            setActiveShiftId(StorageService.getActiveShiftId());
        } else {
             // Load Mock/Demo data if needed or just empty
             setProducts(await StorageService.getProducts());
        }
        setLoading(false);
    };
    initApp();
  }, []);

  const activeShift = useMemo(() => shifts.find(s => s.id === activeShiftId), [shifts, activeShiftId]);

  // Handlers
  const handleLogin = async (loggedInUser: UserProfile) => {
    setUser(loggedInUser); 
    StorageService.saveSession(loggedInUser);

    setLoading(true);

    if (loggedInUser.id === 'test-user-demo') {
        // Here we ensure the new user gets the FRESH template from cloud
        await StorageService.resetDemoData();
        setTimeout(() => setShowOnboarding(true), 500); 
    }

    const [p, t, pur, set, c, sup, sh, mov] = await Promise.all([
        StorageService.getProducts(),
        StorageService.getTransactions(),
        StorageService.getPurchases(),
        StorageService.getSettings(),
        StorageService.getCustomers(),
        StorageService.getSuppliers(),
        StorageService.getShifts(),
        StorageService.getMovements()
    ]);
    
    setProducts(p);
    setTransactions(t);
    setPurchases(pur);
    setSettings(set);
    setCustomers(c);
    setSuppliers(sup);
    setShifts(sh);
    setMovements(mov);
    setActiveShiftId(StorageService.getActiveShiftId());
    setLoading(false);
    
    if (loggedInUser.id === 'god-mode') {
        setView(ViewState.SUPER_ADMIN);
    } else if (loggedInUser.role === 'admin') {
        setView(ViewState.ADMIN);
    } else { 
        setView(ViewState.POS); 
    }
  };

  const handleLogout = async () => { 
      await StorageService.clearSession(); 
      setUser(null); 
      setView(ViewState.POS); 
      setCart([]); 
  };

  const handleAddToCart = (product: Product, variantId?: string) => { 
      setCart(prev => { 
          const existing = prev.find(item => item.id === product.id && item.selectedVariantId === variantId); 
          if (existing) { 
              return prev.map(item => (item.id === product.id && item.selectedVariantId === variantId) ? { ...item, quantity: item.quantity + 1 } : item); 
          } 
          let finalPrice = product.price; 
          let selectedVariantName = undefined; 
          if (variantId && product.variants) { 
              const variant = product.variants.find(v => v.id === variantId); 
              if (variant) { 
                  finalPrice = variant.price; 
                  selectedVariantName = variant.name; 
              } 
          } 
          return [...prev, { ...product, price: finalPrice, quantity: 1, selectedVariantId: variantId, selectedVariantName }]; 
      }); 
  };

  const handleUpdateCartQuantity = (id: string, delta: number, variantId?: string) => { 
      setCart(prev => prev.map(item => { 
          if (item.id === id && item.selectedVariantId === variantId) return { ...item, quantity: Math.max(1, item.quantity + delta) }; 
          return item; 
      })); 
  };

  const handleRemoveFromCart = (id: string, variantId?: string) => { 
      setCart(prev => prev.filter(item => !(item.id === id && item.selectedVariantId === variantId))); 
  };

  const handleUpdateDiscount = (id: string, discount: number, variantId?: string) => { 
      setCart(prev => prev.map(item => (item.id === id && item.selectedVariantId === variantId) ? { ...item, discount } : item)); 
  };
  
  const handleCheckout = (method: any, payments: any[]) => {
      if(!activeShift) {
        alert("Debes abrir un turno para realizar ventas.");
        return;
      }
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = cart.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
      const total = Math.max(0, subtotal - totalDiscount);
      let tax = settings.pricesIncludeTax ? (total - (total / (1 + settings.taxRate))) : (total * settings.taxRate);
      
      const transaction: Transaction = { 
          id: crypto.randomUUID(), 
          date: new Date().toISOString(), 
          items: [...cart], 
          subtotal: settings.pricesIncludeTax ? (total - tax) : total, 
          tax, 
          discount: totalDiscount, 
          total: settings.pricesIncludeTax ? total : (total + tax), 
          paymentMethod: method, 
          payments, 
          profit: 0, 
          shiftId: activeShift.id 
      };
      
      const newTransactions = [transaction, ...transactions]; 
      setTransactions(newTransactions); 
      StorageService.saveTransaction(transaction);
      
      const newProducts = products.map(p => { 
          const cartItems = cart.filter(c => c.id === p.id); 
          if (cartItems.length === 0) return p; 
          let newStock = p.stock; 
          let newVariants = p.variants ? [...p.variants] : []; 
          cartItems.forEach(c => { 
              if (c.selectedVariantId && newVariants.length) { 
                  newVariants = newVariants.map(v => v.id === c.selectedVariantId ? { ...v, stock: v.stock - c.quantity } : v); 
              } else { 
                  newStock -= c.quantity; 
              } 
          }); 
          if (p.hasVariants) newStock = newVariants.reduce((sum,v) => sum + v.stock, 0); 
          return { ...p, stock: newStock, variants: newVariants }; 
      }); 
      
      setProducts(newProducts); 
      StorageService.saveProducts(newProducts);
      setCart([]); 
      setTicketType('SALE'); 
      setTicketData(transaction); 
      setShowTicket(true);
  };

  const handleCashAction = (action: 'OPEN' | 'CLOSE' | 'IN' | 'OUT', amount: number, description: string) => {
      if (action === 'OPEN') {
          const newShift: CashShift = { 
              id: crypto.randomUUID(), 
              startTime: new Date().toISOString(), 
              startAmount: amount, 
              status: 'OPEN', 
              totalSalesCash: 0, 
              totalSalesDigital: 0 
          };
          StorageService.saveShift(newShift); 
          StorageService.setActiveShiftId(newShift.id); 
          setShifts([newShift, ...shifts]); 
          setActiveShiftId(newShift.id);
      } else if (action === 'CLOSE' && activeShift) {
          const closedShift = { ...activeShift, endTime: new Date().toISOString(), endAmount: amount, status: 'CLOSED' as const };
          StorageService.saveShift(closedShift); 
          StorageService.setActiveShiftId(null); 
          setShifts(shifts.map(s => s.id === activeShift.id ? closedShift : s)); 
          setActiveShiftId(null);
          setTicketType('REPORT'); 
          setTicketData({ 
              shift: closedShift, 
              movements: movements.filter(m => m.shiftId === activeShift.id), 
              transactions: transactions.filter(t => t.shiftId === activeShift.id) 
          }); 
          setShowTicket(true);
      }
      
      if (activeShift || action === 'OPEN') {
          const currentId = activeShift ? activeShift.id : (shifts.length > 0 ? shifts[0].id : '');
          const actualId = action === 'OPEN' ? shifts[0]?.id : currentId;
          
          if(actualId) { 
              const move: CashMovement = { 
                  id: crypto.randomUUID(), 
                  shiftId: actualId, 
                  type: action, 
                  amount, 
                  description, 
                  timestamp: new Date().toISOString() 
              }; 
              StorageService.saveMovement(move); 
              setMovements([...movements, move]); 
          }
      }
  };

  const handleSaveProduct = async () => {
      if (!currentProduct?.name) return;
      let pToSave = { ...currentProduct };
      if (pToSave.hasVariants && pToSave.variants) pToSave.stock = pToSave.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
      
      // FIX: Ensure valid UUID for Database
      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      // Check if current ID is a mock ID (e.g. "1", "15") or empty
      const isInvalidId = !pToSave.id || !isValidUUID(pToSave.id);
      const originalId = pToSave.id;

      if (isInvalidId) {
          const newId = crypto.randomUUID();
          pToSave.id = newId;
      }

      // === SUPER ADMIN / TEMPLATE MODE ===
      if (view === ViewState.SUPER_ADMIN) {
          const result = await StorageService.saveDemoProductToTemplate(pToSave);
          if (result.success) {
              setSuperAdminRefreshTrigger(prev => prev + 1); // FORCE REFRESH
              
              if (result.error && result.error.includes("LOCALMENTE")) {
                  alert("✅ Producto guardado en Memoria Local.\n(No tienes permisos de escritura en la nube, pero tus cambios se han guardado en este dispositivo).");
              } else if (result.error) {
                  alert("⚠️ Guardado con advertencias: " + result.error);
              } else {
                  alert("✅ Producto guardado en Plantilla Global exitosamente.");
              }
              setIsProductModalOpen(false);
          } else {
              alert("❌ Error crítico al guardar: " + (result.error || "Desconocido"));
          }
          return;
      }

      // === NORMAL STORE MODE ===
      let updated; 
      
      // If the ID changed (it was a mock ID "1"), we treat it as a replacement of the old one in the local list
      if (originalId && originalId !== pToSave.id) {
           updated = products.map(p => p.id === originalId ? pToSave : p);
      } else {
           // Standard update or create
           if (products.find(p => p.id === pToSave.id)) {
               updated = products.map(p => p.id === pToSave.id ? pToSave : p); 
           } else {
               updated = [...products, pToSave];
           }
      }

      setProducts(updated); 
      // Use specific method to handle images
      await StorageService.saveProductWithImages(pToSave);
      setIsProductModalOpen(false);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && currentProduct) {
          if (file.size > 500000) { // Limit 500kb
              alert("La imagen es muy grande. Máximo 500KB.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              const currentImages = currentProduct.images || [];
              if (currentImages.length >= 2) {
                  alert("Máximo 2 imágenes por producto.");
                  return;
              }
              setCurrentProduct({ ...currentProduct, images: [...currentImages, base64String] });
          };
          reader.readAsDataURL(file);
      }
  };

  const removeImage = (index: number) => {
      if (currentProduct && currentProduct.images) {
          const newImages = [...currentProduct.images];
          newImages.splice(index, 1);
          setCurrentProduct({ ...currentProduct, images: newImages });
      }
  };
  
  const handleProcessPurchase = (purchase: Purchase, updatedProducts: Product[]) => {
      setPurchases([purchase, ...purchases]);
      setProducts(updatedProducts);
      StorageService.savePurchase(purchase);
      StorageService.saveProducts(updatedProducts);
  };
  
  const handleAddSupplier = (supplier: Supplier) => {
      setSuppliers([...suppliers, supplier]);
      StorageService.saveSupplier(supplier);
  };

  const handleUpdateSettings = (newSettings: StoreSettings) => {
      setSettings(newSettings);
      StorageService.saveSettings(newSettings);
  };
  
  const handleGoToPurchase = (productName: string) => {
      setInitialPurchaseSearch(productName);
      setView(ViewState.PURCHASES);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <>
        <Layout currentView={view} onChangeView={setView} settings={settings} user={user} onLogout={handleLogout}>
            {view === ViewState.POS && (
                <POSView 
                    products={products} 
                    cart={cart} 
                    transactions={transactions} 
                    activeShift={activeShift} 
                    settings={settings} 
                    customers={customers} 
                    onAddToCart={handleAddToCart} 
                    onUpdateCart={handleUpdateCartQuantity} 
                    onRemoveItem={handleRemoveFromCart} 
                    onUpdateDiscount={handleUpdateDiscount} 
                    onCheckout={handleCheckout} 
                    onClearCart={() => setCart([])} 
                    onOpenCashControl={(action: 'OPEN'|'IN'|'OUT'|'CLOSE') => setShowCashControl(true)} 
                />
            )}

            {view === ViewState.INVENTORY && (
                <InventoryView 
                    products={products} 
                    settings={settings} 
                    transactions={transactions}
                    purchases={purchases}
                    onNewProduct={() => { 
                        setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], images: [] }); 
                        setIsProductModalOpen(true); 
                    }} 
                    onEditProduct={(p) => { 
                        setCurrentProduct(p); 
                        setIsProductModalOpen(true); 
                    }} 
                    onDeleteProduct={(id) => { 
                        if(window.confirm('¿Estás seguro de eliminar este producto?')) { 
                            const up = products.filter(p => p.id !== id); 
                            setProducts(up); 
                            StorageService.saveProducts(up); 
                        } 
                    }} 
                    onGoToPurchase={handleGoToPurchase}
                />
            )}
            
            {view === ViewState.PURCHASES && (
                <PurchasesView 
                    products={products}
                    suppliers={suppliers}
                    purchases={purchases}
                    settings={settings}
                    onProcessPurchase={handleProcessPurchase}
                    onAddSupplier={handleAddSupplier}
                    onRequestNewProduct={(barcode) => {
                        setCurrentProduct({ 
                            id: '', 
                            name: '', 
                            price: 0, 
                            category: CATEGORIES[0], 
                            stock: 0, 
                            variants: [], 
                            barcode: barcode || '',
                            images: []
                        });
                        setIsProductModalOpen(true);
                    }}
                    initialSearchTerm={initialPurchaseSearch}
                    onClearInitialSearch={() => setInitialPurchaseSearch('')}
                />
            )}

            {view === ViewState.ADMIN && (
                <AdminView 
                transactions={transactions} 
                products={products} 
                shifts={shifts} 
                movements={movements} 
                />
            )}

            {view === ViewState.REPORTS && (
                <ReportsView 
                    transactions={transactions}
                    settings={settings}
                />
            )}

            {view === ViewState.SETTINGS && (
                <SettingsView 
                    settings={settings}
                    onSaveSettings={handleUpdateSettings}
                />
            )}

            {view === ViewState.SUPER_ADMIN && (
                <SuperAdminView 
                    onNewProduct={() => { 
                        setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], images: [] }); 
                        setIsProductModalOpen(true); 
                    }}
                    onEditProduct={(p) => {
                        setCurrentProduct(p);
                        setIsProductModalOpen(true);
                    }}
                    lastUpdated={superAdminRefreshTrigger}
                />
            )}
        </Layout>

        {/* --- MODALS OUTSIDE LAYOUT (Z-INDEX FIX) --- */}
        
        <OnboardingTour isOpen={showOnboarding} onComplete={() => setShowOnboarding(false)} />

        <CashControlModal 
            isOpen={showCashControl} 
            onClose={() => setShowCashControl(false)} 
            activeShift={activeShift} 
            movements={movements} 
            transactions={transactions} 
            onCashAction={handleCashAction} 
            currency={settings.currency} 
        />

        {showTicket && (
            <Ticket 
                type={ticketType} 
                data={ticketData} 
                settings={settings} 
                onClose={() => setShowTicket(false)} 
            />
        )}
        
        {isProductModalOpen && currentProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="font-black text-xl text-slate-800">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            {view === ViewState.SUPER_ADMIN && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md mt-1 inline-block">MODO PLANTILLA GLOBAL</span>
                            )}
                        </div>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">✕</button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar">
                        <div className="space-y-5">
                            
                            {/* IMAGES SECTION */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Imágenes (Máx 2)</label>
                                <div className="flex gap-4">
                                    {currentProduct.images?.map((img, idx) => (
                                        <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 group">
                                            <img src={img} alt="Product" className="w-full h-full object-cover" />
                                            <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ))}
                                    {(!currentProduct.images || currentProduct.images.length < 2) && (
                                        <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
                                            <ImageIcon className="w-6 h-6 mb-1"/>
                                            <span className="text-[10px] font-bold">Agregar</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre del Producto</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold text-lg outline-none transition-all" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct!, name: e.target.value})} placeholder="Ej. Coca Cola 600ml"/>
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Código de Barras</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.barcode || ''} onChange={e => setCurrentProduct({...currentProduct!, barcode: e.target.value})} placeholder="Escanear o escribir..." autoFocus={!currentProduct.id}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Precio Venta</label>
                                    <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.price || ''} onChange={e => setCurrentProduct({...currentProduct!, price: parseFloat(e.target.value)})} placeholder="0.00"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stock Actual</label>
                                    <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none disabled:opacity-50" value={currentProduct.stock || ''} onChange={e => setCurrentProduct({...currentProduct!, stock: parseFloat(e.target.value)})} placeholder="0" disabled={currentProduct.hasVariants}/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoría</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct!, category: e.target.value})}>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="pt-2">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${currentProduct.hasVariants ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                                        {currentProduct.hasVariants && <Plus className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.hasVariants || false} onChange={e => setCurrentProduct({...currentProduct!, hasVariants: e.target.checked})} /> 
                                    <span className="font-bold text-slate-700">Este producto tiene variantes</span>
                                </label>
                            </div>
                            
                            {currentProduct.hasVariants && (
                                <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-4 text-sm">Gestionar Variantes</h4>
                                    <div className="flex gap-2 mb-4">
                                        <input className="flex-[2] p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Ej. Grande" value={variantName} onChange={e => setVariantName(e.target.value)}/>
                                        <input className="flex-1 p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Precio" type="number" value={variantPrice} onChange={e => setVariantPrice(e.target.value)}/>
                                        <input className="w-20 p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Cant." type="number" value={variantStock} onChange={e => setVariantStock(e.target.value)}/>
                                        <button onClick={() => { 
                                            if(!currentProduct) return; 
                                            const newVar = { id: crypto.randomUUID(), name: variantName, price: parseFloat(variantPrice) || 0, stock: parseFloat(variantStock) || 0 }; 
                                            const newVars = [...(currentProduct.variants || []), newVar]; 
                                            setCurrentProduct({ ...currentProduct, variants: newVars, stock: newVars.reduce((s,v)=>s+v.stock,0) }); 
                                            setVariantName(''); setVariantPrice(''); setVariantStock(''); 
                                        }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus className="w-5 h-5"/></button>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {currentProduct.variants?.map((v, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                <span className="font-bold text-slate-700 text-sm">{v.name}</span>
                                                <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg">
                                                    {v.stock} un. • ${v.price}
                                                </div>
                                            </div>
                                        ))}
                                        {(!currentProduct.variants || currentProduct.variants.length === 0) && (
                                            <p className="text-center text-xs text-slate-400 py-2">No hay variantes agregadas</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                        <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleSaveProduct} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                            {view === ViewState.SUPER_ADMIN ? 'Guardar en Plantilla' : 'Guardar Producto'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default App;