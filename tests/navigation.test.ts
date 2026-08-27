import { describe, it, expect, vi } from 'vitest';
import {
  getGoogleMapsUrl,
  getWazeUrl,
  isValidAddress,
  openNavigation,
  DEFAULT_CITY,
  DEFAULT_COUNTRY
} from '../src/utils/navigation';

describe('GPS & Navigation Universal Links', () => {
  it('generates correct Google Maps deep link for San Carlos de Bolívar', () => {
    const address = 'Av. San Martín 450';
    const url = getGoogleMapsUrl(address);

    expect(url).toContain('https://www.google.com/maps/dir/?api=1&destination=');
    expect(url).toContain(encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar'));
  });

  it('generates correct Waze deep link for San Carlos de Bolívar', () => {
    const address = 'Av. Brown 220';
    const url = getWazeUrl(address);

    expect(url).toContain('https://waze.com/ul?q=');
    expect(url).toContain(encodeURIComponent('Av. Brown 220, San Carlos de Bolívar'));
    expect(url).toContain('&navigate=yes');
  });

  it('returns empty string if address is empty or whitespace', () => {
    expect(getGoogleMapsUrl('')).toBe('');
    expect(getGoogleMapsUrl('   ')).toBe('');
    expect(getWazeUrl('')).toBe('');
    expect(getWazeUrl('   ')).toBe('');
  });

  it('validates address correctly', () => {
    expect(isValidAddress('Av. Cancio 1120')).toBe(true);
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('   ')).toBe(false);
    expect(isValidAddress(undefined)).toBe(false);
  });

  // R1 & R4: Multi-Country Navigation Tests
  it('exports default constants correctly', () => {
    expect(DEFAULT_CITY).toBe('San Carlos de Bolívar');
    expect(DEFAULT_COUNTRY).toBe('Argentina');
  });

  it('omits country when not provided, preserving backward compatibility with city only', () => {
    const address = 'Av. San Martín 450';
    const gmapsUrl = getGoogleMapsUrl(address, 'San Carlos de Bolívar');
    const wazeUrl = getWazeUrl(address, 'San Carlos de Bolívar');

    expect(gmapsUrl).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar')}`
    );
    expect(wazeUrl).toBe(
      `https://waze.com/ul?q=${encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar')}&navigate=yes`
    );
    expect(gmapsUrl).not.toContain(encodeURIComponent(', Argentina'));
  });

  it('includes explicit country parameter in Google Maps and Waze deep links', () => {
    const address = 'Av. San Martín 450';
    const city = 'San Carlos de Bolívar';
    const country = 'Argentina';

    const gmapsUrl = getGoogleMapsUrl(address, city, country);
    const wazeUrl = getWazeUrl(address, city, country);

    expect(gmapsUrl).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar, Argentina')}`
    );
    expect(wazeUrl).toBe(
      `https://waze.com/ul?q=${encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar, Argentina')}&navigate=yes`
    );

    // International test
    const intlGmaps = getGoogleMapsUrl('Av. 18 de Julio 1234', 'Montevideo', 'Uruguay');
    expect(intlGmaps).toContain(encodeURIComponent('Av. 18 de Julio 1234, Montevideo, Uruguay'));
  });

  it('handles empty string or whitespace country parameter cleanly without trailing commas', () => {
    const address = 'Mitre 250';
    const city = 'San Carlos de Bolívar';

    const gmapsEmpty = getGoogleMapsUrl(address, city, '');
    const gmapsSpaces = getGoogleMapsUrl(address, city, '   ');
    const wazeEmpty = getWazeUrl(address, city, '');
    const wazeSpaces = getWazeUrl(address, city, '   ');

    const expectedEncoded = encodeURIComponent('Mitre 250, San Carlos de Bolívar');
    expect(gmapsEmpty).toContain(expectedEncoded);
    expect(gmapsSpaces).toContain(expectedEncoded);
    expect(wazeEmpty).toContain(expectedEncoded);
    expect(wazeSpaces).toContain(expectedEncoded);

    expect(gmapsEmpty).not.toContain(encodeURIComponent('Bolívar,'));
    expect(gmapsSpaces).not.toContain(encodeURIComponent('Bolívar,'));
  });

  it('returns empty string when address is blank or whitespace, even if country is provided', () => {
    expect(getGoogleMapsUrl('', 'San Carlos de Bolívar', 'Argentina')).toBe('');
    expect(getGoogleMapsUrl('   ', 'San Carlos de Bolívar', 'Argentina')).toBe('');
    expect(getGoogleMapsUrl('\t\n', 'San Carlos de Bolívar', 'Argentina')).toBe('');

    expect(getWazeUrl('', 'San Carlos de Bolívar', 'Argentina')).toBe('');
    expect(getWazeUrl('   ', 'San Carlos de Bolívar', 'Argentina')).toBe('');
    expect(getWazeUrl('\t\n', 'San Carlos de Bolívar', 'Argentina')).toBe('');
  });

  it('encodes special characters, accents, eñe, and symbols accurately with country', () => {
    const address = 'Calle Ñandú 320 #4 & Av. Güemes 1200 - Dpto 2°B';
    const city = 'San Carlos de Bolívar';
    const country = 'Argentina';

    const gmapsUrl = getGoogleMapsUrl(address, city, country);
    const wazeUrl = getWazeUrl(address, city, country);

    const expectedString = 'Calle Ñandú 320 #4 & Av. Güemes 1200 - Dpto 2°B, San Carlos de Bolívar, Argentina';
    expect(gmapsUrl).toBe(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(expectedString)}`);
    expect(wazeUrl).toBe(`https://waze.com/ul?q=${encodeURIComponent(expectedString)}&navigate=yes`);

    // Ensure raw unencoded query delimiters are not present in the payload
    expect(gmapsUrl).not.toContain('#');
    expect(gmapsUrl.split('&destination=')[1]).not.toContain('&');
  });

  it('passes country correctly through openNavigation for google and waze', () => {
    const openMock = vi.fn();
    const originalWindow = (globalThis as unknown as { window: unknown }).window;
    (globalThis as unknown as { window: { open: typeof openMock } }).window = { open: openMock };

    openNavigation('Av. San Martín 450', 'google', 'San Carlos de Bolívar', 'Argentina');
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Av. San Martín 450, San Carlos de Bolívar, Argentina')),
      '_blank',
      'noopener,noreferrer'
    );

    openNavigation('Av. Brown 220', 'waze', 'San Carlos de Bolívar', 'Argentina');
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Av. Brown 220, San Carlos de Bolívar, Argentina')),
      '_blank',
      'noopener,noreferrer'
    );

    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });
});
