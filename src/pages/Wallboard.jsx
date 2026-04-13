import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Flame, Play, Pause, X, Zap } from 'lucide-react';

import { loadWallboardData } from '../services/wallboardService';
import { styles } from './wallboard/WallboardStyles';
import { Mod1Operacao, Mod2Vendas, Mod3Churn, Mod4Expansion } from './wallboard/WallboardModules';

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export default function Wallboard({ userData, onExit }) {
  const scrollRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoScroll, setAutoScroll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickerIndex, setTickerIndex] = useState(0);
  const [wallboardData, setWallboardData] = useState(null);
  const [collapsed, setCollapsed] = useState({ operacao: false, vendas: false, churn: false, mega: false });
  const [megaFilterCluster, setMegaFilterCluster] = useState('all');
  const [megaFilterCity, setMegaFilterCity] = useState('all');

  const refreshWallboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const payload = await loadWallboardData({
        userData,
        monthKey: getCurrentMonthKey(),
      });
      setWallboardData(payload);
      setError('');
    } catch (loadError) {
      console.error('Erro ao carregar o modo TV:', loadError);
      setError(loadError?.message || 'Nao foi possivel carregar os dados reais do Modo TV.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    refreshWallboard();
    const refreshId = setInterval(() => {
      refreshWallboard({ silent: true });
    }, 60000);
    return () => clearInterval(refreshId);
  }, [refreshWallboard]);

  useEffect(() => {
    const clockId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockId);
  }, []);

  useEffect(() => {
    if (!autoScroll) return undefined;
    const scrollId = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ top: 1, behavior: 'auto' });
      }
    }, 30);
    return () => clearInterval(scrollId);
  }, [autoScroll]);

  const tickerMessages = wallboardData?.tickerMessages || [];

  useEffect(() => {
    setTickerIndex(0);
  }, [tickerMessages]);

  useEffect(() => {
    if (tickerMessages.length <= 1) return undefined;
    const tickerId = setInterval(() => {
      setTickerIndex((current) => (current + 1) % tickerMessages.length);
    }, 10000);
    return () => clearInterval(tickerId);
  }, [tickerMessages]);

  const megaData = wallboardData?.megaData || [];

  useEffect(() => {
    const availableClusters = new Set(megaData.map((item) => item.cluster));
    if (megaFilterCluster !== 'all' && !availableClusters.has(megaFilterCluster)) {
      setMegaFilterCluster('all');
      setMegaFilterCity('all');
      return;
    }

    const availableCities = new Set(
      megaData
        .filter((item) => megaFilterCluster === 'all' || item.cluster === megaFilterCluster)
        .map((item) => item.city)
    );

    if (megaFilterCity !== 'all' && !availableCities.has(megaFilterCity)) {
      setMegaFilterCity('all');
    }
  }, [megaData, megaFilterCity, megaFilterCluster]);

  const megaClusters = useMemo(() => [...new Set(megaData.map((item) => item.cluster))], [megaData]);
  const megaCities = useMemo(() => (
    [...new Set(
      megaData
        .filter((item) => megaFilterCluster === 'all' || item.cluster === megaFilterCluster)
        .map((item) => item.city)
    )]
  ), [megaData, megaFilterCluster]);

  const filteredMegaData = useMemo(() => megaData.filter((item) => {
    if (megaFilterCluster !== 'all' && item.cluster !== megaFilterCluster) return false;
    if (megaFilterCity !== 'all' && item.city !== megaFilterCity) return false;
    return true;
  }), [megaData, megaFilterCity, megaFilterCluster]);

  const isMegaFiltered = megaFilterCluster !== 'all' || megaFilterCity !== 'all';
  const totalFilteredNetAdds = filteredMegaData.reduce((total, item) => total + Number(item.netAdds || 0), 0);

  const glowStyle = useMemo(() => {
    if (!isMegaFiltered) return {};
    if (totalFilteredNetAdds > 0) return { boxShadow: '0 0 40px rgba(11,163,96,0.3)', border: '1px solid #0ba360' };
    if (totalFilteredNetAdds < 0) return { boxShadow: '0 0 40px rgba(248,54,0,0.3)', border: '1px solid #f83600' };
    return { boxShadow: '0 0 40px rgba(0,242,254,0.3)', border: '1px solid #00f2fe' };
  }, [isMegaFiltered, totalFilteredNetAdds]);

  const toggleModule = (moduleKey) => {
    setCollapsed((current) => ({ ...current, [moduleKey]: !current[moduleKey] }));
  };

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = userData?.name?.split(' ')[0] || 'Equipe';
  const dateStr = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const tickerText = tickerMessages[tickerIndex] || 'Carregando atualizacoes da operacao...';
  const scopeSubtitle = wallboardData?.scope === 'cluster'
    ? `Painel estratégico regional • ${wallboardData.scopeLabel}`
    : 'Painel estratégico global';

  if (loading && !wallboardData) {
    return (
      <div style={{ ...styles.wallboardContainer, alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <div style={styles.logoBadge}><Zap size={24} color="white" fill="white" /></div>
        <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Sincronizando Modo TV
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Buscando vendas, RH, churn e expansao reais da operacao.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wallboardContainer}>
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="neon-cyan" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00f2fe" /><stop offset="100%" stopColor="#4facfe" /></linearGradient>
          <linearGradient id="neon-purple" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c471ed" /><stop offset="100%" stopColor="#f64f59" /></linearGradient>
          <linearGradient id="neon-orange" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f83600" /><stop offset="100%" stopColor="#f9d423" /></linearGradient>
          <linearGradient id="neon-green" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ba360" /><stop offset="100%" stopColor="#3cba92" /></linearGradient>
          <linearGradient id="neon-gray" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#94a3b8" /><stop offset="100%" stopColor="#475569" /></linearGradient>
          <linearGradient id="neon-cyan-alpha" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#00f2fe" stopOpacity={0.5} /><stop offset="100%" stopColor="#4facfe" stopOpacity={0} /></linearGradient>
          <linearGradient id="neon-green-alpha" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0ba360" stopOpacity={0.5} /><stop offset="100%" stopColor="#3cba92" stopOpacity={0} /></linearGradient>
          <linearGradient id="neon-orange-alpha" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#f83600" stopOpacity={0.5} /><stop offset="100%" stopColor="#f9d423" stopOpacity={0} /></linearGradient>
          <linearGradient id="neon-purple-alpha" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#c471ed" stopOpacity={0.5} /><stop offset="100%" stopColor="#f64f59" stopOpacity={0} /></linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      </svg>

      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '30%' }}>
          <div style={styles.logoBadge}><Zap size={18} color="white" fill="white" /></div>
          <div>
            <h1 style={styles.title}>Centro de Comando</h1>
            <p style={styles.subtitle}>{scopeSubtitle}</p>
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
            <button onClick={() => setAutoScroll((value) => !value)} style={{ ...styles.scrollBtn, color: autoScroll ? '#00f2fe' : '#8b8fa3' }}>
              {autoScroll ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)', margin: '0 5px' }} />
            <button onClick={() => scrollRef.current?.scrollBy({ top: 600, behavior: 'smooth' })} style={styles.scrollBtn}><ChevronDown size={16} /></button>
          </div>
          {error ? (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#f9d423', textAlign: 'center' }}>
              <AlertTriangle size={12} />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => refreshWallboard()}
                style={{ background: 'transparent', border: '1px solid rgba(249,212,35,0.35)', color: '#f9d423', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', fontSize: '10px', fontWeight: 900 }}
              >
                Tentar de novo
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', width: '30%' }}>
          <button
            type="button"
            onClick={() => refreshWallboard()}
            style={{ background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.22)', color: '#00f2fe', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Atualizar dados reais"
          >
            <RefreshCw size={16} />
          </button>
          <div style={styles.clockContainer}>
            <Clock size={14} color="#00f2fe" />
            <span style={styles.clockText}>
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          {onExit ? (
            <button onClick={onExit} style={styles.exitBtn} title="Sair do Modo TV"><X size={18} /></button>
          ) : null}
        </div>
      </div>

      <div style={styles.scrollArea} className="hide-scrollbar" ref={scrollRef}>
        <Mod1Operacao collapsed={collapsed.operacao} onToggle={() => toggleModule('operacao')} rhData={wallboardData?.rhData || {}} />
        <Mod2Vendas collapsed={collapsed.vendas} onToggle={() => toggleModule('vendas')} salesData={wallboardData?.salesData || { cluster: {}, cities: [], topSellers: [] }} />
        <Mod3Churn collapsed={collapsed.churn} onToggle={() => toggleModule('churn')} churnData={wallboardData?.churnData || { cities: [], churnReasons: [], penetrationEvolution: [], penetrationSeries: [] }} />
        <Mod4Expansion
          collapsed={collapsed.mega}
          onToggle={() => toggleModule('mega')}
          megaFilterCluster={megaFilterCluster}
          megaFilterCity={megaFilterCity}
          onFilterCluster={setMegaFilterCluster}
          onFilterCity={setMegaFilterCity}
          megaClusters={megaClusters}
          megaCities={megaCities}
          filteredMegaData={filteredMegaData}
          isMegaFiltered={isMegaFiltered}
          totalFilteredNetAdds={totalFilteredNetAdds}
          glowStyle={glowStyle}
        />
      </div>

      <div style={styles.tickerWrapper}>
        <div style={styles.tickerContainer}>
          <div style={styles.tickerLabel}><Flame size={14} fill="currentColor" /> LIVE</div>
          <div style={styles.tickerTrack}>
            <div style={styles.tickerText}>
              <span style={{ color: '#f9d423', fontWeight: '900', textShadow: '0 0 10px rgba(249,212,35,0.8)' }}>{tickerText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
