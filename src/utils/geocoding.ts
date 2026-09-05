import { BOLIVAR_CENTER } from '../hooks/useGeolocation';
import type { Order } from '../types';

export interface LatLng {
  lat: number;
  lng: number;
}

// Known points of interest & street anchors in San Carlos de Bolívar
export const BOLIVAR_ANCHORS: Record<string, [number, number]> = {
  'san martin': [-36.2307, -61.1130],
  'brown': [-36.2285, -61.1115],
  'cancio': [-36.2215, -61.1025],
  'alvear': [-36.2320, -61.1100],
  'alsina': [-36.2295, -61.1145],
  'lavalle': [-36.2325, -61.1110],
  'general paz': [-36.2275, -61.1160],
  'paz': [-36.2275, -61.1160],
  'mitre': [-36.2315, -61.1120],
  'guemes': [-36.2340, -61.1170],
  'rivadavia': [-36.2310, -61.1140],
  'belgrano': [-36.2330, -61.1135],
  'sarmiento': [-36.2290, -61.1125],
  'roca': [-36.2338, -61.1150],
  'urquiza': [-36.2280, -61.1105],
  'balcarce': [-36.2345, -61.1165],
  'los zorzales': [-36.2410, -61.1050],
  'zorzales': [-36.2410, -61.1050],
  'parque las acollaradas': [-36.2420, -61.1250],
  'acollaradas': [-36.2420, -61.1250],
  'terminal': [-36.2260, -61.1190],
  'hospital': [-36.2350, -61.1180]
};

/**
 * Normaliza una dirección eliminando tildes, prefijos de calle y números
 */
export function normalizeStreetName(address: string): string {
  return address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(^|\s)(avda\.|avda|av\.|avenida|calle|b°|barrio|pje\.|pasaje)(\s|$)/gi, ' ')
    .replace(/(^|\s)(casa|dpto|depto|piso|lote|mza|manzana)(\s|$)/gi, ' ')
    .replace(/[0-9#°,-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Genera coordenadas deterministas basadas en la zona y el ID del pedido
 * para evitar que los pines se superpongan en la misma ubicación
 */
export function getZoneFallback(zone: string, seed: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  }
  const jitterLat = ((Math.abs(hash) % 100) / 100) * 0.004 - 0.002;
  const jitterLng = (((Math.abs(hash) >> 2) % 100) / 100) * 0.004 - 0.002;

  switch (zone) {
    case 'barrio_cerca':
      return [-36.2380 + jitterLat, -61.1190 + jitterLng];
    case 'barrio_lejos':
      return [-36.2480 + jitterLat, -61.1290 + jitterLng];
    case 'planta_urbana':
    case 'custom':
    default:
      return [BOLIVAR_CENTER[0] + jitterLat, BOLIVAR_CENTER[1] + jitterLng];
  }
}

/**
 * Resuelve coordenadas para un pedido utilizando un motor multi-tier offline
 */
export function resolveOrderCoordinates(order: Order): [number, number] {
  const rawAddress = order.address?.trim() || '';
  if (!rawAddress) {
    return getZoneFallback(order.zone, order.id);
  }

  const normalized = normalizeStreetName(rawAddress);
  if (!normalized || normalized.length < 2) {
    return getZoneFallback(order.zone, order.id);
  }

  // 1. Coincidencia con diccionario de calles y puntos de Bolívar
  for (const [key, coords] of Object.entries(BOLIVAR_ANCHORS)) {
    if (normalized.includes(key) || (normalized.length >= 3 && key.includes(normalized))) {
      // Extrae altura numérica de la calle para interpolar posición
      const matchNumber = rawAddress.match(/\b\d{1,4}\b/);
      const doorNumber = matchNumber ? parseInt(matchNumber[0], 10) : 100;
      // Cada 100 números avanza ~0.0002 grados (~20-25 metros)
      const offset = ((doorNumber % 1000) / 1000) * 0.003;
      return [coords[0] - offset, coords[1] - offset];
    }
  }

  // 2. Fallback por zona con jitter anti-colisión
  return getZoneFallback(order.zone, order.id);
}

/**
 * Calcula la distancia aproximada en kilómetros entre dos coordenadas (Fórmula de Haversine)
 */
export function calculateDistanceKm(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estima el tiempo de entrega en moto en minutos
 * Asume 30 km/h velocidad media urbana + 2 min por paradas/semáforos (mínimo 3 min)
 */
export function estimateMotoEtaMinutes(distanceKm: number): number {
  const travelMinutes = (distanceKm / 30) * 60;
  return Math.max(3, Math.round(travelMinutes + 2));
}
