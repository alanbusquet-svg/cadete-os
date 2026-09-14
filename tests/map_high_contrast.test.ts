import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  CARTO_DARK_MATTER_URL,
  CARTO_TILE_OPTIONS,
  BOLIVAR_COORDINATES
} from '../src/components/map/mapConfig';
import {
  createCadeteLocationIcon,
  createOrderDestinationIcon
} from '../src/components/map/mapIcons';

describe('High-Contrast Dark Tiles & Street Visibility Suite (tests/map_high_contrast.test.ts)', () => {
  const cssPath = resolve(__dirname, '../src/index.css');
  const cssContent = readFileSync(cssPath, 'utf-8');

  it('1. applies .leaflet-tile-pane high-contrast filter for motorcycle sunlight visibility in dark mode and clean tiles in light mode', () => {
    expect(cssContent).toContain('.leaflet-tile-pane');
    expect(cssContent).toMatch(/filter:\s*invert\(100%\)\s*hue-rotate\(180deg\)\s*brightness\(88%\)\s*contrast\(125%\)\s*saturate\(75%\)/);
    expect(cssContent).toContain('.map-light .leaflet-tile-pane');
    expect(cssContent).toContain('filter: none !important');
  });

  it('2. OpenStreetMap tile configuration uses zero paid API keys, zero watermarks, and high maxZoom', () => {
    expect(CARTO_DARK_MATTER_URL).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(CARTO_DARK_MATTER_URL).not.toContain('key=');
    expect(CARTO_DARK_MATTER_URL).not.toContain('token=');
    expect(CARTO_DARK_MATTER_URL).not.toContain('basemaps.cartocdn.com');
    expect(CARTO_TILE_OPTIONS.maxZoom).toBe(19);
    expect(CARTO_TILE_OPTIONS.minZoom).toBe(3);
    expect(CARTO_TILE_OPTIONS.crossOrigin).toBe(true);
    expect(CARTO_TILE_OPTIONS.attribution).toContain('OpenStreetMap');
    expect(CARTO_TILE_OPTIONS.attribution).not.toContain('CARTO');
  });

  it('3. cadete pulsing GPS beacon uses high-visibility blue ring with animate-ping', () => {
    const icon = createCadeteLocationIcon();
    expect(icon.options.className).toBe('cadete-gps-pin');
    expect(icon.options.html).toContain('animate-ping');
    expect(icon.options.html).toContain('bg-blue-500');
    expect(icon.options.iconSize).toEqual([32, 32]);
    expect(icon.options.iconAnchor).toEqual([16, 16]);
  });

  it('4. order destination chip generates distinct high-contrast badges for cash and transfer methods', () => {
    const cashIcon = createOrderDestinationIcon(2800, 'cash', false);
    expect(cashIcon.options.html).toContain('bg-emerald-400');
    expect(cashIcon.options.html).toContain('text-emerald-400');
    expect(cashIcon.options.html).toContain('2.800');

    const transferIcon = createOrderDestinationIcon(3500, 'transfer', true);
    expect(transferIcon.options.html).toContain('bg-cyan-400');
    expect(transferIcon.options.html).toContain('text-cyan-400');
    expect(transferIcon.options.html).toContain('3.500');
    expect(transferIcon.options.html).toContain('scale-110');
  });

  it('5. custom dark popup styling in index.css enforces dark background and crisp border', () => {
    expect(cssContent).toContain('.leaflet-popup-content-wrapper');
    expect(cssContent).toContain('background-color: #18181b !important');
    expect(cssContent).toContain('border: 1px solid #27272a');
    expect(cssContent).toContain('color: #f4f4f5 !important');
  });

  it('6. San Carlos de Bolívar center coordinates are strictly within the urban perimeter', () => {
    const [lat, lng] = BOLIVAR_COORDINATES;
    expect(lat).toBeLessThan(-36.21);
    expect(lat).toBeGreaterThan(-36.25);
    expect(lng).toBeLessThan(-61.09);
    expect(lng).toBeGreaterThan(-61.13);
  });
});
