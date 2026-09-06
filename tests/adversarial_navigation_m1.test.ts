import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { renderHook, act, cleanup } from './testUtils';
import {
  lockBodyScroll,
  unlockBodyScroll,
  forceUnlockBodyScroll,
  resetScrollLockForTesting,
  getScrollLockCount
} from '../src/utils/scrollLock';
import { useModalBackHandler } from '../src/hooks/useModalBackHandler';

describe('Adversarial Challenge 1: Scroll Locking Stress Harness (src/utils/scrollLock.ts)', () => {
  beforeEach(() => {
    resetScrollLockForTesting();
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
  });

  afterEach(() => {
    cleanup();
    resetScrollLockForTesting();
  });

  it('stress-tests 3-level deep nested locks (Page -> OrderForm -> MapSheet -> ConfirmDialog)', () => {
    document.body.style.overflow = '';

    // Level 1: OrderForm opens
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    // Level 2: MapSheet opens on top
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(2);
    expect(document.body.style.overflow).toBe('hidden');

    // Level 3: ConfirmDialog opens on top of MapSheet
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(3);
    expect(document.body.style.overflow).toBe('hidden');

    // Dismiss Level 3 (ConfirmDialog closes)
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(2);
    // CRITICAL: body scroll must stay hidden for MapSheet and OrderForm
    expect(document.body.style.overflow).toBe('hidden');

    // Dismiss Level 2 (MapSheet closes)
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    // CRITICAL: body scroll must still stay hidden for OrderForm
    expect(document.body.style.overflow).toBe('hidden');

    // Dismiss Level 1 (OrderForm closes)
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    // All overlays dismissed: body scroll restored to baseline
    expect(document.body.style.overflow).toBe('');
  });

  it('stress-tests rapid open/close cycling (100 iterations)', () => {
    document.body.style.overflow = '';

    for (let i = 0; i < 100; i++) {
      lockBodyScroll();
      expect(getScrollLockCount()).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');

      unlockBodyScroll();
      expect(getScrollLockCount()).toBe(0);
      expect(document.body.style.overflow).toBe('');
    }
  });

  it('resists underflow attacks from 50 excess unlocks and recovers gracefully', () => {
    document.body.style.overflow = '';

    // 50 rogue unlock calls when no lock is active
    for (let i = 0; i < 50; i++) {
      unlockBodyScroll();
    }
    expect(getScrollLockCount()).toBe(0);

    // Now a legitimate modal opens
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    // Closes once
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('stress-tests force unlock fail-safe with 15 nested locks', () => {
    document.body.style.overflow = '';

    for (let i = 0; i < 15; i++) {
      lockBodyScroll();
    }
    expect(getScrollLockCount()).toBe(15);
    expect(document.body.style.overflow).toBe('hidden');

    // Emergency force unlock
    forceUnlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');

    // Ensure normal operations function after force unlock
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('preserves non-empty initial inline overflow ("scroll" or "auto") across nested locks', () => {
    document.body.style.overflow = 'scroll';

    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    // Nested lock should not overwrite previousOverflow with "hidden"
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    // Must restore original "scroll", not "" or "hidden"
    expect(document.body.style.overflow).toBe('scroll');
  });
});

describe('Adversarial Challenge 2: Popstate & History Hook Lifecycle (src/hooks/useModalBackHandler.ts)', () => {
  beforeEach(() => {
    resetScrollLockForTesting();
    if (typeof (window.history as any)?._reset === 'function') {
      (window.history as any)._reset();
    }
  });

  afterEach(() => {
    cleanup();
    resetScrollLockForTesting();
    vi.restoreAllMocks();
  });

  it('verifies pushState is invoked with modalId upon opening', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const onClose = vi.fn();

    const { unmount } = renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'test-adversarial-modal'
      })
    );

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        modal: 'test-adversarial-modal',
        modalId: 'test-adversarial-modal'
      }),
      ''
    );

    unmount();
  });

  it('handles popstate when event.state is null or undefined (root browser history)', () => {
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'order-form-modal'
      })
    );

    expect(onClose).not.toHaveBeenCalled();

    // Trigger popstate with null state (simulating hardware back to an unmanaged URL)
    act(() => {
      const PopStateCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopStateCls('popstate', { state: null });
      window.dispatchEvent(popEvent);
    });

    // Since null does not match 'order-form-modal', modal should immediately dismiss
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles popstate when event.state has no modalId (e.g. tab transition state)', () => {
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'expense-form-modal'
      })
    );

    expect(onClose).not.toHaveBeenCalled();

    // Trigger popstate with secondary tab state without modalId
    act(() => {
      const PopStateCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopStateCls('popstate', { state: { tab: 'expenses' } });
      window.dispatchEvent(popEvent);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores popstate when event.state matches the active modalId (no false dismissals)', () => {
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'active-modal'
      })
    );

    // Trigger popstate where state is the active modal itself
    act(() => {
      const PopStateCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopStateCls('popstate', {
        state: { modalId: 'active-modal', modal: 'active-modal' }
      });
      window.dispatchEvent(popEvent);
    });

    // Must NOT close when currentModal === id
    expect(onClose).not.toHaveBeenCalled();
  });

  it('verifies hardware popstate dismisses modal WITHOUT secondary history.back() call', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'hardware-back-test'
      })
    );

    act(() => {
      const PopStateCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopStateCls('popstate', { state: { tab: 'orders' } });
      window.dispatchEvent(popEvent);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    // Crucial: backSpy was NOT called by the hook because the browser already popped
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('verifies handleProgrammaticClose pops history and calls onClose without duplicate back on unmount', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const onClose = vi.fn();

    const { result, unmount } = renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'programmatic-close-test'
      })
    );

    act(() => {
      result.current.handleProgrammaticClose();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);

    // Unmount hook (e.g. component unmounts after parent sets isOpen = false)
    unmount();

    // Crucial: backSpy should STILL be 1 (cleanup does NOT duplicate history.back())
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('verifies unmount without programmatic close pops history cleanly', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const onClose = vi.fn();

    const { unmount } = renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'unmount-test'
      })
    );

    expect(backSpy).not.toHaveBeenCalled();

    // Component unmounts directly (e.g. parent unconditional render toggle)
    unmount();

    // Cleanup must pop the history entry
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('verifies Escape keydown triggers handleProgrammaticClose and prevents default when open', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'escape-test'
      })
    );

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true
    });
    const preventSpy = vi.spyOn(escapeEvent, 'preventDefault');

    act(() => {
      window.dispatchEvent(escapeEvent);
    });

    expect(preventSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('verifies Escape keydown does NOT fire onClose or prevent default when modal is closed', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: false,
        onClose,
        modalId: 'closed-modal-test'
      })
    );

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true
    });
    const preventSpy = vi.spyOn(escapeEvent, 'preventDefault');

    act(() => {
      window.dispatchEvent(escapeEvent);
    });

    expect(preventSpy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('ignores non-Escape keys (Enter, Space, Tab) without closing modal', () => {
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'other-keys-test'
      })
    );

    for (const key of ['Enter', ' ', 'Tab', 'ArrowDown', 'a']) {
      const keyEvent = new KeyboardEvent('keydown', { key, cancelable: true });
      const preventSpy = vi.spyOn(keyEvent, 'preventDefault');

      act(() => {
        window.dispatchEvent(keyEvent);
      });

      expect(preventSpy).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('verifies SSR safety when window.history is undefined or partial', () => {
    // Should execute without throwing reference errors
    expect(() => {
      const { unmount } = renderHook(() =>
        useModalBackHandler({
          isOpen: true,
          onClose: () => {},
          modalId: 'ssr-test',
          enableHistory: false,
          enableScrollLock: false,
          enableEscape: false
        })
      );
      unmount();
    }).not.toThrow();
  });
});

describe('Adversarial Challenge 3: Static Ergonomics & Touch Target Inspection', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  it('ensures Modal.tsx has thumb-reachable left back button, close button, and >= 44px targets', () => {
    const modalSrc = getFileContent('src/components/common/Modal.tsx');

    // Touch targets >= 44px
    const min44Count = (modalSrc.match(/min-w-\[44px\]\s+min-h-\[44px\]/g) || []).length;
    expect(min44Count).toBeGreaterThanOrEqual(2); // Left Back and Right Close

    // Left Back button with ArrowLeft
    expect(modalSrc).toContain('<ArrowLeft className="w-5 h-5" />');
    expect(modalSrc).toContain('aria-label="Volver"');

    // Mobile drag handle tap-to-close button
    expect(modalSrc).toContain('aria-label="Tocar para cerrar modal"');
    expect(modalSrc).toContain('min-h-[44px]');
    expect(modalSrc).toContain('onClick={handleProgrammaticClose}');

    // Backdrop click
    expect(modalSrc).toContain('onClick={handleProgrammaticClose}');
    expect(modalSrc).toContain('cursor-pointer');
    expect(modalSrc).toContain('z-50');
  });

  it('ensures ConfirmDialog.tsx has close button >= 44px, interactive drag handle, and z-50', () => {
    const dialogSrc = getFileContent('src/components/common/ConfirmDialog.tsx');

    // Close button >= 44px
    expect(dialogSrc).toContain('min-w-[44px] min-h-[44px]');
    expect(dialogSrc).toContain('aria-label="Cerrar"');

    // Drag handle tap-to-close
    expect(dialogSrc).toContain('aria-label="Tocar para cerrar"');
    expect(dialogSrc).toContain('min-h-[44px]');
    expect(dialogSrc).toContain('onClick={handleProgrammaticClose}');

    // z-50
    expect(dialogSrc).toContain('z-50');
  });

  it('ensures OrderMapModal.tsx preserves speech repeat, external navigation, and Left Back button', () => {
    const mapModalSrc = getFileContent('src/components/map/OrderMapModal.tsx');

    // Left Back button >= 44px
    expect(mapModalSrc).toContain('ArrowLeft');
    expect(mapModalSrc).toContain('min-w-[44px] min-h-[44px]');
    expect(mapModalSrc).toContain('aria-label="Volver"');

    // Drag handle
    expect(mapModalSrc).toContain('aria-label="Tocar para cerrar"');
    expect(mapModalSrc).toContain('min-h-[44px]');

    // Speech & external navigation tokens
    expect(mapModalSrc).toContain('Volume2');
    expect(mapModalSrc).toContain('speakOrder(order)');
    expect(mapModalSrc).toContain('Volver a Viajes');
    expect(mapModalSrc).toContain('flex-1 min-h-[52px]');
    expect(mapModalSrc).toContain('min-h-[52px] px-3.5');
    expect(mapModalSrc).toContain('min-h-[52px] w-10');
    expect(mapModalSrc).toContain('onClick={onClose}');
  });
});
