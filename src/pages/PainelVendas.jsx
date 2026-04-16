import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, TrendingUp, Wifi, Package, GitMerge, User } from 'lucide-react';

import SpeedometerCard from '../components/SpeedometerCard';
import WarRoomProjections from '../components/WarRoomProjections';
import MonthlyEvolution from '../components/MonthlyEvolution';
import { PerformanceCharts, SvaAnalyzer, MigrationsChart } from '../components/SalesCharts';
import SalesTable from '../components/SalesTable';
import { buildScopedSalesView, listenMonthlySalesScope } from '../services/monthlySalesService';
import { styles as global, colors } from '../styles/globalStyles';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pctLabel(value, goal) {
  if (!goal || goal <= 0) return '—';
  return `${Math.round((value / goal) * 100)}%`;
}

const STATUS_COLORS = {
  surpassing: '#10b981',
  on_track: '#3b82f6',
  attention: '#f59e0b',
  critical: '#ef4444',
};

// ---------------------------------------------------------------------------
// Card de atendente
// ---------------------------------------------------------------------------
function AttendantCard({ card }) {
  const statusColor = STATUS_COLORS[card.projectionStatus] || '#3b82f6';
  const pctVal = card.goalPlansOfficial > 0
    ? Math.round((card.installedPlansProjectionOfficial / card.goalPlansOfficial) * 100)
    : 0;

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', borderTop: `4px solid ${statusColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ background: `${statusColor}18`, borderRadius: '50%', padding: '6px' }}>
          <User size={14} color={statusColor} />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{card.attendantName}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{card.cityName}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '18px', fontWeight: '900', color: statusColor }}>{pctVal}%</div>
      </div>
      <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '10px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pctVal, 100)}%`, height: '100%', background: statusColor }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {[
          { label: 'Vendas', value: card.salesGrossPlans },
          { label: 'Inst.', value: card.installedPlansOfficial },
          { label: 'Backlog', value: card.previousMonthCarryoverPlans },
          { label: 'Projeção', value: card.installedPlansProjectionOfficial, color: statusColor },
          { label: 'Meta', value: card.goalPlansOfficial },
          { label: 'Ritmo', value: `${card.requiredDailyInstalls}/d`, color: card.installGap > 0 ? '#ef4444' : '#10b981' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', borderRadius: '8px', padding: '6px 4px' }}>
            <span style={{ fontSize: '8px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: color || '#1e293b' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI strip para SVA / Migrações
// ---------------------------------------------------------------------------
function SecondaryKpiStrip({ storeData, category, color }) {
  const total = storeData.reduce((acc, s) => acc + (s[category]?.realized ?? 0), 0);
  const goalTotal = storeData.reduce((acc, s) => acc + (s[category]?.goal ?? 0), 0);
  const pct = goalTotal > 0 ? Math.round((total / goalTotal) * 100) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', borderLeft: `4px solid ${color}` }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Total Realizado</div>
        <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{total}</div>
      </div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', borderLeft: `4px solid ${color}` }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Meta Total</div>
        <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{goalTotal}</div>
      </div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', borderLeft: `4px solid ${color}` }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>% da Meta</div>
        <div style={{ fontSize: '28px', fontWeight: '900', color: pct >= 100 ? '#10b981' : pct >= 70 ? color : '#ef4444' }}>{pct}%</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function PainelVendas({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartClusterFilter, setChartClusterFilter] = useState('all');
  const [chartCityFilter, setChartCityFilter] = useState('all');
  const [activeView, setActiveView] = useState('plans'); // 'plans' | 'sva' | 'migrations'
  const [salesPayload, setSalesPayload] = useState(null);

  const isCoordinator = userData?.role === 'coordinator' || userData?.role === 'coordenador';
  const scope = isCoordinator ? 'global' : 'cluster';
  const clusterId = String(userData?.clusterId || userData?.cluster || '').trim();

  useEffect(() => {
    setLoading(true);
    setError(null);

    return listenMonthlySalesScope({
      scope,
      clusterId,
      monthKey: selectedMonth,
      callback: (payload) => {
        setSalesPayload(payload);
        setLoading(false);
      },
      onError: (err) => {
        console.warn('Erro ao carregar o Painel de Vendas:', err);
        setError('Erro ao carregar dados. Verifique sua conexão e tente novamente.');
        setLoading(false);
      },
    });
  }, [selectedMonth, scope, clusterId]);

  const viewData = useMemo(
    () => buildScopedSalesView(salesPayload, { clusterFilter: chartClusterFilter, cityFilter: chartCityFilter }),
    [salesPayload, chartClusterFilter, chartCityFilter],
  );

  const leads = viewData.leads || [];
  const globalCalendar = viewData.globalCalendar || { total: 22, worked: 1, remaining: 21 };
  const uniqueClusters = viewData.uniqueClusters || [];
  const storeData = viewData.storeData || [];
  const totals = viewData.totals || {};
  const attendantCards = viewData.attendantCards || [];
  const svaAnalysis = viewData.svaAnalysis || { radarData: [], topSellers: [], topCities: [] };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div style={{ padding: 100, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <RefreshCw className="animate-spin" size={32} color={colors?.primary} />
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Carregando painel…</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Erro
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div style={{ ...global.container, padding: '40px' }}>
        <div style={{ background: 'white', border: '1px solid #fecaca', borderRadius: '16px', padding: '30px', display: 'flex', gap: '16px', alignItems: 'flex-start', maxWidth: '600px', margin: '0 auto' }}>
          <AlertCircle size={24} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>Falha ao carregar o Painel de Vendas</div>
            <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '14px' }}>{error}</div>
            <button
              onClick={() => { setError(null); setLoading(true); }}
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (storeData.length === 0 && !loading) {
    return (
      <div style={global.container}>
        {renderHeader()}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <TrendingUp size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <div style={{ fontSize: '16px', fontWeight: '700' }}>Nenhum dado encontrado</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>Ajuste os filtros ou verifique as metas cadastradas para {selectedMonth}.</div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  function renderHeader() {
    return (
      <div style={{ ...global.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...global.iconHeader, background: colors.primary }}>
            <TrendingUp size={32} color="white" />
          </div>
          <div>
            <h2 style={global.title}>Painel de Vendas</h2>
            <p style={global.subtitle}>Gestão de metas da operação comercial</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: `${colors.primary}10`, padding: '10px 18px', borderRadius: '12px', color: colors.primary, fontWeight: '900', fontSize: '13px' }}>
            {globalCalendar.worked} trab. / {globalCalendar.remaining} rest.
          </div>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={global.input} />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------------
  return (
    <div style={global.container}>
      {renderHeader()}

      {/* KPIs de Planos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <SpeedometerCard title="Planos Vendidos" current={totals.p} target={totals.goalP} projection={totals.projP} delay="0s" />
        <SpeedometerCard title="Instalações" current={totals.i} target={totals.goalP} projection={totals.projI} color="green" delay="0.1s" />
        <SpeedometerCard title="Migrações" current={totals.m} target={totals.goalM} projection={totals.projM} color="orange" delay="0.2s" />
        <SpeedometerCard title="Mix SVA" current={totals.ss} target={totals.goalS} projection={totals.projS} color="purple" delay="0.3s" />
      </div>

      {/* Filtros: cluster */}
      <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '16px', display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button style={chartClusterFilter === 'all' ? local.tabActive : local.tab} onClick={() => setChartClusterFilter('all')}>
          Visão Global
        </button>
        {uniqueClusters.map((cid) => (
          <button key={cid} style={chartClusterFilter === cid ? local.tabActive : local.tab} onClick={() => setChartClusterFilter(cid)}>
            {cid}
          </button>
        ))}
      </div>

      {/* Abas de visão: Planos / SVA / Migrações */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'plans', label: 'Planos de Internet', Icon: Wifi, color: '#2563eb' },
          { key: 'sva', label: 'SVA', Icon: Package, color: '#7c3aed' },
          { key: 'migrations', label: 'Migrações', Icon: GitMerge, color: '#f59e0b' },
        ].map(({ key, label, Icon, color }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '10px', border: activeView === key ? `2px solid ${color}` : '2px solid #e2e8f0',
              background: activeView === key ? `${color}12` : 'white',
              color: activeView === key ? color : '#64748b',
              fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo por aba */}
      {activeView === 'plans' && (
        <>
          {/* Sala de Guerra */}
          <WarRoomProjections storeData={storeData} />

          {/* Cards por atendente */}
          {attendantCards.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={local.sectionTitle}>
                <User size={18} color={colors.primary} /> Performance por Atendente
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {attendantCards.map((card) => (
                  <AttendantCard key={card.attendantId} card={card} />
                ))}
              </div>
            </div>
          )}

          {/* Gráfico de performance */}
          <PerformanceCharts storeData={storeData} />
        </>
      )}

      {activeView === 'sva' && (
        <>
          <SecondaryKpiStrip storeData={storeData} category="sva" color="#7c3aed" />
          <SvaAnalyzer svaAnalysis={svaAnalysis} />
        </>
      )}

      {activeView === 'migrations' && (
        <>
          <SecondaryKpiStrip storeData={storeData} category="migrations" color="#f59e0b" />
          <MigrationsChart storeData={storeData} />
        </>
      )}

      {/* Evolução temporal — sempre visível, muda série conforme aba */}
      <MonthlyEvolution
        allLeads={leads}
        selectedMonth={selectedMonth}
        scope={scope}
        clusterId={clusterId}
        activeView={activeView}
      />

      {/* Tabela consolidada */}
      <SalesTable storeData={storeData} activeView={activeView} />
    </div>
  );
}

const local = {
  tab: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  tabActive: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    background: 'white',
    color: colors.primary,
    fontWeight: '900',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: '15px', fontWeight: '900', marginBottom: '14px',
    display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b',
  },
};
