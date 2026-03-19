// src/HubCrescimento/pages/DashboardGrowth.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Componentes do seu Design System
import { Card, InfoBox, moeda, numero } from '../../components/ui';

// Estilos Globais (CUIDADO: Importando como 'global' para seguir seu padrão)
import { styles as global, colors } from '../../styles/globalStyles';
import { hubStyles } from '../styles/hubStyles';

// Serviços e Lógica
import { getPlans } from '../services/planService';
import { getLeadsSummary, getConversionByAction } from '../services/leadService';
import { calculateGrowthScore } from '../core/growthEngine';
import { generateInsights } from '../core/insightGenerator';
import GrowthScoreCard from '../components/GrowthScoreCard';

// ─── Componente Interno de Métrica ─────────────────────────────────────────
function Metric({ label, value, sub, accent }) {
  return (
    <div style={{
      ...hubStyles.metric,
      borderLeft: accent ? `4px solid ${accent}` : `1px solid var(--border)`,
      display: 'flex', flexDirection: 'column', gap: '4px',
      background: 'var(--bg-card)',
      padding: '20px',
      borderRadius: '16px'
    }}>
      <div style={hubStyles.metricLabel}>{label}</div>
      <div style={hubStyles.metricValue}>{value}</div>
      {sub && <div style={hubStyles.metricSub}>{sub}</div>}
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────
export default function DashboardGrowth({ selectedCityId, selectedMonth, selectedGrowthPlan }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalPlans: 0, totalCost: 0, totalReturn: 0, leadsGenerated: 0,
    leadsConverted: 0, conversionRate: 0, realGrowth: 0, progressAvg: 0, baseStart: 0
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const loadedPlans = await getPlans({
          cityId: selectedCityId,
          month: selectedMonth,
          growthPlanId: selectedGrowthPlan?.id,
        });

        const totalCost = loadedPlans.reduce((a, p) => a + Number(p.cost || 0), 0);
        const totalReturn = loadedPlans.reduce((a, p) => a + Number(p.returnValue || 0), 0);
        const realGrowth = loadedPlans.filter(p => p.status === 'Finalizada').reduce((a, p) => a + Number(p.actualBaseImpact || 0), 0);
        const progressAvg = loadedPlans.length ? Math.round(loadedPlans.reduce((a, p) => a + Number(p.progress || 0), 0) / loadedPlans.length) : 0;

        // Busca base inicial
        let baseStart = 0;
        if (selectedMonth) {
          const conditions = [where('month', '==', selectedMonth)];
          if (selectedCityId && selectedCityId !== '__all__') conditions.push(where('cityId', '==', selectedCityId));
          const snap = await getDocs(query(collection(db, 'monthly_bases'), ...conditions));
          baseStart = snap.docs.reduce((a, d) => a + Number(d.data()?.baseStart || 0), 0);
        }

        const actionIds = loadedPlans.map(p => p.id);
        const leadsSummary = await getLeadsSummary({ cityId: selectedCityId, month: selectedMonth, actionIds });

        setMetrics({ 
          totalPlans: loadedPlans.length, 
          totalCost, 
          totalReturn, 
          leadsGenerated: leadsSummary.totalLeads, 
          leadsConverted: leadsSummary.convertedLeads, 
          conversionRate: leadsSummary.conversionRate, 
          realGrowth, 
          progressAvg, 
          baseStart 
        });
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCityId, selectedMonth, selectedGrowthPlan?.id]);

  const roi = metrics.totalCost > 0 ? ((metrics.totalReturn - metrics.totalCost) / metrics.totalCost) * 100 : 0;
  const cac = metrics.leadsGenerated > 0 ? metrics.totalCost / metrics.leadsGenerated : 0;
  
const score = useMemo(() => calculateGrowthScore({
    totalPlans: metrics.totalPlans,
    leadsGenerated: metrics.leadsGenerated,
    conversionRate: metrics.conversionRate,
    roi: roi,
    progressAvg: metrics.progressAvg,
  }), [metrics, roi]);

  const insights = useMemo(() => generateInsights({
    custo: metrics.totalCost,
    leadsGenerated: metrics.leadsGenerated,
    roi,
  }), [metrics, roi]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando Dashboard...</div>;

  // ✅ O return agora está dentro da função e usa seu Grid System global
  return (
    <div style={global.container}>
      
      {/* 1. KPIs Principais - Agora em 4 colunas reais */}
      <div style={{ ...global.grid4, marginBottom: '24px' }}>
        <Metric label="Ações Ativas" value={numero(metrics.totalPlans)} />
        <Metric label="Custo Total" value={moeda(metrics.totalCost)} />
        <Metric label="ROI Estimado" value={`${roi.toFixed(1)}%`} accent={roi >= 0 ? colors.success : colors.danger} />
        <Metric label="CAC Médio" value={moeda(cac)} sub={`${metrics.leadsGenerated} leads`} />
      </div>

      {/* 2. Score e Insights - Em 2 colunas */}
      <div style={global.grid2}>
        <GrowthScoreCard score={score} />
        
        <Card title="Insights Automáticos" subtitle="Análise de Performance">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {insights.length > 0 ? insights.map((ins, i) => (
              <InfoBox key={i} type={ins.type}>
                <strong>{ins.title}:</strong> {ins.text}
              </InfoBox>
            )) : (
              <InfoBox type="success">Operação saudável. Continue acompanhando os planos de ação.</InfoBox>
            )}
          </div>
        </Card>
      </div>

      {/* 3. Rodapé informativo */}
      <div style={{ marginTop: '24px' }}>
         <Card title="Crescimento Real">
            <div style={{ display: 'flex', gap: '40px' }}>
               <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Conversão Global</span>
                  <h2 style={{ margin: 0, fontWeight: '900', color: colors.primary }}>{metrics.conversionRate}%</h2>
               </div>
               <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Novos Clientes (HUB)</span>
                  <h2 style={{ margin: 0, fontWeight: '900', color: colors.success }}>+{metrics.realGrowth}</h2>
               </div>
            </div>
         </Card>
      </div>
    </div>
  );
}