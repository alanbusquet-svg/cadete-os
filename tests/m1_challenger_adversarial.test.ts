import { describe, it, expect } from 'vitest';
import {
  calculateDailySummary,
  calculateWeeklySummary,
} from '../src/utils/calculations';
import {
  sanitizeArgentinePhone,
  buildCustomerWhatsAppUrl,
} from '../src/utils/whatsapp';
import type { Order, Expense } from '../src/types';

describe('Adversarial Challenge 1 — Argentine Phone Sanitization & WhatsApp URLs', () => {
  describe('sanitizeArgentinePhone edge cases', () => {
    it('handles standard 10-digit numbers (Bolívar, CABA, Córdoba, Rosario)', () => {
      expect(sanitizeArgentinePhone('2314551234')).toBe('5492314551234'); // Bolívar (4-digit area code)
      expect(sanitizeArgentinePhone('1144445555')).toBe('5491144445555'); // CABA (2-digit area code)
      expect(sanitizeArgentinePhone('3514445555')).toBe('5493514445555'); // Córdoba (3-digit area code)
    });

    it('strips leading 0 for national intercity format (02314..., 011...)', () => {
      expect(sanitizeArgentinePhone('02314551234')).toBe('5492314551234');
      expect(sanitizeArgentinePhone('01144445555')).toBe('5491144445555');
      expect(sanitizeArgentinePhone('02214445555')).toBe('5492214445555');
    });

    it('removes local 15 mobile prefix with 2-digit, 3-digit, and 4-digit area codes', () => {
      // 2-digit area code + 15 + 8 digits (12 digits total): 11 15 4444 5555
      expect(sanitizeArgentinePhone('111544445555')).toBe('5491144445555');
      expect(sanitizeArgentinePhone('11 15 4444-5555')).toBe('5491144445555');

      // 3-digit area code + 15 + 7 digits (12 digits total): 221 15 444 5555
      expect(sanitizeArgentinePhone('221154445555')).toBe('5492214445555');
      expect(sanitizeArgentinePhone('221 15 444-5555')).toBe('5492214445555');

      // 4-digit area code + 15 + 6 digits (12 digits total): 2314 15 551234
      expect(sanitizeArgentinePhone('231415551234')).toBe('5492314551234');
      expect(sanitizeArgentinePhone('2314 15 55-1234')).toBe('5492314551234');
    });

    it('handles combined 0 + area code + 15 + local number', () => {
      // 0 + 2314 + 15 + 551234 = 13 digits -> strips 0 -> 12 digits -> strips 15 -> 10 digits -> 549...
      expect(sanitizeArgentinePhone('0231415551234')).toBe('5492314551234');
      expect(sanitizeArgentinePhone('(02314) 15-55-1234')).toBe('5492314551234');
      expect(sanitizeArgentinePhone('(011) 15-4444-5555')).toBe('5491144445555');
      expect(sanitizeArgentinePhone('(0221) 15-444-5555')).toBe('5492214445555');
    });

    it('handles international format with +54, with and without mobile 9', () => {
      // Already complete +54 9 (13 digits)
      expect(sanitizeArgentinePhone('+54 9 2314 551234')).toBe('5492314551234');
      expect(sanitizeArgentinePhone('+54-9-11-4444-5555')).toBe('5491144445555');

      // +54 without 9 (12 digits)
      expect(sanitizeArgentinePhone('+54 2314 551234')).toBe('5492314551234');
      expect(sanitizeArgentinePhone('+54 11 4444 5555')).toBe('5491144445555');
    });

    it('handles heavily formatted inputs with spaces, parentheses, slashes, and dots', () => {
      expect(sanitizeArgentinePhone(' (2314) / 55.12.34 ')).toBe('5492314551234');
      expect(sanitizeArgentinePhone('+54 (02314) 55-1234')).toBe('5492314551234');
    });

    it('handles empty, whitespace-only, nullish, and non-numeric inputs safely', () => {
      expect(sanitizeArgentinePhone('')).toBe('');
      expect(sanitizeArgentinePhone('   ')).toBe('');
      expect(sanitizeArgentinePhone(undefined)).toBe('');
      expect(sanitizeArgentinePhone('sin telefono')).toBe('');
      expect(sanitizeArgentinePhone('N/A')).toBe('');
      expect(sanitizeArgentinePhone('---')).toBe('');
    });
  });

  describe('buildCustomerWhatsAppUrl and generateWhatsAppUrl', () => {
    it('generates standard 1-touch message URL with encoded motorcycle emoji', () => {
      const url = buildCustomerWhatsAppUrl('2314-551234');
      expect(url).toBe(
        'https://wa.me/5492314551234?text=Buenas!%20Estoy%20afuera%20con%20tu%20pedido%20%F0%9F%9B%B5'
      );
    });

    it('handles custom messages with accents, newlines, and special characters', () => {
      const msg = 'Hola! Llegué con el pedido de Pizzería Don Antonio.\n¿Podés salir? 🍕';
      const url = buildCustomerWhatsAppUrl('02314-15-551234', msg);
      expect(url).toBe(`https://wa.me/5492314551234?text=${encodeURIComponent(msg)}`);
    });

    it('falls back to contact chooser wa.me/?text= when phone is empty or non-numeric', () => {
      expect(buildCustomerWhatsAppUrl('')).toBe(
        'https://wa.me/?text=Buenas!%20Estoy%20afuera%20con%20tu%20pedido%20%F0%9F%9B%B5'
      );
      expect(buildCustomerWhatsAppUrl('   ')).toBe(
        'https://wa.me/?text=Buenas!%20Estoy%20afuera%20con%20tu%20pedido%20%F0%9F%9B%B5'
      );
      expect(buildCustomerWhatsAppUrl('no-digits')).toBe(
        'https://wa.me/?text=Buenas!%20Estoy%20afuera%20con%20tu%20pedido%20%F0%9F%9B%B5'
      );
    });
  });
});

describe('Adversarial Challenge 2 — Weekly Financial Summary Stress Tests', () => {
  it('correctly computes 7-day window across month boundary', () => {
    // Reference date: 2026-03-03 -> Window should be 2026-02-25 to 2026-03-03
    const summary = calculateWeeklySummary([], [], '2026-03-03');
    expect(summary.startDate).toBe('2026-02-25');
    expect(summary.endDate).toBe('2026-03-03');
    expect(summary.days).toHaveLength(7);
    expect(summary.days.map((d) => d.date)).toEqual([
      '2026-02-25',
      '2026-02-26',
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
      '2026-03-03'
    ]);
  });

  it('correctly handles leap day (Feb 29) in a leap year (2024)', () => {
    // Reference date: 2024-03-02 -> Window should include 2024-02-29
    const summary = calculateWeeklySummary([], [], '2024-03-02');
    expect(summary.startDate).toBe('2024-02-25');
    expect(summary.endDate).toBe('2024-03-02');
    expect(summary.days).toHaveLength(7);
    expect(summary.days.map((d) => d.date)).toEqual([
      '2024-02-25',
      '2024-02-26',
      '2024-02-27',
      '2024-02-28',
      '2024-02-29', // Leap day present!
      '2024-03-01',
      '2024-03-02'
    ]);
  });

  it('correctly handles non-leap year (Feb 28 to Mar 1 in 2025)', () => {
    // Reference date: 2025-03-02 -> Window should NOT include Feb 29
    const summary = calculateWeeklySummary([], [], '2025-03-02');
    expect(summary.startDate).toBe('2025-02-24');
    expect(summary.endDate).toBe('2025-03-02');
    expect(summary.days).toHaveLength(7);
    expect(summary.days.map((d) => d.date)).toEqual([
      '2025-02-24',
      '2025-02-25',
      '2025-02-26',
      '2025-02-27',
      '2025-02-28',
      '2025-03-01',
      '2025-03-02'
    ]);
  });

  it('correctly computes 7-day window across year rollover (Dec 31 -> Jan 1)', () => {
    // Reference date: 2026-01-03 -> Window should span 2025-12-28 to 2026-01-03
    const summary = calculateWeeklySummary([], [], '2026-01-03');
    expect(summary.startDate).toBe('2025-12-28');
    expect(summary.endDate).toBe('2026-01-03');
    expect(summary.days).toHaveLength(7);
    expect(summary.days.map((d) => d.date)).toEqual([
      '2025-12-28',
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03'
    ]);
  });

  it('aggregates unordered orders and expenses, missing days, and ignores out-of-range dates', () => {
    const refDate = '2026-08-26';

    // Unordered orders spanning within and outside window
    const orders: Order[] = [
      {
        id: 'ord_outside_future',
        userId: 'u1',
        date: '2026-08-27', // Future (outside)
        timestamp: 9000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 9999,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'ord_26',
        userId: 'u1',
        date: '2026-08-26', // d
        timestamp: 8000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 4000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'ord_outside_past',
        userId: 'u1',
        date: '2026-08-19', // d-7 (outside)
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 8888,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'ord_20',
        userId: 'u1',
        date: '2026-08-20', // d-6 (start of window)
        timestamp: 2000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 3000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'ord_22_a',
        userId: 'u1',
        date: '2026-08-22', // d-4
        timestamp: 3000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 1500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'ord_22_b',
        userId: 'u1',
        date: '2026-08-22', // d-4 (second order on same day)
        timestamp: 3100,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 2500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      }
    ];

    const expenses: Expense[] = [
      {
        id: 'exp_22',
        userId: 'u1',
        date: '2026-08-22',
        timestamp: 3200,
        category: 'fuel',
        description: 'Nafta',
        amount: 1000,
        paymentMethod: 'cash'
      },
      {
        id: 'exp_26',
        userId: 'u1',
        date: '2026-08-26',
        timestamp: 8200,
        category: 'food',
        description: 'Almuerzo',
        amount: 2000,
        paymentMethod: 'cash'
      },
      {
        id: 'exp_outside',
        userId: 'u1',
        date: '2026-08-10', // Way outside
        timestamp: 500,
        category: 'fuel',
        description: 'Nafta vieja',
        amount: 5000,
        paymentMethod: 'cash'
      }
    ];

    const summary = calculateWeeklySummary(orders, expenses, refDate);

    // Total in window:
    // 2026-08-20: 1 order ($3000), 0 expenses -> net $3000
    // 2026-08-21: 0 orders ($0), 0 expenses -> net $0
    // 2026-08-22: 2 orders ($4000), 1 expense ($1000) -> net $3000
    // 2026-08-23: 0 orders ($0), 0 expenses -> net $0
    // 2026-08-24: 0 orders ($0), 0 expenses -> net $0
    // 2026-08-25: 0 orders ($0), 0 expenses -> net $0
    // 2026-08-26: 1 order ($4000), 1 expense ($2000) -> net $2000

    expect(summary.totalOrders).toBe(4);
    expect(summary.totalRevenue).toBe(11000); // 3000 + 4000 + 4000
    expect(summary.totalExpenses).toBe(3000); // 1000 + 2000
    expect(summary.netProfit).toBe(8000); // 11000 - 3000
    expect(summary.averageDailyNetProfit).toBe(Math.round(8000 / 7)); // 1143

    // Check individual day breakdown
    const day20 = summary.days.find((d) => d.date === '2026-08-20');
    expect(day20?.ordersCount).toBe(1);
    expect(day20?.revenue).toBe(3000);

    const day21 = summary.days.find((d) => d.date === '2026-08-21');
    expect(day21?.ordersCount).toBe(0);
    expect(day21?.revenue).toBe(0);
    expect(day21?.netProfit).toBe(0);

    const day22 = summary.days.find((d) => d.date === '2026-08-22');
    expect(day22?.ordersCount).toBe(2);
    expect(day22?.revenue).toBe(4000);
    expect(day22?.expenses).toBe(1000);
    expect(day22?.netProfit).toBe(3000);
  });
});

describe('Adversarial Challenge 3 — Starting Cash Float Edge Cases', () => {
  const testDate = '2026-08-26';

  it('handles startingCash = 0 exactly with cash collections and expenses', () => {
    const orders: Order[] = [
      {
        id: 'o1',
        userId: 'u1',
        date: testDate,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 3000,
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
        timestamp: 1500,
        category: 'fuel',
        description: 'Nafta',
        amount: 1000,
        paymentMethod: 'cash'
      }
    ];

    const summary = calculateDailySummary(orders, expenses, testDate, 0);

    expect(summary.startingCash).toBe(0);
    expect(summary.realCashEarned).toBe(2000); // 3000 - 1000
    expect(summary.cashInPocket).toBe(2000); // 0 + 2000
    expect(summary.netProfit).toBe(2000);
  });

  it('handles startingCash > total collected (e.g. starting with $50.000 float)', () => {
    const orders: Order[] = [
      {
        id: 'o1',
        userId: 'u1',
        date: testDate,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 4000,
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
        timestamp: 1500,
        category: 'food',
        description: 'Almuerzo',
        amount: 1500,
        paymentMethod: 'cash'
      }
    ];

    const startingCash = 50000;
    const summary = calculateDailySummary(orders, expenses, testDate, startingCash);

    expect(summary.startingCash).toBe(50000);
    expect(summary.realCashEarned).toBe(2500); // 4000 - 1500
    expect(summary.cashInPocket).toBe(52500); // 50000 + 2500
    expect(summary.netProfit).toBe(2500);
  });

  it('handles negative startingCash (deficit carried forward) without crashing', () => {
    const orders: Order[] = [
      {
        id: 'o1',
        userId: 'u1',
        date: testDate,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 5000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      }
    ];
    const expenses: Expense[] = [];

    const startingCash = -2000;
    const summary = calculateDailySummary(orders, expenses, testDate, startingCash);

    expect(summary.startingCash).toBe(-2000);
    expect(summary.realCashEarned).toBe(5000);
    expect(summary.cashInPocket).toBe(3000); // -2000 + 5000 = 3000
  });

  it('isolates cashInPocket when expenses exceed startingCash + cashCollected (negative pocket)', () => {
    const orders: Order[] = [
      {
        id: 'o1',
        userId: 'u1',
        date: testDate,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 1000,
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
        timestamp: 1500,
        category: 'puncture',
        description: 'Taller mecánico',
        amount: 10000,
        paymentMethod: 'cash'
      }
    ];

    const startingCash = 3000;
    const summary = calculateDailySummary(orders, expenses, testDate, startingCash);

    // realCashEarned = 1000 - 10000 = -9000
    // cashInPocket = 3000 + (-9000) = -6000
    expect(summary.realCashEarned).toBe(-9000);
    expect(summary.cashInPocket).toBe(-6000);
    expect(summary.netProfit).toBe(-9000);
  });

  it('correctly keeps unsettled business orders out of cashCollected and cashInPocket', () => {
    const orders: Order[] = [
      {
        id: 'o_unsettled',
        userId: 'u1',
        date: testDate,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Pizzería',
        zone: 'planta_urbana',
        amount: 12000,
        paidBy: 'business',
        paymentMethod: 'cash',
        settled: false // Account receivable - NOT in cash yet!
      },
      {
        id: 'o_customer',
        userId: 'u1',
        date: testDate,
        timestamp: 1100,
        businessId: 'b1',
        businessName: 'Pizzería',
        zone: 'planta_urbana',
        amount: 2000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      }
    ];

    const startingCash = 5000;
    const summary = calculateDailySummary(orders, [], testDate, startingCash);

    expect(summary.unsettledRevenue).toBe(12000);
    expect(summary.realCashEarned).toBe(2000);
    expect(summary.cashInPocket).toBe(7000); // 5000 + 2000 (unsettled $12.000 is not in pocket)
    expect(summary.totalRevenue).toBe(14000);
    expect(summary.netProfit).toBe(14000);
  });
});
