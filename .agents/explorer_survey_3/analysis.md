# Analysis Report: Metrics, Statistics, Calculations, Test Suite & Features R4, R5, R7

**Explorer Survey 3** — Cadete OS (PWA Delivery SaaS)  
**Date:** 2026-08-27  
**Working Directory:** `d:/SaaS de delivery/SaaS/.agents/explorer_survey_3/`  
**Authoritative Source:** `d:/SaaS de delivery/SaaS/ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

This report maps the comprehensive architectural survey, mathematical models, existing test suite inventory, and technical implementation blueprint for the extension of **Cadete OS**.

The system is a high-performance, mobile-first PWA for motorcycle couriers in Bolívar, Argentina, built on **React 18 + Vite + TypeScript (Strict Mode) + Tailwind CSS Dark Theme**. It currently possesses 53 unit tests running on Vitest that pass with 100% reliability.

This survey establishes the exact mathematical specifications, data contracts, and unit testing matrix for:
- **R2:** Initial change fund (`Fondo de Cambio Inicial`) and exact net cash reconciliation.
- **R3:** 1-tap customer WhatsApp notification (`wa.me` "Estoy afuera").
- **R4:** Profitability analytics engine per business (lifetime volume, gross revenue, average revenue per trip, ranking algorithms).
- **R5:** Interactive daily net profit goal with dynamic progress tracking and visual state transitions (Amber → Emerald).
- **R6:** Shift tracking (start time, end time, overnight handling) and hourly profit rate calculation without zero-division anomalies.
- **R7:** Date navigation engine (prev/next/today/datepicker) and 7-day running weekly summary with day-by-day financial breakdown.

---

## 2. Codebase Architecture & State Survey

### 2.1 File & Module Distribution

| Module | File Path | Current Role | Extension Needed |
| :--- | :--- | :--- | :--- |
| **Types** | `src/types/index.ts` | Data models (`UserProfile`, `Order`, `Expense`, `Business`, `MaintenanceRecord`) | Add `customerPhone` in `Order`, `dailyProfitGoal` in `UserProfile.settings`, `DailyShift` interface, `BusinessProfitability`, `WeeklySummary`, `DailyGoalProgress`, `ShiftHoursCalculation` |
| **Calculations** | `src/utils/calculations.ts` | `calculateDailySummary`, `calculateBusinessDebt`, `calculateAllBusinessesDebt`, `calculateOilOdometer` | Add `calculateBusinessProfitability`, `calculateDailyGoalProgress`, `calculateShiftHourlyProfit`, `calculateWeeklySummary`, and extend `calculateDailySummary` for initial change fund |
| **Formatting** | `src/utils/formatting.ts` | ARS currency, date formatting (`DD/MM/YYYY`, `YYYY-MM-DD`, `HH:mm`) | Add date navigation helpers (`getAdjacentDate`, `getWeekRange`, `formatDayOfWeek`) |
| **WhatsApp** | `src/utils/whatsapp.ts` | Debt settlement generator & `wa.me` links | Add customer "Estoy afuera" link generator (`generateCustomerArrivalWhatsAppUrl`) |
| **Navigation** | `src/utils/navigation.ts` | 1-Tap Google Maps & Waze deep links | 100% complete and free (no billable APIs) |
| **Storage** | `src/lib/storage.ts` | LocalStorage repository with demo seed data | Add persistence for `DailyShift` (shifts by date/user), profile updates for daily goal |
| **Context & Hooks** | `src/context/DataContext.tsx`, `src/hooks/*` | Reactive state management & hooks | Expose shift state (`shifts`, `saveShift`), goal progress, weekly summary hook |
| **Views / Components** | `src/components/*` | Orders, Finance, Businesses, Maintenance, Settings, Layout | Integrate date navigation in header/dashboard, profit goal widget, business profitability table/cards, weekly summary card, customer WhatsApp button |

---

## 3. Existing Test Suite Analysis (53 Vitest Tests)

The repository contains **6 test suites** with **53 unit tests** located in `tests/`:

```
tests/
├── calculations.test.ts          (8 tests)  -> Core financial summary, cash drawer, accounts receivable debt, oil odometer
├── adversarial_challenge.test.ts (23 tests) -> Invariant: Net Profit = Revenue - Expenses, cash drawer split, batch debt, odometer edge boundaries
├── adversarial_gps_orders.test.ts(14 tests) -> Spanish accents, Argentine addresses, free URL schemes, zone pricing, decimal parsing, payload validation
├── navigation.test.ts            (4 tests)  -> Google Maps & Waze link generation
├── whatsapp.test.ts              (3 tests)  -> WhatsApp settlement formatting & phone number sanitization
└── workflows.test.ts             (1 test)   -> Comprehensive E2E Courier Daily Shift lifecycle
─────────────────────────────────────────────
Total: 53 tests
```

### Key Invariants Tested:
1. **Double-entry reconciliation:**  
   $$\text{Net Profit} = \text{Total Revenue} - \text{Total Expenses}$$  
   $$\text{Net Profit} = \text{Cash in Pocket} + \text{Money in Account} + \text{Unsettled Revenue}$$
2. **Strict Unsettled Debt Isolation:**  
   Unsettled business orders (`paidBy === 'business' && !settled`) NEVER inflate cash in pocket or bank account balance.
3. **Zero billable Google Maps API keys:**  
   All navigation URLs use native scheme `https://www.google.com/maps/dir/?api=1&destination=...`.
4. **Oil Odometer Thresholds:**  
   Green ($<200$ trips and $<25$ days), Yellow ($200-250$ trips or $25-30$ days), Red ($>250$ trips or $>30$ days).

---

## 4. Exact Mathematical Formulas & Logic Engine

### 4.1 Requirement R2: Initial Change Fund & Cash Reconciliation
Couriers start their shift with physical cash in their pocket to make change for customers.

#### Mathematical Definitions:
- **Cash from Orders ($C_{\text{orders}}$):**
  $$C_{\text{orders}} = \sum_{o \in \text{DayOrders, cash, settled}} o.\text{amount}$$
- **Cash Expenses ($E_{\text{cash}}$):**
  $$E_{\text{cash}} = \sum_{e \in \text{DayExpenses, cash}} e.\text{amount}$$
- **Initial Change Fund ($F_{\text{initial}}$):**
  $$F_{\text{initial}} = \text{DailyShift.initialChangeFund} \ge 0 \quad (\text{default: } 0)$$
- **Physical Cash in Hand at Close ($C_{\text{pocket}}$):**
  $$C_{\text{pocket}} = F_{\text{initial}} + C_{\text{orders}} - E_{\text{cash}}$$
- **Real Net Cash Earned ($\text{RealCashEarned}$):**
  $$\text{RealCashEarned} = C_{\text{pocket}} - F_{\text{initial}} = C_{\text{orders}} - E_{\text{cash}}$$

#### UI Representation:
```
Efectivo en Bolsillo (Total en Mano):  $ 32.500
  ├── Fondo de Cambio Inicial:       -$ 10.000
  └── Efectivo Real Ganado:            $ 22.500
```

---

### 4.2 Requirement R4: Lifetime Profitability Analytics per Business

All calculations cross **all historical orders** (`orders`), not just the current day.

#### Mathematical Definitions for Business $b$:
1. **Total Trips ($N_b$):**
   $$N_b = |\{o \in \text{AllOrders} \mid o.\text{businessId} = b.\text{id}\}|$$
2. **Gross Revenue ($R_b$):**
   $$R_b = \sum_{o \in \text{AllOrders}, o.\text{businessId} = b.\text{id}} o.\text{amount}$$
3. **Average Revenue per Trip ($A_b$):**
   $$A_b = \begin{cases} \dfrac{R_b}{N_b} & \text{if } N_b > 0 \\ 0 & \text{if } N_b = 0 \end{cases}$$
4. **Settled Revenue ($S_b$):**
   $$S_b = \sum_{o \in \text{AllOrders}, o.\text{businessId} = b.\text{id}, o.\text{settled} = \text{true}} o.\text{amount}$$
5. **Unsettled Debt ($D_b$):**
   $$D_b = \sum_{o \in \text{AllOrders}, o.\text{businessId} = b.\text{id}, o.\text{paidBy} = \text{'business'}, o.\text{settled} = \text{false}} o.\text{amount}$$
6. **Trips Share Percentage ($P_{N,b}$):**
   $$P_{N,b} = \begin{cases} \left(\dfrac{N_b}{N_{\text{total}}}\right) \times 100 & \text{if } N_{\text{total}} > 0 \\ 0 & \text{if } N_{\text{total}} = 0 \end{cases}$$
7. **Revenue Share Percentage ($P_{R,b}$):**
   $$P_{R,b} = \begin{cases} \left(\dfrac{R_b}{R_{\text{total}}}\right) \times 100 & \text{if } R_{\text{total}} > 0 \\ 0 & \text{if } R_{\text{total}} = 0 \end{cases}$$

#### Sorting Algorithms:
- **Most Profitable (`avg_profit`):** Sort descending by $A_b$ (tie-breaker: $R_b$).
- **Most Volume (`trips`):** Sort descending by $N_b$ (tie-breaker: $A_b$).
- **Highest Gross Revenue (`revenue`):** Sort descending by $R_b$.

---

### 4.3 Requirement R5: Daily Profit Goal & Visual Progress Tracking

Couriers set a target net profit $G_{\text{target}}$ (in ARS).

#### Mathematical Definitions:
- **Net Profit ($P_{\text{net}}$):**
  $$P_{\text{net}} = \text{Total Revenue}_{\text{day}} - \text{Total Expenses}_{\text{day}}$$
- **Completion Percentage ($P_{\%}$):**
  $$P_{\%} = \begin{cases} 0 & \text{if } G_{\text{target}} \le 0 \\ \max\left(0, \dfrac{P_{\text{net}}}{G_{\text{target}}} \times 100\right) & \text{if } G_{\text{target}} > 0 \end{cases}$$
- **Clamped Width Percentage for CSS Bar ($W_{\%}$):**
  $$W_{\%} = \min(100, P_{\%})$$
- **Target Status:**
  $$\text{isReached} = (G_{\text{target}} > 0) \land (P_{\text{net}} \ge G_{\text{target}})$$
- **Remaining Amount ($\Delta_{\text{remaining}}$):**
  $$\Delta_{\text{remaining}} = \max(0, G_{\text{target}} - P_{\text{net}})$$
- **Surplus Amount ($\Delta_{\text{surplus}}$):**
  $$\Delta_{\text{surplus}} = \max(0, P_{\text{net}} - G_{\text{target}})$$

#### Visual State Matrix:
| State | Condition | Progress Bar Color | Text Indicator | Copy/Badge |
| :--- | :--- | :--- | :--- | :--- |
| **In Progress** | $P_{\text{net}} < G_{\text{target}}$ | Amber (`bg-amber-500`) | `text-amber-400` | "Faltan \$X para la meta (Y%)" |
| **Target Reached** | $P_{\text{net}} \ge G_{\text{target}}$ | Emerald (`bg-emerald-500`) | `text-emerald-400` | "¡Meta alcanzada! (Y% • +$Z)" |
| **Zero / Loss** | $P_{\text{net}} \le 0$ | Zinc (`bg-zinc-800`) | `text-zinc-400` | "0% alcanzado" |

---

### 4.4 Requirement R6: Shift Duration & Net Hourly Profit Rate

Couriers log shift start time $T_{\text{start}}$ and shift end time $T_{\text{end}}$ (format: `HH:mm`).

#### Mathematical Definitions:
- **Minute Parsing:**
  $$M_{\text{start}} = H_{\text{start}} \times 60 + \text{Min}_{\text{start}}$$
  $$M_{\text{end}} = H_{\text{end}} \times 60 + \text{Min}_{\text{end}}$$
- **Overnight Shift Handling:**
  If $M_{\text{end}} < M_{\text{start}}$ (e.g. 20:00 to 02:30):
  $$M_{\text{end, adjusted}} = M_{\text{end}} + (24 \times 60) = M_{\text{end}} + 1440$$
- **Duration in Minutes ($D_M$) & Hours ($D_H$):**
  $$D_M = M_{\text{end, adjusted}} - M_{\text{start}}$$
  $$D_H = \dfrac{D_M}{60}$$
- **Hourly Net Profit ($R_H$):**
  $$R_H = \begin{cases} \text{null} & \text{if } T_{\text{start}} \text{ or } T_{\text{end}} \text{ is missing} \\ 0 & \text{if } D_H = 0 \\ \dfrac{P_{\text{net}}}{D_H} & \text{if } D_H > 0 \end{cases}$$

---

### 4.5 Requirement R7: Date Navigation & 7-Day Running Weekly Summary

#### 1. Date Navigation:
- `getPreviousDate(dateStr)`: returns `YYYY-MM-DD` of $(d - 1)$.
- `getNextDate(dateStr)`: returns `YYYY-MM-DD` of $(d + 1)$.
- `getTodayDateString()`: returns current date `YYYY-MM-DD`.

#### 2. Weekly Running Aggregations (7-day window $[d - 6, d]$ or Monday-to-Sunday):
For a reference date $D_{\text{ref}}$, generate the 7 date strings $\{d_1, d_2, \dots, d_7\}$.

For each day $d_i$:
- $R(d_i) = \sum_{o \in \text{Orders}, o.\text{date} = d_i} o.\text{amount}$
- $E(d_i) = \sum_{e \in \text{Expenses}, e.\text{date} = d_i} e.\text{amount}$
- $P(d_i) = R(d_i) - E(d_i)$
- $N(d_i) = |\{o \in \text{Orders} \mid o.\text{date} = d_i\}|$

#### Weekly Totals:
- **Total Weekly Revenue ($R_W$):** $\sum_{i=1}^7 R(d_i)$
- **Total Weekly Expenses ($E_W$):** $\sum_{i=1}^7 E(d_i)$
- **Weekly Net Profit ($P_W$):** $R_W - E_W$
- **Total Weekly Trips ($N_W$):** $\sum_{i=1}^7 N(d_i)$
- **Average Profit per Active Day ($A_{\text{day}}$):**
  $$A_{\text{day}} = \begin{cases} \dfrac{P_W}{|\{d_i \mid N(d_i) > 0 \lor E(d_i) > 0\}|} & \text{if active days} > 0 \\ 0 & \text{otherwise} \end{cases}$$
- **Average Profit per Trip in Week ($A_{\text{trip}}$):**
  $$A_{\text{trip}} = \begin{cases} \dfrac{R_W}{N_W} & \text{if } N_W > 0 \\ 0 & \text{if } N_W = 0 \end{cases}$$

---

### 4.6 Requirement R3: WhatsApp "Estoy afuera" Customer Deep Link

- **Pre-written message:**  
  `"Buenas! Estoy afuera con tu pedido 🛵"`
- **Sanitized URL Generator:**  
  `https://wa.me/{sanitizedNumber}?text=Buenas!%20Estoy%20afuera%20con%20tu%20pedido%20%F0%9F%9B%B5`
- Handles local Argentine formats (`2314-XXXXXX` $\rightarrow$ `5492314XXXXXX`).

---

## 5. Planned Test Suite Expansion

To ensure 100% mathematical correctness and coverage of all new features without degrading existing tests, the following new test suites will be added:

### Test Suite Map:

```
tests/
├── calculations.test.ts          [Existing 8 tests] + new calculation tests
├── adversarial_challenge.test.ts [Existing 23 tests]
├── adversarial_gps_orders.test.ts[Existing 14 tests]
├── navigation.test.ts            [Existing 4 tests]
├── whatsapp.test.ts              [Existing 3 tests]
├── workflows.test.ts             [Existing 1 test]
├── profitability.test.ts         [NEW: ~10 tests for R4]
├── daily_goal.test.ts            [NEW: ~8 tests for R5]
├── shift_and_cash.test.ts        [NEW: ~10 tests for R2 & R6]
└── weekly_summary.test.ts        [NEW: ~8 tests for R7]
```

### Detailed Test Cases to Add:

#### 1. Profitability per Business (`tests/profitability.test.ts`)
- `calculates gross revenue, total trips, and average revenue per business across all historical orders`
- `returns 0 average revenue for business with 0 historical orders without throwing or NaN`
- `correctly sorts businesses by highest average revenue per trip (descending)`
- `correctly sorts businesses by highest trip volume (descending)`
- `correctly sorts businesses by highest gross revenue (descending)`
- `calculates trips share percentage and revenue share percentage correctly`
- `handles multiple orders across different dates and zones for the same business`

#### 2. Daily Goal Progress (`tests/daily_goal.test.ts`)
- `returns 0% progress when daily goal is 0 or negative`
- `calculates accurate progress percentage when profit is below goal (Amber state)`
- `triggers reached state (isReached = true) and calculates surplus when net profit equals or exceeds goal (Emerald state)`
- `handles zero net profit and negative net profit (net loss) gracefully with 0% progress`
- `clamps progress bar visual percentage to 100 while keeping raw percentage accurate`

#### 3. Shift Tracking & Initial Change Fund (`tests/shift_and_cash.test.ts`)
- `calculates real cash earned when initial change fund is provided`
- `falls back to standard cash in pocket when initial change fund is 0 or undefined`
- `computes shift duration in minutes and hours for daytime shift (e.g. 11:30 to 15:00 = 3.5h)`
- `handles overnight shift crossing midnight correctly (e.g. 20:00 to 02:00 = 6.0h)`
- `prevents division by zero when shift duration is 0 hours (returns 0 or null)`
- `returns null hourly rate when start time or end time is missing`
- `calculates exact net profit per hour worked (netProfit / hours)`

#### 4. Weekly Summary & Date Navigation (`tests/weekly_summary.test.ts`)
- `aggregates 7-day running totals (revenue, expenses, net profit, trips count)`
- `generates correct day-by-day financial breakdown matching individual daily calculations`
- `isolates orders and expenses strictly within the 7-day reference window`
- `calculates average profit per active day and average revenue per trip`
- `navigates previous day, next day, and today across month boundaries and leap years`

---

## 6. Implementation Architecture

### 6.1 Data Types (`src/types/index.ts`)
```typescript
// New & Extended Interfaces:

export interface UserProfileSettings {
  currency: "ARS";
  cityDefault: string;
  oilChangeThresholdOrders: number;
  oilChangeThresholdDays: number;
  dailyProfitGoal?: number; // R5: Meta de ganancia diaria
}

export interface Order {
  id: string;
  userId: string;
  date: string;
  timestamp: number;
  businessId: string;
  businessName: string;
  address?: string;
  customerPhone?: string; // R3: Teléfono del cliente para WhatsApp
  zone: ZoneType;
  amount: number;
  paidBy: PayerType;
  paymentMethod: PaymentMethodType;
  settled: boolean;
  settledAt?: string;
  notes?: string;
}

export interface DailyShift {
  date: string; // YYYY-MM-DD
  userId: string;
  initialChangeFund?: number; // R2: Fondo de cambio inicial
  startTime?: string; // R6: HH:mm
  endTime?: string; // R6: HH:mm
  notes?: string;
}

export interface BusinessProfitability {
  businessId: string;
  businessName: string;
  totalOrders: number;
  grossRevenue: number;
  averageRevenuePerTrip: number;
  settledRevenue: number;
  unsettledDebt: number;
  tripsSharePercentage: number;
  revenueSharePercentage: number;
}

export interface DailyGoalProgress {
  targetGoal: number;
  currentProfit: number;
  percentage: number;
  isReached: boolean;
  remainingAmount: number;
  surplusAmount: number;
}

export interface ShiftHoursCalculation {
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  durationHours: number;
  hourlyProfit: number | null;
  isValidShift: boolean;
}

export interface DaySummaryItem {
  date: string;
  dayName: string;
  dayOfWeek: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  ordersCount: number;
}

export interface WeeklySummary {
  startDate: string;
  endDate: string;
  totalOrdersCount: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  averagePerDay: number;
  averagePerTrip: number;
  days: DaySummaryItem[];
}
```

---

## 7. Next Steps for Implementer

1. **Phase 1: Domain & Calculation Utilities**
   - Add new types to `src/types/index.ts`.
   - Implement `calculateBusinessProfitability`, `calculateDailyGoalProgress`, `calculateShiftHourlyProfit`, `calculateWeeklySummary`, and extend `calculateDailySummary` in `src/utils/calculations.ts`.
   - Implement date navigation utilities in `src/utils/formatting.ts` and customer WhatsApp link in `src/utils/whatsapp.ts`.
2. **Phase 2: Storage & State**
   - Extend `src/lib/storage.ts` to persist `DailyShift` records per user and day.
   - Update `src/context/DataContext.tsx` to provide `shift`, `updateShift`, and pass `dailyProfitGoal`.
3. **Phase 3: Views & Components**
   - R1: Desktop layout enhancements in `AppShell.tsx` and sidebar navigation.
   - R2: Initial change fund card & input in cash drawer / shift header.
   - R3: Customer phone input in `OrderFormModal.tsx` and WhatsApp "Estoy afuera" button in `OrderCard.tsx`.
   - R4: Business Profitability Tab/Card in `BusinessList.tsx` or new `BusinessStatsCard.tsx`.
   - R5: Goal widget in `DailySummaryCard.tsx` or dashboard.
   - R6: Shift duration and hourly rate in `DailySummaryCard.tsx` / `CashDrawerCard.tsx`.
   - R7: Date navigator bar in `Header.tsx` / dashboard + `WeeklySummaryView.tsx` or card.
4. **Phase 4: Test Suites**
   - Add new tests in `tests/` and run full test verification.

---
*Report compiled by Explorer Survey 3 for Cadete OS.*
