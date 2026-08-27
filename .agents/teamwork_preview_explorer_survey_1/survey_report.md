# CADETE OS — REPORTE DE RELEVAMIENTO DE CÓDIGO, COMPONENTES, TIPOS Y TESTS (SURVEY REPORT)

> **Autor:** Explorer 1 (Codebase Structure, Components, Types & Existing Tests)  
> **Fecha:** 27 de Agosto de 2026  
> **Proyecto:** Cadete OS (`d:/SaaS de delivery/SaaS`)  
> **Estado:** 100% Relevado y Mapeado

---

## 1. RESUMEN EJECUTIVO
Cadete OS es una PWA Mobile-First de alto rendimiento diseñada exclusivamente para cadetes y repartidores en moto.
El proyecto se encuentra estructurado con **React 18 + Vite 5 + TypeScript Estricto**, estilizado con **Tailwind CSS v3** en Dark Mode nativo (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`), e iconos de `lucide-react`.

La base de código actual cuenta con:
- **48 archivos TypeScript/TSX** en `src/` organizados en capas limpias (`components`, `context`, `hooks`, `lib`, `types`, `utils`).
- **11 suites de pruebas automatizadas en Vitest** con **162 tests unitarios y adversariales** con 100% de éxito.
- **Configuración de TypeScript de máxima rigurosidad** (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`).
- **Persistencia actual:** `LocalStorage` reactivo mediante `StorageRepository` (`src/lib/storage.ts`) con claves aisladas por `userId` (`cadete_os_v1_{userId}_{entity}`).

---

## 2. INVENTARIO COMPLETO DEL CODEBASE

### 2.1. Estructura de Directorios
```
d:/SaaS de delivery/SaaS/
├── .env                       # Variables de entorno Firebase
├── firestore.rules            # Reglas de seguridad multi-tenant Firestore
├── index.html                 # Entry point HTML con meta tags móviles y manifest
├── package.json               # Dependencias (React 18, Firebase 10, Lucide, Tailwind, Vitest, vite-plugin-pwa)
├── tsconfig.json              # Configuración TypeScript estricta
├── tsconfig.node.json         # Configuración TS para herramientas de build
├── vite.config.ts             # Configuración Vite + plugin React + Vitest setup
├── public/
│   ├── favicon.svg            # Icono vector Cadete OS
│   └── manifest.json          # Manifest PWA (standalone, theme #09090b)
├── tests/
│   ├── setup.ts               # Polyfill de localStorage para Node/Vitest
│   ├── calculations.test.ts   # Pruebas financieras y odómetro
│   ├── navigation.test.ts     # Pruebas deep links GPS multi-país
│   ├── whatsapp.test.ts       # Pruebas sanitización y mensajes wa.me
│   ├── workflows.test.ts      # Pruebas E2E de turno diario y ciclo de vida
│   ├── m1_extensions.test.ts  # Pruebas de extensión de datos y turnos
│   ├── m1_challenger_adversarial.test.ts
│   ├── m2_challenger_adversarial.test.ts
│   ├── m3_comprehensive_verification.test.ts
│   ├── adversarial_challenge.test.ts
│   ├── adversarial_gps_orders.test.ts
│   └── adversarial_gps_stress.test.ts
└── src/
    ├── main.tsx               # Montaje en DOM (StrictMode)
    ├── App.tsx                # AuthProvider > DataProvider > AppContent
    ├── index.css              # Directivas Tailwind y estilos base
    ├── vite-env.d.ts          # Declaraciones de tipos Vite
    ├── types/
    │   └── index.ts           # Modelos de datos TypeScript y contratos
    ├── lib/
    │   ├── firebase.ts        # Inicialización de Firebase App, Auth y Firestore
    │   ├── storage.ts         # Repositorio LocalStorage offline-first
    │   └── utils.ts           # Helper cn() con clsx y twMerge
    ├── context/
    │   ├── AuthContext.tsx    # Contexto de autenticación y perfil de usuario
    │   └── DataContext.tsx    # Contexto de datos, pedidos, gastos, comercios, turnos
    ├── hooks/
    │   ├── useAuth.ts         # Hook selector de AuthContext
    │   ├── useOrders.ts       # Gestión de pedidos filtrados por fecha
    │   ├── useExpenses.ts     # Gestión de gastos diarios
    │   ├── useBusinesses.ts   # Cuentas corrientes y cálculo de deudas
    │   ├── useFinancials.ts   # Arqueo de caja, netos, metas y métricas por hora
    │   ├── useMaintenance.ts  # Registro de taller y cambio de aceite
    │   └── useOilTracker.ts   # Semáforo de odómetro virtual
    ├── utils/
    │   ├── calculations.ts    # Lógica de cálculo financiero, odómetro y KPIs
    │   ├── formatting.ts      # Formateo de moneda ARS, fechas y etiquetas
    │   ├── navigation.ts      # Generador deep links Google Maps y Waze (gratis)
    │   └── whatsapp.ts        # Sanitización de teléfonos E.164 y mensajes wa.me
    └── components/
        ├── layout/
        │   ├── AppShell.tsx   # Shell responsive (Sidebar desktop + BottomNav mobile)
        │   ├── Header.tsx     # Barra superior con navegador de fechas (< Hoy >) y neto
        │   ├── SidebarNav.tsx # Menú lateral fijo para pantallas medianas/grandes
        │   └── BottomNav.tsx  # Barra de navegación táctil inferior (mobile)
        ├── common/
        │   ├── Button.tsx     # Botones ergonómicos ≥52px (primary, secondary, danger, etc.)
        │   ├── Input.tsx      # Inputs con soporte inputMode="decimal"/"numeric"
        │   ├── Select.tsx     # Selector estilizado
        │   ├── Modal.tsx      # Diálogo modal con overlay oscuro
        │   ├── Card.tsx       # Contenedor de tarjeta
        │   ├── Badge.tsx      # Etiquetas de estado
        │   └── ConfirmDialog.tsx # Diálogo de confirmación modal táctil
        ├── orders/
        │   ├── OrderList.tsx      # Vista de viajes del turno, buscador y banner de totales
        │   ├── OrderCard.tsx      # Tarjeta de viaje: GPS 1-toque, WhatsApp y cobro
        │   └── OrderFormModal.tsx # Formulario de carga rápida de pedido en 3 seg
        ├── finance/
        │   ├── ExpenseList.tsx        # Panel financiero completo (2 columnas en desktop)
        │   ├── DailySummaryCard.tsx   # Ganancia neta + meta diaria + barra progreso
        │   ├── CashDrawerCard.tsx     # Arqueo: efectivo en bolsillo, cuenta, fondo inicial
        │   ├── ShiftTrackerCard.tsx   # Control de turno y ganancia horaria
        │   ├── WeeklySummaryCard.tsx  # Resumen de 7 días interactivo
        │   └── ExpenseFormModal.tsx   # Carga de gastos operativos
        ├── businesses/
        │   ├── BusinessList.tsx              # Lista de comercios y total por cobrar
        │   ├── BusinessDebtModal.tsx         # Liquidación de cuenta corriente y WhatsApp
        │   ├── BusinessFormModal.tsx         # Alta y edición de comercios y tarifas
        │   └── BusinessProfitabilityCard.tsx # Ranking de rentabilidad por comercio
        ├── maintenance/
        │   ├── MaintenanceList.tsx      # Historial de reparaciones y gastos de taller
        │   ├── MaintenanceFormModal.tsx # Alta de gasto o cambio de aceite
        │   └── OilOdometerCard.tsx      # Semáforo de desgaste de motor
        └── settings/
            └── SettingsView.tsx # Configuración de perfil, meta diaria, país, backup JSON
```

---

## 3. MODELO DE DATOS Y TIPOS (`src/types/index.ts`)

| Interfaz / Tipo | Propósito | Campos Clave |
|---|---|---|
| `UserProfile` | Perfil y configuración del repartidor | `uid`, `email`, `displayName`, `createdAt`, `settings: { currency, cityDefault, countryDefault, oilChangeThresholdOrders, oilChangeThresholdDays, dailyGoal }` |
| `Business` | Comercios y tarifas por zona | `id`, `userId`, `name`, `phone`, `defaultPrices: { plantaUrbana, barrioCerca, barrioLejos }`, `paymentCycle`, `active`, `createdAt` |
| `Order` | Registro de viajes y cobro | `id`, `userId`, `date`, `timestamp`, `businessId`, `businessName`, `address`, `customerPhone`, `zone`, `amount`, `paidBy`, `paymentMethod`, `settled`, `settledAt`, `notes` |
| `Expense` | Gastos del turno | `id`, `userId`, `date`, `timestamp`, `category`, `description`, `amount`, `paymentMethod` |
| `MaintenanceRecord` | Taller y odómetro virtual | `id`, `userId`, `date`, `timestamp`, `item`, `cost`, `isOilChange`, `ordersSnapshot` |
| `Shift` | Jornada laboral y fondo de caja | `id`, `userId`, `date`, `startTime`, `endTime`, `startingCash`, `status`, `createdAt` |
| `DailyFinancialSummary` | Resumen de arqueo diario | `totalOrdersCount`, `totalRevenue`, `totalExpenses`, `netProfit`, `cashInPocket`, `moneyInAccount`, `unsettledRevenue`, `startingCash`, `realCashEarned`, `shiftDurationHours`, `hourlyProfitRate` |
| `BusinessDebtSummary` | Cuentas corrientes por cobrar | `businessId`, `businessName`, `unsettledOrdersCount`, `totalDebt`, `orders` |
| `OilOdometerStatus` | Estado de desgaste de aceite | `ordersSinceLastChange`, `daysSinceLastChange`, `thresholdOrders`, `thresholdDays`, `status ('green' \| 'yellow' \| 'red')` |

---

## 4. ESTADO DE LA SUITE DE PRUEBAS (VITEST)

- **Framework:** `Vitest v2.0.5`
- **Configuración:** `vite.config.ts` (`setupFiles: ['./tests/setup.ts']`)
- **Total de Suites:** 11 archivos de prueba
- **Total de Tests:** 162 pruebas unitarias, de integración y adversariales
- **Tasa de Aprobación:** 100% PASS

### Desglose de Pruebas Existentes
1. `tests/navigation.test.ts` (35 tests): Generación de deep links Google Maps y Waze, soporte multi-país, codificación de caracteres argentinos (`ñ`, `ü`, `°`, `#`, `&`), y enlaces limpios sin coma final.
2. `tests/calculations.test.ts` (28 tests): Arqueo de caja, separación de efectivo vs. cuenta, ganancia neta, retención de pedidos no liquidados en cta cte, semáforo de odómetro.
3. `tests/whatsapp.test.ts` (12 tests): Normalización de teléfonos argentinos E.164 (`549...`), eliminación de `0` y `15`, texto de liquidación para WhatsApp.
4. `tests/workflows.test.ts` (15 tests): Flujo de vida completo de un turno (inicio, viajes mixtos, gastos, fondo de cambio, liquidación en lote, reset de aceite).
5. `tests/m1_extensions.test.ts`, `tests/m1_challenger_adversarial.test.ts`, `tests/m2_challenger_adversarial.test.ts`, `tests/m3_comprehensive_verification.test.ts`, `tests/adversarial_challenge.test.ts`, `tests/adversarial_gps_orders.test.ts`, `tests/adversarial_gps_stress.test.ts` (72 tests): Pruebas de estrés, cruce de medianoche en turnos, contratos de componentes y ConfirmDialog, prevención de división por cero.

---

## 5. REGLAS DE TYPESCRIPT Y COMPILACIÓN

- Archivo: `tsconfig.json`
- Reglas activas:
  - `"strict": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noFallthroughCasesInSwitch": true`
  - `"noUncheckedIndexedAccess": true`
- **Comando de Build:** `npm run build` (`tsc && vite build`)
- **Resultado:** 0 errores de TypeScript y 0 advertencias.

---

## 6. MAPA DE ÁREAS A INTERVENIR PARA LA INTEGRACIÓN COMPLETA

Para cumplir con los requerimientos de `ORIGINAL_REQUEST.md`, se identifican las siguientes áreas de intervención técnica:

### R1. Autenticación Firebase & Pantalla de Acceso (`AuthContext.tsx` + `AuthView.tsx`)
1. **`src/lib/firebase.ts`:**
   - Confirmar que use las credenciales del proyecto `cadete-os-delivery` proporcionadas en `ORIGINAL_REQUEST.md` (o variables de entorno `VITE_FIREBASE_*`).
2. **`src/context/AuthContext.tsx`:**
   - Conectar listeners reales de Firebase Authentication (`onAuthStateChanged`).
   - Implementar métodos:
     - `signInWithGoogle()` (vía `signInWithPopup(auth, googleProvider)`).
     - `signInWithEmailPassword(email, password)` (vía `signInWithEmailAndPassword`).
     - `signUpWithEmailPassword(email, password)` (vía `createUserWithEmailAndPassword`).
     - `logout()` (vía `signOut(auth)`).
     - `enterDemoMode()` / `isDemoMode: boolean` (para preservar la experiencia offline y de prueba sin registro).
   - Gestionar el `UserProfile` en Firestore al autenticar (crear documento si es nuevo usuario con fecha de trial de 7 días `trialEndsAt`).
3. **`src/components/auth/AuthView.tsx` (Nuevo Componente):**
   - Pantalla ergonómica Dark Mode (`bg-zinc-950`, tarjetas `bg-zinc-900`, botones ≥52px).
   - Botón principal "Continuar con Google".
   - Formulario de Email + Contraseña con toggle Iniciar Sesión / Registrarse.
   - Banner: "🚀 7 Días de Prueba Gratis — Sin tarjeta de crédito".
   - Botón "Modo Demo / Probar sin cuenta".
4. **`src/App.tsx`:**
   - Mostrar `AuthView` cuando el usuario no esté autenticado y no esté en modo demo.
5. **`src/components/layout/Header.tsx` y `SidebarNav.tsx`:**
   - Mostrar botón de usuario / Cerrar Sesión / Ver Estado de Cuenta.

---

### R2. Sincronización en la Nube con Firestore Multi-tenant
1. **`src/lib/firestoreService.ts` (Nuevo Módulo):**
   - Servicio tipado para CRUD de: `orders`, `expenses`, `businesses`, `maintenance`, `shifts`, `users/{userId}`.
   - Consultas filtradas siempre por `userId == auth.currentUser.uid`.
2. **`src/context/DataContext.tsx`:**
   - Si el usuario está autenticado en Firebase (`!isDemoMode && user.uid !== 'cadete_demo_1'`), sincronizar en tiempo real con Firestore (`onSnapshot` o lectura/escritura) y mantener `localStorage` como caché local inmediata.
   - Si el usuario está en modo demo o sin conexión, operar contra `localStorage`.
3. **`firestore.rules`:**
   - Ya verificado: protege lectura/escritura restringiendo a `request.auth.uid == userId` y `resource.data.userId == request.auth.uid`.

---

### R3. PWA Completa & Service Worker (Offline-First)
1. **`vite.config.ts`:**
   - Configurar `VitePWA` de `vite-plugin-pwa`:
     - `registerType: 'autoUpdate'`
     - Estrategia de cache para assets estáticos y fuentes.
     - Sincronización con `public/manifest.json`.
2. **`src/main.tsx` / `index.html`:**
   - Asegurar el registro del Service Worker en el arranque.
3. **`public/manifest.json`:**
   - Verificar consistencia con iconos, colores y tema (`#09090b`).

---

### R4. Verificación de Calidad y Tests
1. Crear pruebas unitarias y de integración para Auth y Firestore (`tests/auth.test.ts`, `tests/firestore.test.ts`).
2. Mantener al 100% las 162 pruebas existentes en Vitest.
3. Asegurar compilación estricta con `npm run build` (`tsc && vite build`) con código de salida 0.

---

### R5. Despliegue en Vercel & Firebase
1. Preparar configuración de deploy para Vercel en la cuenta `noxus-stock` (Team `team_usq9cxj5sLeSVEYABuamco67`).
2. Asegurar que las variables de entorno de Firebase estén vinculadas.

---

## 7. CONCLUSIÓN DEL SURVEY
El codebase de Cadete OS está en un estado de **alta madurez arquitectónica**, con separación limpia de responsabilidades y cobertura de pruebas sólida. La integración de Firebase Auth, Firestore y PWA se puede realizar de forma no destructiva sobre las abstracciones existentes (`AuthContext`, `DataContext`, `vite.config.ts`), garantizando continuidad operativa tanto en modo conectado como en modo demo offline.
