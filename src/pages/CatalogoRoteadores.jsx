import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { 
  Router, Search, Plus, AlertTriangle, 
  CheckCircle2, Wifi, Cpu, X, Edit, Trash2, Image as ImageIcon,
  ShieldCheck, AlertOctagon
} from 'lucide-react';
import { colors } from '../styles/globalStyles';

export default function CatalogoRoteadores({ userData }) {
  const [equipments, setEquipments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos'); // ABAS: 'todos', 'aptos', 'obsoletos'
  
  // Controles do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Permissão
  const canManage = String(userData?.role).toLowerCase().includes('coord') || String(userData?.role).toLowerCase().includes('superv');

  // Estados do Formulário (Status atualizados)
  const [formData, setFormData] = useState({
    model: '',
    brand: '',
    tech: 'Wi-Fi 5 (Dual Band)',
    status: 'Troca Recomendada',
    notes: '',
    photoUrl: ''
  });

  // 1. LER DADOS
  useEffect(() => {
    const q = query(collection(db, 'router_catalog'), orderBy('brand', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEquipments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. ABRIR MODAL PARA NOVO
  const handleOpenAdd = () => {
    setFormData({ model: '', brand: '', tech: 'Wi-Fi 5 (Dual Band)', status: 'Apto para Uso', notes: '', photoUrl: '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  // 3. ABRIR MODAL PARA EDITAR
  const handleEdit = (eq) => {
    // Para manter compatibilidade com antigos cadastros que tinham "Recomendado"
    let safeStatus = eq.status;
    if (safeStatus === 'Recomendado') safeStatus = 'Apto para Uso';

    setFormData({
      model: eq.model || '',
      brand: eq.brand || '',
      tech: eq.tech || 'Wi-Fi 5 (Dual Band)',
      status: safeStatus || 'Troca Recomendada',
      notes: eq.notes || '',
      photoUrl: eq.photoUrl || ''
    });
    setEditingId(eq.id);
    setIsModalOpen(true);
  };

  // 4. SALVAR
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'router_catalog', editingId), {
          ...formData,
          updatedAt: new Date().toISOString(),
          author: userData?.name || 'Gestor'
        });
      } else {
        await addDoc(collection(db, 'router_catalog'), {
          ...formData,
          createdAt: new Date().toISOString(),
          author: userData?.name || 'Gestor'
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar equipamento.");
    }
  };

  // 5. EXCLUIR
  const handleDeleteItem = async (id, model) => {
    if (!window.confirm(`Tem a certeza que deseja excluir o roteador ${model}?`)) return;
    try {
      await deleteDoc(doc(db, 'router_catalog', id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir.");
    }
  };

  // 6. FILTRO DE BUSCA E ABAS
  const filteredEquipments = equipments.filter(eq => {
    // Traduz status antigo "Recomendado" para a lógica nova
    const isApto = eq.status === 'Apto para Uso' || eq.status === 'Recomendado';
    const isObsoleto = eq.status === 'Troca Recomendada' || eq.status === 'Troca Obrigatória';

    const matchesSearch = (eq.model || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (eq.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === 'todos' ? true :
      activeTab === 'aptos' ? isApto :
      activeTab === 'obsoletos' ? isObsoleto : true;

    return matchesSearch && matchesTab;
  });

  // FUNÇÕES AUXILIARES DE DESIGN BASEADAS NO STATUS
  const getStatusColor = (status) => {
    if (status === 'Apto para Uso' || status === 'Recomendado') return '#10b981'; // Verde
    if (status === 'Troca Recomendada') return '#f59e0b'; // Laranja
    if (status === 'Troca Obrigatória') return '#ef4444'; // Vermelho
    return '#94a3b8'; // Cinza (fallback)
  };

  const getStatusIcon = (status) => {
    if (status === 'Apto para Uso' || status === 'Recomendado') return <ShieldCheck size={18} color="#10b981" />;
    if (status === 'Troca Recomendada') return <AlertTriangle size={18} color="#f59e0b" />;
    if (status === 'Troca Obrigatória') return <AlertOctagon size={18} color="#ef4444" />;
    return <AlertTriangle size={18} color="#94a3b8" />;
  };

  return (
    <div className="animated-view" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <Router color={colors?.primary || '#3b82f6'} size={28} />
            Catálogo de Equipamentos
          </h2>
          <p style={styles.subtitle}>Consulte roteadores homologados e identifique tecnologias obsoletas.</p>
        </div>

        {canManage && (
          <button onClick={handleOpenAdd} style={{...styles.actionBtn, background: '#2563eb', color: 'white'}}>
            <Plus size={16} /> Novo Equipamento
          </button>
        )}
      </div>

      {/* SISTEMA DE ABAS (TABS) */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('todos')} 
          style={activeTab === 'todos' ? styles.activeTab : styles.tab}
        >
          Todos os Modelos
        </button>
        <button 
          onClick={() => setActiveTab('aptos')} 
          style={activeTab === 'aptos' ? {...styles.activeTab, color: '#10b981', borderBottomColor: '#10b981'} : styles.tab}
        >
          <ShieldCheck size={16} style={{marginRight: '6px'}} /> Aptos para Uso
        </button>
        <button 
          onClick={() => setActiveTab('obsoletos')} 
          style={activeTab === 'obsoletos' ? {...styles.activeTab, color: '#ef4444', borderBottomColor: '#ef4444'} : styles.tab}
        >
          <AlertOctagon size={16} style={{marginRight: '6px'}} /> Obsoletos (Trocar)
        </button>
      </div>

      {/* BARRA DE PESQUISA */}
      <div style={styles.topBar}>
        <div style={styles.searchWrapper}>
          <Search size={20} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Pesquisar por marca ou modelo (ex: Huawei, TP-Link...)" 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Alerta dinâmico dependendo da aba */}
        {activeTab === 'obsoletos' && (
          <div style={{...styles.infoAlert, background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca'}}>
            <AlertTriangle size={18} />
            <span>Equipamentos abaixo identificados em clientes com lentidão devem ser agendados para troca.</span>
          </div>
        )}
        {activeTab === 'aptos' && (
          <div style={{...styles.infoAlert, background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0'}}>
            <ShieldCheck size={18} />
            <span>Equipamentos homologados. Não necessitam de substituição tecnológica.</span>
          </div>
        )}
      </div>

      {/* GRELHA DE EQUIPAMENTOS */}
      <div style={styles.grid}>
        {filteredEquipments.map((eq) => {
          const statusColor = getStatusColor(eq.status);
          
          return (
            <div key={eq.id} style={{
              ...styles.card,
              borderTop: `4px solid ${statusColor}`
            }}>
              
              {/* FOTO DO ROTEADOR */}
              {eq.photoUrl ? (
                <div style={styles.imageContainer}>
                  <img src={eq.photoUrl} alt={eq.model} style={styles.routerImage} />
                </div>
              ) : (
                <div style={styles.imagePlaceholder}>
                  <ImageIcon size={32} color="#cbd5e1" />
                  <span>Sem Foto</span>
                </div>
              )}

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={styles.cardHeader}>
                  <span style={styles.brandTag}>{eq.brand}</span>
                  {getStatusIcon(eq.status)}
                </div>
                
                <h3 style={styles.modelName}>{eq.model}</h3>
                
                <div style={styles.techInfo}>
                  <div style={styles.techLine}><Wifi size={14} /> {eq.tech}</div>
                  <div style={styles.techLine}><Cpu size={14} /> Status: <b style={{ color: statusColor }}>{eq.status}</b></div>
                </div>
                
                <p style={styles.cardNotes}>{eq.notes}</p>
                
                {/* BOTÕES DE AÇÃO (EDITAR / EXCLUIR) */}
                {canManage && (
                  <div style={styles.cardActions}>
                    <button onClick={() => handleEdit(eq)} style={styles.btnEdit} title="Editar Equipamento">
                      <Edit size={14} /> Editar
                    </button>
                    <button onClick={() => handleDeleteItem(eq.id, eq.model)} style={styles.btnDelete} title="Excluir Equipamento">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {filteredEquipments.length === 0 && !loading && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
            Nenhum equipamento encontrado nesta categoria.
          </div>
        )}
      </div>

      {/* MODAL (ADICIONAR / EDITAR) */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px' }}>
                {editingId ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleSave} style={styles.form}>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Link da Foto (URL da Imagem)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="url" 
                    value={formData.photoUrl} 
                    onChange={e => setFormData({...formData, photoUrl: e.target.value})} 
                    style={{...styles.input, flex: 1}} 
                    placeholder="https://exemplo.com/foto-do-roteador.png" 
                  />
                  {formData.photoUrl && (
                    <img src={formData.photoUrl} alt="Preview" style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Marca</label>
                  <input required type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} style={styles.input} placeholder="Ex: TP-Link" />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Modelo</label>
                  <input required type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} style={styles.input} placeholder="Ex: Archer C60" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Tecnologia / Wi-Fi</label>
                  <select value={formData.tech} onChange={e => setFormData({...formData, tech: e.target.value})} style={styles.input}>
                    <option>Wi-Fi 4 (2.4GHz) - Antigo</option>
                    <option>Wi-Fi 5 (Dual Band) - Padrão</option>
                    <option>Wi-Fi Gigabit</option>
                    <option>ONT GPON</option>
                    <option>Wi-Fi 6 (AX) - Premium</option>
                  </select>
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Status de Troca</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={styles.input}>
                    <option>Apto para Uso</option>
                    <option>Troca Recomendada</option>
                    <option>Troca Obrigatória</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Motivo / Observações</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{...styles.input, height: '70px', resize: 'vertical'}} placeholder="Ex: Equipamento em perfeitas condições para clientes até 500MB..." />
              </div>
              
              <button type="submit" style={styles.saveBtn}>
                {editingId ? 'Salvar Alterações' : 'Adicionar ao Catálogo'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.4s ease forwards; }
      `}</style>
    </div>
  );
}

const styles = {
  header: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  title: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: '5px 0 0 0' },
  actionBtn: { padding: '12px 20px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', transition: '0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  
  // ABAS (TABS)
  tabsContainer: { display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', marginBottom: '25px', overflowX: 'auto', paddingBottom: '2px' },
  tab: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '10px 5px', fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  activeTab: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', borderBottom: '3px solid var(--text-brand)', padding: '10px 5px', fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' },

  topBar: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
  searchWrapper: { flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '14px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  searchInput: { border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '15px', color: 'var(--text-main)', fontWeight: '500' },
  infoAlert: { padding: '14px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', border: '1px solid var(--border)' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  card: { background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  
  imageContainer: { width: '100%', height: '180px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', padding: '15px' },
  routerImage: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  imagePlaceholder: { width: '100%', height: '180px', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', gap: '8px', fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid var(--border)' },

  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  brandTag: { fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '4px 8px', borderRadius: '6px' },
  modelName: { fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 10px 0' },
  techInfo: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' },
  techLine: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' },
  cardNotes: { fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '15px', margin: '0 0 15px 0', lineHeight: '1.4', flex: 1 },

  cardActions: { display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '15px', marginTop: 'auto' },
  btnEdit: { flex: 1, background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  btnDelete: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' },
  modalContent: { background: 'var(--bg-card)', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' },
  closeBtn: { background: '#ef4444', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '12px', transition: 'background 0.2s', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', background: 'var(--bg-app)', color: 'var(--text-main)' },
  saveBtn: { background: '#2563eb', color: 'white', border: 'none', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', marginTop: '10px', transition: '0.2s', boxShadow: '0 4px 15px rgba(37,99,235,0.2)' }
};