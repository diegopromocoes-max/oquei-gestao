import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase';

export const NEW_LEAD_DISCARD_REASON_VALUE = '__new_discard_reason__';

export const SYSTEM_LEAD_DISCARD_REASONS = [
  { id: 'preco_alto', name: 'Preco Alto' },
  { id: 'concorrencia_melhor', name: 'Concorrencia Melhor' },
  { id: 'inviabilidade_tecnica', name: 'Inviabilidade Tecnica' },
  { id: 'fidelidade_em_outro_provedor', name: 'Fidelidade em outro Provedor' },
  { id: 'sem_retorno_sumiu', name: 'Sem Retorno / Sumiu' },
];

export function normalizeDiscardReasonName(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildDiscardReasonDoc(reason, createdBy = 'system') {
  const normalizedName = normalizeDiscardReasonName(reason.name);
  return {
    name: normalizedName,
    normalizedName: normalizedName.toLowerCase(),
    active: true,
    createdAt: serverTimestamp(),
    createdBy,
  };
}

export async function ensureLeadDiscardReasonSeeds() {
  const writes = [];
  for (const reason of SYSTEM_LEAD_DISCARD_REASONS) {
    const ref = doc(db, 'lead_discard_reasons', reason.id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      writes.push(setDoc(ref, buildDiscardReasonDoc(reason), { merge: true }));
    }
  }
  await Promise.all(writes);
}

export async function listLeadDiscardReasons() {
  try {
    const snapshot = await getDocs(collection(db, 'lead_discard_reasons'));
    const remote = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => item.active !== false);
    const merged = [...SYSTEM_LEAD_DISCARD_REASONS, ...remote].reduce((accumulator, current) => {
      if (!current?.id || accumulator.some((item) => item.id === current.id)) {
        return accumulator;
      }
      accumulator.push(current);
      return accumulator;
    }, []);
    return merged.sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return [...SYSTEM_LEAD_DISCARD_REASONS].sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
    }
    throw error;
  }
}

export async function createLeadDiscardReason(name, userData) {
  const normalizedName = normalizeDiscardReasonName(name);
  if (!normalizedName) {
    throw new Error('Nome de motivo invalido.');
  }

  const existing = await getDocs(
    query(collection(db, 'lead_discard_reasons'), where('normalizedName', '==', normalizedName.toLowerCase())),
  );
  if (!existing.empty) {
    const document = existing.docs[0];
    return { id: document.id, ...document.data() };
  }

  const reasonId = `custom_${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const payload = buildDiscardReasonDoc({ name: normalizedName }, userData?.uid || 'system');
  await setDoc(doc(db, 'lead_discard_reasons', reasonId), payload, { merge: true });
  return {
    id: reasonId,
    ...payload,
    name: normalizedName,
    normalizedName: normalizedName.toLowerCase(),
  };
}
