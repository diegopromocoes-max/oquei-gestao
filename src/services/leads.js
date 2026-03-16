import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';

// 1. Cria um novo Lead
export const createLead = async (formData, userData, cityDetails, catDetails, prodDetails) => {
  return addDoc(collection(db, "leads"), {
    date: formData.date,
    createdAt: serverTimestamp(),
    lastUpdate: serverTimestamp(),
    attendantId: auth.currentUser?.uid,
    attendantName: userData?.name || 'Atendente',
    customerName: formData.nome,
    customerPhone: formData.tel,
    cityId: cityDetails.id,
    cityName: cityDetails.name || cityDetails.nome,
    address: `${formData.logradouro}, ${formData.numero} - ${formData.bairro}`,
    categoryName: catDetails?.name || 'Geral',
    categoryId: formData.categoria,
    productId: formData.produto,
    productName: prodDetails?.name || 'Produto',
    productPrice: Number(prodDetails?.price || 0),
    status: formData.status,
    isMetaBatida: false,
    origin: formData.origem || 'CRM Interno',
    originActionId: formData.acaoId || null,
    originActionName: formData.acaoNome || null,
  });
};

// 2. Escuta os Leads do Atendente (Tempo Real)
export const listenMyLeads = (uid, callback) => {
  const q = query(collection(db, "leads"), where("attendantId", "==", uid));
  return onSnapshot(q, (snap) => {
    const leads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(leads);
  }, (error) => {
    console.error("Erro ao buscar leads: ", error);
    callback([]);
  });
};

// 3. Atualiza o Status do Lead (Kanban)
export const updateLeadStatus = async (leadId, newStatus, discardData = {}) => {
  const payload = {
    status: newStatus,
    lastUpdate: serverTimestamp()
  };

  if (newStatus === 'Descartado') {
    payload.discardMotive = discardData.motive || null;
    payload.fidelityMonth = discardData.fidelityMonth || null;
  } else {
    // Limpa os dados de descarte se ele voltar para negociação
    payload.discardMotive = null;
    payload.fidelityMonth = null;
  }

  return updateDoc(doc(db, "leads", leadId), payload);
};

// 4. Exclui um Lead
export const deleteLead = async (leadId) => {
  return deleteDoc(doc(db, "leads", leadId));
};
