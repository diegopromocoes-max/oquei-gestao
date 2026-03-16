import { useEffect, useState } from 'react';
import { listenKpis } from '../services/kpiService';

export function useKpis() {
  const [kpis, setKpis] = useState([]);

  useEffect(() => {
    const unsub = listenKpis(setKpis);
    return () => unsub && unsub();
  }, []);

  return kpis;
}
