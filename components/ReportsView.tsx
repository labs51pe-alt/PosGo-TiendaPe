import React, { useState, useMemo } from 'react';
import { Transaction, StoreSettings } from '../types';
import { Download, Calendar, Filter, DollarSign, CreditCard, Banknote, Search, ChevronDown, FileSpreadsheet, Smartphone } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsViewProps {
    transactions: Transaction[];
    settings: StoreSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions, settings }) => {
    const [dateRange, setDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('WEEK');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let filtered = transactions;

        // Date Filter
        if (dateRange === 'TODAY') {
            filtered = filtered.filter(t => new Date(t.date) >= startOfDay);
        } else if (dateRange === 'WEEK') {
            const startOfWeek = new Date(now.setDate(now.getDate() - 7));
            filtered = filtered.filter(t => new Date(t.date) >= startOfWeek);
        } else if (dateRange === 'MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            filtered = filtered.filter(t => new Date(t.date) >= startOfMonth);
        }

        // Search Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.id.includes(lower) || 
                t.paymentMethod.toLowerCase().includes(lower) ||
                t.items.some(i => i.name.toLowerCase().includes(lower))
            );
        }

        return filtered;
    }, [transactions, dateRange, searchTerm]);

    const stats = useMemo(() => {
        let total = 0;
        let cash = 0;
        let digital = 0; // Card + Yape + Plin

        filteredTransactions.forEach(t => {
            total += t.total;
            if (t.payments) {
                t.payments.forEach(p => {
                    if (p.method === 'cash') cash += p.amount;
                    else digital += p.amount;
                });
            } else {
                // Fallback for old data
                if (t.paymentMethod === 'cash') cash += t.total;
                else digital += t.total;
            }
        });

        return {
            total,
            count: filteredTransactions.length,
            cash,
            digital
        };
    }, [filteredTransactions]);

    const handleExport = () => {
        const data = filteredTransactions.map(t => {
            const methods = t.payments ? t.payments.map(p => `${p.method}: ${p.amount}`).join(', ') : t.paymentMethod;
            return {
                ID: t.id,
                Fecha: new Date(t.date).toLocaleString(),
                Metodo: methods,
                Subtotal: t.subtotal,
                Impuestos: t.tax,
                Descuento: t.discount,
                Total: t.total,
                Items: t.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Reporte Ventas");
        XLSX.writeFile(wb, `Reporte_Ventas_${dateRange}.xlsx`);
    };

    return (
        <div className="p-8 h-full flex flex-col bg-[#f8fafc]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Reportes de Venta</h1>
                    <p className="text-slate-500 font-medium">Análisis detallado de transacciones</p>
                </div>
                <button onClick={handleExport} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" /> Exportar Excel
                </button>
            </div>

            {/* Filters & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 col-span-1 lg:col-span-4 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                        {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
                            <button 
                                key={r}
                                onClick={() => setDateRange(r)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${dateRange === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {r === 'TODAY' && 'Hoy'}
                                {r === 'WEEK' && '7 Días'}
                                {r === 'MONTH' && 'Este Mes'}
                                {r === 'ALL' && 'Todo'}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
                        <input 
                            type="text" 
                            placeholder="Buscar ticket, producto..." 
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-slate-400 font-bold text-sm text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ventas Totales</span>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-xl text-violet-600"><DollarSign className="w-5 h-5"/></div>
                        <span className="text-2xl font-black text-slate-800">{settings.currency}{stats.total.toLocaleString()}</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transacciones</span>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><FileSpreadsheet className="w-5 h-5"/></div>
                        <span className="text-2xl font-black text-slate-800">{stats.count}</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Efectivo</span>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600"><Banknote className="w-5 h-5"/></div>
                        <span className="text-2xl font-black text-slate-800">{settings.currency}{stats.cash.toLocaleString()}</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Digitales (Tarjeta/Apps)</span>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-xl text-slate-600"><Smartphone className="w-5 h-5"/></div>
                        <span className="text-2xl font-black text-slate-800">{settings.currency}{stats.digital.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-xs font-bold text-slate-400 uppercase sticky top-0 z-10">
                            <tr>
                                <th className="p-6">ID Ticket</th>
                                <th className="p-6">Fecha y Hora</th>
                                <th className="p-6">Métodos</th>
                                <th className="p-6">Detalle</th>
                                <th className="p-6 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6 font-mono text-xs text-slate-500">#{t.id.slice(-6)}</td>
                                    <td className="p-6">
                                        <div className="font-bold text-slate-700">{new Date(t.date).toLocaleDateString()}</div>
                                        <div className="text-xs text-slate-400">{new Date(t.date).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="p-6">
                                        {t.payments ? (
                                            <div className="flex flex-wrap gap-1">
                                                {t.payments.map((p, i) => (
                                                    <span key={i} className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase
                                                        ${p.method === 'cash' ? 'bg-emerald-50 text-emerald-600' : 
                                                          p.method === 'yape' ? 'bg-purple-50 text-purple-600' :
                                                          p.method === 'plin' ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-600'}
                                                    `}>
                                                        {p.method}: {settings.currency}{p.amount.toFixed(2)}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                                {t.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        <div className="text-sm text-slate-600 max-w-xs truncate">
                                            {t.items.map(i => `${i.quantity} ${i.name}`).join(', ')}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right font-black text-slate-800">
                                        {settings.currency}{t.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400">
                                        No se encontraron transacciones en este periodo.
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