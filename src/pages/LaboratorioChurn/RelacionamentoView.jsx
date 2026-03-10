import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { 
  Headset, AlertTriangle, UserX, 
  TrendingDown, ShieldAlert
} from 'lucide-react';
import { styles } from '../../styles/globalStyles'; // Importação Global

// Paleta de cores dinâmica para os motivos (até 8 motivos diferentes)
const DYNAMIC_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#64748b'];

export default function RelacionamentoView({ processedData, reasonsMap }) {
  
  const churnAnalysis = useMemo(() => {
    if (!processedData.length) return null;

    const reasonsCount = {};
    let totalCancels = 0;
    let totalBase = 0;

    // 1. Agrupar todos os motivos de todas as cidades e somar totais
    processedData.forEach(city => {
      totalCancels += city.cancelations || 0;
      totalBase += parseFloat(city.baseStart || 0);

      if (city.churnReasons) {
        Object.entries(city.churnReasons).forEach(([reasonId, amount]) => {
          reasonsCount[reasonId] = (reasonsCount[reasonId] || 0) + Number(amount);
        });
      }
    });

    const avgChurnRate = totalBase > 0 ? ((totalCancels / totalBase) * 100).toFixed(2) : "0.00";

    // 2. Montar os dados para o Gráfico de Rosca (Donut) associando ao Nome Real e uma Cor
    const pieData = Object.entries(reasonsCount)
      .map(([reasonId, amount], index) => ({
        name: reasonsMap[reasonId] || 'Outros / Excluídos',
        value: amount,
        color: DYNAMIC_COLORS[index % DYNAMIC_COLORS.length]
      }))
      .filter(item => item.value > 0) // Mostra apenas motivos que tiveram cancelamento
      .sort((a, b) => b.value - a.value); // Ordena do maior para o menor

    // 3. Descobrir o Maior Ofensor
    let mainOffender = 'N/A';
    if (pieData.length > 0) {
      mainOffender = pieData[0].name.toUpperCase();
    }

    return {
      totalCancels,
      avgChurnRate,
      mainOffender,
      pieData
    };
  }, [processedData, reasonsMap]);

  if (!churnAnalysis) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* SEÇÃO 1: SCORECARDS DE EVASÃO */}
      <div style={styles.grid4}>
        <div style={{...styles.mainCard, borderLeft: '6px solid #ef4444'}}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Taxa de Churn Regional</span>
          <div style={{ fontSize: '30px', fontWeight: '900', color: '#ef4444', display: 'flex', justifyContent: 'space-between' }}>
            {churnAnalysis.avgChurnRate}% <TrendingDown size={24} />
          </div>
        </div>

        <div style={styles.mainCard}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volume de Evasão (Mês)</span>
          <div style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
            {churnAnalysis.totalCancels} <UserX size={24} color="var(--text-muted)" />
          </div>
        </div>

        <div style={{...styles.mainCard, borderLeft: '6px solid #f59e0b', gridColumn: 'span 2'}}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ofensor Principal (Alerta)</span>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
            {churnAnalysis.mainOffender} <ShieldAlert size={28} />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: GRÁFICOS (PARETO E DONUT DINÂMICO) */}
      <div style={styles.gridMain}>
        
        {/* Pareto de Evasão por Praça */}
        <div style={styles.mainCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}><Headset size={20} color="#3b82f6" /> Pareto de Evasão por Unidade</h3>
          </div>
          <div style={{ height: 350, marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...processedData].sort((a,b) => b.cancelations - a.cancelations)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="city" type="category" width={120} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-app)' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}
                />
                <Bar dataKey="cancelations" name="Cancelamentos" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Motivos (Donut Dinâmico) */}
        <div style={styles.mainCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}><AlertTriangle size={20} color="#f59e0b" /> Ofensores da Região</h3>
          </div>
          
          <div style={{ height: 280, marginTop: '10px' }}>
            {churnAnalysis.pieData.length === 0 ? (
              <div style={styles.emptyState}>Sem motivos de churn registados.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={churnAnalysis.pieData}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {churnAnalysis.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-card)" strokeWidth={3} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                    itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Legenda Dinâmica e Detalhada */}
          <div style={styles.reasonsContainer}>
            {churnAnalysis.pieData.map(item => (
              <div key={item.name} style={styles.reasonRow}>
                <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: item.color }} />
                  {item.name}
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: '900', fontSize: '15px' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}