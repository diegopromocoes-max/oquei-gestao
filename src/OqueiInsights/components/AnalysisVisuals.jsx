import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { colors } from '../../components/ui';

export function HBar({ label, value, max, color, right, sublabel, highlight }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: highlight ? '900' : '700', color: highlight ? color : 'var(--text-main)' }}>{label}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {sublabel && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sublabel}</span>}
          <span style={{ fontSize: '13px', fontWeight: '900', color }}>{right || value}</span>
        </div>
      </div>
      <div style={{ height: '8px', background: 'var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '20px', transition: 'width 0.7s ease' }} />
      </div>
    </div>
  );
}

export function Pill({ label, color, size = 'sm' }) {
  const padding = size === 'sm' ? '2px 9px' : '4px 12px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}40`, color, borderRadius: '20px', padding, fontSize, fontWeight: '800' }}>
      {label}
    </span>
  );
}

export function VulnMeter({ score, n }) {
  const color = score >= 7 ? colors.success : score >= 5 ? colors.warning : score >= 3 ? colors.info : colors.danger;
  const label = score >= 7 ? 'MUITO VULNERÁVEL' : score >= 5 ? 'VULNERÁVEL' : score >= 3 ? 'MODERADO' : 'BLINDADO';
  const icon = score >= 7 ? '🔓' : score >= 5 ? '🔑' : score >= 3 ? '🔒' : '🛡️';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" strokeWidth="9" />
          <circle
            cx="36"
            cy="36"
            r="28"
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeDasharray={`${(score / 10) * 175.9} 175.9`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
        </div>
      </div>
      <div style={{ fontSize: '20px', fontWeight: '900', color, lineHeight: 1 }}>
        {score}
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/10</span>
      </div>
      <div style={{ fontSize: '9px', fontWeight: '900', color, letterSpacing: '0.08em', textAlign: 'center' }}>{label}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{n} entrev.</div>
    </div>
  );
}

export function ProviderExpansionToggle({ expanded }) {
  return <div style={{ color: 'var(--text-muted)' }}>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>;
}

export function provColor(name) {
  const map = {
    'N4 telecom': '#8b5cf6',
    Claro: '#ef4444',
    Vivo: '#a855f7',
    LazerNet: '#f59e0b',
    Starlink: '#0ea5e9',
    Outro: '#64748b',
  };

  return map[name] || colors.neutral;
}
