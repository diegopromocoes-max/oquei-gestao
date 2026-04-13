import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, getDoc, getDocs, setDoc,
  doc
} from 'firebase/firestore';
import { 
  BookMarked, Plus, Search, Copy, Pencil,
  Users, Trash2, X, Zap, UserRound
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global } from '../styles/globalStyles';
import { Btn, Modal, InfoBox } from '../components/ui';
import { normalizeRole, ROLE_KEYS } from '../lib/roleUtils';
const getColinhasCollection = () => collection(db, 'colinhas');
const NEW_CATEGORY_VALUE = '__new__';
const DEFAULT_CATEGORIES = ['Vendas', 'Objeções', 'Planos', 'Procedimentos', 'Geral'];

const createColinhaId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `colinha_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getColinhaTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const createEmptyForm = () => ({
  title: '',
  content: '',
  category: 'Vendas',
  sharedWith: [],
  newCategory: '',
});

export default function ColinhasAtendente({ userData }) {
  const [loading, setLoading] = useState(true);
  const [colinhas, setColinhas] = useState([]);
  const [shareOptions, setShareOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingColinhaId, setEditingColinhaId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeCategory, setActiveCategory] = useState('Todas');

  const [form, setForm] = useState(createEmptyForm);
  const categories = useMemo(() => {
    const colinhaCategories = colinhas
      .map((item) => String(item.category || '').trim())
      .filter(Boolean);
    const draftCategory = form.category === NEW_CATEGORY_VALUE ? form.newCategory : form.category;
    const merged = [...DEFAULT_CATEGORIES, ...colinhaCategories, draftCategory]
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    return ['Todas', ...Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b, 'pt-BR'))];
  }, [colinhas, form.category, form.newCategory]);

  const showToast = (message, type = 'success') => {
    window.showToast?.(message, type);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentUserId = auth.currentUser?.uid || userData?.uid || userData?.id;
      if (!currentUserId) {
        setColinhas([]);
        setShareOptions([]);
        return;
      }

      const usersSnap = await getDocs(collection(db, 'users'));

      const users = usersSnap.docs
        .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .filter((user) => normalizeRole(user.role) !== ROLE_KEYS.GUEST)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

      const colinhasFromUsers = users.flatMap((user) => {
        const userColinhas = Array.isArray(user.colinhas) ? user.colinhas : [];

        return userColinhas.map((item) => ({
          ...item,
          id: item.id || createColinhaId(),
          authorId: item.authorId || user.id,
          authorName: item.authorName || user.name || 'Colaborador',
          source: 'user_doc',
        }));
      });

      try {
        const legacySnap = await getDocs(getColinhasCollection());
        legacySnap.docs.forEach((docSnapshot) => {
          colinhasFromUsers.push({
            id: docSnapshot.id,
            ...docSnapshot.data(),
            source: 'legacy_collection',
          });
        });
      } catch (error) {
        console.warn('Nao foi possivel ler a colecao legada de colinhas.', error);
      }

      const deduped = new Map();
      colinhasFromUsers.forEach((item) => {
        deduped.set(item.id, item);
      });

      const list = Array.from(deduped.values());
      list.sort((a, b) => getColinhaTimestamp(b.createdAt) - getColinhaTimestamp(a.createdAt));
      setColinhas(list);

      setShareOptions(users.filter((user) => user.id !== currentUserId));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userData?.uid, userData?.id]);

  const closeModal = () => {
    setShowModal(false);
    setEditingColinhaId(null);
    setForm(createEmptyForm());
  };

  const openCreateModal = () => {
    setEditingColinhaId(null);
    setForm(createEmptyForm());
    setShowModal(true);
  };

  const handleEdit = (item) => {
    if (item.source !== 'user_doc') return;

    const normalizedCategory = String(item.category || 'Vendas').trim();
    const isKnownCategory = DEFAULT_CATEGORIES.includes(normalizedCategory);

    setEditingColinhaId(item.id);
    setForm({
      title: item.title || '',
      content: item.content || '',
      category: isKnownCategory ? normalizedCategory : NEW_CATEGORY_VALUE,
      sharedWith: Array.isArray(item.sharedWith) ? item.sharedWith : [],
      newCategory: isKnownCategory ? '' : normalizedCategory,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const resolvedCategory = (form.category === NEW_CATEGORY_VALUE ? form.newCategory : form.category).trim();
    if (!form.title.trim() || !form.content.trim()) {
      showToast('Preencha o título e o conteúdo da colinha.', 'error');
      return;
    }
    if (!resolvedCategory) {
      showToast('Escolha ou crie uma categoria para a colinha.', 'error');
      return;
    }

    try {
      const currentUserId = auth.currentUser?.uid || userData?.uid || userData?.id;
      if (!currentUserId) {
        throw new Error('Usuário não identificado para salvar a colinha.');
      }

      const selectedUsers = shareOptions.filter((user) => form.sharedWith.includes(user.id));
      const userRef = doc(db, 'users', currentUserId);
      const userSnap = await getDoc(userRef);
      const existingColinhas = Array.isArray(userSnap.data()?.colinhas) ? userSnap.data().colinhas : [];
      const existingColinha = editingColinhaId
        ? existingColinhas.find((item) => item.id === editingColinhaId)
        : null;

      if (editingColinhaId && !existingColinha) {
        throw new Error('Não foi possível localizar a colinha para editar.');
      }

      const nextColinha = {
        id: existingColinha?.id || createColinhaId(),
        title: form.title.trim(),
        content: form.content.trim(),
        category: resolvedCategory,
        sharedWith: form.sharedWith,
        sharedWithNames: selectedUsers.map((user) => user.name || 'Sem nome'),
        isShared: false,
        authorId: currentUserId,
        authorName: userData?.name || 'Atendente',
        createdAt: existingColinha?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextColinhas = editingColinhaId
        ? existingColinhas.map((item) => (item.id === editingColinhaId ? nextColinha : item))
        : [nextColinha, ...existingColinhas];

      await setDoc(userRef, {
        colinhas: nextColinhas,
      }, { merge: true });

      closeModal();
      fetchData();
      showToast(editingColinhaId ? 'Colinha atualizada com sucesso.' : 'Colinha criada com sucesso.', 'success');
    } catch (error) {
      showToast(error.message || 'Não foi possível salvar a colinha.', 'error');
    }
  };

  const handleDelete = async (id = confirmDeleteId) => {
    try {
      const currentUserId = auth.currentUser?.uid || userData?.uid || userData?.id;
      const target = colinhas.find((item) => item.id === id);

      if (!currentUserId || !target) {
        throw new Error('Não foi possível localizar a colinha para excluir.');
      }

      if (target.source === 'user_doc') {
        const userRef = doc(db, 'users', currentUserId);
        const userSnap = await getDoc(userRef);
        const existingColinhas = Array.isArray(userSnap.data()?.colinhas) ? userSnap.data().colinhas : [];
        const nextColinhas = existingColinhas.filter((item) => item.id !== id);

        await setDoc(userRef, { colinhas: nextColinhas }, { merge: true });
      } else {
        throw new Error('Esta colinha antiga precisa ser removida pela coleção legada.');
      }

      setConfirmDeleteId(null);
      fetchData();
      showToast('Colinha excluída com sucesso.', 'success');
    } catch (error) {
      showToast(error.message || 'Não foi possível excluir a colinha.', 'error');
    }
  };

  const copyToClipboard = (text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast('Texto copiado para a área de transferência!', 'success'))
        .catch(() => showToast('Erro ao copiar o texto.', 'error'));
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Texto copiado para a área de transferência!', 'success');
    } catch (err) {
      showToast('Erro ao copiar o texto.', 'error');
    }
    document.body.removeChild(textArea);
  };

  const filteredColinhas = useMemo(() => {
    const currentUserId = auth.currentUser?.uid || userData?.uid || userData?.id;

    return colinhas.filter(c => {
      const title = c.title || '';
      const content = c.content || '';
      const sharedWith = Array.isArray(c.sharedWith) ? c.sharedWith : [];
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Todas' || c.category === activeCategory;
      const isMine = c.authorId === currentUserId;
      const wasSharedWithMe = sharedWith.includes(currentUserId) || c.isShared === true;

      if (activeTab === 'mine') return isMine && matchesSearch && matchesCategory;
      if (activeTab === 'shared') return !isMine && wasSharedWithMe && matchesSearch && matchesCategory;

      return (isMine || wasSharedWithMe) && matchesSearch && matchesCategory;
    });
  }, [colinhas, searchTerm, activeTab, activeCategory]);

  const toggleSharedUser = (userId) => {
    setForm((current) => {
      const exists = current.sharedWith.includes(userId);
      const nextSharedWith = exists
        ? current.sharedWith.filter((id) => id !== userId)
        : [...current.sharedWith, userId];

      return {
        ...current,
        sharedWith: nextSharedWith
      };
    });
  };

  const confirmDeleteItem = colinhas.find((item) => item.id === confirmDeleteId) || null;

  return (
    <div style={global.container}>
      
      {/* HEADER GLOBAL */}
      <div style={global.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={global.iconHeader}><BookMarked size={28} color="white"/></div>
          <div>
            <h1 style={global.title}>Minhas Colinhas</h1>
            <p style={global.subtitle}>Cada pessoa vê as próprias colinhas e também as que foram compartilhadas com ela.</p>
          </div>
        </div>
        <button onClick={openCreateModal} style={{...global.btnPrimary, marginLeft: 'auto'}}>
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
        <button onClick={() => setActiveTab('shared')} style={activeTab === 'shared' ? local.tabActive : local.tab}>Compartilhadas comigo</button>
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
                    <>
                      <button
                        onClick={() => handleEdit(item)}
                        style={global.iconBtn}
                        title={item.source === 'user_doc' ? 'Editar' : 'Colinha legada'}
                        disabled={item.source !== 'user_doc'}
                      >
                        <Pencil size={16}/>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        style={{...global.iconBtn, color: '#ef4444'}}
                        title={item.source === 'user_doc' ? 'Excluir' : 'Colinha legada'}
                        disabled={item.source !== 'user_doc'}
                      >
                        <Trash2 size={16}/>
                      </button>
                    </>
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
                {(item.isShared || (item.sharedWith?.length || 0) > 0) && (
                  <div style={local.sharedBadge}>
                    <Users size={12}/>
                    {item.isShared ? 'Equipa' : `Compartilhada (${item.sharedWith?.length || 0})`}
                  </div>
                )}
              </div>

              {!item.isShared && Array.isArray(item.sharedWithNames) && item.sharedWithNames.length > 0 && (
                <div style={local.sharedWithList}>
                  <UserRound size={12} />
                  <span>{item.sharedWithNames.join(', ')}</span>
                </div>
              )}
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
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingColinhaId ? 'Editar Colinha' : 'Nova Colinha'}
        footer={
          <>
            <Btn variant="secondary" onClick={closeModal}>Cancelar</Btn>
            <Btn onClick={handleSave} type="submit">{editingColinhaId ? 'Salvar Alterações' : 'Salvar Colinha'}</Btn>
          </>
        }
      >
            <form onSubmit={handleSave} style={global.form}>
              <InfoBox type="info">
                As notificações deste painel agora seguem o padrão do Hub. As colinhas podem ser privadas ou compartilhadas com pessoas específicas.
              </InfoBox>

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
                  <option value={NEW_CATEGORY_VALUE}>+ Criar nova categoria</option>
                </select>
              </div>

              {form.category === NEW_CATEGORY_VALUE && (
                <div style={global.field}>
                  <label style={global.label}>Nova Categoria</label>
                  <input
                    style={global.input}
                    placeholder="Ex: Atendimento VIP"
                    value={form.newCategory}
                    onChange={e => setForm({...form, newCategory: e.target.value})}
                    required
                  />
                </div>
              )}

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
                <div style={local.shareHeader}>
                  <div>
                    <span style={local.shareTitle}>Compartilhar com pessoas específicas</span>
                    <span style={local.shareHint}>Se ninguém for selecionado, só você verá esta colinha.</span>
                  </div>
                  <span style={local.shareCounter}>{form.sharedWith.length} selecionado(s)</span>
                </div>

                <div style={local.shareList}>
                  {shareOptions.length === 0 ? (
                    <span style={local.shareEmpty}>Nenhum colaborador disponível para compartilhar.</span>
                  ) : (
                    shareOptions.map((user) => (
                      <label key={user.id} style={local.shareUserRow}>
                        <input
                          type="checkbox"
                          checked={form.sharedWith.includes(user.id)}
                          onChange={() => toggleSharedUser(user.id)}
                          style={local.checkbox}
                        />
                        <div style={local.shareUserInfo}>
                          <span style={local.shareUserName}>{user.name || 'Sem nome'}</span>
                          <span style={local.shareUserRole}>{normalizeRole(user.role) === ROLE_KEYS.ATTENDANT ? 'Atendente' : (user.role || 'Colaborador')}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </form>
      </Modal>

      <Modal
        open={Boolean(confirmDeleteItem)}
        onClose={() => setConfirmDeleteId(null)}
        title="Excluir Colinha"
        footer={
          <>
            <Btn variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => handleDelete(confirmDeleteId)}>Excluir</Btn>
          </>
        }
      >
        <InfoBox type="warning">
          Você está prestes a excluir <strong>{confirmDeleteItem?.title || 'esta colinha'}</strong>. Essa ação não pode ser desfeita.
        </InfoBox>
      </Modal>
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
  sharedWithList: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' },

  shareToggle: { padding: '15px', background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border)' },
  shareHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' },
  shareTitle: { display: 'block', fontWeight: 'bold', fontSize: '14px', color: 'var(--text-main)' },
  shareHint: { display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' },
  shareCounter: { fontSize: '12px', fontWeight: '700', color: 'var(--text-brand)', whiteSpace: 'nowrap' },
  shareList: { display: 'grid', gap: '10px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' },
  shareEmpty: { fontSize: '13px', color: 'var(--text-muted)' },
  shareUserRow: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' },
  shareUserInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  shareUserName: { fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' },
  shareUserRole: { fontSize: '12px', color: 'var(--text-muted)' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--text-brand)', flexShrink: 0 }
};
