import React from 'react';
import { Card, ProgressBar, colors } from '../../components/ui';
import { hubStyles } from '../styles/hubStyles';

export default function GrowthScoreCard({ score }) {
  const total     = score?.total ?? 0;
  const breakdown = score?.breakdown || { sales: 0, growth: 0, retention: 0, execution: 0 };

  return (
    <Card title="Growth Score" subtitle="Pontuacao consolidada (0-100)">
      <div style={hubStyles.score}>
        <div style={hubStyles.scoreTotal}>{total}</div>
        <div style={hubStyles.scoreLabel}>Score geral</div>
      </div>
      <div style={hubStyles.scoreBreakdown}>
        {[
          { label: 'Vendas',    pct: (breakdown.sales     / 40) * 100, cor: colors.primary },
          { label: 'Crescimento', pct: (breakdown.growth  / 30) * 100, cor: colors.success },
          { label: 'Retencao',  pct: (breakdown.retention / 20) * 100, cor: colors.warning },
          { label: 'Execucao',  pct: (breakdown.execution / 10) * 100, cor: colors.info    },
        ].map(({ label, pct, cor }) => (
          <div key={label} style={hubStyles.scoreRow}>
            <span style={hubStyles.muted}>{label}</span>
            <ProgressBar pct={pct} cor={cor} />
          </div>
        ))}
      </div>
    </Card>
  );
}