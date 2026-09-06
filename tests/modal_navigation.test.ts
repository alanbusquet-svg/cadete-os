import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  lockBodyScroll,
  unlockBodyScroll,
  forceUnlockBodyScroll,
  resetScrollLockForTesting,
  getScrollLockCount
} from '../src/utils/scrollLock';
import { useModalBackHandler } from '../src/hooks/useModalBackHandler';
import { renderHook, act } from './testUtils';

describe('Milestone 1 — Reference-Counted Scroll Lock (src/utils/scrollLock.ts)', () => {
  beforeEach(() => {
    resetScrollLockForTesting();
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
  });

  afterEach(() => {
    resetScrollLockForTesting();
  });

  it('locks body scroll on first invocation and records previous overflow', () => {
    document.body.style.overflow = '';
    expect(getScrollLockCount()).toBe(0);

    lockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('preserves existing inline overflow when locking and restores on zero locks', () => {
    document.body.style.overflow = 'auto';
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('handles nested modal locks: only unlocks when count reaches 0', () => {
    document.body.style.overflow = '';

    // Modal 1 opens
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    // Modal 2 (e.g. ConfirmDialog) opens
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(2);
    expect(document.body.style.overflow).toBe('hidden');

    // Modal 2 closes
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    // Crucial: body scroll must remain locked because Modal 1 is still open!
    expect(document.body.style.overflow).toBe('hidden');

    // Modal 1 closes
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('prevents negative lock count on excessive unlock calls', () => {
    unlockBodyScroll();
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
  });

  it('forceUnlockBodyScroll immediately clears all locks and resets overflow', () => {
    lockBodyScroll();
    lockBodyScroll();
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(3);
    expect(document.body.style.overflow).toBe('hidden');

    forceUnlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });
});

describe('Milestone 1 — Window History & PopStateEvent Polyfill (tests/setup.ts)', () => {
  it('provides window.history with pushState, replaceState, back, and state', () => {
    expect(window.history).toBeDefined();
    expect(typeof window.history.pushState).toBe('function');
    expect(typeof window.history.replaceState).toBe('function');
    expect(typeof window.history.back).toBe('function');

    const initialLen = window.history.length;
    window.history.pushState({ modalId: 'test-modal' }, '');
    expect(window.history.length).toBe(initialLen + 1);
    expect(window.history.state).toEqual({ modalId: 'test-modal' });

    window.history.replaceState({ modalId: 'replaced-modal' }, '');
    expect(window.history.state).toEqual({ modalId: 'replaced-modal' });
  });

  it('dispatches popstate event on window when window.history.back is invoked', () => {
    const popListener = vi.fn();
    window.addEventListener('popstate', popListener);

    window.history.pushState({ test: 'step1' }, '');
    window.history.pushState({ test: 'step2' }, '');

    window.history.back();
    expect(popListener).toHaveBeenCalled();

    window.removeEventListener('popstate', popListener);
  });
});

describe('Milestone 1 — useModalBackHandler Architecture & Hook Contracts', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  beforeEach(() => {
    resetScrollLockForTesting();
    if (typeof (window.history as any)?._reset === 'function') {
      (window.history as any)._reset();
    }
  });

  afterEach(() => {
    resetScrollLockForTesting();
    vi.restoreAllMocks();
  });

  it('verifies useModalBackHandler.ts exports expected TypeScript interface and function', () => {
    const content = getFileContent('src/hooks/useModalBackHandler.ts');
    expect(content).toContain('export interface UseModalBackHandlerOptions');
    expect(content).toContain('export function useModalBackHandler(');
    expect(content).toContain('handleProgrammaticClose');
    expect(content).toContain('lockBodyScroll()');
    expect(content).toContain('unlockBodyScroll()');
    expect(content).toContain('pushState');
    expect(content).toContain('addEventListener');
    expect(content).toContain('popstate');
    expect(content).toContain('Escape');
  });

  it('executes useModalBackHandler: hardware popstate triggers onClose without secondary history.back', () => {
    const onClose = vi.fn();
    const backSpy = vi.spyOn(window.history, 'back');
    const pushSpy = vi.spyOn(window.history, 'pushState');

    // Mount useModalBackHandler with isOpen: true
    const { unmount } = renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'order-form-test'
      })
    );

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ modalId: 'order-form-test' }),
      ''
    );

    // Simulate hardware back button: browser pops history externally to previous tab state
    act(() => {
      const PopEventCls = (globalThis as any).PopStateEvent || Event;
      const popEvent = new PopEventCls('popstate', {
        state: { tab: 'orders' }
      });
      window.dispatchEvent(popEvent);
    });

    // Production hook must detect external pop and trigger onClose
    expect(onClose).toHaveBeenCalledTimes(1);

    // CRITICAL: history.back() must NOT be called again because the browser already popped
    expect(backSpy).not.toHaveBeenCalled();

    unmount();
    pushSpy.mockRestore();
    backSpy.mockRestore();
  });

  it('executes useModalBackHandler: handleProgrammaticClose pops history and invokes onClose', () => {
    const onClose = vi.fn();
    const backSpy = vi.spyOn(window.history, 'back');

    const { result, unmount } = renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'order-form-programmatic'
      })
    );

    act(() => {
      result.current.handleProgrammaticClose();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);

    // Unmount after programmatic close must NOT trigger duplicate history.back()
    unmount();
    expect(backSpy).toHaveBeenCalledTimes(1);

    backSpy.mockRestore();
  });

  it('executes useModalBackHandler: Escape keydown triggers programmatic close and prevents default', () => {
    const onClose = vi.fn();
    const backSpy = vi.spyOn(window.history, 'back');

    const { unmount } = renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'order-form-escape'
      })
    );

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    const preventSpy = vi.spyOn(escapeEvent, 'preventDefault');

    act(() => {
      window.dispatchEvent(escapeEvent);
    });

    expect(preventSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(backSpy).toHaveBeenCalledTimes(1);

    unmount();
    backSpy.mockRestore();
  });
});

describe('Milestone 1 — Modal.tsx Component Ergonomics & Touch Target Audit', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  it('audits Modal.tsx for useModalBackHandler, Left Back button, and >= 44px touch targets', () => {
    const modalSrc = getFileContent('src/components/common/Modal.tsx');

    // Hook integration
    expect(modalSrc).toContain("import { useModalBackHandler } from '../../hooks/useModalBackHandler';");
    expect(modalSrc).toContain('useModalBackHandler({');

    // Left Back button (thumb-reachable for left-hand motorcycle riders)
    expect(modalSrc).toContain('ArrowLeft');
    expect(modalSrc).toContain('min-w-[44px] min-h-[44px]');
    expect(modalSrc).toContain('aria-label="Volver"');

    // Right Close button
    expect(modalSrc).toContain('aria-label="Cerrar modal"');

    // Drag handle interactive touch target
    expect(modalSrc).toContain('aria-label="Tocar para cerrar modal"');
    expect(modalSrc).toContain('min-h-[44px]');
    expect(modalSrc).toContain('cursor-pointer');

    // Backdrop click
    expect(modalSrc).toContain('cursor-pointer');
    expect(modalSrc).toContain('z-50');
  });
});

describe('Milestone 1 — ConfirmDialog.tsx Ergonomics & Touch Target Audit', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  it('audits ConfirmDialog.tsx for useModalBackHandler, >= 44px close button, and interactive handle', () => {
    const dialogSrc = getFileContent('src/components/common/ConfirmDialog.tsx');

    // Hook integration
    expect(dialogSrc).toContain("import { useModalBackHandler } from '../../hooks/useModalBackHandler';");
    expect(dialogSrc).toContain("modalId: 'confirm-dialog'");

    // Close button >= 44px
    expect(dialogSrc).toContain('min-w-[44px] min-h-[44px]');
    expect(dialogSrc).toContain('aria-label="Cerrar"');

    // Drag handle interactive tap zone
    expect(dialogSrc).toContain('aria-label="Tocar para cerrar"');
    expect(dialogSrc).toContain('min-h-[44px]');

    // Backdrop click
    expect(dialogSrc).toContain('cursor-pointer');
    expect(dialogSrc).toContain('z-50');
  });
});

describe('Milestone 1 — OrderMapModal.tsx Ergonomics & Touch Target Audit', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  it('audits OrderMapModal.tsx for useModalBackHandler, Left Back button, and speech preservation', () => {
    const mapModalSrc = getFileContent('src/components/map/OrderMapModal.tsx');

    // Hook integration
    expect(mapModalSrc).toContain("import { useModalBackHandler } from '../../hooks/useModalBackHandler';");
    expect(mapModalSrc).toContain("modalId: 'order-map'");

    // Left Back button
    expect(mapModalSrc).toContain('ArrowLeft');
    expect(mapModalSrc).toContain('min-w-[44px] min-h-[44px]');
    expect(mapModalSrc).toContain('aria-label="Volver"');

    // Drag handle interactive tap target
    expect(mapModalSrc).toContain('aria-label="Tocar para cerrar"');
    expect(mapModalSrc).toContain('min-h-[44px]');

    // Voice & external navigation preservation
    expect(mapModalSrc).toContain('Volume2');
    expect(mapModalSrc).toContain('speakOrder(order)');
    expect(mapModalSrc).toContain('Volver a Viajes');
    expect(mapModalSrc).toContain('flex-1 min-h-[52px]');
    expect(mapModalSrc).toContain('min-h-[52px] px-3.5');
    expect(mapModalSrc).toContain('min-h-[52px] w-10');
    expect(mapModalSrc).toContain('onClick={onClose}');
  });
});
