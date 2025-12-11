import React, { useState, useEffect } from 'react';
import { Lead, Store } from '../types';
import { StorageService } from '../services/storageService';
import { Users, Building2, Trash2, MessageCircle, Phone, Calendar, RefreshCw, ShieldAlert, Check, Database } from 'lucide-react';

export const SuperAdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'LEADS' | 'STORES'>('LEADS');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [l, s] = await Promise.all([
                StorageService.getLeads(),
                StorageService.getAllStores()
            ]);
            setLeads(l);
            setStores(s);
            if (activeTab === 'LEADS' && l.length === 0) {
                 console.log("No leads found. If data exists in DB, check RLS policies.");
            }
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteStore = async (id: string) => {
        if (window.confirm('¿ESTÁS SEGURO? Esto eliminará la tienda y todos sus datos.')) {
            await StorageService.deleteStore(id);
            fetchData();
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (window.confirm('¿Eliminar este lead permanentemente?')) {
            await StorageService.deleteLead(id);
            fetchData();
        }
    };

    const handleWhatsApp = (phone: string, name: string) => {
        const text = `Hola ${name}, te contacto desde PosGo! 🚀 ¿Cómo podemos ayudarte?`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="p-8 h-full bg-[#f8fafc] flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-red-600"/> Super Admin
                    </h1>
                    <p className="text-slate-500 font-medium">Panel de control maestro</p>
                </div>
                <button onClick={fetchData} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`}/>
                </button>
            </div>

            <div className="flex gap-4 mb-6">
                <button 
                    onClick={() => setActiveTab('LEADS')} 
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'LEADS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500'}`}
                >
                    <Users className="w-4 h-4"/> Leads Registrados ({leads.length})
                </button>
                <button 
                    onClick={() => setActiveTab('STORES')} 
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'STORES' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500'}`}
                >
                    <Building2 className="w-4 h-4"/> Empresas ({stores.length})
                </button>
            </div>

            <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400 sticky top-0 z-10">
                            <tr>
                                {activeTab === 'LEADS' ? (
                                    <>
                                        <th className="p-6">Fecha Registro</th>
                                        <th className="p-6">Nombre Cliente</th>
                                        <th className="p-6">Negocio</th>
                                        <th className="p-6">Teléfono</th>
                                        <th className="p-6 text-right">Acción</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-6">ID Tienda</th>
                                        <th className="p-6">Nombre Tienda</th>
                                        <th className="p-6">Fecha Creación</th>
                                        <th className="p-6 text-right">Acción</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {activeTab === 'LEADS' ? (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50/50">
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                                                <Calendar className="w-4 h-4"/> {new Date(lead.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] text-slate-400 pl-6">{new Date(lead.created_at).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="p-6 font-bold text-slate-800">{lead.name}</td>
                                        <td className="p-6">
                                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">{lead.business_name}</span>
                                        </td>
                                        <td className="p-6 font-mono text-slate-600">{lead.phone}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleWhatsApp(lead.phone, lead.name)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-emerald-200 shadow-md text-xs"
                                                >
                                                    <MessageCircle className="w-4 h-4"/> Contactar
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteLead(lead.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                    title="Eliminar Lead"
                                                >
                                                    <Trash2 className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                stores.map((store) => (
                                    <tr key={store.id} className="hover:bg-slate-50/50">
                                        <td className="p-6 font-mono text-xs text-slate-400">{store.id}</td>
                                        <td className="p-6 font-bold text-slate-800">{store.settings?.name || 'Sin Nombre'}</td>
                                        <td className="p-6 text-slate-500 text-sm">{new Date(store.created_at).toLocaleDateString()}</td>
                                        <td className="p-6 text-right">
                                            <button 
                                                onClick={() => handleDeleteStore(store.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                title="Eliminar Empresa"
                                            >
                                                <Trash2 className="w-5 h-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {((activeTab === 'LEADS' && leads.length === 0) || (activeTab === 'STORES' && stores.length === 0)) && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-300">
                                        <div className="flex flex-col items-center gap-3">
                                            <Database className="w-10 h-10 opacity-20"/>
                                            <p>No hay datos visibles.</p>
                                            {activeTab === 'LEADS' && (
                                                <div className="bg-amber-50 text-amber-600 p-3 rounded-xl text-xs max-w-md border border-amber-100">
                                                    <strong>Nota para el Admin:</strong> Si ves datos en la tabla de Supabase pero no aquí, 
                                                    ejecuta el comando SQL para liberar los permisos de lectura a 'anon' o inicia sesión como usuario autenticado.
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};