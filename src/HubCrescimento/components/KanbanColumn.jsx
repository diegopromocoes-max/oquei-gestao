// ============================================================
//  components/KanbanColumn.jsx — Hub Crescimento
//  Coluna do Kanban com suporte a @dnd-kit/core (useDroppable).
//  Cada coluna e uma drop zone identificada pelo status do plano.
// ============================================================

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { hubStyles } from '../styles/hubStyles';

/**
 * Props:
 *   id       — identificador da coluna (ex: 'Backlog', 'Em Andamento')
 *   title    — label exibido no topo
 *   count    — numero de cards na coluna
 *   planIds  — array de IDs para o SortableContext
 *   children — PlanCard(s) sortaveis
 */
export default function KanbanColumn({ id, title, count, planIds = [], children }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...hubStyles.column,
        // Feedback visual ao arrastar sobre a coluna
        outline: isOver ? '2px solid var(--color-primary, #2563eb)' : 'none',
        outlineOffset: '2px',
        transition: 'outline 0.15s ease',
      }}
    >
      <div style={hubStyles.columnHeader}>
        <div style={hubStyles.columnTitle}>{title}</div>
        <div style={hubStyles.columnCount}>{count}</div>
      </div>

      <SortableContext items={planIds} strategy={verticalListSortingStrategy}>
        <div style={hubStyles.columnBody}>
          {children}
        </div>
      </SortableContext>
    </div>
  );
}