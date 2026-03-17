import React, { useMemo, useState } from 'react';
import { Card, Modal, Textarea, Btn, Input } from '../../components/ui';
import TaskList from '../components/TaskList';
import { useTasks } from '../hooks/useTasks';
import { completeTask, reopenTask, deleteTask } from '../services/taskService';
import { hubStyles } from '../styles/hubStyles';
import { auth } from '../../firebase';

const toDate = (v) => (v ? new Date(v) : null);
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function MinhaMesaPage({ userData, selectedCityId }) {
  const myUid = userData?.uid || auth?.currentUser?.uid;
  const tasks = useTasks({ uid: myUid, cityId: selectedCityId });
  const [finishTask, setFinishTask] = useState(null);
  const [finishReport, setFinishReport] = useState('');
  const [finishKpiResult, setFinishKpiResult] = useState('');

  const grouped = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const overdue = [];
    const todayList = [];
    const week = [];
    const done = [];

    tasks.filter((t) => t.status !== 'deleted').forEach((t) => {
      if (t.status === 'done') {
        done.push(t);
        return;
      }
      const d = toDate(t.deadline);
      if (!d) {
        week.push(t);
        return;
      }
      const d0 = startOfDay(d);
      if (d0 < today) overdue.push(t);
      else if (d0.getTime() === today.getTime()) todayList.push(t);
      else if (d0 <= weekEnd) week.push(t);
      else week.push(t);
    });

    return { overdue, today: todayList, week, done };
  }, [tasks]);

  const handleComplete = async (task) => {
    setFinishTask(task);
    setFinishReport('');
    setFinishKpiResult('');
  };

  const handleReopen = async (task) => {
    await reopenTask(task.id, userData);
  };

  const handleDelete = async (task) => {
    if (!window.confirm('Excluir esta tarefa?')) return;
    await deleteTask(task.id, userData);
  };

  const handleConfirmFinish = async () => {
    if (!finishTask) return;
    if (!String(finishReport || '').trim()) {
      window.showToast?.('Informe o relatorio da etapa.', 'error');
      return;
    }
    if (finishTask.kpiEnabled) {
      if (finishKpiResult === '' || Number.isNaN(Number(finishKpiResult))) {
        window.showToast?.('Informe o resultado do KPI.', 'error');
        return;
      }
    }
    try {
      await completeTask(finishTask.id, userData, finishReport, finishKpiResult);
      setFinishTask(null);
      setFinishReport('');
      setFinishKpiResult('');
    } catch (err) {
      window.showToast?.('Nao foi possivel finalizar a etapa.', 'error');
    }
  };

  return (
    <div style={hubStyles.stack}>
      <Card title="Minha Mesa" subtitle="Tarefas da minha responsabilidade">
        <TaskList title="Atrasadas" tasks={grouped.overdue} onComplete={handleComplete} onReopen={handleReopen} onDelete={handleDelete} />
        <TaskList title="Hoje" tasks={grouped.today} onComplete={handleComplete} onReopen={handleReopen} onDelete={handleDelete} />
        <TaskList title="Esta semana" tasks={grouped.week} onComplete={handleComplete} onReopen={handleReopen} onDelete={handleDelete} />
        <TaskList title="Concluidas" tasks={grouped.done} onComplete={handleComplete} onReopen={handleReopen} onDelete={handleDelete} />
      </Card>

      <Modal
        open={!!finishTask}
        onClose={() => { setFinishTask(null); setFinishReport(''); setFinishKpiResult(''); }}
        title={finishTask ? `Finalizar tarefa: ${finishTask.title || 'Sem titulo'}` : 'Finalizar tarefa'}
        size="lg"
      >
        <div style={hubStyles.modal}>
          <div style={hubStyles.modalSection}>
            <div style={hubStyles.modalTitle}>Relatorio (opcional)</div>
            <Textarea
              label="Relatorio"
              value={finishReport}
              onChange={(e) => setFinishReport(e.target.value)}
              placeholder="Descreva o que foi feito, resultados e observacoes."
            />
          </div>
          {finishTask?.kpiEnabled && (
            <div style={hubStyles.modalSection}>
              <div style={hubStyles.modalTitle}>Resultado do KPI</div>
              <Input
                type="number"
                label={finishTask.kpiName ? `KPI: ${finishTask.kpiName}` : 'Resultado'}
                value={finishKpiResult}
                onChange={(e) => setFinishKpiResult(e.target.value)}
                placeholder="Informe o resultado do KPI"
              />
            </div>
          )}
          <div style={hubStyles.actions}>
            <Btn variant="secondary" onClick={() => { setFinishTask(null); setFinishReport(''); setFinishKpiResult(''); }}>Cancelar</Btn>
            <Btn onClick={handleConfirmFinish}>Finalizar tarefa</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}