# Cadete OS — Technical Survey & Architecture Blueprint
**Explorer Survey 1 Report**  
**Focus Areas:** Frontend Architecture, Responsive Differentiation (R1), and WhatsApp "Estoy afuera" 1-Touch Integration (R3).

---

## 1. Executive Summary

Cadete OS is a high-performance, mobile-first Progressive Web App (PWA) tailored specifically for motorcycle couriers and delivery riders in Argentine cities (defaulting to San Carlos de Bolívar). The application operates with zero API billing costs (free deep-linking to Google Maps/Waze, local offline persistence, Spark-tier Firebase readiness) and follows strict ergonomic standards (minimum 52px touch targets, dark-mode native high contrast, decimal input keyboards, and strictly zero generic AI fluff).

This survey examines the codebase and establishes the exact implementation blueprints for:
1. **Frontend Architecture:** Clean separation of concerns across types, repository persistence, context state, custom hooks, and modular UI components.
2. **Requirement R1 (Responsive Differentiation):** Unlocking desktop viewports (≥ 768px) with a persistent sidebar navigation and multi-column rich dashboard grids, while preserving 100% of mobile (< 768px) bottom-nav ergonomics and thumb-zone accessibility.
3. **Requirement R3 (WhatsApp "Estoy afuera" 1-Touch Button):** Expanding the order data model with an optional customer phone field, engineering a robust Argentine phone normalization engine (handling prefixes `+54`, `9`, leading `0`, mobile `15`, spaces, hyphens), and embedding a high-visibility 1-touch arrival trigger on order cards with reliable fallbacks.

---

## 2. Current Codebase Architecture Survey

### 2.1 Technology Stack & Build Tools
- **Core:** React 18.3.1 + Vite 5.4.2 + TypeScript 5.5.3 (strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`).
- **Styling:** Tailwind CSS v3.4.10 with custom theme extensions:
  - Dark mode: `class` (default `dark` in `index.html`).
  - Colors: `background: #09090b` (zinc-950), `surface: #18181b` (zinc-900), `surfaceElevated: #27272a` (zinc-800), `border: #27272a`.
  - Min touch targets: `minHeight: { touch: '52px' }`, `minWidth: { touch: '52px' }`.
- **Icons:** `lucide-react` v0.438.0.
- **Date Handling & Utilities:** `date-fns` v3.6.0, `clsx`, `tailwind-merge`.
- **Testing:** `vitest` v2.0.5 with 6 test suites and 53 unit/integration tests passing.
- **Persistence:** Synchronous client-side storage via `StorageRepository` (`src/lib/storage.ts`) writing to `localStorage` under keys `cadete_os_v1_${userId}_${entity}`.

### 2.2 Directory & Component Hierarchy
```
src/
├── App.tsx                          # App root, Context wrappers (Auth + Data), activeTab state
├── main.tsx                         # React 18 createRoot entrypoint
├── index.css                        # Tailwind directives, base font, custom scrollbar
├── types/
│   └── index.ts                     # TypeScript models (UserProfile, Business, Order, Expense, MaintenanceRecord)
├── context/
│   ├── AuthContext.tsx              # Auth state (user profile, local offline demo user)
│   └── DataContext.tsx              # Core data state (orders, expenses, businesses, maintenance, selectedDate)
├── hooks/
│   ├── useAuth.ts                   # Auth hook
│   ├── useOrders.ts                 # Filtered day orders, order actions
│   ├── useExpenses.ts               # Filtered day expenses, expense actions
│   ├── useBusinesses.ts             # Businesses list, debt calculation, batch settlement
│   ├── useFinancials.ts             # Daily summary calculation, expense breakdown by category
│   ├── useMaintenance.ts            # Maintenance records, oil reset actions
│   └── useOilTracker.ts             # Virtual odometer calculation, thresholds, progress percentages
├── lib/
│   ├── storage.ts                   # LocalStorage repository, seeds, JSON export/import
│   ├── firebase.ts                  # Firebase SDK config stub
│   └── utils.ts                     # Tailwind cn() helper (clsx + twMerge)
├── utils/
│   ├── calculations.ts              # Financial summary, accounts receivable debt, virtual oil odometer
│   ├── formatting.ts                # formatCurrency ($ ARS), formatDateAR, formatTime, zone & category labels
│   ├── navigation.ts                # Deep links for Google Maps & Waze (free URL schemes)
│   └── whatsapp.ts                  # WhatsApp debt settlement text and wa.me link generation
└── components/
    ├── layout/
    │   ├── AppShell.tsx             # Outer wrapper with Header, Main, BottomNav (currently hardcoded max-w-md)
    │   ├── Header.tsx               # Top sticky bar: Logo, city pill, net revenue pill, date picker
    │   └── BottomNav.tsx            # Fixed 5-tab navigation bar for mobile
    ├── common/
    │   ├── Button.tsx               # Touch-friendly button (min-h-[52px], active:scale-[0.98])
    │   ├── Input.tsx                # Form input with label, helperText, left/right icon slots
    │   ├── Select.tsx               # Select dropdown with chevron
    │   ├── Card.tsx                 # Styled container card
    │   ├── Modal.tsx                # Bottom-sheet modal on mobile / centered dialog on desktop
    │   └── Badge.tsx                # Status / category badge
    ├── orders/
    │   ├── OrderList.tsx            # Orders view: Daily revenue banner, search, order cards feed
    │   ├── OrderCard.tsx            # Order card: Business, time, amount, address, GPS button, badges
    │   └── OrderFormModal.tsx       # Rapid order creation modal (business, zone, amount, payer, address, notes)
    ├── finance/
    │   ├── DailySummaryCard.tsx     # Daily net balance card (Revenue vs Expenses)
    │   ├── CashDrawerCard.tsx       # Cash drawer split: Pocket cash vs Bank account vs Unsettled debt
    │   ├── ExpenseList.tsx          # Finance view: Summary, Cash Drawer, expense category pills, expense feed
    │   └── ExpenseFormModal.tsx     # Expense logging modal
    ├── businesses/
    │   ├── BusinessList.tsx         # Businesses view: Accounts receivable summary, business cards
    │   ├── BusinessFormModal.tsx    # Business create/edit modal (tariffs for 3 zones, payment cycle)
    │   └── BusinessDebtModal.tsx    # Debt breakdown modal with WhatsApp text trigger & batch settlement
    ├── maintenance/
    │   ├── OilOdometerCard.tsx      # Virtual oil odometer with traffic light indicator (green/yellow/red)
    │   ├── MaintenanceList.tsx      # Workshop view: Odometer card, total investment, repair history
    │   └── MaintenanceFormModal.tsx # Maintenance record creation modal (oil change vs repair)
    └── settings/
        └── SettingsView.tsx         # Settings view: Profile name, default city, odometer thresholds, backup/restore
```

---

## 3. Requirement R1: Responsive Desktop Architecture Blueprint

### 3.1 Root Problem in Current Layout
Currently in `src/components/layout/AppShell.tsx`:
```tsx
// Line 19:
<div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-zinc-950 border-x border-zinc-900/50 shadow-2xl relative">
```
And in `src/components/layout/BottomNav.tsx`:
```tsx
// Line 58:
<nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-1.5 max-w-md mx-auto">
```
This restricts the entire UI to a narrow 448px (28rem) column centered on screen, leaving wide empty black borders on desktop screens (≥768px, 1024px, 1440px, 1920px), while the bottom navigation persists awkwardly on wide monitors.

### 3.2 Layout Transformation Strategy

```
+---------------------------------------------------------------------------------------------------+
| DESKTOP (>= 768px Viewport)                                                                       |
| +---------------------+-------------------------------------------------------------------------+ |
| | FIXED SIDEBAR       | DESKTOP HEADER BAR (Date Navigation, Courier Profile, Quick Metrics)    | |
| | [w-64 / w-72]       +-------------------------------------------------------------------------+ |
| |                     | MAIN CONTENT VIEWPORT (Multi-Column Grid)                               | |
| | - CADETE OS Logo    |                                                                         | |
| | - Active Courier    | +-----------------------------------+ +-------------------------------+ | |
| | - Nav Items:        | | LEFT COLUMN / STATS               | | RIGHT COLUMN / FEED           | | |
| |   • Viajes (Badge)  | | - Daily Metric Hero Card          | | - Filter / Search Bar         | | |
| |   • Finanzas        | | - Quick 1-Tap Action Button       | | - Orders Grid (1 or 2 cols)   | | |
| |   • Comercios (!)   | | - Daily Goal Bar (R5)             | | - Order Cards                 | | |
| |   • Taller (Oil)    | | - Shift Hours / Profit (R6)       | |                               | | |
| |   • Ajustes         | |                                   | |                               | | |
| |                     | +-----------------------------------+ +-------------------------------+ | |
| | - Bottom Shift Pill |                                                                         | |
| +---------------------+-------------------------------------------------------------------------+ |
+---------------------------------------------------------------------------------------------------+

+-----------------------------------+
| MOBILE (< 768px Viewport)         |
| +-------------------------------+ |
| | Sticky Header (Bolívar, Date) | |
| +-------------------------------+ |
| | Single-Column Stack           | |
| | - Daily Banner                | |
| | - Big Green CTA (>=52px)      | |
| | - Order Cards List            | |
| |                               | |
| +-------------------------------+ |
| | Fixed Bottom Nav (5 items)    | |
| +-------------------------------+ |
+-----------------------------------+
```

### 3.3 New / Updated Layout Component Specifications

#### A. `src/components/layout/SidebarNav.tsx` (New Component)
- **Visibility:** `hidden md:flex md:w-64 lg:w-72 md:flex-col fixed top-0 left-0 bottom-0 z-40 bg-zinc-950 border-r border-zinc-800/80`
- **Contents:**
  1. **Brand Header:**
     - Cadete OS logo icon (`Bike` in emerald gradient badge).
     - Title: "CADETE OS" + City badge (`Bolívar` or user default city).
     - Courier status: "Online" badge with pulsing emerald dot + Courier display name.
  2. **Navigation Menu (`nav`):**
     - Vertical list with items for `orders`, `finance`, `businesses`, `maintenance`, `settings`.
     - Active indicator: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold`.
     - Badges:
       - `orders`: Number of trips today (emerald badge).
       - `finance`: None.
       - `businesses`: Pending debt alert `!` (amber badge).
       - `maintenance`: Oil alert `!` (rose badge for red status) or `•` (amber badge for yellow status).
       - `settings`: None.
  3. **Sidebar Footer / Live Shift Widget:**
     - Compact net profit counter: `Hoy: $XX.XXX`.
     - Active date indicator with date changer shortcut.

#### B. `src/components/layout/Header.tsx` (Responsive Update)
- **Mobile (< 768px):** Retains current sticky header format (Logo, city badge, Net profit counter, calendar picker).
- **Desktop (≥ 768px):** Renders a wide top bar with:
  - Left: Current view title (e.g., "Viajes & Pedidos", "Control Financiero", "Gestión de Comercios", "Taller & Odómetro", "Ajustes") + Breadcrumb / date navigator.
  - Center: Date selector with Quick Day Step arrows (`< Anterior`, `Fecha`, `Siguiente >`) enabling R7 day-to-day navigation.
  - Right: Real-time Shift summary pills (`Facturado: $X`, `Gastos: $Y`, `Neto: $Z`).

#### C. `src/components/layout/BottomNav.tsx` (Responsive Update)
- **Rule:** Apply `md:hidden` so it is completely removed on viewports ≥ 768px.
- **Mobile:** Unchanged, preserving bottom thumb-zone navigation.

#### D. `src/components/layout/AppShell.tsx` (Responsive Restructuring)
```tsx
export const AppShell: React.FC<AppShellProps> = ({ children, activeTab, onSelectTab }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex selection:bg-emerald-500/30">
      {/* Desktop Sidebar (>= 768px) */}
      <SidebarNav activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-h-screen md:pl-64 lg:pl-72 transition-all">
        <Header />
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 pb-28 md:pb-8 max-w-7xl mx-auto space-y-6 overflow-x-hidden">
          {children}
        </main>
        {/* Mobile Bottom Nav (< 768px) */}
        <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} />
      </div>
    </div>
  );
};
```

### 3.4 Multi-Column Desktop Grid per View

1. **`OrderList.tsx` (Viajes):**
   - `< 768px`: Single vertical stack (Banner → Search → Cards).
   - `≥ 768px`: 2-column or 3-column layout:
     - Left Column (`lg:col-span-5` or `w-80 / w-96`): Total Revenue Hero card, Primary Action button ("Registrar Viaje"), Daily Goal progress card (R5), Shift Timer & Profit/hour (R6).
     - Right Column (`lg:col-span-7` or `flex-1`): Search bar + Multi-column Order Cards Grid (`grid grid-cols-1 xl:grid-cols-2 gap-4`).
2. **`ExpenseList.tsx` (Finanzas):**
   - `< 768px`: Stacked cards (Summary → Cash Drawer → Category Pills → Expense list).
   - `≥ 768px`: 2-column layout:
     - Left Column (`lg:col-span-5`): `DailySummaryCard` + `CashDrawerCard` (with Opening Float line for R2).
     - Right Column (`lg:col-span-7`): Category breakdown pills + Expense Action CTA ("Cargar Gasto Operativo") + Expense history table/grid.
3. **`BusinessList.tsx` (Comercios):**
   - `< 768px`: Stacked cards (Total Debt Banner → New Business CTA → Business cards).
   - `≥ 768px`: 2-column layout:
     - Left Column (`lg:col-span-4`): Total Accounts Receivable card + New Business CTA + Business Profitability Rankings (R4).
     - Right Column (`lg:col-span-8`): Grid of business cards (`grid grid-cols-1 xl:grid-cols-2 gap-4`).
4. **`MaintenanceList.tsx` (Taller):**
   - `< 768px`: Stacked cards (Odometer → Inversion → History).
   - `≥ 768px`: 2-column layout:
     - Left Column (`lg:col-span-5`): `OilOdometerCard` (Traffic light widget) + Moto Investment summary + Action CTAs.
     - Right Column (`lg:col-span-7`): Maintenance & Repair chronological records.
5. **`SettingsView.tsx` (Ajustes):**
   - `< 768px`: Stacked form cards.
   - `≥ 768px`: 2-column layout:
     - Left Column (`lg:col-span-6`): Courier Profile & Odometer thresholds form + Daily Goal setting (R5).
     - Right Column (`lg:col-span-6`): Offline Backups (JSON Export/Import) + Demo Data Reset.

---

## 4. Requirement R3: WhatsApp "Estoy afuera" 1-Touch Engine

### 4.1 Functional Requirements & User Story
When a courier reaches a customer's delivery destination:
1. They need to alert the customer instantly without typing a single character.
2. The courier presses a high-visibility green button on the order card: **"Estoy afuera"**.
3. Cadete OS opens `https://wa.me/{sanitized_phone}?text={encoded_message}` with pre-written message:
   `"Buenas! Estoy afuera con tu pedido 🛵"`
4. If no customer phone was registered at order creation:
   - The button provides a fallback: copies the pre-written message to the clipboard with visual feedback (`"Mensaje copiado 📋"`) and offers to open WhatsApp contact picker (`https://wa.me/?text=...`) or prompt to add the number.

### 4.2 Data Model Changes

#### `src/types/index.ts` Update:
```typescript
export interface Order {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  businessId: string;
  businessName: string;
  address?: string; // Delivery address
  customerPhone?: string; // NEW: Optional client phone (e.g., "2314-551234")
  zone: ZoneType;
  amount: number;
  paidBy: PayerType;
  paymentMethod: PaymentMethodType;
  settled: boolean;
  settledAt?: string;
  notes?: string;
}
```

### 4.3 Argentine Phone Number Sanitization Engine

#### Normalization Logic & Regex Matrix
In Argentina, phone numbers are entered with significant variance:
- **Local Bolivar area code:** `2314` (4 digits) + subscriber number (6 digits) = 10 digits total.
- **National dial prefix `0`:** `02314 123456` (11 digits with leading 0).
- **Mobile carrier prefix `15`:** `2314 15 123456` or `02314 15 123456` or `2314-15-123456`.
- **International Country Code `+54` and Mobile Indicator `9`:** WhatsApp requires `549` + AreaCode + SubscriberNumber (without `0` or `15`).

#### Clean Algorithm Implementation in `src/utils/whatsapp.ts`:
```typescript
export const DEFAULT_ARRIVAL_MESSAGE = "Buenas! Estoy afuera con tu pedido 🛵";

/**
 * Limpia y estandariza un número de teléfono argentino al formato internacional wa.me:
 * 549 + Código de Área (sin 0) + Número local (sin 15)
 *
 * Ejemplos:
 *  - "2314551234"           -> "5492314551234"
 *  - "02314 551234"         -> "5492314551234"
 *  - "2314 15 551234"       -> "5492314551234"
 *  - "02314-15-551234"      -> "5492314551234"
 *  - "+54 9 2314 551234"    -> "5492314551234"
 *  - "+54 2314 551234"      -> "5492314551234"
 *  - "11 15 4433 2211"      -> "5491144332211"
 */
export function sanitizeArgentinePhoneNumber(phone?: string): string {
  if (!phone) return "";

  // 1. Quitar todos los caracteres no numéricos
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  // 2. Si empieza con 549 (formato WhatsApp completo), removerlo temporalmente para normalizar
  if (digits.startsWith("549")) {
    digits = digits.substring(3);
  } else if (digits.startsWith("54")) {
    digits = digits.substring(2);
  }

  // 3. Remover 0 inicial de código de área (ej: 02314 -> 2314, 011 -> 11)
  if (digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  // 4. Remover '15' de celular local si fue ingresado después del código de área
  // Casos comunes de área:
  // - AMBA / CABA: 11 (2 dígitos) -> ej: 11 15 XXXXXXXX
  if (digits.startsWith("11") && digits.length === 10 && digits.substring(2, 4) === "15") {
    digits = `11${digits.substring(4)}`;
  } else if (digits.length >= 11) {
    // Para códigos de área de 3 o 4 dígitos (ej: 2314, 221, 341, 351)
    // Buscamos si el '15' está en posición 3 o 4:
    // Área de 3 dígitos: ej: 221 15 XXXXXX -> digits = 22115XXXXXX (len 11)
    if (digits.substring(3, 5) === "15" && digits.length === 11) {
      digits = digits.substring(0, 3) + digits.substring(5);
    }
    // Área de 4 dígitos: ej: 2314 15 XXXXXX -> digits = 231415XXXXXX (len 12)
    else if (digits.substring(4, 6) === "15" && digits.length === 12) {
      digits = digits.substring(0, 4) + digits.substring(6);
    }
  }

  // 5. Ensamblar formato internacional estándar para WhatsApp Argentina (+54 9...)
  // Un número argentino válido estándar tiene entre 10 y 11 dígitos nacionales
  if (digits.length >= 10 && digits.length <= 11) {
    return `549${digits}`;
  }

  // Si ya tiene código de país o longitud distinta, devolver con prefijo 549 si tiene 10 dígitos
  if (digits.length === 10) {
    return `549${digits}`;
  }

  return digits ? `549${digits}` : "";
}

/**
 * Genera la URL universal wa.me para el aviso "Estoy afuera"
 */
export function generateCustomerArrivalWhatsAppUrl(
  customerPhone?: string,
  message: string = DEFAULT_ARRIVAL_MESSAGE
): string {
  const encodedText = encodeURIComponent(message);
  const sanitized = sanitizeArgentinePhoneNumber(customerPhone);

  if (!sanitized) {
    return `https://wa.me/?text=${encodedText}`;
  }

  return `https://wa.me/${sanitized}?text=${encodedText}`;
}
```

### 4.4 UI Integration: `OrderFormModal.tsx` & `OrderCard.tsx`

#### A. Form Extension in `src/components/orders/OrderFormModal.tsx`
Add a dedicated Phone input in the form:
```tsx
{/* Teléfono del Cliente (Opcional - WhatsApp 1-Tap) */}
<Input
  label="Teléfono del Cliente (WhatsApp Opcional)"
  type="tel"
  inputMode="tel"
  placeholder="Ej: 2314 551234 (o 02314 15...)"
  value={customerPhone}
  onChange={(e) => setCustomerPhone(e.target.value)}
  leftElement={<Phone className="w-5 h-5 text-zinc-400" />}
  helperText="Permite avisar 'Estoy afuera' por WhatsApp con 1 solo toque al llegar."
/>
```

#### B. 1-Touch Button in `src/components/orders/OrderCard.tsx`
In `OrderCard.tsx`, display customer phone if present, and add the high-visibility WhatsApp arrival button to the action bar:

```tsx
// Action bar in OrderCard.tsx:
<div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-zinc-800/60">
  {/* 1. GPS Button */}
  {hasAddress && (
    <button
      type="button"
      onClick={() => handleNavigate('google')}
      className="min-h-[48px] px-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
    >
      <Navigation className="w-4 h-4 text-emerald-400" />
      <span>Cómo ir</span>
    </button>
  )}

  {/* 2. WhatsApp 'Estoy afuera' 1-Touch Button */}
  {order.customerPhone ? (
    <button
      type="button"
      onClick={handleWhatsAppArrival}
      className="flex-1 min-h-[48px] px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 active:scale-[0.98] transition-all"
      title="Avisar al cliente por WhatsApp que llegaste a la puerta"
    >
      <MessageCircle className="w-4 h-4 stroke-[2.5]" />
      <span>Estoy afuera</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={handleCopyArrivalMessage}
      className="flex-1 min-h-[48px] px-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
      title="Copiar texto de aviso o abrir WhatsApp"
    >
      <MessageCircle className="w-4 h-4 text-zinc-500" />
      <span>{copied ? '¡Copiado! 📋' : 'Avisar llegada'}</span>
    </button>
  )}

  {/* 3. Cobrar / Pendiente & Eliminar Controls */}
  <div className="flex items-center gap-1">
    {onSettleToggle && (
      <button
        type="button"
        onClick={() => onSettleToggle(order.id, order.settled)}
        className="min-h-[48px] px-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
      >
        {order.settled ? 'Pendiente' : 'Cobrar'}
      </button>
    )}
    {onDelete && (
      <button
        type="button"
        onClick={() => onDelete(order.id)}
        className="min-h-[48px] w-12 rounded-2xl bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors"
        title="Eliminar viaje"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )}
  </div>
</div>
```

---

## 5. Interface & Contract Specifications

### 5.1 Updated `src/types/index.ts`
```typescript
// ==========================================
// CADETE OS - TYPE DEFINITIONS & DATA MODELS
// ==========================================

export type CurrencyCode = "ARS";
export type CityDefault = string;

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
    cityDefault: CityDefault;
    oilChangeThresholdOrders: number; // Default: 250
    oilChangeThresholdDays: number;   // Default: 30
    dailyGoalRevenue?: number;        // R5: Meta de ganancia diaria en pesos
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
  customerPhone?: string; // R3: Celular del cliente (ej: "2314-551234")
  zone: ZoneType;
  amount: number;
  paidBy: PayerType;
  paymentMethod: PaymentMethodType;
  settled: boolean;
  settledAt?: string;
  notes?: string;
}

// 4. GASTOS OPERATIVOS
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

// 5. MANTENIMIENTO
export interface MaintenanceRecord {
  id: string;
  userId: string;
  date: string; // Formato YYYY-MM-DD
  timestamp: number;
  item: string;
  cost: number;
  isOilChange: boolean;
  ordersSnapshot: number;
}

// 6. MODELOS AUXILIARES DE CÁLCULO Y VISTA
export interface DailyFinancialSummary {
  date: string;
  totalOrdersCount: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashInPocket: number;
  moneyInAccount: number;
  unsettledRevenue: number;
  openingFloat?: number; // R2: Fondo de cambio inicial
  realCashEarned?: number; // R2: cashInPocket - openingFloat
}

export interface BusinessProfitabilitySummary {
  businessId: string;
  businessName: string;
  totalOrders: number;
  totalRevenue: number;
  averageRevenuePerOrder: number;
  active: boolean;
}

export interface DailyShiftRecord {
  date: string;
  shiftStart?: string; // HH:mm
  shiftEnd?: string;   // HH:mm
  totalHoursWorked?: number;
  netProfitPerHour?: number;
}

export interface WeeklyFinancialSummary {
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  daysActive: number;
}

export type ActiveTab = "orders" | "finance" | "businesses" | "maintenance" | "settings";
```

---

## 6. Integration Points with R2, R4, R5, R6, R7

| Requirement | Impacted Modules | Integration Strategy |
|---|---|---|
| **R1 (Desktop Responsive)** | `AppShell.tsx`, `Header.tsx`, `BottomNav.tsx`, `SidebarNav.tsx`, View layouts | Replaces `max-w-md` restriction with `md:pl-64`, `md:flex-row`, and responsive grid containers (`grid grid-cols-1 lg:grid-cols-12 gap-6`). |
| **R2 (Fondo de Cambio)** | `types`, `calculations.ts`, `CashDrawerCard.tsx`, `DataContext.tsx` | Adds `openingFloat` per day. Deducted from cash in hand: `realCashEarned = cashInPocket - openingFloat`. Displayed in `CashDrawerCard`. |
| **R3 (WhatsApp Estoy Afuera)** | `types`, `whatsapp.ts`, `OrderFormModal.tsx`, `OrderCard.tsx` | Adds `customerPhone` to `Order`. Normalizes Argentine phone formats. Adds 1-touch green button to `OrderCard`. |
| **R4 (Rentabilidad Comercio)** | `types`, `calculations.ts`, `BusinessList.tsx` | Calculates lifetime `totalOrders`, `totalRevenue`, `averageRevenuePerOrder` across all orders for active businesses, sorted descending. |
| **R5 (Meta Ganancia Diaria)** | `types`, `SettingsView.tsx`, `OrderList.tsx` / `DailySummaryCard.tsx` | Adds `dailyGoalRevenue` in `user.settings`. Progress bar with color shift (amber `<100%` to emerald `≥100%`). |
| **R6 (Turno y Ganancia/Hora)** | `types`, `calculations.ts`, `DataContext.tsx`, `Header.tsx` / `OrderList.tsx` | Stores `shiftStart` and `shiftEnd` (HH:mm) per day. Calculates exact hours and `netProfit / hours`. |
| **R7 (Navegación Fecha + Semanal)** | `Header.tsx`, `DataContext.tsx`, `calculations.ts`, `ExpenseList.tsx` | Quick date switcher `< Prev / Today / Next >` + 7-day rolling financial summary aggregate. |

---

## 7. Comprehensive Test Plan

### 7.1 Existing Tests Preservation
All 53 existing tests across 6 test suites must remain 100% green:
1. `tests/adversarial_challenge.test.ts` (Financial invariants, cash drawer split, oil odometer transitions).
2. `tests/adversarial_gps_orders.test.ts` (Accents, universal schemes, zero API keys, zone pricing).
3. `tests/calculations.test.ts` (Summary calculations, business debt, oil odometer).
4. `tests/navigation.test.ts` (Google Maps & Waze links).
5. `tests/whatsapp.test.ts` (Settlement text, wa.me URLs).
6. `tests/workflows.test.ts` (Full E2E daily delivery shift).

### 7.2 New Unit Tests to Add
1. **`tests/whatsapp_arrival.test.ts` (or extension to `whatsapp.test.ts`):**
   - Normalization of 10-digit Bolivar numbers (`2314-551234` -> `5492314551234`).
   - Normalization of numbers with leading 0 (`02314-551234` -> `5492314551234`).
   - Normalization of numbers with `15` (`2314 15 551234`, `02314 15 551234` -> `5492314551234`).
   - Normalization of numbers with `+54 9` (`+54 9 2314 551234` -> `5492314551234`).
   - Empty / undefined phone fallback URL (`https://wa.me/?text=...`).
   - Arrival message exact text verification: `"Buenas! Estoy afuera con tu pedido 🛵"`.
2. **`tests/calculations.test.ts` expansions:**
   - Opening float deduction test (R2).
   - Business profitability ranking test (R4).
   - Daily goal percentage calculation & threshold tests (R5).
   - Shift duration and hourly rate calculation tests (R6: handling 0-hour and multi-hour shifts).
   - Weekly summary date-range aggregation test (R7).

---

## 8. Summary of File Modifications & Additions

| File | Action | Description |
|---|---|---|
| `src/types/index.ts` | **Modify** | Add `customerPhone?: string` to `Order`, add `dailyGoalRevenue?: number` to `UserProfile.settings`, add R2/R4/R6/R7 models. |
| `src/utils/whatsapp.ts` | **Modify** | Add `sanitizeArgentinePhoneNumber` with 0/15/+54 removal and `generateCustomerArrivalWhatsAppUrl`. |
| `src/components/layout/SidebarNav.tsx` | **Create** | Desktop navigation sidebar (≥768px) with badges and courier status. |
| `src/components/layout/AppShell.tsx` | **Modify** | Remove `max-w-md` restriction; integrate `SidebarNav` (desktop) and `BottomNav` (mobile `md:hidden`). |
| `src/components/layout/Header.tsx` | **Modify** | Responsive header with desktop breadcrumb, date switcher arrows, and financial pills. |
| `src/components/layout/BottomNav.tsx` | **Modify** | Add `md:hidden` class to hide on desktop viewports. |
| `src/components/orders/OrderFormModal.tsx` | **Modify** | Add customer phone input field with phone icon and guidance text. |
| `src/components/orders/OrderCard.tsx` | **Modify** | Add 1-touch green "Estoy afuera" WhatsApp button and copy-to-clipboard fallback. |
| `src/components/orders/OrderList.tsx` | **Modify** | Responsive multi-column layout on desktop (`grid grid-cols-1 lg:grid-cols-12 gap-6`). |
| `src/components/finance/ExpenseList.tsx` | **Modify** | Responsive 2-column layout on desktop for summary cards and expense feed. |
| `src/components/businesses/BusinessList.tsx` | **Modify** | Responsive 2-column layout on desktop for accounts receivable and business grid. |
| `src/components/maintenance/MaintenanceList.tsx`| **Modify** | Responsive 2-column layout on desktop for odometer card and history. |
| `src/components/settings/SettingsView.tsx` | **Modify** | Responsive 2-column layout on desktop for profile/odometer settings and backups. |
| `tests/whatsapp.test.ts` | **Modify** | Add test cases for Argentine customer phone sanitization (+54, 9, 0, 15) and arrival URLs. |
