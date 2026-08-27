import React from 'react';
import { Bike, Calendar, ChevronLeft, ChevronRight, LogOut, Sparkles, Zap } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useFinancials } from '../../hooks/useFinancials';
import { formatDateAR, getTodayDateString, formatCurrency } from '../../utils/formatting';

export const Header: React.FC = () => {
  const { selectedDate, setSelectedDate } = useData();
  const { isDemoMode, trialInfo, logout, exitDemoMode } = useAuth();
  const { summary } = useFinancials();

  const isToday = selectedDate === getTodayDateString();

  const handlePrevDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const date = new Date(parts[0] || new Date().getFullYear(), (parts[1] || 1) - 1, parts[2] || 1);
    date.setDate(date.getDate() - 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const date = new Date(parts[0] || new Date().getFullYear(), (parts[1] || 1) - 1, parts[2] || 1);
    date.setDate(date.getDate() + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleGoToday = () => {
    setSelectedDate(getTodayDateString());
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 px-4 md:px-8 py-3">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & City (Mobile shows icon + title, Desktop shows date context) */}
        <div className="flex items-center gap-2.5">
          <div className="md:hidden w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Bike className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-tight text-base text-zinc-100">
                {isToday ? 'Turno de Hoy' : `Turno ${formatDateAR(selectedDate)}`}
              </span>
              {isToday && (
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  En Curso
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {formatDateAR(selectedDate)}
            </span>
          </div>
        </div>

        {/* Right side: Auth/Trial Pill, Date Navigator & Net Stat */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Trial / Demo Status Pill */}
          {isDemoMode ? (
            <button
              type="button"
              onClick={exitDemoMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors"
              title="Modo Demo activo. Hacé clic para crear cuenta o iniciar sesión."
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Modo Demo</span>
              <span className="text-[10px] bg-amber-500/20 px-1 py-0.5 rounded text-amber-300 font-extrabold">
                Acceder
              </span>
            </button>
          ) : (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                trialInfo.isExpired
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              }`}
              title={trialInfo.isExpired ? 'Prueba gratuita finalizada' : `Prueba gratis activa: ${trialInfo.daysRemaining} días restantes`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{trialInfo.isExpired ? 'Prueba Vencida' : `Prueba: ${trialInfo.daysRemaining}d`}</span>
            </div>
          )}

          {/* Quick Date Navigation Controls (R7: < , Hoy , >) */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
              title="Día anterior"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {!isToday ? (
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2.5 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors hover:bg-emerald-500/30"
                title="Volver a hoy"
              >
                Hoy
              </button>
            ) : (
              <span className="px-2 text-xs font-bold text-zinc-400">Hoy</span>
            )}

            <button
              type="button"
              onClick={handleNextDay}
              className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
              title="Día siguiente"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Date Picker Input */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                aria-label="Seleccionar fecha específica"
              />
              <div
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-colors cursor-pointer"
                title="Elegir fecha en calendario"
              >
                <Calendar className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Quick Net Revenue Pill */}
          <div className="hidden md:flex flex-col items-end pl-2 border-l border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Neto
            </span>
            <span
              className={`text-sm font-black tracking-tight ${
                summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(summary.netProfit)}
            </span>
          </div>

          {/* Logout / Exit button */}
          <button
            type="button"
            onClick={() => logout()}
            className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors shrink-0"
            title={isDemoMode ? 'Salir de Modo Demo' : 'Cerrar Sesión'}
            aria-label={isDemoMode ? 'Salir de Modo Demo' : 'Cerrar Sesión'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
