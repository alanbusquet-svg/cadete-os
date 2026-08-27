import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase Production & Local Spark Fallback Config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA6Bkrv2EJ_Le6xJ88GkmP8M4a_ckXKvMo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cadete-os-delivery.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cadete-os-delivery",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cadete-os-delivery.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "957027668558",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:957027668558:web:7edbcd598f3e6a484de91f"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export default app;
