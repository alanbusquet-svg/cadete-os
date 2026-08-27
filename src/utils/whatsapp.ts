// ==========================================
// CADETE OS - WHATSAPP INTEGRATION & TEXT GENERATION
// ==========================================

import type { Business, Order } from '../types';
import { formatDateAR, formatCurrency, getTodayDateString } from './formatting';

/**
 * Genera el texto formal para liquidación de cuenta corriente de un comercio
 */
export function generateWhatsAppSettlementText(
  business: Business,
  unsettledOrders: Order[]
): string {
  const todayStr = formatDateAR(getTodayDateString());
  const count = unsettledOrders.length;
  const totalDebt = unsettledOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const header = `🏍️ *CADETE OS - RESUMEN DE CUENTA*\n📍 *Comercio:* ${business.name}\n📅 *Fecha:* ${todayStr}\n📦 *Viajes pendientes:* ${count}\n💰 *TOTAL A LIQUIDAR:* ${formatCurrency(totalDebt)}\n\n*Detalle de envíos:*`;

  const details = unsettledOrders.length > 0
    ? unsettledOrders
        .map((order) => {
          const date = formatDateAR(order.date);
          const address = order.address?.trim() ? order.address.trim() : 'Envío sin dirección';
          const amount = formatCurrency(order.amount);
          return `• ${date} - ${address} (${amount})`;
        })
        .join('\n')
    : '• No hay viajes pendientes registrados.';

  const footer = `\n\n_Generado automáticamente desde Cadete OS_`;

  return `${header}\n${details}${footer}`;
}

/**
 * Sanitiza y normaliza un número de teléfono argentino al formato internacional E.164 (549...)
 */
export function sanitizeArgentinePhone(phone?: string): string {
  if (!phone || !phone.trim()) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Quitar prefijo internacional si viene con 0 nacional (ej: +54 02314... o +54 9 02314...)
  if (digits.startsWith('5490')) {
    digits = digits.substring(4);
  } else if (digits.startsWith('540')) {
    digits = digits.substring(3);
  } else if (digits.startsWith('549') && digits.length === 13) {
    return digits;
  } else if (digits.startsWith('54') && digits.length >= 12) {
    digits = digits.substring(2);
  }

  // Quitar 0 inicial si existe (prefijo nacional interurbano)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Si tiene prefijo '9' al inicio tras quitar 54 (ej: 92314551234 = 11 digitos)
  if (digits.startsWith('9') && digits.length === 11) {
    digits = digits.substring(1);
  }

  // Si contiene el prefijo 15 de celular local argentino (ej: 2314 15 123456 -> 12 dígitos)
  if (digits.length === 12) {
    if (digits.substring(2, 4) === '15') {
      digits = digits.substring(0, 2) + digits.substring(4);
    } else if (digits.substring(3, 5) === '15') {
      digits = digits.substring(0, 3) + digits.substring(5);
    } else if (digits.substring(4, 6) === '15') {
      digits = digits.substring(0, 4) + digits.substring(6);
    }
  }

  // Si tiene 10 dígitos (código de área + número local sin 15, ej: 2314123456)
  if (digits.length === 10) {
    return `549${digits}`;
  }

  if (digits.startsWith('549')) {
    return digits;
  }

  return digits ? `549${digits}` : '';
}

/**
 * Genera el link wa.me para abrir WhatsApp con el texto pre-cargado
 * Si no hay teléfono especificado, usa wa.me sin número para seleccionar contacto
 */
export function generateWhatsAppUrl(phone: string | undefined, message: string): string {
  const encodedText = encodeURIComponent(message);
  if (!phone || !phone.trim()) {
    return `https://wa.me/?text=${encodedText}`;
  }

  const finalPhone = sanitizeArgentinePhone(phone);
  return finalPhone ? `https://wa.me/${finalPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

/**
 * Genera el link directo wa.me con el mensaje "Estoy afuera con tu pedido" para el cliente (R3)
 */
export function buildCustomerWhatsAppUrl(
  phone: string,
  message: string = 'Buenas! Estoy afuera con tu pedido 🛵'
): string {
  return generateWhatsAppUrl(phone, message);
}
