import React from 'react';
import { ViewState, StoreSettings, UserProfile } from '../types';
import { ShoppingCart, Archive, BarChart2, ShoppingBag, LogOut, User, FileText, Settings, Rocket, ShieldAlert } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  settings: StoreSettings;
  user: UserProfile;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, settings, user, onLogout, children }) => {
  
  // Desktop Nav Item
  const NavItem = ({ view, icon: Icon, label, colorClass }: { view: ViewState; icon: any; label: string; colorClass: string }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`group flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 w-full mb-3 relative ${
        currentView === view
          ? 'bg-white shadow-lg shadow-indigo-100 scale-105'
          : 'hover:bg-white/60 hover:scale-105'
      }`}
    >
      <div className={`p-2.5 rounded-xl transition-all duration-300 ${currentView === view ? colorClass : 'text-slate-400 group-hover:text-slate-600'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 transition-colors ${currentView === view ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
      
      {currentView === view && (
        <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
      )}
    </button>
  );

  // Mobile Bottom Nav Item
  const MobileNavItem = ({ view, icon: Icon, label, colorClass }: { view: ViewState; icon: any; label: string; colorClass: string }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`flex-1 flex flex-col items-center justify-center py-3 relative ${
        currentView === view ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
        <div className={`p-1.5 rounded-xl transition-all ${currentView === view ? 'bg-indigo-50 scale-110' : ''}`}>
            <Icon className={`w-6 h-6 ${currentView === view ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
        </div>
        <span className="text-[9px] font-bold mt-1">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden relative bg-[#f8fafc]">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <div className="hidden lg:flex w-24 bg-white/70 backdrop-blur-2xl border-r border-slate-200/60 flex-col items-center py-6 z-20 shadow-xl shadow-indigo-100/20 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center mb-8 group cursor-default">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-300 transform transition-transform group-hover:rotate-6 group-hover:scale-110">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <span className="text-xs font-black text-slate-800 mt-2 tracking-tight">PosGo!</span>
        </div>

        <div className="flex-1 w-full px-3 flex flex-col">
          <NavItem view={ViewState.POS} icon={ShoppingCart} label="Venta" colorClass="bg-indigo-50 text-indigo-600" />
          <NavItem view={ViewState.INVENTORY} icon={Archive} label="Stock" colorClass="bg-emerald-50 text-emerald-600" />
          <NavItem view={ViewState.PURCHASES} icon={ShoppingBag} label="Compra" colorClass="bg-amber-50 text-amber-600" />
          
          {user.role === 'admin' && (
            <>
             <div className="h-px bg-slate-200 w-1/2 mx-auto my-3 opacity-50"></div>
             <NavItem view={ViewState.REPORTS} icon={FileText} label="Reportes" colorClass="bg-blue-50 text-blue-600" />
             <NavItem view={ViewState.ADMIN} icon={BarChart2} label="Dashboard" colorClass="bg-rose-50 text-rose-600" />
             <NavItem view={ViewState.SETTINGS} icon={Settings} label="Config" colorClass="bg-slate-100 text-slate-700" />
            </>
          )}

          {/* SUPER ADMIN ITEM */}
          {user.id === 'god-mode' && (
             <>
                <div className="h-px bg-slate-200 w-1/2 mx-auto my-3 opacity-50"></div>
                <NavItem view={ViewState.SUPER_ADMIN} icon={ShieldAlert} label="Super" colorClass="bg-red-50 text-red-600" />
             </>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 px-3 w-full shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all cursor-pointer" title={user.name}>
             <User className="w-5 h-5"/>
          </div>
          <button onClick={onLogout} className="p-3 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors w-full flex justify-center group" title="Cerrar Sesión">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* BOTTOM NAVIGATION (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-[40] pb-safe flex justify-between px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <MobileNavItem view={ViewState.POS} icon={ShoppingCart} label="Venta" colorClass="" />
          <MobileNavItem view={ViewState.INVENTORY} icon={Archive} label="Stock" colorClass="" />
          <MobileNavItem view={ViewState.PURCHASES} icon={ShoppingBag} label="Compra" colorClass="" />
          {user.role === 'admin' && (
              <MobileNavItem view={ViewState.ADMIN} icon={BarChart2} label="Dash" colorClass="" />
          )}
          <button onClick={onLogout} className="flex-1 flex flex-col items-center justify-center py-3 text-slate-300 hover:text-red-500">
             <LogOut className="w-6 h-6"/>
             <span className="text-[9px] font-bold mt-1">Salir</span>
          </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col z-10 lg:pb-0 pb-[70px]">
          {children}
      </div>
    </div>
  );
};