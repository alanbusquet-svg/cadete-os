import type { TileLayerOptions } from 'leaflet';

export const BOLIVAR_COORDINATES: [number, number] = [-36.2307, -61.1113];
export const DEFAULT_MAP_ZOOM = 14;

export const CARTO_DARK_MATTER_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const CARTO_TILE_OPTIONS: TileLayerOptions = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20,
  minZoom: 3,
  detectRetina: true
};
