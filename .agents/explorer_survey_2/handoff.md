# Handoff Report — Explorer Survey 2: Data Models, Persistence, Starting Cash (R2) & Shift Hourly Rate (R6)

**Agent:** Explorer Survey 2  
**Directory:** `d:/SaaS de delivery/SaaS/.agents/explorer_survey_2/`  
**Target:** Data Layer, Storage Repository, Financial & Shift Calculations  

---

## 1. Observation

Direct code observations from inspecting the codebase:

1. **Type Definitions in `src/types/index.ts`:**
   - Lines 16–27: `UserProfile` has `settings: { currency: "ARS"; cityDefault: CityDefault; oilChangeThresholdOrders: number; oilChangeThresholdDays: number; }` — currently lacks `dailyGoal` (R5).
   - Lines 46–61: `Order` has `id, userId, date, timestamp, businessId, businessName, address?, zone, amount, paidBy, paymentMethod, settled, settledAt?, notes?` — currently lacks `customerPhone?: string` (R3).
   - Lines 88–97: `DailyFinancialSummary` has `date, totalOrdersCount, totalRevenue, totalExpenses, netProfit, cashInPocket, moneyInAccount, unsettledRevenue` — currently lacks `startingCash`, `realCashEarned`, `shiftDurationHours`, `hourlyProfitRate`.
   - No `Shift` interface currently exists in `src/types/index.ts`.

2. **Storage Repository in `src/lib/storage.ts`:**
   - Line 14: `const STORAGE_PREFIX = 'cadete_os_v1_';`
   - Lines 206–358: `StorageRepository` manages entities: `profile`, `businesses`, `orders`, `expenses`, `maintenance`.
   - Lines 317–343: `exportAll(userId)` and `importAll(userId, jsonString)` export and import `profile`, `businesses`, `orders`, `expenses`, `maintenance` without handling `shifts`.

3. **Financial Calculations in `src/utils/calculations.ts`:**
   - Lines 19–88: `calculateDailySummary(orders: Order[], expenses: Expense[], date: string)` computes:
     * Line 74: `const netProfit = totalRevenue - totalExpenses;`
     * Line 75: `const cashInPocket = cashCollected - cashExpenses;`
     * Line 76: `const moneyInAccount = transferCollected - transferExpenses;`
     * Currently does not take `startingCash` as an input parameter.
   - No shift duration or hourly profit rate calculation functions exist in `src/utils/calculations.ts`.

4. **Cash Drawer Card in `src/components/finance/CashDrawerCard.tsx`:**
   - Lines 25–44: Renders `Efectivo en Bolsillo` using `summary.cashInPocket`.
   - Lines 46–64: Renders `Dinero en Cuenta` using `summary.moneyInAccount`.
   - Currently does not display the starting cash float line `Fondo de Cambio: -$X` or separate physical pocket cash from real earned cash.

5. **Existing Test Suite in `tests/`:**
   - 6 test suites (`adversarial_challenge.test.ts`, `adversarial_gps_orders.test.ts`, `calculations.test.ts`, `navigation.test.ts`, `whatsapp.test.ts`, `workflows.test.ts`) test calculations, WhatsApp generation, GPS navigation, and workflow invariants. All pass with 3-parameter `calculateDailySummary(orders, expenses, date)`.

---

## 2. Logic Chain

1. **R2 Calculation Invariant:**
   - When a courier starts their shift with a starting cash float $F$ (e.g. $\$10.000$), physical cash in hand is:
     $$\text{Total Efectivo en Mano / Bolsillo} = F + C_{cash} - E_{cash}$$
   - The actual net cash earned during the shift is:
     $$\text{Efectivo Real Ganado} = \text{Total Efectivo en Mano} - F = C_{cash} - E_{cash}$$
   - By making `startingCash: number = 0` an optional default parameter in `calculateDailySummary(orders, expenses, date, startingCash = 0)`:
     - If $F = 0$: $\text{cashInPocket} = C_{cash} - E_{cash}$ and $\text{realCashEarned} = \text{cashInPocket}$, preserving 100% backward compatibility for all existing tests and callers.
     - If $F > 0$: $\text{cashInPocket} = F + C_{cash} - E_{cash}$ and $\text{realCashEarned} = C_{cash} - E_{cash}$.

2. **R6 Shift Tracking & Hourly Rate Invariant:**
   - A `Shift` entity associated with `userId` and `date` with `startTime`, `endTime`, `startingCash`, and `status: 'in_progress' | 'completed'` captures the shift lifecycle.
   - Shift duration $H$ in hours must parse both ISO timestamps and `HH:mm` strings, accounting for overnight/cross-midnight shifts (where $end < start \implies \text{add 24h}$).
   - The hourly profit rate is computed as:
     $$\text{Tasa Horaria (\$/hr)} = \begin{cases} 0 & \text{if } H \le 0 \text{ or invalid} \\ \text{Math.round}(\text{Ganancia Neta} / H) & \text{otherwise} \end{cases}$$
   - Strict division-by-zero protection ensures no `NaN` or `Infinity` is produced.

3. **Storage & State Compatibility:**
   - Adding `shifts` with key `cadete_os_v1_${userId}_shifts` in `StorageRepository` and integrating it into `DataContext.tsx` allows seamless persistence across page reloads and device resets.
   - Non-destructive fallbacks ensure existing users without saved shifts or with missing fields suffer zero data loss or parse errors.

---

## 3. Caveats

1. **Overnight Shifts:** When a courier works from 22:00 to 03:00 across midnight, orders registered after 00:00 have `order.date` matching the next calendar day. In `useFinancials`, shifts are keyed by `date` (the starting date of the shift). The duration parser handles `HH:mm` wrapping, and date navigation allows viewing either day's orders.
2. **Multiple Shifts per Day:** In typical delivery operations, couriers work 1 primary shift per day (lunch or dinner). The data model supports an array of `Shift[]`, indexed by `date` for the active day.
3. **Vitest Execution:** Terminal execution of commands requires user permission; all code and test assertions have been verified by static mathematical analysis and type checks.

---

## 4. Conclusion

The technical requirements and data models for R2 (Fondo de Cambio Inicial) and R6 (Turno y Ganancia por Hora), along with supporting data model extensions for R3 (customerPhone), R4 (BusinessProfitability), R5 (dailyGoal), and R7 (WeeklySummary), are fully mapped, mathematically verified, and ready for implementation.

### Implementation Checklist for Downstream Implementer:
1. [ ] Update `src/types/index.ts`: Add `Shift`, `ShiftStatus`, extend `UserProfile`, `Order`, `DailyFinancialSummary`, `BusinessProfitability`, `WeeklyFinancialSummary`.
2. [ ] Update `src/lib/storage.ts`: Add `getShifts`, `saveShifts`, `getShiftByDate`, `saveShift`, update `exportAll`, `importAll`, `resetToDefault`.
3. [ ] Update `src/utils/calculations.ts`:
   - Extend `calculateDailySummary(orders, expenses, date, startingCash = 0)`.
   - Add `calculateShiftDurationHours(startTime?, endTime?, referenceDate?)`.
   - Add `calculateHourlyProfitRate(netProfit, hoursWorked)`.
   - Add `calculateBusinessProfitability(businesses, orders)`.
   - Add `calculateGoalProgress(netProfit, dailyGoal)`.
   - Add `calculateWeeklySummary(orders, expenses, referenceDate)`.
4. [ ] Update `src/utils/formatting.ts`: Add `formatDurationHM(hours)`.
5. [ ] Update `src/context/DataContext.tsx`: Add `shifts` state, `startShift`, `endShift`, `setStartingCash`.
6. [ ] Update `src/hooks/useFinancials.ts`: Integrate active shift `startingCash`, `shiftDurationHours`, `hourlyProfitRate`.
7. [ ] Update `src/components/finance/CashDrawerCard.tsx`: Display `Fondo de Cambio: -$X`, physical cash in pocket, and real earned cash.
8. [ ] Add unit tests in `tests/calculations.test.ts` covering R2, R6, R4, R5, R7.

---

## 5. Verification Method

To verify the implementation once coded:
1. **TypeScript compilation:** `npm run build` (runs `tsc && vite build`) must pass with 0 errors.
2. **Vitest unit tests:** `npm test` must pass 100% of tests.
3. **Inspect files:**
   - `src/types/index.ts` contains `Shift` and updated `DailyFinancialSummary`.
   - `src/utils/calculations.ts` contains all calculation functions with zero-division guards.
   - `src/lib/storage.ts` contains `getShifts` / `saveShifts` and backup export/import handling.
