import { useEffect, useState } from 'react';
import { listenPlans } from '../services/planService';

export function usePlans(cityId, month) {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const unsub = listenPlans({ cityId, month, callback: setPlans });
    return () => unsub && unsub();
  }, [cityId, month]);

  return plans;
}
