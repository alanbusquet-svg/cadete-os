# E2E Test Infra: Cadete OS

## Test Philosophy
- Opaque-box, requirement-driven, zero external dependencies required for testing.
- Methodology: Category-Partition + Boundary Value Analysis + Real-World Workload Testing.
- Framework: Vitest running unit tests, calculation property tests, and full workflow integration tests.

## Feature Inventory Test Coverage Matrix
| # | Feature | Source | Tier 1 (Unit/Feature) | Tier 2 (Boundary/Edge) | Tier 3 (Cross-Feature) | Tier 4 (Workflows) |
|---|---------|--------|:---------------------:|:----------------------:|:----------------------:|:------------------:|
| F01 | PWA & Offline Storage | GEMINI §2 | >=5 | >=5 | ✓ | ✓ |
| F02 | Dark Mode Styling | GEMINI §6 | >=5 | >=5 | ✓ | ✓ |
| F03 | Ergonomic Touch Targets | GEMINI §6 | >=5 | >=5 | ✓ | ✓ |
| F04 | Direct Operational Copy | GEMINI §6 | >=5 | >=5 | ✓ | ✓ |
| F05 | Multi-Tenant Data Scoping | GEMINI §4, §7 | >=5 | >=5 | ✓ | ✓ |
| F07 | 3-Second Fast Order Entry | GEMINI §1, §4 | >=5 | >=5 | ✓ | ✓ |
| F08 | Zone Price Pre-filling | GEMINI §4 | >=5 | >=5 | ✓ | ✓ |
| F09 | 1-Tap Google Maps GPS Link | GEMINI §3 | >=5 | >=5 | ✓ | ✓ |
| F10 | 1-Tap Waze GPS Link | GEMINI §3 | >=5 | >=5 | ✓ | ✓ |
| F12 | Daily Gross Revenue Counter | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F13 | Operational Expense Logger | GEMINI §4 | >=5 | >=5 | ✓ | ✓ |
| F14 | Daily Net Profit Calculation | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F15 | Pocket Cash vs Account Split | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F16 | Business Registry & Pricing | GEMINI §4 | >=5 | >=5 | ✓ | ✓ |
| F17 | Accounts Receivable Tracker | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F18 | 1-Tap Batch Debt Settlement | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F19 | WhatsApp Settlement Export | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F20 | Virtual Oil Odometer Counter | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F21 | 3-State Traffic Light Alert | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F22 | Oil Change Reset Action | GEMINI §5 | >=5 | >=5 | ✓ | ✓ |
| F23 | General Maintenance Log | GEMINI §4 | >=5 | >=5 | ✓ | ✓ |

## Test Architecture
- Test runner: `vitest run`
- Test files located in `tests/`
- Calculation invariant tests verifying mathematical truth across all combinations of payments, settlements, and dates.
