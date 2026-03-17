// ============================================================
//  styles/hubStyles.js — Hub Crescimento
//  Objeto de estilos centralizado do modulo.
//  Segue o padrao do design system: inline styles + CSS vars.
//
//  USO:
//    import { hubStyles } from '../styles/hubStyles';
//    <div style={hubStyles.stack}>...</div>
//
//  CONVENCAO:
//    - Nunca usar cores hardcoded — sempre CSS vars ou colors.*
//    - Excecoes documentadas com comentario inline
// ============================================================

export const hubStyles = {

  // ── Layout global ────────────────────────────────────────────────────────
  /** Pilha vertical de cards com espacamento padrao */
  stack: {
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  /** Barra de ferramentas horizontal (filtros, selects) */
  toolbar: {
    display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center',
  },
  /** Area de conteudo principal */
  content: {
    display: 'flex', flexDirection: 'column', gap: '24px',
  },

  // ── Kanban — board e colunas ─────────────────────────────────────────────
  /** Container horizontal do Kanban com scroll */
  kanban: {
    display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '6px',
  },
  /** Coluna individual do Kanban */
  column: {
    minWidth: '260px',
    background: 'var(--bg-app)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '12px',
    flexShrink: 0,
  },
  columnHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  columnTitle: {
    fontWeight: '900', color: 'var(--text-main)', fontSize: '14px',
  },
  /** Badge circular com contador de cards */
  columnCount: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)',
  },
  columnBody: {
    display: 'flex', flexDirection: 'column', gap: '12px',
    minHeight: '60px', // garante drop zone visivel quando coluna vazia
  },

  // ── Card de plano (PlanCard) ──────────────────────────────────────────────
  /** Card arrastavel do Kanban */
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '14px',
    cursor: 'grab',
    display: 'flex', flexDirection: 'column', gap: '12px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    userSelect: 'none',
  },
  /** Estado hover — { ...hubStyles.card, ...hubStyles.cardHover } */
  cardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
  },
  /** Estado dragging (dnd-kit) — aplicado via spread */
  cardDragging: {
    opacity: 0.45,
    cursor: 'grabbing',
    boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
    transform: 'rotate(1.5deg) scale(1.02)',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
  },
  cardTitle: {
    fontWeight: '900', color: 'var(--text-main)', fontSize: '14px',
    lineHeight: '1.35',
  },
  cardBody: {
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  cardRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px',
  },
  cardObjectives: {
    display: 'flex', flexWrap: 'wrap', gap: '6px',
  },

  // ── Chips / Tags ──────────────────────────────────────────────────────────
  chip: {
    fontSize: '10px', fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '999px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  chipRow: {
    display: 'flex', flexWrap: 'wrap', gap: '6px',
  },

  // ── Formularios ───────────────────────────────────────────────────────────
  /** Grid responsivo para campos de formulario */
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginTop: '12px',
  },
  /** Container de botoes alinhado a direita */
  actions: {
    display: 'flex', justifyContent: 'flex-end',
    marginTop: '16px', gap: '8px',
  },
  /** Botoes inline sem margem extra */
  actionsInline: {
    display: 'flex', gap: '8px', alignItems: 'center',
  },
  /** Input + botao lado a lado */
  inputRow: {
    display: 'flex', gap: '8px', alignItems: 'flex-end',
  },

  // ── Estados de UI ─────────────────────────────────────────────────────────
  empty: {
    textAlign: 'center',
    padding: '20px',
    color: 'var(--text-muted)',
    fontWeight: '700',
    fontSize: '13px',
  },

  // ── Tasklist (TaskList.jsx + MinhaMesaPage) ───────────────────────────────
  tasklist: {
    display: 'flex', flexDirection: 'column', gap: '10px', margin: '12px 0',
  },
  tasklistHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '4px',
  },
  tasklistTitle: {
    fontWeight: '900', color: 'var(--text-main)', fontSize: '14px',
  },
  tasklistCount: {
    fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    padding: '2px 8px',
  },
  /** Item de tarefa no TaskList */
  task: {
    display: 'flex', justifyContent: 'space-between', gap: '12px',
    background: 'var(--bg-app)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '12px',
  },
  taskTitle: {
    fontWeight: '800', color: 'var(--text-main)', fontSize: '13px',
  },
  taskMeta: {
    display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px',
    alignItems: 'center',
  },
  taskActions: {
    display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
  },
  /** Linha de tarefa no modal do KanbanPage */
  taskRow: {
    display: 'flex', justifyContent: 'space-between', gap: '12px',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    background: 'var(--bg-app)',
    marginTop: '8px',
  },

  // ── Growth Score ──────────────────────────────────────────────────────────
  score: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '6px',
    marginBottom: '16px',
  },
  scoreTotal: {
    fontSize: '52px', fontWeight: '900', color: 'var(--text-main)',
    lineHeight: 1,
  },
  scoreLabel: {
    color: 'var(--text-muted)', fontWeight: '700', fontSize: '13px',
  },
  scoreBreakdown: {
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  /** Grid label + barra de progresso */
  scoreRow: {
    display: 'grid', gridTemplateColumns: '120px 1fr',
    alignItems: 'center', gap: '12px',
  },

  // ── Dashboard / Metricas ──────────────────────────────────────────────────
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  metric: {
    background: 'var(--bg-app)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '14px',
  },
  metricLabel: {
    fontSize: '11px', fontWeight: '800',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontSize: '20px', fontWeight: '900',
    color: 'var(--text-main)',
    marginTop: '6px',
    lineHeight: 1.2,
  },
  metricSub: {
    fontSize: '11px', color: 'var(--text-muted)',
    marginTop: '4px',
  },

  // ── Pacing bar (DashboardGrowth / predictiveMath) ─────────────────────────
  pacingBar: {
    marginBottom: '12px',
  },
  pacingBarHeader: {
    display: 'flex', justifyContent: 'space-between', marginBottom: '4px',
  },
  pacingBarLabel: {
    fontSize: '12px', fontWeight: '700', color: 'var(--text-main)',
  },
  pacingBarInfo: {
    fontSize: '12px', color: 'var(--text-muted)',
  },
  pacingBarTrack: {
    position: 'relative', height: '10px',
    background: 'var(--border)',
    borderRadius: '8px', overflow: 'hidden',
  },
  pacingBarFooter: {
    display: 'flex', justifyContent: 'space-between', marginTop: '4px',
  },
  pacingBarFooterText: {
    fontSize: '11px', color: 'var(--text-muted)',
  },

  // ── Tabela de conversao por acao (RF09-C) ─────────────────────────────────
  conversionTableWrapper: {
    overflowX: 'auto',
  },
  conversionTable: {
    width: '100%', borderCollapse: 'collapse', fontSize: '13px',
  },
  conversionTh: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: '800',
    color: 'var(--text-muted)',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-panel)',
  },
  conversionTd: {
    padding: '10px 12px',
    color: 'var(--text-main)',
    borderBottom: '1px solid var(--border)',
  },
  conversionTdMini: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  conversionBarTrack: {
    flex: 1, height: '6px',
    background: 'var(--border)',
    borderRadius: '4px', overflow: 'hidden',
  },
  conversionBarValue: {
    fontWeight: '800', color: 'var(--text-main)',
    minWidth: '42px', textAlign: 'right',
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modal: {
    display: 'flex', flexDirection: 'column', gap: '20px',
  },
  modalSection: {
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  modalTitle: {
    fontWeight: '900', color: 'var(--text-main)',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  modalRow: {
    display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
  },
  /** Preview de item antes de confirmar conversao */
  modalPreviewBox: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 18px',
    fontWeight: '700',
    color: 'var(--text-main)',
    fontSize: '14px',
  },
  modalFooter: {
    display: 'flex', gap: '10px', justifyContent: 'flex-end',
  },

  // ── Reunioes / Atas (MeetingsPage / RF02) ─────────────────────────────────
  meetingItems: {
    display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px',
  },
  /** Item de ata pendente de conversao */
  agendaItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '10px 14px',
    transition: 'border-color 0.2s',
  },
  /** Item de ata ja convertido em Plano de Acao */
  agendaItemDone: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(16,185,129,0.05)', // verde muito suave — excecao documentada
    border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: '10px',
    padding: '10px 14px',
    transition: 'border-color 0.2s',
  },
  agendaItemText: {
    flex: 1, fontSize: '14px', fontWeight: '600', color: 'var(--text-main)',
  },
  agendaItemTextDone: {
    flex: 1, fontSize: '14px', fontWeight: '600',
    color: 'var(--text-muted)',
    textDecoration: 'line-through',
  },

  // ── Listas de selecao (participantes, planos) ─────────────────────────────
  checklist: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '8px', marginTop: '6px',
  },
  check: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '12px', color: 'var(--text-main)',
    background: 'var(--bg-app)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '6px 10px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },

  // ── Texto utilitario ──────────────────────────────────────────────────────
  muted: {
    color: 'var(--text-muted)', fontSize: '12px',
  },
  strong: {
    fontWeight: '800', color: 'var(--text-main)',
  },
  sectionHint: {
    fontWeight: '400', fontSize: '12px',
    color: 'var(--text-muted)', marginLeft: '8px',
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '4px 0',
  },
};