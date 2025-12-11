import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, ArrowRight, X, MousePointerClick, ScanBarcode, Wallet, ShoppingBag } from 'lucide-react';

interface OnboardingTourProps {
    isOpen: boolean;
    onComplete: () => void;
}

const TOUR_STEPS = [
    {
        target: 'center',
        title: '¡Bienvenido a PosGo!',
        content: 'La plataforma integral para tu negocio. Te guiaremos brevemente por las funciones principales del Punto de Venta.',
        icon: Sparkles
    },
    {
        target: 'pos-cash-control',
        title: 'Control de Caja',
        content: 'Aquí puedes registrar entradas, salidas y ver el estado de tu turno en tiempo real. ¡Esencial para tu cuadre diario!',
        icon: Wallet,
        position: 'bottom-left'
    },
    {
        target: 'pos-view-toggles',
        title: 'Modos de Vista',
        content: '¿Prefieres imágenes grandes o una lista rápida? Alterna entre vista de cuadrícula y lista compacta aquí.',
        icon: MousePointerClick,
        position: 'bottom-left'
    },
    {
        target: 'pos-scanner-section',
        title: 'Escáner Inteligente',
        content: 'Usa tu lector de código de barras o busca manualmente por nombre. El sistema es rápido y fluido.',
        icon: ScanBarcode,
        position: 'bottom'
    },
    {
        target: 'pos-cart',
        title: 'Canasta de Venta',
        content: 'Aquí aparecerán tus productos. Puedes modificar cantidades, aplicar descuentos y procesar el cobro.',
        icon: ShoppingBag,
        position: 'left'
    }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const updatePosition = useCallback(() => {
        const step = TOUR_STEPS[currentStep];
        if (step.target === 'center') {
            setTargetRect(null);
            return;
        }

        const element = document.getElementById(step.target);
        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);
        }
    }, [currentStep]);

    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure DOM is rendered
            setTimeout(updatePosition, 300);
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [isOpen, currentStep, updatePosition]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
            setCurrentStep(0);
        }
    };

    if (!isOpen) return null;

    const step = TOUR_STEPS[currentStep];
    const isCenter = step.target === 'center';

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Background Overlay with Hole (Spotlight) */}
            {isCenter ? (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in" />
            ) : (
                <div className="absolute inset-0 transition-all duration-500 ease-in-out">
                    {/* We construct a massive box shadow around the highlighted area to create the spotlight effect */}
                    <div 
                        className="absolute rounded-2xl transition-all duration-300 ease-out border-2 border-indigo-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.8)] animate-pulse"
                        style={{
                            top: targetRect ? targetRect.top - 8 : '50%',
                            left: targetRect ? targetRect.left - 8 : '50%',
                            width: targetRect ? targetRect.width + 16 : 0,
                            height: targetRect ? targetRect.height + 16 : 0,
                            opacity: targetRect ? 1 : 0
                        }}
                    />
                </div>
            )}

            {/* Tooltip Card */}
            <div 
                className={`absolute transition-all duration-500 ease-out flex flex-col items-center justify-center pointer-events-none w-full h-full`}
            >
                {/* Positioning Wrapper */}
                <div 
                    className="pointer-events-auto bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative animate-fade-in-up border-4 border-slate-900/5"
                    style={!isCenter && targetRect ? {
                        position: 'fixed',
                        top: step.position === 'bottom' ? targetRect.bottom + 24 : 
                             step.position === 'bottom-left' ? targetRect.bottom + 24 :
                             targetRect.top + (targetRect.height/2) - 100, // Approximate center vertically
                        left: step.position === 'left' ? targetRect.left - 400 : 
                              step.position === 'bottom-left' ? targetRect.left :
                              targetRect.left + (targetRect.width/2) - 192, // Center horizontally (384px width / 2)
                        transform: 'none'
                    } : {}}
                >
                    {/* Step Indicator */}
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black border-4 border-white shadow-lg z-10">
                        {currentStep + 1}/{TOUR_STEPS.length}
                    </div>

                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 shadow-inner">
                        <step.icon className="w-8 h-8" />
                    </div>

                    <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">{step.title}</h3>
                    <p className="text-slate-500 leading-relaxed mb-8 font-medium">
                        {step.content}
                    </p>

                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={onComplete}
                            className="flex-1 py-3.5 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
                        >
                            Saltar
                        </button>
                        <button 
                            onClick={handleNext}
                            className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                        >
                            {currentStep === TOUR_STEPS.length - 1 ? '¡Empezar a Vender!' : 'Siguiente'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};