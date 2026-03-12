// ============================================================
//  globalStyles.js — Oquei Gestão  (v2.0)
//  Design system completo. Combina com LayoutGlobal.jsx v2.0
//
//  USO:
//    import { styles, colors, theme, injectGlobalCSS } from '../globalStyles';
//    injectGlobalCSS(); // chame uma vez no App.jsx ou main.jsx
// ============================================================

// ─── 1. PALETA DE CORES ───────────────────────────────────────────────────────
export const colors = {
  // Marca
  primary:   '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: 'rgba(37, 99, 235, 0.12)',

  // Semânticas
  success:   '#10b981',
  successLight: 'rgba(16, 185, 129, 0.12)',
  warning:   '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  danger:    '#ef4444',
  dangerLight:  'rgba(239, 68, 68, 0.12)',
  info:      '#06b6d4',
  infoLight: 'rgba(6, 182, 212, 0.12)',

  // Acentos
  purple:    '#7c3aed',
  purpleLight: 'rgba(124, 58, 237, 0.12)',
  emerald:   '#10b981',
  amber:     '#f59e0b',
  rose:      '#f43f5e',
  sky:       '#0ea5e9',

  // Neutros
  neutral:   '#64748b',
  white:     '#ffffff',
  black:     '#000000',
};

// ─── 2. CSS VARIABLES — TEMAS CLARO E ESCURO ─────────────────────────────────
// Injeta as variáveis no :root e no [data-theme="light"]
// Chame injectGlobalCSS() uma vez no topo do App.jsx

export function injectGlobalCSS() {
  const id = 'oquei-global-styles';
  if (document.getElementById(id)) return; // evita duplicar

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    /* ── RESET BASE ─────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; overflow: hidden; }
    body {
      font-family: 'Manrope', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    a { color: inherit; text-decoration: none; }
    button { font-family: inherit; }
    input, select, textarea { font-family: inherit; }

    /* ── TEMA ESCURO (padrão) ─────────────────────────────── */
    :root,
    [data-theme="dark"] {
      --bg-app:     #0f172a;
      --bg-panel:   #1e293b;
      --bg-card:    #1e293b;
      --bg-hover:   #2d3f55;
      --bg-input:   #0f172a;
      --bg-primary-light: rgba(37, 99, 235, 0.15);

      --border:     rgba(255, 255, 255, 0.08);
      --border-md:  rgba(255, 255, 255, 0.12);

      --text-main:  #f1f5f9;
      --text-muted: #64748b;
      --text-brand: #3b82f6;
      --text-brand-hover: #60a5fa;

      --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.4);
      --shadow-md:  0 4px 16px rgba(0, 0, 0, 0.4);
      --shadow-lg:  0 8px 32px rgba(0, 0, 0, 0.5);

      --radius-sm:  8px;
      --radius-md:  12px;
      --radius-lg:  18px;
      --radius-xl:  24px;

      --transition: 0.18s ease;
    }

    /* ── TEMA CLARO ───────────────────────────────────────── */
    [data-theme="light"] {
      --bg-app:     #f1f5f9;
      --bg-panel:   #ffffff;
      --bg-card:    #ffffff;
      --bg-hover:   #f8fafc;
      --bg-input:   #f8fafc;
      --bg-primary-light: rgba(37, 99, 235, 0.08);

      --border:     rgba(0, 0, 0, 0.08);
      --border-md:  rgba(0, 0, 0, 0.12);

      --text-main:  #0f172a;
      --text-muted: #94a3b8;
      --text-brand: #2563eb;
      --text-brand-hover: #1d4ed8;

      --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.08);
      --shadow-md:  0 4px 16px rgba(0, 0, 0, 0.10);
      --shadow-lg:  0 8px 32px rgba(0, 0, 0, 0.12);
    }

    /* ── SCROLLBARS ───────────────────────────────────────── */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-md); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

    /* ── ANIMAÇÕES GLOBAIS ────────────────────────────────── */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInFast {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(16px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── UTILITÁRIOS ──────────────────────────────────────── */
    .animate-fadeIn      { animation: fadeIn 0.35s ease-out; }
    .animate-fadeInFast  { animation: fadeInFast 0.2s ease-out; }
    .animate-slideIn     { animation: slideInRight 0.3s ease-out; }
    .animate-scaleIn     { animation: scaleIn 0.25s ease-out; }
    .animate-pulse       { animation: pulse 2s infinite; }
    .animate-spin        { animation: spin 0.8s linear infinite; }

    /* Hover genérico para linhas de tabela */
    .table-row-hover:hover td { background: var(--bg-hover) !important; }

    /* Inputs em foco */
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--text-brand) !important;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
  `;
  document.head.appendChild(style);
}

// ─── 3. ESTILOS INLINE REUTILIZÁVEIS ─────────────────────────────────────────
// Todos os styles usam var(--*) para respeitar o tema automaticamente.

export const styles = {

  // ── CONTAINERS ──────────────────────────────────────────
  // Use sempre como raiz de qualquer página
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    animation: 'fadeIn 0.35s ease-out',
  },

  // ── CABEÇALHO DE PÁGINA ──────────────────────────────────
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    flexWrap: 'wrap',
  },

  pageTitle: {
    fontSize: '26px',
    fontWeight: '900',
    color: 'var(--text-main)',
    margin: 0,
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
  },

  pageSubtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '5px 0 0',
    fontWeight: '500',
  },

  // ── CARDS ────────────────────────────────────────────────
  card: {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: '18px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    width: '100%',
    boxSizing: 'border-box',
  },

  cardSm: {
    background: 'var(--bg-card)',
    padding: '18px',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    width: '100%',
    boxSizing: 'border-box',
  },

  cardLg: {
    background: 'var(--bg-card)',
    padding: '32px',
    borderRadius: '22px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
    width: '100%',
    boxSizing: 'border-box',
  },

  // Card de destaque (borda colorida no topo)
  cardHighlight: (cor = colors.primary) => ({
    background: 'var(--bg-card)',
    padding: '22px 24px',
    borderRadius: '18px',
    border: '1px solid var(--border)',
    borderTop: `3px solid ${cor}`,
    boxShadow: 'var(--shadow-sm)',
    width: '100%',
    boxSizing: 'border-box',
  }),

  // Card KPI (métricas principais)
  kpiCard: {
    background: 'var(--bg-card)',
    padding: '22px 24px',
    borderRadius: '18px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxSizing: 'border-box',
  },

  // ── GRIDS ────────────────────────────────────────────────
  // Adaptativos — use conforme o número de colunas desejado
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    width: '100%',
  },

  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    width: '100%',
  },

  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    width: '100%',
  },

  // Grid fixo (não adapta — use quando quiser colunas exatas)
  gridFixed: (cols, gap = '20px') => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap,
    width: '100%',
  }),

  // Layout coluna principal + sidebar
  gridWithSidebar: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '20px',
    width: '100%',
    alignItems: 'start',
  },

  // ── SECTION TITLE ────────────────────────────────────────
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '900',
    color: 'var(--text-main)',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  sectionSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    marginTop: '-10px',
    marginBottom: '16px',
  },

  // ── TABELAS ──────────────────────────────────────────────
  tableWrapper: {
    overflowX: 'auto',
    background: 'var(--bg-card)',
    borderRadius: '18px',
    border: '1px solid var(--border)',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: 'var(--shadow-sm)',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  th: {
    padding: '14px 20px',
    fontSize: '11px',
    fontWeight: '900',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border)',
    textAlign: 'left',
    background: 'var(--bg-card)',
    whiteSpace: 'nowrap',
  },

  td: {
    padding: '14px 20px',
    fontSize: '13px',
    color: 'var(--text-main)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  },

  // ── FORMULÁRIOS ──────────────────────────────────────────
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    width: '100%',
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },

  label: {
    fontSize: '12px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  input: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    outline: 'none',
    fontSize: '14px',
    color: 'var(--text-main)',
    background: 'var(--bg-input)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Manrope', sans-serif",
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },

  select: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    outline: 'none',
    fontSize: '14px',
    color: 'var(--text-main)',
    background: 'var(--bg-input)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Manrope', sans-serif",
    cursor: 'pointer',
  },

  textarea: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    outline: 'none',
    fontSize: '14px',
    color: 'var(--text-main)',
    background: 'var(--bg-input)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Manrope', sans-serif",
    resize: 'vertical',
    minHeight: '90px',
  },

  // ── BOTÕES ───────────────────────────────────────────────
  btnPrimary: {
    background: 'var(--text-brand)',
    color: '#ffffff',
    border: 'none',
    padding: '12px 22px',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Manrope', sans-serif",
    transition: 'opacity 0.15s, transform 0.1s',
    whiteSpace: 'nowrap',
  },

  btnSecondary: {
    background: 'transparent',
    color: 'var(--text-main)',
    border: '1px solid var(--border-md)',
    padding: '12px 22px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Manrope', sans-serif",
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  },

  btnDanger: {
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    padding: '12px 22px',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Manrope', sans-serif",
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  },

  btnSuccess: {
    background: 'rgba(16, 185, 129, 0.12)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    padding: '12px 22px',
    borderRadius: '10px',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Manrope', sans-serif",
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  },

  // Botão ícone (quadrado, só ícone)
  btnIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  },

  // ── BADGES / TAGS ────────────────────────────────────────
  badge: (cor = 'primary') => {
    const map = {
      primary: { bg: 'rgba(37,99,235,0.15)',   text: '#3b82f6' },
      success: { bg: 'rgba(16,185,129,0.15)',  text: '#10b981' },
      warning: { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b' },
      danger:  { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444' },
      purple:  { bg: 'rgba(124,58,237,0.15)',  text: '#7c3aed' },
      info:    { bg: 'rgba(6,182,212,0.15)',   text: '#06b6d4' },
      neutral: { bg: 'rgba(100,116,139,0.15)', text: '#64748b' },
    };
    const c = map[cor] || map.neutral;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '3px 10px',
      borderRadius: '50px',
      fontSize: '11px',
      fontWeight: '800',
      background: c.bg,
      color: c.text,
      whiteSpace: 'nowrap',
      letterSpacing: '0.02em',
    };
  },

  // ── MODAL ────────────────────────────────────────────────
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(2, 6, 23, 0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeInFast 0.2s ease-out',
  },

  modalBox: {
    background: 'var(--bg-card)',
    padding: '32px',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '540px',
    border: '1px solid var(--border-md)',
    boxShadow: 'var(--shadow-lg)',
    animation: 'scaleIn 0.25s ease-out',
  },

  modalBoxLg: {
    background: 'var(--bg-card)',
    padding: '36px',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '780px',
    border: '1px solid var(--border-md)',
    boxShadow: 'var(--shadow-lg)',
    animation: 'scaleIn 0.25s ease-out',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    gap: '12px',
  },

  modalTitle: {
    fontSize: '20px',
    fontWeight: '900',
    color: 'var(--text-main)',
    margin: 0,
    letterSpacing: '-0.02em',
  },

  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border)',
  },

  // ── ESTADOS VAZIOS ───────────────────────────────────────
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '14px',
    color: 'var(--text-muted)',
  },

  emptyIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'var(--bg-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
  },

  emptyTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--text-main)',
    margin: 0,
  },

  emptyText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    maxWidth: '280px',
    lineHeight: 1.5,
  },

  // ── LOADING ──────────────────────────────────────────────
  loadingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--text-brand)',
    animation: 'pulse 1.2s infinite',
  },

  spinner: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '2px solid var(--border-md)',
    borderTopColor: 'var(--text-brand)',
    animation: 'spin 0.7s linear infinite',
  },

  // ── DIVIDER ──────────────────────────────────────────────
  divider: {
    height: '1px',
    background: 'var(--border)',
    width: '100%',
    margin: '4px 0',
  },

  dividerVertical: {
    width: '1px',
    background: 'var(--border)',
    alignSelf: 'stretch',
    margin: '0 4px',
  },

  // ── FLEX HELPERS ─────────────────────────────────────────
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  rowBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },

  rowEnd: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
  },

  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  // ── PROGRESS BAR ─────────────────────────────────────────
  progressTrack: {
    width: '100%',
    height: '8px',
    borderRadius: '50px',
    background: 'var(--border-md)',
    overflow: 'hidden',
  },

  progressFill: (pct, cor = colors.primary) => ({
    height: '100%',
    width: `${Math.min(100, Math.max(0, pct))}%`,
    borderRadius: '50px',
    background: cor,
    transition: 'width 0.6s ease',
  }),

  // ── TOOLTIP SIMPLES ──────────────────────────────────────
  tooltip: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-md)',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 999,
    boxShadow: 'var(--shadow-md)',
  },

  // ── ACCORDION / COLLAPSE ─────────────────────────────────
  accordionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '1px solid var(--border)',
  },

  // ── INFO BOX ─────────────────────────────────────────────
  infoBox: (cor = 'info') => {
    const map = {
      info:    { bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.4)',   text: '#06b6d4' },
      warning: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.4)',  text: '#f59e0b' },
      success: { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.4)',  text: '#10b981' },
      danger:  { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.4)',   text: '#ef4444' },
    };
    const c = map[cor] || map.info;
    return {
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.text}`,
      borderRadius: '12px',
      padding: '14px 18px',
      fontSize: '13px',
      color: 'var(--text-main)',
      lineHeight: 1.55,
    };
  },

};

// ─── 4. ATALHOS (compatibilidade com código existente) ───────────────────────
// Mantém as props do tema anterior para não quebrar páginas já prontas
export const theme = {
  card:   styles.card,
  input:  styles.input,
  select: styles.select,
};

// ─── 5. HELPERS DE COMPONENTES ───────────────────────────────────────────────
// Funções de conveniência para padrões comuns

/** Retorna o estilo de badge correto para um status de vendas */
export function badgeStatus(status) {
  const map = {
    'ativo':       'success',
    'inativo':     'neutral',
    'pendente':    'warning',
    'cancelado':   'danger',
    'concluído':   'success',
    'em andamento':'primary',
    'atrasado':    'danger',
  };
  const cor = map[String(status).toLowerCase()] || 'neutral';
  return styles.badge(cor);
}

/** Cor semântica para % de atingimento de meta */
export function corMeta(pct) {
  if (pct >= 100) return colors.success;
  if (pct >= 80)  return colors.primary;
  if (pct >= 60)  return colors.warning;
  return colors.danger;
}

/** Formata moeda BR */
export function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

/** Formata número com separador de milhar */
export function numero(valor) {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

/** Formata data para dd/mm/aaaa */
export function data(dateStr) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr));
}

export const dashboardStyles = {
  heroSection: { background: 'var(--bg-panel)', padding: '40px', borderRadius: '24px', marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  heroTitle: { fontSize: '32px', fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '-0.02em', color: 'var(--text-main)' },
  heroSub: { fontSize: '15px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5', fontWeight: '500' },
  heroBadge: { background: 'var(--bg-app)', padding: '15px 25px', borderRadius: '16px', textAlign: 'center', border: `1px solid var(--border)` },
  heroBadgeLabel: { display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', color: 'var(--text-muted)' },
  heroBadgeValue: { fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' },
  heroBadgeSmall: { background: 'var(--bg-app)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', border: `1px solid var(--border)`, color: 'var(--text-main)' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' },
  actionCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: `1px solid var(--border)`, borderRadius: '20px', padding: '30px 20px', cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center', boxShadow: 'var(--shadow-sm)' },
  readonlyBanner: { background: 'var(--bg-primary-light)', border: `1px solid var(--border)`, padding: '12px 20px', borderRadius: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-brand)', fontWeight: 'bold', fontSize: '13px' },
  calendarGrid: { background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', border: `1px solid var(--border)`, width: '100%', maxWidth: '1200px' },
  calendarHeaderRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-panel)', borderBottom: `1px solid var(--border)` },
  calendarHeaderCell: { textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' },
  calendarDaysRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  calendarCellEmpty: { background: 'var(--bg-app)', borderBottom: `1px solid var(--border)`, borderRight: `1px solid var(--border)` },
  calendarCell: { minHeight: '120px', padding: '10px', borderBottom: `1px solid var(--border)`, borderRight: `1px solid var(--border)`, transition: 'background 0.2s' },
  calendarDayNum: { fontWeight: '800', fontSize: '14px', marginBottom: '8px', display: 'block' },
  absenceTag: { padding: '6px 8px', borderRadius: '8px', border: '1px solid', display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.2', fontSize: '11px', marginBottom: '6px' },
  tagAlert: { background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', width: 'fit-content', marginTop: '4px' },
  tagWarning: { background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', width: 'fit-content', marginTop: '4px' },
  tagSuccess: { background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', width: 'fit-content', marginTop: '4px' },
};