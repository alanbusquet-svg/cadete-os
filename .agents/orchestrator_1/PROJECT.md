# Project: Cadete OS

## Architecture
Cadete OS is an ultra-fast, mobile-first PWA for motorcycle delivery couriers in San Carlos de Bolívar.
- **Frontend**: React 18 + Vite + TypeScript (strict mode, zero `any`).
- **Styling & Ergonomics**: Tailwind CSS (Native dark mode `bg-zinc-950`, high contrast `text-zinc-100`, touch targets >= 52px, lower thumb-zone CTAs, `inputMode="decimal"` on all numerical inputs, zero AI conversational fluff).
- **Icons**: `lucide-react`.
- **Database & Auth**: Firebase Spark Tier (Firestore + Auth) + LocalStorage/IndexedDB offline-first repository.
- **GPS & Navigation**: 100% Free URL Scheme Deep Linking (Google Maps & Waze) with "Cómo ir" button.
- **State Management**: Reactive custom hooks + pure mathematical selectors (`src/utils/calculations.ts`).

## Code Layout
```
src/
├── types/
│   ├── index.ts             # Data models (UserProfile, Business, Order, Expense, MaintenanceRecord)
│   └── financials.ts        # Calculation models (DailyFinancialSummary, BusinessDebt, OilStatus)
├── lib/
│   ├── firebase.ts          # Firebase Spark configuration and service handles
│   ├── storage.ts           # LocalStorage & IndexedDB offline-first repository
│   └── utils.ts             # Styling helpers (clsx, twMerge)
├── context/
│   ├── AuthContext.tsx      # Auth session and user profile state
│   └── DataContext.tsx      # Unified state provider for Orders, Businesses, Expenses, Maintenance
├── hooks/
│   ├── useAuth.ts           # Auth hook
│   ├── useOrders.ts         # Orders CRUD with optimistic updates
│   ├── useExpenses.ts       # Expenses CRUD with optimistic updates
│   ├── useBusinesses.ts     # Business CRUD and zone pricing
│   ├── useMaintenance.ts    # Maintenance records & oil snapshot management
│   ├── useFinancials.ts     # Real-time daily financial summary and cash audit
│   └── useOilTracker.ts     # Oil wear calculator and semáforo status
├── utils/
│   ├── calculations.ts      # Pure mathematical formulas (Net Profit, Pocket vs Account, Odometer)
│   ├── formatting.ts        # Currency ($ ARS), dates (DD/MM/YYYY), time formatting
│   ├── navigation.ts        # Google Maps & Waze URL scheme builders
│   └── whatsapp.ts          # Business settlement receipt text generator
├── components/
│   ├── common/              # Button, Input, Modal, Select, Badge, Card, BottomSheet
│   ├── layout/              # AppShell, TopHeader, BottomNav
│   ├── orders/              # OrderFormModal, OrderCard, OrderList
│   ├── finance/             # DailySummaryCard, CashDrawerCard, ExpenseFormModal, ExpenseList
│   ├── businesses/          # BusinessList, BusinessFormModal, BusinessDebtModal
│   └── maintenance/         # OilOdometerCard, MaintenanceFormModal, MaintenanceList
├── App.tsx                  # Tab navigation & layout shell
├── index.css                # Tailwind directives and mobile viewport utilities
└── main.tsx                 # Entrypoint
tests/
├── unit/
│   ├── calculations.test.ts # Financial formulas and cash audit invariants
│   ├── navigation.test.ts   # Google Maps & Waze URL encoding and parameters
│   ├── odometer.test.ts     # Oil counter and semáforo thresholds
│   ├── storage.test.ts      # LocalStorage & offline persistence
│   └── whatsapp.test.ts     # WhatsApp message formatting
└── e2e/
    └── workflows.test.ts    # End-to-end user workflows
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F01: PWA & Offline Support | Service worker with offline persistence for low-signal areas | M1 | GEMINI.md §2 |
| 2 | F02: High-Contrast Dark Mode | Dark theme UI (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`) | M1 | GEMINI.md §6 |
| 3 | F03: Ergonomic Thumb-Zone UI | Touch targets >= 52px in lower half of screen for one-handed glove usage | M1 | GEMINI.md §6 |
| 4 | F04: Direct Operational Copy | Zero AI conversational fluff, concise operational data displays | M1 | GEMINI.md §6 |
| 5 | F05: Multi-Tenant Data Isolation | All collections tagged with `userId` for tenant segregation | M1 | GEMINI.md §4 |
| 6 | F06: Firebase Spark Auth | Free tier authentication with Google and Email/Password | M1 | GEMINI.md §2 |
| 7 | F07: 3-Second Fast Order Entry | Minimal tap order capture form with fast zone & business selection | M2 | GEMINI.md §1, §4 |
| 8 | F08: Zone Price Pre-filling | Selecting a business automatically fills standard zone prices | M2 | GEMINI.md §4 |
| 9 | F09: 1-Tap Google Maps GPS Link | Deep link opening Google Maps route in San Carlos de Bolívar | M2 | GEMINI.md §3 |
| 10 | F10: 1-Tap Waze GPS Link | Deep link opening Waze navigation directly in Bolívar | M2 | GEMINI.md §3 |
| 11 | F11: Real-Time Order Feed | Live list of orders for the current shift with amount and status | M2 | GEMINI.md §4 |
| 12 | F12: Daily Gross Revenue Counter | Aggregates all orders completed on the selected date | M3 | GEMINI.md §5 |
| 13 | F13: Operational Expense Logger | Rapid expense entry (Fuel, Food, Puncture, Phone, Other) | M3 | GEMINI.md §4 |
| 14 | F14: Daily Net Profit Calculation | Formula: Total Facturado - Total Gastos del Día | M3 | GEMINI.md §5 |
| 15 | F15: Pocket Cash vs Digital Split | Separates cash in pocket from digital transfers | M3 | GEMINI.md §5 |
| 16 | F16: Business Registry & Pricing | CRUD for partner businesses with custom zone pricing tiers | M4 | GEMINI.md §4 |
| 17 | F17: Accounts Receivable Tracker | Aggregates unsettled orders where `paidBy: "business"` & `settled: false` | M4 | GEMINI.md §5 |
| 18 | F18: 1-Tap Batch Debt Settlement | Marks all pending orders of a business as settled | M4 | GEMINI.md §5 |
| 19 | F19: WhatsApp Settlement Export | Generates formatted billing breakdown text and wa.me link | M4 | GEMINI.md §5 |
| 20 | F20: Virtual Oil Odometer Counter | Calculates trips and days elapsed since last oil change snapshot | M5 | GEMINI.md §5 |
| 21 | F21: 3-State Traffic Light Alert | Color-coded alert: Verde (<200 trips / <25 days), Amarillo (200-250 / 25-30), Rojo (>250 / >30) | M5 | GEMINI.md §5 |
| 22 | F22: Oil Change Reset Action | Logs maintenance record with `isOilChange: true` and current `ordersSnapshot` | M5 | GEMINI.md §5 |
| 23 | F23: General Maintenance Log | Records non-oil repairs (transmission, brake pads, tires) and costs | M5 | GEMINI.md §4 |
| 24 | F24: Numeric Keypad Optimization | Forces numeric virtual keyboard using `inputMode="decimal"` on all amounts | M1 | GEMINI.md §6 |
| 25 | F25: Multi-Tenant Firestore Rules | Rules requiring `request.auth.uid == resource.data.userId` | M1 | GEMINI.md §7 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Base Architecture, Types, Storage & App Shell | Project setup, Vite, TypeScript strict, Tailwind Dark Mode, Lucide, Data Models, LocalStorage & Firebase Engine, AuthContext, AppShell, BottomNav | none | IN_PROGRESS |
| 2 | M2: Fast Order Registration & GPS Deep-Linking | OrderFormModal (touch >= 52px, inputMode="decimal"), zone price pre-fill, customer/business payer, cash/transfer, Google Maps & Waze URL schemes ("Cómo ir"), OrderList live feed | M1 | PLANNED |
| 3 | M3: Real-Time Cashflow & Arqueo de Caja | Daily Financial Summary, Expense logger (nafta, comida, pinchazo, tel, otros), Net Profit formula, Pocket Cash vs Account split | M1, M2 | PLANNED |
| 4 | M4: Business Management, Current Accounts & WhatsApp Settlement | Business registry CRUD with zone pricing, unsettled orders debt aggregator, 1-tap batch settlement, formatted WhatsApp receipt generator | M1, M2 | PLANNED |
| 5 | M5: Virtual Oil Odometer & Maintenance Hub | Virtual wear counter (orders & days since snapshot), 3-level semáforo (Verde/Amarillo/Rojo), oil change reset action, general maintenance log | M1, M2 | PLANNED |
| 6 | M6: Full E2E Test Suite, Adversarial Hardening & Local Dev Server Verification | Vitest test suite passing 100% across all tiers, adversarial tests, PWA manifest, clean TypeScript build, and local dev server launch | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### `src/types/index.ts` ↔ All Components & Services
```typescript
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  settings: {
    currency: "ARS";
    cityDefault: "San Carlos de Bolívar";
    oilChangeThresholdOrders: number;
    oilChangeThresholdDays: number;
  };
}

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
  paymentCycle: "daily" | "weekly" | "biweekly" | "monthly" | "per_order";
  active: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  date: string;
  timestamp: number;
  businessId: string;
  businessName: string;
  address?: string;
  zone: "planta_urbana" | "barrio_cerca" | "barrio_lejos" | "custom";
  amount: number;
  paidBy: "customer" | "business";
  paymentMethod: "cash" | "transfer";
  settled: boolean;
  settledAt?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  userId: string;
  date: string;
  timestamp: number;
  category: "fuel" | "food" | "puncture" | "phone" | "other";
  description: string;
  amount: number;
  paymentMethod: "cash" | "transfer";
}

export interface MaintenanceRecord {
  id: string;
  userId: string;
  date: string;
  timestamp: number;
  item: string;
  cost: number;
  isOilChange: boolean;
  ordersSnapshot: number;
}
```

### `src/utils/calculations.ts` ↔ Financial & Maintenance UI
- `calculateDailySummary(orders: Order[], expenses: Expense[], date: string): DailyFinancialSummary`
- `calculateBusinessDebt(orders: Order[], businessId: string): BusinessDebtSummary`
- `calculateOilOdometer(totalHistoricalOrders: number, lastOilRecord?: MaintenanceRecord, thresholds?: { orders: number; days: number }): OilOdometerStatus`
- `getGoogleMapsUrl(address: string, city?: string): string`
- `getWazeUrl(address: string, city?: string): string`
- `generateWhatsAppSettlementText(business: Business, orders: Order[]): string`
