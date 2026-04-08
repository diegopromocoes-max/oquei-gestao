import {
  collection,
  getDocs,
} from 'firebase/firestore';

import { db } from '../firebase';

export async function listLeadPartnershipSources(cityId) {
  if (!cityId) return [];

  try {
    const snapshot = await getDocs(collection(db, 'lead_partnership_sources'));
    return snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => item.active !== false)
      .filter((item) => item.cityId === cityId || item.cityId === '__all__')
      .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return [];
    }
    throw error;
  }
}
