export const CRM_ATIVO_STATUS = [
  'Frio/Disponível',
  'Com Vendedor',
  'Em Negociação',
  'Vendido',
  'Descartado',
];

export const CRM_ATIVO_ORIGENS = [
  'Venda Interna',
  'DataCake',
  'Triagem IA',
  'Melhorplano.net',
  'Indicação',
];

export const CRM_ATIVO_DESCARTE_MOTIVOS = [
  'Reprovou CPF',
  'Fechou com Concorrência',
  'Sem Interesse',
  'Cliente Inlocalizável',
  'Endereço Fora de Cobertura',
  'Já é Cliente',
  'Sem Viabilidade Técnica',
  'Outro',
];

export const CRM_ATIVO_STATUS_COLORS = {
  'Frio/Disponível': 'info',
  'Com Vendedor': 'primary',
  'Em Negociação': 'warning',
  Vendido: 'success',
  Descartado: 'danger',
};

export const CRM_ATIVO_VENDOR_STATUS_COLORS = {
  Ativo: 'success',
  Inativo: 'neutral',
};

export function sanitizePhone(value = '') {
  const rawValue = String(value || '').trim();
  const normalizedValue = /^\d+(?:\.\d+)?e[+-]?\d+$/i.test(rawValue)
    ? String(Number(rawValue).toFixed(0))
    : rawValue;

  return normalizedValue.replace(/\D/g, '');
}

export function formatPhone(value = '') {
  const digits = sanitizePhone(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return value || '—';
}

export function buildWhatsAppUrl(phone, message = '') {
  const digits = sanitizePhone(phone);

  if (!digits) {
    return '';
  }

  const normalizedDigits = digits.startsWith('55') ? digits : `55${digits}`;
  const baseUrl = `https://wa.me/${normalizedDigits}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}

export function normalizeTimestamp(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value) {
  const date = normalizeTimestamp(value);
  return date ? new Intl.DateTimeFormat('pt-BR').format(date) : '—';
}

export function formatDateTime(value) {
  const date = normalizeTimestamp(value);
  return date
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
    : '—';
}

export function isSameMonth(dateValue, referenceDate = new Date()) {
  const date = normalizeTimestamp(dateValue);
  const reference = normalizeTimestamp(referenceDate) || new Date();

  if (!date) {
    return false;
  }

  return date.getMonth() === reference.getMonth()
    && date.getFullYear() === reference.getFullYear();
}

export function getLeadLastMovementDate(lead) {
  return (
    normalizeTimestamp(lead?.soldAt)
    || normalizeTimestamp(lead?.discardedAt)
    || normalizeTimestamp(lead?.negotiationAt)
    || normalizeTimestamp(lead?.assignedAt)
    || normalizeTimestamp(lead?.lastMovementAt)
    || normalizeTimestamp(lead?.insertedAt)
    || null
  );
}

export function formatLeadAddress(lead = {}) {
  const primary = [lead.street, lead.number].filter(Boolean).join(', ');
  const secondary = [
    lead.complement,
    lead.neighborhood,
    lead.city,
    lead.state,
    lead.zipCode,
  ].filter(Boolean).join(' • ');

  return [primary, secondary].filter(Boolean).join(' — ') || lead.addressText || 'Endereço não informado';
}

export function buildLeadSearchText(lead = {}) {
  return [
    lead.customerName,
    lead.phone,
    lead.vendorName,
    lead.origin,
    lead.status,
    lead.fieldReport,
    lead.discardReason,
    formatLeadAddress(lead),
  ].filter(Boolean).join(' ').toLowerCase();
}

export function filterCrmAtivoLeads(leads = [], filters = {}) {
  const search = String(filters.search || '').trim().toLowerCase();

  return leads.filter((lead) => {
    if (filters.status && filters.status !== 'all' && lead.status !== filters.status) {
      return false;
    }

    if (filters.vendorId && filters.vendorId !== 'all' && lead.vendorId !== filters.vendorId) {
      return false;
    }

    if (filters.origin && filters.origin !== 'all' && lead.origin !== filters.origin) {
      return false;
    }

    if (search && !buildLeadSearchText(lead).includes(search)) {
      return false;
    }

    return true;
  });
}

function toPercent(value, total) {
  if (!total) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(1));
}

export function summarizeCrmAtivo(leads = [], vendors = [], referenceDate = new Date()) {
  const totalLeads = leads.length;
  const availableLeads = leads.filter((lead) => lead.status === 'Frio/Disponível').length;
  const inNegotiation = leads.filter((lead) => lead.status === 'Em Negociação').length;
  const soldLeads = leads.filter((lead) => lead.status === 'Vendido');
  const discardedLeads = leads.filter((lead) => lead.status === 'Descartado');
  const soldThisMonth = soldLeads.filter((lead) => isSameMonth(getLeadLastMovementDate(lead), referenceDate)).length;

  const discardReasonsMap = discardedLeads.reduce((acc, lead) => {
    const reason = lead.discardReason || 'Sem motivo informado';
    acc.set(reason, (acc.get(reason) || 0) + 1);
    return acc;
  }, new Map());

  const discardReasons = Array.from(discardReasonsMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const rankingSeed = vendors.map((vendor) => ({
    id: vendor.id,
    vendorId: vendor.id,
    vendorName: vendor.name || 'Sem nome',
    vendorStatus: vendor.status || 'Ativo',
    channelId: vendor.channelId || null,
    channelName: vendor.channelName || null,
    clusterId: vendor.clusterId || null,
    clusterName: vendor.clusterName || null,
    received: 0,
    sold: 0,
    negotiation: 0,
  }));

  const rankingMap = new Map(rankingSeed.map((entry) => [entry.vendorId, entry]));

  leads.forEach((lead) => {
    if (!lead.vendorId) {
      return;
    }

    const current = rankingMap.get(lead.vendorId) || {
      vendorId: lead.vendorId,
      vendorName: lead.vendorName || 'Sem vendedor',
      vendorStatus: 'Ativo',
      channelId: lead.vendorChannelId || null,
      channelName: lead.vendorChannelName || null,
      clusterId: lead.vendorClusterId || null,
      clusterName: lead.vendorClusterName || null,
      received: 0,
      sold: 0,
      negotiation: 0,
    };

    current.received += 1;

    if (lead.status === 'Vendido') {
      current.sold += 1;
    }

    if (lead.status === 'Em Negociação') {
      current.negotiation += 1;
    }

    rankingMap.set(lead.vendorId, current);
  });

  const vendorRanking = Array.from(rankingMap.values())
    .map((entry) => ({
      ...entry,
      conversionRate: toPercent(entry.sold, entry.received),
    }))
    .sort((a, b) => {
      if (b.sold !== a.sold) {
        return b.sold - a.sold;
      }

      if (b.received !== a.received) {
        return b.received - a.received;
      }

      return String(a.vendorName).localeCompare(String(b.vendorName));
    });

  const statusDistribution = CRM_ATIVO_STATUS.map((status) => ({
    name: status,
    value: leads.filter((lead) => lead.status === status).length,
  })).filter((entry) => entry.value > 0);

  return {
    totalLeads,
    availableLeads,
    soldLeads: soldLeads.length,
    discardedLeads: discardedLeads.length,
    inNegotiation,
    soldThisMonth,
    conversionRate: toPercent(soldLeads.length, totalLeads),
    discardReasons,
    vendorRanking,
    statusDistribution,
  };
}
