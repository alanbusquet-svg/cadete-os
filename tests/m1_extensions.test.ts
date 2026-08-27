import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDailySummary,
  calculateShiftDurationHours,
  calculateHourlyProfitRate,
  calculateBusinessProfitability,
  calculateGoalProgress,
  calculateWeeklySummary
} from '../src/utils/calculations';
import {
  buildCustomerWhatsAppUrl,
  sanitizeArgentinePhone
} from '../src/utils/whatsapp';
import { formatDurationHM } from '../src/utils/formatting';
import { storage } from '../src/lib/storage';
import type { Order, Expense, Business, Shift } from '../src/types';

describe('M1 Extensions — Starting Cash Float (R2)', () => {
  const sampleDate = '2026-08-26';

  const orders: Order[] = [
    {
      id: 'ord_1',
      userId: 'u1',
      date: sampleDate,
      timestamp: 1000,
      businessId: 'biz_1',
      businessName: 'Pizzería Don Antonio',
      zone: 'planta_urbana',
      amount: 2000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'ord_2',
      userId: 'u1',
      date: sampleDate,
      timestamp: 2000,
      businessId: 'biz_1',
      businessName: 'Pizzería Don Antonio',
      zone: 'barrio_cerca',
      amount: 3000,
      paidBy: 'customer',
      paymentMethod: 'transfer',
      settled: true
    }
  ];

  const expenses: Expense[] = [
    {
      id: 'exp_1',
      userId: 'u1',
      date: sampleDate,
      timestamp: 1500,
      category: 'fuel',
      description: 'Nafta Súper',
      amount: 500,
      paymentMethod: 'cash'
    }
  ];

  it('calculates cashInPocket including startingCash and isolates realCashEarned', () => {
    const startingCash = 5000;
    const summary = calculateDailySummary(orders, expenses, sampleDate, startingCash);

    // Total Cash Collected = $2.000
    // Total Cash Expenses = $500
    // Real Cash Earned = $2.000 - $500 = $1.500
    // Cash in Pocket = $5.000 (starting float) + $1.500 (real cash earned) = $6.500
    expect(summary.startingCash).toBe(5000);
    expect(summary.realCashEarned).toBe(1500);
    expect(summary.cashInPocket).toBe(6500);
    expect(summary.netProfit).toBe(4500); // (2000 + 3000) - 500
  });

  it('defaults startingCash to 0 when not provided (backward compatibility)', () => {
    const summary = calculateDailySummary(orders, expenses, sampleDate);

    expect(summary.startingCash).toBe(0);
    expect(summary.realCashEarned).toBe(1500);
    expect(summary.cashInPocket).toBe(1500);
  });

  it('handles negative realCashEarned when cash expenses exceed cash collected', () => {
    const heavyCashExpense: Expense[] = [
      {
        id: 'exp_heavy',
        userId: 'u1',
        date: sampleDate,
        timestamp: 1500,
        category: 'puncture',
        description: 'Cubierta nueva',
        amount: 8000,
        paymentMethod: 'cash'
      }
    ];

    const startingCash = 10000;
    const summary = calculateDailySummary(orders, heavyCashExpense, sampleDate, startingCash);

    // Cash collected = $2.000, Cash expenses = $8.000 -> Real cash earned = -$6.000
    // Cash in pocket = 10.000 - 6.000 = 4.000
    expect(summary.realCashEarned).toBe(-6000);
    expect(summary.cashInPocket).toBe(4000);
  });
});

describe('M1 Extensions — WhatsApp "Estoy afuera" (R3)', () => {
  it('sanitizes various Argentine phone formats accurately', () => {
    // 10 digits local
    expect(sanitizeArgentinePhone('2314551234')).toBe('5492314551234');
    // 11 digits with leading 0
    expect(sanitizeArgentinePhone('02314551234')).toBe('5492314551234');
    // With 15 local mobile prefix (2314 15 551234)
    expect(sanitizeArgentinePhone('231415551234')).toBe('5492314551234');
    expect(sanitizeArgentinePhone('2314 15 551234')).toBe('5492314551234');
    // Buenos Aires (11 15 12345678)
    expect(sanitizeArgentinePhone('11 15 1234-5678')).toBe('5491112345678');
    // Full E.164 already
    expect(sanitizeArgentinePhone('+54 9 2314 551234')).toBe('5492314551234');
    // Empty or invalid
    expect(sanitizeArgentinePhone('')).toBe('');
    expect(sanitizeArgentinePhone(undefined)).toBe('');
  });

  it('builds wa.me URL with default "Estoy afuera" message', () => {
    const url = buildCustomerWhatsAppUrl('2314-551234');
    expect(url).toContain('https://wa.me/5492314551234?text=');
    expect(url).toContain(encodeURIComponent('Buenas! Estoy afuera con tu pedido 🛵'));
  });

  it('builds wa.me URL with custom message override', () => {
    const url = buildCustomerWhatsAppUrl('2314551234', 'Ya llegué a tu puerta!');
    expect(url).toContain('https://wa.me/5492314551234?text=');
    expect(url).toContain(encodeURIComponent('Ya llegué a tu puerta!'));
  });

  it('falls back to wa.me without phone number if phone is empty', () => {
    const url = buildCustomerWhatsAppUrl('');
    expect(url).toBe(`https://wa.me/?text=${encodeURIComponent('Buenas! Estoy afuera con tu pedido 🛵')}`);
  });
});

describe('M1 Extensions — Business Profitability Metrics (R4)', () => {
  const businesses: Business[] = [
    {
      id: 'biz_low',
      userId: 'u1',
      name: 'Kiosco Rápido',
      defaultPrices: { plantaUrbana: 1000, barrioCerca: 1200, barrioLejos: 1500 },
      paymentCycle: 'daily',
      active: true,
      createdAt: '2026-08-01'
    },
    {
      id: 'biz_high',
      userId: 'u1',
      name: 'Pizzería Premium',
      defaultPrices: { plantaUrbana: 2500, barrioCerca: 3500, barrioLejos: 4500 },
      paymentCycle: 'weekly',
      active: true,
      createdAt: '2026-08-01'
    },
    {
      id: 'biz_empty',
      userId: 'u1',
      name: 'Comercio Sin Viajes',
      defaultPrices: { plantaUrbana: 1500, barrioCerca: 2000, barrioLejos: 2500 },
      paymentCycle: 'weekly',
      active: true,
      createdAt: '2026-08-01'
    }
  ];

  const orders: Order[] = [
    // Pizzería Premium: 2 orders -> $2500 + $3500 = $6000 total -> avg $3000
    {
      id: 'o1',
      userId: 'u1',
      date: '2026-08-20',
      timestamp: 1000,
      businessId: 'biz_high',
      businessName: 'Pizzería Premium',
      zone: 'planta_urbana',
      amount: 2500,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o2',
      userId: 'u1',
      date: '2026-08-21',
      timestamp: 2000,
      businessId: 'biz_high',
      businessName: 'Pizzería Premium',
      zone: 'barrio_cerca',
      amount: 3500,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    // Kiosco Rápido: 4 orders -> $1000 x 4 = $4000 total -> avg $1000
    {
      id: 'o3',
      userId: 'u1',
      date: '2026-08-22',
      timestamp: 3000,
      businessId: 'biz_low',
      businessName: 'Kiosco Rápido',
      zone: 'planta_urbana',
      amount: 1000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o4',
      userId: 'u1',
      date: '2026-08-23',
      timestamp: 4000,
      businessId: 'biz_low',
      businessName: 'Kiosco Rápido',
      zone: 'planta_urbana',
      amount: 1000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o5',
      userId: 'u1',
      date: '2026-08-24',
      timestamp: 5000,
      businessId: 'biz_low',
      businessName: 'Kiosco Rápido',
      zone: 'planta_urbana',
      amount: 1000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o6',
      userId: 'u1',
      date: '2026-08-25',
      timestamp: 6000,
      businessId: 'biz_low',
      businessName: 'Kiosco Rápido',
      zone: 'planta_urbana',
      amount: 1000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    }
  ];

  it('calculates average profit per trip and sorts descending by profitability', () => {
    const profitability = calculateBusinessProfitability(businesses, orders);

    expect(profitability).toHaveLength(3);
    // Rank 1: Pizzería Premium (Avg $3000)
    expect(profitability[0]?.businessId).toBe('biz_high');
    expect(profitability[0]?.totalOrders).toBe(2);
    expect(profitability[0]?.totalRevenue).toBe(6000);
    expect(profitability[0]?.averageProfitPerTrip).toBe(3000);

    // Rank 2: Kiosco Rápido (Avg $1000)
    expect(profitability[1]?.businessId).toBe('biz_low');
    expect(profitability[1]?.totalOrders).toBe(4);
    expect(profitability[1]?.totalRevenue).toBe(4000);
    expect(profitability[1]?.averageProfitPerTrip).toBe(1000);

    // Rank 3: Comercio Sin Viajes (Avg $0)
    expect(profitability[2]?.businessId).toBe('biz_empty');
    expect(profitability[2]?.totalOrders).toBe(0);
    expect(profitability[2]?.totalRevenue).toBe(0);
    expect(profitability[2]?.averageProfitPerTrip).toBe(0);
  });
});

describe('M1 Extensions — Daily Profit Goal Progress (R5)', () => {
  it('calculates partial progress towards goal', () => {
    const progress = calculateGoalProgress(15000, 30000);

    expect(progress.targetGoal).toBe(30000);
    expect(progress.currentNetProfit).toBe(15000);
    expect(progress.percentage).toBe(50);
    expect(progress.isReached).toBe(false);
    expect(progress.remainingAmount).toBe(15000);
  });

  it('identifies when goal is exactly reached', () => {
    const progress = calculateGoalProgress(25000, 25000);

    expect(progress.targetGoal).toBe(25000);
    expect(progress.percentage).toBe(100);
    expect(progress.isReached).toBe(true);
    expect(progress.remainingAmount).toBe(0);
  });

  it('handles exceeding the daily goal', () => {
    const progress = calculateGoalProgress(45000, 30000);

    expect(progress.targetGoal).toBe(30000);
    expect(progress.percentage).toBe(150);
    expect(progress.isReached).toBe(true);
    expect(progress.remainingAmount).toBe(0);
  });

  it('handles 0 or undefined dailyGoal gracefully', () => {
    const progress = calculateGoalProgress(12000, undefined);

    expect(progress.targetGoal).toBe(0);
    expect(progress.percentage).toBe(0);
    expect(progress.isReached).toBe(false);
    expect(progress.remainingAmount).toBe(0);
  });

  it('handles negative net profit (losses) without negative percentage', () => {
    const progress = calculateGoalProgress(-5000, 20000);

    expect(progress.currentNetProfit).toBe(-5000);
    expect(progress.percentage).toBe(0);
    expect(progress.isReached).toBe(false);
    expect(progress.remainingAmount).toBe(25000);
  });
});

describe('M1 Extensions — Shifts & Hourly Profit Rate (R6)', () => {
  it('calculates standard same-day shift duration', () => {
    // 09:00 to 14:30 = 5.5 hours
    const duration = calculateShiftDurationHours('09:00', '14:30');
    expect(duration).toBe(5.5);
  });

  it('calculates overnight shift duration crossing midnight', () => {
    // 21:00 to 03:00 = 6.0 hours (3 hours before midnight + 3 hours after)
    const duration = calculateShiftDurationHours('21:00', '03:00');
    expect(duration).toBe(6.0);

    // 22:30 to 01:15 = 2.75 hours (1.5 hours + 1.25 hours)
    const duration2 = calculateShiftDurationHours('22:30', '01:15');
    expect(duration2).toBe(2.75);
  });

  it('returns 0 for missing, invalid, or equal start/end times', () => {
    expect(calculateShiftDurationHours(undefined, '14:00')).toBe(0);
    expect(calculateShiftDurationHours('10:00', undefined)).toBe(0);
    expect(calculateShiftDurationHours('', '')).toBe(0);
    expect(calculateShiftDurationHours('12:00', '12:00')).toBe(0);
  });

  it('calculates hourly profit rate ($/hr) accurately with division-by-zero protection', () => {
    // $24.000 in 6 hours = $4.000 / hr
    expect(calculateHourlyProfitRate(24000, 6)).toBe(4000);

    // $15.500 in 3.5 hours = $4.429 / hr (rounded)
    expect(calculateHourlyProfitRate(15500, 3.5)).toBe(4429);

    // Division by zero guard: 0 hours -> 0 $/hr
    expect(calculateHourlyProfitRate(10000, 0)).toBe(0);
    expect(calculateHourlyProfitRate(10000, -2)).toBe(0);
  });

  it('formats duration into clean "Xh Ym" text', () => {
    expect(formatDurationHM(5.5)).toBe('5h 30m');
    expect(formatDurationHM(1)).toBe('1h 0m');
    expect(formatDurationHM(0.75)).toBe('0h 45m');
    expect(formatDurationHM(0)).toBe('0h 0m');
  });
});

describe('M1 Extensions — Weekly Financial Summary (R7)', () => {
  const referenceDate = '2026-08-26';

  const orders: Order[] = [
    // 2026-08-20 (d-6): $2000
    {
      id: 'o_20',
      userId: 'u1',
      date: '2026-08-20',
      timestamp: 1000,
      businessId: 'b1',
      businessName: 'Biz',
      zone: 'planta_urbana',
      amount: 2000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    // 2026-08-24 (d-2): $3500
    {
      id: 'o_24',
      userId: 'u1',
      date: '2026-08-24',
      timestamp: 2000,
      businessId: 'b1',
      businessName: 'Biz',
      zone: 'planta_urbana',
      amount: 3500,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    // 2026-08-26 (d): $5000
    {
      id: 'o_26',
      userId: 'u1',
      date: '2026-08-26',
      timestamp: 3000,
      businessId: 'b1',
      businessName: 'Biz',
      zone: 'planta_urbana',
      amount: 5000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    // Outside window: 2026-08-15
    {
      id: 'o_old',
      userId: 'u1',
      date: '2026-08-15',
      timestamp: 4000,
      businessId: 'b1',
      businessName: 'Biz',
      zone: 'planta_urbana',
      amount: 9999,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    }
  ];

  const expenses: Expense[] = [
    // 2026-08-24: $1000
    {
      id: 'e_24',
      userId: 'u1',
      date: '2026-08-24',
      timestamp: 2500,
      category: 'fuel',
      description: 'Nafta',
      amount: 1000,
      paymentMethod: 'cash'
    },
    // 2026-08-26: $1500
    {
      id: 'e_26',
      userId: 'u1',
      date: '2026-08-26',
      timestamp: 3500,
      category: 'food',
      description: 'Almuerzo',
      amount: 1500,
      paymentMethod: 'cash'
    }
  ];

  it('aggregates 7-day window [d-6, d] and returns correct totals and daily breakdown', () => {
    const weekly = calculateWeeklySummary(orders, expenses, referenceDate);

    expect(weekly.startDate).toBe('2026-08-20');
    expect(weekly.endDate).toBe('2026-08-26');
    expect(weekly.days).toHaveLength(7);

    // Total Orders in 7 days = 1 (20th) + 1 (24th) + 1 (26th) = 3
    expect(weekly.totalOrders).toBe(3);
    // Total Revenue = 2000 + 3500 + 5000 = 10500
    expect(weekly.totalRevenue).toBe(10500);
    // Total Expenses = 1000 + 1500 = 2500
    expect(weekly.totalExpenses).toBe(2500);
    // Net Profit = 10500 - 2500 = 8000
    expect(weekly.netProfit).toBe(8000);
    // Average Daily Net Profit = 8000 / 7 = 1143 (rounded)
    expect(weekly.averageDailyNetProfit).toBe(1143);
  });
});

describe('M1 Extensions — Shift Storage CRUD & Backup Resilience', () => {
  const userId = 'user_test_shifts';

  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves shifts per user', () => {
    const shift1: Shift = {
      id: 'sh_1',
      userId,
      date: '2026-08-26',
      startTime: '09:00',
      endTime: '15:00',
      startingCash: 5000,
      status: 'completed',
      createdAt: 1000
    };

    storage.saveShift(userId, shift1);

    const retrieved = storage.getShiftByDate(userId, '2026-08-26');
    expect(retrieved).toBeDefined();
    expect(retrieved?.startingCash).toBe(5000);
    expect(retrieved?.status).toBe('completed');
  });

  it('updates existing shift for the same date or ID without duplicating', () => {
    const shift1: Shift = {
      id: 'sh_1',
      userId,
      date: '2026-08-26',
      startTime: '09:00',
      startingCash: 2000,
      status: 'in_progress',
      createdAt: 1000
    };
    storage.saveShift(userId, shift1);

    const updatedShift: Shift = {
      ...shift1,
      endTime: '17:00',
      status: 'completed'
    };
    storage.saveShift(userId, updatedShift);

    const allShifts = storage.getShifts(userId);
    expect(allShifts).toHaveLength(1);
    expect(allShifts[0]?.endTime).toBe('17:00');
    expect(allShifts[0]?.status).toBe('completed');
  });

  it('includes shifts in exportAll and restores them in importAll', () => {
    const shift: Shift = {
      id: 'sh_export',
      userId,
      date: '2026-08-26',
      startTime: '10:00',
      endTime: '18:00',
      startingCash: 4000,
      status: 'completed',
      createdAt: 1000
    };
    storage.saveShift(userId, shift);

    const backupJson = storage.exportAll(userId);
    expect(backupJson).toContain('shifts');
    expect(backupJson).toContain('sh_export');

    // Clear and restore
    localStorage.clear();
    const success = storage.importAll(userId, backupJson);
    expect(success).toBe(true);

    const restoredShift = storage.getShiftByDate(userId, '2026-08-26');
    expect(restoredShift?.id).toBe('sh_export');
    expect(restoredShift?.startingCash).toBe(4000);
  });
});
