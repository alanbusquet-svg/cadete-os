# E2E Test Infra: Cadete OS

## Test Philosophy
- Opaque-box, requirement-driven, offline-first resilient testing.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Feature Interactions + Real-World Workload Testing.

## Feature Inventory & Test Coverage Goals
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|---------------------|:-----------------:|:-----------------:|:-----------------:|:-------------------:|
| 1 | Firebase Auth & Google Login | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 2 | Email / Password Sign In & Sign Up | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 3 | 7-Day Trial Calculation & Expiration | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 4 | Demo Mode & Local Fallback | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 5 | Firestore Cloud Sync & Collections | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ | ✓ |
| 6 | Batch Order Settlement Sync | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ | ✓ |
| 7 | GPS Navigation Universal Deep Links | ORIGINAL_REQUEST §3 | ≥5 | ≥5 | ✓ | ✓ |
| 8 | Cash Drawer & Shift Arqueo | ORIGINAL_REQUEST §5 | ≥5 | ≥5 | ✓ | ✓ |
| 9 | Oil Virtual Odometer | ORIGINAL_REQUEST §5 | ≥5 | ≥5 | ✓ | ✓ |
| 10 | PWA Manifest & Service Worker Cache | ORIGINAL_REQUEST §R3 | ≥5 | ≥5 | ✓ | ✓ |

## Test Architecture
- Framework: Vitest (`npm run test`)
- Polyfills: `tests/setup.ts` (localStorage, crypto, mock fetch/indexedDB if needed)
- Mocks: Modular Firebase Auth mock, Firestore mock with collection event emitter.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | New courier onboards with Google, receives 7-day trial, registers shift, takes 15 orders | Auth, Trial, Shift, Orders, GPS | High |
| 2 | Courier operates in Demo mode offline with 0 network, registers orders, calculates cash drawer | Demo Mode, LocalStorage, Finance, Odometer | High |
| 3 | Business debt batch settlement on weekend with WhatsApp summary dispatch | Business, Orders, Batch Settle, WhatsApp | Medium |
| 4 | Moto oil change threshold reached, alert triggered, maintenance expense logged, counter reset | Maintenance, Odometer, Expenses, Finance | Medium |
| 5 | Multi-tenant isolation: User A data never leaks to User B on same device | Multi-tenant, Storage, Firestore | High |
