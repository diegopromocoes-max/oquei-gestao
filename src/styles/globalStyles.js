// GlobalStyles.js

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

  // --- CABEÇALHO PREMIUM (Laboratórios/Apuração) ---
  headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '25px' },
  iconBox: { background: 'var(--bg-card)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
  pageTitle: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 5px 0', letterSpacing: '-0.03em' },
  dateBadge: { fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' },
  
  filterBar: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
  filterPill: { display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '10px 18px', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' },
  filterInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'inherit' },

  // Adicione estas duas linhas no seu GlobalStyles.js
  dashboardGridFull: { display: 'flex', flexDirection: 'column', gap: '30px' },
  reasonsGridFull: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' },

  // --- MODAIS ---
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modalBox: { background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
  modalTitle: { fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' },

  // --- FORMULÁRIOS E INPUTS ESPECÍFICOS ---
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' },
  input: { padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '15px', color: 'var(--text-main)', background: 'var(--bg-app)', width: '100%', boxSizing: 'border-box' },
  select: { padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '15px', color: 'var(--text-main)', background: 'var(--bg-app)', width: '100%', boxSizing: 'border-box', cursor: 'pointer' },
  textarea: { padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-app)', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  matrixInput: { width: '80px', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)', background: 'var(--bg-card)', textAlign: 'center', transition: 'border 0.2s' },
  reasonInput: { width: '70px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fca5a5', outline: 'none', fontSize: '15px', fontWeight: '900', color: '#ef4444', background: 'var(--bg-card)', textAlign: 'center' },

  // --- BOTÕES GLOBAIS ---
  btnPrimary: { background: 'var(--text-brand)', color: '#ffffff', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)', transition: '0.2s' },
  btnSecondary: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '14px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s' },
  btnDanger: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: '0.2s', boxShadow: 'var(--shadow-sm)' },
  iconBtn: { background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnActionSmall: { background: 'transparent', color: 'var(--text-brand)', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  saveBtnLarge: { color: 'white', border: 'none', padding: '18px', borderRadius: '14px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  actionBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderRadius: '6px', transition: 'background 0.2s' },

  // --- FERRAMENTAS (BARRAS DE PESQUISA, BADGES, ETC) ---
  toolbar: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--border)', flex: 1, minWidth: '250px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', width: '100%', color: 'var(--text-main)' },
  badge: { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
  totalBadge: { fontSize: '15px', fontWeight: '900', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 14px', borderRadius: '10px', letterSpacing: '0.05em' },
  
  // --- ELEMENTOS DE APURAÇÃO DE RESULTADOS (Laboratório) ---
  activeCityBanner: { display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-card)', padding: '20px 25px', borderRadius: '20px', border: '1px solid #bfdbfe', borderLeft: '8px solid #3b82f6', marginBottom: '25px', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.08)' },
  activeCityTitle: { margin: 0, fontSize: '26px', fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '-0.02em' },
  
  mainCard: { background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', padding: '25px', boxShadow: '0 8px 30px rgba(0,0,0,0.02)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' },
  cardTitle: { margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' },
  
  tableWrapper: { overflowX: 'auto', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s' },
  td: { padding: '12px 15px', verticalAlign: 'middle', color: 'var(--text-main)' },
  
  reasonsContainer: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '5px' },
  reasonRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', padding: '8px 15px', borderRadius: '12px', border: '1px solid var(--border)', transition: 'transform 0.1s' },
  reasonLabel: { fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' },
  
  addReasonBox: { display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border)' },
  addReasonInput: { flex: 1, padding: '12px 15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' },
  addReasonBtn: { background: 'var(--text-main)', color: 'var(--bg-card)', border: 'none', borderRadius: '12px', padding: '0 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' },
  auditStamp: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', background: 'var(--bg-card)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)' },

  // --- ESTADOS VAZIOS E LOADING ---
  emptyState: { textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '60px 20px', background: 'var(--bg-panel)', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  loadingState: { padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '16px', fontWeight: 'bold', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border)' },

  // --- GRIDS DE DASHBOARD ---
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  gridMain: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '25px', alignItems: 'start' },
  sideColumn: { display: 'flex', flexDirection: 'column', gap: '25px' },
};

// 3. EXPORT DE RETROCOMPATIBILIDADE (Para as páginas que ainda não limpámos)
export const theme = { card: styles.card, input: styles.input };