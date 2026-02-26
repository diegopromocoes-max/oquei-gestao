import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { 
  Store, MapPin, Clock, Phone, Globe, Search, Layers, 
  Plus, Edit, Trash2, X, Save, CheckCircle
} from 'lucide-react';

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

      // 2. Clusters (Regionais) - As abas serão baseadas nisso
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
    // Filtra pela aba (Cluster ID) ou mostra tudo se for 'all'
    const matchesTab = activeTab === 'all' || store.clusterId === activeTab;
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getClusterName = (id) => {
    const cluster = clusters.find(c => c.id === id);
    return cluster ? cluster.name : id;
  };

  return (
    <div style={styles.container}>
      
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div style={styles.iconHeader}><Store size={28} color="white"/></div>
        <div>
          <h1 style={styles.title}>Portfólio de Lojas</h1>
          <p style={styles.subtitle}>Gestão organizada por Regional</p>
        </div>
      </div>

      {/* BARRA DE CONTROLE */}
      <div style={styles.controlBar}>
        
        <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center', width: '100%'}}>
          {/* Busca */}
          <div style={styles.searchBox}>
            <Search size={18} color="#94a3b8" />
            <input 
              style={styles.searchInput} 
              placeholder="Buscar cidade..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Botões de Ação (Só p/ Coordenador) */}
          {isEditingAllowed && (
            <div style={{display: 'flex', gap: '10px', marginLeft: 'auto'}}>
              <button onClick={() => openModal('cluster')} style={styles.btnSecondary}>
                <Layers size={16}/> Nova Regional
              </button>
              <button onClick={() => openModal('store')} style={styles.btnPrimary}>
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
          
          {/* Itera sobre os CLUSTERS para criar as abas */}
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
        <p style={{textAlign:'center', color:'#94a3b8', padding:'40px'}}>Carregando portfólio...</p>
      ) : (
        <div style={styles.grid}>
          {filteredStores.map(store => (
            <div key={store.id} style={styles.card}>
              
              <div style={styles.cardHeader}>
                <div style={styles.cardIconBox}><MapPin size={20} color="#2563eb" /></div>
                
                {isEditingAllowed ? (
                   <div style={{display: 'flex', gap: '5px'}}>
                      <button onClick={() => openModal('edit_store', store)} style={styles.iconAction}><Edit size={14}/></button>
                      <button onClick={() => handleDelete('cities', store.id)} style={{...styles.iconAction, color: '#ef4444'}}><Trash2 size={14}/></button>
                   </div>
                ) : (
                   store.active ? <span style={styles.badgeActive}>ATIVA</span> : <span style={styles.badgeInactive}>INATIVA</span>
                )}
              </div>

              <h3 style={styles.cardTitle}>{store.name}</h3>
              
              <div style={styles.cardBody}>
                <p style={styles.infoRow}>
                  <Globe size={14} color="#94a3b8" /> 
                  <span style={{color: '#64748b', fontSize:'12px', fontWeight:'600', textTransform:'uppercase'}}>
                    {getClusterName(store.clusterId)}
                  </span>
                </p>
                <p style={styles.infoRow}>
                  <MapPin size={14} color="#94a3b8" /> 
                  <span style={{color: '#334155'}}>{store.address || 'Endereço não cadastrado'}</span>
                </p>
              </div>

              <div style={styles.cardFooter}>
                <div style={styles.footerItem}>
                  <Clock size={14} color="#059669" />
                  <span>{store.hours || 'Horário Com.'}</span>
                </div>
                <div style={styles.footerItem}>
                  <Phone size={14} color="#2563eb" />
                  <span>Ramal: <strong>{store.extension || '-'}</strong></span>
                </div>
              </div>

            </div>
          ))}
          
          {filteredStores.length === 0 && (
            <div style={styles.emptyState}>
              Nenhuma loja encontrada nesta Regional.
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={{fontWeight:'bold', fontSize:'18px'}}>
                {showModal === 'cluster' ? 'Nova Regional' : showModal === 'store' ? 'Nova Loja' : 'Editar Loja'}
              </h3>
              <button onClick={closeModal} style={styles.closeBtn}><X size={20}/></button>
            </div>

            {showModal === 'cluster' ? (
              <form onSubmit={handleSaveCluster} style={styles.formStack}>
                <label style={styles.label}>Nome da Regional</label>
                <input style={styles.input} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Cluster Sul" required />
                <button style={styles.btnPrimary}>Salvar Regional</button>
              </form>
            ) : (
              <form onSubmit={handleSaveStore} style={styles.formStack}>
                <div>
                   <label style={styles.label}>Nome da Cidade/Loja</label>
                   <input style={styles.input} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                   <div>
                      <label style={styles.label}>Regional (Obrigatório)</label>
                      <select style={styles.select} value={formData.clusterId || ''} onChange={e => setFormData({...formData, clusterId: e.target.value})} required>
                        <option value="">Selecione...</option>
                        {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                   <div>
                      <label style={styles.label}>Ramal</label>
                      <input style={styles.input} value={formData.extension || ''} onChange={e => setFormData({...formData, extension: e.target.value})} />
                   </div>
                </div>

                <div>
                   <label style={styles.label}>Endereço Completo</label>
                   <input style={styles.input} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>

                <div>
                   <label style={styles.label}>Horário de Funcionamento</label>
                   <input style={styles.input} value={formData.hours || ''} onChange={e => setFormData({...formData, hours: e.target.value})} placeholder="Ex: 08:00 - 18:00" />
                </div>

                <button style={styles.btnPrimary}>Salvar Loja</button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// --- ESTILOS INLINE ---
const styles = {
  container: { width: '100%' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },

  controlBar: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.01)', maxWidth: '400px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#334155' },

  tabsContainer: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' },
  tab: { padding: '10px 20px', borderRadius: '20px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' },
  tabActive: { padding: '10px 20px', borderRadius: '20px', background: '#2563eb', border: '1px solid #2563eb', color: 'white', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(37,99,235,0.3)' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' },
  
  card: { background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '24px', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' },
  
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' },
  cardIconBox: { width: '40px', height: '40px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badgeActive: { fontSize: '10px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.05em' },
  badgeInactive: { fontSize: '10px', fontWeight: '900', color: '#ef4444', background: '#fef2f2', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.05em' },

  cardTitle: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 15px 0' },
  
  cardBody: { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, marginBottom: '20px' },
  infoRow: { display: 'flex', alignItems: 'start', gap: '10px', fontSize: '13px', margin: 0, lineHeight: '1.5' },

  cardFooter: { borderTop: '1px solid #f1f5f9', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: '500' },

  btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' },
  btnSecondary: { background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' },
  iconAction: { background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b' },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { background: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  formStack: { display: 'flex', flexDirection: 'column', gap: '15px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' },
  input: { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', background: 'white' },
  emptyState: { gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', borderRadius: '20px' }
};