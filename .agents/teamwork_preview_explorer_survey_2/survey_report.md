# Cadete OS - Survey Report: Firebase Auth, Firestore Multi-Tenant Sync & DataContext

**Author:** Explorer 2 (Firebase Auth, Data Context & Firestore Multi-tenant Sync)  
**Date:** 2026-08-27  
**Working Directory:** `d:/SaaS de delivery/SaaS/.agents/teamwork_preview_explorer_survey_2`  
**Status:** Completed Analysis  

---

## 1. Executive Summary

This survey analyzes the transition of **Cadete OS** from a local-only prototype into a full-scale, cloud-synchronized, multi-tenant Progressive Web App (PWA) powered by Firebase Authentication and Cloud Firestore (Spark 100% Free Plan), maintaining complete offline resilience.

Key Findings:
1. **Firebase SDK**: `firebase@^10.13.1` (modular SDK v10) is already installed.
2. **Current State**: `AuthContext.tsx` is currently a synchronous mock returning a hardcoded `DEFAULT_USER` (`uid: 'cadete_demo_1'`), and `DataContext.tsx` directly reads/writes to `localStorage` via `src/lib/storage.ts`.
3. **Target Architecture**:
   - **Auth**: Real Firebase Auth supporting Google Popup, Email/Password, an instant "Modo Demo / Probar sin cuenta" toggle, and automatic 7-day trial countdown calculation upon registration.
   - **Firestore Multi-Tenant**: Top-level collections (`users`, `orders`, `expenses`, `businesses`, `maintenance`, `shifts`) partitioned by `userId` field, strictly adhering to Firestore Security Rules.
   - **Dual-Layer Synchronization**: LocalStorage + In-Memory React State provides instantaneous (<16ms) optimistic UI updates, backed by real-time Firestore `onSnapshot` subscriptions when online.

---

## 2. Firebase SDK & Environment Configuration

### 2.1 Dependencies in `package.json`
- `firebase`: `^10.13.1` (Modular SDK with Tree-shaking).
- `vite-plugin-pwa`: `^0.20.5` (Ready for offline Service Worker integration).
- `typescript`: `^5.5.3` (Strict typing, `noUnusedLocals: true`).

### 2.2 Firebase Config (`src/lib/firebase.ts`)
The Firebase configuration in `src/lib/firebase.ts` correctly initializes Firebase with environment variables (`import.meta.env.VITE_FIREBASE_*`). To guarantee that builds succeed and local preview works seamlessly without environment configuration issues, fallbacks should match the active project:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA6Bkrv2EJ_Le6xJ88GkmP8M4a_ckXKvMo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cadete-os-delivery.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cadete-os-delivery",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cadete-os-delivery.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "957027668558",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:957027668558:web:7edbcd598f3e6a484de91f"
};
```

---

## 3. Auth Architecture & Trial Logic

### 3.1 Auth Methods & State Flow
`AuthContext.tsx` will manage four core operational states:
1. `firebaseUser: User | null` (Native Firebase User instance).
2. `user: UserProfile` (Application-level profile stored in Firestore / LocalStorage).
3. `isDemoMode: boolean` (User explicitly chooses to use the app locally without registering).
4. `isLoading: boolean` (Initial auth check and profile retrieval).

```
                 ┌────────────────────────────────────────────────┐
                 │                 App Launch                     │
                 └──────────────────────┬─────────────────────────┘
                                        │
                         onAuthStateChanged(auth)
                                        │
                 ┌──────────────────────┴─────────────────────────┐
                 │                                                │
           [ User Logged In ]                           [ No Firebase User ]
                 │                                                │
       Fetch `users/{uid}`                              Check Demo Mode Flag
                 │                                                │
     ┌───────────┴───────────┐                         ┌──────────┴──────────┐
     │                       │                         │                     │
[ Doc Exists ]      [ New User Doc ]            [ Demo Mode True ]    [ Show AuthView ]
     │                       │                         │                     │
 Load Profile       Create with 7-Day          Load Local Demo        Login / Register
 & Trial State      Trial Period               Profile & Data         or "Modo Demo"
```

### 3.2 7-Day Free Trial Calculation Logic
When any user registers (Google or Email/Password), Firestore records:
- `createdAt`: ISO 8601 string (`new Date().toISOString()`)
- `trialEndsAt`: ISO 8601 string (`new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()`)
- `subscriptionStatus`: `'trial' | 'active' | 'expired'`

#### Calculation Function:
```typescript
export interface TrialInfo {
  isTrialActive: boolean;
  daysRemaining: number;
  isExpired: boolean;
  trialEndsAt: string;
}

export function calculateTrialStatus(profile: UserProfile): TrialInfo {
  const trialEndsAt = profile.trialEndsAt || new Date(new Date(profile.createdAt).getTime() + 7 * 86400000).toISOString();
  const msRemaining = new Date(trialEndsAt).getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isTrialActive = msRemaining > 0;
  const isExpired = !isTrialActive && profile.subscriptionStatus !== 'active';

  return {
    isTrialActive,
    daysRemaining,
    isExpired,
    trialEndsAt
  };
}
```

### 3.3 Demo Mode Architecture
- Couriers on the road must never be blocked if network is unavailable or if they want to test the app without signing up.
- `enterDemoMode()` sets `isDemoMode: true` (persisted in LocalStorage key `cadete_os_demo_mode`).
- In Demo Mode:
  - `user` is set to `DEFAULT_USER` (`uid: 'cadete_demo_1'`).
  - No network calls to Firestore are made.
  - Full CRUD operations operate on LocalStorage.
  - A prominent pill badge ("Modo Demo") in Header/Sidebar gives 1-click access to "Crear Cuenta / Sincronizar".

---

## 4. Firestore Multi-Tenant Schema Design

All application collections are top-level with mandatory `userId` field to strictly enforce Firestore Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{collection}/{docId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### 4.1 Schema Specifications

| Collection | Doc ID Pattern | Fields & Types | Indexes / Query |
| :--- | :--- | :--- | :--- |
| **`users`** | `{uid}` | `uid: string`<br>`email: string`<br>`displayName: string`<br>`photoURL?: string`<br>`createdAt: string`<br>`trialEndsAt: string`<br>`subscriptionStatus: string`<br>`settings: UserProfileSettings` | Single doc get: `doc(db, 'users', uid)` |
| **`orders`** | `ord_{timestamp}_{rnd}` | `id: string`<br>`userId: string`<br>`date: string` (YYYY-MM-DD)<br>`timestamp: number`<br>`businessId: string`<br>`businessName: string`<br>`address?: string`<br>`customerPhone?: string`<br>`zone: ZoneType`<br>`amount: number`<br>`paidBy: 'customer' \| 'business'`<br>`paymentMethod: 'cash' \| 'transfer'`<br>`settled: boolean`<br>`settledAt?: string`<br>`notes?: string` | `where("userId", "==", uid)` |
| **`expenses`** | `exp_{timestamp}_{rnd}` | `id: string`<br>`userId: string`<br>`date: string` (YYYY-MM-DD)<br>`timestamp: number`<br>`category: ExpenseCategory`<br>`description: string`<br>`amount: number`<br>`paymentMethod: 'cash' \| 'transfer'` | `where("userId", "==", uid)` |
| **`businesses`** | `biz_{timestamp}_{rnd}` | `id: string`<br>`userId: string`<br>`name: string`<br>`phone?: string`<br>`defaultPrices: { plantaUrbana, barrioCerca, barrioLejos }`<br>`paymentCycle: PaymentCycle`<br>`active: boolean`<br>`createdAt: string` | `where("userId", "==", uid)` |
| **`maintenance`** | `maint_{timestamp}_{rnd}` | `id: string`<br>`userId: string`<br>`date: string`<br>`timestamp: number`<br>`item: string`<br>`cost: number`<br>`isOilChange: boolean`<br>`ordersSnapshot: number` | `where("userId", "==", uid)` |
| **`shifts`** | `shift_{timestamp}_{rnd}` | `id: string`<br>`userId: string`<br>`date: string`<br>`startTime?: string`<br>`endTime?: string`<br>`startingCash?: number`<br>`status: 'in_progress' \| 'completed'`<br>`createdAt: number` | `where("userId", "==", uid)` |

### 4.2 Spark Free Plan Optimization
- **Reads Quota**: 50,000 / day.
- **Writes Quota**: 20,000 / day.
- **Optimization**: By using `onSnapshot` per collection with `where("userId", "==", uid)`, Firestore maintains persistent local WebSocket listener metadata. Changes only bill for modified/added documents, avoiding full collection scans. LocalStorage caching eliminates duplicate reads on tab switches and page reloads.

---

## 5. DataContext Dual-Layer Sync Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            User Action (e.g. Add Order)                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ 1. Optimistic React State Update (setOrders) -> 0ms UI Feedback          │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ 2. LocalStorage Persistence (storage.saveOrders) -> Instant Offline Cache  │
 └─────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ 3. If Authenticated: firestoreService.saveDocument('orders', order)        │
 │    - If online: Written to Cloud Firestore immediately                    │
 │    - If offline: Queued in Firestore SDK local buffer                     │
 └───────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Real-time Listeners (`onSnapshot`)
When user is authenticated:
1. `DataContext` attaches 5 subscriptions to Firestore.
2. Upon receiving remote changes (e.g. synced from another device or finished offline queue):
   - Updates React state.
   - Synchronizes LocalStorage cache for that `userId`.
3. When user logs out or switches to Demo Mode, all subscriptions are safely unsubscribed.

### 5.2 Atomic Batch Operations
When settling multiple pending orders with a business (`settleOrdersBatch`):
- Uses Firestore `writeBatch(db)` to commit all updates in a single network round-trip.
- Optimistically marks all selected orders as `settled: true` in local state and LocalStorage.

---

## 6. Specification of `src/lib/firestoreService.ts`

```typescript
// Proposed API Contract for src/lib/firestoreService.ts

export interface FirestoreService {
  // Profile
  getUserProfile(userId: string): Promise<UserProfile | null>;
  createInitialUserProfile(firebaseUser: User): Promise<UserProfile>;
  saveUserProfile(profile: UserProfile): Promise<void>;

  // Generic Subscriptions
  subscribeCollection<T>(
    collectionName: string,
    userId: string,
    onData: (items: T[]) => void,
    onError?: (err: Error) => void
  ): () => void;

  // Generic CRUD
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

  // Specialized Batching
  batchSettleOrders(
    orderIds: string[],
    settledAt: string
  ): Promise<void>;

  // Seeding
  seedInitialUserData(userId: string): Promise<void>;
}
```

---

## 7. Action Plan for Implementation

1. **Update `src/types/index.ts`**:
   - Add `trialEndsAt?: string;` and `subscriptionStatus?: 'trial' | 'active' | 'expired';` to `UserProfile`.
   - Add `photoURL?: string;` to `UserProfile`.
2. **Implement `src/lib/firestoreService.ts`**:
   - Implement all CRUD, subscription, and batch operations using modular Firebase Firestore (`doc`, `collection`, `query`, `where`, `onSnapshot`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`).
3. **Upgrade `src/context/AuthContext.tsx`**:
   - Integrate `GoogleAuthProvider`, `signInWithPopup`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, and `onAuthStateChanged`.
   - Implement `isDemoMode`, `enterDemoMode()`, `exitDemoMode()`.
   - Integrate `calculateTrialStatus`.
4. **Upgrade `src/context/DataContext.tsx`**:
   - Connect `onSnapshot` real-time listeners when user is authenticated.
   - Maintain LocalStorage as instant local cache and optimistic write buffer.
   - Seamlessly switch between authenticated Firestore sync and local Demo storage.
5. **Create `src/components/auth/AuthView.tsx`**:
   - Dark theme (`bg-zinc-950`), large touch targets (>= 52px).
   - Google login button, Email/Password login & register toggle.
   - 7-Day trial banner and "Modo Demo / Probar sin cuenta" bypass button.
6. **Update Navigation & Header**:
   - Display User Profile / Trial Days countdown in Header and Sidebar.
   - Provide "Cerrar Sesión" button and Demo Mode switch.
7. **Verify Tests & Build**:
   - Add unit tests for `calculateTrialStatus` and Firestore mock sync.
   - Verify `npm run build` and `npm run test`.
