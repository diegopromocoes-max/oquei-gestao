import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import {
Target, AlertTriangle, TrendingUp, Flame, Zap,
CalendarClock, Activity, Package, RefreshCw,
ChevronRight, MapPin, Globe
} from 'lucide-react';

export default function SalaDeGuerra({ userData }) {
const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
const [leads, setLeads] = useState([]);
const [myStores, setMyStores] = useState([]);
const [holidays, setHolidays] = useState([]);
const [loading, setLoading] = useState(true);

// --- CARREGAMENTO DE DADOS REAIS DO FIREBASE ---
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

    const startPeriod = selectedMonth + "-01";
    const endPeriod = selectedMonth + "-31";

    const qLeads = query(
      collection(db, "leads"), 
      where("date", ">=", startPeriod),
      where("date", "<=", endPeriod)
    );

    const snapLeads = await getDocs(qLeads);
    const docs = snapLeads.docs.map(d => ({ id: d.id, ...d.data() }));
    
    let finalData = docs;
    if (userData?.role === 'supervisor') {
       const storeNames = storesList.map(s => s.name);
       if(storeNames.length > 0) {
          finalData = docs.filter(lead => storeNames.includes(lead.cityId));
       }
    }
    setLeads(finalData); 
    
  } catch (e) {
    console.error("Erro ao buscar dados na Sala de Guerra: ", e);
  }
  setLoading(false);
};

fetchData();


}, [selectedMonth, userData]);

// --- CÁLCULOS DO CALENDÁRIO ---
const globalCalendar = useMemo(() => {
const parts = selectedMonth.split('-');
const y = parseInt(parts[0], 10);
const m = parseInt(parts[1], 10);
const lastDay = new Date(y, m, 0).getDate();
let total = 0; let worked = 0;
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();
const currentDate = now.getDate();

for (let i = 1; i <= lastDay; i++) {
    const dateObj = new Date(y, m - 1, i);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const mStr = String(m).padStart(2, '0');
    const iStr = String(i).padStart(2, '0');
    const dateStr = y + "-" + mStr + "-" + iStr;
    const isHoliday = holidays.some(h => h.date === dateStr && (h.type === 'company' || h.type === 'national'));

    if (!isHoliday) {
        total++;
        if (y < currentYear || (y === currentYear && m - 1 < currentMonth) || (y === currentYear && m - 1 === currentMonth && i <= currentDate)) {
            worked++;
        }
    }
}
if (y > currentYear || (y === currentYear && m - 1 > currentMonth)) worked = 0;
return { total, worked, remaining: total - worked };


}, [selectedMonth, holidays]);

// --- CÁLCULOS POR LOJA ---
const storeData = useMemo(() => {
return myStores.map(store => {
const storeLeads = leads.filter(l => l.cityId === store.name);

  let p = 0, mCount = 0, i = 0, ss = 0;
  
  storeLeads.forEach(lead => {
    const isClosed = lead.status === 'Contratado' || lead.status === 'Instalado';
    const isInstalled = lead.status === 'Instalado';
    
    if (isClosed && lead.leadType === 'Plano Novo') p++;
    if (isClosed && lead.leadType === 'Migração') mCount++;
    if (isClosed && lead.leadType === 'SVA') ss++;
    
    if (isInstalled && lead.leadType === 'Plano Novo') i++;
  });

  const calcProj = (val) => globalCalendar.worked > 0 ? Math.floor((val / globalCalendar.worked) * globalCalendar.total) : 0;

  return {
    city: store.name,
    planos: p, projPlanos: calcProj(p),
    migracoes: mCount, projMigracoes: calcProj(mCount),
    installs: i, projInstalls: calcProj(i),
    svas: ss, projSvas: calcProj(ss),
    totalPace: (p / (globalCalendar.worked || 1)).toFixed(1)
  };
}).sort((a, b) => b.projPlanos - a.projPlanos); 


}, [leads, myStores, globalCalendar]);

const clusterTotals = useMemo(() => {
return storeData.reduce((acc, curr) => {
acc.planos += curr.planos; acc.projPlanos += curr.projPlanos;
acc.migracoes += curr.migracoes; acc.projMigracoes += curr.projMigracoes;
acc.installs += curr.installs; acc.projInstalls += curr.projInstalls;
acc.svas += curr.svas; acc.projSvas += curr.projSvas;
return acc;
}, { planos: 0, projPlanos: 0, migracoes: 0, projMigracoes: 0, installs: 0, projInstalls: 0, svas: 0, projSvas: 0 });
}, [storeData]);

if (loading) {
return (
<div style={styles.loadingContainer}>
<Activity size={48} color="#ef4444" style={{animation: 'pulse 1.5s infinite'}} />
<h2 style={{color: 'white', marginTop: '20px'}}>A Sincronizar Radar de Vendas...</h2>
</div>
);
}

return (
<div style={styles.pageContainer}>

  <div style={styles.header}>
    <div style={styles.headerLeft}>
      <div style={styles.iconBox}><Flame size={32} color="#ef4444" /></div>
      <div>
        <h1 style={styles.title}>Sala de Guerra</h1>
        <p style={styles.subtitle}>Radar de Projeções e Fechamento (Regional <span style={{textTransform:'uppercase', color:'#f8fafc', fontWeight:'bold'}}>{userData?.clusterId || 'Geral'}</span>)</p>
      </div>
    </div>

    <div style={styles.headerRight}>
      <div style={styles.rhythmBadge}>
         <div style={styles.rhythmIconBox}><CalendarClock size={20} color="#f8fafc" /></div>
         <div style={{display: 'flex', flexDirection: 'column'}}>
            <span style={styles.rhythmLabel}>Dias Úteis (Mês)</span>
            <span style={styles.rhythmValue}>
               {globalCalendar.worked} <span style={styles.rhythmTextLight}>passados</span> / {globalCalendar.remaining} <span style={styles.rhythmTextLight}>restantes</span>
            </span>
         </div>
      </div>
      <div style={styles.monthSelector}>
        <input 
          type="month" 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)} 
          style={styles.monthInput} 
        />
      </div>
    </div>
  </div>

  <h3 style={styles.sectionTitle}><Globe size={20} color="#3b82f6"/> Visão Global da Regional</h3>
  <div style={styles.clusterGrid}>
    <ClusterMetricCard title="Vendas (Planos Novos)" current={clusterTotals.planos} projected={clusterTotals.projPlanos} icon={TrendingUp} themeColor="#3b82f6" />
    <ClusterMetricCard title="Instalações" current={clusterTotals.installs} projected={clusterTotals.projInstalls} icon={Zap} themeColor="#10b981" />
    <ClusterMetricCard title="Migrações" current={clusterTotals.migracoes} projected={clusterTotals.projMigracoes} icon={RefreshCw} themeColor="#f59e0b" />
    <ClusterMetricCard title="SVAs e Serviços" current={clusterTotals.svas} projected={clusterTotals.projSvas} icon={Package} themeColor="#8b5cf6" />
  </div>

  <h3 style={{...styles.sectionTitle, marginTop: '40px'}}><MapPin size={20} color="#ef4444"/> Desempenho e Projeção por Loja</h3>
  <div style={styles.citiesGrid}>
    {storeData.map((store, index) => (
      <div key={index} style={styles.cityCard}>
        <div style={styles.cityCardHeader}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <div style={styles.rankBadge}>{index + 1}</div>
            <h4 style={styles.cityName}>{store.city}</h4>
          </div>
          <div style={styles.paceBadge}>
            {store.totalPace} vendas/dia
          </div>
        </div>

        <div style={styles.cityMetricsGrid}>
          <CityMetricRow label="Vendas" icon={TrendingUp} current={store.planos} proj={store.projPlanos} themeColor="#3b82f6" />
          <CityMetricRow label="Instalado" icon={Zap} current={store.installs} proj={store.projInstalls} themeColor="#10b981" />
          <CityMetricRow label="Migração" icon={RefreshCw} current={store.migracoes} proj={store.projMigracoes} themeColor="#f59e0b" />
          <CityMetricRow label="SVA" icon={Package} current={store.svas} proj={store.projSvas} themeColor="#8b5cf6" />
        </div>
      </div>
    ))}
    {storeData.length === 0 && (
      <p style={{color: '#94a3b8', fontStyle: 'italic', gridColumn: '1 / -1'}}>Nenhuma loja ou venda encontrada.</p>
    )}
  </div>

</div>


);
}

// --- SUB-COMPONENTES VISUAIS ---

const ClusterMetricCard = ({ title, current, projected, icon: Icon, themeColor }) => (

<div style={styles.clusterCard}>
<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
<div>
<span style={styles.clusterCardLabel}>{title}</span>
<div style={{display:'flex', alignItems:'baseline', gap:'8px', marginTop:'5px'}}>
<span style={styles.clusterCardCurrent}>{current}</span>
<span style={styles.clusterCardText}>realizados</span>
</div>
</div>
<div style={{padding:'12px', borderRadius:'12px', backgroundColor: themeColor + '20', color: themeColor}}>
<Icon size={24} />
</div>
</div>
<div style={styles.projectionBox}>
<span style={{fontSize:'12px', color:'#94a3b8', fontWeight:'bold', textTransform:'uppercase'}}>Projeção Fim do Mês</span>
<span style={{fontSize:'22px', fontWeight:'900', color: themeColor}}>{projected}</span>
</div>
</div>
);

const CityMetricRow = ({ label, icon: Icon, current, proj, themeColor }) => (

<div style={styles.cityMetricRow}>
<div style={{display:'flex', alignItems:'center', gap:'8px'}}>
<Icon size={14} color={themeColor} />
<span style={styles.cityMetricLabel}>{label}</span>
</div>
<div style={styles.cityMetricValues}>
<span style={styles.cityCurrentValue}>{current}</span>
<ChevronRight size={12} color="#475569" />
<span style={{fontSize: '16px', fontWeight: '900', color: themeColor}}>{proj}</span>
</div>
</div>
);

// --- ESTILOS DO PAINEL (TEMA ESCURO - WAR ROOM) ---
const styles = {
pageContainer: {
background: '#0f172a',
minHeight: '100vh',
padding: '40px',
color: 'white',
fontFamily: "'Inter', sans-serif",
animation: 'fadeIn 0.5s ease-out'
},
loadingContainer: {
background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column',
alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif"
},
header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #1e293b' },
headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
iconBox: { background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' },
title: { fontSize: '32px', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f8fafc' },
subtitle: { fontSize: '15px', color: '#94a3b8', margin: '5px 0 0 0' },
headerRight: { display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' },
rhythmBadge: { display: 'flex', alignItems: 'center', gap: '12px', background: '#1e293b', border: '1px solid #334155', padding: '12px 20px', borderRadius: '16px' },
rhythmIconBox: { background: '#334155', padding: '8px', borderRadius: '10px' },
rhythmLabel: { display: 'block', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' },
rhythmValue: { display: 'block', fontSize: '16px', fontWeight: '900', color: '#f8fafc' },
rhythmTextLight: { fontSize: '11px', fontWeight: '600', color: '#64748b' },
monthSelector: { backgroundColor: '#1e293b', border: '1px solid #334155', padding: '15px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center' },
monthInput: { backgroundColor: 'transparent', fontSize: '16px', fontWeight: '900', color: '#f8fafc', border: 'none', outline: 'none', cursor: 'pointer', colorScheme: 'dark' },
sectionTitle: { fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
clusterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' },
clusterCard: { background: '#1e293b', padding: '25px', borderRadius: '20px', border: '1px solid #334155', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
clusterCardLabel: { fontSize: '13px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
clusterCardCurrent: { fontSize: '36px', fontWeight: '900', color: 'white', margin: 0, lineHeight: 1 },
clusterCardText: { fontSize: '12px', color: '#64748b', fontWeight: '600' },
projectionBox: { marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
citiesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
cityCard: { background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
cityCardHeader: { padding: '20px', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
rankBadge: { width: '28px', height: '28px', borderRadius: '8px', background: '#334155', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '12px' },
cityName: { fontSize: '16px', fontWeight: 'bold', color: 'white', margin: 0 },
paceBadge: { fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', background: '#0f172a', padding: '4px 8px', borderRadius: '6px', border: '1px solid #334155' },
cityMetricsGrid: { padding: '10px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' },
cityMetricRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' },
cityMetricLabel: { fontSize: '13px', fontWeight: '600', color: '#cbd5e1' },
cityMetricValues: { display: 'flex', alignItems: 'center', gap: '10px' },
cityCurrentValue: { fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }
};

const styleSheet = document.createElement("style");
styleSheet.innerText = "@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }";
document.head.appendChild(styleSheet);