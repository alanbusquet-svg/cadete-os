import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'full' | 'settings';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 p-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-bold text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Cadete OS instalado como app en este dispositivo</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await promptInstall();
      if (!installed) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all duration-150 active:scale-95 shadow-sm shadow-emerald-950/40 ${className}`}
          title="Descargar Cadete OS en la pantalla de inicio de tu celular"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Descargar App</span>
          <span className="sm:hidden">App</span>
        </button>
      )}

      {variant === 'settings' && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full min-h-[50px] px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600/25 via-emerald-500/20 to-emerald-600/25 hover:from-emerald-600/35 hover:to-emerald-600/35 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-150 active:scale-98 shadow-md shadow-emerald-950/40 ${className}`}
        >
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <span>Descargar e Instalar Cadete OS en tu Celular</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98 transition-all ${className}`}
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Instalar App en Pantalla de Inicio</span>
        </button>
      )}

      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isIOS={isIOS} />
    </>
  );
};