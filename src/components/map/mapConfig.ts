import type { TileLayerOptions } from 'leaflet';

export const BOLIVAR_COORDINATES: [number, number] = [-36.2307, -61.1113];
export const DEFAULT_MAP_ZOOM = 14;

/**
 * OpenStreetMap Standard Tile Layer
 * 100% Libre, Gratuito, Sin clave de API, Sin límites de suscripción y Sin marcas de agua.
 */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_TILE_OPTIONS: TileLayerOptions = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  minZoom: 3,
  crossOrigin: true
};

// Aliases de compatibilidad para evitar rupturas inmediatas en imports existentes
export const CARTO_DARK_MATTER_URL = OSM_TILE_URL;
export const CARTO_TILE_OPTIONS = OSM_TILE_OPTIONS;

