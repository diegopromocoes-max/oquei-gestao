import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Calculator, Calendar, MapPin, Save, 
  Users, TrendingDown, TrendingUp, 
  AlertCircle, Layers, Activity, Database, Clock, Plus, Tag, Trash2
} from 'lucide-react';
import { colors } from '../styles/globalStyles';

export default function ApuracaoResultados({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [cities, setCities] = useState([]);
  const [channels, setChannels] = useState([]);
  const [products, setProducts] = useState([]);
  
  // --- NOVOS ESTADOS PARA MOTIVOS ---
  const [reasonTypes, setReasonTypes] = useState([]); // Motivos cadastrados no banco
  const [newReasonName, setNewReasonName] = useState(''); // Input para novo motivo
  
  const [selectedCity, setSelectedCity] = useState('');
  const [systemCount, setSystemCount] = useState(0);
  const [autoCRM, setAutoCRM] = useState(false);

  const [manualData, setManualData] = useState({
    vendas: {}, 
    cancelamentos: 0,
    cancelamentosMotivos: {} // Ex: { "id_motivo_1": 5, "id_motivo_2": 2 }
  });

  const [lastUpdate, setLastUpdate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const dataDeHoje = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }).format(new Date());

  // 1. CARREGAR BASES DINÂMICAS (INCLUINDO MOTIVOS)
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

      // Busca os motivos de cancelamento do banco
      const snapReasons = await getDocs(collection(db, 'churn_reasons'));
      const re = snapReasons.docs.map(d => ({ id: d.id, ...d.data() }));
      setReasonTypes(re);

      if (ci.length > 0 && !selectedCity) setSelectedCity(ci[0].id);
    } catch (err) {
      console.error("Erro ao carregar dados base:", err);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, [userData]);

  // 2. BUSCAR DADOS DO MÊS E CIDADE
  useEffect(() => {
    if (!selectedMonth || !selectedCity) return;

    const fetchMonthData = async () => {
      setLoading(true);
      try {
        // ... lógica de systemCount do CRM mantida ...
        
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
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
      setLoading(false);
    };
    fetchMonthData();
  }, [selectedMonth, selectedCity]);

  // 3. HANDLERS
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
      // Calcula o total automaticamente somando os motivos
      const novoTotal = Object.values(novosMotivos).reduce((a, b) => a + b, 0);
      return { ...prev, cancelamentosMotivos: novosMotivos, cancelamentos: novoTotal };
    });
  };

  // GESTOR: Adicionar novo tipo de motivo ao Firebase
  const handleAddReasonType = async () => {
    if (!newReasonName.trim()) return;
    try {
      await addDoc(collection(db, 'churn_reasons'), {
        name: newReasonName.trim(),
        createdAt: serverTimestamp()
      });
      setNewReasonName('');
      fetchBaseData(); // Recarrega a lista
    } catch (err) {
      alert("Erro ao cadastrar motivo.");
    }
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
      alert('Resultados apurados com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao guardar os dados.');
    }
    setSaving(false);
  };

  return (
    <div className="animated-view" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <Activity color={colors?.warning || '#f59e0b'} size={28} />
            Apuração de Resultados
          </h2>
          <p style={styles.subtitle}>Alimente as vendas e o detalhamento de churn da unidade.</p>
        </div>

        <div style={styles.headerFilters}>
          <div style={styles.filterGroup}>
            <Calendar size={18} color="var(--text-muted)" />
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={styles.filterInput} />
          </div>
          <div style={styles.filterGroup}>
            <MapPin size={18} color="var(--text-muted)" />
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} style={styles.filterInput}>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* BLOCO DE VENDAS (MANTIDO) */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}><TrendingUp color="#10b981" size={20} /> Vendas Fechadas (Apuração)</h3>
          {channels.map(ch => (
            <div key={ch.id} style={styles.channelBlock}>
              <h4 style={styles.channelName}>{ch.name}</h4>
              <div style={styles.inputGrid}>
                {products.map(prod => (
                  <div key={prod.id} style={styles.inputGroup}>
                    <label style={styles.label}>{prod.name}</label>
                    <input 
                      type="number" 
                      value={manualData.vendas?.[ch.id]?.[prod.id] || ''} 
                      onChange={e => handleVendasChange(ch.id, prod.id, e.target.value)} 
                      style={styles.input} placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* BLOCO DE CANCELAMENTOS COM GESTOR DE MOTIVOS */}
        <div style={{...styles.card, borderTop: '4px solid #ef4444'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={styles.cardTitle}><TrendingDown color="#ef4444" size={20} /> Detalhamento de Churn</h3>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '5px 12px', borderRadius: '8px' }}>
              Total: {manualData.cancelamentos}
            </div>
          </div>

          {/* Sub-bloco: Gestor de Tipos de Motivo (Firebase) */}
          <div style={styles.managerBox}>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              <Plus size={12} /> CADASTRAR NOVO MOTIVO NO SISTEMA
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                value={newReasonName} 
                onChange={e => setNewReasonName(e.target.value)}
                placeholder="Ex: Concorrência Fibra, Mudança de Endereço..." 
                style={{...styles.input, fontSize: '14px'}}
              />
              <button onClick={handleAddReasonType} style={styles.addBtn}><Plus size={18} /></button>
            </div>
          </div>

          {/* Grade de Motivos para Apuração */}
          <div style={{ ...styles.inputGrid, marginTop: '20px' }}>
            {reasonTypes.length === 0 ? (
              <p style={{ gridColumn: '1/-1', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum motivo cadastrado. Use o gestor acima.</p>
            ) : (
              reasonTypes.map(reason => (
                <div key={reason.id} style={styles.inputGroup}>
                  <label style={styles.label}><Tag size={10} /> {reason.name}</label>
                  <input 
                    type="number" min="0"
                    value={manualData.cancelamentosMotivos?.[reason.id] || ''}
                    onChange={e => handleReasonValueChange(reason.id, e.target.value)}
                    style={{...styles.input, borderColor: '#fca5a5'}}
                    placeholder="0"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          <Save size={20} /> {saving ? 'A guardar...' : 'Salvar Apuração da Unidade'}
        </button>

        {lastUpdate && (
          <div style={styles.footerAudit}>
            <Clock size={14} />
            <span>Última atualização: <strong>{new Date(lastUpdate.date).toLocaleString()}</strong> por <strong>{lastUpdate.user}</strong></span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.3s ease forwards; }
      `}</style>
    </div>
  );
}

const styles = {
  header: { marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: '5px 0 0 0' },
  headerFilters: { display: 'flex', gap: '12px' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)' },
  filterInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', cursor: 'pointer' },
  
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  cardTitle: { margin: '0', fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' },
  
  channelBlock: { marginTop: '15px', padding: '15px', background: 'var(--bg-app)', borderRadius: '12px' },
  channelName: { margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  
  managerBox: { padding: '15px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px dashed var(--border)', marginTop: '10px' },
  addBtn: { background: 'var(--text-main)', color: 'var(--bg-card)', border: 'none', borderRadius: '8px', padding: '0 15px', cursor: 'pointer' },

  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' },
  input: { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box' },
  
  saveBtn: { background: '#2563eb', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', transition: 'all 0.2s' },
  footerAudit: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }
};