import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import {
  OSM_TILE_URL,
  OSM_TILE_OPTIONS,
  CARTO_DARK_MATTER_URL,
  CARTO_TILE_OPTIONS
} from '../src/components/map/mapConfig';

describe('100% In-App Navigation & Watermark-Free Tile Verification Suite', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  it('1. OrderMapModal has zero external navigation buttons, external links, or dropdown menus', () => {
    const modalSrc = getFileContent('src/components/map/OrderMapModal.tsx');

    // Must not import or invoke openNavigation
    expect(modalSrc).not.toContain('openNavigation');

    // Must not have external dropdown state or links
    expect(modalSrc).not.toContain('showNavMenu');
    expect(modalSrc).not.toContain('setShowNavMenu');
    expect(modalSrc).not.toContain('handleExternalNav');
    expect(modalSrc).not.toContain('Google Maps');
    expect(modalSrc).not.toContain('Waze');
    expect(modalSrc).not.toContain('ExternalLink');
    expect(modalSrc).not.toContain('Abrir en Google Maps');
  });

  it('2. OrderMapModal renders in-app "Enfocar Ruta / Destino", voice audio button, and "Volver a Viajes" >= 52px', () => {
    const modalSrc = getFileContent('src/components/map/OrderMapModal.tsx');

    // In-app route recenter / focus button
    expect(modalSrc).toContain('handleFocusRoute');
    expect(modalSrc).toContain('Enfocar Ruta');
    expect(modalSrc).toContain('min-h-[52px] px-3.5');

    // In-app voice toggle / audio button
    expect(modalSrc).toContain('handleVoiceAction');
    expect(modalSrc).toContain('min-h-[52px] w-10');
    expect(modalSrc).toContain('Volume2');
    expect(modalSrc).toContain('VolumeX');

    // Primary return button
    expect(modalSrc).toContain('Volver a Viajes');
    expect(modalSrc).toContain('flex-1 min-h-[52px]');
    expect(modalSrc).toContain('onClick={onClose}');
  });

  it('3. OrderFormModal address field contains zero external navigation buttons', () => {
    const formSrc = getFileContent('src/components/orders/OrderFormModal.tsx');

    // Must not import or invoke openNavigation
    expect(formSrc).not.toContain('openNavigation');
    expect(formSrc).not.toContain('Probar GPS Google Maps');
    expect(formSrc).not.toContain('Navigation className');
    expect(formSrc).not.toContain('rightElement');
  });

  it('4. Global audit: zero UI components in src/components invoke openNavigation or external map URLs', () => {
    const componentsDir = resolve(__dirname, '../src/components');
    const getFilesRecursively = (dir: string): string[] => {
      let results: string[] = [];
      const list = readdirSync(dir);
      for (const file of list) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFilesRecursively(fullPath));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          results.push(fullPath);
        }
      }
      return results;
    };

    const files = getFilesRecursively(componentsDir);
    expect(files.length).toBeGreaterThan(15);

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toContain('openNavigation(');
      expect(content).not.toContain('https://www.google.com/maps');
      expect(content).not.toContain('https://waze.com');
    }
  });

  it('5. mapConfig.ts contains zero CartoDB watermark URLs or paid API key queries', () => {
    const configSrc = getFileContent('src/components/map/mapConfig.ts');

    // Zero CartoDB watermark URLs or apikey references
    expect(configSrc).not.toContain('basemaps.cartocdn.com');
    expect(configSrc).not.toContain('carto.com/basemaps/apikey');
    expect(configSrc).not.toContain('API KEY REQUIRED');

    // Must define valid free OpenStreetMap tile provider
    expect(OSM_TILE_URL).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(OSM_TILE_OPTIONS.maxZoom).toBe(19);
    expect(OSM_TILE_OPTIONS.minZoom).toBe(3);
    expect(OSM_TILE_OPTIONS.crossOrigin).toBe(true);
    expect(OSM_TILE_OPTIONS.attribution).toContain('OpenStreetMap');
    expect(CARTO_DARK_MATTER_URL).toBe(OSM_TILE_URL);
    expect(CARTO_TILE_OPTIONS).toBe(OSM_TILE_OPTIONS);
  });

  it('6. src/index.css applies dark mode high-contrast filter for OpenStreetMap tiles', () => {
    const cssContent = getFileContent('src/index.css');
    expect(cssContent).toContain('.leaflet-tile-pane');
    expect(cssContent).toMatch(/filter:\s*invert\(100%\)\s*hue-rotate\(180deg\)\s*brightness\(88%\)\s*contrast\(125%\)\s*saturate\(75%\)/);
  });

  it('7. AuthView.tsx reflects 100% in-app navigation copy without external map claims', () => {
    const authSrc = getFileContent('src/components/auth/AuthView.tsx');
    expect(authSrc).toContain('Mapa y navegación integrados 100% en la app');
    expect(authSrc).not.toContain('Rutas automáticas a Google Maps y Waze');
  });
});
