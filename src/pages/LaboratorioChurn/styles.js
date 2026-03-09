// styles.js - Versão Master Completa
export const styles = {
  pageContainer: { background: 'var(--bg-page)', minHeight: '100vh', padding: '30px', color: 'var(--text-main)', fontFamily: "'Inter', sans-serif" },
  loadingContainer: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-page)', color:'var(--text-main)' },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  iconBox: { background: 'var(--bg-card)', padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  title: { fontSize: '26px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' },
  subtitle: { fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' },
  
  monthSelector: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' },
  monthInput: { backgroundColor: 'transparent', fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)', border: 'none', outline: 'none', cursor: 'pointer', colorScheme: 'dark' },
  
  globalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },
  globalCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  globalLabel: { fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  globalValue: { fontSize: '30px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  
  labNav: { display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '1px', overflowX: 'auto', marginBottom: '25px' },
  labNavBtn: { background: 'transparent', border: 'none', borderBottom: '3px solid transparent', color: 'var(--text-secondary)', padding: '12px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', transition: '0.2s' },
  labNavBtnActive: { background: 'transparent', border: 'none', borderBottom: '3px solid var(--primary)', color: 'var(--primary)', padding: '12px 18px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' },
  
  mainLayout: { display: 'flex', flexDirection: 'column', gap: '25px' },
  sectionTitle: { fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' },
  
  cityCard: { padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.3s ease', background: 'var(--bg-card)', position: 'relative', overflow: 'hidden' },
  cityName: { fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 },
  penetrationBadge: { fontSize: '10px', background: 'var(--bg-app)', color: 'var(--text-secondary)', padding: '5px 10px', borderRadius: '8px', fontWeight: '900' },
  
  detailsColumn: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '30px', borderTop: '4px solid var(--primary)' },
  emptySelect: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', gap: '15px' },
  
  funnelBox: { background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px', flex: 1, textAlign: 'center' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop: '20px' },
  planCard: { background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' },
  
  btnAction: { background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s' },
  input: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', outline: 'none', fontSize: '14px' }
};

export const colors = {
  primary: 'var(--primary)',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  purple: '#8b5cf6'
};