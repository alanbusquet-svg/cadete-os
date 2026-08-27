import { describe, it, expect, beforeEach } from 'vitest';
import { calculateTrialStatus } from '../src/utils/trial';
import type { UserProfile } from '../src/types';
import { DEFAULT_USER, storage } from '../src/lib/storage';

describe('Trial Calculation Utility (src/utils/trial.ts)', () => {
  const BASE_TIME = 1756296000000; // 2025-08-27T12:00:00.000Z

  it('calculates 7 days trial from createdAt when trialEndsAt is omitted', () => {
    const profile: UserProfile = {
      ...DEFAULT_USER,
      createdAt: new Date(BASE_TIME).toISOString(),
      trialEndsAt: undefined,
      subscriptionStatus: 'trial'
    };

    const status = calculateTrialStatus(profile, BASE_TIME);
    expect(status.isTrialActive).toBe(true);
    expect(status.daysRemaining).toBe(7);
    expect(status.isExpired).toBe(false);
    expect(new Date(status.trialEndsAt).getTime()).toBe(BASE_TIME + 7 * 24 * 60 * 60 * 1000);
  });

  it('calculates remaining days accurately midway through trial (3.5 days elapsed)', () => {
    const trialStart = BASE_TIME - 3.5 * 24 * 60 * 60 * 1000;
    const trialEnd = trialStart + 7 * 24 * 60 * 60 * 1000;

    const profile: UserProfile = {
      ...DEFAULT_USER,
      createdAt: new Date(trialStart).toISOString(),
      trialEndsAt: new Date(trialEnd).toISOString(),
      subscriptionStatus: 'trial'
    };

    const status = calculateTrialStatus(profile, BASE_TIME);
    expect(status.isTrialActive).toBe(true);
    expect(status.daysRemaining).toBe(4); // ceil(3.5) = 4
    expect(status.isExpired).toBe(false);
  });

  it('calculates 1 day remaining when only a few hours are left', () => {
    const trialEnd = BASE_TIME + 6 * 60 * 60 * 1000; // 6 hours remaining

    const profile: UserProfile = {
      ...DEFAULT_USER,
      trialEndsAt: new Date(trialEnd).toISOString(),
      subscriptionStatus: 'trial'
    };

    const status = calculateTrialStatus(profile, BASE_TIME);
    expect(status.isTrialActive).toBe(true);
    expect(status.daysRemaining).toBe(1); // ceil(6/24) = 1
    expect(status.isExpired).toBe(false);
  });

  it('marks trial as expired when elapsed time exceeds trial period', () => {
    const trialEnd = BASE_TIME - 1000; // 1 second ago

    const profile: UserProfile = {
      ...DEFAULT_USER,
      trialEndsAt: new Date(trialEnd).toISOString(),
      subscriptionStatus: 'trial'
    };

    const status = calculateTrialStatus(profile, BASE_TIME);
    expect(status.isTrialActive).toBe(false);
    expect(status.daysRemaining).toBe(0);
    expect(status.isExpired).toBe(true);
  });

  it('does not mark as expired if subscriptionStatus is active, even if trial has ended', () => {
    const trialEnd = BASE_TIME - 10 * 24 * 60 * 60 * 1000; // 10 days ago

    const profile: UserProfile = {
      ...DEFAULT_USER,
      trialEndsAt: new Date(trialEnd).toISOString(),
      subscriptionStatus: 'active'
    };

    const status = calculateTrialStatus(profile, BASE_TIME);
    expect(status.isTrialActive).toBe(false);
    expect(status.daysRemaining).toBe(0);
    expect(status.isExpired).toBe(false);
  });

  it('marks as expired if subscriptionStatus is explicitly expired', () => {
    const trialEnd = BASE_TIME + 2 * 24 * 60 * 60 * 1000;

    const profile: UserProfile = {
      ...DEFAULT_USER,
      trialEndsAt: new Date(trialEnd).toISOString(),
      subscriptionStatus: 'expired'
    };

    const status = calculateTrialStatus(profile, BASE_TIME);
    expect(status.isExpired).toBe(true);
  });

  it('handles corrupted or invalid dates gracefully without throwing', () => {
    const profile: UserProfile = {
      ...DEFAULT_USER,
      createdAt: 'invalid-date-format',
      trialEndsAt: 'corrupted-timestamp'
    };

    expect(() => calculateTrialStatus(profile, BASE_TIME)).not.toThrow();
    const status = calculateTrialStatus(profile, BASE_TIME);
    expect(typeof status.isTrialActive).toBe('boolean');
    expect(typeof status.daysRemaining).toBe('number');
  });
});

describe('User Profile & Storage Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and retrieves user profile with trial and photo fields', () => {
    const testUser: UserProfile = {
      uid: 'cadete_test_100',
      email: 'repartidor@bolivar.com',
      displayName: 'Carlos Moto',
      photoURL: 'https://lh3.googleusercontent.com/a/test-avatar',
      createdAt: '2026-08-27T10:00:00.000Z',
      trialEndsAt: '2026-09-03T10:00:00.000Z',
      subscriptionStatus: 'trial',
      settings: {
        currency: 'ARS',
        cityDefault: 'San Carlos de Bolívar',
        countryDefault: 'Argentina',
        oilChangeThresholdOrders: 250,
        oilChangeThresholdDays: 30,
        dailyGoal: 45000
      }
    };

    storage.saveProfile(testUser.uid, testUser);
    const retrieved = storage.getProfile(testUser.uid);

    expect(retrieved.uid).toBe('cadete_test_100');
    expect(retrieved.displayName).toBe('Carlos Moto');
    expect(retrieved.photoURL).toBe('https://lh3.googleusercontent.com/a/test-avatar');
    expect(retrieved.trialEndsAt).toBe('2026-09-03T10:00:00.000Z');
    expect(retrieved.subscriptionStatus).toBe('trial');
    expect(retrieved.settings.dailyGoal).toBe(45000);
  });

  it('merges partial settings correctly with default user fallback', () => {
    const customUser = {
      uid: 'user_partial_1',
      displayName: 'Repartidor Rápido',
      settings: {
        dailyGoal: 50000
      }
    };

    localStorage.setItem(
      'cadete_os_v1_user_partial_1_profile',
      JSON.stringify(customUser)
    );

    const loaded = storage.getProfile('user_partial_1');
    expect(loaded.displayName).toBe('Repartidor Rápido');
    expect(loaded.settings.dailyGoal).toBe(50000);
    expect(loaded.settings.cityDefault).toBe('San Carlos de Bolívar');
    expect(loaded.settings.currency).toBe('ARS');
  });
});
