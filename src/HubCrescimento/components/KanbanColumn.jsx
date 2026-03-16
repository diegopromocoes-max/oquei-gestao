import React from 'react';

export default function KanbanColumn({ title, count, onDrop, onDragOver, children }) {
  return (
    <div className="hub-column" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="hub-column-header">
        <div className="hub-column-title">{title}</div>
        <div className="hub-column-count">{count}</div>
      </div>
      <div className="hub-column-body">
        {children}
      </div>
    </div>
  );
}
