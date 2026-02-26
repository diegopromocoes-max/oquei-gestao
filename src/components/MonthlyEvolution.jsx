import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function MonthlyEvolution({ allLeads, myStores, chartClusterFilter, chartCityFilter }) {
  const evolutionData = useMemo(() => {
    let targetStores = myStores;
    if (chartClusterFilter !== 'all') targetStores = targetStores.filter(s => s.clusterId === chartClusterFilter);
    if (chartCityFilter !== 'all') targetStores = targetStores.filter(s => s.name === chartCityFilter);
    const validStoreIds = targetStores.map(s => s.name);

    const monthlyStats = {};

    allLeads.forEach(lead => {
      if (!validStoreIds.includes(lead.cityId)) return;
      const isClosed = lead.status === 'Contratado' || lead.status === 'Instalado';
      if (!isClosed) return;
      
      const month = lead.date?.slice(0, 7); 
      if (!month) return;

      if (!monthlyStats[month]) monthlyStats[month] = { month, Planos: 0, Migrações: 0, SVA: 0 };
      
      if (lead.leadType === 'Plano Novo') monthlyStats[month].Planos++;
      if (lead.leadType === 'Migração') monthlyStats[month].Migrações++;
      if (lead.leadType === 'SVA') monthlyStats[month].SVA++;
    });

    const sortedData = Object.values(monthlyStats).sort((a, b) => a.month.localeCompare(b.month));
    const formatMonth = (yyyyMm) => {
      const [y, m] = yyyyMm.split('-');
      const date = new Date(y, m - 1, 1);
      return date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').toUpperCase();
    };

    return sortedData.map(d => ({ ...d, displayMonth: formatMonth(d.month) }));
  }, [allLeads, myStores, chartClusterFilter, chartCityFilter]);

  return (
    <div id="evolucao-mensal" style={{marginBottom: '40px'}}>
      <h3 style={styles.mainSectionTitle}>
        <TrendingUp size={24} color="#059669" /> Evolução Mensal (Consolidado)
      </h3>
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <div>
            <h3 style={styles.chartTitle}>Histórico de Vendas (Últimos 6 meses)</h3>
            <p style={styles.chartSubtitle}>Tendência de crescimento baseada no filtro selecionado</p>
          </div>
        </div>
        <div style={{ height: '350px', width: '100%', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
              <RechartsTooltip contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
              <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', paddingTop: '20px' }} />
              <Line type="monotone" name="Planos de Internet" dataKey="Planos" stroke="#2563eb" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              <Line type="monotone" name="Migrações" dataKey="Migrações" stroke="#f59e0b" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              <Line type="monotone" name="Serviços (SVA)" dataKey="SVA" stroke="#7c3aed" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
          {evolutionData.length === 0 && <div style={styles.emptyChartOverlay}>Nenhum dado histórico encontrado para este período.</div>}
        </div>
      </div>
    </div>
  );
}

const styles = {
  mainSectionTitle: { fontSize: '20px', fontWeight: '900', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  chartCard: { background: 'white', padding: '30px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.02)' },
  chartHeader: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 },
  chartSubtitle: { fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  emptyChartOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', backdropFilter: 'blur(2px)' },
};