import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, addDoc, query, getDocs, 
  serverTimestamp, deleteDoc, doc
} from 'firebase/firestore';
import { 
  BookMarked, Plus, Search, Copy, 
  Users, Trash2, X, Zap
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global } from '../styles/globalStyles';

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
    <div style={global.container}>
      
      {/* HEADER GLOBAL */}
      <div style={global.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={global.iconHeader}><BookMarked size={28} color="white"/></div>
          <div>
            <h1 style={global.title}>Minhas Colinhas</h1>
            <p style={global.subtitle}>Scripts de vendas e lembretes rápidos para o dia a dia.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={{...global.btnPrimary, marginLeft: 'auto'}}>
          <Plus size={20} /> Nova Colinha
        </button>
      </div>

      {/* TOOLBAR */}
      <div style={global.toolbar}>
        <div style={global.searchBox}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            style={global.searchInput} 
            placeholder="Pesquisar por título ou conteúdo..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={local.categoryBar}>
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              style={activeCategory === cat ? local.catBtnActive : local.catBtn}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div style={local.tabBar}>
        <button onClick={() => setActiveTab('all')} style={activeTab === 'all' ? local.tabActive : local.tab}>Tudo</button>
        <button onClick={() => setActiveTab('mine')} style={activeTab === 'mine' ? local.tabActive : local.tab}>Criadas por mim</button>
        <button onClick={() => setActiveTab('shared')} style={activeTab === 'shared' ? local.tabActive : local.tab}>Compartilhadas pela equipa</button>
      </div>

      {/* CONTEÚDO */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          A carregar banco de conhecimentos...
        </div>
      ) : (
        <div style={global.gridCards}>
          {filteredColinhas.map(item => (
            <div key={item.id} style={{...global.card, display: 'flex', flexDirection: 'column', padding: '24px'}}>
              <div style={local.cardHeader}>
                <span style={{...global.badge, backgroundColor: getCategoryColor(item.category) + '15', color: getCategoryColor(item.category)}}>
                  {item.category}
                </span>
                <div style={local.cardActions}>
                  <button onClick={() => copyToClipboard(item.content)} style={global.iconBtn} title="Copiar Texto"><Copy size={16}/></button>
                  {item.authorId === auth.currentUser?.uid && (
                    <button onClick={() => handleDelete(item.id)} style={{...global.iconBtn, color: '#ef4444'}} title="Excluir"><Trash2 size={16}/></button>
                  )}
                </div>
              </div>
              
              <h3 style={local.cardTitle}>{item.title}</h3>
              <p style={local.cardContent}>{item.content}</p>
              
              <div style={local.cardFooter}>
                <div style={local.authorInfo}>
                  <div style={local.miniAvatar}>{item.authorName?.charAt(0)}</div>
                  <span style={local.authorName}>{item.authorId === auth.currentUser?.uid ? 'Você' : item.authorName}</span>
                </div>
                {item.isShared && <div style={local.sharedBadge}><Users size={12}/> Público</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE GERAL */}
      {filteredColinhas.length === 0 && !loading && (
        <div style={global.emptyState}>
          <Zap size={48} color="var(--border)" style={{marginBottom:'15px'}} />
          <h3 style={{color: 'var(--text-main)', margin: '0 0 10px 0'}}>Nenhuma colinha encontrada</h3>
          <p style={{margin: 0}}>Crie a sua primeira dica rápida no botão acima.</p>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {showModal && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
            <div style={global.modalHeader}>
              <h3 style={global.modalTitle}>Nova Colinha</h3>
              <button onClick={() => setShowModal(false)} style={global.closeBtn}><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} style={global.form}>
              <div style={global.field}>
                <label style={global.label}>Título Curto</label>
                <input 
                  style={global.input} 
                  placeholder="Ex: Script de Boas-vindas" 
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  required
                />
              </div>

              <div style={global.field}>
                <label style={global.label}>Categoria</label>
                <select 
                  style={global.select} 
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                >
                  {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={global.field}>
                <label style={global.label}>Conteúdo da Colinha</label>
                <textarea 
                  style={global.textarea} 
                  placeholder="Escreva aqui o texto que costuma usar..." 
                  value={form.content}
                  onChange={e => setForm({...form, content: e.target.value})}
                  required
                />
              </div>

              <div style={local.shareToggle}>
                <label style={local.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={form.isShared}
                    onChange={e => setForm({...form, isShared: e.target.checked})}
                    style={local.checkbox}
                  />
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <span style={{fontWeight:'bold', fontSize:'14px', color:'var(--text-main)'}}>Compartilhar com a equipa</span>
                    <span style={{fontSize:'12px', color:'var(--text-muted)'}}>Outros atendentes poderão ver e usar esta colinha.</span>
                  </div>
                </label>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '10px'}}>
                 <button type="submit" style={global.btnPrimary}>Salvar Colinha</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
const getCategoryColor = (cat) => {
  switch(cat) {
    case 'Vendas': return '#2563eb';    // Azul
    case 'Objeções': return '#f59e0b';  // Laranja
    case 'Planos': return '#10b981';    // Verde
    case 'Procedimentos': return '#7c3aed'; // Roxo
    default: return '#64748b';          // Slate
  }
};

// ESTILOS LOCAIS (Apenas o que é exclusivo desta página)
const local = {
  categoryBar: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' },
  catBtn: { padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
  catBtnActive: { padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--text-brand)', background: 'var(--bg-primary-light)', color: 'var(--text-brand)', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },

  tabBar: { display: 'flex', gap: '25px', borderBottom: '1px solid var(--border)', marginBottom: '30px' },
  tab: { padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', borderBottom: '3px solid transparent' },
  tabActive: { padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--text-brand)', fontSize: '14px', fontWeight: '800', cursor: 'pointer', borderBottom: '3px solid var(--text-brand)' },

  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  cardActions: { display: 'flex', gap: '8px' },
  cardTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 10px 0' },
  cardContent: { fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 20px 0', flex: 1, whiteSpace: 'pre-line' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid var(--border)' },
  
  authorInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  miniAvatar: { width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-panel)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' },
  authorName: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' },
  sharedBadge: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-brand)', fontWeight: 'bold', background: 'var(--bg-primary-light)', padding: '2px 8px', borderRadius: '20px' },

  shareToggle: { padding: '15px', background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border)' },
  checkboxLabel: { display: 'flex', gap: '12px', cursor: 'pointer' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--text-brand)' }
};