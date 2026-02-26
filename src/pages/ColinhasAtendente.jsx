import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, addDoc, query, getDocs, 
  serverTimestamp, deleteDoc, doc, updateDoc 
} from 'firebase/firestore';
import { 
  BookMarked, Plus, Search, Copy, Share2, 
  User, Users, Trash2, Edit, X, Check, 
  MessageSquare, ShieldCheck, Zap, Filter
} from 'lucide-react';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'oquei-gestao';

export default function ColinhasAtendente({ userData }) {
  const [loading, setLoading] = useState(true);
  const [colinhas, setColinhas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); 
  const [activeCategory, setActiveCategory] = useState('Todas');
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'Vendas',
    isShared: false
  });

  const categories = ['Todas', 'Vendas', 'Objeções', 'Planos', 'Procedimentos', 'Geral'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'colinhas');
      const snap = await getDocs(colRef);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setColinhas(list);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;

    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'colinhas');
      await addDoc(colRef, {
        ...form,
        authorId: auth.currentUser?.uid || 'anonimo',
        authorName: userData?.name || 'Atendente',
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setForm({ title: '', content: '', category: 'Vendas', isShared: false });
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir esta colinha?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'colinhas', id));
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert("Texto copiado para a área de transferência!");
    } catch (err) {
      alert("Erro ao copiar.");
    }
    document.body.removeChild(textArea);
  };

  const filteredColinhas = useMemo(() => {
    return colinhas.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Todas' || c.category === activeCategory;
      const isMine = c.authorId === auth.currentUser?.uid;
      
      if (activeTab === 'mine') return isMine && matchesSearch && matchesCategory;
      if (activeTab === 'shared') return c.isShared && !isMine && matchesSearch && matchesCategory;
      
      return (isMine || c.isShared) && matchesSearch && matchesCategory;
    });
  }, [colinhas, searchTerm, activeTab, activeCategory]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <div style={styles.iconCircle}><BookMarked size={28} color="white"/></div>
          <div>
            <h1 style={styles.title}>Minhas Colinhas</h1>
            <p style={styles.subtitle}>Scripts de vendas e lembretes rápidos para o dia a dia.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.btnAdd}>
          <Plus size={20} /> Nova Colinha
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <input 
            style={styles.searchInput} 
            placeholder="Pesquisar por título ou conteúdo..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={styles.categoryBar}>
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              style={activeCategory === cat ? styles.catBtnActive : styles.catBtn}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.tabBar}>
        <button onClick={() => setActiveTab('all')} style={activeTab === 'all' ? styles.tabActive : styles.tab}>Tudo</button>
        <button onClick={() => setActiveTab('mine')} style={activeTab === 'mine' ? styles.tabActive : styles.tab}>Criadas por mim</button>
        <button onClick={() => setActiveTab('shared')} style={activeTab === 'shared' ? styles.tabActive : styles.tab}>Compartilhadas pela equipe</button>
      </div>

      {loading ? (
        <div style={styles.loading}>Carregando banco de conhecimentos...</div>
      ) : (
        <div style={styles.grid}>
          {filteredColinhas.map(item => (
            <div key={item.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={{...styles.badge, backgroundColor: getCategoryColor(item.category) + '15', color: getCategoryColor(item.category)}}>
                  {item.category}
                </span>
                <div style={styles.cardActions}>
                  <button onClick={() => copyToClipboard(item.content)} style={styles.iconBtn} title="Copiar Texto"><Copy size={16}/></button>
                  {item.authorId === auth.currentUser?.uid && (
                    <button onClick={() => handleDelete(item.id)} style={{...styles.iconBtn, color: '#ef4444'}} title="Excluir"><Trash2 size={16}/></button>
                  )}
                </div>
              </div>
              
              <h3 style={styles.cardTitle}>{item.title}</h3>
              <p style={styles.cardContent}>{item.content}</p>
              
              <div style={styles.cardFooter}>
                <div style={styles.authorInfo}>
                  <div style={styles.miniAvatar}>{item.authorName?.charAt(0)}</div>
                  <span style={styles.authorName}>{item.authorId === auth.currentUser?.uid ? 'Você' : item.authorName}</span>
                </div>
                {item.isShared && <div style={styles.sharedBadge}><Users size={12}/> Público</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredColinhas.length === 0 && !loading && (
        <div style={styles.emptyState}>
          <Zap size={48} color="#e2e8f0" style={{marginBottom:'15px'}} />
          <h3>Nenhuma colinha encontrada</h3>
          <p>Crie sua primeira dica rápida no botão acima.</p>
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Nova Colinha</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Título Curto</label>
                <input 
                  style={styles.input} 
                  placeholder="Ex: Script de Boas-vindas" 
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Categoria</label>
                <select 
                  style={styles.select} 
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                >
                  {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Conteúdo da Colinha</label>
                <textarea 
                  style={styles.textarea} 
                  placeholder="Escreva aqui o texto que você costuma usar..." 
                  value={form.content}
                  onChange={e => setForm({...form, content: e.target.value})}
                  required
                />
              </div>

              <div style={styles.shareToggle}>
                <label style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={form.isShared}
                    onChange={e => setForm({...form, isShared: e.target.checked})}
                    style={styles.checkbox}
                  />
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <span style={{fontWeight:'bold', fontSize:'14px', color:'#1e293b'}}>Compartilhar com a equipe</span>
                    <span style={{fontSize:'12px', color:'#64748b'}}>Outros atendentes poderão ver e usar esta colinha.</span>
                  </div>
                </label>
              </div>

              <button type="submit" style={styles.btnSave}>Salvar Colinha</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const getCategoryColor = (cat) => {
  switch(cat) {
    case 'Vendas': return '#2563eb';
    case 'Objeções': return '#ea580c';
    case 'Planos': return '#10b981';
    case 'Procedimentos': return '#7c3aed';
    default: return '#64748b';
  }
};

const styles = {
  container: { animation: 'fadeIn 0.5s ease-out' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
  iconCircle: { width: '56px', height: '56px', borderRadius: '16px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37,99,235,0.2)' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },
  btnAdd: { background: '#1e293b', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' },

  toolbar: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', width: '100%', color: '#1e293b' },
  categoryBar: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' },
  catBtn: { padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  catBtnActive: { padding: '8px 16px', borderRadius: '10px', border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },

  tabBar: { display: 'flex', gap: '25px', borderBottom: '1px solid #e2e8f0', marginBottom: '30px' },
  tab: { padding: '12px 0', border: 'none', background: 'transparent', color: '#64748b', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent' },
  tabActive: { padding: '12px 0', border: 'none', background: 'transparent', color: '#2563eb', fontSize: '14px', fontWeight: '800', cursor: 'pointer', borderBottom: '3px solid #2563eb' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' },
  card: { background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  badge: { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
  cardActions: { display: 'flex', gap: '8px' },
  iconBtn: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '8px', cursor: 'pointer', color: '#64748b' },
  cardTitle: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 10px 0' },
  cardContent: { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px 0', flex: 1, whiteSpace: 'pre-line' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid #f1f5f9' },
  authorInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  miniAvatar: { width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#64748b' },
  authorName: { fontSize: '12px', color: '#64748b', fontWeight: '600' },
  sharedBadge: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#2563eb', fontWeight: 'bold', background: '#eff6ff', padding: '2px 8px', borderRadius: '20px' },

  emptyState: { textAlign: 'center', padding: '80px 20px', color: '#94a3b8' },
  loading: { textAlign: 'center', padding: '50px', color: '#94a3b8', fontStyle: 'italic' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { background: 'white', padding: '35px', borderRadius: '28px', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  modalTitle: { fontSize: '22px', fontWeight: '900', color: '#1e293b', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '800', color: '#475569' },
  input: { padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', color: '#1e293b' },
  select: { padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', color: '#1e293b', background: 'white' },
  textarea: { padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' },
  shareToggle: { padding: '15px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' },
  checkboxLabel: { display: 'flex', gap: '12px', cursor: 'pointer' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' },
  btnSave: { background: '#2563eb', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '900', fontSize: '16px', cursor: 'pointer', boxShadow: '0 8px 15px rgba(37,99,235,0.2)' }
};