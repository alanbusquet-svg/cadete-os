# Technical Analysis & Implementation Blueprint: Data Models, Storage, Starting Cash (R2) & Shift Hourly Rates (R6)

**Agent:** Explorer Survey 2  
**Target:** Cadete OS Architecture  
**Working Directory:** `d:/SaaS de delivery/SaaS/.agents/explorer_survey_2/`  
**Authoritative Reference:** `ORIGINAL_REQUEST.md`, `GEMINI.md`

---

## 1. Executive Summary

This investigation surveys the current Cadete OS codebase and maps the technical implementation requirements for:
1. **Data Models, Repositories, and Local Storage State Persistence** (`src/types/index.ts`, `src/lib/storage.ts`, `src/context/DataContext.tsx`, `src/context/AuthContext.tsx`).
2. **Requirement R2: Fondo de Cambio Inicial (Caja de inicio de turno)** — Registering starting cash float per day, integrated into cash drawer breakdown and real earned cash calculations:
   $$\text{Total Efectivo en Bolsillo} = \text{Fondo Inicial} + \text{Cobrado Efectivo} - \text{Gastos Efectivo}$$
   $$\text{Efectivo Real Ganado} = \text{Total Efectivo en Bolsillo} - \text{Fondo Inicial} = \text{Cobrado Efectivo} - \text{Gastos Efectivo}$$
3. **Requirement R6: Shift Start/End Tracking & Hourly Profit Rate ($/hr)** — Shift lifecycle (`in_progress` vs `completed`), time duration parsing across single-day and cross-midnight shifts, zero-division protected rate calculation:
   $$\text{Tasa Horaria (\$/hr)} = \frac{\text{Ganancia Neta del Turno}}{\text{Horas Trabajadas}}$$

All proposed modifications strictly preserve 100% backward compatibility with existing tests and localStorage data, follow TypeScript strict mode (`noUncheckedIndexedAccess`, `noUnusedLocals`), enforce touch targets $\ge 52\text{px}$, and maintain zero AI copy text.

---

## 2. Codebase Baseline & Architectural Inventory

### 2.1 File & Module Map
| Area | File Path | Current Role | Necessary Enhancements |
|---|---|---|---|
| **Type Definitions** | `src/types/index.ts` (119 lines) | Core models: `UserProfile`, `Business`, `Order`, `Expense`, `MaintenanceRecord`, `DailyFinancialSummary` | Add `Shift` entity, update `Order` (`customerPhone`), update `UserProfile.settings` (`dailyGoal`), update `DailyFinancialSummary` (`startingCash`, `realCashEarned`, `shiftHours`, `hourlyRate`), add `BusinessProfitability`, `WeeklyFinancialSummary` |
| **Offline Storage** | `src/lib/storage.ts` (361 lines) | `StorageRepository` managing local storage with key prefix `cadete_os_v1_` | Add `getShifts()`, `saveShifts()`, `getShiftByDate()`, `saveShift()`, update `exportAll()`, `importAll()`, `resetToDefault()`, backward compatible schema migration |
| **Calculations** | `src/utils/calculations.ts` (193 lines) | `calculateDailySummary`, `calculateBusinessDebt`, `calculateOilOdometer` | Update `calculateDailySummary` with optional `startingCash = 0`, add `calculateShiftDurationHours`, `calculateHourlyProfitRate`, `calculateBusinessProfitability`, `calculateWeeklySummary`, `calculateGoalProgress` |
| **Formatting** | `src/utils/formatting.ts` (99 lines) | Currency ARS, dates, time formatters | Add duration formatters (`formatDurationHours`, `formatDurationHM`) |
| **Global Data State** | `src/context/DataContext.tsx` (368 lines) | Central React Context for orders, expenses, businesses, maintenance | Add `shifts` state, `currentShift` getter, `startShift`, `endShift`, `updateShift`, `setStartingCash` actions |
| **Auth & Settings** | `src/context/AuthContext.tsx` (78 lines) | Manages user profile & settings | Extend settings for `dailyGoal` persistence |
| **Financial Hook** | `src/hooks/useFinancials.ts` (42 lines) | Computes daily summary & expense breakdown | Integrate active `Shift` data (`startingCash`, `shiftHours`, `hourlyRate`) |
| **Shift Hook (New/Ext)** | `src/hooks/useShift.ts` (New) | Dedicated hook for shift lifecycle | Direct access to shift actions (`startShift`, `endShift`, `setStartingCash`, duration ticker) |
| **Cash Drawer Card** | `src/components/finance/CashDrawerCard.tsx` (90 lines) | Displays cash in pocket vs money in account | Show starting cash float line (`Fondo de Cambio: -$X`), total pocket cash, real net cash earned |
| **Summary Card / Banner**| `src/components/finance/DailySummaryCard.tsx` | Summary cards | Display shift duration, $/hr rate, starting float status |

---

## 3. Data Model Specifications (`src/types/index.ts`)

### 3.1 New Entity: `Shift`
```typescript
export type ShiftStatus = "in_progress" | "completed";

export interface Shift {
  id: string;                      // Formato: `shift_${date}_${unique}`
  userId: string;
  date: string;                    // Formato YYYY-MM-DD
  startTime?: string;              // ISO String (ej: "2026-08-26T19:00:00.000Z") o HH:mm
  endTime?: string;                // ISO String (ej: "2026-08-26T23:30:00.000Z") o HH:mm
  startingCash: number;            // Fondo de cambio inicial en pesos ($). Por defecto: 0
  status: ShiftStatus;             // "in_progress" | "completed"
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
}
```

### 3.2 Extended Models
```typescript
// 1. UserProfile Settings (Support R5: Daily Goal)
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  settings: {
    currency: "ARS";
    cityDefault: CityDefault;
    oilChangeThresholdOrders: number;
    oilChangeThresholdDays: number;
    dailyGoal?: number;            // Meta de ganancia diaria en ARS (Default: 30000 o configurable)
  };
}

// 2. Order (Support R3: Customer WhatsApp phone)
export interface Order {
  id: string;
  userId: string;
  date: string;
  timestamp: number;
  businessId: string;
  businessName: string;
  address?: string;
  customerPhone?: string;          // Celular del destinatario/cliente para WhatsApp 1-toque
  zone: ZoneType;
  amount: number;
  paidBy: PayerType;
  paymentMethod: PaymentMethodType;
  settled: boolean;
  settledAt?: string;
  notes?: string;
}

// 3. DailyFinancialSummary (Support R2 starting float & R6 hourly rate)
export interface DailyFinancialSummary {
  date: string;
  totalOrdersCount: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashInPocket: number;            // Total de billetes físicos en mano = startingCash + cashCollected - cashExpenses
  moneyInAccount: number;          // Transferencias / Mercado Pago
  unsettledRevenue: number;        // Cuentas corrientes por cobrar
  startingCash: number;            // Fondo de cambio inicial registrado para el día
  realCashEarned: number;          // Ganancia real en efectivo = cashInPocket - startingCash
  shiftDurationHours?: number;     // Horas trabajadas calculadas
  hourlyProfitRate?: number;       // Ganancia neta por hora ($/hr)
}

// 4. Business Profitability Metric Model (Support R4)
export interface BusinessProfitability {
  businessId: string;
  businessName: string;
  totalOrders: number;
  totalRevenue: number;
  averagePerOrder: number;         // totalRevenue / totalOrders
}

// 5. Weekly Financial Summary Model (Support R7)
export interface WeeklyFinancialSummary {
  weekStart: string;               // YYYY-MM-DD (Lunes)
  weekEnd: string;                 // YYYY-MM-DD (Domingo)
  totalOrdersCount: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  days: {
    date: string;
    revenue: number;
    expenses: number;
    netProfit: number;
    ordersCount: number;
  }[];
}
```

---

## 4. Storage Repository & Persistence Architecture (`src/lib/storage.ts`)

### 4.1 Storage Keys & Structure
Current storage keys:
- `cadete_os_v1_${userId}_profile`
- `cadete_os_v1_${userId}_businesses`
- `cadete_os_v1_${userId}_orders`
- `cadete_os_v1_${userId}_expenses`
- `cadete_os_v1_${userId}_maintenance`

New key:
- `cadete_os_v1_${userId}_shifts` $\rightarrow$ JSON stringified `Shift[]`

### 4.2 StorageRepository Implementation Methods
```typescript
// Initial Shifts Seed
export function getInitialShifts(): Shift[] {
  const today = getTodayDateString();
  const now = Date.now();
  return [
    {
      id: `shift_demo_${today}`,
      userId: 'cadete_demo_1',
      date: today,
      startTime: new Date(now - 1000 * 60 * 60 * 3.5).toISOString(), // 3.5 horas atrás
      endTime: undefined, // En curso
      startingCash: 5000,
      status: 'in_progress'
    }
  ];
}

// StorageRepository Extensions
class StorageRepository {
  // ... existing methods ...

  // Shifts
  getShifts(userId: string): Shift[] {
    try {
      const data = localStorage.getItem(this.getKey(userId, 'shifts'));
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const defaults = getInitialShifts().map(s => ({ ...s, userId }));
    this.saveShifts(userId, defaults);
    return defaults;
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
    const index = shifts.findIndex(s => s.date === shift.date);
    let updated: Shift[];
    if (index >= 0) {
      updated = [...shifts];
      updated[index] = { ...updated[index], ...shift };
    } else {
      updated = [shift, ...shifts];
    }
    this.saveShifts(userId, updated);
  }
}
```

### 4.3 Backward Compatibility & Migration Strategy
1. **Non-destructive fallback:** If `localStorage.getItem('cadete_os_v1_${userId}_shifts')` returns `null`, return default seed or `[]`. Existing databases will not throw runtime exceptions.
2. **Missing fields in legacy records:**
   - Existing `orders` without `customerPhone` $\rightarrow$ parsed as `undefined`.
   - Existing `profile.settings` without `dailyGoal` $\rightarrow$ fallback to `30000` or `0`.
   - Old `DailyFinancialSummary` consumers $\rightarrow$ `startingCash` defaults to `0`, ensuring `realCashEarned === cashInPocket`.
3. **Backup Export/Import:**
   - In `exportAll(userId)`: Include `shifts: this.getShifts(userId)`.
   - In `importAll(userId, jsonString)`:
     ```typescript
     if (Array.isArray(parsed.shifts)) {
       this.saveShifts(userId, parsed.shifts);
     }
     ```
   - In `resetToDefault(userId)`: Reset shifts via `saveShifts(userId, defaultShifts)`.

---

## 5. Mathematical Calculations & Utility Engine (`src/utils/calculations.ts`)

### 5.1 Financial Summary & Cash Drawer Calculation (R2)
```typescript
/**
 * Calcula el resumen financiero diario y arqueo de caja con fondo inicial
 * @param orders Array de pedidos
 * @param expenses Array de gastos
 * @param date Fecha YYYY-MM-DD
 * @param startingCash Fondo de cambio inicial registrado para el día (default: 0)
 */
export function calculateDailySummary(
  orders: Order[],
  expenses: Expense[],
  date: string,
  startingCash: number = 0
): DailyFinancialSummary {
  const dayOrders = orders.filter((o) => o.date === date);
  const dayExpenses = expenses.filter((e) => e.date === date);

  let totalRevenue = 0;
  let cashCollected = 0;
  let transferCollected = 0;
  let unsettledRevenue = 0;

  for (const order of dayOrders) {
    const amount = Number(order.amount) || 0;
    totalRevenue += amount;

    if (order.paidBy === 'customer') {
      if (order.paymentMethod === 'cash') {
        cashCollected += amount;
      } else {
        transferCollected += amount;
      }
    } else if (order.paidBy === 'business') {
      if (order.settled) {
        if (order.paymentMethod === 'cash') {
          cashCollected += amount;
        } else {
          transferCollected += amount;
        }
      } else {
        unsettledRevenue += amount;
      }
    }
  }

  let totalExpenses = 0;
  let cashExpenses = 0;
  let transferExpenses = 0;

  for (const expense of dayExpenses) {
    const amount = Number(expense.amount) || 0;
    totalExpenses += amount;

    if (expense.paymentMethod === 'cash') {
      cashExpenses += amount;
    } else {
      transferExpenses += amount;
    }
  }

  const validStartingCash = Number(startingCash) || 0;
  const netProfit = totalRevenue - totalExpenses;
  const realCashEarned = cashCollected - cashExpenses;
  const cashInPocket = validStartingCash + realCashEarned;
  const moneyInAccount = transferCollected - transferExpenses;

  return {
    date,
    totalOrdersCount: dayOrders.length,
    totalRevenue,
    totalExpenses,
    netProfit,
    cashInPocket,
    moneyInAccount,
    unsettledRevenue,
    startingCash: validStartingCash,
    realCashEarned
  };
}
```

#### Invariant Verification:
- **When `startingCash = 0` (Existing tests):**  
  `cashInPocket = 0 + cashCollected - cashExpenses = cashCollected - cashExpenses`.  
  `realCashEarned = cashInPocket`. Exactly matches previous results.
- **When `startingCash = 10000`:**  
  If $C_{cash} = 1500$, $E_{cash} = 1000$:  
  `cashInPocket = 10000 + 500 = 10500` (physical cash in pocket).  
  `realCashEarned = 10500 - 10000 = 500` (actual earned cash).  
  Line in CashDrawerCard: `Fondo de Cambio: -$10.000` $\rightarrow$ `Ganancia Real en Efectivo: $500`.

---

### 5.2 Shift Duration & Hourly Profit Rate Calculations (R6)

#### Shift Duration Parser (`calculateShiftDurationHours`)
Supports both ISO Timestamps (`2026-08-26T19:00:00.000Z`) and Time Strings (`19:00`, `23:30`), handles overnight/cross-midnight shifts (e.g. Start 21:00, End 02:00 $\rightarrow$ 5.0 hours), and handles in-progress shifts using reference time:

```typescript
/**
 * Calcula la duración en horas de un turno.
 * @param startTime ISO string o formato HH:mm
 * @param endTime ISO string o formato HH:mm (opcional si está en curso)
 * @param referenceDate Fecha/hora de referencia si el turno está en curso (default: now)
 */
export function calculateShiftDurationHours(
  startTime?: string,
  endTime?: string,
  referenceDate: Date = new Date()
): number {
  if (!startTime || !startTime.trim()) return 0;

  // 1. Check if ISO string
  const startIso = Date.parse(startTime);
  if (!isNaN(startIso)) {
    const endIso = endTime && !isNaN(Date.parse(endTime))
      ? Date.parse(endTime)
      : referenceDate.getTime();

    const diffMs = endIso - startIso;
    if (diffMs <= 0) return 0;
    return diffMs / (1000 * 60 * 60);
  }

  // 2. Check if HH:mm string (e.g. "19:30")
  const startParts = startTime.split(':').map(Number);
  if (startParts.length === 2 && !isNaN(startParts[0]!) && !isNaN(startParts[1]!)) {
    const startMinutes = startParts[0]! * 60 + startParts[1]!;

    let endMinutes: number;
    if (endTime && endTime.includes(':')) {
      const endParts = endTime.split(':').map(Number);
      if (endParts.length === 2 && !isNaN(endParts[0]!) && !isNaN(endParts[1]!)) {
        endMinutes = endParts[0]! * 60 + endParts[1]!;
      } else {
        endMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
      }
    } else {
      endMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
    }

    // Cross-midnight handling: if end < start (e.g. start 22:00, end 02:00)
    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Add 24 hours
    }

    return diffMinutes / 60;
  }

  return 0;
}
```

#### Hourly Rate Calculation (`calculateHourlyProfitRate`)
```typescript
/**
 * Calcula la ganancia neta por hora trabajada ($/hr).
 * Incluye protección estricta contra división por cero o duraciones negativas.
 */
export function calculateHourlyProfitRate(
  netProfit: number,
  hoursWorked: number
): number {
  if (typeof hoursWorked !== 'number' || isNaN(hoursWorked) || !isFinite(hoursWorked) || hoursWorked <= 0) {
    return 0;
  }

  const rate = netProfit / hoursWorked;
  if (!isFinite(rate) || isNaN(rate)) return 0;
  return Math.round(rate);
}
```

#### Duration Formatter (`formatDurationHM`)
```typescript
/**
 * Formatea horas decimales a "Xh Ym" (ej: 4.5 -> "4h 30m")
 */
export function formatDurationHM(hours: number): string {
  if (hours <= 0 || isNaN(hours) || !isFinite(hours)) return '0h 0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}
```

---

### 5.3 Additional Calculation Utilities for System Completeness

#### Business Profitability Ranking (R4)
```typescript
export function calculateBusinessProfitability(
  businesses: Business[],
  orders: Order[]
): BusinessProfitability[] {
  return businesses
    .map((biz) => {
      const bizOrders = orders.filter((o) => o.businessId === biz.id);
      const totalRevenue = bizOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const totalOrders = bizOrders.length;
      const averagePerOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

      return {
        businessId: biz.id,
        businessName: biz.name,
        totalOrders,
        totalRevenue,
        averagePerOrder
      };
    })
    .sort((a, b) => b.averagePerOrder - a.averagePerOrder);
}
```

#### Daily Goal Progress (R5)
```typescript
export function calculateGoalProgress(
  netProfit: number,
  dailyGoal: number
): { percentage: number; isReached: boolean } {
  if (!dailyGoal || dailyGoal <= 0) {
    return { percentage: 0, isReached: false };
  }
  const percentage = Math.max(0, Math.round((netProfit / dailyGoal) * 100));
  return {
    percentage,
    isReached: percentage >= 100
  };
}
```

#### Weekly Summary (R7)
```typescript
export function calculateWeeklySummary(
  orders: Order[],
  expenses: Expense[],
  referenceDateStr: string
): WeeklyFinancialSummary {
  // Parse reference date (YYYY-MM-DD)
  const [year, month, day] = referenceDateStr.split('-').map(Number);
  const refDate = new Date(year!, month! - 1, day!);
  
  // Calculate Monday of that week
  const dayOfWeek = refDate.getDay(); // 0 = Sun, 1 = Mon ...
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - distanceToMonday);

  const daysSummary = [];
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalOrdersCount = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(monday);
    curDate.setDate(monday.getDate() + i);
    const dateStr = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
    
    const daySummary = calculateDailySummary(orders, expenses, dateStr, 0);
    totalRevenue += daySummary.totalRevenue;
    totalExpenses += daySummary.totalExpenses;
    totalOrdersCount += daySummary.totalOrdersCount;

    daysSummary.push({
      date: dateStr,
      revenue: daySummary.totalRevenue,
      expenses: daySummary.totalExpenses,
      netProfit: daySummary.netProfit,
      ordersCount: daySummary.totalOrdersCount
    });
  }

  const weekStartStr = daysSummary[0]!.date;
  const weekEndStr = daysSummary[6]!.date;

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    totalOrdersCount,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    days: daysSummary
  };
}
```

---

## 6. Context & Hook State Layer Integration

### 6.1 `DataContext.tsx` Integration
Add the following state and handlers to `DataContext`:
```typescript
// State
const [shifts, setShifts] = useState<Shift[]>([]);

useEffect(() => {
  if (!userId) return;
  // ... existing loads
  const loadedShifts = storage.getShifts(userId);
  setShifts(loadedShifts);
}, [userId]);

// Shift Actions
const startShift = (date: string, startingCash?: number, startTime?: string): Shift => {
  const existing = shifts.find(s => s.date === date);
  const newShift: Shift = {
    id: existing?.id || `shift_${date}_${Date.now().toString(36)}`,
    userId,
    date,
    startTime: startTime || new Date().toISOString(),
    endTime: undefined,
    startingCash: startingCash !== undefined ? Number(startingCash) : (existing?.startingCash || 0),
    status: 'in_progress',
    updatedAt: new Date().toISOString()
  };

  setShifts(prev => {
    const filtered = prev.filter(s => s.date !== date);
    const updated = [newShift, ...filtered];
    storage.saveShifts(userId, updated);
    return updated;
  });

  return newShift;
};

const endShift = (date: string, endTime?: string): void => {
  setShifts(prev => {
    const updated = prev.map(s => {
      if (s.date === date) {
        return {
          ...s,
          endTime: endTime || new Date().toISOString(),
          status: 'completed' as const,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    storage.saveShifts(userId, updated);
    return updated;
  });
};

const setStartingCash = (date: string, amount: number): void => {
  setShifts(prev => {
    const existing = prev.find(s => s.date === date);
    let updated: Shift[];
    if (existing) {
      updated = prev.map(s => s.date === date ? { ...s, startingCash: Number(amount) || 0 } : s);
    } else {
      const created: Shift = {
        id: `shift_${date}_${Date.now().toString(36)}`,
        userId,
        date,
        startingCash: Number(amount) || 0,
        status: 'in_progress'
      };
      updated = [created, ...prev];
    }
    storage.saveShifts(userId, updated);
    return updated;
  });
};
```

### 6.2 `useFinancials.ts` Updates
```typescript
export function useFinancials(customDate?: string) {
  const { orders, expenses, shifts, selectedDate, setSelectedDate } = useData();
  const activeDate = customDate || selectedDate;

  const currentShift = useMemo(() => {
    return shifts.find((s) => s.date === activeDate);
  }, [shifts, activeDate]);

  const startingCash = currentShift ? currentShift.startingCash : 0;

  const summary: DailyFinancialSummary = useMemo(() => {
    const baseSummary = calculateDailySummary(orders, expenses, activeDate, startingCash);
    
    // Compute shift metrics
    if (currentShift?.startTime) {
      const hours = calculateShiftDurationHours(currentShift.startTime, currentShift.endTime);
      const rate = calculateHourlyProfitRate(baseSummary.netProfit, hours);
      return {
        ...baseSummary,
        shiftDurationHours: hours,
        hourlyProfitRate: rate
      };
    }

    return baseSummary;
  }, [orders, expenses, activeDate, startingCash, currentShift]);

  // Expenses by category
  // ...
  return {
    selectedDate: activeDate,
    setSelectedDate,
    summary,
    currentShift,
    expensesByCategory
  };
}
```

---

## 7. UI Components & Interaction Mapping

### 7.1 Cash Drawer Component (`CashDrawerCard.tsx`)
```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ ARQUEO DE CAJA (FIN DE TURNO)                           │
├─────────────────────────────────────────────────────────────┤
│ 💵 Fondo de Cambio Inicial: $ 10.000          [Editar]     │
├───────────────────────────────┬─────────────────────────────┤
│ 🟢 EFECTIVO EN BOLSILLO       │ 🔵 DINERO EN CUENTA         │
│    $ 37.000                   │    $ 14.500                 │
│    Billetes físicos en mano   │    Mercado Pago / Transf.   │
├───────────────────────────────┴─────────────────────────────┤
│ 💰 GANANCIA REAL EN EFECTIVO                                │
│    $ 27.000 ($37.000 en mano - $10.000 fondo inicial)       │
├─────────────────────────────────────────────────────────────┤
│ ⏳ Cuentas Corrientes del Día: $ 4.500                      │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Shift Controller & Hourly Rate Banner
Can be rendered at top of OrderList / DailySummary:
- **If no shift started:**  
  Big prominent Touch Button ($\ge 52\text{px}$): **"▶ Iniciar Turno"** with starting cash input prompt/modal.
- **If shift `in_progress`:**  
  Shows: **"🟢 Turno en curso • 3h 45m"**, **"Ganancia: $6.200 / hr"**, and button **"⏹ Finalizar Turno"**.
- **If shift `completed`:**  
  Shows: **"✓ Turno Finalizado (19:00 - 23:30 • 4h 30m)"**, **"Promedio: $7.800 / hr"**, and button to edit times.

---

## 8. Vitest Test Suite Roadmap

New unit and integration test assertions to create in `tests/`:

1. **`tests/calculations.test.ts` (or `tests/shift_and_financials.test.ts`):**
   - `calculateDailySummary with startingCash = 0`: returns exact legacy values.
   - `calculateDailySummary with startingCash = 15000`: verifies `cashInPocket = 15000 + cashProfit` and `realCashEarned = cashProfit`.
   - `calculateShiftDurationHours`:
     * Returns 0 for empty start time.
     * Calculates exact fractional hours for ISO strings (e.g. 18:00 to 22:30 $\rightarrow$ 4.5h).
     * Correctly wraps around midnight (e.g. "21:30" to "01:30" $\rightarrow$ 4.0h).
     * Handles ongoing shifts using reference date.
   - `calculateHourlyProfitRate`:
     * Division by zero protection (hours = 0 $\rightarrow$ rate = 0).
     * Negative hours protection (hours < 0 $\rightarrow$ rate = 0).
     * Negative net profit (e.g. -$4000 in 2 hours $\rightarrow$ -$2000/hr).
     * Standard profit (e.g. $35000 in 5 hours $\rightarrow$ $7000/hr).
   - `calculateBusinessProfitability`:
     * Handles businesses with 0 orders (revenue = 0, average = 0).
     * Correctly sorts businesses by `averagePerOrder` in descending order.
   - `calculateWeeklySummary`:
     * Correctly aggregates 7 days of orders and expenses for the active week.
     * Computes weekly net profit and total trips.
2. **`tests/workflows.test.ts`:**
   - Full shift lifecycle test: start shift with $5.000 starting float, record 5 deliveries, record 1 fuel expense, check mid-shift hourly rate, end shift after 4 hours, verify final cash drawer and $/hr.
