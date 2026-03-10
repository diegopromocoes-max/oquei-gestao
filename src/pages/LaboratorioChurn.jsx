import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Activity, Calendar as CalendarIcon, RefreshCw, Target, TrendingUp 
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles } from '../styles/globalStyles';

// Importação das Views
import RadarView from './LaboratorioChurn/RadarView';
import InteligenciaView from './LaboratorioChurn/InteligenciaView';
import OmnichannelView from './LaboratorioChurn/OmnichannelView';
import RelacionamentoView from './LaboratorioChurn/RelacionamentoView';
import ProjecoesView from './LaboratorioChurn/ProjecoesView';

export default function LaboratorioChurn({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [monthlyGoals, setMonthlyGoals] = useState({});
  const [cityResults, setCityResults] = useState({}); 
  const [reasonsMap, setReasonsMap] = useState({}); // NOVO: Mapa de Motivos
  const [activeLabTab, setActiveLabTab] = useState('radar');
  const [selectedCity, setSelectedCity] = useState(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setLoading(true);
      const isCoord = userData?.role === 'coordinator' || userData?.role === 'coordenador';
      const myCluster = String(userData?.clusterId || "").trim();

      const unsubs = [
        // Cidades
        onSnapshot(isCoord ? collection(db, 'cities') : query(collection(db, 'cities'), where('clusterId', '==', myCluster)), snap => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCities(list);
          if (list.length > 0 && !selectedCity) setSelectedCity(list[0]);
        }),
        
        // Metas
        onSnapshot(query(collection(db, "monthly_goals"), where("month", "==", selectedMonth)), snap => {
          const gMap = {}; snap.docs.forEach(d => { gMap[d.data().cityId] = d.data(); }); setMonthlyGoals(gMap);
        }),

        // Apuração Oficial
        onSnapshot(query(collection(db, "city_results"), where("month", "==", selectedMonth)), snap => {
          const rMap = {}; snap.docs.forEach(d => { rMap[d.data().cityId] = d.data(); }); setCityResults(rMap);
        }),

        // NOVO: Lê os motivos de cancelamento dinâmicos do Firebase
        onSnapshot(collection(db, "churn_reasons"), snap => {
          const rm = {}; snap.docs.forEach(d => { rm[d.id] = d.data().name; }); setReasonsMap(rm);
        })
      ];
      setLoading(false);
      return () => unsubs.forEach(u => u());
    });
    return () => unsubAuth();
  }, [userData, selectedMonth]);

  const processedData = useMemo(() => {
    return cities.map(city => {
      const cityGoal = monthlyGoals[city.id] || {};
      const res = cityResults[city.id] || {};
      
      let totalSales = 0;
      if (res.vendas) {
        Object.values(res.vendas).forEach(channel => {
          Object.values(channel).forEach(val => { totalSales += Number(val || 0); });
        });
      }

      const cancelations = Number(res.cancelamentos || 0);
      const netAdds = totalSales - cancelations;

      const baseStart = parseFloat(city.baseStart || 0);
      const targetNet = parseFloat(cityGoal.metaNet || 0);

      return {
        ...city,
        city: city.name || city.city,
        totalSales,
        cancelations,
        netAdds,
        currentBase: baseStart + netAdds,
        targetNetAdds: targetNet,
        churnRate: baseStart > 0 ? ((cancelations / baseStart) * 100).toFixed(2) : "0.00",
        channels: res.vendas || {},
        churnReasons: res.cancelamentosMotivos || {} // Dados que vêm da Apuração
      };
    });
  }, [cities, monthlyGoals, cityResults]);

  const globalStats = useMemo(() => {
    if (processedData.length === 0) return null;
    const tSales = processedData.reduce((acc, c) => acc + c.totalSales, 0);
    const tNet = processedData.reduce((acc, c) => acc + c.netAdds, 0);
    const tTarget = processedData.reduce((acc, c) => acc + c.targetNetAdds, 0);
    const tBase = processedData.reduce((acc, c) => acc + c.currentBase, 0);
    
    return {
      tSales, tNet, tTarget, tBase,
      attainment: tTarget > 0 ? ((tNet / tTarget) * 100).toFixed(1) : 0
    };
  }, [processedData]);

  if (loading) return <div style={styles.loadingState}>Sincronizando Laboratório...</div>;

  return (
    <div className="animated-view" style={styles.container}>
      <div style={styles.headerContainer}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={styles.iconBox}><Activity color="#3b82f6" size={28} /></div>
          <div><h1 style={styles.pageTitle}>Laboratório Churn</h1><p style={styles.dateBadge}>Apuração Oficial vs Metas Regionais</p></div>
        </div>
        <div style={styles.filterPill}>
          <CalendarIcon size={16} color="#3b82f6" />
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={styles.filterInput} />
        </div>
      </div>

      {globalStats && (
        <div style={styles.grid4}>
          <div style={styles.mainCard}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base Regional Total</span>
            <div style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text-main)' }}>{globalStats.tBase.toLocaleString()}</div>
          </div>
          <div style={{...styles.mainCard, borderLeft: `6px solid ${globalStats.attainment >= 100 ? '#10b981' : '#f59e0b'}`}}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Atingimento Meta</span>
            <div style={{ fontSize: '30px', fontWeight: '900', color: globalStats.attainment >= 100 ? '#10b981' : '#f59e0b', display: 'flex', justifyContent: 'space-between' }}>
              {globalStats.attainment}% <Target size={24} />
            </div>
          </div>
          <div style={{...styles.mainCard, borderLeft: '6px solid #3b82f6'}}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendas Brutas (Mês)</span>
            <div style={{ fontSize: '30px', fontWeight: '900', color: '#3b82f6', display: 'flex', justifyContent: 'space-between' }}>
              {globalStats.tSales} <TrendingUp size={24} />
            </div>
          </div>
          <div style={{...styles.mainCard, borderLeft: `6px solid ${globalStats.tNet >= 0 ? '#10b981' : '#ef4444'}`}}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo Net Regional</span>
            <div style={{ fontSize: '30px', fontWeight: '900', color: globalStats.tNet >= 0 ? '#10b981' : '#ef4444' }}>
              {globalStats.tNet > 0 ? '+' : ''}{globalStats.tNet}
            </div>
          </div>
        </div>
      )}

      {/* Navegação Simplificada */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '25px', overflowX: 'auto' }}>
        {['radar', 'inteligencia', 'omnichannel', 'relacionamento', 'projecoes'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveLabTab(tab)} 
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: activeLabTab === tab ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeLabTab === tab ? '#3b82f6' : 'var(--text-muted)',
              padding: '12px 18px', fontSize: '14px', fontWeight: activeLabTab === tab ? '800' : '600',
              textTransform: 'capitalize', whiteSpace: 'nowrap', transition: '0.2s'
            }}
          >
            {tab === 'radar' ? 'Radar de Cidades' : tab === 'inteligencia' ? 'Inteligência de Metas' : tab === 'omnichannel' ? 'Canais de Venda' : tab}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        {activeLabTab === 'radar' && <RadarView processedData={processedData} selectedCity={selectedCity} setSelectedCity={setSelectedCity} />}
        {activeLabTab === 'inteligencia' && <InteligenciaView processedData={processedData} />}
        {activeLabTab === 'omnichannel' && <OmnichannelView processedData={processedData} />}
        {/* Passamos o reasonsMap para a View de Relacionamento */}
        {activeLabTab === 'relacionamento' && <RelacionamentoView processedData={processedData} reasonsMap={reasonsMap} />}
        {activeLabTab === 'projecoes' && <ProjecoesView processedData={processedData} />}
      </div>

      <style>{`@keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animated-view { animation: fadeInView 0.4s ease forwards; }`}</style>
    </div>
  );
}