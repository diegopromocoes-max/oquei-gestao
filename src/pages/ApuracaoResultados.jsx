import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Calendar, MapPin, Save, 
  TrendingDown, TrendingUp, 
  Activity, Clock, Plus, ChevronRight, CheckCircle,
  Edit2, Trash2, Check, X
} from 'lucide-react';

// Certifique-se de importar os novos estilos
import { colors, styles } from '../styles/globalStyles';

export default function ApuracaoResultados({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [cities, setCities] = useState([]);
  const [channels, setChannels] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [reasonTypes, setReasonTypes] = useState([]);
  const [newReasonName, setNewReasonName] = useState('');
  
  const [editingReasonId, setEditingReasonId] = useState(null);
  const [editReasonName, setEditReasonName] = useState('');

  const [selectedCity, setSelectedCity] = useState('');
  const [autoCRM, setAutoCRM] = useState(false);

  const [manualData, setManualData] = useState({
    vendas: {}, 
    cancelamentos: 0,
    cancelamentosMotivos: {} 
  });

  const [lastUpdate, setLastUpdate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  const dataDeHoje = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
  }).format(new Date());

  const fetchBaseData = async () => {
    try {
      const snapCities = await getDocs(collection(db, 'cities'));
      const ci = snapCities.docs.map(d => ({ id: d.id, ...d.data() }));
      ci.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCities(ci);
      
      const snapCh = await getDocs(collection(db, 'sales_channels'));
      setChannels(snapCh.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapPr = await getDocs(collection(db, 'product_categories'));
      setProducts(snapPr.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.temMeta !== false));

      const snapReasons = await getDocs(collection(db, 'churn_reasons'));
      setReasonTypes(snapReasons.docs.map(d => ({ id: d.id, ...d.data() })));

      if (ci.length > 0 && !selectedCity) setSelectedCity(ci[0].id);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchBaseData(); }, [userData]);

  useEffect(() => {
    if (!selectedMonth || !selectedCity) return;
    const fetchMonthData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'city_results', `${selectedMonth}_${selectedCity}`);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setManualData({
            vendas: data.vendas || {},
            cancelamentos: data.cancelamentos || 0,
            cancelamentosMotivos: data.cancelamentosMotivos || {}
          });
          setAutoCRM(data.autoCRM || false);
          setLastUpdate({ date: data.updatedAt, user: data.updatedBy });
        } else {
          setManualData({ vendas: {}, cancelamentos: 0, cancelamentosMotivos: {} });
          setAutoCRM(false);
          setLastUpdate(null);
        }
      } catch (error) { console.error(error); }
      setLoading(false);
    };
    fetchMonthData();
  }, [selectedMonth, selectedCity]);

  const handleVendasChange = (channelId, productId, value) => {
    setManualData(prev => ({
      ...prev,
      vendas: {
        ...prev.vendas,
        [channelId]: { ...(prev.vendas[channelId] || {}), [productId]: Number(value) }
      }
    }));
  };

  const handleReasonValueChange = (reasonId, value) => {
    const newVal = Number(value);
    setManualData(prev => {
      const novosMotivos = { ...prev.cancelamentosMotivos, [reasonId]: newVal };
      const novoTotal = Object.values(novosMotivos).reduce((a, b) => a + b, 0);
      return { ...prev, cancelamentosMotivos: novosMotivos, cancelamentos: novoTotal };
    });
  };

  const handleAddReasonType = async () => {
    if (!newReasonName.trim()) return;
    try {
      await addDoc(collection(db, 'churn_reasons'), { name: newReasonName.trim(), createdAt: serverTimestamp() });
      setNewReasonName('');
      fetchBaseData(); 
    } catch (err) { alert("Erro ao cadastrar motivo."); }
  };

  const startEditingReason = (reason) => {
    setEditingReasonId(reason.id);
    setEditReasonName(reason.name);
  };

  const saveEditedReason = async (reasonId) => {
    if (!editReasonName.trim()) return;
    try {
      await updateDoc(doc(db, 'churn_reasons', reasonId), { name: editReasonName.trim() });
      setEditingReasonId(null);
      fetchBaseData();
    } catch (err) { alert("Erro ao atualizar motivo."); }
  };

  const deleteReason = async (reasonId) => {
    if (!window.confirm("Atenção: Tem a certeza que deseja excluir este motivo? Ele será removido da lista para todas as unidades.")) return;
    try {
      await deleteDoc(doc(db, 'churn_reasons', reasonId));
      fetchBaseData();
    } catch (err) { alert("Erro ao excluir motivo."); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docId = `${selectedMonth}_${selectedCity}`;
      const timestamp = new Date().toISOString();
      const userName = userData?.name || 'Gestor';

      await setDoc(doc(db, 'city_results', docId), {
        ...manualData,
        cityId: selectedCity,
        month: selectedMonth,
        autoCRM: autoCRM,
        updatedAt: timestamp,
        updatedBy: userName
      });
      
      setLastUpdate({ date: timestamp, user: userName });
      
      setSuccessAnim(true);
      setTimeout(() => setSuccessAnim(false), 3000);
      
    } catch (error) {
      alert('Erro ao guardar os dados.');
    }
    setSaving(false);
  };

  const getChannelTotal = (channelId) => {
    const channelSales = manualData.vendas[channelId] || {};
    return Object.values(channelSales).reduce((a, b) => a + (Number(b) || 0), 0);
  };

  const getProductTotal = (productId) => {
    let total = 0;
    Object.values(manualData.vendas || {}).forEach(channel => {
      total += Number(channel[productId] || 0);
    });
    return total;
  };

  const getTotalGeral = () => {
    let total = 0;
    Object.values(manualData.vendas || {}).forEach(channel => {
      Object.values(channel).forEach(val => {
        total += Number(val) || 0;
      });
    });
    return total;
  };

  const currentCityName = cities.find(c => c.id === selectedCity)?.name || 'Carregando...';

  return (
    <div className="animated-view" style={styles.container}>
      
      {/* CABEÇALHO */}
      <div style={styles.headerContainer}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={styles.iconBox}>
            <Activity color="#3b82f6" size={28} />
          </div>
          <div>
            <h1 style={styles.pageTitle}>Apuração de Resultados</h1>
            <p style={styles.dateBadge}>
              <Calendar size={14} /> Hoje é {dataDeHoje}
            </p>
          </div>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.filterPill}>
            <Calendar size={16} color="#3b82f6" />
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={styles.filterInput} />
          </div>
          <div style={styles.filterPill}>
            <MapPin size={16} color="#3b82f6" />
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} style={styles.filterInput}>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingState}>Sincronizando dados da unidade...</div>
      ) : (
        <>
          {/* BANNER DA CIDADE */}
          <div style={styles.activeCityBanner}>
            <MapPin size={32} color="#3b82f6" />
            <div>
              <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Unidade Selecionada
              </span>
              <h2 style={styles.activeCityTitle}>{currentCityName}</h2>
            </div>
          </div>

          {/* NOVO LAYOUT: GRID EM PILHA (100% W) */}
          <div style={styles.dashboardGridFull}>
            
            {/* 1. MATRIZ DE VENDAS */}
            <div style={styles.mainCard}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}><TrendingUp color="#10b981" size={20} /> Matriz de Vendas Brutas</h2>
                <div style={{...styles.totalBadge, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)'}}>
                  TOTAL: {getTotalGeral()}
                </div>
              </div>
              
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Canais de Venda</th>
                      {products.map(p => <th key={p.id} style={{...styles.th, textAlign: 'center'}}>{p.name}</th>)}
                      <th style={{...styles.th, textAlign: 'right', color: 'var(--text-main)'}}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map(ch => {
                      const rowTotal = getChannelTotal(ch.id);
                      return (
                        <tr key={ch.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                              <ChevronRight size={14} color="var(--text-muted)" />
                              {ch.name}
                            </div>
                          </td>
                          {products.map(prod => (
                            <td key={prod.id} style={{...styles.td, textAlign: 'center'}}>
                              <input 
                                type="number" 
                                min="0"
                                value={manualData.vendas?.[ch.id]?.[prod.id] || ''} 
                                onChange={e => handleVendasChange(ch.id, prod.id, e.target.value)} 
                                style={styles.matrixInput} 
                                placeholder="0"
                              />
                            </td>
                          ))}
                          <td style={{...styles.td, textAlign: 'right', fontWeight: '900', fontSize: '16px', color: rowTotal > 0 ? '#10b981' : 'var(--text-muted)'}}>
                            {rowTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-app)', borderTop: '2px solid var(--border)' }}>
                      <td style={{...styles.td, fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '12px'}}>
                        Totalização
                      </td>
                      {products.map(prod => (
                        <td key={prod.id} style={{...styles.td, textAlign: 'center', fontWeight: '900', color: 'var(--text-main)'}}>
                          {getProductTotal(prod.id) || 0}
                        </td>
                      ))}
                      <td style={{...styles.td, textAlign: 'right', fontWeight: '900', fontSize: '18px', color: '#10b981'}}>
                        {getTotalGeral()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 2. CHURN COM GRID MULTICOLUNAS (Sem scroll) */}
            <div style={{...styles.mainCard, borderTop: '4px solid #ef4444'}}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}><TrendingDown color="#ef4444" size={20} /> Detalhamento de Evasão (Motivos)</h2>
                <div style={styles.totalBadge}>
                  TOTAL: {manualData.cancelamentos}
                </div>
              </div>

              {/* AQUI ESTÁ A MÁGICA: O novo Grid Responsivo */}
              <div style={styles.reasonsGridFull}>
                {reasonTypes.map(reason => {
                  const isEditing = editingReasonId === reason.id;

                  return (
                    <div key={reason.id} style={styles.reasonRow}>
                      {isEditing ? (
                        <div style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center' }}>
                          <input 
                            value={editReasonName}
                            onChange={e => setEditReasonName(e.target.value)}
                            style={{...styles.addReasonInput, padding: '6px 10px', margin: 0}}
                            autoFocus
                          />
                          <button onClick={() => saveEditedReason(reason.id)} style={{...styles.actionBtn, color: '#10b981'}}><Check size={16}/></button>
                          <button onClick={() => setEditingReasonId(null)} style={{...styles.actionBtn, color: '#ef4444'}}><X size={16}/></button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <div style={styles.reasonLabel}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                              {reason.name}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => startEditingReason(reason)} style={styles.actionBtn} title="Editar Motivo"><Edit2 size={12} /></button>
                              <button onClick={() => deleteReason(reason.id)} style={styles.actionBtn} title="Excluir Motivo"><Trash2 size={12} /></button>
                            </div>
                          </div>

                          <input 
                            type="number" min="0"
                            value={manualData.cancelamentosMotivos?.[reason.id] || ''}
                            onChange={e => handleReasonValueChange(reason.id, e.target.value)}
                            style={styles.reasonInput}
                            placeholder="0"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={styles.addReasonBox}>
                <input 
                  value={newReasonName} 
                  onChange={e => setNewReasonName(e.target.value)}
                  placeholder="Cadastrar novo motivo no sistema..." 
                  style={{...styles.addReasonInput, maxWidth: '400px'}}
                />
                <button onClick={handleAddReasonType} style={styles.addReasonBtn} title="Adicionar Motivo">
                  <Plus size={18} /> Cadastrar Motivo
                </button>
              </div>
            </div>

            {/* 3. BOTÃO DE SALVAR */}
            <div style={{...styles.mainCard, background: 'var(--bg-app)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button 
                onClick={handleSave} 
                disabled={saving} 
                style={{
                  ...styles.saveBtnLarge,
                  background: successAnim ? '#10b981' : '#3b82f6',
                }}
              >
                {successAnim ? <CheckCircle size={20} /> : <Save size={20} />}
                {saving ? 'A guardar...' : successAnim ? 'Apuração Salva!' : 'Finalizar e Salvar Apuração'}
              </button>

              {lastUpdate ? (
                <div style={styles.auditStamp}>
                  <Clock size={14} />
                  <span>Atualizado por <strong>{lastUpdate.user}</strong> em {new Date(lastUpdate.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              ) : (
                <div style={styles.auditStamp}>
                  <Clock size={14} /> Nenhum registo salvo este mês.
                </div>
              )}
            </div>

          </div>
        </>
      )}

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.4s ease forwards; }
      `}</style>
    </div>
  );
}