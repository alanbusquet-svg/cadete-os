import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from './useOrders';
import { useMaintenance } from './useMaintenance';
import { calculateOilOdometer } from '../utils/calculations';
import type { OilOdometerStatus } from '../types';

export function useOilTracker() {
  const { user } = useAuth();
  const { orders } = useOrders();
  const { lastOilRecord, recordOilChange } = useMaintenance();

  const thresholds = useMemo(() => ({
    orders: user.settings?.oilChangeThresholdOrders || 250,
    days: user.settings?.oilChangeThresholdDays || 30
  }), [user.settings]);

  const odometer: OilOdometerStatus = useMemo(() => {
    return calculateOilOdometer(orders.length, lastOilRecord, thresholds);
  }, [orders.length, lastOilRecord, thresholds]);

  const percentageOrders = Math.min(
    100,
    Math.round((odometer.ordersSinceLastChange / (odometer.thresholdOrders || 250)) * 100)
  );

  const percentageDays = Math.min(
    100,
    Math.round((odometer.daysSinceLastChange / (odometer.thresholdDays || 30)) * 100)
  );

  return {
    ...odometer,
    percentageOrders,
    percentageDays,
    recordOilChange
  };
}
