# Project: Cadete OS - Integration & Deployment

## Architecture
Cadete OS is a mobile-first, offline-resilient Progressive Web App (PWA) built with React 18, Vite 5, TypeScript strict mode, and Tailwind CSS. It leverages Firebase Authentication and Cloud Firestore for multi-tenant cloud synchronization while maintaining instantaneous (<16ms) UI feedback via optimistic local state and LocalStorage caching.

### Architecture Layers
1. **Presentation Layer (`src/components/`)**:
   - `auth/AuthView.tsx`: Dark-mode native auth screen with Google Sign-In, Email/Password, 7-day trial banner, and Demo Mode bypass.
   - `layout/`: AppShell, Header, SidebarNav, BottomNav with user profile, trial countdown pill, and logout triggers.
   - `orders/`, `finance/`, `businesses/`, `maintenance/`, `settings/`: Touch-optimized domain screens.
2. **State & Context Layer (`src/context/`, `src/hooks/`)**:
   - `AuthContext.tsx`: Firebase Auth state (`onAuthStateChanged`), Google/Email login, 7-day trial calculation, Demo Mode management.
   - `DataContext.tsx`: Dual-layer state manager (Optimistic React State + LocalStorage immediate offline cache + real-time Firestore `onSnapshot` listeners when authenticated).
3. **Data & Infrastructure Layer (`src/lib/`, `src/utils/`)**:
   - `firebase.ts`: Modular Firebase App, Auth, and Firestore initialization with robust environment variable fallbacks.
   - `firestoreService.ts`: Multi-tenant typed CRUD and atomic batch operations partitioned by `userId`.
   - `storage.ts`: LocalStorage key-value repository partitioned by `userId`.
   - `calculations.ts`, `formatting.ts`, `navigation.ts`, `whatsapp.ts`, `trial.ts`: Pure domain logic.
4. **PWA & Offline Layer**:
   - `vite-plugin-pwa`: Workbox offline asset caching, auto-updating Service Worker (`sw.js`), Web App Manifest.
5. **Deployment Layer**:
   - `vercel.json`: Vercel SPA routing and service worker Cache-Control headers.
   - `firebase.json` & `firestore.rules`: Firebase Hosting and Firestore security rules isolating collections by `userId`.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Firebase App & Auth Init | Modular Firebase SDK init with robust env fallbacks | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Google Popup Auth | One-tap Google Sign-In via `signInWithPopup` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Email & Password Auth | Sign-in and sign-up with password validation & error handling | M1 | ORIGINAL_REQUEST §R1 |
| 4 | 7-Day Free Trial Logic | Automatic trial calculation, expiration detection, status badges | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Demo Mode Bypass | Instant trial/offline usage without mandatory registration | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Auth & Profile UI (AuthView) | Dark mode high-contrast auth screen with >=52px touch targets | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Header & Sidebar Profile Info | User name, trial countdown badge, demo mode switch, logout button | M1 | ORIGINAL_REQUEST §R1 |
| 8 | Firestore Data Service | Typed CRUD for users, orders, expenses, businesses, maintenance, shifts | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Firestore Real-Time Listeners | `onSnapshot` subscriptions sync remote changes to state & LocalStorage | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Batch Settlement Sync | Atomic `writeBatch` in Firestore for settling multiple business orders | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Dual-Layer Offline Fallback | Seamless fallback to LocalStorage when offline or in Demo Mode | M2 | ORIGINAL_REQUEST §R2 |
| 12 | PWA Plugin & Workbox Setup | `vite-plugin-pwa` in `vite.config.ts` with runtime caching | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Service Worker & Manifest | Auto-update SW, installable manifest, iOS/Android meta tags | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Strict TypeScript Verification | 0 TS errors under `noUnusedLocals`, `noUncheckedIndexedAccess`, `strict` | M4 | ORIGINAL_REQUEST §R4 |
| 15 | Vitest Test Suite Expansion | Maintain 100% pass rate across all 162+ existing and new test suites | M4 | ORIGINAL_REQUEST §R4 |
| 16 | Vercel Deployment & Config | `vercel.json`, team `noxus-stock`, env variables, live URL verification | M5 | ORIGINAL_REQUEST §R5 |
| 17 | Firebase Hosting Deployment | `firebase.json`, `.firebaserc`, production build deployment | M5 | ORIGINAL_REQUEST §R5 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Firebase Auth & Access Screen | AuthContext, AuthView, Google/Email Auth, 7-Day Trial, Demo Mode, Header Profile | none | DONE |
| M2 | Firestore Multi-Tenant Cloud Sync | firestoreService.ts, DataContext cloud sync & real-time listeners, LocalStorage fallback | M1 | DONE |
| M3 | PWA & Service Worker Integration | vite.config.ts (vite-plugin-pwa), manifest, icons, index.html meta tags, vite-env.d.ts | none | DONE |
| M4 | Quality, TypeScript & Test Hardening | Vitest test suites (275 tests) passing 100%, strict TS compilation (0 errors) | M1, M2, M3 | DONE |

---

## Interface Contracts

### AuthContext ↔ App / UI
```typescript
export interface AuthContextType {
  user: UserProfile;
  firebaseUser: User | null;
  isLoading: boolean;
  isDemoMode: boolean;
  trialInfo: TrialInfo;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  updateSettings: (settings: Partial<UserProfile['settings']>) => Promise<void>;
}
```

### Firestore Service (`src/lib/firestoreService.ts`)
```typescript
export interface FirestoreService {
  getUserProfile(userId: string): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  createInitialUserProfile(firebaseUser: User): Promise<UserProfile>;
  
  subscribeCollection<T>(
    collectionName: string,
    userId: string,
    onData: (items: T[]) => void,
    onError?: (err: Error) => void
  ): () => void;

  saveDocument<T extends { id: string; userId: string }>(
    collectionName: string,
    data: T
  ): Promise<void>;

  updateDocument<T>(
    collectionName: string,
    docId: string,
    partial: Partial<T>
  ): Promise<void>;

  deleteDocument(
    collectionName: string,
    docId: string
  ): Promise<void>;

  batchSettleOrders(
    orderIds: string[],
    settledAt: string
  ): Promise<void>;
}
```

---

## Code Layout
- `src/types/index.ts`: Unified data models and interfaces.
- `src/lib/firebase.ts`: Firebase App, Auth, Firestore instances.
- `src/lib/firestoreService.ts`: Firestore cloud database operations.
- `src/lib/storage.ts`: LocalStorage offline repository.
- `src/utils/trial.ts`: 7-day trial calculation utilities.
- `src/context/AuthContext.tsx`: Authentication state provider.
- `src/context/DataContext.tsx`: Application data & sync provider.
- `src/components/auth/AuthView.tsx`: Login / Register / Demo mode screen.
- `src/components/layout/`: AppShell, Header, SidebarNav, BottomNav.
- `tests/`: Automated Vitest test suites.
- `vite.config.ts`: Vite + React + PWA plugin configuration.
- `vercel.json`: Vercel routing and cache headers.
- `firebase.json` & `.firebaserc`: Firebase Hosting configuration.
