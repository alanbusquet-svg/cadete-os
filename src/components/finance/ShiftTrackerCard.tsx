import React, { useState } from 'react';
import { Clock, Play, Square, Timer, Zap, Edit2, Check } from 'lucide-react';
import { useFinancials } from '../../hooks/useFinancials';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatDurationHM } from '../../utils/formatting';
import { Button } from '../common/Button';

export const ShiftTrackerCard: React.FC = () => {
  const { currentShift, shiftDurationHours, hourlyProfitRate, summary, selectedDate } = useFinancials();
  const { startShift, endShift } = useData();

  const [isEditingTimes, setIsEditingTimes] = useState<boolean>(false);
  const [startTimeInput, setStartTimeInput] = useState<string>(currentShift?.startTime || '08:00');
  const [endTimeInput, setEndTimeInput] = useState<string>(currentShift?.endTime || '');

  const hasShift = Boolean(currentShift && (currentShift.startTime || currentShift.status));
  const isCompleted = currentShift?.status === 'completed' && Boolean(currentShift.endTime);

  const handleStartNow = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    startShift(selectedDate, undefined, timeStr);
  };

  const handleEndNow = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    endShift(selectedDate, timeStr);
  };

  const handleSaveCustomTimes = (e: React.FormEvent) => {
    e.preventDefault();
    if (startTimeInput) {
      startShift(selectedDate, undefined, startTimeInput);
    }
    if (endTimeInput) {
      endShift(selectedDate, endTimeInput);
    }
    setIsEditingTimes(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Control de Turno y Rendimiento
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStartTimeInput(currentShift?.startTime || '08:00');
            setEndTimeInput(currentShift?.endTime || '');
            setIsEditingTimes(!isEditingTimes);
          }}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          title="Editar horarios manualmente"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Ajustar</span>
        </button>
      </div>

      {/* R6: Metrics Grid (Horario, Duración, $/hr) */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* 1. Horario */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Horario
          </span>
          <span className="text-xs font-black text-zinc-100 mt-1 truncate">
            {currentShift?.startTime
              ? `${currentShift.startTime} - ${currentShift.endTime || '...'}`
              : 'Sin registrar'}
          </span>
        </div>

        {/* 2. Duración */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>Duración</span>
          </span>
          <span className="text-sm font-black text-sky-300 mt-1">
            {formatDurationHM(shiftDurationHours)}
          </span>
        </div>

        {/* 3. Ganancia por Hora */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>$/Hora</span>
          </span>
          <span className="text-sm font-black text-emerald-400 mt-1">
            {shiftDurationHours > 0
              ? `${formatCurrency(hourlyProfitRate)}/h`
              : formatCurrency(0)}
          </span>
        </div>
      </div>

      {/* Manual Time Inputs Modal/Form */}
      {isEditingTimes && (
        <form
          onSubmit={handleSaveCustomTimes}
          className="bg-zinc-950/90 border border-zinc-700/80 rounded-2xl p-3.5 space-y-3 animate-in fade-in"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
            Ajustar Horarios del Turno
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Hora Inicio</label>
              <input
                type="time"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                className="w-full h-11 bg-zinc-900 border border-zinc-700 rounded-xl px-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Hora Cierre</label>
              <input
                type="time"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                className="w-full h-11 bg-zinc-900 border border-zinc-700 rounded-xl px-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<Check className="w-4 h-4" />}
          >
            Guardar Horarios
          </Button>
        </form>
      )}

      {/* Action Buttons: Iniciar Turno / Cerrar Turno */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={handleStartNow}
          className="min-h-[52px] rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Play className="w-4 h-4 fill-emerald-400" />
          <span>{hasShift ? 'Reiniciar Inicio' : 'Iniciar Turno'}</span>
        </button>

        <button
          type="button"
          onClick={handleEndNow}
          className="min-h-[52px] rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Square className="w-4 h-4 fill-rose-400" />
          <span>{isCompleted ? 'Actualizar Cierre' : 'Cerrar Turno'}</span>
        </button>
      </div>

      {/* Summary Note */}
      {shiftDurationHours > 0 && (
        <p className="text-[11px] text-zinc-400 text-center">
          Ganancia neta ({formatCurrency(summary.netProfit)}) dividida en {formatDurationHM(shiftDurationHours)} trabajadas.
        </p>
      )}
    </div>
  );
};
