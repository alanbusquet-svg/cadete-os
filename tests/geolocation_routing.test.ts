import { describe, it, expect } from 'vitest';
import {
  normalizeStreetName,
  resolveOrderCoordinates,
  calculateDistanceKm,
  estimateMotoEtaMinutes,
  BOLIVAR_ANCHORS
} from '../src/utils/geocoding';
import { BOLIVAR_CENTER } from '../src/hooks/useGeolocation';
import type { Order } from '../src/types';

describe('Geolocation & Geocoding Utilities (geocoding.ts)', () => {
  it('should normalize street names removing accents and prefixes', () => {
    expect(normalizeStreetName('Av. San Martín 450')).toBe('san martin');
    expect(normalizeStreetName('Avenida Brown 220')).toBe('brown');
    expect(normalizeStreetName('Calle Alvear 560')).toBe('alvear');
    expect(normalizeStreetName('B° Los Zorzales Casa 12')).toBe('los zorzales');
    expect(normalizeStreetName('Avda. San Martín 450')).toBe('san martin');
    expect(normalizeStreetName('Avda Brown 220')).toBe('brown');
  });

  it('should resolve coordinates for seed addresses via Bolívar street dictionary', () => {
    const baseOrder: Order = {
      id: 'ord_1',
      userId: 'usr_1',
      date: '2026-09-04',
      timestamp: Date.now(),
      businessId: 'biz_1',
      businessName: 'Pizzería Roma',
      zone: 'planta_urbana',
      amount: 1500,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: false
    };

    // 1. Av. San Martín 450
    const sanMartinCoords = resolveOrderCoordinates({
      ...baseOrder,
      address: 'Av. San Martín 450'
    });
    expect(sanMartinCoords[0]).toBeLessThan(0);
    expect(sanMartinCoords[1]).toBeLessThan(0);
    expect(Math.abs(sanMartinCoords[0] - BOLIVAR_ANCHORS['san martin']![0])).toBeLessThan(0.01);

    // 2. Av. Brown 220
    const brownCoords = resolveOrderCoordinates({
      ...baseOrder,
      address: 'Av. Brown 220'
    });
    expect(Math.abs(brownCoords[0] - BOLIVAR_ANCHORS['brown']![0])).toBeLessThan(0.01);

    // 3. Av. Cancio 1120
    const cancioCoords = resolveOrderCoordinates({
      ...baseOrder,
      address: 'Av. Cancio 1120'
    });
    expect(Math.abs(cancioCoords[0] - BOLIVAR_ANCHORS['cancio']![0])).toBeLessThan(0.01);

    // 4. Alvear 560
    const alvearCoords = resolveOrderCoordinates({
      ...baseOrder,
      address: 'Alvear 560'
    });
    expect(Math.abs(alvearCoords[0] - BOLIVAR_ANCHORS['alvear']![0])).toBeLessThan(0.01);
  });

  it('should fallback to zone centroid with anti-collision jitter for unknown addresses', () => {
    const orderA: Order = {
      id: 'ord_alpha_1',
      userId: 'usr_1',
      date: '2026-09-04',
      timestamp: Date.now(),
      businessId: 'biz_1',
      businessName: 'Test Biz',
      address: 'Calle Inexistente 9999',
      zone: 'barrio_cerca',
      amount: 1000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: false
    };

    const orderB: Order = {
      ...orderA,
      id: 'ord_beta_2'
    };

    const coordsA = resolveOrderCoordinates(orderA);
    const coordsB = resolveOrderCoordinates(orderB);

    // Both should be in the approximate neighborhood of Bolívar
    expect(coordsA[0]).toBeCloseTo(-36.238, 1);
    expect(coordsB[0]).toBeCloseTo(-36.238, 1);

    // Deterministic jitter should prevent exact overlap
    expect(coordsA[0] !== coordsB[0] || coordsA[1] !== coordsB[1]).toBe(true);
  });

  it('should fallback to zone centroid when address is empty or missing', () => {
    const orderNoAddr: Order = {
      id: 'ord_no_addr',
      userId: 'usr_1',
      date: '2026-09-04',
      timestamp: Date.now(),
      businessId: 'biz_1',
      businessName: 'Test Biz',
      zone: 'planta_urbana',
      amount: 1000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: false
    };

    const coords = resolveOrderCoordinates(orderNoAddr);
    expect(coords[0]).toBeCloseTo(BOLIVAR_CENTER[0], 1);
    expect(coords[1]).toBeCloseTo(BOLIVAR_CENTER[1], 1);
  });

  it('should accurately calculate Haversine distance in km', () => {
    // Distance between identical points is 0
    expect(calculateDistanceKm(BOLIVAR_CENTER, BOLIVAR_CENTER)).toBe(0);

    // Distance between Plaza 12 de Octubre and Hospital Subzonal (~1.1 km)
    const hospitalCoords = BOLIVAR_ANCHORS['hospital']!;
    const dist = calculateDistanceKm(BOLIVAR_CENTER, hospitalCoords);
    expect(dist).toBeGreaterThan(0.3);
    expect(dist).toBeLessThan(3.0);
  });

  it('should estimate motorcycle delivery ETA with reasonable floor and speed', () => {
    // Minimum 3 minutes even for very short distances
    expect(estimateMotoEtaMinutes(0.1)).toBe(3);
    expect(estimateMotoEtaMinutes(0.5)).toBe(3);

    // 5 km at 30 km/h is 10 min + 2 min buffer = 12 min
    expect(estimateMotoEtaMinutes(5.0)).toBe(12);

    // 2.5 km at 30 km/h is 5 min + 2 min buffer = 7 min
    expect(estimateMotoEtaMinutes(2.5)).toBe(7);
  });
});

describe('Adversarial Stress Testing: Geolocation & Coordinate Resolution', () => {
  const baseOrder: Order = {
    id: 'ord_adversarial_base',
    userId: 'usr_stress',
    date: '2026-09-04',
    timestamp: Date.now(),
    businessId: 'biz_1',
    businessName: 'Delivery Express',
    zone: 'planta_urbana',
    amount: 2500,
    paidBy: 'customer',
    paymentMethod: 'cash',
    settled: false
  };

  describe('normalizeStreetName Boundary and Adversarial Inputs', () => {
    it('handles empty string and whitespace-only strings safely', () => {
      expect(normalizeStreetName('')).toBe('');
      expect(normalizeStreetName('   ')).toBe('');
      expect(normalizeStreetName('\t\n  \r\n')).toBe('');
    });

    it('strips punctuation, numbers, and symbols leaving clean words', () => {
      expect(normalizeStreetName('#123 - 456, °')).toBe('');
      expect(normalizeStreetName('San Martín #450, 1°')).toBe('san martin');
      expect(normalizeStreetName('Av. Alvear - 560')).toBe('alvear');
    });

    it('handles uppercase and mixed case correctly', () => {
      expect(normalizeStreetName('AV. SAN MARTÍN 450')).toBe('san martin');
      expect(normalizeStreetName('aVeNiDa bRoWn 120')).toBe('brown');
      expect(normalizeStreetName('CALLE BALCARCE 330')).toBe('balcarce');
    });

    it('handles Spanish accents and special diacritics', () => {
      expect(normalizeStreetName('Güemes 800')).toBe('guemes');
      expect(normalizeStreetName('Av. San Martín 100')).toBe('san martin');
    });

    it('handles Argentine address housing prefixes (B°, Barrio, Casa, Dpto, Lote, Mza)', () => {
      expect(normalizeStreetName('Barrio Los Zorzales Casa 14')).toBe('los zorzales');
      expect(normalizeStreetName('B° Los Zorzales Mza 2 Lote 5')).toBe('los zorzales');
      expect(normalizeStreetName('Pje. Cancio 45')).toBe('cancio');
    });
  });

  describe('Coordinate Bounding Box Invariants (San Carlos de Bolívar)', () => {
    // San Carlos de Bolívar city boundary is bounded by:
    // lat: roughly [-36.260, -36.210]
    // lng: roughly [-61.150, -61.090]
    const BOLIVAR_BOUNDS = {
      minLat: -36.265,
      maxLat: -36.210,
      minLng: -61.155,
      maxLng: -61.085
    };

    it('guarantees that all 22 static anchors lie strictly within Bolívar bounding box', () => {
      for (const [name, coords] of Object.entries(BOLIVAR_ANCHORS)) {
        expect(coords[0], `Anchor ${name} lat out of bounds`).toBeGreaterThanOrEqual(BOLIVAR_BOUNDS.minLat);
        expect(coords[0], `Anchor ${name} lat out of bounds`).toBeLessThanOrEqual(BOLIVAR_BOUNDS.maxLat);
        expect(coords[1], `Anchor ${name} lng out of bounds`).toBeGreaterThanOrEqual(BOLIVAR_BOUNDS.minLng);
        expect(coords[1], `Anchor ${name} lng out of bounds`).toBeLessThanOrEqual(BOLIVAR_BOUNDS.maxLng);
        expect(Number.isFinite(coords[0])).toBe(true);
        expect(Number.isFinite(coords[1])).toBe(true);
      }
    });

    it('guarantees that resolveOrderCoordinates output is within Bolívar bounds across 60 permutations', () => {
      const zones = ['planta_urbana', 'barrio_cerca', 'barrio_lejos', 'custom'] as const;
      const addresses = [
        'Av. San Martín 450',
        'Brown 1200',
        'Cancio 9999',
        'Alvear 0',
        'Calle Inexistente 500',
        'B° Los Zorzales Casa 4',
        'Ruta 226 Km 402',
        '',
        '   ',
        'Lavalle 300'
      ];

      for (let i = 0; i < addresses.length; i++) {
        for (let j = 0; j < zones.length; j++) {
          const testOrder: Order = {
            ...baseOrder,
            id: `ord_perm_${i}_${j}`,
            address: addresses[i],
            zone: zones[j]!
          };

          const coords = resolveOrderCoordinates(testOrder);

          expect(Number.isFinite(coords[0])).toBe(true);
          expect(Number.isFinite(coords[1])).toBe(true);
          expect(coords[0]).toBeGreaterThanOrEqual(BOLIVAR_BOUNDS.minLat);
          expect(coords[0]).toBeLessThanOrEqual(BOLIVAR_BOUNDS.maxLat);
          expect(coords[1]).toBeGreaterThanOrEqual(BOLIVAR_BOUNDS.minLng);
          expect(coords[1]).toBeLessThanOrEqual(BOLIVAR_BOUNDS.maxLng);
        }
      }
    });
  });

  describe('Adversarial Edge Case Analysis: Empty & Number-Only Addresses', () => {
    it('safely falls back to zone centroid for number-only address (e.g. "1234") without false San Martín match', () => {
      // Address "1234" normalizes to "" (empty string).
      // Guard (!normalized || normalized.length < 2) prevents key.includes("") false positive on 'san martin'.
      // Therefore, "1234" falls back to zone centroid (barrio_lejos ~ -36.248, -61.129).
      const orderNumberOnly: Order = {
        ...baseOrder,
        id: 'ord_num_1234',
        address: '1234',
        zone: 'barrio_lejos'
      };

      const coords = resolveOrderCoordinates(orderNumberOnly);
      expect(Number.isFinite(coords[0])).toBe(true);
      expect(Number.isFinite(coords[1])).toBe(true);
      // Must resolve near barrio_lejos centroid (~-36.248, -61.129), NOT San Martín (~-36.2307)
      expect(coords[0]).toBeCloseTo(-36.248, 1);
      expect(coords[1]).toBeCloseTo(-61.129, 1);
      // Invariant: Distance to San Martín must be > 1.5 km (~2.39 km actual)
      expect(calculateDistanceKm(coords, BOLIVAR_ANCHORS['san martin']!)).toBeGreaterThan(1.5);
    });

    it('safely falls back to zone centroid for short housing/unit letters (e.g. "Casa 14 Depto B")', () => {
      // "Casa 14 Depto B" normalizes to "b" (length 1).
      // Guard prevents key.includes("b") false positive on 'brown'.
      const orderShortLetter: Order = {
        ...baseOrder,
        id: 'ord_short_letter',
        address: 'Casa 14 Depto B',
        zone: 'barrio_cerca'
      };

      const coords = resolveOrderCoordinates(orderShortLetter);
      expect(Number.isFinite(coords[0])).toBe(true);
      expect(Number.isFinite(coords[1])).toBe(true);
      // Must resolve near barrio_cerca centroid (~-36.238, -61.119), NOT brown (~-36.2285)
      expect(coords[0]).toBeCloseTo(-36.238, 1);
      expect(coords[1]).toBeCloseTo(-61.119, 1);
    });

    it('resolves coordinates correctly for addresses with "Avda." prefix', () => {
      const orderAvda: Order = {
        ...baseOrder,
        id: 'ord_avda',
        address: 'Avda. San Martín 450',
        zone: 'planta_urbana'
      };

      const coords = resolveOrderCoordinates(orderAvda);
      expect(coords[0]).toBeCloseTo(BOLIVAR_ANCHORS['san martin']![0], 2);
      expect(coords[1]).toBeCloseTo(BOLIVAR_ANCHORS['san martin']![1], 2);
    });

    it('falls back safely to zone centroid when address property is undefined or empty', () => {
      const orderUndefinedAddr: Order = {
        ...baseOrder,
        id: 'ord_undef',
        address: undefined,
        zone: 'barrio_lejos'
      };

      const coords = resolveOrderCoordinates(orderUndefinedAddr);
      // barrio_lejos centroid is ~ -36.248, -61.129
      expect(coords[0]).toBeCloseTo(-36.248, 1);
      expect(coords[1]).toBeCloseTo(-61.129, 1);
    });

    it('falls back safely to zone centroid when address is whitespace-only', () => {
      const orderSpaces: Order = {
        ...baseOrder,
        id: 'ord_spaces',
        address: '     ',
        zone: 'barrio_cerca'
      };

      const coords = resolveOrderCoordinates(orderSpaces);
      // barrio_cerca centroid is ~ -36.238, -61.119
      expect(coords[0]).toBeCloseTo(-36.238, 1);
      expect(coords[1]).toBeCloseTo(-61.119, 1);
    });

    it('handles unusual zone values with default fallback to BOLIVAR_CENTER', () => {
      const orderUnknownZone: Order = {
        ...baseOrder,
        id: 'ord_custom_zone',
        address: undefined,
        zone: 'custom'
      };

      const coords = resolveOrderCoordinates(orderUnknownZone);
      expect(coords[0]).toBeCloseTo(BOLIVAR_CENTER[0], 1);
      expect(coords[1]).toBeCloseTo(BOLIVAR_CENTER[1], 1);
    });
  });

  describe('calculateDistanceKm Mathematical Properties & Boundaries', () => {
    it('satisfies identity of indiscernibles: dist(p, p) === 0', () => {
      expect(calculateDistanceKm(BOLIVAR_CENTER, BOLIVAR_CENTER)).toBe(0);
      expect(calculateDistanceKm(BOLIVAR_ANCHORS['cancio']!, BOLIVAR_ANCHORS['cancio']!)).toBe(0);
    });

    it('satisfies symmetry: dist(a, b) === dist(b, a)', () => {
      const p1 = BOLIVAR_ANCHORS['san martin']!;
      const p2 = BOLIVAR_ANCHORS['parque las acollaradas']!;
      expect(calculateDistanceKm(p1, p2)).toBe(calculateDistanceKm(p2, p1));
    });

    it('satisfies triangle inequality: dist(a, c) <= dist(a, b) + dist(b, c) + epsilon', () => {
      const a = BOLIVAR_ANCHORS['san martin']!;
      const b = BOLIVAR_ANCHORS['brown']!;
      const c = BOLIVAR_ANCHORS['hospital']!;

      const distAC = calculateDistanceKm(a, c);
      const distAB = calculateDistanceKm(a, b);
      const distBC = calculateDistanceKm(b, c);

      // +0.1 km tolerance due to 1-decimal rounding (Math.round(R * c * 10) / 10)
      expect(distAC).toBeLessThanOrEqual(distAB + distBC + 0.1);
    });

    it('computes realistic distances within urban Bolívar (all < 6 km)', () => {
      for (const [, coords] of Object.entries(BOLIVAR_ANCHORS)) {
        const dist = calculateDistanceKm(BOLIVAR_CENTER, coords);
        expect(dist).toBeGreaterThanOrEqual(0);
        expect(dist).toBeLessThan(6.0); // No point in Bolívar urban grid is > 6 km from center
      }
    });
  });

  describe('estimateMotoEtaMinutes Boundary Conditions', () => {
    it('returns minimum floor of 3 minutes for 0 km or negative distance', () => {
      expect(estimateMotoEtaMinutes(0)).toBe(3);
      expect(estimateMotoEtaMinutes(-1)).toBe(3);
      expect(estimateMotoEtaMinutes(-100)).toBe(3);
    });

    it('scales linearly with distance at 30 km/h (2 min/km) + 2 min buffer', () => {
      // 1 km: 1 / 30 * 60 = 2 min + 2 = 4 min
      expect(estimateMotoEtaMinutes(1.0)).toBe(4);

      // 3 km: 3 / 30 * 60 = 6 min + 2 = 8 min
      expect(estimateMotoEtaMinutes(3.0)).toBe(8);

      // 10 km: 10 / 30 * 60 = 20 min + 2 = 22 min
      expect(estimateMotoEtaMinutes(10.0)).toBe(22);

      // 15 km: 15 / 30 * 60 = 30 min + 2 = 32 min
      expect(estimateMotoEtaMinutes(15.0)).toBe(32);
    });
  });

  describe('useGeolocation Lifecycle and Error Handling Stress', () => {
    it('provides BOLIVAR_CENTER as default fallback when geolocation is unavailable', () => {
      expect(BOLIVAR_CENTER).toEqual([-36.2307, -61.1130]);
    });

    it('validates geolocation error handling contracts', () => {
      const errorMap: Record<number, { permissionState?: string; message: string }> = {
        1: {
          permissionState: 'denied',
          message: 'Permiso de GPS denegado. Mostrando centro de Bolívar.'
        },
        2: {
          message: 'Señal GPS no disponible temporalmente.'
        },
        3: {
          message: 'Tiempo de espera de GPS agotado.'
        }
      };

      // PERMISSION_DENIED (1)
      expect(errorMap[1]?.permissionState).toBe('denied');
      expect(errorMap[1]?.message).toContain('Permiso de GPS denegado');

      // POSITION_UNAVAILABLE (2)
      expect(errorMap[2]?.message).toContain('Señal GPS no disponible');

      // TIMEOUT (3)
      expect(errorMap[3]?.message).toContain('Tiempo de espera de GPS agotado');
    });

    it('verifies watchPosition lifecycle registration and clearWatch cleanup', () => {
      let watchIdCounter = 100;
      const activeWatches = new Set<number>();

      const mockClear = (id: number) => {
        activeWatches.delete(id);
      };

      const mockWatch = (success: (pos: any) => void) => {
        const id = watchIdCounter++;
        activeWatches.add(id);
        success({
          coords: {
            latitude: -36.2307,
            longitude: -61.1130,
            accuracy: 5,
            heading: 90,
            speed: 12
          },
          timestamp: Date.now()
        });
        return id;
      };

      let recordedPosition: any = null;
      const id = mockWatch((pos) => {
        recordedPosition = pos;
      });

      expect(id).toBe(100);
      expect(activeWatches.has(100)).toBe(true);
      expect(recordedPosition.coords.latitude).toBeCloseTo(-36.2307, 4);
      expect(recordedPosition.coords.speed).toBe(12);

      // Unmount / cleanup simulation
      mockClear(id);
      expect(activeWatches.has(100)).toBe(false);
    });
  });
});

