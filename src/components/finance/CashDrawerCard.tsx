import React, { useState } from 'react';
import { Banknote, Smartphone, Clock, ShieldCheck, Coins, Edit3, Check, DollarSign } from 'lucide-react';
import { useFinancials } from '../../hooks/useFinancials';
import { useData } from '../../context/DataContext';
import { formatCurrency } from '../../utils/formatting';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

export const CashDrawerCard: React.FC = () => {
  const { summary, selectedDate } = useFinancials();
  const { setStartingCash } = useData();

  const [isEditingFloat, setIsEditingFloat] = useState<boolean>(false);
  const [floatAmount, setFloatAmount] = useState<string>(
    summary.startingCash && summary.startingCash > 0 ? String(summary.startingCash) : ''
  );

  const startingCash = summary.startingCash || 0;
  const realCashEarned = summary.realCashEarned ?? (summary.cashInPocket - startingCash);

  const handleSaveFloat = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = parseFloat(floatAmount.replace(',', '.')) || 0;
    setStartingCash(cleanNum, selectedDate);
    setIsEditingFloat(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            Arqueo de Caja (Fin de Turno)
          </h3>
        </div>

        {/* Quick Edit Starting Cash Float */}
        <button
          type="button"
          onClick={() => {
            setFloatAmount(startingCash > 0 ? String(startingCash) : '');
            setIsEditingFloat(!isEditingFloat);
          }}
          className="text-xs font-semibold text-zinc-400 hover:text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>{startingCash > 0 ? `Fondo: ${formatCurrency(startingCash)}` : 'Cargar Fondo'}</span>
          <Edit3 className="w-3 h-3 text-zinc-400" />
        </button>
      </div>

      {/* Inline Float Editor */}
      {isEditingFloat && (
        <form
          onSubmit={handleSaveFloat}
          className="bg-zinc-950/80 border border-amber-500/40 rounded-2xl p-3.5 space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4" /> Fondo de Cambio Inicial
            </span>
            <span className="text-[11px] text-zinc-400">
              Efectivo con el que salís a la calle
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={floatAmount}
                onChange={(e) => setFloatAmount(e.target.value)}
                leftElement={<DollarSign className="w-4 h-4 text-amber-400" />}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Check className="w-4 h-4" />}
            >
              Guardar
            </Button>
          </div>
        </form>
      )}

      {/* 2 Main Vault Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Efectivo en Bolsillo (Physical Total) */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-950/60 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Total Efectivo en Bolsillo
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-300 tracking-tight">
              {formatCurrency(summary.cashInPocket)}
            </span>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Billetes físicos en mano al cierre
            </p>
          </div>
        </div>

        {/* 2. Dinero en Cuenta */}
        <div className="bg-gradient-to-br from-sky-950/40 to-zinc-950/60 border border-sky-500/30 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Dinero en Cuenta
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-sky-300 tracking-tight">
              {formatCurrency(summary.moneyInAccount)}
            </span>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Mercado Pago / Transferencias bancarias
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Line: Fondo de Cambio & Efectivo Real Ganado */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        {startingCash > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-400/90">
            <span className="font-semibold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> Fondo de Cambio:
            </span>
            <span className="font-bold">
              -{formatCurrency(startingCash)}
            </span>
          </div>
        )}

        <div
          className={`flex items-center justify-between text-xs ${
            startingCash > 0 ? 'pt-1 border-t border-zinc-800/80' : ''
          }`}
        >
          <span className="font-bold text-emerald-400 uppercase tracking-wider">
            Efectivo Real Ganado:
          </span>
          <span className="font-black text-sm text-emerald-400">
            {formatCurrency(realCashEarned)}
          </span>
        </div>
      </div>

      {/* 3. Por Cobrar a Comercios (Deuda del día) */}
      {summary.unsettledRevenue > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-amber-300">
                Cuentas Corrientes del Día
              </span>
              <span className="text-[11px] text-zinc-400">
                Pendiente de liquidación por comercios
              </span>
            </div>
          </div>
          <span className="text-base font-black text-amber-400 tracking-tight">
            {formatCurrency(summary.unsettledRevenue)}
          </span>
        </div>
      )}
    </div>
  );
};
