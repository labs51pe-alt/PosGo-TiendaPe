
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Save, Image as ImageIcon, Plus, Check, X, Trash2, Search, Package, Rocket, Sparkles, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState | null>(null); 
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const initialized = useRef(false);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  
  // Shift Control State
  const [activeShiftId, setActiveShiftId] = useState<string | null>(StorageService.getActiveShiftId());
  const [localShiftCache, setLocalShiftCache] = useState<CashShift | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // UI State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [showCashControl, setShowCashControl] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketType, setTicketType] = useState<'SALE' | 'REPORT'>('SALE');
  const [ticketData, setTicketData] = useState<any>(null);
  const [initialPurchaseSearch, setInitialPurchaseSearch] = useState('');

  // Product Form State
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantStock, setVariantStock] = useState('');
  const [packSearchTerm, setPackSearchTerm] = useState('');

  const packSearchSuggestions = useMemo(() => {
    if (!packSearchTerm || packSearchTerm.length < 2) return [];
    return products.filter(p => !p.isPack && p.name.toLowerCase().includes(packSearchTerm.toLowerCase())).slice(0, 5);
  }, [products, packSearchTerm]);

  const refreshAllData = useCallback(async (forcedShiftId?: string | null) => {
      const currentActiveId = forcedShiftId !== undefined ? forcedShiftId : StorageService.getActiveShiftId();
      
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
      setMovements(mov);

      let finalShifts = [...sh];
      if (currentActiveId && !finalShifts.find(s => s.id === currentActiveId)) {
          if (localShiftCache && localShiftCache.id === currentActiveId) {
              finalShifts = [localShiftCache, ...finalShifts];
          }
      }

      setShifts(finalShifts);
      setActiveShiftId(currentActiveId);
  }, [localShiftCache]);

  useEffect(() => {
    const initApp = async () => {
        if (initialized.current) return;
        initialized.current = true;
        
        setLoading(true);
        const savedUser = StorageService.getSession();
        
        if (savedUser) { 
            setUser(savedUser); 
            let initialView = ViewState.POS;
            if (savedUser.role === 'super_admin' || savedUser.id === 'god-mode') initialView = ViewState.SUPER_ADMIN;
            else if (savedUser.role === 'admin') initialView = ViewState.ADMIN;
            
            setView(initialView);
            await refreshAllData();
        } else {
             setView(ViewState.POS);
             setProducts(await StorageService.getProducts());
        }
        setTimeout(() => setLoading(false), 800);
    };
    initApp();
  }, [refreshAllData]);

  useEffect(() => {
      if (user && !loading) {
          refreshAllData();
      }
  }, [refreshTrigger, user]);

  const activeShift = useMemo(() => {
      if (!activeShiftId) return null;
      return shifts.find(s => s.id === activeShiftId) || localShiftCache || null;
  }, [shifts, activeShiftId, localShiftCache]);

  const handleLogin = async (loggedInUser: UserProfile) => {
    setLoading(true);
    StorageService.saveSession(loggedInUser);
    setUser(loggedInUser);
    
    let nextView = ViewState.POS;
    if (loggedInUser.role === 'super_admin' || loggedInUser.id === 'god-mode') nextView = ViewState.SUPER_ADMIN;
    else if (loggedInUser.role === 'admin') nextView = ViewState.ADMIN;
    
    setView(nextView);
    await refreshAllData();
    setLoading(false);
  };

  const handleLogout = async () => { 
      setLoading(true);
      await StorageService.clearSession(); 
      setUser(null); 
      setCart([]); 
      setActiveShiftId(null);
      setLocalShiftCache(null);
      setShifts([]);
      setView(ViewState.POS);
      setLoading(false);
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
              if (variant) { finalPrice = variant.price; selectedVariantName = variant.name; } 
          } 
          return [...prev, { ...product, price: finalPrice, quantity: 1, selectedVariantId: variantId, selectedVariantName }]; 
      }); 
  };

  const handleUpdateCartQuantity = (id: string, delta: number, variantId?: string) => { 
      setCart(prev => prev.map(item => (item.id === id && item.selectedVariantId === variantId) ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)); 
  };

  const handleRemoveFromCart = (id: string, variantId?: string) => { 
      setCart(prev => prev.filter(item => !(item.id === id && item.selectedVariantId === variantId))); 
  };

  const handleUpdateDiscount = (id: string, discount: number, variantId?: string) => { 
      setCart(prev => prev.map(item => (item.id === id && item.selectedVariantId === variantId) ? { ...item, discount } : item)); 
  };

  const handleCheckout = async (method: any, payments: any[]) => {
      if(!activeShift) { alert("Debes abrir un turno para realizar ventas."); return; }
      
      setIsSyncing(true);
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

      setTicketType('SALE'); 
      setTicketData(transaction); 
      setShowTicket(true);
      
      const currentCart = [...cart];
      setCart([]); 

      try {
          const updatedProducts = products.map(p => { 
              const cartItems = currentCart.filter(c => c.id === p.id); 
              if (cartItems.length === 0) return p; 
              let newStock = p.stock; 
              let newVariants = p.variants ? [...p.variants] : []; 
              cartItems.forEach(c => { 
                  if (c.selectedVariantId && newVariants.length) { 
                      newVariants = newVariants.map(v => v.id === c.selectedVariantId ? { ...v, stock: v.stock - c.quantity } : v); 
                  } else { newStock -= c.quantity; } 
              }); 
              if (p.hasVariants) newStock = newVariants.reduce((sum,v) => sum + v.stock, 0); 
              return { ...p, stock: newStock, variants: newVariants }; 
          }); 

          await Promise.all([
              StorageService.saveTransaction(transaction),
              StorageService.saveProducts(updatedProducts)
          ]);
          
          refreshAllData();
      } catch (error) {
          console.error("Error al sincronizar venta:", error);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleCashAction = async (action: 'OPEN' | 'CLOSE' | 'IN' | 'OUT', amount: number, description: string) => {
      if (action === 'OPEN') {
          const newId = crypto.randomUUID();
          const newShift: CashShift = { id: newId, startTime: new Date().toISOString(), startAmount: amount, status: 'OPEN', totalSalesCash: 0, totalSalesDigital: 0 };
          StorageService.setActiveShiftId(newId);
          setLocalShiftCache(newShift);
          setActiveShiftId(newId);
          await StorageService.saveShift(newShift); 
          const move: CashMovement = { id: crypto.randomUUID(), shiftId: newId, type: 'OPEN', amount, description: 'Apertura de caja', timestamp: new Date().toISOString() }; 
          await StorageService.saveMovement(move); 
          await refreshAllData(newId);
          setView(ViewState.POS);
      } else if (action === 'CLOSE' && activeShift) {
          const closedShift = { ...activeShift, endTime: new Date().toISOString(), endAmount: amount, status: 'CLOSED' as const };
          StorageService.setActiveShiftId(null); 
          setActiveShiftId(null); 
          setLocalShiftCache(null);
          await StorageService.saveShift(closedShift); 
          const move: CashMovement = { id: crypto.randomUUID(), shiftId: activeShift.id, type: 'CLOSE', amount, description: 'Cierre de caja', timestamp: new Date().toISOString() }; 
          await StorageService.saveMovement(move);
          setTicketType('REPORT'); 
          setTicketData({ shift: closedShift, movements: movements.filter(m => m.shiftId === activeShift.id), transactions: transactions.filter(t => t.shiftId === activeShift.id) }); 
          setShowTicket(true);
          await refreshAllData(null);
      } else if (activeShift) {
          const move: CashMovement = { id: crypto.randomUUID(), shiftId: activeShift.id, type: action, amount, description, timestamp: new Date().toISOString() }; 
          await StorageService.saveMovement(move); 
          await refreshAllData();
      }
  };

  const handleSaveProduct = async () => {
      if (!currentProduct?.name) return;
      let pToSave = { ...currentProduct };
      if (pToSave.hasVariants && pToSave.variants) pToSave.stock = pToSave.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
      
      if (!pToSave.id) pToSave.id = crypto.randomUUID();

      if (view === ViewState.SUPER_ADMIN) {
          const result = await StorageService.saveDemoProductToTemplate(pToSave);
          if (result.success) {
              setRefreshTrigger(prev => prev + 1);
              setIsProductModalOpen(false);
          } else { alert("Error: " + result.error); }
          return;
      }

      await StorageService.saveProductWithImages(pToSave);
      await refreshAllData();
      setIsProductModalOpen(false);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && currentProduct) {
          if (file.size > 800000) { alert("Imagen demasiado grande (máx 800KB)."); return; }
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              const currentImages = currentProduct.images || [];
              if (currentImages.length >= 2) { alert("Máximo 2 imágenes."); return; }
              setCurrentProduct({ ...currentProduct, images: [...currentImages, base64String] });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGoToPurchase = (productName: string) => {
      setInitialPurchaseSearch(productName);
      setView(ViewState.PURCHASES);
  };

  const addPackItem = (p: Product) => {
    if (!currentProduct) return;
    const newItem: PackItem = { productId: p.id, productName: p.name, quantity: 1 };
    const currentItems = currentProduct.packItems || [];
    if (currentItems.find(i => i.productId === p.id)) return;
    setCurrentProduct({ ...currentProduct, packItems: [...currentItems, newItem] });
    setPackSearchTerm('');
  };

  if (loading || (user && view === null)) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[100px] opacity-40 animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px] opacity-40 animate-pulse"></div>

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-bounce mb-8 sm:mb-10 border border-white/20">
                    <Rocket className="w-10 h-10 sm:w-12 sm:h-12 text-white fill-current" />
                </div>

                <div className="text-center space-y-4 mb-8 sm:mb-10 px-8">
                    <div className="flex items-center justify-center gap-2 text-indigo-500 mb-1">
                        <Sparkles className="w-4 h-4 animate-spin-slow" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em]">Cargando Experiencia</span>
                        <Sparkles className="w-4 h-4 animate-spin-slow" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight max-w-sm mx-auto">
                        Estamos preparando algo <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-indigo-600">mágico</span> para ti y tu negocio...
                    </h2>
                </div>

                <div className="w-48 sm:w-64 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                    <div className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 animate-shimmer absolute inset-0" style={{ width: '100%' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>

                <p className="mt-6 sm:mt-8 text-slate-400 font-black text-[8px] sm:text-[9px] tracking-[0.4em] uppercase opacity-60">Sincronizando con la Nube</p>
            </div>
        </div>
      );
  }

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <>
        <Layout currentView={view || ViewState.POS} onChangeView={setView} settings={settings} user={user} onLogout={handleLogout}>
            {view === ViewState.POS && <POSView products={products} cart={cart} transactions={transactions} activeShift={activeShift} settings={settings} customers={customers} onAddToCart={handleAddToCart} onUpdateCart={handleUpdateCartQuantity} onRemoveItem={handleRemoveFromCart} onUpdateDiscount={handleUpdateDiscount} onCheckout={handleCheckout} onClearCart={() => setCart([])} onOpenCashControl={() => setShowCashControl(true)} />}
            {view === ViewState.INVENTORY && <InventoryView products={products} settings={settings} transactions={transactions} purchases={purchases} onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], packItems: [], images: [], isPack: false, hasVariants: false }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct({ ...p, variants: p.variants || [], packItems: p.packItems || [] }); setIsProductModalOpen(true); }} onDeleteProduct={async (id) => { if(window.confirm('¿Eliminar producto?')) { await StorageService.deleteDemoProduct(id); await refreshAllData(); } }} onGoToPurchase={handleGoToPurchase} />}
            {view === ViewState.PURCHASES && <PurchasesView products={products} suppliers={suppliers} purchases={purchases} settings={settings} onProcessPurchase={async (pur, updated) => { await StorageService.savePurchase(pur); await StorageService.saveProducts(updated); await refreshAllData(); }} onAddSupplier={async (s) => { await StorageService.saveSupplier(s); await refreshAllData(); }} onRequestNewProduct={(barcode) => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], packItems: [], barcode: barcode || '', images: [], isPack: false, hasVariants: false }); setIsProductModalOpen(true); }} initialSearchTerm={initialPurchaseSearch} onClearInitialSearch={() => setInitialPurchaseSearch('')} />}
            {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} shifts={shifts} movements={movements} />}
            {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
            {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={async (s) => { await StorageService.saveSettings(s); await refreshAllData(); }} />}
            {view === ViewState.SUPER_ADMIN && <SuperAdminView onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], packItems: [], images: [], isPack: false, hasVariants: false }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct({ ...p, variants: p.variants || [], packItems: p.packItems || [] }); setIsProductModalOpen(true); }} lastUpdated={refreshTrigger} />}
        </Layout>

        {isSyncing && (
            <div className="fixed top-6 right-6 z-[250] bg-white border border-emerald-100 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in max-w-[calc(100%-3rem)]">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 truncate">
                    Sincronizando Venta...
                </span>
            </div>
        )}

        {isProductModalOpen && currentProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center sm:p-4">
                <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col animate-fade-in-up">
                    <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="font-black text-lg sm:text-xl text-slate-800">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <span className="text-[9px] sm:text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md mt-1 inline-block uppercase">Catálogo Sincronizado</span>
                        </div>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">✕</button>
                    </div>
                    
                    <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Imágenes (Máx 2)</label>
                            <div className="flex gap-4">
                                {currentProduct.images?.map((img, i) => (
                                    <div key={i} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-slate-200 group">
                                        <img src={img} className="w-full h-full object-cover" alt="preview" />
                                        <button onClick={() => setCurrentProduct({...currentProduct, images: currentProduct.images?.filter((_,idx)=>idx!==i)})} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 sm:group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                                    </div>
                                ))}
                                {(!currentProduct.images || currentProduct.images.length < 2) && (
                                    <label className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                                        <ImageIcon className="w-6 h-6 mb-1"/><span className="text-[9px] font-bold">Subir</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Nombre</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-base sm:text-lg outline-none focus:border-slate-800" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} /></div>
                            <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Código</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.barcode || ''} onChange={e => setCurrentProduct({...currentProduct, barcode: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Venta</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} /></div>
                                <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Stock</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none disabled:opacity-50" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: parseFloat(e.target.value) || 0})} disabled={currentProduct.hasVariants} /></div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Categoría</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})}>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <label className="flex items-center gap-3 p-3 sm:p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${currentProduct.hasVariants ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                        {currentProduct.hasVariants && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.hasVariants || false} onChange={e => setCurrentProduct({...currentProduct, hasVariants: e.target.checked, isPack: false})} /> 
                                    <span className="font-bold text-slate-700 text-[11px] sm:text-sm">Variantes</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 sm:p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${currentProduct.isPack ? 'bg-amber-600 border-amber-600' : 'border-slate-300'}`}>
                                        {currentProduct.isPack && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.isPack || false} onChange={e => setCurrentProduct({...currentProduct, isPack: e.target.checked, hasVariants: false})} /> 
                                    <span className="font-bold text-slate-700 text-[11px] sm:text-sm">Combo / Pack</span>
                                </label>
                            </div>
                            
                            {currentProduct.hasVariants && (
                                <div className="bg-indigo-50/50 p-5 sm:p-6 rounded-[1.5rem] border border-indigo-100">
                                    <h4 className="font-bold text-indigo-800 mb-4 text-[11px] sm:text-sm uppercase tracking-wider">Gestionar Variantes</h4>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <input className="flex-[2] p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold" placeholder="Ej. XL" value={variantName} onChange={e => setVariantName(e.target.value)}/>
                                        <input className="flex-1 p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold" placeholder="Price" type="number" value={variantPrice} onChange={e => setVariantPrice(e.target.value)}/>
                                        <input className="w-16 sm:w-20 p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold" placeholder="Stock" type="number" value={variantStock} onChange={e => setVariantStock(e.target.value)}/>
                                        <button onClick={() => { 
                                            if(!variantName) return;
                                            const newVar = { id: crypto.randomUUID(), name: variantName, price: parseFloat(variantPrice) || 0, stock: parseFloat(variantStock) || 0 }; 
                                            setCurrentProduct({ ...currentProduct, variants: [...(currentProduct.variants || []), newVar] }); 
                                            setVariantName(''); setVariantPrice(''); setVariantStock(''); 
                                        }} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shrink-0"><Plus className="w-5 h-5"/></button>
                                    </div>
                                    <div className="space-y-2">
                                        {currentProduct.variants?.map((v, i) => (
                                            <div key={v.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-indigo-50 shadow-sm">
                                                <span className="font-bold text-slate-700 text-xs">{v.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">S/{v.price.toFixed(2)} • {v.stock} un.</div>
                                                    <button onClick={() => setCurrentProduct({...currentProduct, variants: currentProduct.variants?.filter((_,idx)=>idx!==i)})} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentProduct.isPack && (
                                <div className="bg-amber-50/50 p-5 sm:p-6 rounded-[1.5rem] border border-amber-100">
                                    <h4 className="font-bold text-amber-800 mb-4 text-[11px] sm:text-sm flex items-center gap-2 uppercase tracking-wider"><Package className="w-4 h-4"/> Productos en Combo</h4>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4"/>
                                        <input className="w-full pl-10 pr-4 py-3 bg-white border border-amber-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500" placeholder="Buscar productos..." value={packSearchTerm} onChange={e => setPackSearchTerm(e.target.value)} />
                                        {packSearchSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white border border-amber-100 rounded-xl shadow-xl z-50 overflow-hidden mt-1">
                                                {packSearchSuggestions.map(p => (
                                                    <button key={p.id} onClick={() => addPackItem(p)} className="w-full text-left p-3 hover:bg-amber-50 font-bold text-xs border-b border-slate-50 last:border-0">{p.name}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {currentProduct.packItems?.map((item, i) => (
                                            <div key={item.productId} className="flex justify-between items-center p-3 bg-white rounded-xl border border-amber-50 shadow-sm">
                                                <span className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{item.productName}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1">
                                                        <button onClick={() => { const newItems = [...(currentProduct.packItems || [])]; newItems[i].quantity = Math.max(1, newItems[i].quantity - 1); setCurrentProduct({...currentProduct, packItems: newItems}); }} className="text-amber-600 px-1 font-black">-</button>
                                                        <span className="px-1 text-[10px] font-black w-4 text-center">{item.quantity}</span>
                                                        <button onClick={() => { const newItems = [...(currentProduct.packItems || [])]; newItems[i].quantity += 1; setCurrentProduct({...currentProduct, packItems: newItems}); }} className="text-amber-600 px-1 font-black">+</button>
                                                    </div>
                                                    <button onClick={() => setCurrentProduct({...currentProduct, packItems: currentProduct.packItems?.filter((_,idx)=>idx!==i)})} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 bg-slate-50/50 shrink-0">
                        <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleSaveProduct} className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Save className="w-5 h-5"/> Sincronizar</button>
                    </div>
                </div>
            </div>
        )}
        
        <CashControlModal isOpen={showCashControl} onClose={() => setShowCashControl(false)} activeShift={activeShift} movements={movements} transactions={transactions} onCashAction={handleCashAction} currency={settings.currency} />
        {showTicket && <Ticket type={ticketType} data={ticketData} settings={settings} onClose={() => setShowTicket(false)} />}
        <OnboardingTour isOpen={showOnboarding} onComplete={() => setShowOnboarding(false)} />
    </>
  );
};

export default App;
