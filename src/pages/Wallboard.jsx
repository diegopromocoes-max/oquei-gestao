// ============================================================
//  Wallboard.jsx — Oquei Gestão  (Sprint 2 — refatorado)
//  Modo TV: Centro de Comando em tela cheia.
//  Responsabilidades: estado, efeitos, dados mock, layout raiz.
//  UI delegada para: wallboard/WallboardModules + WallboardCharts.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Clock, ChevronDown, ChevronUp, Flame, Play, Pause, X } from 'lucide-react';
import { styles } from './wallboard/WallboardStyles';
import { Mod1Operacao, Mod2Vendas, Mod3Churn, Mod4Expansion } from './wallboard/WallboardModules';

// ─── Dados mock (TV Mode — sem Firebase) ─────────────────────────────────────
const RH_DATA = {
  lojasAbertas: 4, lojasFechadas: 0,
  atendentesTrabalhando: 18, atendentesAtestado: 2,
  topPositivo: [
    { name: 'Ana Costa',    hours: '+12:30' },
    { name: 'João Pedro',   hours: '+08:15' },
    { name: 'Marcos Silva', hours: '+05:40' },
  ],
  topNegativo: [
    { name: 'Beatriz Lima',  hours: '-09:20' },
    { name: 'Carlos Santos', hours: '-04:10' },
    { name: 'Felipe Dias',   hours: '-02:00' },
  ],
};

const SALES_DATA = {
  cluster: { sales: 120, salesGoal: 150, installs: 95, installsGoal: 120, backlog: 25 },
  cities: [
    { name: 'Bady Bassitt', sales: 45, salesGoal: 50,  installs: 38, installsGoal: 45, backlog: 7 },
    { name: 'Borborema',    sales: 30, salesGoal: 40,  installs: 25, installsGoal: 35, backlog: 5 },
    { name: 'Nova Granada', sales: 25, salesGoal: 30,  installs: 20, installsGoal: 25, backlog: 5 },
    { name: 'Nova Aliança', sales: 20, salesGoal: 30,  installs: 12, installsGoal: 15, backlog: 8 },
  ],
  topSellers: [
    { id: 1, name: 'Mariana Silva', store: 'Loja Centro',    sales: 45 },
    { id: 2, name: 'João Pedro',    store: 'Quiosque Norte', sales: 38 },
    { id: 3, name: 'Ana Costa',     store: 'PAP Bady',       sales: 34 },
    { id: 4, name: 'Carlos Santos', store: 'Loja Sul',       sales: 29 },
    { id: 5, name: 'Beatriz Lima',  store: 'Central',        sales: 25 },
  ],
};

const CHURN_DATA = {
  clusterGrowth: '+45',
  cities: [
    { name: 'Bady Bassitt', growth: '+20' },
    { name: 'Borborema',    growth: '+12' },
    { name: 'Nova Granada', growth: '+15' },
    { name: 'Nova Aliança', growth: '-2'  },
  ],
  penetrationEvolution: [
    { month: 'Set', 'Bady Bassitt': 22, Borborema: 15, 'Nova Granada': 18, 'Nova Aliança': 40 },
    { month: 'Out', 'Bady Bassitt': 23, Borborema: 16, 'Nova Granada': 19, 'Nova Aliança': 40 },
    { month: 'Nov', 'Bady Bassitt': 25, Borborema: 18, 'Nova Granada': 20, 'Nova Aliança': 39 },
    { month: 'Dez', 'Bady Bassitt': 28, Borborema: 20, 'Nova Granada': 22, 'Nova Aliança': 38 },
    { month: 'Jan', 'Bady Bassitt': 32, Borborema: 23, 'Nova Granada': 25, 'Nova Aliança': 37 },
    { month: 'Fev', 'Bady Bassitt': 35, Borborema: 26, 'Nova Granada': 28, 'Nova Aliança': 36 },
  ],
  churnReasons: [
    { name: 'Preço',        value: 40, gradId: 'neon-orange' },
    { name: 'Concorrência', value: 30, gradId: 'neon-purple' },
    { name: 'Qualidade',    value: 15, gradId: 'neon-cyan'   },
    { name: 'Financeiro',   value: 15, gradId: 'neon-cyan'   },
    { name: 'Mudança',      value: 10, gradId: 'neon-green'  },
    { name: 'Outros',       value: 5,  gradId: 'neon-gray'   },
  ],
};

const MEGA_DATA_RAW = [
  { city: 'Bady Bassitt',    cluster: 'Regional Norte',   baseStart: 1200, netAdds:  20 },
  { city: 'Borborema',       cluster: 'Regional Norte',   baseStart: 850,  netAdds:  12 },
  { city: 'Nova Granada',    cluster: 'Regional Sul',     baseStart: 950,  netAdds:  15 },
  { city: 'Nova Aliança',    cluster: 'Regional Sul',     baseStart: 1700, netAdds: -15 },
  { city: 'Sales',           cluster: 'Regional Leste',   baseStart: 500,  netAdds:   0 },
  { city: 'Urupês',          cluster: 'Regional Leste',   baseStart: 600,  netAdds:  -5 },
  { city: 'S. J. Rio Preto', cluster: 'Regional Central', baseStart: 3500, netAdds:  45 },
  { city: 'Mirassol',        cluster: 'Regional Central', baseStart: 1100, netAdds:   8 },
].map(d => ({
  ...d,
  currentBase: d.baseStart + d.netAdds,
  gradId:     d.netAdds > 0 ? 'url(#neon-green)' : d.netAdds < 0 ? 'url(#neon-orange)' : 'url(#neon-cyan)',
  solidColor: d.netAdds > 0 ? '#0ba360'          : d.netAdds < 0 ? '#f83600'            : '#00f2fe',
}));

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Wallboard({ userData, onExit }) {
  const scrollRef = useRef(null);

  const [currentTime,       setCurrentTime]       = useState(new Date());
  const [autoScroll,        setAutoScroll]        = useState(false);
  const [latestSale,        setLatestSale]        = useState(null);
  const [collapsed, setCollapsed] = useState({ operacao: false, vendas: false, churn: false, mega: false });
  const [megaFilterCluster, setMegaFilterCluster] = useState('all');
  const [megaFilterCity,    setMegaFilterCity]    = useState('all');

  // Relógio
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Scroll automático
  useEffect(() => {
    if (!autoScroll) return;
    const id = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ top: 1, behavior: 'auto' });
      }
    }, 30);
    return () => clearInterval(id);
  }, [autoScroll]);

  // Breaking news aleatório
  useEffect(() => {
    const names  = ['Mariana', 'João', 'Ana', 'Carlos', 'Beatriz', 'Felipe', 'Amanda'];
    const cities = ['Centro', 'Bady Bassitt', 'Borborema', 'Nova Granada', 'PAP'];
    const id = setInterval(() => {
      const name = names[Math.floor(Math.random() * names.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      setLatestSale(`${name} fechou uma venda de 600MB em ${city}! 🚀`);
      setTimeout(() => setLatestSale(null), 5000);
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const toggleModule = (mod) => setCollapsed(prev => ({ ...prev, [mod]: !prev[mod] }));

  const hour      = currentTime.getHours();
  const greeting  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = userData?.name?.split(' ')[0] || 'Equipe';
  const dateStr   = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // Módulo 4
  const megaClusters         = [...new Set(MEGA_DATA_RAW.map(d => d.cluster))];
  const megaCities           = [...new Set(MEGA_DATA_RAW.filter(d => megaFilterCluster === 'all' || d.cluster === megaFilterCluster).map(d => d.city))];
  let   filteredMegaData     = MEGA_DATA_RAW;
  if (megaFilterCluster !== 'all') filteredMegaData = filteredMegaData.filter(d => d.cluster === megaFilterCluster);
  if (megaFilterCity    !== 'all') filteredMegaData = filteredMegaData.filter(d => d.city    === megaFilterCity);
  const isMegaFiltered       = megaFilterCluster !== 'all' || megaFilterCity !== 'all';
  const totalFilteredNetAdds = filteredMegaData.reduce((acc, d) => acc + d.netAdds, 0);
  const getGlowStyle = () => {
    if (!isMegaFiltered) return {};
    if (totalFilteredNetAdds > 0) return { boxShadow: '0 0 40px rgba(11,163,96,0.3)',  border: '1px solid #0ba360' };
    if (totalFilteredNetAdds < 0) return { boxShadow: '0 0 40px rgba(248,54,0,0.3)',   border: '1px solid #f83600' };
    return                               { boxShadow: '0 0 40px rgba(0,242,254,0.3)',  border: '1px solid #00f2fe' };
  };

  return (
    <div style={styles.wallboardContainer}>

      {/* SVG defs globais */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="neon-cyan"   x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00f2fe" /><stop offset="100%" stopColor="#4facfe" /></linearGradient>
          <linearGradient id="neon-purple" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c471ed" /><stop offset="100%" stopColor="#f64f59" /></linearGradient>
          <linearGradient id="neon-orange" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f83600" /><stop offset="100%" stopColor="#f9d423" /></linearGradient>
          <linearGradient id="neon-green"  x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ba360" /><stop offset="100%" stopColor="#3cba92" /></linearGradient>
          <linearGradient id="neon-gray"   x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#475569" /></linearGradient>
          <linearGradient id="neon-cyan-alpha"   x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#00f2fe" stopOpacity={0.5} /><stop offset="100%" stopColor="#4facfe" stopOpacity={0} /></linearGradient>
          <linearGradient id="neon-green-alpha"  x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0ba360" stopOpacity={0.5} /><stop offset="100%" stopColor="#3cba92" stopOpacity={0} /></linearGradient>
          <linearGradient id="neon-orange-alpha" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#f83600" stopOpacity={0.5} /><stop offset="100%" stopColor="#f9d423" stopOpacity={0} /></linearGradient>
          <linearGradient id="neon-purple-alpha" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#c471ed" stopOpacity={0.5} /><stop offset="100%" stopColor="#f64f59" stopOpacity={0} /></linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      </svg>

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '30%' }}>
          <div style={styles.logoBadge}><Zap size={18} color="white" fill="white" /></div>
          <div>
            <h1 style={styles.title}>Centro de Comando</h1>
            <p style={styles.subtitle}>Painel Estratégico Global</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>
              {greeting}, <span style={{ color: '#00f2fe' }}>{firstName}</span>!
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{dateStr}</span>
          </div>
          <div style={styles.scrollControls}>
            <button onClick={() => scrollRef.current?.scrollBy({ top: -600, behavior: 'smooth' })} style={styles.scrollBtn}><ChevronUp size={16} /></button>
            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }} />
            <button onClick={() => setAutoScroll(v => !v)} style={{ ...styles.scrollBtn, color: autoScroll ? '#00f2fe' : '#8b8fa3' }}>
              {autoScroll ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }} />
            <button onClick={() => scrollRef.current?.scrollBy({ top: 600, behavior: 'smooth' })} style={styles.scrollBtn}><ChevronDown size={16} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', width: '30%' }}>
          <div style={styles.clockContainer}>
            <Clock size={14} color="#00f2fe" />
            <span style={styles.clockText}>
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          {onExit && (
            <button onClick={onExit} style={styles.exitBtn} title="Sair do Modo TV"><X size={18} /></button>
          )}
        </div>
      </div>

      {/* Área de scroll */}
      <div style={styles.scrollArea} className="hide-scrollbar" ref={scrollRef}>
        <Mod1Operacao collapsed={collapsed.operacao} onToggle={() => toggleModule('operacao')} rhData={RH_DATA} />
        <Mod2Vendas   collapsed={collapsed.vendas}   onToggle={() => toggleModule('vendas')}   salesData={SALES_DATA} />
        <Mod3Churn    collapsed={collapsed.churn}    onToggle={() => toggleModule('churn')}    churnData={CHURN_DATA} />
        <Mod4Expansion
          collapsed={collapsed.mega}             onToggle={() => toggleModule('mega')}
          megaFilterCluster={megaFilterCluster}  megaFilterCity={megaFilterCity}
          onFilterCluster={setMegaFilterCluster} onFilterCity={setMegaFilterCity}
          megaClusters={megaClusters}            megaCities={megaCities}
          filteredMegaData={filteredMegaData}    isMegaFiltered={isMegaFiltered}
          totalFilteredNetAdds={totalFilteredNetAdds} glowStyle={getGlowStyle()}
        />
      </div>

      {/* Ticker */}
      <div style={styles.tickerWrapper}>
        <div style={styles.tickerContainer}>
          <div style={styles.tickerLabel}><Flame size={14} fill="currentColor" /> LIVE</div>
          <div style={styles.tickerTrack}>
            <div style={styles.tickerText}>
              {latestSale
                ? <span style={{ color: '#f9d423', fontWeight: '900', textShadow: '0 0 10px rgba(249,212,35,0.8)' }}>{latestSale}</span>
                : <span>Central de Vendas Online: 18 comerciais ativos • 5 contratos em análise • Velocidade da Regional: 4 vendas/hora</span>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}