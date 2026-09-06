import { calculateDistanceKm, estimateMotoEtaMinutes } from './geocoding';

export interface RouteResult {
  coordinates: [number, number][]; // Leaflet [lat, lng] pairs
  distanceKm: number;
  durationMinutes: number;
  isFallback: boolean;
}

export interface FetchRouteOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export const OSRM_DRIVING_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Builds the OSRM public API URL for driving directions between two coordinates.
 * CRITICAL: OSRM expects coordinates in {lng},{lat} order!
 */
export function buildOsrmUrl(origin: [number, number], destination: [number, number]): string {
  const [originLat, originLng] = origin;
  const [destLat, destLng] = destination;
  return `${OSRM_DRIVING_URL}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
}

/**
 * Fetches real street driving route from public OSRM.
 * Returns genuine polyline coordinates or falls back to straight line if offline/error/timeout.
 */
export async function fetchOsrmRoute(
  origin: [number, number],
  destination: [number, number],
  options: FetchRouteOptions = {}
): Promise<RouteResult> {
  const fallbackDistanceKm = calculateDistanceKm(origin, destination);
  const fallbackEtaMinutes = estimateMotoEtaMinutes(fallbackDistanceKm);
  const fallbackResult: RouteResult = {
    coordinates: [origin, destination],
    distanceKm: fallbackDistanceKm,
    durationMinutes: fallbackEtaMinutes,
    isFallback: true
  };

  const timeoutMs = options.timeoutMs ?? 3500;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  let onParentAbort: (() => void) | undefined;
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      return fallbackResult;
    }
    onParentAbort = () => {
      controller.abort();
    };
    options.signal.addEventListener('abort', onParentAbort, { once: true });
  }

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (options.signal && onParentAbort) {
      options.signal.removeEventListener('abort', onParentAbort);
    }
  };

  try {
    const url = buildOsrmUrl(origin, destination);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      cleanup();
      return fallbackResult;
    }

    const data = await response.json();
    if (data?.code !== 'Ok' || !Array.isArray(data?.routes) || data.routes.length === 0) {
      cleanup();
      return fallbackResult;
    }

    const route = data.routes[0];
    const rawCoords = route?.geometry?.coordinates;
    if (
      !Array.isArray(rawCoords) ||
      rawCoords.length < 2 ||
      !rawCoords.every((pt: any) => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number' && !isNaN(pt[0]) && !isNaN(pt[1]))
    ) {
      cleanup();
      return fallbackResult;
    }

    // OSRM GeoJSON format is [longitude, latitude]. Leaflet requires [latitude, longitude].
    const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]: [number, number]) => [lat, lng]);
    const distanceKm = Math.round(((route.distance ?? 0) / 1000) * 10) / 10;
    const durationMinutes = estimateMotoEtaMinutes(distanceKm);

    cleanup();
    return {
      coordinates: leafletCoords,
      distanceKm,
      durationMinutes,
      isFallback: false
    };
  } catch {
    cleanup();
    return fallbackResult;
  }
}
