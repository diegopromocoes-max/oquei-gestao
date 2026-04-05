import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { db } from '../firebase';
import { LEAD_STATUS_SALE, normalizeLeadType } from './leads';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSale(lead) {
  return LEAD_STATUS_SALE.includes(lead?.status);
}

export function summarizeAttendantLeads(leads = []) {
  const sales = leads.filter(isSale);
  const discarded = leads.filter((lead) => lead?.status === 'Descartado');
  const installed = leads.filter((lead) => lead?.status === 'Instalado');
  const totalValue = sales.reduce((sum, lead) => sum + toNumber(lead.productPrice), 0);
  const averageTicket = sales.length ? totalValue / sales.length : 0;
  const conversionRate = leads.length ? (sales.length / leads.length) * 100 : 0;
  const typeSummary = sales.reduce((accumulator, lead) => {
    const type = normalizeLeadType(lead?.leadType || lead?.categoryName || lead?.productName);
    accumulator[type] = (accumulator[type] || 0) + 1;
    return accumulator;
  }, {});
  const statusSummary = leads.reduce((accumulator, lead) => {
    const status = lead?.status || 'Em negociação';
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {});

  return {
    totalLeads: leads.length,
    totalSales: sales.length,
    totalDiscarded: discarded.length,
    totalInstalled: installed.length,
    conversionRate: Number(conversionRate.toFixed(1)),
    averageTicket: Number(averageTicket.toFixed(2)),
    totalValue: Number(totalValue.toFixed(2)),
    planos: typeSummary['Plano Novo'] || 0,
    migracoes: typeSummary['Migração'] || 0,
    svas: typeSummary.SVA || 0,
    typeSummary,
    statusSummary,
    recentLeads: leads
      .slice()
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
      .slice(0, 8),
  };
}

export function listenAttendantLeadsByMonth(uid, monthKey, callback, onError) {
  const q = query(
    collection(db, 'leads'),
    where('attendantId', '==', uid),
    where('monthKey', '==', monthKey),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const leads = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
      callback(leads, summarizeAttendantLeads(leads));
    },
    (error) => {
      onError?.(error);
      callback([], summarizeAttendantLeads([]));
    },
  );
}
