# Dispatch Log

## 2026-08-26T23:41:27-03:00
Implement, test, and integrate the 7 new features into the existing React + Vite + TypeScript + Tailwind CSS application:
1. R1. Responsive differentiation (Mobile <768px vs Desktop >=768px full screen with sidebar navigation and multi-column rich layout).
2. R2. Fondo de cambio inicial (Caja de inicio de turno) and net cash calculation.
3. R3. WhatsApp "Estoy afuera" 1-touch message with client phone cleaning.
4. R4. Profitability metrics per business (trips, revenue, avg profit/trip, sorted).
5. R5. Daily profit goal with progress bar and color change on target hit.
6. R6. Shift start/end time tracking + hourly profit rate ($/hr) calculation.
7. R7. Date navigation from dashboard + weekly summary view across orders and expenses.

Key Constraints & Acceptance Criteria:
- TypeScript strict mode compliance: `npm run build` must exit 0 with 0 errors.
- Vitest unit tests: All 53 existing tests must pass + add comprehensive unit tests for R2, R4, R5, R6, R7 calculations (`npm run test` exits 0).
- UX Rules: Zero AI generic phrases, direct operative copy, touch targets >= 52px, inputMode="decimal" on numeric amounts.
- Persistence: StorageRepository LocalStorage updates with backwards compatibility.
