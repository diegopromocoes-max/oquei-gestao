import React, { useMemo } from 'react';
import { Card } from '../../components/ui';
import TaskList from '../components/TaskList';
import { useTasks } from '../hooks/useTasks';
import { completeTask, reopenTask } from '../services/taskService';

const toDate = (v) => (v ? new Date(v) : null);
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function MinhaMesaPage({ userData, selectedCityId }) {
  const tasks = useTasks({ uid: userData?.uid, cityId: selectedCityId });

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
    await completeTask(task.id, userData);
  };

  const handleReopen = async (task) => {
    await reopenTask(task.id, userData);
  };

  return (
    <div className="hub-stack">
      <Card title="Minha Mesa" subtitle="Tarefas da minha responsabilidade">
        <TaskList title="Atrasadas" tasks={grouped.overdue} onComplete={handleComplete} onReopen={handleReopen} />
        <TaskList title="Hoje" tasks={grouped.today} onComplete={handleComplete} onReopen={handleReopen} />
        <TaskList title="Esta semana" tasks={grouped.week} onComplete={handleComplete} onReopen={handleReopen} />
        <TaskList title="Concluidas" tasks={grouped.done} onComplete={handleComplete} onReopen={handleReopen} />
      </Card>
    </div>
  );
}
