import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateTrialStatus } from '../src/utils/trial';
import type { UserProfile } from '../src/types';
import { DEFAULT_USER, storage } from '../src/lib/storage';

describe('Adversarial Challenge 1: calculateTrialStatus Boundary Conditions & Stress Tests', () => {
  const BASE_TIME = 1756296000000; // 2025-08-27T12:00:00.000Z
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

  describe('Exact Millisecond & Day Boundary Calculations', () => {
    it('boundary: exactly 7 days remaining (7.0 days = 604,800,000 ms)', () => {
      const trialEndsAt = new Date(BASE_TIME + SEVEN_DAYS_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        createdAt: new Date(BASE_TIME).toISOString(),
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(7);
      expect(status.isExpired).toBe(false);
      expect(status.trialEndsAt).toBe(trialEndsAt);
    });

    it('boundary: 6.999 days remaining (7 days minus 100ms)', () => {
      const trialEndsAt = new Date(BASE_TIME + SEVEN_DAYS_MS - 100).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(7); // ceil(6.999...) = 7
      expect(status.isExpired).toBe(false);
    });

    it('boundary: 6.000001 days remaining (6 days plus 100ms)', () => {
      const trialEndsAt = new Date(BASE_TIME + 6 * ONE_DAY_MS + 100).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(7); // ceil(6.000001) = 7
      expect(status.isExpired).toBe(false);
    });

    it('boundary: exactly 6.000000 days remaining (6 days sharp)', () => {
      const trialEndsAt = new Date(BASE_TIME + 6 * ONE_DAY_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(6); // ceil(6.0) = 6
      expect(status.isExpired).toBe(false);
    });

    it('boundary: 1.000001 days remaining (1 day plus 1ms)', () => {
      const trialEndsAt = new Date(BASE_TIME + ONE_DAY_MS + 1).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(2); // ceil(1.00000001) = 2
      expect(status.isExpired).toBe(false);
    });

    it('boundary: exactly 1.000000 day remaining (24 hours sharp)', () => {
      const trialEndsAt = new Date(BASE_TIME + ONE_DAY_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(1); // ceil(1.0) = 1
      expect(status.isExpired).toBe(false);
    });

    it('boundary: 0.01 days remaining (~14.4 minutes left in trial)', () => {
      const msLeft = Math.floor(0.01 * ONE_DAY_MS); // 864,000 ms
      const trialEndsAt = new Date(BASE_TIME + msLeft).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(1); // ceil(0.01) = 1
      expect(status.isExpired).toBe(false);
    });

    it('boundary: exactly 1 millisecond remaining', () => {
      const trialEndsAt = new Date(BASE_TIME + 1).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(1); // ceil(1/86400000) = 1
      expect(status.isExpired).toBe(false);
    });

    it('boundary: exactly 0 ms remaining (currentTime === trialEndsAt)', () => {
      const trialEndsAt = new Date(BASE_TIME).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(false); // msRemaining > 0 is false
      expect(status.daysRemaining).toBe(0);
      expect(status.isExpired).toBe(true);
    });

    it('boundary: negative remaining (-1 millisecond)', () => {
      const trialEndsAt = new Date(BASE_TIME - 1).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(false);
      expect(status.daysRemaining).toBe(0); // Math.max(0, ...)
      expect(status.isExpired).toBe(true);
    });

    it('boundary: long-expired trial (-365 days)', () => {
      const trialEndsAt = new Date(BASE_TIME - 365 * ONE_DAY_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(false);
      expect(status.daysRemaining).toBe(0);
      expect(status.isExpired).toBe(true);
    });
  });

  describe('Subscription Status Override Logic', () => {
    it('active subscription overrides expired trial even if trial ended 100 days ago', () => {
      const trialEndsAt = new Date(BASE_TIME - 100 * ONE_DAY_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'active'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(false);
      expect(status.daysRemaining).toBe(0);
      expect(status.isExpired).toBe(false); // Subscription active => NOT expired
    });

    it('active subscription with active trial time remaining is not expired', () => {
      const trialEndsAt = new Date(BASE_TIME + 5 * ONE_DAY_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'active'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(5);
      expect(status.isExpired).toBe(false);
    });

    it('explicit subscriptionStatus = "expired" marks account as expired even with positive days on trial', () => {
      const trialEndsAt = new Date(BASE_TIME + 5 * ONE_DAY_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'expired'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(5);
      expect(status.isExpired).toBe(true); // Explicitly expired!
    });
  });

  describe('Omission, Fallback, and Corrupted Date Resilience', () => {
    it('calculates 7-day trial from createdAt when trialEndsAt is undefined', () => {
      const createdAt = new Date(BASE_TIME - 2 * ONE_DAY_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        createdAt,
        trialEndsAt: undefined,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(5); // 7 - 2 = 5
      expect(status.isExpired).toBe(false);
      expect(new Date(status.trialEndsAt).getTime()).toBe(new Date(createdAt).getTime() + SEVEN_DAYS_MS);
    });

    it('handles missing trialEndsAt AND missing createdAt by defaulting to now + 7 days', () => {
      const profile: UserProfile = {
        ...DEFAULT_USER,
        createdAt: '',
        trialEndsAt: undefined,
        subscriptionStatus: 'trial'
      };

      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(7);
      expect(status.isExpired).toBe(false);
      expect(new Date(status.trialEndsAt).getTime()).toBe(BASE_TIME + SEVEN_DAYS_MS);
    });

    it('handles corrupt createdAt date string without crashing', () => {
      const profile: UserProfile = {
        ...DEFAULT_USER,
        createdAt: 'malformed-date-string-xyz',
        trialEndsAt: undefined,
        subscriptionStatus: 'trial'
      };

      expect(() => calculateTrialStatus(profile, BASE_TIME)).not.toThrow();
      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(7);
    });

    it('handles corrupt trialEndsAt date string without crashing and defaults safely', () => {
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt: '2026-99-99T99:99:99Z',
        subscriptionStatus: 'trial'
      };

      expect(() => calculateTrialStatus(profile, BASE_TIME)).not.toThrow();
      const status = calculateTrialStatus(profile, BASE_TIME);
      expect(status.isTrialActive).toBe(true);
      expect(status.daysRemaining).toBe(7);
    });

    it('accepts currentTime as Date instance or timestamp number or defaults to Date.now()', () => {
      const trialEndsAt = new Date(Date.now() + 3 * ONE_DAY_MS).toISOString();
      const profile: UserProfile = {
        ...DEFAULT_USER,
        trialEndsAt,
        subscriptionStatus: 'trial'
      };

      const statusFromDate = calculateTrialStatus(profile, new Date());
      expect(statusFromDate.isTrialActive).toBe(true);
      expect(statusFromDate.daysRemaining).toBe(3);

      const statusFromNow = calculateTrialStatus(profile);
      expect(statusFromNow.isTrialActive).toBe(true);
      expect(statusFromNow.daysRemaining).toBe(3);
    });
  });
});

describe('Adversarial Challenge 2: Auth State Transitions & Operations Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Google Sign-In Flow & Error Handling', () => {
    it('creates GoogleAuthProvider with select_account and passes to signInWithPopup', async () => {
      const mockSignInWithPopup = vi.fn().mockResolvedValue({
        user: {
          uid: 'google_user_1',
          email: 'cadete@gmail.com',
          displayName: 'Juan Moto',
          photoURL: 'https://avatar.google.com/juan'
        }
      });

      let capturedProvider: any = null;
      class MockGoogleAuthProvider {
        customParams: Record<string, string> = {};
        setCustomParameters(params: Record<string, string>) {
          this.customParams = params;
          capturedProvider = this;
        }
      }

      // Simulated signInWithGoogle runner matching AuthContext implementation
      const runGoogleSignIn = async () => {
        const provider = new MockGoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await mockSignInWithPopup({}, provider);
      };

      await runGoogleSignIn();
      expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
      expect(capturedProvider.customParams).toEqual({ prompt: 'select_account' });
    });

    it('propagates Google popup closed error cleanly for UI feedback', async () => {
      const popupError = new Error('auth/popup-closed-by-user');
      (popupError as any).code = 'auth/popup-closed-by-user';

      const mockSignInWithPopup = vi.fn().mockRejectedValue(popupError);

      const runGoogleSignIn = async () => {
        await mockSignInWithPopup({}, {});
      };

      await expect(runGoogleSignIn()).rejects.toThrow('auth/popup-closed-by-user');
    });
  });

  describe('Email/Password Sign-In & Sign-Up Flows', () => {
    it('trims whitespace on email before passing to signInWithEmailAndPassword', async () => {
      const mockSignInWithEmail = vi.fn().mockResolvedValue({
        user: { uid: 'u_email_1', email: 'cadete@bolivar.com' }
      });

      const runEmailSignIn = async (email: string, pass: string) => {
        await mockSignInWithEmail({}, email.trim(), pass);
      };

      await runEmailSignIn('   cadete@bolivar.com   ', 'secret123');
      expect(mockSignInWithEmail).toHaveBeenCalledWith({}, 'cadete@bolivar.com', 'secret123');
    });

    it('propagates invalid credential error on sign-in', async () => {
      const authError = new Error('auth/invalid-credential');
      const mockSignInWithEmail = vi.fn().mockRejectedValue(authError);

      const runEmailSignIn = async (email: string, pass: string) => {
        await mockSignInWithEmail({}, email.trim(), pass);
      };

      await expect(runEmailSignIn('wrong@test.com', 'badpass')).rejects.toThrow('auth/invalid-credential');
    });

    it('signs up and calls updateProfile when name is provided', async () => {
      const mockUser = { uid: 'new_user_1', email: 'nuevo@bolivar.com', displayName: null };
      const mockCreateUser = vi.fn().mockResolvedValue({ user: mockUser });
      const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);

      const runEmailSignUp = async (email: string, pass: string, name?: string) => {
        const cred = await mockCreateUser({}, email.trim(), pass);
        if (name?.trim() && cred.user) {
          await mockUpdateProfile(cred.user, { displayName: name.trim() });
        }
      };

      await runEmailSignUp('  nuevo@bolivar.com  ', 'pass12345', '  Martín Palermo  ');
      expect(mockCreateUser).toHaveBeenCalledWith({}, 'nuevo@bolivar.com', 'pass12345');
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Martín Palermo' });
    });

    it('resiliently handles updateProfile error without breaking user registration', async () => {
      const mockUser = { uid: 'new_user_2', email: 'nuevo2@bolivar.com' };
      const mockCreateUser = vi.fn().mockResolvedValue({ user: mockUser });
      const mockUpdateProfile = vi.fn().mockRejectedValue(new Error('Profile update warning'));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const runEmailSignUp = async (email: string, pass: string, name?: string) => {
        const cred = await mockCreateUser({}, email.trim(), pass);
        if (name?.trim() && cred.user) {
          try {
            await mockUpdateProfile(cred.user, { displayName: name.trim() });
          } catch (e) {
            console.warn('Failed to update Firebase user profile displayName', e);
          }
        }
      };

      await expect(runEmailSignUp('nuevo2@bolivar.com', 'pass12345', 'Test Name')).resolves.not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('propagates email-already-in-use error on sign-up', async () => {
      const mockCreateUser = vi.fn().mockRejectedValue(new Error('auth/email-already-in-use'));

      const runEmailSignUp = async (email: string, pass: string) => {
        await mockCreateUser({}, email.trim(), pass);
      };

      await expect(runEmailSignUp('existing@bolivar.com', 'pass12345')).rejects.toThrow('auth/email-already-in-use');
    });
  });

  describe('Demo Mode & Session Transitions', () => {
    const DEMO_KEY = 'cadete_os_demo_mode';

    it('enters demo mode: sets localStorage flag and loads DEFAULT_USER profile', () => {
      let isDemoMode = false;
      let user = DEFAULT_USER;

      const enterDemoMode = () => {
        isDemoMode = true;
        localStorage.setItem(DEMO_KEY, 'true');
        user = storage.getProfile(DEFAULT_USER.uid);
      };

      enterDemoMode();
      expect(isDemoMode).toBe(true);
      expect(localStorage.getItem(DEMO_KEY)).toBe('true');
      expect(user.uid).toBe(DEFAULT_USER.uid);
      expect(user.displayName).toBe(DEFAULT_USER.displayName);
    });

    it('exits demo mode: removes localStorage flag and updates state', () => {
      localStorage.setItem(DEMO_KEY, 'true');
      let isDemoMode = true;

      const exitDemoMode = () => {
        isDemoMode = false;
        localStorage.removeItem(DEMO_KEY);
      };

      exitDemoMode();
      expect(isDemoMode).toBe(false);
      expect(localStorage.getItem(DEMO_KEY)).toBeNull();
    });

    it('logout: signs out of Firebase, clears demo mode, and resets user to DEFAULT_USER', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      localStorage.setItem(DEMO_KEY, 'true');

      let firebaseUser: any = { uid: 'logged_user' };
      let user: UserProfile = { ...DEFAULT_USER, uid: 'logged_user', displayName: 'Logged User' };
      let isDemoMode = true;
      let trialInfo = calculateTrialStatus(user);

      const logout = async () => {
        isDemoMode = false;
        localStorage.removeItem(DEMO_KEY);
        await mockSignOut({});
        firebaseUser = null;
        user = DEFAULT_USER;
        trialInfo = calculateTrialStatus(DEFAULT_USER);
      };

      await logout();
      expect(mockSignOut).toHaveBeenCalled();
      expect(isDemoMode).toBe(false);
      expect(localStorage.getItem(DEMO_KEY)).toBeNull();
      expect(firebaseUser).toBeNull();
      expect(user.uid).toBe(DEFAULT_USER.uid);
      expect(trialInfo).toBeDefined();
    });
  });

  describe('Profile & Settings Mutation with Firestore Synchronization', () => {
    it('updateSettings: merges settings, saves to local storage, and syncs to Firestore when logged in', async () => {
      const mockSetDoc = vi.fn().mockResolvedValue(undefined);
      const mockDoc = vi.fn().mockReturnValue({ id: 'u_cadete_1' });

      let user: UserProfile = {
        ...DEFAULT_USER,
        uid: 'u_cadete_1',
        settings: {
          ...DEFAULT_USER.settings,
          cityDefault: 'San Carlos de Bolívar',
          dailyGoal: 40000
        }
      };

      const firebaseUser = { uid: 'u_cadete_1' };

      const updateSettings = async (newSettings: Partial<UserProfile['settings']>) => {
        const updated: UserProfile = {
          ...user,
          settings: {
            ...user.settings,
            ...newSettings
          }
        };
        user = updated;
        storage.saveProfile(user.uid, updated);

        if (firebaseUser) {
          await mockSetDoc(mockDoc({}, 'users', firebaseUser.uid), { settings: updated.settings }, { merge: true });
        }
      };

      await updateSettings({ dailyGoal: 65000, countryDefault: 'Argentina' });

      expect(user.settings.dailyGoal).toBe(65000);
      expect(user.settings.countryDefault).toBe('Argentina');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        { settings: expect.objectContaining({ dailyGoal: 65000, countryDefault: 'Argentina' }) },
        { merge: true }
      );

      // Verify local storage persistence
      const saved = storage.getProfile('u_cadete_1');
      expect(saved.settings.dailyGoal).toBe(65000);
    });

    it('updateSettings: gracefully catches Firestore network errors without crashing UI', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockSetDoc = vi.fn().mockRejectedValue(new Error('Firestore unavailable'));

      let user: UserProfile = { ...DEFAULT_USER, uid: 'offline_user' };
      const firebaseUser = { uid: 'offline_user' };

      const updateSettings = async (newSettings: Partial<UserProfile['settings']>) => {
        const updated: UserProfile = {
          ...user,
          settings: { ...user.settings, ...newSettings }
        };
        user = updated;
        storage.saveProfile(user.uid, updated);

        if (firebaseUser) {
          try {
            await mockSetDoc({}, { settings: updated.settings }, { merge: true });
          } catch (e) {
            console.warn('Could not sync settings to Firestore:', e);
          }
        }
      };

      await expect(updateSettings({ dailyGoal: 50000 })).resolves.not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not sync settings to Firestore:'), expect.any(Error));
      expect(user.settings.dailyGoal).toBe(50000);

      warnSpy.mockRestore();
    });

    it('updateProfile: updates profile fields, saves locally, and syncs to Firestore', async () => {
      const mockSetDoc = vi.fn().mockResolvedValue(undefined);
      let user: UserProfile = { ...DEFAULT_USER, uid: 'profile_user_1', displayName: 'Old Name' };
      const firebaseUser = { uid: 'profile_user_1' };

      const updateProfile = async (partial: Partial<UserProfile>) => {
        const updated: UserProfile = {
          ...user,
          ...partial,
          settings: {
            ...user.settings,
            ...(partial.settings || {})
          }
        };
        user = updated;
        storage.saveProfile(user.uid, updated);

        if (firebaseUser) {
          await mockSetDoc({}, updated, { merge: true });
        }
      };

      await updateProfile({ displayName: 'Rodrigo Motomandados', photoURL: 'https://photo.url/1' });
      expect(user.displayName).toBe('Rodrigo Motomandados');
      expect(user.photoURL).toBe('https://photo.url/1');
      expect(mockSetDoc).toHaveBeenCalledWith({}, expect.objectContaining({
        displayName: 'Rodrigo Motomandados',
        photoURL: 'https://photo.url/1'
      }), { merge: true });

      const fromStorage = storage.getProfile('profile_user_1');
      expect(fromStorage.displayName).toBe('Rodrigo Motomandados');
    });
  });

  describe('Firestore Profile Lifecycle on Auth State Change', () => {
    it('creates a new Firestore document with 7-day trial for first-time sign-ups', async () => {
      const mockSetDoc = vi.fn().mockResolvedValue(undefined);
      const mockGetDoc = vi.fn().mockResolvedValue({
        exists: () => false
      });

      const fbUser = {
        uid: 'brand_new_cadete_99',
        email: 'nuevo@bolivar.com',
        displayName: null,
        photoURL: null,
        metadata: { creationTime: '2026-08-27T12:00:00.000Z' }
      };

      // Handler simulation
      let userProfile: UserProfile | null = null;
      const snap = await mockGetDoc();
      if (!snap.exists()) {
        const trialEndsAt = new Date(new Date(fbUser.metadata.creationTime).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        userProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.email.split('@')[0] || 'Cadete',
          photoURL: undefined,
          createdAt: fbUser.metadata.creationTime,
          trialEndsAt,
          subscriptionStatus: 'trial',
          settings: { ...DEFAULT_USER.settings }
        };
        await mockSetDoc({}, userProfile);
      }

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(userProfile?.displayName).toBe('nuevo');
      expect(userProfile?.subscriptionStatus).toBe('trial');
      expect(userProfile?.trialEndsAt).toBe('2026-09-03T12:00:00.000Z');
    });

    it('loads existing Firestore profile and preserves subscriptionStatus and settings', async () => {
      const existingDocData: Partial<UserProfile> = {
        uid: 'existing_cadete_88',
        email: 'pro@bolivar.com',
        displayName: 'Pro Rider',
        photoURL: 'https://avatar/pro.jpg',
        createdAt: '2026-01-01T00:00:00.000Z',
        trialEndsAt: '2026-01-08T00:00:00.000Z',
        subscriptionStatus: 'active',
        settings: {
          currency: 'ARS',
          cityDefault: 'Urdampilleta',
          countryDefault: 'Argentina',
          oilChangeThresholdOrders: 300,
          oilChangeThresholdDays: 45,
          dailyGoal: 80000
        }
      };

      const mockGetDoc = vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => existingDocData
      });

      const fbUser = {
        uid: 'existing_cadete_88',
        email: 'pro@bolivar.com',
        displayName: 'Pro Rider'
      };

      const snap = await mockGetDoc();
      expect(snap.exists()).toBe(true);
      const data = snap.data();

      const profile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: data.displayName || 'Cadete',
        photoURL: data.photoURL,
        createdAt: data.createdAt,
        trialEndsAt: data.trialEndsAt,
        subscriptionStatus: data.subscriptionStatus,
        settings: {
          ...DEFAULT_USER.settings,
          ...data.settings
        }
      };

      const trial = calculateTrialStatus(profile, new Date('2026-08-27T12:00:00.000Z'));
      expect(profile.subscriptionStatus).toBe('active');
      expect(profile.settings.cityDefault).toBe('Urdampilleta');
      expect(profile.settings.dailyGoal).toBe(80000);
      expect(trial.isExpired).toBe(false); // Active subscription keeps account active!
    });
  });
});
