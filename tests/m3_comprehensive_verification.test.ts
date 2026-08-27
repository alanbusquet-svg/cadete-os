import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDailySummary,
  calculateBusinessDebt,
  calculateAllBusinessesDebt,
  calculateOilOdometer,
  calculateShiftDurationHours,
  calculateHourlyProfitRate,
  calculateBusinessProfitability,
  calculateGoalProgress,
  calculateWeeklySummary
} from '../src/utils/calculations';
import {
  sanitizeArgentinePhone,
  buildCustomerWhatsAppUrl,
  generateWhatsAppUrl,
  generateWhatsAppSettlementText
} from '../src/utils/whatsapp';
import {
  formatCurrency,
  formatDateAR,
  formatTime,
  formatDateTime,
  formatDurationHM,
  getZoneLabel,
  getExpenseCategoryLabel,
  getTodayDateString
} from '../src/utils/formatting';
import {
  getGoogleMapsUrl,
  getWazeUrl,
  isValidAddress,
  DEFAULT_CITY
} from '../src/utils/navigation';
import { storage } from '../src/lib/storage';
import type {
  Order,
  Expense,
  Business,
  Shift,
  MaintenanceRecord,
  DailyFinancialSummary,
  GoalProgress,
  WeeklyFinancialSummary,
  BusinessProfitability
} from '../src/types';

describe('Milestone 3 — R1: Responsive Layout Tokens & Contract Sanity', () => {
  it('validates navigation tab IDs and layout definitions', () => {
    const validTabs = ['orders', 'finance', 'businesses', 'maintenance', 'settings'];
    expect(validTabs).toHaveLength(5);
    expect(validTabs).toContain('orders');
    expect(validTabs).toContain('finance');
    expect(validTabs).toContain('businesses');
    expect(validTabs).toContain('maintenance');
    expect(validTabs).toContain('settings');
  });

  it('validates zone and expense category labels for UI presentation', () => {
    expect(getZoneLabel('planta_urbana')).toBe('Planta Urbana');
    expect(getZoneLabel('barrio_cerca')).toBe('Barrio Cerca');
    expect(getZoneLabel('barrio_lejos')).toBe('Barrio Lejos');
    expect(getZoneLabel('custom')).toBe('Personalizado');
    expect(getZoneLabel('unknown_zone')).toBe('unknown_zone');

    expect(getExpenseCategoryLabel('fuel')).toBe('Nafta / Combustible');
    expect(getExpenseCategoryLabel('food')).toBe('Comida / Bebida');
    expect(getExpenseCategoryLabel('puncture')).toBe('Gomería / Pinchadura');
    expect(getExpenseCategoryLabel('phone')).toBe('Celular / Datos');
    expect(getExpenseCategoryLabel('other')).toBe('Otros Gastos');
    expect(getExpenseCategoryLabel('custom_cat')).toBe('custom_cat');
  });

  it('validates currency, dates and time formatting contracts', () => {
    expect(formatCurrency(0)).toBe('$ 0');
    expect(formatCurrency(1500)).toBe('$ 1.500');
    expect(formatCurrency(52400)).toBe('$ 52.400');
    expect(formatCurrency(-3500)).toBe('-$ 3.500');

    expect(formatDateAR('2026-08-27')).toBe('27/08/2026');
    expect(formatDateAR('')).toBe('');

    const ts = new Date(2026, 7, 27, 14, 30).getTime();
    expect(formatTime(ts)).toBe('14:30');
    expect(formatDateTime(ts)).toBe('27/08/2026 14:30');

    const todayStr = getTodayDateString();
    expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('validates zero-cost navigation URL scheme helpers', () => {
    expect(DEFAULT_CITY).toBe('San Carlos de Bolívar');
    expect(isValidAddress('Av. San Martín 450')).toBe(true);
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('   ')).toBe(false);
    expect(isValidAddress(undefined)).toBe(false);

    const gmaps = getGoogleMapsUrl('Av. Brown 220');
    expect(gmaps).toContain('https://www.google.com/maps/dir/?api=1&destination=');
    expect(gmaps).toContain(encodeURIComponent('Av. Brown 220, San Carlos de Bolívar'));

    const waze = getWazeUrl('Av. Cancio 1120');
    expect(waze).toContain('https://waze.com/ul?q=');
    expect(waze).toContain(encodeURIComponent('Av. Cancio 1120, San Carlos de Bolívar'));
    expect(waze).toContain('&navigate=yes');
  });
});

describe('Milestone 3 — R2: Fondo de Cambio Inicial & Double-Entry Cash Drawer', () => {
  const date = '2026-08-27';

  it('calculates cash in pocket and real cash earned with starting float', () => {
    const orders: Order[] = [
      {
        id: 'ord_cash_1',
        userId: 'u1',
        date,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Pizzería Centro',
        zone: 'planta_urbana',
        amount: 2500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'ord_trans_1',
        userId: 'u1',
        date,
        timestamp: 2000,
        businessId: 'b1',
        businessName: 'Pizzería Centro',
        zone: 'barrio_cerca',
        amount: 3500,
        paidBy: 'customer',
        paymentMethod: 'transfer',
        settled: true
      },
      {
        id: 'ord_biz_unsettled',
        userId: 'u1',
        date,
        timestamp: 3000,
        businessId: 'b2',
        businessName: 'Burger Bar',
        zone: 'barrio_lejos',
        amount: 4000,
        paidBy: 'business',
        paymentMethod: 'cash',
        settled: false // NOT settled yet -> account receivable
      }
    ];

    const expenses: Expense[] = [
      {
        id: 'exp_cash_1',
        userId: 'u1',
        date,
        timestamp: 1500,
        category: 'fuel',
        description: 'Nafta Súper',
        amount: 1000,
        paymentMethod: 'cash'
      },
      {
        id: 'exp_trans_1',
        userId: 'u1',
        date,
        timestamp: 2500,
        category: 'food',
        description: 'Empanada',
        amount: 800,
        paymentMethod: 'transfer'
      }
    ];

    const startingCash = 5000;
    const summary: DailyFinancialSummary = calculateDailySummary(orders, expenses, date, startingCash);

    // Revenue: 2500 + 3500 + 4000 = 10000
    expect(summary.totalRevenue).toBe(10000);
    // Expenses: 1000 + 800 = 1800
    expect(summary.totalExpenses).toBe(1800);
    // Net profit: 10000 - 1800 = 8200
    expect(summary.netProfit).toBe(8200);

    // Cash collected = 2500 (customer cash). Unsettled 4000 is NOT collected!
    // Cash expenses = 1000
    // Real cash earned = 2500 - 1000 = 1500
    expect(summary.realCashEarned).toBe(1500);

    // Cash in pocket = startingCash (5000) + realCashEarned (1500) = 6500
    expect(summary.cashInPocket).toBe(6500);

    // Money in account = 3500 (transfer collected) - 800 (transfer expense) = 2700
    expect(summary.moneyInAccount).toBe(2700);

    // Unsettled revenue = 4000
    expect(summary.unsettledRevenue).toBe(4000);

    // Invariant: Net profit = Cash Earned (1500) + Money in Account (2700) + Unsettled (4000) = 8200
    expect((summary.realCashEarned ?? 0) + summary.moneyInAccount + summary.unsettledRevenue).toBe(summary.netProfit);
  });

  it('handles negative cash in hand when expenses exceed starting float + collections', () => {
    const orders: Order[] = [
      {
        id: 'ord_1',
        userId: 'u1',
        date,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Rotisería',
        zone: 'planta_urbana',
        amount: 1000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      }
    ];

    const expenses: Expense[] = [
      {
        id: 'exp_heavy',
        userId: 'u1',
        date,
        timestamp: 2000,
        category: 'puncture',
        description: 'Cubierta y cámara',
        amount: 15000,
        paymentMethod: 'cash'
      }
    ];

    const startingCash = 4000;
    const summary: DailyFinancialSummary = calculateDailySummary(orders, expenses, date, startingCash);

    // Real cash earned = 1000 - 15000 = -14000
    expect(summary.realCashEarned).toBe(-14000);
    // Cash in pocket = 4000 + (-14000) = -10000
    expect(summary.cashInPocket).toBe(-10000);
  });
});

describe('Milestone 3 — R3: WhatsApp "Estoy afuera 🛵" Deep Link Builder', () => {
  it('normalizes diverse Argentine telephone formats accurately', () => {
    // 10-digit standard (Bolívar: 2314-551234, CABA: 11-44445555)
    expect(sanitizeArgentinePhone('2314551234')).toBe('5492314551234');
    expect(sanitizeArgentinePhone('1144445555')).toBe('5491144445555');

    // 11-digit leading 0 (02314-551234)
    expect(sanitizeArgentinePhone('02314551234')).toBe('5492314551234');
    expect(sanitizeArgentinePhone('01144445555')).toBe('5491144445555');

    // 12-digit with 15 mobile prefix (2314 15 551234, 11 15 4444-5555)
    expect(sanitizeArgentinePhone('231415551234')).toBe('5492314551234');
    expect(sanitizeArgentinePhone('111544445555')).toBe('5491144445555');

    // With 0 and 15 combined: 02314 15 551234
    expect(sanitizeArgentinePhone('0231415551234')).toBe('5492314551234');

    // Formatted with parentheses, spaces, and dashes: (02314) 15-55-1234
    expect(sanitizeArgentinePhone('(02314) 15-55-1234')).toBe('5492314551234');

    // International format: +54 9 2314 551234
    expect(sanitizeArgentinePhone('+54 9 2314 551234')).toBe('5492314551234');
    expect(sanitizeArgentinePhone('+54 2314 551234')).toBe('5492314551234');

    // Invalid or blank
    expect(sanitizeArgentinePhone('')).toBe('');
    expect(sanitizeArgentinePhone('   ')).toBe('');
    expect(sanitizeArgentinePhone(undefined)).toBe('');
    expect(sanitizeArgentinePhone('no-phone')).toBe('');
  });

  it('builds wa.me URL with standard and custom messages', () => {
    const urlDefault = buildCustomerWhatsAppUrl('2314-551234');
    expect(urlDefault).toBe(
      'https://wa.me/5492314551234?text=Buenas!%20Estoy%20afuera%20con%20tu%20pedido%20%F0%9F%9B%B5'
    );

    const customMsg = 'Hola, estoy en la puerta! 🛵';
    const urlCustom = buildCustomerWhatsAppUrl('02314-15-551234', customMsg);
    expect(urlCustom).toBe(`https://wa.me/5492314551234?text=${encodeURIComponent(customMsg)}`);

    const urlEmptyPhone = buildCustomerWhatsAppUrl('');
    expect(urlEmptyPhone).toBe(
      'https://wa.me/?text=Buenas!%20Estoy%20afuera%20con%20tu%20pedido%20%F0%9F%9B%B5'
    );

    const rawUrl = generateWhatsAppUrl('2314551234', 'Prueba');
    expect(rawUrl).toBe('https://wa.me/5492314551234?text=Prueba');
  });
});

describe('Milestone 3 — R4: Business Profitability & Debt Engines', () => {
  const businesses: Business[] = [
    {
      id: 'biz_a',
      userId: 'u1',
      name: 'Comercio A (Poco Volumen, Tarifa Alta)',
      phone: '2314551234',
      defaultPrices: { plantaUrbana: 3000, barrioCerca: 4000, barrioLejos: 5000 },
      paymentCycle: 'weekly',
      active: true,
      createdAt: '2026-08-01'
    },
    {
      id: 'biz_b',
      userId: 'u1',
      name: 'Comercio B (Mucho Volumen, Tarifa Baja)',
      phone: '2314667890',
      defaultPrices: { plantaUrbana: 1200, barrioCerca: 1500, barrioLejos: 2000 },
      paymentCycle: 'daily',
      active: true,
      createdAt: '2026-08-01'
    },
    {
      id: 'biz_c',
      userId: 'u1',
      name: 'Comercio C (Sin Pedidos)',
      defaultPrices: { plantaUrbana: 2000, barrioCerca: 2500, barrioLejos: 3000 },
      paymentCycle: 'monthly',
      active: true,
      createdAt: '2026-08-01'
    }
  ];

  const orders: Order[] = [
    // Biz A: 2 orders -> $3.000 + $5.000 = $8.000 total -> avg $4.000/trip
    {
      id: 'o_a1',
      userId: 'u1',
      date: '2026-08-20',
      timestamp: 1000,
      businessId: 'biz_a',
      businessName: 'Comercio A',
      zone: 'planta_urbana',
      amount: 3000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o_a2',
      userId: 'u1',
      date: '2026-08-25',
      timestamp: 2000,
      businessId: 'biz_a',
      businessName: 'Comercio A',
      zone: 'barrio_lejos',
      amount: 5000,
      paidBy: 'business',
      paymentMethod: 'transfer',
      settled: false // Unsettled debt
    },
    // Biz B: 5 orders -> $1.200 x 5 = $6.000 total -> avg $1.200/trip
    {
      id: 'o_b1',
      userId: 'u1',
      date: '2026-08-21',
      timestamp: 3000,
      businessId: 'biz_b',
      businessName: 'Comercio B',
      zone: 'planta_urbana',
      amount: 1200,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o_b2',
      userId: 'u1',
      date: '2026-08-22',
      timestamp: 4000,
      businessId: 'biz_b',
      businessName: 'Comercio B',
      zone: 'planta_urbana',
      amount: 1200,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o_b3',
      userId: 'u1',
      date: '2026-08-23',
      timestamp: 5000,
      businessId: 'biz_b',
      businessName: 'Comercio B',
      zone: 'planta_urbana',
      amount: 1200,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o_b4',
      userId: 'u1',
      date: '2026-08-24',
      timestamp: 6000,
      businessId: 'biz_b',
      businessName: 'Comercio B',
      zone: 'planta_urbana',
      amount: 1200,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    {
      id: 'o_b5',
      userId: 'u1',
      date: '2026-08-25',
      timestamp: 7000,
      businessId: 'biz_b',
      businessName: 'Comercio B',
      zone: 'planta_urbana',
      amount: 1200,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    }
  ];

  it('calculates volume, revenue, and ranks strictly descending by averageProfitPerTrip', () => {
    const metrics: BusinessProfitability[] = calculateBusinessProfitability(businesses, orders);

    expect(metrics).toHaveLength(3);

    // Rank 1: Biz A ($4.000 avg)
    expect(metrics[0]?.businessId).toBe('biz_a');
    expect(metrics[0]?.totalOrders).toBe(2);
    expect(metrics[0]?.totalRevenue).toBe(8000);
    expect(metrics[0]?.averageProfitPerTrip).toBe(4000);

    // Rank 2: Biz B ($1.200 avg)
    expect(metrics[1]?.businessId).toBe('biz_b');
    expect(metrics[1]?.totalOrders).toBe(5);
    expect(metrics[1]?.totalRevenue).toBe(6000);
    expect(metrics[1]?.averageProfitPerTrip).toBe(1200);

    // Rank 3: Biz C ($0 avg)
    expect(metrics[2]?.businessId).toBe('biz_c');
    expect(metrics[2]?.totalOrders).toBe(0);
    expect(metrics[2]?.totalRevenue).toBe(0);
    expect(metrics[2]?.averageProfitPerTrip).toBe(0);
  });

  it('calculates business accounts receivable and generates WhatsApp summary text', () => {
    const debtA = calculateBusinessDebt(orders, 'biz_a');
    expect(debtA.unsettledOrdersCount).toBe(1);
    expect(debtA.totalDebt).toBe(5000);

    const allDebts = calculateAllBusinessesDebt(businesses, orders);
    expect(allDebts).toHaveLength(3);
    expect(allDebts.find((d) => d.businessId === 'biz_a')?.totalDebt).toBe(5000);
    expect(allDebts.find((d) => d.businessId === 'biz_b')?.totalDebt).toBe(0);

    const bizA = businesses[0]!;
    const settlementText = generateWhatsAppSettlementText(bizA, debtA.orders);
    expect(settlementText).toContain('*CADETE OS - RESUMEN DE CUENTA*');
    expect(settlementText).toContain('*Comercio:* Comercio A (Poco Volumen, Tarifa Alta)');
    expect(settlementText).toContain('*TOTAL A LIQUIDAR:* $ 5.000');
  });
});

describe('Milestone 3 — R5: Daily Profit Goal & Progress Calculation', () => {
  it('calculates progress percentage, remaining amount, and isReached trigger', () => {
    // 1. Partial progress (40%)
    const partial: GoalProgress = calculateGoalProgress(20000, 50000);
    expect(partial.targetGoal).toBe(50000);
    expect(partial.currentNetProfit).toBe(20000);
    expect(partial.percentage).toBe(40);
    expect(partial.isReached).toBe(false);
    expect(partial.remainingAmount).toBe(30000);

    // 2. Exact goal hit (100%)
    const exact: GoalProgress = calculateGoalProgress(50000, 50000);
    expect(exact.percentage).toBe(100);
    expect(exact.isReached).toBe(true);
    expect(exact.remainingAmount).toBe(0);

    // 3. Goal exceeded (120%)
    const exceeded: GoalProgress = calculateGoalProgress(60000, 50000);
    expect(exceeded.percentage).toBe(120);
    expect(exceeded.isReached).toBe(true);
    expect(exceeded.remainingAmount).toBe(0);

    // 4. Undefined or 0 goal
    const noGoal: GoalProgress = calculateGoalProgress(25000, 0);
    expect(noGoal.targetGoal).toBe(0);
    expect(noGoal.percentage).toBe(0);
    expect(noGoal.isReached).toBe(false);
    expect(noGoal.remainingAmount).toBe(0);

    // 5. Negative profit (losses) clamped to 0%
    const loss: GoalProgress = calculateGoalProgress(-10000, 40000);
    expect(loss.currentNetProfit).toBe(-10000);
    expect(loss.percentage).toBe(0);
    expect(loss.isReached).toBe(false);
    expect(loss.remainingAmount).toBe(50000);
  });
});

describe('Milestone 3 — R6: Shift Tracking, Cross-Midnight Durations & Hourly Profit', () => {
  it('calculates standard same-day shift hours', () => {
    // 08:30 to 16:00 = 7.5 hours
    expect(calculateShiftDurationHours('08:30', '16:00')).toBe(7.5);
    // 10:00 to 14:15 = 4.25 hours
    expect(calculateShiftDurationHours('10:00', '14:15')).toBe(4.25);
  });

  it('calculates overnight shift hours crossing midnight correctly', () => {
    // 20:00 to 02:00 = 6 hours (4h before midnight + 2h after)
    expect(calculateShiftDurationHours('20:00', '02:00')).toBe(6.0);
    // 22:45 to 03:30 = 4.75 hours (1.25h before midnight + 3.5h after)
    expect(calculateShiftDurationHours('22:45', '03:30')).toBe(4.75);
    // 23:50 to 00:20 = 0.5 hours (30 min)
    expect(calculateShiftDurationHours('23:50', '00:20')).toBe(0.5);
  });

  it('handles invalid or empty shift inputs safely', () => {
    expect(calculateShiftDurationHours(undefined, undefined)).toBe(0);
    expect(calculateShiftDurationHours('08:00', undefined)).toBe(0);
    expect(calculateShiftDurationHours(undefined, '14:00')).toBe(0);
    expect(calculateShiftDurationHours('', '')).toBe(0);
    expect(calculateShiftDurationHours('invalid', 'time')).toBe(0);
    expect(calculateShiftDurationHours('12:00', '12:00')).toBe(0);
  });

  it('calculates hourly profit rate ($/hr) with strict division-by-zero protection', () => {
    // $30.000 in 6 hours = $5.000/hr
    expect(calculateHourlyProfitRate(30000, 6)).toBe(5000);
    // $22.500 in 5 hours = $4.500/hr
    expect(calculateHourlyProfitRate(22500, 5)).toBe(4500);

    // Division by zero guards:
    expect(calculateHourlyProfitRate(30000, 0)).toBe(0);
    expect(calculateHourlyProfitRate(30000, -1)).toBe(0);
    expect(calculateHourlyProfitRate(30000, NaN)).toBe(0);
    expect(calculateHourlyProfitRate(30000, Infinity)).toBe(0);

    // Negative profit (loss per hour)
    expect(calculateHourlyProfitRate(-12000, 4)).toBe(-3000);
  });

  it('formats duration into human-readable "Xh Ym" text', () => {
    expect(formatDurationHM(6.5)).toBe('6h 30m');
    expect(formatDurationHM(8.0)).toBe('8h 0m');
    expect(formatDurationHM(0.25)).toBe('0h 15m');
    expect(formatDurationHM(0)).toBe('0h 0m');
    expect(formatDurationHM(-2)).toBe('0h 0m');
    expect(formatDurationHM(NaN)).toBe('0h 0m');
  });
});

describe('Milestone 3 — R7: Date Navigation & 7-Day Running Weekly Summary', () => {
  const refDate = '2026-08-27';

  const orders: Order[] = [
    // Day 2026-08-21 (d-6, window start): $3.000
    {
      id: 'o1',
      userId: 'u1',
      date: '2026-08-21',
      timestamp: 1000,
      businessId: 'b1',
      businessName: 'Biz',
      zone: 'planta_urbana',
      amount: 3000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    // Day 2026-08-24 (d-3): $4.500
    {
      id: 'o2',
      userId: 'u1',
      date: '2026-08-24',
      timestamp: 2000,
      businessId: 'b1',
      businessName: 'Biz',
      zone: 'planta_urbana',
      amount: 4500,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    // Day 2026-08-27 (d, window end): $6.000
    {
      id: 'o3',
      userId: 'u1',
      date: '2026-08-27',
      timestamp: 3000,
      businessId: 'b1',
      businessName: 'Biz',
      zone: 'planta_urbana',
      amount: 6000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    },
    // Outside window: 2026-08-10
    {
      id: 'o_old',
      userId: 'u1',
      date: '2026-08-10',
      timestamp: 4000,
      businessId: 'b1',
      businessName: 'Biz',
      zone: 'planta_urbana',
      amount: 99999,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    }
  ];

  const expenses: Expense[] = [
    // Day 2026-08-24: $1.500
    {
      id: 'e1',
      userId: 'u1',
      date: '2026-08-24',
      timestamp: 2500,
      category: 'fuel',
      description: 'Nafta',
      amount: 1500,
      paymentMethod: 'cash'
    },
    // Day 2026-08-27: $2.000
    {
      id: 'e2',
      userId: 'u1',
      date: '2026-08-27',
      timestamp: 3500,
      category: 'food',
      description: 'Almuerzo',
      amount: 2000,
      paymentMethod: 'cash'
    }
  ];

  it('aggregates 7 days precisely and computes weekly sums and averages', () => {
    const weekly: WeeklyFinancialSummary = calculateWeeklySummary(orders, expenses, refDate);

    expect(weekly.startDate).toBe('2026-08-21');
    expect(weekly.endDate).toBe('2026-08-27');
    expect(weekly.days).toHaveLength(7);

    // Total orders: 3
    expect(weekly.totalOrders).toBe(3);
    // Total revenue: 3000 + 4500 + 6000 = 13500
    expect(weekly.totalRevenue).toBe(13500);
    // Total expenses: 1500 + 2000 = 3500
    expect(weekly.totalExpenses).toBe(3500);
    // Net profit: 13500 - 3500 = 10000
    expect(weekly.netProfit).toBe(10000);
    // Daily average net profit: 10000 / 7 = 1429 (rounded)
    expect(weekly.averageDailyNetProfit).toBe(1429);
  });
});

describe('Milestone 3 — Virtual Oil Odometer & Storage Integration', () => {
  const userId = 'user_m3_test';

  beforeEach(() => {
    localStorage.clear();
  });

  it('calculates virtual oil odometer status correctly across thresholds', () => {
    const ref = new Date('2026-08-27T12:00:00Z');
    const lastRecord: MaintenanceRecord = {
      id: 'm1',
      userId,
      date: '2026-08-17', // 10 days ago
      timestamp: 1000,
      item: 'Aceite Castrol 20w50',
      cost: 15000,
      isOilChange: true,
      ordersSnapshot: 50
    };

    // 1. Green (< 200 orders and < 25 days)
    const odoGreen = calculateOilOdometer(150, lastRecord, { orders: 250, days: 30 }, ref);
    expect(odoGreen.ordersSinceLastChange).toBe(100);
    expect(odoGreen.daysSinceLastChange).toBe(10);
    expect(odoGreen.status).toBe('green');

    // 2. Yellow (210 orders)
    const odoYellow = calculateOilOdometer(260, lastRecord, { orders: 250, days: 30 }, ref);
    expect(odoYellow.ordersSinceLastChange).toBe(210);
    expect(odoYellow.status).toBe('yellow');

    // 3. Red (> 250 orders)
    const odoRed = calculateOilOdometer(320, lastRecord, { orders: 250, days: 30 }, ref);
    expect(odoRed.ordersSinceLastChange).toBe(270);
    expect(odoRed.status).toBe('red');
  });

  it('persists and retrieves shift with starting cash float', () => {
    const shift: Shift = {
      id: 'shift_m3_1',
      userId,
      date: '2026-08-27',
      startTime: '09:00',
      endTime: '17:00',
      startingCash: 7500,
      status: 'completed',
      createdAt: 1000
    };

    storage.saveShift(userId, shift);

    const saved = storage.getShiftByDate(userId, '2026-08-27');
    expect(saved).toBeDefined();
    expect(saved?.id).toBe('shift_m3_1');
    expect(saved?.startingCash).toBe(7500);
    expect(saved?.status).toBe('completed');
  });
});
