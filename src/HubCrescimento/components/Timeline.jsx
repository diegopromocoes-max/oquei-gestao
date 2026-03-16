import React from 'react';
import { colors, moeda } from '../../components/ui';
import { Activity, CheckCircle2, Clock, PlayCircle, Flag, DollarSign } from 'lucide-react';

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getDateParts = (value) => {
  const d = toDate(value);
  if (!d) return { day: '--', year: '' };
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d);
  return { day, year: String(d.getFullYear()) };
};

const eventStatus = (ev) => {
  if (ev.type === 'task_done') return 'done';
  if (ev.type === 'task_deleted') return 'danger';
  if (ev.type === 'task_reopened') return 'pending';
  if (ev.type === 'action_status') {
    const st = String(ev.meta?.status || '').toLowerCase();
    if (st === 'finalizada') return 'done';
    if (st === 'cancelada') return 'danger';
    return 'pending';
  }
  if (ev.type === 'plan_created' || ev.type === 'action_created') return 'done';
  return 'pending';
};

const eventIcon = (ev, status) => {
  if (ev.type === 'plan_created' || ev.type === 'action_created') return 'start';
  if (ev.type === 'action_status' && String(ev.meta?.status || '').toLowerCase() === 'finalizada') return 'end';
  if (status === 'done') return 'done';
  if (status === 'danger') return 'danger';
  return 'pending';
};

const short = (text, max = 120) => {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

export default function Timeline({ events = [] }) {
  if (!events.length) {
    return <div className="hub-empty">Sem eventos ainda.</div>;
  }

  return (
    <div className="animate-fadeIn" style={{ background: 'var(--bg-app)', padding: '30px 40px', borderRadius: '16px', border: '1px solid var(--border)', marginTop: '10px' }}>
      <h4 style={{ margin: '0 0 30px 0', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={18} color={colors.primary} /> Historico de evolucao
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;
          const status = eventStatus(ev);
          const iconType = eventIcon(ev, status);
          const isDone = status === 'done';
          const isDanger = status === 'danger';

          const iconColor = isDone ? colors.success : isDanger ? colors.danger : colors.warning;
          const iconBg = isDone ? 'rgba(16, 185, 129, 0.1)' : isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
          const lineColor = events[i + 1] && eventStatus(events[i + 1]) === 'done' ? colors.success : 'var(--border)';

          const { day, year } = getDateParts(ev.createdAt);
          const meta = ev.meta || {};
          const showBudget = Number(meta.budget || 0) > 0;
          const showKpi = meta.kpiName || meta.kpiResult !== undefined;
          const showStatus = meta.status;
          const showReport = meta.report;

          return (
            <div key={ev.id || i} style={{ display: 'grid', gridTemplateColumns: '100px 40px 1fr', minHeight: '80px' }}>
              <div style={{ textAlign: 'right', paddingRight: '15px', paddingTop: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{day}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{year}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: iconBg, border: `2px solid ${iconColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  {iconType === 'start' ? <PlayCircle size={14} color={iconColor} /> :
                   iconType === 'end' ? <Flag size={14} color={iconColor} /> :
                   isDone ? <CheckCircle2 size={14} color={iconColor} /> :
                   <Clock size={14} color={iconColor} />}
                </div>
                {!isLast && (
                  <div style={{ width: '2px', flex: 1, background: lineColor, margin: '4px 0', borderRadius: '2px', opacity: isDone ? 1 : 0.4 }} />
                )}
              </div>

              <div style={{ paddingLeft: '15px', paddingBottom: '30px' }}>
                <div style={{ fontSize: '14px', fontWeight: '900', color: isDone ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {ev.text || 'Evento'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {ev.type || 'evento'}
                </div>

                {(showStatus || showKpi || showBudget) && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {showStatus && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-panel)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        Status: {meta.status}
                      </span>
                    )}
                    {showKpi && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '900', color: colors.info, background: 'rgba(6, 182, 212, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                        KPI: {meta.kpiName || 'KPI'}{meta.kpiResult !== undefined && meta.kpiResult !== null ? ` = ${meta.kpiResult}` : ''}
                      </span>
                    )}
                    {showBudget && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '900', color: colors.danger, background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                        <DollarSign size={12} /> {moeda(Number(meta.budget || 0))}
                      </span>
                    )}
                  </div>
                )}

                {showReport && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Relatorio: {short(String(meta.report || ''))}
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
