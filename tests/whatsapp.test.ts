import { describe, it, expect } from 'vitest';
import {
  generateWhatsAppSettlementText,
  generateWhatsAppUrl
} from '../src/utils/whatsapp';
import type { Business, Order } from '../src/types';

describe('WhatsApp Settlement & Text Generation', () => {
  const sampleBusiness: Business = {
    id: 'biz_1',
    userId: 'u1',
    name: 'Pizzería Don Antonio',
    phone: '2314551234',
    defaultPrices: { plantaUrbana: 1500, barrioCerca: 2200, barrioLejos: 3000 },
    paymentCycle: 'weekly',
    active: true,
    createdAt: '2026-08-01'
  };

  const sampleOrders: Order[] = [
    {
      id: 'ord_1',
      userId: 'u1',
      date: '2026-08-26',
      timestamp: 1000,
      businessId: 'biz_1',
      businessName: 'Pizzería Don Antonio',
      address: 'Av. San Martín 450',
      zone: 'planta_urbana',
      amount: 1500,
      paidBy: 'business',
      paymentMethod: 'transfer',
      settled: false
    },
    {
      id: 'ord_2',
      userId: 'u1',
      date: '2026-08-26',
      timestamp: 2000,
      businessId: 'biz_1',
      businessName: 'Pizzería Don Antonio',
      address: 'Av. Cancio 1120',
      zone: 'barrio_lejos',
      amount: 3000,
      paidBy: 'business',
      paymentMethod: 'transfer',
      settled: false
    }
  ];

  it('generates formatted debt settlement message with breakdown', () => {
    const text = generateWhatsAppSettlementText(sampleBusiness, sampleOrders);

    expect(text).toContain('*CADETE OS - RESUMEN DE CUENTA*');
    expect(text).toContain('*Comercio:* Pizzería Don Antonio');
    expect(text).toContain('*Viajes pendientes:* 2');
    expect(text).toContain('*TOTAL A LIQUIDAR:* $ 4.500');
    expect(text).toContain('• 26/08/2026 - Av. San Martín 450 ($ 1.500)');
    expect(text).toContain('• 26/08/2026 - Av. Cancio 1120 ($ 3.000)');
    expect(text).toContain('_Generado automáticamente desde Cadete OS_');
  });

  it('generates wa.me link with sanitized phone number and encoded text', () => {
    const text = 'Hola Don Antonio';
    const url = generateWhatsAppUrl('2314551234', text);

    expect(url).toContain('https://wa.me/5492314551234?text=Hola%20Don%20Antonio');
  });

  it('generates wa.me picker link without phone if phone is not provided', () => {
    const text = 'Hola Don Antonio';
    const url = generateWhatsAppUrl('', text);

    expect(url).toContain('https://wa.me/?text=Hola%20Don%20Antonio');
  });
});
