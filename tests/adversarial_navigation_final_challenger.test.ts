import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from './testUtils';
import {
  lockBodyScroll,
  unlockBodyScroll,
  forceUnlockBodyScroll,
  resetScrollLockForTesting,
  getScrollLockCount
} from '../src/utils/scrollLock';
import { useModalBackHandler } from '../src/hooks/useModalBackHandler';
import { useTabNavigation } from '../src/App';
import type { ActiveTab } from '../src/types';

describe('Final Challenger 1: Adversarial Navigation, Popstate & History Cleanup Suite', () => {
  beforeEach(() => {
    resetScrollLockForTesting();
    if (typeof (window.history as any)?._reset === 'function') {
      (window.history as any)._reset();
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
    }
  });

  afterEach(() => {
    cleanup();
    resetScrollLockForTesting();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // TASK 1: Open modal -> hardware back (popstate) -> closes modal, view remains active
  // =========================================================================
  describe('Task 1: Modal Open -> Hardware Back (Popstate Trapping)', () => {
    it('closes modal on hardware back and keeps active view without triggering secondary history.back', () => {
      const tabHook = renderHook(() => useTabNavigation('orders'));
      expect(tabHook.result.current.activeTab).toBe('orders');

      // Navigate to 'finance' tab
      act(() => {
        tabHook.result.current.handleSelectTab('finance');
      });
      expect(tabHook.result.current.activeTab).toBe('finance');
      expect(window.history.state).toEqual({ tab: 'finance' });

      const backSpy = vi.spyOn(window.history, 'back');
      let isModalOpen = true;
      const handleClose = vi.fn(() => {
        isModalOpen = false;
      });

      // Open modal from finance tab
      const modalHook = renderHook(() =>
        useModalBackHandler({
          isOpen: isModalOpen,
          onClose: handleClose,
          modalId: 'expense-form-task1'
        })
      );

      // Verify modal pushed history with preserved tab
      expect(window.history.state).toEqual(
        expect.objectContaining({
          tab: 'finance',
          modal: 'expense-form-task1',
          modalId: 'expense-form-task1'
        })
      );
      expect(getScrollLockCount()).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');

      // Trigger hardware back button (Android back button or browser back gesture)
      act(() => {
        const PopEventCls = (globalThis as any).PopStateEvent || Event;
        const popEvent = new PopEventCls('popstate', {
          state: { tab: 'finance' }
        });
        window.dispatchEvent(popEvent);
      });

      // Modal must be commanded to close
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Crucial: history.back() must NOT be called again because the hardware back already popped it
      expect(backSpy).not.toHaveBeenCalled();

      // Simulate parent unmounting the modal after onClose
      modalHook.unmount();

      // Even on unmount, backSpy must NOT be called (prevent leaving app)
      expect(backSpy).not.toHaveBeenCalled();

      // Scroll lock must be completely cleared
      expect(getScrollLockCount()).toBe(0);
      expect(document.body.style.overflow).toBe('');

      // Active view must remain 'finance', app did not exit
      expect(tabHook.result.current.activeTab).toBe('finance');
    });

    it('handles hardware back when opened from root orders tab with null state', () => {
      const tabHook = renderHook(() => useTabNavigation('orders'));
      expect(tabHook.result.current.activeTab).toBe('orders');

      const backSpy = vi.spyOn(window.history, 'back');
      const handleClose = vi.fn();

      const modalHook = renderHook(() =>
        useModalBackHandler({
          isOpen: true,
          onClose: handleClose,
          modalId: 'order-form-root'
        })
      );

      expect(getScrollLockCount()).toBe(1);

      // Hardware back popping back to root (null state)
      act(() => {
        const PopEventCls = (globalThis as any).PopStateEvent || Event;
        const popEvent = new PopEventCls('popstate', { state: null });
        window.dispatchEvent(popEvent);
      });

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(backSpy).not.toHaveBeenCalled();
      modalHook.unmount();
      expect(backSpy).not.toHaveBeenCalled();

      expect(getScrollLockCount()).toBe(0);
      expect(tabHook.result.current.activeTab).toBe('orders');
    });
  });

  // =========================================================================
  // TASK 2: Switch orders -> finance -> map -> hardware back -> returns to orders
  // =========================================================================
  describe('Task 2: Tab Navigation Sequence (Orders -> Finance -> Map -> Hardware Back)', () => {
    it('navigates orders -> finance -> map, and hardware back returns to orders without exiting', () => {
      const pushSpy = vi.spyOn(window.history, 'pushState');
      const replaceSpy = vi.spyOn(window.history, 'replaceState');

      const { result } = renderHook(() => useTabNavigation('orders'));
      expect(result.current.activeTab).toBe('orders');

      // 1. orders -> finance (must pushState)
      act(() => {
        result.current.handleSelectTab('finance');
      });
      expect(result.current.activeTab).toBe('finance');
      expect(pushSpy).toHaveBeenCalledTimes(1);
      expect(pushSpy).toHaveBeenCalledWith({ tab: 'finance' }, '');
      expect(replaceSpy).not.toHaveBeenCalled();

      // 2. finance -> map (secondary to secondary must replaceState to prevent back-button loops)
      act(() => {
        result.current.handleSelectTab('map');
      });
      expect(result.current.activeTab).toBe('map');
      expect(replaceSpy).toHaveBeenCalledTimes(1);
      expect(replaceSpy).toHaveBeenCalledWith({ tab: 'map' }, '');

      // 3. User hits hardware back button on phone
      // History pops back to initial state before finance (null or root)
      act(() => {
        const PopEventCls = (globalThis as any).PopStateEvent || Event;
        const popEvent = new PopEventCls('popstate', { state: null });
        window.dispatchEvent(popEvent);
      });

      // Crucial: activeTab must cleanly return to 'orders' without exiting app
      expect(result.current.activeTab).toBe('orders');
    });

    it('supports extended multi-tab hops (orders -> map -> settings -> businesses -> maintenance -> hardware back -> orders)', () => {
      const { result } = renderHook(() => useTabNavigation('orders'));

      // orders -> map
      act(() => {
        result.current.handleSelectTab('map');
      });
      expect(result.current.activeTab).toBe('map');

      // map -> settings -> businesses -> maintenance (all secondary replacements)
      const secondaryTabs: ActiveTab[] = ['settings', 'businesses', 'maintenance'];
      for (const tab of secondaryTabs) {
        act(() => {
          result.current.handleSelectTab(tab);
        });
        expect(result.current.activeTab).toBe(tab);
      }

      // Hardware back pops to root
      act(() => {
        const PopEventCls = (globalThis as any).PopStateEvent || Event;
        const popEvent = new PopEventCls('popstate', { state: null });
        window.dispatchEvent(popEvent);
      });

      // Must return to orders
      expect(result.current.activeTab).toBe('orders');
    });
  });

  // =========================================================================
  // TASK 3: Open modal -> Cancel -> history.back() executed & clean state
  // =========================================================================
  describe('Task 3: Modal Open -> Cancel Button -> History Cleanup', () => {
    it('executes history.back() on programmatic cancel and leaves no modal state behind', () => {
      // Set initial state
      window.history.replaceState({ tab: 'orders' }, '');

      const backSpy = vi.spyOn(window.history, 'back');
      let isModalOpen = true;
      const onClose = vi.fn(() => {
        isModalOpen = false;
      });

      const { result, unmount } = renderHook(() =>
        useModalBackHandler({
          isOpen: isModalOpen,
          onClose,
          modalId: 'test-cancel-modal'
        })
      );

      // Verify history state has modal
      expect(window.history.state).toEqual(
        expect.objectContaining({
          tab: 'orders',
          modal: 'test-cancel-modal',
          modalId: 'test-cancel-modal'
        })
      );

      // Simulate clicking bottom Cancel button (invokes handleProgrammaticClose)
      act(() => {
        result.current.handleProgrammaticClose();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(backSpy).toHaveBeenCalledTimes(1);

      // Simulate unmount following close
      unmount();

      // No double back call
      expect(backSpy).toHaveBeenCalledTimes(1);

      // Verify no modal state remains in history
      const currentState = window.history.state;
      expect(currentState?.modal).toBeUndefined();
      expect(currentState?.modalId).toBeUndefined();
      expect(getScrollLockCount()).toBe(0);
    });

    it('executes history.back() and cleans up if parent toggles isOpen to false directly (e.g. unmount)', () => {
      window.history.replaceState({ tab: 'finance' }, '');
      const backSpy = vi.spyOn(window.history, 'back');

      const { unmount } = renderHook(() =>
        useModalBackHandler({
          isOpen: true,
          onClose: () => {},
          modalId: 'direct-unmount-modal'
        })
      );

      expect(backSpy).not.toHaveBeenCalled();

      // Component unmounts directly while still pushed
      unmount();

      // Cleanup hook must pop history
      expect(backSpy).toHaveBeenCalledTimes(1);
      expect(getScrollLockCount()).toBe(0);
    });
  });

  // =========================================================================
  // TASK 4: Rapid tab switches and rapid modal opens/closes stress
  // =========================================================================
  describe('Task 4: High-Frequency Rapid Switches & Modal Cycling Stress Harness', () => {
    it('survives 100 rapid tab switch iterations without desync or throw', () => {
      const { result } = renderHook(() => useTabNavigation('orders'));
      const tabs: ActiveTab[] = ['orders', 'finance', 'map', 'businesses', 'maintenance', 'settings'];

      for (let i = 0; i < 100; i++) {
        const nextTab = tabs[i % tabs.length];
        act(() => {
          result.current.handleSelectTab(nextTab);
        });
        expect(result.current.activeTab).toBe(nextTab);
      }

      // Final switch back to orders
      act(() => {
        result.current.handleSelectTab('orders');
      });
      expect(result.current.activeTab).toBe('orders');
    });

    it('survives 100 rapid modal open/close cycles without scrollLock leaks or listener leaks', () => {
      for (let i = 0; i < 100; i++) {
        const onClose = vi.fn();
        const { result, unmount } = renderHook(() =>
          useModalBackHandler({
            isOpen: true,
            onClose,
            modalId: `rapid-modal-${i}`
          })
        );

        expect(getScrollLockCount()).toBe(1);
        expect(document.body.style.overflow).toBe('hidden');

        // Alternating close strategies: programmatic vs direct unmount vs escape
        if (i % 3 === 0) {
          act(() => {
            result.current.handleProgrammaticClose();
          });
          unmount();
        } else if (i % 3 === 1) {
          unmount();
        } else {
          const escEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
          act(() => {
            window.dispatchEvent(escEvent);
          });
          unmount();
        }

        expect(getScrollLockCount()).toBe(0);
        expect(document.body.style.overflow).toBe('');
      }

      expect(getScrollLockCount()).toBe(0);
    });

    it('resiliently handles nested modal stacking with selective hardware back dismissal', () => {
      // Modal 1: OrderFormModal opens
      const onClose1 = vi.fn();
      const modal1 = renderHook(() =>
        useModalBackHandler({
          isOpen: true,
          onClose: onClose1,
          modalId: 'order-form-parent'
        })
      );

      expect(getScrollLockCount()).toBe(1);
      expect(window.history.state?.modalId).toBe('order-form-parent');

      // Modal 2: ConfirmDialog opens on top of Modal 1
      const onClose2 = vi.fn();
      const modal2 = renderHook(() =>
        useModalBackHandler({
          isOpen: true,
          onClose: onClose2,
          modalId: 'confirm-dialog-child'
        })
      );

      expect(getScrollLockCount()).toBe(2);
      expect(window.history.state?.modalId).toBe('confirm-dialog-child');

      // User presses hardware back: browser pops to Modal 1 state
      act(() => {
        const PopEventCls = (globalThis as any).PopStateEvent || Event;
        const popEvent = new PopEventCls('popstate', {
          state: { modalId: 'order-form-parent', modal: 'order-form-parent' }
        });
        window.dispatchEvent(popEvent);
      });

      // Child modal must close, parent modal must remain open!
      expect(onClose2).toHaveBeenCalledTimes(1);
      expect(onClose1).not.toHaveBeenCalled();

      // Child unmounts
      modal2.unmount();
      expect(getScrollLockCount()).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');

      // User presses hardware back a second time: pops to root
      act(() => {
        const PopEventCls = (globalThis as any).PopStateEvent || Event;
        const popEvent = new PopEventCls('popstate', { state: null });
        window.dispatchEvent(popEvent);
      });

      // Parent modal now closes
      expect(onClose1).toHaveBeenCalledTimes(1);
      modal1.unmount();
      expect(getScrollLockCount()).toBe(0);
      expect(document.body.style.overflow).toBe('');
    });
  });
});
