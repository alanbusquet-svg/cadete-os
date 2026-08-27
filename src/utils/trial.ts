// ==========================================
// CADETE OS - 7-DAY TRIAL CALCULATION UTILITY
// ==========================================

import type { UserProfile, TrialInfo } from '../types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calculates the free trial status, remaining days, and expiration for a given user profile.
 * Defaults to 7 days from trialEndsAt or from createdAt.
 *
 * @param profile User profile containing createdAt, trialEndsAt, subscriptionStatus
 * @param currentTime Optional custom timestamp or Date for deterministic testing
 */
export function calculateTrialStatus(
  profile: UserProfile,
  currentTime?: number | Date
): TrialInfo {
  const nowMs = typeof currentTime === 'number'
    ? currentTime
    : currentTime instanceof Date
      ? currentTime.getTime()
      : Date.now();

  let trialEndsAt = profile.trialEndsAt;

  if (!trialEndsAt) {
    const createdMs = profile.createdAt ? new Date(profile.createdAt).getTime() : nowMs;
    const validCreatedMs = isNaN(createdMs) ? nowMs : createdMs;
    trialEndsAt = new Date(validCreatedMs + SEVEN_DAYS_MS).toISOString();
  }

  const targetMs = new Date(trialEndsAt).getTime();
  const validTargetMs = isNaN(targetMs) ? nowMs + SEVEN_DAYS_MS : targetMs;
  const msRemaining = validTargetMs - nowMs;

  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isTrialActive = msRemaining > 0;
  
  // If explicitly active subscription, it is not expired even if trial ended
  const isExpired = profile.subscriptionStatus === 'active'
    ? false
    : (!isTrialActive || profile.subscriptionStatus === 'expired');

  return {
    isTrialActive,
    daysRemaining,
    isExpired,
    trialEndsAt
  };
}
