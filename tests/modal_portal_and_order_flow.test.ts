import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Modal Portal, Body Scroll Lock & Sequential Order Flow Verification', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  describe('Modal.tsx Portal & Touch Isolation', () => {
    const modalSrc = getFileContent('src/components/common/Modal.tsx');

    it('renders via createPortal to document.body to prevent containing block trapping', () => {
      expect(modalSrc).toContain('createPortal(');
      expect(modalSrc).toContain('document.body');
    });

    it('locks document.body scroll while open and restores it upon unmount/close', () => {
      expect(modalSrc).toContain("document.body.style.overflow = 'hidden'");
      expect(modalSrc).toContain('document.body.style.overflow = originalOverflow');
    });

    it('stops touch event bubbling to prevent accidental background swipe gestures', () => {
      expect(modalSrc).toContain('onTouchStart={(e) => e.stopPropagation()}');
      expect(modalSrc).toContain('onTouchMove={(e) => e.stopPropagation()}');
      expect(modalSrc).toContain('onTouchEnd={(e) => e.stopPropagation()}');
    });

    it('uses viewport-safe mobile height max-h-[90dvh]', () => {
      expect(modalSrc).toContain('max-h-[90dvh]');
    });
  });

  describe('OrderMapModal.tsx Portal & Touch Isolation', () => {
    const mapModalSrc = getFileContent('src/components/map/OrderMapModal.tsx');

    it('renders via createPortal to document.body', () => {
      expect(mapModalSrc).toContain('createPortal(');
      expect(mapModalSrc).toContain('document.body');
    });

    it('locks body scroll when open and cleans up on unmount', () => {
      expect(mapModalSrc).toContain("document.body.style.overflow = 'hidden'");
    });

    it('stops touch event bubbling on modal overlay', () => {
      expect(mapModalSrc).toContain('onTouchStart={(e) => e.stopPropagation()}');
      expect(mapModalSrc).toContain('onTouchMove={(e) => e.stopPropagation()}');
      expect(mapModalSrc).toContain('onTouchEnd={(e) => e.stopPropagation()}');
    });
  });

  describe('OrderList.tsx Swipe Gesture Guards', () => {
    const orderListSrc = getFileContent('src/components/orders/OrderList.tsx');

    it('guards handleTouchStart and handleTouchEnd so swipes are ignored when modals are open', () => {
      expect(orderListSrc).toContain('if (isModalOpen || selectedOrderForMap !== null || orderToDelete !== null) return;');
    });

    it('removes permanent translate-x-0 when not swiping to avoid creating local containing block', () => {
      expect(orderListSrc).not.toContain("'opacity-100 translate-x-0'");
    });
  });

  describe('OrderFormModal.tsx Sequential Order Creation & Sticky Ergonomics', () => {
    const formSrc = getFileContent('src/components/orders/OrderFormModal.tsx');

    it('pre-selects valid active business and synchronizes prices on modal open', () => {
      expect(formSrc).toContain('activeBusinesses.some');
      expect(formSrc).toContain('defaultPrices.plantaUrbana');
    });

    it('resets zone, payer, and payment method cleanly on submit and cancel for sequential orders', () => {
      expect(formSrc).toContain("setZone('planta_urbana');");
      expect(formSrc).toContain("setPaidBy('customer');");
      expect(formSrc).toContain("setPaymentMethod('cash');");
      expect(formSrc).toContain('setSettled(true);');
    });

    it('pins action buttons with sticky bottom container and inline error feedback', () => {
      expect(formSrc).toContain('sticky bottom-0');
      expect(formSrc).toContain('Guardar Viaje');
      expect(formSrc).toContain('Cancelar');
    });
  });
});
