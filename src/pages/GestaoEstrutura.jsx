import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  Globe, Plus, X, MapPin, Trash2, Edit, Navigation, Phone, Clock, Network, Users, Building2
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

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
      
      {/* CABEÇALHO PADRÃO OQUEI STRATEGY */}
      <div style={local.headerWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...local.iconBox, background: `linear-gradient(135deg, ${colors.primary}, #9333ea)`, boxShadow: `0 8px 20px ${colors.primary}40` }}>
            <Network size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerTitle}>Hierarquia e Estrutura</div>
            <div style={local.headerSubtitle}>
              Gestão de Canais ➔ Regionais ➔ Lojas Físicas · {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* SISTEMA DE ABAS (PILLS) */}
      <div style={local.navBar}>
        <button 
          onClick={() => setActiveTab('canais')} 
          style={activeTab === 'canais' ? { ...local.navBtnActive, color: colors.warning, borderColor: colors.warning } : local.navBtn}
        >
          <Users size={16} /> 1. Canais de Venda
        </button>
        <button 
          onClick={() => setActiveTab('clusters')} 
          style={activeTab === 'clusters' ? { ...local.navBtnActive, color: '#9333ea', borderColor: '#9333ea' } : local.navBtn}
        >
          <Globe size={16} /> 2. Regionais (Clusters)
        </button>
        <button 
          onClick={() => setActiveTab('cidades')} 
          style={activeTab === 'cidades' ? { ...local.navBtnActive, color: colors.success, borderColor: colors.success } : local.navBtn}
        >
          <Building2 size={16} /> 3. Lojas / Cidades
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
              <div style={{...global.card, padding: '25px'}}>
                <h3 style={{ ...global.sectionTitle, color: colors.warning, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20}/> Novo Canal Matriz
                </h3>
                <form onSubmit={addChannel} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={global.field}>
                      <label style={global.label}>Nome do Canal</label>
                      <input style={global.input} placeholder="Ex: Lojas Físicas, PAP, B2B..." value={channelName} onChange={e=>setChannelName(e.target.value)} required />
                    </div>
                    <button style={{ ...global.btnPrimary, backgroundColor: colors.warning, height: '48px', fontWeight: '900' }}>Salvar Canal</button>
                </form>
              </div>
            </div>
            
            <div style={{flex: 2, minWidth: '350px'}}>
              {loading ? <p style={{color: 'var(--text-muted)'}}>Carregando canais...</p> : channels.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Nenhum canal cadastrado.</p> : (
                <div style={local.gridCards}>
                  {channels.map(ch => (
                    <div key={ch.id} style={local.dataCard}>
                      <div style={local.cardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{...local.cardIconBox, background: 'rgba(245, 158, 11, 0.1)'}}>
                            <Users size={22} color={colors.warning} />
                          </div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{ch.name}</h4>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openEdit('channel', ch)} style={local.actionBtn} title="Editar"><Edit size={16}/></button>
                          <button onClick={() => handleDelete('sales_channels', ch.id)} style={{...local.actionBtn, color: colors.danger}} title="Excluir"><Trash2 size={16}/></button>
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
              <div style={{...global.card, padding: '25px'}}>
                <h3 style={{ ...global.sectionTitle, color: '#9333ea', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={20}/> Nova Regional
                </h3>
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
                    <button style={{ ...global.btnPrimary, backgroundColor: '#9333ea', height: '48px', fontWeight: '900' }}>Salvar Regional</button>
                </form>
              </div>
            </div>

            <div style={{flex: 2, minWidth: '350px'}}>
              {loading ? <p style={{color: 'var(--text-muted)'}}>Carregando regionais...</p> : clusters.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Nenhuma regional cadastrada.</p> : (
                <div style={local.gridCards}>
                  {clusters.map(cl => {
                    const parentChannel = channels.find(ch => ch.id === cl.channelId);
                    return (
                      <div key={cl.id} style={local.dataCard}>
                        <div style={local.cardHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{...local.cardIconBox, background: 'rgba(147, 51, 234, 0.1)'}}>
                              <Globe size={22} color="#9333ea" />
                            </div>
                            <div>
                              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{cl.name}</h4>
                              <span style={{...local.badge, background: '#fef3c7', color: '#d97706'}}>
                                Canal Pai: {parentChannel ? parentChannel.name : '⚠️ Nenhum'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => openEdit('cluster', cl)} style={local.actionBtn} title="Editar"><Edit size={16}/></button>
                            <button onClick={() => handleDelete('clusters', cl.id)} style={{...local.actionBtn, color: colors.danger}} title="Excluir"><Trash2 size={16}/></button>
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
              <div style={{...global.card, padding: '25px'}}>
                  <h3 style={{ ...global.sectionTitle, color: colors.success, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={20} /> Nova Loja / Cidade
                  </h3>
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

                      <button style={{ ...global.btnPrimary, backgroundColor: colors.success, marginTop: '10px', height: '48px', fontWeight: '900' }}>Salvar Cidade</button>
                  </form>
              </div>
            </div>

            <div style={{flex: 2, minWidth: '350px'}}>
              {loading ? <p style={{color: 'var(--text-muted)'}}>Carregando lojas...</p> : cities.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Nenhuma loja cadastrada.</p> : (
                <div style={local.gridCards}>
                  {cities.map(c => {
                    const parentCluster = clusters.find(cl => cl.id === c.clusterId);
                    return (
                      <div key={c.id} style={{...local.dataCard, opacity: c.active === false ? 0.6 : 1}}>
                        <div style={local.cardHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{...local.cardIconBox, background: 'rgba(16, 185, 129, 0.1)'}}>
                              <Building2 size={22} color={colors.success} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>{c.name}</h4>
                                {c.active === false && <span style={{fontSize: '9px', background: 'var(--bg-danger-light)', color: colors.danger, padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold'}}>INATIVA</span>}
                              </div>
                              <span style={{...local.badge, background: '#f3e8ff', color: '#9333ea'}}>
                                Regional: {parentCluster ? parentCluster.name : '⚠️ Nenhuma'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => openEdit('city', c)} style={local.actionBtn} title="Editar"><Edit size={16}/></button>
                            <button onClick={() => handleDelete('cities', c.id)} style={{...local.actionBtn, color: colors.danger}} title="Excluir"><Trash2 size={16}/></button>
                          </div>
                        </div>

                        {/* Informações Extras da Loja */}
                        <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {c.address && <span style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)'}}><MapPin size={14} color={colors.primary}/> {c.address}</span>}
                          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            {c.hours && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Clock size={14}/> {c.hours}</span>}
                            {c.extension && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Phone size={14}/> Ramal: {c.extension}</span>}
                          </div>
                          {(c.lat || c.lon) && (
                            <span style={{display: 'flex', alignItems: 'center', gap: '6px', color: colors.success, fontWeight: '600'}}>
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
            <div style={{...global.modalBox, maxWidth: '550px', borderRadius: '24px'}}>
                <div style={global.modalHeader}>
                  <h3 style={{...global.modalTitle, fontWeight: '900'}}>
                    {editingType === 'channel' ? 'Editar Canal de Venda' : editingType === 'cluster' ? 'Editar Regional' : 'Editar Loja'}
                  </h3>
                  <button onClick={() => {setEditingId(null); setEditingType(null);}} style={global.closeBtn}><X size={24}/></button>
                </div>

                <form onSubmit={handleSaveEdit} style={{...global.form, padding: '10px 0'}}>
                    
                    <div style={global.field}>
                      <label style={local.label}>Nome</label>
                      <input style={global.input} value={editData.name || ''} onChange={e=>setEditData({...editData, name: e.target.value})} required />
                    </div>

                    {editingType === 'cluster' && (
                      <div style={global.field}>
                        <label style={local.label}>Canal de Venda Vinculado</label>
                        <select style={global.select} value={editData.channelId || ''} onChange={e=>setEditData({...editData, channelId: e.target.value})} required>
                          <option value="">Selecione...</option>
                          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}

                    {editingType === 'city' && (
                      <>
                        <div style={global.field}>
                          <label style={local.label}>Regional Vinculada</label>
                          <select style={global.select} value={editData.clusterId || ''} onChange={e=>setEditData({...editData, clusterId: e.target.value})} required>
                            {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div style={global.field}>
                          <label style={local.label}>Endereço Completo</label>
                          <input style={global.input} value={editData.address || ''} onChange={e=>setEditData({...editData, address: e.target.value})} />
                        </div>
                        <div style={global.row}>
                          <div style={global.field}>
                              <label style={local.label}>Horário</label>
                              <input style={global.input} value={editData.hours || ''} onChange={e=>setEditData({...editData, hours: e.target.value})} />
                          </div>
                          <div style={global.field}>
                              <label style={local.label}>Ramal</label>
                              <input style={global.input} value={editData.extension || ''} onChange={e=>setEditData({...editData, extension: e.target.value})} />
                          </div>
                        </div>
                        <div style={global.row}>
                          <div style={global.field}>
                              <label style={local.label}>Latitude</label>
                              <input style={global.input} value={editData.lat || ''} onChange={e=>setEditData({...editData, lat: e.target.value})} />
                          </div>
                          <div style={global.field}>
                              <label style={local.label}>Longitude</label>
                              <input style={global.input} value={editData.lon || ''} onChange={e=>setEditData({...editData, lon: e.target.value})} />
                          </div>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)'}}>
                          <input type="checkbox" checked={editData.active !== false} onChange={e => setEditData({...editData, active: e.target.checked})} style={{width: '18px', height: '18px', accentColor: colors.success, cursor: 'pointer'}} />
                          <span style={{fontSize: '14px', fontWeight: '800', color: 'var(--text-main)'}}>Loja Ativa na Rede</span>
                        </div>
                      </>
                    )}

                    <div style={{display: 'flex', gap: '15px', marginTop: '15px'}}>
                      <button type="button" onClick={() => {setEditingId(null); setEditingType(null);}} style={{...global.btnSecondary, flex: 1, borderRadius: '12px'}}>Cancelar</button>
                      <button type="submit" style={{...global.btnPrimary, background: colors.success, flex: 2, borderRadius: '12px', fontWeight: '900'}}>Salvar Alterações</button>
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

// --- ESTILOS LOCAIS PADRONIZADOS OQUEI STRATEGY ---
const local = {
  headerWrapper: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
    border: '1px solid var(--border)', borderRadius: '24px',
    padding: '24px 32px', marginBottom: '20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '20px', boxShadow: 'var(--shadow-sm)',
  },
  iconBox: {
    width: '56px', height: '56px', borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  headerSubtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },

  navBar: { display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '8px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: '30px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '800', transition: '0.2s', background: 'transparent', color: 'var(--text-muted)' },
  navBtnActive: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', transition: '0.2s', background: 'var(--bg-panel)', boxShadow: 'var(--shadow-sm)' },

  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', width: '100%' },
  dataCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: 'var(--shadow-sm)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIconBox: { padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  actionBtn: { border: '1px solid var(--border)', background: 'var(--bg-app)', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', color: 'var(--text-muted)' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '900' },
  label: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }
};