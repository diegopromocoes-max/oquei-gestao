import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const listenGlobalReports = (userData, onDataUpdate) => {
  if (!userData) return () => {};

  // 1. Identifica o nível de acesso
  const role = String(userData.role || '').toLowerCase();
  const isManager = ['master', 'diretor', 'supervisor', 'coordenador', 'coordinator'].includes(role);
  const uid = userData.uid || userData.id;

  // 2. Regra de Ouro: Se for gerente, puxa tudo. Se for atendente, puxa só o dele.
  const leadsQuery = isManager 
    ? collection(db, 'leads') 
    : query(collection(db, 'leads'), where('attendantId', '==', uid));

  const unsubs = [];
  const state = { leads: [], users: [], cities: [], absences: [], rh: [] };
  
  // Controle para só avisar a tela quando tudo carregar
  let loadedCount = 0;
  const checkReady = () => {
    if (loadedCount >= 5) onDataUpdate({ ...state });
  };

  // 3. Leituras simultâneas e seguras
  unsubs.push(onSnapshot(leadsRef, snap => { state.leads = snap.docs.map(d => ({id: d.id, ...d.data()})); loadedCount++; checkReady(); }));
  unsubs.push(onSnapshot(collection(db, 'users'), snap => { state.users = snap.docs.map(d => ({id: d.id, ...d.data()})); loadedCount++; checkReady(); }));
  unsubs.push(onSnapshot(collection(db, 'cities'), snap => { state.cities = snap.docs.map(d => ({id: d.id, ...d.data()})); loadedCount++; checkReady(); }));
  unsubs.push(onSnapshot(collection(db, 'absences'), snap => { state.absences = snap.docs.map(d => ({id: d.id, ...d.data()})); loadedCount++; checkReady(); }));
  unsubs.push(onSnapshot(collection(db, 'rh_requests'), snap => { state.rh = snap.docs.map(d => ({id: d.id, ...d.data()})); loadedCount++; checkReady(); }));

  // Retorna a função para desligar os ouvintes ao sair da página
  return () => unsubs.forEach(fn => fn());
};