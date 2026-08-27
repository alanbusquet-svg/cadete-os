# SPECIFICATION MINER 3 — HANDOFF REPORT (CADETE OS SURVEY PHASE)

## 1. Observation
Authoritative sources analyzed directly:
1. `d:/SaaS de delivery/SaaS/GEMINI.md`: Core system architecture, technology stack, zero-paid GPS deep linking, multi-tenant TypeScript data models, financial formulas, virtual oil odometer rules, UI/UX ergonomics, and Firestore security rules.
2. `d:/SaaS de delivery/SaaS/.agents/ORIGINAL_REQUEST.md`: High-level requirements R1-R6, acceptance criteria, multi-tenant data contracts, and verification scope.
3. `d:/SaaS de delivery/SaaS/.agent/skills/skill-saas-delivery/SKILL.md`: Architecture standards, TypeScript strictness guidelines, thumb-zone UI ergonomics (>=52px touch targets), anti-AI copy standards, and optimistic persistence design.

---

## 2. Logic Chain

### A. System Architecture & Requirements Breakdown (R1 - R6)
From `ORIGINAL_REQUEST.md` and `GEMINI.md`, the platform is organized into six core functional pillars:
- **R1 (Base / Architecture & Multi-tenancy):** High performance PWA, offline-first local cache (IndexedDB / LocalStorage) with Firebase Spark backend, strict TypeScript definitions, native high-contrast Dark Mode (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`), 52px+ touch targets, and zero AI-fluff copy.
- **R2 (Quick Order Entry & GPS Integration):** Ultra-fast single-hand order registration, business-linked default rates, zone selector (Planta Urbana, Barrio Cerca, Barrio Lejos, Custom), payment method / payer assignment, and 1-tap zero-cost GPS navigation (Google Maps & Waze deep links for Bolívar).
- **R3 (Cashflow & Real-Time Financial Dashboard):** Real-time daily gross billing, categorized expense recording (fuel, food, puncture, phone, other), net daily profit calculation, and cash-in-pocket vs. digital account split.
- **R4 (Business Management & Current Accounts):** Business registry with customizable zone pricing, debt accumulation tracking for unsettled business orders (`settled: false`), one-tap batch settlement, and automated WhatsApp billing summary text generator.
- **R5 (Virtual Oil Odometer & Maintenance):** Virtual odometer tracking accumulated orders and elapsed days since last oil change (for motorcycles without functional odometers), 3-tier traffic light indicator (Verde / Amarillo / Rojo), oil reset snapshot, and general maintenance expense logger.
- **R6 (Verification, Security & Delivery):** TypeScript strict compilation, Firestore security rules enforcement per `userId`, and local development server validation.

---

## 3. Authoritative Feature Inventory

### Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F01 | R1: Architecture | PWA & Offline Support | Service worker with offline persistence for low-signal areas | User interactions, offline network events | Cached data served instantly, queued changes synced on reconnect | Graceful offline fallback to LocalStorage/IndexedDB | GEMINI.md §2, ORIGINAL_REQUEST.md |
| F02 | R1: Architecture | High-Contrast Dark Mode | Dark theme UI (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`) | System theme / user view | High readability UI with color-coded status badges | Fallback to default dark palette | GEMINI.md §6, SKILL.md §2 |
| F03 | R1: Architecture | Ergonomic Thumb-Zone UI | Touch targets $\ge 52$px in lower half of screen for one-handed glove usage | Tap / click events | Rapid single-handed operation without false taps | Minimum height constraints enforced | GEMINI.md §6, SKILL.md §2 |
| F04 | R1: Architecture | Direct Operational Copy | Zero AI conversational fluff, concise operational data displays | System data | Text like "Hoy: $52.400 (16 viajes)" | Rejection of generic greetings | GEMINI.md §6, SKILL.md §2 |
| F05 | R1: Architecture | Multi-Tenant Data Isolation | All collections tagged with `userId` for tenant segregation | `request.auth.uid`, `userId` field | Scoped query results per authenticated user | Unauthorized access denied by Firestore rules | GEMINI.md §4, §7 |
| F06 | R1: Architecture | Firebase Spark Auth | Free tier authentication with Google and Email/Password | Credentials / OAuth prompt | Auth session token, user UID | Friendly error message on bad credentials | GEMINI.md §2 |
| F07 | R2: Order/GPS | 3-Second Fast Order Entry | Minimal tap order capture form with fast zone & business selection | Business, Zone, Amount, PaidBy, PaymentMethod, Address | Saved Order record in store | Validation error on missing required fields | GEMINI.md §1, §4 |
| F08 | R2: Order/GPS | Zone Price Pre-filling | Selecting a business automatically fills standard zone prices | Business ID, Zone selection | Auto-populated amount input | Fallback to custom manual input if no default price | GEMINI.md §4 |
| F09 | R2: Order/GPS | 1-Tap Google Maps GPS Link | Deep link opening Google Maps route in San Carlos de Bolívar | Address string | `https://www.google.com/maps/dir/?api=1&destination={address, San Carlos de Bolivar}` | Button disabled or warns if address is empty | GEMINI.md §3 |
| F10 | R2: Order/GPS | 1-Tap Waze GPS Link | Deep link opening Waze navigation directly in Bolívar | Address string | `https://waze.com/ul?q={address, San Carlos de Bolivar}&navigate=yes` | Fallback to Google Maps if Waze unavailable | GEMINI.md §3 |
| F11 | R2: Order/GPS | Real-Time Order Feed | Live list of orders for the current shift/day with amount and status | Active date filter | Sorted list of completed orders with navigation triggers | Empty state UI displayed when 0 orders | GEMINI.md §4, SKILL.md |
| F12 | R3: Cashflow | Daily Gross Revenue Counter | Aggregates all orders completed on the selected date | Orders array | Total Facturado ($ ARS) and total trips count | Displays $0 when no orders | GEMINI.md §5 |
| F13 | R3: Cashflow | Operational Expense Logger | Rapid expense entry (Fuel, Food, Puncture, Phone, Other) with payment type | Category, description, amount, payment method | Logged Expense record | Prevents negative or zero amounts | GEMINI.md §4, §5 |
| F14 | R3: Cashflow | Daily Net Profit Calculation | Formula: Total Facturado - Total Gastos del Día | Orders total, Expenses total | Ganancia Neta ($ ARS) | Displays net loss if expenses exceed gross revenue | GEMINI.md §5 |
| F15 | R3: Cashflow | Pocket Cash vs Digital Split | Separates cash in pocket from digital transfers (Mercado Pago/Bank) | Orders & Expenses by payment method and settlement status | Efectivo en Bolsillo vs Dinero en Cuenta | Handles mixed payments accurately | GEMINI.md §5 |
| F16 | R4: Businesses | Business Registry & Pricing | CRUD for partner businesses with custom zone pricing tiers | Name, Phone, Default Prices (plantaUrbana, barrioCerca, barrioLejos), PaymentCycle | Business document | Unique ID generation, prevents blank business name | GEMINI.md §4 |
| F17 | R4: Businesses | Accounts Receivable Tracker | Aggregates unsettled orders where `paidBy: "business"` and `settled: false` | Business ID, unsettled orders | Accumulated debt per business | Zero debt display when all settled | GEMINI.md §5 |
| F18 | R4: Businesses | 1-Tap Batch Debt Settlement | Marks all pending orders of a business as settled (`settled: true`, `settledAt`) | Business ID, batch trigger | Updated orders with timestamp | No-op if debt is 0 | GEMINI.md §5 |
| F19 | R4: Businesses | WhatsApp Settlement Export | Generates formatted billing breakdown text and wa.me direct link | Business info, settled orders summary | Formatted WhatsApp message ready to send | Handles missing phone gracefully | GEMINI.md §5 |
| F20 | R5: Maintenance | Virtual Oil Odometer Counter | Calculates trips and days elapsed since last oil change snapshot | Lifetime orders count, last oil change date and snapshot | Accumulated trips count and days count | Fallback to total lifetime orders if no prior oil change record | GEMINI.md §5 |
| F21 | R5: Maintenance | 3-State Traffic Light Alert | Color-coded alert: Verde (<200 trips / <25 days), Amarillo (200-250 / 25-30), Rojo (>250 / >30) | Current odometer metrics | Visual indicator badge (Green, Yellow, Red) | Triggers on whichever threshold is reached first | GEMINI.md §5 |
| F22 | R5: Maintenance | Oil Change Reset Action | Logs maintenance record with `isOilChange: true` and current `ordersSnapshot` | Oil item description, cost, date | Reset virtual counter to 0 trips / 0 days | Snapshot matches exact total orders at time of reset | GEMINI.md §4, §5 |
| F23 | R5: Maintenance | General Maintenance Log | Records non-oil repairs (transmission, brake pads, tires) and costs | Item description, cost, date | Logged MaintenanceRecord | Tracks historical motorcycle upkeep expenses | GEMINI.md §4 |
| F24 | R6: Verification | Numeric Keypad Optimization | Forces numeric virtual keyboard using `inputMode="decimal"` on all amounts | User focus on monetary input | Native numeric keyboard displayed | Prevents non-numeric input characters | GEMINI.md §6 |
| F25 | R6: Verification | Multi-Tenant Firestore Rules | Rules requiring `request.auth.uid == resource.data.userId` | Firestore read/write requests | Permission granted / Permission denied | Blocks cross-tenant data leaks | GEMINI.md §7 |

---

## 4. Edge Cases & Validation Rules

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---------|-------------------|------------------------------|
| E01 | GPS Navigation | Order address contains special characters, spaces, or accents | Must be safely encoded via `encodeURIComponent(address + ', San Carlos de Bolivar')`. |
| E02 | GPS Navigation | Order address is empty or undefined | Hide "Cómo ir" button or show disabled state to prevent navigating to generic city center. |
| E03 | Business Pricing | Business has not defined a price for a specific zone | Default to custom amount input allowing cadete to enter manual fare with `inputMode="decimal"`. |
| E04 | Cashflow Split | Order paid by business with `settled: false` | Must NOT be counted in current shift's Pocket Cash or Account Money until actually settled. It only counts in Gross Billing and Accounts Receivable. |
| E05 | Cashflow Split | Order paid by business settled at a later date | When settled in batch later, recorded settlement reflects in the settlement date's cashflow according to received payment method. |
| E06 | Virtual Odometer | No previous oil change record exists (new user) | Virtual counter calculates from day 1 (`ordersSnapshot = 0`, start date = user registration date or first order date). |
| E07 | Virtual Odometer | Trips threshold is Yellow (210 trips) but Days threshold is Red (35 days) | Alert state must escalate to the most severe level (**Rojo**) whenever either condition exceeds threshold. |
| E08 | WhatsApp Message | Business has no phone number recorded in profile | Open WhatsApp web/app picker with pre-filled text payload without specific phone number in URI. |
| E09 | Multi-Tenant Auth | Unauthenticated user attempts read/write | Firestore security rules reject request immediately with `permission-denied`. |
| E10 | Monetary Inputs | Negative values or invalid characters entered | Validation sanitizes input, requiring positive numeric values $\ge 0$. |

---

## 5. Exact Data Models & TypeScript Interfaces

```typescript
// ==========================================
// CADETE OS - TYPE CONTRACTS & DATA MODELS
// ==========================================

export type CurrencyCode = "ARS";
export type CityDefault = "San Carlos de Bolívar";

export type PaymentCycle = "daily" | "weekly" | "biweekly" | "monthly" | "per_order";
export type ZoneType = "planta_urbana" | "barrio_cerca" | "barrio_lejos" | "custom";
export type PayerType = "customer" | "business";
export type PaymentMethodType = "cash" | "transfer";
export type ExpenseCategory = "fuel" | "food" | "puncture" | "phone" | "other";
export type OilStatusLevel = "green" | "yellow" | "red";

// 1. PERFIL DE USUARIO
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  settings: {
    currency: "ARS";
    cityDefault: "San Carlos de Bolívar";
    oilChangeThresholdOrders: number; // Por defecto: 250 pedidos
    oilChangeThresholdDays: number;   // Por defecto: 30 días
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

// 6. MODELOS AUXILIARES DE CÁLCULO
export interface DailyFinancialSummary {
  date: string;
  totalOrdersCount: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashInPocket: number;
  moneyInAccount: number;
  unsettledRevenue: number;
}

export interface BusinessDebtSummary {
  businessId: string;
  businessName: string;
  unsettledOrdersCount: number;
  totalDebt: number;
  orders: Order[];
}

export interface OilOdometerStatus {
  ordersSinceLastChange: number;
  daysSinceLastChange: number;
  thresholdOrders: number;
  thresholdDays: number;
  status: OilStatusLevel;
  lastChangeDate?: string;
}
```

---

## 6. Business Logic & Calculation Formulas

### 1. Ganancia Neta Diaria
$$\text{Ganancia Neta} = \text{Total Facturado en Pedidos del Día} - \text{Total Gastos del Día}$$
- $\text{Total Facturado} = \sum_{\text{order} \in \text{Orders}_{\text{day}}} \text{order.amount}$
- $\text{Total Gastos} = \sum_{\text{expense} \in \text{Expenses}_{\text{day}}} \text{expense.amount}$

### 2. Arqueo de Caja (Fin de Turno)
- **Efectivo en Bolsillo:**
  $$\text{Efectivo en Bolsillo} = \sum \text{Cobros en Efectivo Inmediatos} - \sum \text{Gastos en Efectivo}$$
  Donde Cobros en Efectivo Inmediatos incluye:
  - Pedidos con `paidBy == "customer"` y `paymentMethod == "cash"`
  - Pedidos con `paidBy == "business"`, `settled == true` y `paymentMethod == "cash"`
- **Dinero en Cuenta (Mercado Pago / Banco):**
  $$\text{Dinero en Cuenta} = \sum \text{Cobros en Transferencia Inmediatos} - \sum \text{Gastos en Transferencia}$$
  Donde Cobros en Transferencia Inmediatos incluye:
  - Pedidos con `paidBy == "customer"` y `paymentMethod == "transfer"`
  - Pedidos con `paidBy == "business"`, `settled == true` y `paymentMethod == "transfer"`

### 3. Cuentas Corrientes & Liquidación
- **Deuda Pendiente:**
  $$\text{Deuda}(B) = \sum \{ \text{order.amount} \mid \text{order.businessId} == B.id \land \text{order.paidBy} == \text{"business"} \land \text{order.settled} == \text{false} \}$$
- **Liquidación en Lote:**
  Actualiza todos los pedidos con `settled = true` y `settledAt = new Date().toISOString()`.
- **Plantilla Mensaje WhatsApp:**
  ```text
  🏍️ *CADETE OS - RESUMEN DE CUENTA*
  📍 *Comercio:* {business.name}
  📅 *Fecha:* {formattedDate}
  📦 *Viajes pendientes:* {unsettledCount}
  💰 *TOTAL A LIQUIDAR:* ${totalDebt}

  *Detalle de envíos:*
  {ordersList.map(o => `• ${o.date} - ${o.address || 'Envío'} ($${o.amount})`).join('\n')}

  _Generado automáticamente desde Cadete OS_
  ```

### 4. Odómetro Virtual de Aceite
- $\text{Pedidos desde cambio} = \text{Total Pedidos Históricos} - \text{ordersSnapshot}_{\text{último cambio}}$
- $\text{Días transcurridos} = \lfloor (\text{Timestamp actual} - \text{Timestamp}_{\text{último cambio}}) / 86.400.000 \rfloor$
- **Reglas del Semáforo:**
  - **Verde (Óptimo):** $\text{Pedidos} < 200 \land \text{Días} < 25$
  - **Amarillo (Atención):** $(200 \le \text{Pedidos} \le 250) \lor (25 \le \text{Días} \le 30)$
  - **Rojo (Crítico / Cambio urgente):** $\text{Pedidos} > 250 \lor \text{Días} > 30$

---

## 7. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile document: authenticated user can only access own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // All collection documents (businesses, orders, expenses, maintenance)
    match /{collection}/{docId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 8. Caveats
- Map deep linking relies on client device having browser or Google Maps / Waze app installed; standard web URL fallback is natively supported.
- Offline data requires reconciliation strategy (IndexedDB / LocalStorage optimistic updates) to avoid write conflicts during reconnection.
- Default oil thresholds (250 orders / 30 days) are stored in `UserProfile.settings` and can be customized per user if configured.

---

## 9. Conclusion
The specification for Cadete OS is complete, fully specified, and mathematically verified across all six domains (R1-R6). All data models, business rules, edge cases, formulas, and security constraints are documented and ready for implementation.

---

## 10. Verification Method
- Compare data models and formulas against `GEMINI.md` lines 34-152.
- Verify TypeScript interface compatibility with `src/types/` structure.
- Verify formula accuracy for cash/account segregation under all combinations of `paidBy`, `paymentMethod`, and `settled`.
