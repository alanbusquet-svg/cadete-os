import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateDailySummary,
  calculateBusinessDebt,
  calculateOilOdometer,
  calculateShiftDurationHours,
  calculateHourlyProfitRate,
  calculateGoalProgress
} from '../src/utils/calculations';
import { formatCurrency } from '../src/utils/formatting';
import { useModalBackHandler } from '../src/hooks/useModalBackHandler';
import { useTabNavigation } from '../src/App';
import { renderHook, act, cleanup } from './testUtils';
import type { Order, Expense, MaintenanceRecord } from '../src/types';

describe('Adversarial Challenger 2 — Deep Precision & Navigation Stress Suite (tests/adversarial_challenger_2_precision.test.ts)', () => {
  const testDate = '2026-09-14';

  beforeEach(() => {
    if (typeof (window.history as any)?._reset === 'function') {
      (window.history as any)._reset();
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: FINANCIAL ARITHMETIC & CASH DRAWER EDGE CASES
  // =========================================================================

  describe('1. Financial Arithmetic Stress Testing', () => {
    it('1.1 Negative net profit with positive physical cash in pocket (high fuel expense paid by bank transfer)', () => {
      // Courier collects $4,000 cash from customer deliveries
      const orders: Order[] = [
        {
          id: 'o_cash_1',
          userId: 'u1',
          date: testDate,
          timestamp: 100,
          businessId: 'b1',
          businessName: 'Rotisería San Martín',
          zone: 'planta_urbana',
          amount: 4000,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        }
      ];

      // Courier fills tank for $15,000 paid via Mercado Pago / Transfer
      const expenses: Expense[] = [
        {
          id: 'e_fuel_transfer',
          userId: 'u1',
          date: testDate,
          timestamp: 200,
          category: 'fuel',
          description: 'Nafta Infinia YPF (Transferencia)',
          amount: 15000,
          paymentMethod: 'transfer'
        }
      ];

      const startingFloat = 8000;
      const summary = calculateDailySummary(orders, expenses, testDate, startingFloat);

      // Total revenue = $4,000
      expect(summary.totalRevenue).toBe(4000);
      // Total expenses = $15,000
      expect(summary.totalExpenses).toBe(15000);
      // Net profit = 4,000 - 15,000 = -$11,000 (courier operated at a loss due to heavy gas purchase)
      expect(summary.netProfit).toBe(-11000);

      // Physical cash earned = $4,000 cash in - $0 cash out = +$4,000
      expect(summary.realCashEarned).toBe(4000);
      // Cash in pocket = $8,000 float + $4,000 earned = +$12,000 in pocket!
      expect(summary.cashInPocket).toBe(12000);

      // Money in account = $0 transfer in - $15,000 transfer out = -$15,000
      expect(summary.moneyInAccount).toBe(-15000);

      // Unsettled revenue is $0
      expect(summary.unsettledRevenue).toBe(0);

      // Check formatCurrency representation
      expect(formatCurrency(summary.netProfit)).toBe('-$ 11.000');
      expect(formatCurrency(summary.cashInPocket)).toBe('$ 12.000');
      expect(formatCurrency(summary.moneyInAccount)).toBe('-$ 15.000');
    });

    it('1.2 Zero revenue day with starting cash float and optional cash expense', () => {
      // Courier starts shift with $20,000 float, has 0 orders, spends $3,500 cash on lunch
      const expenses: Expense[] = [
        {
          id: 'e_lunch_cash',
          userId: 'u1',
          date: testDate,
          timestamp: 50,
          category: 'food',
          description: 'Almuerzo sanguche',
          amount: 3500,
          paymentMethod: 'cash'
        }
      ];

      const startingFloat = 20000;
      const summary = calculateDailySummary([], expenses, testDate, startingFloat);

      expect(summary.totalOrdersCount).toBe(0);
      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalExpenses).toBe(3500);
      expect(summary.netProfit).toBe(-3500);
      expect(summary.realCashEarned).toBe(-3500);
      expect(summary.cashInPocket).toBe(16500); // 20,000 - 3,500
      expect(summary.moneyInAccount).toBe(0);
      expect(summary.startingCash).toBe(20000);
      expect(summary.unsettledRevenue).toBe(0);
    });

    it('1.3 Customer orders marked unsettled: cash collected remains exact and does not include unpaid deliveries', () => {
      const orders: Order[] = [
        {
          id: 'o_paid',
          userId: 'u1',
          date: testDate,
          timestamp: 1,
          businessId: 'b1',
          businessName: 'Pizzería 1',
          zone: 'planta_urbana',
          amount: 2500,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true // Collected immediately
        },
        {
          id: 'o_unsettled_cust',
          userId: 'u1',
          date: testDate,
          timestamp: 2,
          businessId: 'b1',
          businessName: 'Pizzería 1',
          zone: 'barrio_cerca',
          amount: 3200,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: false // Customer owes money
        },
        {
          id: 'o_unsettled_biz',
          userId: 'u1',
          date: testDate,
          timestamp: 3,
          businessId: 'b1',
          businessName: 'Pizzería 1',
          zone: 'barrio_lejos',
          amount: 4500,
          paidBy: 'business',
          paymentMethod: 'cash',
          settled: false // Business owes money on account
        }
      ];

      const summary = calculateDailySummary(orders, [], testDate, 5000);

      // Total revenue = 2,500 + 3,200 + 4,500 = 10,200
      expect(summary.totalRevenue).toBe(10200);
      // Real cash earned ONLY comes from settled customer order = 2,500
      expect(summary.realCashEarned).toBe(2500);
      // Cash in pocket = 5,000 initial + 2,500 = 7,500
      expect(summary.cashInPocket).toBe(7500);
      // Unsettled revenue includes BOTH unpaid customer and unpaid business = 3,200 + 4,500 = 7,700
      expect(summary.unsettledRevenue).toBe(7700);

      // Business debt summary must only include business debt (4,500), ignoring customer debt
      const debt = calculateBusinessDebt(orders, 'b1');
      expect(debt.totalDebt).toBe(4500);
      expect(debt.unsettledOrdersCount).toBe(1);
      expect(debt.orders[0]?.id).toBe('o_unsettled_biz');
    });

    it('1.4 Extreme amounts, floating point decimals and centavo rounding', () => {
      const orders: Order[] = [
        {
          id: 'o_cents_1',
          userId: 'u1',
          date: testDate,
          timestamp: 1,
          businessId: 'b1',
          businessName: 'Kiosco',
          zone: 'planta_urbana',
          amount: 1234.56,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        },
        {
          id: 'o_cents_2',
          userId: 'u1',
          date: testDate,
          timestamp: 2,
          businessId: 'b1',
          businessName: 'Kiosco',
          zone: 'planta_urbana',
          amount: 765.44,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        },
        {
          id: 'o_extreme',
          userId: 'u1',
          date: testDate,
          timestamp: 3,
          businessId: 'b1',
          businessName: 'Mayorista',
          zone: 'custom',
          amount: 5000000.75, // 5 million pesos
          paidBy: 'customer',
          paymentMethod: 'transfer',
          settled: true
        }
      ];

      const expenses: Expense[] = [
        {
          id: 'e_cents',
          userId: 'u1',
          date: testDate,
          timestamp: 4,
          category: 'other',
          description: 'Cinta aisladora',
          amount: 250.35,
          paymentMethod: 'cash'
        }
      ];

      const summary = calculateDailySummary(orders, expenses, testDate, 10000.50);

      // 1234.56 + 765.44 = 2000.00
      // 2000.00 + 5000000.75 = 5002000.75
      expect(summary.totalRevenue).toBeCloseTo(5002000.75, 2);
      expect(summary.totalExpenses).toBeCloseTo(250.35, 2);
      expect(summary.netProfit).toBeCloseTo(5001750.40, 2);

      // Cash earned = 2000.00 - 250.35 = 1749.65
      expect(summary.realCashEarned).toBeCloseTo(1749.65, 2);
      // Cash in pocket = 10000.50 + 1749.65 = 11750.15
      expect(summary.cashInPocket).toBeCloseTo(11750.15, 2);
      // Transfer in account = 5000000.75
      expect(summary.moneyInAccount).toBeCloseTo(5000000.75, 2);
    });
  });

  // =========================================================================
  // SECTION 2: ODOMETER VIRTUAL ARITHMETIC & THRESHOLD BOUNDARIES
  // =========================================================================

  describe('2. Virtual Oil Odometer Arithmetic Stress Testing', () => {
    it('2.1 Protects against negative orders and future dates gracefully', () => {
      const lastRecord: MaintenanceRecord = {
        id: 'm1',
        userId: 'u1',
        date: '2026-09-20', // future date relative to refDate
        timestamp: 1,
        item: 'Aceite Castrol',
        cost: 15000,
        isOilChange: true,
        ordersSnapshot: 500 // higher than total historical orders (e.g. corrupted snapshot)
      };

      const refDate = new Date(2026, 8, 14); // 2026-09-14
      const status = calculateOilOdometer(400, lastRecord, { orders: 250, days: 30 }, refDate);

      // Must clamp to 0 rather than negative
      expect(status.ordersSinceLastChange).toBe(0);
      expect(status.daysSinceLastChange).toBe(0);
      expect(status.status).toBe('green');
    });

    it('2.2 Verifies exact boundary transitions for Green -> Yellow -> Red thresholds', () => {
      const refDate = new Date(2026, 8, 14); // 2026-09-14
      const makeRecord = (daysAgo: number, snapshot: number): MaintenanceRecord => {
        const d = new Date(refDate);
        d.setDate(d.getDate() - daysAgo);
        const dateStr = d.toISOString().split('T')[0]!;
        return {
          id: 'rec',
          userId: 'u1',
          date: dateStr,
          timestamp: 1,
          item: 'Aceite',
          cost: 10000,
          isOilChange: true,
          ordersSnapshot: snapshot
        };
      };

      // Base: thresholds = 250 orders, 30 days
      // Yellow: orders >= 200 OR days >= 25
      // Red: orders > 250 OR days > 30

      // Case A: 199 orders, 24 days -> GREEN
      const recGreen = makeRecord(24, 0);
      const stGreen = calculateOilOdometer(199, recGreen, { orders: 250, days: 30 }, refDate);
      expect(stGreen.status).toBe('green');

      // Case B: 200 orders, 0 days -> YELLOW (orders boundary)
      const recYellowOrders = makeRecord(0, 0);
      const stYellowOrders = calculateOilOdometer(200, recYellowOrders, { orders: 250, days: 30 }, refDate);
      expect(stYellowOrders.status).toBe('yellow');

      // Case C: 0 orders, 25 days -> YELLOW (days boundary)
      const recYellowDays = makeRecord(25, 0);
      const stYellowDays = calculateOilOdometer(0, recYellowDays, { orders: 250, days: 30 }, refDate);
      expect(stYellowDays.status).toBe('yellow');

      // Case D: 250 orders, 30 days -> YELLOW (exact upper edge of yellow)
      const recYellowMax = makeRecord(30, 0);
      const stYellowMax = calculateOilOdometer(250, recYellowMax, { orders: 250, days: 30 }, refDate);
      expect(stYellowMax.status).toBe('yellow');

      // Case E: 251 orders, 0 days -> RED (orders exceeded)
      const recRedOrders = makeRecord(0, 0);
      const stRedOrders = calculateOilOdometer(251, recRedOrders, { orders: 250, days: 30 }, refDate);
      expect(stRedOrders.status).toBe('red');

      // Case F: 0 orders, 31 days -> RED (days exceeded)
      const recRedDays = makeRecord(31, 0);
      const stRedDays = calculateOilOdometer(0, recRedDays, { orders: 250, days: 30 }, refDate);
      expect(stRedDays.status).toBe('red');
    });

    it('2.3 Handles undefined lastOilRecord (brand new courier without prior service)', () => {
      const status = calculateOilOdometer(120, undefined, { orders: 250, days: 30 });
      expect(status.ordersSinceLastChange).toBe(120);
      expect(status.daysSinceLastChange).toBe(0);
      expect(status.lastChangeDate).toBeUndefined();
      expect(status.status).toBe('green');

      // But if courier has 300 orders with no oil record:
      const statusOver = calculateOilOdometer(300, undefined, { orders: 250, days: 30 });
      expect(statusOver.status).toBe('red');
    });
  });

  // =========================================================================
  // SECTION 3: SHIFT DURATION & HOURLY RATE ARITHMETIC
  // =========================================================================

  describe('3. Shift Duration & Hourly Profit Stress Testing', () => {
    it('3.1 Accurately computes midnight-crossing shifts and decimal hours', () => {
      // 22:30 to 03:30 = 5.00 hours
      const crossMidnight = calculateShiftDurationHours('22:30', '03:30');
      expect(crossMidnight).toBe(5.0);

      // Normal afternoon shift: 13:15 to 19:45 = 6.50 hours
      const afternoon = calculateShiftDurationHours('13:15', '19:45');
      expect(afternoon).toBe(6.5);

      // Zero or missing inputs
      expect(calculateShiftDurationHours('', '19:45')).toBe(0);
      expect(calculateShiftDurationHours('13:15', '')).toBe(0);
      expect(calculateShiftDurationHours('invalid', '19:45')).toBe(0);
    });

    it('3.2 Hourly rate protects against zero, negative, or infinite hours worked', () => {
      expect(calculateHourlyProfitRate(50000, 0)).toBe(0);
      expect(calculateHourlyProfitRate(50000, -2)).toBe(0);
      expect(calculateHourlyProfitRate(50000, NaN)).toBe(0);
      expect(calculateHourlyProfitRate(50000, Infinity)).toBe(0);

      // Valid: $45,000 in 6 hours = $7,500/hr
      expect(calculateHourlyProfitRate(45000, 6)).toBe(7500);
    });

    it('3.3 Goal progress calculates clean percentages and remaining amounts', () => {
      // Goal: $40,000. Current: $30,000 -> 75%, remaining $10,000
      const prog = calculateGoalProgress(30000, 40000);
      expect(prog.percentage).toBe(75);
      expect(prog.isReached).toBe(false);
      expect(prog.remainingAmount).toBe(10000);

      // Goal reached: Current: $50,000 -> 125%, remaining $0
      const progReached = calculateGoalProgress(50000, 40000);
      expect(progReached.percentage).toBe(125);
      expect(progReached.isReached).toBe(true);
      expect(progReached.remainingAmount).toBe(0);

      // Zero or undefined goal
      const progZero = calculateGoalProgress(50000, 0);
      expect(progZero.targetGoal).toBe(0);
      expect(progZero.percentage).toBe(0);
      expect(progZero.isReached).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 4: BACK NAVIGATION & POPSTATE EDGE CASES
  // =========================================================================

  describe('4. Back Navigation & Popstate Edge Cases Stress Testing', () => {
    it('4.1 Rapid double-tap on Android back button does not cause double-pop or crash', () => {
      const backSpy = vi.spyOn(window.history, 'back');
      const onClose = vi.fn();

      renderHook(() =>
        useModalBackHandler({
          isOpen: true,
          onClose,
          modalId: 'rapid-tap-modal'
        })
      );

      const PopEventCls = (window as any).PopStateEvent || Event;

      // First rapid back gesture / hardware tap:
      act(() => {
        window.dispatchEvent(new PopEventCls('popstate', { state: null }));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
      // Must NOT call back() again because it was an external popstate
      expect(backSpy).not.toHaveBeenCalled();

      // Second rapid back gesture arriving immediately:
      act(() => {
        window.dispatchEvent(new PopEventCls('popstate', { state: null }));
      });

      // onClose was already fired; isPushedRef was set to false, no side-effects
      expect(backSpy).not.toHaveBeenCalled();
    });

    it('4.2 Multiple rapid Escape key presses trigger programmatic close exactly once', () => {
      const backSpy = vi.spyOn(window.history, 'back');
      const onClose = vi.fn();

      renderHook(() =>
        useModalBackHandler({
          isOpen: true,
          onClose,
          modalId: 'escape-rapid-modal'
        })
      );

      // Press Escape twice in 50ms while animation is in flight
      act(() => {
        const ev1 = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
        window.dispatchEvent(ev1);
        const ev2 = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
        window.dispatchEvent(ev2);
      });

      // window.history.back() must ONLY be called once because isPushedRef was flipped to false
      expect(backSpy).toHaveBeenCalledTimes(1);
    });

    it('4.3 Tab switching sequence: settings -> businesses -> map -> back button returns directly to orders', () => {
      const pushSpy = vi.spyOn(window.history, 'pushState');
      const replaceSpy = vi.spyOn(window.history, 'replaceState');

      const { result } = renderHook(() => useTabNavigation('orders'));
      expect(result.current.activeTab).toBe('orders');

      // 1. Move to settings (orders -> secondary): pushState
      act(() => {
        result.current.handleSelectTab('settings');
      });
      expect(result.current.activeTab).toBe('settings');
      expect(pushSpy).toHaveBeenCalledWith({ tab: 'settings' }, '');

      // 2. Move to businesses (secondary -> secondary): replaceState
      act(() => {
        result.current.handleSelectTab('businesses');
      });
      expect(result.current.activeTab).toBe('businesses');
      expect(replaceSpy).toHaveBeenCalledWith({ tab: 'businesses' }, '');

      // 3. Move to map (secondary -> secondary): replaceState
      act(() => {
        result.current.handleSelectTab('map');
      });
      expect(result.current.activeTab).toBe('map');
      expect(replaceSpy).toHaveBeenCalledWith({ tab: 'map' }, '');

      // 4. User presses Android back button: browser pops history back to initial state (null state)
      const PopEventCls = (window as any).PopStateEvent || Event;
      act(() => {
        window.dispatchEvent(new PopEventCls('popstate', { state: null }));
      });

      // User returns directly to 'orders' without having to step through settings and businesses
      expect(result.current.activeTab).toBe('orders');
    });

    it('4.4 Unmounting open modal cleans up history entry without leaking states', () => {
      const backSpy = vi.spyOn(window.history, 'back');
      const onClose = vi.fn();

      const { unmount } = renderHook(() =>
        useModalBackHandler({
          isOpen: true,
          onClose,
          modalId: 'unmount-cleanup-modal'
        })
      );

      expect(backSpy).not.toHaveBeenCalled();

      // Modal unmounts while still open (e.g. parent route or tab change)
      unmount();

      // Cleanup effect pops the history entry so user does not have a dead history entry
      expect(backSpy).toHaveBeenCalledTimes(1);
    });
  });
});
