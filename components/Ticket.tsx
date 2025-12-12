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
        // Configuración: 80mm ancho (estándar ticket)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 297] // Largo dinámico base
        });

        // Configuración de Estilo
        const pageWidth = 80;
        const margin = 5;
        const contentWidth = pageWidth - (margin * 2);
        let y = 0; // Cursor vertical

        // --- HELPERS DE DIBUJO ---
        
        // Centrar Texto
        const centerText = (text: string, yPos: number, size: number = 9, weight: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0,0,0]) => {
            doc.setTextColor(color[0], color[1], color[2]);
            doc.setFont('helvetica', weight);
            doc.setFontSize(size);
            doc.text(text, pageWidth / 2, yPos, { align: 'center' });
        };

        // Texto Izquierda/Derecha
        const rowText = (left: string, right: string, yPos: number, size: number = 9, weight: 'normal' | 'bold' = 'normal') => {
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', weight);
            doc.setFontSize(size);
            doc.text(left, margin, yPos);
            doc.text(right, pageWidth - margin, yPos, { align: 'right' });
        };

        // Línea Separadora (Punteada)
        const drawDivider = (yPos: number) => {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            // Fix TS error: setLineDash missing in types
            (doc as any).setLineDash([1, 1], 0);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            (doc as any).setLineDash([], 0); // Reset
            return yPos + 4;
        };

        // --- 1. CABECERA (Estilo Dark Mode) ---
        // Fondo negro
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 0, pageWidth, 22, 'F');
        
        // Logo / Nombre App
        y = 8;
        centerText("PosGo!", y, 14, 'bold', [255, 255, 255]);
        
        // Nombre Tienda
        y += 6;
        centerText(settings.name.toUpperCase(), y, 8, 'normal', [200, 200, 200]);

        y = 28; // Salir de la cabecera negra

        // Información del Negocio
        doc.setTextColor(0, 0, 0);
        if (settings.address) {
            centerText(settings.address, y, 8);
            y += 4;
        }
        if (settings.phone) {
            centerText(`Tel: ${settings.phone}`, y, 8);
            y += 4;
        }
        
        // Fecha
        const dateObj = type === 'SALE' 
            ? new Date((data as Transaction).date)
            : new Date((data.shift as CashShift).endTime || new Date());
        centerText(dateObj.toLocaleString(), y, 8);
        y += 6;

        // Título del Documento
        y = drawDivider(y);
        centerText(type === 'SALE' ? "TICKET DE VENTA" : "REPORTE DE CIERRE", y + 1, 11, 'bold');
        y += 5;
        if (type === 'SALE') {
            centerText(`#${(data as Transaction).id.slice(-8).toUpperCase()}`, y, 10, 'normal');
        }
        y += 4;
        y = drawDivider(y);

        // --- 2. DETALLE DE ITEMS ---
        if (type === 'SALE') {
            const t = data as Transaction;

            // Encabezados
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text("CANT", margin, y);
            doc.text("DESCRIPCIÓN", margin + 8, y);
            doc.text("TOTAL", pageWidth - margin, y, { align: 'right' });
            y += 4;

            // Lista
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            t.items.forEach(item => {
                const totalLine = (item.price * item.quantity).toFixed(2);
                
                // Cantidad
                doc.text(item.quantity.toString(), margin + 2, y, { align: 'center' });

                // Precio (Derecha)
                doc.text(totalLine, pageWidth - margin, y, { align: 'right' });

                // Descripción (Con wrap inteligente)
                // Calculamos el ancho disponible para el texto: Ancho total - margenIzq - espacioCant - espacioPrecio - margenDer
                const textWidth = contentWidth - 10 - 15; 
                const splitDesc = doc.splitTextToSize(item.name, textWidth);
                
                doc.text(splitDesc, margin + 8, y);
                
                // Calcular nueva Y basado en cuantas lineas ocupó el texto
                let lineHeight = splitDesc.length * 4;
                
                // Variante
                if (item.selectedVariantName) {
                    y += lineHeight; 
                    doc.setFontSize(7);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`(${item.selectedVariantName})`, margin + 8, y - 1);
                    doc.setFontSize(9);
                    doc.setTextColor(0, 0, 0);
                    lineHeight = 3; // Espacio extra pequeño
                }

                y += lineHeight + 1; // Espacio entre items
            });

            y = drawDivider(y);

            // --- 3. TOTALES ---
            y += 1;
            rowText("SUBTOTAL", `${settings.currency} ${t.subtotal.toFixed(2)}`, y);
            y += 5;
            
            if (t.discount > 0) {
                rowText("DESCUENTO", `-${settings.currency} ${t.discount.toFixed(2)}`, y);
                y += 5;
            }
            if (!settings.pricesIncludeTax) {
                rowText("IMPUESTO", `${settings.currency} ${t.tax.toFixed(2)}`, y);
                y += 5;
            }

            // TOTAL GRANDE
            y += 2;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text("TOTAL", margin, y);
            doc.text(`${settings.currency} ${t.total.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
            y += 8;

            // Métodos de Pago (Estilo etiqueta)
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text("Pagado con:", margin, y);
            y += 4;

            if (t.payments) {
                t.payments.forEach(p => {
                    const methodMap: any = { cash: 'Efectivo', card: 'Tarjeta', yape: 'Yape', plin: 'Plin' };
                    rowText(methodMap[p.method] || p.method, `${settings.currency} ${p.amount.toFixed(2)}`, y, 8);
                    y += 4;
                });
            } else {
                 const methodMap: any = { cash: 'Efectivo', card: 'Tarjeta', yape: 'Yape', plin: 'Plin' };
                 rowText(methodMap[t.paymentMethod] || t.paymentMethod, `${settings.currency} ${t.total.toFixed(2)}`, y, 8);
                 y += 4;
            }

        } else {
            // REPORTE CIERRE
            const s = data.shift as CashShift;
            rowText("Fondo Inicial", `${settings.currency} ${s.startAmount.toFixed(2)}`, y);
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.text("VENTAS REGISTRADAS", margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            rowText("Efectivo", `${settings.currency} ${s.totalSalesCash.toFixed(2)}`, y);
            y += 5;
            rowText("Digitales", `${settings.currency} ${s.totalSalesDigital.toFixed(2)}`, y);
            y += 6;
            drawDivider(y);
            y += 6;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            rowText("TOTAL EN CAJA", `${settings.currency} ${(s.startAmount + s.totalSalesCash).toFixed(2)}`, y, 12, 'bold');
        }

        // --- 4. FOOTER ---
        y += 10;
        centerText("¡Gracias por su compra!", y, 10, 'bold');
        y += 4;
        centerText("Conserve este ticket", y, 7, 'normal', [100, 100, 100]);
        y += 4;
        centerText("Powered by PosGo!", y, 6, 'normal', [150, 150, 150]);

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
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; background: #fff; }
                            .ticket-container { width: 80mm; margin: 0 auto; padding: 10px; }
                            .header { background: #0f172a; color: #fff; text-align: center; padding: 15px 10px; border-radius: 0; margin: -10px -10px 15px -10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .text-center { text-align: center; }
                            .text-right { text-align: right; }
                            .flex { display: flex; justify-content: space-between; }
                            .dashed { border-top: 1px dashed #cbd5e1; margin: 12px 0; }
                            .bold { font-weight: 700; }
                            .black { font-weight: 900; }
                            .text-sm { font-size: 11px; }
                            .text-xs { font-size: 10px; }
                            .text-lg { font-size: 16px; }
                            table { width: 100%; border-collapse: collapse; }
                            td { vertical-align: top; padding: 2px 0; }
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
                    <div ref={printRef} className="ticket-container bg-white shadow-lg w-[80mm] min-h-[100mm] p-0 text-xs text-slate-900 relative overflow-hidden">
                        
                        {/* Papel rasgado efecto top */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-slate-900 z-10"></div>

                        {/* Cabecera Negra */}
                        <div className="header bg-slate-900 text-white text-center p-6 mb-4">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Rocket className="w-6 h-6 text-white fill-current"/>
                                <h1 className="text-2xl font-black tracking-tight">PosGo!</h1>
                            </div>
                            <p className="text-[11px] font-medium opacity-80 tracking-widest">{settings.name.toUpperCase()}</p>
                        </div>

                        <div className="px-4 pb-4">
                            <div className="text-center font-sans space-y-1 mb-4 text-slate-500">
                                <p>{settings.address}</p>
                                <p>Tel: {settings.phone}</p>
                                <p className="text-[10px]">{new Date().toLocaleString()}</p>
                            </div>

                            {type === 'SALE' && (
                                <div className="text-center mb-4">
                                    <h2 className="text-base font-black text-slate-800 border-b border-slate-200 inline-block pb-1">TICKET DE VENTA</h2>
                                    <p className="font-mono text-xs mt-1 text-slate-500">#{(data as Transaction).id.slice(-8).toUpperCase()}</p>
                                </div>
                            )}

                            <div className="dashed border-t border-dashed border-slate-300 my-4"></div>

                            {type === 'SALE' ? (
                                <div className="font-sans text-[11px]">
                                    <table className="w-full mb-3">
                                        <thead>
                                            <tr className="text-left text-[9px] text-slate-400 uppercase tracking-wider">
                                                <th className="pb-2 w-8 text-center">Cant</th>
                                                <th className="pb-2">Desc</th>
                                                <th className="pb-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data as Transaction).items.map((item, i) => (
                                                <tr key={i}>
                                                    <td className="align-top pt-1.5 text-center font-bold">{item.quantity}</td>
                                                    <td className="align-top pt-1.5 pr-1">
                                                        <div className="font-medium text-slate-800 leading-tight">{item.name}</div>
                                                        {item.selectedVariantName && <div className="text-[9px] text-slate-400 mt-0.5">({item.selectedVariantName})</div>}
                                                    </td>
                                                    <td className="align-top pt-1.5 text-right font-bold text-slate-900">{settings.currency}{(item.price * item.quantity).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="dashed border-t border-dashed border-slate-300 my-3"></div>

                                    <div className="space-y-1 text-slate-600">
                                        <div className="flex justify-between"><span>Subtotal</span><span>{settings.currency}{(data as Transaction).subtotal.toFixed(2)}</span></div>
                                        {(data as Transaction).discount > 0 && (
                                            <div className="flex justify-between text-slate-500"><span>Descuento</span><span>-{settings.currency}{(data as Transaction).discount.toFixed(2)}</span></div>
                                        )}
                                        <div className="flex justify-between text-xl font-black mt-3 pt-3 text-slate-900">
                                            <span>TOTAL</span>
                                            <span>{settings.currency}{(data as Transaction).total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 pt-3 border-t border-slate-100">
                                        <p className="font-bold text-[10px] text-slate-400 mb-2 uppercase">Métodos de Pago:</p>
                                        {(data as Transaction).payments ? (data as Transaction).payments?.map((p, i) => (
                                            <div key={i} className="flex justify-between text-[11px] mb-1">
                                                <span className="capitalize font-bold text-slate-700">{p.method === 'cash' ? 'Efectivo' : p.method}</span>
                                                <span>{settings.currency}{p.amount.toFixed(2)}</span>
                                            </div>
                                        )) : (
                                            <div className="flex justify-between text-[11px]">
                                                <span className="capitalize font-bold text-slate-700">{(data as Transaction).paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</span>
                                                <span>{settings.currency}{(data as Transaction).total.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // Vista reporte (simplificada para preview)
                                <div className="font-sans">
                                    <div className="flex justify-between mb-2 text-slate-600"><span>Fondo Inicial</span><span>{settings.currency}{(data.shift as CashShift).startAmount.toFixed(2)}</span></div>
                                    <div className="mb-2 font-bold text-slate-900 mt-4">VENTAS REGISTRADAS</div>
                                    <div className="flex justify-between mb-1 text-sm"><span>Efectivo</span><span>{settings.currency}{(data.shift as CashShift).totalSalesCash.toFixed(2)}</span></div>
                                    <div className="flex justify-between mb-1 text-sm"><span>Digital</span><span>{settings.currency}{(data.shift as CashShift).totalSalesDigital.toFixed(2)}</span></div>
                                    <div className="dashed border-t border-dashed border-slate-300 my-4"></div>
                                    <div className="flex justify-between font-black text-lg text-slate-900"><span>TOTAL CAJA</span><span>{settings.currency}{((data.shift as CashShift).startAmount + (data.shift as CashShift).totalSalesCash).toFixed(2)}</span></div>
                                </div>
                            )}

                            <div className="mt-8 text-center space-y-1">
                                <p className="font-bold text-slate-800">¡Gracias por su compra!</p>
                                <p className="text-[10px] text-slate-400">Conserve este ticket</p>
                                <p className="text-[9px] text-slate-300 mt-2">Powered by PosGo!</p>
                            </div>
                        </div>
                        
                        {/* Papel rasgado efecto bottom */}
                        <div className="absolute bottom-0 left-0 w-full h-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiIgdmlld0JveD0iMCAwIDEyIDEyIj48cGF0aCBkPSJNMCAwIEw2IDYgTDEyIDBNMCAwIEw2IDYgTDEyIDBWMTIgSDAgVjAiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-repeat-x -mb-1 z-10"></div>
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