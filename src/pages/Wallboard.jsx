import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, YAxis,
  Legend, PieChart, Pie, Cell, BarChart, Bar, ReferenceLine, LineChart, Line, ComposedChart
} from 'recharts';
import { 
import { colors } from '../components/ui';
  TrendingUp, Target, Trophy, MapPin, Zap, 
  Clock, Flame, Users, Store, UserX, AlertTriangle, 
  ArrowUpCircle, ArrowDownCircle, ShieldCheck, ChevronDown, ChevronUp, AlertOctagon, Filter, Globe, Activity,
  Play, Pause, X
} from 'lucide-react';

export default function Wallboard({ userData, onExit }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollRef = useRef(null);
  
  // Controle de Módulos (Minimizar/Maximizar)
  const [collapsed, setCollapsed] = useState({
    operacao: false,
    vendas: false,
    churn: false,
    mega: false
  });

  // Controle de Rolagem Automática (Autoplay)
  const [autoScroll, setAutoScroll] = useState(false);

  const toggleModule = (mod) => {
    setCollapsed(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  // --- DADOS MOCKADOS PARA A TV ---
  const rhData = {
    lojasAbertas: 4, lojasFechadas: 0,
    atendentesTrabalhando: 18, atendentesAtestado: 2,
    topPositivo: [
      { name: 'Ana Costa', hours: '+12:30' },
      { name: 'João Pedro', hours: '+08:15' },
      { name: 'Marcos Silva', hours: '+05:40' }
    ],
    topNegativo: [
      { name: 'Beatriz Lima', hours: '-09:20' },
      { name: 'Carlos Santos', hours: '-04:10' },
      { name: 'Felipe Dias', hours: '-02:00' }
    ]
  };

  const salesData = {
    cluster: { sales: 120, salesGoal: 150, installs: 95, installsGoal: 120, backlog: 25 },
    cities: [
      { name: 'Bady Bassitt', sales: 45, salesGoal: 50, installs: 38, installsGoal: 45, backlog: 7 },
      { name: 'Borborema', sales: 30, salesGoal: 40, installs: 25, installsGoal: 35, backlog: 5 },
      { name: 'Nova Granada', sales: 25, salesGoal: 30, installs: 20, installsGoal: 25, backlog: 5 },
      { name: 'Nova Aliança', sales: 20, salesGoal: 30, installs: 12, installsGoal: 15, backlog: 8 },
    ],
    topSellers: [
      { id: 1, name: 'Mariana Silva', store: 'Loja Centro', sales: 45, trend: 'up' },
      { id: 2, name: 'João Pedro', store: 'Quiosque Norte', sales: 38, trend: 'up' },
      { id: 3, name: 'Ana Costa', store: 'PAP Bady', sales: 34, trend: 'down' },
      { id: 4, name: 'Carlos Santos', store: 'Loja Sul', sales: 29, trend: 'up' },
      { id: 5, name: 'Beatriz Lima', store: 'Central', sales: 25, trend: 'equal' }
    ]
  };

  const churnData = {
    clusterGrowth: '+45',
    cities: [
      { name: 'Bady Bassitt', growth: '+20' },
      { name: 'Borborema', growth: '+12' },
      { name: 'Nova Granada', growth: '+15' },
      { name: 'Nova Aliança', growth: '-2' }, 
    ],
    penetrationEvolution: [
      { month: 'Set', 'Bady Bassitt': 22, 'Borborema': 15, 'Nova Granada': 18, 'Nova Aliança': 40 },
      { month: 'Out', 'Bady Bassitt': 23, 'Borborema': 16, 'Nova Granada': 19, 'Nova Aliança': 40 },
      { month: 'Nov', 'Bady Bassitt': 25, 'Borborema': 18, 'Nova Granada': 20, 'Nova Aliança': 39 },
      { month: 'Dez', 'Bady Bassitt': 28, 'Borborema': 20, 'Nova Granada': 22, 'Nova Aliança': 38 },
      { month: 'Jan', 'Bady Bassitt': 32, 'Borborema': 23, 'Nova Granada': 25, 'Nova Aliança': 37 },
      { month: 'Fev', 'Bady Bassitt': 35, 'Borborema': 26, 'Nova Granada': 28, 'Nova Aliança': 36 },
    ],
    churnReasons: [
      { name: 'Concorrência', value: 45, gradId: 'neon-orange' },
      { name: 'Suporte Técnico', value: 25, gradId: 'neon-purple' },
      { name: 'Financeiro', value: 15, gradId: 'neon-cyan' },
      { name: 'Mudança', value: 10, gradId: 'neon-green' },
      { name: 'Outros', value: 5, gradId: 'neon-gray' }
    ]
  };

  const [megaFilterCluster, setMegaFilterCluster] = useState('all');
  const [megaFilterCity, setMegaFilterCity] = useState('all');
  
  const megaDataRaw = [
    { city: 'Bady Bassitt', cluster: 'Regional Norte', baseStart: 1200, netAdds: 20 },
    { city: 'Borborema', cluster: 'Regional Norte', baseStart: 850, netAdds: 12 },
    { city: 'Nova Granada', cluster: 'Regional Sul', baseStart: 950, netAdds: 15 },
    { city: 'Nova Aliança', cluster: 'Regional Sul', baseStart: 1700, netAdds: -15 },
    { city: 'Sales', cluster: 'Regional Leste', baseStart: 500, netAdds: 0 },
    { city: 'Urupês', cluster: 'Regional Leste', baseStart: 600, netAdds: -5 },
    { city: 'S. J. Rio Preto', cluster: 'Regional Central', baseStart: 3500, netAdds: 45 },
    { city: 'Mirassol', cluster: 'Regional Central', baseStart: 1100, netAdds: 8 },
  ].map(d => ({
    ...d,
    currentBase: d.baseStart + d.netAdds,
    gradId: d.netAdds > 0 ? 'url(#neon-green)' : d.netAdds < 0 ? 'url(#neon-orange)' : 'url(#neon-cyan)',
    solidColor: d.netAdds > 0 ? '#0ba360' : d.netAdds < 0 ? '#f83600' : '#00f2fe'
  }));

  const megaClusters = [...new Set(megaDataRaw.map(d => d.cluster))];
  const megaCities = [...new Set(megaDataRaw.filter(d => megaFilterCluster === 'all' || d.cluster === megaFilterCluster).map(d => d.city))];

  let filteredMegaData = megaDataRaw;
  if (megaFilterCluster !== 'all') filteredMegaData = filteredMegaData.filter(d => d.cluster === megaFilterCluster);
  if (megaFilterCity !== 'all') filteredMegaData = filteredMegaData.filter(d => d.city === megaFilterCity);

  const isMegaFiltered = megaFilterCluster !== 'all' || megaFilterCity !== 'all';
  const totalFilteredNetAdds = filteredMegaData.reduce((acc, curr) => acc + curr.netAdds, 0);
  
  const getGlowStyle = () => {
    if (!isMegaFiltered) return {}; 
    if (totalFilteredNetAdds > 0) return { boxShadow: '0 0 40px rgba(11, 163, 96, 0.3)', border: '1px solid #0ba360' };
    if (totalFilteredNetAdds < 0) return { boxShadow: '0 0 40px rgba(248, 54, 0, 0.3)', border: '1px solid #f83600' };
    return { boxShadow: '0 0 40px rgba(0, 242, 254, 0.3)', border: '1px solid #00f2fe' };
  };

  const MegaTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const color = data.solidColor;
      return (
        <div style={{ background: 'rgba(22, 25, 59, 0.95)', padding: '15px', borderRadius: '12px', border: '1px solid #2d325a', color: '#ffffff', backdropFilter: 'blur(10px)' }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: '900', fontSize: '15px' }}>{data.city}</p>
          <div style={{display:'flex', justifyContent:'space-between', gap:'20px', marginBottom:'5px'}}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Dia 1:</span>
            <strong style={{color: '#ffffff', fontSize:'13px'}}>{data.baseStart}</strong>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', gap:'20px', marginBottom:'10px', borderBottom:'1px solid #2d325a', paddingBottom:'10px'}}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Hoje:</span>
            <strong style={{color: '#ffffff', fontSize:'13px'}}>{data.currentBase}</strong>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', gap:'20px'}}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: color }}>Crescimento Líquido:</span>
            <strong style={{color: color, fontSize:'14px', textShadow: `0 0 8px ${color}`}}>{data.netAdds > 0 ? '+' : ''}{data.netAdds}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  const NeonLollipopDot = (props) => {
    const { cx, cy, payload, value } = props;
    if (cx == null || cy == null) return null;
    
    const color = payload.solidColor;
    const isNegative = value < 0;
    
    return (
      <g>
        <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.15} />
        <circle cx={cx} cy={cy} r={6} fill={color} stroke="#0a0b1a" strokeWidth={2} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        <text x={cx} y={isNegative ? cy + 24 : cy - 16} textAnchor="middle" fill={color} fontSize="14" fontWeight="900" fontFamily="'Plus Jakarta Sans', sans-serif" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.9)' }}>
          {value > 0 ? '+' : ''}{value}
        </text>
      </g>
    );
  };

  // --- EFEITOS GLOBAIS (Relógio e Rolagem) ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lógica de Scroll Automático (Suave)
  useEffect(() => {
    let intervalId;
    if (autoScroll) {
      intervalId = setInterval(() => {
        if (scrollRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          // Se chegou ao fim (com uma margem de erro)
          if (scrollTop + clientHeight >= scrollHeight - 5) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            scrollRef.current.scrollBy({ top: 1, behavior: 'auto' });
          }
        }
      }, 30); // Velocidade: 1px a cada 30ms
    }
    return () => clearInterval(intervalId);
  }, [autoScroll]);

  const [latestSale, setLatestSale] = useState(null);
  useEffect(() => {
    const saleTimer = setInterval(() => {
      const names = ['Mariana', 'João', 'Ana', 'Carlos', 'Beatriz', 'Felipe', 'Amanda'];
      const cities = ['Centro', 'Bady Bassitt', 'Borborema', 'Nova Granada', 'PAP'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      
      setLatestSale(`${randomName} fechou uma venda de 600MB em ${randomCity}! 🚀`);
      setTimeout(() => setLatestSale(null), 5000); 
    }, 12000); 

    return () => clearInterval(saleTimer);
  }, []);

  // --- DADOS DINÂMICOS DO TOPO ---
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = userData?.name?.split(' ')[0] || 'Equipa';
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // --- COMPONENTES VISUAIS (NEON GRADIENTS) ---
  const NeonDonut = ({ title, current, target, gradId, backlog }) => {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius; 
    const strokeDashoffset = circumference - ((percentage / 100) * circumference);

    return (
      <div style={styles.neonDonutCard}>
        <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'flex-start', marginBottom: '10px'}}>
           <h4 style={styles.neonDonutTitle}>{title}</h4>
           {backlog !== undefined && (
             <div style={styles.neonBacklogBadge} title="Fila de ativação pendente">
                <AlertOctagon size={12} /> {backlog} Fila SLA
             </div>
           )}
        </div>
        
        <div style={styles.neonDonutWrapper}>
          <svg style={{ width: '120px', height: '120px', overflow: 'visible' }} viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#2d325a" strokeWidth="12" />
            <circle 
              cx="60" cy="60" r={radius} fill="none" 
              stroke={`url(#${gradId})`} strokeWidth="12" strokeLinecap="round" 
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
              transform="rotate(-90 60 60)" 
              style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: 'url(#glow)' }} 
            />
          </svg>
          <div style={styles.neonDonutContent}>
            <span style={styles.neonDonutValue}>{percentage.toFixed(0)}%</span>
            <span style={styles.neonDonutTarget}>{current} / {target}</span>
          </div>
        </div>
      </div>
    );
  };

  const NeonProgressBar = ({ title, current, target, gradCSS, backlog }) => {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

    return (
      <div style={styles.progressBarWrapper}>
        <div style={styles.progressBarHeader}>
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <span style={styles.progressBarTitle}>{title}</span>
            {backlog !== undefined && backlog > 0 && (
              <span style={{fontSize:'9px', color:'#f9d423', background:'rgba(249, 212, 35, 0.1)', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold', border:'1px solid rgba(249, 212, 35, 0.3)'}}>
                {backlog} fila
              </span>
            )}
          </div>
          <span style={styles.progressBarValues}>
            <span style={{ color: '#ffffff' }}>{current}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> / {target}</span>
          </span>
        </div>
        <div style={styles.progressBarTrack}>
          <div style={{
            height: '100%', width: `${percentage}%`, background: gradCSS, borderRadius: '6px',
            boxShadow: '0 0 10px rgba(255,255,255,0.2)', transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}></div>
        </div>
      </div>
    );
  };

  const BigSpeedometer = ({ title, current, target, color1, color2, backlog }) => {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const radius = 80;
    const circumference = Math.PI * radius; 
    const strokeDashoffset = circumference - ((percentage / 100) * circumference);
    const gradId = `grad-${title.replace(/\s+/g, '')}`;

    return (
      <div style={styles.globalSpeedCard}>
        <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'flex-start'}}>
           <h4 style={styles.globalSpeedTitle}>{title}</h4>
           {backlog !== undefined && (
             <div style={styles.backlogBadge} title="Fila de ativação pendente">
                <AlertOctagon size={12} /> {backlog} Fila SLA
             </div>
           )}
        </div>
        
        <div style={styles.bigSpeedWrapper}>
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 200 110">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color1} />
                <stop offset="100%" stopColor={color2} />
              </linearGradient>
            </defs>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" strokeLinecap="round" />
            <path 
              d="M 20 100 A 80 80 0 0 1 180 100" 
              fill="none" 
              stroke={`url(#${gradId})`} 
              strokeWidth="16" 
              strokeLinecap="round" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset} 
              style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: 'url(#glow)' }} 
            />
          </svg>
          <div style={styles.bigSpeedContent}>
            <span style={styles.bigSpeedValue}>{current}</span>
            <span style={styles.bigSpeedTarget}>/ {target}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.wallboardContainer}>
      {/* DEFINIÇÕES GLOBAIS DE SVG E GRADIENTES NEON */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="neon-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" /><stop offset="100%" stopColor="#4facfe" />
          </linearGradient>
          <linearGradient id="neon-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c471ed" /><stop offset="100%" stopColor="#f64f59" />
          </linearGradient>
          <linearGradient id="neon-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f83600" /><stop offset="100%" stopColor="#f9d423" />
          </linearGradient>
          <linearGradient id="neon-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ba360" /><stop offset="100%" stopColor="#3cba92" />
          </linearGradient>
          <linearGradient id="neon-gray" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#475569" />
          </linearGradient>

          <linearGradient id="neon-cyan-alpha" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.5} /><stop offset="100%" stopColor="#4facfe" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="neon-green-alpha" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ba360" stopOpacity={0.5} /><stop offset="100%" stopColor="#3cba92" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="neon-orange-alpha" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f83600" stopOpacity={0.5} /><stop offset="100%" stopColor="#f9d423" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="neon-purple-alpha" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c471ed" stopOpacity={0.5} /><stop offset="100%" stopColor="#f64f59" stopOpacity={0} />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* HEADER DA TV (Fixo no topo com Scroll Controls slim) */}
      <div style={styles.header}>
        {/* ESQUERDA: Logo e Título */}
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', width: '30%'}}>
          <div style={styles.logoBadge}><Zap size={18} color="white" fill="white" /></div>
          <div>
            <h1 style={styles.title}>Centro de Comando</h1>
            <p style={styles.subtitle}>Painel Estratégico Global</p>
          </div>
        </div>

        {/* CENTRO: Saudação, Data e Controles de Rolagem */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%'}}>
           <div style={{display: 'flex', alignItems: 'baseline', gap: '8px'}}>
             <span style={{fontSize: '14px', fontWeight: 'bold', color: '#ffffff'}}>
               {greeting}, <span style={{color: '#00f2fe'}}>{firstName}</span>!
             </span>
             <span style={{fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize'}}>
               {dateStr}
             </span>
           </div>
           
           <div style={styles.scrollControls}>
             <button onClick={() => scrollRef.current?.scrollBy({top: -600, behavior: 'smooth'})} style={styles.scrollBtn} title="Subir Módulo">
                <ChevronUp size={16}/>
             </button>
             <div style={{width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)', margin: '0 5px'}}></div>
             <button onClick={() => setAutoScroll(!autoScroll)} style={{...styles.scrollBtn, color: autoScroll ? '#00f2fe' : '#8b8fa3'}} title={autoScroll ? "Pausar Rolagem Automática" : "Iniciar Rolagem Automática"}>
                {autoScroll ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}
             </button>
             <div style={{width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)', margin: '0 5px'}}></div>
             <button onClick={() => scrollRef.current?.scrollBy({top: 600, behavior: 'smooth'})} style={styles.scrollBtn} title="Descer Módulo">
                <ChevronDown size={16}/>
             </button>
           </div>
        </div>

        {/* DIREITA: Relógio */}
        <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', width: '30%'}}>
          <div style={styles.clockContainer}>
            <Clock size={14} color="#00f2fe" />
            <span style={styles.clockText}>
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          {onExit && (
            <button onClick={onExit} style={styles.exitBtn} title="Sair do Modo TV">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DE SCROLL DOS MÓDULOS */}
      <div style={styles.scrollArea} className="hide-scrollbar" ref={scrollRef}>
        
        {/* ========================================================= */}
        {/* MÓDULO 1: OPERAÇÃO E EQUIPE                               */}
        {/* ========================================================= */}
        <div style={styles.moduleBox}>
          <div style={styles.moduleHeader} onClick={() => toggleModule('operacao')}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{...styles.iconGlow, color: '#c471ed', boxShadow: '0 0 10px rgba(196, 113, 237, 0.4)'}}>
                <Users size={18} />
              </div>
              <h2 style={{...styles.moduleTitle, color: '#ffffff'}}>Operação e Equipa</h2>
            </div>
            <div style={styles.collapseBtn}>
               {collapsed.operacao ? <ChevronDown size={20} color="#8b8fa3"/> : <ChevronUp size={20} color="#8b8fa3"/>}
            </div>
          </div>

          {!collapsed.operacao && (
            <div style={{...styles.mod1Grid, animation: 'fadeIn 0.4s ease-out'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={styles.statusRow}>
                   <div style={styles.statusBox}>
                     <Store size={22} color="#0ba360" style={{filter: 'drop-shadow(0 0 5px rgba(11,163,96,0.6))'}} />
                     <div>
                       <span style={styles.statusValue}>{rhData.lojasAbertas}</span>
                       <span style={styles.statusLabel}>Lojas Abertas</span>
                     </div>
                   </div>
                   <div style={{...styles.statusBox, border: rhData.lojasFechadas > 0 ? '1px solid rgba(248, 54, 0, 0.4)' : '1px solid #2d325a'}}>
                     <Store size={22} color={rhData.lojasFechadas > 0 ? "#f83600" : "#8b8fa3"} />
                     <div>
                       <span style={{...styles.statusValue, color: rhData.lojasFechadas > 0 ? "#f83600" : "white"}}>{rhData.lojasFechadas}</span>
                       <span style={styles.statusLabel}>Lojas Fechadas</span>
                     </div>
                   </div>
                </div>
                <div style={styles.statusRow}>
                   <div style={styles.statusBox}>
                     <Users size={22} color="#00f2fe" style={{filter: 'drop-shadow(0 0 5px rgba(0,242,254,0.6))'}} />
                     <div>
                       <span style={styles.statusValue}>{rhData.atendentesTrabalhando}</span>
                       <span style={styles.statusLabel}>Comerciais Hoje</span>
                     </div>
                   </div>
                   <div style={{...styles.statusBox, border: rhData.atendentesAtestado > 0 ? '1px solid rgba(249, 212, 35, 0.4)' : '1px solid #2d325a'}}>
                     <UserX size={22} color="#f9d423" />
                     <div>
                       <span style={{...styles.statusValue, color: '#f9d423'}}>{rhData.atendentesAtestado}</span>
                       <span style={styles.statusLabel}>Atestados/Faltas</span>
                     </div>
                   </div>
                </div>
              </div>

              <div style={styles.bancoHorasCard}>
                 <h3 style={styles.bhTitle}><Clock size={14}/> Alertas de Banco de Horas</h3>
                 <div style={{display: 'flex', gap: '20px', flex: 1}}>
                    <div style={{flex: 1}}>
                      <h4 style={styles.bhSubTitle}><ArrowUpCircle size={14} color="#0ba360"/> Top Positivos</h4>
                      {rhData.topPositivo.map((user, idx) => (
                        <div key={idx} style={styles.bhRow}>
                          <span style={styles.bhName}>{user.name}</span>
                          <span style={{...styles.bhVal, color: '#3cba92'}}>{user.hours}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)'}}></div>
                    <div style={{flex: 1}}>
                      <h4 style={styles.bhSubTitle}><ArrowDownCircle size={14} color="#f83600"/> Top Negativos</h4>
                      {rhData.topNegativo.map((user, idx) => (
                        <div key={idx} style={styles.bhRow}>
                          <span style={styles.bhName}>{user.name}</span>
                          <span style={{...styles.bhVal, color: '#f83600'}}>{user.hours}</span>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MÓDULO 2: TRAÇÃO DE VENDAS                                */}
        {/* ========================================================= */}
        <div style={styles.moduleBox}>
          <div style={styles.moduleHeader} onClick={() => toggleModule('vendas')}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{...styles.iconGlow, color: '#0ba360', boxShadow: '0 0 10px rgba(11, 163, 96, 0.4)'}}>
                <TrendingUp size={18} />
              </div>
              <h2 style={{...styles.moduleTitle, color: '#ffffff'}}>Tração de Vendas e SLA</h2>
            </div>
            <div style={styles.collapseBtn}>
               {collapsed.vendas ? <ChevronDown size={20} color="#8b8fa3"/> : <ChevronUp size={20} color="#8b8fa3"/>}
            </div>
          </div>

          {!collapsed.vendas && (
            <div style={{...styles.mod2Grid, animation: 'fadeIn 0.4s ease-out'}}>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={styles.globalSpeedGrid}>
                  <BigSpeedometer title="VENDAS GLOBAIS" current={salesData.cluster.sales} target={salesData.cluster.salesGoal} color1="#00f2fe" color2="#4facfe" />
                  <BigSpeedometer title="INSTALAÇÕES SLA" current={salesData.cluster.installs} target={salesData.cluster.installsGoal} color1="#0ba360" color2="#3cba92" backlog={salesData.cluster.backlog} />
                </div>

                <div style={styles.citiesSpeedGrid}>
                  {salesData.cities.map((city, idx) => (
                    <div key={idx} style={styles.cityDashCard}>
                      <h4 style={styles.cityDashTitle}>
                        <MapPin size={14} color="#00f2fe"/> {city.name}
                      </h4>
                      <div style={{display:'flex', flexDirection:'column', gap:'16px', marginTop: '10px'}}>
                        <NeonProgressBar title="Vendas" current={city.sales} target={city.salesGoal} gradCSS="linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)" />
                        <NeonProgressBar title="Instalações" current={city.installs} target={city.installsGoal} gradCSS="linear-gradient(90deg, #0ba360 0%, #3cba92 100%)" backlog={city.backlog} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.rankingCard}>
                <h3 style={styles.rankingTitle}>
                  <Trophy size={18} color="#f9d423" style={{filter: 'drop-shadow(0 0 5px rgba(249, 212, 35, 0.6))'}}/> 
                  Top 5 Vendedores (Regional)
                </h3>
                <div style={styles.sellerList}>
                  {salesData.topSellers.map((seller, index) => {
                    const isFirst = index === 0;
                    return (
                      <div key={seller.id} style={{
                        ...styles.sellerItem, 
                        background: isFirst ? 'rgba(249, 212, 35, 0.05)' : 'rgba(255, 255, 255, 0.02)', 
                        borderColor: isFirst ? 'rgba(249, 212, 35, 0.3)' : 'rgba(255,255,255,0.05)'
                      }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                          <div style={{
                            ...styles.sellerAvatar, 
                            background: isFirst ? 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)' : '#1e2042',
                            color: '#ffffff',
                            border: isFirst ? 'none' : '1px solid #2d325a'
                          }}>
                            {index + 1}º
                          </div>
                          <div>
                            <h4 style={{margin: 0, fontSize: isFirst ? '15px' : '14px', fontWeight: '900', color: isFirst ? '#f9d423' : 'white'}}>{seller.name}</h4>
                            <span style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold'}}>{seller.store}</span>
                          </div>
                        </div>
                        <div style={{fontSize: '22px', fontWeight: '900', color: isFirst ? '#f9d423' : 'white', textShadow: isFirst ? '0 0 10px rgba(249,212,35,0.5)' : 'none'}}>
                          {seller.sales}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MÓDULO 3: SAÚDE DA BASE E CHURN                           */}
        {/* ========================================================= */}
        <div style={styles.moduleBox}>
          <div style={styles.moduleHeader} onClick={() => toggleModule('churn')}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{...styles.iconGlow, color: '#f9d423', boxShadow: '0 0 10px rgba(249, 212, 35, 0.4)'}}>
                <ShieldCheck size={18} />
              </div>
              <h2 style={{...styles.moduleTitle, color: '#ffffff'}}>Saúde da Base e Market Share</h2>
            </div>
            <div style={styles.collapseBtn}>
               {collapsed.churn ? <ChevronDown size={20} color="#8b8fa3"/> : <ChevronUp size={20} color="#8b8fa3"/>}
            </div>
          </div>

          {!collapsed.churn && (
            <div style={{...styles.mod3Grid, animation: 'fadeIn 0.4s ease-out'}}>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                 <div style={styles.netAddsGlobal}>
                    <span style={styles.netAddsLabel}>Crescimento Líquido (Net Adds)</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <TrendingUp size={28} color="white" />
                      <span style={styles.netAddsVal}>{churnData.clusterGrowth}</span>
                    </div>
                    <div style={styles.netAddsGlow}></div>
                 </div>

                 <div style={styles.churnReasonCard}>
                    <h4 style={{fontSize:'12px', fontWeight:'bold', color: 'var(--text-muted)', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:'5px'}}>
                      <Activity size={14}/> Motivos de Evasão (Mês Atual)
                    </h4>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'160px'}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={churnData.churnReasons}
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {churnData.churnReasons.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`url(#${entry.gradId})`} style={{filter: `drop-shadow(0 0 4px rgba(255,255,255,0.2))`}} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{backgroundColor: 'rgba(22, 25, 59, 0.95)', borderColor: '#2d325a', color: '#ffffff', borderRadius: '12px', fontSize:'11px', backdropFilter:'blur(5px)'}} 
                            itemStyle={{fontWeight:'bold'}}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'10px', justifyContent:'center'}}>
                       {churnData.churnReasons.slice(0,3).map((item, idx) => {
                          const baseColor = item.gradId === 'neon-orange' ? '#f83600' : item.gradId === 'neon-purple' ? '#c471ed' : '#00f2fe';
                          return (
                            <div key={idx} style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color: '#ffffff', fontWeight:'bold'}}>
                               <div style={{width:'8px', height:'8px', borderRadius:'50%', background: baseColor, boxShadow:`0 0 5px ${baseColor}`}}></div>
                               {item.name}
                            </div>
                          )
                       })}
                    </div>
                 </div>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                <div style={styles.penetrationChartCard}>
                  <div style={{marginBottom: '15px', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                      <h3 style={{fontSize:'16px', fontWeight:'900', color: '#ffffff', margin:0, letterSpacing:'-0.02em'}}>Evolução da Penetração (% HPs Ocupadas)</h3>
                      <p style={{fontSize:'11px', color: 'var(--text-muted)', margin:'4px 0 0 0'}}>Expansão de território nos últimos 6 meses</p>
                    </div>
                  </div>
                  
                  <div style={{width: '100%', height: '220px'}}>
                      <ResponsiveContainer>
                        <AreaChart data={churnData.penetrationEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="month" stroke="#8b8fa3" tick={{fill: '#8b8fa3', fontSize: 11, fontWeight:'bold'}} axisLine={false} tickLine={false} />
                          <YAxis stroke="#8b8fa3" tick={{fill: '#8b8fa3', fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                          <RechartsTooltip 
                            contentStyle={{backgroundColor: 'rgba(22, 25, 59, 0.95)', borderColor: '#2d325a', color: '#ffffff', borderRadius: '12px', backdropFilter:'blur(5px)', fontSize:'12px'}} 
                            itemStyle={{fontWeight:'bold'}}
                          />
                          <Legend wrapperStyle={{fontSize:'11px', fontWeight:'bold', paddingTop:'10px', color: '#ffffff'}} />
                          <Area type="monotone" dataKey="Bady Bassitt" stroke="#00f2fe" fill="url(#neon-cyan-alpha)" strokeWidth={3} style={{filter: 'drop-shadow(0 0 4px rgba(0,242,254,0.5))'}} />
                          <Area type="monotone" dataKey="Nova Granada" stroke="#0ba360" fill="url(#neon-green-alpha)" strokeWidth={3} style={{filter: 'drop-shadow(0 0 4px rgba(11,163,96,0.5))'}} />
                          <Area type="monotone" dataKey="Nova Aliança" stroke="#f64f59" fill="url(#neon-purple-alpha)" strokeWidth={3} style={{filter: 'drop-shadow(0 0 4px rgba(246,79,89,0.5))'}} />
                          <Area type="monotone" dataKey="Borborema" stroke="#f9d423" fill="url(#neon-orange-alpha)" strokeWidth={3} style={{filter: 'drop-shadow(0 0 4px rgba(249,212,35,0.5))'}} />
                        </AreaChart>
                      </ResponsiveContainer>
                  </div>
                </div>

                <div style={styles.citiesGrowthCard}>
                  {churnData.cities.map((city, idx) => {
                    const isNegative = city.growth.includes('-');
                    return (
                      <div key={idx} style={styles.cityGrowthRow}>
                        <span style={{fontSize:'13px', fontWeight:'bold', color: '#ffffff'}}>{city.name}</span>
                        <span style={{
                          fontSize:'14px', fontWeight:'900', 
                          color: isNegative ? '#f83600' : '#0ba360', 
                          background: isNegative ? 'rgba(248,54,0,0.1)' : 'rgba(11,163,96,0.1)', 
                          padding:'4px 10px', borderRadius:'8px',
                          border: `1px solid ${isNegative ? 'rgba(248,54,0,0.3)' : 'rgba(11,163,96,0.3)'}`,
                          boxShadow: isNegative ? '0 0 10px rgba(248,54,0,0.2)' : '0 0 10px rgba(11,163,96,0.2)'
                        }}>
                          {city.growth} net
                        </span>
                      </div>
                    )
                  })}
                </div>

              </div>

            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MÓDULO 4: MONITOR GLOBAL DE EXPANSÃO (LOLLIPOP CHART)     */}
        {/* ========================================================= */}
        <div style={{...styles.moduleBox, ...getGlowStyle(), transition: 'all 0.4s ease'}}>
          <div style={styles.moduleHeader} onClick={() => toggleModule('mega')}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{...styles.iconGlow, color: '#00f2fe', boxShadow: '0 0 10px rgba(0, 242, 254, 0.4)'}}>
                <Globe size={18} />
              </div>
              <h2 style={{...styles.moduleTitle, color: '#ffffff'}}>Monitor Global de Expansão</h2>
            </div>
            <div style={styles.collapseBtn}>
               {collapsed.mega ? <ChevronDown size={20} color="#8b8fa3"/> : <ChevronUp size={20} color="#8b8fa3"/>}
            </div>
          </div>

          {!collapsed.mega && (
            <div style={{animation: 'fadeIn 0.3s ease-out'}}>
              <div style={styles.megaFilterRow}>
                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                   <Filter size={16} color="#8b8fa3" />
                   <span style={{fontSize:'13px', fontWeight:'bold', color: '#ffffff'}}>Filtros:</span>
                 </div>
                 <select 
                   value={megaFilterCluster} 
                   onChange={(e) => { setMegaFilterCluster(e.target.value); setMegaFilterCity('all'); }} 
                   style={styles.megaSelect}
                 >
                   <option value="all">Todas as Regionais</option>
                   {megaClusters.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 
                 <select 
                   value={megaFilterCity} 
                   onChange={(e) => setMegaFilterCity(e.target.value)} 
                   style={styles.megaSelect}
                   disabled={megaFilterCluster === 'all'}
                 >
                   <option value="all">Todas as Cidades</option>
                   {megaCities.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>

                 {isMegaFiltered && (
                   <div style={{marginLeft: 'auto', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '900', background: totalFilteredNetAdds > 0 ? 'rgba(11,163,96,0.15)' : totalFilteredNetAdds < 0 ? 'rgba(248,54,0,0.15)' : 'rgba(249,212,35,0.15)', color: totalFilteredNetAdds > 0 ? '#3cba92' : totalFilteredNetAdds < 0 ? '#f64f59' : '#f9d423', border: `1px solid ${totalFilteredNetAdds > 0 ? '#0ba360' : totalFilteredNetAdds < 0 ? '#f83600' : colors.warning}`}}>
                     Balanço: {totalFilteredNetAdds > 0 ? '+' : ''}{totalFilteredNetAdds} clientes
                   </div>
                 )}
              </div>

              <div style={styles.megaChartWrapper}>
                 <h3 style={{fontSize:'14px', fontWeight:'bold', color: 'var(--text-muted)', margin:'0 0 25px 0', textAlign:'center', textTransform:'uppercase', letterSpacing:'0.05em'}}>Crescimento Líquido (Base Dia 1 vs Base Hoje)</h3>
                 <div style={{width: '100%', height: '340px'}}>
                   <ResponsiveContainer>
                     <ComposedChart data={filteredMegaData} margin={{ top: 35, right: 20, left: -20, bottom: 10 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                       <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 12, fontWeight: 'bold', fontFamily: "'Plus Jakarta Sans', sans-serif"}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#8b8fa3', fontSize: 12}} />
                       <RechartsTooltip content={(props) => <MegaTooltip {...props} />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                       <ReferenceLine y={0} stroke="#475569" strokeWidth={2} />
                       
                       <Bar dataKey="netAdds" barSize={4} radius={4}>
                         {filteredMegaData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.gradId} opacity={0.6} />
                         ))}
                       </Bar>

                       <Line 
                         type="monotone" 
                         dataKey="netAdds" 
                         stroke="none" 
                         isAnimationActive={true}
                         dot={<NeonLollipopDot />}
                         activeDot={false}
                       />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* RODAPÉ: BREAKING NEWS (TICKER) - FIXO NO FUNDO */}
      <div style={styles.tickerWrapper}>
        <div style={styles.tickerContainer}>
          <div style={styles.tickerLabel}>
            <Flame size={14} fill="currentColor" /> LIVE
          </div>
          <div style={styles.tickerTrack}>
            <div style={styles.tickerText}>
              {latestSale ? (
                <span style={{color: '#f9d423', fontWeight: '900', textShadow: '0 0 10px rgba(249,212,35,0.8)'}}>{latestSale}</span>
              ) : (
                <span>Central de Vendas Online: 18 comerciais ativos • 5 contratos em análise • Velocidade da Regional: 4 vendas/hora</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// --- ESTILOS INLINE (TEMA NEON GALAXY / NASA) ---
const styles = {
  wallboardContainer: {
    backgroundColor: '#0a0b1a', 
    backgroundImage: 'radial-gradient(circle at 50% -20%, #1a1e4a 0%, #0a0b1a 80%)', 
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", 
    position: 'relative',
    color: '#ffffff'
  },
  
  header: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    padding: '8px 30px', background: 'rgba(10, 11, 26, 0.8)', backdropFilter: 'blur(15px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, zIndex: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.8)'
  },
  logoBadge: { background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', padding: '6px', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,242,254,0.4)' },
  title: { fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase', textShadow: '0 2px 5px rgba(255,255,255,0.2)' }, 
  subtitle: { fontSize: '10px', color: 'var(--text-muted)', margin: '0', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase' },
  clockContainer: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(22, 25, 59, 0.8)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' },
  clockText: { fontSize: '16px', fontWeight: '900', color: '#00f2fe', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em', textShadow: '0 0 8px rgba(0,242,254,0.5)' },
  exitBtn: { background: 'rgba(239, 68, 68, 0.1)', color: colors.danger, border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },

  // Scroll Controls no Header
  scrollControls: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' },
  scrollBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', transition: 'color 0.2s', outline: 'none' },

  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '30px 40px 100px 40px', 
    display: 'flex',
    flexDirection: 'column',
    gap: '35px', 
  },

  moduleBox: { display: 'flex', flexDirection: 'column', gap: '20px', background: 'transparent' },
  moduleHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', cursor: 'pointer', userSelect: 'none' },
  iconGlow: { padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' },
  moduleTitle: { fontSize: '18px', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  collapseBtn: { padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  mod1Grid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px' },
  statusRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  statusBox: { background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid #2d325a', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' },
  statusValue: { fontSize: '32px', fontWeight: '900', color: '#ffffff', display: 'block', lineHeight: 1, textShadow: '0 2px 10px rgba(255,255,255,0.2)' },
  statusLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px', display: 'block' },
  
  bancoHorasCard: { background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid #2d325a', borderRadius: '16px', padding: '25px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' },
  bhTitle: { fontSize: '15px', color: '#ffffff', fontWeight: '900', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  bhSubTitle: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' },
  bhRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  bhName: { fontSize: '14px', color: 'var(--text-muted)', fontWeight: '700' },
  bhVal: { fontSize: '14px', fontWeight: '900', textShadow: '0 0 10px currentColor' },

  mod2Grid: { display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '25px' },
  globalSpeedGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' },
  globalSpeedCard: { background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid #2d325a', borderRadius: '20px', padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position:'relative' },
  globalSpeedTitle: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 15px 0', letterSpacing: '0.1em' },
  backlogBadge: { background: 'rgba(249, 212, 35, 0.1)', color: '#f9d423', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'5px', border: '1px solid rgba(249,212,35,0.3)' },

  neonDonutCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' },
  neonDonutTitle: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', margin:0 },
  neonDonutWrapper: { position: 'relative', height: '120px', width:'120px', display: 'flex', justifyContent: 'center', marginTop: '10px' },
  neonDonutContent: { position: 'absolute', top: '50%', left:'50%', transform:'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  neonDonutValue: { fontSize: '28px', fontWeight: '900', color: '#ffffff', lineHeight: 1, textShadow: '0 0 10px rgba(255,255,255,0.5)' },
  neonDonutTarget: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', marginTop:'5px' },

  citiesSpeedGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  cityDashCard: { background: 'rgba(22, 25, 59, 0.4)', backdropFilter: 'blur(5px)', border: '1px solid #2d325a', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' },
  cityDashTitle: { fontSize: '14px', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  
  progressBarWrapper: { width: '100%', display: 'flex', flexDirection: 'column' },
  progressBarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' },
  progressBarTitle: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' },
  progressBarValues: { fontSize: '15px', fontWeight: '900' },
  progressBarTrack: { width: '100%', height: '8px', background: '#1a1e4a', borderRadius: '4px', overflow: 'hidden' },

  rankingCard: { background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid #2d325a', borderRadius: '20px', padding: '25px', height: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  rankingTitle: { fontSize: '15px', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 25px 0', textTransform: 'uppercase', letterSpacing: '0.05em' },
  sellerList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  sellerItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderRadius: '12px', border: '1px solid transparent', transition: 'all 0.3s' },
  sellerAvatar: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '900' },

  mod3Grid: { display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '25px' },
  netAddsGlobal: { background: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)', padding: '25px', borderRadius: '20px', boxShadow: '0 15px 30px rgba(11, 163, 96, 0.3)', position: 'relative', overflow: 'hidden' },
  netAddsLabel: { fontSize: '12px', color: '#ecfdf5', fontWeight: '900', textTransform: 'uppercase', display: 'block', marginBottom: '15px', letterSpacing: '0.05em', position: 'relative', zIndex: 2 },
  netAddsVal: { fontSize: '56px', fontWeight: '900', color: '#ffffff', lineHeight: 1, textShadow: '0 4px 15px rgba(0,0,0,0.3)', position: 'relative', zIndex: 2 },
  netAddsGlow: { position: 'absolute', top: '-50%', right: '-20%', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', borderRadius: '50%', zIndex: 1 },
  
  churnReasonCard: { background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid #2d325a', borderRadius: '20px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', flex: 1, display:'flex', flexDirection:'column' },

  citiesGrowthCard: { background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid #2d325a', borderRadius: '20px', padding: '20px 25px', display: 'grid', gridTemplateColumns:'1fr 1fr', gap: '0 25px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' },
  cityGrowthRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' },

  penetrationChartCard: { background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid #2d325a', borderRadius: '20px', padding: '25px', flex:1, boxShadow: '0 15px 35px rgba(0,0,0,0.5)' },

  megaFilterRow: { display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(22, 25, 59, 0.4)', padding: '15px 20px', borderRadius: '16px', marginBottom: '25px', flexWrap: 'wrap', border: '1px solid #2d325a' },
  megaSelect: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '10px 15px', borderRadius: '10px', outline: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  megaChartWrapper: { background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '30px', boxShadow: '0 15px 40px rgba(0,0,0,0.5)' },

  tickerWrapper: { position: 'fixed', bottom: '25px', left: '40px', right: '40px', zIndex: 100 },
  tickerContainer: { display: 'flex', height: '45px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(10, 11, 26, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' },
  tickerLabel: { background: 'linear-gradient(90deg, #f83600 0%, #f9d423 100%)', color: '#ffffff', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '900', letterSpacing: '0.15em', zIndex: 2, boxShadow: '5px 0 15px rgba(0,0,0,0.5)' },
  tickerTrack: { flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' },
  tickerText: { whiteSpace: 'nowrap', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', paddingLeft: '100%', animation: 'scrollTicker 25s linear infinite', letterSpacing: '0.05em' }
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scrollTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-200%); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;
document.head.appendChild(styleSheet);