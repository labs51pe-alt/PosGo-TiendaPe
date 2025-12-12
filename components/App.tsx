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

    if (loggedInUser.id === 'test-user-demo') {
        StorageService.resetDemoData();
        setTimeout(() => setShowOnboarding(true), 500); 
    }

    setLoading(true);
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
      
      // === STOCK DEDUCTION LOGIC ===
      const newProducts = products.map(p => {
          let newStock = p.stock;
          let newVariants = p.variants ? [...p.variants] : [];
          
          // 1. Check if THIS product was in cart directly
          const cartItems = cart.filter(c => c.id === p.id);
          cartItems.forEach(c => {
              if (c.selectedVariantId && newVariants.length) {
                  newVariants = newVariants.map(v => v.id === c.selectedVariantId ? { ...v, stock: v.stock - c.quantity } : v);
              } else {
                  // Only deduct stock if it's NOT a pack (packs don't have real stock usually, or stock is calculated)
                  // BUT if user manages Pack Stock manually, we deduct it. 
                  // If it's a virtual pack, we shouldn't deduct it here, but logic below handles components.
                  // For simplicity: deduct manual stock if set.
                  newStock -= c.quantity;
              }
          });

          // 2. Check if THIS product is part of a PACK that was sold
          cart.forEach(cartItem => {
              if (cartItem.isPack && cartItem.packItems) {
                  const itemInPack = cartItem.packItems.find(pi => pi.productId === p.id);
                  if (itemInPack) {
                      // Deduct component stock: (Qty in Pack) * (Packs Sold)
                      newStock -= (itemInPack.quantity * cartItem.quantity);
                  }
              }
          });

          // Recalculate total stock for variant products
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

  // --- PRODUCT VARIANT & PACK HELPERS ---

  const handleSaveVariant = () => {
      if (!currentProduct) return;
      
      const newVar = { 
          id: editingVariantId || crypto.randomUUID(), 
          name: variantName, 
          price: parseFloat(variantPrice) || 0, 
          stock: parseFloat(variantStock) || 0 
      };

      let newVariants = [...(currentProduct.variants || [])];
      
      if (editingVariantId) {
          // Update existing
          newVariants = newVariants.map(v => v.id === editingVariantId ? newVar : v);
      } else {
          // Create new
          newVariants.push(newVar);
      }

      setCurrentProduct({ 
          ...currentProduct, 
          variants: newVariants, 
          stock: newVariants.reduce((s,v)=>s+v.stock,0) 
      });
      
      // Reset form
      setVariantName(''); 
      setVariantPrice(''); 
      setVariantStock('');
      setEditingVariantId(null);
  };

  const handleEditVariant = (v: any) => {
      setVariantName(v.name);
      setVariantPrice(v.price.toString());
      setVariantStock(v.stock.toString());
      setEditingVariantId(v.id);
  };

  const handleDeleteVariant = (id: string) => {
      if (!currentProduct) return;
      const newVariants = currentProduct.variants?.filter(v => v.id !== id) || [];
      setCurrentProduct({ 
          ...currentProduct, 
          variants: newVariants, 
          stock: newVariants.reduce((s,v)=>s+v.stock,0) 
      });
  };

  const handleAddPackItem = (productToAdd: Product) => {
      if (!currentProduct) return;
      const currentPackItems = currentProduct.packItems || [];
      
      // Check duplicate
      if (currentPackItems.find(i => i.productId === productToAdd.id)) return;

      const newItem: PackItem = {
          productId: productToAdd.id,
          productName: productToAdd.name,
          quantity: 1
      };

      setCurrentProduct({
          ...currentProduct,
          packItems: [...currentPackItems, newItem]
      });
      setPackSearchTerm('');
  };

  const handleRemovePackItem = (index: number) => {
      if (!currentProduct || !currentProduct.packItems) return;
      const newItems = [...currentProduct.packItems];
      newItems.splice(index, 1);
      setCurrentProduct({ ...currentProduct, packItems: newItems });
  };

  const handleUpdatePackItemQty = (index: number, newQty: number) => {
      if (!currentProduct || !currentProduct.packItems) return;
      const newItems = [...currentProduct.packItems];
      newItems[index].quantity = Math.max(1, newQty);
      setCurrentProduct({ ...currentProduct, packItems: newItems });
  };

  // --- SAVE PRODUCT ---

  const handleSaveProduct = async () => {
      if (!currentProduct?.name) return;
      let pToSave = { ...currentProduct };
      
      // Logic cleanup
      if (pToSave.isPack) {
          pToSave.hasVariants = false;
          pToSave.variants = [];
          // Pack stock is theoretically unlimited or calculated, but let's set it to 999 for POS visibility if not manual
          if (pToSave.stock === 0) pToSave.stock = 100; 
      } else if (pToSave.hasVariants && pToSave.variants) {
          pToSave.stock = pToSave.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
          pToSave.packItems = [];
      } else {
          pToSave.packItems = [];
          pToSave.variants = [];
      }
      
      if(!pToSave.id) pToSave.id = crypto.randomUUID();

      if (view === ViewState.SUPER_ADMIN) {
          const demoProducts = StorageService.getDemoProducts();
          const index = demoProducts.findIndex(p => p.id === pToSave.id);
          let updated;
          if (index >= 0) updated = demoProducts.map(p => p.id === pToSave.id ? pToSave : p);
          else updated = [...demoProducts, pToSave];
          
          StorageService.saveDemoProducts(updated);
          setView(ViewState.POS);
          setTimeout(() => setView(ViewState.SUPER_ADMIN), 10);
      } else {
          let updated; 
          if (products.find(p => p.id === pToSave.id)) updated = products.map(p => p.id === pToSave.id ? pToSave : p); 
          else updated = [...products, pToSave];

          setProducts(updated); 
          await StorageService.saveProductWithImages(pToSave);
      }
      
      setIsProductModalOpen(false);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && currentProduct) {
          if (file.size > 500000) { 
              alert("La imagen es muy grande. Máximo 500KB.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              const currentImages = currentProduct.images || [];
              if (currentImages.length >= 2) return;
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

  // Filter products for Pack Search
  const productsForPack = useMemo(() => {
      if (!packSearchTerm || !isProductModalOpen) return [];
      return products.filter(p => 
          !p.isPack && // Prevent pack inside pack
          p.id !== currentProduct?.id && // Prevent self
          (p.name.toLowerCase().includes(packSearchTerm.toLowerCase()) || 
           p.barcode?.includes(packSearchTerm))
      ).slice(0, 5);
  }, [products, packSearchTerm, currentProduct, isProductModalOpen]);

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
                        setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], images: [], isPack: false, packItems: [] }); 
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
                            images: [],
                            isPack: false,
                            packItems: []
                        });
                        setIsProductModalOpen(true);
                    }}
                    initialSearchTerm={initialPurchaseSearch}
                    onClearInitialSearch={() => setInitialPurchaseSearch('')}
                />
            )}

            {view === ViewState.ADMIN && (
                <AdminView transactions={transactions} products={products} shifts={shifts} movements={movements} />
            )}

            {view === ViewState.REPORTS && (
                <ReportsView transactions={transactions} settings={settings} />
            )}

            {view === ViewState.SETTINGS && (
                <SettingsView settings={settings} onSaveSettings={handleUpdateSettings} />
            )}

            {view === ViewState.SUPER_ADMIN && (
                <SuperAdminView 
                    onNewProduct={() => { 
                        setCurrentProduct({ id: '', name: '', price: 0, category: CATEGORIES[0], stock: 0, variants: [], images: [], isPack: false, packItems: [] }); 
                        setIsProductModalOpen(true); 
                    }} 
                    onEditProduct={(p) => { 
                        setCurrentProduct(p); 
                        setIsProductModalOpen(true); 
                    }} 
                />
            )}
        </Layout>

        {/* --- MODALS --- */}
        <OnboardingTour isOpen={showOnboarding} onComplete={() => setShowOnboarding(false)} />
        <CashControlModal isOpen={showCashControl} onClose={() => setShowCashControl(false)} activeShift={activeShift} movements={movements} transactions={transactions} onCashAction={handleCashAction} currency={settings.currency} />
        {showTicket && <Ticket type={ticketType} data={ticketData} settings={settings} onClose={() => setShowTicket(false)} />}
        
        {isProductModalOpen && currentProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-black text-xl text-slate-800">{currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <button onClick={() => setIsProductModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">✕</button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar">
                        <div className="space-y-5">
                            
                            {/* IMAGES SECTION */}
                            <div className="flex gap-4 mb-2">
                                {currentProduct.images?.map((img, idx) => (
                                    <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 group">
                                        <img src={img} alt="Product" className="w-full h-full object-cover" />
                                        <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
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

                            {/* CORE INFO */}
                            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre</label><input className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold text-lg outline-none" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct!, name: e.target.value})} placeholder="Ej. Coca Cola 600ml"/></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Código de Barras</label><input className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.barcode || ''} onChange={e => setCurrentProduct({...currentProduct!, barcode: e.target.value})} placeholder="Escanear o escribir..." autoFocus={!currentProduct.id}/></div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Precio Venta</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.price || ''} onChange={e => setCurrentProduct({...currentProduct!, price: parseFloat(e.target.value)})} placeholder="0.00"/></div>
                                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stock (Base)</label><input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none disabled:opacity-50" value={currentProduct.stock || ''} onChange={e => setCurrentProduct({...currentProduct!, stock: parseFloat(e.target.value)})} placeholder="0" disabled={currentProduct.hasVariants || currentProduct.isPack}/></div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoría</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-2xl font-bold outline-none" value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct!, category: e.target.value})}>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            {/* ADVANCED TYPES TOGGLES */}
                            <div className="flex gap-4 pt-2">
                                <label className={`flex-1 flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-colors ${currentProduct.hasVariants ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${currentProduct.hasVariants ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>{currentProduct.hasVariants && <Check className="w-3 h-3 text-white"/>}</div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.hasVariants || false} onChange={e => setCurrentProduct({...currentProduct!, hasVariants: e.target.checked, isPack: false})} /> 
                                    <span className={`font-bold text-sm ${currentProduct.hasVariants ? 'text-purple-700' : 'text-slate-600'}`}>Tiene Variantes</span>
                                </label>

                                <label className={`flex-1 flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-colors ${currentProduct.isPack ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${currentProduct.isPack ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>{currentProduct.isPack && <Check className="w-3 h-3 text-white"/>}</div>
                                    <input type="checkbox" className="hidden" checked={currentProduct.isPack || false} onChange={e => setCurrentProduct({...currentProduct!, isPack: e.target.checked, hasVariants: false})} /> 
                                    <span className={`font-bold text-sm ${currentProduct.isPack ? 'text-amber-700' : 'text-slate-600'}`}>Es Pack / Combo</span>
                                </label>
                            </div>
                            
                            {/* --- VARIANT MANAGER --- */}
                            {currentProduct.hasVariants && (
                                <div className="bg-purple-50 p-6 rounded-[1.5rem] border border-purple-100">
                                    <h4 className="font-bold text-purple-800 mb-4 text-sm flex items-center gap-2"><Edit2 className="w-4 h-4"/> Gestionar Variantes</h4>
                                    <div className="flex gap-2 mb-4">
                                        <input className="flex-[2] p-3 rounded-xl border border-purple-200 text-sm font-bold focus:outline-none focus:border-purple-400" placeholder="Ej. Grande" value={variantName} onChange={e => setVariantName(e.target.value)}/>
                                        <input className="flex-1 p-3 rounded-xl border border-purple-200 text-sm font-bold focus:outline-none focus:border-purple-400" placeholder="Precio" type="number" value={variantPrice} onChange={e => setVariantPrice(e.target.value)}/>
                                        <input className="w-20 p-3 rounded-xl border border-purple-200 text-sm font-bold focus:outline-none focus:border-purple-400" placeholder="Cant." type="number" value={variantStock} onChange={e => setVariantStock(e.target.value)}/>
                                        <button onClick={handleSaveVariant} className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">
                                            {editingVariantId ? <Save className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {currentProduct.variants?.map((v, i) => (
                                            <div key={i} className={`flex justify-between items-center p-3 bg-white rounded-xl border shadow-sm ${editingVariantId === v.id ? 'border-purple-400 ring-1 ring-purple-400' : 'border-slate-100'}`}>
                                                <span className="font-bold text-slate-700 text-sm">{v.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg">{v.stock} un. • ${v.price}</span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleEditVariant(v)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Edit2 className="w-3 h-3"/></button>
                                                        <button onClick={() => handleDeleteVariant(v.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3 h-3"/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!currentProduct.variants || currentProduct.variants.length === 0) && <p className="text-center text-xs text-purple-400 py-2">Agrega variantes arriba</p>}
                                    </div>
                                </div>
                            )}

                            {/* --- PACK MANAGER --- */}
                            {currentProduct.isPack && (
                                <div className="bg-amber-50 p-6 rounded-[1.5rem] border border-amber-100 relative">
                                    <h4 className="font-bold text-amber-800 mb-4 text-sm flex items-center gap-2"><Package className="w-4 h-4"/> Contenido del Pack</h4>
                                    
                                    {/* Product Search for Pack */}
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 w-4 h-4"/>
                                        <input 
                                            className="w-full pl-9 pr-3 py-3 rounded-xl border border-amber-200 text-sm font-bold focus:outline-none focus:border-amber-400 bg-white" 
                                            placeholder="Buscar productos para agregar..." 
                                            value={packSearchTerm}
                                            onChange={e => setPackSearchTerm(e.target.value)}
                                        />
                                        {packSearchTerm && productsForPack.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white border border-amber-100 rounded-xl shadow-xl z-20 mt-1 overflow-hidden">
                                                {productsForPack.map(p => (
                                                    <button key={p.id} onClick={() => handleAddPackItem(p)} className="w-full text-left p-3 hover:bg-amber-50 flex justify-between items-center text-sm border-b border-amber-50 last:border-0">
                                                        <span className="font-bold text-slate-700">{p.name}</span>
                                                        <span className="text-xs text-amber-600 font-bold">+ Agregar</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pack Items List */}
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {currentProduct.packItems?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-amber-100 shadow-sm">
                                                <span className="font-bold text-slate-700 text-sm truncate flex-1">{item.productName}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center bg-amber-50 rounded-lg">
                                                        <input 
                                                            type="number" 
                                                            className="w-12 p-1 text-center bg-transparent text-sm font-bold outline-none" 
                                                            value={item.quantity}
                                                            onChange={e => handleUpdatePackItemQty(idx, parseInt(e.target.value))}
                                                        />
                                                        <span className="pr-2 text-[10px] text-amber-400 font-bold">UN</span>
                                                    </div>
                                                    <button onClick={() => handleRemovePackItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!currentProduct.packItems || currentProduct.packItems.length === 0) && <p className="text-center text-xs text-amber-400 py-2">Busca productos para armar el pack</p>}
                                    </div>
                                    <p className="text-[10px] text-amber-600/70 mt-3 italic">* Al vender este pack, se descontará el stock de los productos individuales.</p>
                                </div>
                            )}

                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                        <button onClick={() => setIsProductModalOpen(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleSaveProduct} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all">Guardar Producto</button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default App;