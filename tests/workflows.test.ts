import { describe, it, expect } from 'vitest';
import {
  calculateDailySummary,
  calculateBusinessDebt,
  calculateOilOdometer
} from '../src/utils/calculations';
import { generateWhatsAppSettlementText } from '../src/utils/whatsapp';
import type { Business, Order, Expense, MaintenanceRecord } from '../src/types';

describe('Cadete OS Full E2E User Workflows', () => {
  const userId = 'cadete_e2e_user';
  const shiftDate = '2026-08-26';

  it('executes a full daily delivery shift with orders, expenses, debt accumulation, batch settlement, and oil reset', () => {
    // 1. Setup Business
    const pizzeria: Business = {
      id: 'biz_pizzeria',
      userId,
      name: 'Pizzería Los Tres Ases',
      phone: '2314559988',
      defaultPrices: {
        plantaUrbana: 1500,
        barrioCerca: 2200,
        barrioLejos: 3000
      },
      paymentCycle: 'weekly',
      active: true,
      createdAt: '2026-08-01'
    };

    // 2. Courier starts shift with 0 orders and 0 expenses
    let orders: Order[] = [];
    let expenses: Expense[] = [];
    let maintenance: MaintenanceRecord[] = [
      {
        id: 'maint_initial',
        userId,
        date: '2026-08-10', // 16 days ago
        timestamp: 1000,
        item: 'Cambio de Aceite Castrol 20w50',
        cost: 15000,
        isOilChange: true,
        ordersSnapshot: 100 // Previous lifetime snapshot
      }
    ];

    // Check odometer before shift (100 snapshot, 100 total orders -> 0 new trips)
    let odo = calculateOilOdometer(100, maintenance[0], { orders: 250, days: 30 }, new Date('2026-08-26T12:00:00Z'));
    expect(odo.ordersSinceLastChange).toBe(0);
    expect(odo.daysSinceLastChange).toBe(16);
    expect(odo.status).toBe('green');

    // 3. Shift Progress: Courier registers 4 trips
    // Order 1: Planta urbana, paid in cash by customer
    orders.push({
      id: 'ord_1',
      userId,
      date: shiftDate,
      timestamp: Date.now() + 100,
      businessId: pizzeria.id,
      businessName: pizzeria.name,
      address: 'Av. San Martín 320',
      zone: 'planta_urbana',
      amount: pizzeria.defaultPrices.plantaUrbana, // 1500
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    });

    // Order 2: Barrio Cerca, paid in transfer by customer (Mercado Pago)
    orders.push({
      id: 'ord_2',
      userId,
      date: shiftDate,
      timestamp: Date.now() + 200,
      businessId: pizzeria.id,
      businessName: pizzeria.name,
      address: 'Av. Brown 850',
      zone: 'barrio_cerca',
      amount: pizzeria.defaultPrices.barrioCerca, // 2200
      paidBy: 'customer',
      paymentMethod: 'transfer',
      settled: true
    });

    // Order 3: Barrio Lejos, business account receivable (paidBy: business, settled: false)
    orders.push({
      id: 'ord_3',
      userId,
      date: shiftDate,
      timestamp: Date.now() + 300,
      businessId: pizzeria.id,
      businessName: pizzeria.name,
      address: 'Barrio Cooperativa Casa 4',
      zone: 'barrio_lejos',
      amount: pizzeria.defaultPrices.barrioLejos, // 3000
      paidBy: 'business',
      paymentMethod: 'transfer',
      settled: false
    });

    // Order 4: Planta urbana, business account receivable (paidBy: business, settled: false)
    orders.push({
      id: 'ord_4',
      userId,
      date: shiftDate,
      timestamp: Date.now() + 400,
      businessId: pizzeria.id,
      businessName: pizzeria.name,
      address: 'Alvear 120',
      zone: 'planta_urbana',
      amount: pizzeria.defaultPrices.plantaUrbana, // 1500
      paidBy: 'business',
      paymentMethod: 'transfer',
      settled: false
    });

    // 4. Courier logs 2 expenses during shift
    // Expense 1: Fuel $2.000 paid in Cash from pocket
    expenses.push({
      id: 'exp_1',
      userId,
      date: shiftDate,
      timestamp: Date.now() + 500,
      category: 'fuel',
      description: 'Nafta Súper',
      amount: 2000,
      paymentMethod: 'cash'
    });

    // Expense 2: Beverage $500 paid in Transfer
    expenses.push({
      id: 'exp_2',
      userId,
      date: shiftDate,
      timestamp: Date.now() + 600,
      category: 'food',
      description: 'Bebida',
      amount: 500,
      paymentMethod: 'transfer'
    });

    // 5. Verify Financial Metrics during the shift
    const midShiftSummary = calculateDailySummary(orders, expenses, shiftDate);
    // Total Facturado = 1500 + 2200 + 3000 + 1500 = 8200
    expect(midShiftSummary.totalRevenue).toBe(8200);
    // Total Gastos = 2000 + 500 = 2500
    expect(midShiftSummary.totalExpenses).toBe(2500);
    // Ganancia Neta = 8200 - 2500 = 5700
    expect(midShiftSummary.netProfit).toBe(5700);

    // Efectivo en Bolsillo = 1500 (ord_1) - 2000 (exp_1) = -500 (pocket cash deficit)
    expect(midShiftSummary.cashInPocket).toBe(-500);

    // Dinero en Cuenta = 2200 (ord_2) - 500 (exp_2) = 1700
    expect(midShiftSummary.moneyInAccount).toBe(1700);

    // Cuentas Corrientes = 3000 (ord_3) + 1500 (ord_4) = 4500
    expect(midShiftSummary.unsettledRevenue).toBe(4500);

    // 6. Verify Accounts Receivable for Pizzería
    const debt = calculateBusinessDebt(orders, pizzeria.id);
    expect(debt.unsettledOrdersCount).toBe(2);
    expect(debt.totalDebt).toBe(4500);

    // Generate WhatsApp settlement receipt
    const waText = generateWhatsAppSettlementText(pizzeria, debt.orders);
    expect(waText).toContain('*TOTAL A LIQUIDAR:* $ 4.500');
    expect(waText).toContain('• 26/08/2026 - Barrio Cooperativa Casa 4 ($ 3.000)');
    expect(waText).toContain('• 26/08/2026 - Alvear 120 ($ 1.500)');

    // 7. 1-Tap Batch Debt Settlement
    // Courier collects $4.500 from Pizzería in Cash
    orders = orders.map((o) => {
      if (o.businessId === pizzeria.id && !o.settled) {
        return {
          ...o,
          paymentMethod: 'cash' as const,
          settled: true,
          settledAt: '2026-08-26T22:00:00Z'
        };
      }
      return o;
    });

    // Verify debt is now $0
    const clearedDebt = calculateBusinessDebt(orders, pizzeria.id);
    expect(clearedDebt.unsettledOrdersCount).toBe(0);
    expect(clearedDebt.totalDebt).toBe(0);

    // Recalculate Cash Drawer:
    // Cash collected = 1500 (ord_1) + 3000 (ord_3) + 1500 (ord_4) = 6000
    // Cash expenses = 2000
    // Pocket cash = 6000 - 2000 = 4000
    const postSettlementSummary = calculateDailySummary(orders, expenses, shiftDate);
    expect(postSettlementSummary.cashInPocket).toBe(4000);
    expect(postSettlementSummary.unsettledRevenue).toBe(0);

    // 8. Virtual Oil Odometer Tracking & Reset
    // Total lifetime orders = 100 (initial) + 4 = 104
    odo = calculateOilOdometer(104, maintenance[0], { orders: 250, days: 30 }, new Date('2026-08-26T12:00:00Z'));
    expect(odo.ordersSinceLastChange).toBe(4);

    // Simulate oil change service at 104 orders
    const newOilChange: MaintenanceRecord = {
      id: 'maint_oil_2',
      userId,
      date: shiftDate,
      timestamp: Date.now() + 1000,
      item: 'Aceite Motul 20w50',
      cost: 16000,
      isOilChange: true,
      ordersSnapshot: 104 // Snapshot reset
    };
    maintenance.unshift(newOilChange);

    // Verify odometer is now reset to 0 trips since change
    const resetOdo = calculateOilOdometer(104, maintenance[0], { orders: 250, days: 30 }, new Date('2026-08-26T12:00:00Z'));
    expect(resetOdo.ordersSinceLastChange).toBe(0);
    expect(resetOdo.daysSinceLastChange).toBe(0);
    expect(resetOdo.status).toBe('green');
  });
});
