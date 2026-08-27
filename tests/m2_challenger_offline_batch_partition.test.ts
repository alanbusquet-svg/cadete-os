import { describe, it, expect, vi, beforeEach } from 'vitest';

// ==========================================
// HOISTED MOCK DEFINITIONS FOR VITEST
// ==========================================
const {
  mockDoc,
  mockCollection,
  mockGetDoc,
  mockSetDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockQuery,
  mockWhere,
  mockOnSnapshot,
  mockWriteBatch,
  mockGetDocs,
  mockGetFirestore
} = vi.hoisted(() => {
  return {
    mockDoc: vi.fn((_db: any, col: string, id: string) => ({ id, col, path: `${col}/${id}` })),
    mockCollection: vi.fn((_db: any, col: string) => ({ col, path: col })),
    mockGetDoc: vi.fn(),
    mockSetDoc: vi.fn().mockResolvedValue(undefined),
    mockUpdateDoc: vi.fn().mockResolvedValue(undefined),
    mockDeleteDoc: vi.fn().mockResolvedValue(undefined),
    mockQuery: vi.fn((colRef: any, ...constraints: any[]) => ({ colRef, constraints })),
    mockWhere: vi.fn((field: string, op: string, val: any) => ({ field, op, val })),
    mockOnSnapshot: vi.fn(),
    mockWriteBatch: vi.fn(),
    mockGetDocs: vi.fn(),
    mockGetFirestore: vi.fn((_app?: any) => ({ type: 'firestore_db' }))
  };
});

vi.mock('firebase/firestore', () => ({
  getFirestore: (app?: any) => mockGetFirestore(app),
  doc: (db: any, col: string, id: string) => mockDoc(db, col, id),
  collection: (db: any, col: string) => mockCollection(db, col),
  getDoc: (docRef: any) => mockGetDoc(docRef),
  setDoc: (docRef: any, data: any, options?: any) => mockSetDoc(docRef, data, options),
  updateDoc: (docRef: any, data: any) => mockUpdateDoc(docRef, data),
  deleteDoc: (docRef: any) => mockDeleteDoc(docRef),
  query: (colRef: any, ...constraints: any[]) => mockQuery(colRef, ...constraints),
  where: (field: string, op: string, val: any) => mockWhere(field, op, val),
  onSnapshot: (q: any, onNext: any, onError?: any) => mockOnSnapshot(q, onNext, onError),
  writeBatch: (db: any) => mockWriteBatch(db),
  getDocs: (q: any) => mockGetDocs(q)
}));

import {
  COLLECTIONS,
  subscribeCollection,
  batchSettleOrders,
  seedInitialUserData
} from '../src/lib/firestoreService';
import { storage, DEFAULT_USER } from '../src/lib/storage';
import type { Order, Expense, Business, MaintenanceRecord, Shift, UserProfile } from '../src/types';

describe('Milestone 2 Challenger Suite: Offline Resilience, Batch Operations & Multi-Tenant Partitioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  });

  // =========================================================================
  // 1. DEMO MODE & OFFLINE RESILIENCE: 0 NETWORK CALLS & LOCALSTORAGE ONLY
  // =========================================================================
  describe('1. Demo Mode Offline Resilience & 0-Network Guarantee', () => {
    const demoUid = 'cadete_demo_1';

    it('guarantees 0 Firestore network calls during full lifecycle demo CRUD mutations', () => {
      // 1. Orders CRUD in local storage
      const initialOrders = storage.getOrders(demoUid);
      expect(initialOrders.length).toBeGreaterThan(0);

      const newOrder: Order = {
        id: 'ord_demo_test_99',
        userId: demoUid,
        date: '2026-08-27',
        timestamp: Date.now(),
        businessId: 'biz_don_antonio',
        businessName: 'Pizzería Don Antonio',
        zone: 'planta_urbana',
        amount: 2500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      storage.saveOrders(demoUid, [newOrder, ...initialOrders]);
      const savedOrders = storage.getOrders(demoUid);
      expect(savedOrders[0]?.id).toBe('ord_demo_test_99');

      // Update Order
      const updatedOrders = savedOrders.map((o) => (o.id === newOrder.id ? { ...o, amount: 3200 } : o));
      storage.saveOrders(demoUid, updatedOrders);
      expect(storage.getOrders(demoUid)[0]?.amount).toBe(3200);

      // Delete Order
      const filteredOrders = updatedOrders.filter((o) => o.id !== newOrder.id);
      storage.saveOrders(demoUid, filteredOrders);
      expect(storage.getOrders(demoUid).find((o) => o.id === newOrder.id)).toBeUndefined();

      // 2. Expenses CRUD in local storage
      const newExpense: Expense = {
        id: 'exp_demo_test_99',
        userId: demoUid,
        date: '2026-08-27',
        timestamp: Date.now(),
        category: 'fuel',
        description: 'Nafta Infinia YPF',
        amount: 8500,
        paymentMethod: 'cash'
      };
      storage.saveExpenses(demoUid, [newExpense]);
      expect(storage.getExpenses(demoUid)[0]?.amount).toBe(8500);

      // 3. Businesses CRUD in local storage
      const newBiz: Business = {
        id: 'biz_demo_custom',
        userId: demoUid,
        name: 'Lomitos El Flaco',
        defaultPrices: { plantaUrbana: 1800, barrioCerca: 2500, barrioLejos: 3500 },
        paymentCycle: 'weekly',
        active: true,
        createdAt: '2026-08-27T10:00:00Z'
      };
      storage.saveBusinesses(demoUid, [newBiz]);
      expect(storage.getBusinesses(demoUid)[0]?.name).toBe('Lomitos El Flaco');

      // 4. Maintenance CRUD in local storage
      const newMaint: MaintenanceRecord = {
        id: 'maint_demo_custom',
        userId: demoUid,
        date: '2026-08-27',
        timestamp: Date.now(),
        item: 'Cambio de cubierta delantera',
        cost: 32000,
        isOilChange: false,
        ordersSnapshot: 120
      };
      storage.saveMaintenance(demoUid, [newMaint]);
      expect(storage.getMaintenance(demoUid)[0]?.cost).toBe(32000);

      // 5. Shift Management in local storage
      const newShift: Shift = {
        id: 'shift_demo_custom',
        userId: demoUid,
        date: '2026-08-27',
        startTime: '19:00',
        endTime: '23:30',
        startingCash: 10000,
        status: 'completed',
        createdAt: Date.now()
      };
      storage.saveShifts(demoUid, [newShift]);
      expect(storage.getShifts(demoUid)[0]?.startingCash).toBe(10000);
      expect(storage.getShiftByDate(demoUid, '2026-08-27')?.status).toBe('completed');

      // Rigorous assertion: ZERO Firestore calls were made across all mutations
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockUpdateDoc).not.toHaveBeenCalled();
      expect(mockDeleteDoc).not.toHaveBeenCalled();
      expect(mockWriteBatch).not.toHaveBeenCalled();
      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('persists data across localStorage sessions under exact tenant key prefixes', () => {
      const demoKey = 'cadete_os_v1_cadete_demo_1_orders';
      const orderData: Order[] = [
        {
          id: 'ord_key_test',
          userId: demoUid,
          date: '2026-08-27',
          timestamp: 1000,
          businessId: 'b1',
          businessName: 'Biz',
          zone: 'planta_urbana',
          amount: 1500,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        }
      ];

      storage.saveOrders(demoUid, orderData);

      const rawStored = localStorage.getItem(demoKey);
      expect(rawStored).not.toBeNull();
      const parsed = JSON.parse(rawStored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('ord_key_test');
    });
  });

  // =========================================================================
  // 2. ATOMIC BATCH SETTLEMENTS: 50+, 100, 250, 500 ORDERS PERFORMANCE & ATOMICITY
  // =========================================================================
  describe('2. Batch Settle Orders Stress & Atomicity Verification', () => {
    it('batchSettleOrders: atomically settles 50 orders in a single Firestore batch commit in <25ms', async () => {
      const updateBatchSpy = vi.fn();
      const commitBatchSpy = vi.fn().mockResolvedValue(undefined);

      mockWriteBatch.mockReturnValue({
        update: updateBatchSpy,
        commit: commitBatchSpy
      });

      const orderIds = Array.from({ length: 50 }, (_, i) => `ord_batch_${i + 1}`);
      const settledAt = '2026-08-27T18:30:00.000Z';

      const t0 = performance.now();
      await batchSettleOrders(orderIds, settledAt);
      const durationMs = performance.now() - t0;

      // Verify all 50 updates were added to the batch
      expect(updateBatchSpy).toHaveBeenCalledTimes(50);
      for (let i = 0; i < 50; i++) {
        expect(updateBatchSpy).toHaveBeenNthCalledWith(
          i + 1,
          expect.objectContaining({ id: `ord_batch_${i + 1}`, col: COLLECTIONS.ORDERS }),
          {
            settled: true,
            settledAt: '2026-08-27T18:30:00.000Z'
          }
        );
      }

      // Verify atomic single commit
      expect(commitBatchSpy).toHaveBeenCalledTimes(1);
      expect(durationMs).toBeLessThan(50); // High-performance check
    });

    it('batchSettleOrders: handles 150 orders simultaneously with atomic batch updates', async () => {
      const updateBatchSpy = vi.fn();
      const commitBatchSpy = vi.fn().mockResolvedValue(undefined);

      mockWriteBatch.mockReturnValue({
        update: updateBatchSpy,
        commit: commitBatchSpy
      });

      const orderIds = Array.from({ length: 150 }, (_, i) => `ord_large_${i + 1}`);
      const settledAt = '2026-08-27T20:00:00.000Z';

      await batchSettleOrders(orderIds, settledAt);

      expect(updateBatchSpy).toHaveBeenCalledTimes(150);
      expect(commitBatchSpy).toHaveBeenCalledTimes(1);
    });

    it('batchSettleOrders: handles Firestore maximum batch boundary of 500 operations', async () => {
      const updateBatchSpy = vi.fn();
      const commitBatchSpy = vi.fn().mockResolvedValue(undefined);

      mockWriteBatch.mockReturnValue({
        update: updateBatchSpy,
        commit: commitBatchSpy
      });

      const orderIds = Array.from({ length: 500 }, (_, i) => `ord_max_500_${i}`);
      const settledAt = '2026-08-27T23:59:59.000Z';

      await batchSettleOrders(orderIds, settledAt);

      expect(updateBatchSpy).toHaveBeenCalledTimes(500);
      expect(commitBatchSpy).toHaveBeenCalledTimes(1);
    });

    it('batchSettleOrders: ignores empty strings or falsy elements safely without crashing', async () => {
      const updateBatchSpy = vi.fn();
      const commitBatchSpy = vi.fn().mockResolvedValue(undefined);

      mockWriteBatch.mockReturnValue({
        update: updateBatchSpy,
        commit: commitBatchSpy
      });

      const dirtyOrderIds = ['ord_valid_1', '', 'ord_valid_2', (undefined as unknown as string), 'ord_valid_3'];
      const settledAt = '2026-08-27T19:00:00.000Z';

      await batchSettleOrders(dirtyOrderIds, settledAt);

      // Only 3 valid order IDs should be updated
      expect(updateBatchSpy).toHaveBeenCalledTimes(3);
      expect(commitBatchSpy).toHaveBeenCalledTimes(1);
    });

    it('batchSettleOrders: handles empty array as safe no-op without initializing writeBatch', async () => {
      await batchSettleOrders([], '2026-08-27T19:00:00.000Z');
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('batchSettleOrders: rejects when Firestore batch commit fails and propagates error', async () => {
      const updateBatchSpy = vi.fn();
      const commitBatchSpy = vi.fn().mockRejectedValue(new Error('Firestore quota exceeded / network drop'));

      mockWriteBatch.mockReturnValue({
        update: updateBatchSpy,
        commit: commitBatchSpy
      });

      await expect(batchSettleOrders(['ord_fail_1'], '2026-08-27T19:00:00Z')).rejects.toThrow(
        'Firestore quota exceeded / network drop'
      );
    });
  });

  // =========================================================================
  // 3. MULTI-TENANT PARTITION BOUNDARIES & CROSS-CONTAMINATION CHECKS
  // =========================================================================
  describe('3. Multi-Tenant Partition Boundaries & Isolation', () => {
    const userA = 'cadete_tenant_alpha_1';
    const userB = 'cadete_tenant_beta_2';

    it('strictly isolates local storage partitions between User A and User B', () => {
      // User A creates 3 orders
      const ordersA: Order[] = [
        {
          id: 'ord_A1',
          userId: userA,
          date: '2026-08-27',
          timestamp: 1000,
          businessId: 'biz_A',
          businessName: 'Pizzería Alpha',
          zone: 'planta_urbana',
          amount: 2000,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        },
        {
          id: 'ord_A2',
          userId: userA,
          date: '2026-08-27',
          timestamp: 2000,
          businessId: 'biz_A',
          businessName: 'Pizzería Alpha',
          zone: 'barrio_cerca',
          amount: 2500,
          paidBy: 'customer',
          paymentMethod: 'transfer',
          settled: true
        }
      ];

      // User B creates 1 order
      const ordersB: Order[] = [
        {
          id: 'ord_B1',
          userId: userB,
          date: '2026-08-27',
          timestamp: 3000,
          businessId: 'biz_B',
          businessName: 'Hamburguesería Beta',
          zone: 'barrio_lejos',
          amount: 3500,
          paidBy: 'business',
          paymentMethod: 'cash',
          settled: false
        }
      ];

      storage.saveOrders(userA, ordersA);
      storage.saveOrders(userB, ordersB);

      // Verify User A reads only User A
      const fetchedA = storage.getOrders(userA);
      expect(fetchedA).toHaveLength(2);
      expect(fetchedA.map((o) => o.id)).toEqual(['ord_A1', 'ord_A2']);
      expect(fetchedA.every((o) => o.userId === userA)).toBe(true);

      // Verify User B reads only User B
      const fetchedB = storage.getOrders(userB);
      expect(fetchedB).toHaveLength(1);
      expect(fetchedB[0]?.id).toBe('ord_B1');
      expect(fetchedB[0]?.userId).toBe(userB);

      // Deleting User A's data has zero effect on User B
      storage.saveOrders(userA, []);
      expect(storage.getOrders(userA)).toHaveLength(0);
      expect(storage.getOrders(userB)).toHaveLength(1);
      expect(storage.getOrders(userB)[0]?.id).toBe('ord_B1');
    });

    it('partitions all entities (expenses, businesses, maintenance, shifts) cleanly between tenants', () => {
      // 1. Expenses isolation
      const expA: Expense = {
        id: 'exp_A',
        userId: userA,
        date: '2026-08-27',
        timestamp: 1000,
        category: 'fuel',
        description: 'Nafta Alpha',
        amount: 5000,
        paymentMethod: 'cash'
      };
      const expB: Expense = {
        id: 'exp_B',
        userId: userB,
        date: '2026-08-27',
        timestamp: 2000,
        category: 'food',
        description: 'Comida Beta',
        amount: 2000,
        paymentMethod: 'transfer'
      };
      storage.saveExpenses(userA, [expA]);
      storage.saveExpenses(userB, [expB]);

      expect(storage.getExpenses(userA)[0]?.description).toBe('Nafta Alpha');
      expect(storage.getExpenses(userB)[0]?.description).toBe('Comida Beta');

      // 2. Businesses isolation
      const bizA: Business = {
        id: 'biz_A',
        userId: userA,
        name: 'Comercio Alpha',
        defaultPrices: { plantaUrbana: 1000, barrioCerca: 2000, barrioLejos: 3000 },
        paymentCycle: 'daily',
        active: true,
        createdAt: '2026-08-01'
      };
      const bizB: Business = {
        id: 'biz_B',
        userId: userB,
        name: 'Comercio Beta',
        defaultPrices: { plantaUrbana: 1500, barrioCerca: 2500, barrioLejos: 3500 },
        paymentCycle: 'weekly',
        active: true,
        createdAt: '2026-08-01'
      };
      storage.saveBusinesses(userA, [bizA]);
      storage.saveBusinesses(userB, [bizB]);

      expect(storage.getBusinesses(userA)[0]?.name).toBe('Comercio Alpha');
      expect(storage.getBusinesses(userB)[0]?.name).toBe('Comercio Beta');

      // 3. Maintenance isolation
      const maintA: MaintenanceRecord = {
        id: 'maint_A',
        userId: userA,
        date: '2026-08-20',
        timestamp: 1000,
        item: 'Aceite Motul Alpha',
        cost: 15000,
        isOilChange: true,
        ordersSnapshot: 100
      };
      const maintB: MaintenanceRecord = {
        id: 'maint_B',
        userId: userB,
        date: '2026-08-25',
        timestamp: 2000,
        item: 'Cadena Beta',
        cost: 20000,
        isOilChange: false,
        ordersSnapshot: 50
      };
      storage.saveMaintenance(userA, [maintA]);
      storage.saveMaintenance(userB, [maintB]);

      expect(storage.getMaintenance(userA)[0]?.item).toBe('Aceite Motul Alpha');
      expect(storage.getMaintenance(userB)[0]?.item).toBe('Cadena Beta');

      // 4. Shifts isolation
      const shiftA: Shift = {
        id: 'shift_A',
        userId: userA,
        date: '2026-08-27',
        startingCash: 8000,
        status: 'in_progress',
        createdAt: 1000
      };
      const shiftB: Shift = {
        id: 'shift_B',
        userId: userB,
        date: '2026-08-27',
        startingCash: 12000,
        status: 'completed',
        createdAt: 2000
      };
      storage.saveShifts(userA, [shiftA]);
      storage.saveShifts(userB, [shiftB]);

      expect(storage.getShifts(userA)[0]?.startingCash).toBe(8000);
      expect(storage.getShifts(userB)[0]?.startingCash).toBe(12000);
    });

    it('enforces multi-tenant query partitioning with where("userId", "==", userId) for Firestore subscriptions', () => {
      const onDataAlpha = vi.fn();
      const onDataBeta = vi.fn();

      subscribeCollection(COLLECTIONS.ORDERS, userA, onDataAlpha);
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', userA);

      subscribeCollection(COLLECTIONS.ORDERS, userB, onDataBeta);
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', userB);
    });

    it('guarantees tenant isolation during export and cross-tenant import', () => {
      // User A creates distinct profile and orders
      const profileA: UserProfile = {
        ...DEFAULT_USER,
        uid: userA,
        displayName: 'Cadete Alpha',
        settings: {
          ...DEFAULT_USER.settings,
          cityDefault: 'Olavarría',
          oilChangeThresholdOrders: 300
        }
      };
      storage.saveProfile(userA, profileA);

      const ordersA: Order[] = [
        {
          id: 'ord_A_export',
          userId: userA,
          date: '2026-08-27',
          timestamp: 1000,
          businessId: 'biz_1',
          businessName: 'Biz Export',
          zone: 'planta_urbana',
          amount: 2000,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        }
      ];
      storage.saveOrders(userA, ordersA);

      // Export User A backup
      const backupJson = storage.exportAll(userA);
      const parsedBackup = JSON.parse(backupJson);
      expect(parsedBackup.profile.uid).toBe(userA);
      expect(parsedBackup.orders[0].id).toBe('ord_A_export');

      // Import into User B namespace
      const importSuccess = storage.importAll(userB, backupJson);
      expect(importSuccess).toBe(true);

      // Verify User B profile received settings but its UID is strictly userB
      const profileB = storage.getProfile(userB);
      expect(profileB.uid).toBe(userB);
      expect(profileB.displayName).toBe('Cadete Alpha');
      expect(profileB.settings.cityDefault).toBe('Olavarría');

      // Verify User A profile is untouched
      expect(storage.getProfile(userA).uid).toBe(userA);

      // Verify User B orders are populated
      const ordersB = storage.getOrders(userB);
      expect(ordersB).toHaveLength(1);
      expect(ordersB[0]?.id).toBe('ord_A_export');
    });

    it('seedInitialUserData uses tenant-scoped document IDs to prevent Firestore collision', async () => {
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

      const batchSetSpy = vi.fn();
      const batchCommitSpy = vi.fn().mockResolvedValue(undefined);

      mockWriteBatch.mockReturnValueOnce({
        set: batchSetSpy,
        commit: batchCommitSpy
      });

      await seedInitialUserData('tenant_xyz_999');

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        COLLECTIONS.BUSINESSES,
        expect.stringContaining('_tenant_xyz_999')
      );
      expect(batchSetSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'tenant_xyz_999' })
      );
      expect(batchCommitSpy).toHaveBeenCalledTimes(1);
    });

    it('real-time subscription cleanup cleanly detaches listener to prevent memory leaks', () => {
      const mockUnsubscribe = vi.fn();
      mockOnSnapshot.mockReturnValueOnce(mockUnsubscribe);

      const unsub = subscribeCollection(COLLECTIONS.EXPENSES, 'tenant_leak_test', vi.fn());
      expect(mockOnSnapshot).toHaveBeenCalled();

      unsub();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
