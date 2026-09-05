// ==========================================
// CADETE OS - DATE & GESTURE UTILITIES
// ==========================================

import { getTodayDateString } from './formatting';

/**
 * Calcula la fecha anterior (YYYY-MM-DD) a partir de una fecha base.
 */
export function getPreviousDate(dateStr: string): string {
  if (!dateStr) return getTodayDateString();
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const monthIndex = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;

  const date = new Date(year, monthIndex, day);
  date.setDate(date.getDate() - 1);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calcula la fecha siguiente (YYYY-MM-DD) a partir de una fecha base,
 * bloqueada estrictamente en maxDateStr (por defecto hoy).
 */
export function getNextDate(
  dateStr: string,
  maxDateStr: string = getTodayDateString()
): string {
  if (!dateStr) return maxDateStr;
  if (dateStr >= maxDateStr) {
    return maxDateStr;
  }

  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const monthIndex = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;

  const date = new Date(year, monthIndex, day);
  date.setDate(date.getDate() + 1);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const nextDate = `${y}-${m}-${d}`;

  return nextDate > maxDateStr ? maxDateStr : nextDate;
}

/**
 * Determina si un elemento o su ancestro es interactivo para evitar disparar swipe sobre controles.
 */
export function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as Element;
  if (typeof el.closest === 'function') {
    return Boolean(
      el.closest('button, a, input, select, textarea, [role="button"], [data-no-swipe]')
    );
  }
  return false;
}

/**
 * Evalúa las coordenadas de un gesto táctil.
 * Retorna 'prev_day' para swipe a la derecha, 'next_day' para swipe a la izquierda, o null si no califica.
 */
export function evaluateSwipeGesture(
  deltaX: number,
  deltaY: number,
  threshold: number = 50
): 'prev_day' | 'next_day' | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX >= threshold && absX > absY) {
    return deltaX > 0 ? 'prev_day' : 'next_day';
  }
  return null;
}
