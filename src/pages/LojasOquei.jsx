import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { 
  Store, MapPin, Clock, Phone, Globe, Search, Layers, 
  Plus, Edit, Trash2, X, Save, CheckCircle
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

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
        alert("Loja atualizada!");
      } else {
        await addDoc(collection(db, "cities"), { 
          ...formData, 
          active: true 
        });
        alert("Loja criada!");
      }
      closeModal();
      fetchData();
    } catch (e) { alert("Erro: " + e.message); }
  };

  const handleDelete = async (collectionName, id) => {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente?")) return;
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
      
      {/* CABEÇALHO */}
      <div style={global.header}>
        <div style={{...global.iconHeader, background: '#10b981'}}><Store size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Portfólio de Lojas</h1>
          <p style={global.subtitle}>Gestão organizada por Regional</p>
        </div>
      </div>

      {/* BARRA DE CONTROLE */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px'}}>
        
        <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', width: '100%'}}>
          <div style={global.searchBox}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              style={global.searchInput} 
              placeholder="Buscar cidade..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {isEditingAllowed && (
            <div style={{display: 'flex', gap: '10px', marginLeft: 'auto'}}>
              <button onClick={() => openModal('cluster')} style={global.btnSecondary}>
                <Layers size={16}/> Nova Regional
              </button>
              <button onClick={() => openModal('store')} style={{...global.btnPrimary, background: '#10b981', width: 'auto'}}>
                <Plus size={16}/> Nova Loja
              </button>
            </div>
          )}
        </div>

        {/* Abas de Cluster (Regionais) */}
        <div style={styles.tabsContainer}>
          <button onClick={() => setActiveTab('all')} style={activeTab === 'all' ? styles.tabActive : styles.tab}>
            <Globe size={14} /> Todas
          </button>
          {clusters.map(cluster => (
            <button 
              key={cluster.id}
              onClick={() => setActiveTab(cluster.id)}
              style={activeTab === cluster.id ? styles.tabActive : styles.tab}
            >
              {cluster.name.replace('Cluster ', '').replace('Regional ', '')}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE LOJAS */}
      {loading ? (
        <p style={{textAlign:'center', color:'var(--text-muted)', padding:'40px'}}>Carregando portfólio...</p>
      ) : (
        <div style={global.gridCards}>
          {filteredStores.map(store => (
            <div key={store.id} style={{...global.card, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box'}}>
              
              <div style={styles.cardHeader}>
                <div style={styles.cardIconBox}><MapPin size={20} color="var(--text-brand)" /></div>
                
                {isEditingAllowed ? (
                   <div style={{display: 'flex', gap: '5px'}}>
                      <button onClick={() => openModal('edit_store', store)} style={global.iconBtn}><Edit size={14}/></button>
                      <button onClick={() => handleDelete('cities', store.id)} style={{...global.iconBtn, color: '#ef4444'}}><Trash2 size={14}/></button>
                   </div>
                ) : (
                   store.active ? <span style={styles.badgeActive}>ATIVA</span> : <span style={styles.badgeInactive}>INATIVA</span>
                )}
              </div>

              <h3 style={styles.cardTitle}>{store.name}</h3>
              
              <div style={styles.cardBody}>
                <p style={styles.infoRow}>
                  <Globe size={14} color="var(--text-muted)" /> 
                  <span style={{color: 'var(--text-muted)', fontSize:'12px', fontWeight:'600', textTransform:'uppercase'}}>
                    {getClusterName(store.clusterId)}
                  </span>
                </p>
                <p style={styles.infoRow}>
                  <MapPin size={14} color="var(--text-muted)" /> 
                  <span style={{color: 'var(--text-main)'}}>{store.address || 'Endereço não cadastrado'}</span>
                </p>
              </div>

              <div style={styles.cardFooter}>
                <div style={styles.footerItem}>
                  <Clock size={14} color="#10b981" />
                  <span>{store.hours || 'Horário Com.'}</span>
                </div>
                <div style={styles.footerItem}>
                  <Phone size={14} color="var(--text-brand)" />
                  <span>Ramal: <strong style={{color: 'var(--text-main)'}}>{store.extension || '-'}</strong></span>
                </div>
              </div>

            </div>
          ))}
          
          {filteredStores.length === 0 && (
            <div style={{...global.emptyState, gridColumn: '1 / -1'}}>
              Nenhuma loja encontrada nesta Regional.
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      {showModal && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
            <div style={global.modalHeader}>
              <h3 style={global.modalTitle}>
                {showModal === 'cluster' ? 'Nova Regional' : showModal === 'store' ? 'Nova Loja' : 'Editar Loja'}
              </h3>
              <button onClick={closeModal} style={global.closeBtn}><X size={20}/></button>
            </div>

            {showModal === 'cluster' ? (
              <form onSubmit={handleSaveCluster} style={global.form}>
                <div style={global.field}>
                  <label style={global.label}>Nome da Regional</label>
                  <input style={global.input} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Cluster Sul" required />
                </div>
                <button style={{...global.btnPrimary, background: '#10b981'}}>Salvar Regional</button>
              </form>
            ) : (
              <form onSubmit={handleSaveStore} style={global.form}>
                <div style={global.field}>
                   <label style={global.label}>Nome da Cidade/Loja</label>
                   <input style={global.input} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                
                <div style={global.row}>
                   <div style={global.field}>
                      <label style={global.label}>Regional (Obrigatório)</label>
                      <select style={global.select} value={formData.clusterId || ''} onChange={e => setFormData({...formData, clusterId: e.target.value})} required>
                        <option value="">Selecione...</option>
                        {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                   <div style={global.field}>
                      <label style={global.label}>Ramal</label>
                      <input style={global.input} value={formData.extension || ''} onChange={e => setFormData({...formData, extension: e.target.value})} />
                   </div>
                </div>

                <div style={global.field}>
                   <label style={global.label}>Endereço Completo</label>
                   <input style={global.input} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>

                <div style={global.field}>
                   <label style={global.label}>Horário de Funcionamento</label>
                   <input style={global.input} value={formData.hours || ''} onChange={e => setFormData({...formData, hours: e.target.value})} placeholder="Ex: 08:00 - 18:00" />
                </div>

                <button style={{...global.btnPrimary, background: '#10b981'}}>Salvar Loja</button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ESTILOS LOCAIS
const styles = {
  tabsContainer: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' },
  tab: { padding: '10px 20px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' },
  tabActive: { padding: '10px 20px', borderRadius: '20px', background: 'var(--text-brand)', border: '1px solid var(--text-brand)', color: 'white', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' },
  
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' },
  cardIconBox: { width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badgeActive: { fontSize: '10px', fontWeight: '900', color: '#10b981', background: 'var(--bg-success-light)', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.05em' },
  badgeInactive: { fontSize: '10px', fontWeight: '900', color: '#ef4444', background: 'var(--bg-danger-light)', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.05em' },

  cardTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 15px 0' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, marginBottom: '20px' },
  infoRow: { display: 'flex', alignItems: 'start', gap: '10px', fontSize: '13px', margin: 0, lineHeight: '1.5' },

  cardFooter: { borderTop: '1px solid var(--border)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' },
};