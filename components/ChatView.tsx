import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, ShieldCheck, ShieldAlert, Image as ImageIcon, Mic, Paperclip, Lock } from 'lucide-react';
import { UserProfile, ChatMessage } from '../types';

interface ChatViewProps {
  recipient: UserProfile;
  onBack: () => void;
  isPremium: boolean;
  onReport: (history: ChatMessage[]) => void;
  onViewProfile: (user: UserProfile) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ recipient, onBack, isPremium, onReport, onViewProfile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (type: 'text' | 'image' | 'audio' = 'text', content: string = '', mediaUrl?: string) => {
    const textToSend = content || input;
    if (!textToSend.trim() && type === 'text') return;
    
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      senderPubkey: 'me',
      content: textToSend,
      timestamp: Date.now(),
      type,
      mediaUrl
    };
    
    setMessages([...messages, newMessage]);
    if (type === 'text') setInput('');
    
    // Simulate responses from real Nostr users (Kind 4 would be real DMs)
    setTimeout(() => {
      const reply: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        senderPubkey: recipient.pubkey,
        content: `Oi! Sou o ${recipient.display_name || 'usuário'}. Recebi seu sinal criptografado via Nostr.`,
        timestamp: Date.now(),
        type: 'text'
      };
      setMessages(prev => [...prev, reply]);
    }, 1500);
  };

  const handleSendImage = () => {
    sendMessage('image', 'Foto enviada', `https://picsum.photos/seed/${Math.random()}/300/400`);
  };

  const toggleRecording = () => {
    if (isRecording) {
      sendMessage('audio', 'Mensagem de voz', '#');
    }
    setIsRecording(!isRecording);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 animate-in slide-in-from-right duration-300 relative z-10">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-900 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div 
            className="relative cursor-pointer group"
            onClick={() => onViewProfile(recipient)}
          >
            <img 
              src={recipient.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recipient.pubkey}`} 
              className="w-10 h-10 rounded-full border border-slate-800 object-cover group-hover:border-blue-500 transition-all"
              alt={recipient.name}
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full"></div>
          </div>
          <div className="cursor-pointer" onClick={() => onViewProfile(recipient)}>
            <h3 className="font-bold text-sm flex items-center gap-1 hover:text-blue-400 transition-colors">
              {recipient.display_name || recipient.name || 'Anon'}
              {isPremium && <ShieldCheck size={12} className="text-blue-400" />}
            </h3>
            <div className="flex items-center gap-1">
              <Lock size={8} className="text-slate-500" />
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Criptografia Ponta-a-Ponta</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (confirm("Deseja denunciar este usuário? O administrador terá acesso à conversa para moderação.")) {
              onReport(messages);
              alert("Denúncia enviada ao Agito Admin.");
            }
          }}
          className="p-2 text-slate-600 hover:text-red-500 transition-colors"
          title="Denunciar Match"
        >
          <ShieldAlert size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center my-4">
          <div className="bg-slate-900/50 border border-white/5 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Lock size={10} className="text-blue-500" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Chat 100% Pictografado</span>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
            <ShieldCheck size={32} className="mb-2 text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-widest italic">Início Seguro</p>
            <p className="text-[10px] mt-1">Sua privacidade é nossa prioridade absoluta.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.senderPubkey === 'me' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.senderPubkey === 'me' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' 
                : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
            }`}>
              {msg.type === 'text' && <p className="leading-relaxed break-words font-medium">{msg.content}</p>}
              
              {msg.type === 'image' && (
                <div className="flex flex-col gap-2">
                  <img src={msg.mediaUrl} className="rounded-xl max-w-full h-auto border border-white/10" alt="Shared" />
                </div>
              )}

              {msg.type === 'audio' && (
                <div className="flex items-center gap-3 py-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.senderPubkey === 'me' ? 'bg-white/10' : 'bg-blue-500/20'}`}>
                    <Mic size={14} className={msg.senderPubkey === 'me' ? 'text-white' : 'text-blue-400'} />
                  </div>
                  <div className="flex-1 h-1.5 w-24 bg-white/10 rounded-full relative overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 w-[60%] ${msg.senderPubkey === 'me' ? 'bg-white' : 'bg-blue-500'}`}></div>
                  </div>
                  <span className="text-[10px] opacity-60">0:08</span>
                </div>
              )}

              <p className={`text-[8px] mt-1.5 opacity-50 font-bold uppercase ${msg.senderPubkey === 'me' ? 'text-right' : 'text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md sticky bottom-0 z-50">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSendImage}
            className="p-3 text-slate-500 hover:text-blue-400 transition-colors bg-slate-900/50 rounded-full border border-slate-800"
          >
            <ImageIcon size={18} />
          </button>
          
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-full px-4 py-2.5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
             <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isRecording ? "Pictografando áudio..." : "Sua mensagem privada..."}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                disabled={isRecording}
              />
              <button className="text-slate-600 hover:text-slate-400">
                <Paperclip size={16} />
              </button>
          </div>

          <button 
            onClick={toggleRecording}
            className={`p-3 rounded-full transition-all active:scale-90 border ${
              isRecording ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Mic size={18} />
          </button>

          <button 
            onClick={() => sendMessage()}
            disabled={!input.trim() && !isRecording}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-3 rounded-full transition-all active:scale-90 shadow-lg shadow-blue-900/20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
