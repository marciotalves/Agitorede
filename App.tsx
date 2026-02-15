import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { ProfileView } from './components/ProfileView';
import { ChatView } from './components/ChatView';
import { AdminPanel } from './components/AdminPanel';
import { AppRoute, UserProfile, NostrEvent, ChatMessage, Report, MatchFilters } from './types';
import { nostrService } from './services/nostr';
import { Sparkles, Loader2, ShieldCheck, Zap, MessageSquare, LogIn, UserPlus, ArrowRight, Camera, Key, Settings2, MapPin, Users, Calendar, Share2, Copy, Crown } from 'lucide-react';

const ADMIN_NSEC = "nsec1w0sc7873p9hn8j5gfg8m3w93v0rghycx5hq9sl3nan4frlac5lzsz4lc56";

const App: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState<AppRoute>(AppRoute.DISCOVER);
  const [activeUsers, setActiveUsers] = useState<Map<string, UserProfile>>(new Map());
  
  // Estado de autenticação
  const [loggedInKey, setLoggedInKey] = useState<string | null>(localStorage.getItem('agito_key'));
  const [userPubkey, setUserPubkey] = useState<string | null>(localStorage.getItem('agito_pubkey'));
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Match & Filters
  const [isMatching, setIsMatching] = useState(false);
  const [showMatchFilters, setShowMatchFilters] = useState(false);
  const [matchFilters, setMatchFilters] = useState<MatchFilters>({
    location: 'GLOBAL', 
    gender: 'all', 
    ageMin: 18,
    ageMax: 35
  });

  const [view, setView] = useState<'login' | 'signup'>('login');
  
  // Login/Signup states
  const [loginInput, setLoginInput] = useState('');
  const [newName, setNewName] = useState('');
  const [newPicture, setNewPicture] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    // 1. Configurar Listener Global para a tela Descobrir
    nostrService.setGlobalFeedListener((profile) => {
        const about = (profile.about || "").toLowerCase();
        const name = (profile.display_name || profile.name || "").toLowerCase();
        
        // Correção: Verifica se nip05 é string antes de chamar endsWith
        const isBr = about.includes('brasil') || 
                     about.includes('brazil') || 
                     about.includes('pt-br') || 
                     (typeof profile.nip05 === 'string' && profile.nip05.endsWith('.br'));

        if (isBr) {
            profile.inferredLocation = 'BR';
        } else {
            profile.inferredLocation = 'GLOBAL';
        }

        const isMale = ['o', 'e', 'u'].includes(name.slice(-1)); 
        profile.inferredGender = isMale ? 'male' : 'female';
        
        const ageSeed = parseInt(profile.pubkey.slice(-2), 16);
        profile.inferredAge = 18 + (ageSeed % 40); 

        setActiveUsers(prev => {
            const next = new Map(prev);
            // Filtra o próprio usuário da lista de descoberta
            if (userPubkey && profile.pubkey !== userPubkey) {
                next.set(profile.pubkey, profile);
            } else if (!userPubkey) {
                next.set(profile.pubkey, profile);
            }
            return next;
        });
    });

    if (!loggedInKey) return;

    // Lógica Estrita de Admin: Verifica se é a chave do DONO fornecida
    const isOwner = loggedInKey === ADMIN_NSEC || 
                    loggedInKey.includes("1w0sc7873p9hn8j"); // Verificação parcial de segurança do nsec

    if (isOwner) {
      console.log("👑 ACESSO TOTAL CONCEDIDO: DONO DO AGITO 👑");
      setIsAdmin(true);
      setIsPremium(true); // Dono tem premium ilimitado
    } else {
      setIsPremium(localStorage.getItem('agito_premium') === 'true');
    }

    // Se temos a pubkey, buscamos o perfil
    if (userPubkey) {
        setIsLoadingProfile(true);
        console.log("Fetching profile for pubkey:", userPubkey);
        
        const unsubMyProfile = nostrService.subscribeMetadata((profile: UserProfile) => {
          if (profile.pubkey === userPubkey) {
            console.log("Profile updated:", profile);
            setUserProfile(profile);
            setIsLoadingProfile(false);
          }
        });

        nostrService.fetchProfile(userPubkey);
        return () => { unsubMyProfile(); };
    }
  }, [loggedInKey, userPubkey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;

    // Processa a chave (NSEC -> Priv Hex + Pub Hex)
    const keys = nostrService.processLogin(loginInput.trim());
    
    if (keys) {
        // Armazena a chave de "sessão"
        const sessionKey = keys.privkey || keys.pubkey;
        
        // Se for a chave do admin, salva ela pura para garantir a verificação
        const keyToStore = loginInput.trim() === ADMIN_NSEC ? ADMIN_NSEC : sessionKey;
        
        localStorage.setItem('agito_key', keyToStore || "");
        localStorage.setItem('agito_pubkey', keys.pubkey);
        
        setLoggedInKey(keyToStore);
        setUserPubkey(keys.pubkey);
        
        setActiveUsers(new Map());
        setUserProfile(null); 
        
        // Check imediato de admin no login
        if (loginInput.trim() === ADMIN_NSEC) {
            setIsAdmin(true);
            setIsPremium(true);
        }
    } else {
        alert("Chave inválida. Verifique se copiou corretamente (nsec... ou npub...).");
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const identity = nostrService.generateNewIdentity();
    const profileData: UserProfile = {
      pubkey: identity.pubkey,
      display_name: newName,
      name: newName,
      picture: newPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${identity.pubkey}`,
      about: "Novo no Agito!"
    };

    localStorage.setItem('agito_key', identity.privkey);
    localStorage.setItem('agito_pubkey', identity.pubkey);
    
    setLoggedInKey(identity.privkey);
    setUserPubkey(identity.pubkey);
    setUserProfile(profileData);
    
    await nostrService.publishMetadata(identity.privkey, profileData);
  };

  const handleLogout = () => {
    setLoggedInKey(null);
    setUserPubkey(null);
    setUserProfile(null);
    setIsAdmin(false);
    setIsPremium(false);
    localStorage.removeItem('agito_key');
    localStorage.removeItem('agito_pubkey');
  };

  const handleMatch = () => {
    const candidates = Array.from(activeUsers.values()).filter((u: UserProfile) => {
       if (u.pubkey === userPubkey) return false;
       if (matchFilters.location === 'BR' && u.inferredLocation !== 'BR') return false;
       if (matchFilters.gender !== 'all' && u.inferredGender !== matchFilters.gender) return false;
       if (u.inferredAge && (u.inferredAge < matchFilters.ageMin || u.inferredAge > matchFilters.ageMax)) return false;
       return true;
    });

    if (candidates.length === 0) {
      alert(`Nenhum usuário encontrado com esses filtros. Tente expandir a busca. Usuários online: ${activeUsers.size}`);
      return;
    }

    setIsMatching(true);
    setTimeout(() => {
      setSelectedUser(candidates[Math.floor(Math.random() * candidates.length)]);
      setActiveRoute(AppRoute.CHAT);
      setIsMatching(false);
    }, 1500);
  };

  const handleReport = (history: ChatMessage[]) => {
      const newReport: Report = {
          id: Math.random().toString(36).substr(2, 9),
          reporterPubkey: userPubkey || 'unknown',
          reportedPubkey: selectedUser?.pubkey || 'unknown',
          timestamp: Date.now(),
          chatHistory: history,
          reason: 'Comportamento inadequado'
      };
      setReports(prev => [newReport, ...prev]);
  };

  const onlineUsers = useMemo(() => {
    return Array.from(activeUsers.values()).slice(0, 50);
  }, [activeUsers]);

  if (!loggedInKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-inter">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900/40 mx-auto mb-6">
              <Zap size={48} fill="white" className="text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 italic">AGITO</h1>
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Cliente Nostr Real</p>
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
                  placeholder="Sua chave (nsec...)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-blue-400 font-mono"
                />
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all">
                <LogIn size={20} /> Conectar à Rede
              </button>
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
                  placeholder="Nome Real"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none"
                  required
                />
                <input 
                  type="url" 
                  value={newPicture}
                  onChange={(e) => setNewPicture(e.target.value)}
                  placeholder="URL da Foto Real"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-400 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all">
                <UserPlus size={20} /> Gerar Identidade
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-900 flex flex-col items-center gap-4">
             <p className="text-[10px] text-slate-500 text-center uppercase tracking-[0.2em] font-medium italic">
                Sem Bots • Apenas Pessoas Reais
             </p>
          </div>
        </div>
      </div>
    );
  }

  // Verifica se o usuário está vendo o próprio perfil
  const isOwnProfile = !selectedUser || (userPubkey ? selectedUser?.pubkey === userPubkey : false);

  return (
    <Layout activeRoute={activeRoute} setRoute={setActiveRoute} isAdmin={isAdmin}>
      {activeRoute === AppRoute.DISCOVER && (
        <div className="p-4 animate-in fade-in duration-500 relative">
          <div className="flex items-center justify-between mb-10 mt-2">
            <div className="flex items-center gap-4">
              <div className="relative cursor-pointer" onClick={() => setActiveRoute(AppRoute.PROFILE)}>
                {(isPremium || isAdmin) && <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 animate-spin-slow blur-[2px]"></div>}
                {isLoadingProfile ? (
                    <div className="w-12 h-12 rounded-full border-2 border-slate-800 bg-slate-900 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                    </div>
                ) : (
                    <img 
                      src={userProfile?.picture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                      className="w-12 h-12 rounded-full border-2 border-slate-950 relative z-10 object-cover"
                      alt="Avatar"
                    />
                )}
              </div>
              <div onClick={() => setActiveRoute(AppRoute.PROFILE)} className="cursor-pointer">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter">DESCOBRIR</h2>
                    {isAdmin && <Crown size={14} className="text-yellow-500" />}
                </div>
                <p className="text-blue-500 text-[10px] font-black tracking-widest uppercase truncate max-w-[160px]">
                  {isLoadingProfile ? "Buscando Perfil..." : (userProfile?.display_name || userProfile?.name || 'Anon')}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition-colors">
              <LogIn className="rotate-180" size={20} />
            </button>
          </div>

          <div className="flex justify-center mb-16 relative">
            <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full"></div>
            <div className="relative">
                <button 
                  onClick={handleMatch}
                  disabled={isMatching}
                  className="w-48 h-48 rounded-full bg-blue-600 flex flex-col items-center justify-center gap-2 shadow-[0_0_50px_rgba(37,99,235,0.4)] relative z-10 border-[12px] border-slate-950 active:scale-95 transition-all group"
                >
                  {isMatching ? <Loader2 size={64} className="animate-spin text-white" /> : <Zap size={72} fill="white" className="group-hover:scale-110 transition-transform" />}
                  {!isMatching && <span className="font-black text-white italic tracking-[0.2em] text-2xl">AGITAR</span>}
                </button>
                
                <button 
                  onClick={() => setShowMatchFilters(!showMatchFilters)}
                  className="absolute bottom-2 right-2 z-20 bg-slate-900 border border-slate-700 p-3 rounded-full text-slate-300 hover:text-white hover:border-blue-500 shadow-xl transition-all active:scale-90"
                >
                  <Settings2 size={20} />
                </button>
            </div>
          </div>

          {showMatchFilters && (
             <div className="absolute top-24 left-4 right-4 z-30 bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 p-6 rounded-[2rem] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black italic uppercase text-white tracking-widest">Preferências</h3>
                    <button onClick={() => setShowMatchFilters(false)} className="text-slate-500 hover:text-white font-bold text-xs uppercase">Fechar</button>
                </div>
                {/* ... (Conteúdo dos filtros mantido igual) ... */}
                <div className="mb-6 space-y-3">
                   <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <MapPin size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Localização</span>
                   </div>
                   <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button 
                        onClick={() => setMatchFilters({...matchFilters, location: 'BR'})}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${matchFilters.location === 'BR' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                      >
                        🇧🇷 Brasil
                      </button>
                      <button 
                        onClick={() => setMatchFilters({...matchFilters, location: 'GLOBAL'})}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${matchFilters.location === 'GLOBAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                      >
                        🌍 Global
                      </button>
                   </div>
                </div>

                <div className="mb-6 space-y-3">
                   <div className="flex items-center gap-2 text-rose-400 mb-2">
                      <Users size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Interesse</span>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => setMatchFilters({...matchFilters, gender: 'male'})}
                        className={`flex-1 py-3 rounded-xl border transition-all ${matchFilters.gender === 'male' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                      >
                         <span className="text-xs font-bold uppercase">Homens</span>
                      </button>
                      <button 
                        onClick={() => setMatchFilters({...matchFilters, gender: 'female'})}
                        className={`flex-1 py-3 rounded-xl border transition-all ${matchFilters.gender === 'female' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                      >
                         <span className="text-xs font-bold uppercase">Mulheres</span>
                      </button>
                      <button 
                         onClick={() => setMatchFilters({...matchFilters, gender: 'all'})}
                         className={`flex-1 py-3 rounded-xl border transition-all ${matchFilters.gender === 'all' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                      >
                         <span className="text-xs font-bold uppercase">Todos</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center justify-between text-yellow-500 mb-2">
                      <div className="flex items-center gap-2">
                         <Calendar size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Idade</span>
                      </div>
                      <span className="text-xs font-bold text-white">{matchFilters.ageMin} - {matchFilters.ageMax} anos</span>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex-1">
                          <label className="text-[9px] text-slate-500 uppercase font-bold">Mínima</label>
                          <input 
                            type="range" min="13" max="100" 
                            value={matchFilters.ageMin} 
                            onChange={(e) => setMatchFilters({...matchFilters, ageMin: Number(e.target.value)})}
                            className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-yellow-500"
                          />
                      </div>
                      <div className="flex-1">
                          <label className="text-[9px] text-slate-500 uppercase font-bold">Máxima</label>
                          <input 
                            type="range" min="13" max="100" 
                            value={matchFilters.ageMax} 
                            onChange={(e) => setMatchFilters({...matchFilters, ageMax: Number(e.target.value)})}
                            className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-yellow-500"
                          />
                      </div>
                   </div>
                </div>
             </div>
          )}

          <div>
             <div className="flex justify-between items-end mb-6 border-b border-slate-900 pb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Pessoas na Rede</h3>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-600">{onlineUsers.length} ONLINE</span>
                </div>
             </div>
             
             <div className="grid grid-cols-4 gap-6">
                {onlineUsers.length > 0 ? onlineUsers.map(user => (
                  <button 
                    key={user.pubkey}
                    onClick={() => { setSelectedUser(user); setActiveRoute(AppRoute.PROFILE); }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-slate-800 overflow-hidden group-hover:border-blue-500 transition-all bg-slate-900 relative">
                      <img 
                        src={user.picture} 
                        className="w-full h-full object-cover" 
                        alt="" 
                        onError={e => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                      />
                      {user.inferredLocation === 'BR' && (
                         <span className="absolute bottom-0 right-0 text-[10px]">🇧🇷</span>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase text-slate-500 truncate w-full text-center tracking-tighter group-hover:text-white">
                        {user.display_name?.split(' ')[0] || user.name?.split(' ')[0] || 'Anon'}
                    </span>
                  </button>
                )) : (
                  <div className="col-span-4 py-12 text-center text-slate-600 text-xs font-bold uppercase tracking-widest italic opacity-50 flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin" />
                    Sintonizando frequências Nostr...
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {activeRoute === AppRoute.PROFILE && (
        <ProfileView 
          profile={selectedUser || userProfile} 
          // AQUI: Força isPremium = true se for Admin ou se o usuário já for premium
          isPremium={isAdmin || (isOwnProfile && isPremium)} 
          onActivatePremium={() => { setIsPremium(true); localStorage.setItem('agito_premium', 'true'); }}
          isOwnProfile={isOwnProfile}
        />
      )}

      {activeRoute === AppRoute.CHAT && selectedUser && (
        <ChatView 
            recipient={selectedUser} 
            onBack={() => { setActiveRoute(AppRoute.DISCOVER); setSelectedUser(null); }} 
            isPremium={isPremium || isAdmin} 
            onReport={handleReport} 
            onViewProfile={() => setActiveRoute(AppRoute.PROFILE)} 
        />
      )}

      {activeRoute === AppRoute.ADMIN && isAdmin && (
        <AdminPanel reports={reports} onDismissReport={(id) => setReports(prev => prev.filter(r => r.id !== id))} />
      )}
    </Layout>
  );
};

export default App;