// ==========================================
// CADETE OS - FIRESTORE MULTI-TENANT SERVICE
// ==========================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
  type UpdateData,
  type DocumentData
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';
import type { UserProfile } from '../types';
import { DEFAULT_USER, INITIAL_BUSINESSES, getInitialOrders, getInitialExpenses, INITIAL_MAINTENANCE } from './storage';

export const COLLECTIONS = {
  USERS: 'users',
  ORDERS: 'orders',
  EXPENSES: 'expenses',
  BUSINESSES: 'businesses',
  MAINTENANCE: 'maintenance',
  SHIFTS: 'shifts'
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * Retrieves the user profile document from Firestore.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  const snapshot = await getDoc(userDocRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data() as Partial<UserProfile>;
  return {
    uid: userId,
    email: data.email || '',
    displayName: data.displayName || 'Cadete',
    photoURL: data.photoURL,
    createdAt: data.createdAt || new Date().toISOString(),
    trialEndsAt: data.trialEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: data.subscriptionStatus || 'trial',
    settings: {
      ...DEFAULT_USER.settings,
      ...(data.settings || {})
    }
  };
}

/**
 * Saves or updates a user profile in Firestore.
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (!profile.uid) throw new Error('Cannot save user profile without uid');
  const userDocRef = doc(db, COLLECTIONS.USERS, profile.uid);
  await setDoc(userDocRef, profile, { merge: true });
}

/**
 * Creates an initial UserProfile for a newly authenticated Firebase user with 7 days free trial.
 */
export async function createInitialUserProfile(firebaseUser: User): Promise<UserProfile> {
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const profile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Cadete',
    photoURL: firebaseUser.photoURL || undefined,
    createdAt: firebaseUser.metadata?.creationTime || new Date().toISOString(),
    trialEndsAt,
    subscriptionStatus: 'trial',
    settings: { ...DEFAULT_USER.settings }
  };
  await saveUserProfile(profile);
  return profile;
}

/**
 * Persists any generic multi-tenant document (order, expense, business, etc.) into Firestore.
 */
export async function saveDocument<T extends { id: string; userId: string }>(
  collectionName: string,
  data: T
): Promise<void> {
  if (!data.id) throw new Error(`Cannot save document to ${collectionName} without id`);
  if (!data.userId) throw new Error(`Cannot save document to ${collectionName} without userId`);
  const docRef = doc(db, collectionName, data.id);
  await setDoc(docRef, data, { merge: true });
}

/**
 * Updates specific fields of an existing document in Firestore.
 */
export async function updateDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  partial: Partial<T>
): Promise<void> {
  if (!docId) throw new Error(`Cannot update document in ${collectionName} without docId`);
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, partial as UpdateData<DocumentData>);
}

/**
 * Deletes a document from Firestore.
 */
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  if (!docId) throw new Error(`Cannot delete document in ${collectionName} without docId`);
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

/**
 * Subscribes to real-time updates for a multi-tenant collection filtered by userId.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeCollection<T>(
  collectionName: string,
  userId: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const q = query(collection(db, collectionName), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data
        } as T;
      });
      onData(items);
    },
    (err) => {
      console.warn(`Firestore subscription error for collection "${collectionName}":`, err);
      onError?.(err);
    }
  );
}

/**
 * Settles multiple pending orders atomically using a Firestore write batch.
 */
export async function batchSettleOrders(orderIds: string[], settledAt: string): Promise<void> {
  if (!orderIds || orderIds.length === 0) return;

  const batch = writeBatch(db);
  for (const orderId of orderIds) {
    if (orderId) {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      batch.update(orderRef, {
        settled: true,
        settledAt
      });
    }
  }

  await batch.commit();
}

/**
 * Seeds default starting data for a user in Firestore if they have no businesses.
 */
export async function seedInitialUserData(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const bizQuery = query(collection(db, COLLECTIONS.BUSINESSES), where('userId', '==', userId));
    const bizSnapshot = await getDocs(bizQuery);

    if (bizSnapshot.empty) {
      const batch = writeBatch(db);

      // Seed businesses
      for (const biz of INITIAL_BUSINESSES) {
        const bizRef = doc(db, COLLECTIONS.BUSINESSES, `${biz.id}_${userId}`);
        batch.set(bizRef, { ...biz, id: `${biz.id}_${userId}`, userId });
      }

      // Seed initial orders
      for (const ord of getInitialOrders()) {
        const ordRef = doc(db, COLLECTIONS.ORDERS, `${ord.id}_${userId}`);
        batch.set(ordRef, { ...ord, id: `${ord.id}_${userId}`, userId });
      }

      // Seed initial expenses
      for (const exp of getInitialExpenses()) {
        const expRef = doc(db, COLLECTIONS.EXPENSES, `${exp.id}_${userId}`);
        batch.set(expRef, { ...exp, id: `${exp.id}_${userId}`, userId });
      }

      // Seed maintenance
      for (const maint of INITIAL_MAINTENANCE) {
        const maintRef = doc(db, COLLECTIONS.MAINTENANCE, `${maint.id}_${userId}`);
        batch.set(maintRef, { ...maint, id: `${maint.id}_${userId}`, userId });
      }

      await batch.commit();
    }
  } catch (err) {
    console.warn('Could not seed initial Firestore data for user:', err);
  }
}

export interface FirestoreService {
  getUserProfile(userId: string): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  createInitialUserProfile(firebaseUser: User): Promise<UserProfile>;
  saveDocument<T extends { id: string; userId: string }>(collectionName: string, data: T): Promise<void>;
  updateDocument<T extends Record<string, any>>(collectionName: string, docId: string, partial: Partial<T>): Promise<void>;
  deleteDocument(collectionName: string, docId: string): Promise<void>;
  subscribeCollection<T>(
    collectionName: string,
    userId: string,
    onData: (items: T[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe;
  batchSettleOrders(orderIds: string[], settledAt: string): Promise<void>;
  seedInitialUserData(userId: string): Promise<void>;
}

export const firestoreService: FirestoreService = {
  getUserProfile,
  saveUserProfile,
  createInitialUserProfile,
  saveDocument,
  updateDocument,
  deleteDocument,
  subscribeCollection,
  batchSettleOrders,
  seedInitialUserData
};

export default firestoreService;
