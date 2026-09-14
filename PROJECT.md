# Project: Cadete OS — 100% In-App Navigation & Watermark-Free Map Sprint

## Architecture
- **Framework**: React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS (dark mode `bg-zinc-950`).
- **Map & GIS**: Leaflet.js with OpenStreetMap Standard tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) and dark mode CSS filter on `.leaflet-tile-pane` (`filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(125%) saturate(75%)`). Zero watermarks, zero paid API keys, zoom up to 19.
- **In-App Navigation Bar (`OrderMapModal.tsx`)**:
  - Focus / Recenter route button: "Enfocar" / `Crosshair` (`min-h-[52px] px-3.5`).
  - Integrated audio toggle: `Volume2`/`VolumeX` (`min-h-[52px] w-10`).
  - Primary return button: "Volver a Viajes" (`flex-1 min-h-[52px]`).
  - Zero external redirect links or dropdown menus to Google Maps / Waze.
- **Clean Order Input (`OrderFormModal.tsx`)**:
  - Clean address input without external GPS redirect button.
- **Geocoding Engine**: Local-first offline geocoding in `src/utils/geocoding.ts` using verified entries in `BOLIVAR_ANCHORS` dictionary + zone-based coordinates.
- **Routing Engine**: Public OSRM driving API (`https://router.project-osrm.org`) in `src/utils/routing.ts` with `{lng},{lat}` coordinate order, GeoJSON parsing, 3.5s timeout, and transparent Haversine straight-line fallback.
- **Voice Assistant**: Web Speech API in `src/utils/speech.ts` with Argentine Spanish (`es-AR`), global mute state in `localStorage` + `CustomEvent` synchronization.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Watermark-Free Tile Provider | OpenStreetMap Standard tile URL in `mapConfig.ts` & dark mode CSS filter in `index.css` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | R2: Eradicate External Redirection in OrderMapModal | Remove external dropdown and provide in-app Focus, Audio, and Volver controls | M1 | ORIGINAL_REQUEST §R2 |
| 3 | R2: Eradicate External Redirection in OrderFormModal | Remove external navigation button from address input field | M1 | ORIGINAL_REQUEST §R2 |
| 4 | R2: Global External Navigation Audit & Copy Clean | Update `AuthView.tsx` copy and ensure 0 external navigation calls across components | M1 | ORIGINAL_REQUEST §R2 |
| 5 | R3: Touch Ergonomics & In-App Controls | Preserve >= 52px touch targets on all interactive modal controls and 56px GPS recenter | M1 | ORIGINAL_REQUEST §R3 |
| 6 | R4: Automated Test Refactoring & New Test Suite | Refactor the 7 affected test suites and add `tests/in_app_navigation_and_tiles.test.ts` | M1 | ORIGINAL_REQUEST §R4 |
| 7 | Full Test & Build Integrity | 100% of existing tests + new tests pass, npm run build exits 0, forensic audit CLEAN | M1 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | 100% In-App Navigation & Tile Replacement | `src/components/map/mapConfig.ts`, `src/index.css`, `src/components/map/OrderMapModal.tsx`, `src/components/orders/OrderFormModal.tsx`, `src/components/auth/AuthView.tsx`, `src/utils/navigation.ts`, `tests/` | none | COMPLETED |

## Interface Contracts
### `src/components/map/mapConfig.ts`
- `OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'`
- `OSM_TILE_OPTIONS: TileLayerOptions = { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19, minZoom: 3, crossOrigin: true }`
- Backward-compatible aliases: `CARTO_DARK_MATTER_URL = OSM_TILE_URL`, `CARTO_TILE_OPTIONS = OSM_TILE_OPTIONS`.

### `src/index.css`
- `.leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(125%) saturate(75%); }`

### `src/components/map/OrderMapModal.tsx`
- Action bar tokens:
  - Button "Enfocar" with `Crosshair` icon, class `min-h-[52px] px-3.5`.
  - Button "Audio" with `Volume2`/`VolumeX` icon, class `min-h-[52px] w-10`.
  - Button "Volver a Viajes", class `flex-1 min-h-[52px]`.
- No `openNavigation`, no `showNavMenu`, no `ExternalLink`, no "Google Maps", no "Waze".

### `src/components/orders/OrderFormModal.tsx`
- Address input has no `rightElement` and no external navigation button.

### `src/utils/navigation.ts`
- `isValidAddress(address?: string): boolean`
- `@deprecated` annotations on `getGoogleMapsUrl`, `getWazeUrl`, `openNavigation`.

## Code Layout
- `src/components/map/mapConfig.ts`: Free OpenStreetMap tile layer configuration and coordinates
- `src/components/map/OrderMapModal.tsx`: In-app route modal with 100% internal navigation and focus controls
- `src/components/map/MapView.tsx`: Live map view with GPS recentering
- `src/components/orders/OrderFormModal.tsx`: Clean order creation form
- `src/components/auth/AuthView.tsx`: Auth view with updated copy
- `src/utils/navigation.ts`: Address validation and deprecated external URL helpers
- `src/utils/geocoding.ts`: Geocoding dictionary and distance calculations
- `src/utils/routing.ts`: OSRM routing client and fallback logic
- `src/utils/speech.ts`: Speech synthesis, mute state, event broadcasting
- `src/index.css`: Tailwind styles and Leaflet dark-mode filter
- `tests/`: Automated test suites (46 test files)
