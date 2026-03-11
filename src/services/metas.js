import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { onSnapshot, query, where } from 'firebase/firestore';

export const getCanaisVenda = async () => {
  const snap = await getDocs(collection(db, 'sales_channels'));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

export const getProdutosComMeta = async () => {
  const snap = await getDocs(collection(db, 'product_categories'));
  let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  data = data.filter(p => p.temMeta !== false && p.temMeta !== "false");
  return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

export const getMetasCanais = async (month) => {
  const docRef = doc(db, 'goals_channels', month);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data().data || {}) : {};
};
export const getClusters = async () => {
  const snap = await getDocs(collection(db, 'clusters'));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

export const getCidades = async () => {
  const snap = await getDocs(collection(db, 'cities'));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

export const getMetasCidades = async (month) => {
  const docRef = doc(db, 'goals_cities', month);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data().data || {}) : {};
};

export const getMetasChurn = async (month) => {
  const docRef = doc(db, 'goals_churn', month);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const d = docSnap.data();
    return { churnGoals: d.data || {}, globalChurn: d.globalChurn || 0 };
  }
  return { churnGoals: {}, globalChurn: 0 };
};

export const salvarMetasChurn = async (month, churnGoals, globalChurn, userData) => {
  await setDoc(doc(db, 'goals_churn', month), {
    data: churnGoals,
    globalChurn: Number(globalChurn),
    month: month,
    updatedAt: new Date().toISOString(),
    updatedBy: userData?.name || 'Gestor'
  });
};

export const salvarMetasCidades = async (month, goals, userData) => {
  await setDoc(doc(db, 'goals_cities', month), {
    data: goals,
    month: month,
    updatedAt: new Date().toISOString(),
    updatedBy: userData?.name || 'Gestor'
  });
};
export const salvarMetasCanais = async (month, goals, userData) => {
  await setDoc(doc(db, 'goals_channels', month), {
    data: goals,
    month: month,
    updatedAt: new Date().toISOString(),
    updatedBy: userData?.name || 'Gestor'
  });
};

export const assinarBasesMensais = (month, callback) => {
  const q = query(collection(db, 'monthly_bases'), where('month', '==', month));
  return onSnapshot(q, (snap) => {
    const data = {};
    snap.forEach(doc => { data[doc.data().cityId] = doc.data(); });
    callback(data);
  });
};

export const assinarSimulacoes = (month, callback) => {
  const docRef = doc(db, 'sop_simulations', month);
  return onSnapshot(docRef, (docSnap) => {
    callback(docSnap.exists() ? docSnap.data() : { locked: false, cities: {} });
  });
};

export const salvarSimulacaoCidade = async (month, cityId, simulationData, userData) => {
  const docRef = doc(db, 'sop_simulations', month);
  const docSnap = await getDoc(docRef);
  let currentData = docSnap.exists() ? docSnap.data() : { locked: false, cities: {} };
  
  currentData.cities[cityId] = simulationData;
  currentData.updatedAt = new Date().toISOString();
  currentData.updatedBy = userData?.name || 'Gestor';

  await setDoc(docRef, currentData);
};

export const alternarTravaSimulacao = async (month, isLocked, userData) => {
  const docRef = doc(db, 'sop_simulations', month);
  await setDoc(docRef, { locked: isLocked, updatedAt: new Date().toISOString(), updatedBy: userData?.name || 'Gestor' }, { merge: true });
};