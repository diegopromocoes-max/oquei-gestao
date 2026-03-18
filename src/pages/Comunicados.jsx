import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { 
  Megaphone, Send, User, CheckCircle, MessageCircle, Users, RefreshCw, 
  Pin, Star, CalendarDays, X, PlusCircle, CheckCircle2, ChevronDown, ShieldCheck
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { Btn, Modal, colors as uiColors } from '../components/ui'; // Renomeado para uiColors

export default function Comunicados({ userData }) {
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  
  const chatEndRef = useRef(null);

  const canSendToAll = ['coordinator', 'supervisor', 'growth_team', 'GROWTH_TEAM', 'growthteam'].includes(userData?.role);
const canPin = userData?.role === 'coordinator' || userData?.role === 'supervisor';

const [form, setForm] = useState({ text: '', to: 'all', priority: 1 });

  const unreadCount = messages.filter(m => !m.read).length;

useEffect(() => {
  fetchMessages();
  fetchUsers();
}, [userData]);

  // Auto-scroll para a última mensagem ao carregar
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== auth.currentUser?.uid);
      
      list.sort((a, b) => {
        if (a.role === 'coordinator') return -1;
        if (b.role === 'coordinator') return 1;
        if (a.role === 'supervisor' && b.role !== 'supervisor') return -1;
        if (b.role === 'supervisor' && a.role !== 'supervisor') return 1;
        return a.name.localeCompare(b.name);
      });
      setRecipients(list);
    } catch (err) { window.showToast?.(err.message, 'error'); }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // Ordenação ASC para simular um chat (mais antigos em cima, mais novos em baixo)
      const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const filtered = allMsgs.filter(msg => {
        if (msg.to === 'all') return true;
        if (msg.to === auth.currentUser?.uid) return true;
        if (msg.senderId === auth.currentUser?.uid) return true;
        if (userData?.role === 'coordinator' && msg.to === 'coordinator') return true;
        return false;
      });

      // Mapear leitura
      const msgsWithReadStatus = filtered.map(msg => ({
        ...msg,
        read: msg.readBy && auth.currentUser && msg.readBy.includes(auth.currentUser.uid)
      }));

      setMessages(msgsWithReadStatus);
      markAsReadBatch(msgsWithReadStatus);
    } catch (err) { window.showToast?.(err.message, 'error'); }
    setLoading(false);
  };

  const markAsReadBatch = (msgs) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    msgs.forEach(msg => {
      if (msg.senderId !== userId && !msg.read) {
        updateDoc(doc(db, "messages", msg.id), { readBy: arrayUnion(userId) }).catch(e => console.log(e));
      }
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    if (!form.to) { window.showToast?.('Selecione um destinatário válido.', 'error'); return; }
    setSending(true);

    try {
      const recipientName = form.to === 'all' ? 'Todos' : form.to === 'coordinator' ? 'Coordenação' : recipients.find(r => r.id === form.to)?.name || 'Usuário';

      await addDoc(collection(db, "messages"), {
        text: form.text, 
        senderId: auth.currentUser.uid, 
        senderName: userData.name,
        senderRole: userData.role, 
        to: form.to, 
        toName: recipientName,
        priority: form.priority, 
        pinned: false,
        readBy: [auth.currentUser.uid], 
        createdAt: serverTimestamp()
      });

setForm({ ...form, text: '', priority: 1, to: 'all' });
      setIsComposing(false);
      fetchMessages(); 
    } catch (err) { window.showToast?.(err.message, 'error'); }
    setSending(false);
  };

  const togglePinMessage = async (msg) => {
    if (!canPin) return;
    try {
      await updateDoc(doc(db, "messages", msg.id), { pinned: !msg.pinned });
      fetchMessages();
    } catch (err) {
      window.showToast?.('Erro ao fixar a mensagem.', 'error');
    }
  };

  const getRoleLabel = (role) => {
    if (role === 'coordinator') return 'Coordenação';
    if (role === 'supervisor') return 'Supervisor';
    return 'Comercial';
  };

  // Agrupar mensagens por dia
  const groupMessagesByDay = () => {
    const groups = {};
    const today = new Date().toLocaleDateString('pt-BR');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR');

    messages.forEach(msg => {
      const dateObj = msg.createdAt ? new Date(msg.createdAt.seconds * 1000) : new Date();
      const dateStr = dateObj.toLocaleDateString('pt-BR');
      
      let label = dateStr;
      if (dateStr === today) label = 'Hoje';
      else if (dateStr === yesterday) label = 'Ontem';

      if (!groups[label]) groups[label] = [];
      groups[label].push(msg);
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDay();
  const pinnedMessages = messages.filter(m => m.pinned);

  return (
    <div style={{...global.container, maxWidth: '1000px', display: 'flex', flexDirection: 'column', padding: '0'}}>
      

      {/* ── Cabeçalho padrão Oquei Gestão ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '20px',
        padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: 'linear-gradient(135deg, #F59E0B, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(245,158,11,0.35)',
          }}>
            <Megaphone size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Mural de Comunicados
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              Mensagens e avisos da equipe · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '6px 12px', fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>
              <MessageCircle size={14} /> {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
            </div>
          )}
          <button onClick={fetchMessages} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '10px', padding: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Atualizar">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsComposing(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: colors.primary, color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
            <PlusCircle size={16} /> Nova Mensagem
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL DO CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', position: 'relative' }}>
        
        {/* BANNER MENSAGENS FIXADAS */}
        {pinnedMessages.length > 0 && (
          <div style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', padding: '15px 20px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <h4 style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: 'var(--text-brand)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
              <Pin size={14} fill="currentColor" /> Avisos Fixados
            </h4>
            <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '5px' }} className="hide-scrollbar">
              {pinnedMessages.map(msg => (
                <div key={`pin-${msg.id}`} style={{ minWidth: '250px', maxWidth: '300px', background: 'var(--bg-app)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative' }}>
                   {canPin && (
                     <button onClick={() => togglePinMessage(msg)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                       <X size={14}/>
                     </button>
                   )}
                   <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>{msg.senderName}</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FEED DE MENSAGENS (Scrollable) */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-app)' }} className="custom-scrollbar">
          
          {loading && messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', fontStyle: 'italic' }}>Carregando histórico...</div>
          ) : messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageCircle size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
              <p style={{ fontWeight: 'bold', fontSize: '14px' }}>Mural Limpo</p>
              <p style={{ fontSize: '12px' }}>Nenhuma mensagem na sua caixa de entrada.</p>
            </div>
          ) : (
            Object.keys(groupedMessages).map(dateLabel => (
              <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Divisor de Data */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                  <span style={{ background: 'var(--bg-panel)', color: 'var(--text-muted)', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    {dateLabel}
                  </span>
                </div>

                {/* Bolhas de Chat */}
                {groupedMessages[dateLabel].map(msg => {
                  const isMine = msg.senderId === auth.currentUser?.uid;
                  const isGeneral = msg.to === 'all';
                  const timeStr = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Agora';

                  return (
                    <div key={msg.id} style={{
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      minWidth: '250px'
                    }}>
                      {/* Metadados acima da bolha */}
                      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '8px', marginBottom: '4px', padding: '0 4px' }}>
                         {!isMine && <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>{msg.senderName}</span>}
                         {!isMine && <span style={{ fontSize: '9px', background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>{getRoleLabel(msg.senderRole)}</span>}
                         {isGeneral && !isMine && <span style={{ fontSize: '10px', color: '#ea580c', fontWeight: 'bold' }}>@Todos</span>}
                         
                         {/* Indicador de Fixado no Chat */}
                         {msg.pinned && <Pin size={12} color="var(--text-brand)" fill="var(--text-brand)" />}
                      </div>

                      {/* Bolha */}
                      <div style={{
                        background: isMine ? 'var(--text-brand)' : 'var(--bg-card)',
                        color: isMine ? 'white' : 'var(--text-main)',
                        padding: '16px 20px',
                        borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                        border: isMine ? 'none' : '1px solid var(--border)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        position: 'relative'
                      }}>
                        {/* Fix Button for Admins */}
                        {canPin && (
                          <button 
                            onClick={() => togglePinMessage(msg)} 
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: isMine ? 'white' : 'var(--text-muted)' }}
                            title={msg.pinned ? "Desfixar" : "Fixar Mensagem"}
                          >
                            <Pin size={14} fill={msg.pinned ? "currentColor" : "none"} />
                          </button>
                        )}

                        {/* Prioridade */}
                        {msg.priority > 1 && (
                          <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
                            {Array.from({length: msg.priority}).map((_, i) => (
                              <Star key={i} size={12} color={isMine ? "#fde047" : "#f59e0b"} fill={isMine ? "#fde047" : "#f59e0b"} />
                            ))}
                          </div>
                        )}

                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '10px', opacity: isMine ? 0.9 : 0.5, fontSize: '10px', fontWeight: 'bold' }}>
                          <span>{timeStr}</span>
                          {isMine && (
                            <CheckCircle2 size={12} color={msg.readBy?.length > 1 || msg.to === 'all' ? (isMine ? "#a7f3d0" : "#10b981") : "currentColor"} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* PAINEL DE NOVA MENSAGEM (OVERLAY ESTILO MODAL) */}
      {isComposing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'var(--bg-card)', width: '90%', maxWidth: '600px', borderRadius: '24px', padding: '30px', border: '1px solid var(--border)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
               <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <Send size={20} color="var(--text-brand)" /> Enviar Mensagem
               </h3>
               <button onClick={() => setIsComposing(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24}/></button>
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* DESTINATÁRIO */}
              <div style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Para quem?</label>
                {canSendToAll ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-main)' }}>
                      <input type="radio" checked={form.to === 'all'} onChange={() => setForm({...form, to: 'all'})} style={{ accentColor: 'var(--text-brand)', width: '18px', height: '18px' }} />
                      <Users size={16} color="var(--text-brand)"/> Mural Público (Toda a Rede)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="radio" checked={form.to !== 'all'} onChange={() => setForm({...form, to: recipients[0]?.id || ''})} style={{ accentColor: 'var(--text-brand)', width: '18px', height: '18px' }} />
                      <select 
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', fontWeight: '600' }}
                        value={form.to !== 'all' ? form.to : ''} 
                        onChange={e => setForm({...form, to: e.target.value})}
                        disabled={form.to === 'all'}
                      >
                        <option value="" disabled>Selecionar utilizador específico...</option>
                        {recipients.map(u => <option key={u.id} value={u.id}>{u.name} ({getRoleLabel(u.role)})</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="var(--text-brand)" /> Apenas Coordenação (Mensagem Privada)
                  </div>
                )}
              </div>

              {/* PRIORIDADE */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Prioridade (1 a 5 Estrelas)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      size={28} 
                      color={star <= form.priority ? "#f59e0b" : "var(--border)"} 
                      fill={star <= form.priority ? "#f59e0b" : "transparent"} 
                      style={{ cursor: 'pointer', transition: '0.2s' }}
                      onClick={() => setForm({...form, priority: star})}
                    />
                  ))}
                </div>
              </div>

              {/* CORPO DA MENSAGEM */}
              <div>
                <textarea 
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', fontSize: '15px', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} 
                  placeholder="Escreva sua mensagem ou aviso oficial aqui..." 
                  value={form.text} 
                  onChange={e => setForm({...form, text: e.target.value})} 
                  required 
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsComposing(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border)', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={sending} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'var(--text-brand)', color: 'white', border: 'none', fontWeight: '900', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 20px rgba(37,99,235,0.3)' }}>
                  {sending ? 'A enviar...' : 'Enviar Agora'} <Send size={18} />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    <style>{`
      @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      .custom-scrollbar::-webkit-scrollbar { width: 5px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
    </div>
  );
}