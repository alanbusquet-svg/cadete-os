// ==========================================
// CADETE OS - NAVIGATION & GPS DEEP LINKING
// ==========================================

export const DEFAULT_CITY = "San Carlos de Bolívar";
export const DEFAULT_COUNTRY = "Argentina";

/**
 * Genera el deep link universal 100% gratuito para Google Maps
 * @param address Dirección de entrega (ej: "Av. San Martín 450")
 * @param city Ciudad por defecto ("San Carlos de Bolívar")
 * @param country País por defecto ("Argentina"). Si es vacío o no se provee, no se concatena.
 */
export function getGoogleMapsUrl(
  address: string,
  city: string = DEFAULT_CITY,
  country?: string
): string {
  const trimmed = address.trim();
  if (!trimmed) return "";
  const trimmedCountry = country?.trim() || "";
  const fullAddress = trimmedCountry ? `${trimmed}, ${city}, ${trimmedCountry}` : `${trimmed}, ${city}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}

/**
 * Genera el deep link universal 100% gratuito para Waze
 * @param address Dirección de entrega (ej: "Av. San Martín 450")
 * @param city Ciudad por defecto ("San Carlos de Bolívar")
 * @param country País por defecto ("Argentina"). Si es vacío o no se provee, no se concatena.
 */
export function getWazeUrl(
  address: string,
  city: string = DEFAULT_CITY,
  country?: string
): string {
  const trimmed = address.trim();
  if (!trimmed) return "";
  const trimmedCountry = country?.trim() || "";
  const fullAddress = trimmedCountry ? `${trimmed}, ${city}, ${trimmedCountry}` : `${trimmed}, ${city}`;
  return `https://waze.com/ul?q=${encodeURIComponent(fullAddress)}&navigate=yes`;
}

/**
 * Verifica si una dirección es válida para navegación
 */
export function isValidAddress(address?: string): boolean {
  return typeof address === 'string' && address.trim().length > 0;
}

/**
 * Abre el enlace de navegación en una nueva ventana / app del sistema
 */
export function openNavigation(
  address: string,
  provider: 'google' | 'waze' = 'google',
  city: string = DEFAULT_CITY,
  country?: string
): void {
  const url = provider === 'waze' ? getWazeUrl(address, city, country) : getGoogleMapsUrl(address, city, country);
  if (url && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
