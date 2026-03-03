import React from 'react';
import { Flame } from 'lucide-react';

export default function WarRoomProjections({ storeData, globalCalendar }) {
  const totalSales = storeData.reduce((acc, s) => acc + s.salesPlanos, 0);
  const totalGoal = storeData.reduce((acc, s) => acc + s.metaPlanos, 0);
  const workedDays = globalCalendar.worked || 1;
  const remainingDays = globalCalendar.remaining || 1;
  const currentPace = (totalSales / workedDays).toFixed(1);
  const projectedClose = Math.floor(totalSales + (currentPace * remainingDays));
  const requiredPace = Math.max(0, ((totalGoal - totalSales) / remainingDays)).toFixed(1);
  const isGlobalOnTrack = projectedClose >= totalGoal;

  return (
    <div style={{...styles.card, animation: 'slideIn 0.6s ease-out 0.4s forwards', opacity: 0}}>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={styles.header}>
        <div style={styles.iconBox}><Flame size={22} color="#ef4444" /></div>
        <div>
          <h3 style={styles.title}>Sala de Guerra: Projeções</h3>
          <p style={styles.subtitle}>Ritmo de vendas vs Metas Reais da Diretoria</p>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.statBox}>
          <span style={styles.statLabel}>Ritmo Atual</span>
          <div style={styles.statValue}>{currentPace} <small>vendas/dia</small></div>
        </div>
        <div style={{...styles.statBox, borderLeft: `4px solid ${isGlobalOnTrack ? '#10b981' : '#ef4444'}`}}>
          <span style={styles.statLabel}>Ritmo Necessário</span>
          <div style={{...styles.statValue, color: isGlobalOnTrack ? '#10b981' : '#ef4444'}}>{requiredPace} <small>vendas/dia</small></div>
        </div>
        <div style={styles.highlightBox}>
          <span style={styles.statLabelLight}>Fechamento Projetado</span>
          <div style={styles.statValueLarge}>{projectedClose} <small>/ {totalGoal}</small></div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#1e293b', borderRadius: '24px', padding: '25px', marginTop: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' },
  iconBox: { background: 'rgba(239, 68, 68, 0.15)', padding: '8px', borderRadius: '10px' },
  title: { fontSize: '16px', fontWeight: '900', color: 'white', margin: 0, textTransform: 'uppercase' },
  subtitle: { fontSize: '12px', color: '#94a3b8', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
  statBox: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '14px' },
  statLabel: { fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' },
  statValue: { fontSize: '22px', fontWeight: '900', color: 'white' },
  highlightBox: { background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', padding: '15px', borderRadius: '14px', boxShadow: '0 4px 15px rgba(37,99,235,0.2)' },
  statLabelLight: { fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' },
  statValueLarge: { fontSize: '24px', fontWeight: '900', color: 'white' }
};