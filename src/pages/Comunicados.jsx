import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Megaphone, Send, User, CheckCircle, MessageCircle, Users, RefreshCw } from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global } from '../styles/globalStyles';

export default function Comunicados({ userData }) {
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const canSendToAll = userData?.role === 'coordinator' || userData?.role === 'supervisor';

  const [form, setForm] = useState({ text: '', to: canSendToAll ? 'all' : '', priority: 'normal' });

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, [userData]);

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
    } catch (err) { window.alert(err.message); }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const filtered = allMsgs.filter(msg => {
        if (msg.to === 'all') return true;
        if (msg.to === auth.currentUser?.uid) return true;
        if (msg.senderId === auth.currentUser?.uid) return true;
        if (userData?.role === 'coordinator' && msg.to === 'coordinator') return true;
        return false;
      });

      setMessages(filtered);
      markAsReadBatch(filtered);
    } catch (err) { window.alert(err.message); }
    setLoading(false);
  };

  const markAsReadBatch = (msgs) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    msgs.forEach(msg => {
      if (msg.senderId !== userId && (!msg.readBy || !msg.readBy.includes(userId))) {
        updateDoc(doc(db, "messages", msg.id), { readBy: arrayUnion(userId) }).catch(e => console.log(e));
      }
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    if (!form.to) return window.alert("Selecione um destinatário válido.");
    setSending(true);

    try {
      const recipientName = form.to === 'all' ? 'Todos' : recipients.find(r => r.id === form.to)?.name || 'Usuário';

      await addDoc(collection(db, "messages"), {
        text: form.text, senderId: auth.currentUser.uid, senderName: userData.name,
        senderRole: userData.role, to: form.to, toName: recipientName,
        priority: form.priority, readBy: [auth.currentUser.uid], createdAt: serverTimestamp()
      });

      setForm({ ...form, text: '', to: canSendToAll ? 'all' : '' });
      fetchMessages(); 
    } catch (err) { window.alert(err.message); }
    setSending(false);
  };

  const getRoleLabel = (role) => {
    if (role === 'coordinator') return 'Coordenação';
    if (role === 'supervisor') return 'Supervisor';
    return 'Comercial';
  };

  return (
    <div style={{...global.container, maxWidth: '900px'}}>
      
      {/* HEADER GLOBAL */}
      <div style={global.header}>
        <div style={global.iconHeader}><Megaphone size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Mural de Comunicados</h1>
          <p style={global.subtitle}>Mensagens diretas e avisos públicos da rede.</p>
        </div>
        <button onClick={fetchMessages} style={{...global.iconBtn, marginLeft: 'auto'}}><RefreshCw size={20}/></button>
      </div>

      <div style={local.layout}>
        
        {/* FORMULÁRIO DE ENVIO */}
        <div style={global.card}>
          <h3 style={global.sectionTitle}>Nova Mensagem</h3>
          <form onSubmit={handleSend} style={global.form}>
            
            <div style={local.recipientRow}>
              {canSendToAll && (
                <label style={local.radioLabel}>
                  <input type="radio" checked={form.to === 'all'} onChange={() => setForm({...form, to: 'all'})} style={{accentColor: 'var(--text-brand)'}} />
                  <span style={{fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', gap: '6px'}}><Users size={14}/> Público (Todos)</span>
                </label>
              )}
              
              <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1}}>
                <span style={{fontSize:'13px', color:'var(--text-muted)'}}>{canSendToAll ? "Ou Direcionado:" : "Enviar para:"}</span>
                <select style={global.select} value={form.to !== 'all' ? form.to : ''} onChange={e => setForm({...form, to: e.target.value})} required={!canSendToAll || form.to !== 'all'}>
                  <option value="" disabled>Selecionar Colaborador...</option>
                  {recipients.map(u => <option key={u.id} value={u.id}>{u.name} ({getRoleLabel(u.role)})</option>)}
                </select>
              </div>
            </div>

            <textarea style={global.textarea} placeholder="Escreva sua mensagem ou aviso..." value={form.text} onChange={e => setForm({...form, text: e.target.value})} required />

            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
              <button type="submit" style={global.btnPrimary} disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar Mensagem'} <Send size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* FEED DE MENSAGENS */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
          <h3 style={global.sectionTitle}>Últimas Atualizações</h3>
          
          {loading ? (
            <p style={{textAlign:'center', color:'var(--text-muted)'}}>A carregar...</p>
          ) : messages.length === 0 ? (
            <div style={global.emptyState}>
              <MessageCircle size={40} style={{opacity:0.3}} />
              <p>Nenhuma mensagem encontrada.</p>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              {messages.map(msg => {
                const isMine = msg.senderId === auth.currentUser?.uid;
                const isGeneral = msg.to === 'all';
                return (
                  <div key={msg.id} style={{
                    ...local.messageCard, alignSelf: isMine ? 'flex-end' : 'flex-start',
                    backgroundColor: isMine ? 'var(--bg-primary-light)' : 'var(--bg-card)',
                    border: isGeneral && !isMine ? '1px solid rgba(234,88,12,0.4)' : '1px solid var(--border)'
                  }}>
                    <div style={local.msgHeader}>
                      <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        {isGeneral && <Megaphone size={14} color="#ea580c" />}
                        {!isGeneral && !isMine && <User size={14} color="var(--text-brand)" />}
                        <span style={{fontWeight:'bold', color: isMine ? 'var(--text-brand)' : 'var(--text-main)'}}>{isMine ? 'Você' : msg.senderName}</span>
                        {!isMine && <span style={local.roleBadge}>{getRoleLabel(msg.senderRole)}</span>}
                      </div>
                      <span style={{fontSize:'10px', color:'var(--text-muted)'}}>{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Agora'}</span>
                    </div>
                    
                    <p style={local.msgText}>{msg.text}</p>
                    
                    <div style={local.msgFooter}>
                      <span style={{fontSize:'11px', color:'var(--text-muted)', fontStyle:'italic'}}>{isGeneral ? 'Aviso Público' : isMine ? `Enviado para: ${msg.toName}` : 'Mensagem Direta'}</span>
                      {isMine && (
                        <span style={{display:'flex', alignItems:'center', gap:'4px', color: msg.readBy?.length > 1 || msg.to === 'all' ? '#10b981' : 'var(--text-muted)', fontSize:'11px', fontWeight:'bold'}}>
                           <CheckCircle size={14} /> {msg.readBy?.length > 1 || msg.to === 'all' ? 'Lida' : 'Enviada'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ESTILOS LOCAIS (Apenas o que é exclusivo desta página)
const local = {
  layout: { display: 'flex', flexDirection: 'column', gap: '40px' },
  recipientRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', background: 'var(--bg-panel)', padding: '12px 15px', borderRadius: '12px', border: '1px solid var(--border)' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  
  messageCard: { padding: '18px', borderRadius: '16px', width: '100%', maxWidth: '85%', boxShadow: 'var(--shadow-sm)', boxSizing: 'border-box' },
  msgHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  roleBadge: { fontSize: '9px', textTransform: 'uppercase', background: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '3px 6px', borderRadius: '6px', fontWeight: 'bold' },
  msgText: { fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.5', whiteSpace: 'pre-wrap', margin: '0 0 10px 0' },
  msgFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' },
};