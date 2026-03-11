import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, where, getDocs, addDoc } from 'firebase/firestore';

export const assinarPlanosAcao = (month, cityId, callback) => {
  if (!cityId) return () => {};
  const q = query(
    collection(db, 'action_plans'), 
    where('month', '==', month),
    where('cityId', '==', cityId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });
};

export const salvarPlanoAcao = async (acaoId, data, userData) => {
  const docRef = acaoId ? doc(db, 'action_plans', acaoId) : doc(collection(db, 'action_plans'));
  
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
    updatedBy: userData?.name || 'Gestor',
  };

  if (!acaoId) {
    // É uma ação nova! Vamos gerar o número sequencial.
    const q = query(collection(db, 'action_plans'), where('month', '==', data.month), where('cityId', '==', data.cityId));
    const snap = await getDocs(q);
    
    payload.actionNumber = snap.size + 1; // Ex: Se tem 2, essa será a #3
    payload.createdAt = new Date().toISOString();
    payload.createdBy = userData?.name || 'Gestor';
  }

  await setDoc(docRef, payload, { merge: true });
  return docRef.id;
};

// --- SISTEMA DE MEMÓRIA (Autocompletar Inteligente) ---
export const getMemoriaAcoes = async (tipo) => { 
  const snap = await getDocs(collection(db, `memory_${tipo}`));
  return snap.docs.map(d => d.data().text);
};

export const salvarMemoriaAcao = async (tipo, texto) => {
  if (!texto || texto.trim() === '') return;
  const q = query(collection(db, `memory_${tipo}`), where('text', '==', texto.trim()));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, `memory_${tipo}`), { text: texto.trim() });
  }
};