
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Supplier, Purchase, StoreSettings } from '../types';
import { StorageService } from '../services/storageService';
import { 
    Search, Plus, Save, Trash2, Building2, ShoppingBag, 
    TrendingUp, Check, X, FileText, 
    Barcode, ChevronRight, Truck, Calendar, Package, AlertCircle,
    ArrowUpCircle, DollarSign, PieChart, Info, CreditCard, Clock, Inbox, Award
} from 'lucide-react';

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
    products, suppliers, purchases, onProcessPurchase, onAddSupplier, 
    onRequestNewProduct, settings, initialSearchTerm, onClearInitialSearch
}) => {
    const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY' | 'SUPPLIERS' | 'REPORTS'>('NEW');
    const [productSearch, setProductSearch] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseCart, setPurchaseCart] = useState<any[]>([]);
    
    // Detailed View Logic
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

    // UI Modals
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

    const filteredSearchProducts = useMemo(() => {
        if (!productSearch || productSearch.length < 2) return [];
        return products.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
            (p.barcode && p.barcode.includes(productSearch))
        ).slice(0, 8);
    }, [products, productSearch]);

    // --- LOGICA DE REPORTES ---
    const reports = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlyInversion = purchases
            .filter(p => new Date(p.date) >= startOfMonth)
            .reduce((sum, p) => sum + p.total, 0);

        const totalUnpaid = purchases
            .filter(p => p.status === 'PENDING')
            .reduce((sum, p) => sum + p.total, 0);

        const pendingReceptionCount = purchases.filter(p => p.received === 'NO').length;

        // Top Productos Comprados
        const productStats: Record<string, { name: string, qty: number, invest: number }> = {};
        purchases.forEach(p => {
            p.items.forEach(item => {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = { name: item.productName || 'Producto', qty: 0, invest: 0 };
                }
                productStats[item.productId].qty += item.quantity;
                productStats[item.productId].invest += item.quantity * item.cost;
            });
        });

        const topInvestedProducts = Object.values(productStats)
            .sort((a, b) => b.invest - a.invest)
            .slice(0, 5);

        return { monthlyInversion, totalUnpaid, pendingReceptionCount, topInvestedProducts };
    }, [purchases]);

    const handleAddToPurchase = (product: Product) => {
        if (purchaseCart.find(i => i.id === product.id)) return;
        const suggestedCost = product.cost || (product.price * 0.7);
        setPurchaseCart([{
            ...product,
            quantity: 1,
            cost: suggestedCost,
            newPrice: product.price
        }, ...purchaseCart]);
        setProductSearch('');
    };

    const updatePurchaseItem = (id: string, field: string, value: any) => {
        setPurchaseCart(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleFinishPurchase = () => {
        if (!selectedSupplierId) { alert('Debes seleccionar un proveedor.'); return; }
        if (purchaseCart.length === 0) { alert('Agrega al menos un producto.'); return; }

        const purchase: Purchase = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            supplierId: selectedSupplierId,
            invoiceNumber: invoiceNumber,
            total: purchaseCart.reduce((s, i) => s + (i.cost * i.quantity), 0),
            items: purchaseCart.map(i => ({ 
                productId: i.id, 
                productName: i.name, // Guardamos el nombre para el historial
                quantity: i.quantity, 
                cost: i.cost 
            })),
            status: 'PAID', // Por defecto pagada, se puede cambiar en historial
            received: 'YES' // Por defecto recibida, se puede cambiar en historial
        };

        const updatedProducts = products.map(p => {
            const boughtItem = purchaseCart.find(i => i.id === p.id);
            if (boughtItem) {
                return { 
                    ...p, 
                    stock: p.stock + boughtItem.quantity, 
                    cost: boughtItem.cost, 
                    price: boughtItem.newPrice 
                };
            }
            return p;
        });

        onProcessPurchase(purchase, updatedProducts);
        setPurchaseCart([]);
        setSelectedSupplierId('');
        setInvoiceNumber('');
        setActiveTab('HISTORY');
    };

    const togglePurchaseStatus = async (purchase: Purchase, field: 'status' | 'received', value: any) => {
        const updated = { ...purchase, [field]: value };
        await StorageService.updatePurchase(updated);
        // Forzamos refresco local (en una app real App.tsx lo manejaría via callback)
        window.location.reload(); 
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header Module */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center shrink-0 shadow-sm z-30">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Truck className="w-7 h-7 text-amber-500" /> Módulo de Compras
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Control de Inventario y Gastos</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('NEW')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'NEW' ? 'bg-white shadow-md text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>NUEVA COMPRA</button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'HISTORY' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>HISTORIAL</button>
                    <button onClick={() => setActiveTab('REPORTS')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'REPORTS' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>REPORTES</button>
                    <button onClick={() => setActiveTab('SUPPLIERS')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'SUPPLIERS' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>PROVEEDORES</button>
                </div>
            </div>

            {activeTab === 'NEW' ? (
                <div className="flex-1 flex flex-col overflow-hidden p-6 lg:p-8 gap-6 animate-fade-in">
                    
                    {/* Header: Documento y Proveedor */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm shrink-0 items-end">
                        <div className="lg:col-span-2 space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5"/> Proveedor Seleccionado
                            </label>
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-amber-400 focus:bg-white transition-all appearance-none"
                                    value={selectedSupplierId}
                                    onChange={e => setSelectedSupplierId(e.target.value)}
                                >
                                    <option value="">Elegir Proveedor...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button onClick={() => setIsSupplierModalOpen(true)} className="p-4 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 hover:bg-amber-100 transition-colors shadow-sm" title="Nuevo Proveedor">
                                    <Plus className="w-6 h-6 stroke-[3px]"/>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5"/> N° Factura / Documento
                            </label>
                            <input 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-all placeholder:text-slate-200"
                                placeholder="Ej: F001-12345"
                                value={invoiceNumber}
                                onChange={e => setInvoiceNumber(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Inversión Total</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                {settings.currency}{purchaseCart.reduce((s, i) => s + (i.cost * i.quantity), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
                        
                        {/* Buscador de Productos (Panel Lateral) */}
                        <div className="w-full lg:w-[380px] flex flex-col bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden shrink-0">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                                <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Search className="w-4 h-4 text-amber-500" /> Añadir Productos
                                </h3>
                                <div className="relative">
                                    <input 
                                        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 transition-all shadow-inner"
                                        placeholder="Escanea o escribe..."
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        autoFocus
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                                {filteredSearchProducts.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => handleAddToPurchase(p)}
                                        className="w-full text-left p-4 rounded-2xl hover:bg-amber-50/50 flex items-center gap-4 transition-all group border border-transparent hover:border-amber-100"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all text-sm shadow-sm">
                                            {p.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-800 text-sm truncate">{p.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stock: {p.stock} un.</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-white group-hover:text-amber-500 transition-all">
                                            <Plus className="w-4 h-4 stroke-[3px]" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Listado de Carga */}
                        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-6">Producto</th>
                                            <th className="p-6 text-center w-28">Cant.</th>
                                            <th className="p-6 text-right w-36">Costo Unit.</th>
                                            <th className="p-6 text-right w-36">Precio Venta</th>
                                            <th className="p-6 text-right w-36">Subtotal</th>
                                            <th className="p-6 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {purchaseCart.map((item) => (
                                            <tr key={item.id} className="hover:bg-amber-50/20 transition-all group animate-fade-in-up">
                                                <td className="p-6">
                                                    <p className="font-black text-slate-800 text-sm truncate">{item.name}</p>
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-500">
                                                        Nuevo Costo Cloud
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <input type="number" className="w-full bg-slate-50 border-2 border-transparent focus:border-amber-400 rounded-xl p-2 text-center font-black outline-none transition-all" value={item.quantity} onChange={e => updatePurchaseItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}/>
                                                </td>
                                                <td className="p-6">
                                                    <input type="number" className="w-full bg-white border-2 border-slate-100 focus:border-emerald-400 rounded-xl p-2 text-right font-black outline-none" value={item.cost} onChange={e => updatePurchaseItem(item.id, 'cost', parseFloat(e.target.value) || 0)}/>
                                                </td>
                                                <td className="p-6">
                                                    <input type="number" className="w-full bg-white border-2 border-slate-100 focus:border-indigo-400 rounded-xl p-2 text-right font-black outline-none text-indigo-600" value={item.newPrice} onChange={e => updatePurchaseItem(item.id, 'newPrice', parseFloat(e.target.value) || 0)}/>
                                                </td>
                                                <td className="p-6 text-right font-black text-slate-700">{settings.currency}{(item.cost * item.quantity).toFixed(2)}</td>
                                                <td className="p-6 text-right">
                                                    <button onClick={() => setPurchaseCart(prev => prev.filter(i => i.id !== item.id))} className="text-slate-200 hover:text-rose-500 transition-all"><Trash2 className="w-5 h-5"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end shrink-0">
                                <button onClick={handleFinishPurchase} disabled={purchaseCart.length === 0 || !selectedSupplierId} className="px-12 py-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-20 text-white rounded-[2rem] font-black shadow-2xl transition-all flex items-center gap-4"><Check className="w-7 h-7 stroke-[4px]" /> PROCESAR ENTRADA CLOUD</button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'HISTORY' ? (
                <div className="flex-1 overflow-y-auto p-8 animate-fade-in relative">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                <tr>
                                    <th className="p-6">Fecha</th>
                                    <th className="p-6">Documento</th>
                                    <th className="p-6">Proveedor</th>
                                    <th className="p-6">Pago</th>
                                    <th className="p-6">Recibido</th>
                                    <th className="p-6 text-right">Inversión</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {purchases.map(p => (
                                    <tr key={p.id} onClick={() => setSelectedPurchase(p)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <td className="p-6 font-bold text-slate-700">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="p-6 font-mono text-xs text-slate-400">{p.invoiceNumber || 'S/N Doc'}</td>
                                        <td className="p-6 font-bold text-slate-800">{suppliers.find(s => s.id === p.supplierId)?.name || 'N/A'}</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 animate-pulse'}`}>
                                                {p.status === 'PAID' ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.received === 'YES' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {p.received === 'YES' ? 'Recibido' : 'En camino'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right font-black text-slate-900 text-lg">{settings.currency}{p.total.toFixed(2)}</td>
                                        <td className="p-6 text-right"><ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-indigo-500 transition-all"/></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Detalle de Compra Modal / Sidebar */}
                    {selectedPurchase && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-end">
                            <div className="w-full max-w-lg bg-white h-full shadow-2xl animate-fade-in-right flex flex-col">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">Detalle de Compra</h3>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">N° {selectedPurchase.invoiceNumber || 'S/N'}</p>
                                    </div>
                                    <button onClick={() => setSelectedPurchase(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"><X className="w-6 h-6 text-white"/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                    {/* Información rápida */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Pago</p>
                                            <button 
                                                onClick={() => togglePurchaseStatus(selectedPurchase, 'status', selectedPurchase.status === 'PAID' ? 'PENDING' : 'PAID')}
                                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${selectedPurchase.status === 'PAID' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}
                                            >
                                                {selectedPurchase.status === 'PAID' ? 'Saldado' : 'Por Pagar'}
                                            </button>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mercancía</p>
                                            <button 
                                                onClick={() => togglePurchaseStatus(selectedPurchase, 'received', selectedPurchase.received === 'YES' ? 'NO' : 'YES')}
                                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${selectedPurchase.received === 'YES' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}
                                            >
                                                {selectedPurchase.received === 'YES' ? 'Completa' : 'Pendiente'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Listado de Items con Precios de Costo */}
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Inbox className="w-4 h-4 text-indigo-500"/> Productos Ingresados</h4>
                                        <div className="space-y-3">
                                            {selectedPurchase.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{item.productName || 'Producto'}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Costo Unit: {settings.currency}{item.cost.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-slate-700 text-sm">x{item.quantity}</p>
                                                        <p className="font-black text-indigo-600 text-sm">{settings.currency}{(item.cost * item.quantity).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 border-t border-slate-100 bg-slate-50">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Total Doc</p>
                                        <p className="text-3xl font-black text-slate-900">{settings.currency}{selectedPurchase.total.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : activeTab === 'REPORTS' ? (
                <div className="flex-1 overflow-y-auto p-8 animate-fade-in space-y-10">
                    {/* KPI Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gastos del Mes</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><TrendingUp className="w-6 h-6"/></div>
                                <p className="text-3xl font-black text-slate-800">{settings.currency}{reports.monthlyInversion.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-sm shadow-rose-50">
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Cuentas por Pagar</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600"><CreditCard className="w-6 h-6"/></div>
                                <p className="text-3xl font-black text-rose-800">{settings.currency}{reports.totalUnpaid.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-amber-100 shadow-sm shadow-amber-50">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Órdenes sin Recibir</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="w-6 h-6"/></div>
                                <p className="text-3xl font-black text-amber-800">{reports.pendingReceptionCount}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Proveedores</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600"><Building2 className="w-6 h-6"/></div>
                                <p className="text-3xl font-black text-slate-800">{suppliers.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Ranking de Productos con Mayor Inversión */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500"/> Productos Más Comprados (Inversión)</h3>
                            <div className="space-y-5">
                                {reports.topInvestedProducts.map((p, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xs">#{i+1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{p.name}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cant: {p.qty} un.</p>
                                        </div>
                                        <p className="font-black text-indigo-600">{settings.currency}{p.invest.toFixed(2)}</p>
                                    </div>
                                ))}
                                {reports.topInvestedProducts.length === 0 && <p className="text-center py-10 text-slate-300 italic font-bold">Sin datos para mostrar</p>}
                            </div>
                        </div>

                        {/* Historial rápido por Proveedor */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-500"/> Inversión por Proveedor</h3>
                            <div className="space-y-4">
                                {suppliers.map(s => {
                                    const totalProv = purchases.filter(p => p.supplierId === s.id).reduce((sum, p) => sum + p.total, 0);
                                    if (totalProv === 0) return null;
                                    return (
                                        <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                            <span className="font-bold text-slate-700">{s.name}</span>
                                            <span className="font-black text-slate-900">{settings.currency}{totalProv.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                                {!suppliers.some(s => purchases.some(p => p.supplierId === s.id)) && <p className="text-center py-10 text-slate-300 italic font-bold">No hay compras vinculadas a proveedores</p>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <button onClick={() => setIsSupplierModalOpen(true)} className="aspect-square bg-white border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 transition-all group">
                            <Plus className="w-14 h-14 group-hover:scale-110 transition-transform" />
                            <span className="font-black text-[11px] uppercase tracking-[0.2em]">Nuevo Proveedor</span>
                        </button>
                        {suppliers.map(s => (
                            <div key={s.id} className="bg-white aspect-square rounded-[3rem] border border-slate-100 p-10 shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all flex flex-col justify-between group">
                                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all"><Building2 className="w-8 h-8" /></div>
                                <div className="mt-6">
                                    <h3 className="text-2xl font-black text-slate-800 leading-tight mb-2 truncate">{s.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Calendar className="w-3.5 h-3.5" /> {s.contact || 'S/N Datos'}</div>
                                </div>
                                <div className="pt-6 border-t border-slate-50 flex justify-between items-center"><span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl">ACTIVO</span><ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-emerald-500" /></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Proveedor */}
            {isSupplierModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-md p-12 shadow-2xl animate-fade-in-up border border-slate-100">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight">Proveedor</h3>
                            <button onClick={() => setIsSupplierModalOpen(false)} className="w-12 h-12 bg-slate-50 hover:bg-rose-50 rounded-full flex items-center justify-center transition-all group"><X className="w-6 h-6 text-slate-300 group-hover:text-rose-500"/></button>
                        </div>
                        <div className="space-y-8 mb-12">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Nombre Comercial</label><input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Ej: Distribuidora Central" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} autoFocus /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Teléfono / WhatsApp</label><input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-5 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Ej: 999 000 123" value={newSupplierContact} onChange={e => setNewSupplierContact(e.target.value)} /></div>
                        </div>
                        <button onClick={() => { if(!newSupplierName) return; onAddSupplier({ id: crypto.randomUUID(), name: newSupplierName, contact: newSupplierContact }); setIsSupplierModalOpen(false); setNewSupplierName(''); setNewSupplierContact(''); }} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black shadow-2xl hover:bg-black transition-all active:scale-95 text-sm tracking-[0.1em]">GUARDAR PROVEEDOR CLOUD</button>
                    </div>
                </div>
            )}
        </div>
    );
};
