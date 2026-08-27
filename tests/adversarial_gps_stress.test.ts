import { describe, it, expect, vi } from 'vitest';
import {
  getGoogleMapsUrl,
  getWazeUrl,
  isValidAddress,
  openNavigation,
  DEFAULT_CITY,
  DEFAULT_COUNTRY
} from '../src/utils/navigation';

describe('Adversarial Challenger: GPS & Navigation Deep Link Stress Suite', () => {

  // 1. LATIN-1, UTF-8, ARGENTINE ADDRESSES & SPECIAL PUNCTUATION
  describe('Encoding & Special Characters Stress Test', () => {
    const specialAddresses = [
      {
        name: 'Argentine Diacritics & Accents',
        address: 'Av. Pres. Dr. Raúl Alfonsín 1234',
        city: 'San Carlos de Bolívar',
        country: 'Argentina',
        expectedDest: 'Av. Pres. Dr. Raúl Alfonsín 1234, San Carlos de Bolívar, Argentina'
      },
      {
        name: 'Eñe and Diaeresis (ü, ñ, Ñ)',
        address: 'Calle Güemes 850 esquina Ñandú',
        city: 'Añatuya',
        country: 'Argentina',
        expectedDest: 'Calle Güemes 850 esquina Ñandú, Añatuya, Argentina'
      },
      {
        name: 'Punctuation (#, &, °, /, ", \', @, +, %)',
        address: 'Av. 9 de Julio 1040 3° "A" #12 & Dpto 4/B @ Barrio Centro + %100',
        city: 'San Carlos de Bolívar',
        country: 'Argentina',
        expectedDest: 'Av. 9 de Julio 1040 3° "A" #12 & Dpto 4/B @ Barrio Centro + %100, San Carlos de Bolívar, Argentina'
      },
      {
        name: 'Multi-line address input with newlines and tabs',
        address: 'Av. San Martín 450\nPiso 2\nDepto B\tEdificio Alvear',
        city: 'San Carlos de Bolívar',
        country: 'Argentina',
        expectedDest: 'Av. San Martín 450\nPiso 2\nDepto B\tEdificio Alvear, San Carlos de Bolívar, Argentina'
      },
      {
        name: 'Leading and trailing whitespace, spaces around punctuation',
        address: '   Av. Alsina 320   ',
        city: 'San Carlos de Bolívar',
        country: 'Argentina',
        expectedDest: 'Av. Alsina 320, San Carlos de Bolívar, Argentina'
      },
      {
        name: 'Emojis and Unicode symbols',
        address: '🛵 Av. Belgrano 100 🔔 Casa verde 🏡',
        city: 'San Carlos de Bolívar',
        country: 'Argentina',
        expectedDest: '🛵 Av. Belgrano 100 🔔 Casa verde 🏡, San Carlos de Bolívar, Argentina'
      },
      {
        name: 'XSS & Code injection payloads in address',
        address: '<script>alert("xss")</script> \'; DROP TABLE orders; -- &param=1',
        city: 'San Carlos de Bolívar',
        country: 'Argentina',
        expectedDest: '<script>alert("xss")</script> \'; DROP TABLE orders; -- &param=1, San Carlos de Bolívar, Argentina'
      }
    ];

    specialAddresses.forEach(({ name, address, city, country, expectedDest }) => {
      it(`handles ${name} correctly in Google Maps and Waze`, () => {
        const gmapsUrl = getGoogleMapsUrl(address, city, country);
        const wazeUrl = getWazeUrl(address, city, country);

        // Google Maps URL parsing verification
        const parsedGmaps = new URL(gmapsUrl);
        expect(parsedGmaps.protocol).toBe('https:');
        expect(parsedGmaps.hostname).toBe('www.google.com');
        expect(parsedGmaps.pathname).toBe('/maps/dir/');
        expect(parsedGmaps.searchParams.get('api')).toBe('1');
        expect(parsedGmaps.searchParams.get('destination')).toBe(expectedDest);

        // Waze URL parsing verification
        const parsedWaze = new URL(wazeUrl);
        expect(parsedWaze.protocol).toBe('https:');
        expect(parsedWaze.hostname).toBe('waze.com');
        expect(parsedWaze.pathname).toBe('/ul');
        expect(parsedWaze.searchParams.get('navigate')).toBe('yes');
        expect(parsedWaze.searchParams.get('q')).toBe(expectedDest);
      });
    });
  });

  // 2. BACKWARD COMPATIBILITY & OPTIONAL COUNTRY OMISSION
  describe('Backward Compatibility: Parameter Permutations', () => {
    it('1 argument: getGoogleMapsUrl(address) uses default city and NO country', () => {
      const url = getGoogleMapsUrl('Lavalle 100');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('destination')).toBe(`Lavalle 100, ${DEFAULT_CITY}`);
      expect(url).not.toContain(encodeURIComponent('undefined'));
      expect(url).not.toContain(encodeURIComponent('null'));
      expect(url).not.toContain(encodeURIComponent(DEFAULT_COUNTRY));
      expect(url).not.toContain(encodeURIComponent(', Argentina'));
    });

    it('1 argument: getWazeUrl(address) uses default city and NO country', () => {
      const url = getWazeUrl('Lavalle 100');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('q')).toBe(`Lavalle 100, ${DEFAULT_CITY}`);
      expect(url).not.toContain(encodeURIComponent('undefined'));
      expect(url).not.toContain(encodeURIComponent('null'));
      expect(url).not.toContain(encodeURIComponent(DEFAULT_COUNTRY));
      expect(url).not.toContain(encodeURIComponent(', Argentina'));
    });

    it('2 arguments: getGoogleMapsUrl(address, city) uses provided city and NO country', () => {
      const url = getGoogleMapsUrl('Rivadavia 500', 'Pehuajó');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('destination')).toBe('Rivadavia 500, Pehuajó');
      expect(url).not.toContain(encodeURIComponent('undefined'));
      expect(url).not.toContain(encodeURIComponent('Argentina'));
    });

    it('2 arguments: getWazeUrl(address, city) uses provided city and NO country', () => {
      const url = getWazeUrl('Rivadavia 500', 'Pehuajó');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('q')).toBe('Rivadavia 500, Pehuajó');
      expect(url).not.toContain(encodeURIComponent('undefined'));
      expect(url).not.toContain(encodeURIComponent('Argentina'));
    });

    it('3 arguments with undefined: getGoogleMapsUrl(address, city, undefined) omits country', () => {
      const url = getGoogleMapsUrl('Rivadavia 500', 'Olavarría', undefined);
      const parsed = new URL(url);
      expect(parsed.searchParams.get('destination')).toBe('Rivadavia 500, Olavarría');
      expect(url).not.toContain(encodeURIComponent('undefined'));
      expect(url).not.toContain(encodeURIComponent('Argentina'));
    });

    it('3 arguments with empty string: getGoogleMapsUrl(address, city, "") omits country without trailing comma', () => {
      const url = getGoogleMapsUrl('Rivadavia 500', 'Olavarría', '');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('destination')).toBe('Rivadavia 500, Olavarría');
      expect(parsed.searchParams.get('destination')).not.toMatch(/,\s*$/);
    });

    it('3 arguments with whitespace string: getGoogleMapsUrl(address, city, "   ") omits country', () => {
      const url = getGoogleMapsUrl('Rivadavia 500', 'Olavarría', '   ');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('destination')).toBe('Rivadavia 500, Olavarría');
      expect(parsed.searchParams.get('destination')).not.toMatch(/,\s*$/);
    });

    it('3 arguments with explicit country: getGoogleMapsUrl(address, city, "Argentina") appends country', () => {
      const url = getGoogleMapsUrl('Rivadavia 500', 'Olavarría', 'Argentina');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('destination')).toBe('Rivadavia 500, Olavarría, Argentina');
    });
  });

  // 3. INTERNATIONAL DESTINATIONS
  describe('International Destinations', () => {
    const internationalCases = [
      {
        countryName: 'Chile',
        address: 'Av. Libertador Bernardo O\'Higgins 1058',
        city: 'Santiago',
        country: 'Chile'
      },
      {
        countryName: 'Uruguay',
        address: 'Av. 18 de Julio 1333',
        city: 'Montevideo',
        country: 'Uruguay'
      },
      {
        countryName: 'Colombia',
        address: 'Carrera 7 # 71-21',
        city: 'Bogotá',
        country: 'Colombia'
      },
      {
        countryName: 'Mexico',
        address: 'Paseo de la Reforma 222, Juárez',
        city: 'Ciudad de México',
        country: 'México'
      },
      {
        countryName: 'Spain',
        address: 'Calle Gran Vía, 28',
        city: 'Madrid',
        country: 'España'
      },
      {
        countryName: 'Brazil',
        address: 'Avenida Paulista, 1578',
        city: 'São Paulo',
        country: 'Brasil'
      },
      {
        countryName: 'Peru',
        address: 'Av. José Larco 770',
        city: 'Miraflores, Lima',
        country: 'Perú'
      },
      {
        countryName: 'United States',
        address: '350 5th Ave',
        city: 'New York',
        country: 'United States'
      }
    ];

    internationalCases.forEach(({ countryName, address, city, country }) => {
      it(`constructs valid URLs for ${countryName}`, () => {
        const gmaps = getGoogleMapsUrl(address, city, country);
        const waze = getWazeUrl(address, city, country);
        const expected = `${address}, ${city}, ${country}`;

        const gmapsParsed = new URL(gmaps);
        expect(gmapsParsed.searchParams.get('destination')).toBe(expected);

        const wazeParsed = new URL(waze);
        expect(wazeParsed.searchParams.get('q')).toBe(expected);
      });
    });
  });

  // 4. OFFICIAL SCHEME COMPLIANCE & URL SYNTAX
  describe('Official URL Scheme Syntax Compliance', () => {
    it('matches Google Maps Universal Cross-Platform Scheme exact specs', () => {
      const url = getGoogleMapsUrl('Av. San Martín 100', 'San Carlos de Bolívar', 'Argentina');
      expect(url.startsWith('https://www.google.com/maps/dir/?api=1&destination=')).toBe(true);

      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('www.google.com');
      expect(parsed.pathname).toBe('/maps/dir/');
      expect(parsed.searchParams.get('api')).toBe('1');
      expect(parsed.searchParams.get('destination')).toBe('Av. San Martín 100, San Carlos de Bolívar, Argentina');
    });

    it('matches Waze Universal Deep Link Scheme exact specs', () => {
      const url = getWazeUrl('Av. San Martín 100', 'San Carlos de Bolívar', 'Argentina');
      expect(url.startsWith('https://waze.com/ul?q=')).toBe(true);
      expect(url.endsWith('&navigate=yes')).toBe(true);

      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname).toBe('waze.com');
      expect(parsed.pathname).toBe('/ul');
      expect(parsed.searchParams.get('navigate')).toBe('yes');
      expect(parsed.searchParams.get('q')).toBe('Av. San Martín 100, San Carlos de Bolívar, Argentina');
    });
  });

  // 5. OPEN NAVIGATION & WINDOW DISPATCH
  describe('openNavigation Functionality', () => {
    it('dispatches to window.open with noopener,noreferrer', () => {
      const openMock = vi.fn();
      const originalWindow = (globalThis as unknown as { window: unknown }).window;
      (globalThis as unknown as { window: { open: typeof openMock } }).window = { open: openMock };

      openNavigation('Av. San Martín 450', 'google', 'San Carlos de Bolívar', 'Argentina');
      expect(openMock).toHaveBeenCalledTimes(1);
      expect(openMock).toHaveBeenCalledWith(
        expect.stringContaining('https://www.google.com/maps/dir/?api=1&destination='),
        '_blank',
        'noopener,noreferrer'
      );

      openNavigation('Av. Brown 220', 'waze', 'San Carlos de Bolívar', 'Argentina');
      expect(openMock).toHaveBeenCalledTimes(2);
      expect(openMock).toHaveBeenLastCalledWith(
        expect.stringContaining('https://waze.com/ul?q='),
        '_blank',
        'noopener,noreferrer'
      );

      // Without country
      openNavigation('Mitre 120', 'google', 'San Carlos de Bolívar');
      expect(openMock).toHaveBeenCalledTimes(3);
      const thirdCallUrl = openMock.mock.calls[2]?.[0];
      expect(thirdCallUrl).toBeDefined();
      expect(thirdCallUrl).not.toContain(encodeURIComponent(', Argentina'));
      expect(thirdCallUrl).not.toContain(encodeURIComponent('undefined'));

      (globalThis as unknown as { window: unknown }).window = originalWindow;
    });

    it('does not open window if address is empty or whitespace', () => {
      const openMock = vi.fn();
      const originalWindow = (globalThis as unknown as { window: unknown }).window;
      (globalThis as unknown as { window: { open: typeof openMock } }).window = { open: openMock };

      openNavigation('', 'google', 'San Carlos de Bolívar', 'Argentina');
      openNavigation('   ', 'waze', 'San Carlos de Bolívar', 'Argentina');
      expect(openMock).not.toHaveBeenCalled();

      (globalThis as unknown as { window: unknown }).window = originalWindow;
    });
  });

  // 6. ADDRESS VALIDATION STRESS
  describe('isValidAddress Stress Cases', () => {
    it('validates strings correctly across boundary conditions', () => {
      expect(isValidAddress('a')).toBe(true);
      expect(isValidAddress(' 1 ')).toBe(true);
      expect(isValidAddress('Calle 1 #2-3')).toBe(true);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('   ')).toBe(false);
      expect(isValidAddress('\n\t\r')).toBe(false);
      expect(isValidAddress(undefined)).toBe(false);
      expect(isValidAddress(null as unknown as string)).toBe(false);
      expect(isValidAddress(123 as unknown as string)).toBe(false);
      expect(isValidAddress({} as unknown as string)).toBe(false);
    });
  });

  // 7. EXTREME PAYLOAD AND FUZZING
  describe('Extreme Payload and Fuzzing', () => {
    it('handles a 5000-character address without throwing or generating malformed URLs', () => {
      const hugeAddress = 'Calle Larga ' + 'A'.repeat(5000);
      const url = getGoogleMapsUrl(hugeAddress, 'San Carlos de Bolívar', 'Argentina');
      expect(url).toBeTruthy();
      expect(() => new URL(url)).not.toThrow();
      const parsed = new URL(url);
      expect(parsed.searchParams.get('destination')).toBe(`${hugeAddress}, San Carlos de Bolívar, Argentina`);
    });
  });
});
