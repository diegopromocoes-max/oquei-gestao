import React from 'react';

export default function ExecutiveSummaryBar({ items = [], compact = false }) {
  return (
    <div style={{ ...styles.wrapper, padding: compact ? '16px 18px' : '20px 22px' }}>
      {items.map((item) => (
        <div key={item.label} style={styles.item}>
          <span style={styles.label}>{item.label}</span>
          <strong style={{ ...styles.value, color: item.color || 'var(--text-main)', fontSize: compact ? '26px' : '30px' }}>
            {item.value}
          </strong>
          <span style={styles.sub}>{item.sub || ' '}</span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '22px',
    boxShadow: 'var(--shadow-sm)',
  },
  item: {
    display: 'grid',
    gap: '6px',
    minWidth: 0,
  },
  label: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  value: {
    lineHeight: 1,
    fontWeight: 900,
  },
  sub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
};
