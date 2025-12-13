import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { Save, Store, Receipt, Coins, RefreshCw, AlertTriangle } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface SettingsViewProps {
    settings: StoreSettings;
    onSaveSettings: (newSettings: StoreSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
    const [formData, setFormData] = useState<StoreSettings>(settings);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (field: keyof StoreSettings, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        onSaveSettings(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleFactoryReset = async () => {
        if (window.confirm("⚠️ ¿RESTAURAR DEMO?\n\nEsto borrará todas tus ventas y productos locales, y cargará la última plantilla oficial de la nube.\n\nEsta acción no se puede deshacer.")) {
            await StorageService.resetDemoData();
            window.location.reload();
        }
    };

    return (
        <div className="p-8 h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Configuración</h1>
                        <p className="text-slate-500 font-medium">Personaliza los datos de tu negocio</p>
                    </div>
                    <button 
                        onClick={handleSave} 
                        className={`px-8 py-4 rounded-2xl font-bold shadow-xl transition-all flex items-center gap-3 ${saved ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-black hover:scale-105'}`}
                    >
                        {saved ? '¡Guardado!' : <><Save className="w-5 h-5"/> Guardar Cambios</>}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* General Info */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-violet-100 rounded-2xl text-violet-600"><Store className="w-6 h-6"/></div>
                            <h2 className="text-xl font-bold text-slate-800">Datos del Comercio</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de la Tienda</label>
                                <input 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-violet-500 transition-colors"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dirección</label>
                                    <input 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-violet-500 transition-colors"
                                        value={formData.address || ''}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Teléfono</label>
                                    <input 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-violet-500 transition-colors"
                                        value={formData.phone || ''}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Info */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600"><Receipt className="w-6 h-6"/></div>
                            <h2 className="text-xl font-bold text-slate-800">Impuestos y Moneda</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Símbolo de Moneda</label>
                                <div className="relative">
                                    <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"/>
                                    <input 
                                        className="w-full pl-12 pr-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                        value={formData.currency}
                                        onChange={(e) => handleChange('currency', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tasa de Impuesto (Decimal)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors"
                                    value={formData.taxRate}
                                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                                />
                                <p className="text-xs text-slate-400 mt-2 font-medium">Ejemplo: 0.18 para 18% (IGV)</p>
                            </div>
                            <div className="col-span-full">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${formData.pricesIncludeTax ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                                        {formData.pricesIncludeTax && <div className="w-2 h-2 bg-white rounded-full"/>}
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={formData.pricesIncludeTax} 
                                        onChange={(e) => handleChange('pricesIncludeTax', e.target.checked)} 
                                    />
                                    <span className="font-bold text-slate-700">Los precios de mis productos ya incluyen impuestos</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* DANGER ZONE (Demo Reset) */}
                    <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-100 rounded-2xl text-red-600"><AlertTriangle className="w-6 h-6"/></div>
                            <h2 className="text-xl font-bold text-red-800">Zona de Peligro (Demo)</h2>
                        </div>
                        <p className="text-sm text-red-600/80 mb-6 font-medium">
                            Si eres usuario Demo, esto borrará todos tus datos locales y descargará la plantilla más reciente de la nube. Úsalo si no ves los productos actualizados.
                        </p>
                        <button 
                            onClick={handleFactoryReset}
                            className="px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4"/> Restaurar Datos de Fábrica
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};