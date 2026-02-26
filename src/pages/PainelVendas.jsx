import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, where, onSnapshot } from 'firebase/firestore';
import { CalendarClock, Filter, TrendingUp } from 'lucide-react';

// IMPORTAÇÃO DOS COMPONENTES FILHOS
import SpeedometerCard from '../components/SpeedometerCard';
import WarRoomProjections from '../components/WarRoomProjections'; // <-- NOVO COMPONENTE
import MonthlyEvolution from '../components/MonthlyEvolution';
import { PerformanceCharts, SvaAnalyzer } from '../components/SalesCharts';
import SalesTable from '../components/SalesTable';

export default function PainelVendas({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [leads, setLeads] = useState([]); 
  const [myStores, setMyStores] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  const [chartClusterFilter, setChartClusterFilter] = useState('all');
  const [chartCityFilter, setChartCityFilter] = useState('all');

  const [globalGoals] = useState({ sales: 150, planos: 100, migracoes: 50, installs: 140, svas: 80 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let storesList = [];
        if (userData?.clusterId && userData.role === 'supervisor') {
          const qStore = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
          const snapStore = await getDocs(qStore);
          storesList = snapStore.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          const qStore = query(collection(db, "cities"));
          const snapStore = await getDocs(qStore);
          storesList = snapStore.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        setMyStores(storesList);

        const qHolidays = query(collection(db, "holidays"));
        const snapHols = await getDocs(qHolidays);
        setHolidays(snapHols.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (e) {
        console.error("Erro ao buscar dados básicos: ", e);
      }

      const [y, m] = selectedMonth.split('-').map(Number);
      let startYear = y;
      let startMonth = m - 5;
      if (startMonth <= 0) { startMonth += 12; startYear -= 1; }
      const startPeriod = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;

      const qLeads = query(
        collection(db, "leads"), 
        where("date", ">=", startPeriod),
        where("date", "<=", `${selectedMonth}-31`)
      );

      const unsubscribe = onSnapshot(qLeads, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        let finalData = docs;
        if (userData?.role === 'supervisor') {
           const storeNames = myStores.map(s => s.name);
           if(storeNames.length > 0) finalData = docs.filter(lead => storeNames.includes(lead.cityId));
        }
        setLeads(finalData); 
        setLoading(false);
      }, (err) => {
        console.error(err);
        setLoading(false);
      });

      return () => unsubscribe();
    };
    
    fetchData();
  }, [selectedMonth, userData]);

  const currentMonthLeads = useMemo(() => {
    return leads.filter(l => l.date && l.date.startsWith(selectedMonth));
  }, [leads, selectedMonth]);

  const getCalendarForScope = (year, month, storeId = null) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    let total = 0; let worked = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    for (let i = 1; i <= lastDay; i++) {
        const dateObj = new Date(year, month, i);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isHoliday = holidays.some(h => h.date === dateStr && (h.type === 'company' || h.type === 'national' || (h.type === 'municipal' && storeId && h.storeId === storeId)));

        if (!isHoliday) {
            total++;
            if (year < currentYear || (year === currentYear && month < currentMonth) || (year === currentYear && month === currentMonth && i <= currentDate)) {
                worked++;
            }
        }
    }
    if (year > currentYear || (year === currentYear && month > currentMonth)) worked = 0;
    return { total, worked, remaining: total - worked };
  };

  const globalCalendar = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let targetStoreId = null;
    if (chartCityFilter !== 'all') targetStoreId = myStores.find(s => s.name === chartCityFilter)?.id || null;
    return getCalendarForScope(y, m - 1, targetStoreId);
  }, [selectedMonth, holidays, chartCityFilter, myStores]);

  const uniqueClusters = useMemo(() => {
    return [...new Set(myStores.map(s => s.clusterId).filter(Boolean))];
  }, [myStores]);

  const totals = useMemo(() => {
    let p = 0, mCount = 0, i = 0, ss = 0;
    currentMonthLeads.forEach(lead => {
      const isClosed = lead.status === 'Contratado' || lead.status === 'Instalado';
      const isInstalled = lead.status === 'Instalado';
      if (isClosed && lead.leadType === 'Plano Novo') p++;
      if (isClosed && lead.leadType === 'Migração') mCount++;
      if (isInstalled && lead.leadType === 'Plano Novo') i++;
      if (isClosed && lead.leadType === 'SVA') ss++;
    });

    const today = globalCalendar.worked;
    const totalDays = globalCalendar.total;

    return { 
      planos: p, migracoes: mCount, installs: i, svas: ss, 
      projPlanos: today > 0 ? Math.floor((p / today) * totalDays) : 0, 
      projMigracoes: today > 0 ? Math.floor((mCount / today) * totalDays) : 0, 
      projInstalls: today > 0 ? Math.floor((i / today) * totalDays) : 0, 
      projSvas: today > 0 ? Math.floor((ss / today) * totalDays) : 0
    };
  }, [currentMonthLeads, globalCalendar]);

  const storeData = useMemo(() => {
    let targetStores = myStores;
    const [y, m] = selectedMonth.split('-').map(Number);
    
    if (chartClusterFilter !== 'all') targetStores = targetStores.filter(s => s.clusterId === chartClusterFilter);
    if (chartCityFilter !== 'all') targetStores = targetStores.filter(s => s.name === chartCityFilter);

    return targetStores.map(store => {
      const storeLeads = currentMonthLeads.filter(l => l.cityId === store.name);
      let p = 0, mCount = 0, i = 0, ss = 0;
      
      storeLeads.forEach(lead => {
        const isClosed = lead.status === 'Contratado' || lead.status === 'Instalado';
        const isInstalled = lead.status === 'Instalado';
        if (isClosed && lead.leadType === 'Plano Novo') p++;
        if (isClosed && lead.leadType === 'Migração') mCount++;
        if (isInstalled && lead.leadType === 'Plano Novo') i++;
        if (isClosed && lead.leadType === 'SVA') ss++;
      });

      const storeCal = getCalendarForScope(y, m - 1, store.id);
      const mockMetaPlanos = 20, mockMetaMigracoes = 10, mockMetaSva = 15;

      return {
        city: store.name,
        metaPlanos: mockMetaPlanos, salesPlanos: p, installedPlanos: i,
        metaMigracoes: mockMetaMigracoes, salesMigracoes: mCount,
        metaSVA: mockMetaSva, salesSVA: ss,
        projSales: storeCal.worked > 0 ? Math.floor((p / storeCal.worked) * storeCal.total) : 0,
      };
    }).sort((a, b) => b.salesPlanos - a.salesPlanos); 
  }, [currentMonthLeads, myStores, selectedMonth, holidays, chartClusterFilter, chartCityFilter]);

  const svaAnalysis = useMemo(() => {
    let targetStores = myStores;
    if (chartClusterFilter !== 'all') targetStores = targetStores.filter(s => s.clusterId === chartClusterFilter);
    if (chartCityFilter !== 'all') targetStores = targetStores.filter(s => s.name === chartCityFilter);

    const storeNames = targetStores.map(s => s.name);
    const svaCounts = {}; const sellerCounts = {}; const cityCounts = {};

    currentMonthLeads.forEach(lead => {
      if (storeNames.includes(lead.cityId) && lead.leadType === 'SVA' && (lead.status === 'Contratado' || lead.status === 'Instalado')) {
        const pName = lead.productName || 'Outros SVAs';
        const seller = lead.attendantName || 'Desconhecido';
        const city = lead.cityId || 'Desconhecida';

        svaCounts[pName] = (svaCounts[pName] || 0) + 1;
        sellerCounts[seller] = (sellerCounts[seller] || 0) + 1;
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }
    });

    const radarData = Object.keys(svaCounts).map(key => ({ subject: key, A: svaCounts[key], fullMark: Math.max(...Object.values(svaCounts)) + 2 })).sort((a, b) => b.A - a.A);
    const topSellers = Object.keys(sellerCounts).map(key => ({ name: key, count: sellerCounts[key] })).sort((a, b) => b.count - a.count).slice(0, 5);
    const topCities = Object.keys(cityCounts).map(key => ({ name: key, count: cityCounts[key] })).sort((a, b) => b.count - a.count).slice(0, 5);

    return { radarData, topSellers, topCities };
  }, [currentMonthLeads, myStores, chartClusterFilter, chartCityFilter]);

  return (
    <div style={styles.container}>
      
      {/* CABEÇALHO */}
      <div style={styles.newHeaderCard}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIconWrapper}>
            <TrendingUp size={32} color="#2563eb" />
          </div>
          <div>
            <h2 style={styles.newPageTitle}>Painel de Vendas</h2>
            <p style={styles.newPageSubtitle}>Visão consolidada e alimentação automática via CRM</p>
          </div>
        </div>
        
        <div style={styles.headerRight}>
          <div style={styles.rhythmBadge}>
             <div style={styles.rhythmIconBox}><CalendarClock size={20} color="#2563eb" /></div>
             <div style={{display: 'flex', flexDirection: 'column'}}>
                <span style={styles.rhythmLabel}>Ritmo do Mês</span>
                <span style={styles.rhythmValue}>
                   {globalCalendar.worked} <span style={styles.rhythmTextLight}>trab.</span> / {globalCalendar.remaining} <span style={styles.rhythmTextLight}>rest.</span>
                </span>
             </div>
          </div>
          <div style={styles.monthSelector}>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={styles.monthInput} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingText}>Sincronizando dados do CRM...</div>
      ) : (
        <>
          <div id="resumo-global" style={styles.speedometerGrid}>
            <SpeedometerCard title="Planos Novos" current={totals.planos} target={globalGoals.planos} projection={totals.projPlanos} />
            <SpeedometerCard title="Migrações" current={totals.migracoes} target={globalGoals.migracoes} projection={totals.projMigracoes} color="orange" />
            <SpeedometerCard title="Instalações" current={totals.installs} target={globalGoals.installs} projection={totals.projInstalls} color="green" />
            <SpeedometerCard title="Mix de SVA" current={totals.svas} target={globalGoals.svas} projection={totals.projSvas} color="purple" />
          </div>

          <div style={styles.chartFiltersContainer}>
            <div style={styles.chartTabs}>
              <button style={chartClusterFilter === 'all' && chartCityFilter === 'all' ? styles.chartTabActive : styles.chartTab} onClick={() => { setChartClusterFilter('all'); setChartCityFilter('all'); }}>Visão Global</button>
              {uniqueClusters.map(cluster => (
                <button key={cluster} style={chartClusterFilter === cluster && chartCityFilter === 'all' ? styles.chartTabActive : styles.chartTab} onClick={() => { setChartClusterFilter(cluster); setChartCityFilter('all'); }}>{cluster}</button>
              ))}
            </div>
            <div style={styles.chartCityFilter}>
              <Filter size={14} color="#64748b" style={{marginRight: '8px'}} />
              <select value={chartCityFilter} onChange={(e) => setChartCityFilter(e.target.value)} style={styles.chartSelect}>
                <option value="all">Ou filtre por Loja Específica...</option>
                {myStores.filter(s => chartClusterFilter === 'all' || s.clusterId === chartClusterFilter).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* NOVO COMPONENTE: SALA DE GUERRA */}
          <WarRoomProjections storeData={storeData} globalCalendar={globalCalendar} />

          <MonthlyEvolution allLeads={leads} myStores={myStores} chartClusterFilter={chartClusterFilter} chartCityFilter={chartCityFilter} />
          <PerformanceCharts storeData={storeData} />
          <SvaAnalyzer svaAnalysis={svaAnalysis} />
          <SalesTable storeData={storeData} />
        </>
      )}
    </div>
  );
}

// ESTILOS ESPECÍFICOS DO MAIN PAINEL E HEADER
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '40px', fontFamily: "'Inter', sans-serif", animation: 'fadeIn 0.5s ease-out', width: '100%' },
  newHeaderCard: { backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(226, 232, 240, 0.8)', marginBottom: '10px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  headerIconWrapper: { backgroundColor: '#eff6ff', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' },
  newPageTitle: { fontSize: '26px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  newPageSubtitle: { fontSize: '14px', fontWeight: '600', color: '#64748b', margin: '4px 0 0 0' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  rhythmBadge: { display: 'flex', alignItems: 'center', gap: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 20px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(37,99,235,0.05)' },
  rhythmIconBox: { background: 'white', padding: '6px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  rhythmLabel: { display: 'block', fontSize: '10px', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' },
  rhythmValue: { display: 'block', fontSize: '15px', fontWeight: '900', color: '#2563eb' },
  rhythmTextLight: { fontSize: '11px', fontWeight: '600', color: '#60a5fa' },
  monthSelector: { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 20px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)', height: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center' },
  monthInput: { backgroundColor: 'transparent', fontSize: '15px', fontWeight: '900', color: '#334155', border: 'none', outline: 'none', cursor: 'pointer' },
  loadingText: { textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 'bold', fontSize: '16px' },
  speedometerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', alignItems: 'stretch' },
  chartFiltersContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', padding: '15px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' },
  chartTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  chartTab: { padding: '10px 20px', borderRadius: '12px', background: 'transparent', border: '1px solid transparent', color: '#64748b', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' },
  chartTabActive: { padding: '10px 20px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', color: '#2563eb', fontSize: '13px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  chartCityFilter: { display: 'flex', alignItems: 'center', background: 'white', padding: '2px 10px', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, maxWidth: '300px' },
  chartSelect: { padding: '10px', border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer', width: '100%', background: 'transparent' },
};