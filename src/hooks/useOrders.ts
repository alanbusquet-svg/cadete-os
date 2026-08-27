import { useMemo } from 'react';
import { useData } from '../context/DataContext';

export function useOrders(filterDate?: string) {
  const { orders, selectedDate, addOrder, updateOrder, deleteOrder, settleOrder, settleOrdersBatch } = useData();

  const activeDate = filterDate || selectedDate;

  // Pedidos del día seleccionado ordenados cronológicamente (más recientes primero)
  const dayOrders = useMemo(() => {
    return orders
      .filter((o) => o.date === activeDate)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [orders, activeDate]);

  // Total de pedidos históricos
  const totalHistoricalOrdersCount = orders.length;

  return {
    orders,
    dayOrders,
    selectedDate: activeDate,
    totalHistoricalOrdersCount,
    addOrder,
    updateOrder,
    deleteOrder,
    settleOrder,
    settleOrdersBatch
  };
}
