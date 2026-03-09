import React, { useMemo } from 'react';
import { 
  Zap, Target, TrendingUp, 
  AlertCircle, CheckCircle2, 
  ArrowRight, BarChart2 
} from 'lucide-react';
import { styles } from './styles';

export default function ProjecoesView({ processedData }) {
  
  // 1. Consolidação da Tendência Regional
  const regionalProjection = useMemo(() => {
    if (!processedData.length) return null;
    
    const totalProj = processedData.reduce((acc, c) => acc + c.projNetAdds, 0);
    const totalTarget = processedData.reduce((acc, c) => acc + c.targetNetAdds, 0);
    const attainment = totalTarget > 0 ? (totalProj / totalTarget) * 100 : 0;

    return {
      totalProj,
      totalTarget,
      attainment: attainment.toFixed(1),
      gap: totalTarget - totalProj
    };
  }, [processedData]);

  if (!regionalProjection) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* SEÇÃO 1: STATUS DA PROJEÇÃO REGIONAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        <div style={{ ...styles.globalCard, borderLeft: '6px solid var(--primary)' }}>
          <span style={styles.globalLabel}>Tendência de Fechamento (NET)</span>
          <div style={styles.globalValue}>
            {regionalProjection.totalProj > 0 ? '+' : ''}{regionalProjection.totalProj}
            <Zap size={24} color="var(--primary)" />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>
            Baseado no ritmo atual de vendas e cancelamentos.
          </p>
        </div>

        <div style={{ 
          ...styles.globalCard, 
          borderLeft: `6px solid ${regionalProjection.attainment >= 100 ? '#10b981' : '#f59e0b'}` 
        }}>
          <span style={styles.globalLabel}>% de Atingimento Projetado</span>
          <div style={{ 
            ...styles.globalValue, 
            color: regionalProjection.attainment >= 100 ? '#10b981' : 'var(--text-main)' 
          }}>
            {regionalProjection.attainment}%
          </div>
        </div>

      </div>

      {/* SEÇÃO 2: GRID DE PROJEÇÃO POR UNIDADE (SCORECARDS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {processedData.map(city => {
          const isOnTrack = city.projNetAdds >= city.targetNetAdds;
          const gap = city.targetNetAdds - city.projNetAdds;
          const progress = city.targetNetAdds > 0 ? (city.projNetAdds / city.targetNetAdds) * 100 : 0;

          return (
            <div 
              key={city.id} 
              style={{
                ...styles.cityCard,
                background: 'var(--bg-card)',
                borderColor: isOnTrack ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={styles.cityName}>{city.city}</strong>
                {isOnTrack ? 
                  <CheckCircle2 size={18} color="#10b981" /> : 
                  <AlertCircle size={18} color="#ef4444" />
                }
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <span style={styles.globalLabel}>Projeção Net</span>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '900', 
                    color: city.projNetAdds >= 0 ? '#10b981' : '#ef4444' 
                  }}>
                    {city.projNetAdds > 0 ? '+' : ''}{city.projNetAdds}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={styles.globalLabel}>Meta</span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {city.targetNetAdds}
                  </div>
                </div>
              </div>

              {/* Barra de Tendência */}
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-app)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(100, Math.max(0, progress))}%`, 
                  height: '100%', 
                  background: isOnTrack ? '#10b981' : '#ef4444',
                  transition: 'width 1s ease'
                }} />
              </div>

              <div style={{ 
                padding: '10px', 
                borderRadius: '8px', 
                background: 'var(--bg-app)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  {isOnTrack ? 'DENTRO DA META' : `FALTAM ${gap} PARA A META`}
                </span>
                <BarChart2 size={14} color="var(--text-secondary)" />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}