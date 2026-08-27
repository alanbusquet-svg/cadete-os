## 2026-08-27T14:27:02Z
You are Worker 1 (Firebase Auth & Access Screen Implementation).
Your working directory is: d:/SaaS de delivery/SaaS/.agents/teamwork_preview_worker_m1
Authoritative request: d:/SaaS de delivery/SaaS/ORIGINAL_REQUEST.md
PROJECT plan: d:/SaaS de delivery/SaaS/PROJECT.md
Survey reports:
- d:/SaaS de delivery/SaaS/.agents/teamwork_preview_explorer_survey_2/survey_report.md
- d:/SaaS de delivery/SaaS/.agents/teamwork_preview_explorer_survey_1/survey_report.md
Domain skill: d:\SaaS de delivery\SaaS\.agent\skills\skill-saas-delivery\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusively Owned Files for Milestone 1:
- `src/types/index.ts`: Update `UserProfile` with `photoURL?: string; trialEndsAt?: string; subscriptionStatus?: 'trial' | 'active' | 'expired';`. Define `TrialInfo` interface.
- `src/utils/trial.ts`: Create trial calculation utility: `calculateTrialStatus(profile: UserProfile): TrialInfo` (7-day trial from `trialEndsAt` or `createdAt`).
- `src/lib/firebase.ts`: Ensure Firebase App, Auth, and Firestore instances are exported with fallback values matching the project `cadete-os-delivery`.
- `src/context/AuthContext.tsx`: Full implementation of Firebase Authentication:
  * `signInWithGoogle` using `GoogleAuthProvider` & `signInWithPopup(auth, provider)`.
  * `signInWithEmail` using `signInWithEmailAndPassword(auth, email, password)`.
  * `signUpWithEmail` using `createUserWithEmailAndPassword(auth, email, password)` (and setting `displayName` or creating profile).
  * `logout` using `signOut(auth)`.
  * `isDemoMode`, `enterDemoMode()`, `exitDemoMode()`.
  * `onAuthStateChanged(auth, ...)` listener to synchronize `firebaseUser`, calculate `trialInfo`, and load user profile (or fallback to local default user).
  * `updateSettings(settings)`.
- `src/components/auth/AuthView.tsx`: Create complete Auth screen in dark mode native (`bg-zinc-950`, cards `bg-zinc-900`, `border-zinc-800`):
  * Large "Continuar con Google" button (>=52px touch target) with Google icon.
  * Email + Password form with toggle between "Iniciar Sesión" and "Crear Cuenta".
  * Clear validation & error feedback (e.g. invalid credentials, weak password, user not found).
  * Prominent banner: "🚀 7 Días de Prueba Gratis — Sin tarjeta de crédito".
  * Secondary button: "⚡ Probar en Modo Demo (sin registrarse)".
- `src/App.tsx`: Integrate `AuthView` so if `!firebaseUser && !isDemoMode && !isLoading`, it renders `AuthView`.
- `src/components/layout/Header.tsx` & `src/components/layout/SidebarNav.tsx`:
  * Add user profile badge, 7-day trial countdown chip (e.g., "Prueba: 6 días"), Demo mode indicator ("Modo Demo"), and "Cerrar Sesión" / "Crear Cuenta" buttons.

Verification Requirements:
1. Run `npm run build` (`tsc && vite build`) to confirm 0 TypeScript errors.
2. Run `npm run test` (`vitest run`) to ensure all existing tests pass and write new tests in `tests/auth.test.ts` verifying trial calculation, demo mode state, and AuthContext methods.
3. Write your completion report to `d:/SaaS de delivery/SaaS/.agents/teamwork_preview_worker_m1/handoff.md`.
4. Send a message to parent with the summary and verification results.
