import React, { useState } from 'react';
import { Badge, Btn, Card, data, colors, styles as ui } from '../../components/ui';
import { STATUS_BADGE } from './constants';
import { Activity, CheckCircle2, Clock, PlayCircle, Flag, User, DollarSign } from 'lucide-react';

export default function ActionTracker({ plans, cityMap, startEdit, setStepsModalOpen, setStepsPlan }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <Card title="Acompanhamento Ativo" subtitle="Monitoramento de execução, evolução dos KPIs e linha do tempo.">
      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr><th style={ui.th}>Operação</th><th style={ui.th}>Objetivos</th><th style={ui.th}>Prazo Final</th><th style={ui.th}>Status</th><th style={ui.th}>Ações</th></tr>
          </thead>
          <tbody>
            {plans.map(plan => {
              const rem = plan.endDate ? Math.ceil((new Date(plan.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
              const isLate = rem !== null && rem < 0;
              const isExpanded = expandedId === plan.id;

              return (
                <React.Fragment key={plan.id}>
                  <tr className="ui-tr" style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }}>
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
                    <td style={ui.td}><Badge cor={STATUS_BADGE[plan.status]}>{plan.status}</Badge></td>
                    <td style={ui.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Btn variant={isExpanded ? 'primary' : 'secondary'} size="sm" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                          {isExpanded ? 'Recolher' : 'Evolução'}
                        </Btn>
                        <Btn size="sm" onClick={() => {setStepsPlan(plan); setStepsModalOpen(true);}}>Gerenciar Etapas</Btn>
                      </div>
                    </td>
                  </tr>
                  
                  {/* EXPANSÃO DA TIMELINE (ESTILO DRIBBBLE) */}
                  {isExpanded && (
                    <tr>
                      <td colSpan="5" style={{ padding: '0 24px 24px 24px', borderBottom: '1px solid var(--border)' }}>
                        <TimelineVisual plan={plan} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── O COMPONENTE VISUAL DA TIMELINE (ESTILO DRIBBBLE) ───
function TimelineVisual({ plan }) {
  const events = [];
  
  // 1. O Ponto de Partida
  events.push({ 
    id: 'start',
    date: plan.startDate || plan.createdAt, 
    title: 'Planejamento Lançado', 
    subtitle: `Orçamento Inicial: R$ ${plan.cost || '0,00'}`,
    type: 'start', 
    status: 'done' 
  });
  
  // 2. As Etapas do Meio
  (plan.planningSteps || []).forEach(s => events.push({ id: s.id, date: s.deadline || s.date, title: s.text, type: 'step', status: s.completed ? 'done' : 'pending', resp: s.responsible || s.author, extraCost: s.addedBudget }));
  (plan.executionSteps || []).forEach(s => events.push({ id: s.id, date: s.deadline || s.date, title: s.text, type: 'step', status: s.completed ? 'done' : 'pending', resp: s.responsible || s.author, extraCost: s.addedBudget }));
  
  // 3. O Ponto de Chegada
  if (plan.endDate) {
    events.push({ 
      id: 'end',
      date: plan.endDate, 
      title: 'Prazo Limite (Deadline)', 
      subtitle: 'Data alvo para conclusão da ação conjunta.',
      type: 'end', 
      status: plan.status === 'Finalizada' ? 'done' : 'target' 
    });
  }

  // Ordena cronologicamente
  events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  return (
    <div className="animate-fadeIn" style={{ background: 'var(--bg-app)', padding: '30px 40px', borderRadius: '16px', border: '1px solid var(--border)', marginTop: '10px' }}>
      <h4 style={{ margin: '0 0 30px 0', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={18} color={colors.primary}/> Histórico de Evolução
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;
          const isDone = ev.status === 'done';
          const isTarget = ev.status === 'target';

          // Define as Cores dos Pontos e Linhas
          const iconColor = isDone ? colors.success : isTarget ? colors.warning : 'var(--border)';
          const iconBg = isDone ? 'rgba(16, 185, 129, 0.1)' : isTarget ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-panel)';
          const lineColor = events[i + 1]?.status === 'done' ? colors.success : 'var(--border)';

          return (
            <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '100px 40px 1fr', minHeight: '80px' }}>
              
              {/* COLUNA ESQUERDA: Data */}
              <div style={{ textAlign: 'right', paddingRight: '15px', paddingTop: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{ev.date ? data(ev.date).substring(0,5) : '--'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{ev.date ? new Date(ev.date).getFullYear() : ''}</div>
              </div>

              {/* COLUNA CENTRAL: O Eixo (Linha e Ícone) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* O Ícone */}
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: iconBg, border: `2px solid ${iconColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  {ev.type === 'start' ? <PlayCircle size={14} color={iconColor}/> : 
                   ev.type === 'end' ? <Flag size={14} color={iconColor}/> : 
                   isDone ? <CheckCircle2 size={14} color={iconColor}/> : 
                   <Clock size={14} color={iconColor}/>}
                </div>
                {/* A Linha (que vai até o próximo evento) */}
                {!isLast && (
                  <div style={{ width: '2px', flex: 1, background: lineColor, margin: '4px 0', borderRadius: '2px', opacity: isDone ? 1 : 0.4 }} />
                )}
              </div>

              {/* COLUNA DIREITA: Conteúdo (Título, Responsável, Custos) */}
              <div style={{ paddingLeft: '15px', paddingBottom: '30px' }}>
                <div style={{ fontSize: '14px', fontWeight: '900', color: isDone ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {ev.title}
                </div>
                
                {ev.subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{ev.subtitle}</div>}
                
                {/* Tags da Etapa (Responsável e Orçamento Extra) */}
                {(ev.resp || ev.extraCost > 0) && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    {ev.resp && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-panel)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <User size={12}/> {ev.resp}
                      </span>
                    )}
                    {ev.extraCost > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '900', color: colors.danger, background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                        <DollarSign size={12}/> + R$ {ev.extraCost}
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}