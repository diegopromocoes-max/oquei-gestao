// ============================================================
//  components/KanbanBoard.jsx — Hub Crescimento
//  Container do Kanban com suporte a @dnd-kit/core.
//  Recebe o DndContext externamente (KanbanPage) e apenas
//  organiza o layout horizontal das colunas.
// ============================================================

import React from 'react';
import { hubStyles } from '../styles/hubStyles';

export default function KanbanBoard({ children }) {
  return (
    <div style={hubStyles.kanban}>
      {children}
    </div>
  );
}