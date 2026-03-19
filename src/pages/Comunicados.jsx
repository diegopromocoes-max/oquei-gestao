import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { 
  Megaphone, Send, MessageCircle, Users, RefreshCw, 
  Pin, Star, X, CheckCircle2, ShieldCheck, Info
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { Btn } from '../components/ui';

export default function Comunicados({ userData }) {
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  const canSendToAll = ['coordinator', 'supervisor', 'growth_team', 'GROWTH_TEAM', 'growthteam'].includes(userData?.role);
  const canPin = userData?.role === 'coordinator' || userData?.role === 'supervisor';

  const [form, setForm] = useState({ text: '', to: 'all', priority: 1 });
  const unreadCount = messages.filter(m => !m.read).length;

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, [userData]);

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
      list.sort((a, b) => a.name.localeCompare(b.name));
      setRecipients(list);
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const filtered = allMsgs.filter(msg => {
        if (msg.to === 'all' || msg.to === auth.currentUser?.uid || msg.senderId === auth.currentUser?.uid) return true;
        return false;
      });

      setMessages(filtered.map(msg => ({
        ...msg,
        read: msg.readBy?.includes(auth.currentUser?.uid)
      })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSending(true);
    try {
      const recipientName = form.to === 'all' ? 'Todos' : recipients.find(r => r.id === form.to)?.name || 'Usuário';
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
      setForm({ ...form, text: '', priority: 1 });
      fetchMessages(); 
    } catch (err) { alert("Erro ao enviar: " + err.message); }
    setSending(false);
  };

  const togglePinMessage = async (msg) => {
    if (!canPin) return;
    await updateDoc(doc(db, "messages", msg.id), { pinned: !msg.pinned });
    fetchMessages();
  };

  return (
    <div style={{ ...global.container, padding: '0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      
      {/* ── HEADER ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px',
        padding: '20px 30px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', background: colors.primary, // Cor sólida profissional
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Megaphone size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Mural de Comunicados</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Gestão de avisos oficiais e interação interna</p>
          </div>
        </div>
        <button onClick={fetchMessages} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} color="var(--text-muted)" />
        </button>
      </div>

      {/* ── CORPO: GRID DUAS COLUNAS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', flex: 1, overflow: 'hidden' }}>
        
        {/* COLUNA ESQUERDA: CHAT HISTÓRICO */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }} className="custom-scrollbar">
            {messages.map((msg, i) => {
              const isMine = msg.senderId === auth.currentUser?.uid;
              return (
                <div key={msg.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%', minWidth: '200px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px', textAlign: isMine ? 'right' : 'left' }}>
                    {msg.senderName} • {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </div>
                  <div style={{
                    background: isMine ? colors.primary : 'var(--bg-app)',
                    color: isMine ? 'white' : 'var(--text-main)',
                    padding: '12px 16px', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    border: isMine ? 'none' : '1px solid var(--border)', fontSize: '14px', position: 'relative'
                  }}>
                    {msg.pinned && <Pin size={12} style={{ position: 'absolute', top: '-8px', right: '10px' }} fill={colors.warning} color={colors.warning} />}
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* COLUNA DIREITA: PAINEL DE CRIAÇÃO FIXO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Send size={18} color={colors.primary} /> Nova Mensagem
            </h3>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={localLabel}>Destinatário</label>
                <select 
                  style={localInput} 
                  value={form.to} 
                  onChange={e => setForm({...form, to: e.target.value})}
                  disabled={!canSendToAll}
                >
                  <option value="all">📢 Mural Público (Todos)</option>
                  {recipients.map(u => <option key={u.id} value={u.id}>👤 {u.name}</option>)}
                </select>
              </div>

              <div>
                <label style={localLabel}>Prioridade</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3].map(star => (
                    <button key={star} type="button" onClick={() => setForm({...form, priority: star})} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Star size={20} fill={star <= form.priority ? colors.warning : 'none'} color={star <= form.priority ? colors.warning : 'var(--border)'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={localLabel}>Mensagem</label>
                <textarea 
                  style={{ ...localInput, minHeight: '120px', resize: 'none' }}
                  placeholder="Digite aqui..."
                  value={form.text}
                  onChange={e => setForm({...form, text: e.target.value})}
                  required
                />
              </div>

              <Btn type="submit" loading={sending} style={{ width: '100%', height: '45px', fontWeight: '900' }}>
                Enviar Comunicado
              </Btn>
            </form>
          </div>

          <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '20px', border: '1px dashed var(--border)' }}>
            <div style={{ display: 'flex', gap: '10px', color: 'var(--text-muted)' }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '11px', margin: 0, lineHeight: '1.4' }}>
                Mensagens marcadas como <strong>Mural Público</strong> serão visíveis por todos os colaboradores da rede.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const localLabel = { display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' };
const localInput = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };