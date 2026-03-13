// ============================================================
//  wallboard/WallboardCharts.jsx — Oquei Gestão
//  Componentes visuais puros do Wallboard (Modo TV).
//  Sem estado externo. Apenas renderização neon.
// ============================================================

import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { styles } from './WallboardStyles';

// ─── NeonDonut ────────────────────────────────────────────────────────────────
/** Donut SVG com glow neon. gradId referencia um <linearGradient> do SVG global. */
export function NeonDonut({ title, current, target, gradId, backlog }) {
  const percentage      = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const radius          = 50;
  const circumference   = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((percentage / 100) * circumference);

  return (
    <div style={styles.neonDonutCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start', marginBottom: '10px' }}>
        <h4 style={styles.neonDonutTitle}>{title}</h4>
        {backlog !== undefined && (
          <div style={styles.neonBacklogBadge} title="Fila de ativação pendente">
            <AlertOctagon size={12} /> {backlog} Fila SLA
          </div>
        )}
      </div>
      <div style={styles.neonDonutWrapper}>
        <svg style={{ width: '120px', height: '120px', overflow: 'visible' }} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#2d325a" strokeWidth="12" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={`url(#${gradId})`} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: 'url(#glow)' }}
          />
        </svg>
        <div style={styles.neonDonutContent}>
          <span style={styles.neonDonutValue}>{percentage.toFixed(0)}%</span>
          <span style={styles.neonDonutTarget}>{current} / {target}</span>
        </div>
      </div>
    </div>
  );
}

// ─── NeonProgressBar ─────────────────────────────────────────────────────────
/** Barra de progresso com gradiente neon e badge de fila. */
export function NeonProgressBar({ title, current, target, gradCSS, backlog }) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div style={styles.progressBarWrapper}>
      <div style={styles.progressBarHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={styles.progressBarTitle}>{title}</span>
          {backlog !== undefined && backlog > 0 && (
            <span style={{ fontSize: '9px', color: '#f9d423', background: 'rgba(249, 212, 35, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(249, 212, 35, 0.3)' }}>
              {backlog} fila
            </span>
          )}
        </div>
        <span style={styles.progressBarValues}>
          <span style={{ color: '#ffffff' }}>{current}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> / {target}</span>
        </span>
      </div>
      <div style={styles.progressBarTrack}>
        <div style={{
          height: '100%', width: `${percentage}%`,
          background: gradCSS, borderRadius: '6px',
          boxShadow: '0 0 10px rgba(255,255,255,0.2)',
          transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
    </div>
  );
}

// ─── BigSpeedometer ───────────────────────────────────────────────────────────
/** Velocímetro semicircular com gradiente dinâmico. */
export function BigSpeedometer({ title, current, target, color1, color2, backlog }) {
  const percentage      = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const radius          = 80;
  const circumference   = Math.PI * radius;
  const strokeDashoffset = circumference - ((percentage / 100) * circumference);
  const gradId          = `grad-${title.replace(/\s+/g, '')}`;

  return (
    <div style={styles.globalSpeedCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
        <h4 style={styles.globalSpeedTitle}>{title}</h4>
        {backlog !== undefined && (
          <div style={styles.backlogBadge} title="Fila de ativação pendente">
            <AlertOctagon size={12} /> {backlog} Fila SLA
          </div>
        )}
      </div>
      <div style={styles.bigSpeedWrapper}>
        <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 200 110">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" strokeLinecap="round" />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none" stroke={`url(#${gradId})`} strokeWidth="16" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: 'url(#glow)' }}
          />
        </svg>
        <div style={styles.bigSpeedContent}>
          <span style={styles.bigSpeedValue}>{current}</span>
          <span style={styles.bigSpeedTarget}>/ {target}</span>
        </div>
      </div>
    </div>
  );
}

// ─── MegaTooltip ─────────────────────────────────────────────────────────────
/** Tooltip customizado para o gráfico Lollipop do Módulo 4. */
export function MegaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data  = payload[0].payload;
  const color = data.solidColor;
  return (
    <div style={{ background: 'rgba(22, 25, 59, 0.95)', padding: '15px', borderRadius: '12px', border: '1px solid #2d325a', color: '#ffffff', backdropFilter: 'blur(10px)' }}>
      <p style={{ margin: '0 0 10px 0', fontWeight: '900', fontSize: '15px' }}>{data.city}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '5px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Dia 1:</span>
        <strong style={{ color: '#ffffff', fontSize: '13px' }}>{data.baseStart}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '10px', borderBottom: '1px solid #2d325a', paddingBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Hoje:</span>
        <strong style={{ color: '#ffffff', fontSize: '13px' }}>{data.currentBase}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color }}>Crescimento Líquido:</span>
        <strong style={{ color, fontSize: '14px', textShadow: `0 0 8px ${color}` }}>
          {data.netAdds > 0 ? '+' : ''}{data.netAdds}
        </strong>
      </div>
    </div>
  );
}

// ─── NeonLollipopDot ─────────────────────────────────────────────────────────
/** Ponto customizado para o Lollipop Chart — bolinha + label neon. */
export function NeonLollipopDot(props) {
  const { cx, cy, payload, value } = props;
  if (cx == null || cy == null) return null;
  const color      = payload.solidColor;
  const isNegative = value < 0;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.15} />
      <circle cx={cx} cy={cy} r={6}  fill={color} stroke="#0a0b1a" strokeWidth={2} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      <text
        x={cx} y={isNegative ? cy + 24 : cy - 16}
        textAnchor="middle" fill={color}
        fontSize="14" fontWeight="900"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        style={{ textShadow: '0 2px 5px rgba(0,0,0,0.9)' }}
      >
        {value > 0 ? '+' : ''}{value}
      </text>
    </g>
  );
}