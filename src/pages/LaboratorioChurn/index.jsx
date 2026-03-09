import React, { useState, useMemo } from 'react';
import { Plus, Target, Activity, Minus, Equal, Filter, ChevronRight } from 'lucide-react';
import { styles as global, colors } from '../styles/globalStyles'; // Mantive a sua importação exata

export default function RadarView({ processedData, selectedCity, setSelectedCity, actionPlans, setShowPlanModal }) {
  // 1. Lógica de Filtro por Cluster
  const clusters = useMemo(() => {
    // Tenta pegar o clusterName ou clusterId. Se não existir, agrupa como 'Geral'
    const uniqueClusters = new Set(processedData.map(c => c.clusterName || c.clusterId || 'Geral'));
    return ['Todos', ...Array.from(uniqueClusters)];
  }, [processedData]);

  const [activeCluster, setActiveCluster] = useState('Todos');

  // 2. Filtrar cidades de acordo com o cluster
  const filteredCities = useMemo(() => {
    if (activeCluster === 'Todos') return processedData;
    return processedData.filter(c => (c.clusterName || c.clusterId || 'Geral') === activeCluster);
  }, [processedData, activeCluster]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.4s' }}>
      
      {/* ========================================================= */}
      {/* PAINEL SUPERIOR: FILTROS E SELEÇÃO DE PRAÇA (CARROSSEL)   */}
      {/* ========================================================= */}
      <div style={{ ...global.card, padding: '25px', background: '#020617' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={local.secTitle}>
            <Filter size={16} color={colors.primary} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> 
            SELECIONE A PRAÇA
          </h3>
          
          {/* Botões de Filtro (Clusters) */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
            {clusters.map(cluster => (
              <button
                key={cluster}
                onClick={() => setActiveCluster(cluster)}
                style={{
                  ...local.filterBtn,
                  background: activeCluster === cluster ? colors.primary : 'transparent',
                  color: activeCluster === cluster ? 'white' : '#64748b',
                  borderColor: activeCluster === cluster ? colors.primary : '#334155'
                }}
              >
                {cluster}
              </button>
            ))}
          </div>
        </div>

        {/* Lista Horizontal de Cidades */}
        <div style={local.horizontalList}>
          {filteredCities.map(city => {
            const isSelected = selectedCity?.id === city.id;
            const hitGoal = city.netAdds >= city.targetNetAdds;

            return (
              <div 
                key={city.id} 
                onClick={() => setSelectedCity(city)} 
                style={{ 
                  ...local.cityCardTop, 
                  borderColor: isSelected ? colors.primary : '#1e293b',
                  background: isSelected ? `${colors.primary}15` : '#0f172a' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'white' }}>{city.city}</h4>
                  <span style={{ ...local.badge, background: hitGoal ? '#10b98120' : '#f59e0b20', color: hitGoal ? colors.success : '#f59e0b' }}>
                    Meta: {city.targetNetAdds}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>NET ADDS</span>
                    <strong style={{ display: 'block', fontSize: '20px', color: city.netAdds >= 0 ? colors.success : colors.danger }}>
                      {city.netAdds > 0 ? '+' : ''}{city.netAdds}
                    </strong>
                  </div>
                  <ChevronRight size={18} color={isSelected ? colors.primary : '#64748b'} />
                </div>
              </div>
            );
          })}
          {filteredCities.length === 0 && (
            <div style={{ padding: '20px', color: '#64748b', fontSize: '14px' }}>Nenhuma praça encontrada.</div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* PAINEL INFERIOR: LABORATÓRIO DETALHADO E FUNIL            */}
      {/* ========================================================= */}
      <div style={{ ...global.card, minHeight: '400px', padding: '30px' }}>
        {!selectedCity ? (
          <div style={global.emptyState}>
            <Target size={48} color="#334155" style={{ marginBottom: '15px' }} />
            <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>Laboratório em Standby</h3>
            <p style={{ margin: 0, color: '#94a3b8' }}>Selecione uma praça no painel superior para analisar o funil.</p>
          </div>
        ) : (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                <h2 style={{ ...global.title, fontSize: '24px' }}>{selectedCity.city}</h2>
                <p style={global.subtitle}>
                  Base: <strong>{selectedCity.currentBase} clientes</strong> | Churn Rate: <strong style={{color: colors.danger}}>{selectedCity.churnRate}%</strong>
                </p>
              </div>
            </div>
            
            {/* Funil Matemático Full-Width */}
            <div style={local.funnelHorizontal}>
              <div style={{ ...local.funnelBox, borderTopColor: colors.success }}>
                <span style={local.funnelLabel}>Vendas Brutas</span>
                <strong style={{ ...local.funnelValue, color: colors.success }}>{selectedCity.totalSales}</strong>
              </div>

              <Minus size={24} color="#64748b" style={{ flexShrink: 0 }} />

              <div style={{ ...local.funnelBox, borderTopColor: colors.danger }}>
                <span style={local.funnelLabel}>Evasão (Churn)</span>
                <strong style={{ ...local.funnelValue, color: colors.danger }}>{selectedCity.cancelations}</strong>
              </div>

              <Equal size={24} color="#64748b" style={{ flexShrink: 0 }} />

              <div style={{ ...local.funnelBox, background: colors.primary, borderTop: 'none', transform: 'scale(1.05)' }}>
                <span style={{ ...local.funnelLabel, color: 'rgba(255,255,255,0.8)' }}>Saldo (Net Adds)</span>
                <strong style={{ ...local.funnelValue, color: 'white' }}>
                  {selectedCity.netAdds > 0 ? '+' : ''}{selectedCity.netAdds}
                </strong>
              </div>
            </div>

            {/* Planos de Ação (S&OP) */}
            <div style={{ marginTop: '50px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h3 style={local.secTitle}>PLANOS DE AÇÃO ATIVOS</h3>
                 <button onClick={() => setShowPlanModal(true)} style={{...global.btnPrimary, padding: '8px 15px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                   <Plus size={16}/> Lançar Estratégia
                 </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {actionPlans.filter(p => p.cityId === selectedCity.id).length === 0 ? (
                  <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', gridColumn: '1 / -1', textAlign: 'center' }}>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Nenhum plano ativo para esta praça.</p>
                  </div>
                ) : (
                  actionPlans.filter(p => p.cityId === selectedCity.id).map(p => (
                    <div key={p.id} style={local.planCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ color: 'white', fontSize: '15px' }}>{p.title}</strong>
                        <span style={local.badge}>{p.status}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>{p.problem}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ESTILOS LOCAIS MODERNIZADOS
const local = {
  secTitle: { fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', margin: 0, letterSpacing: '0.05em' },
  filterBtn: { padding: '8px 16px', borderRadius: '20px', border: '1px solid', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  horizontalList: { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px', paddingTop: '5px' },
  cityCardTop: { minWidth: '240px', padding: '20px', borderRadius: '16px', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s' },
  badge: { fontSize: '11px', padding: '4px 8px', borderRadius: '12px', fontWeight: '900' },
  funnelHorizontal: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', marginTop: '30px' },
  funnelBox: { flex: 1, padding: '25px', borderRadius: '20px', background: '#0f172a', borderTop: '4px solid', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  funnelLabel: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  funnelValue: { fontSize: '36px', fontWeight: '900', marginTop: '10px' },
  planCard: { padding: '20px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }
};