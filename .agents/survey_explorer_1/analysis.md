# Requirement R1 Technical Survey & Architectural Evaluation: Firebase Auth & Pantalla de Acceso

## Executive Summary
Requirement R1 (**Firebase Authentication & Pantalla de Acceso — Login / Registro / Onboarding / 7-Day Trial**) is **100% implemented, strictly typed, and thoroughly tested**.

The implementation adheres to all architectural constraints defined in `GEMINI.md` and `PROJECT.md`:
- **Real Firebase Authentication** via `signInWithPopup` (Google) and `signInWithEmailAndPassword` / `createUserWithEmailAndPassword`.
- **7-Day Free Trial Engine** calculating remaining days, active status, expiration, and active subscription overrides (`src/utils/trial.ts`).
- **Instant Demo Mode Bypass** (`cadete_os_demo_mode`) for zero-friction local testing without authentication.
- **Firestore Multi-Tenant User Profile Lifecycle** (`users/{userId}`) created on registration and cached in LocalStorage with optimistic offline fallbacks.
- **Ergonomic Native Dark Theme Screen** (`src/components/auth/AuthView.tsx`) with touch targets >= 52px, high-contrast zinc dark mode palette, and clear Spanish error messages for all Firebase error codes.
- **Seamless System Wiring** in `App.tsx`, `Header.tsx`, `SidebarNav.tsx`, `BottomNav.tsx`, and `SettingsView.tsx`.
- **100% Test Pass Rate**: 275 tests passing across 17 Vitest test suites with 0 failures.

---

## 1. Detailed Component & Module Evaluation

### 1.1 `src/types/index.ts` — Type Models
- **`UserProfile`**:
  ```typescript
  export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: string;
    trialEndsAt?: string;
    subscriptionStatus?: 'trial' | 'active' | 'expired';
    settings: {
      currency: "ARS";
      cityDefault: CityDefault;
      countryDefault: CountryDefault;
      oilChangeThresholdOrders: number;
      oilChangeThresholdDays: number;
      dailyGoal?: number;
    };
  }
  ```
- **`TrialInfo`**:
  ```typescript
  export interface TrialInfo {
    isTrialActive: boolean;
    daysRemaining: number;
    isExpired: boolean;
    trialEndsAt: string;
  }
  ```
- **Evaluation**: The data contracts fully support multi-tenant isolation, 7-day trial tracking, and multi-country navigation defaults (`Argentina`).

---

### 1.2 `src/lib/firebase.ts` — Modular Firebase Init
- Initializes Firebase App, Auth (`getAuth`), and Firestore (`getFirestore`) singleton instances.
- Robust environment variable loading (`import.meta.env.VITE_FIREBASE_*`) with fallback configuration for local execution and zero-breakage development.

---

### 1.3 `src/utils/trial.ts` — 7-Day Free Trial Calculation Engine
- **Function**: `calculateTrialStatus(profile: UserProfile, currentTime?: number | Date): TrialInfo`
- **Core Logic**:
  - Automatically derives `trialEndsAt` as `createdAt + 7 days` (604,800,000 ms) if `trialEndsAt` is not explicitly set.
  - Computes `daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))`.
  - Determines `isTrialActive = msRemaining > 0`.
  - Subscription status override: If `profile.subscriptionStatus === 'active'`, `isExpired` is strictly `false` regardless of elapsed time.
  - Defensive against corrupted dates or missing properties.

---

### 1.4 `src/context/AuthContext.tsx` & `src/hooks/useAuth.ts` — Authentication Provider
- **State Managed**:
  - `firebaseUser`: `User | null` (from Firebase Auth `onAuthStateChanged`).
  - `user`: `UserProfile` (Firestore profile merged with defaults and LocalStorage cache).
  - `isLoading`: `boolean` (initial auth state resolution).
  - `isDemoMode`: `boolean` (persisted in LocalStorage under `'cadete_os_demo_mode'`).
  - `trialInfo`: `TrialInfo` (reactive trial countdown).
- **Methods Implemented**:
  1. `signInWithGoogle()`: Instantiates `GoogleAuthProvider`, sets `{ prompt: 'select_account' }`, and executes `signInWithPopup(auth, provider)`.
  2. `signInWithEmail(email, pass)`: Trims email and executes `signInWithEmailAndPassword(auth, email, pass)`.
  3. `signUpWithEmail(email, pass, name)`: Executes `createUserWithEmailAndPassword(auth, email, pass)` and invokes `updateProfile(cred.user, { displayName })` if `name` is supplied.
  4. `logout()`: Exits demo mode and executes `signOut(auth)`, restoring state to `DEFAULT_USER`.
  5. `enterDemoMode()`: Sets `cadete_os_demo_mode` in LocalStorage, loads `DEFAULT_USER` from storage.
  6. `exitDemoMode()`: Removes `cadete_os_demo_mode` from LocalStorage.
  7. `updateSettings(partial)`: Updates local state, LocalStorage repository, recalculates trial, and synchronizes to `users/{userId}` in Firestore with `{ merge: true }`.
  8. `updateProfile(partial)`: Merges profile fields, updates LocalStorage, and dispatches to Firestore.
- **Firestore Document Sync on Auth State Change**:
  - On `onAuthStateChanged`, if user is present:
    - Reads `doc(db, 'users', fbUser.uid)`.
    - If document exists, merges data with `DEFAULT_USER.settings`.
    - If document does not exist (new user), creates a new `UserProfile` document with `trialEndsAt = Date.now() + 7 days`, `subscriptionStatus = 'trial'`, and sets it in Firestore.
    - If Firestore fetch fails (e.g. offline), falls back gracefully to `storage.getProfile(fbUser.uid)` without crashing.

---

### 1.5 `src/components/auth/AuthView.tsx` — Access Screen & UX Ergonomics
- **Visual Design**:
  - Root container: `min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-8 select-none`.
  - Brand header: Motorcycle icon (`Bike`) in rounded emerald container + bold "CADETE OS" title.
  - 7-Day Free Trial Banner: Gradient emerald card (`bg-gradient-to-br from-emerald-950/50 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-3xl p-5`) with 3 checkmarked features ("Sincronización en la nube multi-dispositivo", "Rutas automáticas a Google Maps y Waze", "Arqueo de caja y odómetro virtual de aceite").
  - Tab Switcher: "Iniciar Sesión" vs "Crear Cuenta" with `min-h-[44px]` touch targets.
  - "Continuar con Google" Button: `w-full min-h-[52px]` with official Google SVG logo.
  - Form Fields: Name (on register mode), Email (`inputMode="email"`), Password with visibility toggle (`Eye`/`EyeOff`), submit button `size="lg"` (`min-h-[58px]`).
  - Demo Mode Bypass Card: Prominent secondary action button `size="md"` (`min-h-[52px]`) with `Zap` icon.
  - Comprehensive Error Mapping (`getErrorMessage`): Translates all Firebase error codes (`auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found`, `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, `auth/popup-closed-by-user`, `auth/popup-blocked`, `auth/network-request-failed`) to clear Argentine Spanish feedback.

---

## 2. Integration & Wiring Verification

| Component | Integration Points | Verification Status |
|-----------|-------------------|---------------------|
| `src/App.tsx` | - Wraps entire app in `<AuthProvider>` and `<DataProvider>`.<br>- Checks `isLoading`, rendering loading screen with pulse animation.<br>- Renders `<AuthView />` when `!firebaseUser && !isDemoMode`.<br>- Renders `<AppShell>` when authenticated or in demo mode. | Verified |
| `src/components/layout/Header.tsx` | - Displays trial status pill or Demo Mode pill.<br>- Amber Demo pill: "⚡ Modo Demo [Acceder]" linking to `exitDemoMode`.<br>- Emerald/Rose Trial pill: "✨ Prueba: Xd" or "Prueba Vencida".<br>- Logout button (`LogOut` icon) calling `logout()`. | Verified |
| `src/components/layout/SidebarNav.tsx` | - Header shows user `displayName` and `user.settings.cityDefault` badge.<br>- Demo Mode card with "Crear Cuenta" button.<br>- Authenticated card showing `trialInfo.daysRemaining` and user email.<br>- Bottom "Cerrar Sesión" / "Salir de Modo Demo" action button. | Verified |
| `src/components/layout/BottomNav.tsx` | - Mobile navigation bar with 5 touch-optimized tabs (`orders`, `finance`, `businesses`, `maintenance`, `settings`), touch targets `min-h-[52px]` and `min-w-[56px]`. | Verified |
| `src/components/settings/SettingsView.tsx` | - Profile edit form bound to `user.displayName`, `user.settings.cityDefault`, `user.settings.countryDefault`, `user.settings.dailyGoal`, `user.settings.oilChangeThresholdOrders`, `user.settings.oilChangeThresholdDays`.<br>- Submits via `updateProfile()` which writes to local state, LocalStorage, and Firestore. | Verified |

---

## 3. UI Ergonomics & Touch Target Audit

| UI Element | File | Specified Min Height | Measured Height | Compliance |
|------------|------|----------------------|-----------------|------------|
| Google Sign-In Button | `AuthView.tsx:192` | >= 52px | `min-h-[52px]` | 100% |
| Auth Submit Button | `AuthView.tsx:273` | >= 52px | `min-h-[58px]` (size="lg") | 100% |
| Demo Mode Button | `AuthView.tsx:296` | >= 48px | `min-h-[52px]` (size="md") | 100% |
| Auth Mode Switch Tabs | `AuthView.tsx:155` | >= 44px | `min-h-[44px]` | 100% |
| Form Text Inputs | `Input.tsx:33` | >= 52px | `min-h-[52px]` | 100% |
| Standard Action Buttons | `Button.tsx:29` | >= 52px | `min-h-[52px]` (size="md") | 100% |
| BottomNav Action Tabs | `BottomNav.tsx:69` | >= 52px | `min-h-[52px] min-w-[56px]` | 100% |
| Sidebar Navigation Items | `SidebarNav.tsx:135` | >= 52px | `min-h-[52px]` | 100% |

---

## 4. Test Suites & Verification Results

Executed `npm run test` (`vitest run`):
- **17 Test Files**: 100% passing (0 failed).
- **275 Total Tests**: 100% passing (0 failed).
- **Coverage of R1**:
  - `tests/auth.test.ts` (9 tests)
  - `tests/adversarial_auth_trial.test.ts` (34 tests)
  - `tests/m1_demo_ui_adversarial.test.ts` (15 tests)
  - `tests/m1_extensions.test.ts` (22 tests)
  - `tests/m1_challenger_adversarial.test.ts` (20 tests)
  - `tests/firestore_sync.test.ts` (28 tests)
  - `tests/m3_comprehensive_verification.test.ts` (19 tests)

---

## 5. Potential Gaps, Inconsistencies or Type Mismatches
**Zero gaps or type mismatches found.**
- All TypeScript types in `src/types/index.ts` align exactly with Firestore schema and React context types.
- Error handling in `AuthContext` and `firestoreService` includes try-catch blocks and local storage fallbacks to prevent crashes during network drops.
- Offline-first resilience is maintained through dual-layer persistence (LocalStorage immediate write + Firestore background dispatch).
