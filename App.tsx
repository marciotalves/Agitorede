
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { ProfileView } from './components/ProfileView';
import { ChatView } from './components/ChatView';
import { AdminPanel } from './components/AdminPanel';
import { AppRoute, UserProfile, NostrEvent, ChatMessage, Report } from './types';
import { nostrService } from './services/nostr';
import { Sparkles, Loader2, ShieldCheck, Zap, MessageSquare, LogIn, UserPlus, ArrowRight, Camera, Key } from 'lucide-react';

const ADMIN_NSEC = "nsec1w0sc7873p9hn8j5gfg8m3w93v0rghycx5hq9sl3nan4frlac5lzsz4lc56";

const App: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.DISCOVER);
  const [activeUsers, setActiveUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loggedInKey, setLoggedInKey] = useState<string | null>(localStorage.getItem('agito_key'));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [view, setView] = useState<'login' | 'signup'>('login');
  
  // Login/Signup states
  const [loginInput, setLoginInput] = useState('');
  const [newName, setNewName] = useState('');
  const [newPicture, setNewPicture] = useState('');
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (!loggedInKey) return;

    // Verificação de Admin e Premium
    if (loggedInKey === ADMIN_NSEC || loggedInKey.includes("1w0sc7873p9hn8j")) {
      setIsAdmin(true);
      setIsPremium(true);
      if (!userProfile) {
        setUserProfile({
          pubkey: loggedInKey,
          display_name: "Dono do Agito",
          picture: "https://api.dicebear.com/7.x/bottts/svg?seed=admin_master",
          about: "Administrador Central do Protocolo Agito."
        });
      }
    } else {
      setIsPremium(localStorage.getItem('agito_premium') === 'true');
    }

    const unsubMetadata = nostrService.subscribeMetadata((profile: UserProfile) => {
      // Ajuste para reconhecer o próprio perfil mesmo que a chave seja nsec ou hex
      if (profile.pubkey === loggedInKey || (loggedInKey && loggedInKey.includes(profile.pubkey))) {
        setUserProfile(profile);
      }
      setActiveUsers(prev => {
        const next = new Map(prev);
        next.set(profile.pubkey, profile);
        return next;
      });
    });

    nostrService.fetchProfile(loggedInKey);
    return () => unsubMetadata();
  }, [loggedInKey, userProfile]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    const cleanKey = await nostrService.tryDecode(loginInput.trim());
    localStorage.setItem('agito_key', cleanKey);
    setLoggedInKey(cleanKey);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const identity = nostrService.generateNewIdentity();
    const profile: UserProfile = {
      pubkey: identity.pubkey,
      display_name: newName,
      name: newName,
      picture: newPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${identity.pubkey}`,
      about: "Novo no Agito!"
    };

    localStorage.setItem('agito_key', identity.privkey);
    localStorage.setItem(`local_profile_${identity.pubkey}`, JSON.stringify(profile));
    setLoggedInKey(identity.privkey);
    setUserProfile(profile);
  };

  const handleLogout = () => {
    setLoggedInKey(null);
    setUserProfile(null);
    setIsAdmin(false);
    setIsPremium(false);
    localStorage.removeItem('agito_key');
  };

  const handleMatch = () => {
    const users = Array.from(activeUsers.values()).filter((u: UserProfile) => u.pubkey !== loggedInKey);
    if (users.length === 0) {
      alert("Sincronizando com a rede... tente novamente em segundos.");
      return;
    }
    setIsMatching(true);
    setTimeout(() => {
      setSelectedUser(users[Math.floor(Math.random() * users.length)]);
      setActiveRoute(AppRoute.CHAT);
      setIsMatching(false);
    }, 1200);
  };

  const onlineUsers = useMemo(() => {
    return Array.from(activeUsers.values())
      .filter((u: UserProfile) => u.pubkey !== loggedInKey && (loggedInKey ? !loggedInKey.includes(u.pubkey) : true))
      .slice(0, 20);
  }, [activeUsers, loggedInKey]);

  if (!loggedInKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-inter">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900/40 mx-auto mb-6">
              <Zap size={48} fill="white" className="text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 italic">AGITO</h1>
            <div className="flex justify-center gap-6 mt-6">
              <button 
                onClick={() => setView('login')}
                className={`text-[11px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${view === 'login' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500'}`}
              >
                Entrar
              </button>
              <button 
                onClick={() => setView('signup')}
                className={`text-[11px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${view === 'signup' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500'}`}
              >
                Novo Perfil
              </button>
            </div>
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input 
                  type="password" 
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Chave Nostr (npub / nsec / hex)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-blue-400 font-mono"
                />
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all">
                <LogIn size={20} /> Entrar Agora
              </button>
              <p className="text-[9px] text-center text-slate-600 uppercase font-bold tracking-widest leading-relaxed">
                Use seu nsec de Admin para privilégios totais.
              </p>
            </form>
          ) : (
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="space-y-4">
                <div className="mx-auto w-24 h-24 bg-slate-900 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative">
                  {newPicture ? (
                    <img src={newPicture} className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="text-slate-600" size={32} />
                  )}
                </div>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Seu Nome de Exibição"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none"
                  required
                />
                <input 
                  type="url" 
                  value={newPicture}
                  onChange={(e) => setNewPicture(e.target.value)}
                  placeholder="URL da Foto (opcional)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-400 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all">
                <UserPlus size={20} /> Criar Identidade
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-900">
             <p className="text-[10px] text-slate-500 text-center uppercase tracking-[0.2em] font-medium italic">
                Criptografia Descentralizada • Nostr Native
             </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeRoute={activeRoute} setRoute={setActiveRoute} isAdmin={isAdmin}>
      {activeRoute === AppRoute.DISCOVER && (
        <div className="p-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between mb-10 mt-2">
            <div className="flex items-center gap-4">
              <div className="relative" onClick={() => setActiveRoute(AppRoute.PROFILE)}>
                {isPremium && <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 animate-spin-slow blur-[2px]"></div>}
                <img 
                  src={userProfile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${loggedInKey}`} 
                  className="w-12 h-12 rounded-full border-2 border-slate-950 relative z-10"
                  alt="Avatar"
                />
              </div>
              <div onClick={() => setActiveRoute(AppRoute.PROFILE)} className="cursor-pointer">
                <h2 className="text-xl font-black italic uppercase tracking-tighter">DESCOBRIR</h2>
                <p className="text-blue-500 text-[10px] font-black tracking-widest uppercase truncate max-w-[160px]">
                  {userProfile?.display_name || userProfile?.name || 'Carregando...'}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition-colors">
              <LogIn className="rotate-180" size={20} />
            </button>
          </div>

          <div className="flex justify-center mb-16 relative">
            <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full"></div>
            <button 
              onClick={handleMatch}
              disabled={isMatching}
              className="w-48 h-48 rounded-full bg-blue-600 flex flex-col items-center justify-center gap-2 shadow-[0_0_50px_rgba(37,99,235,0.4)] relative z-10 border-[12px] border-slate-950 active:scale-95 transition-all group"
            >
              {isMatching ? <Loader2 size={64} className="animate-spin text-white" /> : <Zap size={72} fill="white" className="group-hover:scale-110 transition-transform" />}
              {!isMatching && <span className="font-black text-white italic tracking-[0.2em] text-2xl">AGITAR</span>}
            </button>
          </div>

          <div>
             <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 border-b border-slate-900 pb-2">Identidades Ativas</h3>
             <div className="grid grid-cols-4 gap-6">
                {onlineUsers.length > 0 ? onlineUsers.map(user => (
                  <button 
                    key={user.pubkey}
                    onClick={() => { setSelectedUser(user); setActiveRoute(AppRoute.PROFILE); }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-slate-800 overflow-hidden group-hover:border-blue-500 transition-all">
                      <img src={user.picture} className="w-full h-full object-cover" alt="" onError={e => e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.pubkey}`} />
                    </div>
                    <span className="text-[9px] font-black uppercase text-slate-500 truncate w-full text-center tracking-tighter group-hover:text-white">{user.display_name || 'Anon'}</span>
                  </button>
                )) : (
                  <div className="col-span-4 py-8 text-center text-slate-600 text-xs font-bold uppercase tracking-widest italic opacity-50">
                    Buscando sinais nos relés...
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {activeRoute === AppRoute.PROFILE && (
        <ProfileView 
          profile={selectedUser || userProfile} 
          isPremium={(!selectedUser || (loggedInKey && loggedInKey.includes(selectedUser.pubkey)) || isAdmin) ? isPremium : false} 
          onActivatePremium={() => { setIsPremium(true); localStorage.setItem('agito_premium', 'true'); }}
          isOwnProfile={!selectedUser || (loggedInKey ? loggedInKey.includes(selectedUser.pubkey) : false)}
        />
      )}

      {activeRoute === AppRoute.CHAT && selectedUser && (
        <ChatView recipient={selectedUser} onBack={() => { setActiveRoute(AppRoute.DISCOVER); setSelectedUser(null); }} isPremium={isPremium} onReport={() => {}} onViewProfile={() => setActiveRoute(AppRoute.PROFILE)} />
      )}

      {activeRoute === AppRoute.ADMIN && isAdmin && (
        <AdminPanel reports={reports} onDismissReport={(id) => setReports(prev => prev.filter(r => r.id !== id))} />
      )}
    </Layout>
  );
};

export default App;
