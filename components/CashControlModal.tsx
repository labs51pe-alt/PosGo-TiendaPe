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
        <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-3"><Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-slate-700"/> Control de Caja</h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white">
                {activeShift ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        <div className="bg-emerald-50 p-5 sm:p-6 rounded-[2rem] border border-emerald-100 relative overflow-hidden flex flex-col justify-center h-28 sm:h-36">
                            <div className="absolute right-[-10px] bottom-[-10px] opacity-20"><Banknote className="w-24 h-24 text-emerald-500"/></div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1 tracking-wider">EFECTIVO EN CAJA</p>
                            <h3 className="text-3xl sm:text-4xl font-black text-emerald-800 tracking-tight relative z-10">{currency}{totals.cash.toFixed(2)}</h3>
                        </div>
                        <div className="bg-purple-50 p-5 sm:p-6 rounded-[2rem] border border-purple-100 relative overflow-hidden flex flex-col justify-center h-28 sm:h-36">
                            <div className="absolute right-[-10px] bottom-[-10px] opacity-20"><Smartphone className="w-24 h-24 text-purple-500"/></div>
                            <p className="text-[10px] font-bold text-purple-600 uppercase mb-1 tracking-wider">DIGITALES</p>
                            <h3 className="text-3xl sm:text-4xl font-black text-purple-800 tracking-tight relative z-10">{currency}{totals.digital.toFixed(2)}</h3>
                        </div>
                        <div className="bg-white p-5 sm:p-6 rounded-[2rem] border border-slate-200 flex flex-col justify-center items-center text-center h-28 sm:h-36 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">INICIO</p>
                            <p className="text-2xl sm:text-3xl font-black text-slate-700">{currency}{totals.start.toFixed(2)}</p>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-mono bg-slate-100 px-2 py-1 rounded-lg"><Clock className="w-3 h-3"/>{activeShift.startTime ? new Date(activeShift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-center flex flex-col items-center justify-center">
                        <Lock className="w-12 h-12 text-slate-300 mb-2"/><p className="text-slate-500 font-medium">Caja cerrada.</p>
                    </div>
                )}
                
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 overflow-x-auto">
                    {!activeShift ? (
                        <button onClick={() => setCashAction('OPEN')} className="flex-1 py-3 rounded-xl font-bold text-xs md:text-sm bg-white text-emerald-600 shadow-sm transition-all uppercase tracking-wide">APERTURA</button>
                    ) : (
                        <>
                        <button onClick={() => setCashAction('IN')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs md:text-sm transition-all uppercase tracking-wide whitespace-nowrap ${cashAction === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>INGRESO</button>
                        <button onClick={() => setCashAction('OUT')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs md:text-sm transition-all uppercase tracking-wide whitespace-nowrap ${cashAction === 'OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>SALIDA</button>
                        <button onClick={() => setCashAction('CLOSE')} className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs md:text-sm transition-all uppercase tracking-wide whitespace-nowrap ${cashAction === 'CLOSE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>CIERRE</button>
                        </>
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
                    <h3 className="font-black text-lg sm:text-xl text-slate-800 mb-6 flex items-center gap-3">
                        {cashAction === 'OPEN' && <><Rocket className="w-6 h-6 text-emerald-600"/> <span className="text-emerald-600">Iniciar Turno</span></>}
                        {cashAction === 'IN' && <><span className="text-2xl">💰</span> <span className="text-emerald-600">Registrar Ingreso</span></>}
                        {cashAction === 'OUT' && <><ArrowUpCircle className="w-6 h-6 text-red-600"/> <span className="text-red-600">Registrar Gasto</span></>}
                        {cashAction === 'CLOSE' && <><Lock className="w-6 h-6 text-slate-800"/> <span className="text-slate-800">Cerrar Caja</span></>}
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Monto</label>
                            <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">{currency}</span><input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 outline-none font-bold text-2xl text-slate-700 placeholder-slate-300 transition-colors" placeholder="0.00" autoFocus/></div>
                        </div>
                        {cashAction !== 'OPEN' && (
                            <div className="w-full md:flex-[2]">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Motivo</label>
                                <input type="text" value={cashDescription} onChange={(e) => setCashDescription(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-slate-800 outline-none font-bold text-lg text-slate-700 placeholder-slate-300 transition-colors" placeholder={cashAction === 'CLOSE' ? 'Observaciones...' : 'Ej. Proveedores'}/>
                            </div>
                        )}
                        <button onClick={handleSubmit} className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 bg-slate-900 hover:bg-black uppercase tracking-wide text-sm">CONFIRMAR</button>
                    </div>
                </div>

                {activeShift && (
                    <div className="animate-fade-in-up pb-10" style={{animationDelay: '100ms'}}>
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><History className="w-4 h-4"/> Historial Reciente</h4>
                        <div className="space-y-3">
                            {movements.filter((m: any) => m.shiftId === activeShift.id).sort((a: any,b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5).map((m: any) => (
                                <div key={m.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${m.type === 'OPEN' ? 'bg-blue-100 text-blue-600' : m.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : m.type === 'OUT' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {m.type === 'OPEN' && <Store className="w-5 h-5"/>} {m.type === 'IN' && <DollarSign className="w-5 h-5"/>} {m.type === 'OUT' && <ArrowUpCircle className="w-5 h-5"/>} {m.type === 'CLOSE' && <Lock className="w-5 h-5"/>}
                                        </div>
                                        <div><p className="font-bold text-slate-800 text-sm">{m.description}</p><p className="text-xs text-slate-400 font-mono mt-0.5">{new Date(m.timestamp).toLocaleTimeString()}</p></div>
                                    </div>
                                    <span className={`font-mono font-bold text-lg ${m.type === 'OUT' ? 'text-red-500' : 'text-emerald-600'}`}>{m.type === 'OUT' ? '-' : '+'}{currency}{m.amount.toFixed(2)}</span>
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