import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase';
import { formatLeadAddress, sanitizePhone } from '../lib/crmAtivo';

const CRM_ATIVO_LEADS_COLLECTION = 'crm_ativo_leads';
const CRM_ATIVO_VENDEDORES_COLLECTION = 'crm_ativo_vendedores';

const mapSnapshot = (snapshot) => snapshot.docs.map((item) => ({
  id: item.id,
  ...item.data(),
}));

const buildAuditPayload = (userData) => ({
  lastUpdatedById: userData?.uid || null,
  lastUpdatedByName: userData?.name || 'Supervisor',
  lastMovementAt: serverTimestamp(),
});

export function listenCrmAtivoLeads(callback, onError) {
  return onSnapshot(
    query(collection(db, CRM_ATIVO_LEADS_COLLECTION), orderBy('lastMovementAt', 'desc')),
    (snapshot) => callback(mapSnapshot(snapshot)),
    onError,
  );
}

export function listenCrmAtivoVendedores(callback, onError) {
  return onSnapshot(
    query(collection(db, CRM_ATIVO_VENDEDORES_COLLECTION), orderBy('name', 'asc')),
    (snapshot) => callback(mapSnapshot(snapshot)),
    onError,
  );
}

export async function createCrmAtivoLead(formData, userData) {
  const phone = sanitizePhone(formData.phone);
  const hasVendor = Boolean(formData.vendorId);
  const status = formData.status || (hasVendor ? 'Com Vendedor' : 'Frio/Disponível');

  return addDoc(collection(db, CRM_ATIVO_LEADS_COLLECTION), {
    customerName: String(formData.customerName || '').trim(),
    phone,
    street: String(formData.street || '').trim(),
    number: String(formData.number || '').trim(),
    complement: String(formData.complement || '').trim(),
    neighborhood: String(formData.neighborhood || '').trim(),
    city: String(formData.city || '').trim(),
    state: String(formData.state || '').trim().toUpperCase(),
    zipCode: String(formData.zipCode || '').trim(),
    addressText: formatLeadAddress(formData),
    origin: formData.origin || 'Venda Interna',
    status,
    vendorId: formData.vendorId || null,
    vendorName: formData.vendorName || null,
    fieldReport: String(formData.fieldReport || '').trim(),
    discardReason: String(formData.discardReason || '').trim(),
    insertedAt: serverTimestamp(),
    lastMovementAt: serverTimestamp(),
    assignedAt: hasVendor ? serverTimestamp() : null,
    soldAt: status === 'Vendido' ? serverTimestamp() : null,
    discardedAt: status === 'Descartado' ? serverTimestamp() : null,
    negotiationAt: status === 'Em Negociação' ? serverTimestamp() : null,
    supervisorId: userData?.uid || null,
    supervisorName: userData?.name || 'Supervisor',
    lastUpdatedById: userData?.uid || null,
    lastUpdatedByName: userData?.name || 'Supervisor',
  });
}

export async function assignCrmAtivoLead(leadId, vendor, userData) {
  return updateDoc(doc(db, CRM_ATIVO_LEADS_COLLECTION, leadId), {
    vendorId: vendor?.id || null,
    vendorName: vendor?.name || null,
    status: vendor?.id ? 'Com Vendedor' : 'Frio/Disponível',
    assignedAt: vendor?.id ? serverTimestamp() : null,
    discardReason: null,
    ...buildAuditPayload(userData),
  });
}

export async function updateCrmAtivoLeadFeedback(leadId, payload, userData) {
  const nextStatus = payload.status || 'Com Vendedor';

  return updateDoc(doc(db, CRM_ATIVO_LEADS_COLLECTION, leadId), {
    status: nextStatus,
    fieldReport: String(payload.fieldReport || '').trim(),
    discardReason: nextStatus === 'Descartado'
      ? String(payload.discardReason || '').trim()
      : null,
    soldAt: nextStatus === 'Vendido' ? serverTimestamp() : null,
    discardedAt: nextStatus === 'Descartado' ? serverTimestamp() : null,
    negotiationAt: nextStatus === 'Em Negociação' ? serverTimestamp() : null,
    ...buildAuditPayload(userData),
  });
}

export async function saveCrmAtivoVendedor(formData) {
  const payload = {
    name: String(formData.name || '').trim(),
    status: formData.status || 'Ativo',
    channelId: formData.channelId || null,
    channelName: formData.channelName || null,
    clusterId: formData.clusterId || null,
    clusterName: formData.clusterName || null,
    updatedAt: serverTimestamp(),
  };

  if (formData.id) {
    return updateDoc(doc(db, CRM_ATIVO_VENDEDORES_COLLECTION, formData.id), {
      ...payload,
    });
  }

  return addDoc(collection(db, CRM_ATIVO_VENDEDORES_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}
