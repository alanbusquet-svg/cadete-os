## 2026-08-27T02:46:16Z
You are Worker M1 for Cadete OS.
Your working directory is: d:/SaaS de delivery/SaaS/.agents/worker_m1/
You must read the authoritative user request at: d:/SaaS de delivery/SaaS/ORIGINAL_REQUEST.md
You must read the project specification at: d:/SaaS de delivery/SaaS/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement Milestone 1 (M1) — Data Models, Storage Repository, Domain Calculations & Context:
1. `src/types/index.ts`:
   - Define `Shift` (`id, userId, date, startTime?, endTime?, startingCash?, status: 'in_progress' | 'completed', createdAt`), `ShiftStatus`.
   - Extend `UserProfile.settings` with optional `dailyGoal?: number`.
   - Extend `Order` with optional `customerPhone?: string`.
   - Extend `DailyFinancialSummary` with `startingCash?: number`, `realCashEarned?: number`, `shiftDurationHours?: number`, `hourlyProfitRate?: number`.
   - Define `BusinessProfitability` (`businessId, businessName, totalOrders, totalRevenue, averageProfitPerTrip`).
   - Define `GoalProgress` (`targetGoal, currentNetProfit, percentage, isReached, remainingAmount`).
   - Define `DayFinancialSummary` and `WeeklyFinancialSummary` (`startDate, endDate, totalOrders, totalRevenue, totalExpenses, netProfit, averageDailyNetProfit, days`).

2. `src/lib/storage.ts`:
   - Implement `getShifts(userId)`, `saveShifts(userId, shifts)`, `getShiftByDate(userId, date)`, `saveShift(userId, shift)`.
   - Update `exportAll(userId)` and `importAll(userId, jsonString)` to safely include `shifts`.
   - Ensure complete backward compatibility and null safety.

3. `src/utils/calculations.ts`:
   - Update `calculateDailySummary(orders, expenses, date, startingCash: number = 0)` ensuring backward compatibility for callers with 3 parameters. Compute `cashInPocket = startingCash + cashCollected - cashExpenses` and `realCashEarned = cashCollected - cashExpenses`.
   - Implement `calculateShiftDurationHours(startTime?: string, endTime?: string, referenceDate?: string): number` with cross-midnight handling and 0 duration fallback.
   - Implement `calculateHourlyProfitRate(netProfit: number, hoursWorked: number): number` with division-by-zero protection.
   - Implement `calculateBusinessProfitability(businesses: Business[], orders: Order[]): BusinessProfitability[]` sorted descending by `averageProfitPerTrip`.
   - Implement `calculateGoalProgress(netProfit: number, dailyGoal?: number): GoalProgress`.
   - Implement `calculateWeeklySummary(orders: Order[], expenses: Expense[], referenceDate: string): WeeklyFinancialSummary` for the 7-day window $[d-6, d]$.

4. `src/utils/formatting.ts` and `src/utils/whatsapp.ts`:
   - Add `formatDurationHM(hours: number): string`.
   - Add `buildCustomerWhatsAppUrl(phone: string, message?: string): string` with robust Argentine phone sanitization (+54, 9, 15, spaces, dashes).

5. `src/context/DataContext.tsx` & `src/hooks/useFinancials.ts`:
   - Manage `shifts` collection and provide helper functions (`startShift`, `endShift`, `setStartingCash`, `getShiftForDate`).
   - Update `useFinancials` to pass `startingCash` and compute hourly profit and goal progress.

6. Verification:
   - Run `npm test` to verify all 53 existing tests pass.
   - Run `npm run build` to verify TypeScript strict mode passes with 0 errors.

Document all changes and test outputs in `d:/SaaS de delivery/SaaS/.agents/worker_m1/handoff.md`.
Send a message to parent when finished.
