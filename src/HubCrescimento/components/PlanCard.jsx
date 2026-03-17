// ============================================================
//  components/PlanCard.jsx — Hub Crescimento
//  Card de plano de acao com suporte a @dnd-kit/sortable.
//  useSortable substitui o draggable/onDragStart nativo.
// ============================================================

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS }         from '@dnd-kit/utilities';
import { Badge, ProgressBar, colors, moeda } from '../../components/ui';
import { hubStyles } from '../styles/hubStyles';

/**
 * Props:
 *   plan        — objeto do plano (action_plan)
 *   onClick     — abre o modal de detalhes
 */
export default function PlanCard({ plan, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id });

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.45 : 1,
    cursor:     isDragging ? 'grabbing' : 'grab',
  };

  const progress   = Number(plan.progress      || 0);
  const tasksDone  = Number(plan.taskCompleted  || 0);
  const tasksTotal = Number(plan.taskCount      || 0);

  return (
    <div
      ref={setNodeRef}
      style={{ ...hubStyles.card, ...style }}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick?.(plan)}
    >
      <div style={hubStyles.cardHeader}>
        <div style={hubStyles.cardTitle}>{plan.name || 'Plano sem nome'}</div>
        <Badge cor="neutral">{plan.status || 'Backlog'}</Badge>
      </div>

      <div style={hubStyles.cardBody}>
        {/* Objetivos como chips */}
        {Array.isArray(plan.objectives) && plan.objectives.length > 0 && (
          <div style={hubStyles.cardObjectives}>
            {plan.objectives.slice(0, 3).map((o) => (
              <span key={o} style={hubStyles.chip}>{o}</span>
            ))}
          </div>
        )}

        {/* Tarefas */}
        <div style={hubStyles.cardRow}>
          <span style={hubStyles.muted}>Tarefas</span>
          <span style={hubStyles.strong}>{tasksDone}/{tasksTotal}</span>
        </div>

        {/* Barra de progresso */}
        <ProgressBar
          pct={progress}
          cor={progress >= 100 ? colors.success : colors.primary}
        />

        {/* Custo */}
        <div style={hubStyles.cardRow}>
          <span style={hubStyles.muted}>Custo</span>
          <span style={hubStyles.strong}>{moeda(Number(plan.cost || 0))}</span>
        </div>
      </div>
    </div>
  );
}