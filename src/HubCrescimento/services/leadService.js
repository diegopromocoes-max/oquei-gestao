// ============================================================
//  services/leadService.js — Hub Crescimento
//  Isola toda a logica de acesso a colecao 'leads' do Dashboard.
//  RF09-C: Conversao por Acao (leadsConvertidos / leadsGerados).
// ============================================================

import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Busca leads de uma cidade/mes e os vincula aos planos de acao.
 *
 * @param {object} params
 * @param {string}   params.cityId        - ID da cidade (ou '__all__' para global)
 * @param {string}   params.month         - Formato "YYYY-MM"
 * @param {string[]} params.actionIds     - IDs dos action_plans para filtrar
 * @returns {Promise<LeadSummary>}
 */
export async function getLeadsSummary({ cityId, month, actionIds = [] } = {}) {
  const conditions = [];
  if (cityId && cityId !== '__all__') {
    conditions.push(where('cityId', '==', cityId));
  }

  const snap  = await getDocs(query(collection(db, 'leads'), ...conditions));
  const leads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Filtra pelo mes
  const leadsInMonth = month
    ? leads.filter((l) => String(l.date || l.createdAt || '').startsWith(month))
    : leads;

  const actionSet = new Set(actionIds);

  // Leads vinculados a planos do Hub
  const linkedLeads = leadsInMonth.filter(
    (l) => l.originActionId && (actionSet.size === 0 || actionSet.has(l.originActionId)),
  );

  const totalLeads     = linkedLeads.length;
  const convertedLeads = linkedLeads.filter((l) => l.status === 'convertido' || l.converted === true).length;

  return {
    totalLeads,
    convertedLeads,
    conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100 * 10) / 10 : 0,
    leads: linkedLeads,
  };
}

/**
 * RF09-C: Calcula conversao por acao individualmente.
 * Para cada plano retorna: leadsGerados, leadsConvertidos e conversionRate.
 *
 * @param {object[]} plans   - Lista de action_plans
 * @param {object[]} leads   - Lista de leads ja filtrados por cidade/mes
 * @returns {object}         - Mapa { [planId]: { leadsGerados, leadsConvertidos, conversionRate } }
 */
export function getConversionByAction(plans = [], leads = []) {
  const result = {};

  plans.forEach((plan) => {
    const planLeads      = leads.filter((l) => l.originActionId === plan.id);
    const leadsGerados   = planLeads.length;
    const leadsConvert   = planLeads.filter((l) => l.status === 'convertido' || l.converted === true).length;
    const conversionRate = leadsGerados > 0
      ? Math.round((leadsConvert / leadsGerados) * 100 * 10) / 10
      : 0;

    result[plan.id] = {
      planId:         plan.id,
      planName:       plan.name || 'Sem nome',
      leadsGerados,
      leadsConvertidos: leadsConvert,
      conversionRate,
    };
  });

  return result;
}