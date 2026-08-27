// ==========================================
// CADETE OS - DATA CONTEXT & DUAL-LAYER SYNC
// ==========================================

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Business, Expense, MaintenanceRecord, Order, Shift } from '../types';
import { useAuth } from './AuthContext';
import { storage } from '../lib/storage';
import { getTodayDateString } from '../utils/formatting';
import { firestoreService, COLLECTIONS } from '../lib/firestoreService';

export interface DataContextType {
  orders: Order[];
  expenses: Expense[];
  businesses: Business[];
  maintenance: MaintenanceRecord[];
  shifts: Shift[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  
  // Orders
  addOrder: (data: Omit<Order, 'id' | 'userId' | 'timestamp'> & { id?: string; timestamp?: number }) => Order;
  updateOrder: (id: string, partial: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  settleOrder: (id: string) => void;
  settleOrdersBatch: (orderIds: string[]) => void;
  
  // Expenses
  addExpense: (data: Omit<Expense, 'id' | 'userId' | 'timestamp'> & { id?: string; timestamp?: number }) => Expense;
  updateExpense: (id: string, partial: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  // Businesses
  addBusiness: (data: Omit<Business, 'id' | 'userId' | 'createdAt'> & { id?: string; createdAt?: string }) => Business;
  updateBusiness: (id: string, partial: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
  
  // Maintenance
  addMaintenance: (data: Omit<MaintenanceRecord, 'id' | 'userId' | 'timestamp' | 'ordersSnapshot'> & { id?: string; timestamp?: number; ordersSnapshot?: number }) => MaintenanceRecord;
  deleteMaintenance: (id: string) => void;
  
  // Shifts & Shift Floats
  startShift: (date?: string, startingCash?: number, startTime?: string) => Shift;
  endShift: (date?: string, endTime?: string) => void;
  setStartingCash: (amount: number, date?: string) => void;
  getShiftForDate: (date: string) => Shift | undefined;

  // Storage operations
  resetData: () => void;
  importData: (jsonString: string) => boolean;
  exportData: () => string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isDemoMode } = useAuth();
  const userId = user.uid;

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Load data & real-time sync listeners on userId / auth change
  useEffect(() => {
    if (!userId) return;

    // 1. Immediately hydrate local React state from localStorage (0ms UI latency)
    const localOrders = storage.getOrders(userId);
    const localExpenses = storage.getExpenses(userId);
    const localBusinesses = storage.getBusinesses(userId);
    const localMaintenance = storage.getMaintenance(userId);
    const localShifts = storage.getShifts(userId);

    setOrders(localOrders);
    setExpenses(localExpenses);
    setBusinesses(localBusinesses);
    setMaintenance(localMaintenance);
    setShifts(localShifts);

    // If user is in Demo Mode or is the default mock user, operate strictly against localStorage
    if (isDemoMode || userId === 'cadete_demo_1') {
      return;
    }

    // 2. Attach real-time Firestore listeners for authenticated user
    const unsubOrders = firestoreService.subscribeCollection<Order>(
      COLLECTIONS.ORDERS,
      userId,
      (remoteOrders) => {
        const sorted = [...remoteOrders].sort((a, b) => b.timestamp - a.timestamp);
        setOrders(sorted);
        storage.saveOrders(userId, sorted);
      }
    );

    const unsubExpenses = firestoreService.subscribeCollection<Expense>(
      COLLECTIONS.EXPENSES,
      userId,
      (remoteExpenses) => {
        const sorted = [...remoteExpenses].sort((a, b) => b.timestamp - a.timestamp);
        setExpenses(sorted);
        storage.saveExpenses(userId, sorted);
      }
    );

    const unsubBusinesses = firestoreService.subscribeCollection<Business>(
      COLLECTIONS.BUSINESSES,
      userId,
      (remoteBusinesses) => {
        setBusinesses(remoteBusinesses);
        storage.saveBusinesses(userId, remoteBusinesses);
      }
    );

    const unsubMaintenance = firestoreService.subscribeCollection<MaintenanceRecord>(
      COLLECTIONS.MAINTENANCE,
      userId,
      (remoteMaintenance) => {
        const sorted = [...remoteMaintenance].sort((a, b) => b.timestamp - a.timestamp);
        setMaintenance(sorted);
        storage.saveMaintenance(userId, sorted);
      }
    );

    const unsubShifts = firestoreService.subscribeCollection<Shift>(
      COLLECTIONS.SHIFTS,
      userId,
      (remoteShifts) => {
        const sorted = [...remoteShifts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setShifts(sorted);
        storage.saveShifts(userId, sorted);
      }
    );

    // Cleanup all 5 onSnapshot listeners on unmount or user switch
    return () => {
      unsubOrders();
      unsubExpenses();
      unsubBusinesses();
      unsubMaintenance();
      unsubShifts();
    };
  }, [userId, isDemoMode]);

  // ===================
  // ORDERS
  // ===================
  const addOrder = (data: Omit<Order, 'id' | 'userId' | 'timestamp'> & { id?: string; timestamp?: number }): Order => {
    const newOrder: Order = {
      id: data.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      date: data.date || selectedDate,
      timestamp: data.timestamp || Date.now(),
      businessId: data.businessId,
      businessName: data.businessName,
      address: data.address?.trim() || undefined,
      customerPhone: data.customerPhone?.trim() || undefined,
      zone: data.zone,
      amount: Number(data.amount) || 0,
      paidBy: data.paidBy,
      paymentMethod: data.paymentMethod,
      settled: data.settled,
      settledAt: data.settled ? (data.settledAt || new Date().toISOString()) : undefined,
      notes: data.notes?.trim() || undefined
    };

    setOrders((prev) => {
      const updated = [newOrder, ...prev.filter((o) => o.id !== newOrder.id)];
      storage.saveOrders(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.saveDocument(COLLECTIONS.ORDERS, newOrder).catch((err) => {
        console.warn('Firestore addOrder sync error:', err);
      });
    }

    return newOrder;
  };

  const updateOrder = (id: string, partial: Partial<Order>) => {
    let updatedTarget: Order | undefined;

    setOrders((prev) => {
      const updated = prev.map((order) => {
        if (order.id === id) {
          const isNowSettled = partial.settled !== undefined ? partial.settled : order.settled;
          const settledAt = isNowSettled
            ? (partial.settledAt || order.settledAt || new Date().toISOString())
            : undefined;

          updatedTarget = {
            ...order,
            ...partial,
            amount: partial.amount !== undefined ? Number(partial.amount) : order.amount,
            settled: isNowSettled,
            settledAt
          };
          return updatedTarget;
        }
        return order;
      });
      storage.saveOrders(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1' && updatedTarget) {
      firestoreService.updateDocument(COLLECTIONS.ORDERS, id, partial).catch((err) => {
        console.warn('Firestore updateOrder sync error:', err);
      });
    }
  };

  const deleteOrder = (id: string) => {
    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== id);
      storage.saveOrders(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.deleteDocument(COLLECTIONS.ORDERS, id).catch((err) => {
        console.warn('Firestore deleteOrder sync error:', err);
      });
    }
  };

  const settleOrder = (id: string) => {
    updateOrder(id, { settled: true, settledAt: new Date().toISOString() });
  };

  const settleOrdersBatch = (orderIds: string[]) => {
    if (!orderIds.length) return;
    const nowIso = new Date().toISOString();

    setOrders((prev) => {
      const updated = prev.map((order) => {
        if (orderIds.includes(order.id)) {
          return {
            ...order,
            settled: true,
            settledAt: nowIso
          };
        }
        return order;
      });
      storage.saveOrders(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.batchSettleOrders(orderIds, nowIso).catch((err) => {
        console.warn('Firestore batchSettleOrders sync error:', err);
      });
    }
  };

  // ===================
  // EXPENSES
  // ===================
  const addExpense = (data: Omit<Expense, 'id' | 'userId' | 'timestamp'> & { id?: string; timestamp?: number }): Expense => {
    const newExpense: Expense = {
      id: data.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      date: data.date || selectedDate,
      timestamp: data.timestamp || Date.now(),
      category: data.category,
      description: data.description.trim(),
      amount: Number(data.amount) || 0,
      paymentMethod: data.paymentMethod
    };

    setExpenses((prev) => {
      const updated = [newExpense, ...prev.filter((e) => e.id !== newExpense.id)];
      storage.saveExpenses(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.saveDocument(COLLECTIONS.EXPENSES, newExpense).catch((err) => {
        console.warn('Firestore addExpense sync error:', err);
      });
    }

    return newExpense;
  };

  const updateExpense = (id: string, partial: Partial<Expense>) => {
    setExpenses((prev) => {
      const updated = prev.map((expense) => {
        if (expense.id === id) {
          return {
            ...expense,
            ...partial,
            amount: partial.amount !== undefined ? Number(partial.amount) : expense.amount
          };
        }
        return expense;
      });
      storage.saveExpenses(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.updateDocument(COLLECTIONS.EXPENSES, id, partial).catch((err) => {
        console.warn('Firestore updateExpense sync error:', err);
      });
    }
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      storage.saveExpenses(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.deleteDocument(COLLECTIONS.EXPENSES, id).catch((err) => {
        console.warn('Firestore deleteExpense sync error:', err);
      });
    }
  };

  // ===================
  // BUSINESSES
  // ===================
  const addBusiness = (data: Omit<Business, 'id' | 'userId' | 'createdAt'> & { id?: string; createdAt?: string }): Business => {
    const newBusiness: Business = {
      id: data.id || `biz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      name: data.name.trim(),
      phone: data.phone?.trim() || undefined,
      defaultPrices: {
        plantaUrbana: Number(data.defaultPrices.plantaUrbana) || 0,
        barrioCerca: Number(data.defaultPrices.barrioCerca) || 0,
        barrioLejos: Number(data.defaultPrices.barrioLejos) || 0
      },
      paymentCycle: data.paymentCycle || 'weekly',
      active: data.active !== undefined ? data.active : true,
      createdAt: data.createdAt || new Date().toISOString()
    };

    setBusinesses((prev) => {
      const updated = [...prev.filter((b) => b.id !== newBusiness.id), newBusiness];
      storage.saveBusinesses(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.saveDocument(COLLECTIONS.BUSINESSES, newBusiness).catch((err) => {
        console.warn('Firestore addBusiness sync error:', err);
      });
    }

    return newBusiness;
  };

  const updateBusiness = (id: string, partial: Partial<Business>) => {
    setBusinesses((prev) => {
      const updated = prev.map((business) => {
        if (business.id === id) {
          return {
            ...business,
            ...partial,
            defaultPrices: partial.defaultPrices
              ? {
                  plantaUrbana: Number(partial.defaultPrices.plantaUrbana) || 0,
                  barrioCerca: Number(partial.defaultPrices.barrioCerca) || 0,
                  barrioLejos: Number(partial.defaultPrices.barrioLejos) || 0
                }
              : business.defaultPrices
          };
        }
        return business;
      });
      storage.saveBusinesses(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.updateDocument(COLLECTIONS.BUSINESSES, id, partial).catch((err) => {
        console.warn('Firestore updateBusiness sync error:', err);
      });
    }
  };

  const deleteBusiness = (id: string) => {
    setBusinesses((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      storage.saveBusinesses(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.deleteDocument(COLLECTIONS.BUSINESSES, id).catch((err) => {
        console.warn('Firestore deleteBusiness sync error:', err);
      });
    }
  };

  // ===================
  // MAINTENANCE
  // ===================
  const addMaintenance = (
    data: Omit<MaintenanceRecord, 'id' | 'userId' | 'timestamp' | 'ordersSnapshot'> & {
      id?: string;
      timestamp?: number;
      ordersSnapshot?: number;
    }
  ): MaintenanceRecord => {
    const totalHistoricalOrders = orders.length;
    const snapshot = data.ordersSnapshot !== undefined ? data.ordersSnapshot : totalHistoricalOrders;

    const newRecord: MaintenanceRecord = {
      id: data.id || `maint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      date: data.date || getTodayDateString(),
      timestamp: data.timestamp || Date.now(),
      item: data.item.trim(),
      cost: Number(data.cost) || 0,
      isOilChange: Boolean(data.isOilChange),
      ordersSnapshot: snapshot
    };

    setMaintenance((prev) => {
      const updated = [newRecord, ...prev.filter((m) => m.id !== newRecord.id)];
      storage.saveMaintenance(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.saveDocument(COLLECTIONS.MAINTENANCE, newRecord).catch((err) => {
        console.warn('Firestore addMaintenance sync error:', err);
      });
    }

    return newRecord;
  };

  const deleteMaintenance = (id: string) => {
    setMaintenance((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      storage.saveMaintenance(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.deleteDocument(COLLECTIONS.MAINTENANCE, id).catch((err) => {
        console.warn('Firestore deleteMaintenance sync error:', err);
      });
    }
  };

  // ===================
  // SHIFTS
  // ===================
  const startShift = (date?: string, startingCash?: number, startTime?: string): Shift => {
    const targetDate = date || selectedDate;
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const existing = shifts.find((s) => s.date === targetDate);

    const newShift: Shift = {
      id: existing?.id || `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      date: targetDate,
      startTime: startTime || existing?.startTime || defaultTime,
      endTime: undefined,
      startingCash: startingCash !== undefined ? Number(startingCash) : (existing?.startingCash || 0),
      status: 'in_progress',
      createdAt: existing?.createdAt || Date.now()
    };

    setShifts((prev) => {
      const existingIndex = prev.findIndex((s) => s.id === newShift.id || s.date === targetDate);
      let updated: Shift[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = newShift;
      } else {
        updated = [newShift, ...prev];
      }
      storage.saveShifts(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1') {
      firestoreService.saveDocument(COLLECTIONS.SHIFTS, newShift).catch((err) => {
        console.warn('Firestore startShift sync error:', err);
      });
    }

    return newShift;
  };

  const endShift = (date?: string, endTime?: string) => {
    const targetDate = date || selectedDate;
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let targetShift: Shift | undefined;

    setShifts((prev) => {
      const existingIndex = prev.findIndex((s) => s.date === targetDate);
      let updated: Shift[];
      if (existingIndex >= 0 && prev[existingIndex]) {
        const existing = prev[existingIndex]!;
        targetShift = {
          ...existing,
          endTime: endTime || defaultTime,
          status: 'completed'
        };
        updated = [...prev];
        updated[existingIndex] = targetShift;
      } else {
        targetShift = {
          id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          date: targetDate,
          startTime: defaultTime,
          endTime: endTime || defaultTime,
          startingCash: 0,
          status: 'completed',
          createdAt: Date.now()
        };
        updated = [targetShift, ...prev];
      }
      storage.saveShifts(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1' && targetShift) {
      firestoreService.saveDocument(COLLECTIONS.SHIFTS, targetShift).catch((err) => {
        console.warn('Firestore endShift sync error:', err);
      });
    }
  };

  const setStartingCash = (amount: number, date?: string) => {
    const targetDate = date || selectedDate;
    const cleanAmount = Number(amount) || 0;

    let targetShift: Shift | undefined;

    setShifts((prev) => {
      const existingIndex = prev.findIndex((s) => s.date === targetDate);
      let updated: Shift[];
      if (existingIndex >= 0 && prev[existingIndex]) {
        const existing = prev[existingIndex]!;
        targetShift = {
          ...existing,
          startingCash: cleanAmount
        };
        updated = [...prev];
        updated[existingIndex] = targetShift;
      } else {
        targetShift = {
          id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          date: targetDate,
          startingCash: cleanAmount,
          status: 'in_progress',
          createdAt: Date.now()
        };
        updated = [targetShift, ...prev];
      }
      storage.saveShifts(userId, updated);
      return updated;
    });

    if (!isDemoMode && userId !== 'cadete_demo_1' && targetShift) {
      firestoreService.saveDocument(COLLECTIONS.SHIFTS, targetShift).catch((err) => {
        console.warn('Firestore setStartingCash sync error:', err);
      });
    }
  };

  const getShiftForDate = (date: string): Shift | undefined => {
    return shifts.find((s) => s.date === date);
  };

  // ===================
  // STORAGE & BACKUP MGMT
  // ===================
  const resetData = () => {
    storage.resetToDefault(userId);
    setOrders(storage.getOrders(userId));
    setExpenses(storage.getExpenses(userId));
    setBusinesses(storage.getBusinesses(userId));
    setMaintenance(storage.getMaintenance(userId));
    setShifts(storage.getShifts(userId));
  };

  const importData = (jsonString: string): boolean => {
    const success = storage.importAll(userId, jsonString);
    if (success) {
      const newOrders = storage.getOrders(userId);
      const newExpenses = storage.getExpenses(userId);
      const newBusinesses = storage.getBusinesses(userId);
      const newMaintenance = storage.getMaintenance(userId);
      const newShifts = storage.getShifts(userId);

      setOrders(newOrders);
      setExpenses(newExpenses);
      setBusinesses(newBusinesses);
      setMaintenance(newMaintenance);
      setShifts(newShifts);

      if (!isDemoMode && userId !== 'cadete_demo_1') {
        newBusinesses.forEach((b) => firestoreService.saveDocument(COLLECTIONS.BUSINESSES, b).catch(() => {}));
        newOrders.forEach((o) => firestoreService.saveDocument(COLLECTIONS.ORDERS, o).catch(() => {}));
        newExpenses.forEach((e) => firestoreService.saveDocument(COLLECTIONS.EXPENSES, e).catch(() => {}));
        newMaintenance.forEach((m) => firestoreService.saveDocument(COLLECTIONS.MAINTENANCE, m).catch(() => {}));
        newShifts.forEach((s) => firestoreService.saveDocument(COLLECTIONS.SHIFTS, s).catch(() => {}));
      }
    }
    return success;
  };

  const exportData = (): string => {
    return storage.exportAll(userId);
  };

  return (
    <DataContext.Provider
      value={{
        orders,
        expenses,
        businesses,
        maintenance,
        shifts,
        selectedDate,
        setSelectedDate,
        addOrder,
        updateOrder,
        deleteOrder,
        settleOrder,
        settleOrdersBatch,
        addExpense,
        updateExpense,
        deleteExpense,
        addBusiness,
        updateBusiness,
        deleteBusiness,
        addMaintenance,
        deleteMaintenance,
        startShift,
        endShift,
        setStartingCash,
        getShiftForDate,
        resetData,
        importData,
        exportData
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
