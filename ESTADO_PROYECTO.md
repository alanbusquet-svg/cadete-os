# CADETE OS — ESTADO DEL PROYECTO
> Última actualización: 27/08/2026 — v2.1 (Polish, Multi-País, ConfirmDialog)

---

## 📍 Directorio Principal
`d:/SaaS de delivery/SaaS`

## ⚙️ Stack Tecnológico
- **Frontend:** React 18 + Vite 5 + TypeScript strict (`noUnusedLocals`, `noUncheckedIndexedAccess`)
- **Estilos & UI:** Tailwind CSS v3 (Dark Mode: `bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`) + Lucide React
- **Persistencia:** `LocalStorage` reactivo vía `StorageRepository` (`src/lib/storage.ts`)
  - Keys: `cadete_os_v1_{userId}_{entity}` — Entities: `profile`, `orders`, `expenses`, `businesses`, `maintenance`, `shifts`
  - `DEFAULT_USER.uid = 'cadete_demo_1'`
- **GPS:** Deep linking 100% gratuito — Google Maps + Waze. URL incluye `ciudad + país`
- **WhatsApp:** Sanitización números argentinos E.164 (`549...`) → `wa.me/549...`
- **DB futura:** Firebase Firestore (Plan Spark, gratis)
- **Hosting futuro:** Vercel (Hobby tier, gratis)

---

## 🗂️ Arquitectura de Archivos Clave

```
src/
├── App.tsx                          ← Providers: AuthProvider > DataProvider > AppContent
├── types/index.ts                   ← TODOS los tipos TS (UserProfile, Order, Expense, etc.)
├── context/
│   ├── AuthContext.tsx              ← useAuth(), updateProfile(), DEFAULT_USER
│   └── DataContext.tsx              ← useData(), CRUD orders/expenses/businesses/maintenance/shifts
├── lib/
│   ├── storage.ts                   ← StorageRepository singleton, DEFAULT_USER, seed data
│   └── utils.ts                     ← cn() helper
├── hooks/
│   ├── useOrders.ts                 ← dayOrders, selectedDate, CRUD
│   ├── useExpenses.ts               ← dayExpenses, CRUD
│   ├── useBusinesses.ts             ← businesses, totalPendingDebt, CRUD
│   ├── useFinancials.ts             ← summary, goalProgress, currentShift, weeklyData
│   └── useOilTracker.ts             ← oilStatus, ordersSinceLastChange
├── utils/
│   ├── navigation.ts                ← openNavigation(address, provider, city, country)
│   ├── calculations.ts              ← calculateDailySummary, calculateWeeklySummary, etc.
│   ├── whatsapp.ts                  ← sanitizeArgentinePhone, buildCustomerWhatsAppUrl
│   └── formatting.ts                ← formatCurrency, formatDateAR, formatDurationHM, etc.
└── components/
    ├── layout/
    │   ├── AppShell.tsx             ← Wrapper: Sidebar (desktop) + Header + main + BottomNav (mobile)
    │   ├── SidebarNav.tsx           ← Desktop: sidebar fijo con nav, mini-resumen y aceite
    │   ├── Header.tsx               ← Navegador de fechas (< Hoy >, datepicker), neto del día
    │   └── BottomNav.tsx            ← Mobile: bottom nav con 5 tabs
    ├── common/
    │   ├── Button.tsx               ← Variantes: primary/secondary/danger/outline
    │   ├── Input.tsx                ← Input con leftElement, helperText, label
    │   ├── Badge.tsx                ← Badges de colores
    │   └── ConfirmDialog.tsx        ← Modal inline de confirmación (≥52px, dark mode) ← NUEVO v2.1
    ├── orders/
    │   ├── OrderList.tsx            ← Grid de viajes del día, banner de totales, búsqueda
    │   ├── OrderCard.tsx            ← Card individual: GPS, WhatsApp, cobrar/pendiente, eliminar
    │   └── OrderFormModal.tsx       ← Modal de carga rápida de viaje
    ├── finance/
    │   ├── ExpenseList.tsx          ← Panel financiero completo (2 columnas en desktop)
    │   ├── DailySummaryCard.tsx     ← Ganancia neta + meta diaria + barra progreso
    │   ├── CashDrawerCard.tsx       ← Arqueo: efectivo, cuenta, fondo de cambio
    │   ├── ShiftTrackerCard.tsx     ← Registro de turno + ganancia/hora
    │   └── WeeklySummaryCard.tsx    ← Resumen 7 días navegable por click
    ├── businesses/
    │   ├── BusinessList.tsx         ← Lista de comercios + métricas rentabilidad
    │   ├── BusinessCard.tsx         ← Card de comercio: deuda, liquidar, WhatsApp
    │   ├── BusinessFormModal.tsx    ← Alta/edición de comercio
    │   └── BusinessProfitabilityCard.tsx ← Ranking por $/viaje promedio
    ├── maintenance/
    │   ├── MaintenanceList.tsx      ← Historial de gastos de taller
    │   └── MaintenanceFormModal.tsx ← Alta de gasto/service
    └── settings/
        └── SettingsView.tsx         ← Perfil, meta diaria, ciudad, país, aceite, backup
```

---

## 🧩 Modelo de Datos Completo (TypeScript — `src/types/index.ts`)

```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  settings: {
    currency: "ARS";
    cityDefault: string;        // Ej: "San Carlos de Bolívar"
    countryDefault: string;     // Ej: "Argentina" — v2.1
    oilChangeThresholdOrders: number; // Default: 250
    oilChangeThresholdDays: number;   // Default: 30
    dailyGoal?: number;         // Meta de ganancia diaria en pesos
  };
}

interface Order {
  id, userId, date (YYYY-MM-DD), timestamp, businessId, businessName,
  address?, customerPhone?,   // customerPhone → WhatsApp "Estoy afuera"
  zone: "planta_urbana"|"barrio_cerca"|"barrio_lejos"|"custom",
  amount, paidBy: "customer"|"business",
  paymentMethod: "cash"|"transfer",
  settled: boolean, settledAt?, notes?
}

interface Expense {
  id, userId, date, timestamp,
  category: "fuel"|"food"|"puncture"|"phone"|"other",
  description, amount, paymentMethod: "cash"|"transfer"
}

interface MaintenanceRecord {
  id, userId, date, timestamp, item, cost,
  isOilChange: boolean,   // reset contador virtual
  ordersSnapshot: number  // total histórico al momento del cambio
}

interface Shift {
  id, userId, date, startTime?, endTime?,
  startingCash?: number,  // Fondo de cambio inicial
  status: "in_progress"|"completed", createdAt
}

interface Business {
  id, userId, name, phone?,
  defaultPrices: { plantaUrbana, barrioCerca, barrioLejos },
  paymentCycle: "daily"|"weekly"|"biweekly"|"monthly"|"per_order",
  active, createdAt
}
```

---

## 🚀 Features Implementadas (v1 + v2 + v2.1)

### v1 — Base completa
- Carga rápida de viajes con selector de comercio y zonas con tarifas
- GPS 1 toque (Google Maps + Waze) — 100% gratis, sin API Key
- Panel financiero: Ganancia Neta, Arqueo Efectivo vs. Cuenta
- Gestión de comercios: tarifas, cuentas corrientes, liquidación WhatsApp
- Odómetro virtual de aceite (semáforo Verde/Amarillo/Rojo)
- Export/Import backup JSON

### v2 — 7 Features nuevas
- **R1** Layout responsivo: Sidebar fijo en desktop ≥768px, bottom nav en mobile
- **R2** Fondo de Cambio Inicial: campo por turno, arqueo discriminado
- **R3** WhatsApp "Estoy afuera 🛵": teléfono opcional del cliente, sanitización argentina
- **R4** Métricas rentabilidad por comercio: ranking por $/viaje promedio
- **R5** Meta de ganancia diaria: barra progreso ámbar→esmeralda
- **R6** Control de turnos: inicio/fin, ganancia/hora, soporte medianoche
- **R7** Historial navegable por fecha + resumen semanal 7 días

### v2.1 — Polish & UX Fixes
- **GPS Multi-País**: `countryDefault: "Argentina"` en perfil. URL GPS = `"dirección, ciudad, país"`
- **Sidebar dinámico**: badge muestra `user.settings.cityDefault` (no hardcodeado)
- **ConfirmDialog**: modal inline reutilizable reemplaza `window.confirm()` en toda la app
- **CashDrawerCard**: "Efectivo Real Ganado" aparece exactamente una vez
- **+48 tests**: total 162 tests en 11 suites (era 114 en 9)

---

## 🧪 Tests (estado actual)

| Suite | Tests | Estado |
|---|---|---|
| `adversarial_gps_orders.test.ts` | 14 | ✅ |
| `adversarial_gps_stress.test.ts` | 29 | ✅ |
| `adversarial_challenge.test.ts` | 23 | ✅ |
| `m1_challenger_adversarial.test.ts` | 20 | ✅ |
| `m1_extensions.test.ts` | 22 | ✅ |
| `m2_challenger_adversarial.test.ts` | 12 | ✅ |
| `m3_comprehensive_verification.test.ts` | 19 | ✅ |
| `calculations.test.ts` | 8 | ✅ |
| `navigation.test.ts` | 11 | ✅ |
| `whatsapp.test.ts` | 3 | ✅ |
| `workflows.test.ts` | 1 | ✅ |
| **TOTAL** | **162** | **✅ 100%** |

---

## 🌐 Servidor de Desarrollo

```bash
cd "d:/SaaS de delivery/SaaS"
npm install          # solo si es entorno nuevo
npm run build        # verificar TypeScript (debe salir código 0)
npm run test         # verificar 162 tests
npx vite --host --port 5173   # levantar dev server
```

- Local: `http://localhost:5173/` (o `5174/` si el puerto está ocupado)
- Red local (celular): `http://192.168.0.116:5173/`

---

## 🔧 Bugs Corregidos (historial completo)

1. `cityDefault` tipo literal → `string` en types/index.ts
2. Cast forzado `as 'San Carlos de Bolívar'` en SettingsView → eliminado
3. GPS ignoraba `cityDefault` del perfil → ahora usa `user.settings.cityDefault`
4. Label "Bolívar" hardcodeado en OrderFormModal → dinámico con `city`
5. Notes se renderizaba como string literal → template string correcto
6. Imports no usados en 3 archivos de tests → eliminados
7. `localStorage is not defined` en tests → `tests/setup.ts` con polyfill
8. Badge sidebar hardcodeado "Bolívar" → usa `user.settings.cityDefault` (v2.1)
9. `window.confirm()` en OrderList, ExpenseList, SettingsView → `ConfirmDialog` (v2.1)
10. "Efectivo Real Ganado" duplicado en CashDrawerCard → una sola aparición (v2.1)

---

## 📋 Backlog / Próximos Pasos Sugeridos

### Alta prioridad
- [ ] Integrar Firebase Auth (Google + Email/Password)
- [ ] Migrar persistencia de LocalStorage → Firestore multi-tenant
- [ ] Deploy en Vercel conectado al repo de GitHub

### Media prioridad
- [ ] Pantalla de Login / Onboarding con demo de 7 días
- [ ] PWA completo: Service Worker + manifest.json + offline fallback
- [ ] Sistema de flota (multi-cadete) — panel admin

### Ideas futuras (no urgente)
- Exportar resumen semanal en PDF
- Notificaciones push para recordatorios de aceite
- Integración con Mercado Pago para cobros online
- Estadísticas mensuales / anuales con gráficos

---

## 🏗️ Plan de Infraestructura Futura (gratuita)

| Componente | Servicio | Plan | Costo |
|---|---|---|---|
| Base de datos | Firebase Firestore | Spark (gratis siempre) | $0 |
| Autenticación | Firebase Auth | Spark (gratis siempre) | $0 |
| Hosting | Vercel | Hobby (gratis siempre) | $0 |
| Dominio | A definir | — | ~\$10/año |

**Capacidad del plan gratuito:** ~50 usuarios activos diarios sin pagar nada.
