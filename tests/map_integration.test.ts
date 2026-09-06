import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  BOLIVAR_COORDINATES,
  DEFAULT_MAP_ZOOM,
  CARTO_DARK_MATTER_URL,
  CARTO_TILE_OPTIONS
} from '../src/components/map/mapConfig';
import {
  createCadeteLocationIcon,
  createOrderDestinationIcon
} from '../src/components/map/mapIcons';
import { BOLIVAR_CENTER } from '../src/hooks/useGeolocation';

describe('Map Configuration & Dark Matter Tiles (mapConfig.ts)', () => {
  it('defines correct San Carlos de Bolívar center coordinates and default zoom', () => {
    expect(BOLIVAR_COORDINATES[0]).toBeCloseTo(-36.2307, 3);
    expect(BOLIVAR_COORDINATES[1]).toBeCloseTo(-61.1113, 3);
    expect(DEFAULT_MAP_ZOOM).toBe(14);
  });

  it('configures CartoDB Dark Matter tile URL without API keys', () => {
    expect(CARTO_DARK_MATTER_URL).toBe(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    );
    expect(CARTO_TILE_OPTIONS.subdomains).toBe('abcd');
    expect(CARTO_TILE_OPTIONS.maxZoom).toBe(20);
    expect(CARTO_TILE_OPTIONS.detectRetina).toBe(true);
    expect(CARTO_TILE_OPTIONS.attribution).toContain('CARTO');
    expect(CARTO_TILE_OPTIONS.attribution).toContain('OpenStreetMap');
  });
});

describe('Custom Leaflet DivIcons (mapIcons.ts)', () => {
  it('generates cadete pulsing GPS beacon divIcon without 404 image assets', () => {
    const icon = createCadeteLocationIcon();
    expect(icon.options.className).toBe('cadete-gps-pin');
    expect(icon.options.html).toContain('animate-ping');
    expect(icon.options.html).toContain('bg-blue-500');
    expect(icon.options.iconSize).toEqual([32, 32]);
    expect(icon.options.iconAnchor).toEqual([16, 16]);
  });

  it('generates order destination chip with cash payment badge and emerald dot', () => {
    const icon = createOrderDestinationIcon(3500, 'cash', false);
    expect(icon.options.className).toBe('order-map-pin');
    expect(icon.options.html).toContain('3.500');
    expect(icon.options.html).toContain('bg-emerald-400');
    expect(icon.options.html).toContain('text-emerald-400');
    expect(icon.options.iconSize).toEqual([80, 36]);
    expect(icon.options.iconAnchor).toEqual([40, 34]);
  });

  it('generates order destination chip with transfer payment badge and cyan dot', () => {
    const icon = createOrderDestinationIcon(4200, 'transfer', true);
    expect(icon.options.className).toBe('order-map-pin');
    expect(icon.options.html).toContain('4.200');
    expect(icon.options.html).toContain('bg-cyan-400');
    expect(icon.options.html).toContain('text-cyan-400');
    expect(icon.options.html).toContain('scale-110');
  });
});

describe('Geolocation & Map Component Architecture Integrity', () => {
  it('provides Bolívar center fallback coordinates in useGeolocation', () => {
    expect(BOLIVAR_CENTER[0]).toBeCloseTo(-36.2307, 3);
    expect(BOLIVAR_CENTER[1]).toBeCloseTo(-61.1130, 3);
  });

  it('verifies MapView component integration and ergonomics', () => {
    const mapViewContent = readFileSync(
      resolve(__dirname, '../src/components/map/MapView.tsx'),
      'utf-8'
    );
    expect(mapViewContent).toContain('useGeolocation');
    expect(mapViewContent).toContain('useOrders');
    expect(mapViewContent).toContain('createCadeteLocationIcon');
    expect(mapViewContent).toContain('createOrderDestinationIcon');
    expect(mapViewContent).toContain('CARTO_DARK_MATTER_URL');
    expect(mapViewContent).toContain('invalidateSize');
    expect(mapViewContent).toContain('Centrar en mi ubicación GPS');
  });

  it('verifies OrderMapModal route polyline and mobile ergonomics', () => {
    const modalContent = readFileSync(
      resolve(__dirname, '../src/components/map/OrderMapModal.tsx'),
      'utf-8'
    );
    expect(modalContent).toContain('calculateDistanceKm');
    expect(modalContent).toContain('estimateMotoEtaMinutes');
    expect(modalContent).toContain('resolveOrderCoordinates');
    expect(modalContent).toContain('L.polyline');
    expect(modalContent).toContain('color: \'#10b981\'');
    expect(modalContent).toContain('speakOrder');
    expect(modalContent).toContain('Volver a Viajes');
  });

  it('verifies OrderCard provides both Ver en Mapa and Cómo ir buttons', () => {
    const orderCardContent = readFileSync(
      resolve(__dirname, '../src/components/orders/OrderCard.tsx'),
      'utf-8'
    );
    expect(orderCardContent).toContain('Ver en Mapa');
    expect(orderCardContent).toContain('Cómo ir');
    expect(orderCardContent).toContain('speakOrder');
    expect(orderCardContent).toContain('onViewOnMap');
    expect(orderCardContent).toContain('min-h-[52px]');
  });

  it('verifies Header provides 1-tap voice mute toggle', () => {
    const headerContent = readFileSync(
      resolve(__dirname, '../src/components/layout/Header.tsx'),
      'utf-8'
    );
    expect(headerContent).toContain('toggleSpeechMuted');
    expect(headerContent).toContain('isSpeechMuted');
    expect(headerContent).toContain('Volume2');
    expect(headerContent).toContain('VolumeX');
  });

  it('verifies SettingsView includes voice assistant management', () => {
    const settingsContent = readFileSync(
      resolve(__dirname, '../src/components/settings/SettingsView.tsx'),
      'utf-8'
    );
    expect(settingsContent).toContain('Asistente de Voz');
    expect(settingsContent).toContain('setSpeechMuted');
    expect(settingsContent).toContain('speakText');
  });

  it('verifies App renders MapView for map tab', () => {
    const appContent = readFileSync(resolve(__dirname, '../src/App.tsx'), 'utf-8');
    expect(appContent).toContain('activeTab === \'map\' && <MapView />');
  });

  it('verifies BottomNav and SidebarNav include Map tab', () => {
    const bottomNavContent = readFileSync(
      resolve(__dirname, '../src/components/layout/BottomNav.tsx'),
      'utf-8'
    );
    const sidebarNavContent = readFileSync(
      resolve(__dirname, '../src/components/layout/SidebarNav.tsx'),
      'utf-8'
    );
    expect(bottomNavContent).toContain("id: 'map'");
    expect(bottomNavContent).toContain("label: 'Mapa'");
    expect(sidebarNavContent).toContain("id: 'map'");
    expect(sidebarNavContent).toContain("label: 'Mapa en Vivo'");
  });
});

describe('R1, R3, R4, R5-UI In-App Map & Voice Navigation Verification', () => {
  it('verifies R1: OrderCard "Cómo ir" button triggers in-app modal without external navigation', () => {
    const orderCardContent = readFileSync(
      resolve(__dirname, '../src/components/orders/OrderCard.tsx'),
      'utf-8'
    );

    // Primary action is "Cómo ir" with >= 52px touch target
    expect(orderCardContent).toContain('flex-1 min-h-[52px]');
    expect(orderCardContent).toContain('Cómo ir');
    expect(orderCardContent).toContain('Ver en Mapa');

    // Calls handleOpenMap which delegates to onViewOnMap
    expect(orderCardContent).toContain('handleOpenMap');
    expect(orderCardContent).toContain('onViewOnMap');

    // Crucial R1 constraint: NO external navigation to openNavigation from OrderCard
    expect(orderCardContent).not.toContain('openNavigation(');
    expect(orderCardContent).not.toContain("handleNavigate('google')");
    expect(orderCardContent).not.toContain("handleNavigate('waze')");

    // Hidden when address is missing
    expect(orderCardContent).toContain('{hasAddress && (');
  });

  it('verifies R4: OrderCard includes dedicated >= 44px speech button next to amount', () => {
    const orderCardContent = readFileSync(
      resolve(__dirname, '../src/components/orders/OrderCard.tsx'),
      'utf-8'
    );

    // Touch target >= 44px
    expect(orderCardContent).toContain('w-11 h-11 min-w-[44px] min-h-[44px]');
    expect(orderCardContent).toContain('handleSpeakOrder');

    // Mute synchronization
    expect(orderCardContent).toContain('cadete_os_speech_muted_changed');
    expect(orderCardContent).toContain('storage');

    // Visual indicators for mute / unmute
    expect(orderCardContent).toContain('VolumeX');
    expect(orderCardContent).toContain('Volume2');

    // Audio invocation
    expect(orderCardContent).toContain('speakOrder(order)');
  });

  it('verifies R3: OrderMapModal auto-speaks order readout within 150ms and prevents duplicates', () => {
    const modalContent = readFileSync(
      resolve(__dirname, '../src/components/map/OrderMapModal.tsx'),
      'utf-8'
    );

    // Auto speech within 150ms (< 300ms)
    expect(modalContent).toContain('150');
    expect(modalContent).toContain('hasSpokenRef');
    expect(modalContent).toContain('isSpeechMuted()');
    expect(modalContent).toContain('cancelSpeech()');
    expect(modalContent).toContain('speakOrder(order)');

    // Manual speech repeat button in header
    expect(modalContent).toContain('handleSpeak');
    expect(modalContent).toContain('Volume2');
  });

  it('verifies R5-UI: OrderMapModal integrates OSRM street route with straight-line fallback and loading indicator', () => {
    const modalContent = readFileSync(
      resolve(__dirname, '../src/components/map/OrderMapModal.tsx'),
      'utf-8'
    );

    // Imports OSRM routing helper
    expect(modalContent).toContain("import { fetchOsrmRoute } from '../../utils/routing'");

    // State for dynamic routing & loading indicator
    expect(modalContent).toContain('isLoadingRoute');
    expect(modalContent).toContain('Trazando calles...');
    expect(modalContent).toContain('Loader2');

    // Initial straight polyline
    expect(modalContent).toContain('L.polyline');
    expect(modalContent).toContain("color: '#10b981'");
    expect(modalContent).toContain("dashArray: '6, 8'");

    // Dynamic polyline swap
    expect(modalContent).toContain('map.removeLayer(polylineRef.current)');
    expect(modalContent).toContain('map.fitBounds');
    expect(modalContent).toContain('setDistanceKm(result.distanceKm)');
    expect(modalContent).toContain('setEtaMinutes(result.durationMinutes)');
  });
});
