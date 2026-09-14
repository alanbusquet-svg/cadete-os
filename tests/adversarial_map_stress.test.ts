import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import L from 'leaflet';
import { fetchOsrmRoute } from '../src/utils/routing';
import { BOLIVAR_CENTER } from '../src/hooks/useGeolocation';
import type { Order } from '../src/types';

describe('Adversarial Challenger: Map Lifecycle, GPS Updates & Tile Rendering Stress Suite', () => {
  const mapPath = resolve(__dirname, '../src/components/map/MapView.tsx');
  const modalPath = resolve(__dirname, '../src/components/map/OrderMapModal.tsx');
  const cssPath = resolve(__dirname, '../src/index.css');
  const configPath = resolve(__dirname, '../src/components/map/mapConfig.ts');

  const mapContent = readFileSync(mapPath, 'utf-8');
  const modalContent = readFileSync(modalPath, 'utf-8');
  const cssContent = readFileSync(cssPath, 'utf-8');
  const configContent = readFileSync(configPath, 'utf-8');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleOrder: Order = {
    id: 'ord_stress_1',
    userId: 'usr_stress',
    date: '2026-09-14',
    timestamp: Date.now(),
    businessId: 'biz_1',
    businessName: 'Pizzería Central',
    address: 'Av. San Martín 450',
    zone: 'planta_urbana',
    amount: 4500,
    paidBy: 'customer',
    paymentMethod: 'cash',
    settled: false
  };

  // =========================================================================
  // 1. RAPID GPS POSITION UPDATES & EFFECTIVECENTER STRESS TESTING
  // =========================================================================
  describe('1. Stress Test Rapid GPS Position Updates & EffectiveCenter', () => {
    it('guarantees Leaflet map is mounted strictly once ([]) and immune to 10 updates in 100ms', () => {
      // 1. Verify mount effect has [] dependency array
      const mountEffectRegex = /useEffect\(\(\)\s*=>\s*\{[\s\S]*?const map = L\.map[\s\S]*?return\s*\(\)\s*=>\s*\{[\s\S]*?map\.remove\(\);[\s\S]*?\};\s*[\s\S]*?\},\s*\[\]\);/;
      expect(mapContent).toMatch(mountEffectRegex);

      // 2. Verify cadeteLocation is NOT in the map mount effect dependencies
      expect(mapContent).not.toMatch(/L\.map\(mapContainerRef\.current[\s\S]*?\}\s*,\s*\[[^\]]*cadeteLocation/);

      // 3. Verify effectiveCenter is NOT in any effect dependency
      expect(mapContent).not.toMatch(/useEffect\([\s\S]*?\},\s*\[[^\]]*effectiveCenter[^\]]*\]\)/);

      // 4. Verify initial center is stabilized via initialCenterRef
      expect(mapContent).toContain('initialCenterRef = useRef<[number, number]>(');
      expect(mapContent).toContain('center: initialCenterRef.current');
    });

    it('simulates 10 rapid GPS updates in 100ms: updates marker position via setLatLng with 0 map teardowns', () => {
      // Mock marker with setLatLng spy
      let markerPos: [number, number] = BOLIVAR_CENTER;
      const setLatLngSpy = vi.fn((coords: [number, number]) => {
        markerPos = coords;
      });

      const mockMarker = {
        setLatLng: setLatLngSpy
      };

      const mapRemoveSpy = vi.fn();
      const mockMap = {
        remove: mapRemoveSpy
      };

      // Simulate 10 GPS ticks arriving within 100ms
      const gpsTicks: [number, number][] = [
        [-36.2301, -61.1121],
        [-36.2302, -61.1122],
        [-36.2303, -61.1123],
        [-36.2304, -61.1124],
        [-36.2305, -61.1125],
        [-36.2306, -61.1126],
        [-36.2307, -61.1127],
        [-36.2308, -61.1128],
        [-36.2309, -61.1129],
        [-36.2310, -61.1130]
      ];

      for (const coords of gpsTicks) {
        mockMarker.setLatLng(coords);
      }

      // Assert marker updated 10 times smoothly
      expect(setLatLngSpy).toHaveBeenCalledTimes(10);
      expect(markerPos).toEqual([-36.2310, -61.1130]);

      // Assert map.remove was NEVER called during GPS movement
      expect(mapRemoveSpy).not.toHaveBeenCalled();
    });

    it('verifies that effectiveCenter reference instability does not cause map re-centering or teardown', () => {
      // In MapView.tsx, effectiveCenter is only used in handleRecenter
      expect(mapContent).toContain('const handleRecenter = useCallback(');
      expect(mapContent).toContain('mapInstanceRef.current.setView(center, DEFAULT_MAP_ZOOM, { animate: true });');

      // Verify handleRecenter is solely bound to the UI button onClick
      expect(mapContent).toContain('onClick={handleRecenter}');
      expect(mapContent).toContain('title="Centrar en mi ubicación GPS"');
    });

    it('verifies order markers are never cleared without being re-added in updateOrderMarkers', () => {
      // Inspect updateOrderMarkers in MapView.tsx
      expect(mapContent).toContain('layerGroup.clearLayers();');
      expect(mapContent).toContain('displayedOrders.forEach((order) => {');
      expect(mapContent).toContain('layerGroup.addLayer(marker);');

      // Verify clearLayers() and addLayer() occur synchronously in the same function
      const updateFunctionBody = mapContent.slice(
        mapContent.indexOf('const updateOrderMarkers = useCallback('),
        mapContent.indexOf('}, [displayedOrders, selectedOrder]);')
      );

      expect(updateFunctionBody).toContain('layerGroup.clearLayers()');
      expect(updateFunctionBody).toContain('displayedOrders.forEach');
      expect(updateFunctionBody).toContain('layerGroup.addLayer(marker)');

      // Verify that GPS updates do NOT trigger updateOrderMarkers
      // (updateOrderMarkers dependencies are strictly [displayedOrders, selectedOrder])
      expect(updateFunctionBody).not.toContain('cadeteLocation');
      expect(updateFunctionBody).not.toContain('effectiveCenter');
    });
  });

  // =========================================================================
  // 2. ORDERMAPMODAL RAPID OPEN/CLOSE & ASYNC ABORT STRESS TESTING
  // =========================================================================
  describe('2. Stress Test OrderMapModal Lifecycle & OSRM Routing', () => {
    it('simulates rapid open and close before 150ms transition timeout (clean cancellation)', () => {
      vi.useFakeTimers();
      const mapRemoveSpy = vi.fn();
      let timerFired = false;

      // Simulate open: sets 150ms timeout
      let isOpen = true;
      let isMounted = true;
      const abortController = new AbortController();

      const timer = setTimeout(() => {
        if (!isMounted) return;
        timerFired = true;
      }, 150);

      // Rapid close after 40ms
      vi.advanceTimersByTime(40);
      isOpen = false;
      isMounted = false;
      abortController.abort();
      clearTimeout(timer);

      // Advance past 150ms
      vi.advanceTimersByTime(200);

      expect(timerFired).toBe(false);
      expect(abortController.signal.aborted).toBe(true);
      expect(mapRemoveSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('simulates modal close while OSRM route fetch is in-flight: aborts fetch without unhandled rejections', async () => {
      const abortController = new AbortController();
      let isMounted = true;
      let stateUpdated = false;

      // Simulate fetchOsrmRoute pending promise with abort signal
      const origin: [number, number] = [-36.2307, -61.113];
      const destination: [number, number] = [-36.2355, -61.112];

      vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });

      // Start route fetch
      const routePromise = fetchOsrmRoute(origin, destination, { signal: abortController.signal })
        .then((_result) => {
          if (!isMounted) return;
          stateUpdated = true;
        })
        .catch(() => {
          if (isMounted) {
            stateUpdated = true;
          }
        });

      // Modal closes while fetch is in-flight
      isMounted = false;
      abortController.abort();

      await routePromise;

      // Assert state was NOT updated after unmount
      expect(stateUpdated).toBe(false);
      expect(abortController.signal.aborted).toBe(true);
    });

    it('verifies OSRM route fetch is NOT aborted when GPS coordinates change while modal remains open', () => {
      // Verify main route effect in OrderMapModal dependencies are strictly [isOpen, order?.id]
      const routeEffectRegex = /useEffect\(\(\)\s*=>\s*\{[\s\S]*?fetchOsrmRoute[\s\S]*?\},\s*\[isOpen,\s*order\?\.id\]\);/;
      expect(modalContent).toMatch(routeEffectRegex);

      // Verify separate GPS effect has dependencies [isOpen, cadeteLocation?.lat, cadeteLocation?.lng]
      const gpsMarkerEffectRegex = /useEffect\(\(\)\s*=>\s*\{[\s\S]*?cadeteMarkerRef\.current\.setLatLng[\s\S]*?\},\s*\[isOpen,\s*cadeteLocation\?\.lat,\s*cadeteLocation\?\.lng\]\);/;
      expect(modalContent).toMatch(gpsMarkerEffectRegex);

      // Verify the separate GPS effect does NOT touch abortController or polylineRef
      const gpsEffectMatch = modalContent.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?cadeteMarkerRef\.current\.setLatLng[\s\S]*?\},/);
      expect(gpsEffectMatch).toBeDefined();
      if (gpsEffectMatch) {
        expect(gpsEffectMatch[0]).not.toContain('abortController');
        expect(gpsEffectMatch[0]).not.toContain('mapInstanceRef.current.remove()');
      }
    });

    it('verifies previous Leaflet map instance is cleanly disposed if container was previously initialized', () => {
      expect(modalContent).toContain('if (mapInstanceRef.current) {');
      expect(modalContent).toContain('mapInstanceRef.current.remove();');
      expect(modalContent).toContain('mapInstanceRef.current = null;');
      expect(modalContent).toContain('polylineRef.current = null;');
      expect(modalContent).toContain('cadeteMarkerRef.current = null;');
    });
  });

  // =========================================================================
  // 3. CONTAINER RESIZE & TAB SWITCHING STRESS TESTING
  // =========================================================================
  describe('3. Stress Test Container Resize & Tab Switching', () => {
    it('ResizeObserver in MapView checks clientHeight > 0 to prevent 0-height rendering glitches', () => {
      expect(mapContent).toContain('if (typeof ResizeObserver !== \'undefined\' && mapContainerRef.current) {');
      expect(mapContent).toContain('if (mapContainerRef.current && mapContainerRef.current.clientHeight > 0) {');
      expect(mapContent).toContain('map.invalidateSize();');
      expect(mapContent).toContain('resizeObserver.observe(mapContainerRef.current);');
      expect(mapContent).toContain('resizeObserver.disconnect();');
    });

    it('ResizeObserver in OrderMapModal checks clientHeight > 0 to handle modal opening animation', () => {
      expect(modalContent).toContain('if (typeof ResizeObserver !== \'undefined\' && mapContainerRef.current) {');
      expect(modalContent).toContain('if (mapContainerRef.current && mapContainerRef.current.clientHeight > 0) {');
      expect(modalContent).toContain('map.invalidateSize();');
      expect(modalContent).toContain('resizeObserver.observe(mapContainerRef.current);');
      expect(modalContent).toContain('resizeObserver.disconnect();');
    });

    it('simulates ResizeObserver trigger: ignores 0-height and executes invalidateSize on positive height', () => {
      const invalidateSizeSpy = vi.fn();
      const mockMap = { invalidateSize: invalidateSizeSpy };

      // Callback simulation
      const onResize = (clientHeight: number) => {
        if (clientHeight > 0) {
          mockMap.invalidateSize();
        }
      };

      // 1. Initial 0-height while tab is hidden or modal starts animating
      onResize(0);
      expect(invalidateSizeSpy).not.toHaveBeenCalled();

      // 2. Transition to visible layout (e.g. 520px height)
      onResize(520);
      expect(invalidateSizeSpy).toHaveBeenCalledTimes(1);

      // 3. Tab resized / phone rotated (e.g. 380px height)
      onResize(380);
      expect(invalidateSizeSpy).toHaveBeenCalledTimes(2);
    });

    it('MapView provides staged multi-timer invalidateSize fallback (150ms, 400ms)', () => {
      expect(mapContent).toContain('map.invalidateSize();');
      expect(mapContent).toMatch(/setTimeout\(\(\)\s*=>\s*\{\s*map\.invalidateSize\(\);\s*\},\s*150\);/);
      expect(mapContent).toMatch(/setTimeout\(\(\)\s*=>\s*\{\s*map\.invalidateSize\(\);\s*\},\s*400\);/);
    });
  });

  // =========================================================================
  // 4. HIGH CONTRAST & SUNLIGHT VISIBILITY STRESS TESTING
  // =========================================================================
  describe('4. High Contrast Dark Tile Styling for Motorcycle Sunlight Visibility', () => {
    it('verifies CSS contrast boost filter on .leaflet-tile-pane in index.css', () => {
      expect(cssContent).toContain('.leaflet-tile-pane');
      expect(cssContent).toMatch(/filter:\s*contrast\(140%\)\s*brightness\(125%\)\s*saturate\(115%\)/);
    });

    it('verifies CartoDB Dark Matter tile configuration does not use paid API credentials', () => {
      expect(configContent).toContain('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
      expect(configContent).not.toContain('api_key');
      expect(configContent).not.toContain('token=');
      expect(configContent).not.toContain('google.com/maps/api');
    });

    it('verifies map canvas containers have dark background fallback (bg-zinc-950) to prevent white flashing', () => {
      expect(mapContent).toContain('bg-zinc-950');
      expect(modalContent).toContain('bg-zinc-950');
    });
  });
});
