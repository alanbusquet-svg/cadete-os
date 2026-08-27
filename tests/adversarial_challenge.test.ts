import { describe, it, expect } from 'vitest';
import {
  calculateDailySummary,
  calculateBusinessDebt,
  calculateAllBusinessesDebt,
  calculateOilOdometer
} from '../src/utils/calculations';
import { generateWhatsAppSettlementText, generateWhatsAppUrl } from '../src/utils/whatsapp';
import type { Order, Expense, Business, MaintenanceRecord } from '../src/types';

describe('Adversarial Challenge Suite — Financials, Cash Drawer, Debt & Odometer', () => {
  const testDate = '2026-08-26';

  // =========================================================================
  // TASK 1: Mathematical Invariants for Ganancia Neta across Diverse Edge Cases
  // =========================================================================
  describe('Task 1: Mathematical Invariant Ganancia Neta = Facturado - Gastos', () => {
    it('handles 0 orders and 0 expenses cleanly', () => {
      const summary = calculateDailySummary([], [], testDate);

      expect(summary.totalOrdersCount).toBe(0);
      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.netProfit).toBe(0);
      expect(summary.cashInPocket).toBe(0);
      expect(summary.moneyInAccount).toBe(0);
      expect(summary.unsettledRevenue).toBe(0);
      // Invariant: Net Profit = Revenue - Expenses
      expect(summary.netProfit).toBe(summary.totalRevenue - summary.totalExpenses);
    });

    it('handles 0 orders with positive expenses (expenses only shift)', () => {
      const expenses: Expense[] = [
        {
          id: 'exp_fuel',
          userId: 'u1',
          date: testDate,
          timestamp: 1000,
          category: 'fuel',
          description: 'Nafta 5L',
          amount: 6000,
          paymentMethod: 'cash'
        },
        {
          id: 'exp_puncture',
          userId: 'u1',
          date: testDate,
          timestamp: 2000,
          category: 'puncture',
          description: 'Parche gomeria',
          amount: 2500,
          paymentMethod: 'transfer'
        }
      ];

      const summary = calculateDailySummary([], expenses, testDate);

      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalExpenses).toBe(8500);
      expect(summary.netProfit).toBe(-8500);
      expect(summary.cashInPocket).toBe(-6000);
      expect(summary.moneyInAccount).toBe(-2500);
      expect(summary.unsettledRevenue).toBe(0);
      // Invariant
      expect(summary.netProfit).toBe(summary.totalRevenue - summary.totalExpenses);
      // Double-entry reconciliation: Net Profit = Pocket + Account + Unsettled
      expect(summary.netProfit).toBe(summary.cashInPocket + summary.moneyInAccount + summary.unsettledRevenue);
    });

    it('handles positive revenue with 0 expenses (zero expense shift)', () => {
      const orders: Order[] = [
        {
          id: 'ord_1',
          userId: 'u1',
          date: testDate,
          timestamp: 1000,
          businessId: 'biz_1',
          businessName: 'Rotisería',
          zone: 'planta_urbana',
          amount: 1800,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        },
        {
          id: 'ord_2',
          userId: 'u1',
          date: testDate,
          timestamp: 2000,
          businessId: 'biz_1',
          businessName: 'Rotisería',
          zone: 'barrio_lejos',
          amount: 3200,
          paidBy: 'customer',
          paymentMethod: 'transfer',
          settled: true
        }
      ];

      const summary = calculateDailySummary(orders, [], testDate);

      expect(summary.totalRevenue).toBe(5000);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.netProfit).toBe(5000);
      expect(summary.cashInPocket).toBe(1800);
      expect(summary.moneyInAccount).toBe(3200);
      expect(summary.unsettledRevenue).toBe(0);
      // Invariant
      expect(summary.netProfit).toBe(summary.totalRevenue - summary.totalExpenses);
    });

    it('handles heavy loss scenario where expenses >> revenue', () => {
      const orders: Order[] = [
        {
          id: 'ord_1',
          userId: 'u1',
          date: testDate,
          timestamp: 1000,
          businessId: 'biz_1',
          businessName: 'Rotisería',
          zone: 'planta_urbana',
          amount: 1500,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        }
      ];

      const expenses: Expense[] = [
        {
          id: 'exp_repair',
          userId: 'u1',
          date: testDate,
          timestamp: 2000,
          category: 'other',
          description: 'Transmisión rota',
          amount: 45000,
          paymentMethod: 'transfer'
        },
        {
          id: 'exp_fuel',
          userId: 'u1',
          date: testDate,
          timestamp: 3000,
          category: 'fuel',
          description: 'Nafta Premium',
          amount: 8000,
          paymentMethod: 'cash'
        }
      ];

      const summary = calculateDailySummary(orders, expenses, testDate);

      expect(summary.totalRevenue).toBe(1500);
      expect(summary.totalExpenses).toBe(53000);
      expect(summary.netProfit).toBe(-51500);
      expect(summary.cashInPocket).toBe(1500 - 8000); // -6500
      expect(summary.moneyInAccount).toBe(0 - 45000); // -45000
      expect(summary.unsettledRevenue).toBe(0);
      // Invariant
      expect(summary.netProfit).toBe(summary.totalRevenue - summary.totalExpenses);
      expect(summary.netProfit).toBe(summary.cashInPocket + summary.moneyInAccount + summary.unsettledRevenue);
    });

    it('ignores orders and expenses from different dates', () => {
      const orders: Order[] = [
        {
          id: 'ord_yesterday',
          userId: 'u1',
          date: '2026-08-25',
          timestamp: 1000,
          businessId: 'biz_1',
          businessName: 'Biz',
          zone: 'planta_urbana',
          amount: 9999,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        },
        {
          id: 'ord_today',
          userId: 'u1',
          date: testDate,
          timestamp: 2000,
          businessId: 'biz_1',
          businessName: 'Biz',
          zone: 'planta_urbana',
          amount: 2000,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        }
      ];

      const expenses: Expense[] = [
        {
          id: 'exp_tomorrow',
          userId: 'u1',
          date: '2026-08-27',
          timestamp: 3000,
          category: 'fuel',
          description: 'Nafta',
          amount: 5000,
          paymentMethod: 'cash'
        }
      ];

      const summary = calculateDailySummary(orders, expenses, testDate);

      expect(summary.totalOrdersCount).toBe(1);
      expect(summary.totalRevenue).toBe(2000);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.netProfit).toBe(2000);
      expect(summary.cashInPocket).toBe(2000);
    });
  });

  // =========================================================================
  // TASK 2: Cash Drawer Split & Unsettled Debt Isolation
  // =========================================================================
  describe('Task 2: Cash Drawer Split & Strict Unsettled Debt Isolation', () => {
    it('verifies unsettled business credit NEVER inflates pocket cash or bank balance', () => {
      const orders: Order[] = [
        // 1. Customer Cash: $2.000 -> Should enter Cash in Pocket
        {
          id: 'ord_cust_cash',
          userId: 'u1',
          date: testDate,
          timestamp: 1000,
          businessId: 'biz_1',
          businessName: 'Pizzería Centro',
          zone: 'planta_urbana',
          amount: 2000,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        },
        // 2. Customer Transfer: $3.500 -> Should enter Bank Account
        {
          id: 'ord_cust_transfer',
          userId: 'u1',
          date: testDate,
          timestamp: 2000,
          businessId: 'biz_1',
          businessName: 'Pizzería Centro',
          zone: 'barrio_cerca',
          amount: 3500,
          paidBy: 'customer',
          paymentMethod: 'transfer',
          settled: true
        },
        // 3. Business Settled Cash: $1.500 -> Should enter Cash in Pocket
        {
          id: 'ord_biz_settled_cash',
          userId: 'u1',
          date: testDate,
          timestamp: 3000,
          businessId: 'biz_2',
          businessName: 'Hamburguesería',
          zone: 'planta_urbana',
          amount: 1500,
          paidBy: 'business',
          paymentMethod: 'cash',
          settled: true
        },
        // 4. Business Settled Transfer: $2.500 -> Should enter Bank Account
        {
          id: 'ord_biz_settled_transfer',
          userId: 'u1',
          date: testDate,
          timestamp: 4000,
          businessId: 'biz_2',
          businessName: 'Hamburguesería',
          zone: 'barrio_lejos',
          amount: 2500,
          paidBy: 'business',
          paymentMethod: 'transfer',
          settled: true
        },
        // 5. Business UNSETTLED Cash: $10.000 -> MUST NOT enter pocket cash!
        {
          id: 'ord_biz_unsettled_cash',
          userId: 'u1',
          date: testDate,
          timestamp: 5000,
          businessId: 'biz_3',
          businessName: 'Farmacia 24hs',
          zone: 'custom',
          amount: 10000,
          paidBy: 'business',
          paymentMethod: 'cash',
          settled: false
        },
        // 6. Business UNSETTLED Transfer: $15.000 -> MUST NOT enter bank account!
        {
          id: 'ord_biz_unsettled_transfer',
          userId: 'u1',
          date: testDate,
          timestamp: 6000,
          businessId: 'biz_3',
          businessName: 'Farmacia 24hs',
          zone: 'custom',
          amount: 15000,
          paidBy: 'business',
          paymentMethod: 'transfer',
          settled: false
        }
      ];

      const expenses: Expense[] = [
        // Cash expense $1.000
        {
          id: 'exp_1',
          userId: 'u1',
          date: testDate,
          timestamp: 7000,
          category: 'food',
          description: 'Sandwich',
          amount: 1000,
          paymentMethod: 'cash'
        },
        // Transfer expense $500
        {
          id: 'exp_2',
          userId: 'u1',
          date: testDate,
          timestamp: 8000,
          category: 'phone',
          description: 'Recarga Personal',
          amount: 500,
          paymentMethod: 'transfer'
        }
      ];

      const summary = calculateDailySummary(orders, expenses, testDate);

      // Total Revenue = 2000 + 3500 + 1500 + 2500 + 10000 + 15000 = 34500
      expect(summary.totalRevenue).toBe(34500);
      expect(summary.totalExpenses).toBe(1500);
      expect(summary.netProfit).toBe(33000);

      // Cash in Pocket = 2000 (cust cash) + 1500 (biz settled cash) - 1000 (exp cash) = 2500
      // CRITICAL: 10000 unsettled cash is NOT here!
      expect(summary.cashInPocket).toBe(2500);

      // Money in Account = 3500 (cust trans) + 2500 (biz settled trans) - 500 (exp trans) = 5500
      // CRITICAL: 15000 unsettled transfer is NOT here!
      expect(summary.moneyInAccount).toBe(5500);

      // Unsettled Revenue = 10000 + 15000 = 25000
      expect(summary.unsettledRevenue).toBe(25000);

      // Double-entry reconciliation check
      expect(summary.cashInPocket + summary.moneyInAccount + summary.unsettledRevenue).toBe(summary.netProfit);
    });
  });

  // =========================================================================
  // TASK 3: Batch Debt Settlement & WhatsApp Text Formatting
  // =========================================================================
  describe('Task 3: Batch Debt Settlement & WhatsApp Text Formatting', () => {
    const business: Business = {
      id: 'biz_heladeria',
      userId: 'u1',
      name: 'Heladería Grido Bolívar',
      phone: '2314667788',
      defaultPrices: {
        plantaUrbana: 1400,
        barrioCerca: 2100,
        barrioLejos: 2900
      },
      paymentCycle: 'weekly',
      active: true,
      createdAt: '2026-08-01'
    };

    it('aggregates multiple unsettled orders for a business and ignores settled or customer orders', () => {
      const orders: Order[] = [
        {
          id: 'ord_1',
          userId: 'u1',
          date: '2026-08-24',
          timestamp: 1000,
          businessId: 'biz_heladeria',
          businessName: 'Heladería Grido Bolívar',
          address: 'Av. San Martín 600',
          zone: 'planta_urbana',
          amount: 1400,
          paidBy: 'business',
          paymentMethod: 'transfer',
          settled: false
        },
        {
          id: 'ord_2',
          userId: 'u1',
          date: '2026-08-25',
          timestamp: 2000,
          businessId: 'biz_heladeria',
          businessName: 'Heladería Grido Bolívar',
          address: 'Barrio Pompeya Casa 12',
          zone: 'barrio_lejos',
          amount: 2900,
          paidBy: 'business',
          paymentMethod: 'transfer',
          settled: false
        },
        // Already settled order
        {
          id: 'ord_3_settled',
          userId: 'u1',
          date: '2026-08-25',
          timestamp: 2500,
          businessId: 'biz_heladeria',
          businessName: 'Heladería Grido Bolívar',
          address: 'Mitre 240',
          zone: 'planta_urbana',
          amount: 1400,
          paidBy: 'business',
          paymentMethod: 'transfer',
          settled: true
        },
        // Customer paid order from same business
        {
          id: 'ord_4_cust',
          userId: 'u1',
          date: '2026-08-26',
          timestamp: 3000,
          businessId: 'biz_heladeria',
          businessName: 'Heladería Grido Bolívar',
          address: 'Lavalle 510',
          zone: 'barrio_cerca',
          amount: 2100,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        },
        // Unsettled order from different business
        {
          id: 'ord_5_other',
          userId: 'u1',
          date: '2026-08-26',
          timestamp: 4000,
          businessId: 'biz_other',
          businessName: 'Kiosco Central',
          zone: 'planta_urbana',
          amount: 1200,
          paidBy: 'business',
          paymentMethod: 'cash',
          settled: false
        }
      ];

      const debt = calculateBusinessDebt(orders, 'biz_heladeria');
      expect(debt.unsettledOrdersCount).toBe(2);
      expect(debt.totalDebt).toBe(4300); // 1400 + 2900
      expect(debt.orders.map((o) => o.id)).toEqual(['ord_1', 'ord_2']);

      const allDebts = calculateAllBusinessesDebt([business], orders);
      expect(allDebts[0]?.totalDebt).toBe(4300);
      expect(allDebts[0]?.unsettledOrdersCount).toBe(2);
    });

    it('generates pristine WhatsApp settlement text with Argentine formatting and addresses', () => {
      const unsettledOrders: Order[] = [
        {
          id: 'ord_1',
          userId: 'u1',
          date: '2026-08-24',
          timestamp: 1000,
          businessId: 'biz_heladeria',
          businessName: 'Heladería Grido Bolívar',
          address: 'Av. San Martín 600',
          zone: 'planta_urbana',
          amount: 1400,
          paidBy: 'business',
          paymentMethod: 'transfer',
          settled: false
        },
        {
          id: 'ord_2',
          userId: 'u1',
          date: '2026-08-25',
          timestamp: 2000,
          businessId: 'biz_heladeria',
          businessName: 'Heladería Grido Bolívar',
          address: '', // Missing address edge case
          zone: 'barrio_lejos',
          amount: 2900,
          paidBy: 'business',
          paymentMethod: 'transfer',
          settled: false
        }
      ];

      const text = generateWhatsAppSettlementText(business, unsettledOrders);

      expect(text).toContain('🏍️ *CADETE OS - RESUMEN DE CUENTA*');
      expect(text).toContain('*Comercio:* Heladería Grido Bolívar');
      expect(text).toContain('*Viajes pendientes:* 2');
      expect(text).toContain('*TOTAL A LIQUIDAR:* $ 4.300');
      expect(text).toContain('• 24/08/2026 - Av. San Martín 600 ($ 1.400)');
      expect(text).toContain('• 25/08/2026 - Envío sin dirección ($ 2.900)');
      expect(text).toContain('_Generado automáticamente desde Cadete OS_');
    });

    it('formats Argentine phone numbers accurately for wa.me links', () => {
      const msg = 'Hola liquidación';

      // 10 digits without country code (Bolivar local phone: 2314-123456)
      const url1 = generateWhatsAppUrl('2314123456', msg);
      expect(url1).toBe(`https://wa.me/5492314123456?text=${encodeURIComponent(msg)}`);

      // 11 digits with leading 0 (02314123456)
      const url2 = generateWhatsAppUrl('02314123456', msg);
      expect(url2).toBe(`https://wa.me/5492314123456?text=${encodeURIComponent(msg)}`);

      // Formatted with spaces and dashes
      const url3 = generateWhatsAppUrl('+54 9 2314-123456', msg);
      expect(url3).toBe(`https://wa.me/5492314123456?text=${encodeURIComponent(msg)}`);

      // Empty or undefined phone
      const urlEmpty = generateWhatsAppUrl('', msg);
      expect(urlEmpty).toBe(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    });

    it('simulates batch settlement state transition and verifies debt clearing', () => {
      let orders: Order[] = [
        {
          id: 'ord_1',
          userId: 'u1',
          date: testDate,
          timestamp: 1000,
          businessId: 'biz_heladeria',
          businessName: 'Heladería Grido Bolívar',
          zone: 'planta_urbana',
          amount: 1400,
          paidBy: 'business',
          paymentMethod: 'cash',
          settled: false
        },
        {
          id: 'ord_2',
          userId: 'u1',
          date: testDate,
          timestamp: 2000,
          businessId: 'biz_heladeria',
          businessName: 'Heladería Grido Bolívar',
          zone: 'barrio_lejos',
          amount: 2900,
          paidBy: 'business',
          paymentMethod: 'cash',
          settled: false
        }
      ];

      // Pre-settlement
      let preSummary = calculateDailySummary(orders, [], testDate);
      expect(preSummary.cashInPocket).toBe(0);
      expect(preSummary.unsettledRevenue).toBe(4300);

      // Perform batch settlement
      const targetIds = ['ord_1', 'ord_2'];
      orders = orders.map((o) => {
        if (targetIds.includes(o.id)) {
          return { ...o, settled: true, settledAt: new Date().toISOString() };
        }
        return o;
      });

      // Post-settlement debt should be 0
      const debtAfter = calculateBusinessDebt(orders, 'biz_heladeria');
      expect(debtAfter.unsettledOrdersCount).toBe(0);
      expect(debtAfter.totalDebt).toBe(0);

      // Post-settlement cash in pocket should now contain the settled cash
      const postSummary = calculateDailySummary(orders, [], testDate);
      expect(postSummary.cashInPocket).toBe(4300);
      expect(postSummary.unsettledRevenue).toBe(0);
    });
  });

  // =========================================================================
  // TASK 4: Virtual Oil Odometer Edge Boundaries
  // =========================================================================
  describe('Task 4: Virtual Oil Odometer Edge Boundaries & Traffic Light Transitions', () => {
    const fixedReferenceDate = new Date('2026-08-26T12:00:00Z');
    const thresholds = { orders: 250, days: 30 };

    const createLastOilRecord = (daysAgo: number, snapshot: number): MaintenanceRecord => {
      const d = new Date(fixedReferenceDate);
      d.setDate(d.getDate() - daysAgo);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return {
        id: 'rec_oil',
        userId: 'u1',
        date: `${year}-${month}-${day}`,
        timestamp: d.getTime(),
        item: 'Aceite Castrol 20w50',
        cost: 15000,
        isOilChange: true,
        ordersSnapshot: snapshot
      };
    };

    // --- Order Boundary Tests (with days = 0) ---
    it('evaluates exactly 199 orders -> Verde (status: green)', () => {
      const record = createLastOilRecord(0, 100);
      const odo = calculateOilOdometer(299, record, thresholds, fixedReferenceDate); // 299 - 100 = 199
      expect(odo.ordersSinceLastChange).toBe(199);
      expect(odo.daysSinceLastChange).toBe(0);
      expect(odo.status).toBe('green');
    });

    it('evaluates exactly 200 orders -> Amarillo (status: yellow) (lower yellow threshold)', () => {
      const record = createLastOilRecord(0, 100);
      const odo = calculateOilOdometer(300, record, thresholds, fixedReferenceDate); // 300 - 100 = 200
      expect(odo.ordersSinceLastChange).toBe(200);
      expect(odo.daysSinceLastChange).toBe(0);
      expect(odo.status).toBe('yellow');
    });

    it('evaluates exactly 250 orders -> Amarillo (status: yellow) (upper yellow threshold)', () => {
      const record = createLastOilRecord(0, 100);
      const odo = calculateOilOdometer(350, record, thresholds, fixedReferenceDate); // 350 - 100 = 250
      expect(odo.ordersSinceLastChange).toBe(250);
      expect(odo.daysSinceLastChange).toBe(0);
      expect(odo.status).toBe('yellow');
    });

    it('evaluates exactly 251 orders -> Rojo (status: red) (red threshold exceeded)', () => {
      const record = createLastOilRecord(0, 100);
      const odo = calculateOilOdometer(351, record, thresholds, fixedReferenceDate); // 351 - 100 = 251
      expect(odo.ordersSinceLastChange).toBe(251);
      expect(odo.daysSinceLastChange).toBe(0);
      expect(odo.status).toBe('red');
    });

    // --- Day Boundary Tests (with orders = 0) ---
    it('evaluates exactly 24 days -> Verde (status: green)', () => {
      const record = createLastOilRecord(24, 100);
      const odo = calculateOilOdometer(100, record, thresholds, fixedReferenceDate); // 100 - 100 = 0 orders
      expect(odo.ordersSinceLastChange).toBe(0);
      expect(odo.daysSinceLastChange).toBe(24);
      expect(odo.status).toBe('green');
    });

    it('evaluates exactly 25 days -> Amarillo (status: yellow) (lower yellow days threshold)', () => {
      const record = createLastOilRecord(25, 100);
      const odo = calculateOilOdometer(100, record, thresholds, fixedReferenceDate);
      expect(odo.ordersSinceLastChange).toBe(0);
      expect(odo.daysSinceLastChange).toBe(25);
      expect(odo.status).toBe('yellow');
    });

    it('evaluates exactly 30 days -> Amarillo (status: yellow) (upper yellow days threshold)', () => {
      const record = createLastOilRecord(30, 100);
      const odo = calculateOilOdometer(100, record, thresholds, fixedReferenceDate);
      expect(odo.ordersSinceLastChange).toBe(0);
      expect(odo.daysSinceLastChange).toBe(30);
      expect(odo.status).toBe('yellow');
    });

    it('evaluates exactly 31 days -> Rojo (status: red) (red days threshold exceeded)', () => {
      const record = createLastOilRecord(31, 100);
      const odo = calculateOilOdometer(100, record, thresholds, fixedReferenceDate);
      expect(odo.ordersSinceLastChange).toBe(0);
      expect(odo.daysSinceLastChange).toBe(31);
      expect(odo.status).toBe('red');
    });

    // --- Cross / Whichever Exceeded First Tests ---
    it('triggers Rojo immediately if orders exceed 250 even if days = 2', () => {
      const record = createLastOilRecord(2, 0);
      const odo = calculateOilOdometer(260, record, thresholds, fixedReferenceDate);
      expect(odo.ordersSinceLastChange).toBe(260);
      expect(odo.daysSinceLastChange).toBe(2);
      expect(odo.status).toBe('red');
    });

    it('triggers Rojo immediately if days exceed 30 even if orders = 15', () => {
      const record = createLastOilRecord(35, 0);
      const odo = calculateOilOdometer(15, record, thresholds, fixedReferenceDate);
      expect(odo.ordersSinceLastChange).toBe(15);
      expect(odo.daysSinceLastChange).toBe(35);
      expect(odo.status).toBe('red');
    });

    it('triggers Amarillo if orders = 210 and days = 10', () => {
      const record = createLastOilRecord(10, 0);
      const odo = calculateOilOdometer(210, record, thresholds, fixedReferenceDate);
      expect(odo.status).toBe('yellow');
    });

    it('triggers Amarillo if orders = 50 and days = 28', () => {
      const record = createLastOilRecord(28, 0);
      const odo = calculateOilOdometer(50, record, thresholds, fixedReferenceDate);
      expect(odo.status).toBe('yellow');
    });

    it('resets cleanly when an oil change record is created with current order count', () => {
      // Prior state: 300 orders, red status
      const oldRecord = createLastOilRecord(40, 0);
      const preReset = calculateOilOdometer(300, oldRecord, thresholds, fixedReferenceDate);
      expect(preReset.status).toBe('red');

      // New oil change at 300 orders
      const newRecord = createLastOilRecord(0, 300);
      const postReset = calculateOilOdometer(300, newRecord, thresholds, fixedReferenceDate);
      expect(postReset.ordersSinceLastChange).toBe(0);
      expect(postReset.daysSinceLastChange).toBe(0);
      expect(postReset.status).toBe('green');
    });
  });
});
