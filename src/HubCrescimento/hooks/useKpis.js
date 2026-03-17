// ============================================================
//  hooks/useKpis.js — Hub Crescimento
//  RNF01: KPIs nao precisam de reatividade em tempo real.
//  Migrado de onSnapshot para getDocs — elimina 1 listener
//  permanente do KanbanPage, alinhando com o limite de 1
//  listener por tela exigido pelo ERS.
// ============================================================

import { useEffect, useState } from 'react';
import { getKpis } from '../services/kpiService';

/**
 * Retorna a lista de KPIs globais.
 * Usa getDocs (snapshot unico) em vez de onSnapshot.
 * Re-busca apenas quando o componente monta ou quando
 * refresh() for chamado explicitamente.
 */
export function useKpis() {
  const [kpis, setKpis]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getKpis()
      .then((list) => { if (active) setKpis(list); })
      .catch((err) => console.error('useKpis:', err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tick]);

  /** Permite forcar uma re-busca apos criar um KPI novo */
  const refresh = () => setTick((t) => t + 1);

  return { kpis, loading, refresh };
}