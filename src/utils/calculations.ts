// ==========================================
// CADETE OS - FINANCIAL & ODOMETER CALCULATIONS
// ==========================================

import type {
  Order,
  Expense,
  Business,
  MaintenanceRecord,
  DailyFinancialSummary,
  BusinessDebtSummary,
  OilOdometerStatus,
  OilStatusLevel,
  BusinessProfitability,
  GoalProgress,
  DayFinancialSummary,
  WeeklyFinancialSummary
} from '../types';

/**
 * Calcula el resumen financiero diario y arqueo de caja para una fecha específica (YYYY-MM-DD)
 */
export function calculateDailySummary(
  orders: Order[],
  expenses: Expense[],
  date: string,
  startingCash: number = 0
): DailyFinancialSummary {
  const dayOrders = orders.filter((o) => o.date === date);
  const dayExpenses = expenses.filter((e) => e.date === date);

  let totalRevenue = 0;
  let cashCollected = 0;
  let transferCollected = 0;
  let unsettledRevenue = 0;

  for (const order of dayOrders) {
    const amount = Number(order.amount) || 0;
    totalRevenue += amount;

    if (order.paidBy === 'customer') {
      // Cobrado directamente al cliente
      if (order.paymentMethod === 'cash') {
        cashCollected += amount;
      } else {
        transferCollected += amount;
      }
    } else if (order.paidBy === 'business') {
      // Paga el comercio
      if (order.settled) {
        // Cobrado de inmediato o liquidado
        if (order.paymentMethod === 'cash') {
          cashCollected += amount;
        } else {
          transferCollected += amount;
        }
      } else {
        // Pendiente en cuenta corriente (no entra a caja aún)
        unsettledRevenue += amount;
      }
    }
  }

  let totalExpenses = 0;
  let cashExpenses = 0;
  let transferExpenses = 0;

  for (const expense of dayExpenses) {
    const amount = Number(expense.amount) || 0;
    totalExpenses += amount;

    if (expense.paymentMethod === 'cash') {
      cashExpenses += amount;
    } else {
      transferExpenses += amount;
    }
  }

  const netProfit = totalRevenue - totalExpenses;
  const realCashEarned = cashCollected - cashExpenses;
  const initialCash = Number(startingCash) || 0;
  const cashInPocket = initialCash + realCashEarned;
  const moneyInAccount = transferCollected - transferExpenses;

  return {
    date,
    totalOrdersCount: dayOrders.length,
    totalRevenue,
    totalExpenses,
    netProfit,
    cashInPocket,
    moneyInAccount,
    unsettledRevenue,
    startingCash: initialCash,
    realCashEarned
  };
}

/**
 * Calcula la deuda acumulada de un comercio específico por pedidos no liquidados (paidBy == 'business' && settled == false)
 */
export function calculateBusinessDebt(
  orders: Order[],
  businessId: string
): BusinessDebtSummary {
  const unsettledOrders = orders.filter(
    (o) => o.businessId === businessId && o.paidBy === 'business' && !o.settled
  );

  const totalDebt = unsettledOrders.reduce(
    (sum, o) => sum + (Number(o.amount) || 0),
    0
  );

  const businessName = unsettledOrders[0]?.businessName || '';

  return {
    businessId,
    businessName,
    unsettledOrdersCount: unsettledOrders.length,
    totalDebt,
    orders: unsettledOrders
  };
}

/**
 * Calcula la deuda de todos los comercios activos
 */
export function calculateAllBusinessesDebt(
  businesses: Business[],
  orders: Order[]
): BusinessDebtSummary[] {
  return businesses.map((business) => {
    const debtSummary = calculateBusinessDebt(orders, business.id);
    return {
      ...debtSummary,
      businessName: business.name
    };
  });
}

/**
 * Calcula el estado del odómetro virtual de aceite y el nivel del semáforo
 * @param totalHistoricalOrders Total de pedidos históricos acumulados en el sistema
 * @param lastOilRecord Último registro de cambio de aceite (isOilChange === true)
 * @param thresholds Umbrales configurados (por defecto 250 pedidos y 30 días)
 * @param referenceDate Fecha de referencia (por defecto hoy)
 */
export function calculateOilOdometer(
  totalHistoricalOrders: number,
  lastOilRecord?: MaintenanceRecord,
  thresholds: { orders: number; days: number } = { orders: 250, days: 30 },
  referenceDate: Date = new Date()
): OilOdometerStatus {
  const thresholdOrders = thresholds.orders || 250;
  const thresholdDays = thresholds.days || 30;

  const ordersSnapshot = lastOilRecord ? (lastOilRecord.ordersSnapshot ?? 0) : 0;
  const ordersSinceLastChange = Math.max(0, totalHistoricalOrders - ordersSnapshot);

  let daysSinceLastChange = 0;
  let lastChangeDate: string | undefined = undefined;

  if (lastOilRecord && lastOilRecord.date) {
    lastChangeDate = lastOilRecord.date;
    const [year, month, day] = lastOilRecord.date.split('-').map(Number);
    if (year && month && day) {
      const lastDate = new Date(year, month - 1, day);
      const diffTime = referenceDate.getTime() - lastDate.getTime();
      daysSinceLastChange = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }
  }

  // Cálculo de umbrales amarillos (80% del umbral rojo)
  const yellowOrdersThreshold = Math.floor(thresholdOrders * 0.8); // 200 con base 250
  const yellowDaysThreshold = Math.floor(thresholdDays * (25 / 30)); // 25 con base 30

  let status: OilStatusLevel = 'green';

  if (ordersSinceLastChange > thresholdOrders || daysSinceLastChange > thresholdDays) {
    status = 'red';
  } else if (
    ordersSinceLastChange >= yellowOrdersThreshold ||
    daysSinceLastChange >= yellowDaysThreshold
  ) {
    status = 'yellow';
  } else {
    status = 'green';
  }

  return {
    ordersSinceLastChange,
    daysSinceLastChange,
    thresholdOrders,
    thresholdDays,
    status,
    lastChangeDate,
    ordersSnapshot,
    totalHistoricalOrders
  };
}

/**
 * Calcula la duración del turno en horas con soporte para turnos que cruzan la medianoche
 */
export function calculateShiftDurationHours(
  startTime?: string,
  endTime?: string,
  _referenceDate?: string
): number {
  if (!startTime || !endTime) return 0;
  const cleanStart = startTime.trim();
  const cleanEnd = endTime.trim();
  if (!cleanStart || !cleanEnd) return 0;

  // Si son strings ISO completos
  if (cleanStart.includes('T') || cleanEnd.includes('T')) {
    const startMs = Date.parse(cleanStart);
    const endMs = Date.parse(cleanEnd);
    if (!isNaN(startMs) && !isNaN(endMs)) {
      const diffHours = (endMs - startMs) / (1000 * 60 * 60);
      return diffHours > 0 ? Number(diffHours.toFixed(2)) : 0;
    }
  }

  // Formato HH:mm o HH:mm:ss
  const startParts = cleanStart.split(':').map(Number);
  const endParts = cleanEnd.split(':').map(Number);

  const startH = startParts[0];
  const startM = startParts[1];
  const endH = endParts[0];
  const endM = endParts[1];

  if (
    startH === undefined ||
    startM === undefined ||
    endH === undefined ||
    endM === undefined ||
    isNaN(startH) ||
    isNaN(startM) ||
    isNaN(endH) ||
    isNaN(endM)
  ) {
    return 0;
  }

  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  let diffMinutes = 0;
  if (endTotalMinutes >= startTotalMinutes) {
    diffMinutes = endTotalMinutes - startTotalMinutes;
  } else {
    // Cruzó medianoche (ej: 22:00 a 03:00 -> 1440 - 1320 + 180 = 300 min = 5 hs)
    diffMinutes = 24 * 60 - startTotalMinutes + endTotalMinutes;
  }

  const hours = diffMinutes / 60;
  return Number(hours.toFixed(2));
}

/**
 * Calcula la ganancia neta por hora trabajada con protección contra división por cero
 */
export function calculateHourlyProfitRate(netProfit: number, hoursWorked: number): number {
  if (!hoursWorked || hoursWorked <= 0 || !isFinite(hoursWorked) || isNaN(hoursWorked)) {
    return 0;
  }
  const profit = Number(netProfit) || 0;
  return Math.round(profit / hoursWorked);
}

/**
 * Calcula la rentabilidad y promedio de ganancia por viaje de cada comercio (R4)
 * Ordenado de mayor a menor rentabilidad promedio
 */
export function calculateBusinessProfitability(
  businesses: Business[],
  orders: Order[]
): BusinessProfitability[] {
  const result: BusinessProfitability[] = businesses.map((business) => {
    const bizOrders = orders.filter((o) => o.businessId === business.id);
    const totalOrders = bizOrders.length;
    const totalRevenue = bizOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const averageProfitPerTrip = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      businessId: business.id,
      businessName: business.name,
      totalOrders,
      totalRevenue,
      averageProfitPerTrip
    };
  });

  return result.sort((a, b) => {
    if (b.averageProfitPerTrip !== a.averageProfitPerTrip) {
      return b.averageProfitPerTrip - a.averageProfitPerTrip;
    }
    return b.totalRevenue - a.totalRevenue;
  });
}

/**
 * Calcula el progreso respecto a la meta diaria configurada (R5)
 */
export function calculateGoalProgress(netProfit: number, dailyGoal?: number): GoalProgress {
  const goal = Number(dailyGoal) || 0;
  const profit = Number(netProfit) || 0;

  if (goal <= 0) {
    return {
      targetGoal: 0,
      currentNetProfit: profit,
      percentage: 0,
      isReached: false,
      remainingAmount: 0
    };
  }

  const rawPercentage = (profit / goal) * 100;
  const percentage = Math.max(0, Math.round(rawPercentage));
  const isReached = profit >= goal;
  const remainingAmount = isReached ? 0 : Math.max(0, goal - profit);

  return {
    targetGoal: goal,
    currentNetProfit: profit,
    percentage,
    isReached,
    remainingAmount
  };
}

/**
 * Calcula el resumen acumulado de los últimos 7 días hasta la fecha de referencia (R7)
 */
export function calculateWeeklySummary(
  orders: Order[],
  expenses: Expense[],
  referenceDate: string
): WeeklyFinancialSummary {
  const parts = referenceDate.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;

  const refDateObj = new Date(year, month, day);
  const days: DayFinancialSummary[] = [];

  for (let i = 6; i >= 0; i--) {
    const current = new Date(refDateObj);
    current.setDate(refDateObj.getDate() - i);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const dayOrders = orders.filter((o) => o.date === dateStr);
    const dayExpenses = expenses.filter((e) => e.date === dateStr);

    const ordersCount = dayOrders.length;
    const revenue = dayOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const expensesTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = revenue - expensesTotal;

    days.push({
      date: dateStr,
      ordersCount,
      revenue,
      expenses: expensesTotal,
      netProfit
    });
  }

  const startDate = days[0]?.date || referenceDate;
  const endDate = days[days.length - 1]?.date || referenceDate;
  const totalOrders = days.reduce((sum, d) => sum + d.ordersCount, 0);
  const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = days.reduce((sum, d) => sum + d.expenses, 0);
  const netProfit = totalRevenue - totalExpenses;
  const averageDailyNetProfit = Math.round(netProfit / 7);

  return {
    startDate,
    endDate,
    totalOrders,
    totalRevenue,
    totalExpenses,
    netProfit,
    averageDailyNetProfit,
    days
  };
}
