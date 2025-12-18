
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Supplier, Purchase, PurchaseItem, StoreSettings } from '../types';
import { Search, Plus, ScanBarcode, Save, Trash2, History, User, FileText, Package, Truck, Calendar, ChevronRight, Hash, DollarSign, Archive, Barcode, Check, X, Building2, ShoppingCart, Calculator, TrendingUp, ArrowUpRight, Percent, AlertCircle } from 'lucide-react';

interface PurchasesViewProps {
    products: Product[];
    suppliers: Supplier[];
    purchases: Purchase[];
    onProcessPurchase: (purchase: Purchase, updatedProducts: Product[]) => void;
    onAddSupplier: (supplier: Supplier) => void;
    onRequestNewProduct: (barcode?: string) => void;
    settings: StoreSettings;
    initialSearchTerm?: string;
    onClearInitialSearch?: () => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ 
    products, 
    suppliers, 
    purchases, 
    onProcessPurchase, 
    onAddSupplier, 
    onRequestNewProduct,
    settings,
    initialSearchTerm,
    onClearInitialSearch
}) => {
    const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY' | 'SUPPLIERS'>('NEW');
    const [productSearch, setProductSearch] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierContact, setNewSupplierContact] = useState('');

    useEffect(() => {
        if (initialSearchTerm) {
            setProductSearch(initialSearchTerm);
            setActiveTab('NEW');
            if (onClearInitialSearch) onClearInitialSearch();
        }
    }, [initialSearchTerm, onClearInitialSearch]);

    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        return products.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
            (p.barcode && p.barcode.includes(productSearch))
        ).slice(0, 5);
    }, [products, productSearch]);

    // Totales y Estadísticas de la Compra
    const purchaseStats = useMemo(() => {
        const investment = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
        const projectedRevenue = cart.reduce((sum, item) => sum + (item.newPrice * item.quantity), 0);
        const projectedProfit = projectedRevenue - investment;
        const avgMargin = investment > 0 ? (projectedProfit / investment) * 100 : 0;
        
        return { investment, projectedRevenue, projectedProfit, avgMargin };
    }, [cart]);

    const handleAddItem = (product: Product) => {
        const existing = cart.find(i => i.product.id === product.id);
        if (existing) return;

        const initialCost = product.cost || product.price * 0.7; 
        const initialPrice = product.price;
        const initialMargin = initialCost > 0 ? ((initialPrice - initialCost) / initialCost) * 100 : 30;

        setCart([{
            product,
            quantity: 1,
            cost: initialCost,
            newPrice: initialPrice,
            margin: initialMargin
        }, ...cart]);
        setProductSearch('');
    };

    const handleUpdateItem = (index: number, field: 'quantity' | 'cost' | 'margin' | 'newPrice', value: number) => {
        const newCart = [...cart];
        const item = newCart[index];

        if (field === 'quantity') {
            item.quantity = value;
        } else if (field === 'cost') {
            item.cost = value;
            if (value > 0) item.margin = ((item.newPrice - value) / value) * 100;
        } else if (field === 'margin') {
            item.margin = value;
            item.newPrice = item.cost * (1 + (value / 100));
        } else if (field === 'newPrice') {
            item.newPrice = value;
            if (item.cost > 0) item.margin = ((value - item.cost) / item.cost) * 100;
        }
        setCart(newCart);
    };

    const handleSavePurchase = () => {
        if (!selectedSupplierId) { alert('Selecciona un proveedor'); return; }
        if (cart.length === 0) { alert('Añade productos'); return; }

        const newPurchase: Purchase = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            supplierId: selectedSupplierId,
            total: purchaseStats.investment,
            items: cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                cost: item.cost
            }))
        };

        const updatedProducts = products.map(p => {
            const cartItem = cart.find(c => c.product.id === p.id);
            if (cartItem) {
                return { ...p, stock: p.stock + cartItem.quantity, price: cartItem.newPrice, cost: cartItem.cost };
            }
            return p;
        });

        onProcessPurchase(newPurchase, updatedProducts);
        setCart([]);
        setInvoiceNumber('');
        setActiveTab('HISTORY');
    };

    // Fix: Implement handleSaveSupplier which was missing and causing a build error
    const handleSaveSupplier = () => {
        if (!newSupplierName.trim()) {
            alert("El nombre del proveedor es obligatorio.");
            return;
        }

        const newSupplier: Supplier = {
            id: crypto.randomUUID(),
            name: newSupplierName,
            contact: newSupplierContact
        };

        onAddSupplier(newSupplier);
        setNewSupplierName('');
        setNewSupplierContact('');
        setIsSupplierModalOpen(false);
    };

    return (
        <div className="p-8 h-full flex flex-col bg-[#f8fafc]">
            {/* Top Bar Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Suministros</h1>
                    <p className="text-slate-500 font-medium">Abastece tu inventario y controla costos</p>
                </div>
                
                <div className="flex p-1 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <button onClick={() => setActiveTab('NEW')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'NEW' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>NUEVA COMPRA</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'HISTORY' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>HISTORIAL</button>
                    <button onClick={() => setActiveTab('SUPPLIERS')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'SUPPLIERS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>PROVEEDORES</button>
                </div>
            </div>

            {/* TAB: NEW PURCHASE */}
            {activeTab === 'NEW' && (
                <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
                    
                    {/* LEFT SIDE: SEARCH & STATS */}
                    <div className="w-full lg:w-[350px] flex flex-col gap-6 shrink-0">
                        
                        {/* Summary Stats Card */}
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Calculator className="w-20 h-20"/></div>
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500"/> Resumen Proyectado
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Inversión Total</p>
                                    <p className="text-3xl font-black text-slate-900">{settings.currency}{purchaseStats.investment.toFixed(2)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Utilidad</p>
                                        <p className="text-lg font-black text-emerald-600">+{settings.currency}{purchaseStats.projectedProfit.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Margen Prom.</p>
                                        <p className="text-lg font-black text-indigo-600">{purchaseStats.avgMargin.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search & Add */}
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex-1 flex flex-col min-h-0">
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"/>
                                <input 
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
                                    placeholder="Buscar producto..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                {filteredProducts.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => handleAddItem(p)}
                                        className="w-full text-left p-4 rounded-2xl hover:bg-slate-50 flex items-center gap-4 group border border-transparent hover:border-slate-100 transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            {p.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{p.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Stock: {p.stock}</p>
                                        </div>
                                        <Plus className="w-5 h-5 text-slate-300 group-hover:text-indigo-600"/>
                                    </button>
                                ))}
                                {productSearch && filteredProducts.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-slate-400 text-sm font-bold mb-4">¿Producto nuevo?</p>
                                        <button 
                                            onClick={() => onRequestNewProduct(productSearch)}
                                            className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all"
                                        >
                                            Crear "{productSearch}"
                                        </button>
                                    </div>
                                )}
                                {!productSearch && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                                        <Barcode className="w-12 h-12 mb-2"/>
                                        <p className="text-[10px] font-black uppercase">Ingresa nombre o escanea</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE: CART TABLE */}
                    <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        
                        {/* Cart Header: Supplier Selection */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Proveedor del Suministro</label>
                                <div className="flex gap-2">
                                    <select 
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-400 shadow-sm"
                                        value={selectedSupplierId}
                                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    >
                                        <option value="">Seleccionar Proveedor...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <button onClick={() => setIsSupplierModalOpen(true)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"><Plus className="w-5 h-5"/></button>
                                </div>
                            </div>
                            <div className="w-full sm:w-48">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ref. Factura / Ticket</label>
                                <input 
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-400 shadow-sm"
                                    placeholder="N° Comprobante"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-white text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-6">Producto</th>
                                        <th className="p-6 w-24 text-center">Cant.</th>
                                        <th className="p-6 w-32 text-right">Costo Unit.</th>
                                        <th className="p-6 w-28 text-center">Margen %</th>
                                        <th className="p-6 w-32 text-right">Precio Venta</th>
                                        <th className="p-6 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 group animate-fade-in-up">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    {item.product.images?.[0] ? (
                                                        <img src={item.product.images[0]} className="w-10 h-10 rounded-lg object-cover border border-slate-100 shadow-sm"/>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-600">{item.product.name.charAt(0)}</div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{item.product.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Stock Actual: {item.product.stock}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-slate-100 rounded-xl p-3 text-center font-black outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                                                    value={item.quantity}
                                                    onChange={e => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-6">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{settings.currency}</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-8 pr-3 text-right font-black outline-none focus:border-indigo-400"
                                                        value={item.cost}
                                                        onChange={e => handleUpdateItem(idx, 'cost', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        className={`w-full border-2 rounded-xl p-3 text-center font-black outline-none transition-all ${item.margin < 15 ? 'bg-rose-50 border-rose-100 text-rose-600' : item.margin < 25 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}
                                                        value={Number(item.margin).toFixed(1)}
                                                        onChange={e => handleUpdateItem(idx, 'margin', parseFloat(e.target.value) || 0)}
                                                    />
                                                    {item.margin < 10 && <AlertCircle className="absolute -top-1 -right-1 w-4 h-4 text-rose-500 fill-white"/>}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{settings.currency}</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-8 pr-3 text-right font-black text-white outline-none focus:ring-4 focus:ring-indigo-50/20"
                                                        value={Number(item.newPrice).toFixed(2)}
                                                        onChange={e => handleUpdateItem(idx, 'newPrice', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <button onClick={() => handleUpdateItem(idx, 'quantity', 0)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-20 text-center">
                                                <div className="flex flex-col items-center opacity-30">
                                                    <Archive className="w-16 h-16 mb-4"/>
                                                    <p className="font-black text-lg uppercase tracking-widest">Lista de Compra Vacía</p>
                                                    <p className="text-sm font-medium">Busca productos a la izquierda para abastecer stock</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Cart Footer */}
                        <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                            <div className="hidden sm:block">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items en lista</p>
                                <p className="text-xl font-black text-slate-800">{cart.length} Productos</p>
                            </div>
                            <button 
                                onClick={handleSavePurchase}
                                disabled={cart.length === 0 || !selectedSupplierId}
                                className="px-12 py-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:grayscale text-white rounded-[2rem] font-black shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center gap-3 text-lg group"
                            >
                                <Check className="w-6 h-6 stroke-[3px] group-hover:scale-125 transition-transform"/>
                                PROCESAR ABASTECIMIENTO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: HISTORY (Cleaned up) */}
            {activeTab === 'HISTORY' && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 sticky top-0">
                                <tr>
                                    <th className="p-8">Fecha y Documento</th>
                                    <th className="p-8">Proveedor</th>
                                    <th className="p-8 text-center">Variedad</th>
                                    <th className="p-8 text-right">Inversión</th>
                                    <th className="p-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {purchases.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-8">
                                            <p className="font-black text-slate-800 text-sm">{new Date(p.date).toLocaleDateString()}</p>
                                            <p className="text-[10px] font-mono text-slate-400">ID: {p.id.slice(-8).toUpperCase()}</p>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><Building2 className="w-4 h-4"/></div>
                                                <span className="font-bold text-slate-700">{suppliers.find(s => s.id === p.supplierId)?.name || 'Prov. Desconocido'}</span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{p.items.length} SKUs</span>
                                        </td>
                                        <td className="p-8 text-right font-black text-slate-900 text-lg">
                                            {settings.currency}{p.total.toFixed(2)}
                                        </td>
                                        <td className="p-8 text-right">
                                            <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><ChevronRight className="w-6 h-6"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: SUPPLIERS (Modernized) */}
            {activeTab === 'SUPPLIERS' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <button onClick={() => setIsSupplierModalOpen(true)} className="aspect-square rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all group">
                            <Plus className="w-12 h-12 group-hover:scale-110 transition-transform"/>
                            <span className="font-black text-sm uppercase tracking-widest">Nuevo Proveedor</span>
                        </button>
                        
                        {suppliers.map(s => (
                            <div key={s.id} className="bg-white aspect-square rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:-translate-y-2 transition-all group">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                    <Building2 className="w-7 h-7"/>
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-xl leading-tight mb-2">{s.name}</h4>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                        <User className="w-3.5 h-3.5"/>
                                        {s.contact || 'S/N Contacto'}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-50 flex justify-between items-center mt-4">
                                    <span className="text-[10px] font-black text-slate-300 uppercase">Ver Compras</span>
                                    <ArrowUpRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-600 transition-colors"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALS (Unchanged logic, improved visuals) */}
            {isSupplierModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Nuevo Proveedor</h3>
                            <button onClick={() => setIsSupplierModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="space-y-6 mb-10">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Razón Social / Nombre</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Ej. Distribuidora Central S.A.C."/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Contacto Directo</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all" value={newSupplierContact} onChange={e => setNewSupplierContact(e.target.value)} placeholder="Ej. Juan Pérez - 999 000 000"/>
                            </div>
                        </div>
                        <button onClick={handleSaveSupplier} className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black shadow-xl hover:bg-black transition-all active:scale-95">GUARDAR PROVEEDOR</button>
                    </div>
                </div>
            )}
        </div>
    );
};