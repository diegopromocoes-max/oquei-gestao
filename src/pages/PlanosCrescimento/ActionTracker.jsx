import React from 'react';
import { Badge, Btn, Card, data, colors, styles as ui } from '../../components/ui';
import { STATUS_BADGE } from './constants';

export default function ActionTracker({ plans, cityMap, startEdit, setStepsModalOpen, setStepsPlan }) {
  return (
    <Card title="Acompanhamento Ativo" subtitle="Monitoramento de execução, evolução dos KPIs e prazos.">
      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr><th style={ui.th}>Operação</th><th style={ui.th}>Objetivos</th><th style={ui.th}>Prazo</th><th style={ui.th}>Status</th><th style={ui.th}>Ações</th></tr>
          </thead>
          <tbody>
            {plans.map(plan => {
              const rem = plan.endDate ? Math.ceil((new Date(plan.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
              const isLate = rem !== null && rem < 0;
              return (
                <tr key={plan.id} className="ui-tr" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={ui.td}>
                    <div style={{ fontWeight: '900', color: 'var(--text-main)' }}>{plan.name}</div>
                    <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{cityMap[plan.cityId]} • Foco: {plan.actionFocus}</div>
                  </td>
                  <td style={ui.td}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px' }}>{(plan.objectives || []).join(' • ')}</div>
                  </td>
                  <td style={ui.td}>
                    <div style={{ fontWeight: '900', fontSize: '14px', color: 'var(--text-main)' }}>{plan.endDate ? data(plan.endDate) : 'Contínuo'}</div>
                    {rem !== null && <Badge cor={isLate ? 'danger' : rem <= 5 ? 'warning' : 'success'} style={{marginTop:'6px'}}>{isLate ? `${Math.abs(rem)} dias atraso` : `${rem} dias restantes`}</Badge>}
                  </td>
                  <td style={ui.td}><Badge cor={STATUS_BADGE[plan.status] || 'neutral'}>{plan.status}</Badge></td>
                  <td style={ui.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Btn variant="secondary" size="sm" onClick={() => startEdit(plan)}>Detalhes</Btn>
                      <Btn style={{background: colors.primary, color:'white'}} size="sm" onClick={() => {setStepsPlan(plan); setStepsModalOpen(true);}}>Log Diário</Btn>
                    </div>
                  </td>
                </tr>
              )
            })}
            {plans.length === 0 && <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma operação ativa.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}