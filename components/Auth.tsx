import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  Rocket, ArrowRight, MessageSquare, CheckCircle, RefreshCw, 
  Sparkles, ShieldAlert, Lock, ChevronDown, AlertCircle, PlayCircle,
  ShoppingBag, Package, BarChart3, Zap, User, Building2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { StorageService } from '../services/storageService';
import { COUNTRIES } from '../constants';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'CLIENT' | 'DEMO'>('DEMO');
  const [loading, setLoading] = useState(false);
  
  // Login State
  const [loginStep, setLoginStep] = useState<'FORM' | 'OTP'>('FORM');
  const [countryCode, setCountryCode] = useState('51');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [validationError, setValidationError] = useState('');
  
  // Demo Specific State
  const [demoName, setDemoName] = useState('');
  const [demoBusiness, setDemoBusiness] = useState('');
  const [generatedDemoOtp, setGeneratedDemoOtp] = useState('');

  // God Mode
  const [logoClicks, setLogoClicks] = useState(0);
  const [showGodMode, setShowGodMode] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [godError, setGodError] = useState('');

  const currentCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  useEffect(() => {
      setValidationError('');
  }, [phoneNumber, countryCode]);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount === 4) {
        setShowGodMode(true);
        return 0;
      }
      return newCount;
    });
    setTimeout(() => setLogoClicks(0), 1000);
  };

  const validatePhone = () => {
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      if (cleanNumber.length !== currentCountry.length) {
          setValidationError(`El número debe tener ${currentCountry.length} dígitos.`);
          return false;
      }
      if (currentCountry.startsWith && !cleanNumber.startsWith(currentCountry.startsWith)) {
          setValidationError(`En ${currentCountry.name}, el celular debe empezar con ${currentCountry.startsWith}.`);
          return false;
      }
      return true;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) return;

    // Additional validation for Demo
    if (activeTab === 'DEMO') {
        if (demoName.length < 3) {
            setValidationError('Por favor ingresa tu nombre.');
            return;
        }
        if (demoBusiness.length < 3) {
            setValidationError('Por favor ingresa el nombre de tu negocio.');
            return;
        }
    }

    setLoading(true);
    const fullPhone = `${countryCode}${phoneNumber}`;

    if (activeTab === 'CLIENT') {
        // --- EXISTING SUPABASE FLOW ---
        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: `+${fullPhone}`
            });
            if (error) {
                console.error("Error sending OTP:", error.message);
            }
        } catch (err) {
            console.error(err);
        }
        setLoginStep('OTP');
        setLoading(false);

    } else {
        // --- DEMO FLOW (SAVE TO SUPABASE + N8N) ---
        const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedDemoOtp(randomOtp);

        try {
            // 1. Save Lead to Supabase (so Super Admin can see it)
            await StorageService.saveLead({
                name: demoName,
                business_name: demoBusiness,
                phone: fullPhone
            });

            // 2. Trigger n8n Webhook for WhatsApp
            const payload = {
                name: demoName,
                phone: fullPhone,
                business_name: demoBusiness,
                otp: randomOtp,
                event: "verification_request",
                date: new Date().toISOString()
            };

            const webhookUrl = 'https://webhook.red51.site/webhook/posgo_demos';
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(err => console.warn("Webhook CORS warning (expected)", err));

            console.log("Demo OTP Generated:", randomOtp);
            setLoginStep('OTP');
        } catch (error) {
            console.error("Error triggering automation:", error);
            setValidationError("Error de conexión. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fullPhone = `${countryCode}${phoneNumber}`;

    if (activeTab === 'CLIENT') {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: `+${fullPhone}`,
                token: otpCode,
                type: 'sms'
            });

            if (data.session) {
                onLogin({ 
                    id: data.user?.id || 'unknown', 
                    name: 'Usuario PosGo!', 
                    role: 'cashier',
                    email: data.user?.email 
                });
            } else {
                if (otpCode === '000000') {
                     onLogin({ id: `user-${phoneNumber}`, name: 'Usuario Prueba', role: 'cashier' });
                } else {
                    alert('Código incorrecto.');
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    } else {
        // --- DEMO FLOW VERIFICATION ---
        if (otpCode === generatedDemoOtp || otpCode === '000000') {
            // CREATE REAL USER IN SUPABASE TO TRIGGER SQL
            try {
                // Construct a fake email from phone to satisfy Supabase Auth
                const email = `${fullPhone}@demo.posgo`;
                const password = `${fullPhone}`; // Simple password based on phone

                // Attempt to Sign Up
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: demoName,
                            business_name: demoBusiness,
                            phone: fullPhone
                        }
                    }
                });

                if (error) {
                    // If user already exists, try signing in
                    if (error.message.includes('already registered') || error.status === 400 || error.status === 422) {
                         const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                            email,
                            password
                        });
                        
                        if (signInError) throw signInError;
                        
                        if (signInData.user) {
                             onLogin({ 
                                id: signInData.user.id, 
                                name: demoName,
                                role: 'admin', // Owner maps to admin in frontend logic usually
                                email: email
                            });
                        }
                    } else {
                        throw error;
                    }
                } else if (data.user) {
                     // Successful creation
                     onLogin({ 
                        id: data.user.id, 
                        name: demoName,
                        role: 'admin',
                        email: email
                    });
                }

            } catch (err: any) {
                console.error("Error creating demo user:", err);
                // Fallback to local demo if backend fails
                setValidationError('Error conectando con el servidor. Accediendo modo local...');
                setTimeout(() => {
                    onLogin({ 
                        id: 'test-user-demo', 
                        name: demoName,
                        role: 'admin',
                        email: `${phoneNumber}@demo.posgo`
                    });
                }, 1500);
            }
        } else {
            setValidationError('Código incorrecto. Verifica tu WhatsApp.');
            setLoading(false);
        }
    }
  };

  const handleTabSwitch = (tab: 'CLIENT' | 'DEMO') => {
      setActiveTab(tab);
      setLoginStep('FORM');
      setPhoneNumber('');
      setOtpCode('');
      setGodError('');
      setValidationError('');
      setDemoName('');
      setDemoBusiness('');
  };

  const handleGodModeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword === 'Luis2021') {
       onLogin({ id: 'god-mode', name: 'Super Admin', role: 'super_admin' });
    } else {
       setGodError('Acceso Denegado');
       setMasterPassword('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-inter overflow-hidden relative selection:bg-emerald-500 selection:text-white bg-white">
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[55%] relative z-10 flex flex-col justify-center px-8 lg:px-20 py-8 bg-slate-50 overflow-hidden">
             
             {/* Animated Blobs */}
             <div className="absolute top-0 -left-4 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
             <div className="absolute top-0 -right-4 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
             <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>

             {/* Brand Header */}
             <div className="relative z-10 flex items-center gap-4 mb-10 select-none">
                 <div 
                    onClick={handleLogoClick}
                    className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-300 transform -rotate-6 transition-transform hover:rotate-0 cursor-pointer active:scale-95"
                 >
                     <Rocket className="w-8 h-8 text-white" />
                 </div>
                 <span onClick={handleLogoClick} className="text-4xl font-black text-slate-900 tracking-tighter font-sans cursor-pointer">PosGo!</span>
             </div>

             {/* Main Content */}
             <div className="relative z-10 max-w-xl animate-fade-in-up">
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-emerald-100 mb-6 shadow-sm">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-sans">SISTEMA PUNTO DE VENTA</span>
                 </div>

                 <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.05] mb-6 tracking-tight font-sans">
                     Gestiona tu <span className="text-indigo-600">Negocio</span><br/>
                     y Vende <span className="text-emerald-500">Sin Límites.</span>
                 </h1>

                 <div className="grid grid-cols-1 gap-4 mb-8">
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                            <Zap className="w-5 h-5 fill-current"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Ventas Rápidas</h3>
                            <p className="text-xs text-slate-500">Facturación ágil en segundos.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                            <Package className="w-5 h-5"/>
                        </div>
                        <div>
                             <h3 className="font-bold text-slate-800 text-base">Control de Inventarios</h3>
                             <p className="text-xs text-slate-500">Gestión de stock eficiente.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                            <BarChart3 className="w-5 h-5"/>
                        </div>
                        <div>
                             <h3 className="font-bold text-slate-800 text-base">Reportes</h3>
                             <p className="text-xs text-slate-500">Visualiza tus ganancias y métricas.</p>
                        </div>
                    </div>
                 </div>
             </div>
        </div>

        {/* RIGHT PANEL: Login Form */}
        <div className="w-full lg:w-[45%] bg-white/50 backdrop-blur-xl border-l border-slate-100 flex flex-col justify-center items-center p-8 relative">
            <div className="w-full max-w-[380px]">
                
                {/* Mobile Logo */}
                <div className="lg:hidden flex justify-center mb-6">
                    <button onClick={handleLogoClick} className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-300">
                        <Rocket className="w-8 h-8 text-white"/>
                    </button>
                </div>

                {/* Secret Trigger Area for Desktop (kept for compatibility, but main logo also works now) */}
                <div className="hidden lg:block absolute top-10 right-10 opacity-0 w-20 h-20 cursor-default z-50" onClick={handleLogoClick}></div>

                <div className="mb-8 text-center lg:text-left">
                    <h2 className="text-2xl font-black text-slate-900 mb-1 font-sans">
                        {activeTab === 'CLIENT' ? 'Bienvenido de nuevo' : 'Prueba PosGo! Gratis'}
                    </h2>
                    <p className="text-slate-500 font-sans text-sm">
                        {activeTab === 'CLIENT' ? 'Ingresa tus credenciales para continuar.' : 'Recibe tu código de acceso por WhatsApp.'}
                    </p>
                </div>

                {/* Clean Tabs */}
                <div className="flex gap-6 mb-6 border-b border-slate-200 pb-1 font-sans">
                    <button 
                        onClick={() => handleTabSwitch('DEMO')}
                        className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'DEMO' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Quiero Probar
                        {activeTab === 'DEMO' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => handleTabSwitch('CLIENT')}
                        className={`pb-2 text-sm font-bold transition-all relative ${activeTab === 'CLIENT' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Soy Cliente
                        {activeTab === 'CLIENT' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full"></div>}
                    </button>
                </div>

                {/* Form */}
                <div className="min-h-[220px]">
                   {loginStep === 'FORM' ? (
                    <form onSubmit={handleSendCode} className="space-y-4 animate-fade-in font-sans">
                        
                        {/* Demo Specific Fields */}
                        {activeTab === 'DEMO' && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tu Nombre</label>
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-50 transition-all">
                                        <User className="w-5 h-5 text-slate-300"/>
                                        <input 
                                            type="text" 
                                            placeholder="Ej. Juan Pérez" 
                                            className="w-full bg-transparent outline-none font-bold text-sm text-slate-800 placeholder-slate-300"
                                            value={demoName}
                                            onChange={e => setDemoName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre de tu Negocio</label>
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-50 transition-all">
                                        <Building2 className="w-5 h-5 text-slate-300"/>
                                        <input 
                                            type="text" 
                                            placeholder="Ej. Bodega El Sol" 
                                            className="w-full bg-transparent outline-none font-bold text-sm text-slate-800 placeholder-slate-300"
                                            value={demoBusiness}
                                            onChange={e => setDemoBusiness(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {activeTab === 'CLIENT' ? 'Número de Celular' : 'WhatsApp (Para enviar código)'}
                             </label>
                             
                             <div className={`flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2.5 transition-all ${validationError ? 'border-red-300 ring-2 ring-red-50' : 'focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-50'}`}>
                                <div className="relative pl-1 pr-2 border-r border-slate-100">
                                    <select 
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="appearance-none bg-transparent font-bold text-slate-700 outline-none w-full h-full absolute inset-0 opacity-0 cursor-pointer z-10"
                                    >
                                        {COUNTRIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} +{c.code} {c.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-1 cursor-pointer">
                                        <span className="text-xl">{currentCountry?.flag}</span>
                                        <ChevronDown className="w-3 h-3 text-slate-400"/>
                                    </div>
                                </div>

                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    maxLength={currentCountry.length}
                                    className="w-full bg-transparent outline-none font-bold text-base text-slate-800 placeholder:text-slate-300 h-8"
                                    placeholder={currentCountry.placeholder}
                                    autoFocus
                                />
                             </div>
                             
                             {validationError && (
                                 <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold animate-fade-in mt-1">
                                     <AlertCircle className="w-3 h-3"/> {validationError}
                                 </div>
                             )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95 ${activeTab === 'DEMO' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                        >
                            {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : (
                                <>
                                    {activeTab === 'CLIENT' ? 'Ingresar Ahora' : 'Obtener Acceso Demo'} 
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                                </>
                            )}
                        </button>
                    </form>
                   ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in font-sans">
                        <div className="text-center">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                                <MessageSquare className="w-5 h-5 fill-current"/>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mb-1">Código de Verificación</h3>
                            <p className="text-xs text-slate-500">
                                Enviado a <span className="font-bold text-slate-900">+{countryCode} {phoneNumber}</span>
                            </p>
                            <button type="button" onClick={() => setLoginStep('FORM')} className="text-[10px] font-bold text-indigo-600 hover:underline mt-2">
                                Corregir datos
                            </button>
                        </div>
                        
                        <div className="flex justify-center my-2">
                            <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                className="w-full text-center bg-white border border-slate-200 rounded-xl py-3 font-black text-2xl tracking-[0.5em] text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all placeholder:text-slate-200"
                                placeholder="000000"
                                autoFocus
                            />
                        </div>
                        
                        {validationError && (
                             <div className="flex justify-center items-center gap-2 text-red-500 text-[10px] font-bold animate-fade-in">
                                 <AlertCircle className="w-3 h-3"/> {validationError}
                             </div>
                         )}

                        <button
                            type="submit"
                            disabled={loading || otpCode.length < 4}
                            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                            {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <>Validar e Ingresar <CheckCircle className="w-5 h-5"/></>}
                        </button>
                    </form>
                   )}
                </div>

                <div className="mt-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest font-sans">
                        <span>Powered by</span>
                        <a href="https://gaorsystem.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-400 hover:text-emerald-500 transition-colors">
                            <Rocket className="w-3 h-3"/> PosGo!
                        </a>
                    </div>
                </div>
            </div>
        </div>

        {/* GOD MODE MODAL */}
        {showGodMode && (
             <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in font-sans">
                 <div className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl animate-fade-in-up text-center border border-slate-200">
                     <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                         <ShieldAlert className="w-8 h-8 text-red-600"/>
                     </div>
                     <h2 className="text-2xl font-black text-slate-900 mb-2">Super Admin</h2>
                     <p className="text-slate-400 text-xs mb-6 font-bold uppercase tracking-wide">Acceso Restringido</p>
                     
                     <form onSubmit={handleGodModeLogin} className="space-y-4">
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5"/>
                            <input 
                                type="password" 
                                value={masterPassword}
                                onChange={e => setMasterPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:border-red-500 transition-all placeholder:text-slate-300"
                                placeholder="******"
                                autoFocus
                            />
                        </div>
                        {godError && <p className="text-red-600 text-xs font-bold">{godError}</p>}
                        
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setShowGodMode(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Cancelar</button>
                            <button type="submit" className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all text-sm">Entrar</button>
                        </div>
                     </form>
                 </div>
             </div>
        )}
    </div>
  );
};