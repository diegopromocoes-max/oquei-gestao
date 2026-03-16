import { useEffect, useState } from 'react';
import { listenTimelineEvents } from '../services/timelineService';

export function useTimeline({ actionPlanId, growthPlanId }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!actionPlanId && !growthPlanId) {
      setEvents([]);
      return undefined;
    }
    const unsub = listenTimelineEvents({ actionPlanId, growthPlanId, callback: setEvents });
    return () => unsub && unsub();
  }, [actionPlanId, growthPlanId]);

  return events;
}
