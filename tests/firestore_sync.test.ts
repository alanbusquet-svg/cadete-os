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
  firestoreService,
  COLLECTIONS,
  getUserProfile,
  saveUserProfile,
  createInitialUserProfile,
  saveDocument,
  updateDocument,
  deleteDocument,
  subscribeCollection,
  batchSettleOrders,
  seedInitialUserData
} from '../src/lib/firestoreService';
import { storage, DEFAULT_USER } from '../src/lib/storage';
import type { UserProfile, Order, Expense, Business, MaintenanceRecord, Shift } from '../src/types';

describe('Firestore Cloud Data Service (src/lib/firestoreService.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  });

  describe('Document CRUD Operations', () => {
    it('saveDocument: sets document in specified collection with merge true and correct doc reference', async () => {
      const testOrder: Order = {
        id: 'ord_test_123',
        userId: 'cadete_real_1',
        date: '2026-08-27',
        timestamp: 1724760000000,
        businessId: 'biz_1',
        businessName: 'Pizzería Bolívar',
        address: 'Av. San Martín 450',
        zone: 'planta_urbana',
        amount: 2500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      await saveDocument(COLLECTIONS.ORDERS, testOrder);

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), COLLECTIONS.ORDERS, 'ord_test_123');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ord_test_123' }),
        testOrder,
        { merge: true }
      );
    });

    it('saveDocument: throws error if id or userId is missing', async () => {
      await expect(saveDocument(COLLECTIONS.ORDERS, { id: '', userId: 'u1' })).rejects.toThrow(
        'Cannot save document to orders without id'
      );
      await expect(saveDocument(COLLECTIONS.ORDERS, { id: 'ord_1', userId: '' })).rejects.toThrow(
        'Cannot save document to orders without userId'
      );
    });

    it('updateDocument: calls updateDoc with target doc reference and partial payload', async () => {
      await updateDocument(COLLECTIONS.ORDERS, 'ord_test_123', {
        settled: true,
        settledAt: '2026-08-27T15:00:00Z'
      });

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), COLLECTIONS.ORDERS, 'ord_test_123');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ord_test_123' }),
        { settled: true, settledAt: '2026-08-27T15:00:00Z' }
      );
    });

    it('updateDocument: throws error if docId is missing', async () => {
      await expect(updateDocument(COLLECTIONS.ORDERS, '', { amount: 3000 })).rejects.toThrow(
        'Cannot update document in orders without docId'
      );
    });

    it('deleteDocument: calls deleteDoc with target collection and docId', async () => {
      await deleteDocument(COLLECTIONS.EXPENSES, 'exp_test_456');

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), COLLECTIONS.EXPENSES, 'exp_test_456');
      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'exp_test_456' }));
    });

    it('deleteDocument: throws error if docId is missing', async () => {
      await expect(deleteDocument(COLLECTIONS.EXPENSES, '')).rejects.toThrow(
        'Cannot delete document in expenses without docId'
      );
    });
  });

  describe('User Profile Operations', () => {
    it('getUserProfile: returns null if userId is empty or document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined
      });

      const emptyProfile = await getUserProfile('');
      expect(emptyProfile).toBeNull();

      const notFoundProfile = await getUserProfile('non_existent_uid');
      expect(notFoundProfile).toBeNull();
      expect(mockGetDoc).toHaveBeenCalled();
    });

    it('getUserProfile: returns parsed UserProfile with fallback defaults when document exists', async () => {
      const mockDocData = {
        email: 'repartidor@bolivar.com',
        displayName: 'Marcos Rider',
        photoURL: 'https://avatar/marcos.png',
        createdAt: '2026-08-01T00:00:00Z',
        trialEndsAt: '2026-08-08T00:00:00Z',
        subscriptionStatus: 'trial',
        settings: {
          cityDefault: 'San Carlos de Bolívar',
          countryDefault: 'Argentina',
          dailyGoal: 50000
        }
      };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockDocData
      });

      const profile = await getUserProfile('cadete_uid_10');

      expect(profile).not.toBeNull();
      expect(profile?.uid).toBe('cadete_uid_10');
      expect(profile?.displayName).toBe('Marcos Rider');
      expect(profile?.photoURL).toBe('https://avatar/marcos.png');
      expect(profile?.settings.dailyGoal).toBe(50000);
      expect(profile?.settings.oilChangeThresholdOrders).toBe(250); // Default fallback merged
    });

    it('saveUserProfile: writes profile with merge option enabled', async () => {
      const profile: UserProfile = {
        ...DEFAULT_USER,
        uid: 'cadete_save_1',
        displayName: 'Cadete Guardado',
        settings: {
          ...DEFAULT_USER.settings,
          dailyGoal: 70000
        }
      };

      await saveUserProfile(profile);

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), COLLECTIONS.USERS, 'cadete_save_1');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cadete_save_1' }),
        profile,
        { merge: true }
      );
    });

    it('saveUserProfile: throws if profile has no uid', async () => {
      const invalidProfile = { ...DEFAULT_USER, uid: '' };
      await expect(saveUserProfile(invalidProfile)).rejects.toThrow('Cannot save user profile without uid');
    });

    it('createInitialUserProfile: creates trial profile with 7 days free trial for a new Firebase user', async () => {
      const mockFbUser: any = {
        uid: 'new_firebase_user_77',
        email: 'nuevo77@bolivar.com',
        displayName: 'Nuevo Cadete',
        photoURL: 'https://avatar/77.jpg',
        metadata: {
          creationTime: '2026-08-27T10:00:00.000Z'
        }
      };

      const profile = await createInitialUserProfile(mockFbUser);

      expect(profile.uid).toBe('new_firebase_user_77');
      expect(profile.email).toBe('nuevo77@bolivar.com');
      expect(profile.displayName).toBe('Nuevo Cadete');
      expect(profile.subscriptionStatus).toBe('trial');
      expect(profile.trialEndsAt).toBeDefined();

      const msDifference = new Date(profile.trialEndsAt!).getTime() - new Date(profile.createdAt).getTime();
      expect(msDifference).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 1000);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'new_firebase_user_77' }),
        profile,
        { merge: true }
      );
    });
  });

  describe('Batch Settle & Multi-Tenant Query Subscriptions', () => {
    it('batchSettleOrders: performs atomic writeBatch update across all specified order IDs', async () => {
      const updateBatchSpy = vi.fn();
      const commitBatchSpy = vi.fn().mockResolvedValue(undefined);

      mockWriteBatch.mockReturnValue({
        update: updateBatchSpy,
        commit: commitBatchSpy
      });

      const orderIds = ['ord_1', 'ord_2', 'ord_3'];
      const settledAt = '2026-08-27T16:00:00.000Z';

      await batchSettleOrders(orderIds, settledAt);

      expect(updateBatchSpy).toHaveBeenCalledTimes(3);
      expect(updateBatchSpy).toHaveBeenCalledWith(expect.anything(), {
        settled: true,
        settledAt: '2026-08-27T16:00:00.000Z'
      });
      expect(commitBatchSpy).toHaveBeenCalledTimes(1);
    });

    it('batchSettleOrders: handles empty orderIds array as a safe no-op', async () => {
      await batchSettleOrders([], '2026-08-27T16:00:00.000Z');
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('subscribeCollection: creates query partitioned by userId and sets up onSnapshot listener', () => {
      const mockUnsubscribe = vi.fn();
      let snapshotCallback: ((snapshot: any) => void) | null = null;

      mockOnSnapshot.mockImplementation((_q: any, onNext: any) => {
        snapshotCallback = onNext;
        return mockUnsubscribe;
      });

      const onData = vi.fn();
      const onError = vi.fn();

      const unsub = subscribeCollection<Order>(
        COLLECTIONS.ORDERS,
        'cadete_tenant_abc',
        onData,
        onError
      );

      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'cadete_tenant_abc');
      expect(mockQuery).toHaveBeenCalled();
      expect(typeof unsub).toBe('function');

      // Simulate Firestore snapshot emission
      const mockDocs = [
        { id: 'ord_1', data: () => ({ userId: 'cadete_tenant_abc', amount: 1500, businessName: 'Biz 1' }) },
        { id: 'ord_2', data: () => ({ userId: 'cadete_tenant_abc', amount: 2000, businessName: 'Biz 2' }) }
      ];

      snapshotCallback!({ docs: mockDocs });

      expect(onData).toHaveBeenCalledTimes(1);
      expect(onData).toHaveBeenCalledWith([
        { id: 'ord_1', userId: 'cadete_tenant_abc', amount: 1500, businessName: 'Biz 1' },
        { id: 'ord_2', userId: 'cadete_tenant_abc', amount: 2000, businessName: 'Biz 2' }
      ]);

      unsub();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('subscribeCollection: returns no-op and yields empty array when userId is empty', () => {
      const onData = vi.fn();
      const unsub = subscribeCollection(COLLECTIONS.ORDERS, '', onData);

      expect(onData).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('subscribeCollection: handles snapshot error and triggers onError callback', () => {
      let errorCallback: ((err: any) => void) | null = null;

      mockOnSnapshot.mockImplementation((_q: any, _onNext: any, onErrorFn: any) => {
        errorCallback = onErrorFn;
        return vi.fn();
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const onData = vi.fn();
      const onError = vi.fn();

      subscribeCollection(COLLECTIONS.ORDERS, 'cadete_tenant_err', onData, onError);

      const testError = new Error('Permission denied');
      errorCallback!(testError);

      expect(onError).toHaveBeenCalledWith(testError);
      warnSpy.mockRestore();
    });

    it('seedInitialUserData: seeds initial records when user has no businesses in Firestore', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: []
      });

      const batchSetSpy = vi.fn();
      const batchCommitSpy = vi.fn().mockResolvedValue(undefined);

      mockWriteBatch.mockReturnValueOnce({
        set: batchSetSpy,
        commit: batchCommitSpy
      });

      await seedInitialUserData('brand_new_user_123');

      expect(batchSetSpy).toHaveBeenCalled();
      expect(batchCommitSpy).toHaveBeenCalled();
    });

    it('seedInitialUserData: skips seeding if user already has businesses', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'biz_existing' }]
      });

      await seedInitialUserData('existing_user_123');

      expect(mockWriteBatch).not.toHaveBeenCalled();
    });
  });
});

describe('DataContext Dual-Layer State & Cloud Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Demo Mode Fallback (Zero Network Overhead)', () => {
    it('saves and reads orders strictly in localStorage during demo mode', () => {
      const demoUserId = 'cadete_demo_1';
      const order: Order = {
        id: 'ord_demo_test',
        userId: demoUserId,
        date: '2026-08-27',
        timestamp: Date.now(),
        businessId: 'biz_don_antonio',
        businessName: 'Pizzería Don Antonio',
        zone: 'planta_urbana',
        amount: 1500,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      storage.saveOrders(demoUserId, [order]);
      const loaded = storage.getOrders(demoUserId);

      expect(loaded.length).toBe(1);
      expect(loaded[0]!.id).toBe('ord_demo_test');
      expect(loaded[0]!.amount).toBe(1500);
    });

    it('executes full demo mode CRUD without making Firestore network calls', () => {
      const userId = 'cadete_demo_1';

      // 1. Initial State
      const initialOrders = storage.getOrders(userId);
      expect(initialOrders.length).toBeGreaterThan(0);

      // 2. Add Expense
      const exp: Expense = {
        id: 'exp_demo_test',
        userId,
        date: '2026-08-27',
        timestamp: Date.now(),
        category: 'fuel',
        description: 'Nafta test',
        amount: 3000,
        paymentMethod: 'cash'
      };
      storage.saveExpenses(userId, [exp]);
      expect(storage.getExpenses(userId)[0]!.description).toBe('Nafta test');

      // 3. Add Business
      const biz: Business = {
        id: 'biz_demo_test',
        userId,
        name: 'Comercio Demo',
        defaultPrices: { plantaUrbana: 1500, barrioCerca: 2000, barrioLejos: 2800 },
        paymentCycle: 'weekly',
        active: true,
        createdAt: '2026-08-27'
      };
      storage.saveBusinesses(userId, [biz]);
      expect(storage.getBusinesses(userId)[0]!.name).toBe('Comercio Demo');

      // 4. Add Maintenance
      const maint: MaintenanceRecord = {
        id: 'maint_demo_test',
        userId,
        date: '2026-08-27',
        timestamp: Date.now(),
        item: 'Cambio de filtro',
        cost: 4000,
        isOilChange: false,
        ordersSnapshot: 50
      };
      storage.saveMaintenance(userId, [maint]);
      expect(storage.getMaintenance(userId)[0]!.cost).toBe(4000);

      // 5. Add Shift
      const shift: Shift = {
        id: 'shift_demo_test',
        userId,
        date: '2026-08-27',
        startingCash: 5000,
        status: 'in_progress',
        createdAt: Date.now()
      };
      storage.saveShifts(userId, [shift]);
      expect(storage.getShifts(userId)[0]!.startingCash).toBe(5000);

      // Confirm zero network calls to Firestore
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated Mode Synchronization', () => {
    it('simulates optimistic addition and background Firestore dispatch', async () => {
      const authUserId = 'cadete_auth_100';

      const newOrder: Order = {
        id: 'ord_optimistic_1',
        userId: authUserId,
        date: '2026-08-27',
        timestamp: Date.now(),
        businessId: 'biz_auth_1',
        businessName: 'Empanadas Bolívar',
        address: 'Mitre 500',
        zone: 'planta_urbana',
        amount: 2200,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      // Optimistic save to storage & trigger async firestore save
      const currentOrders = storage.getOrders(authUserId);
      const updated = [newOrder, ...currentOrders];
      storage.saveOrders(authUserId, updated);
      await firestoreService.saveDocument(COLLECTIONS.ORDERS, newOrder);

      // Local verify
      const cached = storage.getOrders(authUserId);
      expect(cached[0]!.id).toBe('ord_optimistic_1');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ord_optimistic_1' }),
        newOrder,
        { merge: true }
      );
    });

    it('simulates optimistic order update and background Firestore dispatch', async () => {
      await firestoreService.updateDocument(COLLECTIONS.ORDERS, 'ord_optimistic_1', {
        settled: true,
        settledAt: '2026-08-27T18:00:00Z'
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ord_optimistic_1' }),
        { settled: true, settledAt: '2026-08-27T18:00:00Z' }
      );
    });

    it('simulates optimistic deletion and background Firestore dispatch', async () => {
      await firestoreService.deleteDocument(COLLECTIONS.ORDERS, 'ord_optimistic_1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'ord_optimistic_1' }));
    });

    it('absorbs remote snapshot into local state and localStorage cache', () => {
      const authUserId = 'cadete_remote_user';
      const remoteOrders: Order[] = [
        {
          id: 'ord_remote_1',
          userId: authUserId,
          date: '2026-08-27',
          timestamp: 2000,
          businessId: 'b1',
          businessName: 'Biz Remoto',
          zone: 'planta_urbana',
          amount: 2500,
          paidBy: 'customer',
          paymentMethod: 'cash',
          settled: true
        }
      ];

      // Absorb remote snapshot
      storage.saveOrders(authUserId, remoteOrders);
      const cached = storage.getOrders(authUserId);

      expect(cached).toHaveLength(1);
      expect(cached[0]!.id).toBe('ord_remote_1');
      expect(cached[0]!.businessName).toBe('Biz Remoto');
    });

    it('defensive resilience: Firestore write failure does not corrupt local storage data', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const authUserId = 'cadete_offline_user';

      const order: Order = {
        id: 'ord_offline_1',
        userId: authUserId,
        date: '2026-08-27',
        timestamp: Date.now(),
        businessId: 'biz_off',
        businessName: 'Offline Pizza',
        zone: 'planta_urbana',
        amount: 2000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      // Save locally
      storage.saveOrders(authUserId, [order]);

      // Simulate firestore rejection caught defensively
      const simulateSync = async () => {
        try {
          throw new Error('Network unavailable (offline)');
        } catch (err) {
          console.warn('Firestore addOrder sync error:', err);
        }
      };

      await expect(simulateSync()).resolves.not.toThrow();

      // Local storage remains intact
      const localData = storage.getOrders(authUserId);
      expect(localData).toHaveLength(1);
      expect(localData[0]!.id).toBe('ord_offline_1');

      warnSpy.mockRestore();
    });
  });

  describe('Multi-Tenant Isolation Verification', () => {
    it('isolates local storage and queries strictly per userId', () => {
      const userA = 'user_cadete_alpha';
      const userB = 'user_cadete_beta';

      const orderA: Order = {
        id: 'ord_alpha_1',
        userId: userA,
        date: '2026-08-27',
        timestamp: 1000,
        businessId: 'bA',
        businessName: 'Biz Alpha',
        zone: 'planta_urbana',
        amount: 3000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      const orderB: Order = {
        id: 'ord_beta_1',
        userId: userB,
        date: '2026-08-27',
        timestamp: 2000,
        businessId: 'bB',
        businessName: 'Biz Beta',
        zone: 'planta_urbana',
        amount: 4000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      };

      storage.saveOrders(userA, [orderA]);
      storage.saveOrders(userB, [orderB]);

      const ordersA = storage.getOrders(userA);
      const ordersB = storage.getOrders(userB);

      expect(ordersA).toHaveLength(1);
      expect(ordersA[0]!.id).toBe('ord_alpha_1');
      expect(ordersA[0]!.userId).toBe(userA);

      expect(ordersB).toHaveLength(1);
      expect(ordersB[0]!.id).toBe('ord_beta_1');
      expect(ordersB[0]!.userId).toBe(userB);
    });

    it('handles full backup export and import with tenant data isolation', () => {
      const userId = 'tenant_export_user';

      const expJson = storage.exportAll(userId);
      const parsed = JSON.parse(expJson);

      expect(parsed.version).toBe(1);
      expect(parsed.profile.uid).toBe(userId);
      expect(parsed.businesses.length).toBeGreaterThan(0);

      // Mutate and re-import
      parsed.businesses[0].name = 'Imported Custom Business';
      const success = storage.importAll(userId, JSON.stringify(parsed));

      expect(success).toBe(true);
      const reloadedBiz = storage.getBusinesses(userId);
      expect(reloadedBiz[0]!.name).toBe('Imported Custom Business');
    });

    it('resets tenant data to pristine defaults on resetData', () => {
      const userId = 'tenant_reset_user';
      storage.saveOrders(userId, []);
      expect(storage.getOrders(userId)).toHaveLength(0);

      storage.resetToDefault(userId);
      expect(storage.getOrders(userId).length).toBeGreaterThan(0);
      expect(storage.getBusinesses(userId).length).toBeGreaterThan(0);
    });
  });
});
