import { useEffect, useState } from 'react';
import { listenTasks } from '../services/taskService';

export function useTasks({ uid, cityId, planId }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!uid && !planId) {
      setTasks([]);
      return undefined;
    }
    const unsub = listenTasks({ uid, cityId, planId, callback: setTasks });
    return () => unsub && unsub();
  }, [uid, cityId, planId]);

  return tasks;
}
