import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Roles que sempre devem aparecer na lista de responsáveis,
// independente de cityId ou clusterId
const ALWAYS_INCLUDE_ROLES = ['coordinator', 'coordenador', 'master', 'diretor', 'supervisor', 'growth_team', 'GROWTH_TEAM'];

export const getUsers = async ({ cityId, clusterId, fallbackAll = false } = {}) => {
  const map = new Map();

  const addToMap = (snap) => {
    snap.docs.forEach((d) => {
      map.set(d.id, { id: d.id, ...d.data() });
    });
  };

  try {
    // 1. Busca usuários pelo filtro de cidade/cluster fornecido
    if (cityId && cityId !== '__all__') {
      const snap = await getDocs(query(collection(db, 'users'), where('cityId', '==', cityId)));
      addToMap(snap);
    } else if (clusterId) {
      const snap = await getDocs(query(collection(db, 'users'), where('clusterId', '==', clusterId)));
      addToMap(snap);
    }

    // 2. Sempre busca coordenadores e supervisores (aparecem em qualquer dropdown)
    for (const role of ['coordinator', 'supervisor', 'growth_team']) {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', role)));
      addToMap(snap);
    }
    // Variantes de role do coordenador
    for (const role of ['coordenador', 'master', 'diretor', 'GROWTH_TEAM']) {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', role)));
        addToMap(snap);
      } catch { /* ignora se não houver usuários com esse role */ }
    }

    // 3. Se ainda não há ninguém E fallbackAll está ativo, busca todos
    if (map.size === 0 && fallbackAll) {
      const allSnap = await getDocs(collection(db, 'users'));
      addToMap(allSnap);
    }
  } catch (err) {
    console.error('getUsers error:', err);
    // Fallback silencioso — tenta buscar todos se as queries específicas falharem
    if (fallbackAll && map.size === 0) {
      try {
        const allSnap = await getDocs(collection(db, 'users'));
        addToMap(allSnap);
      } catch { /* sem acesso nenhum */ }
    }
  }

  return Array.from(map.values())
    .filter((u) => u.active !== false)
    .sort((a, b) => {
      // Ordena: coordenadores primeiro, depois supervisores, depois os demais
      const order = { coordinator: 0, coordenador: 0, master: 0, diretor: 0, supervisor: 1, growth_team: 2 };
      const oa = order[String(a.role).toLowerCase()] ?? 3;
      const ob = order[String(b.role).toLowerCase()] ?? 3;
      if (oa !== ob) return oa - ob;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
};
