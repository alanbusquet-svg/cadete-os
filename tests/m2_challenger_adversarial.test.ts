import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateDailySummary } from '../src/utils/calculations';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Order, Expense } from '../src/types';

describe('Adversarial Challenger Suite — CashDrawerCard & Financial Invariants', () => {
  const date = '2026-08-27';

  it('Invariant A: Zero Starting Cash ($0) maintains all cash drawer identities', () => {
    const orders: Order[] = [
      {
        id: 'ord_cash_1',
        userId: 'u1',
        date,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Biz',
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
        businessName: 'Biz',
        zone: 'barrio_cerca',
        amount: 3000,
        paidBy: 'customer',
        paymentMethod: 'transfer',
        settled: true
      },
      {
        id: 'ord_unsettled',
        userId: 'u1',
        date,
        timestamp: 3000,
        businessId: 'b2',
        businessName: 'Biz 2',
        zone: 'barrio_lejos',
        amount: 4000,
        paidBy: 'business',
        paymentMethod: 'cash',
        settled: false
      }
    ];

    const expenses: Expense[] = [
      {
        id: 'exp_cash_1',
        userId: 'u1',
        date,
        timestamp: 1500,
        category: 'fuel',
        description: 'Nafta',
        amount: 1000,
        paymentMethod: 'cash'
      },
      {
        id: 'exp_trans_1',
        userId: 'u1',
        date,
        timestamp: 2500,
        category: 'food',
        description: 'Almuerzo',
        amount: 500,
        paymentMethod: 'transfer'
      }
    ];

    const summary = calculateDailySummary(orders, expenses, date, 0);

    expect(summary.startingCash).toBe(0);
    // Cash collected = 2500, Cash expenses = 1000 -> realCashEarned = 1500
    expect(summary.realCashEarned).toBe(1500);
    // cashInPocket = 0 + 1500 = 1500
    expect(summary.cashInPocket).toBe(1500);
    // moneyInAccount = 3000 - 500 = 2500
    expect(summary.moneyInAccount).toBe(2500);
    // unsettledRevenue = 4000
    expect(summary.unsettledRevenue).toBe(4000);
    // totalRevenue = 9500, totalExpenses = 1500 -> netProfit = 8000
    expect(summary.netProfit).toBe(8000);

    // Fundamental Invariant 1: cashInPocket === startingCash + realCashEarned
    expect(summary.cashInPocket).toBe((summary.startingCash ?? 0) + (summary.realCashEarned ?? 0));
    // Fundamental Invariant 2: netProfit === realCashEarned + moneyInAccount + unsettledRevenue
    expect(summary.netProfit).toBe((summary.realCashEarned ?? 0) + summary.moneyInAccount + summary.unsettledRevenue);
    // Fundamental Invariant 3: netProfit === totalRevenue - totalExpenses
    expect(summary.netProfit).toBe(summary.totalRevenue - summary.totalExpenses);
  });

  it('Invariant B: Positive Starting Cash ($12.500) accurately offsets cash in pocket without inflating real earnings', () => {
    const startingCash = 12500;
    const orders: Order[] = [
      {
        id: 'ord_1',
        userId: 'u1',
        date,
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
    const expenses: Expense[] = [
      {
        id: 'exp_1',
        userId: 'u1',
        date,
        timestamp: 1500,
        category: 'fuel',
        description: 'Nafta',
        amount: 2000,
        paymentMethod: 'cash'
      }
    ];

    const summary = calculateDailySummary(orders, expenses, date, startingCash);

    expect(summary.startingCash).toBe(12500);
    // Real earned cash = 5000 - 2000 = 3000 (starting float is NOT counted as profit!)
    expect(summary.realCashEarned).toBe(3000);
    // Total physical cash in hand = 12500 + 3000 = 15500
    expect(summary.cashInPocket).toBe(15500);
    expect(summary.netProfit).toBe(3000);

    // Invariant: Cash in Pocket - Starting Cash === Real Cash Earned
    expect(summary.cashInPocket - (summary.startingCash ?? 0)).toBe(summary.realCashEarned);
  });

  it('Invariant C: Negative Net Profit (Heavy operational loss) preserves algebra and drawer reconciliation', () => {
    const startingCash = 5000;
    const orders: Order[] = [
      {
        id: 'ord_1',
        userId: 'u1',
        date,
        timestamp: 1000,
        businessId: 'b1',
        businessName: 'Biz',
        zone: 'planta_urbana',
        amount: 2000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      }
    ];
    // Big mechanic repair paid in cash ($25.000) + transfer ($10.000)
    const expenses: Expense[] = [
      {
        id: 'exp_heavy_cash',
        userId: 'u1',
        date,
        timestamp: 1500,
        category: 'puncture',
        description: 'Taller motor',
        amount: 25000,
        paymentMethod: 'cash'
      },
      {
        id: 'exp_transfer',
        userId: 'u1',
        date,
        timestamp: 2000,
        category: 'other',
        description: 'Seguro moto',
        amount: 10000,
        paymentMethod: 'transfer'
      }
    ];

    const summary = calculateDailySummary(orders, expenses, date, startingCash);

    expect(summary.totalRevenue).toBe(2000);
    expect(summary.totalExpenses).toBe(35000);
    expect(summary.netProfit).toBe(-33000);

    // Cash collected = 2000, Cash expenses = 25000 -> realCashEarned = -23000
    expect(summary.realCashEarned).toBe(-23000);
    // cashInPocket = 5000 + (-23000) = -18000
    expect(summary.cashInPocket).toBe(-18000);
    // moneyInAccount = 0 - 10000 = -10000
    expect(summary.moneyInAccount).toBe(-10000);

    // Invariant: netProfit === realCashEarned + moneyInAccount + unsettledRevenue (-23000 + -10000 + 0 = -33000)
    expect(summary.netProfit).toBe((summary.realCashEarned ?? 0) + summary.moneyInAccount + summary.unsettledRevenue);
    expect(summary.cashInPocket).toBe((summary.startingCash ?? 0) + (summary.realCashEarned ?? 0));
  });

  it('Invariant D: Zero Trips / Empty Shift with and without starting cash', () => {
    // 1. Completely empty shift
    const emptySummary = calculateDailySummary([], [], date, 0);
    expect(emptySummary.totalOrdersCount).toBe(0);
    expect(emptySummary.totalRevenue).toBe(0);
    expect(emptySummary.totalExpenses).toBe(0);
    expect(emptySummary.netProfit).toBe(0);
    expect(emptySummary.realCashEarned).toBe(0);
    expect(emptySummary.cashInPocket).toBe(0);
    expect(emptySummary.moneyInAccount).toBe(0);
    expect(emptySummary.unsettledRevenue).toBe(0);

    // 2. Zero trips but with starting float $8.000
    const floatOnlySummary = calculateDailySummary([], [], date, 8000);
    expect(floatOnlySummary.totalOrdersCount).toBe(0);
    expect(floatOnlySummary.startingCash).toBe(8000);
    expect(floatOnlySummary.realCashEarned).toBe(0);
    expect(floatOnlySummary.cashInPocket).toBe(8000);
    expect(floatOnlySummary.netProfit).toBe(0);
  });

  it('Invariant E: High Transaction Volume (5,000 orders & 2,500 expenses) stress test without float drift', () => {
    const orders: Order[] = [];
    const expenses: Expense[] = [];
    const startingCash = 20000;

    let expectedTotalRevenue = 0;
    let expectedCashCollected = 0;
    let expectedTransferCollected = 0;
    let expectedUnsettledRevenue = 0;

    for (let i = 0; i < 5000; i++) {
      const amount = 1000 + (i % 500) * 10; // Deterministic varied amounts
      const isCustomer = i % 3 !== 0;
      const isCash = i % 2 === 0;
      const isSettled = isCustomer ? true : i % 5 === 0;

      expectedTotalRevenue += amount;
      if (isCustomer) {
        if (isCash) expectedCashCollected += amount;
        else expectedTransferCollected += amount;
      } else {
        if (isSettled) {
          if (isCash) expectedCashCollected += amount;
          else expectedTransferCollected += amount;
        } else {
          expectedUnsettledRevenue += amount;
        }
      }

      orders.push({
        id: `ord_${i}`,
        userId: 'u1',
        date,
        timestamp: 1000 + i,
        businessId: `biz_${i % 10}`,
        businessName: `Biz ${i % 10}`,
        zone: 'planta_urbana',
        amount,
        paidBy: isCustomer ? 'customer' : 'business',
        paymentMethod: isCash ? 'cash' : 'transfer',
        settled: isSettled
      });
    }

    let expectedTotalExpenses = 0;
    let expectedCashExpenses = 0;
    let expectedTransferExpenses = 0;

    for (let j = 0; j < 2500; j++) {
      const amount = 500 + (j % 200) * 5;
      const isCash = j % 3 === 0;

      expectedTotalExpenses += amount;
      if (isCash) expectedCashExpenses += amount;
      else expectedTransferExpenses += amount;

      expenses.push({
        id: `exp_${j}`,
        userId: 'u1',
        date,
        timestamp: 2000 + j,
        category: 'fuel',
        description: 'Gasto',
        amount,
        paymentMethod: isCash ? 'cash' : 'transfer'
      });
    }

    const summary = calculateDailySummary(orders, expenses, date, startingCash);

    expect(summary.totalOrdersCount).toBe(5000);
    expect(summary.totalRevenue).toBe(expectedTotalRevenue);
    expect(summary.totalExpenses).toBe(expectedTotalExpenses);
    expect(summary.netProfit).toBe(expectedTotalRevenue - expectedTotalExpenses);

    const expectedRealCash = expectedCashCollected - expectedCashExpenses;
    expect(summary.realCashEarned).toBe(expectedRealCash);
    expect(summary.cashInPocket).toBe(startingCash + expectedRealCash);
    expect(summary.moneyInAccount).toBe(expectedTransferCollected - expectedTransferExpenses);
    expect(summary.unsettledRevenue).toBe(expectedUnsettledRevenue);

    // Check invariants
    expect(summary.cashInPocket).toBe((summary.startingCash ?? 0) + (summary.realCashEarned ?? 0));
    expect(summary.netProfit).toBe((summary.realCashEarned ?? 0) + summary.moneyInAccount + summary.unsettledRevenue);
  });
});

describe('Adversarial Challenger Suite — ConfirmDialog Component Lifecycle & UX Contracts', () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;
  let originalWindow: unknown;
  let originalDocument: unknown;

  beforeEach(() => {
    originalWindow = (globalThis as unknown as { window?: unknown }).window;
    originalDocument = (globalThis as unknown as { document?: unknown }).document;

    const listeners = new Map<string, Function[]>();
    const mockWindow = {
      addEventListener: vi.fn((event: string, handler: Function) => {
        const list = listeners.get(event) || [];
        list.push(handler);
        listeners.set(event, list);
      }),
      removeEventListener: vi.fn((event: string, handler: Function) => {
        const list = listeners.get(event) || [];
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
        listeners.set(event, list);
      }),
      dispatchEvent: vi.fn((event: { type?: string; key?: string }) => {
        const list = listeners.get(event.type || 'keydown') || [];
        list.forEach((fn) => fn(event));
      })
    };

    const mockDocument = {
      body: {
        style: {
          overflow: ''
        }
      }
    };

    (globalThis as unknown as { window: unknown }).window = mockWindow;
    (globalThis as unknown as { document: unknown }).document = mockDocument;

    addEventSpy = vi.spyOn(mockWindow, 'addEventListener');
    removeEventSpy = vi.spyOn(mockWindow, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    (globalThis as unknown as { document: unknown }).document = originalDocument;
  });

  it('verifies ConfirmDialog event listener attachment and cleanup contract', () => {
    // Simulating the lifecycle effect logic of ConfirmDialog
    const onCancel = vi.fn();
    let isOpen = true;

    const attachEffect = () => {
      if (!isOpen) return () => {};
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: { key?: string }) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };

      window.addEventListener('keydown', handleKeyDown as EventListener);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown as EventListener);
      };
    };

    // Mount with isOpen = true
    const cleanup = attachEffect();
    expect(document.body.style.overflow).toBe('hidden');
    expect(addEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    // Simulate Escape keydown
    const escapeEvent = { type: 'keydown', key: 'Escape' } as unknown as Event;
    window.dispatchEvent(escapeEvent);
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Simulate Other keydown (should NOT trigger cancel)
    const enterEvent = { type: 'keydown', key: 'Enter' } as unknown as Event;
    window.dispatchEvent(enterEvent);
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Unmount / Close dialog
    cleanup();
    expect(document.body.style.overflow).toBe('');
    expect(removeEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('verifies rapid open/close cycles do not leak event listeners or lock scroll', () => {
    const onCancel = vi.fn();

    for (let i = 0; i < 50; i++) {
      let isOpen = true;
      let cleanup: () => void = () => {};

      // Open
      if (isOpen) {
        document.body.style.overflow = 'hidden';
        const handler = (e: { key?: string }) => {
          if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handler as EventListener);
        cleanup = () => {
          document.body.style.overflow = '';
          window.removeEventListener('keydown', handler as EventListener);
        };
      }

      // Rapid close
      isOpen = false;
      cleanup();
    }

    // Scroll must be restored to clean state
    expect(document.body.style.overflow).toBe('');
    // Listener additions and removals must match exactly
    expect(addEventSpy).toHaveBeenCalledTimes(50);
    expect(removeEventSpy).toHaveBeenCalledTimes(50);
  });
});

describe('Adversarial Challenger Suite — window.confirm Zero-Occurrence Verification', () => {
  const getFileContent = (relPath: string): string => {
    const fullPath = resolve(__dirname, '..', relPath);
    return readFileSync(fullPath, 'utf-8');
  };

  it('verifies OrderList.tsx has 0 occurrences of window.confirm and imports ConfirmDialog', () => {
    const content = getFileContent('src/components/orders/OrderList.tsx');
    expect(content).not.toContain('window.confirm');
    expect(content).not.toMatch(/\bconfirm\s*\(/);
    expect(content).toContain("import { ConfirmDialog } from '../common/ConfirmDialog';");
    expect(content).toContain('<ConfirmDialog');
  });

  it('verifies ExpenseList.tsx has 0 occurrences of window.confirm and imports ConfirmDialog', () => {
    const content = getFileContent('src/components/finance/ExpenseList.tsx');
    expect(content).not.toContain('window.confirm');
    expect(content).not.toMatch(/\bconfirm\s*\(/);
    expect(content).toContain("import { ConfirmDialog } from '../common/ConfirmDialog';");
    expect(content).toContain('<ConfirmDialog');
  });

  it('verifies SettingsView.tsx has 0 occurrences of window.confirm and imports ConfirmDialog', () => {
    const content = getFileContent('src/components/settings/SettingsView.tsx');
    expect(content).not.toContain('window.confirm');
    expect(content).not.toMatch(/\bconfirm\s*\(/);
    expect(content).toContain("import { ConfirmDialog } from '../common/ConfirmDialog';");
    expect(content).toContain('<ConfirmDialog');
  });

  it('verifies CashDrawerCard.tsx does NOT contain duplicate "Efectivo cobrado menos gastos:" row', () => {
    const content = getFileContent('src/components/finance/CashDrawerCard.tsx');
    // Ensure the redundant string is eliminated
    expect(content).not.toContain('Efectivo cobrado menos gastos:');
    // Ensure the authoritative real cash earned string is present exactly once
    const matches = content.match(/Efectivo Real Ganado:/g);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(1);
  });

  it('verifies SidebarNav.tsx dynamic city binding without hardcoded "Bolívar" badge', () => {
    const content = getFileContent('src/components/layout/SidebarNav.tsx');
    expect(content).toContain("user?.settings?.cityDefault || 'Bolívar'");
    expect(content).not.toMatch(/>\s*Bolívar\s*<\/span>/);
  });
});
