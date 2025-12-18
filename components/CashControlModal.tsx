
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, X, Banknote, Smartphone, Clock, Lock, Rocket, DollarSign, ArrowUpCircle, Store, History } from 'lucide-react';

export const CashControlModal = ({ isOpen, onClose, activeShift, movements, transactions, onCashAction, currency }: any) => {
  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [cashAction, setCashAction] = useState<'OPEN' | 'CLOSE' | 'IN' | 'OUT'>('IN');

  useEffect(() => {
      if (isOpen) {
          setCashAction(activeShift ? 'IN' : 'OPEN');
          setCashAmount('');
          setCashDescription('');
      }
  }, [isOpen, activeShift]);

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
        console.error("Error calculating totals:", e);
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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
        <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-fade-in-up overflow-hidden border border-white/20">
            <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                    <Wallet className="w-5 h-5"/>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Control de Caja</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white">
                {activeShift ? (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="col-span-full sm:col-span-1 bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 relative overflow-hidden flex flex-col justify-center h-28">
                            <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><Banknote className="w-20 h-20 text-emerald-500"/></div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1 tracking-wider">EFECTIVO</p>
                            <h3 className="text-2xl font-black text-emerald-800 tracking-tight relative z-10">{currency}{totals.cash.toFixed(2)}</h3>
                        </div>
                        <div className="col-span-full sm:col-span-1 bg-purple-50 p-5 rounded-[2rem] border border-purple-100 relative overflow-hidden flex flex-col justify-center h-28">
                            <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><Smartphone className="w-20 h-20 text-purple-500"/></div>
                            <p className="text-[10px] font-bold text-purple-600 uppercase mb-1 tracking-wider">DIGITAL</p>
                            <h3 className="text-2xl font-black text-purple-800 tracking-tight relative z-10">{currency}{totals.digital.toFixed(2)}</h3>
                        </div>
                        <div className="col-span-full bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">FONDO INICIAL</p>
                              <p className="text-lg font-black text-slate-700">{currency}{totals.start.toFixed(2)}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-indigo-500"/>
                              {activeShift.startTime ? new Date(activeShift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center flex flex-col items-center justify-center animate-fade-in">
                        <div className="w-16 h-16 bg-white rounded-3xl shadow-lg border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
                          <Lock className="w-8 h-8"/>
                        </div>
                        <h4 className="font-black text-slate-800 text-lg">Caja Cerrada</h4>
                        <p className="text-slate-500 text-sm mt-1 max-w-[200px]">Debes realizar la apertura para empezar a vender.</p>
                    </div>
                )}
                
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 overflow-x-auto no-scrollbar">
                    {!activeShift ? (
                        <button onClick={() => setCashAction('OPEN')} className="flex-1 py-3.5 rounded-xl font-black text-xs bg-white text-indigo-600 shadow-sm transition-all uppercase tracking-widest">APERTURA DE CAJA</button>
                    ) : (
                        <>
                        <button onClick={() => setCashAction('IN')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest whitespace-nowrap ${cashAction === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>INGRESO</button>
                        <button onClick={() => setCashAction('OUT')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest whitespace-nowrap ${cashAction === 'OUT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>EGRESO</button>
                        <button onClick={() => setCashAction('CLOSE')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest whitespace-nowrap ${cashAction === 'CLOSE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>CERRAR</button>
                        </>
                    )}
                </div>

                <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm mb-6 relative overflow-hidden group focus-within:border-indigo-100 transition-colors">
                    <h3 className="font-black text-sm text-slate-800 mb-5 flex items-center gap-2.5 uppercase tracking-widest">
                        {cashAction === 'OPEN' && <><Rocket className="w-4 h-4 text-indigo-600"/> <span className="text-indigo-600">Monto Inicial</span></>}
                        {cashAction === 'IN' && <><DollarSign className="w-4 h-4 text-emerald-500"/> <span className="text-emerald-600">Nuevo Ingreso</span></>}
                        {cashAction === 'OUT' && <><ArrowUpCircle className="w-4 h-4 text-rose-500"/> <span className="text-rose-600">Registrar Gasto</span></>}
                        {cashAction === 'CLOSE' && <><Lock className="w-4 h-4 text-slate-800"/> <span className="text-slate-800">Monto de Cierre</span></>}
                    </h3>
                    <div className="space-y-4">
                        <div className="w-full">
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xl font-black">{currency}</span>
                              <input 
                                type="number" 
                                value={cashAmount} 
                                onChange={(e) => setCashAmount(e.target.value)} 
                                className="w-full pl-12 pr-4 py-4.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-800 outline-none font-black text-2xl text-slate-800 placeholder-slate-200 transition-all" 
                                placeholder="0.00" 
                                autoFocus
                              />
                            </div>
                        </div>
                        {cashAction !== 'OPEN' && (
                            <div className="w-full">
                                <input 
                                  type="text" 
                                  value={cashDescription} 
                                  onChange={(e) => setCashDescription(e.target.value)} 
                                  className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-slate-800 outline-none font-bold text-sm text-slate-700 placeholder-slate-300 transition-all" 
                                  placeholder={cashAction === 'CLOSE' ? 'Observaciones de cierre...' : 'Motivo del movimiento...'}
                                />
                            </div>
                        )}
                        <button onClick={handleSubmit} className="w-full py-4.5 rounded-2xl font-black text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 bg-slate-900 hover:bg-black uppercase tracking-widest text-xs">
                          {cashAction === 'OPEN' ? 'APERTURAR AHORA' : 'CONFIRMAR ACCIÓN'}
                        </button>
                    </div>
                </div>

                {activeShift && movements.some((m: any) => m.shiftId === activeShift.id) && (
                    <div className="animate-fade-in pb-4">
                        <h4 className="font-black text-slate-400 mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest"><History className="w-3.5 h-3.5"/> Movimientos de Turno</h4>
                        <div className="space-y-2">
                            {movements.filter((m: any) => m.shiftId === activeShift.id).sort((a: any,b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3).map((m: any) => (
                                <div key={m.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${m.type === 'OPEN' ? 'bg-indigo-100 text-indigo-600' : m.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : m.type === 'OUT' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'}`}>
                                            {m.type === 'OPEN' && <Store className="w-4 h-4"/>} {m.type === 'IN' && <DollarSign className="w-4 h-4"/>} {m.type === 'OUT' && <ArrowUpCircle className="w-4 h-4"/>} {m.type === 'CLOSE' && <Lock className="w-4 h-4"/>}
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{m.description}</p>
                                          <p className="text-[9px] text-slate-400 font-mono">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <span className={`font-black text-sm ${m.type === 'OUT' ? 'text-rose-500' : 'text-emerald-600'}`}>{m.type === 'OUT' ? '-' : '+'}{currency}{m.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
