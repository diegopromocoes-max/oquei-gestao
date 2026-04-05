import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../firebase';

export async function getMyCashDesignation(uid) {
  if (!uid) {
    return null;
  }

  const snapshot = await getDocs(
    query(collection(db, 'petty_cash_designacoes'), where('userId', '==', uid)),
  );

  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

export async function listMyOpenCashExpenses(uid) {
  if (!uid) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      collection(db, 'petty_cash'),
      where('attendantId', '==', uid),
      where('status', '==', 'open'),
    ),
  );

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
}

export async function listMyCashCycles(uid) {
  if (!uid) {
    return [];
  }

  const snapshot = await getDocs(
    query(collection(db, 'petty_cash_cycles'), where('attendantId', '==', uid)),
  );

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => {
      const leftDate = left.closedAt?.toDate ? left.closedAt.toDate() : new Date(left.closedAt || 0);
      const rightDate = right.closedAt?.toDate ? right.closedAt.toDate() : new Date(right.closedAt || 0);
      return rightDate - leftDate;
    });
}

export async function saveCashExpense(expenseId, payload) {
  if (expenseId) {
    return updateDoc(doc(db, 'petty_cash', expenseId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  return addDoc(collection(db, 'petty_cash'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function removeCashExpense(expenseId) {
  return deleteDoc(doc(db, 'petty_cash', expenseId));
}

export async function closeCashCycle({ uid, userName, supervisorId, expenses, totalExpenses, systemBalance, physicalCash, difference, storeId }) {
  const batch = writeBatch(db);
  const cycleRef = doc(collection(db, 'petty_cash_cycles'));

  batch.set(cycleRef, {
    attendantId: uid,
    attendantName: userName,
    supervisorId,
    closedAt: new Date(),
    totalExpenses,
    systemBalance,
    physicalCash,
    difference,
    itemCount: expenses.length,
    itemsSnapshot: expenses,
    storeId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  expenses.forEach((expense) => {
    batch.update(doc(db, 'petty_cash', expense.id), {
      status: 'closed',
      cycleId: cycleRef.id,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return cycleRef.id;
}
