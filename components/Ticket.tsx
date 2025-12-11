import React, { useRef, useState } from 'react';
import { Transaction, StoreSettings, CashShift } from '../types';
import { Printer, X, CheckCircle, Rocket, Share2, Download, FileText, RefreshCw, MapPin, Phone, MessageCircle, Send, ChevronDown, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { supabase } from '../services/supabase';
import { COUNTRIES } from '../constants';

interface TicketProps {
    type: 'SALE' | 'REPORT';
    data: any;
    settings: StoreSettings;
    onClose: () => void;
}

export const Ticket: React.FC<TicketProps> = ({ type, data, settings, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    
    // Estados para WhatsApp
    const [countryCode, setCountryCode] = useState('51');
    const [whatsappPhone, setWhatsappPhone] = useState('');
    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

    const currentCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

    // --- GENERACIÓN DE PDF PROFESIONAL (DEVUELVE DOCUMENTO) ---
    const createPDFDoc = (): jsPDF => {
        // Configuración: 80mm ancho, largo dinámico (usamos 297mm A4 como base, pero el contenido fluye)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 297] 
        });

        // Variables de Cursor y Diseño
        let y = 5; 
        const margin = 4;
        const width = 80;
        const contentWidth = width - (margin * 2);
        
        // --- HELPERS ---
        const drawSeparator = () => {
            y += 2;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.1);
            // Cast to any to avoid TS error: Property 'setLineDash' does not exist on type 'jsPDF'
            (doc as any).setLineDash([1, 1], 0);
            doc.line(margin, y, width - margin, y);
            y += 4;
            (doc as any).setLineDash([], 0); // Reset
        };

        const centerText = (text: string, size = 10, bold = false, font = 'helvetica') => {
            doc.setFont(font, bold ? 'bold' : 'normal');
            doc.setFontSize(size);
            const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
            const x = (width - textWidth) / 2;
            doc.text(text, x, y);
            y += (size / 2) + 1.5;
        };

        const leftRightText = (left: string, right: string, size = 9, bold = false) => {
            doc.setFont('courier', bold ? 'bold' : 'normal');
            doc.setFontSize(size);
            doc.text(left, margin, y);
            
            const rightWidth = doc.getStringUnitWidth(right) * size / doc.internal.scaleFactor;
            doc.text(right, width - margin - rightWidth, y);
            y += (size / 2) + 2;
        };

        // --- 1. CABECERA ---
        // Logo Simulado (Caja Negra con Texto)
        doc.setFillColor(20, 20, 20);
        doc.rect(0, 0, width, 18, 'F'); // Header negro
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text("PosGo!", width / 2, 10, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.name.toUpperCase(), width / 2, 15, { align: 'center' });

        y = 24; // Reset Y debajo del header negro
        doc.setTextColor(0, 0, 0);

        // Datos de la tienda
        centerText(settings.address || 'Dirección Principal', 8, false, 'courier');
        centerText(`Tel: ${settings.phone || '-'}`, 8, false, 'courier');
        
        const dateObj = type === 'SALE' 
            ? new Date((data as Transaction).date)
            : new Date((data.shift as CashShift).endTime || new Date());
            
        centerText(`${dateObj.toLocaleDateString()} - ${dateObj.toLocaleTimeString()}`, 8, false, 'courier');

        if (type === 'SALE') {
            const t = data as Transaction;
            y += 2;
            centerText(`TICKET DE VENTA`, 10, true, 'helvetica');
            centerText(`#${t.id.slice(-8).toUpperCase()}`, 10, true, 'courier');
        } else {
            y += 2;
            centerText(`REPORTE DE CIERRE`, 10, true, 'helvetica');
        }

        drawSeparator();

        // --- 2. CUERPO (ITEMS) ---
        if (type === 'SALE') {
            const t = data as Transaction;

            // Encabezados de tabla
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text("CANT", margin, y);
            doc.text("DESCRIPCION", margin + 8, y);
            doc.text("TOTAL", width - margin, y, { align: 'right' });
            y += 4;

            // Items
            doc.setFont('courier', 'normal');
            doc.setFontSize(9);

            t.items.forEach(item => {
                // Cantidad
                doc.text(`${item.quantity}`, margin + 1, y);

                // Precio Total Item (Alineado derecha)
                const totalStr = (item.price * item.quantity).toFixed(2);
                const totalWidth = doc.getStringUnitWidth(totalStr) * 9 / doc.internal.scaleFactor;
                doc.text(totalStr, width - margin - totalWidth, y);

                // Descripción (Con wrap si es muy larga)
                // Espacio disponible: Ancho total - margenIzq - espacioCant - espacioTotal - margenDer
                const descWidth = contentWidth - 10 - 15; 
                const lines = doc.splitTextToSize(item.name, descWidth);
                
                doc.text(lines, margin + 8, y);
                
                // Variante si existe
                if (item.selectedVariantName) {
                    y += (lines.length * 3.5);
                    doc.setFontSize(7);
                    doc.text(`(${item.selectedVariantName})`, margin + 8, y - 1);
                    doc.setFontSize(9);
                    y += 2; // Extra espacio por variante
                } else {
                    y += (lines.length * 4);
                }
                
                y += 1; // Espacio entre items
            });

            drawSeparator();

            // --- 3. TOTALES ---
            leftRightText("SUBTOTAL", `${settings.currency} ${t.subtotal.toFixed(2)}`);
            if (t.discount > 0) {
                leftRightText("DESCUENTO", `-${settings.currency} ${t.discount.toFixed(2)}`);
            }
            if (!settings.pricesIncludeTax) {
                leftRightText("IMPUESTO", `${settings.currency} ${t.tax.toFixed(2)}`);
            }

            y += 2;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text("TOTAL A PAGAR", margin, y);
            doc.text(`${settings.currency} ${t.total.toFixed(2)}`, width - margin, y, { align: 'right' });
            y += 8;

            // Métodos de Pago
            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            doc.text("Pagado con:", margin, y);
            y += 4;
            
            if (t.payments) {
                t.payments.forEach(p => {
                    const methodMap: any = { cash: 'Efectivo', card: 'Tarjeta', yape: 'Yape', plin: 'Plin' };
                    leftRightText(methodMap[p.method] || p.method, `${settings.currency} ${p.amount.toFixed(2)}`, 8);
                });
            } else {
                 const methodMap: any = { cash: 'Efectivo', card: 'Tarjeta', yape: 'Yape', plin: 'Plin' };
                 leftRightText(methodMap[t.paymentMethod] || t.paymentMethod, `${settings.currency} ${t.total.toFixed(2)}`, 8);
            }

        } else {
            // REPORTE DE CIERRE
            const s = data.shift as CashShift;
            const m = data.movements || [];
            
            leftRightText("FONDO INICIAL", `${settings.currency} ${s.startAmount.toFixed(2)}`);
            y += 2;
            doc.setFont('helvetica', 'bold');
            doc.text("VENTAS", margin, y);
            y += 4;
            leftRightText("Efectivo", `${settings.currency} ${s.totalSalesCash.toFixed(2)}`);
            leftRightText("Digitales", `${settings.currency} ${s.totalSalesDigital.toFixed(2)}`);
            
            y += 2;
            drawSeparator();
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            leftRightText("TOTAL EN CAJA", `${settings.currency} ${(s.startAmount + s.totalSalesCash).toFixed(2)}`, 11, true);
        }

        // --- 4. PIE DE PÁGINA ---
        y += 6;
        centerText("¡Gracias por su compra!", 9, true, 'helvetica');
        centerText("Conserve este ticket como comprobante", 7, false, 'helvetica');
        y += 2;
        centerText("Powered by PosGo!", 7, true, 'courier');

        return doc;
    };

    // Wrapper para compatibilidad con Share y Download
    const generatePDFBlob = (): Blob => {
        return createPDFDoc().output('blob');
    };

    // --- MANEJADORES ---
    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        const printWindow = window.open('', '', 'height=600,width=400');
        if (printWindow && content) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir Ticket</title>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;700&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; background: #fff; }
                            .ticket-container { width: 80mm; margin: 0 auto; padding: 10px; }
                            .header { background: #000; color: #fff; text-align: center; padding: 10px; border-radius: 4px; margin-bottom: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .text-center { text-align: center; }
                            .text-right { text-align: right; }
                            .flex { display: flex; justify-content: space-between; }
                            .dashed { border-top: 1px dashed #000; margin: 8px 0; }
                            .bold { font-weight: 700; }
                            .mono { font-family: 'Courier Prime', monospace; }
                            .text-sm { font-size: 11px; }
                            .text-xs { font-size: 10px; }
                            .text-lg { font-size: 16px; }
                            table { width: 100%; border-collapse: collapse; }
                            td { vertical-align: top; }
                        </style>
                    </head>
                    <body>${content}</body>
                </html>
            `);
            printWindow.document.close();
            // Esperar a que carguen estilos
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    const handleSharePDF = async () => {
        setGenerating(true);
        try {
            const blob = generatePDFBlob();
            const fileName = `Ticket-${type === 'SALE' ? (data as Transaction).id.slice(-6) : 'Cierre'}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Comprobante de Venta',
                    text: `Aquí tienes tu comprobante de ${settings.name}`,
                });
            } else {
                throw new Error('Web Share API not supported');
            }
        } catch (error: any) {
            if (error.name === 'AbortError' || error.message.includes('share canceled')) return;
            
            // Fallback descarga
            const blob = generatePDFBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Ticket.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setGenerating(false);
        }
    };

    // --- LÓGICA DE WHATSAPP ---
    const handleSendWhatsApp = async () => {
        // 1. Mostrar input si no hay número
        if (!showPhoneInput) {
            setShowPhoneInput(true);
            return;
        }

        // 2. Validar
        if (!whatsappPhone || whatsappPhone.length < (currentCountry.length - 2)) {
             alert(`Por favor ingresa un número válido para ${currentCountry.name}.`);
             return;
        }

        setSendingWhatsapp(true);
        let rawBase64 = '';

        try {
            // A. Generar PDF Doc una vez
            const doc = createPDFDoc();
            
            // B. OBTENER BASE64 PURO (Sin prefijos 'data:...')
            // Usamos output('datauristring') y cortamos todo lo que esté antes de 'base64,'
            // Esto garantiza que Evolution API reciba SOLO los bytes codificados.
            const dataUri = doc.output('datauristring');
            
            // En caso de que jspdf agregue "filename=..." u otros params en el header:
            if (dataUri.includes('base64,')) {
                rawBase64 = dataUri.split('base64,')[1];
            } else {
                // Fallback (muy raro en jspdf moderno)
                rawBase64 = dataUri; 
            }

            // D. Preparar Payload para n8n
            // Usamos el campo pdfUrl para enviar el Base64 porque tu n8n ya está mapeado a esa variable.
            const total = type === 'SALE' ? (data as Transaction).total.toFixed(2) : '0.00';
            const docId = type === 'SALE' ? (data as Transaction).id.slice(-8).toUpperCase() : 'CIERRE';
            const fullPhone = `${countryCode}${whatsappPhone}`;
            const fileName = `Ticket_${docId}.pdf`;
            
            let message = `Hola! 🚀\n\nAquí tienes tu comprobante digital de *${settings.name}*.\n\n📄 Ticket: #${docId}\n💰 Total: ${settings.currency} ${total}\n\nGracias por tu preferencia.`;
            
            const payload = {
                user_phone: "51900000000",
                plan: "pro",
                client: {
                    name: "Cliente",
                    phone: fullPhone 
                },
                company: {
                    name: settings.name
                },
                quote: {
                    number: docId,
                    message: message
                },
                // ENVIAMOS EL RAW BASE64 EN ESTE CAMPO
                // n8n lo pasará al campo 'media' de Evolution API.
                // Evolution API detectará que es un base64 válido y lo convertirá a archivo.
                pdfUrl: rawBase64, 
                fileName: fileName
            };

            // E. Enviar a Webhook
            const response = await fetch('https://webhook.red51.site/webhook/send-quote-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert(`¡Enviado a WhatsApp exitosamente!`);
                setShowPhoneInput(false);
                setWhatsappPhone('');
            } else {
                try {
                    const errData = await response.json();
                    alert("Error del servicio: " + (errData.message || "Revisar conexión"));
                } catch (e) {
                    alert("Hubo un problema al contactar con el servicio de mensajería.");
                }
            }

        } catch (error: any) {
            console.error(error);
            alert("Error: " + (error.message || "Error desconocido al enviar."));
        } finally {
            setSendingWhatsapp(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-fade-in-up border border-slate-200 h-[85vh]">
                
                {/* Header Modal */}
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <span className="font-bold flex items-center gap-2 text-sm"><CheckCircle className="w-5 h-5 text-emerald-400"/> {type === 'SALE' ? 'Venta Exitosa' : 'Corte Realizado'}</span>
                    <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>
                
                {/* PREVIEW HTML (Debe coincidir visualmente con el PDF) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 p-4 flex justify-center">
                    <div ref={printRef} className="ticket-container bg-white shadow-lg w-[80mm] min-h-[100mm] p-4 text-xs text-slate-900 relative">
                        
                        {/* Papel rasgado efecto top */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDEyIDEyIj48cGF0aCBkPSJNMCA2IEw2IDAgTDEyIDZNMCA2IEw2IDEyIEwxMiA2IiBmaWxsPSIjZmZmIi8+PC9zdmc+')] bg-repeat-x -mt-2"></div>

                        {/* Cabecera Negra */}
                        <div className="header bg-slate-900 text-white text-center p-3 rounded-lg mb-4">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Rocket className="w-4 h-4 text-white fill-current"/>
                                <h1 className="text-xl font-black tracking-tight">PosGo!</h1>
                            </div>
                            <p className="text-[10px] font-medium opacity-90">{settings.name.toUpperCase()}</p>
                        </div>

                        <div className="text-center font-mono space-y-1 mb-3">
                            <p>{settings.address}</p>
                            <p>Tel: {settings.phone}</p>
                            <p>{new Date().toLocaleString()}</p>
                        </div>

                        {type === 'SALE' && (
                            <div className="text-center mb-3">
                                <h2 className="text-sm font-bold border-b border-black inline-block pb-1">TICKET DE VENTA</h2>
                                <p className="font-mono text-xs mt-1">#{(data as Transaction).id.slice(-8).toUpperCase()}</p>
                            </div>
                        )}

                        <div className="dashed border-t border-dashed border-slate-300 my-2"></div>

                        {type === 'SALE' ? (
                            <div className="font-mono text-[11px]">
                                <table className="w-full mb-2">
                                    <thead>
                                        <tr className="text-left">
                                            <th className="pb-1 w-8">Cant</th>
                                            <th className="pb-1">Desc</th>
                                            <th className="pb-1 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data as Transaction).items.map((item, i) => (
                                            <tr key={i}>
                                                <td className="align-top pt-1">{item.quantity}</td>
                                                <td className="align-top pt-1 pr-1">
                                                    <div>{item.name}</div>
                                                    {item.selectedVariantName && <div className="text-[9px] text-slate-500">({item.selectedVariantName})</div>}
                                                </td>
                                                <td className="align-top pt-1 text-right">{settings.currency}{(item.price * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="dashed border-t border-dashed border-slate-300 my-2"></div>

                                <div className="space-y-1">
                                    <div className="flex justify-between"><span>Subtotal</span><span>{settings.currency}{(data as Transaction).subtotal.toFixed(2)}</span></div>
                                    {(data as Transaction).discount > 0 && (
                                        <div className="flex justify-between text-slate-500"><span>Descuento</span><span>-{settings.currency}{(data as Transaction).discount.toFixed(2)}</span></div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-slate-800">
                                        <span>TOTAL</span>
                                        <span>{settings.currency}{(data as Transaction).total.toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-2 border-t border-dashed border-slate-300">
                                    <p className="font-bold text-[10px] mb-1">Métodos de Pago:</p>
                                    {(data as Transaction).payments ? (data as Transaction).payments?.map((p, i) => (
                                        <div key={i} className="flex justify-between text-[10px]">
                                            <span className="capitalize">{p.method === 'cash' ? 'Efectivo' : p.method}</span>
                                            <span>{settings.currency}{p.amount.toFixed(2)}</span>
                                        </div>
                                    )) : (
                                        <div className="flex justify-between text-[10px]">
                                            <span className="capitalize">{(data as Transaction).paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</span>
                                            <span>{settings.currency}{(data as Transaction).total.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Vista reporte (simplificada para preview)
                            <div className="font-mono">
                                <div className="flex justify-between mb-1"><span>Fondo Inicial</span><span>{settings.currency}{(data.shift as CashShift).startAmount.toFixed(2)}</span></div>
                                <div className="flex justify-between mb-1"><span>Ventas Efectivo</span><span>{settings.currency}{(data.shift as CashShift).totalSalesCash.toFixed(2)}</span></div>
                                <div className="flex justify-between mb-1"><span>Ventas Digital</span><span>{settings.currency}{(data.shift as CashShift).totalSalesDigital.toFixed(2)}</span></div>
                                <div className="dashed border-t border-dashed border-slate-300 my-2"></div>
                                <div className="flex justify-between font-bold text-sm"><span>TOTAL CAJA</span><span>{settings.currency}{((data.shift as CashShift).startAmount + (data.shift as CashShift).totalSalesCash).toFixed(2)}</span></div>
                            </div>
                        )}

                        <div className="mt-6 text-center">
                            <p className="font-bold mb-1">¡Gracias por su compra!</p>
                            <p className="text-[9px] text-slate-500">Powered by PosGo!</p>
                        </div>
                        
                        {/* Papel rasgado efecto bottom */}
                        <div className="absolute bottom-0 left-0 w-full h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDEyIDEyIj48cGF0aCBkPSJNMCAwIEw2IDYgTDEyIDBNMCAwIEw2IDYgTDEyIDBWMTIgSDAgVjAiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-repeat-x -mb-2"></div>
                    </div>
                </div>

                {/* AREA DE ACCIONES */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                    
                    {/* Input desplegable para WhatsApp */}
                    {showPhoneInput && (
                        <div className="mb-3 animate-fade-in-up">
                            <div className="flex items-center gap-2 mb-2 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                                <div className="relative pl-1 pr-2 border-r border-emerald-200 min-w-[90px]">
                                    <select 
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="appearance-none bg-transparent font-bold text-slate-700 outline-none w-full h-full absolute inset-0 opacity-0 cursor-pointer z-10"
                                    >
                                        {COUNTRIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} +{c.code} {c.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center justify-center gap-1 cursor-pointer py-2">
                                        <span className="text-xl">{currentCountry?.flag}</span>
                                        <span className="text-xs font-bold text-emerald-800">+{countryCode}</span>
                                        <ChevronDown className="w-3 h-3 text-emerald-500"/>
                                    </div>
                                </div>
                                
                                <input 
                                    type="tel" 
                                    placeholder={currentCountry?.placeholder || "999..."} 
                                    className="flex-1 bg-transparent py-2 px-2 text-sm font-bold text-slate-800 outline-none placeholder:text-emerald-300/70"
                                    value={whatsappPhone}
                                    onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g,''))}
                                    autoFocus
                                />
                                
                                <button 
                                    onClick={handleSendWhatsApp}
                                    disabled={sendingWhatsapp}
                                    className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {sendingWhatsapp ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                                </button>
                            </div>
                            <div className="text-center">
                                <button onClick={() => setShowPhoneInput(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Cancelar envío</button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                         {/* Botón WhatsApp Principal */}
                         <button 
                            onClick={handleSendWhatsApp} 
                            disabled={generating || sendingWhatsapp || (showPhoneInput && !whatsappPhone)}
                            className="col-span-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-50"
                         >
                            <MessageCircle className="w-5 h-5"/>
                            <span className="text-xs sm:text-sm">Enviar WhatsApp</span>
                        </button>

                         <button 
                            onClick={handleSharePDF} 
                            disabled={generating}
                            className="col-span-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
                         >
                            {generating ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Share2 className="w-5 h-5"/>}
                            <span className="text-xs sm:text-sm">Compartir PDF</span>
                        </button>

                        <button 
                            onClick={handlePrint} 
                            className="col-span-2 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Printer className="w-5 h-5"/>
                            <span className="text-xs sm:text-sm">Imprimir Ticket</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};