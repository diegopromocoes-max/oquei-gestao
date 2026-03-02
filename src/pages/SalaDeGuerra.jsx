import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase'; // Usando a sua configuração original
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
  TrendingUp, Flame, Zap, CalendarClock, Package, 
  RefreshCw, ChevronRight, MapPin, Globe, Calendar, 
  BarChart3, Target, AlertTriangle
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global, colors } from '../styles/globalStyles';

export default function SalaDeGuerra({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [leads, setLeads] = useState([]);
  const [myStores, setMyStores] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. CARREGAMENTO DE DADOS COM FILTRAGEM EM MEMÓRIA (Evita erros de Permissão/Índice)
  useEffect(() => {
    setLoading(true);

    // Referências das coleções (Caminhos do seu Banco de Dados)
    const citiesRef = collection(db, 'cities');
    const leadsRef = collection(db, 'leads');
    const holidaysRef = collection(db, 'holidays');

    // Escuta Lojas
    const unsubCities = onSnapshot(citiesRef, (snap) => {
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filtragem por cluster feita no JavaScript para máxima compatibilidade
      if (userData?.role === 'supervisor' && userData?.clusterId) {
        list = list.filter(s => s.clusterId === userData.clusterId);
      }
      setMyStores(list);
    }, (err) => console.error("Erro ao carregar lojas:", err));

    // Escuta Leads (Busca a coleção inteira para filtrar no JS e evitar erro de índice)
    const unsubLeads = onSnapshot(leadsRef, (snap) => {
      const allLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeads(allLeads);
      setLoading(false);
    }, (err) => console.error("Erro ao carregar vendas:", err));

    // Escuta Feriados
    const unsubHols = onSnapshot(holidaysRef, (snap) => {
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Erro ao carregar feriados:", err));

    return () => {
      unsubCities();
      unsubLeads();
      unsubHols();
    };
  }, [selectedMonth, userData]);

  // --- CÁLCULOS DO CALENDÁRIO COMERCIAL (DINÂMICO) ---
  const globalCalendar = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    let total = 0; let worked = 0;
    const now = new Date();

    for (let i = 1; i <= lastDay; i++) {
      const dateObj = new Date(year, month - 1, i);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Pula finais de semana

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isHoliday = holidays.some(h => h.date === dateStr);

      if (!isHoliday) {
        total++;
        // Define o limite do dia como final da tarde para contagem de dias passados
        const checkDate = new Date(year, month - 1, i);
        checkDate.setHours(23, 59, 59);
        if (checkDate <= now) worked++;
      }
    }
    return { total, worked, remaining: total - worked };
  }, [selectedMonth, holidays]);

  // --- PROCESSAMENTO DAS MÉTRICAS POR LOJA ---
  const storeData = useMemo(() => {
    const startPeriod = selectedMonth + "-01";
    const endPeriod = selectedMonth + "-31";
    
    // Filtragem por mês em memória
    const monthLeads = leads.filter(l => l.date >= startPeriod && l.date <= endPeriod);

    return myStores.map(store => {
      // Cruzamento flexível: aceita cityId como Nome ou como ID da cidade
      const storeLeads = monthLeads.filter(l => l.cityId === store.name || l.cityId === store.id);
      
      let p = 0, mCount = 0, i = 0, ss = 0;
      storeLeads.forEach(lead => {
        const isClosed = lead.status === 'Contratado' || lead.status === 'Instalado';
        if (isClosed && lead.leadType === 'Plano Novo') p++;
        if (isClosed && lead.leadType === 'Migração') mCount++;
        if (isClosed && lead.leadType === 'SVA') ss++;
        if (lead.status === 'Instalado' && lead.leadType === 'Plano Novo') i++;
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
    }).sort((a, b) => b.planos - a.planos);
  }, [leads, myStores, globalCalendar, selectedMonth]);

  const clusterTotals = useMemo(() => {
    return storeData.reduce((acc, curr) => {
      acc.p += curr.planos; acc.pp += curr.projPlanos;
      acc.i += curr.installs; acc.pi += curr.projInstalls;
      return acc;
    }, { p: 0, pp: 0, i: 0, pi: 0 });
  }, [storeData]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '20px' }}>
      <RefreshCw size={32} color="var(--text-muted)" className="animate-spin" />
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Sincronizando Radar de Vendas...</span>
    </div>
  );

  return (
    <div style={global.container}>
      
      {/* HEADER TÁTICO */}
      <div style={global.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{...global.iconHeader, background: colors.danger}}><Flame size={28} color="white" /></div>
          <div>
            <h1 style={global.title}>Sala de Guerra</h1>
            <p style={global.subtitle}>Radar de Projeções (Cluster {userData?.clusterId || 'Geral'})</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <div style={local.rhythmBadge}>
             <CalendarClock size={18} color="var(--text-brand)" />
             <div style={{display: 'flex', flexDirection: 'column'}}>
                <span style={{fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase'}}>Progresso Mensal</span>
                <span style={{fontSize: '13px', fontWeight: '800', color: 'var(--text-main)'}}>
                   {globalCalendar.worked}/{globalCalendar.total} <span style={{fontSize: '10px', color: 'var(--text-muted)'}}>({globalCalendar.remaining} rest.)</span>
                </span>
             </div>
          </div>
          <div style={global.searchBox}>
            <Calendar size={18} color="var(--text-muted)" />
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={global.searchInput} />
          </div>
        </div>
      </div>

      {/* KPIS TOTAIS DA REGIONAL */}
      <div style={global.grid4}>
        <ClusterCard title="Vendas (Contratos)" current={clusterTotals.p} projected={clusterTotals.pp} icon={TrendingUp} color="#3b82f6" />
        <ClusterCard title="Instalações" current={clusterTotals.i} projected={clusterTotals.pi} icon={Zap} color="#10b981" />
      </div>

      <h3 style={{...global.sectionTitle, marginTop: '40px'}}><MapPin size={20} color="#ef4444"/> Performance por Loja</h3>
      
      <div style={local.citiesGrid}>
        {storeData.map((store, idx) => (
          <div key={idx} style={global.card}>
            <div style={local.cityHeader}>
              <div style={local.rank}>{idx + 1}</div>
              <h4 style={{fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0}}>{store.city}</h4>
              <div style={local.pace}>{store.totalPace} v/dia</div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <MetricRow label="Vendas" current={store.planos} proj={store.projPlanos} color="#3b82f6" icon={TrendingUp} />
              <MetricRow label="Instalado" current={store.installs} proj={store.projInstalls} color="#10b981" icon={Zap} />
              <MetricRow label="Migrações" current={store.migracoes} proj={store.projMigracoes} color="#f59e0b" icon={RefreshCw} />
              <MetricRow label="Mix SVA" current={store.svas} proj={store.projSvas} color="#8b5cf6" icon={Package} />
            </div>
          </div>
        ))}
        {storeData.length === 0 && (
          <div style={{...global.emptyState, gridColumn: '1 / -1'}}>Nenhuma loja ativa encontrada para este Cluster.</div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

const ClusterCard = ({ title, current, projected, icon: Icon, color }) => (
  <div style={global.card}>
    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
      <span style={{fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase'}}>{title}</span>
      <Icon size={20} color={color} />
    </div>
    <div style={{display: 'flex', alignItems: 'baseline', gap: '10px'}}>
      <span style={{fontSize: '32px', fontWeight: '900', color: 'var(--text-main)'}}>{current}</span>
      <span style={{fontSize: '14px', color: 'var(--text-muted)'}}>de {projected} (Proj)</span>
    </div>
    <div style={{width: '100%', height: '6px', background: 'var(--bg-app)', borderRadius: '3px', marginTop: '15px', overflow: 'hidden'}}>
      <div style={{width: `${Math.min((current/projected)*100 || 0, 100)}%`, height: '100%', background: color, transition: '1s'}} />
    </div>
  </div>
);

const MetricRow = ({ label, current, proj, color, icon: Icon }) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-app)', borderRadius: '10px'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
      <Icon size={14} color={color} />
      <span style={{fontSize: '13px', fontWeight: '700', color: 'var(--text-main)'}}>{label}</span>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
      <span style={{fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)'}}>{current}</span>
      <ChevronRight size={12} color="var(--border)" />
      <span style={{fontSize: '16px', fontWeight: '900', color: color}}>{proj}</span>
    </div>
  </div>
);

const local = {
  rhythmBadge: { display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '14px', boxShadow: 'var(--shadow-sm)' },
  citiesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  cityHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' },
  rank: { width: '24px', height: '24px', borderRadius: '6px', background: 'var(--bg-panel)', color: 'var(--text-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900' },
  pace: { marginLeft: 'auto', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-brand)', background: 'var(--bg-primary-light)', padding: '2px 8px', borderRadius: '4px' }
};