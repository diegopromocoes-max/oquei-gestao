// src/styles/theme.js (ou globalStyles.js)

// 1. PALETA DE CORES CENTRAL
export const colors = {
  primary: '#2563eb',     // Azul Royal (Ações principais, Marca)
  success: '#10b981',     // Verde Esmeralda (Concluído, Instalações, Metas batidas)
  neutral: '#64748b',     // Cinza Slate (Textos secundários, Ícones neutros)
  
  // Cores semânticas e extras
  warning: '#f59e0b',     // Laranja/Amarelo (Apenas para status Pendente/Alerta)
  danger: '#ef4444',      // Vermelho (Apenas para Cancelamentos/Erros/Exclusão)
  purple: '#7c3aed',      // Roxo (SVAs, Gamificação)
  cyan: '#00f2fe',        // Ciano (HubOquei, Wallboard)
  
  // Mapeamento dinâmico para o Dark/Light Mode (Vem do LayoutGlobal.jsx)
  bgBase: 'var(--bg-app)',
  bgPanel: 'var(--bg-panel)',
  bgCard: 'var(--bg-card)',
  border: 'var(--border)',
  textMain: 'var(--text-main)',
  textMuted: 'var(--text-muted)'
};

// 2. ESTILOS DE COMPONENTES REUTILIZÁVEIS
export const styles = {
  headerBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '30px', marginBottom: '30px' },
  badgeZinc: { padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-badge)', border: '1px solid var(--border)', color: 'var(--text-badge)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' },
  
  // Botão Primário (Azul Oquei)
  btnPrimary: { backgroundColor: 'var(--text-brand)', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' },
  
  // Botão Secundário (Cinza/Neutro)
  btnSecondary: { backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' },
  
  // Botão de Perigo/Exclusão (Vermelho)
  btnDanger: { backgroundColor: colors.danger, color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' },
  
  btnLink: { backgroundColor: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer' },
  btnActionSmall: { backgroundColor: 'transparent', color: 'var(--text-brand)', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  btnResolve: { backgroundColor: 'var(--bg-danger-light)', color: colors.danger, border: '1px solid var(--border-danger)', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },

  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  gridMain: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' },
  grid6: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' },
  
  moduleCard: { backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  moduleHeader: { padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-panel)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  moduleTitle: { fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
  emptyBox: { padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' },
  
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '8px' },
  
  avatarBlue: { width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-primary-light)', color: 'var(--text-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' },
  badgeBlue: { backgroundColor: 'var(--bg-primary-light)', color: 'var(--text-brand)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', border: '1px solid var(--bg-primary-light)' },
  badgeZincMini: { backgroundColor: 'var(--bg-badge)', color: 'var(--text-badge)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' },
  
  successBox: { backgroundColor: 'var(--bg-success-light)', border: '1px solid var(--border-success)', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' },
  alertItem: { backgroundColor: 'var(--bg-danger-light)', border: '1px solid var(--border-danger)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },

  // Estilos base herdados por componentes mais antigos
  card: { backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', padding: '24px' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }
};

// 3. EXPORT DE RETROCOMPATIBILIDADE
// Permite que páginas antigas que ainda usam `import { theme } from './styles'` não quebrem o sistema.
export const theme = {
  card: styles.card,
  input: styles.input
};