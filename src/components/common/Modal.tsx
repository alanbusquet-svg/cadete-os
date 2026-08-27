import React, { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md'
}) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-lg',
    lg: 'max-w-xl',
    full: 'max-w-full h-[95vh]'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] z-10 transition-transform duration-300 animate-in slide-in-from-bottom-8',
          sizeClasses[size]
        )}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-1 sm:hidden flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-3 border-b border-zinc-800/80 flex-shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-zinc-100">{title}</h2>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-6 border-t border-zinc-800/80 bg-zinc-900/90 rounded-b-none sm:rounded-b-3xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
