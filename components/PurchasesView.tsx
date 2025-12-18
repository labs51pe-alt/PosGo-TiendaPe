import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Supplier, Purchase, PurchaseItem, StoreSettings } from '../types';
import { Search, Plus, ScanBarcode, Save, Trash2, History, User, FileText, Package, Truck, Calendar, ChevronRight, Hash, DollarSign, Archive, Barcode, Check, X, Building2, ShoppingCart, Calculator, TrendingUp } from 'lucide-react';

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
    
    // New Purchase State
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [barcodeBuffer, setBarcodeBuffer] = useState('');
    const [productSearch, setProductSearch] = useState('');
    
    // History Detail State
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    
    // Cart Item Structure: product, quantity, cost, newPrice (for updating sales price), margin
    const [cart, setCart] = useState<any[]>([]);
    
    // Supplier Modal
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierContact, setNewSupplierContact] = useState('');

    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Handle Initial Search from Inventory Redirect
    useEffect(() => {
        if (initialSearchTerm) {
            setProductSearch(initialSearchTerm);
            setActiveTab('NEW');
            if (onClearInitialSearch) onClearInitialSearch();
        }
    }, [initialSearchTerm, onClearInitialSearch]);

    // Filter products for search
    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        return products.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
            (p.barcode && p.barcode.includes(productSearch))
        ).slice(0, 5);
    }, [products, productSearch]);

    // Totals Calculation
    const totalCost = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

    // --- HANDLERS ---

    const handleAddItem = (product: Product) => {
        // Check if already in cart
        const existing = cart.find(i => i.product.id === product.id);
        if (existing) {
            alert('El producto ya está en la lista. Modifica la cantidad en la tabla.');
            return;
        }

        // Initial Values
        // Cost: Estimated as 70% of current price or 0
        // Price: Current Price
        // Margin: Calculated
        const initialCost = product.price * 0.7; 
        const initialPrice = product.price;
        const initialMargin = initialCost > 0 ? ((initialPrice - initialCost) / initialCost) * 100 : 30;

        setCart([...cart, {
            product,
            quantity: 1,
            cost: initialCost,
            newPrice: initialPrice,
            margin: initialMargin
        }]);
        setProductSearch('');
    };

    const handleUpdateItem = (index: number, field: 'quantity' | 'cost' | 'margin' | 'newPrice', value: number) => {
        const newCart = [...cart];
        const item = newCart[index];

        if (field === 'quantity') {
            item.quantity = value;
        } else if (field === 'cost') {
            item.cost = value;
            // Recalculate Margin based on fixed Price
            if (value > 0) {
                item.margin = ((item.newPrice - value) / value) * 100;
            } else {
                item.margin = 100;
            }
        } else if (field === 'margin') {
            item.margin = value;
            // Recalculate Price based on Cost + Margin
            item.newPrice = item.cost * (1 + (value / 100));
        } else if (field === 'newPrice') {
            item.newPrice = value;
            // Recalculate Margin based on new Price
            if (item.cost > 0) {
                item.margin = ((value - item.cost) / item.cost) * 100;
            }
        }

        setCart(newCart);
    };

    const handleRemoveItem = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const handleSavePurchase = () => {
        if (!selectedSupplierId) {
            alert('Por favor selecciona un proveedor.');
            return;
        }
        if (cart.length === 0) {
            alert('Agrega al menos un producto.');
            return;
        }

        const newPurchase: Purchase = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            supplierId: selectedSupplierId,
            total: totalCost,
            items: cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                cost: item.cost
            }))
        };

        // Update Products (Stock & Price)
        const updatedProducts = products.map(p => {
            const cartItem = cart.find(c => c.product.id === p.id);
            if (cartItem) {
                return {
                    ...p,
                    stock: p.stock + cartItem.quantity,
                    price: cartItem.newPrice // Update selling price
                };
            }
            return p;
        });

        onProcessPurchase(newPurchase, updatedProducts);
        setCart([]);
        setInvoiceNumber('');
        alert('Compra procesada exitosamente. Stock y precios actualizados.');
    };

    const handleSaveSupplier = () => {
        if (!newSupplierName) return;
        onAddSupplier({
            id: crypto.randomUUID(),
            name: newSupplierName,
            contact: newSupplierContact
        });
        setNewSupplierName('');
        setNewSupplierContact('');
        setIsSupplierModalOpen(false);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-[#f8fafc]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Gestión de Compras</h1>
                    <p className="text-slate-500 font-medium text-sm">Registra ingresos y actualiza inventario</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 md:gap-4 mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('NEW')} className={`px-4 md:px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'NEW' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    Nueva Compra
                </button>
                <button onClick={() => setActiveTab('HISTORY')} className={`px-4 md:px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'HISTORY' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    Historial
                </button>
                <button onClick={() => setActiveTab('SUPPLIERS')} className={`px-4 md:px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'SUPPLIERS' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    Proveedores
                </button>
            </div>

            {/* CONTENT: NEW PURCHASE */}
            {activeTab === 'NEW' && (
                <div className="flex flex-col xl:flex-row gap-6 h-full overflow-hidden">
                    {/* LEFT PANEL: CONFIG & SEARCH */}
                    <div className="w-full xl:w-1/3 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        {/* 1. Supplier & Invoice */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-amber-500"/> Datos de Compra</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Proveedor</label>
                                    <div className="flex gap-2">
                                        <select 
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-amber-400"
                                            value={selectedSupplierId}
                                            onChange={(e) => setSelectedSupplierId(e.target.value)}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <button onClick={() => setIsSupplierModalOpen(true)} className="p-3 bg-slate-100 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors"><Plus className="w-5 h-5"/></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">N° Factura / Boleta</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
                                        <input 
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-amber-400"
                                            placeholder="F001-000..."
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Product Search */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex-1 relative flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-amber-500"/> Agregar Productos</h3>
                            
                            <div className="relative z-20">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
                                    <input 
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-amber-400 mb-2"
                                        placeholder="Buscar producto o escanear..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                    />
                                </div>
                                
                                {productSearch && filteredProducts.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                        {filteredProducts.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => handleAddItem(p)}
                                                className="w-full text-left p-3 hover:bg-amber-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-700 text-sm">{p.name}</p>
                                                    <p className="text-xs text-slate-400">{p.barcode}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-slate-300">Stock: {p.stock}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {productSearch && filteredProducts.length === 0 && (
                                    <div className="p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-sm text-slate-500 font-medium mb-2">Producto no encontrado</p>
                                        <button onClick={() => onRequestNewProduct(productSearch)} className="text-xs font-bold text-amber-600 hover:underline">
                                            + Crear "{productSearch}"
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {/* Decorative Background Elements (Contained) */}
                            <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none z-0">
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-50 rounded-full blur-3xl opacity-50"></div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: CART TABLE */}
                    <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-slate-600"/> Items a Ingresar ({cart.length})</h3>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase">Total Compra</p>
                                <p className="text-2xl font-black text-slate-800">{settings.currency}{totalCost.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            <table className="w-full text-left">
                                <thead className="bg-white text-[10px] md:text-xs font-bold uppercase text-slate-400 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-4">Producto</th>
                                        <th className="p-4 w-24 text-center">Cant.</th>
                                        <th className="p-4 w-32 text-right">Costo Unit.</th>
                                        <th className="p-4 w-24 text-center">Margen %</th>
                                        <th className="p-4 w-32 text-right">Precio Venta</th>
                                        <th className="p-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 group">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-700 text-sm">{item.product.name}</p>
                                                <p className="text-xs text-slate-400">Stock actual: {item.product.stock}</p>
                                            </td>
                                            <td className="p-4">
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-slate-100 rounded-lg p-2 text-center font-bold outline-none focus:ring-2 focus:ring-amber-200"
                                                    value={item.quantity}
                                                    onChange={e => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{settings.currency}</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-6 pr-2 text-right font-medium outline-none focus:border-amber-400"
                                                        value={item.cost}
                                                        onChange={e => handleUpdateItem(idx, 'cost', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-bold text-indigo-600 outline-none focus:border-indigo-300"
                                                        value={Number(item.margin).toFixed(1)}
                                                        onChange={e => handleUpdateItem(idx, 'margin', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{settings.currency}</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-emerald-50 border border-emerald-100 rounded-lg py-2 pl-6 pr-2 text-right font-bold text-emerald-700 outline-none focus:border-emerald-300"
                                                        value={Number(item.newPrice).toFixed(2)}
                                                        onChange={e => handleUpdateItem(idx, 'newPrice', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (
                                        <tr><td colSpan={6} className="p-12 text-center text-slate-300">Agrega productos desde el panel izquierdo</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                             <button 
                                onClick={handleSavePurchase}
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2"
                             >
                                 <Save className="w-5 h-5"/> Procesar Ingreso
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENT: HISTORY */}
            {activeTab === 'HISTORY' && (
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 sticky top-0">
                                <tr>
                                    <th className="p-6">Fecha</th>
                                    <th className="p-6">Proveedor</th>
                                    <th className="p-6 text-center">Items</th>
                                    <th className="p-6 text-right">Total</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {purchases.map(p => (
                                    <tr 
                                        key={p.id} 
                                        className="hover:bg-amber-50/30 cursor-pointer transition-colors"
                                        onClick={() => setSelectedPurchase(p)}
                                    >
                                        <td className="p-6">
                                            <p className="font-bold text-slate-700">{new Date(p.date).toLocaleDateString()}</p>
                                            <p className="text-xs text-slate-400">{new Date(p.date).toLocaleTimeString()}</p>
                                        </td>
                                        <td className="p-6 font-medium text-slate-600">
                                            {suppliers.find(s => s.id === p.supplierId)?.name || 'Proveedor Desconocido'}
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{p.items.length} prod.</span>
                                        </td>
                                        <td className="p-6 text-right font-black text-slate-800">
                                            {settings.currency}{p.total.toFixed(2)}
                                        </td>
                                        <td className="p-6 text-right">
                                            <ChevronRight className="w-5 h-5 text-slate-300 inline-block"/>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONTENT: SUPPLIERS */}
            {activeTab === 'SUPPLIERS' && (
                 <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col p-8">
                     <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-xl text-slate-800">Directorio de Proveedores</h3>
                         <button onClick={() => setIsSupplierModalOpen(true)} className="px-6 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold hover:bg-amber-200 transition-colors flex items-center gap-2">
                             <Plus className="w-4 h-4"/> Nuevo Proveedor
                         </button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                         {suppliers.map(s => (
                             <div key={s.id} className="p-6 rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all group bg-slate-50/50">
                                 <div className="flex items-center gap-4 mb-4">
                                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm border border-slate-100">
                                         <Building2 className="w-6 h-6"/>
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-slate-800">{s.name}</h4>
                                         <p className="text-xs text-slate-400">ID: {s.id.slice(0,8)}</p>
                                     </div>
                                 </div>
                                 <div className="space-y-2">
                                     <div className="flex items-center gap-2 text-sm text-slate-500">
                                         <User className="w-4 h-4"/> {s.contact || 'Sin contacto'}
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
            )}

            {/* MODAL: ADD SUPPLIER */}
            {isSupplierModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-fade-in-up">
                        <h3 className="text-xl font-black text-slate-800 mb-6">Nuevo Proveedor</h3>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre Empresa</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-amber-400" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Ej. Distribuidora XYZ"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Contacto / Teléfono</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-amber-400" value={newSupplierContact} onChange={e => setNewSupplierContact(e.target.value)} placeholder="Ej. Juan Pérez - 999..."/>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsSupplierModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                            <button onClick={handleSaveSupplier} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black shadow-lg">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PURCHASE DETAIL */}
            {selectedPurchase && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                     <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Detalle de Compra</h3>
                                <p className="text-slate-500 text-sm">{new Date(selectedPurchase.date).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedPurchase(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-6 h-6 text-slate-500"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                             <table className="w-full text-left">
                                <thead className="bg-white text-xs font-bold uppercase text-slate-400 sticky top-0">
                                    <tr>
                                        <th className="p-6">Producto</th>
                                        <th className="p-6 text-center">Cant.</th>
                                        <th className="p-6 text-right">Costo Unit.</th>
                                        <th className="p-6 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {selectedPurchase.items.map((item, idx) => {
                                        const prodName = products.find(p => p.id === item.productId)?.name || 'Producto Eliminado';
                                        return (
                                            <tr key={idx}>
                                                <td className="p-6 font-bold text-slate-700">{prodName}</td>
                                                <td className="p-6 text-center text-slate-600">{item.quantity}</td>
                                                <td className="p-6 text-right text-slate-500">{settings.currency}{item.cost.toFixed(2)}</td>
                                                <td className="p-6 text-right font-black text-slate-800">{settings.currency}{(item.cost * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-500 uppercase text-xs">Total Pagado</span>
                            <span className="font-black text-3xl text-slate-900">{settings.currency}{selectedPurchase.total.toFixed(2)}</span>
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
};