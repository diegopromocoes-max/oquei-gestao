import { describe, expect, it } from 'vitest';

import {
  buildWhatsAppUrl,
  filterCrmAtivoLeads,
  formatPhone,
  sanitizePhone,
  summarizeCrmAtivo,
} from './crmAtivo';

describe('crmAtivo helpers', () => {
  it('formats brazilian phone numbers', () => {
    expect(formatPhone('17991234567')).toBe('(17) 99123-4567');
    expect(formatPhone('1732345678')).toBe('(17) 3234-5678');
  });

  it('normalizes phones exported in excel scientific notation', () => {
    expect(sanitizePhone('1.8996947905E10')).toBe('18996947905');
  });

  it('builds whatsapp links with country code', () => {
    expect(buildWhatsAppUrl('(17) 99123-4567')).toBe('https://wa.me/5517991234567');
  });

  it('filters leads by status, origin and search text', () => {
    const leads = [
      {
        id: '1',
        customerName: 'Maria Silva',
        phone: '17991234567',
        origin: 'Triagem IA',
        status: 'Frio/Disponível',
        city: 'Bady Bassitt',
      },
      {
        id: '2',
        customerName: 'João Pedro',
        phone: '17999998888',
        origin: 'Indicação',
        status: 'Vendido',
        city: 'Mirassol',
      },
    ];

    const result = filterCrmAtivoLeads(leads, {
      status: 'Frio/Disponível',
      origin: 'Triagem IA',
      search: 'maria',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('summarizes vendor performance and discard reasons', () => {
    const now = new Date('2026-04-02T10:00:00Z');
    const leads = [
      {
        id: '1',
        vendorId: 'v1',
        vendorName: 'Patrick',
        status: 'Vendido',
        lastMovementAt: now,
      },
      {
        id: '2',
        vendorId: 'v1',
        vendorName: 'Patrick',
        status: 'Descartado',
        discardReason: 'Reprovou CPF',
        lastMovementAt: now,
      },
      {
        id: '3',
        status: 'Frio/Disponível',
        lastMovementAt: now,
      },
    ];

    const vendors = [{ id: 'v1', name: 'Patrick', status: 'Ativo' }];
    const summary = summarizeCrmAtivo(leads, vendors, now);

    expect(summary.totalLeads).toBe(3);
    expect(summary.availableLeads).toBe(1);
    expect(summary.soldThisMonth).toBe(1);
    expect(summary.conversionRate).toBeCloseTo(33.3, 1);
    expect(summary.vendorRanking[0]).toMatchObject({
      vendorName: 'Patrick',
      received: 2,
      sold: 1,
      conversionRate: 50,
    });
    expect(summary.discardReasons[0]).toMatchObject({
      name: 'Reprovou CPF',
      value: 1,
    });
  });
});
