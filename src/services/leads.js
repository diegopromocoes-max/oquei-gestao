import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';

export const LEAD_STATUS_SALE = ['Contratado', 'Instalado'];

export function getMonthKeyFromDate(dateValue) {
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}/.test(dateValue)) {
    return dateValue.slice(0, 7);
  }

  const parsed = new Date(dateValue || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 7) : parsed.toISOString().slice(0, 7);
}

export function normalizeLeadType(value) {
  const source = String(value || '').trim().toLowerCase();

  if (source.includes('migra')) {
    return 'Migração';
  }

  if (source.includes('sva')) {
    return 'SVA';
  }

  return 'Plano Novo';
}

function buildOriginPayload(formData = {}) {
  return {
    origin: formData.originName || formData.origem || 'CRM Interno',
    originCatalogId: formData.originCatalogId || null,
    originKind: formData.originKind || null,
    originSourceType: formData.originSourceType || null,
    originSourceId: formData.originSourceId || null,
    originSourceName: formData.originSourceName || null,
    originActionId: formData.originSourceType === 'action_plan' ? (formData.originSourceId || formData.acaoId || null) : (formData.acaoId || null),
    originActionName: formData.originSourceName || formData.acaoNome || null,
    indicationName: formData.indicationName || null,
    indicationLeadId: formData.indicationLeadId || null,
  };
}

function normalizeText(value = '') {
  return String(value || '').trim();
}

function buildPersonalPayload(formData = {}) {
  return {
    customerName: normalizeText(formData.customerName || formData.nome),
    customerPhone: normalizeText(formData.customerPhone || formData.tel),
    customerEmail: normalizeText(formData.customerEmail || formData.email),
    customerCpf: normalizeText(formData.customerCpf || formData.cpf),
  };
}

function buildAddress(formData = {}) {
  const street = String(formData.logradouro || '').trim();
  const number = String(formData.numero || '').trim();
  const neighborhood = String(formData.bairro || '').trim();
  const fallback = String(formData.geoFormattedAddress || '').trim();
  const joined = [street && number ? `${street}, ${number}` : street || number, neighborhood].filter(Boolean).join(' - ');
  return joined || fallback || 'Endereco nao informado';
}

function buildGeoPayload(formData = {}) {
  const hasGeo = Number.isFinite(Number(formData.geoLat)) && Number.isFinite(Number(formData.geoLng));
  return {
    geoLat: hasGeo ? Number(formData.geoLat) : null,
    geoLng: hasGeo ? Number(formData.geoLng) : null,
    geoStatus: hasGeo ? (formData.geoStatus || 'resolved') : (formData.geoStatus || 'pending'),
    geoFormattedAddress: formData.geoFormattedAddress || '',
    geoUpdatedAt: hasGeo ? new Date().toISOString() : null,
  };
}

// 1. Cria um novo Lead
export const createLead = async (formData, userData, cityDetails, catDetails, prodDetails) => {
  const leadType = normalizeLeadType(formData.leadType || catDetails?.name || prodDetails?.name);
  const address = buildAddress(formData);
  const geoPayload = buildGeoPayload(formData);
  const originPayload = buildOriginPayload(formData);
  const personalPayload = buildPersonalPayload(formData);
  const isDiscardedLead = formData.status === 'Descartado';

  return addDoc(collection(db, "leads"), {
    date: formData.date,
    monthKey: getMonthKeyFromDate(formData.date),
    createdAt: serverTimestamp(),
    lastUpdate: serverTimestamp(),
    attendantId: auth.currentUser?.uid,
    attendantName: userData?.name || 'Atendente',
    cityId: cityDetails.id,
    cityName: cityDetails.name || cityDetails.nome,
    clusterId: cityDetails.clusterId || userData?.clusterId || userData?.cluster || null,
    clusterName: cityDetails.clusterName || cityDetails.clusterNameLabel || null,
    address,
    addressStreet: formData.logradouro || '',
    addressNumber: formData.numero || '',
    addressNeighborhood: formData.bairro || '',
    categoryName: catDetails?.name || 'Geral',
    categoryId: formData.categoria,
    leadType,
    productId: formData.produto,
    productName: prodDetails?.name || 'Produto',
    productPrice: Number(prodDetails?.price || 0),
    status: formData.status,
    discardMotive: isDiscardedLead ? normalizeText(formData.discardMotive) : null,
    fidelityMonth: isDiscardedLead ? normalizeText(formData.fidelityMonth) : null,
    isMetaBatida: false,
    ...personalPayload,
    ...originPayload,
    ...geoPayload,
  });
};

// 2. Escuta os Leads do Atendente (Tempo Real)
export const listenMyLeads = (uid, callback, monthKey = '', onError) => {
  const constraints = [where("attendantId", "==", uid)];
  if (monthKey) {
    constraints.push(where("monthKey", "==", monthKey));
  }

  const q = query(collection(db, "leads"), ...constraints);
  return onSnapshot(q, (snap) => {
    const leads = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((left, right) => {
        const leftDate = String(left.date || left.monthKey || '');
        const rightDate = String(right.date || right.monthKey || '');
        return rightDate.localeCompare(leftDate);
      });
    callback(leads);
  }, (error) => {
    console.error("Erro ao buscar leads: ", error);
    onError?.(error);
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

export const updateLeadDetails = async (leadId, leadData = {}) => {
  const personalPayload = buildPersonalPayload(leadData);
  const originPayload = buildOriginPayload(leadData);
  const payload = {
    ...personalPayload,
    address: buildAddress(leadData),
    addressStreet: normalizeText(leadData.addressStreet || leadData.logradouro),
    addressNumber: normalizeText(leadData.addressNumber || leadData.numero),
    addressNeighborhood: normalizeText(leadData.addressNeighborhood || leadData.bairro),
    status: leadData.status || 'Em negociação',
    lastUpdate: serverTimestamp(),
    ...originPayload,
    ...buildGeoPayload(leadData),
  };

  if (payload.status === 'Descartado') {
    payload.discardMotive = leadData.discardMotive || null;
    payload.fidelityMonth = leadData.fidelityMonth || null;
  } else {
    payload.discardMotive = null;
    payload.fidelityMonth = null;
  }

  return updateDoc(doc(db, 'leads', leadId), payload);
};

export const listAttendantLeadOptions = async (uid) => {
  if (!uid) return [];

  const snapshot = await getDocs(query(collection(db, 'leads'), where('attendantId', '==', uid)));
  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
};

// 4. Exclui um Lead
export const deleteLead = async (leadId) => {
  return deleteDoc(doc(db, "leads", leadId));
};
