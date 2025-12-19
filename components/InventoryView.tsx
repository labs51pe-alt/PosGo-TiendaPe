
import React, { useState, useMemo, useRef } from 'react';
import { Product, StoreSettings, Transaction, Purchase } from '../types';
import { Search, Plus, Edit, Trash2, Tag, Archive, Eye, AlertTriangle, FileDown, FileUp, Flame, ArrowRight, History, Package, Box, RefreshCw, LayoutGrid, List, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryProps {
    products: Product[];
    settings: StoreSettings;
    transactions: Transaction[];
    purchases?: Purchase[];
    onNewProduct: () => void;
    onEditProduct: (p: Product) => void;
    onDeleteProduct: (id: string) => void;
    onGoToPurchase?: (productName: string) => void;
}

export const InventoryView: React.FC<InventoryProps> = ({ 
    products, 
    settings, 
    transactions, 
    purchases = [], 
    onNewProduct, 
    onEditProduct, 
    onDeleteProduct,
    onGoToPurchase 
}) => {
    const [activeTab, setActiveTab] = useState<'ALL' | 'REPLENISH'>('ALL');
    const [replenishViewMode, setReplenishViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [searchTerm, setSearchTerm] = useState('');
    const [kardexProduct, setKardexProduct] = useState<Product | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- LOGIC: ALL PRODUCTS ---
    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.barcode && p.barcode.includes(searchTerm))
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [products, searchTerm]);

    // --- LOGIC: REPLENISHMENT ---
    const replenishmentData = useMemo(() => {
        return products
            .filter(p => p.stock <= 5) // Critical Stock
            .map(p => {
                // Calculate Velocity (Total Qty Sold Historically)
                const velocity = transactions.reduce((acc, t) => {
                    const item = t.items.find(i => i.id === p.id);
                    return acc + (item ? item.quantity : 0);
                }, 0);
                return { ...p, velocity };
            })
            .sort((a, b) => b.velocity - a.velocity); // High velocity first
    }, [products, transactions]);

    // --- LOGIC: KARDEX ---
    const getKardex = (productId: string) => {
        const sales = transactions.flatMap(t => 
            t.items.filter(i => i.id === productId).map(i => ({
                date: t.date,
                type: 'SALE',
                quantity: i.quantity,
                unitVal: i.price,
                doc: `Ticket #${t.id.slice(-4)}`
            }))
        );

        const entries = purchases.flatMap(p => 
            p.items.filter(i => i.productId === productId).map(i => ({
                date: p.date,
                type: 'PURCHASE',
                quantity: i.quantity,
                unitVal: i.cost,
                doc: 'Compra Prov.'
            }))
        );

        return [...sales, ...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    // --- ACTIONS ---
    const handleExportExcel = () => {
        const data = products.map(p => ({
            ID: p.id,
            Nombre: p.name,
            Categoria: p.category,
            Precio: p.price,
            Stock: p.stock,
            Codigo: p.barcode || '',
            Variantes: p.hasVariants ? 'SI' : 'NO'
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, "Inventario_PosGo.xlsx");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data: any[] = XLSX.utils.sheet_to_json(ws);
                    
                    if (data.length > 0) {
                        alert(`Se detectaron ${data.length} productos. Función de importación simulada exitosamente.`);
                    }
                } catch (error) {
                    alert('Error al leer el archivo. Asegúrate de que sea un Excel válido.');
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col bg-[#f8fafc]">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">Centro de Stock</h1>
                    <p className="text-slate-500 font-medium text-sm">Gestiona tu inventario y reabastecimiento</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
                    
                    <button onClick={handleImportClick} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <FileUp className="w-4 h-4"/> Importar
                    </button>
                    <button onClick={handleExportExcel} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <FileDown className="w-4 h-4"/> Exportar
                    </button>
                    <button onClick={onNewProduct} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <Plus className="w-5 h-5"/> Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Tabs and View Toggles */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('ALL')} 
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all border-2 whitespace-nowrap ${activeTab === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'}`}
                    >
                        Todos los Productos
                    </button>
                    <button 
                        onClick={() => setActiveTab('REPLENISH')} 
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all border-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'REPLENISH' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'}`}
                    >
                        <AlertTriangle className={`w-4 h-4 ${activeTab === 'REPLENISH' ? 'animate-pulse' : ''}`}/> 
                        Reposición Inteligente
                        {replenishmentData.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{replenishmentData.length}</span>}
                    </button>
                </div>

                {activeTab === 'REPLENISH' && (
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm animate-fade-in shrink-0">
                        <button 
                            onClick={() => setReplenishViewMode('GRID')}
                            className={`p-2 rounded-lg transition-all ${replenishViewMode === 'GRID' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
                            title="Vista Cuadrícula"
                        >
                            <LayoutGrid className="w-5 h-5"/>
                        </button>
                        <button 
                            onClick={() => setReplenishViewMode('LIST')}
                            className={`p-2 rounded-lg transition-all ${replenishViewMode === 'LIST' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
                            title="Vista Lista"
                        >
                            <List className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-hidden flex flex-col">
                
                {/* VIEW: ALL PRODUCTS */}
                {activeTab === 'ALL' && (
                    <div className="bg-white rounded-[2rem] border border-slate-100 flex-1 flex flex-col shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"/>
                                <input 
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold text-slate-700" 
                                    placeholder="Buscar por nombre, código de barras..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold uppercase text-slate-400">
                                    <tr>
                                        <th className="p-6">Producto</th>
                                        <th className="p-6">Categoría</th>
                                        <th className="p-6 text-right">Costo</th>
                                        <th className="p-6 text-right">Precio</th>
                                        <th className="p-6 text-center">Stock</th>
                                        <th className="p-6 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredProducts.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    {p.images && p.images.length > 0 ? (
                                                        <img src={p.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200"/>
                                                    ) : (
                                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                            {p.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-slate-800">{p.name}</div>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {p.barcode && <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-1"><Tag className="w-3 h-3"/> {p.barcode}</span>}
                                                            {p.hasVariants && p.variants?.map((v, i) => (
                                                                <span key={i} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">{v.name}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">{p.category}</span>
                                            </td>
                                            <td className="p-6 text-right text-slate-400 text-sm font-medium">
                                                {settings.currency}{(p.price * 0.7).toFixed(2)}
                                            </td>
                                            <td className="p-6 text-right font-black text-slate-800">
                                                {settings.currency}{p.price.toFixed(2)}
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border ${p.stock <= 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    <Box className="w-3.5 h-3.5"/>
                                                    {p.stock}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setKardexProduct(p)} className="p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors" title="Ver Historial"><Eye className="w-4 h-4"/></button>
                                                    <button onClick={() => onEditProduct(p)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors" title="Editar"><Edit className="w-4 h-4"/></button>
                                                    <button onClick={() => onDeleteProduct(p.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <tr><td colSpan={6} className="p-12 text-center text-slate-300">No se encontraron productos</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VIEW: REPLENISHMENT */}
                {activeTab === 'REPLENISH' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {replenishViewMode === 'GRID' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                                {replenishmentData.map((p, idx) => (
                                    <div key={p.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:border-orange-200 transition-colors">
                                        <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 px-3 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-wider">
                                            Prioridad #{idx + 1}
                                        </div>
                                        
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                {p.velocity > 10 ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md">
                                                        <Flame className="w-3 h-3 fill-current"/> Alta Rotación
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                                        <RefreshCw className="w-3 h-3"/> Venta Normal
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight truncate">{p.name}</h3>
                                            <p className="text-xs text-slate-400">{p.barcode}</p>
                                        </div>

                                        <div className="flex justify-between items-end mb-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Stock Actual</p>
                                                <p className="text-4xl font-black text-red-500">{p.stock}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Ventas Hist.</p>
                                                <p className="text-xl font-bold text-slate-700">{p.velocity}</p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => onGoToPurchase && onGoToPurchase(p.name)}
                                            className="w-full py-3 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            Reponer Ahora <ArrowRight className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ))}
                                {replenishmentData.length === 0 && (
                                    <div className="col-span-full py-20 text-center flex flex-col items-center text-slate-400">
                                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                            <Package className="w-10 h-10 text-emerald-300"/>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-700">Todo en orden</h3>
                                        <p>No tienes productos con stock crítico en este momento.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
                                <table className="w-full text-left">
                                    <thead className="bg-orange-50 text-xs font-bold uppercase text-orange-600">
                                        <tr>
                                            <th className="p-6">Prioridad</th>
                                            <th className="p-6">Producto</th>
                                            <th className="p-6 text-center">Ventas Hist.</th>
                                            <th className="p-6 text-center">Stock Actual</th>
                                            <th className="p-6 text-right">Estado</th>
                                            <th className="p-6 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {replenishmentData.map((p, idx) => (
                                            <tr key={p.id} className="hover:bg-orange-50/30 transition-colors group">
                                                <td className="p-6">
                                                    <span className="font-black text-orange-400">#{idx + 1}</span>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                                                            {p.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{p.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{p.barcode}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-center font-bold text-slate-700">
                                                    {p.velocity}
                                                </td>
                                                <td className="p-6 text-center">
                                                    <span className="text-lg font-black text-red-500">{p.stock}</span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    {p.velocity > 10 ? (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-lg border border-rose-100">ALTA ROTACIÓN</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-lg border border-slate-200 uppercase">Venta Normal</span>
                                                    )}
                                                </td>
                                                <td className="p-6 text-right">
                                                    <button 
                                                        onClick={() => onGoToPurchase && onGoToPurchase(p.name)}
                                                        className="px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-xs hover:bg-orange-600 transition-all flex items-center gap-2 float-right"
                                                    >
                                                        Comprar <ChevronRight className="w-3.5 h-3.5"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {replenishmentData.length === 0 && (
                                            <tr><td colSpan={6} className="p-12 text-center text-slate-400">No hay productos críticos para mostrar en lista</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* KARDEX MODAL */}
            {kardexProduct && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-fade-in-up overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><History className="w-6 h-6 text-indigo-500"/> Kardex / Historial</h3>
                                <p className="text-slate-500 font-medium">{kardexProduct.name}</p>
                            </div>
                            <button onClick={() => setKardexProduct(null)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5"/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 sticky top-0">
                                    <tr>
                                        <th className="p-6">Fecha</th>
                                        <th className="p-6">Movimiento</th>
                                        <th className="p-6 text-center">Cant.</th>
                                        <th className="p-6 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {getKardex(kardexProduct.id).map((k, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-6">
                                                <p className="font-bold text-slate-700 text-sm">{new Date(k.date).toLocaleDateString()}</p>
                                                <p className="text-xs text-slate-400">{new Date(k.date).toLocaleTimeString()}</p>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${k.type === 'SALE' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {k.type === 'SALE' ? 'Salida' : 'Entrada'}
                                                </span>
                                                <p className="text-xs text-slate-400 mt-1 font-mono">{k.doc}</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`font-bold ${k.type === 'SALE' ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {k.type === 'SALE' ? '-' : '+'}{k.quantity}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right font-medium text-slate-600">
                                                {settings.currency}{k.unitVal.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {getKardex(kardexProduct.id).length === 0 && (
                                        <tr><td colSpan={4} className="p-12 text-center text-slate-400">Sin movimientos registrados</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Stock Actual Calculado</span>
                            <span className="text-2xl font-black text-slate-800">{kardexProduct.stock} Unidades</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
