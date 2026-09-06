import { useEffect, useRef, useCallback } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

export interface UseModalBackHandlerOptions {
  isOpen: boolean;
  onClose: () => void;
  modalId?: string;
  enableHistory?: boolean;   // default: true
  enableEscape?: boolean;    // default: true
  enableScrollLock?: boolean;// default: true
}

export function useModalBackHandler({
  isOpen,
  onClose,
  modalId,
  enableHistory = true,
  enableEscape = true,
  enableScrollLock = true
}: UseModalBackHandlerOptions): {
  handleProgrammaticClose: () => void;
} {
  const isPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const activeModalIdRef = useRef<string>('');

  // Keep latest onClose callback without re-triggering effects
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const handleProgrammaticClose = useCallback(() => {
    if (isPushedRef.current && typeof window !== 'undefined' && window.history?.back) {
      isPushedRef.current = false;
      window.history.back();
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Generate or reuse modal identifier
    const id = modalId || 'modal_' + Math.random().toString(36).substring(2, 9);
    activeModalIdRef.current = id;

    // 1. Lock document body scrolling
    if (enableScrollLock) {
      lockBodyScroll();
    }

    // 2. Push state entry to browser history
    if (enableHistory && typeof window !== 'undefined' && window.history?.pushState) {
      const currentState = window.history.state || {};
      window.history.pushState({ ...currentState, modal: id, modalId: id }, '');
      isPushedRef.current = true;
    }

    // 3. Listen for popstate (hardware back button or browser back gesture)
    const handlePopState = (event: PopStateEvent) => {
      if (!isPushedRef.current) return;
      const currentModal = event.state?.modalId ?? event.state?.modal;
      if (currentModal !== id) {
        // Browser history was popped externally
        isPushedRef.current = false;
        onCloseRef.current();
      }
    };

    // 4. Listen for Escape keydown
    const handleKeyDown = (e: KeyboardEvent) => {
      if (enableEscape && e.key === 'Escape') {
        e.preventDefault();
        handleProgrammaticClose();
      }
    };

    if (typeof window !== 'undefined') {
      if (enableHistory && window.addEventListener) {
        window.addEventListener('popstate', handlePopState);
      }
      if (enableEscape && window.addEventListener) {
        window.addEventListener('keydown', handleKeyDown);
      }
    }

    // 5. Cleanup when modal closes or unmounts
    return () => {
      if (typeof window !== 'undefined') {
        if (enableHistory && window.removeEventListener) {
          window.removeEventListener('popstate', handlePopState);
        }
        if (enableEscape && window.removeEventListener) {
          window.removeEventListener('keydown', handleKeyDown);
        }
      }

      if (enableScrollLock) {
        unlockBodyScroll();
      }

      // If closed via UI (rather than hardware back), pop the pushed history record
      if (isPushedRef.current && typeof window !== 'undefined' && window.history?.back) {
        isPushedRef.current = false;
        window.history.back();
      }
    };
  }, [isOpen, modalId, enableHistory, enableEscape, enableScrollLock, handleProgrammaticClose]);

  return { handleProgrammaticClose };
}
