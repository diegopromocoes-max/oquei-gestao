import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase';
import {
  SYSTEM_EQUIPMENT_RETURN_TYPES,
  buildEquipmentReturnErpUpdate,
  buildEquipmentReturnPayload,
  getEquipmentReturnScope,
  normalizeEquipmentReturnTypeName,
  sortEquipmentReturns,
} from '../lib/equipmentReturns';
import { ROLE_KEYS, normalizeRole } from '../lib/roleUtils';

function buildTypePayload(type, createdBy = 'system') {
  const normalizedName = normalizeEquipmentReturnTypeName(type.name);
  return {
    name: normalizedName,
    normalizedName: normalizedName.toLowerCase(),
    active: true,
    systemKey: type.systemKey || null,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function mergeReturnTypes(remote = []) {
  return [...SYSTEM_EQUIPMENT_RETURN_TYPES, ...remote]
    .reduce((accumulator, current) => {
      if (!current?.id) return accumulator;
      if (accumulator.some((item) => item.id === current.id)) return accumulator;
      accumulator.push(current);
      return accumulator;
    }, [])
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
}

export async function ensureEquipmentReturnTypeSeeds(userData) {
  const role = normalizeRole(userData?.role);
  if (![ROLE_KEYS.COORDINATOR, ROLE_KEYS.SUPERVISOR].includes(role)) {
    return;
  }

  const writes = SYSTEM_EQUIPMENT_RETURN_TYPES.map((type) =>
    setDoc(
      doc(db, 'equipment_return_types', type.id),
      buildTypePayload(type, userData?.uid || 'system'),
      { merge: true },
    )
  );

  await Promise.all(writes);
}

export async function listEquipmentReturnTypes(userData) {
  const role = normalizeRole(userData?.role);

  try {
    if ([ROLE_KEYS.COORDINATOR, ROLE_KEYS.SUPERVISOR].includes(role)) {
      await ensureEquipmentReturnTypeSeeds(userData);
    }

    const snapshot = await getDocs(collection(db, 'equipment_return_types'));
    const remote = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => item.active !== false);

    return mergeReturnTypes(remote);
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return mergeReturnTypes([]);
    }
    throw error;
  }
}

export async function createEquipmentReturnType(name, userData) {
  const normalizedName = normalizeEquipmentReturnTypeName(name);
  if (!normalizedName) {
    throw new Error('Informe um nome valido para o tipo de equipamento.');
  }

  const snapshot = await getDocs(
    query(collection(db, 'equipment_return_types'), where('normalizedName', '==', normalizedName.toLowerCase())),
  );

  if (!snapshot.empty) {
    const existing = snapshot.docs[0];
    return { id: existing.id, ...existing.data() };
  }

  const typeId = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const payload = buildTypePayload({ name: normalizedName, systemKey: null }, userData?.uid || 'system');
  await setDoc(doc(db, 'equipment_return_types', typeId), payload, { merge: true });
  return { id: typeId, ...payload, name: normalizedName, normalizedName: normalizedName.toLowerCase() };
}

export async function listRouterCatalogSuggestions() {
  const snapshot = await getDocs(collection(db, 'router_catalog'));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => {
      const leftLabel = `${left.brand || ''} ${left.model || ''}`.trim();
      const rightLabel = `${right.brand || ''} ${right.model || ''}`.trim();
      return leftLabel.localeCompare(rightLabel);
    });
}

export function subscribeEquipmentReturns(userData, onData, onError) {
  const scope = getEquipmentReturnScope(userData);
  if (scope.scope === 'none') {
    onData?.([]);
    return () => {};
  }

  const baseCollection = collection(db, 'equipment_returns');
  const ref = scope.field ? query(baseCollection, where(scope.field, '==', scope.value)) : baseCollection;

  return onSnapshot(
    ref,
    (snapshot) => {
      const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      onData?.(sortEquipmentReturns(items));
    },
    (error) => onError?.(error),
  );
}

export async function createEquipmentReturn(formData, userData) {
  const termIssuedAt = new Date();
  const payload = buildEquipmentReturnPayload(formData, userData, termIssuedAt);

  const ref = await addDoc(collection(db, 'equipment_returns'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    ...payload,
    createdAt: termIssuedAt,
    updatedAt: termIssuedAt,
  };
}

export async function markEquipmentReturnErpRegistered(returnId, protocol) {
  const update = buildEquipmentReturnErpUpdate(protocol, new Date());

  await updateDoc(doc(db, 'equipment_returns', returnId), {
    ...update,
    updatedAt: serverTimestamp(),
  });

  return update;
}

export async function deleteEquipmentReturn(returnId) {
  if (!String(returnId || '').trim()) {
    throw new Error('Nao foi possivel identificar a devolucao para exclusao.');
  }

  await deleteDoc(doc(db, 'equipment_returns', returnId));
}
