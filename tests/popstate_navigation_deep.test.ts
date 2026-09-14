import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from './testUtils';
import { useModalBackHandler } from '../src/hooks/useModalBackHandler';
import { useTabNavigation } from '../src/App';
import {
  lockBodyScroll,
  unlockBodyScroll,
  resetScrollLockForTesting,
  getScrollLockCount
} from '../src/utils/scrollLock';

describe('Deep Popstate & Navigation Edge Cases Suite (tests/popstate_navigation_deep.test.ts)', () => {
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

  it('1. useModalBackHandler pushes modal state into window.history when opened', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'test-modal-1'
      })
    );

    expect(pushSpy).toHaveBeenCalled();
    const lastCall = pushSpy.mock.calls[pushSpy.mock.calls.length - 1];
    expect(lastCall?.[0]).toMatchObject({ modal: 'test-modal-1', modalId: 'test-modal-1' });
  });

  it('2. useModalBackHandler invokes onClose on external popstate without re-triggering history.back()', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'test-modal-2'
      })
    );

    act(() => {
      const PopEventCls = (window as any).PopStateEvent;
      const popEvent = PopEventCls
        ? new PopEventCls('popstate', { state: null })
        : { type: 'popstate', state: null };
      window.dispatchEvent(popEvent);
    });

    expect(onClose).toHaveBeenCalled();
    // Must NOT call history.back() again to avoid double pop
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('3. useModalBackHandler handles Escape keydown by calling handleProgrammaticClose and preventing default', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const onClose = vi.fn();

    renderHook(() =>
      useModalBackHandler({
        isOpen: true,
        onClose,
        modalId: 'test-modal-escape'
      })
    );

    let defaultPrevented = false;
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      window.dispatchEvent(event);
      defaultPrevented = event.defaultPrevented;
    });

    expect(defaultPrevented).toBe(true);
    expect(backSpy).toHaveBeenCalled();
  });

  it('4. useTabNavigation pushes state when transitioning from orders to secondary tabs', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useTabNavigation());

    expect(result.current.activeTab).toBe('orders');

    act(() => {
      result.current.handleSelectTab('map');
    });

    expect(result.current.activeTab).toBe('map');
    expect(pushSpy).toHaveBeenCalledWith({ tab: 'map' }, '');
  });

  it('5. useTabNavigation uses replaceState when switching between secondary tabs', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useTabNavigation());

    act(() => {
      result.current.handleSelectTab('finance');
    });
    expect(pushSpy).toHaveBeenCalledWith({ tab: 'finance' }, '');

    act(() => {
      result.current.handleSelectTab('maintenance');
    });
    expect(result.current.activeTab).toBe('maintenance');
    expect(replaceSpy).toHaveBeenCalledWith({ tab: 'maintenance' }, '');
  });

  it('6. scrollLock handles nested modal locks: only unlocks body scroll when count reaches 0', () => {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.style.overflow = '';

    lockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    lockBodyScroll();
    expect(getScrollLockCount()).toBe(2);
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });
});
