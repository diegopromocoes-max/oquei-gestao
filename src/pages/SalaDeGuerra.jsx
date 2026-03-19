import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Flame, Target, TrendingUp, TrendingDown, MonitorPlay, 
  MapPin, CalendarClock, ChevronRight, AlertTriangle, 
  CheckCircle, X, Zap, Clock, BarChart3
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function SalaDeGuerra({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [leads, setLeads] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tvMode, setTvMode] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);

  // ── 1. REAL-TIME DATA ──
  useEffect(() => {
    let unsubCities, unsubLeads;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return; }

      unsubCities = onSnapshot(collection(db, 'cities'), (snap) => {
        setCities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubLeads = onSnapshot(collection(db, 'leads'), (snap) => {
        const rawLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const monthLeads = rawLeads.filter(l => {
          if (!l.createdAt) return false;
          const dateStr = typeof l.createdAt === 'string' 
            ? l.createdAt : l.createdAt.toDate?.().toISOString() || String(l.createdAt);
          return dateStr.startsWith(selectedMonth);
        });
        setLeads(monthLeads);
        setLoading(false);
      });
    });
    return () => { unsubAuth(); if (unsubCities) unsubCities(); if (unsubLeads) unsubLeads(); };
  }, [selectedMonth]);

  // ── 2. MOTOR DE PROJEÇÃO POR CIDADE ──
  const cityAnalysis = useMemo(() => {
    if (!cities.length) return [];

    const today = new Date();
    const isCurrentMonth = selectedMonth === today.toISOString().slice(0, 7);
    const day = isCurrentMonth ? today.getDate() : 30; // Se for mês passado, projeta em 30 dias
    const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    return cities.map(city => {
      const cityLeads = leads.filter(l => l.cityId === city.id);
      const vendas = cityLeads.filter(l => l.status === 'Vendido').length;
      const meta = city.target || 0;
      
      // Cálculo da Projeção Linear: (Vendas Atuais / Dias Decorridos) * Dias Totais
      const projecao = day > 0 ? Math.round((vendas / day) * totalDays) : 0;
      const atingimento = meta > 0 ? (vendas / meta) * 100 : 0;
      const gap = meta - projecao;
      
      let status = 'danger'; // Off Track
      if (projecao >= meta) status = 'success'; // On Track
      else if (projecao >= meta * 0.85) status = 'warning'; // At Risk

      return { ...city, vendas, meta, projecao, atingimento, gap, status };
    }).sort((a, b) => b.vendas - a.vendas);
  }, [leads, cities, selectedMonth]);

  if (loading) return <div style={global.container}><p style={{textAlign:'center', padding:'50px', fontWeight:'bold', color:'var(--text-muted)'}}>Iniciando Sala de Guerra...</p></div>;

  return (
    <div style={tvMode ? { background: '#0a0a0a', minHeight: '100vh', padding: '20px' } : { ...global.container, maxWidth: '1400px' }}>
      
      {/* ── CABEÇALHO PADRONIZADO ── */}
      <div style={tvMode ? { ...local.headerWrapper, background: '#111', borderColor: '#333' } : local.headerWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...local.iconBox, background: `linear-gradient(135deg, ${colors.danger}, #ea580c)`, boxShadow: `0 8px 20px ${colors.danger}40` }}>
            <Flame size={28} color="#fff" />
          </div>
          <div>
            <div style={{ ...local.headerTitle, color: tvMode ? '#fff' : 'var(--text-main)' }}>Sala de Guerra</div>
            <div style={local.headerSubtitle}>Monitoramento de Metas e Projeções por Praça</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => setTvMode(!tvMode)} style={{ ...local.navBtnActive, background: tvMode ? colors.danger : 'var(--bg-panel)', color: tvMode ? '#fff' : 'var(--text-main)' }}>
            <MonitorPlay size={16}/> {tvMode ? 'Sair da TV' : 'Modo TV'}
          </button>
          <div style={{ ...local.navBtn, background: tvMode ? '#222' : 'var(--bg-app)', border: '1px solid var(--border)' }}>
            <CalendarClock size={16} color="var(--text-muted)" />
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ ...local.monthInputSmall, color: tvMode ? '#fff' : 'var(--text-main)' }} />
          </div>
        </div>
      </div>

      {/* ── GRID DE CIDADES (O CORAÇÃO DA PÁGINA) ── */}
      <div className="animated-view" style={local.grid}>
        {cityAnalysis.map(city => (
          <div key={city.id} style={{ ...local.cityCard, background: tvMode ? '#111' : 'var(--bg-card)', borderColor: tvMode ? '#333' : 'var(--border)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: tvMode ? '#fff' : 'var(--text-main)' }}>{city.name}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>{city.clusterId || 'Sem Regional'}</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '12px', background: `${colors[city.status]}15`, color: colors[city.status] }}>
                {city.status === 'success' ? <TrendingUp size={20}/> : city.status === 'warning' ? <Zap size={20}/> : <TrendingDown size={20}/>}
              </div>
            </div>

            {/* Progresso Atual */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vendas Atuais</span>
                <span style={{ color: tvMode ? '#fff' : 'var(--text-main)' }}>{city.vendas} / {city.meta}</span>
              </div>
              <div style={local.progressBarBg}>
                <div style={{ ...local.progressBarFill, width: `${Math.min(city.atingimento, 100)}%`, background: colors[city.status] }} />
              </div>
            </div>

            {/* Projeção */}
            <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Projeção Final</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: colors[city.status] }}>{city.projecao}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Atingimento</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: tvMode ? '#fff' : 'var(--text-main)' }}>{city.atingimento.toFixed(1)}%</div>
              </div>
            </div>

            {/* Status Visual */}
            <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {city.status === 'success' ? (
                <CheckCircle size={14} color={colors.success} />
              ) : (
                <AlertTriangle size={14} color={colors[city.status]} />
              )}
              <span style={{ fontSize: '12px', fontWeight: '800', color: colors[city.status] }}>
                {city.status === 'success' ? 'DENTRO DA META' : city.gap > 0 ? `FALTAM ${city.gap} VENDAS` : 'FORA DA META'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.3s ease forwards; }
      `}</style>
    </div>
  );
}

const local = {
  headerWrapper: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
    border: '1px solid var(--border)', borderRadius: '24px',
    padding: '24px 32px', marginBottom: '25px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  iconBox: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  headerSubtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  cityCard: { padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', transition: '0.2s' },
  progressBarBg: { height: '8px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' },
  progressBarFill: { height: '100%', transition: 'width 0.5s ease-in-out' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '14px', border: '1px solid transparent', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' },
  navBtnActive: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '14px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', background: 'var(--bg-panel)' },
  monthInputSmall: { border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '14px', fontWeight: '900', outline: 'none', cursor: 'pointer' }
};