import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OSRM_DRIVING_URL,
  buildOsrmUrl,
  fetchOsrmRoute,
  type RouteResult
} from '../src/utils/routing';
import { calculateDistanceKm, estimateMotoEtaMinutes } from '../src/utils/geocoding';

describe('Routing Engine - R5 OSRM Integration (src/utils/routing.ts)', () => {
  const originalFetch = globalThis.fetch;

  // Bolívar reference points: Plaza Alsina (center) to Terminal
  const bolivarOrigin: [number, number] = [-36.2307, -61.1130]; // [lat, lng]
  const bolivarDestination: [number, number] = [-36.2260, -61.1190]; // [lat, lng]

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('OSRM Constants and URL Construction', () => {
    it('exports the standard OSRM driving endpoint URL', () => {
      expect(OSRM_DRIVING_URL).toBe('https://router.project-osrm.org/route/v1/driving');
    });

    it('buildOsrmUrl produces valid URL with coordinates formatted in {longitude},{latitude} order', () => {
      const url = buildOsrmUrl(bolivarOrigin, bolivarDestination);

      // Verify origin formatting: lng first (-61.113), lat second (-36.2307)
      // Verify destination formatting: lng first (-61.119), lat second (-36.226)
      expect(url).toContain('-61.113,-36.2307;-61.119,-36.226');
      expect(url).toBe(
        `${OSRM_DRIVING_URL}/-61.113,-36.2307;-61.119,-36.226?overview=full&geometries=geojson`
      );
      expect(url.startsWith('https://router.project-osrm.org/route/v1/driving/')).toBe(true);
      expect(url.endsWith('?overview=full&geometries=geojson')).toBe(true);
    });

    it('buildOsrmUrl strictly places longitude before latitude for any input coordinates', () => {
      const origin: [number, number] = [-34.6037, -58.3816]; // Buenos Aires Obelisk [lat, lng]
      const dest: [number, number] = [-34.6090, -58.3840];
      const url = buildOsrmUrl(origin, dest);

      expect(url).toContain('/-58.3816,-34.6037;-58.384,-34.609?');
    });
  });

  describe('fetchOsrmRoute - Success handling', () => {
    it('maps GeoJSON [lng, lat] pairs to Leaflet [lat, lng] pairs on 200 Ok response', async () => {
      // Mock GeoJSON response: coordinates are in [lng, lat]
      const mockGeoJsonCoordinates: [number, number][] = [
        [-61.1130, -36.2307],
        [-61.1140, -36.2300],
        [-61.1170, -36.2280],
        [-61.1190, -36.2260]
      ];

      const mockOsrmResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              coordinates: mockGeoJsonCoordinates,
              type: 'LineString'
            },
            legs: [],
            distance: 1250, // 1250 meters -> 1.3 km rounded to 1 decimal place
            duration: 180,
            weight_name: 'routability',
            weight: 180
          }
        ],
        waypoints: []
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockOsrmResponse
      } as Response);

      const result: RouteResult = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      // Verify fetch was called with expected URL and headers
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
      expect(calledUrl).toBe(buildOsrmUrl(bolivarOrigin, bolivarDestination));
      expect(calledInit.headers).toEqual({ Accept: 'application/json' });

      // Leaflet coordinates must be [lat, lng]
      expect(result.isFallback).toBe(false);
      expect(result.coordinates).toEqual([
        [-36.2307, -61.1130],
        [-36.2300, -61.1140],
        [-36.2280, -61.1170],
        [-36.2260, -61.1190]
      ]);
      expect(result.distanceKm).toBe(1.3); // Math.round((1250 / 1000) * 10) / 10
      expect(result.durationMinutes).toBe(estimateMotoEtaMinutes(1.3));
    });

    it('calculates distance rounded to 1 decimal place and duration via estimateMotoEtaMinutes', async () => {
      const mockOsrmResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              coordinates: [
                [-61.1130, -36.2307],
                [-61.1190, -36.2260]
              ]
            },
            distance: 2450 // 2.45 km -> rounds to 2.5 km
          }
        ]
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockOsrmResponse
      } as Response);

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      expect(result.isFallback).toBe(false);
      expect(result.distanceKm).toBe(2.5);
      expect(result.durationMinutes).toBe(estimateMotoEtaMinutes(2.5));
    });
  });

  describe('fetchOsrmRoute - Fallback handling without throwing', () => {
    it('returns straight-line fallback on network error / fetch rejection', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (offline)'));

      const fallbackDistance = calculateDistanceKm(bolivarOrigin, bolivarDestination);
      const fallbackEta = estimateMotoEtaMinutes(fallbackDistance);

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
      expect(result.distanceKm).toBe(fallbackDistance);
      expect(result.durationMinutes).toBe(fallbackEta);
    });

    it('returns straight-line fallback on HTTP 429 Rate Limit error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response);

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
      expect(result.distanceKm).toBe(calculateDistanceKm(bolivarOrigin, bolivarDestination));
      expect(result.durationMinutes).toBe(estimateMotoEtaMinutes(result.distanceKm));
    });

    it('returns straight-line fallback on HTTP 500 Internal Server Error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
    });

    it('returns fallback when OSRM returns code !== "Ok" (e.g. "NoRoute" or "InvalidQuery")', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 'NoRoute',
          message: 'Impossible route between points',
          routes: []
        })
      } as Response);

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
    });

    it('returns fallback when OSRM response has empty or missing routes array', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: []
        })
      } as Response);

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
    });

    it('returns fallback when route geometry is malformed or has fewer than 2 coordinates', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              geometry: {
                coordinates: [[-61.1130, -36.2307]] // Only 1 coordinate
              },
              distance: 0
            }
          ]
        })
      } as Response);

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
    });

    it('returns fallback when coordinates contain NaN or non-number values', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              geometry: {
                coordinates: [
                  [-61.1130, NaN],
                  ['invalid', -36.2260]
                ]
              },
              distance: 1000
            }
          ]
        })
      } as Response);

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
    });
  });

  describe('fetchOsrmRoute - Timeout & AbortSignal lifecycle', () => {
    it('returns fallback when request times out via timeoutMs option', async () => {
      // Mock a fetch that rejects on abort signal, simulating a real AbortSignal timeout
      globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) {
            return reject(new DOMException('The user aborted a request.', 'AbortError'));
          }
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The user aborted a request.', 'AbortError'));
          });
        });
      });

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination, {
        timeoutMs: 30 // Very fast 30ms timeout for test speed
      });

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
    });

    it('returns fallback immediately when an already aborted AbortSignal is passed', async () => {
      const controller = new AbortController();
      controller.abort();

      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const result = await fetchOsrmRoute(bolivarOrigin, bolivarDestination, {
        signal: controller.signal
      });

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
      // Should not even start network request if parent signal is pre-aborted
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('aborts internal controller and returns fallback if parent signal aborts during fetch', async () => {
      const parentController = new AbortController();

      globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted by parent signal', 'AbortError'));
          });
        });
      });

      const fetchPromise = fetchOsrmRoute(bolivarOrigin, bolivarDestination, {
        signal: parentController.signal,
        timeoutMs: 5000
      });

      // Trigger parent abort while fetch is pending
      setTimeout(() => {
        parentController.abort();
      }, 20);

      const result = await fetchPromise;

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([bolivarOrigin, bolivarDestination]);
    });
  });
});
