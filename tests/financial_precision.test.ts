import { describe, it, expect } from 'vitest';
import {
  calculateDailySummary,
  calculateBusinessDebt
} from '../src/utils/calculations';
import {
  generateWhatsAppSettlementText,
  sanitizeArgentinePhone
} from '../src/utils/whatsapp';
import type { Order, Expense, Business } from '../src/types';

describe('Financial Math & Arqueo Precision Suite (tests/financial_precision.test.ts)', () => {
  const testDate = '2026-09-14';

  it('1. handles unsettled customer orders (paidBy: customer, settled: false) as unsettledRevenue without adding to cash/transfer drawer', () => {
    const orders: Order[] = [
      {
        id: 'ord_c_settled',
        userId: 'u1',
        date: testDate,
        timestamp: 1000,
        businessId: 'biz_1',
        businessName: 'Pizzería',
        zone: 'planta_urbana',
        amount: 2000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'ord_c_unsettled',
        userId: 'u1',
        date: testDate,
        timestamp: 2000,
        businessId: 'biz_1',
        businessName: 'Pizzería',
        zone: 'barrio_cerca',
        amount: 3500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: false // Left on credit with the customer
      }
    ];

    const summary = calculateDailySummary(orders, [], testDate, 5000);

    // Total revenue is 2000 + 3500 = 5500
    expect(summary.totalRevenue).toBe(5500);
    // Only the settled order enters physical cash collected
    expect(summary.realCashEarned).toBe(2000);
    expect(summary.cashInPocket).toBe(7000); // 5000 initial + 2000 collected
    // Unsettled order goes strictly to unsettledRevenue
    expect(summary.unsettledRevenue).toBe(3500);
  });

  it('2. calculates exact centavo floating point precision for realCashEarned and cashInPocket with starting float', () => {
    const orders: Order[] = [
      {
        id: 'o1',
        userId: 'u1',
        date: testDate,
        timestamp: 1,
        businessId: 'b1',
        businessName: 'Hamburguesería',
        zone: 'planta_urbana',
        amount: 2150.5,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'o2',
        userId: 'u1',
        date: testDate,
        timestamp: 2,
        businessId: 'b1',
        businessName: 'Hamburguesería',
        zone: 'barrio_cerca',
        amount: 1849.5,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      }
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        userId: 'u1',
        date: testDate,
        timestamp: 3,
        category: 'fuel',
        description: 'Nafta YPF',
        amount: 1500.25,
        paymentMethod: 'cash'
      }
    ];

    const summary = calculateDailySummary(orders, expenses, testDate, 3000);

    expect(summary.totalRevenue).toBe(4000); // 2150.5 + 1849.5
    expect(summary.totalExpenses).toBe(1500.25);
    expect(summary.netProfit).toBeCloseTo(2499.75, 2);
    expect(summary.realCashEarned).toBeCloseTo(2499.75, 2);
    expect(summary.cashInPocket).toBeCloseTo(5499.75, 2); // 3000 + 2499.75
  });

  it('3. calculates negative net profit when expenses exceed revenue while accurately tracking cash in pocket', () => {
    const orders: Order[] = [
      {
        id: 'o1',
        userId: 'u1',
        date: testDate,
        timestamp: 1,
        businessId: 'b1',
        businessName: 'Rotisería',
        zone: 'planta_urbana',
        amount: 2000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      }
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        userId: 'u1',
        date: testDate,
        timestamp: 2,
        category: 'puncture',
        description: 'Gomería pinchadura',
        amount: 6000,
        paymentMethod: 'cash'
      }
    ];

    const startingCash = 10000;
    const summary = calculateDailySummary(orders, expenses, testDate, startingCash);

    expect(summary.netProfit).toBe(-4000); // 2000 - 6000
    expect(summary.realCashEarned).toBe(-4000);
    expect(summary.cashInPocket).toBe(6000); // 10000 - 4000
  });

  it('4. calculateBusinessDebt isolates unsettled business orders from settled or customer orders', () => {
    const orders: Order[] = [
      {
        id: 'o1',
        userId: 'u1',
        date: testDate,
        timestamp: 1,
        businessId: 'target_biz',
        businessName: 'Empanadas',
        zone: 'planta_urbana',
        amount: 2500,
        paidBy: 'business',
        paymentMethod: 'cash',
        settled: false
      },
      {
        id: 'o2',
        userId: 'u1',
        date: testDate,
        timestamp: 2,
        businessId: 'target_biz',
        businessName: 'Empanadas',
        zone: 'barrio_cerca',
        amount: 3200,
        paidBy: 'business',
        paymentMethod: 'cash',
        settled: true // already settled
      },
      {
        id: 'o3',
        userId: 'u1',
        date: testDate,
        timestamp: 3,
        businessId: 'target_biz',
        businessName: 'Empanadas',
        zone: 'barrio_lejos',
        amount: 4000,
        paidBy: 'customer', // customer paid
        paymentMethod: 'cash',
        settled: false
      },
      {
        id: 'o4',
        userId: 'u1',
        date: testDate,
        timestamp: 4,
        businessId: 'other_biz',
        businessName: 'Parrilla',
        zone: 'planta_urbana',
        amount: 5000,
        paidBy: 'business',
        paymentMethod: 'cash',
        settled: false
      }
    ];

    const debt = calculateBusinessDebt(orders, 'target_biz');

    expect(debt.businessId).toBe('target_biz');
    expect(debt.unsettledOrdersCount).toBe(1);
    expect(debt.totalDebt).toBe(2500);
    expect(debt.orders[0]?.id).toBe('o1');
  });

  it('5. generateWhatsAppSettlementText structures markdown report and sanitizeArgentinePhone normalizes to E.164', () => {
    const business: Business = {
      id: 'biz_sample',
      userId: 'u1',
      name: 'Pizzería Los Amigos',
      phone: '02314-15-456789',
      defaultPrices: { plantaUrbana: 1500, barrioCerca: 2200, barrioLejos: 3000 },
      paymentCycle: 'weekly',
      active: true,
      createdAt: '2026-08-01'
    };

    const unsettledOrders: Order[] = [
      {
        id: 'o1',
        userId: 'u1',
        date: testDate,
        timestamp: 100,
        businessId: 'biz_sample',
        businessName: 'Pizzería Los Amigos',
        address: 'Av. San Martín 450',
        zone: 'planta_urbana',
        amount: 1500,
        paidBy: 'business',
        paymentMethod: 'transfer',
        settled: false
      }
    ];

    const text = generateWhatsAppSettlementText(business, unsettledOrders);

    expect(text).toContain('CADETE OS - RESUMEN DE CUENTA');
    expect(text).toContain('Pizzería Los Amigos');
    expect(text).toContain('Av. San Martín 450');
    expect(text).toContain('$1.500');
    expect(text).toContain('TOTAL A LIQUIDAR:');

    // Phone sanitization test
    const sanitized = sanitizeArgentinePhone(business.phone);
    expect(sanitized).toBe('5492314456789');
  });
});
