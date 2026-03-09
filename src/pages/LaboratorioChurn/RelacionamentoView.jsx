import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { 
  Headset, AlertTriangle, UserX, 
  TrendingDown, ShieldAlert, ChevronRight 
} from 'lucide-react';
import { styles } from './styles';

export default function RelacionamentoView({ processedData }) {
  
  // 1. Consolidação da Apuração de Churn e Ofensores
  const churnAnalysis = useMemo(() => {
    if (!processedData.length) return null;

    const reasons = {
      concorrencia: processedData.reduce((acc, c) => acc + (c.churnReasons?.concorrencia || 0), 0),
      tecnico: processedData.reduce((acc, c) => acc + (c.churnReasons?.tecnico || 0), 0),
      financeiro: processedData.reduce((acc, c) => acc + (c.churnReasons?.financeiro || 0), 0),
      outros: processedData.reduce((acc, c) => acc + (c.churnReasons?.outros || 0), 0),
    };

    const totalCancels = processedData.reduce((acc, c) => acc + c.cancelations, 0);
    const avgChurnRate = (processedData.reduce((acc, c) => acc + parseFloat(c.churnRate), 0) / processedData.length).toFixed(2);

    // Identificar o maior ofensor
    const mainOffender = Object.keys(reasons).reduce((a, b) => reasons[a] > reasons[b] ? a : b);

    return {
      reasons,
      totalCancels,
      avgChurnRate,
      mainOffender: mainOffender.toUpperCase(),
      pieData: [
        { name: 'Concorrência', value: reasons.concorrencia, color: '#ef4444' },
        { name: 'Técnico', value: reasons.tecnico, color: '#f59e0b' },
        { name: 'Financeiro', value: reasons.financeiro, color: '#3b82f6' },
        { name: 'Outros', value: reasons.outros, color: '#64748b' },
      ]
    };
  }, [processedData]);

  if (!churnAnalysis) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* SEÇÃO 1: SCORECARDS DE EVASÃO (APURAÇÃO) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        <div style={{ ...styles.globalCard, borderLeft: '6px solid #ef4444' }}>
          <span style={styles.globalLabel}>Taxa de Churn Regional</span>
          <div style={{ ...styles.globalValue, color: '#ef4444' }}>
            {churnAnalysis.avgChurnRate}% <TrendingDown size={24} />
          </div>
        </div>

        <div style={styles.globalCard}>
          <span style={styles.globalLabel}>Volume de Evasão (Mês)</span>
          <div style={styles.globalValue}>
            {churnAnalysis.totalCancels} <UserX size={24} color="var(--text-secondary)" />
          </div>
        </div>

        <div style={{ ...styles.globalCard, borderLeft: '6px solid #f59e0b' }}>
          <span style={styles.globalLabel}>Ofensor Principal</span>
          <div style={{ ...styles.globalValue, fontSize: '20px', color: '#f59e0b' }}>
            {churnAnalysis.mainOffender} <ShieldAlert size={24} />
          </div>
        </div>

      </div>

      {/* SEÇÃO 2: ANÁLISE PROFUNDA (PARETO E MOTIVOS) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
        
        {/* Pareto de Evasão por Praça */}
        <div style={styles.detailsColumn}>
          <h3 style={styles.sectionTitle}><Headset size={20} color="var(--primary)" /> Pareto de Evasão por Praça</h3>
          <div style={{ height: 350, marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...processedData].sort((a,b) => b.cancelations - a.cancelations)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="city" type="category" width={100} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-app)' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                />
                <Bar dataKey="cancelations" name="Cancelamentos" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Motivos (Donut) */}
        <div style={styles.detailsColumn}>
          <h3 style={styles.sectionTitle}><AlertTriangle size={20} color="#f59e0b" /> Motivos de Saída</h3>
          <div style={{ height: 350, marginTop: '20px' }}>
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
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legenda de Motivos Detalhada */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {churnAnalysis.pieData.map(item => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color }} />
                  {item.name}
                </span>
                <span style={{ color: 'var(--text-main)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}