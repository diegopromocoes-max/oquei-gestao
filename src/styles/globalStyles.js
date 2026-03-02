// 1. PALETA DE CORES CENTRAL
export const colors = {
  primary: '#2563eb',     
  success: '#10b981',     
  neutral: '#64748b',     
  warning: '#f59e0b',     
  danger: '#ef4444',      
  purple: '#7c3aed',      
  cyan: '#06b6d4',        
};

// 2. COMPONENTES GLOBAIS DE UI
export const styles = {
  // --- LAYOUT E CONTAINERS ---
  container: { padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif", animation: 'fadeIn 0.4s ease-out' },
  card: { background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  sectionTitle: { fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' },
  
  // --- CABEÇALHOS (HEADERS) ---
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
  iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: 'var(--text-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: 'var(--text-muted)', margin: '5px 0 0 0' },

  // --- MODAIS ---
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modalBox: { background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
  modalTitle: { fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' },

  // --- FORMULÁRIOS ---
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' },
  input: { padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '15px', color: 'var(--text-main)', background: 'var(--bg-app)', width: '100%', boxSizing: 'border-box' },
  select: { padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '15px', color: 'var(--text-main)', background: 'var(--bg-app)', width: '100%', boxSizing: 'border-box', cursor: 'pointer' },
  textarea: { padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-app)', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },

  // --- BOTÕES GLOBAIS ---
  btnPrimary: { background: 'var(--text-brand)', color: '#ffffff', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)', transition: '0.2s' },
  btnSecondary: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '14px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s' },
  btnDanger: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s', boxShadow: 'var(--shadow-sm)' },
  iconBtn: { background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnActionSmall: { background: 'transparent', color: 'var(--text-brand)', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },

  // --- FERRAMENTAS (BARRAS DE PESQUISA, BADGES, ETC) ---
  toolbar: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--border)', flex: 1, minWidth: '250px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', width: '100%', color: 'var(--text-main)' },
  badge: { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
  
  // --- ESTADOS VAZIOS (EMPTY STATES) ---
  emptyState: { textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '60px 20px', background: 'var(--bg-panel)', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },

  // --- GRIDS DE DASHBOARD ---
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  gridMain: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' },
};

// 3. EXPORT DE RETROCOMPATIBILIDADE (Para as páginas que ainda não limpámos)
export const theme = { card: styles.card, input: styles.input };