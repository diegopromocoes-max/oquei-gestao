import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { CalendarClock, Filter, TrendingUp, RefreshCw } from 'lucide-react';

// IMPORTAÇÃO DOS COMPONENTES FILHOS (MANTIDOS INTACTOS)
import SpeedometerCard from '../components/SpeedometerCard';
import WarRoomProjections from '../components/WarRoomProjections'; 
import MonthlyEvolution from '../components/MonthlyEvolution';
import { PerformanceCharts, SvaAnalyzer } from '../components/SalesCharts';
import SalesTable from '../components/SalesTable';

import { styles as global, colors } from '../styles/globalStyles';

export default function PainelVendas({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [leads, setLeads] = useState([]); 
  const [myStores, setMyStores] = useState([]);
  const [holidays, setHolidays] = useState([]);
  
  // ESTADOS DE METAS
  const [monthlyGoals, setMonthlyGoals] = useState({}); // Metas das Unidades
  const [monthlyClusterGoals, setMonthlyClusterGoals] = useState({}); // <-- INJEÇÃO: Metas do Cluster/Regional
  
  const [loading, setLoading] = useState(true);

  const [chartClusterFilter, setChartClusterFilter] = useState('all');
  const [chartCityFilter, setChartCityFilter] = useState('all');

  // 1. MOTOR DE DADOS EM TEMPO REAL (CIRURGIÃO)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setLoading(true);

      const unsubs = [];
      const myCluster = String(userData?.clusterId || "").trim();
      const isCoord = userData?.role === 'coordinator' || userData?.role === 'coordenador';

      const safeListen = (ref, setter, label) => {
        const unsub = onSnapshot(ref, 
          (snap) => setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
          (err) => console.warn(`[Permissão] Bloqueio na coleção ${label}:`, err)
        );
        unsubs.push(unsub);
      };

      try {
        // CIDADES E LEADS
        const qCities = isCoord ? collection(db, "cities") : query(collection(db, "cities"), where("clusterId", "==", myCluster));
        getDocs(qCities).then(snap => {
          const storesList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setMyStores(storesList);

          const qLeads = collection(db, "leads");
          const unsubLeads = onSnapshot(qLeads, (snapLeads) => {
            const allLeads = snapLeads.docs.map(d => ({ id: d.id, ...d.data() }));
            const storeNames = storesList.map(s => s.name);
            const finalData = isCoord ? allLeads : allLeads.filter(l => storeNames.includes(l.cityId));
            setLeads(finalData);
            setLoading(false);
          }, (err) => { console.error("Erro nos leads:", err); setLoading(false); });
          unsubs.push(unsubLeads);
        });

        // FERIADOS
        safeListen(collection(db, "holidays"), setHolidays, "Feriados");

        // METAS DAS UNIDADES (CIDADES)
        const qGoals = isCoord 
          ? query(collection(db, "monthly_goals"), where("month", "==", selectedMonth))
          : query(collection(db, "monthly_goals"), where("month", "==", selectedMonth), where("clusterId", "==", myCluster));
        
        const unsubGoals = onSnapshot(qGoals, (snap) => {
          const gMap = {}; snap.docs.forEach(d => { gMap[d.data().cityId] = d.data(); }); setMonthlyGoals(gMap);
        }, (err) => console.warn("Permissão negada para Metas Unidade."));
        unsubs.push(unsubGoals);

        // --- INJEÇÃO: METAS DA REGIONAL (CLUSTER) ---
        const qClusterGoals = isCoord 
          ? query(collection(db, "monthly_cluster_goals"), where("month", "==", selectedMonth))
          : query(collection(db, "monthly_cluster_goals"), where("month", "==", selectedMonth), where("clusterId", "==", myCluster));
        
        const unsubClusterGoals = onSnapshot(qClusterGoals, (snap) => {
          const cMap = {}; snap.docs.forEach(d => { cMap[d.data().clusterId] = d.data(); }); setMonthlyClusterGoals(cMap);
        }, (err) => console.warn("Permissão negada para Metas Cluster."));
        unsubs.push(unsubClusterGoals);

      } catch (e) {
        console.error("Erro geral no motor de dados:", e);
        setLoading(false);
      }

      return () => unsubs.forEach(u => u());
    });

    return () => unsubAuth();
  }, [selectedMonth, userData]);

  // --- LÓGICA DE CALENDÁRIO ---
  const getCalendarForScope = (year, month, storeId = null) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    let total = 0; let worked = 0;
    const now = new Date();
    for (let i = 1; i <= lastDay; i++) {
        const dateObj = new Date(year, month, i);
        if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
        const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isHoliday = holidays.some(h => h.date === dateStr);
        if (!isHoliday) {
            total++;
            if (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() && i <= now.getDate())) worked++;
        }
    }
    return { total: total || 22, worked: worked || 1, remaining: Math.max(0, total - worked) };
  };

  const globalCalendar = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return getCalendarForScope(y, m - 1);
  }, [selectedMonth, holidays]);

  const uniqueClusters = useMemo(() => {
    return [...new Set(myStores.map(s => s.clusterId).filter(Boolean))];
  }, [myStores]);

  const currentMonthLeads = useMemo(() => leads.filter(l => l.date?.startsWith(selectedMonth)), [leads, selectedMonth]);

  // --- COMPILADOR DE DADOS DA UNIDADE ---
  const storeData = useMemo(() => {
    let targetStores = myStores;
    if (chartClusterFilter !== 'all') targetStores = targetStores.filter(s => s.clusterId === chartClusterFilter);
    if (chartCityFilter !== 'all') targetStores = targetStores.filter(s => s.name === chartCityFilter);

    return targetStores.map(store => {
      const storeLeads = currentMonthLeads.filter(l => l.cityId === store.name || l.cityId === store.id);
      const goal = monthlyGoals[store.id] || {};
      
      const p = storeLeads.filter(l => (l.status === 'Contratado' || l.status === 'Instalado') && l.leadType === 'Plano Novo').length;
      const i = storeLeads.filter(l => l.status === 'Instalado' && l.leadType === 'Plano Novo').length;
      const ss = storeLeads.filter(l => (l.status === 'Contratado' || l.status === 'Instalado') && l.leadType === 'SVA').length;
      const mCount = storeLeads.filter(l => (l.status === 'Contratado' || l.status === 'Instalado') && l.leadType === 'Migração').length;
      const metaTotal = (parseInt(goal.plans_loja)||0) + (parseInt(goal.plans_pap)||0) + (parseInt(goal.plans_central)||0) + (parseInt(goal.plans_b2b)||0);

      return {
        id: store.id, city: store.name, clusterId: store.clusterId,
        metaPlanos: metaTotal || 0, salesPlanos: p, installedPlanos: i, salesSVA: ss, metaSVA: parseInt(goal.sva) || 0,
        salesMigracoes: mCount, metaMigracoes: parseInt(goal.migrations) || 0,
        projSales: globalCalendar.worked > 0 ? Math.floor((p / globalCalendar.worked) * globalCalendar.total) : 0,
      };
    }).sort((a, b) => b.salesPlanos - a.salesPlanos); 
  }, [currentMonthLeads, myStores, selectedMonth, chartClusterFilter, chartCityFilter, monthlyGoals, globalCalendar]);

  // --- TOTAIS GLOBAIS (CIRURGIÃO: OVERRIDE COM METAS DO CLUSTER) ---
  const totals = useMemo(() => {
    // 1. Soma da performance real e das metas das unidades (fallback)
    const s = storeData.reduce((acc, curr) => {
      acc.p += curr.salesPlanos; acc.i += curr.installedPlanos; acc.ss += curr.salesSVA; 
      acc.m += curr.salesMigracoes;
      acc.gp += curr.metaPlanos; acc.gm += curr.metaMigracoes; acc.gs += curr.metaSVA;
      return acc;
    }, { p: 0, i: 0, ss: 0, gp: 0, m:0, gm:0, gs:0 });
    
    // 2. Determinar as Metas do Cluster (Se existirem, sobrepõem as das unidades)
    let clusterP = 0, clusterM = 0, clusterS = 0;
    let hasClusterGoals = false;

    if (chartClusterFilter !== 'all') {
      const cg = monthlyClusterGoals[chartClusterFilter];
      if (cg && (cg.plans || cg.migrations || cg.sva)) {
        clusterP = parseInt(cg.plans) || 0;
        clusterM = parseInt(cg.migrations) || 0;
        clusterS = parseInt(cg.sva) || 0;
        hasClusterGoals = true;
      }
    } else {
      // Se Visão Global, soma os alvos de todas as regionais que o utilizador vê
      uniqueClusters.forEach(clusterId => {
        const cg = monthlyClusterGoals[clusterId];
        if (cg && (cg.plans || cg.migrations || cg.sva)) {
          clusterP += parseInt(cg.plans) || 0;
          clusterM += parseInt(cg.migrations) || 0;
          clusterS += parseInt(cg.sva) || 0;
          hasClusterGoals = true;
        }
      });
    }

    const workRatio = globalCalendar.total / (globalCalendar.worked || 1);
    
    return { 
      ...s, 
      // SE A DIRETORIA DEFINIU META DE CLUSTER, USA. SENÃO, FAZ A SOMA DAS LOJAS.
      goalP: hasClusterGoals ? clusterP : s.gp,
      goalM: hasClusterGoals ? clusterM : s.gm,
      goalS: hasClusterGoals ? clusterS : s.gs,
      projP: Math.floor(s.p * workRatio), 
      projM: Math.floor(s.m * workRatio), 
      projI: Math.floor(s.i * workRatio), 
      projS: Math.floor(s.ss * workRatio) 
    };
  }, [storeData, globalCalendar, monthlyClusterGoals, chartClusterFilter, uniqueClusters]);

  // --- INTELIGÊNCIA DE SVA ---
  const svaAnalysis = useMemo(() => {
    const svaCounts = {}; const sellerCounts = {}; const cityCounts = {};
    currentMonthLeads.filter(l => l.leadType === 'SVA' && (l.status === 'Contratado' || l.status === 'Instalado')).forEach(lead => {
        svaCounts[lead.productName || 'Outros'] = (svaCounts[lead.productName || 'Outros'] || 0) + 1;
        sellerCounts[lead.attendantName || 'N/D'] = (sellerCounts[lead.attendantName || 'N/D'] || 0) + 1;
        cityCounts[lead.cityId || 'N/D'] = (cityCounts[lead.cityId || 'N/D'] || 0) + 1;
    });
    return { 
      radarData: Object.keys(svaCounts).map(k => ({ subject: k, A: svaCounts[k], fullMark: 10 })),
      topSellers: Object.keys(sellerCounts).map(k => ({ name: k, count: sellerCounts[k] })).sort((a,b)=>b.count-a.count).slice(0,5),
      topCities: Object.keys(cityCounts).map(k => ({ name: k, count: cityCounts[k] })).sort((a,b)=>b.count-a.count).slice(0,5)
    };
  }, [currentMonthLeads]);

  if (loading) return <div style={{padding: 100, textAlign:'center'}}><RefreshCw className="animate-spin" color={colors?.primary} /></div>;

  return (
    <div style={global.container}>
      <div style={{...global.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'30px', marginBottom:'30px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
          <div style={{...global.iconHeader, background:colors.primary}}><TrendingUp size={32} color="white" /></div>
          <div><h2 style={global.title}>Painel de Vendas</h2><p style={global.subtitle}>Gestão de Metas da Regional</p></div>
        </div>
        <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
          <div style={{background:colors.primary + '10', padding:'10px 20px', borderRadius:'12px', color:colors.primary, fontWeight:'900'}}>
            {globalCalendar.worked} trab. / {globalCalendar.remaining} rest.
          </div>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={global.input} />
        </div>
      </div>

      {/* ESTES VELOCÍMETROS AGORA PUXAM A META DA REGIONAL */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'20px', marginBottom:'40px'}}>
        <SpeedometerCard title="Planos Novos" current={totals.p} target={totals.goalP} projection={totals.projP} delay="0s" />
        <SpeedometerCard title="Migrações" current={totals.m} target={totals.goalM} projection={totals.projM} color="orange" delay="0.1s" />
        <SpeedometerCard title="Instalações" current={totals.i} target={totals.p} projection={totals.projI} color="green" delay="0.2s" />
        <SpeedometerCard title="Mix SVA" current={totals.ss} target={totals.goalS} projection={totals.projS} color="purple" delay="0.3s" />
      </div>

      <div style={{background: 'var(--bg-card)', padding:'15px', borderRadius:'16px', display:'flex', gap:'10px', marginBottom:'30px'}}>
           <button style={chartClusterFilter === 'all' ? local.tabActive : local.tab} onClick={() => setChartClusterFilter('all')}>Visão Global</button>
           {uniqueClusters.map(c => (
             <button key={c} style={chartClusterFilter === c ? local.tabActive : local.tab} onClick={() => setChartClusterFilter(c)}>{c}</button>
           ))}
      </div>

      {/* ESTES COMPONENTES CONTINUAM A AVALIAR A PERFORMANCE POR CIDADE */}
      <WarRoomProjections storeData={storeData} globalCalendar={globalCalendar} />
      <MonthlyEvolution allLeads={leads} myStores={myStores} chartClusterFilter={chartClusterFilter} chartCityFilter={chartCityFilter} />
      <PerformanceCharts storeData={storeData} />
      <SvaAnalyzer svaAnalysis={svaAnalysis} />
      <SalesTable storeData={storeData} />
    </div>
  );
}

const local = {
  tab: { padding:'10px 20px', borderRadius:'10px', border:'none', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontWeight:'bold' },
  tabActive: { padding:'10px 20px', borderRadius:'10px', border:'none', background:'white', color:colors.primary, fontWeight:'900', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' }
};