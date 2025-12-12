import React, { useState, useEffect } from 'react';
import { CartItem, StoreSettings, Customer, PaymentMethod, PaymentDetail } from '../types';
import { Trash2, CreditCard, Banknote, Minus, Plus, ShoppingBag, X, Zap, Smartphone, Check, Wand2, ChevronDown } from 'lucide-react';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onRemoveItem: (id: string, variantId?: string) => void;
  onUpdateDiscount: (id: string, discount: number, variantId?: string) => void;
  onCheckout: (method: string, payments: PaymentDetail[]) => void;
  onClearCart: () => void;
  settings: StoreSettings;
  customers: Customer[];
  onClose?: () => void; // Prop for mobile closing
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
      const currentVal = parseFloat(payAmounts[method] || '0');
      const newVal = (currentVal + remaining).toFixed(2);
      setPayAmounts(prev => ({ ...prev, [method]: newVal }));
  };

  const confirmPayment = () => {
      if (totalPaid < total - 0.01) { 
          alert('Falta cubrir el monto total');
          return;
      }
      const payments: PaymentDetail[] = [];
      let mainMethod = 'mixed';
      (Object.keys(payAmounts) as PaymentMethod[]).forEach(method => {
          const rawAmount = parseFloat(payAmounts[method] || '0');
          if (rawAmount > 0) {
              let finalAmount = rawAmount;
              if (method === 'cash' && change > 0) {
                  finalAmount = rawAmount - change;
              }
              if (finalAmount > 0) payments.push({ method, amount: finalAmount });
          }
      });
      if (payments.length === 1) mainMethod = payments[0].method;
      onCheckout(mainMethod, payments);
      setPaymentModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-teal-50 relative">
      
      {/* Mobile Handle / Close Button */}
      {onClose && (
        <div className="flex lg:hidden justify-center pt-2 pb-0" onClick={onClose}>
             <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-1"></div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-teal-50 flex justify-between items-center bg-teal-50/30">
        <h2 className="font-black text-xl text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600"/> Canasta
        </h2>
        
        <div className="flex items-center gap-2">
            {items.length > 0 && (
                <button onClick={onClearCart} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"><Trash2 className="w-5 h-5"/></button>
            )}
            {onClose && (
                <button onClick={onClose} className="lg:hidden text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors"><ChevronDown className="w-6 h-6"/></button>
            )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <ShoppingBag className="w-16 h-16 opacity-20"/>
                <p className="font-medium">Tu canasta está vacía</p>
                {onClose && <button onClick={onClose} className="text-indigo-600 font-bold text-sm">Volver al catálogo</button>}
            </div>
        ) : items.map((item, idx) => (
            <div 
                key={`${item.id}-${item.selectedVariantId || 'base'}-${idx}`} 
                className="bg-white border-l-4 border-transparent hover:border-l-indigo-500 border-y border-r border-slate-100 rounded-xl p-3 lg:p-4 shadow-sm hover:shadow-md transition-all group animate-fade-in-up"
            >
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-slate-700 leading-tight">{item.name}</h4>
                        {item.selectedVariantName && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg inline-block mt-1">{item.selectedVariantName}</span>}
                    </div>
                    <span className="font-bold text-slate-800">{settings.currency}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1">
                        <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, -1, item.selectedVariantId) : onRemoveItem(item.id, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500 hover:text-red-500 hover:shadow-md transition-all active:scale-90"><Minus className="w-4 h-4"/></button>
                        <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1, item.selectedVariantId)} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg shadow-sm text-white hover:bg-black hover:shadow-md transition-all active:scale-90"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                        {settings.currency}{item.price.toFixed(2)} c/u
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Footer Totals - INCREASED PADDING FOR MOBILE */}
      <div className={`p-4 lg:p-6 bg-slate-50 border-t border-slate-200 pb-20 lg:pb-6`}>
        <div className="space-y-2 mb-4 lg:mb-6">
            <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Subtotal</span>
                <span>{settings.currency}{subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
                <div className="flex justify-between text-slate-400 text-xs">
                    <span>IGV (18%)</span>
                    <span>{settings.currency}{tax.toFixed(2)}</span>
                </div>
            )}
            <div className="flex justify-between text-slate-800 text-2xl font-black pt-4 border-t border-slate-200">
                <span>Total</span>
                <span>{settings.currency}{total.toFixed(2)}</span>
            </div>
        </div>

        <button 
            onClick={() => setPaymentModalOpen(true)}
            disabled={items.length === 0}
            className="w-full py-3.5 lg:py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 text-base lg:text-lg"
        >
            <Banknote className="w-6 h-6"/>
            COBRAR
        </button>
      </div>

      {/* SPLIT PAYMENT MODAL */}
      {paymentModalOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 pb-12 sm:pb-8 shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-xl text-slate-800">Métodos de Pago</h3>
                      <button onClick={() => setPaymentModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><X className="w-5 h-5 text-slate-600"/></button>
                  </div>
                  
                  {/* Total Display */}
                  <div className="mb-8 text-center py-2">
                      <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] mb-1">TOTAL A PAGAR</p>
                      <p className="text-5xl font-black text-slate-800 tracking-tighter">{settings.currency}{total.toFixed(2)}</p>
                  </div>

                  {/* Payment Methods */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-4">
                      
                      {/* EFECTIVO */}
                      <div className="flex items-center gap-4 py-1">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                              <Banknote className="w-6 h-6"/>
                          </div>
                          <div className="flex-1 flex flex-col justify-center h-12">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider leading-none mb-1">Efectivo</p>
                              <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-xl outline-none text-slate-800 placeholder-slate-200 h-6" 
                                  placeholder="0.00"
                                  value={payAmounts.cash}
                                  onChange={e => handleAmountChange('cash', e.target.value)}
                              />
                          </div>
                          <button onClick={() => fillRemaining('cash')} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-300 hover:text-emerald-500 transition-colors" title="Autocompletar">
                              <Wand2 className="w-5 h-5"/>
                          </button>
                      </div>

                      {/* YAPE */}
                      <div className="flex items-center gap-4 py-1">
                          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                              <Smartphone className="w-6 h-6"/>
                          </div>
                          <div className="flex-1 flex flex-col justify-center h-12">
                              <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider leading-none mb-1">Yape</p>
                              <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-xl outline-none text-slate-800 placeholder-slate-200 h-6" 
                                  placeholder="0.00"
                                  value={payAmounts.yape}
                                  onChange={e => handleAmountChange('yape', e.target.value)}
                              />
                          </div>
                          <button onClick={() => fillRemaining('yape')} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-300 hover:text-purple-500 transition-colors" title="Autocompletar">
                              <Wand2 className="w-5 h-5"/>
                          </button>
                      </div>

                      {/* PLIN */}
                      <div className="flex items-center gap-4 py-1">
                          <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0 shadow-sm">
                              <Zap className="w-6 h-6"/>
                          </div>
                          <div className="flex-1 flex flex-col justify-center h-12">
                              <p className="text-[10px] font-black text-cyan-600 uppercase tracking-wider leading-none mb-1">Plin</p>
                              <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-xl outline-none text-slate-800 placeholder-slate-200 h-6" 
                                  placeholder="0.00"
                                  value={payAmounts.plin}
                                  onChange={e => handleAmountChange('plin', e.target.value)}
                              />
                          </div>
                          <button onClick={() => fillRemaining('plin')} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-300 hover:text-cyan-500 transition-colors" title="Autocompletar">
                              <Wand2 className="w-5 h-5"/>
                          </button>
                      </div>

                      {/* TARJETA */}
                      <div className="flex items-center gap-4 py-1">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 shadow-sm">
                              <CreditCard className="w-6 h-6"/>
                          </div>
                          <div className="flex-1 flex flex-col justify-center h-12">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider leading-none mb-1">Tarjeta</p>
                              <input 
                                  type="number" 
                                  className="w-full bg-transparent font-black text-xl outline-none text-slate-800 placeholder-slate-200 h-6" 
                                  placeholder="0.00"
                                  value={payAmounts.card}
                                  onChange={e => handleAmountChange('card', e.target.value)}
                              />
                          </div>
                          <button onClick={() => fillRemaining('card')} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors" title="Autocompletar">
                              <Wand2 className="w-5 h-5"/>
                          </button>
                      </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-6 border-t border-slate-100">
                      {remaining > 0 ? (
                          <div className="flex justify-between items-center mb-6">
                              <span className="text-sm font-bold text-slate-400">Restante</span>
                              <span className="text-xl font-black text-rose-500">{settings.currency}{remaining.toFixed(2)}</span>
                          </div>
                      ) : (
                           <div className="flex justify-between items-center mb-6">
                              <span className="text-sm font-bold text-slate-400">Vuelto</span>
                              <span className="text-2xl font-black text-emerald-500">{settings.currency}{change.toFixed(2)}</span>
                          </div>
                      )}
                      
                      <button 
                        onClick={confirmPayment}
                        className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${remaining > 0.01 ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] shadow-indigo-200'}`}
                        disabled={remaining > 0.01}
                      >
                          <Check className="w-6 h-6"/> Confirmar Pago
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};