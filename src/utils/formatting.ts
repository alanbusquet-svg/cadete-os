// ==========================================
// CADETE OS - FORMATTING UTILITIES
// ==========================================

/**
 * Formatea un importe a moneda argentina (ARS), ej: "$ 52.400" o "-$ 1.500"
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const formattedNumber = absAmount.toLocaleString('es-AR');
  return isNegative ? `-$ ${formattedNumber}` : `$ ${formattedNumber}`;
}

/**
 * Convierte timestamp o fecha ISO a formato de fecha YYYY-MM-DD local
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha YYYY-MM-DD a formato argentino DD/MM/YYYY
 */
export function formatDateAR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

/**
 * Formatea un timestamp a hora HH:mm
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formatea un timestamp a fecha y hora DD/MM/YYYY HH:mm
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Mapeo de nombres legibles para zonas
 */
export function getZoneLabel(zone: string): string {
  switch (zone) {
    case 'planta_urbana':
      return 'Planta Urbana';
    case 'barrio_cerca':
      return 'Barrio Cerca';
    case 'barrio_lejos':
      return 'Barrio Lejos';
    case 'custom':
      return 'Personalizado';
    default:
      return zone;
  }
}

/**
 * Mapeo de nombres legibles para categorías de gastos
 */
export function getExpenseCategoryLabel(category: string): string {
  switch (category) {
    case 'fuel':
      return 'Nafta / Combustible';
    case 'food':
      return 'Comida / Bebida';
    case 'puncture':
      return 'Gomería / Pinchadura';
    case 'phone':
      return 'Celular / Datos';
    case 'other':
      return 'Otros Gastos';
    default:
      return category;
  }
}

/**
 * Formatea una duración en horas a formato legible "Xh Ym"
 */
export function formatDurationHM(hours: number): string {
  if (!hours || hours <= 0 || !isFinite(hours) || isNaN(hours)) {
    return '0h 0m';
  }
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}
