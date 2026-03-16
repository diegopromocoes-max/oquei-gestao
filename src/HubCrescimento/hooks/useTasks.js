import { useEffect, useState } from 'react';
import { listenTasks } from '../services/taskService';

export function useTasks({ uid, cityId, actionPlanId }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!uid && !actionPlanId) {
      setTasks([]);
      return undefined;
    }
    const unsub = listenTasks({ uid, cityId, actionPlanId, callback: setTasks });
    return () => unsub && unsub();
  }, [uid, cityId, actionPlanId]);

  return tasks;
}
