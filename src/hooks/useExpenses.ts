import { useMemo } from 'react';
import { useData } from '../context/DataContext';

export function useExpenses(filterDate?: string) {
  const { expenses, selectedDate, addExpense, updateExpense, deleteExpense } = useData();

  const activeDate = filterDate || selectedDate;

  const dayExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date === activeDate)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [expenses, activeDate]);

  return {
    expenses,
    dayExpenses,
    selectedDate: activeDate,
    addExpense,
    updateExpense,
    deleteExpense
  };
}
