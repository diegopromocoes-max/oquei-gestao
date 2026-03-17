import { db } from '../firebase';
import { 
  collection, doc, addDoc, updateDoc, onSnapshot, 
  query, where, getDocs, serverTimestamp 
} from 'firebase/firestore';

// 1. Escuta a lista de responsáveis para o Autocomplete
export const assinarResponsaveis = (callback) => {
  const q = query(collection(db, 'responsibles'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  });
};

// 2. Cadastra ou atualiza um novo responsável
export const upsertResponsavel = async (name, sector, userData) => {
  const normalizedName = name.trim().toLowerCase();
  const q = query(collection(db, 'responsibles'), where('nameLower', '==', normalizedName));
  const snap = await getDocs(q);

  if (snap.empty) {
    await addDoc(collection(db, 'responsibles'), {
      name: name.trim(),
      nameLower: normalizedName,
      sector: sector.trim(),
      createdAt: serverTimestamp(),
      createdBy: userData?.uid || 'system'
    });
  }
};

// 3. Salva o Plano de Ação (Criação e Edição no Kanban/Hub)
export const salvarPlanoAcao = async (id, payload, userData) => {
  const dataToSave = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system'
  };

  if (id) {
    return updateDoc(doc(db, 'action_plans', id), dataToSave);
  } else {
    dataToSave.createdAt = serverTimestamp();
    dataToSave.createdBy = userData?.uid || 'system';
    return addDoc(collection(db, 'action_plans'), dataToSave);
  }
};

// 4. Escuta os Planos de Ação (Tempo Real para o Hub)
export const assinarPlanosAcao = (month, cityId, callback) => {
  if (!month) return () => {};

  let conditions = [
    where('month', '==', month), 
    where('planType', '==', 'crescimento')
  ];
  
  if (cityId && cityId !== '__all__') {
    conditions.push(where('cityId', '==', cityId));
  }

  const q = query(collection(db, 'action_plans'), ...conditions);
  
  return onSnapshot(q, (snap) => {
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const aDate = a.createdAt || a.startDate || '';
      const bDate = b.createdAt || b.startDate || '';
      return String(bDate).localeCompare(String(aDate));
    });
    callback(list);
  });
};

// 5. Busca pontual (One-time fetch) para Memória de Ações (Gestão de Metas)
export const getMemoriaAcoes = async (month, cityId) => {
  if (!month) return [];

  let conditions = [
    where('month', '==', month),
    where('planType', '==', 'crescimento')
  ];

  if (cityId && cityId !== '__all__') {
    conditions.push(where('cityId', '==', cityId));
  }

  try {
    const q = query(collection(db, 'action_plans'), ...conditions);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Erro ao buscar memória de ações:", error);
    return [];
  }
};

// 6. ADICIONADO: Salva registros específicos de Memória Estratégica
export const salvarMemoriaAcao = async (id, payload, userData) => {
  const dataToSave = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system'
  };

  // Se houver um ID, atualiza o plano existente com as notas de memória
  // Caso contrário, cria um registro na coleção de suporte growth_memory
  if (id) {
    return updateDoc(doc(db, 'action_plans', id), dataToSave);
  } else {
    dataToSave.createdAt = serverTimestamp();
    dataToSave.createdBy = userData?.uid || 'system';
    return addDoc(collection(db, 'growth_memory'), dataToSave);
  }
};