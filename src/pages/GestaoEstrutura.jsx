import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { 
  Globe, Plus, X, MapPin, Store, Trash2, Edit, Navigation
} from 'lucide-react';

export default function GestaoEstrutura({ clusters, cities, refresh, onDelete, setNotification }) {
  const [cName, setCName] = useState('');
  const [cityName, setCityName] = useState('');
  const [cityAddr, setCityAddr] = useState('');
  const [cityLat, setCityLat] = useState(''); // <--- NOVO
  const [cityLon, setCityLon] = useState(''); // <--- NOVO
  const [cityHours, setCityHours] = useState('');
  const [cityExt, setCityExt] = useState('');
  const [selCluster, setSelCluster] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^\w\-]+/g, '');

  const addClu = async (e) => { 
    e.preventDefault(); 
    try {
      await setDoc(doc(db, "clusters", slug(cName)), { name: cName }); 
      setCName(''); 
      refresh();
      setNotification({ type: 'success', message: 'Regional criada com sucesso!' });
    } catch (e) { setNotification({ type: 'error', message: e.message }); }
  };

  const addCit = async (e) => { 
    e.preventDefault(); 
    try {
      await setDoc(doc(db, "cities", slug(cityName)), { 
        name: cityName, 
        clusterId: selCluster, 
        address: cityAddr, 
        lat: cityLat, // <--- NOVO
        lon: cityLon, // <--- NOVO
        hours: cityHours, 
        extension: cityExt, 
        active: true 
      }); 
      setCityName(''); setCityAddr(''); setCityLat(''); setCityLon(''); setCityHours(''); setCityExt('');
      refresh();
      setNotification({ type: 'success', message: 'Loja cadastrada com sucesso!' });
    } catch (e) { setNotification({ type: 'error', message: e.message }); }
  };

  const handleSaveEdit = async () => {
    try {
      await updateDoc(doc(db, "cities", editingId), {
        address: editData.address, 
        lat: editData.lat || '', // <--- NOVO
        lon: editData.lon || '', // <--- NOVO
        hours: editData.hours, 
        extension: editData.extension, 
        clusterId: editData.clusterId
      });
      setEditingId(null);
      setNotification({ type: 'success', message: 'Loja atualizada!' });
      refresh();
    } catch (e) { 
      setNotification({ type: 'error', message: 'Erro ao salvar.' });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.splitLayout}>
        <div style={{flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '30px'}}>
            <div style={styles.card}>
                <h3 style={{ ...styles.cardTitle, color: '#4f46e5' }}><Globe size={20}/> Regionais</h3>
                <form onSubmit={addClu} style={{ display: 'flex', gap: '8px' }}>
                    <input style={styles.input} placeholder="Ex: Regional Norte" value={cName} onChange={e=>setCName(e.target.value)} required />
                    <button style={{ ...styles.primaryBtn, width: 'auto', padding: '0 20px', backgroundColor: '#4f46e5' }}><Plus size={20}/></button>
                </form>
            </div>

            <div style={styles.card}>
                <h3 style={{ ...styles.cardTitle, color: '#059669' }}><MapPin size={20} /> Nova Loja / Cidade</h3>
                <form onSubmit={addCit} style={styles.formStack}>
                    <input style={styles.input} placeholder="Nome da Cidade" value={cityName} onChange={e=>setCityName(e.target.value)} required />
                    
                    <div style={{display:'flex', gap:'10px'}}>
                      <div style={styles.inputWithIcon}>
                        <Navigation size={14} color="#94a3b8" />
                        <input style={styles.inputClean} placeholder="Latitude" value={cityLat} onChange={e=>setCityLat(e.target.value)} />
                      </div>
                      <div style={styles.inputWithIcon}>
                        <Navigation size={14} color="#94a3b8" />
                        <input style={styles.inputClean} placeholder="Longitude" value={cityLon} onChange={e=>setCityLon(e.target.value)} />
                      </div>
                    </div>
                    <p style={{fontSize:'10px', color:'#94a3b8', marginTop:'-10px'}}>* Coordenadas necessárias para o Geomarketing do HubOquei.</p>

                    <input style={styles.input} placeholder="Endereço Completo" value={cityAddr} onChange={e=>setCityAddr(e.target.value)} required />
                    <select style={styles.select} value={selCluster} onChange={e=>setSelCluster(e.target.value)} required>
                        <option value="">Vincular a Regional...</option>
                        {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button style={{ ...styles.primaryBtn, backgroundColor: '#059669' }}>Salvar Cidade</button>
                </form>
            </div>
        </div>

        <div style={{flex: 1.5, minWidth: '350px'}}>
            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.tableHeaderRow}>
                            <th style={styles.th}>Loja / Geolocalização</th>
                            <th style={styles.th}>Regional</th>
                            <th style={{...styles.th, textAlign:'right'}}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cities.map(c => (
                            <tr key={c.id} style={styles.tableRow}>
                                <td style={styles.td}>
                                    <strong>{c.name}</strong>
                                    <div style={{fontSize:'11px', color: c.lat ? '#10b981' : '#ef4444', fontWeight:'bold'}}>
                                      {c.lat ? `Lat: ${c.lat} | Lon: ${c.lon}` : '⚠️ Sem Coordenadas'}
                                    </div>
                                </td>
                                <td style={styles.td}><span style={styles.badgeBlue}>{c.clusterId}</span></td>
                                <td style={{...styles.td, textAlign:'right'}}>
                                    <button onClick={() => { setEditingId(c.id); setEditData(c); }} style={styles.btnIcon}><Edit size={14}/></button>
                                    <button onClick={() => onDelete('cities', c.id)} style={styles.btnIcon}><Trash2 size={14}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {editingId && (
            <div style={styles.modalOverlay}>
                <div style={styles.modalBox}>
                    <h3 style={{fontWeight:'bold', marginBottom:'15px'}}>Editar Loja</h3>
                    <div style={styles.formStack}>
                        <div style={{display:'flex', gap:'10px'}}>
                            <input style={styles.input} placeholder="Latitude" value={editData.lat} onChange={e=>setEditData({...editData, lat: e.target.value})} />
                            <input style={styles.input} placeholder="Longitude" value={editData.lon} onChange={e=>setEditData({...editData, lon: e.target.value})} />
                        </div>
                        <input style={styles.input} value={editData.address} onChange={e=>setEditData({...editData, address: e.target.value})} />
                        <button onClick={handleSaveEdit} style={{...styles.primaryBtn, backgroundColor:'#059669'}}>Salvar Alterações</button>
                        <button onClick={() => setEditingId(null)} style={styles.btnSecondary}>Cancelar</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { width: '100%' },
  splitLayout: { display: 'flex', gap: '32px', flexWrap: 'wrap' },
  card: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' },
  formStack: { display: 'flex', flexDirection: 'column', gap: '16px' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
  inputWithIcon: { flex: 1, display:'flex', alignItems:'center', gap:'8px', background:'#f8fafc', padding:'0 12px', border:'1px solid #e2e8f0', borderRadius:'10px' },
  inputClean: { border:'none', background:'transparent', outline:'none', fontSize:'13px', padding:'12px 0', width:'100%' },
  select: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', width: '100%', background: 'white' },
  primaryBtn: { padding: '12px', borderRadius: '10px', border: 'none', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', width: '100%' },
  btnSecondary: { backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
  tableCard: { backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '15px 20px', fontWeight: '800', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', fontSize: '11px' },
  td: { padding: '15px 20px', verticalAlign: 'middle' },
  tableRow: { borderBottom: '1px solid #f1f5f9' },
  badgeBlue: { backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' },
  btnIcon: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '5px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' },
  modalBox: { backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' }
};