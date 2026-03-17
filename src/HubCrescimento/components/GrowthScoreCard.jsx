// src/HubCrescimento/components/GrowthScoreCard.jsx

import React from 'react';
import { Card, ProgressBar, colors } from '../../components/ui';
import { hubStyles } from '../styles/hubStyles';

export default function GrowthScoreCard({ score }) {
  const total = score?.total ?? 0;
  const breakdown = score?.breakdown || { sales: 0, growth: 0, retention: 0, execution: 0 };

  return (
    <Card title="Growth Score" subtitle="Pontuação de saúde do crescimento (0-100)">
      <div style={{ ...hubStyles.score, marginBottom: '24px' }}>
        <div style={hubStyles.scoreTotal}>{total}</div>
        <div style={hubStyles.scoreLabel}>Score Consolidado</div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { label: 'Vendas',      val: breakdown.sales,     max: 40, cor: colors.primary },
          { label: 'Crescimento', val: breakdown.growth,    max: 30, cor: colors.success },
          { label: 'Retenção',    val: breakdown.retention, max: 20, cor: colors.warning },
          { label: 'Execução',    val: breakdown.execution, max: 10, cor: colors.info    },
        ].map(({ label, val, max, cor }) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 40px', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
            <ProgressBar pct={(val / max) * 100} cor={cor} showLabel={false} />
            <span style={{ fontSize: '13px', fontWeight: '900', textAlign: 'right', color: 'var(--text-main)' }}>{val}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}