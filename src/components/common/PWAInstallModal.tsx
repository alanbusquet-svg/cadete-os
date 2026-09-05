import React from 'react';
import { Share, PlusSquare, Smartphone } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Instalar Cadete OS en tu Celular">
      <div className="space-y-4 py-1">
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-100">Instalá la aplicación</h4>
            <p className="text-xs text-zinc-400">Usala a pantalla completa, más rápido y sin barras del navegador.</p>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-300">
            <p className="font-bold text-zinc-100 text-sm">Pasos para iPhone / iPad (Safari):</p>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-sky-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                1
              </div>
              <div>
                Tocá el botón <strong className="text-zinc-100">Compartir</strong> en la barra inferior de Safari{' '}
                <Share className="w-4 h-4 inline-block text-sky-400 mx-1 align-text-bottom" />.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-sky-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                2
              </div>
              <div>
                Deslizá hacia abajo y seleccioná{' '}
                <strong className="text-zinc-100">&quot;Agregar a pantalla de inicio&quot;</strong>{' '}
                <PlusSquare className="w-4 h-4 inline-block text-emerald-400 mx-1 align-text-bottom" />.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                3
              </div>
              <div>
                Tocá <strong className="text-zinc-100">&quot;Agregar&quot;</strong> arriba a la derecha. ¡Listo!
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-300">
            <p className="font-bold text-zinc-100 text-sm">Pasos para Android (Chrome):</p>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                1
              </div>
              <div>
                Tocá el menú de los <strong className="text-zinc-100">tres puntos (⋙)</strong> arriba a la derecha en Chrome.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                2
              </div>
              <div>
                Seleccioná <strong className="text-zinc-100">&quot;Instalar aplicación&quot;</strong> o {' '}
                <strong className="text-zinc-100">&quot;Agregar a la pantalla principal&quot;</strong>.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 text-emerald-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                3
              </div>
              <div>
                Tocá <strong className="text-zinc-100">&quot;Instalar&quot;</strong> para tener el icono directo en tu pantalla de inicio.
              </div>
            </div>
          </div>
        )}

        <Button variant="secondary" size="md" fullWidth onClick={onClose}>
          Entendido
        </Button>
      </div>
    </Modal>
  );
};
