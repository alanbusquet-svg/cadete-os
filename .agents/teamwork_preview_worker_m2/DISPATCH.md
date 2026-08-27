## 2026-08-27T14:40:00Z
You are Worker 2 (Firestore Multi-Tenant Cloud Sync Implementation).
Your working directory is: d:/SaaS de delivery/SaaS/.agents/teamwork_preview_worker_m2
Authoritative request: d:/SaaS de delivery/SaaS/ORIGINAL_REQUEST.md
PROJECT plan: d:/SaaS de delivery/SaaS/PROJECT.md
Survey reports:
- d:/SaaS de delivery/SaaS/.agents/teamwork_preview_explorer_survey_2/survey_report.md
- d:/SaaS de delivery/SaaS/.agents/teamwork_preview_explorer_survey_1/survey_report.md
Domain skill: d:\SaaS de delivery\SaaS\.agent\skills\skill-saas-delivery\SKILL.md

Scope & Exclusively Owned Files for Milestone 2:
- `src/lib/firestoreService.ts`: Create comprehensive Firestore data service:
  * Top-level collections: `users`, `orders`, `expenses`, `businesses`, `maintenance`, `shifts`.
  * Multi-tenant query partitioning: `query(collection(db, collectionName), where("userId", "==", userId))`.
  * Typed CRUD methods:
    - `saveDocument<T extends { id: string; userId: string }>(collectionName: string, data: T): Promise<void>`
    - `updateDocument<T>(collectionName: string, docId: string, partial: Partial<T>): Promise<void>`
    - `deleteDocument(collectionName: string, docId: string): Promise<void>`
    - `subscribeCollection<T>(collectionName: string, userId: string, onData: (items: T[]) => void, onError?: (err: Error) => void): () => void` (returns unsubscribe function).
    - `batchSettleOrders(orderIds: string[], settledAt: string): Promise<void>` (uses Firestore `writeBatch(db)` to update `settled: true, settledAt` in an atomic transaction).
    - User Profile helpers (`getUserProfile`, `saveUserProfile`).
- `src/context/DataContext.tsx`: Dual-Layer Sync Architecture:
  * When user is in Demo Mode (`isDemoMode || user.uid === 'cadete_demo_1'`), operate against `localStorage` (via `src/lib/storage.ts`) with no network overhead.
  * When user is authenticated (`!isDemoMode && user.uid !== 'cadete_demo_1'`):
    - On mount / auth change: populate local state from `localStorage` immediately (0ms UI latency), and simultaneously attach real-time Firestore listeners (`firestoreService.subscribeCollection`) for `orders`, `expenses`, `businesses`, `maintenance`, `shifts`.
    - When real-time listener fires: update React state and update `localStorage` cache for that `userId`.
    - On add/update/delete actions: optimistically update React state + write to `localStorage` + asynchronously execute `firestoreService` operation with defensive error handling (so network drop doesn't crash UI).
    - Settle orders batch: optimistically update state + `localStorage` + execute `firestoreService.batchSettleOrders`.
    - Properly clean up all 5 `onSnapshot` listeners when unmounting or switching users.
- `tests/firestore_sync.test.ts`:
  * Write comprehensive tests covering:
    - `firestoreService` CRUD operations, batch settle logic, and query construction.
    - DataContext dual-layer sync (optimistic update, local storage sync, remote snapshot absorption, error resilience).
    - Multi-tenant isolation verification (data tagged with `userId`).
