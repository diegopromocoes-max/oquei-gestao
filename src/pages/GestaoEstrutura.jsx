import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  Globe, Plus, X, MapPin, Store, Trash2, Edit, Navigation, Phone, Clock, Network
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

export default function GestaoEstrutura({ setNotification }) {
  // --- ESTADOS DE DADOS (AUTÓNOMOS) ---
  const [clusters, setClusters] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cName, setCName] = useState('');
  
  // Estados para Nova Loja
  const [cityName, setCityName] = useState('');
  const [cityAddr, setCityAddr] = useState('');
  const [cityLat, setCityLat] = useState(''); 
  const [cityLon, setCityLon] = useState(''); 
  const [cityHours, setCityHours] = useState('');
  const [cityExt, setCityExt] = useState('');
  const [selCluster, setSelCluster] = useState('');
  
  // Estados para Edição
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // --- BUSCA DE DADOS NO FIREBASE ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const snapC = await getDocs(collection(db, "clusters"));
      setClusters(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const snapCit = await getDocs(collection(db, "cities"));
      setCities(snapCit.docs.map(d => ({ id: d.id, ...d.data() })));
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

  // --- HANDLERS COM REFRESH AUTOMÁTICO ---
  const addClu = async (e) => { 
    e.preventDefault(); 
    try {
      await setDoc(doc(db, "clusters", slug(cName)), { name: cName }); 
      setCName(''); 
      fetchData(); // Busca os dados atualizados
      if(setNotification) setNotification({ type: 'success', message: 'Regional criada com sucesso!' });
    } catch (e) { 
      if(setNotification) setNotification({ type: 'error', message: e.message }); 
    }
  };

  const addCit = async (e) => { 
    e.preventDefault(); 
    try {
      await setDoc(doc(db, "cities", slug(cityName)), { 
        name: cityName, 
        clusterId: selCluster, 
        address: cityAddr, 
        lat: cityLat, 
        lon: cityLon, 
        hours: cityHours, 
        extension: cityExt, 
        active: true 
      }); 
      setCityName(''); setCityAddr(''); setCityLat(''); setCityLon(''); setCityHours(''); setCityExt(''); setSelCluster('');
      fetchData(); // Busca os dados atualizados
      if(setNotification) setNotification({ type: 'success', message: 'Loja cadastrada com sucesso!' });
    } catch (e) { 
      if(setNotification) setNotification({ type: 'error', message: e.message }); 
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "cities", editingId), {
        name: editData.name,
        address: editData.address, 
        lat: editData.lat || '', 
        lon: editData.lon || '', 
        hours: editData.hours || '', 
        extension: editData.extension || '', 
        clusterId: editData.clusterId,
        active: editData.active
      });
      setEditingId(null);
      if(setNotification) setNotification({ type: 'success', message: 'Dados da loja atualizados!' });
      fetchData(); // Busca os dados atualizados
    } catch (e) { 
      if(setNotification) setNotification({ type: 'error', message: 'Erro ao salvar: ' + e.message });
    }
  };

  const handleDelete = async (collectionName, id) => {
    if(window.confirm("Pretende realmente excluir este item da estrutura?")) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        fetchData(); // Busca os dados atualizados
        if(setNotification) setNotification({ type: 'success', message: 'Registro excluído!' });
      } catch (e) { 
        if(setNotification) setNotification({ type: 'error', message: e.message }); 
      }
    }
  };

  const openEditModal = (c) => {
    setEditData({
      name: c.name || '',
      clusterId: c.clusterId || '',
      address: c.address || '',
      lat: c.lat || '',
      lon: c.lon || '',
      hours: c.hours || '',
      extension: c.extension || '',
      active: c.active !== false
    });
    setEditingId(c.id);
  };

  return (
    <div style={global.container}>
      
      {/* CABEÇALHO */}
      <div style={global.header}>
        <div style={{...global.iconHeader, background: '#4f46e5'}}><Network size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Estrutura de Lojas</h1>
          <p style={global.subtitle}>Gerencie as Regionais (Clusters), Endereços e Dados das Lojas.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'start' }}>
        
        {/* COLUNA ESQUERDA: FORMULÁRIOS DE CRIAÇÃO */}
        <div style={{flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '30px'}}>
            
            <div style={global.card}>
                <h3 style={{ ...global.sectionTitle, color: '#4f46e5' }}><Globe size={20}/> Adicionar Regional</h3>
                <form onSubmit={addClu} style={{ display: 'flex', gap: '8px' }}>
                    <input style={global.input} placeholder="Ex: Regional Norte" value={cName} onChange={e=>setCName(e.target.value)} required />
                    <button style={{ ...global.btnPrimary, width: 'auto', padding: '0 20px', backgroundColor: '#4f46e5' }}><Plus size={20}/></button>
                </form>
            </div>

            <div style={global.card}>
                <h3 style={{ ...global.sectionTitle, color: '#10b981' }}><MapPin size={20} /> Nova Loja / Cidade</h3>
                <form onSubmit={addCit} style={global.form}>
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
                    <p style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'-10px'}}>* Coordenadas necessárias para o Geomarketing.</p>

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

        {/* COLUNA DIREITA: TABELA DE ESTRUTURA */}
        <div style={{flex: 1.5, minWidth: '350px'}}>
            <div style={{...global.card, padding: 0, overflow: 'hidden'}}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '15px 20px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px' }}>Loja / Endereço</th>
                            <th style={{ padding: '15px 20px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px' }}>Regional</th>
                            <th style={{ padding: '15px 20px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px', textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                          <tr><td colSpan="3" style={{padding: '30px', textAlign: 'center', color: 'var(--text-muted)'}}>Atualizando banco de dados...</td></tr>
                        ) : cities.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', opacity: c.active === false ? 0.6 : 1 }}>
                                <td style={{ padding: '15px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                      <strong style={{ color: 'var(--text-main)', fontSize: '15px' }}>{c.name}</strong>
                                      {c.active === false && <span style={{fontSize: '9px', background: 'var(--bg-danger-light)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'}}>INATIVA</span>}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      {c.lat ? <span style={{color: '#10b981'}}>Lat: {c.lat} | Lon: {c.lon}</span> : <span style={{color: '#ef4444'}}>⚠️ Sem Coordenadas</span>}
                                    </div>
                                </td>
                                <td style={{ padding: '15px 20px' }}>
                                  <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', background: 'var(--bg-primary-light)', color: 'var(--text-brand)' }}>
                                    {c.clusterId || 'Sem Vínculo'}
                                  </span>
                                </td>
                                <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                    <button onClick={() => openEditModal(c)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-brand)', padding: '5px' }} title="Editar"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete('cities', c.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: '5px' }} title="Excluir"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {!loading && cities.length === 0 && (
                          <tr><td colSpan="3" style={{padding: '30px', textAlign: 'center', color: 'var(--text-muted)'}}>Nenhuma loja cadastrada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL DE EDIÇÃO AVANÇADA */}
        {editingId && (
            <div style={global.modalOverlay}>
                <div style={{...global.modalBox, maxWidth: '550px'}}>
                    <div style={global.modalHeader}>
                      <h3 style={global.modalTitle}>Editar Dados da Loja</h3>
                      <button onClick={() => setEditingId(null)} style={global.closeBtn}><X size={24}/></button>
                    </div>

                    <form onSubmit={handleSaveEdit} style={global.form}>
                        
                        <div style={global.row}>
                          <div style={global.field}>
                            <label style={global.label}>Nome da Loja</label>
                            <input style={global.input} value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} required />
                          </div>
                          <div style={global.field}>
                            <label style={global.label}>Regional Vinculada</label>
                            <select style={global.select} value={editData.clusterId} onChange={e=>setEditData({...editData, clusterId: e.target.value})} required>
                              {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>

                        <div style={global.field}>
                          <label style={global.label}>Endereço Completo</label>
                          <input style={global.input} placeholder="Rua, Número, Bairro, CEP..." value={editData.address} onChange={e=>setEditData({...editData, address: e.target.value})} />
                        </div>

                        <div style={global.row}>
                          <div style={global.field}>
                            <label style={global.label}>Horário de Funcionamento</label>
                            <input style={global.input} placeholder="Ex: 08:00 - 18:00" value={editData.hours} onChange={e=>setEditData({...editData, hours: e.target.value})} />
                          </div>
                          <div style={global.field}>
                            <label style={global.label}>Ramal Oquei</label>
                            <input style={global.input} placeholder="Ex: 1001" value={editData.extension} onChange={e=>setEditData({...editData, extension: e.target.value})} />
                          </div>
                        </div>

                        <div style={global.row}>
                          <div style={global.field}>
                              <label style={global.label}>Latitude</label>
                              <input style={global.input} placeholder="-20.8123" value={editData.lat} onChange={e=>setEditData({...editData, lat: e.target.value})} />
                          </div>
                          <div style={global.field}>
                              <label style={global.label}>Longitude</label>
                              <input style={global.input} placeholder="-49.3211" value={editData.lon} onChange={e=>setEditData({...editData, lon: e.target.value})} />
                          </div>
                        </div>

                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border)'}}>
                          <input type="checkbox" checked={editData.active} onChange={e => setEditData({...editData, active: e.target.checked})} style={{width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer'}} />
                          <div style={{display: 'flex', flexDirection: 'column'}}>
                            <span style={{fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)'}}>Loja Ativa na Rede</span>
                            <span style={{fontSize: '12px', color: 'var(--text-muted)'}}>Desmarque para inativar esta loja. Ela ficará oculta em alguns relatórios.</span>
                          </div>
                        </div>

                        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                          <button type="button" onClick={() => setEditingId(null)} style={{...global.btnSecondary, flex: 1}}>Cancelar</button>
                          <button type="submit" style={{...global.btnPrimary, background: '#10b981', flex: 2}}>Salvar Alterações</button>
                        </div>

                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}