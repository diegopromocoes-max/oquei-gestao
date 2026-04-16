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

function matchesOpenedMonth(lead, monthKey) {
  return String(lead?.monthKey || '').trim() === String(monthKey || '').trim();
}

function matchesContractedMonth(lead, monthKey) {
  const contractedKey = String(lead?.contractedMonthKey || lead?.monthKey || '').trim();
  return contractedKey === String(monthKey || '').trim();
}

function matchesInstalledMonth(lead, monthKey) {
  if (lead?.status !== 'Instalado') return false;
  const installKey = String(lead?.installMonthKey || lead?.monthKey || '').trim();
  return installKey === String(monthKey || '').trim();
}

function isOfficialSaleForMonth(lead, monthKey) {
  return isSale(lead) && matchesContractedMonth(lead, monthKey);
}

function isPlanSaleForMonth(lead, monthKey) {
  return isOfficialSaleForMonth(lead, monthKey)
    && normalizeLeadType(lead?.categoryName || lead?.leadType || lead?.productName) === 'Plano Novo';
}

function isRelevantLeadForMonth(lead, monthKey) {
  return (
    matchesOpenedMonth(lead, monthKey)
    || matchesContractedMonth(lead, monthKey)
    || matchesInstalledMonth(lead, monthKey)
  );
}

export function buildAttendantLifecycleAudit(leads = [], monthKey) {
  const relevantRows = leads
    .filter((lead) => isRelevantLeadForMonth(lead, monthKey))
    .map((lead) => {
      const openedInMonth = matchesOpenedMonth(lead, monthKey);
      const contractedInMonth = matchesContractedMonth(lead, monthKey);
      const installedInMonth = matchesInstalledMonth(lead, monthKey);
      const businessType = normalizeLeadType(lead?.categoryName || lead?.leadType || lead?.productName);
      return {
        id: lead.id,
        customerName: lead.customerName || '',
        categoryName: lead.categoryName || '',
        productName: lead.productName || '',
        leadType: lead.leadType || '',
        status: lead.status || '',
        monthKey: lead.monthKey || '',
        contractedMonthKey: lead.contractedMonthKey || '',
        installMonthKey: lead.installMonthKey || '',
        businessType,
        openedInMonth,
        contractedInMonth,
        installedInMonth,
        includedInOfficialSales: isOfficialSaleForMonth(lead, monthKey),
      };
    });

  return {
    monthKey,
    openedInMonth: relevantRows.filter((item) => item.openedInMonth).length,
    contractedInMonth: relevantRows.filter((item) => item.includedInOfficialSales).length,
    installedInMonth: relevantRows.filter((item) => item.installedInMonth).length,
    plansInMonth: relevantRows.filter((item) => item.businessType === 'Plano Novo' && item.includedInOfficialSales).length,
    svaInMonth: relevantRows.filter((item) => item.businessType === 'SVA' && item.includedInOfficialSales).length,
    migrationsInMonth: relevantRows.filter((item) => item.businessType === 'Migracao' && item.includedInOfficialSales).length,
    rows: relevantRows,
  };
}

export function summarizeAttendantLeads(leads = [], monthKey) {
  const openedLeads = leads.filter((lead) => matchesOpenedMonth(lead, monthKey));
  const sales = leads.filter((lead) => isOfficialSaleForMonth(lead, monthKey));
  const discarded = openedLeads.filter((lead) => lead?.status === 'Descartado');
  const installed = leads.filter((lead) => matchesInstalledMonth(lead, monthKey));
  const totalValue = sales.reduce((sum, lead) => sum + toNumber(lead.productPrice), 0);
  const averageTicket = sales.length ? totalValue / sales.length : 0;
  const conversionRate = openedLeads.length ? (sales.length / openedLeads.length) * 100 : 0;
  const typeSummary = sales.reduce((accumulator, lead) => {
    const type = normalizeLeadType(lead?.categoryName || lead?.leadType || lead?.productName);
    accumulator[type] = (accumulator[type] || 0) + 1;
    return accumulator;
  }, {});
  const statusSummary = openedLeads.reduce((accumulator, lead) => {
    const status = lead?.status || 'Em negociacao';
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {});
  const discardReasonSummary = discarded.reduce((accumulator, lead) => {
    const reason = lead?.discardMotive || 'Sem motivo informado';
    accumulator[reason] = (accumulator[reason] || 0) + 1;
    return accumulator;
  }, {});
  const discardReasonsSorted = Object.entries(discardReasonSummary).sort((left, right) => right[1] - left[1]);

  return {
    totalLeads: openedLeads.length,
    openedInMonth: openedLeads.length,
    contractedInMonth: sales.length,
    installedInMonth: installed.length,
    totalSales: sales.length,
    totalDiscarded: discarded.length,
    totalInstalled: installed.length,
    conversionRate: Number(conversionRate.toFixed(1)),
    averageTicket: Number(averageTicket.toFixed(2)),
    totalValue: Number(totalValue.toFixed(2)),
    planos: typeSummary['Plano Novo'] || 0,
    migracoes: typeSummary['Migracao'] || typeSummary['Migração'] || 0,
    svas: typeSummary.SVA || 0,
    typeSummary,
    statusSummary,
    discardReasonSummary,
    topDiscardReason: discardReasonsSorted[0]?.[0] || '',
    recentLeads: leads
      .filter((lead) => isRelevantLeadForMonth(lead, monthKey))
      .slice()
      .sort((left, right) => String(right.installedDate || right.contractedDate || right.date || '').localeCompare(String(left.installedDate || left.contractedDate || left.date || '')))
      .slice(0, 8),
  };
}

export function listenAttendantLeadsByMonth(uid, monthKey, callback, onError) {
  const q = query(
    collection(db, 'leads'),
    where('attendantId', '==', uid),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const leads = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((lead) => isRelevantLeadForMonth(lead, monthKey))
        .sort((left, right) => String(right.installedDate || right.contractedDate || right.date || '').localeCompare(String(left.installedDate || left.contractedDate || left.date || '')));
      callback(leads, summarizeAttendantLeads(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), monthKey));
    },
    (error) => {
      onError?.(error);
      callback([], summarizeAttendantLeads([], monthKey));
    },
  );
}
