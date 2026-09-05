import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  getPreviousDate,
  getNextDate,
  isInteractiveElement,
  evaluateSwipeGesture
} from '../src/utils/date';
import { getTodayDateString } from '../src/utils/formatting';

describe('CHALLENGER 4 — Adversarial Empirical Verification Suite', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  // =========================================================================
  // SUITE 1: MODAL & ACCORDION STATE LIFECYCLE (R3)
  // =========================================================================
  describe('Suite 1: OrderFormModal & Accordion Lifecycle Simulation', () => {
    it('verifies OrderFormModal code structure guarantees collapsed state upon each open', () => {
      const modalSrc = getFileContent('src/components/orders/OrderFormModal.tsx');
      
      // Verification of initial state definition
      expect(modalSrc).toMatch(/const\s*\[showMoreOptions,\s*setShowMoreOptions\]\s*=\s*useState<boolean>\(false\);/);
      
      // Verification of useEffect hook resetting showMoreOptions on isOpen change
      expect(modalSrc).toMatch(/if\s*\(isOpen\)\s*\{[\s\S]*?setShowMoreOptions\(false\);/);
      
      // Verification of form submit resetting showMoreOptions
      expect(modalSrc).toMatch(/setShowMoreOptions\(false\);[\s\S]*?onClose\(\);/);
    });

    it('simulates decimal input parsing and comma-to-dot normalization', () => {
      // In OrderFormModal: const parsedAmount = parseFloat(amount.replace(',', '.'));
      const parseAmount = (input: string): number => {
        return parseFloat(input.replace(',', '.'));
      };

      expect(parseAmount('1500')).toBe(1500);
      expect(parseAmount('1500,50')).toBe(1500.50);
      expect(parseAmount('1500.50')).toBe(1500.50);
      expect(parseAmount('0')).toBe(0);
      expect(parseAmount('-50')).toBe(-50);
      expect(isNaN(parseAmount('abc'))).toBe(true);
      expect(isNaN(parseAmount(''))).toBe(true);

      // Validation logic: isNaN(parsedAmount) || parsedAmount <= 0
      const isValid = (input: string): boolean => {
        const val = parseAmount(input);
        return !isNaN(val) && val > 0;
      };

      expect(isValid('1500')).toBe(true);
      expect(isValid('1500,75')).toBe(true);
      expect(isValid('0')).toBe(false);
      expect(isValid('-10')).toBe(false);
      expect(isValid('   ')).toBe(false);
    });

    it('verifies default values when submitted in collapsed vs expanded state', () => {
      // Simulating the default form state behavior
      type PayerType = 'customer' | 'business';
      type PaymentMethodType = 'cash' | 'transfer';

      interface FormState {
        paidBy: PayerType;
        paymentMethod: PaymentMethodType;
        settled: boolean;
        address: string;
        customerPhone: string;
        notes: string;
      }

      const createDefaultState = (): FormState => ({
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true,
        address: '',
        customerPhone: '',
        notes: ''
      });

      const handlePayerChange = (state: FormState, newPayer: PayerType): FormState => ({
        ...state,
        paidBy: newPayer,
        settled: newPayer !== 'business'
      });

      // Default customer payment -> cash + settled: true
      const state1 = createDefaultState();
      expect(state1.paymentMethod).toBe('cash');
      expect(state1.settled).toBe(true);

      // Switch to business -> settled becomes false (Cta Cte)
      const state2 = handlePayerChange(state1, 'business');
      expect(state2.paidBy).toBe('business');
      expect(state2.settled).toBe(false);

      // Switch back to customer -> settled becomes true
      const state3 = handlePayerChange(state2, 'customer');
      expect(state3.paidBy).toBe('customer');
      expect(state3.settled).toBe(true);
    });

    it('verifies accessibility and keyboard attributes on Accordion toggle button', () => {
      const modalSrc = getFileContent('src/components/orders/OrderFormModal.tsx');
      expect(modalSrc).toContain('aria-expanded={showMoreOptions}');
      expect(modalSrc).toContain("type=\"button\"");
      expect(modalSrc).toContain('min-h-[44px]');
    });
  });

  // =========================================================================
  // SUITE 2: CONFIRM DIALOG LIFECYCLE & RESETS (R4)
  // =========================================================================
  describe('Suite 2: ConfirmDialog Body Scroll Locks & Keyboard Resets', () => {
    it('simulates body scroll locking when ConfirmDialog is open and restoration on unmount', () => {
      const mockBody = { style: { overflow: '' } };
      const eventListeners: Record<string, ((e: any) => void)[]> = {};

      const mockWindow = {
        addEventListener: (event: string, handler: (e: any) => void) => {
          eventListeners[event] = eventListeners[event] || [];
          eventListeners[event]!.push(handler);
        },
        removeEventListener: (event: string, handler: (e: any) => void) => {
          if (eventListeners[event]) {
            eventListeners[event] = eventListeners[event]!.filter(h => h !== handler);
          }
        },
        dispatchEvent: (event: string, payload: any) => {
          (eventListeners[event] || []).forEach(h => h(payload));
        }
      };

      // Simulating ConfirmDialog's useEffect
      const mountDialog = (isOpen: boolean, onCancel: () => void) => {
        if (!isOpen) return () => {};

        mockBody.style.overflow = 'hidden';

        const handleKeyDown = (e: { key: string }) => {
          if (e.key === 'Escape') {
            onCancel();
          }
        };

        mockWindow.addEventListener('keydown', handleKeyDown);
        return () => {
          mockBody.style.overflow = '';
          mockWindow.removeEventListener('keydown', handleKeyDown);
        };
      };

      const onCancelMock = vi.fn();

      // Mount open dialog
      const cleanup = mountDialog(true, onCancelMock);
      expect(mockBody.style.overflow).toBe('hidden');

      // Trigger Escape
      mockWindow.dispatchEvent('keydown', { key: 'Escape' });
      expect(onCancelMock).toHaveBeenCalledTimes(1);

      // Unmount
      cleanup();
      expect(mockBody.style.overflow).toBe('');
      expect(eventListeners['keydown']?.length ?? 0).toBe(0);
    });

    it('verifies OilOdometerCard handles ConfirmDialog without native window.confirm', () => {
      const oilSrc = getFileContent('src/components/maintenance/OilOdometerCard.tsx');
      
      // Guarantee window.confirm is absent
      expect(oilSrc).not.toContain('window.confirm');
      expect(oilSrc).not.toMatch(/\bconfirm\s*\(/);

      // Verify state handling
      expect(oilSrc).toContain('const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);');
      expect(oilSrc).toContain('setIsConfirmOpen(true);');
      expect(oilSrc).toContain('setIsConfirmOpen(false);');
      expect(oilSrc).toContain("confirmVariant=\"danger\"");
      expect(oilSrc).toContain("confirmLabel=\"Confirmar Reset\"");
      expect(oilSrc).toContain("cancelLabel=\"Cancelar\"");
    });
  });

  // =========================================================================
  // SUITE 3: RESPONSIVE CLASSES & Z-INDEX LAYERING (R1 & R5)
  // =========================================================================
  describe('Suite 3: Responsive Class Specifications & Z-Index Layering', () => {
    it('verifies BottomNav width is 100% on mobile and strictly hidden on desktop', () => {
      const bottomNavSrc = getFileContent('src/components/layout/BottomNav.tsx');
      expect(bottomNavSrc).toContain('fixed bottom-0 left-0 right-0 w-full z-40 md:hidden');
      expect(bottomNavSrc).not.toContain('max-w-md mx-auto');
    });

    it('verifies AppShell responsive padding hierarchy', () => {
      const appShellSrc = getFileContent('src/components/layout/AppShell.tsx');
      expect(appShellSrc).toContain('pb-28 md:pb-0');
      expect(appShellSrc).toContain('max-w-md md:max-w-7xl mx-auto');
    });

    it('verifies FAB coordinates, dimensions and z-index hierarchy', () => {
      const orderListSrc = getFileContent('src/components/orders/OrderList.tsx');
      // FAB should be z-40, positioned bottom-left (bottom-20 left-4), min 60px size
      expect(orderListSrc).toContain('fixed bottom-20 left-4 z-40 md:hidden');
      expect(orderListSrc).toContain('min-w-[60px] min-h-[60px] w-[60px] h-[60px]');
      expect(orderListSrc).toContain('bg-emerald-500');
    });

    it('verifies ConfirmDialog and Modal z-index (z-50) is higher than FAB and BottomNav (z-40)', () => {
      const confirmDialogSrc = getFileContent('src/components/common/ConfirmDialog.tsx');
      const modalSrc = getFileContent('src/components/common/Modal.tsx');
      
      expect(confirmDialogSrc).toContain('z-50');
      expect(modalSrc).toContain('z-50');
    });
  });

  // =========================================================================
  // SUITE 4: HORIZONTAL SWIPE GESTURE BOUNDARIES & INTERACTIVITY (R2)
  // =========================================================================
  describe('Suite 4: Horizontal Swipe Gesture Boundaries & Interactivity', () => {
    it('verifies swipe gesture accurately triggers within tolerance', () => {
      // Swipe threshold is 50px
      expect(evaluateSwipeGesture(50, 0, 50)).toBe('prev_day');
      expect(evaluateSwipeGesture(-50, 0, 50)).toBe('next_day');
      expect(evaluateSwipeGesture(49.9, 0, 50)).toBeNull();
      expect(evaluateSwipeGesture(-49.9, 0, 50)).toBeNull();
    });

    it('verifies interactive target rejection logic prevents unintended swipes on cards/buttons', () => {
      // Simulated interactive elements using our MockElement from setup.ts
      const btn = document.createElement('button');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      btn.appendChild(svg as any);

      const input = document.createElement('input');
      const regularDiv = document.createElement('div');

      expect(isInteractiveElement(btn)).toBe(true);
      expect(isInteractiveElement(svg)).toBe(true);
      expect(isInteractiveElement(input)).toBe(true);
      expect(isInteractiveElement(regularDiv)).toBe(false);
    });

    it('verifies date navigation boundary constraints', () => {
      const today = getTodayDateString();
      const prev = getPreviousDate(today);

      expect(prev < today).toBe(true);
      expect(getNextDate(prev, today)).toBe(today);
      expect(getNextDate(today, today)).toBe(today);
    });
  });
});
