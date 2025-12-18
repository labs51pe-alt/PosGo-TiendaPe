
import React, { useState, useEffect } from 'react';
import { CartItem, StoreSettings, Customer, PaymentMethod, PaymentDetail } from '../types';
import { Trash2, CreditCard, Banknote, Minus, Plus, ShoppingBag, X, Zap, Smartphone, Check, Wand2, ChevronDown, DollarSign, Wallet } from 'lucide-react';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onRemoveItem: (id: string, variantId?: string) => void;
  onUpdateDiscount: (id: string, discount: number, variantId?: string) => void;
  onCheckout: (method: string, payments: PaymentDetail[]) => void;
  onClearCart: () => void;
  settings: StoreSettings;
  customers: Customer[];
  onClose?: () => void;
}

export const Cart: React.FC<CartProps> = ({ items, onUpdateQuantity, onRemoveItem, onCheckout, onClearCart, settings, onClose }) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Payment States
  const [payAmounts, setPayAmounts] = useState<{ [key in PaymentMethod]?: string }>({
      cash: '',
      yape: '',
      plin: '',
      card: ''
  });

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
  const total = Math.max(0, subtotal - totalDiscount);
  const tax = settings.pricesIncludeTax ? (total - (total / (1 + settings.taxRate))) : (total * settings.taxRate);
  
  useEffect(() => {
      if(paymentModalOpen) {
          setPayAmounts({ cash: '', yape: '', plin: '', card: '' });
      }
  }, [paymentModalOpen]);

  const totalPaid = Object.values(payAmounts).reduce<number>((acc, val) => acc + (parseFloat((val as string) || '0') || 0), 0);
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);

  const handleAmountChange = (method: PaymentMethod, value: string) => {
      setPayAmounts(prev => ({ ...prev, [method]: value }));
  };

  const fillRemaining = (method: PaymentMethod) => {
      setPayAmounts({ [method]: total.toFixed(2) });
  };

  const confirmPayment = () => {
      if (totalPaid < total - 0.01) { 
          alert('El monto pagado es insuficiente para cubrir el total.');
          return;
      }
      const payments: PaymentDetail[] = [];
      let mainMethod = 'mixed';
      (Object.keys(payAmounts) as PaymentMethod[]).forEach(method => {
          const rawAmount = parseFloat(payAmounts[method] || '0');
          if (rawAmount > 0) {
              let finalAmount = rawAmount;
              // Si es efectivo y hay vuelto, ajustamos el monto real de la transacción
              if (method === 'cash' && change > 0) {
                  finalAmount = Math.max(0, rawAmount - change);
              }
              if (finalAmount > 0) payments.push({ method, amount: finalAmount });
          }
      });
      if (payments.length === 1) mainMethod = payments[0].method;
      
      onCheckout(mainMethod, payments);
      setPaymentModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      
      {/* Mobile Handle */}
      {onClose && (
        <div className="flex lg:hidden justify-center pt-2 pb-0" onClick={onClose}>
             <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-1"></div>
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h2 className="font-black text-xl text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600"/> Mi Canasta
        </h2>
        
        <div className="flex items-center gap-2">
            {items.length > 0 && (
                <button onClick={onClearCart} title="Vaciar canasta" className="text-slate-400 hover:text-rose-500 p-2 rounded-xl transition-colors"><Trash2 className="w-5 h-5"/></button>
            )}
            {onClose && (
                <button onClick={onClose} className="lg:hidden text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors"><ChevronDown className="w-6 h-6"/></button>
            )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/30">
        {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    <ShoppingBag className="w-10 h-10 opacity-20"/>
                </div>
                <p className="font-bold text-slate-400">Canasta vacía</p>
                {onClose && <button onClick={onClose} className="text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-xl">Ir a comprar</button>}
            </div>
        ) : items.map((item, idx) => (
            <div 
                key={`${item.id}-${item.selectedVariantId || 'base'}-${idx}`} 
                className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm hover:shadow-md transition-all group animate-fade-in-up"
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 pr-4">
                        <h4 className="font-black text-slate-800 leading-tight truncate">{item.name}</h4>
                        {item.selectedVariantName && <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1 uppercase tracking-wider">{item.selectedVariantName}</span>}
                    </div>
                    <span className="font-black text-slate-900 text-sm whitespace-nowrap">{settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, -1, item.selectedVariantId) : onRemoveItem(item.id, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400 hover:text-rose-500 transition-all"><Minus className="w-3.5 h-3.5"/></button>
                        <span className="font-black text-slate-700 text-xs w-6 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-slate-900 rounded-lg shadow-sm text-white hover:bg-black transition-all"><Plus className="w-3.5 h-3.5"/></button>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">
                        {settings.currency}{item.price.toFixed(2)} c/u
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Footer Totals */}
      <div className="p-6 bg-white border-t border-slate-100 pb-24 lg:pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <div className="space-y-2.5 mb-6">
            <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-widest">
                <span>Subtotal</span>
                <span>{settings.currency}{subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
                <div className="flex justify-between text-slate-400 text-[10px] font-medium italic">
                    <span>Impuestos ({settings.taxRate * 100}%)</span>
                    <span>{settings.currency}{tax.toFixed(2)}</span>
                </div>
            )}
            <div className="flex justify-between text-slate-900 pt-4 border-t border-slate-100">
                <span className="text-sm font-black uppercase tracking-wider">Total a Cobrar</span>
                <span className="text-3xl font-black tracking-tighter">{settings.currency}{total.toFixed(2)}</span>
            </div>
        </div>

        <button 
            onClick={() => setPaymentModalOpen(true)}
            disabled={items.length === 0}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:grayscale text-white rounded-[1.8rem] font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg tracking-tight group"
        >
            <Banknote className="w-6 h-6 group-hover:rotate-12 transition-transform"/>
            CONTINUAR AL PAGO
        </button>
      </div>

      {/* PAYMENT INTERFACE MODAL */}
      {paymentModalOpen && (
          <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 pb-12 sm:pb-10 shadow-2xl animate-fade-in-up flex flex-col max-h-[92vh] border border-white/20">
                  
                  {/* Modal Header */}
                  <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Wallet className="w-6 h-6"/>
                        </div>
                        <h3 className="font-black text-2xl text-slate-800 tracking-tight">Finalizar Venta</h3>
                      </div>
                      <button onClick={() => setPaymentModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-rose-50 flex items-center justify-center transition-all group"><X className="w-5 h-5 text-slate-400 group-hover:text-rose-500"/></button>
                  </div>
                  
                  {/* Total Amount Card */}
                  <div className="mb-10 text-center p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-200/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-20 h-20 text-white"/></div>
                      <p className="text-indigo-400 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Total de la Operación</p>
                      <p className="text-6xl font-black text-white tracking-tighter">{settings.currency}{total.toFixed(2)}</p>
                  </div>

                  {/* Payment Shortcuts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                        <button onClick={() => fillRemaining('cash')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                            <Banknote className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform"/>
                            <span className="text-[10px] font-black text-slate-500 group-hover:text-emerald-600">EFECTIVO</span>
                        </button>
                        <button onClick={() => fillRemaining('yape')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-purple-50 hover:border-purple-200 transition-all group">
                            <Smartphone className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform"/>
                            <span className="text-[10px] font-black text-slate-500 group-hover:text-purple-600">YAPE</span>
                        </button>
                        <button onClick={() => fillRemaining('plin')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-cyan-50 hover:border-cyan-200 transition-all group">
                            <Zap className="w-5 h-5 text-cyan-500 group-hover:scale-110 transition-transform"/>
                            <span className="text-[10px] font-black text-slate-500 group-hover:text-cyan-600">PLIN</span>
                        </button>
                        <button onClick={() => fillRemaining('card')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group">
                            <CreditCard className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform"/>
                            <span className="text-[10px] font-black text-slate-500 group-hover:text-indigo-600">TARJETA</span>
                        </button>
                  </div>

                  {/* Payment Inputs Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 mb-8">
                      {/* EFECTIVO */}
                      <div className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all ${parseFloat(payAmounts.cash || '0') > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50/50 border-transparent'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${parseFloat(payAmounts.cash || '0') > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}><Banknote className="w-5 h-5"/></div>
                          <div className="flex-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Efectivo Recibido</p>
                              <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-xl outline-none text-slate-800 placeholder-slate-200" 
                                  placeholder="0.00"
                                  value={payAmounts.cash}
                                  onChange={e => handleAmountChange('cash', e.target.value)}
                              />
                          </div>
                          {parseFloat(payAmounts.cash || '0') > 0 && <Check className="w-5 h-5 text-emerald-500"/>}
                      </div>

                      {/* OTROS METODOS (Compacto) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* YAPE INPUT */}
                        <div className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${parseFloat(payAmounts.yape || '0') > 0 ? 'bg-purple-50 border-purple-200' : 'bg-slate-50/50 border-transparent'}`}>
                            <Smartphone className="w-4 h-4 text-purple-500"/>
                            <input type="number" placeholder="Yape" className="w-full bg-transparent font-black text-sm outline-none" value={payAmounts.yape} onChange={e => handleAmountChange('yape', e.target.value)}/>
                        </div>
                        {/* PLIN INPUT */}
                        <div className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${parseFloat(payAmounts.plin || '0') > 0 ? 'bg-cyan-50 border-cyan-200' : 'bg-slate-50/50 border-transparent'}`}>
                            <Zap className="w-4 h-4 text-cyan-500"/>
                            <input type="number" placeholder="Plin" className="w-full bg-transparent font-black text-sm outline-none" value={payAmounts.plin} onChange={e => handleAmountChange('plin', e.target.value)}/>
                        </div>
                        {/* CARD INPUT */}
                        <div className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all col-span-full ${parseFloat(payAmounts.card || '0') > 0 ? 'bg-slate-100 border-slate-300' : 'bg-slate-50/50 border-transparent'}`}>
                            <CreditCard className="w-4 h-4 text-slate-500"/>
                            <input type="number" placeholder="Monto en Tarjeta" className="w-full bg-transparent font-black text-sm outline-none" value={payAmounts.card} onChange={e => handleAmountChange('card', e.target.value)}/>
                        </div>
                      </div>
                  </div>

                  {/* Summary & Footer Action */}
                  <div className="pt-6 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-6 px-2">
                        {remaining > 0.01 ? (
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Pendiente: {settings.currency}{remaining.toFixed(2)}</span>
                            </div>
                        ) : (
                             <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Vuelto: {settings.currency}{change.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 block uppercase mb-1">Total Pagado</span>
                            <span className="text-xl font-black text-slate-800">{settings.currency}{totalPaid.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={confirmPayment}
                        disabled={remaining > 0.01}
                        className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${remaining > 0.01 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-black text-white shadow-slate-200'}`}
                      >
                          {remaining <= 0.01 ? (
                              <><Check className="w-6 h-6 stroke-[3px] text-emerald-400"/> CONFIRMAR Y GENERAR TICKET</>
                          ) : 'COMPLETAR EL PAGO'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
