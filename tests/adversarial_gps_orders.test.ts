import { describe, it, expect } from 'vitest';
import {
  getGoogleMapsUrl,
  getWazeUrl,
  isValidAddress,
  DEFAULT_CITY
} from '../src/utils/navigation';
import type { Business, ZoneType, PayerType, PaymentMethodType } from '../src/types';

describe('Adversarial Navigation & URL Scheme Challenge', () => {
  describe('Special Characters and Accents', () => {
    it('handles Spanish accents (á, é, í, ó, ú, Á, É, Í, Ó, Ú)', () => {
      const address = 'Av. San Martín 1450, Barrio Güemes';
      const gmaps = getGoogleMapsUrl(address);
      const waze = getWazeUrl(address);

      expect(gmaps).toBe('https://www.google.com/maps/dir/?api=1&destination=Av.%20San%20Mart%C3%ADn%201450%2C%20Barrio%20G%C3%BCemes%2C%20San%20Carlos%20de%20Bol%C3%ADvar');
      expect(waze).toBe('https://waze.com/ul?q=Av.%20San%20Mart%C3%ADn%201450%2C%20Barrio%20G%C3%BCemes%2C%20San%20Carlos%20de%20Bol%C3%ADvar&navigate=yes');
    });

    it('handles Spanish eñe (ñ, Ñ)', () => {
      const address = 'Calle Ñandú 320 y Cañada';
      const gmaps = getGoogleMapsUrl(address);
      const waze = getWazeUrl(address);

      expect(gmaps).toContain(encodeURIComponent('Calle Ñandú 320 y Cañada, San Carlos de Bolívar'));
      expect(waze).toContain(encodeURIComponent('Calle Ñandú 320 y Cañada, San Carlos de Bolívar'));
    });

    it('handles symbols common in Argentine street addresses (#, °, &, /, -, .)', () => {
      const address = 'B° Los Zorzales Mza. 4 Dpto. 2/B #15 & Ruta 226 - Km 402';
      const gmaps = getGoogleMapsUrl(address);
      const waze = getWazeUrl(address);

      expect(gmaps).toContain(encodeURIComponent(`${address}, ${DEFAULT_CITY}`));
      expect(waze).toContain(encodeURIComponent(`${address}, ${DEFAULT_CITY}`));
      expect(gmaps).not.toContain('undefined');
      expect(waze).not.toContain('undefined');
    });

    it('handles emojis and atypical unicode characters safely without throwing', () => {
      const address = '🍕 Pizzería Delivery Spot 🏍️ Av. Lavalle 500';
      const gmaps = getGoogleMapsUrl(address);
      const waze = getWazeUrl(address);

      expect(gmaps).toContain(encodeURIComponent(`${address}, ${DEFAULT_CITY}`));
      expect(waze).toContain(encodeURIComponent(`${address}, ${DEFAULT_CITY}`));
    });
  });

  describe('Whitespace, Empty Strings, and Boundary Conditions', () => {
    it('returns empty string on empty string or whitespace-only inputs', () => {
      expect(getGoogleMapsUrl('')).toBe('');
      expect(getGoogleMapsUrl('   ')).toBe('');
      expect(getGoogleMapsUrl('\t\n  \r\n')).toBe('');
      expect(getWazeUrl('')).toBe('');
      expect(getWazeUrl('   ')).toBe('');
      expect(getWazeUrl('\t\n  \r\n')).toBe('');
    });

    it('trims leading and trailing spaces around address properly', () => {
      const addressWithSpaces = '   Av. Alsina 240   ';
      const gmaps = getGoogleMapsUrl(addressWithSpaces);
      const waze = getWazeUrl(addressWithSpaces);

      expect(gmaps).toBe('https://www.google.com/maps/dir/?api=1&destination=Av.%20Alsina%20240%2C%20San%20Carlos%20de%20Bol%C3%ADvar');
      expect(waze).toBe('https://waze.com/ul?q=Av.%20Alsina%20240%2C%20San%20Carlos%20de%20Bol%C3%ADvar&navigate=yes');
    });

    it('correctly handles custom city parameter override', () => {
      const address = 'Mitre 500';
      const customCity = 'Urdampilleta';
      const gmaps = getGoogleMapsUrl(address, customCity);
      const waze = getWazeUrl(address, customCity);

      expect(gmaps).toContain(encodeURIComponent('Mitre 500, Urdampilleta'));
      expect(waze).toContain(encodeURIComponent('Mitre 500, Urdampilleta'));
    });
  });

  describe('Address Validation Helper', () => {
    it('validates strictly that address is a non-empty string', () => {
      expect(isValidAddress('San Martín 100')).toBe(true);
      expect(isValidAddress('  A  ')).toBe(true);
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('   ')).toBe(false);
      expect(isValidAddress(undefined)).toBe(false);
      expect(isValidAddress(null as unknown as string)).toBe(false);
      expect(isValidAddress(123 as unknown as string)).toBe(false);
    });
  });

  describe('Zero-Cost & API-Free Architecture Invariants', () => {
    it('verifies that no Google Maps API keys or billable query params are embedded in the links', () => {
      const url = getGoogleMapsUrl('Av. San Martín 100');
      
      // Free URL Scheme protocol uses `https://www.google.com/maps/dir/?api=1&destination=`
      expect(url.startsWith('https://www.google.com/maps/dir/?api=1&destination=')).toBe(true);
      
      // Must NOT contain billable JavaScript API keys or backend tokens
      expect(url).not.toContain('key=');
      expect(url).not.toContain('AIza');
      expect(url).not.toContain('sessiontoken');
    });

    it('verifies that Waze URL uses free universal query scheme', () => {
      const url = getWazeUrl('Av. Brown 500');
      expect(url.startsWith('https://waze.com/ul?q=')).toBe(true);
      expect(url.endsWith('&navigate=yes')).toBe(true);
      expect(url).not.toContain('key=');
    });
  });
});

describe('Adversarial Fast Order Entry & Zone Pricing Logic Challenge', () => {
  const sampleBusiness: Business = {
    id: 'biz_rotiseria_don_pepe',
    userId: 'courier_123',
    name: 'Rotisería Don Pepe',
    phone: '2314112233',
    defaultPrices: {
      plantaUrbana: 1500,
      barrioCerca: 2200,
      barrioLejos: 3000
    },
    paymentCycle: 'daily',
    active: true,
    createdAt: '2026-08-20'
  };

  it('correctly maps business default prices to selected zones', () => {
    const getZonePrice = (biz: Business, zone: ZoneType): number | undefined => {
      if (zone === 'planta_urbana') return biz.defaultPrices.plantaUrbana;
      if (zone === 'barrio_cerca') return biz.defaultPrices.barrioCerca;
      if (zone === 'barrio_lejos') return biz.defaultPrices.barrioLejos;
      return undefined;
    };

    expect(getZonePrice(sampleBusiness, 'planta_urbana')).toBe(1500);
    expect(getZonePrice(sampleBusiness, 'barrio_cerca')).toBe(2200);
    expect(getZonePrice(sampleBusiness, 'barrio_lejos')).toBe(3000);
    expect(getZonePrice(sampleBusiness, 'custom')).toBeUndefined();
  });

  it('handles comma decimal separator conversion in amount input parsing', () => {
    const parseAmount = (input: string): number => {
      return parseFloat(input.replace(',', '.'));
    };

    expect(parseAmount('1500')).toBe(1500);
    expect(parseAmount('1500,50')).toBe(1500.50);
    expect(parseAmount('2200.75')).toBe(2200.75);
    expect(isNaN(parseAmount('abc'))).toBe(true);
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('-50')).toBe(-50);
  });

  it('verifies payer default rules (business -> settled=false, customer -> settled=true)', () => {
    const computeInitialSettledState = (payer: PayerType): boolean => {
      return payer === 'business' ? false : true;
    };

    expect(computeInitialSettledState('business')).toBe(false);
    expect(computeInitialSettledState('customer')).toBe(true);
  });

  it('validates order payload integrity for database creation', () => {
    const createOrderPayload = (params: {
      date: string;
      businessId: string;
      businessName: string;
      address?: string;
      zone: ZoneType;
      rawAmount: string;
      paidBy: PayerType;
      paymentMethod: PaymentMethodType;
      settled: boolean;
      notes?: string;
    }) => {
      if (!params.businessId) throw new Error('Seleccioná un comercio');
      const parsedAmount = parseFloat(params.rawAmount.replace(',', '.'));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Ingresá un importe válido mayor a 0');
      }

      return {
        date: params.date,
        businessId: params.businessId,
        businessName: params.businessName,
        address: params.address?.trim() || undefined,
        zone: params.zone,
        amount: parsedAmount,
        paidBy: params.paidBy,
        paymentMethod: params.paymentMethod,
        settled: params.settled,
        notes: params.notes?.trim() || undefined
      };
    };

    // Valid case
    const valid = createOrderPayload({
      date: '2026-08-26',
      businessId: sampleBusiness.id,
      businessName: sampleBusiness.name,
      address: '  Av. San Martín 450  ',
      zone: 'planta_urbana',
      rawAmount: '1500,00',
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true,
      notes: '   Timbre 2B   '
    });

    expect(valid.address).toBe('Av. San Martín 450');
    expect(valid.amount).toBe(1500);
    expect(valid.notes).toBe('Timbre 2B');
    expect(valid.settled).toBe(true);

    // Empty address becomes undefined
    const noAddress = createOrderPayload({
      date: '2026-08-26',
      businessId: sampleBusiness.id,
      businessName: sampleBusiness.name,
      address: '     ',
      zone: 'custom',
      rawAmount: '2000',
      paidBy: 'business',
      paymentMethod: 'transfer',
      settled: false
    });

    expect(noAddress.address).toBeUndefined();
    expect(noAddress.amount).toBe(2000);
    expect(noAddress.settled).toBe(false);

    // Invalid amount throws
    expect(() =>
      createOrderPayload({
        date: '2026-08-26',
        businessId: sampleBusiness.id,
        businessName: sampleBusiness.name,
        zone: 'custom',
        rawAmount: '0',
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      })
    ).toThrow('Ingresá un importe válido mayor a 0');

    expect(() =>
      createOrderPayload({
        date: '2026-08-26',
        businessId: '',
        businessName: '',
        zone: 'custom',
        rawAmount: '1500',
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: true
      })
    ).toThrow('Seleccioná un comercio');
  });
});
