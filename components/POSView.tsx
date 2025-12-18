
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, ProductVariant, CartItem, Transaction, StoreSettings, Customer } from '../types';
import { CATEGORIES } from '../constants';
import { Cart } from './Cart';
import { Lock, Wallet, LayoutGrid, List, ScanBarcode, Search, Layers, ShoppingBasket, Plus, AlertCircle, X, Tag, Check, Package, TrendingUp, Sparkles, Filter, Keyboard, ChevronRight, ShoppingBag, Box, Zap } from 'lucide-react';

interface POSViewProps {
  products: Product[];
  cart: CartItem[];
  transactions: Transaction[];
  activeShift: any;
  settings: StoreSettings;
  customers: Customer[];
  onAddToCart: (product: Product, variantId?: string) => void;
  onUpdateCart: (id: string, delta: number, variantId?: string) => void;
  onRemoveItem: (id: string, variantId?: string) => void;
  onUpdateDiscount: (id: string, discount: number, variantId?: string) => void;
  onCheckout: (method: string, payments: any[]) => void;
  onClearCart: () => void;
  onOpenCashControl: () => void;
}

export const POSView: React.FC<POSViewProps> = ({ 
  products, cart, transactions = [], onAddToCart, onUpdateCart, 
  onRemoveItem, onUpdateDiscount, onCheckout, onClearCart, 
  settings, customers, activeShift, onOpenCashControl 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  
  // Modales de variantes
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);

  // Gradientes dinámicos para productos sin imagen
  const getProductGradient = (name: string) => {
      const gradients = [
        'from-indigo-500 to-indigo-600 text-white', 
        'from-emerald-400 to-emerald-600 text-white', 
        'from-amber-400 to-amber-600 text-white',
        'from-rose-400 to-rose-600 text-white',
        'from-violet-500 to-purple-600 text-white'
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return gradients[Math.abs(hash) % gradients.length];
  };

  const shiftTotal = useMemo(() => {
    if (!activeShift) return 0;
    const shiftTransactions = transactions.filter((t: Transaction) => t.shiftId === activeShift.id);
    return shiftTransactions.reduce((sum: number, t: Transaction) => sum + t.total, 0);
  }, [transactions, activeShift]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleProductAction = (product: Product) => {
      if (product.hasVariants && product.variants && product.variants.length > 0) {
          setSelectedProductForVariant(product);
          setVariantModalOpen(true);
      } else {
          onAddToCart(product);
      }
  };

  if (!activeShift) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-[#f8fafc]">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 max-w-md w-full animate-fade-in-up">
                <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200">
                    <Lock className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Panel Bloqueado</h2>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">Para comenzar a facturar, necesitas realizar la apertura de caja y asignar un fondo inicial.</p>
                <button onClick={onOpenCashControl} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 active:scale-95">
                    <Zap className="w-6 h-6 fill-current"/>
                    <span>Abrir Caja Ahora</span>
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#f8fafc]">
        {/* Lado Izquierdo: Catálogo y Búsqueda */}
        <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Header POS Premium */}
            <div className="bg-white border-b border-slate-200/60 px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-6 w-full sm:w-auto">
                    <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Turno Activo</p>
                            <p className="text-sm font-bold text-slate-700 font-mono">ID: {activeShift.id.slice(-6).toUpperCase()}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider leading-none mb-1">Ventas de Hoy</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{settings.currency}{shiftTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                        <button onClick={() => setViewMode('GRID')} title="Vista Cuadrícula" className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4"/></button>
                        <button onClick={() => setViewMode('LIST')} title="Vista Lista" className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow-md text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}><List className="w-4 h-4"/></button>
                    </div>
                    <button onClick={onOpenCashControl} className="flex-1 sm:flex-none px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                        <Wallet className="w-4 h-4"/> Gestión de Caja
                    </button>
                </div>
            </div>

            {/* Buscador y Chips de Categoría */}
            <div className="px-8 pt-6 pb-2 shrink-0">
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="flex-1 relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                            <Search className="w-5 h-5"/>
                        </div>
                        <input 
                            ref={barcodeRef}
                            type="text" 
                            placeholder="Buscar producto por nombre o código..." 
                            className="w-full pl-14 pr-16 py-4.5 bg-white border-2 border-slate-100 rounded-[1.8rem] focus:border-indigo-400 focus:ring-8 focus:ring-indigo-50 outline-none font-bold text-slate-700 transition-all shadow-xl shadow-slate-100/50 text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-3">
                             <span className="hidden sm:block text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">F1</span>
                             <ScanBarcode className="w-6 h-6 text-slate-300"/>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar lg:max-w-[45%] no-scrollbar">
                        <button 
                            onClick={() => setSelectedCategory('Todos')}
                            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border-2 ${selectedCategory === 'Todos' ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200 hover:text-indigo-500'}`}
                        >
                            Todos
                        </button>
                        {CATEGORIES.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border-2 ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200 hover:text-indigo-500'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Catálogo de Productos */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-10">
                {filteredProducts.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center text-slate-300 animate-fade-in">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <ShoppingBasket className="w-12 h-12 opacity-30"/>
                        </div>
                        <p className="font-black text-lg text-slate-400">No hay productos que coincidan</p>
                        <p className="text-sm font-medium">Prueba con otra búsqueda o categoría</p>
                    </div>
                ) : (
                    <div className={`grid gap-5 ${viewMode === 'GRID' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-1'}`}>
                        {filteredProducts.map((p) => (
                            <div 
                                key={p.id} 
                                onClick={() => handleProductAction(p)}
                                className={`
                                    bg-white transition-all cursor-pointer relative flex group border-2 border-transparent
                                    ${p.stock <= 0 && !p.hasVariants ? 'opacity-60 grayscale' : ''}
                                    ${viewMode === 'LIST' 
                                        ? 'flex-row items-center gap-5 p-3 rounded-[1.5rem] hover:bg-indigo-50/40 hover:border-indigo-100 active:scale-[0.98]' 
                                        : 'flex-col h-[300px] p-5 rounded-[2.5rem] hover:border-indigo-200 hover:shadow-[0_25px_60px_-15px_rgba(99,102,241,0.15)] hover:-translate-y-2 active:scale-95'
                                    }
                                `}
                            >
                                {/* Stock Label */}
                                <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black z-10 border shadow-sm transition-transform group-hover:scale-105 
                                    ${p.stock <= 5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
                                    ${viewMode === 'LIST' ? 'order-3' : 'absolute top-4 right-4'}
                                `}>
                                    <span className="flex items-center gap-1">
                                        <Box className="w-3 h-3"/>
                                        {p.stock} <span className="hidden md:inline">un.</span>
                                    </span>
                                </div>

                                {/* Product Image Container */}
                                <div className={`relative shrink-0 flex items-center justify-center overflow-hidden transition-all bg-slate-50 
                                    ${viewMode === 'LIST' 
                                        ? 'w-12 h-12 rounded-xl' 
                                        : 'flex-1 mb-5 rounded-[2rem] group-hover:bg-white'
                                    }
                                `}>
                                    {p.images?.[0] ? (
                                        <img src={p.images[0]} className="w-full h-full object-contain p-2 transition-transform group-hover:scale-110" alt={p.name}/>
                                    ) : (
                                        <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${getProductGradient(p.name)}`}>
                                            <span className={`${viewMode === 'LIST' ? 'text-lg' : 'text-4xl'} font-black tracking-tighter opacity-90 group-hover:scale-110 transition-transform`}>
                                                {p.name.substring(0, 2).toUpperCase()}
                                            </span>
                                            {p.hasVariants && viewMode !== 'LIST' && <Layers className="w-5 h-5 absolute bottom-3 right-3 opacity-50"/>}
                                        </div>
                                    )}
                                    {p.isPack && viewMode !== 'LIST' && (
                                        <div className="absolute bottom-0 left-0 w-full py-1 bg-amber-500/90 text-white text-[9px] font-black text-center uppercase tracking-widest">
                                            COMBO PACK
                                        </div>
                                    )}
                                </div>

                                {/* Information Area */}
                                <div className={`flex flex-col min-w-0 ${viewMode === 'LIST' ? 'flex-1' : ''}`}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">{p.category}</span>
                                        {p.barcode && viewMode !== 'LIST' && <span className="text-[9px] font-mono text-slate-300">#{p.barcode.slice(-4)}</span>}
                                        {p.isPack && viewMode === 'LIST' && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">PACK</span>}
                                    </div>
                                    
                                    <h3 className={`font-black text-slate-800 leading-tight truncate group-hover:text-indigo-600 transition-colors 
                                        ${viewMode === 'LIST' ? 'text-sm mb-0' : 'text-sm mb-3 line-clamp-2 min-h-[2.5rem]'}
                                    `}>
                                        {p.name}
                                    </h3>
                                    
                                    {viewMode !== 'LIST' && (
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex flex-col">
                                                <p className="text-[10px] font-bold text-slate-400 leading-none mb-1">Precio</p>
                                                <p className="text-2xl font-black text-slate-900 leading-none">{settings.currency}{p.price.toFixed(2)}</p>
                                            </div>
                                            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200 group-hover:bg-indigo-600 group-hover:shadow-indigo-200 group-hover:rotate-12 transition-all active:scale-90">
                                                <Plus className="w-6 h-6 stroke-[3px]"/>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* LIST MODE SPECIFIC PRICE & BUTTON */}
                                {viewMode === 'LIST' && (
                                    <>
                                        <div className="flex flex-col items-end mr-2 order-4 w-24">
                                            <p className="text-sm font-black text-slate-900">{settings.currency}{p.price.toFixed(2)}</p>
                                            {p.hasVariants && <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">Con Variantes</p>}
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center transition-all group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-md order-5 active:scale-90">
                                            <Plus className="w-5 h-5 stroke-[2.5px]"/>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Lado Derecho: Canasta Profesional */}
        <div id="pos-cart" className="w-[420px] bg-white border-l border-slate-100 shadow-[0_0_50px_-12px_rgba(0,0,0,0.05)] hidden lg:block animate-fade-in relative z-20">
            <Cart 
                items={cart} 
                onUpdateQuantity={onUpdateCart} 
                onRemoveItem={onRemoveItem} 
                onUpdateDiscount={onUpdateDiscount} 
                onCheckout={onCheckout} 
                onClearCart={onClearCart} 
                settings={settings} 
                customers={customers} 
            />
        </div>

        {/* Modal Premium para Variantes */}
        {variantModalOpen && selectedProductForVariant && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl animate-fade-in-up border border-slate-100 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8">
                         <button onClick={() => setVariantModalOpen(false)} className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center group">
                            <X className="w-6 h-6 group-hover:rotate-90 transition-transform"/>
                        </button>
                    </div>

                    <div className="mb-10 text-center sm:text-left">
                        <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
                            <Sparkles className="w-5 h-5 text-indigo-500 fill-current"/>
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Opciones Disponibles</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 leading-tight">{selectedProductForVariant.name}</h3>
                        <p className="text-slate-400 font-medium mt-1">Selecciona la medida, talla o color deseado</p>
                    </div>

                    <div className="space-y-4 max-h-[45vh] overflow-y-auto custom-scrollbar pr-3">
                        {selectedProductForVariant.variants?.map((v) => (
                            <button 
                                key={v.id}
                                onClick={() => {
                                    onAddToCart(selectedProductForVariant, v.id);
                                    setVariantModalOpen(false);
                                }}
                                className={`w-full group relative flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${v.stock <= 0 ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-100'}`}
                                disabled={v.stock <= 0}
                            >
                                <div className="text-left flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-colors ${v.stock <= 0 ? 'bg-slate-200 text-slate-400' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                        {v.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="font-black text-slate-700 text-xl block mb-1 group-hover:text-indigo-600">{v.name}</span>
                                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${v.stock < 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                                            <Package className="w-3.5 h-3.5"/>
                                            {v.stock} disponibles
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-slate-900 block group-hover:scale-110 transition-transform">{settings.currency}{v.price.toFixed(2)}</span>
                                    <div className="inline-flex items-center text-indigo-500 font-black text-[10px] uppercase mt-2 group-hover:translate-x-2 transition-transform">
                                        Elegir <ChevronRight className="w-4 h-4"/>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Botón Flotante Inteligente para Móvil */}
        <div className="lg:hidden fixed bottom-28 right-8 z-[30]">
             <button 
                onClick={() => {
                    const cartEl = document.getElementById('pos-cart-mobile');
                    if(cartEl) cartEl.classList.toggle('hidden');
                }}
                className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-2xl flex items-center justify-center relative active:scale-90 transition-all hover:scale-105"
             >
                 <ShoppingBag className="w-9 h-9" />
                 {cart.length > 0 && (
                     <span className="absolute -top-3 -right-3 w-9 h-9 bg-rose-500 text-white text-xs font-black rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-bounce">
                         {cart.reduce((a, b) => a + b.quantity, 0)}
                     </span>
                 )}
             </button>
        </div>

        {/* Carrito Móvil Fullscreen */}
        <div id="pos-cart-mobile" className="lg:hidden fixed inset-0 z-[100] bg-white hidden animate-fade-in">
             <Cart 
                items={cart} 
                onUpdateQuantity={onUpdateCart} 
                onRemoveItem={onRemoveItem} 
                onUpdateDiscount={onUpdateDiscount} 
                onCheckout={onCheckout} 
                onClearCart={onClearCart} 
                settings={settings} 
                customers={customers} 
                onClose={() => document.getElementById('pos-cart-mobile')?.classList.add('hidden')}
            />
        </div>
    </div>
  );
};
