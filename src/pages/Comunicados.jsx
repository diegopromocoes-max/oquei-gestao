import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { 
  Megaphone, Send, User, CheckCircle, 
  MessageCircle, Users, RefreshCw
} from 'lucide-react';

export default function Comunicados({ userData }) {
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const canSendToAll = userData?.role === 'coordinator' || userData?.role === 'supervisor';

  const [form, setForm] = useState({
    text: '',
    to: canSendToAll ? 'all' : '', 
    priority: 'normal'
  });

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, [userData]);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filteredList = list.filter(u => u.id !== auth.currentUser?.uid);
      
      filteredList.sort((a, b) => {
        if (a.role === 'coordinator') return -1;
        if (b.role === 'coordinator') return 1;
        if (a.role === 'supervisor' && b.role !== 'supervisor') return -1;
        if (b.role === 'supervisor' && a.role !== 'supervisor') return 1;
        return a.name.localeCompare(b.name);
      });

      setRecipients(filteredList);
    } catch (err) { 
      window.alert(err.message); 
    }
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
    } catch (err) { 
      window.alert(err.message); 
    }
    setLoading(false);
  };

  const markAsReadBatch = (msgs) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    msgs.forEach(msg => {
      if (msg.senderId !== userId && (!msg.readBy || !msg.readBy.includes(userId))) {
        const msgRef = doc(db, "messages", msg.id);
        updateDoc(msgRef, {
          readBy: arrayUnion(userId)
        }).catch(e => console.log(e));
      }
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    if (!form.to) return window.alert("Selecione um destinatário válido.");

    setSending(true);

    try {
      const recipientName = form.to === 'all' 
        ? 'Todos' 
        : recipients.find(r => r.id === form.to)?.name || 'Usuário';

      await addDoc(collection(db, "messages"), {
        text: form.text,
        senderId: auth.currentUser.uid,
        senderName: userData.name,
        senderRole: userData.role,
        to: form.to, 
        toName: recipientName,
        priority: form.priority,
        readBy: [auth.currentUser.uid], 
        createdAt: serverTimestamp()
      });

      setForm({ ...form, text: '', to: canSendToAll ? 'all' : '' });
      fetchMessages(); 
    } catch (err) { 
      window.alert(err.message); 
    }
    setSending(false);
  };

  const getRoleLabel = (role) => {
    if (role === 'coordinator') return 'Coordenação';
    if (role === 'supervisor') return 'Supervisor';
    return 'Comercial';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.iconHeader}><Megaphone size={28} color="white"/></div>
        <div>
          <h1 style={styles.title}>Mural de Comunicados</h1>
          <p style={styles.subtitle}>Mensagens diretas e avisos públicos da rede.</p>
        </div>
        <button onClick={fetchMessages} style={styles.refreshBtn}><RefreshCw size={20}/></button>
      </div>

      <div style={styles.layout}>
        <div style={styles.composeArea}>
          <h3 style={styles.sectionTitle}>Nova Mensagem</h3>
          <form onSubmit={handleSend} style={styles.form}>
            
            <div style={styles.recipientRow}>
              {canSendToAll && (
                <label style={styles.radioLabel}>
                  <input 
                    type="radio" 
                    name="recipient" 
                    checked={form.to === 'all'} 
                    onChange={() => setForm({...form, to: 'all'})}
                    style={{accentColor: '#2563eb'}}
                  />
                  <span style={styles.radioText}><Users size={14}/> Público (Todos)</span>
                </label>
              )}
              
              <div style={{display:'flex', alignItems:'center', gap:'10px', flex: 1}}>
                <span style={{fontSize:'13px', color:'#64748b'}}>
                  {canSendToAll ? "Ou Direcionado:" : "Enviar para:"}
                </span>
                <select 
                  style={styles.select} 
                  value={form.to !== 'all' ? form.to : ''} 
                  onChange={e => setForm({...form, to: e.target.value})}
                  required={!canSendToAll || form.to !== 'all'}
                >
                  <option value="" disabled>Selecionar Colaborador...</option>
                  {recipients.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({getRoleLabel(u.role)})</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea 
              style={styles.textarea} 
              placeholder="Escreva sua mensagem ou aviso..." 
              value={form.text}
              onChange={e => setForm({...form, text: e.target.value})}
              required
            />

            <div style={styles.footerForm}>
              <button type="submit" style={styles.sendBtn} disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar Mensagem'} <Send size={16} />
              </button>
            </div>
          </form>
        </div>

        <div style={styles.feedArea}>
          <h3 style={styles.sectionTitle}>Últimas Atualizações</h3>
          
          {loading ? (
            <p style={{textAlign:'center', color:'#94a3b8', padding:'20px'}}>A carregar...</p>
          ) : messages.length === 0 ? (
            <div style={styles.emptyState}>
              <MessageCircle size={40} style={{marginBottom:'10px', opacity:0.3}} />
              <p>Nenhuma mensagem encontrada.</p>
            </div>
          ) : (
            <div style={styles.feedList}>
              {messages.map(msg => {
                const isMine = msg.senderId === auth.currentUser?.uid;
                const isGeneral = msg.to === 'all';
                const date = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Agora';

                return (
                  <div key={msg.id} style={{
                    ...styles.messageCard,
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    backgroundColor: isMine ? '#eff6ff' : isGeneral ? '#fff7ed' : 'white',
                    border: isGeneral && !isMine ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                    maxWidth: '85%'
                  }}>
                    <div style={styles.msgHeader}>
                      <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        {isGeneral && <Megaphone size={14} color="#ea580c" />}
                        {!isGeneral && !isMine && <User size={14} color="#2563eb" />}
                        <span style={{fontWeight:'bold', color: isMine ? '#1e3a8a' : '#334155'}}>
                          {isMine ? 'Você' : msg.senderName}
                        </span>
                        {!isMine && <span style={styles.roleBadge}>{getRoleLabel(msg.senderRole)}</span>}
                      </div>
                      <span style={{fontSize:'10px', color:'#94a3b8'}}>{date}</span>
                    </div>
                    
                    <p style={styles.msgText}>{msg.text}</p>
                    
                    <div style={styles.msgFooter}>
                      <span style={{fontSize:'11px', color:'#64748b', fontStyle:'italic'}}>
                        {isGeneral ? 'Aviso Público' : isMine ? `Enviado para: ${msg.toName}` : 'Mensagem Direta'}
                      </span>
                      {isMine && (
                        <span style={{display:'flex', alignItems:'center', gap:'4px', color: msg.readBy?.length > 1 || msg.to === 'all' ? '#10b981' : '#94a3b8', fontSize:'11px', fontWeight:'bold'}}>
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

const styles = {
  container: { padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },
  refreshBtn: { marginLeft: 'auto', background: 'white', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748b' },

  layout: { display: 'flex', flexDirection: 'column', gap: '40px' },
  
  composeArea: { background: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  sectionTitle: { fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '15px' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  recipientRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', background: '#f8fafc', padding: '12px 15px', borderRadius: '12px', border: '1px solid #f1f5f9' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  radioText: { fontSize: '14px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' },
  select: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', flex: 1, background: 'white', fontWeight: '600', color: '#334155' },
  
  textarea: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  
  footerForm: { display: 'flex', justifyContent: 'flex-end' },
  sendBtn: { background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },

  feedArea: { display: 'flex', flexDirection: 'column', gap: '15px' },
  feedList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  
  messageCard: { padding: '18px', borderRadius: '16px', width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', boxSizing: 'border-box' },
  msgHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  roleBadge: { fontSize: '9px', textTransform: 'uppercase', background: '#e2e8f0', color: '#475569', padding: '3px 6px', borderRadius: '6px', fontWeight: 'bold' },
  msgText: { fontSize: '14px', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap', margin: '0 0 10px 0' },
  msgFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '10px' },

  emptyState: { textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '40px', background: '#f8fafc', borderRadius: '16px' }
};