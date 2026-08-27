import { useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { calculateBusinessDebt, calculateAllBusinessesDebt } from '../utils/calculations';
import type { Business, BusinessDebtSummary } from '../types';

export function useBusinesses() {
  const { businesses, orders, addBusiness, updateBusiness, deleteBusiness, settleOrdersBatch } = useData();

  const activeBusinesses = useMemo(() => {
    return businesses.filter((b) => b.active);
  }, [businesses]);

  const debts: BusinessDebtSummary[] = useMemo(() => {
    return calculateAllBusinessesDebt(businesses, orders);
  }, [businesses, orders]);

  const totalPendingDebt = useMemo(() => {
    return debts.reduce((sum, d) => sum + d.totalDebt, 0);
  }, [debts]);

  const getBusinessById = useCallback(
    (id: string): Business | undefined => {
      return businesses.find((b) => b.id === id);
    },
    [businesses]
  );

  const getBusinessDebt = useCallback(
    (businessId: string): BusinessDebtSummary => {
      return calculateBusinessDebt(orders, businessId);
    },
    [orders]
  );

  const settleBusinessDebt = useCallback(
    (businessId: string) => {
      const debtSummary = calculateBusinessDebt(orders, businessId);
      const orderIds = debtSummary.orders.map((o) => o.id);
      if (orderIds.length > 0) {
        settleOrdersBatch(orderIds);
      }
    },
    [orders, settleOrdersBatch]
  );

  return {
    businesses,
    activeBusinesses,
    debts,
    totalPendingDebt,
    getBusinessById,
    getBusinessDebt,
    settleBusinessDebt,
    addBusiness,
    updateBusiness,
    deleteBusiness
  };
}
