import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Transaction, Product, CashShift, CashMovement } from '../types';
import { TrendingUp, DollarSign, Package, Users, Award, Wallet } from 'lucide-react';

interface AdminViewProps {
    transactions?: Transaction[];
    products?: Product[];
    shifts?: CashShift[];
    movements?: CashMovement[];
}

export const AdminView: React.FC<AdminViewProps> = ({ transactions = [], products = [], shifts = [] }) => {
    
    // 1. KPI Metrics
    const totalSales = transactions.reduce((acc, t) => acc + t.total, 0);
    const totalOrders = transactions.length;
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const lowStockCount = products.filter(p => p.stock < 10).length;

    // 2. Chart Data (Recent Activity)
    const chartData = transactions.slice(0, 30).map(t => ({
        time: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        total: t.total
    })).reverse();

    // 3. Top Best Sellers Logic
    const topProducts = useMemo(() => {
        const productMap: Record<string, { name: string, qty: number, total: number }> = {};
        
        transactions.forEach(t => {
            t.items.forEach(item => {
                if (!productMap[item.id]) {
                    productMap[item.id] = { name: item.name, qty: 0, total: 0 };
                }
                productMap[item.id].qty += item.quantity;
                productMap[item.id].total += item.quantity * item.price;
            });
        });

        return Object.values(productMap)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [transactions]);

    // 4. Payment Method Breakdown Logic
    const paymentStats = useMemo(() => {
        const stats = { cash: 0, digital: 0 };
        transactions.forEach(t => {
            if (t.payments) {
                t.payments.forEach(p => {
                    if (p.method === 'cash') stats.cash += p.amount;
                    else stats.digital += p.amount;
                });
            } else {
                if (t.paymentMethod === 'cash') stats.cash += t.total;
                else stats.digital += t.total;
            }
        });
        return [
            { name: 'Efectivo', value: stats.cash, color: '#10b981' }, // Emerald
            { name: 'Digital', value: stats.digital, color: '#6366f1' } // Indigo
        ];
    }, [transactions]);

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Dashboard</h1>
                        <p className="text-slate-500 font-medium">Visión estratégica de tu negocio</p>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40 group hover:border-indigo-100 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><DollarSign className="w-6 h-6"/></div>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Ventas Totales</p>
                            <h3 className="text-3xl font-black text-slate-800">S/{totalSales.toLocaleString()}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40 group hover:border-emerald-100 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><TrendingUp className="w-6 h-6"/></div>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Ticket Promedio</p>
                            <h3 className="text-3xl font-black text-slate-800">S/{avgTicket.toFixed(2)}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40 group hover:border-pink-100 transition-colors">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-pink-50 rounded-2xl text-pink-500"><Package className="w-6 h-6"/></div>
                            {lowStockCount > 0 && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">{lowStockCount} Alerta</span>}
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Productos</p>
                            <h3 className="text-3xl font-black text-slate-800">{products.length}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between h-40">
                         <div className="flex justify-between items-start">
                            <div className="p-3 bg-slate-100 rounded-2xl text-slate-600"><Users className="w-6 h-6"/></div>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Turnos</p>
                            <h3 className="text-3xl font-black text-slate-800">{shifts.length}</h3>
                        </div>
                    </div>
                </div>

                {/* MAIN CHARTS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                    
                    {/* CHART 1: Sales Trend */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500"/> Flujo de Ventas
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `S/${val}`} />
                                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                    <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* CHART 2: Top Products (Ranking) */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                         <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                             <Award className="w-5 h-5 text-amber-500"/> Top Productos
                         </h3>
                         <div className="space-y-4">
                             {topProducts.length === 0 ? (
                                 <p className="text-slate-400 text-sm text-center py-10">Sin ventas registradas aún</p>
                             ) : topProducts.map((p, i) => (
                                 <div key={i} className="flex items-center gap-4 group">
                                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${i===0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                         #{i+1}
                                     </div>
                                     <div className="flex-1">
                                         <p className="font-bold text-slate-800 text-sm truncate">{p.name}</p>
                                         <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                             <div className="h-full bg-indigo-500 rounded-full" style={{width: `${(p.qty / topProducts[0].qty) * 100}%`}}></div>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="font-black text-slate-700 text-sm">{p.qty} un.</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>

                {/* BOTTOM SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Payment Breakdown */}
                     <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                             <Wallet className="w-5 h-5 text-purple-500"/> Distribución de Pagos
                        </h3>
                        <div className="flex items-center gap-8">
                            <div className="h-48 w-48 shrink-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={paymentStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {paymentStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="font-black text-slate-300 text-xs uppercase">Pagos</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                {paymentStats.map((stat, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: stat.color}}></div>
                                            <span className="font-bold text-slate-600">{stat.name}</span>
                                        </div>
                                        <span className="font-black text-slate-800">S/{stat.value.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};