import { useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { getTodayDateString } from '../utils/formatting';
import type { MaintenanceRecord } from '../types';

export function useMaintenance() {
  const { maintenance, orders, addMaintenance, deleteMaintenance } = useData();

  // Historial ordenado (más reciente primero)
  const sortedMaintenance = useMemo(() => {
    return [...maintenance].sort((a, b) => b.timestamp - a.timestamp);
  }, [maintenance]);

  // Último cambio de aceite registrado
  const lastOilRecord = useMemo((): MaintenanceRecord | undefined => {
    return sortedMaintenance.find((m) => m.isOilChange);
  }, [sortedMaintenance]);

  // Registrar un nuevo cambio de aceite y resetear el contador al total de pedidos actual
  const recordOilChange = useCallback(
    (item: string = 'Cambio de Aceite', cost: number = 0, date: string = getTodayDateString()) => {
      const totalHistoricalOrders = orders.length;
      return addMaintenance({
        date,
        item,
        cost,
        isOilChange: true,
        ordersSnapshot: totalHistoricalOrders
      });
    },
    [orders.length, addMaintenance]
  );

  return {
    maintenance: sortedMaintenance,
    lastOilRecord,
    addMaintenance,
    deleteMaintenance,
    recordOilChange
  };
}
