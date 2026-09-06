import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import {
  OSRM_DRIVING_URL,
  buildOsrmUrl,
  fetchOsrmRoute,
  type RouteResult
} from '../src/utils/routing';
import {
  calculateDistanceKm,
  estimateMotoEtaMinutes,
  BOLIVAR_ANCHORS
} from '../src/utils/geocoding';
import { CARTO_DARK_MATTER_URL } from '../src/components/map/mapConfig';
import { SPEECH_MUTED_STORAGE_KEY } from '../src/utils/speech';

describe('CHALLENGER 2 — Adversarial Verification: API Contracts, Zero-Paid-APIs & Memory Hygiene', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // =========================================================================
  // 1. ADVERSARIAL ZERO-PAID-APIS VERIFICATION
  // =========================================================================
  describe('1. Adversarial Zero-Paid-APIs Constraint Verification', () => {
    it('verifies package.json contains strictly zero paid map/speech/routing SDKs', () => {
      const pkgPath = resolve(__dirname, '../package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };

      const prohibitedSdkTokens = [
        '@googlemaps',
        'google-maps',
        'mapbox',
        'here-maps',
        'tomtom',
        'azure-maps',
        'bing-maps',
        'elevenlabs',
        '@google-cloud/text-to-speech',
        '@google-cloud/speech',
        '@azure/cognitiveservices-speech',
        'aws-sdk'
      ];

      for (const token of prohibitedSdkTokens) {
        const found = Object.keys(allDeps).find((dep) =>
          dep.toLowerCase().includes(token.toLowerCase())
        );
        expect(found).toBeUndefined();
      }
    });

    it('verifies CartoDB Dark Matter tile URL contains zero paid API keys or tracking tokens', () => {
      expect(CARTO_DARK_MATTER_URL).toBe(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      );
      expect(CARTO_DARK_MATTER_URL).not.toContain('key=');
      expect(CARTO_DARK_MATTER_URL).not.toContain('token=');
      expect(CARTO_DARK_MATTER_URL).not.toContain('apikey=');
    });

    it('verifies OSRM endpoint points to free public OpenStreetMap service without credentials', () => {
      expect(OSRM_DRIVING_URL).toBe('https://router.project-osrm.org/route/v1/driving');
      expect(OSRM_DRIVING_URL).not.toContain('access_token');
      expect(OSRM_DRIVING_URL).not.toContain('key');
    });

    it('verifies geocoding is 100% offline via local BOLIVAR_ANCHORS dictionary with >= 60 entries', () => {
      const anchorKeys = Object.keys(BOLIVAR_ANCHORS);
      expect(anchorKeys.length).toBeGreaterThanOrEqual(60);

      // Verify all anchors have valid [lat, lng] inside Bolívar radius
      for (const key of anchorKeys) {
        const [lat, lng] = BOLIVAR_ANCHORS[key]!;
        expect(lat).toBeLessThan(-36.19);
        expect(lat).toBeGreaterThan(-36.29);
        expect(lng).toBeLessThan(-61.07);
        expect(lng).toBeGreaterThan(-61.16);
      }
    });

    it('verifies that no source file in src/ imports or references paid external map/speech APIs', () => {
      const srcDir = resolve(__dirname, '../src');
      const getFilesRecursively = (dir: string): string[] => {
        let results: string[] = [];
        const list = readdirSync(dir);
        for (const file of list) {
          const fullPath = join(dir, file);
          const stat = statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath));
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(fullPath);
          }
        }
        return results;
      };

      const files = getFilesRecursively(srcDir);
      const prohibitedStrings = [
        'maps.googleapis.com/maps/api/directions',
        'maps.googleapis.com/maps/api/geocode',
        'api.mapbox.com',
        'api.elevenlabs.io',
        'texttospeech.googleapis.com'
      ];

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        for (const prohibited of prohibitedStrings) {
          expect(content).not.toContain(prohibited);
        }
      }
    });
  });

  // =========================================================================
  // 2. OSRM API CONTRACT ADHERENCE
  // =========================================================================
  describe('2. OSRM API Contract Adherence ({lng},{lat} order, geometries=geojson, Leaflet mapping)', () => {
    it('strictly enforces {lng},{lat} coordinate order in URL construction for any input points', () => {
      // Test cases with diverse lat/lng
      const testCases: Array<{
        origin: [number, number];
        dest: [number, number];
        expectedLngLatOrigin: string;
        expectedLngLatDest: string;
      }> = [
        {
          origin: [-36.2307, -61.1130],
          dest: [-36.2260, -61.1190],
          expectedLngLatOrigin: '-61.113,-36.2307',
          expectedLngLatDest: '-61.119,-36.226'
        },
        {
          origin: [-34.6037, -58.3816],
          dest: [-34.6100, -58.3800],
          expectedLngLatOrigin: '-58.3816,-34.6037',
          expectedLngLatDest: '-58.38,-34.61'
        },
        {
          origin: [40.7128, -74.0060],
          dest: [40.7589, -73.9851],
          expectedLngLatOrigin: '-74.006,40.7128',
          expectedLngLatDest: '-73.9851,40.7589'
        }
      ];

      for (const tc of testCases) {
        const url = buildOsrmUrl(tc.origin, tc.dest);
        expect(url).toContain(`${tc.expectedLngLatOrigin};${tc.expectedLngLatDest}`);
        expect(url).toContain('overview=full&geometries=geojson');
      }
    });

    it('correctly inverts OSRM GeoJSON [lng, lat] pairs back to Leaflet [lat, lng] pairs', async () => {
      const origin: [number, number] = [-36.2307, -61.1130];
      const dest: [number, number] = [-36.2260, -61.1190];

      // OSRM GeoJSON returned format: [longitude, latitude]
      const osrmGeoJsonCoords: [number, number][] = [
        [-61.1130, -36.2307],
        [-61.1145, -36.2295],
        [-61.1160, -36.2280],
        [-61.1190, -36.2260]
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              geometry: {
                coordinates: osrmGeoJsonCoords,
                type: 'LineString'
              },
              distance: 1450
            }
          ]
        })
      } as Response);

      const result = await fetchOsrmRoute(origin, dest);

      expect(result.isFallback).toBe(false);
      expect(result.coordinates).toHaveLength(4);

      // Verify each coordinate is transformed from [lng, lat] to [lat, lng]
      for (let i = 0; i < osrmGeoJsonCoords.length; i++) {
        const [origLng, origLat] = osrmGeoJsonCoords[i]!;
        const [resultLat, resultLng] = result.coordinates[i]!;
        expect(resultLat).toBe(origLat);
        expect(resultLng).toBe(origLng);
      }

      // First coordinate matches origin [lat, lng]
      expect(result.coordinates[0]).toEqual(origin);
      // Last coordinate matches dest [lat, lng]
      expect(result.coordinates[3]).toEqual(dest);
    });

    it('falls back seamlessly to straight-line on non-200 responses, rate limits, or OSRM error codes', async () => {
      const origin: [number, number] = [-36.2307, -61.1130];
      const dest: [number, number] = [-36.2260, -61.1190];
      const expectedDist = calculateDistanceKm(origin, dest);

      const errorCases = [
        { desc: 'HTTP 429 Rate Limit', response: { ok: false, status: 429 } },
        { desc: 'HTTP 500 Server Error', response: { ok: false, status: 500 } },
        { desc: 'HTTP 404 Not Found', response: { ok: false, status: 404 } },
        {
          desc: 'OSRM NoRoute code',
          response: {
            ok: true,
            status: 200,
            json: async () => ({ code: 'NoRoute', routes: [] })
          }
        },
        {
          desc: 'OSRM InvalidQuery code',
          response: {
            ok: true,
            status: 200,
            json: async () => ({ code: 'InvalidQuery', message: 'Coordinate out of bounds' })
          }
        }
      ];

      for (const ec of errorCases) {
        globalThis.fetch = vi.fn().mockResolvedValue(ec.response as Response);
        const result = await fetchOsrmRoute(origin, dest);

        expect(result.isFallback, `Failed for ${ec.desc}`).toBe(true);
        expect(result.coordinates).toEqual([origin, dest]);
        expect(result.distanceKm).toBe(expectedDist);
      }
    });

    it('falls back on malformed or malicious GeoJSON coordinate payloads without throwing', async () => {
      const origin: [number, number] = [-36.2307, -61.1130];
      const dest: [number, number] = [-36.2260, -61.1190];

      const maliciousPayloads = [
        null,
        {},
        { code: 'Ok', routes: null },
        { code: 'Ok', routes: [] },
        { code: 'Ok', routes: [{ geometry: null }] },
        { code: 'Ok', routes: [{ geometry: { coordinates: [] } }] },
        { code: 'Ok', routes: [{ geometry: { coordinates: [[-61.113, -36.230]] } }] }, // Only 1 point
        { code: 'Ok', routes: [{ geometry: { coordinates: [[NaN, NaN], [-61.119, -36.226]] } }] },
        { code: 'Ok', routes: [{ geometry: { coordinates: [['-61.113', '-36.230'], [-61.119, -36.226]] } }] }
      ];

      for (const payload of maliciousPayloads) {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => payload
        } as Response);

        const result = await fetchOsrmRoute(origin, dest);
        expect(result.isFallback).toBe(true);
        expect(result.coordinates).toEqual([origin, dest]);
      }
    });
  });

  // =========================================================================
  // 3. ABORTCONTROLLER TIMEOUT LOGIC & LISTENER CLEANUP
  // =========================================================================
  describe('3. AbortController Timeout Logic (3500ms default) and Listener Cleanup', () => {
    const origin: [number, number] = [-36.2307, -61.1130];
    const dest: [number, number] = [-36.2260, -61.1190];

    it('defaults to 3500ms timeout and aborts when timeout is exceeded', async () => {
      let abortedSignal: AbortSignal | undefined;

      globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        abortedSignal = init?.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('Request aborted', 'AbortError'));
            });
          }
        });
      });

      // Use a fast timeout for testing
      const result = await fetchOsrmRoute(origin, dest, { timeoutMs: 25 });

      expect(result.isFallback).toBe(true);
      expect(abortedSignal?.aborted).toBe(true);
    });

    it('clears timeoutId immediately when parent signal is pre-aborted', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const parentController = new AbortController();
      parentController.abort(); // Pre-aborted

      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const result = await fetchOsrmRoute(origin, dest, {
        signal: parentController.signal
      });

      expect(result.isFallback).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('removes parent abort event listener on success and on failure to prevent memory leaks', async () => {
      const parentController = new AbortController();
      const addListenerSpy = vi.spyOn(parentController.signal, 'addEventListener');
      const removeListenerSpy = vi.spyOn(parentController.signal, 'removeEventListener');

      // 1. Test success path cleanup
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              geometry: {
                coordinates: [
                  [-61.113, -36.230],
                  [-61.119, -36.226]
                ]
              },
              distance: 1000
            }
          ]
        })
      } as Response);

      await fetchOsrmRoute(origin, dest, { signal: parentController.signal });

      expect(addListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
      expect(removeListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));

      // 2. Test failure path cleanup
      addListenerSpy.mockClear();
      removeListenerSpy.mockClear();

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await fetchOsrmRoute(origin, dest, { signal: parentController.signal });

      expect(addListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
      expect(removeListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });

  // =========================================================================
  // 4. MEMORY LEAKS & EVENT LISTENER HYGIENE IN ORDERCARD & ORDERMAPMODAL
  // =========================================================================
  describe('4. Memory Leaks & Event Listener Hygiene in OrderCard and OrderMapModal', () => {
    it('verifies OrderCard cleanly registers and removes cadete_os_speech_muted_changed and storage listeners', () => {
      const orderCardSrc = readFileSync(
        resolve(__dirname, '../src/components/orders/OrderCard.tsx'),
        'utf-8'
      );

      // Verify useEffect attaches both events
      expect(orderCardSrc).toContain("window.addEventListener('cadete_os_speech_muted_changed', syncMute);");
      expect(orderCardSrc).toContain("window.addEventListener('storage', syncMute);");

      // Verify useEffect cleanup removes both events with the exact same reference
      expect(orderCardSrc).toContain("window.removeEventListener('cadete_os_speech_muted_changed', syncMute);");
      expect(orderCardSrc).toContain("window.removeEventListener('storage', syncMute);");

      // Verify the dependency array is empty [] so it is strictly mount/unmount
      const useEffectBlock = orderCardSrc.substring(
        orderCardSrc.indexOf("window.addEventListener('cadete_os_speech_muted_changed', syncMute);") - 100,
        orderCardSrc.indexOf("window.removeEventListener('storage', syncMute);") + 100
      );
      expect(useEffectBlock).toContain('}, []);');
    });

    it('verifies OrderMapModal cleans up Leaflet map instance, polyline ref, speech timers and aborts fetch', () => {
      const modalSrc = readFileSync(
        resolve(__dirname, '../src/components/map/OrderMapModal.tsx'),
        'utf-8'
      );

      // 1. Speech timer cleanup
      expect(modalSrc).toContain('clearTimeout(speechTimer);');
      expect(modalSrc).toContain('cancelSpeech();');

      // 2. Map & Routing cleanup
      expect(modalSrc).toContain('isMounted = false;');
      expect(modalSrc).toContain('abortController.abort();');
      expect(modalSrc).toContain('clearTimeout(timer);');
      expect(modalSrc).toContain('mapInstanceRef.current.remove();');
      expect(modalSrc).toContain('mapInstanceRef.current = null;');
      expect(modalSrc).toContain('polylineRef.current = null;');

      // 3. Dynamic polyline removal on OSRM update
      expect(modalSrc).toContain('map.removeLayer(polylineRef.current);');
    });

    it('verifies useModalBackHandler cleans up popstate, keydown, and scroll lock on unmount', () => {
      const handlerSrc = readFileSync(
        resolve(__dirname, '../src/hooks/useModalBackHandler.ts'),
        'utf-8'
      );

      // Registration
      expect(handlerSrc).toContain("window.addEventListener('popstate', handlePopState);");
      expect(handlerSrc).toContain("window.addEventListener('keydown', handleKeyDown);");
      expect(handlerSrc).toContain('lockBodyScroll();');

      // Cleanup
      expect(handlerSrc).toContain("window.removeEventListener('popstate', handlePopState);");
      expect(handlerSrc).toContain("window.removeEventListener('keydown', handleKeyDown);");
      expect(handlerSrc).toContain('unlockBodyScroll();');
    });
  });
});
