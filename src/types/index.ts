// ==========================================
// CADETE OS - TYPE DEFINITIONS & DATA MODELS
// ==========================================

export type CurrencyCode = "ARS";
export type CityDefault = string;
export type CountryDefault = string;

export type PaymentCycle = "daily" | "weekly" | "biweekly" | "monthly" | "per_order";
export type ZoneType = "planta_urbana" | "barrio_cerca" | "barrio_lejos" | "custom";
export type PayerType = "customer" | "business";
export type PaymentMethodType = "cash" | "transfer";
export type ExpenseCategory = "fuel" | "food" | "puncture" | "phone" | "other";
export type OilStatusLevel = "green" | "yellow" | "red";

// 1. PERFIL DE USUARIO
export interface TrialInfo {
  isTrialActive: boolean;
  daysRemaining: number;
  isExpired: boolean;
  trialEndsAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  trialEndsAt?: string;
  subscriptionStatus?: 'trial' | 'active' | 'expired';
  settings: {
    currency: "ARS";
    cityDefault: CityDefault;
    countryDefault: CountryDefault;  // R1: Soporte multi-país (default "Argentina")
    oilChangeThresholdOrders: number; // Por defecto: 250 pedidos
    oilChangeThresholdDays: number;   // Por defecto: 30 días
    dailyGoal?: number;               // R5: Meta de ganancia diaria en pesos
  };
}

// 2. COMERCIOS Y CLIENTES HABITUALES
export interface Business {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  defaultPrices: {
    plantaUrbana: number;
    barrioCerca: number;
    barrioLejos: number;
  };
  paymentCycle: PaymentCycle;
  active: boolean;
  createdAt: string;
}

// 3. VIAJES / PEDIDOS
export interface Order {
  id: string;
  userId: string;
  date: string; // Formato YYYY-MM-DD
  timestamp: number;
  businessId: string;
  businessName: string;
  address?: string; // Dirección de entrega (ej: "Av. San Martín 450")
  customerPhone?: string; // R3: Celular del destinatario para WhatsApp "Estoy afuera"
  zone: ZoneType;
  amount: number;
  paidBy: PayerType;
  paymentMethod: PaymentMethodType;
  settled: boolean; // true = cobrado | false = pendiente en cuenta corriente
  settledAt?: string;
  notes?: string;
}

// 4. GASTOS OPERATIVOS Y DIARIOS
export interface Expense {
  id: string;
  userId: string;
  date: string; // Formato YYYY-MM-DD
  timestamp: number;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethodType;
}

// 5. MANTENIMIENTO DE LA MOTO
export interface MaintenanceRecord {
  id: string;
  userId: string;
  date: string; // Formato YYYY-MM-DD
  timestamp: number;
  item: string; // Texto libre: "Aceite Castrol 20w50", "Transmisión", "Cinta de freno"
  cost: number;
  isOilChange: boolean; // Reset del contador virtual de aceite
  ordersSnapshot: number; // Snapshot del total de pedidos acumulados
}

// 6. TURNOS Y JORNADA LABORAL
export type ShiftStatus = "in_progress" | "completed";

export interface Shift {
  id: string;
  userId: string;
  date: string; // Formato YYYY-MM-DD
  startTime?: string; // HH:mm o ISO string
  endTime?: string;   // HH:mm o ISO string
  startingCash?: number; // R2: Fondo de cambio inicial
  status: ShiftStatus;
  createdAt: number;
}

// 7. MODELOS AUXILIARES DE CÁLCULO Y VISTA
export interface DailyFinancialSummary {
  date: string;
  totalOrdersCount: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashInPocket: number;
  moneyInAccount: number;
  unsettledRevenue: number;
  startingCash?: number;       // R2: Fondo de cambio inicial
  realCashEarned?: number;     // R2: Efectivo real ganado (cashCollected - cashExpenses)
  shiftDurationHours?: number; // R6: Duración del turno en horas
  hourlyProfitRate?: number;   // R6: Ganancia neta por hora
}

export interface BusinessDebtSummary {
  businessId: string;
  businessName: string;
  unsettledOrdersCount: number;
  totalDebt: number;
  orders: Order[];
}

export interface BusinessProfitability {
  businessId: string;
  businessName: string;
  totalOrders: number;
  totalRevenue: number;
  averageProfitPerTrip: number;
}

export interface GoalProgress {
  targetGoal: number;
  currentNetProfit: number;
  percentage: number;
  isReached: boolean;
  remainingAmount: number;
}

export interface DayFinancialSummary {
  date: string;
  ordersCount: number;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface WeeklyFinancialSummary {
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  averageDailyNetProfit: number;
  days: DayFinancialSummary[];
}

export interface OilOdometerStatus {
  ordersSinceLastChange: number;
  daysSinceLastChange: number;
  thresholdOrders: number;
  thresholdDays: number;
  status: OilStatusLevel;
  lastChangeDate?: string;
  ordersSnapshot: number;
  totalHistoricalOrders: number;
}

export type ActiveTab = "orders" | "finance" | "businesses" | "maintenance" | "settings";
