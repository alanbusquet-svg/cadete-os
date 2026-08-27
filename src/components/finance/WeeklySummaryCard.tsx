import React, { useMemo } from 'react';
import { CalendarRange, DollarSign, TrendingDown, Bike, ChevronRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { calculateWeeklySummary } from '../../utils/calculations';
import { formatCurrency, formatDateAR } from '../../utils/formatting';
import type { WeeklyFinancialSummary } from '../../types';

export const WeeklySummaryCard: React.FC = () => {
  const { orders, expenses, selectedDate, setSelectedDate } = useData();

  const weekly: WeeklyFinancialSummary = useMemo(() => {
    return calculateWeeklySummary(orders, expenses, selectedDate);
  }, [orders, expenses, selectedDate]);

  const isNetProfit = weekly.netProfit >= 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Resumen Semanal (7 Días)
            </h3>
            <p className="text-[11px] text-zinc-400">
              {formatDateAR(weekly.startDate)} al {formatDateAR(weekly.endDate)}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-zinc-300 bg-zinc-800 px-2.5 py-1 rounded-xl">
          {weekly.totalOrders} viajes
        </span>
      </div>

      {/* Main Net Profit Block */}
      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Ganancia Neta Semanal
          </span>
          <span
            className={`text-2xl font-black tracking-tight mt-0.5 ${
              isNetProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(weekly.netProfit)}
          </span>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Promedio Diario
          </span>
          <span className="text-sm font-bold text-zinc-200 mt-0.5">
            {formatCurrency(weekly.averageDailyNetProfit)}/día
          </span>
        </div>
      </div>

      {/* Gross vs Expenses Grid */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-3 flex flex-col">
          <div className="flex items-center gap-1 text-zinc-400 font-semibold uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Facturado Semanal</span>
          </div>
          <span className="text-base font-bold text-zinc-100 mt-1">
            {formatCurrency(weekly.totalRevenue)}
          </span>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-3 flex flex-col">
          <div className="flex items-center gap-1 text-zinc-400 font-semibold uppercase tracking-wider">
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Gastos Semanales</span>
          </div>
          <span className="text-base font-bold text-rose-400 mt-1">
            {formatCurrency(weekly.totalExpenses)}
          </span>
        </div>
      </div>

      {/* 7-Day Breakdown Table/List */}
      <div className="space-y-1.5 pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block px-1">
          Desglose por Día
        </span>

        <div className="space-y-1">
          {weekly.days.map((d) => {
            const isSelected = d.date === selectedDate;
            const hasActivity = d.ordersCount > 0 || d.expenses > 0;

            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-zinc-100'
                    : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-800/60 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">
                    {formatDateAR(d.date)}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                      Viendo
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Bike className="w-3 h-3 text-zinc-500" /> {d.ordersCount}
                  </span>
                  <span
                    className={`text-xs font-bold min-w-[70px] text-right ${
                      d.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {hasActivity ? formatCurrency(d.netProfit) : '$ 0'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
