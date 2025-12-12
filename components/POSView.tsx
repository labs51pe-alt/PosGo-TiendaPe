import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, ProductVariant, CartItem, Transaction } from '../types';
import { CATEGORIES } from '../constants';
import { Cart } from './Cart';
import { Lock, Wallet, LayoutGrid, List, ScanBarcode, Search, Layers, ShoppingBasket, Plus, AlertCircle, X, Tag, Check, Package, TrendingUp, Sparkles, Filter, Keyboard, ChevronUp } from 'lucide-react';

export const POSView = ({ products, cart, transactions = [], onAddToCart, onUpdateCart, onRemoveFromCart, onUpdateDiscount, onCheckout, onClearCart, settings, customers, activeShift, onOpenCashControl }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [posBarcodeBuffer, setPosBarcodeBuffer] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  
  // Mobile Cart State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  // Variant Selection State
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);

  // Soft Pastel Gradients for Avatars
  const getProductGradient = (name: string) => {
      const gradients = [
          'from-indigo-200 to-violet-300 text-indigo-700',
          'from-emerald-200 to-teal-300 text-emerald-700',
          'from-rose-200 to-pink-300 text-rose-700',
          'from-amber-200 to-orange-300 text-amber-800',
          'from-blue-200 to-sky-300 text-blue-700',
          'from-fuchsia-200 to-purple-300 text-fuchsia-700'
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
          hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % gradients.length;
      return gradients[index];
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = target.closest('input') || target.closest('button') || target.closest('select') || target.closest('textarea') || target.closest('#pos-cart');
        // Only autofocus on desktop
        if (window.innerWidth > 1024 && !isInteractive && activeShift && barcodeRef.current) barcodeRef.current.focus();
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeShift]);

  // Initial focus on desktop
  useEffect(() => { 
      if (activeShift && barcodeRef.current && window.innerWidth > 1024) barcodeRef.current.focus(); 
  }, [activeShift]);

  // Calculate Shift Sales Live
  const shiftTotal = useMemo(() => {
    if (!activeShift) return 0;
    const shiftTransactions = transactions.filter((t: Transaction) => t.shiftId === activeShift.id);
    return shiftTransactions.reduce((sum: number, t: Transaction) => sum + t.total, 0);
  }, [transactions, activeShift]);

  // Cart Totals for Floating Bar
  const cartTotalAmount = cart.reduce((sum:number, item:CartItem) => sum + (item.price * item.quantity), 0);
  const cartTotalItems = cart.reduce((sum:number, item:CartItem) => sum + item.quantity, 0);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handlePosScanner = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          const scannedCode = posBarcodeBuffer.trim();
          if (scannedCode) {
              const product = products.find((p: Product) => p.barcode && p.barcode.toLowerCase() === scannedCode.toLowerCase());
              if (product) { 
                  handleProductClick(product);
                  setPosBarcodeBuffer(''); 
              } else { 
                  alert('Producto no encontrado'); 
                  setPosBarcodeBuffer(''); 
              }
          }
      }
  };

  const handleProductClick = (product: Product) => {
      if (product.stock <= 0 && !product.hasVariants) return; 
      if (product.hasVariants) {
          setSelectedProductForVariant(product);
          setIsVariantModalOpen(true);
      } else {
          onAddToCart(product);
      }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
      if (!selectedProductForVariant) return;
      if (variant.stock <= 0) return;
      onAddToCart(selectedProductForVariant, variant.id);
      setIsVariantModalOpen(false);
      setSelectedProductForVariant(null);
  };

  const getCartQuantity = (productId: string) => {
      return cart.filter((c: CartItem) => c.id === productId).reduce((sum: number, c: CartItem) => sum + c.quantity, 0);
  };

  if (!activeShift) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center animate-fade-in relative overflow-hidden bg-slate-50/50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl shadow-indigo-100/40 border border-white max-w-sm w-full relative z-10">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6 shadow-sm">
                    <Lock className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Turno Finalizado</h2>
                <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed px-4">
                    La caja se encuentra cerrada. Inicia un nuevo turno para facturar.
                </p>
                <button onClick={() => onOpenCashControl('OPEN')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-base shadow-lg shadow-slate-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <Wallet className="w-5 h-5"/><span>Abrir Turno</span>
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#f8fafc] relative">
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            
            {/* === LIVE HEADER === */}
            <div className="bg-white/60 backdrop-blur-lg border-b border-white/50 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-4 md:gap-6">
                    {/* Status Pill */}
                    <div className="flex items-center gap-2 md:gap-3 bg-emerald-50/80 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl border border-emerald-100/50 backdrop-blur-sm">
                        <div className="relative flex h-2.5 w-2.5 md:h-3 md:w-3 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase leading-none mb-0.5">Caja Abierta</p>
                            <p className="text-xs font-medium text-emerald-700/70">#{activeShift.id.slice(-4)}</p>
                        </div>
                    </div>
                    {/* Sales Counter (Desktop) */}
                    <div className="hidden md:block">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ventas Hoy</p>
                         <p className="text-xl font-black text-slate-800 leading-none">{settings.currency}{shiftTotal.toFixed(2)}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                     <button 
                        id="pos-cash-control"
                        onClick={() => onOpenCashControl('IN')} 
                        className="px-4 py-2 bg-white border border-slate-200/60 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                     >
                        <Wallet className="w-4 h-4 text-slate-400"/> <span className="hidden sm:inline">Caja</span>
                    </button>
                </div>
            </div>

            {/* === CONTENT === */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-32 md:pb-6">
                
                {/* TOOLBAR */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                    <div className="flex gap-2 w-full md:w-auto">
                        {/* View Toggles */}
                        <div id="pos-view-toggles" className="flex gap-1 bg-white p-1 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 h-[50px] items-center shrink-0">
                            <button onClick={() => setViewMode('GRID')} className={`h-full aspect-square flex items-center justify-center rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-5 h-5"/></button>
                            <button onClick={() => setViewMode('LIST')} className={`h-full aspect-square flex items-center justify-center rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><List className="w-5 h-5"/></button>
                        </div>
                        {/* Search Input */}
                        <div className="flex-1 relative h-[50px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                className="w-full h-full pl-10 pr-4 bg-white border border-slate-200/60 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all font-bold text-sm text-slate-700" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Scanner Input (Hidden on mobile usually or less prominent) */}
                    <div id="pos-scanner-section" className="hidden md:block relative group flex-1">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <ScanBarcode className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input 
                            ref={barcodeRef} 
                            type="text" 
                            placeholder="Escanear código..." 
                            className="w-full h-[50px] pl-14 pr-4 bg-white border border-slate-200/60 rounded-2xl focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 outline-none font-bold text-lg text-slate-700 transition-all placeholder-slate-300 shadow-[0_4px_20px_rgb(0,0,0,0.02)]" 
                            value={posBarcodeBuffer} 
                            onChange={(e) => setPosBarcodeBuffer(e.target.value)} 
                            onKeyDown={handlePosScanner} 
                        />
                    </div>
                </div>

                {/* CATEGORIES */}
                <div className="flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar items-center mb-6 pb-2">
                    <button onClick={() => setSelectedCategory('Todos')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === 'Todos' ? 'bg-slate-800 border-slate-800 text-white shadow-lg shadow-slate-200' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>Todos</button>
                    {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>{cat}</button>
                    ))}
                </div>

                {/* PRODUCTS AREA */}
                <div id="pos-products-grid" className="min-h-[400px]">
                    {viewMode === 'GRID' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 pb-20">
                            {filteredProducts.map((p: Product, idx: number) => {
                                const isOutOfStock = p.stock <= 0 && !p.hasVariants;
                                const isLowStock = p.stock <= 5 && !isOutOfStock;
                                const inCartQty = getCartQuantity(p.id);
                                const gradientClass = getProductGradient(p.name);
                                const hasImage = p.images && p.images.length > 0;
                                
                                return (
                                    <div 
                                        key={p.id} 
                                        onClick={() => handleProductClick(p)} 
                                        className={`
                                            bg-white p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300 relative flex flex-col justify-between h-[200px] md:h-[250px] animate-fade-in-up
                                            ${isOutOfStock 
                                                ? 'opacity-60 grayscale cursor-not-allowed border border-slate-100 bg-slate-50/50' 
                                                : `cursor-pointer active:scale-95 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,0,0,0.06)]
                                                ${inCartQty > 0 ? 'ring-2 ring-indigo-400 shadow-[0_4px_20px_rgba(99,102,241,0.15)]' : 'border border-transparent shadow-[0_4px_20px_rgb(0,0,0,0.03)]'}`}
                                        `}
                                        style={{animationDelay: `${idx * 40}ms`}}
                                    >
                                        <div className="flex justify-between items-start z-10 relative">
                                            {isOutOfStock ? (
                                                <div className="bg-slate-100 px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wide">Agotado</div>
                                            ) : (
                                                <div className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 ${isLowStock ? 'bg-rose-50 text-rose-500 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {p.stock}
                                                </div>
                                            )}
                                            {inCartQty > 0 && (
                                                <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-black shadow-sm flex items-center gap-1">
                                                    <ShoppingBasket className="w-3 h-3"/> {inCartQty}
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute inset-0 flex items-center justify-center p-4">
                                            {hasImage ? (
                                                <img 
                                                    src={p.images![0]} 
                                                    alt={p.name} 
                                                    className={`w-full h-full object-cover rounded-2xl transition-transform duration-500 ${!isOutOfStock && 'group-hover:scale-110'}`}
                                                />
                                            ) : (
                                                <div className={`w-full h-full rounded-2xl flex items-center justify-center text-xl md:text-3xl font-black bg-gradient-to-br shadow-inner ${gradientClass} transition-transform duration-500 ${!isOutOfStock && 'group-hover:scale-110 group-hover:rotate-3'}`}>
                                                    {p.name.substring(0,2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative z-10 bg-white/80 backdrop-blur-md p-2 md:p-3 rounded-xl -mx-1 -mb-1 md:-mx-2 md:-mb-2 border border-white/50 shadow-sm">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 truncate">{p.category}</p>
                                            <h3 className="font-bold text-slate-800 leading-tight mb-1 truncate text-xs md:text-sm">{p.name}</h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm md:text-lg font-black text-slate-800">{settings.currency}{p.price.toFixed(2)}</span>
                                                {!isOutOfStock && (
                                                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all ${inCartQty > 0 ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-slate-400'}`}>
                                                        <Plus className="w-3 h-3 md:w-4 md:h-4"/>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                             <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 border-b border-slate-100 sticky top-0">
                                    <tr>
                                        <th className="p-4 md:p-5 pl-6 md:pl-8">Producto</th>
                                        <th className="p-4 md:p-5 hidden md:table-cell">Stock</th>
                                        <th className="p-4 md:p-5 text-right">Precio</th>
                                        <th className="p-4 md:p-5 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredProducts.map((p: Product) => {
                                        const isOutOfStock = p.stock <= 0 && !p.hasVariants;
                                        const inCartQty = getCartQuantity(p.id);
                                        const gradientClass = getProductGradient(p.name);
                                        const hasImage = p.images && p.images.length > 0;

                                        return (
                                            <tr key={p.id} className={`transition-colors ${isOutOfStock ? 'opacity-50 grayscale bg-slate-50' : 'hover:bg-indigo-50/30 cursor-pointer active:bg-indigo-50'}`} onClick={() => !isOutOfStock && handleProductClick(p)}>
                                                <td className="p-4 md:p-5 pl-6 md:pl-8">
                                                    <div className="flex items-center gap-3">
                                                        {hasImage ? (
                                                            <img src={p.images![0]} alt={p.name} className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover border border-slate-100"/>
                                                        ) : (
                                                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-[10px] md:text-xs ${gradientClass}`}>{p.name.substring(0,2).toUpperCase()}</div>
                                                        )}
                                                        <div>
                                                            <div className={`font-bold text-sm ${inCartQty > 0 ? 'text-indigo-700' : 'text-slate-800'}`}>{p.name}</div>
                                                            <div className="text-xs text-slate-400 font-medium">{p.stock} un.</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 md:p-5 hidden md:table-cell">
                                                     <span className={`text-[10px] px-3 py-1 rounded-full font-black border ${p.stock <= 5 ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>{p.stock}</span>
                                                </td>
                                                <td className="p-4 md:p-5 text-right font-black text-slate-700">{settings.currency}{p.price.toFixed(2)}</td>
                                                <td className="p-4 md:p-5 text-right">
                                                    {!isOutOfStock && (
                                                        <button className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${inCartQty > 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                                            {inCartQty > 0 ? <Check className="w-4 h-4"/> : <Plus className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* === MOBILE FLOATING CART BAR === */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-[80px] left-0 w-full px-4 z-40 animate-fade-in-up">
                    <div className="absolute inset-0 top-4 bg-gradient-to-t from-white/90 to-transparent pointer-events-none -z-10 h-20"></div>
                    <button 
                        onClick={() => setIsMobileCartOpen(true)}
                        className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-500 w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg shadow-indigo-900/50">
                                {cartTotalItems}
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ver Canasta</p>
                                <p className="text-sm text-slate-300 font-medium">Click para pagar</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-xl font-black">{settings.currency}{cartTotalAmount.toFixed(2)}</span>
                             <ChevronUp className="w-5 h-5"/>
                        </div>
                    </button>
                </div>
            )}
            
            {/* === MOBILE CART DRAWER (Slide Up) === */}
            {isMobileCartOpen && (
                <div className="fixed inset-0 z-[60] lg:hidden flex flex-col">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileCartOpen(false)}></div>
                    <div className="relative mt-auto h-[85vh] bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col animate-fade-in-up overflow-hidden">
                        <Cart 
                            items={cart} 
                            onUpdateQuantity={onUpdateCart} 
                            onRemoveItem={onRemoveFromCart} 
                            onUpdateDiscount={onUpdateDiscount} 
                            onCheckout={(method, payments) => { onCheckout(method, payments); setIsMobileCartOpen(false); }} 
                            onClearCart={onClearCart} 
                            settings={settings} 
                            customers={customers} 
                            onClose={() => setIsMobileCartOpen(false)}
                        />
                    </div>
                </div>
            )}
            
             {/* VARIANT MODAL */}
             {isVariantModalOpen && selectedProductForVariant && (
                <div className="absolute inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-white">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-xl text-slate-800">Variantes</h3>
                                <p className="text-sm font-medium text-slate-400 mt-1">{selectedProductForVariant.name}</p>
                            </div>
                            <button onClick={() => setIsVariantModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-sm text-slate-400"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 grid gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {selectedProductForVariant.variants?.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => handleVariantSelect(v)}
                                    disabled={v.stock <= 0}
                                    className={`p-5 rounded-[1.5rem] border text-left transition-all relative overflow-hidden group 
                                    ${v.stock <= 0 ? 'opacity-50 bg-slate-50 cursor-not-allowed border-slate-100' : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-md active:scale-95'}`}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <div>
                                            <span className="font-bold text-slate-800 text-lg">{v.name}</span>
                                            <p className="text-indigo-600 font-black">{settings.currency}{v.price.toFixed(2)}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-black ${v.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                            {v.stock > 0 ? `${v.stock} UN` : '0'}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {/* DESKTOP CART SIDEBAR */}
        <div id="pos-cart" className="w-[400px] bg-white border-l border-slate-100 shadow-2xl shadow-indigo-100 z-20 hidden lg:block">
            <Cart items={cart} onUpdateQuantity={onUpdateCart} onRemoveItem={onRemoveFromCart} onUpdateDiscount={onUpdateDiscount} onCheckout={onCheckout} onClearCart={onClearCart} settings={settings} customers={customers} />
        </div>
    </div>
  );
};