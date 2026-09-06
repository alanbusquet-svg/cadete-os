# E2E Test Infra: Cadete OS Map & Voice Sprint

## Test Philosophy
- Requirement-driven, opaque-box and unit/integration verification.
- Zero test regressions on existing 531 tests in 31 suites.
- Strict testing of all new capabilities: geocoding coverage, OSRM routing & fallback, auto speech, card speech button, in-app modal trigger.

## Feature Inventory
| # | Feature | Source | Tests |
|---|---------|--------|-------|
| 1 | Geocoding >= 60 Bolivar anchors | ORIGINAL_REQUEST §R2 | `tests/geolocation_routing.test.ts` |
| 2 | OSRM routing & fallback | ORIGINAL_REQUEST §R5 | `tests/routing.test.ts` |
| 3 | Auto speech in OrderMapModal | ORIGINAL_REQUEST §R3 | `tests/speech.test.ts` / `tests/map_integration.test.ts` |
| 4 | Speech button on OrderCard | ORIGINAL_REQUEST §R4 | `tests/adversarial_speech_ergonomics.test.ts` / new tests |
| 5 | In-app map navigation (no external redirect) | ORIGINAL_REQUEST §R1 | `tests/map_integration.test.ts` |
| 6 | Touch target ergonomics (>= 52px primary, >= 44px speech) | ORIGINAL_REQUEST Acceptance Criteria | UI token / regression tests |

## Verification Commands
- Vitest suite: `npm run test` (or `npx vitest run`)
- Build verification: `npm run build` (`tsc && vite build`)
