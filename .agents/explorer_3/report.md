# Cadete OS — Test & Build Infrastructure Survey Report (R4)

**Date**: 2026-08-27  
**Agent**: explorer_3  
**Target Project**: Cadete OS (`d:/SaaS de delivery/SaaS`)  
**Scope**: Test framework configuration, baseline execution health, navigation tests structure, test specification for Multi-Country GPS support, TypeScript strictness analysis, and implementation guidelines.

---

## 1. Test Runner Configuration & Baseline Test Results

### 1.1 Configuration Analysis
- **Test Framework**: **Vitest v2.1.9** (`"vitest": "^2.0.5"` in `devDependencies`).
- **Bundler & Dev Server**: Vite 5.4.21 with `@vitejs/plugin-react` 4.3.1.
- **Config File (`vite.config.ts`)**:
  ```typescript
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';

  export default defineConfig({
    plugins: [react()],
    server: {
      port: 5173,
      host: true
    },
    // @ts-ignore
    test: {
      setupFiles: ['./tests/setup.ts']
    }
  });
  ```
- **Test Setup (`tests/setup.ts`)**: Implements an in-memory polyfill for `globalThis.localStorage` (`getItem`, `setItem`, `removeItem`, `clear`, `key`, `length`) so that offline repository tests run cleanly in Node environment without a DOM window.
- **Test Script (`package.json`)**: `"test": "vitest run"`
- **Build Script (`package.json`)**: `"build": "tsc && vite build"`

### 1.2 Baseline Execution Health & Metrics
- **Command Executed**: `npm run test` (`vitest run`)
- **Exit Code**: `0`
- **Total Test Files**: **9 passed (9 suites)**
- **Total Tests**: **114 passed (114 tests)**
- **Execution Duration**: 3.44s total (transform 2.05s, setup 555ms, collect 2.72s, tests 194ms)

#### Test Suite Inventory & Distribution:
| Test Suite File | Test Count | Domain Covered |
| :--- | :---: | :--- |
| `tests/adversarial_challenge.test.ts` | 23 | Net profit invariants, cash drawer isolation, batch debt settlement, oil odometer edge cases |
| `tests/m1_extensions.test.ts` | 22 | Cash float, WhatsApp "Estoy afuera", business profitability, daily goals, shifts, weekly summary |
| `tests/m1_challenger_adversarial.test.ts` | 20 | Argentine phone normalization, WhatsApp deep links, weekly summary stress tests, cash float boundaries |
| `tests/m3_comprehensive_verification.test.ts` | 19 | Responsive layout contracts, formatting utils, debt engines, shift hours, oil odometer |
| `tests/adversarial_gps_orders.test.ts` | 14 | GPS deep linking (Google Maps & Waze), special characters & accents, zero-cost invariants, zone pricing |
| `tests/calculations.test.ts` | 8 | Core financial math, daily summary, business debt calculations, oil odometer |
| `tests/navigation.test.ts` | 4 | Baseline GPS deep linking for Google Maps & Waze, address validation |
| `tests/whatsapp.test.ts` | 3 | WhatsApp settlement text formatting, wa.me phone encoding |
| `tests/workflows.test.ts` | 1 | Full E2E courier daily delivery workflow integration test |
| **TOTAL** | **114** | **100% Passing** |

### 1.3 Baseline TypeScript Compilation & Build Health
- **Command Executed**: `npm run build` (`tsc && vite build`)
- **Exit Code**: `0`
- **Modules Transformed**: 1604 modules
- **Build Time**: 8.88s
- **Output Artifacts**:
  - `dist/index.html` (0.90 kB)
  - `dist/assets/index-*.css` (31.25 kB)
  - `dist/assets/index-*.js` (295.76 kB)
- **Status**: 0 TypeScript compilation errors, 0 unused imports.

---

## 2. Structure of `tests/navigation.test.ts`

`tests/navigation.test.ts` is the dedicated unit test suite for GPS deep linking and universal URL schemes.

### Current Implementation:
```typescript
import { describe, it, expect } from 'vitest';
import {
  getGoogleMapsUrl,
  getWazeUrl,
  isValidAddress
} from '../src/utils/navigation';

describe('GPS & Navigation Universal Links', () => {
  it('generates correct Google Maps deep link for San Carlos de Bolívar', () => {
    const address = 'Av. San Martín 450';
    const url = getGoogleMapsUrl(address);

    expect(url).toContain('https://www.google.com/maps/dir/?api=1&destination=');
    expect(url).toContain(encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar'));
  });

  it('generates correct Waze deep link for San Carlos de Bolívar', () => {
    const address = 'Av. Brown 220';
    const url = getWazeUrl(address);

    expect(url).toContain('https://waze.com/ul?q=');
    expect(url).toContain(encodeURIComponent('Av. Brown 220, San Carlos de Bolívar'));
    expect(url).toContain('&navigate=yes');
  });

  it('returns empty string if address is empty or whitespace', () => {
    expect(getGoogleMapsUrl('')).toBe('');
    expect(getGoogleMapsUrl('   ')).toBe('');
    expect(getWazeUrl('')).toBe('');
    expect(getWazeUrl('   ')).toBe('');
  });

  it('validates address correctly', () => {
    expect(isValidAddress('Av. Cancio 1120')).toBe(true);
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('   ')).toBe(false);
    expect(isValidAddress(undefined)).toBe(false);
  });
});
```

### Critical Architectural Observation for Multi-Country Extension:
- In `tests/adversarial_gps_orders.test.ts` (lines 17, 26, 35, 66, 76), `tests/navigation.test.ts` (lines 14, 22), and `tests/m3_comprehensive_verification.test.ts` (lines 100, 104), multiple tests assert exact strings formatted as `"${address}, ${city}"` when called with 1 or 2 arguments.
- **Requirement & Design Invariant**:
  When `country` is omitted or passed as empty string/whitespace (`country?: string`), the URL helper MUST format `"${address}, ${city}"`.
  When `country` is passed with a non-empty value (e.g. `'Argentina'`, `'Uruguay'`), the URL helper MUST format `"${address}, ${city}, ${country}"`.
- This ensures 100% backward compatibility with all 114 existing baseline tests while adding multi-country capabilities.

---

## 3. Specification for New Navigation Unit Tests (Multi-Country Support)

The following specification details at least 5 new unit tests to be added into `tests/navigation.test.ts` to verify multi-country URL construction across all edge cases.

### Test Spec 1: Default / Omitted Country Parameter (Backward Compatibility)
- **Objective**: Verify that calling `getGoogleMapsUrl` and `getWazeUrl` without the country parameter or with undefined produces `"${address}, ${city}"` without trailing commas.
- **Test Code**:
  ```typescript
  it('omits country when not provided, preserving backward compatibility with city only', () => {
    const address = 'Av. San Martín 450';
    const gmapsUrl = getGoogleMapsUrl(address, 'San Carlos de Bolívar');
    const wazeUrl = getWazeUrl(address, 'San Carlos de Bolívar');

    expect(gmapsUrl).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar')}`
    );
    expect(wazeUrl).toBe(
      `https://waze.com/ul?q=${encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar')}&navigate=yes`
    );
    expect(gmapsUrl).not.toContain(encodeURIComponent(', Argentina'));
  });
  ```

### Test Spec 2: Explicit Country Parameter (Argentina & International)
- **Objective**: Verify that passing an explicit country string correctly appends `, ${country}` to the destination address query.
- **Test Code**:
  ```typescript
  it('includes explicit country parameter in Google Maps and Waze deep links', () => {
    const address = 'Av. San Martín 450';
    const city = 'San Carlos de Bolívar';
    const country = 'Argentina';

    const gmapsUrl = getGoogleMapsUrl(address, city, country);
    const wazeUrl = getWazeUrl(address, city, country);

    expect(gmapsUrl).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar, Argentina')}`
    );
    expect(wazeUrl).toBe(
      `https://waze.com/ul?q=${encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar, Argentina')}&navigate=yes`
    );

    // International test
    const intlGmaps = getGoogleMapsUrl('Av. 18 de Julio 1234', 'Montevideo', 'Uruguay');
    expect(intlGmaps).toContain(encodeURIComponent('Av. 18 de Julio 1234, Montevideo, Uruguay'));
  });
  ```

### Test Spec 3: Empty String and Whitespace-Only Country Parameter
- **Objective**: Verify that passing an empty string `""` or whitespace `"   "` as country does NOT append trailing commas or whitespace.
- **Test Code**:
  ```typescript
  it('handles empty string or whitespace country parameter cleanly without trailing commas', () => {
    const address = 'Mitre 250';
    const city = 'San Carlos de Bolívar';

    const gmapsEmpty = getGoogleMapsUrl(address, city, '');
    const gmapsSpaces = getGoogleMapsUrl(address, city, '   ');
    const wazeEmpty = getWazeUrl(address, city, '');
    const wazeSpaces = getWazeUrl(address, city, '   ');

    const expectedEncoded = encodeURIComponent('Mitre 250, San Carlos de Bolívar');
    expect(gmapsEmpty).toContain(expectedEncoded);
    expect(gmapsSpaces).toContain(expectedEncoded);
    expect(wazeEmpty).toContain(expectedEncoded);
    expect(wazeSpaces).toContain(expectedEncoded);

    expect(gmapsEmpty).not.toContain(encodeURIComponent('Bolívar,'));
    expect(gmapsSpaces).not.toContain(encodeURIComponent('Bolívar,'));
  });
  ```

### Test Spec 4: Empty / Whitespace Address with Explicit Country
- **Objective**: Verify that if the address is empty or whitespace-only, the functions immediately return `""` regardless of city and country values.
- **Test Code**:
  ```typescript
  it('returns empty string when address is blank or whitespace, even if country is provided', () => {
    expect(getGoogleMapsUrl('', 'San Carlos de Bolívar', 'Argentina')).toBe('');
    expect(getGoogleMapsUrl('   ', 'San Carlos de Bolívar', 'Argentina')).toBe('');
    expect(getGoogleMapsUrl('\t\n', 'San Carlos de Bolívar', 'Argentina')).toBe('');

    expect(getWazeUrl('', 'San Carlos de Bolívar', 'Argentina')).toBe('');
    expect(getWazeUrl('   ', 'San Carlos de Bolívar', 'Argentina')).toBe('');
    expect(getWazeUrl('\t\n', 'San Carlos de Bolívar', 'Argentina')).toBe('');
  });
  ```

### Test Spec 5: Special Characters, Accents & Argentine Street Symbols with Country
- **Objective**: Verify that addresses containing Spanish accents, eñes, street numbers with `#`, `°`, `&`, `/`, and hyphens are properly encoded together with city and country.
- **Test Code**:
  ```typescript
  it('encodes special characters, accents, eñe, and symbols accurately with country', () => {
    const address = 'Calle Ñandú 320 #4 & Av. Güemes 1200 - Dpto 2°B';
    const city = 'San Carlos de Bolívar';
    const country = 'Argentina';

    const gmapsUrl = getGoogleMapsUrl(address, city, country);
    const wazeUrl = getWazeUrl(address, city, country);

    const expectedString = 'Calle Ñandú 320 #4 & Av. Güemes 1200 - Dpto 2°B, San Carlos de Bolívar, Argentina';
    expect(gmapsUrl).toBe(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(expectedString)}`);
    expect(wazeUrl).toBe(`https://waze.com/ul?q=${encodeURIComponent(expectedString)}&navigate=yes`);

    // Ensure raw unencoded query delimiters are not present in the payload
    expect(gmapsUrl).not.toContain('#');
    expect(gmapsUrl.split('&destination=')[1]).not.toContain('&');
  });
  ```

### Test Spec 6 (Bonus): `openNavigation` Multi-Country Integration
- **Objective**: Verify `openNavigation` function with country parameter.
- **Test Code**:
  ```typescript
  it('passes country correctly through openNavigation for google and waze', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    openNavigation('Av. San Martín 450', 'google', 'San Carlos de Bolívar', 'Argentina');
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar, Argentina')),
      '_blank',
      'noopener,noreferrer'
    );

    openNavigation('Av. Brown 220', 'waze', 'San Carlos de Bolívar', 'Argentina');
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Av. Brown 220, San Carlos de Bolívar, Argentina')),
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockRestore();
  });
  ```

---

## 4. TypeScript Strict Analysis & Implementation Guidelines

### 4.1 TypeScript Configuration (`tsconfig.json`)
The project enforces high strictness flags:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 4.2 Potential Pitfalls & How to Avoid Them

1. **`noUnusedLocals` and `noUnusedParameters`**:
   - Any unused icon import (e.g. from `lucide-react`) or unused helper function parameter will fail the build `tsc && vite build`.
   - When creating `ConfirmDialog.tsx` or modifying existing views, do not leave unused props or imports.

2. **`noUncheckedIndexedAccess: true`**:
   - Accessing array indices (e.g. `array[0]`) yields `T | undefined`.
   - Use optional chaining (`array[0]?.name`) or explicit guards.

3. **`UserProfile.settings` Model Synchronicity**:
   - In `src/types/index.ts`:
     ```typescript
     export interface UserProfile {
       uid: string;
       email: string;
       displayName: string;
       createdAt: string;
       settings: {
         currency: "ARS";
         cityDefault: CityDefault;
         countryDefault?: string; // or string with default in DEFAULT_USER
         oilChangeThresholdOrders: number;
         oilChangeThresholdDays: number;
         dailyGoal?: number;
       };
     }
     ```
   - In `src/lib/storage.ts`: `DEFAULT_USER` must specify `countryDefault: 'Argentina'`.
   - In `src/context/AuthContext.tsx`: `updateSettings` and `updateProfile` methods should preserve `countryDefault`.

4. **GPS Deep Linking Function Signature (`src/utils/navigation.ts`)**:
   - `getGoogleMapsUrl(address: string, city: string = DEFAULT_CITY, country?: string): string`
   - `getWazeUrl(address: string, city: string = DEFAULT_CITY, country?: string): string`
   - `openNavigation(address: string, provider: 'google' | 'waze' = 'google', city: string = DEFAULT_CITY, country?: string): void`
   - Inside implementation:
     ```typescript
     const trimmed = address.trim();
     if (!trimmed) return "";
     const trimmedCountry = country?.trim();
     const fullAddress = trimmedCountry ? `${trimmed}, ${city}, ${trimmedCountry}` : `${trimmed}, ${city}`;
     ```

5. **`ConfirmDialog` Component Architecture (`src/components/common/ConfirmDialog.tsx`)**:
   - Props interface:
     ```typescript
     export interface ConfirmDialogProps {
       isOpen: boolean;
       title: string;
       message: string;
       onConfirm: () => void;
       onCancel: () => void;
       confirmLabel?: string; // Default: "Eliminar"
       confirmVariant?: 'danger' | 'primary'; // Default: "danger"
     }
     ```
   - Touch targets: Buttons must have `min-h-[52px]` to follow the mobile-first UX specification.
   - Styling: Dark mode native (`bg-zinc-900`, `border-zinc-800`, backdrop overlay `bg-black/80`).

6. **CashDrawerCard Deduplication (`src/components/finance/CashDrawerCard.tsx`)**:
   - Line 141-143 currently renders:
     ```tsx
     <div className="flex items-center justify-between text-xs">
       <span className="text-zinc-400 font-medium">Efectivo cobrado menos gastos:</span>
       <span className="font-bold text-zinc-200">{formatCurrency(realCashEarned)}</span>
     </div>
     ```
   - Requirement: Remove this duplicated row, keeping only the final "Efectivo Real Ganado:" row at line 157-164.

---

## 5. Summary & Handoff Readiness

- **Baseline Health**: 114 / 114 tests passing. 0 TypeScript compilation errors. 0 build issues.
- **Verification Strategy**: After implementation, execute `npm run test` (must pass 119+ tests: 114 existing + 5+ new navigation tests) and `npm run build` (exit code 0).
- **Report Status**: Complete and ready for implementation agent.
