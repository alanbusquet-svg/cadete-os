let lockCount = 0;
let previousOverflow: string | null = null;

/**
 * Locks document body scrolling with reference counting.
 * Safe for nested modals: only the first lock modifies the DOM.
 */
export function lockBodyScroll(): void {
  if (typeof document === 'undefined' || !document.body) return;

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

/**
 * Unlocks document body scrolling with reference counting.
 * Restores original overflow only when all locks have been released.
 */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined' || !document.body) return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow ?? '';
    previousOverflow = null;
  }
}

/**
 * Force-resets the lock count and restores scrolling immediately.
 * Emergency fail-safe for unmount or unexpected state cleanup.
 */
export function forceUnlockBodyScroll(): void {
  lockCount = 0;
  previousOverflow = null;
  if (typeof document !== 'undefined' && document.body) {
    document.body.style.overflow = '';
  }
}

/**
 * Testing utility to reset scroll lock state between tests.
 */
export function resetScrollLockForTesting(): void {
  forceUnlockBodyScroll();
}

/**
 * Returns current lock count (for testing/diagnostics).
 */
export function getScrollLockCount(): number {
  return lockCount;
}
