import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { getLeadCoordinates, LEAD_GEO_STATUS, normalizeLeadGeoStatus } from '../lib/leadGeo';

export const LEAD_STATUS_SALE = ['Contratado', 'Instalado'];

export function getMonthKeyFromDate(dateValue) {
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}/.test(dateValue)) {
    return dateValue.slice(0, 7);
  }

  const parsed = new Date(dateValue || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 7) : parsed.toISOString().slice(0, 7);
}

// Retorna a data de hoje no formato YYYY-MM-DD (sem hora, fuso local)
export function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeLeadType(value) {
  const source = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (source.includes('migra')) {
    return 'Migração';
  }

  if (
    source.includes('sva')
    || source.includes('servicos adicionais')
    || source.includes('servico adicional')
  ) {
    return 'SVA';
  }

  return 'Plano Novo';
}

function buildOriginPayload(formData = {}) {
  return {
    origin: formData.originName || formData.origem || 'CRM Interno',
    originCatalogId: formData.originCatalogId || null,
    originKind: formData.originKind || null,
    originSourceType: formData.originSourceType || null,
    originSourceId: formData.originSourceId || null,
    originSourceName: formData.originSourceName || null,
    originActionId: formData.originSourceType === 'action_plan' ? (formData.originSourceId || formData.acaoId || null) : (formData.acaoId || null),
    originActionName: formData.originSourceName || formData.acaoNome || null,
    indicationName: formData.indicationName || null,
    indicationLeadId: formData.indicationLeadId || null,
  };
}

function normalizeText(value = '') {
  return String(value || '').trim();
}

function buildPersonalPayload(formData = {}) {
  return {
    customerName: normalizeText(formData.customerName || formData.nome),
    customerPhone: normalizeText(formData.customerPhone || formData.tel),
    customerEmail: normalizeText(formData.customerEmail || formData.email),
    customerCpf: normalizeText(formData.customerCpf || formData.cpf),
  };
}

function buildAddress(formData = {}) {
  const street = String(formData.logradouro || '').trim();
  const number = String(formData.numero || '').trim();
  const neighborhood = String(formData.bairro || '').trim();
  const fallback = String(formData.geoFormattedAddress || '').trim();
  const joined = [street && number ? `${street}, ${number}` : street || number, neighborhood].filter(Boolean).join(' - ');
  return joined || fallback || 'Endereco nao informado';
}

function buildGeoPayload(formData = {}) {
  const coordinates = getLeadCoordinates(formData);
  const hasGeo = Boolean(coordinates);
  const geoStatus = normalizeLeadGeoStatus(formData.geoStatus);
  return {
    geoLat: hasGeo ? coordinates.lat : null,
    geoLng: hasGeo ? coordinates.lng : null,
    geoStatus: hasGeo ? geoStatus : LEAD_GEO_STATUS.PENDING,
    geoFormattedAddress: formData.geoFormattedAddress || '',
    geoUpdatedAt: hasGeo ? new Date().toISOString() : null,
  };
}

// ── Datas de ciclo de vida ──────────────────────────────────────────────────
// Constrói o payload de datas com base no status do lead.
// Regras:
//   prospectingDate = date (data de abertura/prospecção — imutável)
//   contractedDate  = data em que status mudou para "Contratado"
//   contractedMonthKey = mês da contratação (conta para "Vendas Fechadas")
//   installedDate   = data em que status mudou para "Instalado"
//   installMonthKey = mês da instalação — É ESTE QUE VALE PARA A META
//
// Se a instalação acontecer no mês seguinte à venda, ela conta para o mês
// em que foi instalada, não para o mês da contratação.
function buildDatePayloadForStatus(status, formData = {}) {
  const isContracted = status === 'Contratado' || status === 'Instalado';
  const isInstalled  = status === 'Instalado';

  // Usa a data informada no formulário ou cai para a data de prospecção como referência
  const referenceDate = formData.date || getTodayKey();

  const contractedDate = isContracted
    ? normalizeText(formData.contractedDate || referenceDate)
    : null;

  const installedDate = isInstalled
    ? normalizeText(formData.installedDate || referenceDate)
    : null;

  return {
    contractedDate,
    contractedMonthKey: contractedDate ? getMonthKeyFromDate(contractedDate) : null,
    installedDate,
    installMonthKey: installedDate ? getMonthKeyFromDate(installedDate) : null,
  };
}

// Resolve clusterId com fallback robusto: cityDetails > userData > null
// Nunca grava null se houver qualquer fonte disponível.
function resolveClusterId(cityDetails = {}, userData = {}) {
  return (
    String(cityDetails.clusterId || '').trim() ||
    String(cityDetails.clusterName || '').trim() ||
    String(userData?.clusterId || '').trim() ||
    String(userData?.cluster || '').trim() ||
    null
  );
}

// Resolve supervisorId com fallback: supervisorUid (campo usado em GestaoColaboradores) > supervisorId
function resolveSupervisorId(userData = {}) {
  return (
    String(userData?.supervisorUid || '').trim() ||
    String(userData?.supervisorId || '').trim() ||
    null
  );
}

// Resolve nome do supervisor: campo dedicado > fallback vazio (nunca bloqueia o cadastro)
function resolveSupervisorName(userData = {}) {
  return String(userData?.supervisorName || '').trim() || null;
}

// ── 1. Cria um novo Lead ────────────────────────────────────────────────────
export const createLead = async (formData, userData, cityDetails, catDetails, prodDetails) => {
  const leadType = normalizeLeadType(catDetails?.name || formData.leadType || prodDetails?.name);
  const address = buildAddress(formData);
  const geoPayload = buildGeoPayload(formData);
  const originPayload = buildOriginPayload(formData);
  const personalPayload = buildPersonalPayload(formData);
  const isDiscardedLead = formData.status === 'Descartado';

  const clusterId = resolveClusterId(cityDetails, userData);
  const supervisorId = resolveSupervisorId(userData);
  const supervisorName = resolveSupervisorName(userData);

  // Datas de ciclo de vida — preenchidas automaticamente se o lead já nasce
  // como Contratado ou Instalado (ex: registro retroativo de venda fechada)
  const dateCyclePayload = buildDatePayloadForStatus(formData.status, formData);

  return addDoc(collection(db, 'leads'), {
    // ── Datas ──────────────────────────────────────────────────────────────
    // prospectingDate: data de abertura/prospecção do lead
    date: formData.date,
    prospectingDate: formData.date,
    monthKey: getMonthKeyFromDate(formData.date),

    // contractedDate: data em que o plano foi contratado (venda ganha)
    // contractedMonthKey: mês da contratação — "Vendas Fechadas"
    // installedDate: data em que o plano foi instalado (ativação)
    // installMonthKey: mês da instalação — VALE PARA A META
    ...dateCyclePayload,

    createdAt: serverTimestamp(),
    lastUpdate: serverTimestamp(),

    // Atendente
    attendantId: auth.currentUser?.uid,
    attendantName: userData?.name || 'Atendente',

    // Supervisor responsável — permite filtro por supervisor nos dashboards
    supervisorId,
    supervisorName,

    // Localização
    cityId: cityDetails.id,
    cityName: cityDetails.name || cityDetails.nome,
    clusterId,
    clusterName: cityDetails.clusterName || cityDetails.clusterNameLabel || null,

    // Endereço
    address,
    addressStreet: formData.logradouro || '',
    addressNumber: formData.numero || '',
    addressNeighborhood: formData.bairro || '',

    // Produto
    categoryName: catDetails?.name || 'Geral',
    categoryId: formData.categoria,
    leadType,
    productId: formData.produto,
    productName: prodDetails?.name || 'Produto',
    productPrice: Number(prodDetails?.price || 0),

    // Status
    status: formData.status,
    discardMotive: isDiscardedLead ? normalizeText(formData.discardMotive) : null,
    fidelityMonth: isDiscardedLead ? normalizeText(formData.fidelityMonth) : null,
    isMetaBatida: false,

    ...personalPayload,
    ...originPayload,
    ...geoPayload,
  });
};

// ── 2. Escuta os Leads do Atendente (Tempo Real) ────────────────────────────
export const listenMyLeads = (uid, callback, monthKey = '', onError) => {
  const constraints = [where("attendantId", "==", uid)];
  if (monthKey) {
    constraints.push(where("monthKey", "==", monthKey));
  }

  const q = query(collection(db, "leads"), ...constraints);
  return onSnapshot(q, (snap) => {
    const leads = snap.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .sort((left, right) => {
        const leftDate = String(left.date || left.monthKey || '');
        const rightDate = String(right.date || right.monthKey || '');
        return rightDate.localeCompare(leftDate);
      });
    callback(leads);
  }, (error) => {
    console.error("Erro ao buscar leads: ", error);
    onError?.(error);
    callback([]);
  });
};

// ── 3. Atualiza o Status do Lead (Kanban / Drag-and-drop) ───────────────────
// Regras de data ao mudar de status:
//   → "Contratado" : grava contractedDate = hoje (data de fechamento da venda)
//   → "Instalado"  : grava installedDate = hoje (data de ativação — vale para meta)
//                    NÃO sobrescreve contractedDate se já existir
//   → "Em negociacao" (revert): limpa installedDate e installMonthKey (mantém contractedDate como histórico)
//   → "Descartado" : limpa installedDate e installMonthKey
export function buildLeadStatusUpdatePayload({
  currentLead = {},
  newStatus,
  discardData = {},
  today = getTodayKey(),
} = {}) {
  const payload = {
    status: newStatus,
    lastUpdate: serverTimestamp(),
  };

  if (newStatus === 'Contratado') {
    payload.contractedDate = today;
    payload.contractedMonthKey = getMonthKeyFromDate(today);
    payload.installedDate = null;
    payload.installMonthKey = null;
    payload.discardMotive = null;
    payload.fidelityMonth = null;
  }

  if (newStatus === 'Instalado') {
    payload.installedDate = today;
    payload.installMonthKey = getMonthKeyFromDate(today);
    if (!normalizeText(currentLead?.contractedDate) && !normalizeText(currentLead?.contractedMonthKey)) {
      payload.contractedDate = today;
      payload.contractedMonthKey = getMonthKeyFromDate(today);
    }
    payload.discardMotive = null;
    payload.fidelityMonth = null;
  }

  if (newStatus === 'Em negociacao') {
    payload.installedDate = null;
    payload.installMonthKey = null;
    payload.discardMotive = null;
    payload.fidelityMonth = null;
  }

  if (newStatus === 'Descartado') {
    payload.installedDate = null;
    payload.installMonthKey = null;
    payload.discardMotive = discardData.motive || null;
    payload.fidelityMonth = discardData.fidelityMonth || null;
  }

  return payload;
}

export const updateLeadStatus = async (leadId, newStatus, discardData = {}) => {
  const today = getTodayKey();
  const leadRef = doc(db, 'leads', leadId);
  const currentSnapshot = await getDoc(leadRef);
  const currentLead = currentSnapshot.exists() ? currentSnapshot.data() : {};
  const payload = buildLeadStatusUpdatePayload({
    currentLead,
    newStatus,
    discardData,
    today,
  });

  return updateDoc(leadRef, payload);
};

// ── 4. Corrige manualmente as datas de ciclo de vida de um lead ─────────────
// Usado pelo atendente/supervisor para ajustar datas registradas incorretamente
// (ex: instalação retroativa, ou contratação em data diferente de hoje).
export const updateLeadDates = async (leadId, { contractedDate, installedDate } = {}) => {
  if (!String(leadId || '').trim()) {
    throw new Error('Lead invalido para correcao de datas.');
  }

  const payload = { lastUpdate: serverTimestamp() };

  if (contractedDate !== undefined) {
    const safe = normalizeText(contractedDate);
    payload.contractedDate     = safe || null;
    payload.contractedMonthKey = safe ? getMonthKeyFromDate(safe) : null;
  }

  if (installedDate !== undefined) {
    const safe = normalizeText(installedDate);
    payload.installedDate   = safe || null;
    payload.installMonthKey = safe ? getMonthKeyFromDate(safe) : null;
  }

  return updateDoc(doc(db, 'leads', leadId), payload);
};

// ── 5. Atualiza detalhes do Lead (modal de edição) ──────────────────────────
export const updateLeadDetails = async (leadId, leadData = {}) => {
  if (!String(leadId || '').trim()) {
    throw new Error('Lead invalido para atualizacao.');
  }

  const personalPayload = buildPersonalPayload(leadData);
  const originPayload   = buildOriginPayload(leadData);

  const payload = {
    ...personalPayload,
    address: buildAddress(leadData),
    addressStreet:        normalizeText(leadData.addressStreet || leadData.logradouro),
    addressNumber:        normalizeText(leadData.addressNumber || leadData.numero),
    addressNeighborhood:  normalizeText(leadData.addressNeighborhood || leadData.bairro),
    status: leadData.status || 'Em negociação',
    lastUpdate: serverTimestamp(),
    ...originPayload,
    ...buildGeoPayload(leadData),
  };

  if (payload.status === 'Descartado') {
    payload.discardMotive = leadData.discardMotive || null;
    payload.fidelityMonth = leadData.fidelityMonth || null;
  } else {
    payload.discardMotive = null;
    payload.fidelityMonth = null;
  }

  // Permite corrigir as datas de ciclo de vida pelo modal de edição
  if (leadData.contractedDate !== undefined) {
    const safe = normalizeText(leadData.contractedDate);
    payload.contractedDate     = safe || null;
    payload.contractedMonthKey = safe ? getMonthKeyFromDate(safe) : null;
  }
  if (leadData.installedDate !== undefined) {
    const safe = normalizeText(leadData.installedDate);
    payload.installedDate   = safe || null;
    payload.installMonthKey = safe ? getMonthKeyFromDate(safe) : null;
  }

  return updateDoc(doc(db, 'leads', leadId), payload);
};

export const listAttendantLeadOptions = async (uid) => {
  if (!uid) return [];

  const snapshot = await getDocs(query(collection(db, 'leads'), where('attendantId', '==', uid)));
  return snapshot.docs
    .map((document) => ({ ...document.data(), id: document.id }))
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
};

// ── 6. Exclui um Lead ───────────────────────────────────────────────────────
export const deleteLead = async (leadId) => {
  return deleteDoc(doc(db, "leads", leadId));
};
