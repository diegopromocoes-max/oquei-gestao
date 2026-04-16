import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';
import { Award, Package, GitMerge } from 'lucide-react';

// ---------------------------------------------------------------------------
// Gráfico: Meta vs Realizado de Planos por Unidade
// ---------------------------------------------------------------------------
export const PerformanceCharts = ({ storeData }) => {
  const chartData = storeData.map((s) => ({
    city: s.city,
    Vendas: s.salesGrossPlans,
    Meta: s.goalPlansOfficial,
    Projeção: s.installedPlansProjectionOfficial,
  }));

  return (
    <div style={{ animation: 'slideIn 0.6s ease-out 0.6s forwards', opacity: 0, marginTop: '40px' }}>
      <h3 style={styles.sectionTitle}>
        <Award size={18} color="#f59e0b" /> Meta vs Realizado — Planos por Unidade
      </h3>
      <div style={styles.chartCard}>
        <div style={{ height: '300px', width: '100%', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '12px' }} />
              <Bar dataKey="Vendas" radius={[4, 4, 0, 0]} isAnimationActive name="Vendas (B. Bruto)">
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.Vendas >= entry.Meta ? '#10b981' : '#3b82f6'} />
                ))}
              </Bar>
              <Bar dataKey="Meta" fill="#e2e8f0" radius={[4, 4, 0, 0]} isAnimationActive name="Meta Instalações" />
              <Bar dataKey="Projeção" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive fillOpacity={0.7} name="Proj. Oficial" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Gráfico: SVA por produto
// ---------------------------------------------------------------------------
export const SvaAnalyzer = ({ svaAnalysis }) => (
  <div style={{ animation: 'slideIn 0.6s ease-out 0.7s forwards', opacity: 0, marginTop: '40px' }}>
    <h3 style={{ ...styles.sectionTitle, color: '#7c3aed' }}>
      <Package size={18} /> Inteligência de Mix SVA
    </h3>
    <div style={styles.chartCard}>
      <div style={{ height: '250px', width: '100%', minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={svaAnalysis.radarData}>
            <XAxis dataKey="subject" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
            <Bar dataKey="A" fill="#7c3aed" radius={[10, 10, 0, 0]} isAnimationActive name="Qtd" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {svaAnalysis.radarData.length === 0 && (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '12px' }}>
          Nenhum SVA registrado no período.
        </p>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Gráfico: Migrações por Unidade
// ---------------------------------------------------------------------------
export const MigrationsChart = ({ storeData }) => {
  const chartData = storeData
    .map((s) => ({
      city: s.city,
      Realizado: s.migrations?.realized ?? 0,
      Meta: s.migrations?.goal ?? 0,
    }))
    .filter((row) => row.Meta > 0 || row.Realizado > 0);

  if (chartData.length === 0) {
    return (
      <div style={{ animation: 'slideIn 0.6s ease-out 0.7s forwards', opacity: 0, marginTop: '40px' }}>
        <h3 style={{ ...styles.sectionTitle, color: '#f59e0b' }}>
          <GitMerge size={18} /> Migrações por Unidade
        </h3>
        <div style={styles.chartCard}>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px 0' }}>
            Nenhuma migração registrada no período.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'slideIn 0.6s ease-out 0.7s forwards', opacity: 0, marginTop: '40px' }}>
      <h3 style={{ ...styles.sectionTitle, color: '#f59e0b' }}>
        <GitMerge size={18} /> Migrações por Unidade
      </h3>
      <div style={styles.chartCard}>
        <div style={{ height: '250px', width: '100%', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '12px' }} />
              <Bar dataKey="Realizado" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive />
              <Bar dataKey="Meta" fill="#e2e8f0" radius={[4, 4, 0, 0]} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const styles = {
  sectionTitle: { fontSize: '15px', fontWeight: '900', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' },
  chartCard: { background: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0' },
};
