import React, { useMemo } from 'react';
import { Target, TrendingUp, Calendar, Users, Activity, CheckCircle } from 'lucide-react';
import { Card, colors, moeda } from '../../components/ui';

export default function GrowthDashboard({ plans, baseD0, selectedMonth }) {
  
  const metrics = useMemo(() => {
    const andamento = plans.filter(p => p.status === 'Em Andamento');
    const finalizadas = plans.filter(p => p.status === 'Finalizada');
    
    const realGrowth = finalizadas.reduce((a, p) => a + Number(p.actualBaseImpact || 0), 0);
    
    // NOVO: Cálculo de custo soma orçamento inicial + extras das etapas
    const totalCost = finalizadas.reduce((a, p) => {
      const initCost = Number(p.cost || 0);
      const extraExec = (p.executionSteps || []).reduce((sum, s) => sum + Number(s.addedBudget || 0), 0);
      const extraPlan = (p.planningSteps || []).reduce((sum, s) => sum + Number(s.addedBudget || 0), 0);
      return a + initCost + extraExec + extraPlan;
    }, 0);

    const totalReturn = finalizadas.reduce((a, p) => a + Number(p.returnValue || 0), 0);

    const focusMap = {};
    plans.forEach(p => {
      const f = p.actionFocus || 'Outro';
      focusMap[f] = (focusMap[f] || 0) + 1;
    });

    const focusChart = Object.keys(focusMap)
      .map(k => ({ name: k, count: focusMap[k], pct: Math.round((focusMap[k] / plans.length) * 100) || 0 }))
      .sort((a, b) => b.count - a.count);

    return { andamento: andamento.length, finalizadas: finalizadas.length, realGrowth, totalCost, totalReturn, focusChart, totalPlans: plans.length };
  }, [plans]);

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return '--/--';
    const [y, m] = selectedMonth.split('-');
    return `${m}/${y}`;
  }, [selectedMonth]);

  const maxFinancial = Math.max(metrics.totalCost, metrics.totalReturn, 1000);

  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. CABEÇALHO DE KPIs */}
      <div style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, #1e293b 100%)`, padding: '24px', borderRadius: '24px', color: 'white', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', boxShadow: `0 10px 30px rgba(0,0,0,0.15)` }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> Mês Ref.</span>
          <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '6px' }}>{monthLabel}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14}/> Base Inicial</span>
          <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '6px' }}>{baseD0.toLocaleString('pt-BR')}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14}/> Andamento</span>
          <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '6px', color: '#fcd34d' }}>{metrics.andamento}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14}/> Finalizadas</span>
          <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '6px', color: '#cbd5e1' }}>{metrics.finalizadas}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14}/> Resultado Atual</span>
          <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '6px', color: '#34d399' }}>+{metrics.realGrowth}</div>
        </div>
      </div>

      {/* 2. GRÁFICOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(300px, 1fr)', gap: '24px' }}>
        <Card title="Distribuição Estratégica" subtitle="Volume de planos criados por Foco de Ação.">
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {metrics.focusChart.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sem dados no momento.</div>}
            {metrics.focusChart.map((item, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                  <span>{item.name}</span><span style={{ color: 'var(--text-muted)' }}>{item.count} ({item.pct}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: 'var(--bg-app)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.pct}%`, height: '100%', background: colors.primary, borderRadius: '5px' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Eficiência Financeira Acumulada" subtitle="Custo (Inicial + Extras) vs. Retorno.">
          <div style={{ height: '220px', marginTop: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: '20px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 0, opacity: 0.1 }}>
               <div style={{ borderTop: '1px dashed var(--text-main)' }}></div>
               <div style={{ borderTop: '1px dashed var(--text-main)' }}></div>
               <div style={{ borderTop: '1px dashed var(--text-main)' }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, width: '80px' }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: colors.danger }}>{moeda(metrics.totalCost)}</span>
              <div style={{ width: '50px', height: `${(metrics.totalCost / maxFinancial) * 160}px`, background: colors.danger, borderRadius: '8px 8px 0 0', opacity: 0.9 }} />
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Custo (CAC)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1, width: '80px' }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: colors.success }}>{moeda(metrics.totalReturn)}</span>
              <div style={{ width: '50px', height: `${(metrics.totalReturn / maxFinancial) * 160}px`, background: colors.success, borderRadius: '8px 8px 0 0', opacity: 0.9 }} />
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Retorno</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '800' }}>
            ROI Global: {metrics.totalCost > 0 ? (metrics.totalReturn / metrics.totalCost).toFixed(2) : '0.00'}x
          </div>
        </Card>
      </div>
    </div>
  );
}