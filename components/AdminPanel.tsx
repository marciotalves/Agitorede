
import React, { useState } from 'react';
import { Report, ChatMessage } from '../types';
import { ShieldAlert, Eye, Calendar, UserX, MessageSquare, Image as ImageIcon, Mic } from 'lucide-react';

interface AdminPanelProps {
  reports: Report[];
  onDismissReport: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ reports, onDismissReport }) => {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <div className="flex flex-col p-4 animate-in fade-in duration-500">
      <div className="mb-6 flex items-center gap-2">
        <ShieldAlert className="text-red-500" size={24} />
        <h2 className="text-xl font-black tracking-tight uppercase">Central de Denúncias</h2>
      </div>

      {!selectedReport ? (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="py-20 text-center opacity-30">
              <ShieldAlert size={48} className="mx-auto mb-2" />
              <p className="text-sm">Nenhuma denúncia pendente no sistema.</p>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Motivo: {report.reason}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-blue-400 font-mono">npub...{report.reporterPubkey.slice(-6)}</span>
                      <span className="text-slate-600">denunciou</span>
                      <span className="text-red-400 font-mono">npub...{report.reportedPubkey.slice(-6)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedReport(report)}
                      className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => onDismissReport(report.id)}
                      className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                  <Calendar size={12} />
                  {new Date(report.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden max-h-[70vh]">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h3 className="font-bold text-sm">Histórico da Denúncia</h3>
            <button 
              onClick={() => setSelectedReport(null)}
              className="text-xs text-slate-500 font-bold uppercase"
            >
              Fechar
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
            {selectedReport.chatHistory.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.senderPubkey === 'me' ? 'items-end' : 'items-start'}`}>
                <span className="text-[8px] text-slate-600 font-mono mb-0.5">
                  {msg.senderPubkey === 'me' ? 'Denunciante' : 'Denunciado'}
                </span>
                <div className={`px-3 py-2 rounded-xl text-xs max-w-[90%] ${
                  msg.senderPubkey === 'me' ? 'bg-slate-800' : 'bg-red-900/20 border border-red-900/30'
                }`}>
                  {msg.type === 'text' && <p>{msg.content}</p>}
                  {msg.type === 'image' && (
                    <div className="flex flex-col gap-2">
                      <img src={msg.mediaUrl} className="rounded-lg max-w-full h-auto" alt="Reported image" />
                      <p className="text-[10px] opacity-70 italic flex items-center gap-1"><ImageIcon size={10} /> Arquivo de Imagem</p>
                    </div>
                  )}
                  {msg.type === 'audio' && (
                    <div className="bg-slate-800/50 p-2 rounded-lg flex items-center gap-2">
                      <Mic size={14} className="text-blue-400" />
                      <div className="h-1 flex-1 bg-slate-700 rounded-full relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1/3 bg-blue-500"></div>
                      </div>
                      <span className="text-[8px] text-slate-500">0:04</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
            <p className="text-[10px] text-slate-500 font-medium">Ações de Administrador:</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-widest">Banir Usuário</button>
              <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-widest">Silenciar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
