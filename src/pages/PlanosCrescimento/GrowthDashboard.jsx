import React, { useMemo } from 'react';
import { Target, TrendingUp, Calendar } from 'lucide-react';
import { Card, colors, moeda, styles as ui } from '../../components/ui';

export default function GrowthDashboard({ plans, baseD0 }) {
  const summary = useMemo(() => {
    const totalCost = plans.reduce((a, p) => a + Number(p.cost || 0), 0);
    const realGrowth = plans.filter(p => p.status === 'Finalizada').reduce((a, p) => a + Number(p.actualBaseImpact || 0), 0);
    return { totalCost, realGrowth, total: plans.length, active: plans.filter(p => p.status === 'Em Andamento').length };
  }, [plans]);

  return (
    <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, #3730a3 100%)`, padding: '30px', borderRadius: '24px', color: 'white', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', boxShadow: `0 10px 30px rgba(79, 70, 229, 0.2)` }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: '900', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Base Inicial (D-0)</span>
          <div style={{ fontSize: '36px', fontWeight: '900', marginTop: '8px' }}>{baseD0.toLocaleString('pt-BR')}</div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>Leitura de S&OP do mês</span>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '30px' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Ações em Andamento</span>
          <div style={{ fontSize: '36px', fontWeight: '900', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={28}/> {summary.active}</div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>Planos ativos em campo</span>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '30px' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Resultado Comprovado</span>
          <div style={{ fontSize: '36px', fontWeight: '900', marginTop: '8px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={28}/> +{summary.realGrowth}</div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>Impacto das finalizadas</span>
        </div>
      </div>

      <div style={ui.grid4}>
        <Card><div style={ui.rowBetween}><span style={{fontSize:'12px', fontWeight:'900', color:'var(--text-muted)'}}>TOTAL DE AÇÕES</span><Target size={18} color={colors.primary}/></div><div style={{fontSize:'28px', fontWeight:'900', marginTop:'10px', color:'var(--text-main)'}}>{summary.total}</div></Card>
        <Card><div style={ui.rowBetween}><span style={{fontSize:'12px', fontWeight:'900', color:'var(--text-muted)'}}>INVESTIMENTO</span><Calendar size={18} color={colors.warning}/></div><div style={{fontSize:'28px', fontWeight:'900', color:colors.warning, marginTop:'10px'}}>{moeda(summary.totalCost)}</div></Card>
      </div>
    </div>
  );
}