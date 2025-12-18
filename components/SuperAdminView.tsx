
import React, { useState, useEffect } from 'react';
import { Lead, Store, Product } from '../types';
import { StorageService } from '../services/storageService';
import { Users, Building2, Trash2, RefreshCw, ShieldAlert, Package, Plus, Edit, X, ImageIcon, Terminal, Copy, CheckCircle } from 'lucide-react';

interface SuperAdminProps {
    onEditProduct?: (product: Product) => void;
    onNewProduct?: () => void;
    lastUpdated?: number;
}

export const SuperAdminView: React.FC<SuperAdminProps> = ({ onEditProduct, onNewProduct, lastUpdated }) => {
    const [activeTab, setActiveTab] = useState<'LEADS' | 'STORES' | 'DEMO_PRODUCTS'>('DEMO_PRODUCTS'); 
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [demoProducts, setDemoProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSqlHelp, setShowSqlHelp] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchData = async (force = false) => {
        setLoading(true);
        try {
            const [l, s, demo] = await Promise.all([
                StorageService.getLeads(),
                StorageService.getAllStores(),
                StorageService.getDemoTemplate(force) 
            ]);
            setLeads(l);
            setStores(s);
            setDemoProducts(demo);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [lastUpdated]);

    const handleDeleteDemoProduct = async (id: string) => {
        if (window.confirm('¿Eliminar producto de la plantilla demo en la nube?')) {
            await StorageService.deleteDemoProduct(id);
            fetchData(true);
        }
    };

    const SQL_CODE = `-- 1. Asegurar columnas necesarias en la tabla 'products'
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "hasVariants" BOOLEAN DEFAULT FALSE;
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "variants" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "isPack" BOOLEAN DEFAULT FALSE;
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "packItems" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "public"."products" ADD COLUMN IF NOT EXISTS "cost" NUMERIC DEFAULT 0;

-- 2. Asegurar que la tabla 'stores' tenga la columna 'name'
ALTER TABLE "public"."stores" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- 3. Crear la Tienda Plantilla (ID Global) con Nombre
INSERT INTO "public"."stores" ("id", "name", "created_at", "settings")
VALUES ('00000000-0000-0000-0000-000000000000', 'Plantilla Global PosGo!', NOW(), '{"name": "Plantilla Global"}')
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";

-- 4. Habilitar RLS y Políticas (Acceso Público para Demo)
ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Template Store Access" ON "public"."stores";
CREATE POLICY "Public Template Store Access" ON "public"."stores" FOR ALL USING (id = '00000000-0000-0000-0000-000000000000');

DROP POLICY IF EXISTS "Public Template Products" ON "public"."products";
CREATE POLICY "Public Template Products" ON "public"."products" FOR ALL USING (store_id = '00000000-0000-0000-0000-000000000000');

DROP POLICY IF EXISTS "Public Template Images" ON "public"."product_images";
CREATE POLICY "Public Template Images" ON "public"."product_images" FOR ALL USING (store_id = '00000000-0000-0000-0000-000000000000');
`;

    const handleCopySql = () => {
        navigator.clipboard.writeText(SQL_CODE);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-8 h-full bg-[#f8fafc] flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-red-600"/> Super Admin
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">Gestiona la Infraestructura Global de PosGo!</p>
                </div>
                <button onClick={() => fetchData(true)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm group">
                    <RefreshCw className={`w-5 h-5 text-slate-500 group-hover:text-indigo-600 ${loading ? 'animate-spin' : ''}`}/>
                </button>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
                <button onClick={() => setActiveTab('DEMO_PRODUCTS')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'DEMO_PRODUCTS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Package className="w-4 h-4"/> Plantilla Cloud</button>
                <button onClick={() => setActiveTab('LEADS')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'LEADS' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Users className="w-4 h-4"/> Leads</button>
                <button onClick={() => setActiveTab('STORES')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'STORES' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}><Building2 className="w-4 h-4"/> Tiendas</button>
            </div>

            <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {activeTab === 'DEMO_PRODUCTS' && (
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                                <ImageIcon className="w-4 h-4"/>
                             </div>
                             <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Productos en Catálogo Global para Demos</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                             <button onClick={() => setShowSqlHelp(true)} className="flex-1 sm:flex-none bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-black transition-all">
                                <Terminal className="w-4 h-4 text-emerald-400"/> Fix Database SQL
                             </button>
                             <button onClick={onNewProduct} className="flex-1 sm:flex-none bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all">
                                <Plus className="w-4 h-4"/> Nuevo Global
                             </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10">
                            <tr>
                                {activeTab === 'DEMO_PRODUCTS' && (
                                    <>
                                        <th className="p-6">Img</th>
                                        <th className="p-6">Nombre</th>
                                        <th className="p-6">Categoría</th>
                                        <th className="p-6 text-right">Precio</th>
                                        <th className="p-6 text-center">Tipo</th>
                                        <th className="p-6 text-right">Acciones</th>
                                    </>
                                )}
                                {activeTab === 'LEADS' && (
                                    <>
                                        <th className="p-6">Nombre</th>
                                        <th className="p-6">Negocio</th>
                                        <th className="p-6">Teléfono</th>
                                        <th className="p-6">Fecha</th>
                                        <th className="p-6">Status</th>
                                    </>
                                )}
                                {activeTab === 'STORES' && (
                                    <>
                                        <th className="p-6">Store ID</th>
                                        <th className="p-6">Nombre</th>
                                        <th className="p-6">Creada</th>
                                        <th className="p-6">Status</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {activeTab === 'DEMO_PRODUCTS' && demoProducts.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                                    <td className="p-6">
                                        <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                                            {p.images && p.images.length > 0 ? (
                                                <img src={p.images[0]} className="w-full h-full object-cover"/>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-300">N/A</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                        <p className="text-[10px] font-mono text-slate-400">ID: {p.id.slice(0, 8)}</p>
                                    </td>
                                    <td className="p-6"><span className="bg-slate-100 text-slate-500 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider border border-slate-200">{p.category}</span></td>
                                    <td className="p-6 text-right font-black text-slate-900 text-sm">S/{p.price.toFixed(2)}</td>
                                    <td className="p-6 text-center">
                                        <div className="flex justify-center gap-1.5">
                                            {p.hasVariants && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[9px] font-black border border-indigo-100">VARIANTE</span>}
                                            {p.isPack && <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[9px] font-black border border-amber-100">PACK</span>}
                                            {!p.hasVariants && !p.isPack && <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[9px] font-black border border-slate-200">BASE</span>}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEditProduct && onEditProduct(p)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar Global"><Edit className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteDemoProduct(p.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Eliminar Global"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            
                            {activeTab === 'LEADS' && leads.map((l) => (
                                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6 font-bold text-slate-800 text-sm">{l.name}</td>
                                    <td className="p-6 font-medium text-slate-600 text-sm">{l.business_name}</td>
                                    <td className="p-6 font-black text-emerald-600 font-mono text-sm">+{l.phone}</td>
                                    <td className="p-6 text-xs text-slate-400">{new Date(l.created_at).toLocaleDateString()}</td>
                                    <td className="p-6"><span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black border border-indigo-100">{l.status || 'NEW'}</span></td>
                                </tr>
                            ))}

                            {activeTab === 'STORES' && stores.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6 font-mono text-[10px] text-slate-400">{s.id}</td>
                                    <td className="p-6 font-bold text-slate-800 text-sm">{s.name || s.settings?.name || 'Store'}</td>
                                    <td className="p-6 text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString()}</td>
                                    <td className="p-6"><span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100">ACTIVE</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(activeTab === 'DEMO_PRODUCTS' && demoProducts.length === 0 && !loading) && (
                        <div className="p-20 text-center flex flex-col items-center">
                            <Package className="w-12 h-12 text-slate-200 mb-4"/>
                            <p className="text-slate-400 font-bold">No hay productos en la plantilla global.</p>
                        </div>
                    )}
                </div>
            </div>

            {showSqlHelp && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                             <div>
                                <h3 className="font-black text-2xl text-slate-800 flex items-center gap-2">
                                    <Terminal className="w-6 h-6 text-indigo-600"/> Fix Schema Cache
                                </h3>
                                <p className="text-slate-400 text-sm font-medium mt-1">Ejecuta esto en el SQL Editor de Supabase para actualizar la base de datos.</p>
                             </div>
                             <button onClick={() => setShowSqlHelp(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6"/></button>
                        </div>
                        
                        <div className="relative group flex-1 overflow-hidden flex flex-col">
                            <div className="absolute top-4 right-4 z-10">
                                <button 
                                    onClick={handleCopySql} 
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg ${copied ? 'bg-emerald-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white'}`}
                                >
                                    {copied ? <><CheckCircle className="w-4 h-4"/> Copiado!</> : <><Copy className="w-4 h-4"/> Copiar Código</>}
                                </button>
                            </div>
                            <pre className="flex-1 bg-slate-900 text-emerald-400 p-6 rounded-3xl text-[11px] font-mono overflow-auto custom-scrollbar leading-relaxed border border-white/10 shadow-inner">
                                {SQL_CODE}
                            </pre>
                        </div>

                        <div className="mt-8 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4">
                            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0"/>
                            <div>
                                <p className="text-amber-900 font-black text-sm uppercase tracking-wider mb-1">Importante</p>
                                <p className="text-amber-700 text-xs leading-relaxed font-medium">Este script asegura que la tabla 'products' tenga las columnas 'hasVariants', 'variants', 'isPack' y 'packItems'. Sin ellas, el guardado en la nube fallará.</p>
                            </div>
                        </div>

                        <button onClick={() => setShowSqlHelp(false)} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200">ENTENDIDO</button>
                    </div>
                </div>
            )}
        </div>
    );
};
