import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    const duration = 1500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setDisplayValue(end); clearInterval(timer); }
      else { setDisplayValue(Math.ceil(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{displayValue}</span>;
};

export default function SpeedometerCard({ title, current, target, projection, unit = '', color = 'blue', delay = '0s' }) {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const cappedPercentage = Math.min(percentage, 100);
  let statusColor = percentage >= 100 ? '#10b981' : percentage >= 70 ? '#f59e0b' : '#ef4444';

  const radius = 40;
  const circumference = Math.PI * radius; 
  const strokeDashoffset = circumference - ((cappedPercentage / 100) * circumference);

  return (
    <div style={{...styles.cardWhite, animation: `slideUp 0.6s ease-out ${delay} forwards`, opacity: 0}}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gaugeFill { from { stroke-dashoffset: ${circumference}; } to { stroke-dashoffset: ${strokeDashoffset}; } }
      `}</style>
      <h4 style={styles.cardTitle}>{title}</h4>
      <div style={styles.gaugeWrapper}>
        <svg viewBox="0 0 100 50" style={{width:'100%'}}>
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={statusColor} strokeWidth="10" strokeLinecap="round" 
                strokeDasharray={circumference} style={{ animation: `gaugeFill 2s ease-out ${delay} forwards` }} />
        </svg>
        <div style={styles.gaugeValueWrapper}>
          <span style={styles.mainValueDark}><AnimatedNumber value={current}/>{unit}</span>
          <div style={styles.subTextDark}>Meta: {target}</div>
        </div>
      </div>
      <div style={styles.footerStats}>
        <div style={styles.statCol}><span style={styles.statLabel}>Alcance</span><span style={{color: statusColor, fontWeight: '900'}}><AnimatedNumber value={percentage}/>%</span></div>
        <div style={styles.statColRight}><span style={styles.statLabel}>Projeção</span><span style={styles.statValueBlue}><AnimatedNumber value={projection}/></span></div>
      </div>
    </div>
  );
}

const styles = {
  cardWhite: { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '25px 20px', borderRadius: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.02)' },
  cardTitle: { fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', textAlign: 'center', margin: 0 },
  gaugeWrapper: { position: 'relative', width: '100%', maxWidth: '180px', height: '100px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', margin: '15px 0' },
  gaugeValueWrapper: { position: 'absolute', bottom: '0', textAlign: 'center' },
  mainValueDark: { fontSize: '30px', fontWeight: '900', color: '#1e293b', lineHeight: 1 },
  subTextDark: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginTop: '5px' },
  footerStats: { width: '100%', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '16px' },
  statCol: { display: 'flex', flexDirection: 'column' },
  statColRight: { display: 'flex', flexDirection: 'column', textAlign: 'right' },
  statLabel: { fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  statValueBlue: { fontSize: '14px', fontWeight: '900', color: '#2563eb' }
};