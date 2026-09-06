import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeStreetName,
  resolveOrderCoordinates,
  calculateDistanceKm,
  estimateMotoEtaMinutes,
  BOLIVAR_ANCHORS
} from '../src/utils/geocoding';
import { fetchOsrmRoute, buildOsrmUrl, OSRM_DRIVING_URL } from '../src/utils/routing';
import {
  speakText,
  speakOrder,
  isSpeechMuted,
  setSpeechMuted,
  cancelSpeech
} from '../src/utils/speech';
import { isValidAddress } from '../src/utils/navigation';
import type { Order } from '../src/types';
import { BOLIVAR_CENTER } from '../src/hooks/useGeolocation';

describe('Empirical Challenger M4 — Stress Testing R1-R5', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 'ord_challenger_test_1',
    userId: 'usr_test',
    date: '2026-09-06',
    timestamp: Date.now(),
    businessId: 'biz_1',
    businessName: 'Pizzería Central',
    address: 'Av. San Martín 450',
    zone: 'planta_urbana',
    amount: 4500,
    paidBy: 'customer',
    paymentMethod: 'cash',
    settled: false,
    ...overrides
  });

  // =========================================================================
  // TEST SUITE 1: Edge Cases in Addresses & Geocoding
  // =========================================================================
  describe('1. Address Edge Cases, Empty Strings, Numbers Without Street', () => {
    it('isValidAddress correctly rejects undefined, null, empty strings, and whitespace', () => {
      expect(isValidAddress(undefined)).toBe(false);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('   ')).toBe(false);
      expect(isValidAddress('\t\n')).toBe(false);

      expect(isValidAddress('San Martín 100')).toBe(true);
      expect(isValidAddress('1234')).toBe(true);
    });

    it('handles orders with undefined, empty, or whitespace address without crashing', () => {
      const emptyOrders = [
        createOrder({ address: undefined }),
        createOrder({ address: '' }),
        createOrder({ address: '   ' }),
        createOrder({ address: '\n\t  ' })
      ];

      for (const order of emptyOrders) {
        expect(() => resolveOrderCoordinates(order)).not.toThrow();
        const coords = resolveOrderCoordinates(order);
        expect(Array.isArray(coords)).toBe(true);
        expect(coords).toHaveLength(2);
        expect(coords[0]).toBeCloseTo(BOLIVAR_CENTER[0], 1);
        expect(coords[1]).toBeCloseTo(BOLIVAR_CENTER[1], 1);
      }
    });

    it('handles orders with numbers without street (e.g., "1234", "500", "#450")', () => {
      const numberOnlyOrders = [
        createOrder({ address: '1234' }),
        createOrder({ address: '500' }),
        createOrder({ address: '#450' }),
        createOrder({ address: '--- 100 ---' }),
        createOrder({ address: '99999' })
      ];

      for (const order of numberOnlyOrders) {
        expect(() => resolveOrderCoordinates(order)).not.toThrow();
        const coords = resolveOrderCoordinates(order);
        expect(coords[0]).toBeCloseTo(BOLIVAR_CENTER[0], 1);
        expect(coords[1]).toBeCloseTo(BOLIVAR_CENTER[1], 1);

        // Normalize returns empty or very short string
        const normalized = normalizeStreetName(order.address!);
        expect(normalized.length).toBeLessThan(2);
      }
    });

    it('speakOrder handles missing or empty addresses cleanly in voice readout', () => {
      let spoken = '';
      vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
        spoken = u.text;
      });

      speakOrder(createOrder({ address: '' }));
      expect(spoken).toBe('Viaje de Pizzería Central. Cobrar 4.500 pesos en efectivo.');

      speakOrder(createOrder({ address: undefined }));
      expect(spoken).toBe('Viaje de Pizzería Central. Cobrar 4.500 pesos en efectivo.');

      speakOrder(createOrder({ address: '1234' }));
      expect(spoken).toBe('Viaje de Pizzería Central a 1234. Cobrar 4.500 pesos en efectivo.');
    });
  });

  // =========================================================================
  // TEST SUITE 2: Numbered Streets Geocoding
  // =========================================================================
  describe('2. Numbered Streets Geocoding ("25 de Mayo 400", "9 de Julio 120", etc.)', () => {
    it('geocodes "Av. 25 de Mayo 400" accurately using anchor and door number offset', () => {
      const order = createOrder({ address: 'Av. 25 de Mayo 400' });
      const coords = resolveOrderCoordinates(order);

      const anchor = BOLIVAR_ANCHORS['25 de mayo'];
      expect(anchor).toBeDefined();

      // Expected offset for 400: ((400 % 1000) / 1000) * 0.003 = 0.0012
      const expectedLat = anchor[0] - 0.0012;
      const expectedLng = anchor[1] - 0.0012;

      expect(coords[0]).toBeCloseTo(expectedLat, 4);
      expect(coords[1]).toBeCloseTo(expectedLng, 4);
    });

    it('geocodes "9 de Julio 120" accurately using anchor and door number offset', () => {
      const order = createOrder({ address: '9 de Julio 120' });
      const coords = resolveOrderCoordinates(order);

      const anchor = BOLIVAR_ANCHORS['9 de julio'];
      expect(anchor).toBeDefined();

      const expectedOffset = ((120 % 1000) / 1000) * 0.003;
      expect(coords[0]).toBeCloseTo(anchor[0] - expectedOffset, 4);
      expect(coords[1]).toBeCloseTo(anchor[1] - expectedOffset, 4);
    });

    it('geocodes "12 de Octubre 850" accurately', () => {
      const order = createOrder({ address: '12 de Octubre 850' });
      const coords = resolveOrderCoordinates(order);

      const anchor = BOLIVAR_ANCHORS['12 de octubre'];
      expect(anchor).toBeDefined();

      const expectedOffset = ((850 % 1000) / 1000) * 0.003;
      expect(coords[0]).toBeCloseTo(anchor[0] - expectedOffset, 4);
      expect(coords[1]).toBeCloseTo(anchor[1] - expectedOffset, 4);
    });

    it('handles numbered streets without door numbers ("25 de Mayo", "9 de Julio")', () => {
      const order1 = createOrder({ address: '25 de Mayo' });
      const coords1 = resolveOrderCoordinates(order1);
      expect(coords1[0]).toBeCloseTo(BOLIVAR_ANCHORS['25 de mayo'][0], 3);

      const order2 = createOrder({ address: '9 de Julio' });
      const coords2 = resolveOrderCoordinates(order2);
      expect(coords2[0]).toBeCloseTo(BOLIVAR_ANCHORS['9 de julio'][0], 3);
    });
  });

  // =========================================================================
  // TEST SUITE 3: Rapid Modal Opening/Closing & Speech Lifecycle
  // =========================================================================
  describe('3. Rapid Modal Opening/Closing & Speech Lifecycle', () => {
    it('cancels speech immediately when cancelSpeech is called', () => {
      const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel');
      cancelSpeech();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('simulates rapid modal open and close before 150ms timer expires', () => {
      vi.useFakeTimers();
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel');

      // Simulate modal open: sets timer for 150ms
      let isOpen = true;
      let hasSpokenRef: string | null = null;
      let speechTimer: any = null;

      const order = createOrder({ id: 'ord_timer_test' });

      // Effect simulation on open
      if (isOpen && order) {
        if (hasSpokenRef !== order.id) {
          hasSpokenRef = order.id;
          speechTimer = setTimeout(() => {
            if (!isSpeechMuted()) {
              cancelSpeech();
              speakOrder(order);
            }
          }, 150);
        }
      }

      // Fast forward 50ms (less than 150ms)
      vi.advanceTimersByTime(50);
      expect(speakSpy).not.toHaveBeenCalled();

      // Modal closed rapidly
      isOpen = false;
      clearTimeout(speechTimer);
      hasSpokenRef = null;
      cancelSpeech();

      // Fast forward past 150ms
      vi.advanceTimersByTime(200);

      // Speech must NEVER have been called
      expect(speakSpy).not.toHaveBeenCalled();
      expect(cancelSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('simulates modal close while speech was playing', () => {
      vi.useFakeTimers();
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel');

      const order = createOrder({ id: 'ord_close_while_playing' });

      // Open modal
      let hasSpokenRef: string | null = order.id;
      const speechTimer = setTimeout(() => {
        if (!isSpeechMuted()) {
          cancelSpeech();
          speakOrder(order);
        }
      }, 150);

      vi.advanceTimersByTime(150);
      expect(speakSpy).toHaveBeenCalledTimes(1);

      // Modal closes at 300ms
      cancelSpeech();
      expect(cancelSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // TEST SUITE 4: GPS Coordinate Ticking & Deduplication
  // =========================================================================
  describe('4. GPS Coordinate Ticking & Auto-Speech Deduplication', () => {
    it('verifies that auto-speech ref hasSpokenRef prevents repeat utterances when coordinates change', () => {
      vi.useFakeTimers();
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

      const order = createOrder({ id: 'ord_gps_tick_1' });
      let hasSpokenRef: string | null = null;
      const speechTimers: any[] = [];

      // Function simulating effect run
      const runSpeechEffect = () => {
        if (hasSpokenRef !== order.id) {
          hasSpokenRef = order.id;
          const timer = setTimeout(() => {
            if (!isSpeechMuted()) {
              cancelSpeech();
              speakOrder(order);
            }
          }, 150);
          speechTimers.push(timer);
        }
      };

      // Initial modal open
      runSpeechEffect();

      // Simulate 50 rapid GPS coordinate updates while modal is open
      for (let i = 0; i < 50; i++) {
        runSpeechEffect();
      }

      // Fast forward past timer
      vi.advanceTimersByTime(300);

      // Must have triggered speak EXACTLY once, not 51 times!
      expect(speakSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // TEST SUITE 5: OSRM Resilience (Timeouts, HTTP 500, Corrupt JSON)
  // =========================================================================
  describe('5. OSRM Network Resilience & Straight Line Fallback', () => {
    const origin: [number, number] = [-36.2307, -61.1130];
    const destination: [number, number] = [-36.2355, -61.1120];

    it('builds OSRM URL with correct {lng},{lat} coordinate ordering', () => {
      const url = buildOsrmUrl(origin, destination);
      expect(url).toBe(
        `${OSRM_DRIVING_URL}/-61.113,-36.2307;-61.112,-36.2355?overview=full&geometries=geojson`
      );
    });

    it('gracefully falls back to straight line on HTTP 500 Internal Server Error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' })
      );

      const result = await fetchOsrmRoute(origin, destination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.durationMinutes).toBeGreaterThanOrEqual(3);
    });

    it('gracefully falls back to straight line on HTTP 404 Not Found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Not Found', { status: 404, statusText: 'Not Found' })
      );

      const result = await fetchOsrmRoute(origin, destination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
    });

    it('gracefully falls back to straight line on Invalid/Corrupted JSON', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await fetchOsrmRoute(origin, destination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
    });

    it('gracefully falls back to straight line on OSRM error code (e.g. "NoRoute")', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 'NoRoute', message: 'Impossible route between coordinates' }),
          { status: 200 }
        )
      );

      const result = await fetchOsrmRoute(origin, destination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
    });

    it('gracefully falls back to straight line on corrupt routes array or malformed coordinates', async () => {
      const corruptPayloads = [
        { code: 'Ok', routes: [] },
        { code: 'Ok', routes: [{ geometry: null }] },
        { code: 'Ok', routes: [{ geometry: { coordinates: [] } }] },
        { code: 'Ok', routes: [{ geometry: { coordinates: [[-61.11, -36.23]] } }] }, // Only 1 point
        { code: 'Ok', routes: [{ geometry: { coordinates: [[null, null], ['a', 'b']] } }] }, // Non-numbers
        { code: 'Ok', routes: [{ geometry: { coordinates: [[NaN, NaN], [Infinity, -36.23]] } }] }
      ];

      for (const payload of corruptPayloads) {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(JSON.stringify(payload), { status: 200 })
        );

        const result = await fetchOsrmRoute(origin, destination);
        expect(result.isFallback).toBe(true);
        expect(result.coordinates).toEqual([origin, destination]);
      }
    });

    it('gracefully falls back to straight line on network timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
        (url: any, init: any) =>
          new Promise((_, reject) => {
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          })
      );

      const result = await fetchOsrmRoute(origin, destination, { timeoutMs: 50 });

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
    });

    it('gracefully handles pre-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await fetchOsrmRoute(origin, destination, { signal: controller.signal });

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
    });

    it('returns real street driving route when OSRM responds successfully', async () => {
      const mockOsrmResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              coordinates: [
                [-61.113, -36.2307], // [lng, lat]
                [-61.1125, -36.233],
                [-61.112, -36.2355]
              ]
            },
            distance: 650.5 // meters
          }
        ]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockOsrmResponse), { status: 200 })
      );

      const result = await fetchOsrmRoute(origin, destination);

      expect(result.isFallback).toBe(false);
      // Coordinates must be converted to Leaflet [lat, lng] format!
      expect(result.coordinates).toEqual([
        [-36.2307, -61.113],
        [-36.233, -61.1125],
        [-36.2355, -61.112]
      ]);
      expect(result.distanceKm).toBe(0.7); // 650.5m -> 0.7km
      expect(result.durationMinutes).toBeGreaterThanOrEqual(3);
    });
  });
});
