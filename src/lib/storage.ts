// ==========================================
// CADETE OS - OFFLINE STORAGE & SEED REPOSITORY
// ==========================================

import type {
  UserProfile,
  Business,
  Order,
  Expense,
  MaintenanceRecord,
  Shift
} from '../types';
import { getTodayDateString } from '../utils/formatting';

const STORAGE_PREFIX = 'cadete_os_v1_';

export const DEFAULT_USER: UserProfile = {
  uid: 'cadete_demo_1',
  email: 'cadete@bolivar.com',
  displayName: 'Cadete Bolívar',
  createdAt: '2026-08-01T10:00:00.000Z',
  settings: {
    currency: 'ARS',
    cityDefault: 'San Carlos de Bolívar',
    countryDefault: 'Argentina',
    oilChangeThresholdOrders: 250,
    oilChangeThresholdDays: 30
  }
};

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz_don_antonio',
    userId: 'cadete_demo_1',
    name: 'Pizzería Don Antonio',
    phone: '2314551234',
    defaultPrices: {
      plantaUrbana: 1500,
      barrioCerca: 2200,
      barrioLejos: 3000
    },
    paymentCycle: 'weekly',
    active: true,
    createdAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'biz_burger_centro',
    userId: 'cadete_demo_1',
    name: 'Bolívar Burger Centro',
    phone: '2314667890',
    defaultPrices: {
      plantaUrbana: 1600,
      barrioCerca: 2400,
      barrioLejos: 3200
    },
    paymentCycle: 'daily',
    active: true,
    createdAt: '2026-08-01T10:00:00.000Z'
  },
  {
    id: 'biz_farmacia_sm',
    userId: 'cadete_demo_1',
    name: 'Farmacia San Martín',
    phone: '2314445566',
    defaultPrices: {
      plantaUrbana: 1400,
      barrioCerca: 2000,
      barrioLejos: 2800
    },
    paymentCycle: 'biweekly',
    active: true,
    createdAt: '2026-08-05T10:00:00.000Z'
  },
  {
    id: 'biz_rotiseria_amigos',
    userId: 'cadete_demo_1',
    name: 'Rotisería Los Amigos',
    phone: '',
    defaultPrices: {
      plantaUrbana: 1500,
      barrioCerca: 2300,
      barrioLejos: 3100
    },
    paymentCycle: 'per_order',
    active: true,
    createdAt: '2026-08-10T10:00:00.000Z'
  }
];

export function getInitialOrders(): Order[] {
  const today = getTodayDateString();
  const now = Date.now();

  return [
    {
      id: 'ord_demo_1',
      userId: 'cadete_demo_1',
      date: today,
      timestamp: now - 1000 * 60 * 180, // Hace 3 horas
      businessId: 'biz_don_antonio',
      businessName: 'Pizzería Don Antonio',
      address: 'Av. San Martín 450',
      zone: 'planta_urbana',
      amount: 1500,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true,
      notes: 'Paga con $2000'
    },
    {
      id: 'ord_demo_2',
      userId: 'cadete_demo_1',
      date: today,
      timestamp: now - 1000 * 60 * 120, // Hace 2 horas
      businessId: 'biz_burger_centro',
      businessName: 'Bolívar Burger Centro',
      address: 'Av. Brown 220',
      zone: 'barrio_cerca',
      amount: 2400,
      paidBy: 'customer',
      paymentMethod: 'transfer',
      settled: true,
      notes: 'Transferencia Mercado Pago'
    },
    {
      id: 'ord_demo_3',
      userId: 'cadete_demo_1',
      date: today,
      timestamp: now - 1000 * 60 * 60, // Hace 1 hora
      businessId: 'biz_don_antonio',
      businessName: 'Pizzería Don Antonio',
      address: 'Av. Cancio 1120',
      zone: 'barrio_lejos',
      amount: 3000,
      paidBy: 'business',
      paymentMethod: 'transfer',
      settled: false,
      notes: 'Anotar en cuenta corriente'
    },
    {
      id: 'ord_demo_4',
      userId: 'cadete_demo_1',
      date: today,
      timestamp: now - 1000 * 60 * 20, // Hace 20 min
      businessId: 'biz_farmacia_sm',
      businessName: 'Farmacia San Martín',
      address: 'Alvear 560',
      zone: 'planta_urbana',
      amount: 1400,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    }
  ];
}

export function getInitialExpenses(): Expense[] {
  const today = getTodayDateString();
  const now = Date.now();

  return [
    {
      id: 'exp_demo_1',
      userId: 'cadete_demo_1',
      date: today,
      timestamp: now - 1000 * 60 * 240,
      category: 'fuel',
      description: 'Nafta Súper YPF',
      amount: 4500,
      paymentMethod: 'cash'
    },
    {
      id: 'exp_demo_2',
      userId: 'cadete_demo_1',
      date: today,
      timestamp: now - 1000 * 60 * 90,
      category: 'food',
      description: 'Agua mineral y alfajor',
      amount: 1200,
      paymentMethod: 'transfer'
    }
  ];
}

export const INITIAL_MAINTENANCE: MaintenanceRecord[] = [
  {
    id: 'maint_demo_1',
    userId: 'cadete_demo_1',
    date: '2026-08-10',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 16,
    item: 'Aceite Castrol 20W-50 y Filtro',
    cost: 14000,
    isOilChange: true,
    ordersSnapshot: 0 // Inició el conteo en 0
  },
  {
    id: 'maint_demo_2',
    userId: 'cadete_demo_1',
    date: '2026-08-18',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 8,
    item: 'Parche rueda trasera',
    cost: 3500,
    isOilChange: false,
    ordersSnapshot: 45
  }
];

class StorageRepository {
  private getKey(userId: string, entity: string): string {
    return `${STORAGE_PREFIX}${userId}_${entity}`;
  }

  // Profile
  getProfile(userId: string): UserProfile {
    try {
      const data = localStorage.getItem(this.getKey(userId, 'profile'));
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_USER,
          ...parsed,
          settings: {
            ...DEFAULT_USER.settings,
            ...(parsed.settings || {})
          }
        };
      }
    } catch {
      // fallback
    }
    const defaultProfile = { ...DEFAULT_USER, uid: userId };
    this.saveProfile(userId, defaultProfile);
    return defaultProfile;
  }

  saveProfile(userId: string, profile: UserProfile): void {
    try {
      localStorage.setItem(this.getKey(userId, 'profile'), JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving profile to localStorage', e);
    }
  }

  // Businesses
  getBusinesses(userId: string): Business[] {
    try {
      const data = localStorage.getItem(this.getKey(userId, 'businesses'));
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const defaults = INITIAL_BUSINESSES.map(b => ({ ...b, userId }));
    this.saveBusinesses(userId, defaults);
    return defaults;
  }

  saveBusinesses(userId: string, businesses: Business[]): void {
    try {
      localStorage.setItem(this.getKey(userId, 'businesses'), JSON.stringify(businesses));
    } catch (e) {
      console.error('Error saving businesses to localStorage', e);
    }
  }

  // Orders
  getOrders(userId: string): Order[] {
    try {
      const data = localStorage.getItem(this.getKey(userId, 'orders'));
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const defaults = getInitialOrders().map(o => ({ ...o, userId }));
    this.saveOrders(userId, defaults);
    return defaults;
  }

  saveOrders(userId: string, orders: Order[]): void {
    try {
      localStorage.setItem(this.getKey(userId, 'orders'), JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving orders to localStorage', e);
    }
  }

  // Expenses
  getExpenses(userId: string): Expense[] {
    try {
      const data = localStorage.getItem(this.getKey(userId, 'expenses'));
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const defaults = getInitialExpenses().map(e => ({ ...e, userId }));
    this.saveExpenses(userId, defaults);
    return defaults;
  }

  saveExpenses(userId: string, expenses: Expense[]): void {
    try {
      localStorage.setItem(this.getKey(userId, 'expenses'), JSON.stringify(expenses));
    } catch (e) {
      console.error('Error saving expenses to localStorage', e);
    }
  }

  // Maintenance
  getMaintenance(userId: string): MaintenanceRecord[] {
    try {
      const data = localStorage.getItem(this.getKey(userId, 'maintenance'));
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const defaults = INITIAL_MAINTENANCE.map(m => ({ ...m, userId }));
    this.saveMaintenance(userId, defaults);
    return defaults;
  }

  saveMaintenance(userId: string, maintenance: MaintenanceRecord[]): void {
    try {
      localStorage.setItem(this.getKey(userId, 'maintenance'), JSON.stringify(maintenance));
    } catch (e) {
      console.error('Error saving maintenance to localStorage', e);
    }
  }

  // Shifts
  getShifts(userId: string): Shift[] {
    try {
      const data = localStorage.getItem(this.getKey(userId, 'shifts'));
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return [];
  }

  saveShifts(userId: string, shifts: Shift[]): void {
    try {
      localStorage.setItem(this.getKey(userId, 'shifts'), JSON.stringify(shifts));
    } catch (e) {
      console.error('Error saving shifts to localStorage', e);
    }
  }

  getShiftByDate(userId: string, date: string): Shift | undefined {
    const shifts = this.getShifts(userId);
    return shifts.find(s => s.date === date);
  }

  saveShift(userId: string, shift: Shift): void {
    const shifts = this.getShifts(userId);
    const existingIndex = shifts.findIndex(s => s.id === shift.id || s.date === shift.date);
    let updated: Shift[];
    if (existingIndex >= 0) {
      updated = [...shifts];
      updated[existingIndex] = shift;
    } else {
      updated = [shift, ...shifts];
    }
    this.saveShifts(userId, updated);
  }

  // Full backup & restore
  exportAll(userId: string): string {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(userId),
      businesses: this.getBusinesses(userId),
      orders: this.getOrders(userId),
      expenses: this.getExpenses(userId),
      maintenance: this.getMaintenance(userId),
      shifts: this.getShifts(userId)
    };
    return JSON.stringify(backup, null, 2);
  }

  importAll(userId: string, jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.profile) this.saveProfile(userId, { ...parsed.profile, uid: userId });
      if (Array.isArray(parsed.businesses)) this.saveBusinesses(userId, parsed.businesses);
      if (Array.isArray(parsed.orders)) this.saveOrders(userId, parsed.orders);
      if (Array.isArray(parsed.expenses)) this.saveExpenses(userId, parsed.expenses);
      if (Array.isArray(parsed.maintenance)) this.saveMaintenance(userId, parsed.maintenance);
      if (Array.isArray(parsed.shifts)) this.saveShifts(userId, parsed.shifts);
      return true;
    } catch (e) {
      console.error('Failed to import data', e);
      return false;
    }
  }

  resetToDefault(userId: string): void {
    const defaultProfile = { ...DEFAULT_USER, uid: userId };
    const defaultBiz = INITIAL_BUSINESSES.map(b => ({ ...b, userId }));
    const defaultOrders = getInitialOrders().map(o => ({ ...o, userId }));
    const defaultExp = getInitialExpenses().map(e => ({ ...e, userId }));
    const defaultMaint = INITIAL_MAINTENANCE.map(m => ({ ...m, userId }));

    this.saveProfile(userId, defaultProfile);
    this.saveBusinesses(userId, defaultBiz);
    this.saveOrders(userId, defaultOrders);
    this.saveExpenses(userId, defaultExp);
    this.saveMaintenance(userId, defaultMaint);
    this.saveShifts(userId, []);
  }
}

export const storage = new StorageRepository();
