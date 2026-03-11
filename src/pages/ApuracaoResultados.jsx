import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Calendar, MapPin, Save, 
  TrendingDown, TrendingUp, 
  Activity, Clock, Plus, ChevronRight, CheckCircle,
  Edit2, Trash2, Check, X, RefreshCcw
} from 'lucide-react';

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

  // 🚀 INTERFACE BLINDADA (ESTILOS INLINE 100% GARANTIDOS)
  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 1s linear infinite; }
      `}</style>

      {/* 🚀 CABEÇALHO EXECUTIVO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card, #ffffff)', padding: '24px 32px', borderRadius: '24px', border: '1px solid var(--border, #e5e7eb)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', flexWrap: 'wrap', gap: '20px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-light, rgba(59, 130, 246, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} color="var(--primary, #3b82f6)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-main, #111827)' }}>Apuração de Resultados</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #6b7280)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <Calendar size={14} /> Hoje é {dataDeHoje}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-app, #f3f4f6)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border, #e5e7eb)' }}>
            <Calendar size={16} color="var(--text-muted, #6b7280)" />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              style={{ border: 'none', background: 'transparent', color: 'var(--text-main, #111827)', fontSize: '14px', fontWeight: '800', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }} 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-app, #f3f4f6)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border, #e5e7eb)' }}>
            <MapPin size={16} color="var(--primary, #3b82f6)" />
            <select 
              value={selectedCity} 
              onChange={e => setSelectedCity(e.target.value)} 
              style={{ border: 'none', background: 'transparent', color: 'var(--text-main, #111827)', fontSize: '14px', fontWeight: '900', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>
          <RefreshCcw size={32} className="spin-icon" style={{ margin: '0 auto 15px' }} color="var(--primary, #3b82f6)" />
          <div style={{ fontSize: '15px', fontWeight: '800' }}>Sincronizando dados da unidade...</div>
        </div>
      ) : (
        <>
          {/* BANNER DA CIDADE ATIVA */}
          <div style={{ background: 'var(--bg-card, #ffffff)', padding: '24px 32px', borderRadius: '24px', border: '1px solid var(--border, #e5e7eb)', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--bg-app, #f3f4f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border, #e5e7eb)' }}>
              <MapPin size={28} color="var(--primary, #3b82f6)" />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--primary, #3b82f6)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unidade Selecionada</span>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '900', color: 'var(--text-main, #111827)' }}>{currentCityName}</h2>
            </div>
          </div>

          {/* 1. MATRIZ DE VENDAS */}
          <div style={{ background: 'var(--bg-card, #ffffff)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border, #e5e7eb)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main, #111827)', fontWeight: '900' }}>
                <TrendingUp color="var(--success, #10b981)" size={22} /> Matriz de Vendas Brutas (Gross)
              </h3>
              <div style={{ background: 'var(--success-light, rgba(16, 185, 129, 0.1))', color: 'var(--success, #10b981)', padding: '8px 16px', borderRadius: '10px', fontWeight: '900', fontSize: '15px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                TOTAL DO MÊS: {getTotalGeral()}
              </div>
            </div>
            
            <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border, #e5e7eb)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px', background: 'var(--bg-card, #ffffff)' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-panel, #f9fafb)' }}>
                    <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted, #6b7280)', borderBottom: '1px solid var(--border, #e5e7eb)' }}>CANAIS DE VENDA</th>
                    {products.map(p => (
                      <th key={p.id} style={{ padding: '18px', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted, #6b7280)', borderBottom: '1px solid var(--border, #e5e7eb)', textAlign: 'center' }}>{p.name}</th>
                    ))}
                    <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: '900', color: 'var(--text-main, #111827)', borderBottom: '1px solid var(--border, #e5e7eb)', textAlign: 'right' }}>TOTAL CANAL</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map(ch => {
                    const rowTotal = getChannelTotal(ch.id);
                    return (
                      <tr key={ch.id} style={{ borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                        <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '800', color: 'var(--text-main, #111827)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ChevronRight size={14} color="var(--text-muted, #6b7280)" /> {ch.name}
                        </td>
                        {products.map(prod => (
                          <td key={prod.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <input 
                              type="number" min="0"
                              value={manualData.vendas?.[ch.id]?.[prod.id] || ''} 
                              onChange={e => handleVendasChange(ch.id, prod.id, e.target.value)} 
                              placeholder="0"
                              style={{ width: '70px', padding: '12px', borderRadius: '10px', border: '1px solid var(--border, #e5e7eb)', background: 'var(--bg-app, #f3f4f6)', color: 'var(--text-main, #111827)', fontSize: '15px', fontWeight: '800', textAlign: 'center', outline: 'none', transition: 'border 0.2s', fontFamily: 'inherit' }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '900', fontSize: '18px', color: rowTotal > 0 ? 'var(--success, #10b981)' : 'var(--text-muted, #6b7280)' }}>
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-app, #f3f4f6)', borderTop: '2px solid var(--border, #e5e7eb)' }}>
                    <td style={{ padding: '20px', fontSize: '12px', fontWeight: '900', color: 'var(--text-main, #111827)', textTransform: 'uppercase' }}>Totalização</td>
                    {products.map(prod => (
                      <td key={prod.id} style={{ padding: '20px', textAlign: 'center', fontWeight: '900', color: 'var(--text-main, #111827)', fontSize: '16px' }}>
                        {getProductTotal(prod.id) || 0}
                      </td>
                    ))}
                    <td style={{ padding: '20px', textAlign: 'right', fontWeight: '900', fontSize: '22px', color: 'var(--success, #10b981)' }}>
                      {getTotalGeral()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 2. CHURN / EVASÃO */}
          <div style={{ background: 'var(--bg-card, #ffffff)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border, #e5e7eb)', borderTop: `4px solid var(--danger, #ef4444)`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main, #111827)', fontWeight: '900' }}>
                <TrendingDown color="var(--danger, #ef4444)" size={22} /> Detalhamento de Evasão (Churn)
              </h3>
              <div style={{ background: 'var(--danger-light, rgba(239, 68, 68, 0.1))', color: 'var(--danger, #ef4444)', padding: '8px 16px', borderRadius: '10px', fontWeight: '900', fontSize: '15px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                TOTAL CHURN: {manualData.cancelamentos}
              </div>
            </div>

            {/* Grid moderno para motivos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {reasonTypes.map(reason => {
                const isEditing = editingReasonId === reason.id;
                return (
                  <div key={reason.id} style={{ background: 'var(--bg-app, #f3f4f6)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border, #e5e7eb)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center' }}>
                        <input 
                          value={editReasonName} onChange={e => setEditReasonName(e.target.value)} autoFocus
                          style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `2px solid var(--primary, #3b82f6)`, background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #111827)', fontSize: '13px', outline: 'none', fontWeight: '700' }}
                        />
                        <button onClick={() => saveEditedReason(reason.id)} style={{ background: 'var(--success-light, rgba(16, 185, 129, 0.1))', border: 'none', borderRadius: '8px', color: 'var(--success, #10b981)', cursor: 'pointer', padding: '8px' }}><Check size={18}/></button>
                        <button onClick={() => setEditingReasonId(null)} style={{ background: 'var(--danger-light, rgba(239, 68, 68, 0.1))', border: 'none', borderRadius: '8px', color: 'var(--danger, #ef4444)', cursor: 'pointer', padding: '8px' }}><X size={18}/></button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main, #111827)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger, #ef4444)', flexShrink: 0 }} />
                            {reason.name}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button onClick={() => startEditingReason(reason)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', padding: '4px' }} title="Editar"><Edit2 size={14} /></button>
                            <button onClick={() => deleteReason(reason.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', padding: '4px' }} title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <input 
                          type="number" min="0" placeholder="0"
                          value={manualData.cancelamentosMotivos?.[reason.id] || ''}
                          onChange={e => handleReasonValueChange(reason.id, e.target.value)}
                          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid var(--border, #e5e7eb)', background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #111827)', fontSize: '18px', fontWeight: '900', outline: 'none', fontFamily: 'inherit' }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Adicionar novo motivo */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'var(--bg-panel, #f9fafb)', padding: '16px', borderRadius: '16px', border: '1px dashed var(--border, #e5e7eb)' }}>
              <input 
                value={newReasonName} onChange={e => setNewReasonName(e.target.value)}
                placeholder="Nome do novo motivo de cancelamento..." 
                style={{ flex: 1, minWidth: '250px', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border, #e5e7eb)', background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #111827)', fontSize: '14px', outline: 'none', fontWeight: '600' }}
              />
              <button onClick={handleAddReasonType} style={{ background: 'var(--primary, #3b82f6)', color: '#ffffff', border: 'none', padding: '0 24px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px' }}>
                <Plus size={18} /> Adicionar Motivo
              </button>
            </div>
          </div>

          {/* 3. BOTÃO DE SALVAR GIGANTE */}
          <div style={{ background: 'var(--bg-panel, #f9fafb)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border, #e5e7eb)', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <button 
              onClick={handleSave} 
              disabled={saving} 
              style={{ 
                width: '100%', maxWidth: '500px', padding: '20px', fontSize: '16px', fontWeight: '900',
                background: successAnim ? 'var(--success, #10b981)' : 'var(--primary, #3b82f6)', 
                color: '#ffffff', border: 'none', borderRadius: '16px', cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px',
                boxShadow: successAnim ? `0 8px 24px rgba(16, 185, 129, 0.4)` : `0 8px 24px rgba(59, 130, 246, 0.4)`,
                transition: 'all 0.3s'
              }}
            >
              {successAnim ? <CheckCircle size={24} /> : <Save size={24} />}
              {saving ? 'Gravando no Banco de Dados...' : successAnim ? 'Apuração Salva com Sucesso!' : 'Finalizar e Salvar Apuração'}
            </button>

            {lastUpdate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted, #6b7280)' }}>
                <Clock size={16} />
                <span>Última atualização por <strong style={{ color: 'var(--text-main, #111827)' }}>{lastUpdate.user}</strong> em {new Date(lastUpdate.date).toLocaleString('pt-BR')}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted, #6b7280)' }}>
                <Clock size={16} /> Nenhum registro salvo para esta unidade neste mês.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}