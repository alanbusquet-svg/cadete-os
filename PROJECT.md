# Project: Cadete OS — Mobile Back Navigation & Modal Ergonomics (R1 - R4)

## Architecture
Cadete OS is a high-performance, mobile-first PWA for motorcycle delivery drivers. The architecture coordinates touch interactions, hardware navigation, overlay ergonomics, and state lifecycles.

```
┌─────────────────────────────────────────────────────────────┐
│                          App.tsx                            │
│  - ActiveTab state ('orders' primary, 5 secondary tabs)     │
│  - Tab History Synchronization (pushState / popstate)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│  src/utils/scrollLock.ts    │ │ src/hooks/useModalBack...ts │
│  - Reference-counted body   │ │ - history.pushState on open │
│    scroll locking           │ │ - popstate event listener   │
│  - Guaranteed reset         │ │ - Escape key listener       │
│                             │ │ - Clean history pop on exit │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
 ┌─────────────┴───────────────────────────────┴─────────────┐
 │                      Modal Primitives                     │
 │  - Modal.tsx (Header Left Back >=44px, Drag Handle tap)   │
 │  - ConfirmDialog.tsx (Close >=44px, Drag Handle tap)      │
 │  - OrderMapModal.tsx (Header Left Back >=44px)            │
 └─────────────────────────────┬─────────────────────────────┘
                               │
 ┌─────────────────────────────▼─────────────────────────────┐
 │                        Form Modals                        │
 │  - OrderFormModal.tsx (Stacked 52px+ Cancel button)       │
 │  - ExpenseFormModal.tsx (Stacked 52px+ Cancel button)     │
 │  - BusinessFormModal.tsx (Stacked 52px+ Cancel button)    │
 │  - MaintenanceFormModal.tsx (Stacked 52px+ Cancel button) │
 │  - BusinessDebtModal.tsx (Stacked 52px+ Volver button)    │
 └───────────────────────────────────────────────────────────┘
```

## Feature Inventory
Every feature from the Survey phase appears here with its assigned milestone:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Reference-Counted Scroll Lock | Manage `document.body.style.overflow` with lock count so nested modals never prematurely unlock body scroll | M1 | Survey / R4 |
| 2 | Reusable Modal Back Hook | `useModalBackHandler` hook encapsulating `pushState`, `popstate`, `Escape`, and `scrollLock` | M1 | Survey / R1, R4 |
| 3 | Test Environment History Mock | Update `tests/setup.ts` to polyfill `window.history` and `PopStateEvent` for Vitest | M1 | Survey / Test Infra |
| 4 | Modal Header Left Back Button | Prominent $\ge 44\text{px}$ back button (`ArrowLeft`) in top-left corner of `Modal.tsx` for left thumb reach | M1 | Survey / R2 |
| 5 | Modal Header Right Close Parity | Maintain $\ge 44\text{px}$ close button (`X`) in top-right corner of `Modal.tsx` | M1 | Survey / R2 |
| 6 | Modal Drag Handle Tap-to-Dismiss | Wrap drag indicator in clickable touch area calling `onClose()` on tap | M1 | Survey / R2 |
| 7 | Modal Popstate & Escape Integration | Wire `useModalBackHandler` into `Modal.tsx` for hardware back and Escape key | M1 | Survey / R1, R4 |
| 8 | ConfirmDialog History & Touch Targets | Wire `useModalBackHandler` and $\ge 44\text{px}$ close target into `ConfirmDialog.tsx` | M1 | Survey / R1, R2, R4 |
| 9 | OrderMapModal Left Back & Popstate | Wire `useModalBackHandler`, top-left back button, and tap drag handle into `OrderMapModal.tsx` | M1 | Survey / R1, R2, R4 |
| 10 | OrderFormModal Stacked Cancel Button | Full-width $\ge 52\text{px}$ Cancel button stacked below Guardar Viaje with clean form reset | M2 | Survey / R3 |
| 11 | ExpenseFormModal Stacked Cancel Button | Full-width $\ge 52\text{px}$ Cancel button stacked below Guardar Gasto with clean form reset | M2 | Survey / R3 |
| 12 | BusinessFormModal Stacked Cancel Button | Full-width $\ge 52\text{px}$ Cancel button stacked below Guardar Cambios with clean form reset | M2 | Survey / R3 |
| 13 | MaintenanceFormModal Stacked Cancel Button | Full-width $\ge 52\text{px}$ Cancel button stacked below Guardar en Historial with clean form reset | M2 | Survey / R3 |
| 14 | BusinessDebtModal Stacked Volver Button | Full-width $\ge 52\text{px}$ Volver button stacked below Liquidar Deuda en Lote | M2 | Survey / R3 |
| 15 | App Tab History Synchronization | Secondary tab transitions record history; hardware back returns to `'orders'` tab before exiting | M3 | Survey / R1 |
| 16 | Comprehensive E2E & Unit Test Suite | 100% pass on 446 existing tests + new navigation, popstate, touch target, and form ergonomics tests | M4 | Acceptance Criteria |
| 17 | Zero-Error Production Build | `npm run build` succeeds with exit code 0 | M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| 1 | M1: Modal Core Infrastructure, Primitives & Ergonomics | `scrollLock.ts`, `useModalBackHandler.ts`, `tests/setup.ts`, `Modal.tsx`, `ConfirmDialog.tsx`, `OrderMapModal.tsx` | none | DONE |
| 2 | M2: Form Modals Bottom Cancel Ergonomics | `OrderFormModal.tsx`, `ExpenseFormModal.tsx`, `BusinessFormModal.tsx`, `MaintenanceFormModal.tsx`, `BusinessDebtModal.tsx` | M1 | DONE |
| 3 | M3: App Tab History Synchronization | `src/App.tsx` | M1 | DONE |
| 4 | M4: Comprehensive Verification, Adversarial Hardening & Build | Test suites (`tests/modal_navigation.test.ts`, `tests/form_modals_ergonomics.test.ts`, `tests/tab_navigation.test.ts`), full test pass, adversarial audit, `npm run build` code 0 | M1, M2, M3 | DONE |

## Interface Contracts

### 1. `src/utils/scrollLock.ts`
```typescript
export function lockBodyScroll(): void;
export function unlockBodyScroll(): void;
export function forceUnlockBodyScroll(): void;
```
- Maintains internal counter `let lockCount = 0`.
- When `lockCount === 1`, sets `document.body.style.overflow = 'hidden'`.
- When `lockCount === 0`, sets `document.body.style.overflow = ''`.
- `forceUnlockBodyScroll` resets `lockCount = 0` and unlocks overflow (fail-safe).

### 2. `src/hooks/useModalBackHandler.ts`
```typescript
export interface UseModalBackHandlerOptions {
  isOpen: boolean;
  onClose: () => void;
  modalId?: string;
  enableHistory?: boolean;  // default: true
  enableEscape?: boolean;   // default: true
  enableScrollLock?: boolean; // default: true
}

export function useModalBackHandler(options: UseModalBackHandlerOptions): {
  handleProgrammaticClose: () => void;
};
```
- On `isOpen = true`:
  - Registers entry: `window.history.pushState({ modalId }, '')`.
  - Increments scroll lock.
  - Listens to `popstate`: if back event popped the modal entry, invokes `onClose()`.
  - Listens to `keydown` for `Escape`: invokes `handleProgrammaticClose()`.
- On `handleProgrammaticClose`:
  - Pops history: `window.history.back()`.
  - Invokes `onClose()`.
  - Flags transition to prevent duplicate `onClose` calls on incoming `popstate`.
- On unmount:
  - Cleans up event listeners.
  - Decrements scroll lock.

### 3. Form Modals Cancel Handlers
All form modals must implement:
- `handleCancel: () => void`: Resets local dirty input states, collapses extra options, clears error banners, and invokes `onClose()`.
- Cancel Button: `type="button"`, `variant="secondary"`, `size="lg"`, `fullWidth` / `w-full`, stacked directly below submit button.

## Code Layout
- `src/utils/scrollLock.ts`: New utility for reference-counted scroll locking.
- `src/hooks/useModalBackHandler.ts`: New React hook for history and escape handling.
- `src/components/common/Modal.tsx`: Enhanced modal primitive with left back button, drag handle tap, and back hook.
- `src/components/common/ConfirmDialog.tsx`: Enhanced confirmation dialog with 44px close button and back hook.
- `src/components/map/OrderMapModal.tsx`: Enhanced map sheet with left back button and back hook.
- `src/components/orders/OrderFormModal.tsx`: Added stacked Cancel button & clean reset.
- `src/components/finance/ExpenseFormModal.tsx`: Added stacked Cancel button & clean reset.
- `src/components/businesses/BusinessFormModal.tsx`: Added stacked Cancel button & clean reset.
- `src/components/maintenance/MaintenanceFormModal.tsx`: Added stacked Cancel button & clean reset.
- `src/components/businesses/BusinessDebtModal.tsx`: Added stacked Volver button.
- `src/App.tsx`: Tab navigation history sync (`orders` $\leftrightarrow$ secondary tabs).
- `tests/setup.ts`: Polyfill for `window.history` and `PopStateEvent`.
- `tests/modal_navigation.test.ts`: Test suite for M1, M2, M4.
- `tests/form_modals_ergonomics.test.ts`: Test suite for M3.
