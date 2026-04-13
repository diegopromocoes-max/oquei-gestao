import { ROLE_KEYS, normalizeRole } from './roleUtils';

export const EQUIPMENT_RETURN_STATUS = {
  PENDING_ERP: 'pending_erp',
  REGISTERED_ERP: 'registered_erp',
};

export const STOCK_UNLINK_STATUS_OPTIONS = [
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Nao' },
  { value: 'enviado_ao_estoquista', label: 'Enviado ao estoquista' },
];

export const SYSTEM_EQUIPMENT_RETURN_TYPES = [
  { id: 'roteador', name: 'Roteador', systemKey: 'roteador' },
  { id: 'onu', name: 'ONU', systemKey: 'onu' },
  { id: 'fire_stick', name: 'Fire Stick', systemKey: 'fire_stick' },
  { id: 'outro', name: 'Outro', systemKey: 'outro' },
];

export function normalizeEquipmentReturnTypeName(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function formatEquipmentReturnDateTime(value) {
  const date = parseReturnDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatEquipmentReturnDate(value) {
  const date = parseReturnDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function formatYesNo(value) {
  return value ? 'Sim' : 'Nao';
}

export function formatStockUnlinkStatus(value) {
  const option = STOCK_UNLINK_STATUS_OPTIONS.find((item) => item.value === value);
  return option?.label || 'Nao informado';
}

export function buildEquipmentReturnPayload(formData, userData, issuedAt = new Date()) {
  const termIssuedAt = parseReturnDate(issuedAt) || new Date();
  const equipments = Array.isArray(formData?.equipments)
    ? formData.equipments.map((equipment, index) => normalizeEquipmentItem(equipment, index))
    : [];
  const checklist = {
    deliveredInStore: Boolean(formData?.checklist?.deliveredInStore),
    missingEquipment: Boolean(formData?.checklist?.missingEquipment),
    missingEquipmentDetails: Boolean(formData?.checklist?.missingEquipment)
      ? String(formData?.checklist?.missingEquipmentDetails || '').trim()
      : '',
    declarationDelivered: Boolean(formData?.checklist?.declarationDelivered),
    goodCondition: Boolean(formData?.checklist?.goodCondition),
    stockUnlinkStatus: String(formData?.checklist?.stockUnlinkStatus || 'nao').trim() || 'nao',
    returnedMacDescription: String(formData?.checklist?.returnedMacDescription || '').trim(),
  };

  return {
    attendant: {
      uid: String(userData?.uid || '').trim(),
      name: String(userData?.name || 'Atendente').trim(),
      role: String(userData?.role || '').trim(),
      storeId: String(userData?.cityId || userData?.storeId || '').trim(),
      storeName: String(userData?.cityName || userData?.storeName || userData?.cityId || '').trim(),
      clusterId: String(userData?.clusterId || '').trim(),
      supervisorUid: String(userData?.supervisorUid || '').trim(),
    },
    customer: {
      name: String(formData?.customer?.name || '').trim(),
      cpf: String(formData?.customer?.cpf || '').trim(),
      contractNumber: String(formData?.customer?.contractNumber || '').trim(),
    },
    termIssuedAt,
    checklist,
    equipments,
    erp: {
      registered: false,
      protocol: '',
      registeredAt: null,
    },
    status: EQUIPMENT_RETURN_STATUS.PENDING_ERP,
  };
}

export function buildEquipmentReturnErpUpdate(protocol, registeredAt = new Date()) {
  const normalizedProtocol = String(protocol || '').trim();
  if (!normalizedProtocol) {
    throw new Error('Informe o protocolo da desvinculacao para registrar a devolucao no ERP.');
  }

  return {
    erp: {
      registered: true,
      protocol: normalizedProtocol,
      registeredAt: parseReturnDate(registeredAt) || new Date(),
    },
    status: EQUIPMENT_RETURN_STATUS.REGISTERED_ERP,
  };
}

export function getEquipmentReturnScope(userData) {
  const role = normalizeRole(userData?.role);

  if (role === ROLE_KEYS.COORDINATOR) {
    return { scope: 'all', field: null, value: null };
  }

  if (role === ROLE_KEYS.SUPERVISOR) {
    if (userData?.clusterId) {
      return { scope: 'cluster', field: 'attendant.clusterId', value: userData.clusterId };
    }

    const storeId = userData?.cityId || userData?.storeId || '';
    if (storeId) {
      return { scope: 'store', field: 'attendant.storeId', value: storeId };
    }
  }

  if (role === ROLE_KEYS.ATTENDANT && userData?.uid) {
    return { scope: 'own', field: 'attendant.uid', value: userData.uid };
  }

  return { scope: 'none', field: null, value: null };
}

export function sortEquipmentReturns(items = []) {
  return [...items].sort((left, right) => getReturnTime(right) - getReturnTime(left));
}

export function buildEquipmentReturnDocumentModel(record) {
  const issuedAt = record?.termIssuedAt || record?.createdAt || new Date();
  const customer = record?.customer || {};
  const attendant = record?.attendant || {};
  const equipments = Array.isArray(record?.equipments) ? record.equipments : [];

  return {
    title: 'Termo de Devolucao de Equipamentos',
    companyName: 'Oquei Telecom',
    issuedAtLabel: formatEquipmentReturnDateTime(issuedAt),
    attendantLabel: attendant.name || '-',
    customerRows: [
      ['Cliente', customer.name || '-'],
      ['CPF', customer.cpf || '-'],
      ['Contrato', customer.contractNumber || '-'],
      ['Loja', attendant.storeName || attendant.storeId || '-'],
    ],
    equipmentRows: equipments.map((equipment) => ([
      equipment.nickname || equipment.typeLabel || 'Equipamento',
      equipment.typeLabel || '-',
      [equipment.brand, equipment.model].filter(Boolean).join(' / ') || '-',
      equipment.identifierLabel || 'MAC ou Similar',
      equipment.identifierValue || '-',
    ])),
    declarationText:
      'Declaramos para os devidos fins que os equipamentos acima foram recebidos pela Oquei Telecom, ficando este termo como comprovante formal da devolucao realizada pelo cliente ou responsavel, para fins de registro e arquivo.',
    signatures: [
      'Assinatura do Atendente',
      'Assinatura do Cliente / Responsavel',
    ],
    footerText: 'Documento gerado pelo sistema Oquei Gestao para registro e arquivo interno.',
  };
}

function normalizeEquipmentItem(equipment, index) {
  const nickname = String(equipment?.nickname || '').trim();
  const typeLabel = String(equipment?.typeLabel || '').trim();
  const customTypeDescription = String(equipment?.customTypeDescription || '').trim();

  return {
    nickname: nickname || `Equipamento ${index + 1}`,
    typeId: String(equipment?.typeId || '').trim(),
    typeLabel: typeLabel || customTypeDescription || 'Outro',
    customTypeDescription,
    catalogEquipmentId: String(equipment?.catalogEquipmentId || '').trim(),
    brand: String(equipment?.brand || '').trim(),
    model: String(equipment?.model || '').trim(),
    identifierLabel: String(equipment?.identifierLabel || 'MAC ou Similar').trim(),
    identifierValue: String(equipment?.identifierValue || '').trim(),
  };
}

function parseReturnDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getReturnTime(record) {
  const candidates = [
    record?.createdAt,
    record?.termIssuedAt,
    record?.updatedAt,
  ];

  for (const candidate of candidates) {
    const parsed = parseReturnDate(candidate);
    if (parsed) {
      return parsed.getTime();
    }
  }

  return 0;
}
