// ============================================================
//  Timeline.jsx — Hub Crescimento
//  Layout: horizontal com scroll
//  Exibe as 5 mais recentes por padrão + botão "carregar mais"
// ============================================================

import React, { useState } from 'react';
import { colors, moeda } from '../../components/ui';
import {
  Activity, CheckCircle2, Clock, PlayCircle,
  Flag, DollarSign, Plus, ChevronLeft
} from 'lucide-react';

const PAGE = 5; // quantos eventos mostrar por vez

// ── Helpers ──────────────────────────────────────────────────
const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDate = (value) => {
  const d = toDate(value);
  if (!d) return { line1: '--', line2: '' };
  return {
    line1: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d),
    line2: String(d.getFullYear()),
  };
};

const short = (text, max = 90) => {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}…`;
};

const getStatus = (ev) => {
  if (ev.type === 'task_done') return 'done';
  if (ev.type === 'task_deleted') return 'danger';
  if (ev.type === 'task_reopened') return 'pending';
  if (ev.type === 'plan_created' || ev.type === 'action_created') return 'done';
  if (ev.type === 'action_status') {
    const st = String(ev.meta?.status || '').toLowerCase();
    if (st === 'finalizada') return 'done';
    if (st === 'cancelada') return 'danger';
    return 'pending';
  }
  return 'pending';
};

const getIconType = (ev, status) => {
  if (ev.type === 'plan_created' || ev.type === 'action_created') return 'start';
  if (ev.type === 'action_status' && String(ev.meta?.status || '').toLowerCase() === 'finalizada') return 'end';
  if (status === 'done') return 'done';
  if (status === 'danger') return 'danger';
  return 'pending';
};

// ── Node (cada ponto da timeline) ────────────────────────────
function TimelineNode({ ev, isFirst, isLast }) {
  const status    = getStatus(ev);
  const iconType  = getIconType(ev, status);
  const isDone    = status === 'done';
  const isDanger  = status === 'danger';

  const accent = isDone ? colors.success : isDanger ? colors.danger : colors.warning;
  const iconBg = isDone
    ? 'rgba(16,185,129,0.12)'
    : isDanger
    ? 'rgba(239,68,68,0.12)'
    : 'rgba(245,158,11,0.12)';

  const { line1, line2 } = fmtDate(ev.createdAt);
  const meta = ev.meta || {};
  const showKpi    = meta.kpiName || meta.kpiResult !== undefined;
  const showBudget = Number(meta.budget || 0) > 0;
  const showStatus = meta.status;
  const showReport = meta.report;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: '160px',
      maxWidth: '200px',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Linha horizontal (antes do nó) */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
        {/* segmento esquerdo */}
        <div style={{
          flex: 1,
          height: '2px',
          background: isFirst ? 'transparent' : (isDone ? colors.success : 'var(--border)'),
          opacity: isFirst ? 0 : (isDone ? 1 : 0.4),
          borderRadius: '2px',
        }} />

        {/* Ícone central */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: iconBg,
          border: `2px solid ${accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 4px var(--bg-card)`,
          zIndex: 2,
        }}>
          {iconType === 'start'   ? <PlayCircle   size={14} color={accent} /> :
           iconType === 'end'     ? <Flag          size={14} color={accent} /> :
           isDone                 ? <CheckCircle2  size={14} color={accent} /> :
                                    <Clock         size={14} color={accent} />}
        </div>

        {/* segmento direito */}
        <div style={{
          flex: 1,
          height: '2px',
          background: isLast ? 'transparent' : 'var(--border)',
          opacity: isLast ? 0 : 0.4,
          borderRadius: '2px',
        }} />
      </div>

      {/* Card de conteúdo */}
      <div style={{
        width: '100%',
        background: 'var(--bg-app)',
        border: `1px solid ${isDone ? `${colors.success}40` : isDanger ? `${colors.danger}30` : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
      }}>
        {/* Data */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: '900', color: accent }}>{line1}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>{line2}</span>
        </div>

        {/* Texto principal */}
        <div style={{
          fontSize: '12px', fontWeight: '800',
          color: isDone ? 'var(--text-main)' : 'var(--text-muted)',
          lineHeight: 1.35,
        }}>
          {short(ev.text || 'Evento')}
        </div>

        {/* Chips de meta */}
        {(showStatus || showKpi || showBudget) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
            {showStatus && (
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-panel)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                {meta.status}
              </span>
            )}
            {showKpi && (
              <span style={{ fontSize: '10px', fontWeight: '900', color: colors.info, background: 'rgba(6,182,212,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                KPI{meta.kpiResult !== undefined && meta.kpiResult !== null ? ` = ${meta.kpiResult}` : ''}
              </span>
            )}
            {showBudget && (
              <span style={{ fontSize: '10px', fontWeight: '900', color: colors.danger, background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <DollarSign size={9} />{moeda(Number(meta.budget || 0))}
              </span>
            )}
          </div>
        )}

        {/* Relatório */}
        {showReport && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic', lineHeight: 1.3 }}>
            "{short(String(meta.report || ''), 60)}"
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Timeline({ events = [] }) {
  const [visible, setVisible] = useState(PAGE);

  if (!events.length) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700' }}>
        Sem eventos ainda.
      </div>
    );
  }

  // Exibe os mais recentes primeiro — fatia para exibição
  const sorted  = [...events].sort((a, b) => {
    const ta = toDate(a.createdAt)?.getTime() || 0;
    const tb = toDate(b.createdAt)?.getTime() || 0;
    return ta - tb; // cronológico: mais antigo → mais novo (esquerda → direita)
  });

  const shown    = sorted.slice(Math.max(0, sorted.length - visible));
  const hasMore  = visible < sorted.length;
  const total    = sorted.length;

  return (
    <div style={{ marginTop: '4px' }}>

      {/* Cabeçalho */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Activity size={14} color={colors.primary} />
          Histórico · {total} evento{total !== 1 ? 's' : ''}
        </div>

        {hasMore && (
          <button
            onClick={() => setVisible(v => v + PAGE)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'var(--bg-panel)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '5px 10px',
              fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.color = colors.primary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Plus size={11} /> Carregar mais ({total - visible > 0 ? total - visible : 0} anteriores)
          </button>
        )}
      </div>

      {/* Trilho horizontal com scroll */}
      <div style={{
        overflowX: 'auto',
        overflowY: 'visible',
        paddingBottom: '12px',
        // scrollbar visível e estilizada
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border) transparent',
      }}>
        <div style={{
          display: 'flex',
          gap: '0px',
          alignItems: 'flex-start',
          minWidth: 'max-content',
          padding: '8px 4px 4px',
        }}>
          {shown.map((ev, i) => (
            <TimelineNode
              key={ev.id || i}
              ev={ev}
              isFirst={i === 0}
              isLast={i === shown.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Indicador de scroll se tiver muitos itens */}
      {shown.length > 3 && (
        <div style={{
          textAlign: 'center', fontSize: '10px',
          color: 'var(--text-muted)', fontWeight: '600',
          marginTop: '2px', opacity: 0.6,
        }}>
          ← role para ver mais →
        </div>
      )}
    </div>
  );
}
