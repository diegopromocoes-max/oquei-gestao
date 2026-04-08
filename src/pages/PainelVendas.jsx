import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';

import SpeedometerCard from '../components/SpeedometerCard';
import WarRoomProjections from '../components/WarRoomProjections';
import MonthlyEvolution from '../components/MonthlyEvolution';
import { PerformanceCharts, SvaAnalyzer } from '../components/SalesCharts';
import SalesTable from '../components/SalesTable';
import { buildScopedSalesView, listenMonthlySalesScope } from '../services/monthlySalesService';
import { styles as global, colors } from '../styles/globalStyles';

export default function PainelVendas({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [chartClusterFilter, setChartClusterFilter] = useState('all');
  const [chartCityFilter, setChartCityFilter] = useState('all');
  const [salesPayload, setSalesPayload] = useState(null);

  useEffect(() => {
    const isCoordinator = userData?.role === 'coordinator' || userData?.role === 'coordenador';
    const scope = isCoordinator ? 'global' : 'cluster';
    const clusterId = String(userData?.clusterId || userData?.cluster || '').trim();

    setLoading(true);

    return listenMonthlySalesScope({
      scope,
      clusterId,
      monthKey: selectedMonth,
      callback: (payload) => {
        setSalesPayload(payload);
        setLoading(false);
      },
      onError: (error) => {
        console.warn('Erro ao carregar o Painel de Vendas:', error);
        setLoading(false);
      },
    });
  }, [selectedMonth, userData]);

  const viewData = useMemo(
    () => buildScopedSalesView(salesPayload, { clusterFilter: chartClusterFilter, cityFilter: chartCityFilter }),
    [salesPayload, chartClusterFilter, chartCityFilter],
  );

  const leads = viewData.leads || [];
  const myStores = viewData.cities || [];
  const globalCalendar = viewData.globalCalendar || { total: 22, worked: 1, remaining: 21 };
  const uniqueClusters = viewData.uniqueClusters || [];
  const storeData = viewData.storeData || [];
  const totals = viewData.totals || {
    p: 0,
    m: 0,
    i: 0,
    ss: 0,
    goalP: 0,
    goalM: 0,
    goalS: 0,
    projP: 0,
    projM: 0,
    projI: 0,
    projS: 0,
  };
  const svaAnalysis = viewData.svaAnalysis || { radarData: [], topSellers: [], topCities: [] };

  if (loading) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <RefreshCw className="animate-spin" color={colors?.primary} />
      </div>
    );
  }

  return (
    <div style={global.container}>
      <div style={{ ...global.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...global.iconHeader, background: colors.primary }}>
            <TrendingUp size={32} color="white" />
          </div>
          <div>
            <h2 style={global.title}>Painel de Vendas</h2>
            <p style={global.subtitle}>Gestao de metas da operacao comercial</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ background: `${colors.primary}10`, padding: '10px 20px', borderRadius: '12px', color: colors.primary, fontWeight: '900' }}>
            {globalCalendar.worked} trab. / {globalCalendar.remaining} rest.
          </div>
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={global.input} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <SpeedometerCard title="Planos Novos" current={totals.p} target={totals.goalP} projection={totals.projP} delay="0s" />
        <SpeedometerCard title="Migracoes" current={totals.m} target={totals.goalM} projection={totals.projM} color="orange" delay="0.1s" />
        <SpeedometerCard title="Instalacoes" current={totals.i} target={totals.p} projection={totals.projI} color="green" delay="0.2s" />
        <SpeedometerCard title="Mix SVA" current={totals.ss} target={totals.goalS} projection={totals.projS} color="purple" delay="0.3s" />
      </div>

      <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '16px', display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button style={chartClusterFilter === 'all' ? local.tabActive : local.tab} onClick={() => setChartClusterFilter('all')}>
          Visao Global
        </button>
        {uniqueClusters.map((clusterId) => (
          <button key={clusterId} style={chartClusterFilter === clusterId ? local.tabActive : local.tab} onClick={() => setChartClusterFilter(clusterId)}>
            {clusterId}
          </button>
        ))}
      </div>

      <WarRoomProjections storeData={storeData} globalCalendar={globalCalendar} />
      <MonthlyEvolution allLeads={leads} myStores={myStores} chartClusterFilter={chartClusterFilter} chartCityFilter={chartCityFilter} />
      <PerformanceCharts storeData={storeData} />
      <SvaAnalyzer svaAnalysis={svaAnalysis} />
      <SalesTable storeData={storeData} />
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
};
