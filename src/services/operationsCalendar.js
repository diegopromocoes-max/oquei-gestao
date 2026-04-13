import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '../firebase';
import { buildOperationalCalendar } from '../lib/operationsCalendar';
import { normalizeRole, ROLE_KEYS } from '../lib/roleUtils';

function scopedCollection(name, userData) {
  const role = normalizeRole(userData?.role);
  const clusterId = String(userData?.clusterId || '').trim();
  if (role === ROLE_KEYS.COORDINATOR || !clusterId) {
    return getDocs(query(collection(db, name)));
  }
  return getDocs(query(collection(db, name), where('clusterId', '==', clusterId)));
}

export async function loadOperationalCalendar({
  userData,
  monthKey,
  selectedCluster = 'all',
  selectedStore = 'all',
}) {
  const role = normalizeRole(userData?.role);
  const clusterId = String(userData?.clusterId || '').trim();
  const citiesSnapshot = await getDocs(
    role === ROLE_KEYS.COORDINATOR || !clusterId
      ? query(collection(db, 'cities'))
      : query(collection(db, 'cities'), where('clusterId', '==', clusterId))
  );

  let stores = citiesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  if (selectedCluster !== 'all') {
    stores = stores.filter((store) => store.clusterId === selectedCluster);
  }
  if (selectedStore !== 'all') {
    stores = stores.filter((store) => store.id === selectedStore);
  }

  const [holidaysSnapshot, shiftsSnapshot, absencesSnapshot, marketingSnapshot, eventsSnapshot] =
    await Promise.all([
      getDocs(query(collection(db, 'holidays'))),
      scopedCollection('shift_assignments', userData),
      scopedCollection('absences', userData),
      getDocs(query(collection(db, 'marketing_actions'))),
      getDocs(query(collection(db, 'growth_events'))),
    ]);

  return buildOperationalCalendar({
    monthKey,
    stores,
    holidays: holidaysSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    shifts: shiftsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    absences: absencesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    marketingActions: marketingSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    growthEvents: eventsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
  });
}
