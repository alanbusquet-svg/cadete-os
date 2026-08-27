# Original User Request

## 2026-08-27T14:19:00Z

Desarrollo e integración integral de Cadete OS: Firebase Auth real + Firestore Cloud Multi-tenant + Pantalla de Login/Auth con 7 días de prueba gratis + PWA completa (Service Worker y manifest) + Deploy a Vercel y Firebase Hosting.

Working directory: d:/SaaS de delivery/SaaS
Integrity mode: development

## Contexto y Credenciales Activas
- Proyecto Firebase creado y configurado:
  - Project ID: `cadete-os-delivery`
  - API Key: `AIzaSyA6Bkrv2EJ_Le6xJ88GkmP8M4a_ckXKvMo`
  - Auth Domain: `cadete-os-delivery.firebaseapp.com`
  - Storage Bucket: `cadete-os-delivery.firebasestorage.app`
  - Messaging Sender ID: `957027668558`
  - App ID: `1:957027668558:web:7edbcd598f3e6a484de91f`
  - Archivo `.env` ya creado en `d:\SaaS de delivery\SaaS\.env`
- Firebase Firestore (default) y Firebase Authentication (Google + Email/Contraseña) YA habilitados por el usuario.
- Vercel Team ID: `team_usq9cxj5sLeSVEYABuamco67` (slug: `noxus-stock`).

## Requirements

### R1. Firebase Authentication & Pantalla de Acceso (Login / Registro / Onboarding)
- Implementar autenticación real con Firebase (`signInWithPopup` con Google, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `onAuthStateChanged`) en `src/context/AuthContext.tsx`.
- Crear vista de Login/Registro ergonómica (`src/components/auth/AuthView.tsx`) en Dark Mode nativo de alto contraste (`bg-zinc-950`), touch targets >= 52px:
  - Botón grande "Continuar con Google".
  - Formulario de Email + Contraseña con toggle para Iniciar Sesión o Crear Cuenta.
  - Banner destacado: "🚀 7 Días de Prueba Gratis — Sin tarjeta de crédito".
  - Opción de "Modo Demo / Probar sin cuenta" (para seguir permitiendo uso offline/local sin fricción).
- Si el usuario está autenticado, cargar su `UserProfile` desde Firestore (o crearlo si es nuevo usuario con fecha de trial de 7 días).
- En el Header o Sidebar, botón para cerrar sesión / ver perfil.

### R2. Sincronización en la Nube con Firestore (Multi-tenant por `userId`)
- Crear servicio de datos Firestore en `src/lib/firestoreService.ts` para CRUD de: `orders`, `expenses`, `businesses`, `maintenance`, `shifts`, `userProfile`.
- En `src/context/DataContext.tsx`, si el usuario está autenticado, sincronizar en tiempo real con Firestore (`onSnapshot` o lectura/escritura) y mantener LocalStorage como respaldo/cache offline inmediato.
- Si el usuario no está logueado (modo demo), usar LocalStorage como hasta ahora.

### R3. PWA Completa & Service Worker (Offline-First)
- Configurar `vite-plugin-pwa` en `vite.config.ts` y dependencias necesarias.
- Generar Service Worker que guarde assets estáticos y permita que la app cargue instantáneamente aún sin conexión a internet.
- Verificar `public/manifest.json` para que sea 100% instalable en Android/iOS ("Agregar a la pantalla principal").

### R4. Verificación de Calidad y Tests
- `npm run build` (`tsc && vite build`) debe compilar con 0 errores de TypeScript (`noUnusedLocals`, `strict`).
- `npm run test` debe ejecutar y pasar todas las suites de pruebas (162+ tests existentes y nuevos tests para Auth/Firestore/PWA).

### R5. Despliegue en Vercel y Firebase
- Crear proyecto y desplegar en Vercel (`cadete-os` o `cadete-os-delivery`) en la cuenta del usuario (`noxus-stock`).
- Asegurar que la URL pública quede funcionando con las variables de entorno de Firebase.

## Acceptance Criteria
- [ ] Compilación estricta `npm run build` con código 0 y 0 advertencias de TS.
- [ ] Todas las suites de Vitest pasando al 100%.
- [ ] Login con Google y Email/Password funcional, con manejo de errores claro.
- [ ] Datos de pedidos, gastos, comercios y turnos persistidos por `userId` en Firestore.
- [ ] PWA instalable con Service Worker activo.
- [ ] Proyecto desplegado y visible en el panel de Vercel con URL pública accesible.
