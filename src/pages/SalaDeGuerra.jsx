import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Flame, MonitorPlay, RefreshCw } from 'lucide-react';

import ExecutiveSummaryBar from '../components/ExecutiveSummaryBar';
import WarRoomCityCard from '../components/WarRoomCityCard';
import { listenMonthlySalesScope } from '../services/monthlySalesService';
import { colors, styles as global } from '../styles/globalStyles';

function getScopeConfig(userData = {}) {
  const isCoordinator = userData?.role === 'coordinator' || userData?.role === 'coordenador';
  return {
    scope: isCoordinator ? 'global' : 'cluster',
    clusterId: String(userData?.clusterId || userData?.cluster || '').trim(),
  };
}

function buildSummaryItems(viewData = {}, clock = '') {
  const totals = viewData?.totals || {};
  const summary = viewData?.storeStatusSummary || { green: 0, yellow: 0, red: 0 };
  const calendar = viewData?.globalCalendar || { worked: 0, total: 0 };

  return [
    {
      label: 'Instalações x Meta',
      value: `${totals.installedP || 0}/${totals.goalP || 0}`,
      sub: 'régua oficial',
      color: colors.success,
    },
    {
      label: 'Vendas Fechadas',
      value: totals.contractedP || 0,
      sub: `${totals.pendingInstallations || 0} pendentes`,
      color: colors.primary,
    },
    {
      label: 'Projeção Consolidada',
      value: totals.installedPlansProjectionOfficial || 0,
      sub: `gap ${totals.installGap || 0}`,
      color: totals.projectionTone === 'danger' ? colors.danger : totals.projectionTone === 'warning' ? colors.warning : colors.success,
    },
    {
      label: 'Cidades',
      value: `${summary.green}/${summary.yellow}/${summary.red}`,
      sub: 'verde / amarelo / vermelho',
    },
    {
      label: 'Dias Úteis',
      value: `${calendar.worked || 0}/${calendar.total || 0}`,
      sub: clock || 'fechamento operacional',
    },
  ];
}

export default function SalaDeGuerra({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [tvMode, setTvMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [viewData, setViewData] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: tvMode ? '2-digit' : undefined }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [tvMode]);

  useEffect(() => {
    const { scope, clusterId } = getScopeConfig(userData);
    setLoading(true);
    setError('');
    return listenMonthlySalesScope({
      scope,
      clusterId,
      monthKey: selectedMonth,
      callback: (payload) => {
        setViewData(payload);
        setLoading(false);
      },
      onError: (firebaseError) => {
        console.warn('Erro ao carregar a Sala de Guerra:', firebaseError);
        setError('A Sala de Guerra não conseguiu carregar todos os dados agora.');
        setLoading(false);
      },
    });
  }, [selectedMonth, userData]);

  const summaryItems = useMemo(() => buildSummaryItems(viewData, clock), [viewData, clock]);
  const storeData = viewData?.storeData || [];

  if (loading) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <RefreshCw className="animate-spin" color={colors.danger} />
      </div>
    );
  }

  return (
    <div style={tvMode ? local.tvShell : { ...global.container, maxWidth: '1500px' }}>
      <div style={tvMode ? local.tvHeader : local.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={local.iconWrap}>
            <Flame size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerEyebrow}>Sala de Guerra</div>
            <h1 style={{ ...local.headerTitle, color: tvMode ? '#fff' : 'var(--text-main)' }}>Cobrança operacional com urgência visível.</h1>
          </div>
        </div>
        <div style={local.controls}>
          <div style={local.clockChip(tvMode)}>{clock}</div>
          <div style={local.monthWrap(tvMode)}>
            <CalendarClock size={16} color={tvMode ? '#fff' : 'var(--text-muted)'} />
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={local.monthInput(tvMode)} />
          </div>
          <button type="button" onClick={() => setTvMode((current) => !current)} style={local.tvButton(tvMode)}>
            <MonitorPlay size={16} />
            {tvMode ? 'Sair do modo TV' : 'Modo TV'}
          </button>
        </div>
      </div>

      {error ? <div style={local.errorBox}>{error}</div> : null}

      <div style={tvMode ? local.summarySticky : undefined}>
        <ExecutiveSummaryBar items={summaryItems} compact={tvMode} />
      </div>

      <div style={tvMode ? local.tvGrid : local.grid}>
        {storeData.map((city) => <WarRoomCityCard key={city.id} city={city} tvMode={tvMode} />)}
      </div>
    </div>
  );
}

const local = {
  tvShell: {
    minHeight: '100%',
    background: '#050816',
    padding: '20px',
    display: 'grid',
    gap: '18px',
  },
  header: {
    ...global.card,
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    alignItems: 'center',
    padding: '26px',
  },
  tvHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    alignItems: 'center',
    padding: '26px',
    background: '#0d1328',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px',
  },
  iconWrap: {
    width: '58px',
    height: '58px',
    borderRadius: '18px',
    background: `linear-gradient(135deg, ${colors.danger}, #f97316)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 12px 24px ${colors.danger}33`,
  },
  headerEyebrow: {
    fontSize: '11px',
    fontWeight: 800,
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 900,
  },
  controls: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  clockChip: (tvMode) => ({
    padding: '10px 14px',
    borderRadius: '14px',
    background: tvMode ? 'rgba(239,68,68,0.18)' : `${colors.danger}12`,
    color: tvMode ? '#fff' : colors.danger,
    fontWeight: 900,
    fontSize: tvMode ? '20px' : '14px',
  }),
  monthWrap: (tvMode) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '14px',
    border: `1px solid ${tvMode ? 'rgba(255,255,255,0.1)' : 'var(--border)'}`,
    background: tvMode ? '#11192f' : 'var(--bg-card)',
  }),
  monthInput: (tvMode) => ({
    border: 'none',
    background: 'transparent',
    color: tvMode ? '#fff' : 'var(--text-main)',
    fontWeight: 800,
    outline: 'none',
  }),
  tvButton: (tvMode) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: 'none',
    borderRadius: '14px',
    padding: '10px 14px',
    cursor: 'pointer',
    background: tvMode ? colors.danger : 'var(--bg-card)',
    color: tvMode ? '#fff' : 'var(--text-main)',
    fontWeight: 800,
  }),
  errorBox: {
    padding: '14px 16px',
    borderRadius: '16px',
    border: `1px solid ${colors.warning}40`,
    background: `${colors.warning}12`,
    color: colors.warning,
    fontWeight: 700,
  },
  summarySticky: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '18px',
  },
  tvGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '20px',
  },
};
