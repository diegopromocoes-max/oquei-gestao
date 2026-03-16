import { useEffect, useState } from 'react';
import { listenGrowthPlans } from '../services/growthPlanService';

export function useGrowthPlans(cityId, month) {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const unsub = listenGrowthPlans({ cityId, month, callback: setPlans });
    return () => unsub && unsub();
  }, [cityId, month]);

  return plans;
}
