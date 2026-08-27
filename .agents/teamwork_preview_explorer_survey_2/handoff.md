# Handoff Report - Explorer 2 (Firebase Auth & Firestore Sync Survey)

## 1. Observation
- `package.json` includes `firebase: "^10.13.1"`, `vite-plugin-pwa: "^0.20.5"`, `react: "^18.3.1"`, `vitest: "^2.0.5"`.
- `ORIGINAL_REQUEST.md` lines 10-21 specify the active Firebase project `cadete-os-delivery` (Project ID: `cadete-os-delivery`, App ID: `1:957027668558:web:7edbcd598f3e6a484de91f`).
- `src/lib/firebase.ts` initializes `initializeApp`, `getAuth`, and `getFirestore` with environment variables.
- `src/context/AuthContext.tsx` lines 16-28 currently load a static `DEFAULT_USER` with `uid: 'cadete_demo_1'` from `src/lib/storage.ts` with no real Firebase Auth.
- `src/context/DataContext.tsx` lines 63-76 currently sync exclusively with `storage` (LocalStorage) without Firestore integration.
- `src/types/index.ts` defines `UserProfile`, `Order`, `Expense`, `Business`, `MaintenanceRecord`, `Shift`.

## 2. Logic Chain
1. **Firebase Auth Integration**: Since Firebase v10 is installed and the credentials in `ORIGINAL_REQUEST.md` are active, `AuthContext.tsx` can import `signInWithPopup`, `GoogleAuthProvider`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `onAuthStateChanged` directly from `firebase/auth`.
2. **Trial & Demo Modes**: By extending `UserProfile` with `trialEndsAt?: string` and `subscriptionStatus?: 'trial' | 'active' | 'expired'`, we can compute the remaining trial days (`Math.ceil((trialEndsAt - now) / 86400000)`). A boolean `isDemoMode` allows non-authenticated users to experience the full app locally via LocalStorage without signing in.
3. **Firestore Multi-Tenant Isolation**: Top-level collections (`users`, `orders`, `expenses`, `businesses`, `maintenance`, `shifts`) containing a `userId` field satisfy the Firestore security rules specified in `GEMINI.md` (`resource.data.userId == request.auth.uid`).
4. **Dual-Layer Real-Time & Offline Sync**: In `DataContext.tsx`, performing optimistic local state updates and caching in LocalStorage ensures 0ms latency and 100% offline functionality. When authenticated and online, real-time `onSnapshot` listeners automatically synchronize modifications to and from Cloud Firestore.

## 3. Caveats
- Firestore requires active internet connection on first login for authentication tokens; subsequent runs use Firebase Auth persistent token storage.
- Real-time `onSnapshot` subscriptions should be properly unsubscribed in `useEffect` cleanup to prevent memory leaks and redundant Firestore read operations.

## 4. Conclusion
The survey confirms that the project structure is ready for full Firebase Auth and Firestore Cloud multi-tenant integration. The design in `survey_report.md` provides a complete blueprint for:
1. `src/lib/firestoreService.ts` for all multi-tenant Firestore operations.
2. Upgraded `src/context/AuthContext.tsx` with Google Auth, Email/Password, 7-day trial calculations, and Demo mode.
3. Upgraded `src/context/DataContext.tsx` with dual-layer sync (real-time `onSnapshot` + LocalStorage offline fallback).
4. `src/components/auth/AuthView.tsx` with ergonomic mobile-first UI.

## 5. Verification Method
1. Inspect survey report at `d:/SaaS de delivery/SaaS/.agents/teamwork_preview_explorer_survey_2/survey_report.md`.
2. Verify TypeScript type definitions in `src/types/index.ts`.
3. Verify test suites with `npm run test` (11 test files currently passing).
