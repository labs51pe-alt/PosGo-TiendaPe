import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  Rocket, ArrowRight, MessageSquare, CheckCircle, RefreshCw, 
  Sparkles, ShieldAlert, Lock, ChevronDown, AlertCircle, PlayCircle,
  ShoppingBag, Package, BarChart3, Zap, User, Building2, Star, Mail, Cloud, HardDrive
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
  const [adminEmail, setAdminEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [godError, setGodError] = useState('');
  const [godModeType, setGodModeType] = useState<'LOCAL' | 'CLOUD'>('LOCAL');

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
    // Remove any non-digit characters just in case
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = `${countryCode}${cleanPhone}`;

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
            // FIX: Using URLSearchParams (application/x-www-form-urlencoded) to bypass CORS preflight issues
            // on some n8n configurations. n8n reads this into $json.body automatically.
            const formData = new URLSearchParams();
            formData.append('name', demoName);
            formData.append('phone', fullPhone);
            formData.append('business_name', demoBusiness);
            formData.append('otp', randomOtp);
            formData.append('event', 'verification_request');
            formData.append('date', new Date().toISOString());

            const webhookUrl = 'https://webhook.red51.site/webhook/posgo_demos';
            
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            }).catch(err => console.warn("Webhook fetch warning (check n8n active status):", err));

            console.log("Demo OTP Generated & Sent:", randomOtp);
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
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fullPhone = `${countryCode}${cleanPhone}`;

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

  const handleGodModeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGodError('');
    setLoading(true);

    try {
        if (godModeType === 'CLOUD') {
            // 1. CLOUD LOGIN (Real Supabase Auth)
            if (!adminEmail || !masterPassword) {
                throw new Error("Ingresa email y contraseña");
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: masterPassword
            });

            if (error) throw error;

            if (data.user) {
                // Success: Cloud session active
                onLogin({ 
                    id: 'god-mode', // Using special ID to trigger Super Admin View
                    name: 'Super Admin (Cloud)', 
                    role: 'super_admin',
                    email: data.user.email 
                });
            }
        } else {
            // 2. LOCAL LOGIN (With Auto-Cloud Upgrade)
            if (masterPassword === 'Luis2021') {
                
                // ATTEMPT BACKGROUND CLOUD AUTH (Optional Power-Up)
                // If the "Local" password matches a predefined "Cloud Admin" account, sign them in for real.
                try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: 'admin@posgo.com', // Default admin handle
                        password: masterPassword  // 'Luis2021'
                    });
                    
                    if (!error && data.user) {
                        console.log("Local mode upgraded to Cloud Session successfully.");
                        onLogin({ 
                            id: 'god-mode', 
                            name: 'Super Admin (Cloud Active)', 
                            role: 'super_admin',
                            email: data.user.email 
                        });
                        return;
                    }
                } catch (e) {
                    console.warn("Background cloud auth failed, falling back to local only mode.");
                }

                // If background auth fails, ensure we are logged out (Local Only Mode)
                await supabase.auth.signOut();
                
                onLogin({ 
                    id: 'god-mode', 
                    name: 'Super Admin (Local)', 
                    role: 'super_admin' 
                });
            } else {
                throw new Error("Contraseña local incorrecta");
            }
        }
    } catch (err: any) {
        setGodError(err.message || "Error de autenticación");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-inter overflow-hidden relative selection:bg-emerald-500 selection:text-white bg-white">
        
        {/* LEFT PANEL: HERO SECTION */}
        <div className="w-full lg:w-[55%] relative z-10 flex flex-col justify-center px-8 lg:px-20 py-12 lg:py-8 bg-slate-50 overflow-hidden">
             
             {/* Animated Blobs */}
             <div className="absolute top-0 -left-4 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
             <div className="absolute top-0 -right-4 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
             <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>

             {/* Brand Header */}
             <div className="relative z-10 flex items-center gap-4 mb-12 select-none">
                 <div 
                    onClick={handleLogoClick}
                    className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-300 transform -rotate-6 transition-transform hover:rotate-0 cursor-pointer active:scale-95 group"
                 >
                     <Rocket className="w-8 h-8 text-white group-hover:animate-pulse" />
                 </div>
                 <span onClick={handleLogoClick} className="text-4xl font-black text-slate-900 tracking-tighter font-sans cursor-pointer">PosGo!</span>
             </div>

             {/* Main Content */}
             <div className="relative z-10 max-w-xl animate-fade-in-up">
                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-emerald-100 mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-sans">SISTEMA PUNTO DE VENTA ONLINE</span>
                 </div>

                 <h1 className="text-4xl lg:text-7xl font-black text-slate-900 leading-[1.05] mb-8 tracking-tight font-sans">
                     Gestiona tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Negocio</span><br/>
                     y Vende <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Sin Límites.</span>
                 </h1>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 border border-white hover:bg-white hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                            <Zap className="w-6 h-6 fill-current"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base mb-0.5">Ventas Rápidas</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">Facturación ágil en segundos, compatible con tickets.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 border border-white hover:bg-white hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-50 text-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                            <Package className="w-6 h-6"/>
                        </div>
                        <div>
                             <h3 className="font-bold text-slate-800 text-base mb-0.5">Control Total</h3>
                             <p className="text-xs text-slate-500 leading-relaxed">Inventarios, caja chica y variantes de productos.</p>
                        </div>
                    </div>
                 </div>

                 {/* Social Proofish */}
                 <div className="flex items-center gap-4 text-slate-400 text-xs font-bold font-sans">
                    <div className="flex -space-x-3">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300"></div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400 flex items-center justify-center text-[8px] text-white bg-slate-800">+1k</div>
                    </div>
                    <p>Negocios confían en nosotros</p>
                 </div>
             </div>
        </div>

        {/* RIGHT PANEL: Login Form */}
        <div className="w-full lg:w-[45%] bg-white border-l border-slate-100 flex flex-col justify-center items-center p-6 lg:p-12 relative">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
                 <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full blur-3xl opacity-50"></div>
                 <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-tr from-indigo-50 to-purple-50 rounded-full blur-3xl opacity-50"></div>
            </div>

            <div className="w-full max-w-[420px] relative z-10">
                
                {/* Mobile Logo */}
                <div className="lg:hidden flex justify-center mb-8">
                    <button onClick={handleLogoClick} className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
                        <Rocket className="w-8 h-8 text-white"/>
                    </button>
                </div>

                {/* Secret Trigger Area for Desktop */}
                <div className="hidden lg:block absolute top-10 right-10 opacity-0 w-20 h-20 cursor-default z-50" onClick={handleLogoClick}></div>

                {/* TABS SWITCHER */}
                <div className="bg-slate-100/80 p-1.5 rounded-2xl flex relative mb-8 shadow-inner">
                    <div 
                        className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${activeTab === 'DEMO' ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}
                    ></div>
                    <button 
                        onClick={() => handleTabSwitch('DEMO')}
                        className={`flex-1 py-3 text-sm font-black text-center relative z-10 transition-colors duration-300 flex items-center justify-center gap-2 ${activeTab === 'DEMO' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Quiero Probar <span className="hidden sm:inline-block bg-emerald-500 text-white text-[9px] px-1.5 rounded-md animate-pulse">GRATIS</span>
                    </button>
                    <button 
                        onClick={() => handleTabSwitch('CLIENT')}
                        className={`flex-1 py-3 text-sm font-black text-center relative z-10 transition-colors duration-300 ${activeTab === 'CLIENT' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Soy Cliente
                    </button>
                </div>

                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-black text-slate-900 mb-2 font-sans tracking-tight">
                        {activeTab === 'CLIENT' ? 'Bienvenido de nuevo' : 'Empieza Gratis Hoy'}
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">
                        {activeTab === 'CLIENT' ? 'Accede a tu panel de control.' : 'Recibe tu acceso inmediato por WhatsApp.'}
                    </p>
                </div>

                {/* CARD CONTAINER */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2rem] p-6 lg:p-8 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
                   {/* Shine effect on card */}
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-50"></div>

                   {loginStep === 'FORM' ? (
                    <form onSubmit={handleSendCode} className="space-y-5 animate-fade-in font-sans relative z-10">
                        
                        {/* Demo Specific Fields */}
                        {activeTab === 'DEMO' && (
                            <div className="space-y-4">
                                <div className="group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Tu Nombre</label>
                                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 group-focus-within:bg-white group-focus-within:border-emerald-500 group-focus-within:ring-4 group-focus-within:ring-emerald-500/10 rounded-2xl px-4 py-3 transition-all duration-300">
                                        <User className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors"/>
                                        <input 
                                            type="text" 
                                            placeholder="Ej. Juan Pérez" 
                                            className="w-full bg-transparent outline-none font-bold text-sm text-slate-800 placeholder-slate-400"
                                            value={demoName}
                                            onChange={e => setDemoName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Nombre de tu Negocio</label>
                                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 group-focus-within:bg-white group-focus-within:border-emerald-500 group-focus-within:ring-4 group-focus-within:ring-emerald-500/10 rounded-2xl px-4 py-3 transition-all duration-300">
                                        <Building2 className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors"/>
                                        <input 
                                            type="text" 
                                            placeholder="Ej. Bodega El Sol" 
                                            className="w-full bg-transparent outline-none font-bold text-sm text-slate-800 placeholder-slate-400"
                                            value={demoBusiness}
                                            onChange={e => setDemoBusiness(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="group">
                             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                {activeTab === 'CLIENT' ? 'Número de Celular' : 'WhatsApp (Para enviar código)'}
                             </label>
                             
                             <div className={`flex items-center gap-3 bg-slate-50 border border-slate-200 group-focus-within:bg-white rounded-2xl px-3 py-3 transition-all duration-300 ${activeTab === 'DEMO' ? 'group-focus-within:border-emerald-500 group-focus-within:ring-4 group-focus-within:ring-emerald-500/10' : 'group-focus-within:border-indigo-500 group-focus-within:ring-4 group-focus-within:ring-indigo-500/10'} ${validationError ? '!border-red-300 !ring-4 !ring-red-100' : ''}`}>
                                <div className="relative pl-1 pr-3 border-r border-slate-200 group-focus-within:border-slate-100 transition-colors">
                                    <select 
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="appearance-none bg-transparent font-bold text-slate-700 outline-none w-full h-full absolute inset-0 opacity-0 cursor-pointer z-10"
                                    >
                                        {COUNTRIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} +{c.code} {c.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-1.5 cursor-pointer">
                                        <span className="text-xl">{currentCountry?.flag}</span>
                                        <ChevronDown className="w-3 h-3 text-slate-400"/>
                                    </div>
                                </div>

                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    maxLength={currentCountry.length}
                                    className="w-full bg-transparent outline-none font-bold text-lg text-slate-800 placeholder:text-slate-300 tracking-wide"
                                    placeholder={currentCountry.placeholder}
                                    autoFocus
                                />
                             </div>
                             
                             {validationError && (
                                 <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold animate-fade-in mt-2 ml-1">
                                     <AlertCircle className="w-3 h-3"/> {validationError}
                                 </div>
                             )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 text-white rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden active:scale-[0.98]
                                ${activeTab === 'DEMO' 
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:to-teal-400 shadow-emerald-500/30' 
                                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:to-violet-500 shadow-indigo-500/30'}
                            `}
                        >
                             {/* Shimmer Effect */}
                             <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>

                            {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : (
                                <>
                                    {activeTab === 'CLIENT' ? 'Ingresar Ahora' : 'Obtener Acceso Demo'} 
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                                </>
                            )}
                        </button>
                    </form>
                   ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in font-sans relative z-10">
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                                <MessageSquare className="w-6 h-6 fill-current"/>
                            </div>
                            <h3 className="font-bold text-slate-900 text-lg mb-1">Código de Verificación</h3>
                            <p className="text-sm text-slate-500">
                                Enviado a <span className="font-bold text-slate-800">+{countryCode} {phoneNumber}</span>
                            </p>
                            <button type="button" onClick={() => setLoginStep('FORM')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:underline mt-2">
                                ¿Número incorrecto?
                            </button>
                        </div>
                        
                        <div className="flex justify-center my-2 group">
                            <input
                                type="text"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                className="w-full text-center bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 font-black text-3xl tracking-[0.5em] text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-300 shadow-sm"
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
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 group"
                        >
                            {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <>Validar e Ingresar <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform"/></>}
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
                 <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-fade-in-up text-center border border-slate-200">
                     <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
                         <ShieldAlert className="w-8 h-8 text-red-600"/>
                     </div>
                     <h2 className="text-2xl font-black text-slate-900 mb-2">Super Admin</h2>
                     <p className="text-slate-400 text-xs mb-6 font-bold uppercase tracking-wide">Panel de Control Maestro</p>
                     
                     {/* Toggle Mode */}
                     <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                         <button 
                            onClick={() => { setGodModeType('LOCAL'); setGodError(''); }} 
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${godModeType === 'LOCAL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                             <HardDrive className="w-3 h-3"/> Local (Offline)
                         </button>
                         <button 
                            onClick={() => { setGodModeType('CLOUD'); setGodError(''); }} 
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${godModeType === 'CLOUD' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'text-slate-400 hover:text-slate-600'}`}
                         >
                             <Cloud className="w-3 h-3"/> Cloud (Sync)
                         </button>
                     </div>

                     <form onSubmit={handleGodModeLogin} className="space-y-4">
                        
                        {godModeType === 'CLOUD' && (
                            <div className="relative group animate-fade-in">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-red-500 transition-colors"/>
                                <input 
                                    type="email" 
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold outline-none focus:border-red-500 focus:bg-white transition-all placeholder:text-slate-300"
                                    placeholder="admin@posgo.com"
                                    required
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-red-500 transition-colors"/>
                            <input 
                                type="password" 
                                value={masterPassword}
                                onChange={e => setMasterPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold outline-none focus:border-red-500 focus:bg-white transition-all placeholder:text-slate-300"
                                placeholder={godModeType === 'CLOUD' ? "Contraseña" : "Código Local (Luis2021)"}
                                required
                            />
                        </div>
                        {godError && <p className="text-red-600 text-xs font-bold animate-fade-in">{godError}</p>}
                        
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setShowGodMode(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Cancelar</button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className={`flex-1 py-3 font-bold rounded-xl text-white transition-all text-sm shadow-lg flex items-center justify-center gap-2 ${godModeType === 'CLOUD' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-slate-800 hover:bg-black shadow-slate-300'}`}
                            >
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Acceder'}
                            </button>
                        </div>
                     </form>
                 </div>
             </div>
        )}
    </div>
  );
};