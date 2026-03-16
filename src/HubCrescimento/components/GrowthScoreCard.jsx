import React from 'react';
import { Card, ProgressBar, colors } from '../../components/ui';

export default function GrowthScoreCard({ score }) {
  const total = score?.total ?? 0;
  const breakdown = score?.breakdown || { sales: 0, growth: 0, retention: 0, execution: 0 };

  return (
    <Card title="Growth Score" subtitle="Pontuacao consolidada (0-100)">
      <div className="hub-score">
        <div className="hub-score-total">{total}</div>
        <div className="hub-score-label">Score geral</div>
      </div>

      <div className="hub-score-breakdown">
        <div className="hub-score-row">
          <span>Vendas</span>
          <ProgressBar pct={(breakdown.sales / 40) * 100} cor={colors.primary} />
        </div>
        <div className="hub-score-row">
          <span>Crescimento</span>
          <ProgressBar pct={(breakdown.growth / 30) * 100} cor={colors.success} />
        </div>
        <div className="hub-score-row">
          <span>Retencao</span>
          <ProgressBar pct={(breakdown.retention / 20) * 100} cor={colors.warning} />
        </div>
        <div className="hub-score-row">
          <span>Execucao</span>
          <ProgressBar pct={(breakdown.execution / 10) * 100} cor={colors.info} />
        </div>
      </div>
    </Card>
  );
}
