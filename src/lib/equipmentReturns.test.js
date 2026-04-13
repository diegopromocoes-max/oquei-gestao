import { describe, expect, it } from 'vitest';

import {
  EQUIPMENT_RETURN_STATUS,
  SYSTEM_EQUIPMENT_RETURN_TYPES,
  buildEquipmentReturnDocumentModel,
  buildEquipmentReturnErpUpdate,
  buildEquipmentReturnPayload,
  getEquipmentReturnScope,
  normalizeEquipmentReturnTypeName,
} from './equipmentReturns';

describe('buildEquipmentReturnPayload', () => {
  it('normalizes the form payload and starts in pending ERP status', () => {
    const issuedAt = new Date('2026-04-09T15:30:00Z');
    const payload = buildEquipmentReturnPayload(
      {
        customer: {
          name: '  Maria da Silva  ',
          cpf: ' 123.456.789-00 ',
          contractNumber: ' CTR-001 ',
        },
        checklist: {
          deliveredInStore: true,
          missingEquipment: false,
          missingEquipmentDetails: 'nao deve persistir',
          declarationDelivered: true,
          goodCondition: false,
          stockUnlinkStatus: 'enviado_ao_estoquista',
          returnedMacDescription: 'ONU: 00:11 / Roteador: 22:33',
        },
        equipments: [
          {
            nickname: ' Roteador principal ',
            typeId: 'roteador',
            typeLabel: 'Roteador',
            brand: ' TP-Link ',
            model: ' Archer C60 ',
            identifierLabel: ' MAC Roteador ',
            identifierValue: ' AA:BB:CC ',
          },
          {
            nickname: '',
            typeId: 'outro',
            customTypeDescription: ' Fonte ',
            brand: 'Intelbras',
            model: 'Fonte X',
            identifierLabel: 'Serie',
            identifierValue: 'SER-123',
          },
        ],
      },
      {
        uid: 'att-1',
        name: 'Patrick',
        role: 'attendant',
        cityId: 'loja-centro',
        cityName: 'Loja Centro',
        clusterId: 'cluster-norte',
        supervisorUid: 'sup-1',
      },
      issuedAt,
    );

    expect(payload.status).toBe(EQUIPMENT_RETURN_STATUS.PENDING_ERP);
    expect(payload.erp).toEqual({
      registered: false,
      protocol: '',
      registeredAt: null,
    });
    expect(payload.customer).toEqual({
      name: 'Maria da Silva',
      cpf: '123.456.789-00',
      contractNumber: 'CTR-001',
    });
    expect(payload.attendant).toEqual({
      uid: 'att-1',
      name: 'Patrick',
      role: 'attendant',
      storeId: 'loja-centro',
      storeName: 'Loja Centro',
      clusterId: 'cluster-norte',
      supervisorUid: 'sup-1',
    });
    expect(payload.checklist.missingEquipmentDetails).toBe('');
    expect(payload.equipments[0]).toMatchObject({
      nickname: 'Roteador principal',
      typeId: 'roteador',
      typeLabel: 'Roteador',
      brand: 'TP-Link',
      model: 'Archer C60',
      identifierLabel: 'MAC Roteador',
      identifierValue: 'AA:BB:CC',
    });
    expect(payload.equipments[1]).toMatchObject({
      nickname: 'Equipamento 2',
      typeId: 'outro',
      typeLabel: 'Fonte',
      customTypeDescription: 'Fonte',
    });
    expect(payload.termIssuedAt).toBe(issuedAt);
  });
});

describe('buildEquipmentReturnErpUpdate', () => {
  it('requires protocol and switches the return to registered ERP', () => {
    const registeredAt = new Date('2026-04-10T12:00:00Z');
    const update = buildEquipmentReturnErpUpdate(' ERP-0099 ', registeredAt);

    expect(update).toEqual({
      erp: {
        registered: true,
        protocol: 'ERP-0099',
        registeredAt,
      },
      status: EQUIPMENT_RETURN_STATUS.REGISTERED_ERP,
    });
  });

  it('throws when protocol is missing', () => {
    expect(() => buildEquipmentReturnErpUpdate('   ')).toThrow(/protocolo/i);
  });
});

describe('getEquipmentReturnScope', () => {
  it('maps attendant, supervisor and coordinator scopes correctly', () => {
    expect(getEquipmentReturnScope({ role: 'attendant', uid: 'att-1' })).toEqual({
      scope: 'own',
      field: 'attendant.uid',
      value: 'att-1',
    });

    expect(getEquipmentReturnScope({ role: 'supervisor', clusterId: 'cluster-1' })).toEqual({
      scope: 'cluster',
      field: 'attendant.clusterId',
      value: 'cluster-1',
    });

    expect(getEquipmentReturnScope({ role: 'coordinator' })).toEqual({
      scope: 'all',
      field: null,
      value: null,
    });
  });
});

describe('equipment return types', () => {
  it('normalizes type names and keeps system seeds available', () => {
    expect(normalizeEquipmentReturnTypeName('  Repetidor   Mesh  ')).toBe('Repetidor Mesh');
    expect(SYSTEM_EQUIPMENT_RETURN_TYPES.map((item) => item.id)).toEqual([
      'roteador',
      'onu',
      'fire_stick',
      'outro',
    ]);
  });
});

describe('buildEquipmentReturnDocumentModel', () => {
  it('includes the critical data needed by the generated term', () => {
    const model = buildEquipmentReturnDocumentModel({
      termIssuedAt: new Date('2026-04-09T10:00:00Z'),
      attendant: { name: 'Patrick', storeName: 'Loja Centro' },
      customer: {
        name: 'Maria da Silva',
        cpf: '123.456.789-00',
        contractNumber: 'CTR-001',
      },
      equipments: [
        {
          nickname: 'ONU principal',
          typeLabel: 'ONU',
          brand: 'Huawei',
          model: 'HG8245',
          identifierLabel: 'MAC ONU',
          identifierValue: '00:11',
        },
      ],
    });

    expect(model.title).toMatch(/Termo de Devolucao/i);
    expect(model.companyName).toBe('Oquei Telecom');
    expect(model.attendantLabel).toBe('Patrick');
    expect(model.customerRows.flat().join(' ')).toContain('Maria da Silva');
    expect(model.customerRows.flat().join(' ')).toContain('CTR-001');
    expect(model.equipmentRows[0].join(' ')).toContain('ONU principal');
    expect(model.equipmentRows[0].join(' ')).toContain('00:11');
    expect(model).not.toHaveProperty('checklistRows');
    expect(model.declarationText).not.toMatch(/checklist/i);
    expect(model.declarationText).not.toMatch(/ERP/i);
    expect(model.declarationText).not.toMatch(/estoque/i);
    expect(model.signatures).toEqual([
      'Assinatura do Atendente',
      'Assinatura do Cliente / Responsavel',
    ]);
  });
});
