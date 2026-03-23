import React from 'react';
import { Badge, Card, colors } from '../../components/ui';
import {
  getPlanStatusLabel,
  getPlanStatusTone,
  getPriorityTone,
  summarizeActionPlans,
} from '../lib/strategicInsights';

export default function ActionPlansSummary({
  plans,
  title = 'Planos de Acao Vinculados',
  subtitle = 'Leitura rapida do que ja foi desdobrado a partir das pesquisas',
}) {
  const summary = summarizeActionPlans(plans);

  return (
    <Card accent={colors.success} title={title} subtitle={subtitle}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginBottom: '14px' }}>
        {[
          { label: 'Total', value: summary.total, color: colors.primary },
          { label: 'Planejamento', value: summary.planejamento, color: colors.warning },
          { label: 'Em andamento', value: summary.andamento, color: colors.info },
          { label: 'Concluidos', value: summary.concluidos, color: colors.success },
        ].map((item) => (
          <div key={item.label} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: item.color, marginTop: '4px' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {!plans?.length ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nenhum plano encontrado para o recorte atual.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {plans.slice(0, 5).map((plan) => {
            const statusColor = getPlanStatusTone(plan.status, colors);
            const priorityColor = getPriorityTone(plan.priority, colors);
            return (
              <div key={plan.id} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{plan.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {plan.cityName && <span>{plan.cityName}</span>}
                      {plan.themeName && <span>{plan.themeName}</span>}
                      {plan.responsibleName && <span>Resp.: {plan.responsibleName}</span>}
                      {plan.dueDate && <span>{new Date(`${plan.dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Badge cor="neutral">{getPlanStatusLabel(plan.status)}</Badge>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: priorityColor, background: `${priorityColor}12`, padding: '4px 8px', borderRadius: '999px' }}>
                      {plan.priority || 'media'}
                    </span>
                  </div>
                </div>
                {(plan.expectedImpact || plan.measurementKpi) && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {plan.expectedImpact && <span>Impacto: {plan.expectedImpact}</span>}
                    {plan.measurementKpi && <span>KPI: {plan.measurementKpi}</span>}
                  </div>
                )}
                <div style={{ height: '4px', borderRadius: '999px', background: statusColor, marginTop: '10px', opacity: 0.8 }} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
