import React from 'react';
import { Badge, ProgressBar, colors, moeda } from '../../components/ui';

export default function PlanCard({ plan, onClick, onDragStart }) {
  const progress = Number(plan.progress || 0);
  const tasksDone = Number(plan.taskCompleted || 0);
  const tasksTotal = Number(plan.taskCount || 0);

  return (
    <div
      className="hub-card"
      draggable
      onDragStart={(e) => onDragStart?.(e, plan)}
      onClick={() => onClick?.(plan)}
    >
      <div className="hub-card-header">
        <div className="hub-card-title">{plan.name || 'Plano sem nome'}</div>
        <Badge cor="neutral">{plan.status || 'Backlog'}</Badge>
      </div>

      <div className="hub-card-body">
        {Array.isArray(plan.objectives) && plan.objectives.length > 0 && (
          <div className="hub-card-objectives">
            {plan.objectives.slice(0, 3).map((o) => (
              <span key={o} className="hub-chip">{o}</span>
            ))}
          </div>
        )}

        <div className="hub-card-row">
          <span className="hub-muted">Tarefas</span>
          <span className="hub-strong">{tasksDone}/{tasksTotal}</span>
        </div>
        <ProgressBar pct={progress} cor={progress >= 100 ? colors.success : colors.primary} />

        <div className="hub-card-row">
          <span className="hub-muted">Custo</span>
          <span className="hub-strong">{moeda(Number(plan.cost || 0))}</span>
        </div>
      </div>
    </div>
  );
}
