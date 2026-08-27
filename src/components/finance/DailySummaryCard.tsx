import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Check, Edit3 } from 'lucide-react';
import { useFinancials } from '../../hooks/useFinancials';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateAR } from '../../utils/formatting';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

export const DailySummaryCard: React.FC = () => {
  const { summary, selectedDate, goalProgress } = useFinancials();
  const { user, updateProfile } = useAuth();

  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>(
    user?.settings?.dailyGoal ? String(user.settings.dailyGoal) : ''
  );

  const isProfit = summary.netProfit >= 0;
  const hasGoal = goalProgress.targetGoal > 0;
  const progressPercent = Math.min(100, Math.max(0, goalProgress.percentage));

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = parseFloat(goalInput.replace(',', '.')) || 0;
    updateProfile({
      settings: {
        ...user.settings,
        dailyGoal: cleanNum > 0 ? cleanNum : undefined
      }
    });
    setIsEditingGoal(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            Balance del Turno
          </h3>
        </div>
        <span className="text-xs text-zinc-400 font-medium">
          {formatDateAR(selectedDate)}
        </span>
      </div>

      {/* Main Net Profit Number */}
      <div className="flex flex-col bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Ganancia Neta Diaria
          </span>
          <button
            type="button"
            onClick={() => {
              setGoalInput(user?.settings?.dailyGoal ? String(user.settings.dailyGoal) : '');
              setIsEditingGoal(!isEditingGoal);
            }}
            className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>{hasGoal ? 'Editar Meta' : 'Fijar Meta'}</span>
            <Edit3 className="w-2.5 h-2.5 text-zinc-500" />
          </button>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span
            className={`text-3xl font-black tracking-tight ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(summary.netProfit)}
          </span>
          <span className="text-xs font-semibold text-zinc-400">
            ({summary.totalOrdersCount} viajes)
          </span>
        </div>
      </div>

      {/* R5: Inline Goal Editor */}
      {isEditingGoal && (
        <form
          onSubmit={handleSaveGoal}
          className="bg-zinc-950/90 border border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Target className="w-4 h-4" /> Meta de Ganancia Diaria
            </span>
            <span className="text-[11px] text-zinc-400">
              Objetivo de ganancia neta en pesos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Ej: 30000"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                leftElement={<DollarSign className="w-4 h-4 text-emerald-400" />}
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

      {/* R5: Daily Goal Progress Bar */}
      {hasGoal && (
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Target
                className={`w-4 h-4 ${
                  goalProgress.isReached ? 'text-emerald-400' : 'text-amber-400'
                }`}
              />
              <span>
                Meta: {formatCurrency(summary.netProfit)} / {formatCurrency(goalProgress.targetGoal)} ({goalProgress.percentage}%)
              </span>
            </span>

            <span
              className={`font-black text-xs px-2 py-0.5 rounded-lg ${
                goalProgress.isReached
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {goalProgress.isReached
                ? 'Meta alcanzada 🎯'
                : `Faltan ${formatCurrency(goalProgress.remainingAmount)}`}
            </span>
          </div>

          {/* Visual Progress Bar Track */}
          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                goalProgress.isReached
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                  : 'bg-amber-500 shadow-sm shadow-amber-500/50'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Gross vs Expenses Grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Total Facturado */}
        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-3 flex flex-col">
          <div className="flex items-center gap-1 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Facturado</span>
          </div>
          <span className="text-lg font-bold text-zinc-100 mt-1">
            {formatCurrency(summary.totalRevenue)}
          </span>
        </div>

        {/* Total Gastos */}
        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-3 flex flex-col">
          <div className="flex items-center gap-1 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Gastos</span>
          </div>
          <span className="text-lg font-bold text-rose-400 mt-1">
            {formatCurrency(summary.totalExpenses)}
          </span>
        </div>
      </div>
    </div>
  );
};
