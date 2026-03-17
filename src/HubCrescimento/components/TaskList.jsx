import React from 'react';
import { Btn, data, Badge, moeda } from '../../components/ui';
import { hubStyles } from '../styles/hubStyles';

export default function TaskList({ title, tasks, onComplete, onReopen, onDelete }) {
  return (
    <div style={hubStyles.tasklist}>
      <div style={hubStyles.tasklistHeader}>
        <div style={hubStyles.tasklistTitle}>{title}</div>
        <div style={hubStyles.tasklistCount}>{tasks.length}</div>
      </div>

      {tasks.length === 0 && (
        <div style={hubStyles.empty}>Sem tarefas aqui.</div>
      )}

      {tasks.map((t) => (
        <div key={t.id} style={hubStyles.task}>
          <div style={{ flex: 1 }}>
            <div style={hubStyles.taskTitle}>{t.title || t.text || 'Tarefa'}</div>
            <div style={hubStyles.taskMeta}>
              {t.deadline && <span style={hubStyles.muted}>Prazo: {data(t.deadline)}</span>}
              {Number(t.budget || 0) > 0 && <span style={hubStyles.muted}>Orcamento: {moeda(Number(t.budget || 0))}</span>}
              {t.kpiName && <Badge cor="info">KPI: {t.kpiName}</Badge>}
              {t.kpiResult !== undefined && t.kpiResult !== null && <Badge cor="success">Resultado: {t.kpiResult}</Badge>}
              {(t.actionName || t.planName) && <Badge cor="neutral">{t.actionName || t.planName}</Badge>}
            </div>
          </div>
          <div style={hubStyles.taskActions}>
            <div style={hubStyles.actionsInline}>
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
        </div>
      ))}
    </div>
  );
}