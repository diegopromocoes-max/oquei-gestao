import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { 
  Store, MapPin, Clock, Phone, Globe, Search, Layers, 
  Plus, Edit, Trash2, X, Building2
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function LojasOquei({ isEditingAllowed = false }) {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de Edição/Criação
  const [showModal, setShowModal] = useState(null); // 'cluster', 'store', 'edit_store'
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  // --- CARREGAMENTO ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Lojas (Cidades)
      const qStores = query(collection(db, "cities"), orderBy("name"));
      const snapStores = await getDocs(qStores);
      setStores(snapStores.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Clusters (Regionais)
      const qClusters = query(collection(db, "clusters"), orderBy("name"));
      const snapClusters = await getDocs(qClusters);
      setClusters(snapClusters.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) { console.error("Erro ao carregar:", err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- HANDLERS DE AÇÃO ---
  const handleSaveCluster = async (e) => {
    e.preventDefault();
    try {
      const slug = formData.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
      await addDoc(collection(db, "clusters"), { name: formData.name, slug });
      alert("Regional criada!");
      closeModal();
      fetchData();
    } catch (e) { alert("Erro: " + e.message); }
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "cities", editingId), formData);
        alert("Loja atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "cities"), { 
          ...formData, 
          active: true 
        });
        alert("Nova loja inserida no portfólio!");
      }
      closeModal();
      fetchData();
    } catch (e) { alert("Erro: " + e.message); }
  };

  const handleDelete = async (collectionName, id) => {
    if (!window.confirm("Pretende realmente excluir este item permanentemente?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      fetchData();
    } catch (e) { alert("Erro ao excluir: " + e.message); }
  };

  const openModal = (type, data = null) => {
    setShowModal(type);
    if (data) {
      setFormData(data);
      setEditingId(data.id);
    } else {
      setFormData({});
      setEditingId(null);
    }
  };

  const closeModal = () => {
    setShowModal(null);
    setFormData({});
    setEditingId(null);
  };

  // --- FILTRAGEM ---
  const filteredStores = stores.filter(store => {
    const matchesTab = activeTab === 'all' || store.clusterId === activeTab;
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getClusterName = (id) => {
    const cluster = clusters.find(c => c.id === id);
    return cluster ? cluster.name : id;
  };

  return (
    <div style={global.container}>
      
      {/* ── CABEÇALHO PADRÃO OQUEI STRATEGY ── */}
      <div style={local.headerWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...local.iconBox, background: `linear-gradient(135deg, ${colors.success}, #059669)`, boxShadow: `0 8px 20px ${colors.success}40` }}>
            <Building2 size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerTitle}>Portfólio de Lojas</div>
            <div style={local.headerSubtitle}>
              Gestão organizada por Regional Física · {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Botões de Ação Movidos para o Cabeçalho */}
        {isEditingAllowed && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => openModal('cluster')} style={{ ...global.btnSecondary, borderRadius: '14px', padding: '12px 20px', fontWeight: '800' }}>
              <Layers size={16}/> Nova Regional
            </button>
            <button onClick={() => openModal('store')} style={{ ...global.btnPrimary, background: colors.success, borderRadius: '14px', padding: '12px 24px', fontWeight: '900' }}>
              <Plus size={18}/> Nova Loja
            </button>
          </div>
        )}
      </div>

      {/* ── BARRA DE CONTROLES (SEARCH + TABS) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginBottom: '30px' }}>
        
        <div style={{ ...global.toolbar, background: 'var(--bg-card)', padding: '15px 25px', borderRadius: '18px', border: '1px solid var(--border)' }}>
          <div style={{ ...global.searchBox, margin: 0 }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              style={global.searchInput} 
              placeholder="Procurar cidade ou loja..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS (PILLS) */}
        <div style={local.navBar}>
          <button 
            onClick={() => setActiveTab('all')} 
            style={activeTab === 'all' ? { ...local.navBtnActive, color: colors.success, borderColor: colors.success } : local.navBtn}
          >
            <Globe size={16} /> Todas as Regionais
          </button>
          {clusters.map(cluster => (
            <button 
              key={cluster.id}
              onClick={() => setActiveTab(cluster.id)}
              style={activeTab === cluster.id ? { ...local.navBtnActive, color: colors.success, borderColor: colors.success } : local.navBtn}
            >
              {cluster.name.replace('Cluster ', '').replace('Regional ', '')}
            </button>
          ))}
        </div>
      </div>

      {/* ── GRID DE LOJAS ── */}
      {loading ? (
        <p style={{textAlign:'center', color:'var(--text-muted)', padding:'40px', fontWeight: 'bold'}}>Carregando portfólio...</p>
      ) : (
        <div className="animated-view" style={local.gridCards}>
          {filteredStores.map(store => (
            <div key={store.id} style={local.dataCard}>
              
              <div style={local.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ ...local.cardIconBox, background: `${colors.success}15` }}>
                    <Store size={22} color={colors.success} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-main)' }}>{store.name}</h4>
                      {store.active ? (
                        <span style={{ fontSize: '9px', background: `${colors.success}20`, color: colors.success, padding: '3px 8px', borderRadius: '8px', fontWeight: '900', letterSpacing: '0.05em' }}>ATIVA</span>
                      ) : (
                        <span style={{ fontSize: '9px', background: `${colors.danger}20`, color: colors.danger, padding: '3px 8px', borderRadius: '8px', fontWeight: '900', letterSpacing: '0.05em' }}>INATIVA</span>
                      )}
                    </div>
                    <span style={{ ...local.badge, background: 'var(--bg-app)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      <Layers size={12} style={{marginRight: '4px'}}/> {getClusterName(store.clusterId)}
                    </span>
                  </div>
                </div>

                {isEditingAllowed && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openModal('edit_store', store)} style={local.actionBtn} title="Editar"><Edit size={16}/></button>
                    <button onClick={() => handleDelete('cities', store.id)} style={{...local.actionBtn, color: colors.danger}} title="Excluir"><Trash2 size={16}/></button>
                  </div>
                )}
              </div>

              {/* Corpo do Card */}
              <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  <MapPin size={16} color={colors.primary} style={{ flexShrink: 0 }} /> 
                  {store.address || 'Endereço não cadastrado'}
                </span>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed var(--border)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><Clock size={14} color={colors.success}/> {store.hours || 'Horário Comercial'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} color={colors.warning}/> Ramal: <strong style={{color: 'var(--text-main)'}}>{store.extension || '-'}</strong></span>
                </div>
              </div>

            </div>
          ))}
          
          {filteredStores.length === 0 && (
            <div style={{ ...global.emptyState, gridColumn: '1 / -1', minHeight: '200px' }}>
              Nenhuma loja encontrada para este filtro.
            </div>
          )}
        </div>
      )}

      {/* ── MODAIS DE CRIAÇÃO/EDIÇÃO ── */}
      {showModal && (
        <div style={global.modalOverlay}>
          <div style={{ ...global.modalBox, borderRadius: '24px', maxWidth: '500px' }}>
            <div style={global.modalHeader}>
              <h3 style={{ ...global.modalTitle, fontWeight: '900' }}>
                {showModal === 'cluster' ? 'Nova Regional' : showModal === 'store' ? 'Nova Loja' : 'Editar Loja'}
              </h3>
              <button onClick={closeModal} style={global.closeBtn}><X size={24}/></button>
            </div>

            {showModal === 'cluster' ? (
              <form onSubmit={handleSaveCluster} style={{...global.form, padding: '10px 0'}}>
                <div style={global.field}>
                  <label style={local.label}>Nome da Regional</label>
                  <input style={global.input} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Cluster Sul" required />
                </div>
                <button style={{ ...global.btnPrimary, background: colors.success, height: '50px', fontWeight: '900', borderRadius: '14px', marginTop: '10px' }}>Salvar Regional</button>
              </form>
            ) : (
              <form onSubmit={handleSaveStore} style={{...global.form, padding: '10px 0'}}>
                <div style={global.field}>
                   <label style={local.label}>Nome da Cidade/Loja</label>
                   <input style={global.input} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                
                <div style={global.row}>
                   <div style={global.field}>
                      <label style={local.label}>Regional Vinculada</label>
                      <select style={global.select} value={formData.clusterId || ''} onChange={e => setFormData({...formData, clusterId: e.target.value})} required>
                        <option value="">Selecione...</option>
                        {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                   <div style={global.field}>
                      <label style={local.label}>Ramal</label>
                      <input style={global.input} value={formData.extension || ''} onChange={e => setFormData({...formData, extension: e.target.value})} />
                   </div>
                </div>

                <div style={global.field}>
                   <label style={local.label}>Endereço Completo</label>
                   <input style={global.input} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>

                <div style={global.field}>
                   <label style={local.label}>Horário de Funcionamento</label>
                   <input style={global.input} value={formData.hours || ''} onChange={e => setFormData({...formData, hours: e.target.value})} placeholder="Ex: 08:00 - 18:00" />
                </div>

                {showModal === 'edit_store' && (
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '5px'}}>
                    <input type="checkbox" checked={formData.active !== false} onChange={e => setFormData({...formData, active: e.target.checked})} style={{width: '18px', height: '18px', accentColor: colors.success, cursor: 'pointer'}} />
                    <span style={{fontSize: '14px', fontWeight: '800', color: 'var(--text-main)'}}>Loja Aberta e Ativa</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                  <button type="button" onClick={closeModal} style={{ ...global.btnSecondary, flex: 1, borderRadius: '14px', fontWeight: '800' }}>Cancelar</button>
                  <button type="submit" style={{ ...global.btnPrimary, background: colors.success, flex: 2, borderRadius: '14px', fontWeight: '900' }}>Salvar Loja</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.3s ease forwards; }
      `}</style>
    </div>
  );
}

// --- ESTILOS LOCAIS PADRONIZADOS OQUEI STRATEGY ---
const local = {
  headerWrapper: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
    border: '1px solid var(--border)', borderRadius: '24px',
    padding: '24px 32px', marginBottom: '25px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '20px', boxShadow: 'var(--shadow-sm)',
  },
  iconBox: {
    width: '56px', height: '56px', borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  headerSubtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },

  navBar: { display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '8px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '800', transition: '0.2s', background: 'transparent', color: 'var(--text-muted)' },
  navBtnActive: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', transition: '0.2s', background: 'var(--bg-panel)', boxShadow: 'var(--shadow-sm)' },

  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px', width: '100%' },
  dataCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: 'var(--shadow-sm)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIconBox: { padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  actionBtn: { border: '1px solid var(--border)', background: 'var(--bg-app)', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', color: 'var(--text-muted)' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '800' },
  label: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }
};