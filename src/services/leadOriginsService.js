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

export const NEW_LEAD_ORIGIN_VALUE = '__new_origin__';

export const SYSTEM_LEAD_ORIGINS = [
  { id: 'whatsapp', name: 'WhatsApp', kind: 'standard', systemKey: 'whatsapp' },
  { id: 'telefone', name: 'Telefone', kind: 'standard', systemKey: 'telefone' },
  { id: 'balcao_loja', name: 'Balcao/Loja', kind: 'standard', systemKey: 'balcao_loja' },
  { id: 'indicacao', name: 'Indicacao', kind: 'standard', systemKey: 'indicacao' },
  { id: 'porta_a_porta', name: 'Porta a Porta', kind: 'standard', systemKey: 'porta_a_porta' },
  { id: 'redes_sociais', name: 'Redes Sociais', kind: 'standard', systemKey: 'redes_sociais' },
  { id: 'acao_crescimento', name: 'Acao de Crescimento (HUB)', kind: 'standard', systemKey: 'acao_crescimento' },
  { id: 'acao_parceria', name: 'Acao em Parceria', kind: 'partnership', systemKey: 'acao_parceria' },
  { id: 'acao_japa', name: 'Acao do Japa', kind: 'japa', systemKey: 'acao_japa' },
  { id: 'outros', name: 'Outros', kind: 'standard', systemKey: 'outros' },
];

export function normalizeLeadOriginName(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildOriginDoc(origin, createdBy = 'system') {
  const normalizedName = normalizeLeadOriginName(origin.name);
  return {
    name: normalizedName,
    normalizedName: normalizedName.toLowerCase(),
    kind: origin.kind || 'standard',
    active: true,
    systemKey: origin.systemKey || null,
    createdAt: serverTimestamp(),
    createdBy,
  };
}

export async function ensureLeadOriginSeeds() {
  const writes = [];
  for (const origin of SYSTEM_LEAD_ORIGINS) {
    const ref = doc(db, 'lead_origins', origin.id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      writes.push(setDoc(ref, buildOriginDoc(origin), { merge: true }));
    }
  }
  await Promise.all(writes);
}

export async function listLeadOrigins() {
  try {
    const snapshot = await getDocs(collection(db, 'lead_origins'));
    const remote = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => item.active !== false);
    const merged = [...SYSTEM_LEAD_ORIGINS, ...remote].reduce((accumulator, current) => {
      if (!current?.id || accumulator.some((item) => item.id === current.id)) {
        return accumulator;
      }
      accumulator.push(current);
      return accumulator;
    }, []);
    return merged.sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return [...SYSTEM_LEAD_ORIGINS].sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
    }
    throw error;
  }
}

export async function createLeadOrigin(name, userData) {
  const normalizedName = normalizeLeadOriginName(name);
  if (!normalizedName) {
    throw new Error('Nome de origem invalido.');
  }

  const existing = await getDocs(
    query(collection(db, 'lead_origins'), where('normalizedName', '==', normalizedName.toLowerCase())),
  );
  if (!existing.empty) {
    const document = existing.docs[0];
    return { id: document.id, ...document.data() };
  }

  const originId = `custom_${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const payload = buildOriginDoc({ name: normalizedName, kind: 'custom', systemKey: null }, userData?.uid || 'system');
  await setDoc(doc(db, 'lead_origins', originId), payload, { merge: true });
  return { id: originId, ...payload, name: normalizedName, normalizedName: normalizedName.toLowerCase() };
}
