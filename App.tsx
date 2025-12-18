
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ViewState, Product, CartItem, Transaction, StoreSettings, Purchase, CashShift, CashMovement, UserProfile, Customer, Supplier, PackItem } from './types';
import { StorageService } from './services/storageService';
import { Layout } from './components/Layout';
import { Cart } from './components/Cart';
import { Ticket } from './components/Ticket';
import { Auth } from './components/Auth';
import { AdminView } from './components/AdminView';
import { OnboardingTour } from './components/OnboardingTour';
import { InventoryView } from './components/InventoryView';
import { PurchasesView } from './components/PurchasesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { CashControlModal } from './components/CashControlModal';
import { POSView } from './components/POSView';
import { SuperAdminView } from './components/SuperAdminView';
import { DEFAULT_SETTINGS, CATEGORIES } from './constants';
import { Save, Image as ImageIcon, Plus, Check, X, Trash2, Edit2, Package, Search } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.POS);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

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
  
  // Shift Control State (RED DE SEGURIDAD)
  const [activeShiftId, setActiveShiftId] = useState<string | null>(StorageService.getActiveShiftId());
  const [localShiftCache, setLocalShiftCache] = useState<CashShift | null>(null);
  const [superAdminRefreshTrigger, setSuperAdminRefreshTrigger] = useState(0);

  // UI State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [showCashControl, setShowCashControl] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketType, setTicketType] = useState<'SALE' | 'REPORT'>('SALE');
  const [ticketData, setTicketData] = useState<any>(null);
  const [initialPurchaseSearch, setInitialPurchaseSearch] = useState('');

  // Product Form State (Variantes y Packs)
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantStock, setVariantStock] = useState('');

  // Función de refresco resiliente
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
          } else {
              const placeholder: CashShift = {
                  id: currentActiveId,
                  startTime: new Date().toISOString(),
                  startAmount: 0,
                  status: 'OPEN',
                  totalSalesCash: 0,
                  totalSalesDigital: 0
              };
              finalShifts = [placeholder, ...finalShifts];
          }
      }

      setShifts(finalShifts);
      setActiveShiftId(currentActiveId);
  }, [localShiftCache]);

  useEffect(() => {
    const initApp = async () => {
        setLoading(true);
        const savedUser = StorageService.getSession();
        if (savedUser) { 
            setUser(savedUser); 
            if (savedUser.role === 'super_admin' || savedUser.id === 'god-mode') setView(ViewState.SUPER_ADMIN);
            else if (savedUser.role === 'admin') setView(ViewState.ADMIN);
            
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
        setLoading(false);
    };
    initApp();
  }, [superAdminRefreshTrigger]);

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
          setShifts(prev => [newShift, ...prev]);

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
              setSuperAdminRefreshTrigger(prev => prev + 1);
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

  if (loading && products.length === 0) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
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
                    onOpenCashControl={() => setShowCashControl(true)} 
                />
            )}
            {view === ViewState.INVENTORY && (
                <InventoryView 
                    products={products} 
                    settings={settings} 
                    transactions={transactions}
                    purchases={purchases}
                    onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], images: [] }); setIsProductModalOpen(true); }} 
                    onEditProduct={(p) => { setCurrentProduct(p); setIsProductModalOpen(true); }} 
                    onDeleteProduct={async (id) => { if(window.confirm('¿Eliminar producto?')) { await StorageService.deleteDemoProduct(id); await refreshAllData(); } }} 
                    onGoToPurchase={handleGoToPurchase}
                />
            )}
            {view === ViewState.PURCHASES && (
                <PurchasesView 
                    products={products} suppliers={suppliers} purchases={purchases} settings={settings}
                    onProcessPurchase={async (pur, updated) => { await StorageService.savePurchase(pur); await StorageService.saveProducts(updated); await refreshAllData(); }}
                    onAddSupplier={async (s) => { await StorageService.saveSupplier(s); await refreshAllData(); }}
                    onRequestNewProduct={(barcode) => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], barcode: barcode || '', images: [] }); setIsProductModalOpen(true); }}
                    initialSearchTerm={initialPurchaseSearch} onClearInitialSearch={() => setInitialPurchaseSearch('')}
                />
            )}
            {view === ViewState.ADMIN && <AdminView transactions={transactions} products={products} shifts={shifts} movements={movements} />}
            {view === ViewState.REPORTS && <ReportsView transactions={transactions} settings={settings} />}
            {view === ViewState.SETTINGS && <SettingsView settings={settings} onSaveSettings={async (s) => { await StorageService.saveSettings(s); await refreshAllData(); }} />}
            {view === ViewState.SUPER_ADMIN && <SuperAdminView onNewProduct={() => { setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], images: [] }); setIsProductModalOpen(true); }} onEditProduct={(p) => { setCurrentProduct(p); setIsProductModalOpen(true); }} lastUpdated={superAdminRefreshTrigger} />}
        </Layout>

        <CashControlModal 
            isOpen={showCashControl} onClose={() => setShowCashControl(false)} 
            activeShift={activeShift} movements={movements} transactions={transactions} 
            onCashAction={handleCashAction} currency={settings.currency} 
        />
        {showTicket && <Ticket type={ticketType} data={ticketData} settings={settings} onClose={() => setShowTicket(false)} />}
        <OnboardingTour isOpen={showOnboarding} onComplete={() => setShowOnboarding(false)} />
        {isProductModalOpen && currentProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="font-black text-xl text-slate-800">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            {view === ViewState.SUPER_ADMIN && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md mt-1 inline-block">MODO PLANTILLA GLOBAL</span>}
                        </div>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">✕</button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Imágenes (Máx 2)</label>
                            <div className="flex gap-4">
                                {currentProduct.images?.map((img, i) => (
                                    <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 group">
                                        <img src={img} className="w-full h-full object-cover" />
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
                            
                            <div className="pt-2">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${currentProduct.hasVariants ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                                        {currentProduct.hasVariants && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.hasVariants || false} onChange={e => setCurrentProduct({...currentProduct, hasVariants: e.target.checked})} /> 
                                    <span className="font-bold text-slate-700">Este producto tiene variantes</span>
                                </label>
                            </div>
                            
                            {currentProduct.hasVariants && (
                                <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-4 text-sm">Gestionar Variantes</h4>
                                    <div className="flex gap-2 mb-4">
                                        <input className="flex-[2] p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Ej. Grande" value={variantName} onChange={e => setVariantName(e.target.value)}/>
                                        <input className="flex-1 p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Precio" type="number" value={variantPrice} onChange={e => setVariantPrice(e.target.value)}/>
                                        <input className="w-20 p-3 rounded-xl border border-slate-200 text-sm font-bold" placeholder="Stock" type="number" value={variantStock} onChange={e => setVariantStock(e.target.value)}/>
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
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg">
                                                        {v.stock} un. • ${v.price}
                                                    </div>
                                                    <button onClick={() => setCurrentProduct({...currentProduct, variants: currentProduct.variants?.filter((_,idx)=>idx!==i)})} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
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
    </>
  );
};

export default App;
