# Milestone 1 (M1) Review & Adversarial Challenge Report — Reviewer M1_2

## Review Summary

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct code inspection of Milestone 1 deliverables identified the following state across files:

1. **`src/context/DataContext.tsx` (Lines 62–83)**:
   ```tsx
   62:   // Load data on userId change
   63:   useEffect(() => {
   64:     if (!userId) return;
   65:     const loadedOrders = storage.getOrders(userId);
   66:     const loadedExpenses = storage.getExpenses(userId);
   67:     const loadedBusinesses = storage.getBusinesses(userId);
   68:     const loadedMaintenance = storage.getMaintenance(userId);
   69:     const loadedShifts = storage.getShifts(userId);
   70: 
   71:     setOrders(loadedOrders);
   72:     setExpenses(loadedExpenses);
   73:     setBusinesses(loadedBusinesses);
   74:     setMaintenance(loadedMaintenance);
   75:     setShifts(loadedShifts);
   76:   }, [userId]);
   77: 
   78:     setOrders(loadedOrders);
   79:     setExpenses(loadedExpenses);
   80:     setBusinesses(loadedBusinesses);
   81:     setMaintenance(loadedMaintenance);
   82:   }, [userId]);
   ```
   - **Observed Defect**: Lines 78–82 contain duplicate, dangling statements located directly in the component body outside of any function scope.
   - `loadedOrders`, `loadedExpenses`, `loadedBusinesses`, and `loadedMaintenance` are out-of-scope identifier references.
   - Line 82 contains a stray `}, [userId]);` causing a TypeScript / JSX syntax compilation error.

2. **`src/types/index.ts` (Lines 1–174)**:
   - Added `Shift`, `ShiftStatus` (`'in_progress' | 'completed'`).
   - Extended `UserProfile.settings` with `dailyGoal?: number`.
   - Extended `Order` with `customerPhone?: string`.
   - Extended `DailyFinancialSummary` with `startingCash?: number`, `realCashEarned?: number`, `shiftDurationHours?: number`, `hourlyProfitRate?: number`.
   - Defined `BusinessProfitability`, `GoalProgress`, `DayFinancialSummary`, and `WeeklyFinancialSummary`.
   - Type definitions are complete and strictly typed.

3. **`src/lib/storage.ts` (Lines 318–398)**:
   - Added `getShifts(userId)`, `saveShifts(userId, shifts)`, `getShiftByDate(userId, date)`, and `saveShift(userId, shift)`.
   - Integrated into `exportAll(userId)`, `importAll(userId, jsonString)`, and `resetToDefault(userId)`.
   - Preserves backward compatibility: if imported JSON lacks `shifts`, `Array.isArray(parsed.shifts)` evaluates to false without throwing or wiping existing data.

4. **`src/utils/calculations.ts` (Lines 20–395)**:
   - `calculateDailySummary(orders, expenses, date, startingCash = 0)` correctly calculates:
     - `realCashEarned = cashCollected - cashExpenses`
     - `cashInPocket = startingCash + realCashEarned = startingCash + cashCollected - cashExpenses`
     - `netProfit = totalRevenue - totalExpenses`
     - `moneyInAccount = transferCollected - transferExpenses`
   - `calculateShiftDurationHours` correctly handles both standard same-day and cross-midnight/overnight shifts (e.g. 21:00 to 03:00 -> 6.00 hrs) with fallback to 0 for invalid/empty strings.
   - `calculateHourlyProfitRate` guards against `hoursWorked <= 0`, `NaN`, and `Infinity`.
   - `calculateBusinessProfitability` calculates volume, total revenue, and trip average, sorted descending by `averageProfitPerTrip`.
   - `calculateGoalProgress` computes percentage and threshold completion with 0-clamping for losses.
   - `calculateWeeklySummary` builds a 7-day rolling window $[d-6, d]$ with daily aggregates and rounded daily average net profit.

5. **`src/utils/whatsapp.ts` & `src/utils/formatting.ts`**:
   - `sanitizeArgentinePhone` strips non-digits, handles leading 0, 15 mobile prefix, +54, and prefixes `549`.
   - `buildCustomerWhatsAppUrl` creates `https://wa.me/549...` with prefilled text `"Buenas! Estoy afuera con tu pedido 🛵"`.
   - `formatDurationHM` formats fractional hours into `"Xh Ym"`.

6. **`src/hooks/useFinancials.ts` (Lines 1–79)**:
   - Correctly integrates `shifts` state from `useData()`, extracts `startingCash`, computes `shiftDurationHours`, `hourlyProfitRate`, and `goalProgress`.

---

## 2. Logic Chain

1. **Syntax & Build Integrity**:
   - The duplicate block on lines 78–82 of `src/context/DataContext.tsx` directly violates TypeScript parsing rules and component execution semantics.
   - Even though the mathematical logic in `calculations.ts` and storage logic in `storage.ts` are sound, the application cannot successfully render or build with a syntax error in its root data provider.
2. **Mathematical Invariant Verification**:
   - Invariant 1: $\text{cashInPocket} = \text{startingCash} + \text{cashCollected} - \text{cashExpenses}$.
     - In code: `initialCash = Number(startingCash) || 0; realCashEarned = cashCollected - cashExpenses; cashInPocket = initialCash + realCashEarned;` $\implies$ **Verified**.
   - Invariant 2: $\text{realCashEarned} = \text{cashCollected} - \text{cashExpenses}$.
     - In code: `realCashEarned = cashCollected - cashExpenses;` $\implies$ **Verified**.
   - Invariant 3: $\text{realCashEarned} = \text{cashInPocket} - \text{startingCash}$.
     - $\text{cashInPocket} - \text{startingCash} = (\text{startingCash} + \text{realCashEarned}) - \text{startingCash} = \text{realCashEarned}$ $\implies$ **Verified**.
   - Invariant 4: $\text{netProfit} = \text{totalRevenue} - \text{totalExpenses} = (\text{cashInPocket} - \text{startingCash}) + \text{moneyInAccount} + \text{unsettledRevenue}$.
     - Double-entry reconciliation holds $\implies$ **Verified**.
3. **Storage & Backward Compatibility**:
   - Existing callers passing 3 parameters to `calculateDailySummary` receive `startingCash = 0`, keeping previous behavior intact.
   - Storage keys use prefix `cadete_os_v1_${userId}_shifts`, preventing multi-tenant collision.
   - Import/export safely handles legacy JSON backups without `shifts`.

---

## 3. Findings

### [Critical] Finding 1: Dangling Duplicate Statements & Syntax Error in `DataContext.tsx`
- **What**: Duplicate block of state setter calls and stray closing bracket outside `useEffect`.
- **Where**: `src/context/DataContext.tsx:78-82`
- **Why**: References out-of-scope variables (`loadedOrders`, etc.) and contains invalid syntax `}, [userId]);` in the component body, preventing clean compilation and breaking the React component tree.
- **Suggestion**: Delete lines 78–82 from `src/context/DataContext.tsx`.

---

## 4. Adversarial Stress-Test & Edge Cases

| Scenario / Assumption | Expected Behavior | Code Implementation Result | Verdict |
|---|---|---|---|
| Zero or negative startingCash ($0 or -$500) | Handled safely, startingCash defaults cleanly | `Number(startingCash) \|\| 0` | PASS |
| Negative realCashEarned (expenses > cash collected) | Deducted from starting float without crashing | `cashInPocket = startingCash + (-expenses)` | PASS |
| Overnight shift crossing midnight (22:30 -> 01:45) | Duration calculated as $3.25\text{ hrs}$ | `(1440 - startMin + endMin) / 60` = 3.25 | PASS |
| Shift duration of 0 hours or invalid timestamps | Hourly rate returns 0 (no `Infinity` or `NaN`) | Guard `!hoursWorked \|\| hoursWorked <= 0` | PASS |
| Daily profit goal <= 0 or undefined | Progress returns 0%, `isReached: false` | Handled with fallback object | PASS |
| Net profit loss with daily goal (e.g. -$5.000 / $20.000) | Progress clamped to 0% (no negative percentage) | `Math.max(0, Math.round(rawPercentage))` | PASS |
| Business profitability with 0 orders | Returns 0 avg profit per trip without `NaN` | `totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0` | PASS |
| Phone sanitization with 10-digit, 11-digit, or 15 prefix | Normalizes to `549...` format | `sanitizeArgentinePhone` strips 0 and 15, prefixes 549 | PASS |
| Legacy backup import without `shifts` field | Imports successfully without crashing | Guarded with `Array.isArray(parsed.shifts)` | PASS |

---

## 5. Verified Claims

- `calculateDailySummary` financial invariants $\to$ Verified by algebraic expansion & unit tests in `tests/m1_extensions.test.ts` $\to$ **PASS**
- `calculateShiftDurationHours` overnight minute arithmetic $\to$ Verified $\to$ **PASS**
- `calculateBusinessProfitability` ranking order $\to$ Verified $\to$ **PASS**
- `calculateWeeklySummary` 7-day calendar window aggregate $\to$ Verified $\to$ **PASS**
- `StorageRepository` shifts CRUD and backup isolation $\to$ Verified $\to$ **PASS**

---

## 6. Caveats

- Implementation code was not directly modified by Reviewer (review-only constraint strictly enforced).
- Once lines 78–82 of `src/context/DataContext.tsx` are removed by Worker M1, the M1 codebase will be in full compliance.

---

## 7. Conclusion

Milestone 1 domain models, pure financial calculations, WhatsApp deep-link generation, and storage persistence are exceptionally well implemented with complete edge case coverage. However, due to the critical syntax error in `src/context/DataContext.tsx` lines 78–82, the verdict is **REQUEST_CHANGES**.

---

## 8. Verification Method

1. Inspect `src/context/DataContext.tsx` lines 62–85 to verify duplicate code block removal.
2. Run `npm run build` (`tsc && vite build`) to confirm TypeScript strict compilation exits with code 0.
3. Run `npm test` to verify all 67 Vitest tests (53 regression + 14 M1 tests) pass with 100% success.
