import React from 'react';
import { colors } from '../styles/globalStyles';

export default function RankingList({ title, subtitle, items = [], renderValue, tone = colors.primary }) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>{title}</div>
          {subtitle ? <div style={styles.subtitle}>{subtitle}</div> : null}
        </div>
      </div>

      <div style={styles.list}>
        {items.length === 0 ? (
          <div style={styles.empty}>Nenhum dado disponível neste filtro.</div>
        ) : items.map((item, index) => (
          <div key={item.id || item.name || `${title}-${index}`} style={styles.row}>
            <div style={{ ...styles.rankBadge, background: `${tone}14`, color: tone }}>{index + 1}</div>
            <div style={styles.content}>
              <strong style={styles.name}>{item.name || item.attendantName || item.city}</strong>
              {item.sub || item.cityName ? <span style={styles.meta}>{item.sub || item.cityName}</span> : null}
            </div>
            <div style={styles.value}>{renderValue ? renderValue(item) : item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '18px',
    boxShadow: 'var(--shadow-sm)',
  },
  header: {
    marginBottom: '14px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  subtitle: {
    marginTop: '4px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  list: {
    display: 'grid',
    gap: '10px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr auto',
    gap: '12px',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  rankBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 900,
  },
  content: {
    minWidth: 0,
    display: 'grid',
    gap: '2px',
  },
  name: {
    fontSize: '13px',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  value: {
    fontSize: '14px',
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  empty: {
    padding: '12px 0',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
};
