import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { colors } from '../styles/globalStyles';

const STATUS_META = {
  surpassing: { label: 'Acima do alvo', color: colors.success, icon: CheckCircle2 },
  on_track: { label: 'No caminho', color: colors.success, icon: CheckCircle2 },
  attention: { label: 'Em risco', color: colors.warning, icon: AlertTriangle },
  critical: { label: 'Crítico', color: colors.danger, icon: AlertTriangle },
};

export default function WarRoomCityCard({ city, tvMode = false }) {
  const statusMeta = STATUS_META[city.projectionStatus] || STATUS_META.attention;
  const StatusIcon = statusMeta.icon;
  const progress = city.metaPlanos > 0 ? Math.min((city.installedPlansProjectionOfficial / city.metaPlanos) * 100, 100) : 0;
  const gapLabel = city.installGap > 0
    ? `Faltam ${city.installGap} instalações`
    : `Superou em ${Math.max(city.installedPlansProjectionOfficial - city.metaPlanos, 0)}`;

  return (
    <div style={{
      ...styles.card,
      padding: tvMode ? '24px' : '20px',
      borderColor: `${statusMeta.color}45`,
      boxShadow: tvMode && city.projectionStatus === 'critical' ? `0 0 0 1px ${statusMeta.color}55, 0 0 24px ${statusMeta.color}22` : 'var(--shadow-sm)',
      animation: tvMode && city.projectionStatus === 'critical' ? 'pulse 2s infinite' : 'none',
    }}>
      <div style={styles.header}>
        <div>
          <div style={styles.cluster}>{city.clusterName || city.clusterId || 'Sem regional'}</div>
          <h3 style={{ ...styles.city, fontSize: tvMode ? '26px' : '20px' }}>{city.city}</h3>
        </div>
        <span style={{ ...styles.status, color: statusMeta.color, background: `${statusMeta.color}18` }}>
          <StatusIcon size={14} />
          {statusMeta.label}
        </span>
      </div>

      <div style={styles.scoreboard}>
        <div>
          <div style={styles.metricEyebrow}>Instalações oficiais</div>
          <div style={{ ...styles.bigValue, fontSize: tvMode ? '54px' : '44px' }}>{city.installedPlanos}</div>
          <div style={styles.metricSub}>Meta {city.metaPlanos || '—'} · Proj. {city.installedPlansProjectionOfficial}</div>
        </div>
        <div>
          <div style={styles.metricEyebrow}>Vendas fechadas</div>
          <div style={{ ...styles.supportValue, fontSize: tvMode ? '32px' : '26px' }}>{city.salesPlanos}</div>
          <div style={styles.metricSub}>Backlog anterior {city.previousMonthBacklogPlans}</div>
        </div>
      </div>

      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress}%`, background: statusMeta.color }} />
      </div>

      <div style={styles.detailGrid}>
        <div style={styles.detailBox}>
          <span style={styles.detailLabel}>Gap</span>
          <strong style={{ ...styles.detailValue, color: city.installGap > 0 ? colors.warning : colors.success }}>{gapLabel}</strong>
        </div>
        <div style={styles.detailBox}>
          <span style={styles.detailLabel}>Ritmo diário</span>
          <strong style={styles.detailValue}>{city.requiredDailyInstalls}/dia</strong>
        </div>
        <div style={styles.detailBox}>
          <span style={styles.detailLabel}>Dias úteis</span>
          <strong style={styles.detailValue}>{city.workingDaysElapsed}/{city.workingDaysTotal}</strong>
        </div>
        <div style={styles.detailBox}>
          <span style={styles.detailLabel}>Pacing comercial</span>
          <strong style={styles.detailValue}>{city.projectedMonthSalesPlans}</strong>
        </div>
      </div>

      <div style={styles.footer}>
        <Clock3 size={14} color="var(--text-muted)" />
        <span style={styles.footerText}>Hoje {city.installedPlanos} · projeção final {city.installedPlansProjectionOfficial}</span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: 'grid',
    gap: '18px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
  },
  cluster: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  city: {
    margin: 0,
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  status: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  scoreboard: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: '18px',
    alignItems: 'end',
  },
  metricEyebrow: {
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  bigValue: {
    marginTop: '8px',
    lineHeight: 1,
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  supportValue: {
    marginTop: '8px',
    lineHeight: 1,
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  metricSub: {
    marginTop: '8px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  progressTrack: {
    height: '12px',
    borderRadius: '999px',
    overflow: 'hidden',
    background: 'var(--bg-app)',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width .4s ease',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  detailBox: {
    background: 'var(--bg-app)',
    borderRadius: '16px',
    padding: '12px 14px',
    display: 'grid',
    gap: '6px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: 900,
    color: 'var(--text-main)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  footerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
};
