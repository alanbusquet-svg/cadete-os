# E2E Test Infra: Cadete OS Mobile Navigation & Modal Ergonomics

## Test Philosophy
- Opaque-box, requirement-driven, and ergonomic-contract verification.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Interaction + Real-World Delivery Scenarios.
- Validates real-world motorcycle delivery ergonomics: left-handed operation, glove touch target compliance ($\ge 52\text{px}$ buttons, $\ge 44\text{px}$ header controls), hardware/gesture back-button trapping, and fail-safe scroll unlocking.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Scroll Lock Reference Counting | ORIGINAL_REQUEST § R4 | 5 | 5 | ✓ |
| 2 | Reusable Modal Back Hook | ORIGINAL_REQUEST § R1, R4 | 5 | 5 | ✓ |
| 3 | History & PopState Trapping | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ |
| 4 | Header Left Back Button ($\ge 44\text{px}$) | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 5 | Header Drag Indicator Quick Dismiss | ORIGINAL_REQUEST § R2 | 5 | 5 | ✓ |
| 6 | Form Modals Stacked Cancel ($\ge 52\text{px}$) | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ |
| 7 | Form Cancellation State Reset | ORIGINAL_REQUEST § R3 | 5 | 5 | ✓ |
| 8 | Escape Key & Backdrop Dismissal | ORIGINAL_REQUEST § R4 | 5 | 5 | ✓ |
| 9 | App Secondary Tab Back Navigation | ORIGINAL_REQUEST § R1 | 5 | 5 | ✓ |

## Test Architecture
- **Runner**: Vitest v1.6.0 running in Node environment (`npx vitest run`).
- **Setup Mocking**: `tests/setup.ts` polyfills `window.history`, `PopStateEvent`, and `window.dispatchEvent`.
- **Test Suites**:
  - `tests/modal_navigation.test.ts`: Covers R1, R2, R4 (Modal, ConfirmDialog, OrderMapModal, App tab history, scroll locking).
  - `tests/form_modals_ergonomics.test.ts`: Covers R3 (OrderFormModal, ExpenseFormModal, BusinessFormModal, MaintenanceFormModal, BusinessDebtModal).
  - Existing 446 tests in `tests/*.test.ts`: Full regression test coverage.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Motorcyclist opens New Order, starts typing, realizes customer called to cancel, taps bottom Cancel with left thumb | OrderFormModal, 52px stacked Cancel, form dirty reset | Low |
| 2 | Motorcyclist opens Order Map, gets incoming phone call, presses Android hardware back button to return to app | OrderMapModal, popstate trapping, Leaflet cleanup | Medium |
| 3 | User switches to Gastos tab, records an expense, presses back button on phone expecting to return to Viajes tab | Tab history pushState/popstate, App.tsx activeTab | Medium |
| 4 | User opens Order List, triggers ConfirmDialog to delete order, presses phone back button to dismiss dialog | ConfirmDialog, popstate trapping, nested scroll lock retention | High |
| 5 | Rapid modal toggling (open -> escape -> open -> backdrop click -> open -> cancel) | Scroll lock reference count, body overflow = '', history cleanup | High |

## Coverage Thresholds
- Tier 1: $\ge 5$ test cases per feature (happy path / core behavior).
- Tier 2: $\ge 5$ test cases per feature (boundaries: rapid open/close, null state, unmount, escape).
- Tier 3: Pairwise combinations (stacked modals, tab switch during open modal, backdrop while popstate).
- Tier 4: $\ge 5$ realistic delivery rider application scenarios.
