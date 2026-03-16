import React from 'react';
import { Btn, data, Badge, moeda } from '../../components/ui';

export default function TaskList({ title, tasks, onComplete, onReopen, onDelete }) {
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
              {Number(t.budget || 0) > 0 && <span className="hub-muted">Orcamento: {moeda(Number(t.budget || 0))}</span>}
              {t.kpiName && <Badge cor="info">KPI: {t.kpiName}</Badge>}
              {t.kpiResult !== undefined && t.kpiResult !== null && <Badge cor="success">Resultado: {t.kpiResult}</Badge>}
              {(t.actionName || t.planName) && <Badge cor="neutral">{t.actionName || t.planName}</Badge>}
            </div>
          </div>
          <div className="hub-task-actions">
            {t.status === 'done' ? (
              <Btn size="sm" variant="secondary" onClick={() => onReopen?.(t)}>Reabrir</Btn>
            ) : (
              <Btn size="sm" onClick={() => onComplete?.(t)}>Concluir</Btn>
            )}
            {onDelete && (
              <Btn size="sm" variant="danger" onClick={() => onDelete?.(t)}>Excluir</Btn>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
