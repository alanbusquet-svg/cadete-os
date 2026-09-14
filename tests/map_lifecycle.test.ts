import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Map Lifecycle & GPS Immunity Suite (tests/map_lifecycle.test.ts)', () => {
  const mapPath = resolve(__dirname, '../src/components/map/MapView.tsx');
  const modalPath = resolve(__dirname, '../src/components/map/OrderMapModal.tsx');
  const mapContent = readFileSync(mapPath, 'utf-8');
  const modalContent = readFileSync(modalPath, 'utf-8');

  it('1. MapView initializes Leaflet map once on mount ([]) without effectiveCenter re-trigger', () => {
    // Verifies the initialization effect has an empty dependency array []
    expect(mapContent).toContain('// Initialize Leaflet Map once on mount ([])');
    expect(mapContent).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?L\.map\(mapContainerRef\.current[\s\S]*?\},\s*\[\]\);/);
    
    // Verifies initialCenterRef is used for initialization center
    expect(mapContent).toContain('initialCenterRef');
    expect(mapContent).toContain('center: initialCenterRef.current');
  });

  it('2. MapView updates cadete GPS marker smoothly via setLatLng without map recreation', () => {
    // Dedicated effect for cadeteLocation updates
    expect(mapContent).toContain('// Update Cadete GPS marker reactively without destroying the map');
    expect(mapContent).toContain('cadeteMarkerRef.current.setLatLng(coords)');
    expect(mapContent).not.toContain('mapInstanceRef.current.remove()');
  });

  it('3. MapView synchronizes order markers reliably via updateOrderMarkers callback', () => {
    expect(mapContent).toContain('const updateOrderMarkers = useCallback(');
    expect(mapContent).toContain('orderMarkersLayerRef.current');
    expect(mapContent).toContain('layerGroup.clearLayers()');
    expect(mapContent).toContain('layerGroup.addLayer(marker)');
    expect(mapContent).toContain('updateOrderMarkers(map, orderGroup)');
  });

  it('4. MapView configures ResizeObserver and multi-stage invalidateSize delays (150ms, 400ms)', () => {
    expect(mapContent).toContain('ResizeObserver');
    expect(mapContent).toContain('map.invalidateSize()');
    expect(mapContent).toContain('150');
    expect(mapContent).toContain('400');
    expect(mapContent).toContain('resizeObserver.disconnect()');
  });

  it('5. OrderMapModal decouples cadete GPS coordinates from map initialization effect dependencies', () => {
    // Verify main effect dependencies are strictly [isOpen, order?.id]
    expect(modalContent).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?fetchOsrmRoute[\s\S]*?\},\s*\[isOpen,\s*order\?\.id\]\);/);
    expect(modalContent).not.toContain('[isOpen, order?.id, cadeteLocation?.lat, cadeteLocation?.lng]');
  });

  it('6. OrderMapModal tracks cadete marker smoothly on GPS movement without aborting OSRM route', () => {
    expect(modalContent).toContain('cadeteMarkerRef.current.setLatLng([cadeteLocation.lat, cadeteLocation.lng])');
    expect(modalContent).toContain('cadeteMarkerRef');
    expect(modalContent).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?cadeteMarkerRef\.current\.setLatLng[\s\S]*?\},\s*\[isOpen,\s*cadeteLocation\?\.lat,\s*cadeteLocation\?\.lng\]\);/);
  });

  it('7. OrderMapModal attaches ResizeObserver to route map container with clean disposal', () => {
    expect(modalContent).toContain('resizeObserver = new ResizeObserver(');
    expect(modalContent).toContain('resizeObserver.observe(mapContainerRef.current)');
    expect(modalContent).toContain('resizeObserver.disconnect()');
  });
});
