import React from 'react';
import { X, Target, Calendar, TrendingUp, DollarSign, Users, Award, AlertCircle } from 'lucide-react';
import { Badge, colors, data, moeda, styles as ui } from '../../components/ui';
import { OUTCOME_BADGE } from './constants';

export default function ModalAuditoria({ plan, close, cityMap }) {
  const roi = plan.cost > 0 ? (Number(plan.returnValue || 0) / Number(plan.cost)).toFixed(2) : 0;
  const duracao = plan.startDate && plan.endDate ? Math.ceil((new Date(plan.endDate) - new Date(plan.startDate)) / (1000 * 60 * 60 * 24)) : '--';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="animate-fadeInUp" style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '24px', border: '1px solid var(--border)', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }} className="hide-scrollbar">
        
        {/* HEADER */}
        <div style={{ padding: '24px 30px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <Badge cor="neutral">Auditoria de Ação</Badge>
              <Badge cor={OUTCOME_BADGE[plan.outcome || 'neutro']}>{plan.outcome?.toUpperCase() || 'N/D'}</Badge>
            </div>
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '22px', fontWeight: '900' }}>{plan.name}</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', fontWeight: '600' }}>
              📍 {cityMap[plan.cityId]} • Foco: {plan.actionFocus}
            </div>
          </div>
          <button onClick={close} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }}><X size={20}/></button>
        </div>

        {/* CORPO DO RELATÓRIO */}
        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* BLOCO 1: RESUMO EXECUTIVO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> DURAÇÃO</span>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginTop: '8px' }}>{duracao} dias</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{data(plan.startDate)} a {data(plan.endDate)}</div>
            </div>
            <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign size={14}/> CUSTO TOTAL (CAC)</span>
              <div style={{ fontSize: '20px', fontWeight: '900', color: colors.danger, marginTop: '8px' }}>{moeda(plan.cost)}</div>
            </div>
            <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14}/> RETORNO (ROI)</span>
              <div style={{ fontSize: '20px', fontWeight: '900', color: colors.success, marginTop: '8px' }}>{moeda(plan.returnValue)}</div>
              <div style={{ fontSize: '11px', color: colors.success, marginTop: '4px', fontWeight: 'bold' }}>{roi}x sobre o custo</div>
            </div>
            <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', borderLeft: `4px solid ${colors.primary}` }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14}/> IMPACTO NA BASE</span>
              <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginTop: '8px' }}>+{plan.actualBaseImpact || 0} Clientes</div>
            </div>
          </div>

          {/* BLOCO 2: METAS E KPIS ALCANÇADOS */}
          <div>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={18} color={colors.primary}/> Avaliação de KPIs</h4>
            {plan.dynamicMetrics && plan.dynamicMetrics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {plan.dynamicMetrics.map(m => {
                  const pct = m.target > 0 ? Math.min(Math.round((m.achieved / m.target) * 100), 100) : 0;
                  const hitTarget = m.achieved >= m.target;
                  return (
                    <div key={m.id} style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>{m.name}</span>
                        <span style={{ fontWeight: '900', color: hitTarget ? colors.success : 'var(--text-muted)' }}>{m.achieved || 0} / {m.target || 0}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: hitTarget ? colors.success : colors.warning, transition: '1s ease-out' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum KPI quantitativo foi registrado nesta ação.</p>
            )}
          </div>

          {/* BLOCO 3: LIÇÕES APRENDIDAS E CONCLUSÃO */}
          <div style={{ background: 'var(--bg-panel)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={18} color={colors.warning}/> Lições Aprendidas (Debriefing)</h4>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 20px 0', whiteSpace: 'pre-wrap' }}>
              {plan.resultsSummary || 'Nenhuma observação final registrada.'}
            </p>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Veredito de Replicação:</span>
              {plan.replicable === 'sim' ? (
                <Badge cor="success"><Award size={12} style={{marginRight:'4px'}}/> MODELO APROVADO PARA PLAYBOOK</Badge>
              ) : (
                <Badge cor="danger">NÃO REPLICAR NESTE FORMATO</Badge>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}