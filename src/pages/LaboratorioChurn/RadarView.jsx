import React from 'react';
import { 
  ArrowUpRight, ArrowDownRight, 
  LayoutGrid, Plus, Activity, Target 
} from 'lucide-react';
import { styles } from './styles';

export default function RadarView({ processedData, selectedCity, setSelectedCity, actionPlans, setShowPlanModal }) {
  
  // Ordenação para colocar praças negativas no topo (Atenção imediata)
  const sortedData = [...processedData].sort((a, b) => a.netAdds - b.netAdds);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* CABEÇALHO DO PAINEL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h3 style={{ ...styles.sectionTitle, marginBottom: '5px' }}>
            <LayoutGrid size={20} color="var(--primary)" /> Monitoramento de Performance
          </h3>
          <p style={{ ...styles.subtitle, margin: 0 }}>Análise de resultados apurados por unidade</p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={local.miniStat}>
            <span style={{ color: '#10b981' }}>●</span> {processedData.filter(c => c.netAdds >= 0).length} Positivas
          </div>
          <div style={local.miniStat}>
            <span style={{ color: '#ef4444' }}>●</span> {processedData.filter(c => c.netAdds < 0).length} Críticas
          </div>
        </div>
      </div>

      {/* GRID DE SCORECARDS */}
      <div style={local.gridContainer}>
        {sortedData.map(city => {
          const isNegative = city.netAdds < 0;
          const isSelected = selectedCity?.id === city.id;
          const percentage = city.targetNetAdds > 0 ? ((city.netAdds / city.targetNetAdds) * 100).toFixed(0) : 0;

          return (
            <div 
              key={city.id} 
              onClick={() => setSelectedCity(city)}
              style={{
                ...local.scoreCard,
                borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                background: isSelected ? 'var(--bg-app)' : 'var(--bg-card)',
                transform: isSelected ? 'translateY(-5px)' : 'none'
              }}
            >
              <div style={{ 
                ...local.statusIndicator, 
                backgroundColor: isNegative ? '#ef4444' : '#10b981' 
              }} />

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>{city.city}</strong>
                  {isNegative ? <ArrowDownRight color="#ef4444" size={20} /> : <ArrowUpRight color="#10b981" size={20} />}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px' }}>
                  {/* CORREÇÃO AQUI: Garantindo que a tag aberta é a mesma que fecha */}
                  <span style={{ 
                    fontSize: '32px', 
                    fontWeight: '900', 
                    color: isNegative ? '#ef4444' : '#10b981' 
                  }}>
                    {city.netAdds > 0 ? '+' : ''}{city.netAdds}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>NET ADDS</span>
                </div>

                <div style={local.progressContainer}>
                  <div style={{ 
                    ...local.progressBar, 
                    width: `${Math.min(100, Math.max(0, percentage))}%`,
                    backgroundColor: isNegative ? '#ef4444' : 'var(--primary)'
                  }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>META: {city.targetNetAdds}</span>
                  <span style={{ color: isNegative ? '#ef4444' : 'var(--text-main)' }}>{percentage}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETALHAMENTO DA UNIDADE */}
      {selectedCity && (
        <div style={{ 
          ...styles.detailsColumn, 
          marginTop: '20px', 
          borderTop: `4px solid ${selectedCity.netAdds < 0 ? '#ef4444' : '#10b981'}`,
          animation: 'slideUp 0.4s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div>
              <h2 style={styles.title}>{selectedCity.city}</h2>
              <p style={styles.subtitle}>Detalhamento de Apuração</p>
            </div>
            <button onClick={() => setShowPlanModal(true)} style={styles.btnAction}>
              <Plus size={18} /> Nova Estratégia
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div style={local.detailMiniBox}>
              <span style={styles.globalLabel}>Vendas Brutas</span>
              <strong style={{ color: 'var(--text-main)', fontSize: '24px' }}>{selectedCity.totalSales}</strong>
            </div>
            <div style={local.detailMiniBox}>
              <span style={styles.globalLabel}>Evasão (Churn)</span>
              <strong style={{ color: '#ef4444', fontSize: '24px' }}>{selectedCity.cancelations}</strong>
            </div>
            <div style={local.detailMiniBox}>
              <span style={styles.globalLabel}>Taxa de Churn</span>
              <strong style={{ color: 'var(--text-main)', fontSize: '24px' }}>{selectedCity.churnRate}%</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const local = {
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  scoreCard: { position: 'relative', borderRadius: '20px', border: '1px solid', cursor: 'pointer', transition: 'all 0.3s ease', overflow: 'hidden' },
  statusIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px' },
  progressContainer: { width: '100%', height: '6px', background: 'var(--bg-app)', borderRadius: '10px', marginTop: '15px', overflow: 'hidden', border: '1px solid var(--border)' },
  progressBar: { height: '100%', borderRadius: '10px', transition: 'width 1s ease-in-out' },
  miniStat: { fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '8px 15px', borderRadius: '12px', border: '1px solid var(--border)' },
  detailMiniBox: { background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }
};