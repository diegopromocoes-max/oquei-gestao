import React from 'react';
import { Badge, Btn, Card, moeda, colors, styles as ui } from '../../components/ui';
import { OUTCOME_BADGE } from './constants';

export default function ActionFinished({ plans, cityMap, startEdit }) {
  return (
    <Card title="Debriefing e Replicação" subtitle="Ações concluídas passam por auditoria de impacto real na base.">
      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr><th style={ui.th}>Ação Finalizada</th><th style={ui.th}>Investimento</th><th style={ui.th}>Impacto Real</th><th style={ui.th}>Avaliação Final</th><th style={ui.th}>Replicar?</th><th style={ui.th}></th></tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id} className="ui-tr" style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={ui.td}>
                  <div style={{ fontWeight: '900', color: 'var(--text-main)' }}>{plan.name}</div>
                  <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{cityMap[plan.cityId]}</div>
                </td>
                <td style={ui.td}><div style={{ fontWeight: '900', color: colors.danger }}>{moeda(plan.cost || 0)}</div></td>
                <td style={ui.td}>
                  <div style={{ fontWeight: '900', color: plan.actualBaseImpact > 0 ? colors.success : 'var(--text-muted)' }}>
                    {plan.actualBaseImpact > 0 ? `+${plan.actualBaseImpact} Clientes` : `${plan.actualBaseImpact || 0} Clientes`}
                  </div>
                </td>
                <td style={ui.td}><Badge cor={OUTCOME_BADGE[plan.outcome || 'neutro']}>{plan.outcome?.toUpperCase() || 'Pendente'}</Badge></td>
                <td style={ui.td}>{plan.replicable === 'sim' ? <Badge cor="success">SIM</Badge> : <Badge cor="danger">NÃO</Badge>}</td>
                <td style={ui.td}><Btn variant="secondary" size="sm" onClick={() => startEdit(plan)}>Ver Auditoria</Btn></td>
              </tr>
            ))}
            {plans.length === 0 && <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum debriefing pendente.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}