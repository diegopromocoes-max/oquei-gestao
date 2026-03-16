import React, { useEffect, useMemo, useState } from 'react';
import { Card, InfoBox, moeda, numero } from '../../components/ui';
import { getPlans } from '../services/planService';
import { calculateGrowthScore } from '../core/growthEngine';
import { generateInsights } from '../core/insightGenerator';
import GrowthScoreCard from '../components/GrowthScoreCard';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function DashboardGrowth({ selectedCityId, selectedMonth }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalPlans: 0,
    totalCost: 0,
    totalReturn: 0,
    leadsGenerated: 0,
    realGrowth: 0,
    progressAvg: 0,
    baseStart: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const plans = await getPlans({ cityId: selectedCityId, month: selectedMonth });

      const totalPlans = plans.length;
      const totalCost = plans.reduce((a, p) => a + Number(p.cost || 0), 0);
      const totalReturn = plans.reduce((a, p) => a + Number(p.returnValue || 0), 0);
      const realGrowth = plans
        .filter((p) => p.status === 'Finalizada')
        .reduce((a, p) => a + Number(p.actualBaseImpact || 0), 0);

      const progressAvg = totalPlans
        ? Math.round(plans.reduce((a, p) => a + Number(p.progress || 0), 0) / totalPlans)
        : 0;

      let baseStart = 0;
      if (selectedMonth) {
        const conditions = [where('month', '==', selectedMonth)];
        if (selectedCityId && selectedCityId !== '__all__') {
          conditions.push(where('cityId', '==', selectedCityId));
        }
        const q = query(collection(db, 'monthly_bases'), ...conditions);
        const snap = await getDocs(q);
        baseStart = snap.docs.reduce((a, d) => a + Number(d.data()?.baseStart || 0), 0);
      }

      const leadsQuery = [];
      if (selectedCityId && selectedCityId !== '__all__') {
        leadsQuery.push(where('cityId', '==', selectedCityId));
      }
      const leadsSnap = await getDocs(query(collection(db, 'leads'), ...leadsQuery));
      const leads = leadsSnap.docs.map((d) => d.data());
      const leadsInMonth = selectedMonth
        ? leads.filter((l) => String(l.date || '').startsWith(selectedMonth))
        : leads;
      const leadsGenerated = leadsInMonth.filter((l) => l.originActionId).length;

      setMetrics({
        totalPlans,
        totalCost,
        totalReturn,
        leadsGenerated,
        realGrowth,
        progressAvg,
        baseStart,
      });
      setLoading(false);
    };

    load();
  }, [selectedCityId, selectedMonth]);

  const roi = metrics.totalCost > 0
    ? ((metrics.totalReturn - metrics.totalCost) / metrics.totalCost) * 100
    : 0;
  const cac = metrics.leadsGenerated > 0
    ? metrics.totalCost / metrics.leadsGenerated
    : 0;

  const score = useMemo(() => {
    return calculateGrowthScore({
      vendasMes: 0,
      metaVendas: 0,
      novosClientes: metrics.realGrowth,
      baseAnterior: metrics.baseStart,
      cancelamentos: 0,
      base: metrics.baseStart,
      mediaProgressosPlanos: metrics.progressAvg / 100,
    });
  }, [metrics]);

  const insights = useMemo(() => {
    const diasSemLeads = metrics.leadsGenerated === 0 ? 7 : 0;
    return generateInsights({
      cancelamentos: 0,
      mediaUltimos3Meses: 0,
      custo: metrics.totalCost,
      leadsGenerated: metrics.leadsGenerated,
      diasSemLeads,
      roi,
    });
  }, [metrics, roi]);

  return (
    <div className="hub-stack">
      <Card title="Dashboard Growth" subtitle="Indicadores consolidados">
        {loading ? (
          <div className="hub-empty">Carregando...</div>
        ) : (
          <div className="hub-dashboard-grid">
            <div className="hub-metric">
              <div className="hub-metric-label">Planos</div>
              <div className="hub-metric-value">{numero(metrics.totalPlans)}</div>
            </div>
            <div className="hub-metric">
              <div className="hub-metric-label">Custo total</div>
              <div className="hub-metric-value">{moeda(metrics.totalCost)}</div>
            </div>
            <div className="hub-metric">
              <div className="hub-metric-label">Retorno</div>
              <div className="hub-metric-value">{moeda(metrics.totalReturn)}</div>
            </div>
            <div className="hub-metric">
              <div className="hub-metric-label">CAC</div>
              <div className="hub-metric-value">{moeda(cac)}</div>
            </div>
            <div className="hub-metric">
              <div className="hub-metric-label">ROI</div>
              <div className="hub-metric-value">{roi.toFixed(1)}%</div>
            </div>
            <div className="hub-metric">
              <div className="hub-metric-label">Crescimento real</div>
              <div className="hub-metric-value">+{numero(metrics.realGrowth)}</div>
            </div>
          </div>
        )}
      </Card>

      <GrowthScoreCard score={score} />

      <Card title="Insights" subtitle="Alertas automaticos">
        {insights.length === 0 && <div className="hub-empty">Sem alertas no momento.</div>}
        {insights.map((ins, i) => (
          <InfoBox key={i} type={ins.type}>{ins.title}: {ins.text}</InfoBox>
        ))}
      </Card>
    </div>
  );
}
