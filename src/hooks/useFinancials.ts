import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  calculateDailySummary,
  calculateShiftDurationHours,
  calculateHourlyProfitRate,
  calculateGoalProgress
} from '../utils/calculations';
import type { DailyFinancialSummary, GoalProgress, Shift } from '../types';

export function useFinancials(customDate?: string) {
  const { orders, expenses, shifts, selectedDate, setSelectedDate } = useData();
  const { user } = useAuth();

  const activeDate = customDate || selectedDate;

  const currentShift: Shift | undefined = useMemo(() => {
    return shifts.find((s) => s.date === activeDate);
  }, [shifts, activeDate]);

  const startingCash = currentShift?.startingCash || 0;

  const shiftDurationHours = useMemo(() => {
    return calculateShiftDurationHours(currentShift?.startTime, currentShift?.endTime, activeDate);
  }, [currentShift?.startTime, currentShift?.endTime, activeDate]);

  const baseSummary: DailyFinancialSummary = useMemo(() => {
    return calculateDailySummary(orders, expenses, activeDate, startingCash);
  }, [orders, expenses, activeDate, startingCash]);

  const hourlyProfitRate = useMemo(() => {
    return calculateHourlyProfitRate(baseSummary.netProfit, shiftDurationHours);
  }, [baseSummary.netProfit, shiftDurationHours]);

  const summary: DailyFinancialSummary = useMemo(() => {
    return {
      ...baseSummary,
      shiftDurationHours: shiftDurationHours > 0 ? shiftDurationHours : undefined,
      hourlyProfitRate: shiftDurationHours > 0 ? hourlyProfitRate : undefined
    };
  }, [baseSummary, shiftDurationHours, hourlyProfitRate]);

  const goalProgress: GoalProgress = useMemo(() => {
    return calculateGoalProgress(summary.netProfit, user?.settings?.dailyGoal);
  }, [summary.netProfit, user?.settings?.dailyGoal]);

  // Desglose de gastos por categoría para el día activo
  const expensesByCategory = useMemo(() => {
    const dayExpenses = expenses.filter((e) => e.date === activeDate);
    const initial = {
      fuel: 0,
      food: 0,
      puncture: 0,
      phone: 0,
      other: 0
    };
    for (const exp of dayExpenses) {
      if (exp.category in initial) {
        initial[exp.category] += Number(exp.amount) || 0;
      } else {
        initial.other += Number(exp.amount) || 0;
      }
    }
    return initial;
  }, [expenses, activeDate]);

  return {
    selectedDate: activeDate,
    setSelectedDate,
    summary,
    expensesByCategory,
    currentShift,
    goalProgress,
    shiftDurationHours,
    hourlyProfitRate
  };
}
