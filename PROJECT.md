# Project: Cadete OS — Integrated Map & Voice Navigation Sprint

## Architecture
- **Framework**: React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS (dark mode `bg-zinc-950`).
- **Map & GIS**: Leaflet.js with CartoDB Dark Matter tiles (free, no API key).
- **Geocoding Engine**: Local-first offline geocoding in `src/utils/geocoding.ts` using 103 verified entries in `BOLIVAR_ANCHORS` dictionary + zone-based coordinates.
- **Routing Engine**: Public OSRM driving API (`https://router.project-osrm.org`) in `src/utils/routing.ts` with `{lng},{lat}` coordinate order, GeoJSON parsing, 3.5s timeout, and transparent Haversine straight-line fallback.
- **Voice Assistant**: Web Speech API in `src/utils/speech.ts` with Argentine Spanish (`es-AR`), global mute state in `localStorage` + `CustomEvent` synchronization.
- **Order UI**: `OrderList.tsx` and `OrderCard.tsx` in `src/components/orders/`, and `OrderMapModal.tsx` in `src/components/map/`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R2: Bolivar Geocoding Expansion | Expand BOLIVAR_ANCHORS to >= 60 verified streets/barrios in San Carlos de Bolívar with exact coordinates in bounds | M1 | ORIGINAL_REQUEST §R2 |
| 2 | R5: Real Street Routing Engine | OSRM routing service (`src/utils/routing.ts`) with {lng},{lat} order, GeoJSON parsing, 3.5s timeout, and straight fallback | M2 | ORIGINAL_REQUEST §R5 |
| 3 | R3: Auto Speech in OrderMapModal | Automatic speech readout upon opening OrderMapModal (< 300ms), respects mute, prevents duplicates via hasSpokenRef | M3 | ORIGINAL_REQUEST §R3 |
| 4 | R4: Speech Button on OrderCard | Dedicated 🔊 button on each OrderCard (>= 44px), speaks order summary, reflects global mute state visually and auditorily | M3 | ORIGINAL_REQUEST §R4 |
| 5 | R1: In-app Map Trigger from OrderList | "Cómo ir" button on OrderCard opens OrderMapModal directly in-app (>= 52px), zero external redirect, hidden/disabled when no address | M3 | ORIGINAL_REQUEST §R1 |
| 6 | R5-UI: OSRM Map Integration | OrderMapModal dynamically displays OSRM polyline, loading state, distance & ETA update, and straight fallback | M3 | ORIGINAL_REQUEST §R5 |
| 7 | Full Test & Build Integrity | 100% of existing tests + new tests pass (592+ tests in 34+ suites), npm run build exits 0, forensic audit CLEAN | M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Geocoding Expansion (R2) | `src/utils/geocoding.ts`, `tests/geolocation_routing.test.ts` | none | DONE |
| M2 | OSRM Routing Service (R5) | `src/utils/routing.ts`, `tests/routing.test.ts` | M1 | DONE |
| M3 | UI & Voice Navigation (R1, R3, R4, R5-UI) | `src/utils/speech.ts`, `src/components/map/OrderMapModal.tsx`, `src/components/orders/OrderCard.tsx`, `tests/map_integration.test.ts`, `tests/speech.test.ts` | M1, M2 | DONE |
| M4 | E2E Regression, Build & Forensic Integrity Audit | Complete regression test suite execution, build check (`tsc && vite build`), forensic audit | M1, M2, M3 | DONE |

## Interface Contracts
### `src/utils/geocoding.ts`
- `BOLIVAR_ANCHORS: Record<string, [number, number]>` (keys: unaccented lowercase ASCII, 103 entries).
- `resolveOrderCoordinates(order: Order): [number, number]`
- `calculateDistanceKm(from: [number, number], to: [number, number]): number`
- `estimateMotoEtaMinutes(distanceKm: number): number`

### `src/utils/routing.ts`
- `fetchOsrmRoute(origin: [number, number], destination: [number, number], options?: FetchRouteOptions): Promise<RouteResult>`
- Returns: `{ coordinates: [number, number][], distanceKm: number, durationMinutes: number, isFallback: boolean }`
- Note: converts OSRM `[lng, lat]` coordinates to Leaflet `[lat, lng]`.

### `src/utils/speech.ts`
- `isSpeechMuted(): boolean`
- `setSpeechMuted(muted: boolean): void` (dispatches `'cadete_os_speech_muted_changed'`)
- `cancelSpeech(): void`
- `speakOrder(order: Order): void`

### `src/components/orders/OrderCard.tsx`
- Primary button: "Cómo ir" -> calls `handleOpenMap()` -> `onViewOnMap(order)`.
- Touch target: `flex-1 min-h-[52px]`.
- Voice button: `w-11 h-11 min-w-[44px] min-h-[44px]`, calls `speakOrder(order)`, reflects mute.
- Retains string tokens for existing test assertions.

## Code Layout
- `src/utils/geocoding.ts`: Geocoding dictionary and distance calculations
- `src/utils/routing.ts`: OSRM routing client and fallback logic
- `src/utils/speech.ts`: Speech synthesis, mute state, event broadcasting
- `src/components/map/OrderMapModal.tsx`: In-app route modal with Leaflet map, auto-speech, and OSRM integration
- `src/components/orders/OrderCard.tsx`: Order card with in-app "Cómo ir" and speech button
- `src/components/orders/OrderList.tsx`: Orders view and modal host
- `tests/`: Vitest test suites (34+ suites, 592+ tests)
- `dist/`: Freshly compiled PWA bundle (`index-DH1DXkv1.js`) and Service Worker
