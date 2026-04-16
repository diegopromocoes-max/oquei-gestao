import React from 'react';
import { colors } from '../styles/globalStyles';

const STATUS_COLORS = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
  primary: colors.primary,
  purple: colors.purple,
};

export default function KpiMetricCard({
  title,
  eyebrow,
  current = 0,
  target = 0,
  projection = 0,
  tone = 'primary',
  helper = '',
  badge = '',
}) {
  const color = STATUS_COLORS[tone] || colors.primary;
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const projectionProgress = target > 0 ? Math.min((projection / target) * 100, 100) : 0;

  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        <div>
          <div style={styles.eyebrow}>{eyebrow || title}</div>
          <h3 style={styles.title}>{title}</h3>
        </div>
        {badge ? <span style={{ ...styles.badge, color, borderColor: `${color}50`, background: `${color}12` }}>{badge}</span> : null}
      </div>

      <div style={styles.valueRow}>
        <div>
          <div style={styles.currentValue}>{current}</div>
          <div style={styles.helper}>{helper}</div>
        </div>
        <div style={styles.metaBox}>
          <span style={styles.metaLabel}>Meta</span>
          <strong style={styles.metaValue}>{target || '—'}</strong>
          <span style={styles.metaLabel}>Proj.</span>
          <strong style={{ ...styles.metaValue, color }}>{projection}</strong>
        </div>
      </div>

      <div style={styles.progressStack}>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%`, background: color }} />
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${projectionProgress}%`, background: `${color}99` }} />
        </div>
      </div>

      <div style={styles.legendRow}>
        <span>Realizado {target > 0 ? `${Math.round(progress)}%` : 'sem meta'}</span>
        <span>Projeção {target > 0 ? `${Math.round(projectionProgress)}%` : 'livre'}</span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  badge: {
    padding: '6px 10px',
    borderRadius: '999px',
    border: '1px solid transparent',
    fontSize: '11px',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  valueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-end',
  },
  currentValue: {
    fontSize: '42px',
    fontWeight: 900,
    color: 'var(--text-main)',
    lineHeight: 1,
  },
  helper: {
    marginTop: '8px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  metaBox: {
    minWidth: '92px',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '2px',
    textAlign: 'right',
  },
  metaLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: '18px',
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  progressStack: {
    display: 'grid',
    gap: '8px',
  },
  progressTrack: {
    height: '9px',
    borderRadius: '999px',
    overflow: 'hidden',
    background: 'var(--bg-app)',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width .3s ease',
  },
  legendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 700,
  },
};
