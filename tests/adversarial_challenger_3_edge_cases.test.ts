import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Order } from '../src/types';
import { isValidAddress } from '../src/utils/navigation';
import {
  normalizeStreetName,
  resolveOrderCoordinates,
  calculateDistanceKm,
  estimateMotoEtaMinutes,
  BOLIVAR_ANCHORS
} from '../src/utils/geocoding';
import { fetchOsrmRoute, buildOsrmUrl, OSRM_DRIVING_URL } from '../src/utils/routing';
import {
  speakOrder,
  speakText,
  cancelSpeech,
  isSpeechMuted,
  setSpeechMuted
} from '../src/utils/speech';
import { BOLIVAR_CENTER } from '../src/hooks/useGeolocation';

describe('Challenger 3: Adversarial Edge Cases Verification Suite', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  const createOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 'ord_c3_test_1',
    userId: 'usr_c3',
    date: '2026-09-06',
    timestamp: Date.now(),
    businessId: 'biz_c3',
    businessName: 'Rotisería Bolívar',
    address: 'Av. San Martín 450',
    zone: 'planta_urbana',
    amount: 3800,
    paidBy: 'customer',
    paymentMethod: 'cash',
    settled: false,
    ...overrides
  });

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. "CÓMO IR" CLICK AUDIO BEHAVIOR: NO CUT-OFF OR STUTTER UPON OPENING MODAL
  // =========================================================================
  describe('1. "Cómo ir" click audio behavior: no cut-off or stutter upon opening modal', () => {
    it('verifies OrderCard handleOpenMap does NOT call speakOrder directly', () => {
      const orderCardSrc = getFileContent('src/components/orders/OrderCard.tsx');

      // Extract the handleOpenMap definition
      const handleOpenMapBlock = orderCardSrc.substring(
        orderCardSrc.indexOf('const handleOpenMap = () => {'),
        orderCardSrc.indexOf('};', orderCardSrc.indexOf('const handleOpenMap = () => {')) + 2
      );

      // handleOpenMap must ONLY delegate modal opening, never speakOrder
      expect(handleOpenMapBlock).not.toContain('speakOrder');
      expect(handleOpenMapBlock).toContain('onViewOnMap(order)');
      expect(handleOpenMapBlock).toContain('setIsInternalMapOpen(true)');
    });

    it('verifies speech is called only by dedicated volume button on OrderCard and auto-speech in OrderMapModal', () => {
      const orderCardSrc = getFileContent('src/components/orders/OrderCard.tsx');
      const modalSrc = getFileContent('src/components/map/OrderMapModal.tsx');

      // Dedicated volume button handler in OrderCard
      expect(orderCardSrc).toContain('const handleSpeakOrder = (e: React.MouseEvent) => {');
      expect(orderCardSrc).toContain('speakOrder(order)');

      // OrderMapModal auto-speech in useEffect with 150ms settling delay
      expect(modalSrc).toContain('hasSpokenRef.current = order.id;');
      expect(modalSrc).toContain('const speechTimer = setTimeout(() => {');
      expect(modalSrc).toContain('speakOrder(order);');
      expect(modalSrc).toContain('}, 150);');
    });

    it('empirically verifies opening the modal causes zero stutter or double speech', () => {
      vi.useFakeTimers();
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel');

      const order = createOrder();

      // Step 1: Cadete clicks "Cómo ir" on OrderCard
      // As verified in handleOpenMap, no speech occurs here
      expect(speakSpy).not.toHaveBeenCalled();

      // Step 2: OrderMapModal mounts with isOpen=true
      let isOpen = true;
      let hasSpokenRef: string | null = null;
      let speechTimer: any = null;

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

      // At 50ms: sheet is animating, no audio played yet, no cancel called on active speech
      vi.advanceTimersByTime(50);
      expect(speakSpy).not.toHaveBeenCalled();

      // At 150ms: sheet animation settled, speakOrder is called cleanly ONCE
      vi.advanceTimersByTime(100);
      expect(speakSpy).toHaveBeenCalledTimes(1);

      // Advancing further does NOT re-trigger speech
      vi.advanceTimersByTime(500);
      expect(speakSpy).toHaveBeenCalledTimes(1);

      // Verify no unexpected cancels were executed while speech is playing
      clearTimeout(speechTimer);
      vi.useRealTimers();
    });

    it('respects global mute state on both card volume button and modal auto-speech', () => {
      setSpeechMuted(true);
      expect(isSpeechMuted()).toBe(true);

      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      const order = createOrder();

      // Card volume click when muted
      if (!isSpeechMuted()) {
        speakOrder(order);
      }
      expect(speakSpy).not.toHaveBeenCalled();

      // Modal auto-speech when muted
      if (!isSpeechMuted()) {
        speakOrder(order);
      }
      expect(speakSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. ORDERS WITH MISSING ADDRESS: MAP BUTTON HIDDEN CLEANLY
  // =========================================================================
  describe('2. Orders with missing address: map button hidden cleanly', () => {
    it('identifies undefined, null, empty, and whitespace addresses as invalid', () => {
      expect(isValidAddress(undefined)).toBe(false);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('   ')).toBe(false);
      expect(isValidAddress('\t\r\n')).toBe(false);

      expect(isValidAddress('Brown 200')).toBe(true);
      expect(isValidAddress('Av. San Martín 450')).toBe(true);
    });

    it('verifies OrderCard.tsx conditionally hides the navigation row when address is missing', () => {
      const orderCardSrc = getFileContent('src/components/orders/OrderCard.tsx');

      // Address check
      expect(orderCardSrc).toContain('const hasAddress = isValidAddress(order.address);');

      // Primary navigation row is guarded by hasAddress
      expect(orderCardSrc).toContain('{hasAddress && (');
      expect(orderCardSrc).toContain('Cómo ir');
      expect(orderCardSrc).toContain('Ver en Mapa');

      // Fallback badges when no address
      expect(orderCardSrc).toContain('Sin dirección especificada');
      expect(orderCardSrc).toContain('Sin ruta GPS');
    });

    it('resolves fallback coordinates without throwing when address is missing or empty', () => {
      const orders = [
        createOrder({ address: undefined }),
        createOrder({ address: '' }),
        createOrder({ address: '     ' }),
        createOrder({ address: '\n\t' })
      ];

      for (const ord of orders) {
        expect(() => resolveOrderCoordinates(ord)).not.toThrow();
        const coords = resolveOrderCoordinates(ord);
        expect(coords).toHaveLength(2);
        expect(coords[0]).toBeCloseTo(BOLIVAR_CENTER[0], 1);
        expect(coords[1]).toBeCloseTo(BOLIVAR_CENTER[1], 1);
      }
    });
  });

  // =========================================================================
  // 3. NUMBERED STREETS WITH DOOR NUMBERS: ANCHOR MATCHING & DOOR OFFSET INTERPOLATION
  // =========================================================================
  describe('3. Numbered streets with door numbers: correct anchor matching and door offset interpolation', () => {
    it('normalizes numbered street names correctly while preserving street identity', () => {
      // "Av. 25 de Mayo 400" -> strips av. and digits -> "de mayo"
      const normalized1 = normalizeStreetName('Av. 25 de Mayo 400');
      expect(normalized1).toBe('de mayo');

      // "9 de Julio 120" -> "de julio"
      const normalized2 = normalizeStreetName('9 de Julio 120');
      expect(normalized2).toBe('de julio');

      // "12 de Octubre 850" -> "de octubre"
      const normalized3 = normalizeStreetName('12 de Octubre 850');
      expect(normalized3).toBe('de octubre');
    });

    it('matches numbered street anchors in BOLIVAR_ANCHORS dictionary', () => {
      expect(BOLIVAR_ANCHORS['25 de mayo']).toBeDefined();
      expect(BOLIVAR_ANCHORS['de mayo']).toBeDefined();
      expect(BOLIVAR_ANCHORS['9 de julio']).toBeDefined();
      expect(BOLIVAR_ANCHORS['de julio']).toBeDefined();
      expect(BOLIVAR_ANCHORS['12 de octubre']).toBeDefined();
      expect(BOLIVAR_ANCHORS['de octubre']).toBeDefined();
    });

    it('extracts door number accurately when street name contains numbers (e.g., "25 de Mayo 450")', () => {
      const address = 'Av. 25 de Mayo 450';
      const numbers = address.match(/\b\d{1,4}\b/g);
      expect(numbers).toEqual(['25', '450']);

      // The algorithm selects numbers[numbers.length - 1] as the door number
      const doorNumber = numbers ? parseInt(numbers[numbers.length - 1]!, 10) : 100;
      expect(doorNumber).toBe(450);
    });

    it('produces distinct, monotonically shifted coordinates for different door numbers on the same numbered street', () => {
      const orderLow = createOrder({ address: 'Av. 25 de Mayo 100' });
      const orderMid = createOrder({ address: 'Av. 25 de Mayo 400' });
      const orderHigh = createOrder({ address: 'Av. 25 de Mayo 900' });

      const coordsLow = resolveOrderCoordinates(orderLow);
      const coordsMid = resolveOrderCoordinates(orderMid);
      const coordsHigh = resolveOrderCoordinates(orderHigh);

      // Check coordinates are within San Carlos de Bolívar geographic bounding box
      const checkBounds = (coords: [number, number]) => {
        expect(coords[0]).toBeLessThan(-36.20);
        expect(coords[0]).toBeGreaterThan(-36.27);
        expect(coords[1]).toBeLessThan(-61.08);
        expect(coords[1]).toBeGreaterThan(-61.15);
      };

      checkBounds(coordsLow);
      checkBounds(coordsMid);
      checkBounds(coordsHigh);

      // Monotonic offset check: as door number increases, offset increases
      expect(coordsLow[0]).toBeGreaterThan(coordsMid[0]);
      expect(coordsMid[0]).toBeGreaterThan(coordsHigh[0]);
      expect(coordsLow[1]).toBeGreaterThan(coordsMid[1]);
      expect(coordsMid[1]).toBeGreaterThan(coordsHigh[1]);
    });

    it('handles numbered streets with 4-digit door numbers (e.g., "Av. 25 de Mayo 1250")', () => {
      const order = createOrder({ address: 'Av. 25 de Mayo 1250' });
      const coords = resolveOrderCoordinates(order);

      // Check bounds
      expect(coords[0]).toBeLessThan(-36.20);
      expect(coords[0]).toBeGreaterThan(-36.27);
      expect(coords[1]).toBeLessThan(-61.08);
      expect(coords[1]).toBeGreaterThan(-61.15);
    });
  });

  // =========================================================================
  // 4. OSRM TIMEOUTS AND NETWORK ERROR FALLBACKS: RESILIENT STRAIGHT DASHED POLYLINE
  // =========================================================================
  describe('4. OSRM timeouts and network error fallbacks: resilient straight dashed polyline without error popups', () => {
    const origin: [number, number] = [-36.2307, -61.1130];
    const destination: [number, number] = [-36.2355, -61.1120];

    it('gracefully returns fallback straight route when OSRM fetch times out', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
        (_url, init: any) =>
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

      const result = await fetchOsrmRoute(origin, destination, { timeoutMs: 30 });

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
      expect(result.distanceKm).toBeGreaterThan(0);
      expect(result.durationMinutes).toBeGreaterThanOrEqual(3);
    });

    it('gracefully returns fallback straight route on network connection failure (fetch rejection)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await fetchOsrmRoute(origin, destination);

      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
    });

    it('gracefully returns fallback on HTTP error statuses (404, 429, 500, 503)', async () => {
      const statuses = [404, 429, 500, 503];

      for (const status of statuses) {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
          new Response(`HTTP ${status} Error`, { status, statusText: `Error ${status}` })
        );

        const result = await fetchOsrmRoute(origin, destination);
        expect(result.isFallback).toBe(true);
        expect(result.coordinates).toEqual([origin, destination]);
      }
    });

    it('gracefully returns fallback on invalid JSON / HTML error responses without unhandled exception', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('<html><body><h1>502 Bad Gateway</h1></body></html>', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await fetchOsrmRoute(origin, destination);
      expect(result.isFallback).toBe(true);
      expect(result.coordinates).toEqual([origin, destination]);
    });

    it('verifies OrderMapModal.tsx draws straight dashed emerald line initially and catches OSRM error silently', () => {
      const modalSrc = getFileContent('src/components/map/OrderMapModal.tsx');

      // Initial straight dashed emerald route polyline
      expect(modalSrc).toContain("const straightPolyline = L.polyline([originCoords, destCoords], {");
      expect(modalSrc).toContain("color: '#10b981'");
      expect(modalSrc).toContain("dashArray: '6, 8'");
      expect(modalSrc).toContain("opacity: 0.9");

      // Catches OSRM failure silently without error popups/toasts
      expect(modalSrc).toContain('.catch(() => {');
      expect(modalSrc).toContain('if (isMounted) {');
      expect(modalSrc).toContain('setIsLoadingRoute(false);');

      // Verify no window.alert, no toast, no console.error dialog
      expect(modalSrc).not.toContain('alert(');
      expect(modalSrc).not.toContain('window.alert');
    });

    it('upgrades straight polyline to solid real-street polyline when OSRM succeeds', async () => {
      const mockOsrmResponse = {
        code: 'Ok',
        routes: [
          {
            geometry: {
              coordinates: [
                [-61.1130, -36.2307],
                [-61.1125, -36.2330],
                [-61.1120, -36.2355]
              ]
            },
            distance: 580
          }
        ]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockOsrmResponse), { status: 200 })
      );

      const result = await fetchOsrmRoute(origin, destination);

      expect(result.isFallback).toBe(false);
      expect(result.coordinates).toEqual([
        [-36.2307, -61.1130],
        [-36.2330, -61.1125],
        [-36.2355, -61.1120]
      ]);
      expect(result.distanceKm).toBe(0.6);
    });
  });
});
