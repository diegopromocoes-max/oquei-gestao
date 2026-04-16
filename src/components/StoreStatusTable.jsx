import React from 'react';
import { colors } from '../styles/globalStyles';

const STATUS_META = {
  surpassing: { label: 'Acima', color: colors.success },
  on_track: { label: 'No caminho', color: colors.success },
  attention: { label: 'Atenção', color: colors.warning },
  critical: { label: 'Crítico', color: colors.danger },
};

export default function StoreStatusTable({ rows = [] }) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Detalhamento por Loja</h3>
        <p style={styles.subtitle}>Régua oficial de instalações com apoio de vendas fechadas e projeção.</p>
      </div>
      <div style={styles.scroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Loja</th>
              <th style={styles.th}>Realizado</th>
              <th style={styles.th}>Meta</th>
              <th style={styles.th}>Projeção</th>
              <th style={styles.th}>Gap</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const statusMeta = STATUS_META[row.projectionStatus] || STATUS_META.attention;
              const gapLabel = row.installGap > 0 ? `${row.installGap} p/ meta` : `+${Math.abs(row.installGap || 0)}`;
              return (
                <tr key={row.id} className="table-row-hover">
                  <td style={styles.td}>
                    <strong style={{ display: 'block', color: 'var(--text-main)' }}>{row.city}</strong>
                    <span style={styles.muted}>Vendas {row.salesPlanos} · Backlog {row.previousMonthBacklogPlans}</span>
                  </td>
                  <td style={styles.td}>{row.installedPlanos}</td>
                  <td style={styles.td}>{row.metaPlanos || '—'}</td>
                  <td style={styles.td}>{row.installedPlansProjectionOfficial}</td>
                  <td style={{ ...styles.td, color: row.installGap > 0 ? colors.warning : colors.success }}>{gapLabel}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.status, color: statusMeta.color, background: `${statusMeta.color}14` }}>
                      {statusMeta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '22px',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  header: {
    padding: '18px 20px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  scroll: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 20px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  td: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border)',
    fontSize: '13px',
    color: 'var(--text-main)',
  },
  muted: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  status: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
  },
};
