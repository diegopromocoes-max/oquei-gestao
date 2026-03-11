// ============================================================
//  ui.jsx — Oquei Gestão  (v2.1 — autocontido)
//  Zero dependências externas. Funciona sozinho.
//
//  Salve em: src/components/ui.jsx
//
//  Uso nas páginas:
//    import { Page, Card, KpiCard, DataTable, Badge,
//             Btn, Modal, Empty, Spinner, InfoBox,
//             Tabs, StatRow, ProgressBar, Input, Select,
//             colors, styles, moeda, numero, data }
//      from '../components/ui';
// ============================================================

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, AlertCircle,
         CheckCircle2, Info, AlertTriangle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// CORES — use nas páginas: accent={colors.primary}
// ─────────────────────────────────────────────────────────────
export const colors = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
  purple:  '#7c3aed',
  info:    '#06b6d4',
  neutral: '#64748b',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
};

// ─────────────────────────────────────────────────────────────
// HELPERS DE FORMATAÇÃO
// ─────────────────────────────────────────────────────────────
export const moeda  = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
export const numero = (v) => new Intl.NumberFormat('pt-BR').format(v ?? 0);
export const data   = (v) => v ? new Intl.DateTimeFormat('pt-BR').format(new Date(v)) : '—';
export const corMeta = (pct) => {
  if (pct >= 100) return colors.success;
  if (pct >= 80)  return colors.primary;
  if (pct >= 60)  return colors.warning;
  return colors.danger;
};

// ─────────────────────────────────────────────────────────────
// STYLES — exportados para uso em layouts de página
// Ex: <div style={styles.grid4}>
// ─────────────────────────────────────────────────────────────
export const styles = {
  grid2:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', width: '100%' },
  grid3:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', width: '100%' },
  grid4:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%' },
  row:        { display: 'flex', alignItems: 'center', gap: '12px' },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  col:        { display: 'flex', flexDirection: 'column', gap: '8px' },
  form:       { display: 'flex', flexDirection: 'column', gap: '18px' },
  formRow:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
};

// ─────────────────────────────────────────────────────────────
// ESTILOS INTERNOS (privados — só para os componentes abaixo)
// ─────────────────────────────────────────────────────────────
const S = {
  page:         { width: '100%', display: 'flex', flexDirection: 'column', animation: 'ui-fadeIn 0.3s ease-out' },
  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' },
  pageTitle:    { fontSize: '26px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 },
  pageSubtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: '5px 0 0', fontWeight: '500' },

  card:   { background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', width: '100%', boxSizing: 'border-box' },
  cardSm: { background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', width: '100%', boxSizing: 'border-box' },
  cardLg: { background: 'var(--bg-card)', padding: '32px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', width: '100%', boxSizing: 'border-box' },
  kpiCard:{ background: 'var(--bg-card)', padding: '20px 22px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box' },

  sectionTitle:    { fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' },
  sectionSubtitle: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', margin: '-10px 0 14px' },

  tableWrapper: { overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', boxSizing: 'border-box' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '13px 18px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap' },
  td:           { padding: '13px 18px', fontSize: '13px', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },

  btnPrimary:   { background: 'var(--text-brand, #2563eb)', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  btnSecondary: { background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-md, rgba(255,255,255,0.15))', padding: '11px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  btnDanger:    { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', padding: '11px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  btnSuccess:   { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', padding: '11px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  btnIcon:      { width: '36px', height: '36px', borderRadius: '9px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  field:    { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:    { fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:    { padding: '11px 13px', borderRadius: '9px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-input, var(--bg-app))', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  select:   { padding: '11px 13px', borderRadius: '9px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-input, var(--bg-app))', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer' },
  textarea: { padding: '11px 13px', borderRadius: '9px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-input, var(--bg-app))', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', minHeight: '88px' },

  overlay:     { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'ui-fadeInFast 0.2s ease-out' },
  modalBox:    { background: 'var(--bg-card)', padding: '28px 32px', borderRadius: '20px', width: '90%', maxWidth: '520px', border: '1px solid var(--border-md, rgba(255,255,255,0.12))', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', animation: 'ui-scaleIn 0.22s ease-out' },
  modalBoxLg:  { background: 'var(--bg-card)', padding: '32px 36px', borderRadius: '20px', width: '90%', maxWidth: '760px', border: '1px solid var(--border-md, rgba(255,255,255,0.12))', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', animation: 'ui-scaleIn 0.22s ease-out' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px', gap: '12px' },
  modalTitle:  { fontSize: '19px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border)' },

  emptyState:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 20px', gap: '12px' },
  emptyIcon:     { width: '52px', height: '52px', borderRadius: '14px', background: 'var(--bg-hover, rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  spinner:       { borderRadius: '50%', border: '2px solid var(--border-md, rgba(255,255,255,0.12))', borderTopColor: 'var(--text-brand, #2563eb)', animation: 'ui-spin 0.7s linear infinite' },
  progressTrack: { width: '100%', borderRadius: '50px', background: 'var(--border-md, rgba(255,255,255,0.1))', overflow: 'hidden' },
  accordionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--border)' },
};

// Injeta keyframes uma única vez no DOM
let _kfInjected = false;
function injectKeyframes() {
  if (_kfInjected || typeof document === 'undefined') return;
  _kfInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes ui-fadeIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ui-fadeInFast { from{opacity:0} to{opacity:1} }
    @keyframes ui-scaleIn    { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
    @keyframes ui-spin       { to{transform:rotate(360deg)} }
    .ui-tr:hover td { background: var(--bg-hover, rgba(255,255,255,0.04)) !important; }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
export function Page({ title, subtitle, actions, children, gap = 24 }) {
  injectKeyframes();
  return (
    <div style={{ ...S.page, gap }}>
      {(title || actions) && (
        <div style={S.pageHeader}>
          <div>
            {title    && <h1 style={S.pageTitle}>{title}</h1>}
            {subtitle && <p  style={S.pageSubtitle}>{subtitle}</p>}
          </div>
          {actions && (
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────
export function Card({ children, size = 'md', accent, title, subtitle, actions, style: extStyle = {} }) {
  const base = size === 'sm' ? S.cardSm : size === 'lg' ? S.cardLg : S.card;
  return (
    <div style={{ ...base, ...(accent ? { borderTop: `3px solid ${accent}` } : {}), ...extStyle }}>
      {(title || actions) && (
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'18px', gap:'12px' }}>
          <div>
            {title    && <p style={S.sectionTitle}>{title}</p>}
            {subtitle && <p style={{ ...S.sectionSubtitle, marginBottom:0, marginTop:'2px' }}>{subtitle}</p>}
          </div>
          {actions && <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────
export function KpiCard({ label, valor, delta, icon, accent = colors.primary, sublabel }) {
  const isPos = delta && (String(delta).startsWith('+') || parseFloat(delta) > 0);
  const isNeg = delta && (String(delta).startsWith('-') || parseFloat(delta) < 0);
  return (
    <div style={{ ...S.kpiCard, borderTop: `3px solid ${accent}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
          {label}
        </span>
        {icon && (
          <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:`${accent}22`, display:'flex', alignItems:'center', justifyContent:'center', color:accent }}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p style={{ fontSize:'28px', fontWeight:'900', color:'var(--text-main)', letterSpacing:'-0.03em', lineHeight:1, margin:0 }}>
          {valor ?? '—'}
        </p>
        {sublabel && <p style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>{sublabel}</p>}
      </div>
      {delta !== undefined && (
        <div style={{ display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:'50px', fontSize:'12px', fontWeight:'800', alignSelf:'flex-start',
          background: isPos ? 'rgba(16,185,129,0.12)' : isNeg ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.12)',
          color:      isPos ? '#10b981' : isNeg ? '#ef4444' : '#64748b',
        }}>
          {delta}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px', gap:'12px' }}>
      <div>
        <p style={{ ...S.sectionTitle, marginBottom: subtitle ? '3px' : 0 }}>{title}</p>
        {subtitle && <p style={{ fontSize:'12px', color:'var(--text-muted)', margin:0 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>{actions}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DATA TABLE
// ─────────────────────────────────────────────────────────────
export function DataTable({ columns = [], data = [], loading = false, emptyMsg = 'Nenhum registro encontrado', onRowClick }) {
  return (
    <div style={S.tableWrapper}>
      <table style={S.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ ...S.th, width: col.width }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} style={{ ...S.td, textAlign:'center', padding:'40px' }}>
              <div style={{ display:'flex', justifyContent:'center' }}>
                <div style={{ ...S.spinner, width:'22px', height:'22px' }} />
              </div>
            </td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ ...S.td, textAlign:'center', padding:'44px', color:'var(--text-muted)' }}>
              {emptyMsg}
            </td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id ?? i} className="ui-tr"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ cursor: onRowClick ? 'pointer' : 'default', transition:'background 0.1s' }}
              >
                {columns.map(col => (
                  <td key={col.key} style={S.td}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────────────────────
const BADGE_COLORS = {
  primary: { bg:'rgba(37,99,235,0.15)',   text:'#3b82f6' },
  success: { bg:'rgba(16,185,129,0.15)',  text:'#10b981' },
  warning: { bg:'rgba(245,158,11,0.15)',  text:'#f59e0b' },
  danger:  { bg:'rgba(239,68,68,0.15)',   text:'#ef4444' },
  purple:  { bg:'rgba(124,58,237,0.15)',  text:'#7c3aed' },
  info:    { bg:'rgba(6,182,212,0.15)',   text:'#06b6d4' },
  neutral: { bg:'rgba(100,116,139,0.15)', text:'#64748b' },
};
const STATUS_TO_COLOR = {
  'ativo':'success', 'inativo':'neutral', 'pendente':'warning',
  'cancelado':'danger', 'concluído':'success', 'em andamento':'primary', 'atrasado':'danger',
};
function badgeStyle(cor) {
  const c = BADGE_COLORS[cor] || BADGE_COLORS.neutral;
  return { display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:'50px', fontSize:'11px', fontWeight:'800', background:c.bg, color:c.text, whiteSpace:'nowrap' };
}
export function Badge({ children, cor, status }) {
  if (status !== undefined) {
    return <span style={badgeStyle(STATUS_TO_COLOR[String(status).toLowerCase()] || 'neutral')}>{status}</span>;
  }
  return <span style={badgeStyle(cor || 'neutral')}>{children}</span>;
}

// ─────────────────────────────────────────────────────────────
// BTN
// ─────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', loading = false, disabled = false, onClick, style: extStyle = {}, title }) {
  const base = { primary:S.btnPrimary, secondary:S.btnSecondary, danger:S.btnDanger, success:S.btnSuccess, icon:S.btnIcon }[variant] || S.btnPrimary;
  const sz   = { sm:{ padding:'7px 13px', fontSize:'12px' }, md:{}, lg:{ padding:'14px 26px', fontSize:'15px' } }[size] || {};
  return (
    <button onClick={onClick} disabled={disabled || loading} title={title}
      style={{ ...base, ...sz, opacity:disabled?0.5:1, cursor:disabled||loading?'not-allowed':'pointer', ...extStyle }}
      onMouseEnter={e => { if(!disabled && !loading) e.currentTarget.style.opacity='0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = disabled?'0.5':'1'; }}
    >
      {loading ? <div style={{ ...S.spinner, width:'15px', height:'15px', borderWidth:'2px' }} /> : children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// FIELD / INPUT / SELECT / TEXTAREA
// ─────────────────────────────────────────────────────────────
export function Field({ label, error, children, required }) {
  return (
    <div style={S.field}>
      {label && <label style={S.label}>{label}{required && <span style={{ color:colors.danger, marginLeft:'3px' }}>*</span>}</label>}
      {children}
      {error && <span style={{ fontSize:'11px', color:colors.danger, marginTop:'2px' }}>{error}</span>}
    </div>
  );
}
export function Input({ label, error, required, ...props }) {
  return <Field label={label} error={error} required={required}><input style={S.input} {...props} /></Field>;
}
export function Select({ label, error, required, options = [], placeholder, ...props }) {
  return (
    <Field label={label} error={error} required={required}>
      <select style={S.select} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => <option key={opt.value??opt} value={opt.value??opt}>{opt.label??opt}</option>)}
      </select>
    </Field>
  );
}
export function Textarea({ label, error, required, ...props }) {
  return <Field label={label} error={error} required={required}><textarea style={S.textarea} {...props} /></Field>;
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={e => { if(e.target===e.currentTarget) onClose?.(); }}>
      <div style={size==='lg' ? S.modalBoxLg : S.modalBox}>
        <div style={S.modalHeader}>
          <p style={S.modalTitle}>{title}</p>
          <button onClick={onClose} style={{ ...S.btnIcon, border:'none' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover,rgba(255,255,255,0.06))'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
          ><X size={17} /></button>
        </div>
        <div>{children}</div>
        {footer && <div style={S.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EMPTY / SPINNER
// ─────────────────────────────────────────────────────────────
export function Empty({ icon = '📭', title = 'Nenhum item encontrado', description, action }) {
  return (
    <div style={S.emptyState}>
      <div style={S.emptyIcon}>{icon}</div>
      <p style={{ fontSize:'15px', fontWeight:'800', color:'var(--text-main)', margin:0 }}>{title}</p>
      {description && <p style={{ fontSize:'13px', color:'var(--text-muted)', textAlign:'center', maxWidth:'280px', lineHeight:1.5, margin:0 }}>{description}</p>}
      {action && <div style={{ marginTop:'8px' }}>{action}</div>}
    </div>
  );
}
export function Spinner({ size = 22, centered = false }) {
  const el = <div style={{ ...S.spinner, width:size, height:size }} />;
  return centered
    ? <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'48px' }}>{el}</div>
    : el;
}

// ─────────────────────────────────────────────────────────────
// INFO BOX
// ─────────────────────────────────────────────────────────────
const IB = {
  info:    { bg:'rgba(6,182,212,0.08)',  border:'rgba(6,182,212,0.35)',  accent:'#06b6d4', Icon:Info           },
  warning: { bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.35)', accent:'#f59e0b', Icon:AlertTriangle   },
  success: { bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.35)', accent:'#10b981', Icon:CheckCircle2    },
  danger:  { bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.35)',  accent:'#ef4444', Icon:AlertCircle     },
};
export function InfoBox({ type = 'info', children }) {
  const c = IB[type] || IB.info;
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderLeft:`4px solid ${c.accent}`, borderRadius:'12px', padding:'13px 16px', display:'flex', gap:'11px', alignItems:'flex-start' }}>
      <c.Icon size={15} color={c.accent} style={{ flexShrink:0, marginTop:'1px' }} />
      <div style={{ fontSize:'13px', color:'var(--text-main)', lineHeight:1.55 }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────
export function ProgressBar({ pct = 0, cor, height = 8, showLabel = false }) {
  const barCor = cor || corMeta(pct);
  return (
    <div>
      <div style={{ ...S.progressTrack, height }}>
        <div style={{ height:'100%', width:`${Math.min(100,Math.max(0,pct))}%`, borderRadius:'50px', background:barCor, transition:'width 0.5s ease' }} />
      </div>
      {showLabel && <p style={{ fontSize:'11px', fontWeight:'700', color:barCor, marginTop:'4px', textAlign:'right' }}>{Math.round(pct)}%</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────
export function Divider({ vertical = false }) {
  return <div style={vertical
    ? { width:'1px', background:'var(--border)', alignSelf:'stretch', margin:'0 4px' }
    : { height:'1px', background:'var(--border)', width:'100%', margin:'4px 0' }
  } />;
}

// ─────────────────────────────────────────────────────────────
// ACCORDION
// ─────────────────────────────────────────────────────────────
export function Accordion({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.card}>
      <div style={S.accordionHeader} onClick={() => setOpen(v => !v)}>
        <span style={{ fontSize:'14px', fontWeight:'800', color:'var(--text-main)' }}>{title}</span>
        {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </div>
      {open && <div style={{ paddingTop:'16px' }}>{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────
export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div style={{ display:'flex', gap:'2px', borderBottom:'1px solid var(--border)' }}>
      {tabs.map(tab => {
        const on = tab === active;
        return (
          <button key={tab} onClick={() => onChange(tab)} style={{
            padding:'9px 16px', border:'none', background:'transparent', cursor:'pointer',
            fontSize:'13px', fontWeight:'700', fontFamily:'inherit', whiteSpace:'nowrap',
            color: on ? 'var(--text-brand,#3b82f6)' : 'var(--text-muted)',
            borderBottom: on ? '2px solid var(--text-brand,#3b82f6)' : '2px solid transparent',
            marginBottom:'-1px', transition:'color 0.15s',
          }}
            onMouseEnter={e => { if(!on) e.currentTarget.style.color='var(--text-main)'; }}
            onMouseLeave={e => { if(!on) e.currentTarget.style.color='var(--text-muted)'; }}
          >{tab}</button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STAT ROW
// ─────────────────────────────────────────────────────────────
export function StatRow({ label, value, accent }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:'13px', color:'var(--text-muted)', fontWeight:'600' }}>{label}</span>
      <span style={{ fontSize:'13px', fontWeight:'800', color: accent||'var(--text-main)' }}>{value}</span>
    </div>
  );
}
