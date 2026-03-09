import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  Globe, Plus, X, MapPin, Trash2, Edit, Navigation, Phone, Clock, Network, Users, Building2
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

export default function GestaoEstrutura({ setNotification }) {
  // --- NAVEGAÇÃO ---
  const [activeTab, setActiveTab] = useState('canais'); 

  // --- ESTADOS DE DADOS ---
  const [channels, setChannels] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DOS FORMULÁRIOS ---
  const [channelName, setChannelName] = useState('');
  
  const [clusterName, setClusterName] = useState('');
  const [selChannel, setSelChannel] = useState('');
  
  const [cityName, setCityName] = useState('');
  const [cityAddr, setCityAddr] = useState('');
  const [cityLat, setCityLat] = useState(''); 
  const [cityLon, setCityLon] = useState(''); 
  const [cityHours, setCityHours] = useState('');
  const [cityExt, setCityExt] = useState('');
  const [selCluster, setSelCluster] = useState('');
  
  // --- ESTADOS DE EDIÇÃO ---
  const [editingType, setEditingType] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // --- BUSCA DE DADOS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const snapChannels = await getDocs(collection(db, "sales_channels"));
      const chData = snapChannels.docs.map(d => ({ id: d.id, ...d.data() }));
      chData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setChannels(chData);

      const snapC = await getDocs(collection(db, "clusters"));
      const clData = snapC.docs.map(d => ({ id: d.id, ...d.data() }));
      clData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClusters(clData);
      
      const snapCit = await getDocs(collection(db, "cities"));
      const ciData = snapCit.docs.map(d => ({ id: d.id, ...d.data() }));
      ciData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCities(ciData);
    } catch (err) {
      console.error(err);
      if(setNotification) setNotification({ type: 'error', message: 'Erro ao carregar os dados.' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^\w\-]+/g, '');

  // --- ADICIONAR ---
  const addChannel = async (e) => { 
    e.preventDefault(); 
    try {
      await setDoc(doc(db, "sales_channels", slug(channelName)), { name: channelName }); 
      setChannelName(''); fetchData(); 
      if(setNotification) setNotification({ type: 'success', message: 'Canal criado!' });
    } catch (e) { if(setNotification) setNotification({ type: 'error', message: e.message }); }
  };

  const addCluster = async (e) => { 
    e.preventDefault(); 
    try {
      await setDoc(doc(db, "clusters", slug(clusterName)), { name: clusterName, channelId: selChannel }); 
      setClusterName(''); setSelChannel(''); fetchData(); 
      if(setNotification) setNotification({ type: 'success', message: 'Regional criada e vinculada!' });
    } catch (e) { if(setNotification) setNotification({ type: 'error', message: e.message }); }
  };

  const addCity = async (e) => { 
    e.preventDefault(); 
    try {
      await setDoc(doc(db, "cities", slug(cityName)), { 
        name: cityName, clusterId: selCluster, address: cityAddr, 
        lat: cityLat, lon: cityLon, hours: cityHours, extension: cityExt, active: true 
      }); 
      setCityName(''); setCityAddr(''); setCityLat(''); setCityLon(''); setCityHours(''); setCityExt(''); setSelCluster('');
      fetchData(); 
      if(setNotification) setNotification({ type: 'success', message: 'Loja cadastrada com sucesso!' });
    } catch (e) { if(setNotification) setNotification({ type: 'error', message: e.message }); }
  };

  // --- EDITAR ---
  const openEdit = (type, item) => {
    setEditingType(type);
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const collectionName = editingType === 'channel' ? 'sales_channels' : editingType === 'cluster' ? 'clusters' : 'cities';
      await updateDoc(doc(db, collectionName, editingId), editData);
      setEditingId(null); setEditingType(null);
      if(setNotification) setNotification({ type: 'success', message: 'Dados atualizados com sucesso!' });
      fetchData(); 
    } catch (e) { 
      if(setNotification) setNotification({ type: 'error', message: 'Erro ao salvar: ' + e.message });
    }
  };

  // --- EXCLUIR ---
  const handleDelete = async (collectionName, id) => {
    if (collectionName === 'sales_channels') {
      const hasClusters = clusters.some(c => c.channelId === id);
      if (hasClusters) return alert("⚠️ BLOQUEADO: Existem Regionais vinculadas a este Canal de Venda. Mova ou exclua as Regionais primeiro.");
    }
    if (collectionName === 'clusters') {
      const hasCities = cities.some(c => c.clusterId === id);
      if (hasCities) return alert("⚠️ BLOQUEADO: Existem Cidades vinculadas a esta Regional. Mova ou exclua as Cidades primeiro.");
    }

    if(window.confirm("Pretende realmente excluir este item da estrutura?")) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        fetchData(); 
        if(setNotification) setNotification({ type: 'success', message: 'Registro excluído!' });
      } catch (e) { if(setNotification) setNotification({ type: 'error', message: e.message }); }
    }
  };

  return (
    <div style={{...global.container, maxWidth: '1400px'}}>
      
      {/* CABEÇALHO */}
      <div style={global.header}>
        <div style={{...global.iconHeader, background: '#4f46e5'}}><Network size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Hierarquia e Estrutura</h1>
          <p style={global.subtitle}>Gestão de Canais ➔ Regionais ➔ Lojas Físicas.</p>
        </div>
      </div>

      {/* SISTEMA DE ABAS */}
      <div style={styles.tabsContainer}>
        <button onClick={() => setActiveTab('canais')} style={activeTab === 'canais' ? {...styles.activeTab, color: '#f59e0b', borderBottomColor: '#f59e0b'} : styles.tab}>
          <Users size={16} style={{marginRight: '6px'}} /> 1. Canais de Venda
        </button>
        <button onClick={() => setActiveTab('clusters')} style={activeTab === 'clusters' ? {...styles.activeTab, color: '#4f46e5', borderBottomColor: '#4f46e5'} : styles.tab}>
          <Globe size={16} style={{marginRight: '6px'}} /> 2. Regionais (Clusters)
        </button>
        <button onClick={() => setActiveTab('cidades')} style={activeTab === 'cidades' ? {...styles.activeTab, color: '#10b981', borderBottomColor: '#10b981'} : styles.tab}>
          <Building2 size={16} style={{marginRight: '6px'}} /> 3. Lojas / Cidades
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="animated-view" style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'start' }}>
        
        {/* ========================================== */}
        {/* ABA 1: CANAIS DE VENDA                     */}
        {/* ========================================== */}
        {activeTab === 'canais' && (
          <>
            <div style={{flex: 1, minWidth: '300px', maxWidth: '400px'}}>
              <div style={global.card}>
                <h3 style={{ ...global.sectionTitle, color: '#f59e0b' }}><Users size={20}/> Novo Canal Matriz</h3>
                <form onSubmit={addChannel} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={global.field}>
                      <label style={global.label}>Nome do Canal</label>
                      <input style={global.input} placeholder="Ex: Lojas Físicas, PAP, B2B..." value={channelName} onChange={e=>setChannelName(e.target.value)} required />
                    </div>
                    <button style={{ ...global.btnPrimary, backgroundColor: '#f59e0b' }}>Salvar Canal</button>
                </form>
              </div>
            </div>
            
            <div style={{flex: 2, minWidth: '350px'}}>
              {loading ? <p style={{color: 'var(--text-muted)'}}>Carregando canais...</p> : channels.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Nenhum canal cadastrado.</p> : (
                <div style={styles.gridCards}>
                  {channels.map(ch => (
                    <div key={ch.id} style={styles.dataCard}>
                      <div style={styles.cardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{...styles.iconBox, background: 'rgba(245, 158, 11, 0.1)'}}>
                            <Users size={22} color="#f59e0b" />
                          </div>
                          <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>{ch.name}</h4>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => openEdit('channel', ch)} style={styles.actionBtn} title="Editar"><Edit size={16} color="var(--text-brand)"/></button>
                          <button onClick={() => handleDelete('sales_channels', ch.id)} style={styles.actionBtn} title="Excluir"><Trash2 size={16} color="#ef4444"/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================== */}
        {/* ABA 2: CLUSTERS                            */}
        {/* ========================================== */}
        {activeTab === 'clusters' && (
          <>
            <div style={{flex: 1, minWidth: '300px', maxWidth: '400px'}}>
              <div style={global.card}>
                <h3 style={{ ...global.sectionTitle, color: '#4f46e5' }}><Globe size={20}/> Nova Regional</h3>
                <form onSubmit={addCluster} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={global.field}>
                      <label style={global.label}>Nome da Regional</label>
                      <input style={global.input} placeholder="Ex: Cluster Bady" value={clusterName} onChange={e=>setClusterName(e.target.value)} required />
                    </div>
                    <div style={global.field}>
                      <label style={global.label}>Vincular a qual Canal Pai?</label>
                      <select style={global.select} value={selChannel} onChange={e=>setSelChannel(e.target.value)} required>
                          <option value="">Selecione o Canal...</option>
                          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <span style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px'}}>As Regionais normalmente pertencem ao canal "Lojas Físicas".</span>
                    </div>
                    <button style={{ ...global.btnPrimary, backgroundColor: '#4f46e5' }}>Salvar Regional</button>
                </form>
              </div>
            </div>

            <div style={{flex: 2, minWidth: '350px'}}>
              {loading ? <p style={{color: 'var(--text-muted)'}}>Carregando regionais...</p> : clusters.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Nenhuma regional cadastrada.</p> : (
                <div style={styles.gridCards}>
                  {clusters.map(cl => {
                    const parentChannel = channels.find(ch => ch.id === cl.channelId);
                    return (
                      <div key={cl.id} style={styles.dataCard}>
                        <div style={styles.cardHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{...styles.iconBox, background: 'rgba(79, 70, 229, 0.1)'}}>
                              <Globe size={22} color="#4f46e5" />
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-main)' }}>{cl.name}</h4>
                              <span style={{...styles.badge, background: '#fef3c7', color: '#d97706'}}>
                                Canal Pai: {parentChannel ? parentChannel.name : '⚠️ Nenhum'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => openEdit('cluster', cl)} style={styles.actionBtn} title="Editar"><Edit size={16} color="var(--text-brand)"/></button>
                            <button onClick={() => handleDelete('clusters', cl.id)} style={styles.actionBtn} title="Excluir"><Trash2 size={16} color="#ef4444"/></button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================== */}
        {/* ABA 3: CIDADES / LOJAS                     */}
        {/* ========================================== */}
        {activeTab === 'cidades' && (
          <>
            <div style={{flex: 1, minWidth: '300px', maxWidth: '400px'}}>
              <div style={global.card}>
                  <h3 style={{ ...global.sectionTitle, color: '#10b981' }}><MapPin size={20} /> Nova Loja / Cidade</h3>
                  <form onSubmit={addCity} style={global.form}>
                      <input style={global.input} placeholder="Nome da Cidade" value={cityName} onChange={e=>setCityName(e.target.value)} required />
                      
                      <select style={global.select} value={selCluster} onChange={e=>setSelCluster(e.target.value)} required>
                          <option value="">Vincular a qual Regional?</option>
                          {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>

                      <div style={{display:'flex', gap:'10px'}}>
                        <div style={{flex: 1, display:'flex', alignItems:'center', gap:'8px', background:'var(--bg-app)', padding:'0 12px', border:'1px solid var(--border)', borderRadius:'10px'}}>
                          <Navigation size={14} color="var(--text-muted)" />
                          <input style={{border:'none', background:'transparent', outline:'none', fontSize:'13px', padding:'12px 0', width:'100%', color: 'var(--text-main)'}} placeholder="Latitude" value={cityLat} onChange={e=>setCityLat(e.target.value)} />
                        </div>
                        <div style={{flex: 1, display:'flex', alignItems:'center', gap:'8px', background:'var(--bg-app)', padding:'0 12px', border:'1px solid var(--border)', borderRadius:'10px'}}>
                          <Navigation size={14} color="var(--text-muted)" />
                          <input style={{border:'none', background:'transparent', outline:'none', fontSize:'13px', padding:'12px 0', width:'100%', color: 'var(--text-main)'}} placeholder="Longitude" value={cityLon} onChange={e=>setCityLon(e.target.value)} />
                        </div>
                      </div>

                      <input style={global.input} placeholder="Endereço Completo" value={cityAddr} onChange={e=>setCityAddr(e.target.value)} />
                      
                      <div style={{display:'flex', gap:'10px'}}>
                        <div style={{flex: 1, display:'flex', alignItems:'center', gap:'8px', background:'var(--bg-app)', padding:'0 12px', border:'1px solid var(--border)', borderRadius:'10px'}}>
                          <Clock size={14} color="var(--text-muted)" />
                          <input style={{border:'none', background:'transparent', outline:'none', fontSize:'13px', padding:'12px 0', width:'100%', color: 'var(--text-main)'}} placeholder="08:00 - 18:00" value={cityHours} onChange={e=>setCityHours(e.target.value)} />
                        </div>
                        <div style={{flex: 1, display:'flex', alignItems:'center', gap:'8px', background:'var(--bg-app)', padding:'0 12px', border:'1px solid var(--border)', borderRadius:'10px'}}>
                          <Phone size={14} color="var(--text-muted)" />
                          <input style={{border:'none', background:'transparent', outline:'none', fontSize:'13px', padding:'12px 0', width:'100%', color: 'var(--text-main)'}} placeholder="Ramal" value={cityExt} onChange={e=>setCityExt(e.target.value)} />
                        </div>
                      </div>

                      <button style={{ ...global.btnPrimary, backgroundColor: '#10b981', marginTop: '10px' }}>Salvar Cidade</button>
                  </form>
              </div>
            </div>

            <div style={{flex: 2, minWidth: '350px'}}>
              {loading ? <p style={{color: 'var(--text-muted)'}}>Carregando lojas...</p> : cities.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Nenhuma loja cadastrada.</p> : (
                <div style={styles.gridCards}>
                  {cities.map(c => {
                    const parentCluster = clusters.find(cl => cl.id === c.clusterId);
                    return (
                      <div key={c.id} style={{...styles.dataCard, opacity: c.active === false ? 0.6 : 1}}>
                        <div style={styles.cardHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{...styles.iconBox, background: 'rgba(16, 185, 129, 0.1)'}}>
                              <Building2 size={22} color="#10b981" />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>{c.name}</h4>
                                {c.active === false && <span style={{fontSize: '9px', background: 'var(--bg-danger-light)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>INATIVA</span>}
                              </div>
                              <span style={{...styles.badge, background: '#e0e7ff', color: '#4f46e5'}}>
                                Regional: {parentCluster ? parentCluster.name : '⚠️ Nenhuma'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => openEdit('city', c)} style={styles.actionBtn} title="Editar"><Edit size={16} color="var(--text-brand)"/></button>
                            <button onClick={() => handleDelete('cities', c.id)} style={styles.actionBtn} title="Excluir"><Trash2 size={16} color="#ef4444"/></button>
                          </div>
                        </div>

                        {/* Informações Extras da Loja */}
                        <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {c.address && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><MapPin size={14}/> {c.address}</span>}
                          <div style={{ display: 'flex', gap: '15px' }}>
                            {c.hours && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Clock size={14}/> {c.hours}</span>}
                            {c.extension && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Phone size={14}/> Ramal: {c.extension}</span>}
                          </div>
                          {(c.lat || c.lon) && (
                            <span style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981'}}>
                              <Navigation size={14}/> Lat: {c.lat || '-'} | Lon: {c.lon || '-'}
                            </span>
                          )}
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* ========================================== */}
      {/* MODAL UNIVERSAL DE EDIÇÃO                  */}
      {/* ========================================== */}
      {editingId && (
        <div style={global.modalOverlay}>
            <div style={{...global.modalBox, maxWidth: '550px'}}>
                <div style={global.modalHeader}>
                  <h3 style={global.modalTitle}>
                    {editingType === 'channel' ? 'Editar Canal de Venda' : editingType === 'cluster' ? 'Editar Regional' : 'Editar Loja'}
                  </h3>
                  <button onClick={() => {setEditingId(null); setEditingType(null);}} style={global.closeBtn}><X size={24}/></button>
                </div>

                <form onSubmit={handleSaveEdit} style={global.form}>
                    
                    <div style={global.field}>
                      <label style={global.label}>Nome</label>
                      <input style={global.input} value={editData.name || ''} onChange={e=>setEditData({...editData, name: e.target.value})} required />
                    </div>

                    {editingType === 'cluster' && (
                      <div style={global.field}>
                        <label style={global.label}>Canal de Venda Vinculado</label>
                        <select style={global.select} value={editData.channelId || ''} onChange={e=>setEditData({...editData, channelId: e.target.value})} required>
                          <option value="">Selecione...</option>
                          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}

                    {editingType === 'city' && (
                      <>
                        <div style={global.field}>
                          <label style={global.label}>Regional Vinculada</label>
                          <select style={global.select} value={editData.clusterId || ''} onChange={e=>setEditData({...editData, clusterId: e.target.value})} required>
                            {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div style={global.field}>
                          <label style={global.label}>Endereço Completo</label>
                          <input style={global.input} value={editData.address || ''} onChange={e=>setEditData({...editData, address: e.target.value})} />
                        </div>
                        <div style={global.row}>
                          <div style={global.field}>
                              <label style={global.label}>Horário</label>
                              <input style={global.input} value={editData.hours || ''} onChange={e=>setEditData({...editData, hours: e.target.value})} />
                          </div>
                          <div style={global.field}>
                              <label style={global.label}>Ramal</label>
                              <input style={global.input} value={editData.extension || ''} onChange={e=>setEditData({...editData, extension: e.target.value})} />
                          </div>
                        </div>
                        <div style={global.row}>
                          <div style={global.field}>
                              <label style={global.label}>Latitude</label>
                              <input style={global.input} value={editData.lat || ''} onChange={e=>setEditData({...editData, lat: e.target.value})} />
                          </div>
                          <div style={global.field}>
                              <label style={global.label}>Longitude</label>
                              <input style={global.input} value={editData.lon || ''} onChange={e=>setEditData({...editData, lon: e.target.value})} />
                          </div>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border)'}}>
                          <input type="checkbox" checked={editData.active !== false} onChange={e => setEditData({...editData, active: e.target.checked})} style={{width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer'}} />
                          <span style={{fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)'}}>Loja Ativa na Rede</span>
                        </div>
                      </>
                    )}

                    <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                      <button type="button" onClick={() => {setEditingId(null); setEditingType(null);}} style={{...global.btnSecondary, flex: 1}}>Cancelar</button>
                      <button type="submit" style={{...global.btnPrimary, background: '#10b981', flex: 2}}>Salvar Alterações</button>
                    </div>
                </form>
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

const styles = {
  tabsContainer: { display: 'flex', gap: '20px', borderBottom: '2px solid var(--border)', marginBottom: '25px', overflowX: 'auto' },
  tab: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '12px 5px', fontSize: '15px', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', marginBottom: '-2px' },
  activeTab: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', borderBottom: '3px solid', padding: '12px 5px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', marginBottom: '-2px' },
  
  // Estilos dos Cards
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', width: '100%' },
  dataCard: { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', transition: '0.2s', boxShadow: 'var(--shadow-sm)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBox: { padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionBtn: { border: 'none', background: 'var(--bg-app)', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }
};