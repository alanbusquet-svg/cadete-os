import React, { useState } from 'react';
import { Plus, Fuel, Utensils, Disc, Smartphone, MoreHorizontal, Trash2 } from 'lucide-react';
import { useExpenses } from '../../hooks/useExpenses';
import { useFinancials } from '../../hooks/useFinancials';
import { ExpenseFormModal } from './ExpenseFormModal';
import { DailySummaryCard } from './DailySummaryCard';
import { CashDrawerCard } from './CashDrawerCard';
import { ShiftTrackerCard } from './ShiftTrackerCard';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatCurrency, formatTime, getExpenseCategoryLabel } from '../../utils/formatting';
import type { ExpenseCategory } from '../../types';

export const ExpenseList: React.FC = () => {
  const { dayExpenses, deleteExpense } = useExpenses();
  const { expensesByCategory } = useFinancials();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'fuel':
        return <Fuel className="w-4 h-4 text-rose-400" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'puncture':
        return <Disc className="w-4 h-4 text-sky-400" />;
      case 'phone':
        return <Smartphone className="w-4 h-4 text-purple-400" />;
      default:
        return <MoreHorizontal className="w-4 h-4 text-zinc-400" />;
    }
  };

  const handleDelete = (id: string) => {
    setExpenseToDelete(id);
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Multi-column grid on desktop (Left: Financial Cards, Right: Expenses Management & Weekly) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Daily Balance, Cash Drawer & Shift Tracker */}
        <div className="space-y-5">
          {/* 1. Resumen Diario con Meta (R5) */}
          <DailySummaryCard />

          {/* 2. Arqueo de Caja con Fondo de Cambio (R2) */}
          <CashDrawerCard />

          {/* 3. Control de Turno y Rendimiento (R6) */}
          <ShiftTrackerCard />
        </div>

        {/* Right Column: Gastos Operativos & Resumen Semanal (R7) */}
        <div className="space-y-5">
          {/* 4. Resumen Semanal de 7 Días (R7) */}
          <WeeklySummaryCard />

          {/* 5. Panel de Gastos Operativos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Gastos del Turno
              </h3>

              <Button
                variant="danger"
                size="md"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4 stroke-[3]" />}
              >
                Cargar Gasto
              </Button>
            </div>

            {/* Desglose Rápido por Categorías */}
            {dayExpenses.length > 0 && (
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3 flex flex-wrap gap-2 text-xs">
                {expensesByCategory.fuel > 0 && (
                  <span className="bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800 text-zinc-300">
                    ⛽ Nafta: <strong>{formatCurrency(expensesByCategory.fuel)}</strong>
                  </span>
                )}
                {expensesByCategory.food > 0 && (
                  <span className="bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800 text-zinc-300">
                    🍔 Comida: <strong>{formatCurrency(expensesByCategory.food)}</strong>
                  </span>
                )}
                {expensesByCategory.puncture > 0 && (
                  <span className="bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800 text-zinc-300">
                    🔧 Gomería: <strong>{formatCurrency(expensesByCategory.puncture)}</strong>
                  </span>
                )}
                {expensesByCategory.phone > 0 && (
                  <span className="bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800 text-zinc-300">
                    📱 Celular: <strong>{formatCurrency(expensesByCategory.phone)}</strong>
                  </span>
                )}
                {expensesByCategory.other > 0 && (
                  <span className="bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800 text-zinc-300">
                    📦 Otros: <strong>{formatCurrency(expensesByCategory.other)}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Historial de Gastos del Turno */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
                Detalle de Gastos ({dayExpenses.length})
              </h4>

              {dayExpenses.length > 0 ? (
                dayExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-zinc-100 truncate">
                          {expense.description}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-zinc-400">
                            {getExpenseCategoryLabel(expense.category)} • {formatTime(expense.timestamp)}
                          </span>
                          <Badge variant={expense.paymentMethod === 'cash' ? 'emerald' : 'blue'} size="sm">
                            {expense.paymentMethod === 'cash' ? 'Efectivo' : 'Transf'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-black text-rose-400">
                        -{formatCurrency(expense.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 px-4 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400">
                  No registraste gastos en este turno.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Modal Confirmación de Eliminación */}
      <ConfirmDialog
        isOpen={expenseToDelete !== null}
        title="Eliminar Gasto"
        message="¿Estás seguro de que querés eliminar este registro de gasto del turno?"
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
};
