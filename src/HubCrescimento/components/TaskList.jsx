import React from 'react';
import { Btn, data, Badge } from '../../components/ui';

export default function TaskList({ title, tasks, onComplete, onReopen }) {
  return (
    <div className="hub-tasklist">
      <div className="hub-tasklist-header">
        <div className="hub-tasklist-title">{title}</div>
        <div className="hub-tasklist-count">{tasks.length}</div>
      </div>

      {tasks.length === 0 && (
        <div className="hub-empty">Sem tarefas aqui.</div>
      )}

      {tasks.map((t) => (
        <div key={t.id} className="hub-task">
          <div className="hub-task-main">
            <div className="hub-task-title">{t.title || t.text || 'Tarefa'}</div>
            <div className="hub-task-meta">
              {t.deadline && <span className="hub-muted">Prazo: {data(t.deadline)}</span>}
              {t.planName && <Badge cor="neutral">{t.planName}</Badge>}
            </div>
          </div>
          <div className="hub-task-actions">
            {t.status === 'done' ? (
              <Btn size="sm" variant="secondary" onClick={() => onReopen?.(t)}>Reabrir</Btn>
            ) : (
              <Btn size="sm" onClick={() => onComplete?.(t)}>Concluir</Btn>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
