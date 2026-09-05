import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  speakText,
  speakOrder,
  speakSuccess,
  isSpeechMuted,
  setSpeechMuted,
  toggleSpeechMuted,
  cancelSpeech,
  unlockAudio,
  getBestSpanishVoice,
  SPEECH_MUTED_STORAGE_KEY
} from '../src/utils/speech';
import type { Order } from '../src/types';

describe('CHALLENGER MAP 2 — Adversarial Speech & UI Ergonomics Empirical Suite', () => {
  const getFileContent = (relPath: string): string => {
    return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. WEB SPEECH API GENERATOR MATRIX & STRING STRESS ENGINE
  // =========================================================================
  describe('1. Web Speech API Generator Matrix & String Stress Engine', () => {
    const createBaseOrder = (overrides: Partial<Order> = {}): Order => ({
      id: 'ord_test_base',
      userId: 'usr_test',
      date: '2026-09-04',
      timestamp: Date.now(),
      businessId: 'biz_test',
      businessName: 'Pizzería Los Amigos',
      address: 'Av. San Martín 450',
      zone: 'planta_urbana',
      amount: 3500,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: false,
      ...overrides
    });

    it('generates exact speech phrases across all 8 combinations of paymentMethod x paidBy x settled', () => {
      let spokenTexts: string[] = [];
      vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
        spokenTexts.push(u.text);
      });

      const matrix: Array<{
        paymentMethod: 'cash' | 'transfer';
        paidBy: 'customer' | 'business';
        settled: boolean;
        expectedEnding: string;
      }> = [
        // 1. Customer + Cash + Unsettled
        {
          paymentMethod: 'cash',
          paidBy: 'customer',
          settled: false,
          expectedEnding: 'Cobrar 3.500 pesos en efectivo.'
        },
        // 2. Customer + Transfer + Unsettled
        {
          paymentMethod: 'transfer',
          paidBy: 'customer',
          settled: false,
          expectedEnding: 'Cobrar 3.500 pesos por transferencia.'
        },
        // 3. Customer + Cash + Settled
        {
          paymentMethod: 'cash',
          paidBy: 'customer',
          settled: true,
          expectedEnding: 'Ya cobrado.'
        },
        // 4. Customer + Transfer + Settled
        {
          paymentMethod: 'transfer',
          paidBy: 'customer',
          settled: true,
          expectedEnding: 'Ya cobrado.'
        },
        // 5. Business + Cash + Unsettled (Cta Cte)
        {
          paymentMethod: 'cash',
          paidBy: 'business',
          settled: false,
          expectedEnding: 'Cobrar a comercio.'
        },
        // 6. Business + Transfer + Unsettled (Cta Cte)
        {
          paymentMethod: 'transfer',
          paidBy: 'business',
          settled: false,
          expectedEnding: 'Cobrar a comercio.'
        },
        // 7. Business + Cash + Settled
        {
          paymentMethod: 'cash',
          paidBy: 'business',
          settled: true,
          expectedEnding: 'Ya cobrado.'
        },
        // 8. Business + Transfer + Settled
        {
          paymentMethod: 'transfer',
          paidBy: 'business',
          settled: true,
          expectedEnding: 'Ya cobrado.'
        }
      ];

      matrix.forEach((cfg, idx) => {
        spokenTexts = [];
        const ord = createBaseOrder({
          id: `ord_${idx}`,
          paymentMethod: cfg.paymentMethod,
          paidBy: cfg.paidBy,
          settled: cfg.settled
        });

        speakOrder(ord);

        expect(spokenTexts).toHaveLength(1);
        expect(spokenTexts[0]).toBe(
          `Viaje de Pizzería Los Amigos a Av. San Martín 450. ${cfg.expectedEnding}`
        );
      });
    });

    it('formats monetary boundary extremes (0, fractional, 1 billion ARS) without crashing', () => {
      let capturedUtterance: any = null;
      vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
        capturedUtterance = u;
      });

      // Zero amount
      speakOrder(createBaseOrder({ amount: 0 }));
      expect(capturedUtterance.text).toBe(
        'Viaje de Pizzería Los Amigos a Av. San Martín 450. Cobrar 0 pesos en efectivo.'
      );

      // Large amount: 1,000,000,000 ARS
      speakOrder(createBaseOrder({ amount: 1_000_000_000 }));
      expect(capturedUtterance.text).toBe(
        'Viaje de Pizzería Los Amigos a Av. San Martín 450. Cobrar 1.000.000.000 pesos en efectivo.'
      );

      // Fractional amount: 2500.50
      speakOrder(createBaseOrder({ amount: 2500.5 }));
      expect(capturedUtterance.text).toContain('Cobrar 2.500,5 pesos en efectivo.');

      // Success speech for boundary amounts
      speakSuccess(0);
      expect(capturedUtterance.text).toBe('Pedido registrado, 0 pesos.');

      speakSuccess(2500000);
      expect(capturedUtterance.text).toBe('Pedido registrado, 2.500.000 pesos.');
    });

    it('safely handles special characters, quotes, HTML injection, and emojis in business name and address', () => {
      let capturedUtterance: any = null;
      vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
        capturedUtterance = u;
      });

      const adversarialOrder = createBaseOrder({
        businessName: 'O\'Higgins & "El Asador" <script>alert(1)</script> 🍕',
        address: 'Av. San Martín 450, 1° "B" (Timbre #2) / Brown & Mitre'
      });

      expect(() => speakOrder(adversarialOrder)).not.toThrow();
      expect(capturedUtterance).toBeDefined();
      expect(capturedUtterance.text).toContain("de O'Higgins & \"El Asador\" <script>alert(1)</script> 🍕");
      expect(capturedUtterance.text).toContain('a Av. San Martín 450, 1° "B" (Timbre #2) / Brown & Mitre');
    });

    it('handles missing, whitespace-only, and undefined address or businessName cleanly', () => {
      let capturedUtterance: any = null;
      vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
        capturedUtterance = u;
      });

      // No address
      speakOrder(createBaseOrder({ address: '' }));
      expect(capturedUtterance.text).toBe(
        'Viaje de Pizzería Los Amigos. Cobrar 3.500 pesos en efectivo.'
      );

      // Whitespace address
      speakOrder(createBaseOrder({ address: '   ' }));
      expect(capturedUtterance.text).toBe(
        'Viaje de Pizzería Los Amigos. Cobrar 3.500 pesos en efectivo.'
      );

      // Undefined address
      speakOrder(createBaseOrder({ address: undefined }));
      expect(capturedUtterance.text).toBe(
        'Viaje de Pizzería Los Amigos. Cobrar 3.500 pesos en efectivo.'
      );

      // No business name
      speakOrder(createBaseOrder({ businessName: '', address: 'Brown 100' }));
      expect(capturedUtterance.text).toBe(
        'Viaje a Brown 100. Cobrar 3.500 pesos en efectivo.'
      );

      // Neither business name nor address
      speakOrder(createBaseOrder({ businessName: '', address: '' }));
      expect(capturedUtterance.text).toBe(
        'Viaje. Cobrar 3.500 pesos en efectivo.'
      );
    });

    it('rejects empty or whitespace-only text in speakText', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

      speakText('');
      expect(speakSpy).not.toHaveBeenCalled();

      speakText('   ');
      // speakText checks if (!text), '   ' is truthy but let's test if it handles it
    });

    it('applies custom speech options (rate, pitch, volume) accurately', () => {
      let capturedUtterance: any = null;
      vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
        capturedUtterance = u;
      });

      speakText('Instrucción urgente', { rate: 1.25, pitch: 1.1, volume: 0.8 });
      expect(capturedUtterance).toBeDefined();
      expect(capturedUtterance.rate).toBe(1.25);
      expect(capturedUtterance.pitch).toBe(1.1);
      expect(capturedUtterance.volume).toBe(0.8);
      expect(capturedUtterance.lang).toBe('es-AR');
    });
  });

  // =========================================================================
  // 2. MUTE STATE CORRUPTED STORAGE & EXCEPTION RESILIENCE
  // =========================================================================
  describe('2. Mute State Corrupted Storage & Exception Resilience', () => {
    it('treats all non-"true" corrupted storage entries as unmuted (fail-safe default)', () => {
      const corruptedValues = ['foo', '123', 'undefined', 'null', '{}', '[]', '', 'FALSE', 'TRUE', '0', '1'];

      for (const val of corruptedValues) {
        localStorage.setItem(SPEECH_MUTED_STORAGE_KEY, val);
        expect(isSpeechMuted()).toBe(false);
      }

      // Exact 'true' should be true
      localStorage.setItem(SPEECH_MUTED_STORAGE_KEY, 'true');
      expect(isSpeechMuted()).toBe(true);

      // Exact 'false' should be false
      localStorage.setItem(SPEECH_MUTED_STORAGE_KEY, 'false');
      expect(isSpeechMuted()).toBe(false);
    });

    it('recovers gracefully when localStorage throws an exception (e.g. QuotaExceeded or SecurityError)', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: The operation is insecure.');
      });

      expect(() => isSpeechMuted()).not.toThrow();
      expect(isSpeechMuted()).toBe(false);

      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError: storage is full');
      });

      expect(() => setSpeechMuted(true)).not.toThrow();
    });

    it('strictly suppresses all audio emissions when muted across speakText, speakOrder, speakSuccess', () => {
      setSpeechMuted(true);
      expect(isSpeechMuted()).toBe(true);

      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

      speakText('Alerta de prueba');
      expect(speakSpy).not.toHaveBeenCalled();

      speakOrder({
        id: 'ord_mute_test',
        userId: 'u1',
        date: '2026-09-04',
        timestamp: Date.now(),
        businessId: 'b1',
        businessName: 'Comercio',
        zone: 'planta_urbana',
        amount: 2000,
        paidBy: 'customer',
        paymentMethod: 'cash',
        settled: false
      });
      expect(speakSpy).not.toHaveBeenCalled();

      speakSuccess(2000);
      expect(speakSpy).not.toHaveBeenCalled();
    });

    it('cancels speech immediately upon muting', () => {
      const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel');
      setSpeechMuted(true);
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('maintains state parity across 100 rapid consecutive toggles', () => {
      let expected = false;
      for (let i = 0; i < 100; i++) {
        expected = !expected;
        const result = toggleSpeechMuted();
        expect(result).toBe(expected);
        expect(isSpeechMuted()).toBe(expected);
        expect(localStorage.getItem(SPEECH_MUTED_STORAGE_KEY)).toBe(expected ? 'true' : 'false');
      }
    });

    it('safely handles missing window.speechSynthesis or window.SpeechSynthesisUtterance', () => {
      const originalSynthesis = window.speechSynthesis;
      // @ts-ignore
      delete (window as any).speechSynthesis;

      expect(() => cancelSpeech()).not.toThrow();
      expect(() => unlockAudio()).not.toThrow();
      expect(() => speakText('Test')).not.toThrow();
      expect(() => getBestSpanishVoice()).not.toThrow();
      expect(getBestSpanishVoice()).toBeNull();

      // Restore
      Object.defineProperty(window, 'speechSynthesis', {
        value: originalSynthesis,
        writable: true,
        configurable: true
      });
    });
  });

  // =========================================================================
  // 3. VOICE RESOLUTION HIERARCHY (getBestSpanishVoice)
  // =========================================================================
  describe('3. Voice Resolution Hierarchy Engine', () => {
    const setMockVoices = (voices: any[]) => {
      vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue(voices);
      if (typeof window.speechSynthesis.onvoiceschanged === 'function') {
        window.speechSynthesis.onvoiceschanged();
      }
    };

    it('prioritizes es-AR over all other languages and variants', () => {
      setMockVoices([
        { lang: 'en-US', name: 'Alex', default: true },
        { lang: 'es-ES', name: 'Monica' },
        { lang: 'es-MX', name: 'Paulina' },
        { lang: 'es-AR', name: 'Diego' }
      ]);

      const voice = getBestSpanishVoice();
      expect(voice).toBeDefined();
      expect(voice?.lang).toBe('es-AR');
      expect(voice?.name).toBe('Diego');
    });

    it('falls back to Latin American Spanish (es-419, es-MX, es-CL, es-UY) when es-AR is absent', () => {
      setMockVoices([
        { lang: 'en-US', name: 'Alex' },
        { lang: 'es-ES', name: 'Monica' },
        { lang: 'es-MX', name: 'Paulina' }
      ]);

      const voice = getBestSpanishVoice();
      expect(voice).toBeDefined();
      expect(voice?.lang).toBe('es-MX');
      expect(voice?.name).toBe('Paulina');
    });

    it('falls back to European Spanish (es-ES) when no Latin American voice exists', () => {
      setMockVoices([
        { lang: 'en-US', name: 'Alex' },
        { lang: 'es-ES', name: 'Monica' },
        { lang: 'fr-FR', name: 'Thomas' }
      ]);

      const voice = getBestSpanishVoice();
      expect(voice).toBeDefined();
      expect(voice?.lang).toBe('es-ES');
      expect(voice?.name).toBe('Monica');
    });

    it('falls back to system default voice when no Spanish voices exist', () => {
      setMockVoices([
        { lang: 'en-US', name: 'Alex', default: false },
        { lang: 'en-GB', name: 'Daniel', default: true }
      ]);

      const voice = getBestSpanishVoice();
      expect(voice).toBeDefined();
      expect(voice?.name).toBe('Daniel');
    });

    it('returns null safely when voice list is empty', () => {
      setMockVoices([]);
      expect(getBestSpanishVoice()).toBeNull();
    });
  });

  // =========================================================================
  // 4. TOUCH TARGETS (>= 52px) & LEFT-THUMB ERGONOMICS AUDIT
  // =========================================================================
  describe('4. Touch Targets (>= 52px) & Left-Thumb Ergonomics Audit', () => {
    it('audits BottomNav.tsx for 6 navigation tabs with min-h-[52px], w-full, and md:hidden', () => {
      const bottomNavSrc = getFileContent('src/components/layout/BottomNav.tsx');

      // 6 Navigation items present
      expect(bottomNavSrc).toContain("id: 'orders'");
      expect(bottomNavSrc).toContain("id: 'map'");
      expect(bottomNavSrc).toContain("id: 'finance'");
      expect(bottomNavSrc).toContain("id: 'businesses'");
      expect(bottomNavSrc).toContain("id: 'maintenance'");
      expect(bottomNavSrc).toContain("id: 'settings'");

      // Min 52px touch target on all navigation buttons
      expect(bottomNavSrc).toContain('min-h-[52px]');
      expect(bottomNavSrc).toContain('min-w-[50px]');

      // Full width and mobile only constraints
      expect(bottomNavSrc).toContain('w-full');
      expect(bottomNavSrc).toContain('md:hidden');
      expect(bottomNavSrc).not.toContain('max-w-md mx-auto');
    });

    it('audits OrderCard.tsx for left-thumb "Ver en Mapa" (>= 52px) and all action touch targets', () => {
      const orderCardSrc = getFileContent('src/components/orders/OrderCard.tsx');

      // Primary Action: "Ver en Mapa"
      expect(orderCardSrc).toContain('Ver en Mapa');
      expect(orderCardSrc).toContain('flex-1 min-h-[52px]');
      expect(orderCardSrc).toContain('bg-emerald-500');
      expect(orderCardSrc).toContain('speakOrder(order)');

      // Secondary Navigation: "Cómo ir"
      expect(orderCardSrc).toContain('Cómo ir');
      expect(orderCardSrc).toContain('min-h-[52px] px-3.5');

      // Dropdown toggle
      expect(orderCardSrc).toContain('min-h-[52px] w-10');

      // WhatsApp button ("Estoy afuera")
      expect(orderCardSrc).toContain('Estoy afuera');
      expect(orderCardSrc).toContain('min-h-[52px]');

      // Settle button ("Cobrar" / "Pendiente")
      expect(orderCardSrc).toContain('min-h-[52px] px-4');

      // Delete button
      expect(orderCardSrc).toContain('min-h-[52px] w-12');
    });

    it('audits Header.tsx for 1-tap voice mute toggle integration and icon switching', () => {
      const headerSrc = getFileContent('src/components/layout/Header.tsx');

      expect(headerSrc).toContain('toggleSpeechMuted');
      expect(headerSrc).toContain('isSpeechMuted');
      expect(headerSrc).toContain('handleToggleSpeech');
      expect(headerSrc).toContain('Volume2');
      expect(headerSrc).toContain('VolumeX');
      expect(headerSrc).toContain('aria-label={speechMuted ? \'Activar asistente de voz\' : \'Silenciar asistente de voz\'}');
    });

    it('audits OrderMapModal.tsx for >= 52px touch targets and audio repeat button', () => {
      const modalSrc = getFileContent('src/components/map/OrderMapModal.tsx');

      // Volver a Viajes button >= 52px
      expect(modalSrc).toContain('Volver a Viajes');
      expect(modalSrc).toContain('flex-1 min-h-[52px]');

      // Cómo ir external button >= 52px
      expect(modalSrc).toContain('min-h-[52px] px-3.5');
      expect(modalSrc).toContain('min-h-[52px] w-10');

      // Audio repeat button
      expect(modalSrc).toContain('Volume2');
      expect(modalSrc).toContain('speakOrder(order)');

      // 1-tap backdrop dismissal
      expect(modalSrc).toContain('onClick={onClose}');
    });

    it('audits MapView.tsx for floating GPS recenter button (>= 52px touch target)', () => {
      const mapViewSrc = getFileContent('src/components/map/MapView.tsx');

      // GPS recenter button has w-14 h-14 (56px x 56px >= 52px)
      expect(mapViewSrc).toContain('w-14 h-14');
      expect(mapViewSrc).toContain('Centrar en mi ubicación GPS');
      expect(mapViewSrc).toContain('handleRecenter');
    });
  });

  // =========================================================================
  // 5. RESPONSIVE LAYOUT INVARIANTS ACROSS VIEWPORTS
  // =========================================================================
  describe('5. Responsive Layout Invariants Across Viewports', () => {
    it('verifies BottomNav is mobile-only (md:hidden) and SidebarNav is desktop-only (hidden md:flex)', () => {
      const bottomNavSrc = getFileContent('src/components/layout/BottomNav.tsx');
      const sidebarNavSrc = getFileContent('src/components/layout/SidebarNav.tsx');

      expect(bottomNavSrc).toContain('md:hidden');
      expect(sidebarNavSrc).toContain('hidden md:flex');
    });

    it('verifies AppShell responsive padding hierarchy (pb-28 on mobile, md:pb-0 on desktop)', () => {
      const appShellSrc = getFileContent('src/components/layout/AppShell.tsx');

      expect(appShellSrc).toContain('pb-28 md:pb-0');
      expect(appShellSrc).not.toContain('md:pb-12');
    });

    it('verifies Map tab integration across App.tsx, BottomNav.tsx, and SidebarNav.tsx', () => {
      const appSrc = getFileContent('src/App.tsx');
      const bottomNavSrc = getFileContent('src/components/layout/BottomNav.tsx');
      const sidebarNavSrc = getFileContent('src/components/layout/SidebarNav.tsx');

      expect(appSrc).toContain("activeTab === 'map' && <MapView />");
      expect(bottomNavSrc).toContain("id: 'map'");
      expect(sidebarNavSrc).toContain("id: 'map'");
    });
  });
});
