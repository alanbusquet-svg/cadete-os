import React, { useMemo } from 'react';
import { Award, TrendingUp, Store } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { calculateBusinessProfitability } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatting';
import type { BusinessProfitability } from '../../types';

export const BusinessProfitabilityCard: React.FC = () => {
  const { businesses, orders } = useData();

  const profitability: BusinessProfitability[] = useMemo(() => {
    return calculateBusinessProfitability(businesses, orders);
  }, [businesses, orders]);

  const activeWithOrders = profitability.filter((p) => p.totalOrders > 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Rentabilidad por Comercio
            </h3>
            <p className="text-[11px] text-zinc-400">
              Ranking histórico por promedio de ganancia por viaje
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-xl">
          {activeWithOrders.length} con viajes
        </span>
      </div>

      {/* Ranked List */}
      {activeWithOrders.length > 0 ? (
        <div className="space-y-2.5">
          {activeWithOrders.map((item, index) => {
            const rank = index + 1;
            const isTop1 = rank === 1;

            return (
              <div
                key={item.businessId}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isTop1
                    ? 'bg-gradient-to-r from-emerald-950/30 via-zinc-950/60 to-zinc-950/80 border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-950/50 border-zinc-800/80'
                }`}
              >
                {/* Left: Rank + Business Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isTop1
                        ? 'bg-emerald-500 text-zinc-950 shadow-md'
                        : rank === 2
                        ? 'bg-zinc-700 text-zinc-100'
                        : rank === 3
                        ? 'bg-zinc-800 text-amber-400'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {isTop1 ? <Award className="w-4 h-4" /> : `#${rank}`}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-zinc-100 truncate">
                      {item.businessName}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {item.totalOrders} {item.totalOrders === 1 ? 'viaje' : 'viajes'} • Facturado:{' '}
                      <strong className="text-zinc-300 font-semibold">{formatCurrency(item.totalRevenue)}</strong>
                    </span>
                  </div>
                </div>

                {/* Right: Average Profit per Trip */}
                <div className="flex flex-col items-end shrink-0 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Promedio / Viaje
                  </span>
                  <span className="text-base font-black text-emerald-400 tracking-tight">
                    {formatCurrency(item.averageProfitPerTrip)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 px-4 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-1">
          <Store className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
          <p className="font-semibold text-zinc-300">Sin datos de rentabilidad suficientes</p>
          <p className="text-[11px]">Cargá viajes asociados a comercios para ver las métricas de rentabilidad por parada.</p>
        </div>
      )}
    </div>
  );
};
