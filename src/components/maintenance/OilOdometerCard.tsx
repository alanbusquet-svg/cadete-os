import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Flame, RotateCcw } from 'lucide-react';
import { useOilTracker } from '../../hooks/useOilTracker';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatDateAR } from '../../utils/formatting';

export interface OilOdometerCardProps {
  onQuickReset?: () => void;
}

export const OilOdometerCard: React.FC<OilOdometerCardProps> = ({ onQuickReset }) => {
  const {
    ordersSinceLastChange,
    daysSinceLastChange,
    thresholdOrders,
    thresholdDays,
    status,
    lastChangeDate,
    percentageOrders,
    percentageDays,
    recordOilChange
  } = useOilTracker();

  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  const handleReset = () => {
    if (onQuickReset) {
      onQuickReset();
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    recordOilChange('Cambio de Aceite (Reset Rápido)', 0);
    setIsConfirmOpen(false);
  };

  const statusConfig = {
    green: {
      title: 'Aceite en Estado Óptimo',
      subtitle: 'Motor protegido para el reparto diario',
      badgeText: 'Óptimo',
      borderColor: 'border-emerald-500/40',
      bgColor: 'from-emerald-950/40 to-zinc-900',
      textColor: 'text-emerald-400',
      barColor: 'bg-emerald-500',
      icon: CheckCircle
    },
    yellow: {
      title: 'Próximo a Cambio de Aceite',
      subtitle: 'Planificá el service en los próximos días',
      badgeText: 'Atención',
      borderColor: 'border-amber-500/50',
      bgColor: 'from-amber-950/40 to-zinc-900',
      textColor: 'text-amber-400',
      barColor: 'bg-amber-500',
      icon: AlertTriangle
    },
    red: {
      title: '¡Cambio de Aceite Urgente!',
      subtitle: 'Límite de desgaste superado. Evitá daños de motor.',
      badgeText: 'Crítico',
      borderColor: 'border-rose-500/70',
      bgColor: 'from-rose-950/50 to-zinc-900',
      textColor: 'text-rose-400',
      barColor: 'bg-rose-500',
      icon: Flame
    }
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <div
      className={`bg-gradient-to-b ${currentStatus.bgColor} border ${currentStatus.borderColor} rounded-3xl p-5 shadow-xl space-y-4 transition-all`}
    >
      {/* Header with Traffic Light Alert */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-zinc-950/60 ${currentStatus.textColor} border border-zinc-800`}
          >
            <StatusIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Odómetro Virtual
              </span>
              <span
                className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border ${
                  status === 'green'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : status === 'yellow'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {currentStatus.badgeText}
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-100 mt-0.5">
              {currentStatus.title}
            </h3>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-400">{currentStatus.subtitle}</p>

      {/* Progress Bars & Counters */}
      <div className="space-y-3 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
        {/* 1. Pedidos acumulados */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-zinc-400">Desgaste por Viajes</span>
            <span className="text-zinc-100 font-bold">
              <strong className={currentStatus.textColor}>{ordersSinceLastChange}</strong> / {thresholdOrders} pedidos
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${currentStatus.barColor} transition-all duration-500`}
              style={{ width: `${Math.min(100, percentageOrders)}%` }}
            />
          </div>
        </div>

        {/* 2. Días transcurridos */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-zinc-400">Tiempo Transcurrido</span>
            <span className="text-zinc-100 font-bold">
              <strong className={currentStatus.textColor}>{daysSinceLastChange}</strong> / {thresholdDays} días
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${currentStatus.barColor} transition-all duration-500`}
              style={{ width: `${Math.min(100, percentageDays)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Last change date & Quick Reset CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="text-xs text-zinc-400 w-full sm:w-auto">
          {lastChangeDate ? (
            <span>Último cambio: <strong>{formatDateAR(lastChangeDate)}</strong></span>
          ) : (
            <span>Sin cambio previo registrado</span>
          )}
        </div>

        <Button
          variant={status === 'red' ? 'danger' : 'primary'}
          size="md"
          fullWidth={false}
          className="w-full sm:w-auto"
          onClick={handleReset}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Cambiar Aceite (Reset)
        </Button>
      </div>

      {/* Confirm Dialog for Quick Oil Reset */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Cambiar Aceite"
        message="¿Registrar cambio de aceite? El contador virtual se reiniciará a 0 viajes y 0 días desde hoy."
        confirmLabel="Confirmar Reset"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleConfirmReset}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
