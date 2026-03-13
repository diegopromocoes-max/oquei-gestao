// ============================================================
//  sop/SopComponents.jsx — Oquei Gestão
//  Componentes UI puros do Simulador S&OP.
//  Sem estado externo, sem Firebase — só renderização.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { colors } from '../../../components/ui';

// ─── Sparkline ────────────────────────────────────────────────────────────────
/** Mini gráfico de linha para tendência histórica */
export function Sparkline({ data, color = colors.success, width = 80, height = 32 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(Number);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const lastPt = pts.split(' ').pop().split(',');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={pts} fill="none" stroke={color}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={color} />
    </svg>
  );
}

// ─── SmartSlider ──────────────────────────────────────────────────────────────
/**
 * Slider com marcador de histórico + modo de entrada por nº de clientes.
 * Props: value, onChange, min, max, step, accentColor, historicalValue,
 *        disabled, baseClients, inputMode, onToggleMode
 */
export function SmartSlider({
  value, onChange, min, max, step,
  accentColor, historicalValue, disabled,
  baseClients, inputMode, onToggleMode,
}) {
  const histPct = historicalValue != null
    ? Math.min(Math.max(((historicalValue - min) / (max - min)) * 100, 0), 100)
    : null;
  const clientValue = baseClients ? Math.ceil(baseClients * (value / 100)) : 0;

  const handleClientInput = (raw) => {
    if (!baseClients) return;
    if (raw === '') { onChange(min); return; }
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const pct = Math.min(Math.max((n / baseClients) * 100, min), max);
    onChange(pct);
  };

  return (
    <div>
      {/* Toggle % / clientes */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={onToggleMode}
          disabled={disabled}
          style={{
            fontSize: '10px', fontWeight: '900', color: accentColor,
            background: `${accentColor}15`, border: `1px solid ${accentColor}40`,
            borderRadius: '6px', padding: '3px 10px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {inputMode === 'percent' ? '# clientes' : '% porcento'}
        </button>
      </div>

      {/* Input por número de clientes */}
      {inputMode === 'clients' && baseClients ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <input
            type="number" min={0} max={baseClients * (max / 100)}
            value={clientValue}
            onChange={e => handleClientInput(e.target.value)}
            disabled={disabled}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '10px',
              border: `2px solid ${accentColor}`, background: 'var(--bg-app)',
              color: 'var(--text-main)', fontSize: '18px', fontWeight: '900',
              outline: 'none', textAlign: 'center', fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800' }}>clientes</span>
        </div>
      ) : null}

      {/* Slider com marcador histórico */}
      <div style={{ position: 'relative', paddingTop: '24px' }}>
        {histPct != null && (
          <>
            <div style={{
              position: 'absolute', top: 0, left: `${histPct}%`,
              transform: 'translateX(-50%)', zIndex: 2,
            }}>
              <div style={{
                fontSize: '10px', fontWeight: '900', color: colors.warning,
                whiteSpace: 'nowrap', background: 'rgba(245,158,11,0.12)',
                padding: '1px 6px', borderRadius: '4px',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>
                ↓ hist. {historicalValue?.toFixed(1)}%
              </div>
            </div>
            <div style={{
              position: 'absolute', top: '26px', left: `${histPct}%`,
              width: '2px', height: '16px', background: colors.warning,
              opacity: 0.6, transform: 'translateX(-50%)', zIndex: 1, borderRadius: '1px',
            }} />
          </>
        )}
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          disabled={disabled}
          style={{
            width: '100%', accentColor,
            cursor: disabled ? 'not-allowed' : 'pointer',
            position: 'relative', zIndex: 3,
          }}
        />
      </div>
    </div>
  );
}

// ─── StreamingText ────────────────────────────────────────────────────────────
/** Efeito de digitação para textos da IA */
export function StreamingText({ text }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 8);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}</span>;
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
/** Modal de confirmação para publicar/destravar cenário */
export function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Shield size={24} color={colors.warning} />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)' }}>
            Confirmação
          </h3>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: '1.6' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontWeight: '800', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
              background: colors.success, color: '#ffffff',
              fontWeight: '900', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}