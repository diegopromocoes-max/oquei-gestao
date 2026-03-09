import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { Save, TrendingDown, Search, BarChart3, Target, Activity, CheckCircle2 } from 'lucide-react';

export default function TabMetasChurn({ selectedMonth, isMaster, userData }) {
  const [cities, setCities] = useState([]);
  
  // Dados das abas anteriores
  const [channelGoals, setChannelGoals] = useState({}); // Aba 1 (Meta Global de Instalações)
  const [salesGoals, setSalesGoals] = useState({});     // Aba 2 (Distribuição nas cidades com canais)
  
  // Dados desta aba
  const [churnGoals, setChurnGoals] = useState({}); 
  const [globalChurn, setGlobalChurn] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const snapCities = await getDocs(collection(db, 'cities'));
        const citiesData = snapCities.docs.map(d => ({ id: d.id, ...d.data() }));
        citiesData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCities(citiesData);

        // Aba 1
        const docRefChannels = doc(db, 'goals_channels', selectedMonth);
        const docSnapChannels = await getDoc(docRefChannels);
        if (docSnapChannels.exists()) {
          setChannelGoals(docSnapChannels.data().data || {});
        } else {
          setChannelGoals({});
        }

        // Aba 2 (A nova estrutura 3D: cidade > canal > produto)
        const docRefSales = doc(db, 'goals_cities', selectedMonth);
        const docSnapSales = await getDoc(docRefSales);
        if (docSnapSales.exists()) {
          setSalesGoals(docSnapSales.data().data || {});
        } else {
          setSalesGoals({});
        }

        // Aba 3
        const docRefChurn = doc(db, 'goals_churn', selectedMonth);
        const docSnapChurn = await getDoc(docRefChurn);
        if (docSnapChurn.exists()) {
          const data = docSnapChurn.data();
          setChurnGoals(data.data || {});
          setGlobalChurn(data.globalChurn || 0);
        } else {
          setChurnGoals({});
          setGlobalChurn(0);
        }

      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth]);

  const handleChurnChange = (cityId, value) => {
    setChurnGoals(prev => ({ ...prev, [cityId]: Number(value) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'goals_churn', selectedMonth), {
        data: churnGoals,
        globalChurn: Number(globalChurn),
        month: selectedMonth,
        updatedAt: new Date().toISOString(),
        updatedBy: userData?.name || 'Gestor'
      });
      alert('Teto de Cancelamentos consolidado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao guardar os dados.');
    }
    setSaving(false);
  };

  if (loading) return <p style={{color: 'var(--text-muted)'}}>A calcular consolidação de ecossistema...</p>;

  const filteredCities = cities.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // ==========================================
  // CÁLCULOS DO PAINEL GLOBAL
  // ==========================================
  
  // 1. Meta Global de Instalações (Puxa da Aba 1)
  const metaInstalacoesGlobal = Object.values(channelGoals).reduce((accChannel, channelObj) => {
    return accChannel + Object.values(channelObj).reduce((accProd, val) => accProd + (Number(val) || 0), 0);
  }, 0);

  // 2. Total Distribuído nas Cidades (Soma TUDO da Aba 2: Canais e Produtos)
  let totalDistribuidoCidades = 0;
  Object.values(salesGoals).forEach(cityObj => {
    Object.values(cityObj).forEach(channelObj => {
      Object.values(channelObj).forEach(val => {
        totalDistribuidoCidades += (Number(val) || 0);
      });
    });
  });

  const diffSales = metaInstalacoesGlobal - totalDistribuidoCidades;
  let statusColorSales = '#f59e0b';
  if (diffSales === 0 && metaInstalacoesGlobal > 0) statusColorSales = '#10b981';
  if (diffSales < 0) statusColorSales = '#ef4444';

  // 3. Churn
  const distributedChurn = Object.values(churnGoals).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const diffChurn = Number(globalChurn) - distributedChurn;
  let statusColorChurn = '#f59e0b'; 
  if (diffChurn === 0 && Number(globalChurn) > 0) statusColorChurn = '#10b981'; 
  if (diffChurn < 0) statusColorChurn = '#ef4444'; 

  // 4. Crescimento Líquido Global
  const globalNetAdds = metaInstalacoesGlobal - Number(globalChurn);

  return (
    <div className="animated-view">
      
      {/* ========================================== */}
      {/* PAINEL GLOBAL (DIRETORIA)                  */}
      {/* ========================================== */}
      <div style={styles.globalPanel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Activity size={24} color="#3b82f6" />
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Consolidação Global de Net Adds</h3>
        </div>

        <div style={styles.globalGrid}>
          <div style={{...styles.globalBox, borderLeft: '4px solid #10b981'}}>
            <span style={styles.globalBoxLabel}>Meta de Instalações (Aba 1)</span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#10b981' }}>{metaInstalacoesGlobal}</div>
          </div>

          <div style={{...styles.globalBox, borderLeft: '4px solid #ef4444', background: '#fef2f2'}}>
            <span style={styles.globalBoxLabel}>Meta Global Cancelamentos (Teto)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingDown size={24} color="#ef4444" />
              <input 
                type="number" min="0" disabled={!isMaster} value={globalChurn || ''} onChange={e => setGlobalChurn(e.target.value)}
                style={{...styles.inputNumber, borderColor: '#ef4444', color: '#ef4444', width: '120px', fontSize: '24px', padding: '5px 15px'}} placeholder="0"
              />
            </div>
          </div>

          <div style={{...styles.globalBox, borderLeft: '4px solid #3b82f6', background: '#eff6ff'}}>
            <span style={styles.globalBoxLabel}>Crescimento Líquido Alvo (Net Adds)</span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#3b82f6' }}>
              {globalNetAdds > 0 ? `+${globalNetAdds}` : globalNetAdds}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          {/* VALIDADOR DE VENDAS */}
          <div style={{...styles.validatorBadge, borderColor: statusColorSales, color: statusColorSales, background: `${statusColorSales}10`}}>
            <span><b>Distribuição de Vendas:</b> Meta Global: <b>{metaInstalacoesGlobal}</b> | Distribuído nas Cidades (Aba 2): <b>{totalDistribuidoCidades}</b></span>
            {diffSales === 0 && metaInstalacoesGlobal > 0 && <CheckCircle2 size={16} style={{marginLeft: '4px'}} />}
            {diffSales > 0 && <span style={{fontSize: '12px', marginLeft: '10px'}}>(Faltam: {diffSales} nas cidades)</span>}
            {diffSales < 0 && <span style={{fontSize: '12px', marginLeft: '10px'}}>(Estourou: {Math.abs(diffSales)})</span>}
          </div>

          {/* VALIDADOR DE CHURN */}
          <div style={{...styles.validatorBadge, borderColor: statusColorChurn, color: statusColorChurn, background: `${statusColorChurn}10`}}>
            <span><b>Distribuição de Cancelamentos:</b> Teto Global: <b>{globalChurn}</b> | Distribuído nas Cidades: <b>{distributedChurn}</b></span>
            {diffChurn === 0 && Number(globalChurn) > 0 && <CheckCircle2 size={16} style={{marginLeft: '4px'}} />}
            {diffChurn > 0 && <span style={{fontSize: '12px', marginLeft: '10px'}}>(Falta alocar: {diffChurn})</span>}
            {diffChurn < 0 && <span style={{fontSize: '12px', marginLeft: '10px'}}>(Estourou: {Math.abs(diffChurn)})</span>}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* TABELA DE CIDADES E CHURN                  */}
      {/* ========================================== */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '18px' }}>
            <Target size={20} color="var(--text-muted)" /> Distribuição de Churn e Net Adds por Cidade
          </h4>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-app)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)', width: '250px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder="Filtrar cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-main)' }} />
            </div>
            {isMaster && (
              <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
                <Save size={18} /> {saving ? 'A guardar...' : 'Salvar Teto de Churn'}
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.th}>Cidade (Ordem Alfabética)</th>
                <th style={{...styles.th, color: '#10b981', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)'}}>
                  <BarChart3 size={14} style={{display:'inline', marginBottom:'-2px'}}/> Meta Total da Cidade<br/><span style={{fontSize:'10px', color:'var(--text-muted)'}}>(Todos os Canais - Aba 2)</span>
                </th>
                <th style={{...styles.th, color: '#ef4444', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)'}}>
                  <TrendingDown size={14} style={{display:'inline', marginBottom:'-2px'}}/> Teto Cancelamento<br/><span style={{fontSize:'10px', color:'var(--text-muted)'}}>(Churn da Cidade)</span>
                </th>
                <th style={{...styles.th, color: '#3b82f6', textAlign: 'center'}}>Crescimento Alvo<br/><span style={{fontSize:'10px'}}>(Net Adds)</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredCities.map(city => {
                
                // CÁLCULO MÁGICO: Lendo todos os canais e produtos da Aba 2
                let citySalesTotal = 0;
                const cityData = salesGoals[city.id] || {};
                Object.values(cityData).forEach(channelObj => {
                  Object.values(channelObj).forEach(val => {
                    citySalesTotal += (Number(val) || 0);
                  });
                });

                const cityChurn = churnGoals[city.id] || 0;       
                
                // NET ADDS: Venda Bruta Total da Cidade - Churn
                const netAdds = citySalesTotal - cityChurn;

                return (
                  <tr key={city.id} style={{ borderBottom: '1px solid var(--border)', transition: '0.2s' }}>
                    <td style={styles.tdName}>{city.name}</td>
                    
                    {/* META DA CIDADE (Read Only) */}
                    <td style={{ padding: '15px', fontSize: '18px', fontWeight: '900', color: '#10b981', textAlign: 'center', background: 'rgba(16, 185, 129, 0.02)' }}>
                      {citySalesTotal}
                    </td>

                    {/* TETO CANCELAMENTO (Input) */}
                    <td style={{ padding: '15px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.02)' }}>
                      <input 
                        type="number" min="0" disabled={!isMaster} value={cityChurn || ''} onChange={e => handleChurnChange(city.id, e.target.value)}
                        style={styles.inputNumber} placeholder="0"
                      />
                    </td>
                    
                    {/* NET ADDS FINAL */}
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-block', padding: '8px 16px', borderRadius: '10px',
                        background: netAdds >= 0 ? '#eff6ff' : '#fef2f2',
                        color: netAdds >= 0 ? '#3b82f6' : '#ef4444',
                        fontWeight: '900', fontSize: '18px', border: `1px solid ${netAdds >= 0 ? '#bfdbfe' : '#fecaca'}`
                      }}>
                        {netAdds > 0 ? `+${netAdds}` : netAdds}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

const styles = {
  saveBtn: { background: '#ef4444', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' },
  
  globalPanel: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-sm)' },
  globalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  globalBox: { background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  globalBoxLabel: { fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' },
  validatorBadge: { display: 'flex', alignItems: 'center', padding: '12px 20px', borderRadius: '12px', fontSize: '13px', border: '1px dashed' },
  
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', boxShadow: 'var(--shadow-sm)' },
  th: { padding: '20px 15px', textAlign: 'left', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' },
  tdName: { padding: '15px', fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap' },
  inputNumber: { width: '90px', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#ef4444', fontSize: '16px', fontWeight: 'bold', outline: 'none', textAlign: 'center' }
};