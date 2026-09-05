import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile,
  type User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile, TrialInfo } from '../types';
import { storage, DEFAULT_USER } from '../lib/storage';
import { calculateTrialStatus } from '../utils/trial';

const DEMO_STORAGE_KEY = 'cadete_os_demo_mode';

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
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [trialInfo, setTrialInfo] = useState<TrialInfo>(() => calculateTrialStatus(DEFAULT_USER));

  // Sync auth state with Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        setIsDemoMode(false);
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(DEMO_STORAGE_KEY);
          }
        } catch {
          // ignore
        }

        // Fetch or create user document in Firestore
        let profile: UserProfile | null = null;
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as Partial<UserProfile>;
            profile = {
              uid: fbUser.uid,
              email: fbUser.email || data.email || '',
              displayName: data.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Cadete',
              photoURL: data.photoURL || fbUser.photoURL || undefined,
              createdAt: data.createdAt || fbUser.metadata?.creationTime || new Date().toISOString(),
              trialEndsAt: data.trialEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              subscriptionStatus: data.subscriptionStatus || 'trial',
              settings: {
                ...DEFAULT_USER.settings,
                ...(data.settings || {})
              }
            };
          } else {
            // New user registration profile with 7-day trial
            const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            profile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Cadete',
              photoURL: fbUser.photoURL || undefined,
              createdAt: fbUser.metadata?.creationTime || new Date().toISOString(),
              trialEndsAt,
              subscriptionStatus: 'trial',
              settings: { ...DEFAULT_USER.settings }
            };
            await setDoc(userDocRef, profile);
          }
        } catch (e) {
          console.warn('Firestore profile fetch failed, using local/cached profile:', e);
          profile = storage.getProfile(fbUser.uid);
          if (!profile || profile.uid !== fbUser.uid) {
            profile = {
              ...DEFAULT_USER,
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Cadete',
              photoURL: fbUser.photoURL || undefined
            };
          }
        }

        if (profile) {
          setUser(profile);
          storage.saveProfile(fbUser.uid, profile);
          setTrialInfo(calculateTrialStatus(profile));
        }
      } else {
        setFirebaseUser(null);
        try {
          const isDemo = localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
          if (isDemo) {
            const demoProfile = storage.getProfile(DEFAULT_USER.uid);
            setUser(demoProfile);
            setTrialInfo(calculateTrialStatus(demoProfile));
          }
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const errString = String(err);
      if (errString.includes('auth/popup-blocked')) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name?.trim() && cred.user) {
      try {
        await fbUpdateProfile(cred.user, { displayName: name.trim() });
      } catch (e) {
        console.warn('Failed to update Firebase user profile displayName', e);
      }
    }
  };

  const logout = async () => {
    exitDemoMode();
    await signOut(auth);
    setFirebaseUser(null);
    setUser(DEFAULT_USER);
    setTrialInfo(calculateTrialStatus(DEFAULT_USER));
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    const demoProfile = storage.getProfile(DEFAULT_USER.uid);
    setUser(demoProfile);
    setTrialInfo(calculateTrialStatus(demoProfile));
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const updateSettings = async (newSettings: Partial<UserProfile['settings']>) => {
    const updated: UserProfile = {
      ...user,
      settings: {
        ...user.settings,
        ...newSettings
      }
    };
    setUser(updated);
    storage.saveProfile(user.uid, updated);
    setTrialInfo(calculateTrialStatus(updated));

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), { settings: updated.settings }, { merge: true });
      } catch (e) {
        console.warn('Could not sync settings to Firestore:', e);
      }
    }
  };

  const updateProfile = async (partial: Partial<UserProfile>) => {
    const updated: UserProfile = {
      ...user,
      ...partial,
      settings: {
        ...user.settings,
        ...(partial.settings || {})
      }
    };
    setUser(updated);
    storage.saveProfile(user.uid, updated);
    setTrialInfo(calculateTrialStatus(updated));

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), updated, { merge: true });
      } catch (e) {
        console.warn('Could not sync profile to Firestore:', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isDemoMode,
        trialInfo,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        enterDemoMode,
        exitDemoMode,
        updateSettings,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
