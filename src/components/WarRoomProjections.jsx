import React from 'react';
import { Target, AlertTriangle, TrendingUp, Flame, ArrowRight, Zap } from 'lucide-react';

export default function WarRoomProjections({ storeData, globalCalendar }) {
  // Cálculos Globais
  const totalSales = storeData.reduce((acc, s) => acc + s.salesPlanos, 0);
  const totalGoal = storeData.reduce((acc, s) => acc + s.metaPlanos, 0);
  
  const workedDays = globalCalendar.worked || 1;
  const remainingDays = globalCalendar.remaining || 1;
  
  const currentPace = (totalSales / workedDays).toFixed(1);
  const projectedClose = Math.floor(totalSales + (currentPace * remainingDays));
  const requiredPace = Math.max(0, ((totalGoal - totalSales) / remainingDays)).toFixed(1);

  const isGlobalOnTrack = projectedClose >= totalGoal;

  // Lojas em Risco (Projeção < Meta)
  const storesAtRisk = storeData
    .filter(s => s.projSales < s.metaPlanos && s.metaPlanos > 0)
    .sort((a, b) => (a.projSales / a.metaPlanos) - (b.projSales / b.metaPlanos)); // Ordena pelas piores

  // Lojas na Meta
  const storesOnTrack = storeData
    .filter(s => s.projSales >= s.metaPlanos && s.metaPlanos > 0);

  return (
    <div id="sala-de-guerra" style={styles.card}>
      <div style={styles.header}>
        <div style={styles.iconBox}><Flame size={24} color="#ef4444" /></div>
        <div>
          <h3 style={styles.title}>Sala de Guerra: Projeções de Fechamento</h3>
          <p style={styles.subtitle}>Análise preditiva do ritmo de vendas (Planos de Internet)</p>
        </div>
      </div>

      <div style={styles.gridTop}>
        <div style={styles.statBox}>
          <div style={styles.statHeader}>
            <TrendingUp size={16} color="#60a5fa" />
            <span>Ritmo Atual (Run Rate)</span>
          </div>
          <div style={styles.statValue}>
            {currentPace} <span style={styles.statUnit}>vendas/dia</span>
          </div>
        </div>

        <div style={{...styles.statBox, borderColor: isGlobalOnTrack ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}}>
          <div style={styles.statHeader}>
            <Target size={16} color={isGlobalOnTrack ? "#10b981" : "#ef4444"} />
            <span>Ritmo Necessário p/ Meta</span>
          </div>
          <div style={{...styles.statValue, color: isGlobalOnTrack ? "#34d399" : "#f87171"}}>
            {requiredPace} <span style={styles.statUnit}>vendas/dia</span>
          </div>
          <p style={styles.statAlertText}>
            {isGlobalOnTrack ? 'Ritmo atual é suficiente!' : 'Precisamos acelerar o ritmo diário.'}
          </p>
        </div>

        <div style={styles.statBoxHighlight}>
          <div style={styles.statHeaderHighlight}>
            <Zap size={16} color="#fcd34d" />
            <span>Fechamento Projetado</span>
          </div>
          <div style={styles.statValueHighlight}>
            {projectedClose} <span style={{...styles.statUnit, color: '#fef3c7'}}>/ {totalGoal}</span>
          </div>
        </div>
      </div>

      <div style={styles.gridBottom}>
        {/* LOJAS EM RISCO */}
        <div style={styles.riskCard}>
          <h4 style={styles.listTitle}>
            <AlertTriangle size={18} color="#ef4444" /> Lojas no Vermelho (Em Risco)
          </h4>
          <div style={styles.listContainer}>
            {storesAtRisk.length === 0 ? (
              <p style={styles.emptyText}>Nenhuma loja em risco!</p>
            ) : (
              storesAtRisk.map((store, idx) => {
                const deficit = store.metaPlanos - store.projSales;
                return (
                  <div key={idx} style={styles.listItem}>
                    <div>
                      <h5 style={styles.itemName}>{store.city}</h5>
                      <p style={styles.itemSub}>Projeção: {store.projSales} de {store.metaPlanos}</p>
                    </div>
                    <div style={styles.deficitBadge}>
                      - {deficit} proj.
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* LOJAS NA META */}
        <div style={styles.trackCard}>
          <h4 style={styles.listTitle}>
            <Target size={18} color="#10b981" /> Lojas no Verde (Batendo a Meta)
          </h4>
          <div style={styles.listContainer}>
            {storesOnTrack.length === 0 ? (
              <p style={styles.emptyText}>Nenhuma loja batendo a meta ainda.</p>
            ) : (
              storesOnTrack.map((store, idx) => {
                const surplus = store.projSales - store.metaPlanos;
                return (
                  <div key={idx} style={styles.listItemGreen}>
                    <div>
                      <h5 style={styles.itemNameDark}>{store.city}</h5>
                      <p style={styles.itemSubDark}>Projeção: {store.projSales} de {store.metaPlanos}</p>
                    </div>
                    <div style={styles.surplusBadge}>
                      + {surplus} proj.
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderRadius: '28px', padding: '35px', marginBottom: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid #334155' },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
  iconBox: { background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' },
  title: { fontSize: '22px', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f8fafc' },
  subtitle: { fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' },
  
  gridTop: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
  statBox: { background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' },
  statHeader: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' },
  statValue: { fontSize: '32px', fontWeight: '900', color: 'white', display: 'flex', alignItems: 'baseline', gap: '5px' },
  statUnit: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  statAlertText: { fontSize: '11px', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic' },
  
  statBoxHighlight: { background: 'linear-gradient(135deg, #ea580c 0%, #b45309 100%)', padding: '20px', borderRadius: '20px', border: '1px solid #f59e0b', boxShadow: '0 8px 20px rgba(234, 88, 12, 0.3)' },
  statHeaderHighlight: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: '#fef3c7', textTransform: 'uppercase', marginBottom: '10px' },
  statValueHighlight: { fontSize: '36px', fontWeight: '900', color: 'white', display: 'flex', alignItems: 'baseline', gap: '5px' },

  gridBottom: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  
  riskCard: { background: 'rgba(239, 68, 68, 0.05)', borderRadius: '20px', padding: '25px', border: '1px solid rgba(239, 68, 68, 0.1)' },
  trackCard: { background: '#f8fafc', borderRadius: '20px', padding: '25px', border: '1px solid #e2e8f0' },
  
  listTitle: { fontSize: '15px', fontWeight: '900', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' },
  
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' },
  itemName: { fontSize: '14px', fontWeight: 'bold', color: 'white', margin: '0 0 4px 0' },
  itemSub: { fontSize: '11px', color: '#94a3b8', margin: 0 },
  deficitBadge: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.3)' },

  listItemGreen: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  itemNameDark: { fontSize: '14px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' },
  itemSubDark: { fontSize: '11px', color: '#64748b', margin: 0 },
  surplusBadge: { background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #a7f3d0' },
  
  emptyText: { fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px' }
};