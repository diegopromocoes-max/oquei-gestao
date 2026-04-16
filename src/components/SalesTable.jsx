import React from 'react';
import { LayoutList } from 'lucide-react';

const STATUS_COLORS = {
  surpassing: '#10b981',
  on_track: '#3b82f6',
  attention: '#f59e0b',
  critical: '#ef4444',
};

const STATUS_LABELS = {
  surpassing: 'Superando',
  on_track: 'No Ritmo',
  attention: 'Atenção',
  critical: 'Crítico',
};

function pct(value, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.min(Math.round((value / goal) * 100), 150);
}

function PlansTab({ storeData }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: '#f8fafc' }}>
        <tr>
          {['Unidade', 'Vendas (B)', 'Instalados', 'Backlog ant.', 'Projeção inst.', 'Meta', '% Projetado', 'Ritmo nec.', 'D. Úteis', 'Status'].map((h) => (
            <th key={h} style={tStyle.th}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {storeData.map((s) => {
          const pctVal = pct(s.installedPlansProjectionOfficial, s.goalPlansOfficial);
          const statusColor = STATUS_COLORS[s.projectionStatus] || STATUS_COLORS.on_track;
          const statusLabel = STATUS_LABELS[s.projectionStatus] || '—';
          return (
            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={tStyle.td}><strong>{s.city}</strong></td>
              <td style={tStyle.tdNum}>{s.salesGrossPlans}</td>
              <td style={tStyle.tdNum}>{s.installedPlansOfficial}</td>
              <td style={{ ...tStyle.tdNum, color: s.previousMonthCarryoverPlans > 0 ? '#f59e0b' : '#94a3b8' }}>
                {s.previousMonthCarryoverPlans}
              </td>
              <td style={{ ...tStyle.tdNum, fontWeight: '800', color: statusColor }}>
                {s.installedPlansProjectionOfficial}
              </td>
              <td style={tStyle.tdNum}>{s.goalPlansOfficial}</td>
              <td style={tStyle.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '60px', height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: `${Math.min(pctVal, 100)}%`, height: '100%', background: statusColor }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: statusColor }}>{pctVal}%</span>
                </div>
              </td>
              <td style={{ ...tStyle.tdNum, color: s.installGap > 0 ? '#ef4444' : '#10b981' }}>
                {s.requiredDailyInstalls}/dia
              </td>
              <td style={tStyle.tdNum}>
                <span style={{ color: '#3b82f6' }}>{s.workingDaysElapsed}</span>
                <span style={{ color: '#94a3b8', margin: '0 3px' }}>/</span>
                <span style={{ color: '#64748b' }}>{s.workingDaysTotal}</span>
              </td>
              <td style={tStyle.td}>
                <span style={{ background: `${statusColor}18`, color: statusColor, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                  {statusLabel}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SecondaryTab({ storeData, category }) {
  // category: 'sva' | 'migrations'
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: '#f8fafc' }}>
        <tr>
          {['Unidade', 'Realizado', 'Meta', '% Meta'].map((h) => (
            <th key={h} style={tStyle.th}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {storeData.map((s) => {
          const metrics = s[category] || { realized: 0, goal: 0, pct: 0 };
          const p = metrics.pct || 0;
          const color = p >= 100 ? '#10b981' : p >= 70 ? '#3b82f6' : '#ef4444';
          return (
            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={tStyle.td}><strong>{s.city}</strong></td>
              <td style={tStyle.tdNum}>{metrics.realized}</td>
              <td style={tStyle.tdNum}>{metrics.goal}</td>
              <td style={tStyle.td}>
                <span style={{ background: `${color}18`, color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                  {p}%
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function SalesTable({ storeData, activeView = 'plans' }) {
  return (
    <div style={{ animation: 'slideIn 0.6s ease-out 0.8s forwards', opacity: 0, marginTop: '40px' }}>
      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 25px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutList size={18} color="#64748b" />
          <h3 style={{ fontSize: '15px', fontWeight: '900', margin: 0, color: '#1e293b' }}>
            Consolidado por Operação
            {activeView === 'plans' && ' — Planos'}
            {activeView === 'sva' && ' — SVA'}
            {activeView === 'migrations' && ' — Migrações'}
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {activeView === 'plans' && <PlansTab storeData={storeData} />}
          {activeView === 'sva' && <SecondaryTab storeData={storeData} category="sva" />}
          {activeView === 'migrations' && <SecondaryTab storeData={storeData} category="migrations" />}
        </div>
      </div>
    </div>
  );
}

const tStyle = {
  th: { padding: '15px 20px', textAlign: 'left', fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' },
  td: { padding: '14px 20px', fontSize: '13px', color: '#334155' },
  tdNum: { padding: '14px 20px', fontSize: '13px', color: '#334155', fontWeight: '700', textAlign: 'right' },
};
