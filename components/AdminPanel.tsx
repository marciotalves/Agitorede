
import React, { useState } from 'react';
import { Report, ChatMessage } from '../types';
import { ShieldAlert, Eye, Calendar, UserX, MessageSquare, Image as ImageIcon, Mic, AlertTriangle, LockOpen, Ban, CheckCircle } from 'lucide-react';

interface AdminPanelProps {
  reports: Report[];
  onDismissReport: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ reports, onDismissReport }) => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleBlockUser = (pubkey: string) => {
      // Simulação de bloqueio
      setActionFeedback(`Usuário ${pubkey.slice(0, 8)}... banido da plataforma Agito.`);
      setTimeout(() => setActionFeedback(null), 3000);
      if(selectedReport) onDismissReport(selectedReport.id);
      setSelectedReport(null);
  };

  return (
    <div className="flex flex-col p-4 animate-in fade-in duration-500 h-full">
      <div className="mb-6 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={24} />
            <h2 className="text-xl font-black tracking-tight uppercase">Moderação Agito</h2>
         </div>
         {reports.length > 0 && (
             <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                {reports.length} PENDENTES
             </span>
         )}
      </div>

      {actionFeedback && (
          <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl mb-4 flex items-center gap-3 animate-in slide-in-from-top-2">
              <CheckCircle className="text-green-500" size={20} />
              <p className="text-xs font-bold text-green-400">{actionFeedback}</p>
          </div>
      )}

      {!selectedReport ? (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="py-20 text-center opacity-30 flex flex-col items-center">
              <ShieldAlert size={48} className="mx-auto mb-2" />
              <p className="text-sm font-bold uppercase tracking-widest">Tudo Limpo</p>
              <p className="text-xs mt-1">Nenhuma denúncia ativa na rede.</p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-red-500/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={14} className="text-yellow-500" />
                        <p className="text-[10px] text-yellow-500 font-black uppercase tracking-wider">Motivo: {report.reason}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                       <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[9px] uppercase font-bold w-16">Acusador:</span>
                          <span className="text-blue-400 font-mono bg-blue-400/10 px-1 rounded">{report.reporterPubkey.slice(0, 12)}...</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[9px] uppercase font-bold w-16">Acusado:</span>
                          <span className="text-red-400 font-mono bg-red-400/10 px-1 rounded">{report.reportedPubkey.slice(0, 12)}...</span>
                       </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedReport(report)}
                      className="p-3 bg-red-600 text-white rounded-xl shadow-lg shadow-red-900/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <Eye size={16} />
                      <span className="text-[9px] font-black uppercase hidden sm:inline">Ver Provas</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-1">
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                        <Calendar size={12} />
                        {new Date(report.timestamp).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <MessageSquare size={12} />
                        {report.chatHistory.length} mensagens
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-slate-950 border border-red-500/30 rounded-[2rem] flex flex-col overflow-hidden h-full shadow-2xl relative">
          {/* HEADER DE QUEBRA DE SIGILO */}
          <div className="p-4 border-b border-red-500/20 bg-red-950/20 flex justify-between items-center backdrop-blur-md">
            <div className="flex items-center gap-2">
               <div className="bg-red-500 p-1.5 rounded-lg">
                   <LockOpen size={16} className="text-white" />
               </div>
               <div>
                   <h3 className="font-black text-red-500 text-xs uppercase tracking-[0.2em]">Sigilo Quebrado</h3>
                   <p className="text-[9px] text-red-400/70">Visualização autorizada para moderação</p>
               </div>
            </div>
            <button 
              onClick={() => setSelectedReport(null)}
              className="text-xs text-slate-500 font-bold uppercase hover:text-white px-3 py-1 bg-slate-900 rounded-lg"
            >
              Fechar
            </button>
          </div>
          
          {/* AREA DE CHAT (EVIDÊNCIA) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
            
            {selectedReport.chatHistory.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.senderPubkey === 'me' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                   <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${msg.senderPubkey === 'me' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'}`}>
                      {msg.senderPubkey === 'me' ? 'Denunciante' : 'ACUSADO'}
                   </span>
                   <span className="text-[8px] text-slate-600 font-mono">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                
                <div className={`px-4 py-3 rounded-2xl text-xs max-w-[90%] border ${
                  msg.senderPubkey === 'me' 
                    ? 'bg-slate-900 border-slate-800 text-slate-300' 
                    : 'bg-red-950/30 border-red-500/30 text-red-100'
                }`}>
                  {msg.type === 'text' && <p className="leading-relaxed">{msg.content}</p>}
                  
                  {msg.type === 'image' && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="relative group overflow-hidden rounded-lg border border-white/10">
                          <img src={msg.mediaUrl} className="max-w-full h-auto object-cover" alt="Reported image" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="text-white" />
                          </div>
                      </div>
                      <p className="text-[9px] opacity-70 italic flex items-center gap-1"><ImageIcon size={10} /> Mídia de Imagem</p>
                    </div>
                  )}
                  
                  {msg.type === 'audio' && (
                    <div className="bg-black/30 p-3 rounded-xl flex items-center gap-3 border border-white/5">
                      <div className="bg-red-500/20 p-2 rounded-full">
                         <Mic size={14} className="text-red-400" />
                      </div>
                      <div className="flex-1">
                          <div className="h-6 w-32 flex items-center gap-0.5">
                              {[...Array(10)].map((_, i) => (
                                  <div key={i} className="w-1 bg-red-500/50 rounded-full" style={{height: `${Math.random() * 100}%`}}></div>
                              ))}
                          </div>
                      </div>
                      <span className="text-[8px] text-slate-400 font-mono">AUDIO</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* RODAPÉ DE AÇÃO */}
          <div className="p-4 bg-slate-900 border-t border-red-500/20 flex flex-col gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10">
            <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertTriangle size={14} />
                <p className="text-[10px] font-black uppercase tracking-widest">Painel de Decisão Soberana</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleBlockUser(selectedReport.reportedPubkey)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 active:scale-95 transition-all"
              >
                <Ban size={14} /> Banir Usuário
              </button>
              <button 
                onClick={() => onDismissReport(selectedReport.id)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all"
              >
                Arquivar (Sem Ação)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
