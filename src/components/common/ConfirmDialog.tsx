import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from './Button';
import { useModalBackHandler } from '../../hooks/useModalBackHandler';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;              // Default: "Eliminar"
  cancelLabel?: string;               // Default: "Cancelar"
  confirmVariant?: 'danger' | 'primary'; // Default: 'danger'
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'danger'
}) => {
  const { handleProgrammaticClose } = useModalBackHandler({
    isOpen,
    onClose: onCancel,
    modalId: 'confirm-dialog'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 cursor-pointer" onClick={handleProgrammaticClose} aria-hidden="true" />

      {/* Dialog card */}
      <div className="relative w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2rem] sm:rounded-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col space-y-4">
        {/* Mobile handle - Interactive tap zone */}
        <button
          type="button"
          onClick={handleProgrammaticClose}
          className="w-full min-h-[44px] flex items-center justify-center py-2 sm:hidden flex-shrink-0 cursor-pointer group focus:outline-none"
          aria-label="Tocar para cerrar"
          title="Tocar para cerrar"
        >
          <div className="w-12 h-1.5 bg-zinc-700 group-hover:bg-zinc-500 rounded-full transition-colors" />
        </button>

        {/* Content row */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              confirmVariant === 'danger'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {confirmVariant === 'danger' ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-lg font-bold text-zinc-100 leading-snug">{title}</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{message}</p>
          </div>

          <button
            type="button"
            onClick={handleProgrammaticClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex items-center justify-center transition-colors shrink-0 active:scale-95"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buttons (min 52px touch target) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleProgrammaticClose}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={confirmVariant}
            size="md"
            fullWidth
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

