import React, { useMemo } from 'react';
import { 
  Target, TrendingUp, AlertCircle, 
  CheckCircle2, Gauge, MousePointerClick,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { styles, colors } from './styles';

export default function InteligenciaView({ processedData }) {
  
  // 1. Cálculos de Inteligência Global
  const stats = useMemo(() => {
    if (!processedData.length) return null;
    const totalNet = processedData.reduce((acc, c) => acc + c.netAdds, 0);
    const totalTarget = processedData.reduce((acc, c) => acc + c.targetNetAdds, 0);
    const avgAttainment = totalTarget > 0 ? (totalNet / totalTarget) * 100 : 0;
    
    return {
      totalNet,
      totalTarget,
      avgAttainment: avgAttainment.toFixed(1),
      onTrack: processedData.filter(c => c.netAdds >= c.targetNetAdds).length,
      belowTarget: processedData.filter(c => c.netAdds < c.targetNetAdds).length
    };
  }, [processedData]);

  if (!stats) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* SEÇÃO 1: SCORECARDS DE INTELIGÊNCIA S&OP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Card: Atingimento Regional */}
        <div style={{ ...styles.globalCard, borderLeft: `6px solid ${stats.avgAttainment >= 100 ? '#10b981' : '#f59e0b'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={styles.globalLabel}>Atingimento Regional</span>
            <Gauge size={20} color="var(--primary)" />
          </div>
          <div style={{ ...styles.globalValue, color: stats.avgAttainment >= 100 ? '#10b981' : 'var(--text-main)' }}>
            {stats.avgAttainment}%
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-app)', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${Math.min(100, stats.avgAttainment)}%`, 
              height: '100%', 
              background: stats.avgAttainment >= 100 ? '#10b981' : 'var(--primary)',
              transition: 'width 1s ease'
            }} />
          </div>
        </div>

        {/* Card: Status de Unidades */}
        <div style={styles.globalCard}>
          <span style={styles.globalLabel}>Status das Unidades</span>
          <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>{stats.onTrack}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>NO ALVO</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)', height: '40px' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#ef4444' }}>{stats.belowTarget}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ABAIXO</div>
            </div>
          </div>
        </div>

      </div>

      {/* SEÇÃO 2: TABELA DE APURAÇÃO VS METAS */}
      <div style={styles.detailsColumn}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h3 style={styles.sectionTitle}><Target size={20} color="var(--primary)" /> Comparativo Meta vs Realizado</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dados integrados em tempo real</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={local.th}>UNIDADE</th>
                <th style={local.th}>META NET</th>
                <th style={local.th}>REALIZADO</th>
                <th style={local.th}>GAP</th>
                <th style={local.th}>PERFORMANCE</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map(city => {
                const attainment = city.targetNetAdds > 0 ? (city.netAdds / city.targetNetAdds) * 100 : 0;
                const gap = city.targetNetAdds - city.netAdds;
                const isOk = city.netAdds >= city.targetNetAdds;

                return (
                  <tr key={city.id} style={{ borderBottom: '1px solid var(--border)', transition: '0.2s' }} className="row-hover">
                    <td style={local.td}><strong>{city.city}</strong></td>
                    <td style={local.td}>{city.targetNetAdds}</td>
                    <td style={{ ...local.td, color: isOk ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      {city.netAdds}
                    </td>
                    <td style={local.td}>
                      {gap <= 0 ? (
                        <span style={{ color: '#10b981' }}>OK</span>
                      ) : (
                        <span style={{ color: '#ef4444' }}>-{gap}</span>
                      )}
                    </td>
                    <td style={local.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-app)', borderRadius: '10px', maxWidth: '80px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.min(100, Math.max(0, attainment))}%`, 
                            height: '100%', 
                            background: isOk ? '#10b981' : attainment > 50 ? '#f59e0b' : '#ef4444' 
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{attainment.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const local = {
  th: { padding: '15px 12px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '15px 12px', fontSize: '14px', color: 'var(--text-main)' }
};