
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, X, Banknote, Smartphone, Clock, Lock, Rocket, DollarSign, ArrowUpCircle, Store, History, CheckCircle2, Zap, Coins } from 'lucide-react';

export const CashControlModal = ({ isOpen, onClose, activeShift, movements, transactions, onCashAction, currency }: any) => {
  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [cashAction, setCashAction] = useState<'OPEN' | 'CLOSE' | 'IN' | 'OUT'>('OPEN');

  useEffect(() => {
      if (isOpen) {
          setCashAction(activeShift ? 'IN' : 'OPEN');
          setCashAmount('');
          setCashDescription('');
      }
  }, [isOpen, activeShift]);

  const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

  const totals = useMemo(() => {
    if (!activeShift) return { cash: 0, digital: 0, start: 0 };
    try {
        const shiftId = activeShift.id;
        const shiftMoves = movements.filter((m: any) => m.shiftId === shiftId);
        const shiftTrans = transactions.filter((t: any) => t.shiftId === shiftId);
        
        const start = activeShift.startAmount || 0;
        let cash = start;
        let digital = 0;

        shiftTrans.forEach((t: any) => {
            if (t.payments) {
                t.payments.forEach((p: any) => {
                    if (p.method === 'cash') cash += (p.amount || 0);
                    else digital += (p.amount || 0);
                });
            } else {
                if (t.paymentMethod === 'cash') cash += (t.total || 0);
                else digital += (t.total || 0);
            }
        });

        shiftMoves.forEach((m: any) => {
            const amt = m.amount || 0;
            if (m.type === 'IN') cash += amt;
            if (m.type === 'OUT') cash -= amt;
        });

        return { cash, digital, start };
    } catch (e) {
        return { cash: 0, digital: 0, start: 0 };
    }
  }, [activeShift, movements, transactions]);

  const handleSubmit = () => {
      const amountVal = cashAmount === '' ? NaN : parseFloat(cashAmount);
      if (isNaN(amountVal) && cashAction !== 'CLOSE') {
          if (cashAction === 'OPEN' && cashAmount === '0') { /* Valid 0 */ } 
          else { alert('Por favor, ingresa un monto válido.'); return; }
      }
      const finalAmount = isNaN(amountVal) ? 0 : amountVal;
      onCashAction(cashAction, finalAmount, cashDescription);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
        <div className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-full max-w-lg max-h-[92vh] flex flex-col animate-fade-in-up overflow-hidden border border-white/20">
            
            {/* Header Modernizado - Más compacto en móvil */}
            <div className="p-5 sm:p-8 border-b border-slate-50 bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6"/>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Control de Caja</h2>
                    <p className="text-[9px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{activeShift ? 'Turno en curso' : 'Preparado para iniciar'}</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-300 hover:text-slate-600">
                    <X className="w-6 h-6"/>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-white space-y-6 sm:space-y-8">
                {activeShift ? (
                    /* VISTA CUANDO LA CAJA ESTÁ ABIERTA */
                    <div className="space-y-5 sm:space-y-6">
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                                <div className="absolute right-[-10px] bottom-[-10px] opacity-20 group-hover:scale-110 transition-transform"><Banknote className="w-16 h-16 sm:w-24 sm:h-24"/></div>
                                <p className="text-[9px] sm:text-[10px] font-black uppercase mb-1 tracking-widest opacity-80">En Caja</p>
                                <h3 className="text-xl sm:text-3xl font-black tracking-tighter">{currency}{totals.cash.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
                            </div>
                            <div className="bg-white p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-slate-100 flex flex-col justify-center shadow-sm">
                                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest text-center">Digital</p>
                                <h3 className="text-lg sm:text-2xl font-black text-indigo-600 text-center tracking-tighter">{currency}{totals.digital.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
                            </div>
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl sm:rounded-2xl">
                            <button onClick={() => setCashAction('IN')} className={`flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs transition-all tracking-wider ${cashAction === 'IN' ? 'bg-white text-emerald-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>INGRESO</button>
                            <button onClick={() => setCashAction('OUT')} className={`flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs transition-all tracking-wider ${cashAction === 'OUT' ? 'bg-white text-rose-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>EGRESO</button>
                            <button onClick={() => setCashAction('CLOSE')} className={`flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs transition-all tracking-wider ${cashAction === 'CLOSE' ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>CERRAR</button>
                        </div>
                    </div>
                ) : (
                    /* VISTA PREMIUM DE CAJA CERRADA - Más compacta en móvil */
                    <div className="text-center space-y-4 sm:space-y-6 animate-fade-in">
                        <div className="relative inline-block">
                             <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-50 rounded-2xl sm:rounded-[2.5rem] border-2 border-slate-100 flex items-center justify-center mx-auto text-slate-300">
                                <Lock className="w-7 h-7 sm:w-10 sm:h-10"/>
                             </div>
                             <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-emerald-500 text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg border-2 sm:border-4 border-white">
                                <Zap className="w-3 h-3 sm:w-4 sm:h-4 fill-current"/>
                             </div>
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900">Apertura de Turno</h3>
                            <p className="text-slate-400 font-medium text-xs sm:text-sm mt-1 px-4 sm:px-10 leading-snug">Ingresa el fondo de caja inicial para comenzar a registrar ventas.</p>
                        </div>
                    </div>
                )}
                
                {/* Panel de Inputs con Botones Rápidos - Optimizado para móvil */}
                <div className="bg-slate-50/50 border-2 border-slate-100 rounded-[2.5rem] sm:rounded-[3rem] p-5 sm:p-8 space-y-5 sm:space-y-6 relative overflow-hidden group focus-within:border-indigo-200 transition-all">
                    <div className="flex items-center justify-between mb-1 px-1">
                        <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             {cashAction === 'OPEN' ? <Rocket className="w-3.5 h-3.5 text-indigo-500"/> : <Coins className="w-3.5 h-3.5 text-emerald-500"/>}
                             {cashAction === 'OPEN' ? 'MONTO APERTURA' : cashAction === 'IN' ? 'INGRESO EXTRA' : cashAction === 'OUT' ? 'EGRESO' : 'CIERRE'}
                        </label>
                        {cashAction === 'OPEN' && <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">SUG: {currency}20</span>}
                    </div>

                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-2xl sm:text-3xl font-black tracking-tighter">{currency}</span>
                        <input 
                            type="number" 
                            value={cashAmount} 
                            onChange={(e) => setCashAmount(e.target.value)} 
                            className="w-full pl-12 sm:pl-16 pr-6 py-4 sm:py-6 bg-white border-2 border-transparent rounded-2xl sm:rounded-[2rem] focus:border-indigo-500 outline-none font-black text-3xl sm:text-4xl text-slate-800 placeholder-slate-200 shadow-inner transition-all" 
                            placeholder="0.00" 
                            inputMode="decimal"
                            autoFocus
                        />
                    </div>

                    {/* Grilla de Montos Rápidos - Mejorada para móvil (3 columnas) */}
                    {cashAction !== 'CLOSE' && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            {QUICK_AMOUNTS.map(amt => (
                                <button 
                                    key={amt}
                                    onClick={() => setCashAmount(amt.toString())}
                                    className="py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"
                                >
                                    +{currency}{amt}
                                </button>
                            ))}
                        </div>
                    )}

                    {cashAction !== 'OPEN' && (
                        <div className="pt-1">
                            <input 
                              type="text" 
                              value={cashDescription} 
                              onChange={(e) => setCashDescription(e.target.value)} 
                              className="w-full p-4 sm:p-5 bg-white border-2 border-transparent rounded-xl sm:rounded-2xl focus:border-indigo-400 outline-none font-bold text-xs sm:text-sm text-slate-700 placeholder-slate-300 transition-all shadow-inner" 
                              placeholder={cashAction === 'CLOSE' ? 'Notas del turno...' : 'Descripción...'}
                            />
                        </div>
                    )}

                    <button 
                        onClick={handleSubmit} 
                        className="w-full py-5 sm:py-6 rounded-2xl sm:rounded-[2rem] font-black text-white shadow-2xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 bg-slate-900 hover:bg-black uppercase tracking-[0.2em] text-[10px] sm:text-xs flex items-center justify-center gap-3"
                    >
                      {cashAction === 'OPEN' ? <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-amber-400"/> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400"/>}
                      {cashAction === 'OPEN' ? 'APERTURAR AHORA' : 'CONFIRMAR OPERACIÓN'}
                    </button>
                </div>

                {/* Historial Corto - Más compacto */}
                {activeShift && movements.some((m: any) => m.shiftId === activeShift.id) && (
                    <div className="pt-2 animate-fade-in">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                                <History className="w-3.5 h-3.5 text-indigo-500"/> Actividad Reciente
                            </h4>
                        </div>
                        <div className="space-y-2">
                            {movements
                                .filter((m: any) => m.shiftId === activeShift.id)
                                .sort((a: any,b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .slice(0, 2)
                                .map((m: any) => (
                                <div key={m.id} className="flex justify-between items-center p-3 sm:p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${m.type === 'OPEN' ? 'bg-indigo-100 text-indigo-600' : m.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : m.type === 'OUT' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'}`}>
                                            {m.type === 'OPEN' ? <Store className="w-3.5 h-3.5"/> : m.type === 'OUT' ? <ArrowUpCircle className="w-3.5 h-3.5"/> : <DollarSign className="w-3.5 h-3.5"/>}
                                        </div>
                                        <div>
                                          <p className="font-black text-slate-800 text-[10px] truncate max-w-[120px] sm:max-w-[150px]">{m.description}</p>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <span className={`font-black text-xs sm:text-sm ${m.type === 'OUT' ? 'text-rose-500' : 'text-emerald-600'}`}>
                                        {m.type === 'OUT' ? '-' : '+'}{currency}{m.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Footer de información rápida - Compacto para móvil */}
            {activeShift && (
                <div className="p-4 sm:p-6 bg-slate-900 text-slate-400 border-t border-white/5 flex justify-between items-center px-6 sm:px-10">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-500"/>
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Iniciado: {new Date(activeShift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest hidden sm:block">ID: {activeShift.id.slice(-6).toUpperCase()}</span>
                </div>
            )}
        </div>
    </div>
  );
};
