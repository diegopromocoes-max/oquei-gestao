import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function SpeedometerCard({ title, current, target, projection, unit = '', color = 'blue' }) {
  // Caso de Metas Não Definidas (Ex: SVA quando a meta é 0)
  if (target === 0) {
    return (
      <div style={styles.cardEmerald}>
        <h4 style={styles.cardTitle}>{title}</h4>
        <div style={styles.centerBlock}>
          <div style={styles.iconWrapperEmerald}>
            <TrendingUp size={28} color="currentColor" />
          </div>
          <span style={styles.mainValueEmerald}>{current}{unit}</span>
          <div style={styles.subTextEmerald}>Sem Meta Definida</div>
        </div>
        <div style={styles.bottomBlock}>
          <span style={styles.badgeEmerald}>Contribuição Extra</span>
        </div>
      </div>
    );
  }

  // Cálculos de Porcentagem
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const cappedPercentage = Math.min(percentage, 100);
  
  // Cores dinâmicas baseadas no alcance
  let statusColor = '#ef4444'; // Vermelho (Abaixo de 70%)
  if (percentage >= 100) statusColor = '#10b981'; // Verde (Meta batida)
  else if (percentage >= 70) statusColor = '#f59e0b'; // Laranja (Quase lá)

  // Cálculos do SVG (Círculo cortado na metade)
  const radius = 40;
  const circumference = Math.PI * radius; 
  const strokeDashoffset = circumference - ((cappedPercentage / 100) * circumference);

  return (
    <div style={styles.cardWhite}>
      <h4 style={styles.cardTitle}>{title}</h4>
      
      <div style={styles.gaugeWrapper}>
        <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 50">
          {/* Fundo do medidor (Cinza) */}
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
          {/* Barra de progresso animada */}
          <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke={statusColor} 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} 
          />
        </svg>
        
        {/* Valores no centro do relógio */}
        <div style={styles.gaugeValueWrapper}>
          <span style={styles.mainValueDark}>{current}{unit}</span>
          <div style={styles.subTextDark}>Meta: {target}</div>
        </div>
      </div>

      {/* Rodapé com projeções */}
      <div style={styles.footerStats}>
        <div style={styles.statCol}>
          <span style={styles.statLabel}>Alcance</span>
          <span style={{ fontSize: '14px', fontWeight: '900', color: statusColor }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div style={styles.statColRight}>
          <span style={styles.statLabel}>Projeção (Mês)</span>
          <span style={styles.statValueBlue}>{projection}</span>
        </div>
      </div>
    </div>
  );
}

// --- ESTILOS EXCLUSIVOS DESTE COMPONENTE ---
const styles = {
  cardWhite: { 
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '25px 20px', 
    borderRadius: '28px', display: 'flex', flexDirection: 'column', 
    alignItems: 'center', justifyContent: 'space-between', position: 'relative', 
    overflow: 'hidden', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.02)' 
  },
  cardEmerald: { 
    backgroundColor: '#f0fdf4', border: '1px solid #d1fae5', padding: '25px 20px', 
    borderRadius: '28px', display: 'flex', flexDirection: 'column', 
    alignItems: 'center', justifyContent: 'space-between', position: 'relative', 
    overflow: 'hidden', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.02)' 
  },
  cardTitle: { 
    fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', 
    letterSpacing: '0.05em', marginBottom: '15px', width: '100%', textAlign: 'center', margin: 0 
  },
  gaugeWrapper: { 
    position: 'relative', width: '100%', maxWidth: '180px', height: '100px', display: 'flex', 
    alignItems: 'flex-end', justifyContent: 'center', marginBottom: '15px' 
  },
  gaugeValueWrapper: { position: 'absolute', bottom: '0', textAlign: 'center', marginBottom: '5px' },
  mainValueDark: { fontSize: '32px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.05em', lineHeight: 1 },
  subTextDark: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginTop: '5px' },
  footerStats: { 
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: '16px', border: '1px solid #f1f5f9', marginTop: '15px', boxSizing: 'border-box' 
  },
  statCol: { display: 'flex', flexDirection: 'column', gap: '2px' },
  statColRight: { display: 'flex', flexDirection: 'column', textAlign: 'right', gap: '2px' },
  statLabel: { fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValueBlue: { fontSize: '14px', fontWeight: '900', color: '#2563eb' },
  
  centerBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '110px', marginBottom: '15px' },
  iconWrapperEmerald: { padding: '15px', backgroundColor: '#d1fae5', color: '#059669', borderRadius: '50%', marginBottom: '10px' },
  mainValueEmerald: { fontSize: '32px', fontWeight: '900', color: '#047857', letterSpacing: '-0.05em', lineHeight: 1 },
  subTextEmerald: { fontSize: '11px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.05em' },
  bottomBlock: { width: '100%', textAlign: 'center', marginTop: '15px' },
  badgeEmerald: { fontSize: '10px', fontWeight: '900', color: '#059669', backgroundColor: '#d1fae5', padding: '6px 15px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }
};