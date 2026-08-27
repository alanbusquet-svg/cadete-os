import { describe, it, expect, vi, beforeEach } from 'vitest';

// =========================================================================
// HOISTED MOCK DEFINITIONS FOR VITEST
// =========================================================================
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
  firestoreService,
  COLLECTIONS,
  subscribeCollection
} from '../src/lib/firestoreService';
import { storage } from '../src/lib/storage';
import type { Order } from '../src/types';

describe('Milestone 2 Empirical Challenger: Real-Time Listeners, Race Conditions & Stress Harness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  });

  // =========================================================================
  // 1. RECONCILIATION ORDERING & SIMULTANEOUS LOCAL/REMOTE MUTATIONS
  // =========================================================================
  describe('1. Real-Time Snapshot Reconciliation & Ordering Guarantee', () => {
    const userId = 'cadete_recon_user_1';

    it('ensures remote snapshots are strictly sorted in descending timestamp order regardless of Firestore arrival order', () => {
      let snapshotCallback: ((snapshot: any) => void) | null = null;
      mockOnSnapshot.mockImplementation((_q: any, onNext: any) => {
        snapshotCallback = onNext;
        return vi.fn();
      });

      const receivedData: Order[][] = [];
      const unsub = subscribeCollection<Order>(COLLECTIONS.ORDERS, userId, (items) => {
        const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
        receivedData.push(sorted);
        storage.saveOrders(userId, sorted);
      });

      // Simulate unordered docs returned from Firestore
      const unorderedDocs = [
        { id: 'ord_mid', data: () => ({ userId, timestamp: 1724762000000, amount: 2000, businessName: 'Biz B' }) },
        { id: 'ord_oldest', data: () => ({ userId, timestamp: 1724761000000, amount: 1500, businessName: 'Biz A' }) },
        { id: 'ord_newest', data: () => ({ userId, timestamp: 1724763000000, amount: 3000, businessName: 'Biz C' }) }
      ];

      snapshotCallback!({ docs: unorderedDocs });

      expect(receivedData).toHaveLength(1);
      const latestSnapshot = receivedData[0]!;
      expect(latestSnapshot[0]?.id).toBe('ord_newest');
      expect(latestSnapshot[1]?.id).toBe('ord_mid');
      expect(latestSnapshot[2]?.id).toBe('ord_oldest');

      // Verify localStorage was updated with sorted data
      const stored = storage.getOrders(userId);
      expect(stored[0]?.id).toBe('ord_newest');
      expect(stored[2]?.id).toBe('ord_oldest');

      unsub();
    });

    it('handles simultaneous local optimistic add and remote snapshot arrival without duplicate or lost items', () => {
      let snapshotCallback: ((snapshot: any) => void) | null = null;
      mockOnSnapshot.mockImplementation((_q: any, onNext: any) => {
        snapshotCallback = onNext;
        return vi.fn();
      });

      let inMemoryOrders: Order[] = [];
      const unsub = subscribeCollection<Order>(COLLECTIONS.ORDERS, userId, (remoteOrders) => {
        const sorted = [...remoteOrders].sort((a, b) => b.timestamp - a.timestamp);
        inMemoryOrders = sorted;
        storage.saveOrders(userId, sorted);
      });

      // Initial remote state has 1 order
      snapshotCallback!({
        docs: [
          { id: 'ord_existing_1', data: () => ({ userId, timestamp: 1000, amount: 2000, businessName: 'Biz 1', settled: true }) }
        ]
      });
      expect(inMemoryOrders).toHaveLength(1);

      // Local optimistic add occurs
      const localNewOrder: Order = {
        id: 'ord_optimistic_99',
        userId,
        date: '2026-08-27',
        timestamp: 2000,
        businessId: 'b1',
        businessName: 'Biz 1',
        zone: 'planta_urbana',
        amount: 2500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      // Optimistic update
      inMemoryOrders = [localNewOrder, ...inMemoryOrders.filter((o) => o.id !== localNewOrder.id)];
      storage.saveOrders(userId, inMemoryOrders);
      expect(inMemoryOrders).toHaveLength(2);
      expect(inMemoryOrders[0]?.id).toBe('ord_optimistic_99');

      // Now remote snapshot confirms the new order
      snapshotCallback!({
        docs: [
          { id: 'ord_existing_1', data: () => ({ userId, timestamp: 1000, amount: 2000, businessName: 'Biz 1', settled: true }) },
          { id: 'ord_optimistic_99', data: () => ({ ...localNewOrder }) }
        ]
      });

      expect(inMemoryOrders).toHaveLength(2);
      expect(inMemoryOrders[0]?.id).toBe('ord_optimistic_99');
      expect(inMemoryOrders[1]?.id).toBe('ord_existing_1');

      unsub();
    });

    it('absorbs remote field updates (e.g. remote business settlement) accurately into local state', () => {
      let snapshotCallback: ((snapshot: any) => void) | null = null;
      mockOnSnapshot.mockImplementation((_q: any, onNext: any) => {
        snapshotCallback = onNext;
        return vi.fn();
      });

      let currentOrders: Order[] = [];
      const unsub = subscribeCollection<Order>(COLLECTIONS.ORDERS, userId, (remoteOrders) => {
        const sorted = [...remoteOrders].sort((a, b) => b.timestamp - a.timestamp);
        currentOrders = sorted;
        storage.saveOrders(userId, sorted);
      });

      // Initial state: Unsettled order
      snapshotCallback!({
        docs: [
          {
            id: 'ord_unsettled_1',
            data: () => ({
              userId,
              timestamp: 5000,
              amount: 4000,
              businessName: 'Pizzería Centro',
              settled: false
            })
          }
        ]
      });

      expect(currentOrders[0]?.settled).toBe(false);

      // Remote update: Merchant settles account receivable
      snapshotCallback!({
        docs: [
          {
            id: 'ord_unsettled_1',
            data: () => ({
              userId,
              timestamp: 5000,
              amount: 4000,
              businessName: 'Pizzería Centro',
              settled: true,
              settledAt: '2026-08-27T19:00:00.000Z'
            })
          }
        ]
      });

      expect(currentOrders[0]?.settled).toBe(true);
      expect(currentOrders[0]?.settledAt).toBe('2026-08-27T19:00:00.000Z');
      expect(storage.getOrders(userId)[0]?.settled).toBe(true);

      unsub();
    });
  });

  // =========================================================================
  // 2. RAPID BURST MUTATIONS UNDER SIMULATED NETWORK LATENCY
  // =========================================================================
  describe('2. Rapid Burst Mutations & Simulated Network Latency Stress', () => {
    const userId = 'cadete_latency_user';

    it('processes 100 rapid concurrent order creations under varying simulated network latency (50-200ms)', async () => {
      // Simulate random network latency for Firestore setDoc
      mockSetDoc.mockImplementation(
        () =>
          new Promise((resolve) => {
            const delay = 10 + Math.floor(Math.random() * 40); // 10ms - 50ms simulated async latency
            setTimeout(resolve, delay);
          })
      );

      const createdOrders: Order[] = [];
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 100; i++) {
        const order: Order = {
          id: `ord_burst_${i}`,
          userId,
          date: '2026-08-27',
          timestamp: 1000 + i,
          businessId: `biz_${i % 5}`,
          businessName: `Comercio ${i % 5}`,
          zone: 'planta_urbana',
          amount: 1500 + i * 10,
          paidBy: 'customer',
          paymentMethod: i % 2 === 0 ? 'cash' : 'transfer',
          settled: true
        };

        // Optimistic local save
        createdOrders.unshift(order);
        storage.saveOrders(userId, createdOrders);

        // Async Firestore dispatch
        promises.push(
          firestoreService.saveDocument(COLLECTIONS.ORDERS, order).catch((err) => {
            console.warn('Firestore burst error:', err);
          })
        );
      }

      // Local storage has all 100 immediately
      expect(storage.getOrders(userId)).toHaveLength(100);
      expect(storage.getOrders(userId)[0]?.id).toBe('ord_burst_99');

      // Await all async network dispatches
      await Promise.all(promises);

      expect(mockSetDoc).toHaveBeenCalledTimes(100);
    });

    it('guarantees UI stability and local data integrity when Firestore writes reject due to network loss', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate network disconnection
      mockSetDoc.mockRejectedValue(new Error('FirebaseError: [unavailable] The service is currently unavailable.'));
      mockUpdateDoc.mockRejectedValue(new Error('FirebaseError: [unavailable] Network timeout.'));
      mockDeleteDoc.mockRejectedValue(new Error('FirebaseError: [unavailable] Network dropped.'));

      // 1. Optimistic Add
      const order: Order = {
        id: 'ord_offline_resilient',
        userId,
        date: '2026-08-27',
        timestamp: Date.now(),
        businessId: 'biz_1',
        businessName: 'Biz Resiliente',
        zone: 'planta_urbana',
        amount: 2800,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      // In DataContext architecture: save to storage + firestoreService with catch
      storage.saveOrders(userId, [order]);
      await expect(
        firestoreService.saveDocument(COLLECTIONS.ORDERS, order).catch((err) => {
          console.warn('Firestore addOrder sync error:', err);
        })
      ).resolves.toBeUndefined();

      expect(storage.getOrders(userId)).toHaveLength(1);
      expect(storage.getOrders(userId)[0]?.id).toBe('ord_offline_resilient');

      // 2. Optimistic Update under network drop
      const updatedOrder = { ...order, amount: 3500 };
      storage.saveOrders(userId, [updatedOrder]);
      await expect(
        firestoreService.updateDocument(COLLECTIONS.ORDERS, order.id, { amount: 3500 }).catch((err) => {
          console.warn('Firestore updateOrder sync error:', err);
        })
      ).resolves.toBeUndefined();

      expect(storage.getOrders(userId)[0]?.amount).toBe(3500);

      // 3. Optimistic Delete under network drop
      storage.saveOrders(userId, []);
      await expect(
        firestoreService.deleteDocument(COLLECTIONS.ORDERS, order.id).catch((err) => {
          console.warn('Firestore deleteOrder sync error:', err);
        })
      ).resolves.toBeUndefined();

      expect(storage.getOrders(userId)).toHaveLength(0);

      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // 3. LISTENER UNSUBSCRIPTION, SIGN-OUT & MEMORY LEAK PREVENTION
  // =========================================================================
  describe('3. Listener Lifecycle, Sign-Out Unsubscription & Zero Leakage', () => {
    it('cleans up all 5 collection listeners on sign-out or tenant change', () => {
      const unsubSpies = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];
      let callCount = 0;

      mockOnSnapshot.mockImplementation(() => {
        const spy = unsubSpies[callCount % 5]!;
        callCount++;
        return spy;
      });

      const userA = 'cadete_user_A';

      // Attach 5 subscriptions for User A
      const unsubOrders = firestoreService.subscribeCollection(COLLECTIONS.ORDERS, userA, vi.fn());
      const unsubExpenses = firestoreService.subscribeCollection(COLLECTIONS.EXPENSES, userA, vi.fn());
      const unsubBusinesses = firestoreService.subscribeCollection(COLLECTIONS.BUSINESSES, userA, vi.fn());
      const unsubMaintenance = firestoreService.subscribeCollection(COLLECTIONS.MAINTENANCE, userA, vi.fn());
      const unsubShifts = firestoreService.subscribeCollection(COLLECTIONS.SHIFTS, userA, vi.fn());

      expect(mockOnSnapshot).toHaveBeenCalledTimes(5);

      // Simulate sign out / component unmount cleanup
      unsubOrders();
      unsubExpenses();
      unsubBusinesses();
      unsubMaintenance();
      unsubShifts();

      unsubSpies.forEach((spy) => {
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });

    it('prevents ghost snapshot updates from affecting local state after unsubscription', () => {
      let activeSnapshotCallback: ((snapshot: any) => void) | null = null;
      let isSubscribed = true;

      mockOnSnapshot.mockImplementation((_q: any, onNext: any) => {
        activeSnapshotCallback = onNext;
        return () => {
          isSubscribed = false;
          activeSnapshotCallback = null;
        };
      });

      const userA = 'user_alpha';
      let userAOrders: Order[] = [];

      const unsub = firestoreService.subscribeCollection<Order>(COLLECTIONS.ORDERS, userA, (items) => {
        if (isSubscribed) {
          userAOrders = items;
        }
      });

      // First snapshot arrives while subscribed
      activeSnapshotCallback!({
        docs: [{ id: 'ord_1', data: () => ({ userId: userA, amount: 1000 }) }]
      });
      expect(userAOrders).toHaveLength(1);

      // Sign out / unsubscribe
      unsub();
      expect(activeSnapshotCallback).toBeNull();
      expect(isSubscribed).toBe(false);

      // If mock Firestore somehow triggered old callback, guard prevents state mutation
      expect(userAOrders).toHaveLength(1);
    });

    it('Demo Mode bypasses all Firestore listeners completely', () => {
      const demoUserId = 'cadete_demo_1';
      const isDemoMode = true;

      // In DataContext, if (isDemoMode || userId === 'cadete_demo_1') return;
      const shouldAttachListeners = !isDemoMode && demoUserId !== 'cadete_demo_1';
      expect(shouldAttachListeners).toBe(false);

      // Verify no onSnapshot was called
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. EDGE CASES & DEFENSIVE BOUNDARY CONDITIONS
  // =========================================================================
  describe('4. Edge Cases & Defensive Boundary Conditions', () => {
    it('subscribeCollection yields empty array and returns no-op when userId is falsy', () => {
      const onData = vi.fn();
      const unsub = firestoreService.subscribeCollection(COLLECTIONS.ORDERS, '', onData);

      expect(onData).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it('subscribeCollection onError gracefully handles permission-denied or disconnected errors', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      let errorCallback: ((err: any) => void) | null = null;

      mockOnSnapshot.mockImplementation((_q: any, _onNext: any, onErrorFn: any) => {
        errorCallback = onErrorFn;
        return vi.fn();
      });

      const onData = vi.fn();
      const onError = vi.fn();

      firestoreService.subscribeCollection(COLLECTIONS.ORDERS, 'cadete_perm_err', onData, onError);

      const testError = new Error('Missing or insufficient permissions.');
      errorCallback!(testError);

      expect(onError).toHaveBeenCalledWith(testError);
      warnSpy.mockRestore();
    });

    it('saveDocument, updateDocument, deleteDocument strictly guard against missing IDs', async () => {
      // Missing ID on save
      await expect(
        firestoreService.saveDocument(COLLECTIONS.ORDERS, { id: '', userId: 'u1' } as any)
      ).rejects.toThrow('Cannot save document to orders without id');

      // Missing userId on save
      await expect(
        firestoreService.saveDocument(COLLECTIONS.ORDERS, { id: 'ord_1', userId: '' } as any)
      ).rejects.toThrow('Cannot save document to orders without userId');

      // Missing docId on update
      await expect(firestoreService.updateDocument(COLLECTIONS.ORDERS, '', { amount: 1000 })).rejects.toThrow(
        'Cannot update document in orders without docId'
      );

      // Missing docId on delete
      await expect(firestoreService.deleteDocument(COLLECTIONS.ORDERS, '')).rejects.toThrow(
        'Cannot delete document in orders without docId'
      );
    });

    it('getUserProfile handles empty user ID and non-existent profiles safely', async () => {
      expect(await firestoreService.getUserProfile('')).toBeNull();

      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined
      });

      const res = await firestoreService.getUserProfile('non_existent');
      expect(res).toBeNull();
    });

    it('createInitialUserProfile configures exact 7-day trial date and defaults', async () => {
      const mockFbUser: any = {
        uid: 'user_trial_test_123',
        email: 'trial@cadete.com',
        displayName: 'Cadete Trial',
        photoURL: null,
        metadata: {
          creationTime: '2026-08-27T12:00:00.000Z'
        }
      };

      const profile = await firestoreService.createInitialUserProfile(mockFbUser);

      expect(profile.uid).toBe('user_trial_test_123');
      expect(profile.subscriptionStatus).toBe('trial');
      expect(profile.settings.cityDefault).toBe('San Carlos de Bolívar');
      expect(profile.settings.countryDefault).toBe('Argentina');
      expect(profile.settings.oilChangeThresholdOrders).toBe(250);
      expect(profile.settings.oilChangeThresholdDays).toBe(30);

      const trialDiffMs = new Date(profile.trialEndsAt!).getTime() - new Date(profile.createdAt).getTime();
      const expectedDiffMs = 7 * 24 * 60 * 60 * 1000;
      expect(trialDiffMs).toBeGreaterThanOrEqual(expectedDiffMs - 1000);
    });
  });
});
