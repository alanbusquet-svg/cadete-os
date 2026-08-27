# CADETE OS - ESPECIFICACIÓN TÉCNICA Y REGLAS DE ARQUITECTURA

## 1. CONTEXTO, PROPÓSITO Y FILOSOFÍA
Cadete OS es una PWA (Progressive Web App) Mobile-First ultra rápida, pensada exclusivamente para cadetes y repartidores independientes en moto.
Resuelve 4 problemas críticos del día a día:
1. **Carga en 3 segundos con 1 mano:** Registrar viajes al instante sin perder tiempo entre paradas.
2. **GPS / Navegación con 1 Toque (100% Gratis):** Al ingresar una dirección de entrega, un botón abre directamente Google Maps o Waze con la ruta trazada en Bolívar (sin pagar APIs ni suscripciones de mapas).
3. **Control Financiero y Arqueo de Caja Exacto:** Separación clara entre Efectivo en bolsillo vs. Dinero en cuenta (Mercado Pago / Transferencias), control de cuentas corrientes de comercios y gastos operativos diarios.
4. **Mantenimiento Preventivo sin Odómetro:** Contador virtual de desgaste de motor (días y viajes acumulados desde el último cambio de aceite) para motos sin tablero funcional (ej: Honda CG Titan).

---

## 2. STACK TECNOLÓGICO (100% GRATUITO Y SIN SUSCRIPCIONES)
- **Frontend:** Next.js (App Router) o React + Vite con TypeScript estricto.
- **Estilos & UI:** Tailwind CSS (Dark Mode nativo de alto contraste) + `lucide-react`.
- **Base de Datos & Auth:** Firebase (Firestore + Firebase Authentication con Google y Email/Password) — Plan Spark (Gratis para siempre).
- **Hosting:** Vercel o Firebase Hosting (Tier Gratuito).
- **GPS & Mapas:** Deep linking universal gratuito vía URL Scheme (Google Maps & Waze), sin necesidad de Google Maps Platform API Key paga.
- **PWA & Offline:** Service Workers (`next-pwa` o Serwist) con persistencia local inmediata (IndexedDB / LocalStorage) para operar en zonas de baja señal.

---

## 3. INTEGRACIÓN GPS Y RUTAS (100% GRATIS)
Para evitar el cobro de APIs de Google Maps, la aplicación utiliza enlaces de navegación nativos:
- **Google Maps:** `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address + ', ' + city + ', ' + country)}`
- **Waze:** `https://waze.com/ul?q=${encodeURIComponent(address + ', ' + city + ', ' + country)}&navigate=yes`
- El parámetro `country` viene de `user.settings.countryDefault` (default: `"Argentina"`).
- Si `country` está vacío, el URL solo usa `ciudad` (backward compatible).
- En el formulario de pedido y en el historial de viajes, cada pedido con dirección tiene un botón verde directo: **"Cómo ir"** que lanza la app de mapas instalada en el celular.
- Función: `openNavigation(address, provider, city, country)` en `src/utils/navigation.ts`.

---

## 4. MODELO DE DATOS MULTI-TENANT (TypeScript)
Cada tabla contiene `userId` para que el sistema esté aislado por usuario y sea escalable a futuro.

```typescript
// PERFIL DE USUARIO
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  settings: {
    currency: "ARS";
    cityDefault: string;        // Editable en Ajustes. Default: "San Carlos de Bolívar"
    countryDefault: string;     // Editable en Ajustes. Default: "Argentina" — v2.1
    oilChangeThresholdOrders: number; // Por defecto: 250 pedidos
    oilChangeThresholdDays: number;   // Por defecto: 30 días
    dailyGoal?: number;         // Meta de ganancia diaria en pesos — v2
  };
}

// COMERCIOS Y CLIENTES HABITUALES
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

// VIAJES / PEDIDOS
export interface Order {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  businessId: string;
  businessName: string;
  address?: string;       // Dirección de entrega (ej: "Av. San Martín 450")
  customerPhone?: string; // Celular del destinatario para WhatsApp "Estoy afuera" — v2
  zone: "planta_urbana" | "barrio_cerca" | "barrio_lejos" | "custom";
  amount: number;
  paidBy: "customer" | "business";
  paymentMethod: "cash" | "transfer";
  settled: boolean; // true = cobrado | false = pendiente en cuenta corriente
  settledAt?: string;
  notes?: string;
}

// GASTOS OPERATIVOS Y DIARIOS
export interface Expense {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  category: "fuel" | "food" | "puncture" | "phone" | "other";
  description: string;
  amount: number;
  paymentMethod: "cash" | "transfer";
}

// MANTENIMIENTO DE LA MOTO
export interface MaintenanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  item: string; // Texto libre: "Aceite Castrol 20w50", "Transmisión", "Cinta de freno"
  cost: number;
  isOilChange: boolean; // Reset del contador virtual de aceite
  ordersSnapshot: number; // Snapshot del total de pedidos acumulados
}

// TURNOS Y JORNADA LABORAL — v2
export interface Shift {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime?: string;    // HH:mm
  endTime?: string;      // HH:mm
  startingCash?: number; // Fondo de cambio inicial (efectivo con el que se sale)
  status: "in_progress" | "completed";
  createdAt: number;
}
```

---

## 5. REGLAS DE NEGOCIO Y CÁLCULOS

1. **Ganancia Neta Diaria:**
   `Ganancia Neta = Total Facturado en Pedidos - Total Gastos del Día (Nafta + Comida/Varios)`

2. **Arqueo de Caja (Fin de Turno):**
   - `Efectivo en Bolsillo = Cobrado Efectivo (Clientes + Negocios) - Gastos pagados en Efectivo`
   - `Dinero en Cuenta = Cobrado Transferencias (Clientes + Negocios) - Gastos pagados con Transferencia`

3. **Control de Cuentas Corrientes (Deuda de Comercios):**
   - Pedidos con `paidBy: "business"` y `settled: false` suman en *"Por Cobrar a [Comercio]"*.
   - Botón *"Liquidar Deuda"* para marcar cobrado en lote y generar mensaje para WhatsApp.

4. **Odómetro Virtual de Aceite (Motos sin Tablero):**
   - `Pedidos desde cambio = Total Pedidos Históricos - ordersSnapshot del último cambio`.
   - `Días transcurridos = Días desde la fecha del último cambio`.
   - Semáforo: Verde (<200 pedidos / <25 días), Amarillo (200-250 / 25-30 días), Rojo (>250 / >30 días).

---

## 6. UX / UI Y ERGONOMÍA (DARK MODE & SIN TEXTO DE IA)
- **Dark Theme Nativo:** Fondo `bg-zinc-950`, tarjetas `bg-zinc-900`, bordes `border-zinc-800`.
- **Touch Targets:** Botones de acción principales de `52px` o más, fáciles de pulsar con guantes o una mano.
- **Campos Numéricos:** `inputMode="decimal"` obligatorio en importes para abrir teclado de números.
- **Copy Directo y Funcional:** Cero frases cliché de IA. Solo datos claros: *"Hoy: $52.400 (16 viajes)"*, *"Efectivo: $22.000"*, *"En Cuenta: $30.400"*.

---

## 7. REGLAS DE SEGURIDAD FIRESTORE
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{collection}/{docId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```
