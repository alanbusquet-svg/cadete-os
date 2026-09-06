import React, { type ReactNode } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useModalBackHandler } from '../../hooks/useModalBackHandler';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'full';
  modalId?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  modalId = 'modal'
}) => {
  const { handleProgrammaticClose } = useModalBackHandler({
    isOpen,
    onClose,
    modalId
  });

  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-lg',
    lg: 'max-w-xl',
    full: 'max-w-full h-[95vh]'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="fixed inset-0 cursor-pointer" onClick={handleProgrammaticClose} aria-hidden="true" />

      {/* Modal Container */}
      <div
        className={cn(
          'relative w-full bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] z-10 transition-transform duration-300 animate-in slide-in-from-bottom-8',
          sizeClasses[size]
        )}
      >
        {/* Mobile Drag Indicator - Interactive touch target */}
        <button
          type="button"
          onClick={handleProgrammaticClose}
          className="w-full min-h-[44px] flex items-center justify-center py-2 sm:hidden flex-shrink-0 cursor-pointer group focus:outline-none"
          aria-label="Tocar para cerrar modal"
          title="Tocar para cerrar"
        >
          <div className="w-12 h-1.5 bg-zinc-700 group-hover:bg-zinc-500 rounded-full transition-colors" />
        </button>

        {/* Header Row: Dual Dismissal + Generous Touch Targets */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-1 sm:pt-4 pb-3 border-b border-zinc-800/80 flex-shrink-0 gap-3">
          {/* Left Back Button (Thumb Reachable) */}
          <button
            type="button"
            onClick={handleProgrammaticClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 transition-colors shrink-0 active:scale-95"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Centered / Expanding Title */}
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>}
          </div>

          {/* Right Close Button */}
          <button
            type="button"
            onClick={handleProgrammaticClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors shrink-0 active:scale-95"
            aria-label="Cerrar modal"
            title="Cerrar modal"
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

