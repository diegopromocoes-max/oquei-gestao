// ============================================================
//  wallboard/WallboardStyles.js — Oquei Gestão
//  Estilos do modo TV Wallboard (Tema Neon Galaxy / NASA).
//  Separado do componente para manter o .jsx limpo.
// ============================================================

import { colors } from '../../components/ui';

// ─── Objeto de estilos ────────────────────────────────────────────────────────
export const styles = {
  wallboardContainer: {
    backgroundColor: '#0a0b1a',
    backgroundImage: 'radial-gradient(circle at 50% -20%, #1a1e4a 0%, #0a0b1a 80%)',
    height: '100vh', width: '100vw',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    position: 'relative', color: '#ffffff',
  },

  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 30px', background: 'rgba(10, 11, 26, 0.8)', backdropFilter: 'blur(15px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, zIndex: 10,
    boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
  },
  logoBadge: {
    background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
    padding: '6px', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,242,254,0.4)',
  },
  title: {
    fontSize: '18px', fontWeight: '900', color: '#ffffff', margin: 0,
    letterSpacing: '0.05em', textTransform: 'uppercase', textShadow: '0 2px 5px rgba(255,255,255,0.2)',
  },
  subtitle: {
    fontSize: '10px', color: 'var(--text-muted)', margin: '0',
    fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase',
  },
  clockContainer: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(22, 25, 59, 0.8)', padding: '6px 12px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
  },
  clockText: {
    fontSize: '16px', fontWeight: '900', color: '#00f2fe',
    fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em',
    textShadow: '0 0 8px rgba(0,242,254,0.5)',
  },
  exitBtn: {
    background: 'rgba(239, 68, 68, 0.1)', color: colors.danger,
    border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px', borderRadius: '10px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s',
  },

  // Scroll Controls
  scrollControls: {
    display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px',
    background: 'rgba(255,255,255,0.05)', padding: '4px 12px',
    borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  scrollBtn: {
    background: 'transparent', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '4px', transition: 'color 0.2s', outline: 'none',
  },

  scrollArea: {
    flex: 1, overflowY: 'auto',
    padding: '30px 40px 100px 40px',
    display: 'flex', flexDirection: 'column', gap: '35px',
  },

  // Módulos
  moduleBox: { display: 'flex', flexDirection: 'column', gap: '20px', background: 'transparent' },
  moduleHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px',
    cursor: 'pointer', userSelect: 'none',
  },
  iconGlow: { padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' },
  moduleTitle: { fontSize: '18px', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  collapseBtn: {
    padding: '6px', background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  // Módulo 1: Operação
  mod1Grid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px' },
  statusRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  statusBox: {
    background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid #2d325a', borderRadius: '16px', padding: '20px',
    display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  statusValue: {
    fontSize: '32px', fontWeight: '900', color: '#ffffff',
    display: 'block', lineHeight: 1, textShadow: '0 2px 10px rgba(255,255,255,0.2)',
  },
  statusLabel: {
    fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px', display: 'block',
  },
  bancoHorasCard: {
    background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid #2d325a', borderRadius: '16px', padding: '25px',
    display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  bhTitle: {
    fontSize: '15px', color: '#ffffff', fontWeight: '900', margin: '0 0 20px 0',
    display: 'flex', alignItems: 'center', gap: '10px',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  bhSubTitle: {
    fontSize: '12px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase',
    marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em',
  },
  bhRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  bhName: { fontSize: '14px', color: 'var(--text-muted)', fontWeight: '700' },
  bhVal:  { fontSize: '14px', fontWeight: '900', textShadow: '0 0 10px currentColor' },

  // Módulo 2: Vendas
  mod2Grid: { display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '25px' },
  globalSpeedGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' },
  globalSpeedCard: {
    background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid #2d325a', borderRadius: '20px', padding: '25px',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative',
  },
  globalSpeedTitle: {
    fontSize: '12px', color: 'var(--text-muted)', fontWeight: '900',
    textTransform: 'uppercase', margin: '0 0 15px 0', letterSpacing: '0.1em',
  },
  backlogBadge: {
    background: 'rgba(249, 212, 35, 0.1)', color: '#f9d423', padding: '4px 10px',
    borderRadius: '8px', fontSize: '10px', fontWeight: 'bold',
    display: 'flex', alignItems: 'center', gap: '5px',
    border: '1px solid rgba(249,212,35,0.3)',
  },
  neonDonutCard:    { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' },
  neonDonutTitle:   { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 },
  neonDonutWrapper: { position: 'relative', height: '120px', width: '120px', display: 'flex', justifyContent: 'center', marginTop: '10px' },
  neonDonutContent: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  neonDonutValue:   { fontSize: '28px', fontWeight: '900', color: '#ffffff', lineHeight: 1, textShadow: '0 0 10px rgba(255,255,255,0.5)' },
  neonDonutTarget:  { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '5px' },
  neonBacklogBadge: { background: 'rgba(249, 212, 35, 0.1)', color: '#f9d423', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid rgba(249,212,35,0.3)' },

  citiesSpeedGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  cityDashCard: {
    background: 'rgba(22, 25, 59, 0.4)', backdropFilter: 'blur(5px)',
    border: '1px solid #2d325a', borderRadius: '16px', padding: '20px',
    boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
  },
  cityDashTitle: {
    fontSize: '14px', fontWeight: '900', color: '#ffffff',
    display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 15px 0',
    paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  progressBarWrapper: { width: '100%', display: 'flex', flexDirection: 'column' },
  progressBarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' },
  progressBarTitle:  { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' },
  progressBarValues: { fontSize: '15px', fontWeight: '900' },
  progressBarTrack:  { width: '100%', height: '8px', background: '#1a1e4a', borderRadius: '4px', overflow: 'hidden' },

  rankingCard: {
    background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid #2d325a', borderRadius: '20px', padding: '25px',
    height: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  rankingTitle: {
    fontSize: '15px', fontWeight: '900', color: '#ffffff',
    display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 25px 0',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  sellerList:   { display: 'flex', flexDirection: 'column', gap: '12px' },
  sellerItem:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderRadius: '12px', border: '1px solid transparent', transition: 'all 0.3s' },
  sellerAvatar: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '900' },

  bigSpeedWrapper: { position: 'relative', width: '200px', height: '120px' },
  bigSpeedContent: { position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  bigSpeedValue:   { fontSize: '36px', fontWeight: '900', color: '#ffffff', lineHeight: 1, textShadow: '0 0 15px rgba(255,255,255,0.4)' },
  bigSpeedTarget:  { fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' },

  // Módulo 3: Churn
  mod3Grid: { display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '25px' },
  netAddsGlobal: {
    background: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
    padding: '25px', borderRadius: '20px', boxShadow: '0 15px 30px rgba(11, 163, 96, 0.3)',
    position: 'relative', overflow: 'hidden',
  },
  netAddsLabel: {
    fontSize: '12px', color: '#ecfdf5', fontWeight: '900', textTransform: 'uppercase',
    display: 'block', marginBottom: '15px', letterSpacing: '0.05em', position: 'relative', zIndex: 2,
  },
  netAddsVal: {
    fontSize: '56px', fontWeight: '900', color: '#ffffff', lineHeight: 1,
    textShadow: '0 4px 15px rgba(0,0,0,0.3)', position: 'relative', zIndex: 2,
  },
  netAddsGlow: {
    position: 'absolute', top: '-50%', right: '-20%', width: '180px', height: '180px',
    background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
    borderRadius: '50%', zIndex: 1,
  },
  churnReasonCard: {
    background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid #2d325a', borderRadius: '20px', padding: '25px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)', flex: 1, display: 'flex', flexDirection: 'column',
  },
  citiesGrowthCard: {
    background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid #2d325a', borderRadius: '20px', padding: '20px 25px',
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 25px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  cityGrowthRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  penetrationChartCard: {
    background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid #2d325a', borderRadius: '20px', padding: '25px',
    flex: 1, boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
  },

  // Módulo 4: Mega
  megaFilterRow: {
    display: 'flex', alignItems: 'center', gap: '15px',
    background: 'rgba(22, 25, 59, 0.4)', padding: '15px 20px',
    borderRadius: '16px', marginBottom: '25px', flexWrap: 'wrap', border: '1px solid #2d325a',
  },
  megaSelect: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff', padding: '10px 15px', borderRadius: '10px', outline: 'none',
    fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  megaChartWrapper: {
    background: 'rgba(22, 25, 59, 0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '30px',
    boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
  },

  // Ticker
  tickerWrapper:   { position: 'fixed', bottom: '25px', left: '40px', right: '40px', zIndex: 100 },
  tickerContainer: { display: 'flex', height: '45px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(10, 11, 26, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' },
  tickerLabel:     { background: 'linear-gradient(90deg, #f83600 0%, #f9d423 100%)', color: '#ffffff', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '900', letterSpacing: '0.15em', zIndex: 2, boxShadow: '5px 0 15px rgba(0,0,0,0.5)' },
  tickerTrack:     { flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative' },
  tickerText:      { whiteSpace: 'nowrap', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', paddingLeft: '100%', animation: 'scrollTicker 25s linear infinite', letterSpacing: '0.05em' },
};

// ─── Injeção de CSS global (keyframes + fontes) ───────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('wallboard-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'wallboard-styles';
  styleSheet.innerText = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    @keyframes fadeIn       { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scrollTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-200%); } }
    @keyframes pulse        { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;
  document.head.appendChild(styleSheet);
}