import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Activity, Calendar as CalendarIcon, RefreshCw, Target, TrendingUp 
} from 'lucide-react';
import { styles, colors } from "./LaboratorioChurn/styles";

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
  const [cityResults, setCityResults] = useState({}); // Dados do Painel de Apuração
  const [activeLabTab, setActiveLabTab] = useState('radar');
  const [selectedCity, setSelectedCity] = useState(null);

  // 1. SINCRONIZAÇÃO: Puxando Metas e Apuração Oficial
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
        
        // GESTÃO DE METAS
        onSnapshot(query(collection(db, "monthly_goals"), where("month", "==", selectedMonth)), snap => {
          const gMap = {}; 
          snap.docs.forEach(d => { gMap[d.data().cityId] = d.data(); }); 
          setMonthlyGoals(gMap);
        }),

        // APURAÇÃO DE RESULTADOS (O que foi alimentado manualmente)
        onSnapshot(query(collection(db, "city_results"), where("month", "==", selectedMonth)), snap => {
          const rMap = {}; 
          snap.docs.forEach(d => { rMap[d.data().cityId] = d.data(); }); 
          setCityResults(rMap);
        })
      ];
      setLoading(false);
      return () => unsubs.forEach(u => u());
    });
    return () => unsubAuth();
  }, [userData, selectedMonth]);

  // 2. MOTOR DE BI: Cruzando Apuração vs Metas
  const processedData = useMemo(() => {
    return cities.map(city => {
      const cityGoal = monthlyGoals[city.id] || {};
      const res = cityResults[city.id] || {};
      
      // Soma todas as vendas de todos os canais/produtos da apuração
      let totalSales = 0;
      if (res.vendas) {
        Object.values(res.vendas).forEach(channel => {
          Object.values(channel).forEach(val => { totalSales += Number(val || 0); });
        });
      }

      // Dados oficiais de cancelamento do painel de apuração
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
        // Breakdown para gráficos
        channels: res.vendas || {},
        churnReasons: res.cancelamentosMotivos || {}
      };
    });
  }, [cities, monthlyGoals, cityResults]);

  // 3. KPIs GLOBAIS DO CABEÇALHO (Consolidado da Apuração)
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

  if (loading) return <div style={styles.loadingContainer}><RefreshCw className="animate-spin" /></div>;

  return (
    <div style={styles.pageContainer}>
      {/* CABEÇALHO COM DADOS DA APURAÇÃO */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBox}><Activity size={28} color="var(--primary)" /></div>
          <div><h1 style={styles.title}>Laboratório Churn</h1><p style={styles.subtitle}>Apuração Oficial vs Metas Regionais</p></div>
        </div>
        <div style={styles.monthSelector}>
          <CalendarIcon size={18} color="var(--text-secondary)" style={{marginRight: '10px'}} />
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={styles.monthInput} />
        </div>
      </div>

      {/* KPIS PRINCIPAIS (DADOS GLOBAIS DA APURAÇÃO) */}
      {globalStats && (
        <div style={styles.globalGrid}>
          <div style={styles.globalCard}>
            <span style={styles.globalLabel}>Base Regional Total</span>
            <div style={styles.globalValue}>{globalStats.tBase.toLocaleString()}</div>
          </div>
          <div style={styles.globalCard}>
            <span style={styles.globalLabel}>Atingimento Meta Regional</span>
            <div style={{ ...styles.globalValue, color: globalStats.attainment >= 100 ? '#10b981' : '#f59e0b' }}>
              {globalStats.attainment}% <Target size={24} />
            </div>
          </div>
          <div style={styles.globalCard}>
            <span style={styles.globalLabel}>Vendas Brutas (Apuração)</span>
            <div style={{ ...styles.globalValue, color: 'var(--primary)' }}>{globalStats.tSales} <TrendingUp size={24} /></div>
          </div>
          <div style={styles.globalCard}>
            <span style={styles.globalLabel}>Saldo Net Regional</span>
            <div style={{ ...styles.globalValue, color: globalStats.tNet >= 0 ? '#10b981' : '#ef4444' }}>
              {globalStats.tNet > 0 ? '+' : ''}{globalStats.tNet}
            </div>
          </div>
        </div>
      )}

      {/* NAVEGAÇÃO */}
      <div style={styles.labNav}>
        <button onClick={() => setActiveLabTab('radar')} style={activeLabTab === 'radar' ? styles.labNavBtnActive : styles.labNavBtn}>Radar de Cidades</button>
        <button onClick={() => setActiveLabTab('inteligencia')} style={activeLabTab === 'inteligencia' ? styles.labNavBtnActive : styles.labNavBtn}>Inteligência de Metas</button>
        <button onClick={() => setActiveLabTab('omnichannel')} style={activeLabTab === 'omnichannel' ? styles.labNavBtnActive : styles.labNavBtn}>Canais de Venda</button>
        <button onClick={() => setActiveLabTab('relacionamento')} style={activeLabTab === 'relacionamento' ? styles.labNavBtnActive : styles.labNavBtn}>Relacionamento</button>
        <button onClick={() => setActiveLabTab('projecoes')} style={activeLabTab === 'projecoes' ? styles.labNavBtnActive : styles.labNavBtn}>Projeções</button>
      </div>

      <div style={{ marginTop: '30px' }}>
        {activeLabTab === 'radar' && <RadarView processedData={processedData} selectedCity={selectedCity} setSelectedCity={setSelectedCity} />}
        {activeLabTab === 'inteligencia' && <InteligenciaView processedData={processedData} />}
        {activeLabTab === 'omnichannel' && <OmnichannelView processedData={processedData} />}
        {activeLabTab === 'relacionamento' && <RelacionamentoView processedData={processedData} />}
        {activeLabTab === 'projecoes' && <ProjecoesView processedData={processedData} />}
      </div>
    </div>
  );
}