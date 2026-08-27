import { describe, it, expect } from 'vitest';
import {
  calculateDailySummary,
  calculateBusinessDebt,
  calculateAllBusinessesDebt,
  calculateOilOdometer
} from '../src/utils/calculations';
import type { Order, Expense, Business, MaintenanceRecord } from '../src/types';

describe('Financial Calculations Engine', () => {
  const sampleDate = '2026-08-26';

  it('calculates daily net profit and cash drawer correctly with mixed payment methods', () => {
    const orders: Order[] = [
      {
        id: 'ord_1',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 1000,
        businessId: 'biz_1',
        businessName: 'Pizzería Don Antonio',
        zone: 'planta_urbana',
        amount: 1500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      },
      {
        id: 'ord_2',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 2000,
        businessId: 'biz_2',
        businessName: 'Bolívar Burger Centro',
        zone: 'barrio_cerca',
        amount: 2400,
        paidBy: 'customer',
        paymentMethod: 'transfer',
        settled: true
      },
      {
        id: 'ord_3',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 3000,
        businessId: 'biz_1',
        businessName: 'Pizzería Don Antonio',
        zone: 'barrio_lejos',
        amount: 3000,
        paidBy: 'business',
        paymentMethod: 'transfer',
        settled: false // Cta Cte: NOT in current cash drawer, but in gross and unsettled
      }
    ];

    const expenses: Expense[] = [
      {
        id: 'exp_1',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 1500,
        category: 'fuel',
        description: 'Nafta Súper',
        amount: 1000,
        paymentMethod: 'cash'
      },
      {
        id: 'exp_2',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 2500,
        category: 'food',
        description: 'Agua',
        amount: 500,
        paymentMethod: 'transfer'
      }
    ];

    const summary = calculateDailySummary(orders, expenses, sampleDate);

    // Total Facturado = 1500 + 2400 + 3000 = 6900
    expect(summary.totalRevenue).toBe(6900);
    // Total Gastos = 1000 + 500 = 1500
    expect(summary.totalExpenses).toBe(1500);
    // Ganancia Neta = 6900 - 1500 = 5400
    expect(summary.netProfit).toBe(5400);

    // Efectivo en Bolsillo = 1500 (ord_1 cash) - 1000 (exp_1 cash) = 500
    expect(summary.cashInPocket).toBe(500);

    // Dinero en Cuenta = 2400 (ord_2 transfer) - 500 (exp_2 transfer) = 1900
    expect(summary.moneyInAccount).toBe(1900);

    // Por Cobrar a Comercios = 3000 (ord_3 unsettled)
    expect(summary.unsettledRevenue).toBe(3000);
    expect(summary.totalOrdersCount).toBe(3);
  });

  it('includes settled business orders in cash drawer when paid in cash or transfer', () => {
    const orders: Order[] = [
      {
        id: 'ord_settled_cash',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 1000,
        businessId: 'biz_1',
        businessName: 'Pizzería Don Antonio',
        zone: 'planta_urbana',
        amount: 2000,
        paidBy: 'business',
        paymentMethod: 'cash',
        settled: true
      }
    ];

    const expenses: Expense[] = [];

    const summary = calculateDailySummary(orders, expenses, sampleDate);
    expect(summary.cashInPocket).toBe(2000);
    expect(summary.unsettledRevenue).toBe(0);
  });

  it('calculates business accounts receivable debt correctly', () => {
    const orders: Order[] = [
      {
        id: 'ord_1',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 1000,
        businessId: 'biz_1',
        businessName: 'Pizzería Don Antonio',
        zone: 'planta_urbana',
        amount: 1500,
        paidBy: 'business',
        paymentMethod: 'transfer',
        settled: false
      },
      {
        id: 'ord_2',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 2000,
        businessId: 'biz_1',
        businessName: 'Pizzería Don Antonio',
        zone: 'barrio_cerca',
        amount: 2200,
        paidBy: 'business',
        paymentMethod: 'transfer',
        settled: false
      },
      {
        id: 'ord_3',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 3000,
        businessId: 'biz_1',
        businessName: 'Pizzería Don Antonio',
        zone: 'planta_urbana',
        amount: 1500,
        paidBy: 'business',
        paymentMethod: 'transfer',
        settled: true // Already settled
      },
      {
        id: 'ord_4',
        userId: 'user_1',
        date: sampleDate,
        timestamp: 4000,
        businessId: 'biz_2',
        businessName: 'Bolívar Burger Centro',
        zone: 'planta_urbana',
        amount: 1600,
        paidBy: 'business',
        paymentMethod: 'cash',
        settled: false
      }
    ];

    const debtBiz1 = calculateBusinessDebt(orders, 'biz_1');
    expect(debtBiz1.unsettledOrdersCount).toBe(2);
    expect(debtBiz1.totalDebt).toBe(3700);

    const businesses: Business[] = [
      {
        id: 'biz_1',
        userId: 'user_1',
        name: 'Pizzería Don Antonio',
        defaultPrices: { plantaUrbana: 1500, barrioCerca: 2200, barrioLejos: 3000 },
        paymentCycle: 'weekly',
        active: true,
        createdAt: '2026-08-01'
      },
      {
        id: 'biz_2',
        userId: 'user_1',
        name: 'Bolívar Burger Centro',
        defaultPrices: { plantaUrbana: 1600, barrioCerca: 2400, barrioLejos: 3200 },
        paymentCycle: 'daily',
        active: true,
        createdAt: '2026-08-01'
      }
    ];

    const allDebts = calculateAllBusinessesDebt(businesses, orders);
    expect(allDebts).toHaveLength(2);
    expect(allDebts[0]?.totalDebt).toBe(3700);
    expect(allDebts[1]?.totalDebt).toBe(1600);
  });
});

describe('Virtual Oil Odometer Calculations', () => {
  const refDate = new Date('2026-08-26T12:00:00Z');

  it('handles initial state with no prior oil change record', () => {
    const totalHistoricalOrders = 120;
    const odometer = calculateOilOdometer(totalHistoricalOrders, undefined, { orders: 250, days: 30 }, refDate);

    expect(odometer.ordersSinceLastChange).toBe(120);
    expect(odometer.daysSinceLastChange).toBe(0);
    expect(odometer.status).toBe('green');
  });

  it('displays Verde (<200 trips and <25 days)', () => {
    const lastRecord: MaintenanceRecord = {
      id: 'm1',
      userId: 'u1',
      date: '2026-08-16', // 10 days ago
      timestamp: 1000,
      item: 'Aceite Castrol',
      cost: 12000,
      isOilChange: true,
      ordersSnapshot: 50
    };

    const totalHistoricalOrders = 150; // 150 - 50 = 100 trips since change
    const odometer = calculateOilOdometer(totalHistoricalOrders, lastRecord, { orders: 250, days: 30 }, refDate);

    expect(odometer.ordersSinceLastChange).toBe(100);
    expect(odometer.daysSinceLastChange).toBe(10);
    expect(odometer.status).toBe('green');
  });

  it('displays Amarillo (200-250 trips or 25-30 days)', () => {
    const lastRecord: MaintenanceRecord = {
      id: 'm1',
      userId: 'u1',
      date: '2026-08-16', // 10 days ago
      timestamp: 1000,
      item: 'Aceite Castrol',
      cost: 12000,
      isOilChange: true,
      ordersSnapshot: 50
    };

    const totalHistoricalOrders = 260; // 260 - 50 = 210 trips (Yellow: 200-250)
    const odometer = calculateOilOdometer(totalHistoricalOrders, lastRecord, { orders: 250, days: 30 }, refDate);

    expect(odometer.ordersSinceLastChange).toBe(210);
    expect(odometer.status).toBe('yellow');
  });

  it('displays Rojo (>250 trips or >30 days)', () => {
    const lastRecord: MaintenanceRecord = {
      id: 'm1',
      userId: 'u1',
      date: '2026-08-16', // 10 days ago
      timestamp: 1000,
      item: 'Aceite Castrol',
      cost: 12000,
      isOilChange: true,
      ordersSnapshot: 50
    };

    const totalHistoricalOrders = 310; // 310 - 50 = 260 trips (> 250)
    const odometer = calculateOilOdometer(totalHistoricalOrders, lastRecord, { orders: 250, days: 30 }, refDate);

    expect(odometer.ordersSinceLastChange).toBe(260);
    expect(odometer.status).toBe('red');
  });

  it('escalates to Rojo if days threshold is exceeded even when orders count is low', () => {
    const lastRecord: MaintenanceRecord = {
      id: 'm1',
      userId: 'u1',
      date: '2026-07-20', // 37 days ago (> 30 days)
      timestamp: 1000,
      item: 'Aceite Castrol',
      cost: 12000,
      isOilChange: true,
      ordersSnapshot: 50
    };

    const totalHistoricalOrders = 70; // Only 20 trips
    const odometer = calculateOilOdometer(totalHistoricalOrders, lastRecord, { orders: 250, days: 30 }, refDate);

    expect(odometer.ordersSinceLastChange).toBe(20);
    expect(odometer.daysSinceLastChange).toBe(37);
    expect(odometer.status).toBe('red');
  });
});
