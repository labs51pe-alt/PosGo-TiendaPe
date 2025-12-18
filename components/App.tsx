
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
import { Save, Image as ImageIcon, Plus, Check, X, Trash2, Search, Package } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.POS);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
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

  // Función de refresco resiliente de datos
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

  // EFECTO DE MONTAJE (Corre una sola vez)
  useEffect(() => {
    const initApp = async () => {
        if (initialized.current) return;
        setLoading(true);
        
        const savedUser = StorageService.getSession();
        if (savedUser) { 
            setUser(savedUser); 
            
            // Establecer vista inicial solo en el primer arranque por rol
            if (savedUser.role === 'super_admin' || savedUser.id === 'god-mode') setView(ViewState.SUPER_ADMIN);
            else if (savedUser.role === 'admin') setView(ViewState.ADMIN);
            else setView(ViewState.POS);

            const sh = await StorageService.getShifts();
            const activeId = StorageService.getActiveShiftId();
            if (activeId) {
                const active = sh.find(s => s.id === activeId);
                if (active) setLocalShiftCache(active);
            }
            await refreshAllData();
        } else {
             setProducts(await StorageService.getProducts());
        }
        
        initialized.current = true;
        setLoading(false);
    };
    initApp();
  }, [refreshAllData]);

  // EFECTO PARA ACTUALIZAR DATOS SIN CAMBIAR LA VISTA
  useEffect(() => {
      if (initialized.current && user) {
          refreshAllData();
      }
  }, [refreshTrigger, user, refreshAllData]);

  const activeShift = useMemo(() => {
      if (!activeShiftId) return null;
      return shifts.find(s => s.id === activeShiftId) || localShiftCache || null;
  }, [shifts, activeShiftId, localShiftCache]);

  const handleLogin = async (loggedInUser: UserProfile) => {
    setLoading(true);
    StorageService.saveSession(loggedInUser);
    setUser(loggedInUser);
    await refreshAllData();
    setLoading(false);
    
    // Navegación post-login
    if (loggedInUser.role === 'super_admin' || loggedInUser.id === 'god-mode') setView(ViewState.SUPER_ADMIN);
    else if (loggedInUser.role === 'admin') setView(ViewState.ADMIN);
    else setView(ViewState.POS); 
  };

  const handleLogout = async () => { 
      await StorageService.clearSession(); 
      setUser(null); 
      setCart([]); 
      setActiveShiftId(null);
      setLocalShiftCache(null);
      setShifts([]);
      setView(ViewState.POS);
      initialized.current = false;
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
      
      await StorageService.saveTransaction(transaction);
      
      const updatedProducts = products.map(p => { 
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
      
      await StorageService.saveProducts(updatedProducts);
      setCart([]); 
      setTicketType('SALE'); 
      setTicketData(transaction); 
      setShowTicket(true);
      await refreshAllData();
  };

  const handleCashAction = async (action: 'OPEN' | 'CLOSE' | 'IN' | 'OUT', amount: number, description: string) => {
      if (action === 'OPEN') {
          const newId = crypto.randomUUID();
          const newShift: CashShift = { 
              id: newId, 
              startTime: new Date().toISOString(), 
              startAmount: amount, 
              status: 'OPEN', 
              totalSalesCash: 0, 
              totalSalesDigital: 0 
          };

          StorageService.setActiveShiftId(newId);
          setLocalShiftCache(newShift);
          setActiveShiftId(newId);

          await StorageService.saveShift(newShift); 

          const move: CashMovement = { 
              id: crypto.randomUUID(), 
              shiftId: newId, 
              type: 'OPEN', 
              amount, 
              description: 'Apertura de caja', 
              timestamp: new Date().toISOString() 
          }; 
          await StorageService.saveMovement(move); 
          await refreshAllData(newId);
          
          // FORZAR PERMANECER EN POS TRAS APERTURA
          setView(ViewState.POS);

      } else if (action === 'CLOSE' && activeShift) {
          const closedShift = { ...activeShift, endTime: new Date().toISOString(), endAmount: amount, status: 'CLOSED' as const };
          
          StorageService.setActiveShiftId(null); 
          setActiveShiftId(null); 
          setLocalShiftCache(null);

          await StorageService.saveShift(closedShift); 

          const move: CashMovement = { 
              id: crypto.randomUUID(), 
              shiftId: activeShift.id, 
              type: 'CLOSE', 
              amount, 
              description: 'Cierre de caja', 
              timestamp: new Date().toISOString() 
          }; 
          await StorageService.saveMovement(move);

          setTicketType('REPORT'); 
          setTicketData({ 
              shift: closedShift, 
              movements: movements.filter(m => m.shiftId === activeShift.id), 
              transactions: transactions.filter(t => t.shiftId === activeShift.id) 
          }); 
          setShowTicket(true);
          await refreshAllData(null);
      } else if (activeShift) {
          const move: CashMovement = { 
              id: crypto.randomUUID(), 
              shiftId: activeShift.id, 
              type: action, 
              amount, 
              description, 
              timestamp: new Date().toISOString() 
          }; 
          await StorageService.saveMovement(move); 
          await refreshAllData();
      }
  };

  const handleSaveProduct = async () => {
      if (!currentProduct?.name) return;
      let pToSave = { ...currentProduct };
      if (pToSave.hasVariants && pToSave.variants) pToSave.stock = pToSave.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
      
      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!pToSave.id || !isValidUUID(pToSave.id)) pToSave.id = crypto.randomUUID();

      if (view === ViewState.SUPER_ADMIN) {
          const result = await StorageService.saveDemoProductToTemplate(pToSave);
          if (result.success) {
              setRefreshTrigger(prev => prev + 1);
              setIsProductModalOpen(false);
          } else {
              alert("Error: " + result.error);
          }
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

  const packSearchSuggestions = useMemo(() => {
    if (!packSearchTerm || packSearchTerm.length < 2) return [];
    return products.filter(p => 
        p.id !== currentProduct?.id && 
        !p.isPack &&
        (p.name.toLowerCase().includes(packSearchTerm.toLowerCase()) || p.barcode?.includes(packSearchTerm))
    ).slice(0, 5);
  }, [packSearchTerm, products, currentProduct]);

  const addPackItem = (p: Product) => {
    if (!currentProduct) return;
    const newItem: PackItem = { productId: p.id, productName: p.name, quantity: 1 };
    const currentItems = currentProduct.packItems || [];
    if (currentItems.find(i => i.productId === p.id)) return;
    setCurrentProduct({ ...currentProduct, packItems: [...currentItems, newItem] });
    setPackSearchTerm('');
  };

  if (loading && products.length === 0) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <>
        <Layout currentView={view} onChangeView={setView} settings={settings} user={user} onLogout={handleLogout}>
            {view === ViewState.POS && <POSView products={products} cart={cart} transactions={transactions} activeShift={activeShift} settings={settings} customers={customers} onAddToCart={handleAddToCart} onUpdateCart={handleUpdateCartQuantity} onRemoveItem={handleRemoveFromCart} onUpdateDiscount={handleUpdateDiscount} onCheckout={handleCheckout} onClearCart={() => setCart([])} onOpenCashControl={() => setShowCashControl(true)} />}
            {view === ViewState.INVENTORY && <InventoryView products={products} settings={settings} transactions={transactions} purchases={purchases} onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], packItems: [], images: [], isPack: false, hasVariants: false }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct({ ...p, variants: p.variants || [], packItems: p.packItems || [] }); setIsProductModalOpen(true); }} onDeleteProduct={async (id) => { if(window.confirm('¿Eliminar producto?')) { await StorageService.deleteDemoProduct(id); await refreshAllData(); } }} onGoToPurchase={handleGoToPurchase} />}
            {view === ViewState.PURCHASES && <PurchasesView products={products} suppliers={suppliers} purchases={purchases} settings={settings} onProcessPurchase={async (pur, updated) => { await StorageService.savePurchase(pur); await StorageService.saveProducts(updated); await refreshAllData(); }} onAddSupplier={async (s) => { await StorageService.saveSupplier(s); await refreshAllData(); }} onRequestNewProduct={(barcode) => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], packItems: [], barcode: barcode || '', images: [], isPack: false, hasVariants: false }); setIsProductModalOpen(true); }} initialSearchTerm={initialPurchaseSearch} onClearInitialSearch={() => setInitialPurchaseSearch('')} />}
            {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} shifts={shifts} movements={movements} />}
            {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
            {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={async (s) => { await StorageService.saveSettings(s); await refreshAllData(); }} />}
            {view === ViewState.SUPER_ADMIN && <SuperAdminView onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], packItems: [], images: [], isPack: false, hasVariants: false }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct({ ...p, variants: p.variants || [], packItems: p.packItems || [] }); setIsProductModalOpen(true); }} lastUpdated={refreshTrigger} />}
        </Layout>

        {isProductModalOpen && currentProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="font-black text-xl text-slate-800">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            {view === ViewState.SUPER_ADMIN && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md mt-1 inline-block">MODO PLANTILLA GLOBAL</span>}
                        </div>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">✕</button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                        {/* Imágenes */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Imágenes (Máx 2)</label>
                            <div className="flex gap-4">
                                {currentProduct.images?.map((img, i) => (
                                    <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 group">
                                        <img src={img} className="w-full h-full object-cover" alt="preview" />
                                        <button onClick={() => setCurrentProduct({...currentProduct, images: currentProduct.images?.filter((_,idx)=>idx!==i)})} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                                    </div>
                                ))}
                                {(!currentProduct.images || currentProduct.images.length < 2) && (
                                    <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                                        <ImageIcon className="w-6 h-6 mb-1"/><span className="text-[10px] font-bold">Subir</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Campos Base */}
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-slate-400 mb-1">Nombre</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-lg outline-none focus:border-slate-800" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-400 mb-1">Código de Barras</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.barcode || ''} onChange={e => setCurrentProduct({...currentProduct, barcode: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Precio Venta</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} /></div>
                                <div><label className="block text-xs font-bold text-slate-400 mb-1">Stock Actual</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none disabled:opacity-50" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: parseFloat(e.target.value) || 0})} disabled={currentProduct.hasVariants} /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Categoría</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})}>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            
                            {/* Switches de Variantes y Packs */}
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${currentProduct.hasVariants ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                        {currentProduct.hasVariants && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.hasVariants || false} onChange={e => setCurrentProduct({...currentProduct, hasVariants: e.target.checked, isPack: false})} /> 
                                    <span className="font-bold text-slate-700 text-sm">Tiene Variantes</span>
                                </label>

                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${currentProduct.isPack ? 'bg-amber-600 border-amber-600' : 'border-slate-300'}`}>
                                        {currentProduct.isPack && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.isPack || false} onChange={e => setCurrentProduct({...currentProduct, isPack: e.target.checked, hasVariants: false})} /> 
                                    <span className="font-bold text-slate-700 text-sm">Es Pack / Combo</span>
                                </label>
                            </div>
                            
                            {/* SECCIÓN VARIANTES */}
                            {currentProduct.hasVariants && (
                                <div className="bg-indigo-50/50 p-6 rounded-[1.5rem] border border-indigo-100 animate-fade-in">
                                    <h4 className="font-bold text-indigo-800 mb-4 text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> Gestionar Variantes</h4>
                                    <div className="flex gap-2 mb-4">
                                        <input className="flex-[2] p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Ej. Grande" value={variantName} onChange={e => setVariantName(e.target.value)}/>
                                        <input className="flex-1 p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Precio" type="number" value={variantPrice} onChange={e => setVariantPrice(e.target.value)}/>
                                        <input className="w-20 p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Stock" type="number" value={variantStock} onChange={e => setVariantStock(e.target.value)}/>
                                        <button onClick={() => { 
                                            if(!variantName) return;
                                            const newVar = { id: crypto.randomUUID(), name: variantName, price: parseFloat(variantPrice) || 0, stock: parseFloat(variantStock) || 0 }; 
                                            const newVars = [...(currentProduct.variants || []), newVar]; 
                                            setCurrentProduct({ ...currentProduct, variants: newVars }); 
                                            setVariantName(''); setVariantPrice(''); setVariantStock(''); 
                                        }} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700"><Plus className="w-5 h-5"/></button>
                                    </div>
                                    <div className="space-y-2">
                                        {currentProduct.variants?.map((v, i) => (
                                            <div key={v.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-indigo-50 shadow-sm">
                                                <span className="font-bold text-slate-700 text-sm">{v.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">S/{v.price.toFixed(2)} • {v.stock} un.</div>
                                                    <button onClick={() => setCurrentProduct({...currentProduct, variants: currentProduct.variants?.filter((_,idx)=>idx!==i)})} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SECCIÓN PACKS / COMBOS */}
                            {currentProduct.isPack && (
                                <div className="bg-amber-50/50 p-6 rounded-[1.5rem] border border-amber-100 animate-fade-in">
                                    <h4 className="font-bold text-amber-800 mb-4 text-sm flex items-center gap-2"><Package className="w-4 h-4"/> Productos en el Combo</h4>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4"/>
                                        <input 
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-amber-200 rounded-xl font-bold text-sm outline-none focus:border-amber-500" 
                                            placeholder="Buscar productos para añadir..." 
                                            value={packSearchTerm} 
                                            onChange={e => setPackSearchTerm(e.target.value)} 
                                        />
                                        {packSearchSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white border border-amber-100 rounded-xl shadow-xl z-50 overflow-hidden mt-1">
                                                {packSearchSuggestions.map(p => (
                                                    <button key={p.id} onClick={() => addPackItem(p)} className="w-full text-left p-3 hover:bg-amber-50 font-bold text-xs border-b border-slate-50 last:border-0">{p.name} <span className="text-slate-400 font-normal ml-2">S/{p.price.toFixed(2)}</span></button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {currentProduct.packItems?.map((item, i) => (
                                            <div key={item.productId} className="flex justify-between items-center p-3 bg-white rounded-xl border border-amber-50 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700 text-sm">{item.productName}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1">
                                                        <button onClick={() => {
                                                            const newItems = [...(currentProduct.packItems || [])];
                                                            newItems[i].quantity = Math.max(1, newItems[i].quantity - 1);
                                                            setCurrentProduct({...currentProduct, packItems: newItems});
                                                        }} className="text-amber-600 px-1 font-black">-</button>
                                                        <span className="px-2 text-xs font-black w-6 text-center">{item.quantity}</span>
                                                        <button onClick={() => {
                                                            const newItems = [...(currentProduct.packItems || [])];
                                                            newItems[i].quantity += 1;
                                                            setCurrentProduct({...currentProduct, packItems: newItems});
                                                        }} className="text-amber-600 px-1 font-black">+</button>
                                                    </div>
                                                    <button onClick={() => setCurrentProduct({...currentProduct, packItems: currentProduct.packItems?.filter((_,idx)=>idx!==i)})} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!currentProduct.packItems || currentProduct.packItems.length === 0) && (
                                            <p className="text-center text-[10px] text-amber-400 py-2 italic font-medium">Añade productos para crear el combo</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                        <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancelar</button>
                        <button onClick={handleSaveProduct} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"><Save className="w-5 h-5 inline-block mr-2"/> Guardar</button>
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
