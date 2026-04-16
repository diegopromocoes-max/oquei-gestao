import React from 'react';
import { Flame, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  surpassing: { label: 'Superando', color: '#10b981', bg: 'rgba(16,185,129,0.12)', Icon: TrendingUp },
  on_track: { label: 'No Ritmo', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', Icon: Minus },
  attention: { label: 'Atenção', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: AlertTriangle },
  critical: { label: 'Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', Icon: TrendingDown },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.on_track;
  const { Icon } = cfg;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function pct(value, goal) {
  return goal > 0 ? Math.min(Math.round((value / goal) * 100), 150) : 0;
}

export default function WarRoomProjections({ storeData }) {
  // Ordena pela projeção oficial em % da meta (maior esforço necessário primeiro)
  const sorted = [...storeData].sort((a, b) => {
    const ratioA = a.goalPlansOfficial > 0 ? a.installedPlansProjectionOfficial / a.goalPlansOfficial : 0;
    const ratioB = b.goalPlansOfficial > 0 ? b.installedPlansProjectionOfficial / b.goalPlansOfficial : 0;
    return ratioA - ratioB;
  });

  const totalGoal = storeData.reduce((acc, s) => acc + (s.goalPlansOfficial || 0), 0);
  const totalProjected = storeData.reduce((acc, s) => acc + (s.installedPlansProjectionOfficial || 0), 0);
  const totalGap = Math.max(0, totalGoal - totalProjected);
  const globalPct = pct(totalProjected, totalGoal);

  return (
    <div style={{ ...styles.card, animation: 'slideIn 0.6s ease-out 0.4s forwards', opacity: 0 }}>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={styles.header}>
        <div style={styles.iconBox}><Flame size={22} color="#ef4444" /></div>
        <div>
          <h3 style={styles.title}>Sala de Guerra — Projeção de Instalações</h3>
          <p style={styles.subtitle}>Projeção oficial = vendas projetadas + backlog do mês anterior</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '26px', fontWeight: '900', color: 'white' }}>
            {totalProjected} <small style={{ fontSize: '14px', color: '#94a3b8' }}>/ {totalGoal}</small>
          </div>
          <div style={{ fontSize: '13px', color: globalPct >= 90 ? '#10b981' : '#f59e0b', fontWeight: '800' }}>
            {globalPct}% projetado
          </div>
        </div>
      </div>

      {totalGap > 0 && (
        <div style={styles.alertBanner}>
          <AlertTriangle size={14} color="#f59e0b" />
          <span>Gap global: <strong>{totalGap} instalações</strong> abaixo da meta projetada</span>
        </div>
      )}

      <div style={styles.grid}>
        {sorted.map((s) => {
          const pctVal = pct(s.installedPlansProjectionOfficial, s.goalPlansOfficial);
          const status = s.projectionStatus || 'on_track';
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.on_track;

          return (
            <div key={s.id} style={{ ...styles.storeCard, borderLeft: `4px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={styles.storeName}>{s.city}</div>
                  <StatusBadge status={status} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>{pctVal}%</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>proj/meta</div>
                </div>
              </div>

              <div style={styles.progressBar}>
                <div style={{ width: `${Math.min(pctVal, 100)}%`, height: '100%', background: cfg.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>

              <div style={styles.metricsRow}>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Vendas</span>
                  <span style={styles.metricValue}>{s.salesGrossPlans}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Instalados</span>
                  <span style={styles.metricValue}>{s.installedPlansOfficial}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Backlog ant.</span>
                  <span style={styles.metricValue}>{s.previousMonthCarryoverPlans}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Projeção</span>
                  <span style={{ ...styles.metricValue, color: cfg.color }}>{s.installedPlansProjectionOfficial}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Meta</span>
                  <span style={styles.metricValue}>{s.goalPlansOfficial}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Ritmo nec.</span>
                  <span style={{ ...styles.metricValue, color: s.installGap > 0 ? '#ef4444' : '#10b981' }}>
                    {s.requiredDailyInstalls}/dia
                  </span>
                </div>
              </div>

              <div style={styles.daysRow}>
                <span style={styles.dayChip}>{s.workingDaysElapsed} trab.</span>
                <span style={styles.dayChipRem}>{s.workingDaysRemaining} rest.</span>
                <span style={styles.dayChip}>{s.workingDaysTotal} total</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#1e293b', borderRadius: '24px', padding: '25px', marginTop: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '16px' },
  iconBox: { background: 'rgba(239,68,68,0.15)', padding: '8px', borderRadius: '10px', flexShrink: 0 },
  title: { fontSize: '15px', fontWeight: '900', color: 'white', margin: 0, textTransform: 'uppercase' },
  subtitle: { fontSize: '11px', color: '#94a3b8', margin: 0 },
  alertBanner: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '12px', fontWeight: '700', padding: '8px 14px', borderRadius: '10px', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' },
  storeCard: { background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '14px' },
  storeName: { fontSize: '13px', fontWeight: '800', color: 'white', marginBottom: '4px' },
  progressBar: { height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' },
  metricItem: { display: 'flex', flexDirection: 'column', gap: '1px' },
  metricLabel: { fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  metricValue: { fontSize: '14px', fontWeight: '900', color: 'white' },
  daysRow: { display: 'flex', gap: '6px' },
  dayChip: { fontSize: '10px', fontWeight: '700', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' },
  dayChipRem: { fontSize: '10px', fontWeight: '700', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '20px' },
};
