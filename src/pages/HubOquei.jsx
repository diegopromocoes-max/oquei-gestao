import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, where, onSnapshot, limit } from 'firebase/firestore';
import { 
  Activity, TrendingDown, TrendingUp, Target, Crosshair, Users, 
  X, Calendar, Zap, Share2, Headset, ShieldAlert, AlertTriangle, 
  Layers, Trophy, Map, ShieldCheck, Flame, ChevronRight, 
  BarChart3, Info, MapPin, Layout, Globe, Filter, Server, Bell,
  Clock, Award, Radar 
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function HubOquei({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  
  // Abas e visualizações
  const [activeTab, setActiveTab] = useState('radar'); 
  const [mapMode, setMapMode] = useState('panel'); 
  
  const [cityMetrics, setCityMetrics] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);

  // Filtros Safras
  const [safraFilterCluster, setSafraFilterCluster] = useState('all');
  const [safraFilterCity, setSafraFilterCity] = useState('all');

  // Estado: Feed Live
  const [liveLeads, setLiveLeads] = useState([]);

  // --- 1. CARREGAMENTO DE CIDADES E DADOS ---
  useEffect(() => {
    setLoading(true);

    const fetchRealData = async () => {
      try {
        let qCities = query(collection(db, "cities"));
        if (userData?.role === 'supervisor' && userData?.clusterId) {
          qCities = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
        }
        const snapCities = await getDocs(qCities);
        const citiesList = snapCities.docs.map(d => ({ id: d.id, ...d.data() }));

        let leadsList = [];
        try {
          const qLeads = query(collection(db, "leads")); 
          const snapLeads = await getDocs(qLeads);
          leadsList = snapLeads.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => {
            if (!l.date) return false;
            return l.date.startsWith(selectedMonth);
          });
        } catch (errLeads) {
          console.warn("Erro ao ler leads: ", errLeads);
        }

        if (citiesList.length > 0) {
          const metrics = citiesList.map(city => {
            const cityLeads = leadsList.filter(l => l.cityId === city.name || l.cityId === city.id);
            const sales = cityLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
            const cancels = cityLeads.filter(l => l.status === 'Descartado' || l.status === 'Cancelado').length;
            
            return {
              id: city.id,
              city: city.name || city.id || 'Unidade Desconhecida',
              clusterId: city.clusterId || 'Sem Regional',
              lat: city.lat,
              lon: city.lon,
              hps: Number(city.hps) || 0,
              baseStart: Number(city.baseStart) || 0,
              targetNetAdds: Number(city.targetNetAdds) || 0,
              channels: { loja: sales, pap: 0, digital: 0, b2b: 0 }, 
              cancelReasons: { concorrencia: cancels, tecnico: 0, mudanca: 0, financeiro: 0, outros: 0 },
              realData: true
            };
          });
          setCityMetrics(metrics);
        }
      } catch (err) {
        console.error("Erro ao montar o painel: ", err);
      }
      setLoading(false);
    };

    fetchRealData();
  }, [selectedMonth, userData]);

  // --- 2. ESCUTA EM TEMPO REAL ---
  useEffect(() => {
    const qLive = query(collection(db, "leads"), limit(100));
    const unsub = onSnapshot(qLive, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      const filteredDocs = userData?.role === 'supervisor' 
        ? docs.filter(lead => lead.clusterId === userData.clusterId)
        : docs;
      setLiveLeads(filteredDocs);
    }, (error) => console.warn("Aguardando feed de leads..."));
    
    return () => unsub();
  }, [userData]);

  // ESTATÍSTICAS E RANKINGS (Memoized)
  const liveStats = useMemo(() => {
    const total = liveLeads.length;
    const emTratativa = liveLeads.filter(l => l.status === 'Novo' || l.status === 'Em Negociação').length;
    const agendados = liveLeads.filter(l => l.status === 'Agendado' || l.status === 'Contrato Assinado').length;
    const instalados = liveLeads.filter(l => l.status === 'Instalado' || l.status === 'Ativo').length;
    const conversao = total > 0 ? (((agendados + instalados) / total) * 100).toFixed(1) : 0;
    return { total, emTratativa, agendados, conversao };
  }, [liveLeads]);

  const liveRanking = useMemo(() => {
    const vendedores = {};
    liveLeads.forEach(lead => {
      if (['Agendado', 'Contrato Assinado', 'Instalado', 'Ativo'].includes(lead.status)) {
        const nome = lead.attendantName || 'Vendedor Oculto';
        if (!vendedores[nome]) vendedores[nome] = { nome, vendas: 0 };
        vendedores[nome].vendas += 1;
      }
    });
    return Object.values(vendedores).sort((a, b) => b.vendas - a.vendas).slice(0, 5);
  }, [liveLeads]);

  const processedData = useMemo(() => {
    return cityMetrics.map(city => {
      const totalSales = Object.values(city.channels).reduce((a, b) => a + b, 0);
      const cancelations = Object.values(city.cancelReasons).reduce((a, b) => a + b, 0);
      const netAdds = totalSales - cancelations;
      const currentBase = city.baseStart + netAdds;
      const churnRate = city.baseStart > 0 ? ((cancelations / city.baseStart) * 100).toFixed(1) : 0;
      const penetration = city.hps > 0 ? ((currentBase / city.hps) * 100).toFixed(1) : 0;
      let health = netAdds < 0 ? 'red' : (netAdds < city.targetNetAdds ? 'yellow' : 'green');
      const targetProgress = city.targetNetAdds > 0 ? Math.min(Math.max((netAdds / city.targetNetAdds) * 100, 0), 100) : 0;
      return { ...city, totalSales, cancelations, netAdds, currentBase, churnRate, penetration, health, targetProgress };
    });
  }, [cityMetrics]);

  const globalKpis = useMemo(() => {
    let totalBase = 0, totalGross = 0, totalNet = 0, totalTarget = 0;
    processedData.forEach(c => {
      totalBase += c.currentBase; totalGross += c.totalSales; totalNet += c.netAdds; totalTarget += c.targetNetAdds;
    });
    return { totalBase, totalGross, totalNet, totalTarget };
  }, [processedData]);

  const activeAlerts = useMemo(() => {
    const alerts = [];
    processedData.forEach(city => {
      if (city.health === 'red') alerts.push({ id: city.id + '1', type: 'danger', city: city.city, title: 'Crescimento Negativo', text: `Saldo Net negativo: ${city.netAdds}.` });
      if (parseFloat(city.churnRate) > 2) alerts.push({ id: city.id + '2', type: 'warning', city: city.city, title: 'Evasão Alta', text: `Churn em ${city.churnRate}%.` });
    });
    return alerts;
  }, [processedData]);

  const availableClusters = [...new Set(processedData.map(c => c.clusterId))];
  const availableCities = processedData.filter(c => safraFilterCluster === 'all' || c.clusterId === safraFilterCluster);

  // --- RENDER VIEWS ---
  const RadarView = () => (
    <div style={local.tabContent}>
      <div style={local.kpiGlobalGrid}>
        <div className="animated-card" style={local.kpiGlobalCard}>
          <div style={local.kpiGlobalIconWrapper}><Users size={24} color={colors.primary} /></div>
          <div><span style={local.kpiGlobalLabel}>Base Total</span><strong style={local.kpiGlobalValue}>{globalKpis.totalBase.toLocaleString('pt-BR')}</strong></div>
        </div>
        <div className="animated-card" style={local.kpiGlobalCard}>
          <div style={{...local.kpiGlobalIconWrapper, background: `${colors.success}15`}}><TrendingUp size={24} color={colors.success} /></div>
          <div><span style={local.kpiGlobalLabel}>Vendas Mês</span><strong style={local.kpiGlobalValue}>{globalKpis.totalGross}</strong></div>
        </div>
        <div className="animated-card" style={{...local.kpiGlobalCard, border: `1px solid ${globalKpis.totalNet >= 0 ? colors.success : colors.danger}`}}>
          <div style={{...local.kpiGlobalIconWrapper, background: globalKpis.totalNet >= 0 ? `${colors.success}15` : `${colors.danger}15`}}>
            <Target size={24} color={globalKpis.totalNet >= 0 ? colors.success : colors.danger} />
          </div>
          <div><span style={local.kpiGlobalLabel}>Net Adds vs Meta</span><div style={{display:'flex', alignItems:'baseline', gap:'8px'}}><strong style={{...local.kpiGlobalValue, color: globalKpis.totalNet >= 0 ? colors.success : colors.danger}}>{globalKpis.totalNet > 0 ? '+' : ''}{globalKpis.totalNet}</strong><span style={{fontSize:'14px', color:'var(--text-muted)', fontWeight:'bold'}}>/ {globalKpis.totalTarget}</span></div></div>
        </div>
      </div>
      <div style={local.gridRadar}>
        {processedData.map((city, index) => (
          <div key={city.id} className="animated-card" onClick={() => setSelectedCity(city)} style={{...local.cityCard, borderColor: selectedCity?.id === city.id ? colors.primary : 'var(--border)'}}>
            <div style={local.cityCardHeader}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}><div style={{...local.statusDot, background: city.health === 'green' ? colors.success : city.health === 'yellow' ? colors.warning : colors.danger}} /><span style={local.cityName}>{city.city}</span></div>
              <span style={local.badge}>{city.penetration}% HPs</span>
            </div>
            <div style={{marginBottom: '20px'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', marginBottom:'6px', textTransform:'uppercase'}}><span>Progresso Meta</span><span>{city.targetProgress.toFixed(0)}%</span></div>
              <div style={{width:'100%', height:'8px', background:'var(--bg-app)', borderRadius:'4px', overflow:'hidden'}}><div style={{width: `${city.targetProgress}%`, height:'100%', background: city.health === 'green' ? colors.success : city.health === 'yellow' ? colors.warning : colors.danger}} /></div>
            </div>
            <div style={local.cardKpiGrid}>
               <div style={local.kpiBox}><span style={local.kpiBoxLabel}>Vendas</span><strong style={local.kpiBoxValue}>{city.totalSales}</strong></div>
               <div style={local.kpiBox}><span style={local.kpiBoxLabel}>Churn</span><strong style={local.kpiBoxValue}>{city.cancelations}</strong></div>
               <div style={local.kpiBox}><span style={local.kpiBoxLabel}>Net</span><strong style={{...local.kpiBoxValue, color: city.netAdds >= 0 ? colors.success : colors.danger}}>{city.netAdds > 0 ? '+' : ''}{city.netAdds}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return <div style={local.loadingContainer}><Activity size={48} color={colors.primary} className="animate-spin" /></div>;

  return (
    <div style={{...global.container, position: 'relative'}}>
      {/* ── UNIFIED HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '24px',
        padding: '24px 32px', marginBottom: '30px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '20px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.info})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 20px ${colors.primary}40`,
          }}>
            <Radar size={28} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Hub Oquei Radar</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>S&OP, Geomarketing e Performance Estratégica</div>
          </div>
        </div>
        
        {/* Month Selector inside Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', padding: '10px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <Calendar size={16} color="var(--text-muted)" />
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={local.monthInputSmall} />
        </div>
      </div>

      {/* NAVIGATION BAR */}
      <div style={local.navBar}>
        <button onClick={() => setActiveTab('radar')} style={activeTab === 'radar' ? local.navBtnActive : local.navBtn}><Crosshair size={16}/> S&OP Regional</button>
        <button onClick={() => setActiveTab('live')} style={activeTab === 'live' ? local.navBtnActive : local.navBtn}><Zap size={16}/> Operação Live</button>
        <button onClick={() => setActiveTab('alertas')} style={activeTab === 'alertas' ? local.navBtnActive : local.navBtn}>
          <Bell size={16}/> Alertas {activeAlerts.length > 0 && <span style={local.alertCount}>{activeAlerts.length}</span>}
        </button>
        <button onClick={() => setActiveTab('geo')} style={activeTab === 'geo' ? local.navBtnActive : local.navBtn}><Map size={16}/> Zonas de Calor</button>
        <button onClick={() => setActiveTab('safras')} style={activeTab === 'safras' ? local.navBtnActive : local.navBtn}><Layers size={16}/> Safras</button>
      </div>

      <div style={{marginTop: '30px', paddingBottom: '40px'}}>
        {activeTab === 'radar' && <RadarView />}
        {activeTab === 'live' && <div>{/* Live View Content */}</div>}
        {activeTab === 'alertas' && <div>{/* Alerts View Content */}</div>}
        {activeTab === 'geo' && <div>{/* Geo View Content */}</div>}
        {activeTab === 'safras' && <div>{/* Safras View Content */}</div>}
      </div>
    </div>
  );
}

// STYLES
const local = {
  loadingContainer: { display:'flex', alignItems:'center', justifyContent:'center', height:'400px' },
  monthInputSmall: { background: 'transparent', border: 'none', color: 'var(--text-main)', outline:'none', fontWeight:'900', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' },
  navBar: { display: 'flex', gap: '8px', background: 'var(--bg-panel)', padding: '8px', borderRadius: '18px', width: 'fit-content', border: '1px solid var(--border)' },
  navBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '10px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', borderRadius:'14px', fontSize: '13px' },
  navBtnActive: { background: 'var(--bg-card)', border: '1px solid var(--border)', color: colors.primary, padding: '10px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', borderRadius:'14px', boxShadow:'var(--shadow-sm)' },
  alertCount: { background: colors.danger, color: '#fff', padding: '2px 7px', borderRadius: '10px', fontSize: '10px', marginLeft: '4px' },
  tabContent: { animation: 'fadeIn 0.4s ease' },
  kpiGlobalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' },
  kpiGlobalCard: { background: 'var(--bg-card)', padding: '24px', borderRadius: '22px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: 'var(--shadow-sm)' },
  kpiGlobalIconWrapper: { padding: '16px', borderRadius: '16px', background: `${colors.primary}10` },
  kpiGlobalLabel: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' },
  kpiGlobalValue: { fontSize: '30px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 },
  gridRadar: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' },
  cityCard: { background: 'var(--bg-card)', padding: '28px', borderRadius: '24px', border: '2px solid var(--border)', cursor: 'pointer', transition: '0.2s' },
  cityCardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
  cityName: { fontSize: '19px', fontWeight: '900', color: 'var(--text-main)' },
  statusDot: { width: '12px', height: '12px', borderRadius: '50%' },
  badge: { background: 'var(--bg-panel)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', padding: '5px 10px', borderRadius: '10px', border: '1px solid var(--border)' },
  cardKpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' },
  kpiBox: { textAlign: 'center' },
  kpiBoxLabel: { fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' },
  kpiBoxValue: { fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }
};