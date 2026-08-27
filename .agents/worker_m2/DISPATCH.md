## 2026-08-27T02:55:50Z
You are Worker M2 for Cadete OS.
Your working directory is: d:/SaaS de delivery/SaaS/.agents/worker_m2/
You must read the authoritative user request at: d:/SaaS de delivery/SaaS/ORIGINAL_REQUEST.md
You must read the project specification at: d:/SaaS de delivery/SaaS/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement Milestone 2 (M2) — UI Components, Views, and Responsive Layout:

1. Pruning fix:
   - Clean `src/context/DataContext.tsx` by removing the duplicate dangling lines 78-82 (outside `useEffect`).

2. R1. Responsive Differentiation:
   - In `src/components/layout/AppShell.tsx`:
     * Mobile (<768px): Maintain mobile-first bottom navigation (`BottomNav.tsx`), single-column layout, compact header.
     * Desktop (>=768px): Full-screen multi-column layout with fixed sidebar navigation (`SidebarNav.tsx` or sidebar component) on the left with icons and labels, full-width content area utilizing wide screen space with multi-column grids (e.g. 2-column or 3-column cards). Never render a narrow centered column on desktop!

3. R2. Fondo de Cambio Inicial (Cash Float):
   - In `src/components/finance/CashDrawerCard.tsx`:
     * Add starting cash input / display (`Fondo de Cambio: -$X`).
     * Show:
       - Fondo Inicial (editable/configurable per day/shift).
       - Total Efectivo en Bolsillo (Physical cash in hand = startingCash + cashCollected - cashExpenses).
       - Efectivo Real Ganado (Real net cash earned = cashCollected - cashExpenses).
       - Dinero en Cuenta (Transferencias).

4. R3. WhatsApp "Estoy afuera" with 1-Touch:
   - In `src/components/orders/OrderFormModal.tsx`:
     * Add optional "Teléfono del cliente" input with `inputMode="tel"` / `"numeric"`.
   - In `src/components/orders/OrderCard.tsx`:
     * When `order.customerPhone` is present, render a prominent green button (touch target >= 52px) with text `"Estoy afuera 🛵"` opening `buildCustomerWhatsAppUrl(order.customerPhone)`.

5. R4. Business Profitability Metrics:
   - Create/integrate `src/components/businesses/BusinessProfitabilityCard.tsx` (or in `BusinessList.tsx` / `ExpenseList.tsx`):
     * Show ranked profitability table/cards sorted descending by average profit per trip.
     * Display: Comercio, Total Viajes, Facturado Total, Promedio por Viaje.

6. R5. Daily Profit Goal with Progress Bar:
   - In `src/components/finance/DailySummaryCard.tsx` (and `src/components/settings/SettingsView.tsx`):
     * Add goal configuration / display.
     * Visual progress bar:
       - Amber (`bg-amber-500` / `border-amber-500`) when < 100%.
       - Emerald Green (`bg-emerald-500` / `border-emerald-500`) when >= 100%.
     * Text status: `"Meta: $X / $Y (Z%)"`, remaining amount or `"Meta alcanzada"`.

7. R6. Shift Start/End & Hourly Profit Rate:
   - Create/integrate `src/components/finance/ShiftTrackerCard.tsx` (in `ExpenseList.tsx` or dashboard cards):
     * Quick shift start / end time inputs (or "Iniciar Turno" / "Cerrar Turno").
     * Display: Horario (Inicio - Fin), Duración (`formatDurationHM`), and Ganancia por Hora (`$X/hr`).

8. R7. Date Navigation & Weekly Summary:
   - In `src/components/common/Header.tsx`:
     * Add Previous Day (`<`), Next Day (`>`), and `"Hoy"` quick action buttons around the date input.
   - Create/integrate `src/components/finance/WeeklySummaryCard.tsx`:
     * 7-day running financial summary: Facturado, Gastos, Ganancia Neta Semanal, Total Viajes, and daily breakdown.

9. Strict UX Rules:
   - Dark Theme: `bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`.
   - Touch targets >= 52px for primary actions.
   - `inputMode="decimal"` on all numeric amount inputs.
   - Zero AI generic phrases, direct operative copy.

10. Verification:
    - Run `npm test` to verify all tests pass.
    - Run `npm run build` (`tsc && vite build`) to verify TypeScript strict mode passes with 0 errors.

Write detailed handoff report in `d:/SaaS de delivery/SaaS/.agents/worker_m2/handoff.md`.
Send a message to parent when finished.
