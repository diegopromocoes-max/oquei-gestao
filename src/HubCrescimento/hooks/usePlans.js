import { useEffect, useState } from 'react';
import { listenPlans } from '../services/planService';

export function usePlans(cityId, month, growthPlanId) {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const unsub = listenPlans({ cityId, month, growthPlanId, callback: setPlans });
    return () => unsub && unsub();
  }, [cityId, month, growthPlanId]);

  return plans;
}
