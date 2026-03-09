import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend 
} from 'recharts';
import { 
  Share2, Store, MapPin, Headset, 
  Briefcase, BarChart3, TrendingUp 
} from 'lucide-react';
import { styles } from './styles';

export default function OmnichannelView({ processedData }) {
  
  // 1. Consolidação dos Dados Regionais por Canal
  const channelStats = useMemo(() => {
    if (!processedData.length) return null;
    
    const totals = {
      loja: processedData.reduce((acc, c) => acc + (c.channels?.loja || 0), 0),
      pap: processedData.reduce((acc, c) => acc + (c.channels?.pap || 0), 0),
      central: processedData.reduce((acc, c) => acc + (c.channels?.central || 0), 0),
      b2b: processedData.reduce((acc, c) => acc + (c.channels?.b2b || 0), 0),
    };

    const totalSales = totals.loja + totals.pap + totals.central + totals.b2b;

    return {
      totals,
      totalSales,
      pieData: [
        { name: 'Loja', value: totals.loja, color: '#10b981' },
        { name: 'PAP', value: totals.pap, color: '#f59e0b' },
        { name: 'Central', value: totals.central, color: '#3b82f6' },
        { name: 'B2B', value: totals.b2b, color: '#8b5cf6' },
      ]
    };
  }, [processedData]);

  if (!channelStats) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* SEÇÃO 1: SCORECARDS DE PERFORMANCE POR CANAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div style={local.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
            <Store size={18} /> <span style={styles.globalLabel}>Loja</span>
          </div>
          <div style={styles.globalValue}>{channelStats.totals.loja}</div>
        </div>
        
        <div style={local.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b' }}>
            <MapPin size={18} /> <span style={styles.globalLabel}>PAP</span>
          </div>
          <div style={styles.globalValue}>{channelStats.totals.pap}</div>
        </div>

        <div style={local.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6' }}>
            <Headset size={18} /> <span style={styles.globalLabel}>Central</span>
          </div>
          <div style={styles.globalValue}>{channelStats.totals.central}</div>
        </div>

        <div style={local.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8b5cf6' }}>
            <Briefcase size={18} /> <span style={styles.globalLabel}>B2B</span>
          </div>
          <div style={styles.globalValue}>{channelStats.totals.b2b}</div>
        </div>
      </div>

      {/* SEÇÃO 2: GRÁFICOS ANALÍTICOS (MIX E VOLUME) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
        
        {/* Mix de Canais (Pie) */}
        <div style={styles.detailsColumn}>
          <h3 style={styles.sectionTitle}><Share2 size={20} color="var(--primary)" /> Mix de Vendas Regional</h3>
          <div style={{ height: 350, marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={channelStats.pieData} 
                  innerRadius={80} 
                  outerRadius={110} 
                  paddingAngle={5} 
                  dataKey="value"
                  animationDuration={1000}
                >
                  {channelStats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gross Adds por Praça (Bar) */}
        <div style={styles.detailsColumn}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={styles.sectionTitle}><BarChart3 size={20} color="var(--primary)" /> Apuração de Gross Adds</h3>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              TOTAL: {channelStats.totalSales} VENDAS
            </div>
          </div>
          
          <div style={{ height: 350, marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="city" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-app)' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                />
                <Bar 
                  dataKey="totalSales" 
                  name="Vendas Brutas" 
                  fill="var(--primary)" 
                  radius={[6, 6, 0, 0]} 
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

const local = {
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    padding: '20px',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }
};