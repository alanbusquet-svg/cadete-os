# Cadete OS — Multi-Country Support (R1) Comprehensive Exploration Report

**Date**: 2026-08-27  
**Explorer Agent**: `explorer_1`  
**Milestone**: Multi-Country Support (R1) & UX Foundations  
**Workspace**: `d:/SaaS de delivery/SaaS`

---

## Executive Summary

Cadete OS is a high-performance, mobile-first PWA for motorcycle couriers developed with React 18 + Vite + TypeScript (strict mode) and Tailwind CSS.
This investigation analyzes the existing implementation across types, offline storage, GPS deep linking, authentication context, layout navigation, and order cards/modals to specify the precise architecture and line-by-line modifications required for **Requirement 1 (R1: Multi-Country Support)** while preserving 100% of the 114 existing automated tests and strict TypeScript typing.

---

## 1. Current State Analysis

### 1.1 `src/types/index.ts`
- **Current implementation**:
  `UserProfile` defines a `settings` object:
  ```typescript
  export type CurrencyCode = "ARS";
  export type CityDefault = string;

  export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    createdAt: string;
    settings: {
      currency: "ARS";
      cityDefault: CityDefault;
      oilChangeThresholdOrders: number; // Por defecto: 250 pedidos
      oilChangeThresholdDays: number;   // Por defecto: 30 días
      dailyGoal?: number;               // R5: Meta de ganancia diaria en pesos
    };
  }
  ```
- **Observations**:
  - `cityDefault` is strongly typed via `CityDefault = string`.
  - There is currently **no** `countryDefault` property in `settings`.
  - All properties except `dailyGoal` are required in `settings`.

---

### 1.2 `src/lib/storage.ts`
- **Current implementation**:
  - `DEFAULT_USER` defines the default profile seed (lines 17–28):
    ```typescript
    export const DEFAULT_USER: UserProfile = {
      uid: 'cadete_demo_1',
      email: 'cadete@bolivar.com',
      displayName: 'Cadete Bolívar',
      createdAt: '2026-08-01T10:00:00.000Z',
      settings: {
        currency: 'ARS',
        cityDefault: 'San Carlos de Bolívar',
        oilChangeThresholdOrders: 250,
        oilChangeThresholdDays: 30
      }
    };
    ```
  - `StorageRepository.getProfile(userId: string)` (lines 213–223):
    ```typescript
    getProfile(userId: string): UserProfile {
      try {
        const data = localStorage.getItem(this.getKey(userId, 'profile'));
        if (data) return JSON.parse(data);
      } catch {
        // fallback
      }
      const defaultProfile = { ...DEFAULT_USER, uid: userId };
      this.saveProfile(userId, defaultProfile);
      return defaultProfile;
    }
    ```
- **Observations**:
  - `DEFAULT_USER.settings` lacks `countryDefault`.
  - If a user has pre-existing data in `localStorage` under `cadete_os_v1_<userId>_profile`, `JSON.parse(data)` will return an object without `countryDefault`. A defensive deep merge with default settings is necessary to avoid runtime `undefined` values.

---

### 1.3 `src/utils/navigation.ts`
- **Current implementation**:
  ```typescript
  export const DEFAULT_CITY = "San Carlos de Bolívar";

  export function getGoogleMapsUrl(address: string, city: string = DEFAULT_CITY): string {
    const trimmed = address.trim();
    if (!trimmed) return "";
    const fullAddress = `${trimmed}, ${city}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
  }

  export function getWazeUrl(address: string, city: string = DEFAULT_CITY): string {
    const trimmed = address.trim();
    if (!trimmed) return "";
    const fullAddress = `${trimmed}, ${city}`;
    return `https://waze.com/ul?q=${encodeURIComponent(fullAddress)}&navigate=yes`;
  }

  export function isValidAddress(address?: string): boolean {
    return typeof address === 'string' && address.trim().length > 0;
  }

  export function openNavigation(
    address: string,
    provider: 'google' | 'waze' = 'google',
    city: string = DEFAULT_CITY
  ): void {
    const url = provider === 'waze' ? getWazeUrl(address, city) : getGoogleMapsUrl(address, city);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
  ```
- **Observations**:
  - All functions currently format the destination address as `${trimmed}, ${city}`.
  - No `country` parameter exists in any of the signatures.
  - No `DEFAULT_COUNTRY` constant is exported.
  - In existing adversarial tests (e.g. `tests/adversarial_gps_orders.test.ts` and `tests/m3_comprehensive_verification.test.ts`), `getGoogleMapsUrl` and `getWazeUrl` are tested with 1 or 2 arguments, checking for exact or substring matches against `San Carlos de Bolívar` without a country unless passed.

---

### 1.4 `src/context/AuthContext.tsx`
- **Current implementation**:
  - Defines `AuthContextType` with `updateSettings: (settings: Partial<UserProfile['settings']>) => void` and `updateProfile: (profile: Partial<UserProfile>) => void`.
  - Initializes state `const [user, setUser] = useState<UserProfile>(DEFAULT_USER);`.
  - On mount, calls `storage.getProfile(DEFAULT_USER.uid)`.
- **Observations**:
  - `updateSettings` and `updateProfile` perform shallow/nested spreads. Adding `countryDefault` to `UserProfile['settings']` is automatically supported with full type inference.

---

### 1.5 `src/components/layout/SidebarNav.tsx`
- **Current implementation**:
  - Lines 76–81:
    ```tsx
    <div className="flex items-center gap-1.5">
      <span className="font-black tracking-tight text-lg text-zinc-100">CADETE OS</span>
      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        Bolívar
      </span>
    </div>
    ```
- **Observations**:
  - The badge hardcodes `"Bolívar"` directly inside the JSX.
  - `const { user } = useAuth();` is already destructured at line 22.
  - It should render `{user?.settings?.cityDefault || 'Bolívar'}` dynamically.

---

### 1.6 `src/components/settings/SettingsView.tsx`
- **Current implementation**:
  - Form state manages `displayName`, `dailyGoal`, `thresholdOrders`, `thresholdDays`, `cityDefault`.
  - Lines 32–34:
    ```tsx
    const [cityDefault, setCityDefault] = useState<string>(
      user.settings?.cityDefault || 'San Carlos de Bolívar'
    );
    ```
  - Lines 50–59 in `handleSaveProfile`:
    ```tsx
    updateProfile({
      displayName: displayName.trim(),
      settings: {
        currency: 'ARS',
        cityDefault: cityDefault.trim(),
        oilChangeThresholdOrders: ordersNum,
        oilChangeThresholdDays: daysNum,
        dailyGoal: goalNum && goalNum > 0 ? goalNum : undefined
      }
    });
    ```
  - Lines 160–165 in JSX:
    ```tsx
    <Input
      label="Ciudad por Defecto (Para navegación GPS)"
      value={cityDefault}
      onChange={(e) => setCityDefault(e.target.value)}
      required
    />
    ```
- **Observations**:
  - Lacks state for `countryDefault`.
  - Lacks input field `"País por Defecto"` with placeholder `"Argentina"`.
  - Does not persist `countryDefault` on form submission.

---

### 1.7 `src/components/orders/OrderCard.tsx`
- **Current implementation**:
  - Lines 30–40:
    ```tsx
    const { user } = useAuth();
    const city = user.settings?.cityDefault || 'San Carlos de Bolívar';
    const [showNavMenu, setShowNavMenu] = useState<boolean>(false);
    const hasAddress = isValidAddress(order.address);
    const hasCustomerPhone = Boolean(order.customerPhone && order.customerPhone.trim());

    const handleNavigate = (provider: 'google' | 'waze') => {
      if (!order.address) return;
      openNavigation(order.address, provider, city);
      setShowNavMenu(false);
    };
    ```
- **Observations**:
  - Extracts only `city`.
  - Calls `openNavigation(order.address, provider, city)` without passing country.

---

### 1.8 `src/components/orders/OrderFormModal.tsx`
- **Current implementation**:
  - Lines 21–23:
    ```tsx
    const { user } = useAuth();
    const city = user.settings?.cityDefault || 'San Carlos de Bolívar';
    ```
  - Lines 312–318 (GPS test button in address input):
    ```tsx
    <button
      type="button"
      onClick={() => openNavigation(address, 'google', city)}
      className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
      title="Probar GPS Google Maps"
    >
      <Navigation className="w-4 h-4" />
    </button>
    ```
- **Observations**:
  - Extracts only `city`.
  - Calls `openNavigation(address, 'google', city)` without passing country.

---

## 2. Concrete Changes Required (Line-by-Line / Section-by-Section)

### Change 1: `src/types/index.ts`
- **Location**: Line 5–28
- **Proposed Code**:
  ```typescript
  export type CurrencyCode = "ARS";
  export type CityDefault = string;
  export type CountryDefault = string;

  // 1. PERFIL DE USUARIO
  export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    createdAt: string;
    settings: {
      currency: "ARS";
      cityDefault: CityDefault;
      countryDefault: CountryDefault;  // R1: Soporte multi-país (default "Argentina")
      oilChangeThresholdOrders: number; // Por defecto: 250 pedidos
      oilChangeThresholdDays: number;   // Por defecto: 30 días
      dailyGoal?: number;               // R5: Meta de ganancia diaria en pesos
    };
  }
  ```

---

### Change 2: `src/lib/storage.ts`
- **Location**: Lines 17–28 & Lines 213–223
- **Proposed Code**:
  ```typescript
  export const DEFAULT_USER: UserProfile = {
    uid: 'cadete_demo_1',
    email: 'cadete@bolivar.com',
    displayName: 'Cadete Bolívar',
    createdAt: '2026-08-01T10:00:00.000Z',
    settings: {
      currency: 'ARS',
      cityDefault: 'San Carlos de Bolívar',
      countryDefault: 'Argentina',
      oilChangeThresholdOrders: 250,
      oilChangeThresholdDays: 30
    }
  };
  ```
  And in `getProfile`:
  ```typescript
  getProfile(userId: string): UserProfile {
    try {
      const data = localStorage.getItem(this.getKey(userId, 'profile'));
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_USER,
          ...parsed,
          settings: {
            ...DEFAULT_USER.settings,
            ...(parsed.settings || {})
          }
        };
      }
    } catch {
      // fallback
    }
    const defaultProfile = { ...DEFAULT_USER, uid: userId };
    this.saveProfile(userId, defaultProfile);
    return defaultProfile;
  }
  ```

---

### Change 3: `src/utils/navigation.ts`
- **Location**: Full file
- **Proposed Code**:
  ```typescript
  // ==========================================
  // CADETE OS - NAVIGATION & GPS DEEP LINKING
  // ==========================================

  export const DEFAULT_CITY = "San Carlos de Bolívar";
  export const DEFAULT_COUNTRY = "Argentina";

  /**
   * Genera el deep link universal 100% gratuito para Google Maps
   * @param address Dirección de entrega (ej: "Av. San Martín 450")
   * @param city Ciudad por defecto ("San Carlos de Bolívar")
   * @param country País por defecto ("Argentina"). Si es vacío o no se provee, no se concatena.
   */
  export function getGoogleMapsUrl(
    address: string,
    city: string = DEFAULT_CITY,
    country?: string
  ): string {
    const trimmed = address.trim();
    if (!trimmed) return "";
    const trimmedCountry = country?.trim() || "";
    const fullAddress = trimmedCountry ? `${trimmed}, ${city}, ${trimmedCountry}` : `${trimmed}, ${city}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
  }

  /**
   * Genera el deep link universal 100% gratuito para Waze
   * @param address Dirección de entrega (ej: "Av. San Martín 450")
   * @param city Ciudad por defecto ("San Carlos de Bolívar")
   * @param country País por defecto ("Argentina"). Si es vacío o no se provee, no se concatena.
   */
  export function getWazeUrl(
    address: string,
    city: string = DEFAULT_CITY,
    country?: string
  ): string {
    const trimmed = address.trim();
    if (!trimmed) return "";
    const trimmedCountry = country?.trim() || "";
    const fullAddress = trimmedCountry ? `${trimmed}, ${city}, ${trimmedCountry}` : `${trimmed}, ${city}`;
    return `https://waze.com/ul?q=${encodeURIComponent(fullAddress)}&navigate=yes`;
  }

  /**
   * Verifica si una dirección es válida para navegación
   */
  export function isValidAddress(address?: string): boolean {
    return typeof address === 'string' && address.trim().length > 0;
  }

  /**
   * Abre el enlace de navegación en una nueva ventana / app del sistema
   */
  export function openNavigation(
    address: string,
    provider: 'google' | 'waze' = 'google',
    city: string = DEFAULT_CITY,
    country?: string
  ): void {
    const url = provider === 'waze' ? getWazeUrl(address, city, country) : getGoogleMapsUrl(address, city, country);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
  ```

---

### Change 4: `src/components/layout/SidebarNav.tsx`
- **Location**: Line 78–80
- **Proposed Code**:
  ```tsx
  <div className="flex items-center gap-1.5">
    <span className="font-black tracking-tight text-lg text-zinc-100">CADETE OS</span>
    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
      {user?.settings?.cityDefault || 'Bolívar'}
    </span>
  </div>
  ```

---

### Change 5: `src/components/settings/SettingsView.tsx`
- **Location**: Lines 32–62 & Lines 160–167
- **Proposed Code**:
  Add state:
  ```tsx
  const [cityDefault, setCityDefault] = useState<string>(
    user.settings?.cityDefault || 'San Carlos de Bolívar'
  );
  const [countryDefault, setCountryDefault] = useState<string>(
    user.settings?.countryDefault || 'Argentina'
  );
  ```
  Update `handleSaveProfile`:
  ```tsx
  updateProfile({
    displayName: displayName.trim(),
    settings: {
      currency: 'ARS',
      cityDefault: cityDefault.trim(),
      countryDefault: countryDefault.trim() || 'Argentina',
      oilChangeThresholdOrders: ordersNum,
      oilChangeThresholdDays: daysNum,
      dailyGoal: goalNum && goalNum > 0 ? goalNum : undefined
    }
  });
  ```
  JSX form input (directly below the City input):
  ```tsx
  <Input
    label="Ciudad por Defecto (Para navegación GPS)"
    value={cityDefault}
    onChange={(e) => setCityDefault(e.target.value)}
    required
  />

  <Input
    label="País por Defecto"
    placeholder="Argentina"
    value={countryDefault}
    onChange={(e) => setCountryDefault(e.target.value)}
  />
  ```

---

### Change 6: `src/components/orders/OrderCard.tsx`
- **Location**: Lines 30–40
- **Proposed Code**:
  ```tsx
  const { user } = useAuth();
  const city = user.settings?.cityDefault || 'San Carlos de Bolívar';
  const country = user.settings?.countryDefault || 'Argentina';
  const [showNavMenu, setShowNavMenu] = useState<boolean>(false);
  const hasAddress = isValidAddress(order.address);
  const hasCustomerPhone = Boolean(order.customerPhone && order.customerPhone.trim());

  const handleNavigate = (provider: 'google' | 'waze') => {
    if (!order.address) return;
    openNavigation(order.address, provider, city, country);
    setShowNavMenu(false);
  };
  ```

---

### Change 7: `src/components/orders/OrderFormModal.tsx`
- **Location**: Lines 21–24 & Line 312–318
- **Proposed Code**:
  ```tsx
  const { user } = useAuth();
  const city = user.settings?.cityDefault || 'San Carlos de Bolívar';
  const country = user.settings?.countryDefault || 'Argentina';
  ```
  And inside GPS test button:
  ```tsx
  <button
    type="button"
    onClick={() => openNavigation(address, 'google', city, country)}
    className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
    title="Probar GPS Google Maps"
  >
    <Navigation className="w-4 h-4" />
  </button>
  ```

---

### Change 8: `tests/navigation.test.ts`
- **Location**: Append new tests
- **Proposed Tests**:
  1. `getGoogleMapsUrl` with explicit country parameter (`"Argentina"`).
  2. `getGoogleMapsUrl` with custom country parameter (`"Uruguay"`, `"Chile"`).
  3. `getGoogleMapsUrl` with empty string `""` as country parameter (verifying backward compatibility).
  4. `getGoogleMapsUrl` with whitespace-only country parameter (`"   "`).
  5. `getGoogleMapsUrl` with special characters/accents in address and country.
  6. `getWazeUrl` with country parameter (`"Argentina"`).
  7. `openNavigation` window.open call verification with country parameter.

---

## 3. Potential Pitfalls and Mitigation Strategies

| Pitfall | Risk | Root Cause | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Breaking Existing 114 Tests** | HIGH | In `tests/adversarial_gps_orders.test.ts` (lines 17 & 66) and `tests/m3_comprehensive_verification.test.ts` (line 98), tests call `getGoogleMapsUrl(address)` and assert exact strings like `...San%20Carlos%20de%20Bol%C3%ADvar` without `, Argentina`. | Define `country?: string` as optional without forcing `"Argentina"` by default in raw utility function if no country argument is passed. When called without country, it returns `"${trimmed}, ${city}"`. When called from UI or with country, it formats `"${trimmed}, ${city}, ${country}"`. |
| **Legacy LocalStorage Deserialization** | MEDIUM | Existing localStorage profiles saved before R1 do not contain `countryDefault`. Reading `user.settings.countryDefault` would return `undefined`. | In `storage.getProfile()`, perform a deep merge `{ ...DEFAULT_USER.settings, ...(parsed.settings || {}) }` so missing keys receive default values (`'Argentina'`). In components, use fallback `user.settings?.countryDefault \|\| 'Argentina'`. |
| **Empty or Whitespace Country Input** | MEDIUM | User deletes the country input in SettingsView, resulting in `""` or `" "`. Concatenating directly would produce `", , "`. | In `getGoogleMapsUrl` and `getWazeUrl`, sanitize: `const trimmedCountry = country?.trim() \|\| "";`. If `trimmedCountry` is falsy, format only `${trimmed}, ${city}`. |
| **TypeScript Strict Null Checks** | LOW | `user.settings` or `countryDefault` could be typed as undefined if marked optional. | Explicitly define `countryDefault: CountryDefault` in `UserProfile.settings` and update `DEFAULT_USER` with `countryDefault: 'Argentina'`. |
| **Sidebar Layout Truncation** | LOW | If `cityDefault` is long (e.g. "San Carlos de Bolívar"), the sidebar badge could overflow. | Badge has `truncate` / flex layout; keep text size compact `text-[10px]`. |

---

## 4. Verification Method

1. **Static Analysis & Types**:
   - Run `npx tsc --noEmit` to verify 0 TypeScript errors under strict mode.
2. **Build Validation**:
   - Run `npm run build` (`tsc && vite build`) to verify exit code 0 and asset bundling.
3. **Automated Unit Tests**:
   - Run `npm run test` (`vitest run`).
   - Verify all 114 pre-existing tests pass without any modifications to their assertions.
   - Verify at least 5 new tests in `tests/navigation.test.ts` pass 100%.
4. **Behavioral Checks**:
   - Inspect generated Google Maps and Waze deep links with country vs. without country.
   - Confirm SettingsView renders the new input and updates `user.settings.countryDefault`.
   - Confirm SidebarNav dynamically displays the city name from `user.settings.cityDefault`.
