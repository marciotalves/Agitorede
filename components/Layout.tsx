
import React from 'react';
import { Sparkles, MessageSquare, User, Zap, ShieldAlert } from 'lucide-react';
import { AppRoute } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeRoute: AppRoute;
  setRoute: (route: AppRoute) => void;
  isAdmin?: boolean;
}

const NavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${
      active 
        ? 'text-blue-400 font-bold' 
        : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] uppercase tracking-tighter">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeRoute, setRoute, isAdmin }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-950 border-x border-slate-900 shadow-2xl overflow-hidden relative">
      {/* Top Header */}
      <header className="px-4 py-3 border-b border-slate-900 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Zap size={18} fill="white" className="text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tighter text-white">AGITO</h1>
          {isAdmin && (
            <span className="bg-red-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white tracking-widest uppercase">Admin</span>
          )}
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-blue-400">ON-LINE</span>
           </div>
        </div>
      </header>

      {/* Main Content Scrollable Area */}
      <main className="flex-1 overflow-y-auto pb-20 scroll-smooth flex flex-col">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 flex px-2 py-1 z-50">
        <NavItem icon={Sparkles} label="Agitar" active={activeRoute === AppRoute.DISCOVER} onClick={() => setRoute(AppRoute.DISCOVER)} />
        <NavItem icon={MessageSquare} label="Chats" active={activeRoute === AppRoute.CHAT} onClick={() => setRoute(AppRoute.CHAT)} />
        <NavItem icon={User} label="Perfil" active={activeRoute === AppRoute.PROFILE} onClick={() => setRoute(AppRoute.PROFILE)} />
        {isAdmin && (
          <NavItem icon={ShieldAlert} label="Painel" active={activeRoute === AppRoute.ADMIN} onClick={() => setRoute(AppRoute.ADMIN)} />
        )}
      </nav>
    </div>
  );
};
