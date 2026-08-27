# Survey Report: PWA, Manifest, Build & Deployment Configuration (Cadete OS)

**Author:** Explorer 3 (PWA, Service Worker, Manifest, Build & Deployment Configuration)  
**Date:** 2026-08-27  
**Workspace:** `d:/SaaS de delivery/SaaS`  
**Status:** Complete Survey & Architectural Audit  

---

## 1. Executive Summary

Cadete OS is a mobile-first Progressive Web App (PWA) designed for couriers and motorcycle delivery drivers. This survey comprehensively assesses the current state of PWA capabilities, service worker caching, web app manifest, build/test infrastructure, and deployment setups for Vercel and Firebase Hosting.

### Key Highlights
1. **PWA Dependency vs Configuration**: `vite-plugin-pwa` (`^0.20.5`) is installed in `package.json`, but **not yet activated or configured** in `vite.config.ts`.
2. **Manifest & Metadata**: `public/manifest.json` exists with core fields (`name`, `display: standalone`, `theme_color: #09090b`), but lacks full installability properties (`id`, `lang`, `categories`, `scope`) and PNG splash/touch icon fallbacks in `index.html`.
3. **Build & Test Pipeline**: TypeScript strictness (`strict: true`, `noUnusedLocals: true`, `noUncheckedIndexedAccess: true`) and Vitest configuration (`tests/setup.ts`) are well-structured.
4. **Deployment Artifacts**: `vercel.json`, `firebase.json`, and `.firebaserc` do not exist yet in the project root and must be created to ensure proper SPA routing, service worker header controls, and cloud deployment. `firestore.rules` is already present and correctly implements multi-tenant isolation by `userId`.

---

## 2. PWA & Offline-First Caching Status

### 2.1 Dependency Inspection (`package.json`)
- **Observation**: `vite-plugin-pwa` is present in `devDependencies`:
  ```json
  "devDependencies": {
    "vite-plugin-pwa": "^0.20.5",
    "vite": "^5.4.2",
    "vitest": "^2.0.5"
  }
  ```
- **Evaluation**: The required tooling is already installed.

### 2.2 Vite Plugin Configuration (`vite.config.ts`)
- **Current Content** (`vite.config.ts:1-16`):
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
- **Gaps & Required Modifications**:
  1. `VitePWA` from `vite-plugin-pwa` is missing from `plugins`.
  2. Missing Workbox offline cache configuration (`globPatterns`, `navigateFallback: '/index.html'`, runtime caching for CDN fonts/icons).
  3. `registerType` should be set to `'autoUpdate'` to allow zero-friction background updates for delivery riders.

### 2.3 Proposed `vite.config.ts` Configuration
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/',
        name: 'Cadete OS - Sistema Operativo para Repartidores',
        short_name: 'Cadete OS',
        description: 'Sistema operativo móvil y gestión de viajes para cadetes y repartidores en moto',
        lang: 'es-AR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#09090b',
        theme_color: '#09090b',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
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

### 2.4 TypeScript Environment Reference (`src/vite-env.d.ts`)
- **Current Content**:
  ```typescript
  /// <reference types="vite/client" />
  ```
- **Required Update**: Add `/// <reference types="vite-plugin-pwa/client" />` so TypeScript recognizes PWA virtual modules without compilation errors.

---

## 3. Web App Manifest & Installability Audit

### 3.1 Current `public/manifest.json`
```json
{
  "name": "Cadete OS",
  "short_name": "CadeteOS",
  "description": "Sistema operativo móvil y gestión de viajes para cadetes y repartidores en moto",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/favicon.svg",
      "sizes": "192x192 512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

### 3.2 HTML Head Tags (`index.html`)
- **Current Tags**:
  ```html
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="theme-color" content="#09090b" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="manifest" href="/manifest.json" />
  <title>Cadete OS - Sistema Operativo para Repartidores</title>
  ```
- **Improvements for 100% Android & iOS Installability**:
  - Add `<meta name="apple-mobile-web-app-title" content="Cadete OS" />`
  - Add `<link rel="apple-touch-icon" href="/favicon.svg" />`
  - Add `<meta name="description" content="Sistema operativo móvil y gestión de viajes para cadetes y repartidores en moto" />`

---

## 4. Build, Type-Check & Test Infrastructure

### 4.1 Build Scripts (`package.json`)
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest run"
}
```

### 4.2 TypeScript Strictness (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```
- **Verification Rule**: All new components (`AuthView.tsx`, `firestoreService.ts`, updated `AuthContext.tsx`, `DataContext.tsx`) must strictly respect `noUnusedLocals`, `noUnusedParameters`, and `noUncheckedIndexedAccess`.

### 4.3 Test Suite Verification Plan
- Existing test suites: 12 files in `tests/` covering adversarial challenge scenarios, GPS calculations, navigation, WhatsApp formatting, and financial summaries.
- Test runner: Vitest (`vitest run`) using `tests/setup.ts` (localStorage polyfill).
- Requirements for R1/R2/R3 test extensions:
  - Add unit tests for Auth state transitions (`AuthContext` with mock Firebase / Demo mode).
  - Add unit tests for Firestore service methods (`firestoreService.ts`) with mock Firestore collections.
  - Verify that offline fallback to LocalStorage works seamlessly when disconnected.

---

## 5. Deployment Architecture & Configuration

### 5.1 Vercel Deployment Configuration
- **Team**: `noxus-stock` (`team_usq9cxj5sLeSVEYABuamco67`)
- **Project Name**: `cadete-os` or `cadete-os-delivery`
- **Framework Preset**: `vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Required `vercel.json`**:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/(assets/.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 5.2 Environment Variables Matrix (Vercel & Local `.env`)
| Variable Name | Production Value | Purpose |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyA6Bkrv2EJ_Le6xJ88GkmP8M4a_ckXKvMo` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `cadete-os-delivery.firebaseapp.com` | Auth OAuth redirect domain |
| `VITE_FIREBASE_PROJECT_ID` | `cadete-os-delivery` | Firestore project identifier |
| `VITE_FIREBASE_STORAGE_BUCKET` | `cadete-os-delivery.firebasestorage.app` | Storage bucket identifier |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `957027668558` | Cloud messaging sender ID |
| `VITE_FIREBASE_APP_ID` | `1:957027668558:web:7edbcd598f3e6a484de91f` | Firebase Web App ID |

### 5.3 Firebase Hosting & Rules Configuration
- **Required `firebase.json`**:
```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```
- **Required `.firebaserc`**:
```json
{
  "projects": {
    "default": "cadete-os-delivery"
  }
}
```

### 5.4 Firestore Security Rules (`firestore.rules`) Audit
- **Current Rules in Root**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile document: authenticated user can only access own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // All collection documents (businesses, orders, expenses, maintenance, shifts)
    match /{collection}/{docId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```
- **Audit Findings**:
  - Multi-tenant tenant isolation is strictly enforced.
  - No user can read or write documents belonging to another user.
  - Creating a document requires `request.resource.data.userId == request.auth.uid`.
  - Reading or modifying an existing document requires `resource.data.userId == request.auth.uid`.
  - Profile documents in `/users/{userId}` require `request.auth.uid == userId`.

---

## 6. Implementation Checklist & Recommendations

1. **PWA Integration**:
   - Update `vite.config.ts` to import and configure `VitePWA`.
   - Update `src/vite-env.d.ts` with `vite-plugin-pwa/client` type reference.
   - Update `index.html` with apple-touch-icon, apple-mobile-web-app-title, and meta description.
2. **Deployment Artifacts**:
   - Create `vercel.json` with SPA rewrite and Cache-Control headers for `sw.js`.
   - Create `firebase.json` and `.firebaserc`.
3. **Build & Quality Gates**:
   - Execute `npm run build` (`tsc && vite build`) to ensure 0 TypeScript errors.
   - Execute `npm run test` (`vitest run`) across all suites.
