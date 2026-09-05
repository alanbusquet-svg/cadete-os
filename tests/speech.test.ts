import { describe, it, expect, beforeEach, vi } from 'vitest';
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

describe('Web Speech API Assistant (speech.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should initialize with speech unmuted by default', () => {
    expect(isSpeechMuted()).toBe(false);
  });

  it('should set and toggle mute state and persist in localStorage', () => {
    setSpeechMuted(true);
    expect(isSpeechMuted()).toBe(true);
    expect(localStorage.getItem(SPEECH_MUTED_STORAGE_KEY)).toBe('true');

    const nextState = toggleSpeechMuted();
    expect(nextState).toBe(false);
    expect(isSpeechMuted()).toBe(false);
    expect(localStorage.getItem(SPEECH_MUTED_STORAGE_KEY)).toBe('false');
  });

  it('should cancel active speech when muting', () => {
    const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel');
    setSpeechMuted(true);
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should select Argentine Spanish (es-AR) voice when available', () => {
    const voice = getBestSpanishVoice();
    expect(voice).toBeDefined();
    expect(voice?.lang).toBe('es-AR');
  });

  it('should speak text with es-AR lang and rate 1.05', () => {
    let capturedUtterance: any = null;
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
      capturedUtterance = u;
    });

    speakText('Hola Bolívar');
    expect(speakSpy).toHaveBeenCalled();
    expect(capturedUtterance).toBeDefined();
    expect(capturedUtterance.text).toBe('Hola Bolívar');
    expect(capturedUtterance.lang).toBe('es-AR');
    expect(capturedUtterance.rate).toBe(1.05);
  });

  it('should not speak when muted', () => {
    setSpeechMuted(true);
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

    speakText('Texto que no debe hablarse');
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('should correctly format order announcement for cash customer order', () => {
    let capturedUtterance: any = null;
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
      capturedUtterance = u;
    });

    const sampleOrder: Order = {
      id: 'ord_1',
      userId: 'usr_1',
      date: '2026-09-04',
      timestamp: Date.now(),
      businessId: 'biz_1',
      businessName: 'Pizzería Roma',
      address: 'Rivadavia 250',
      zone: 'planta_urbana',
      amount: 3500,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: false
    };

    speakOrder(sampleOrder);
    expect(capturedUtterance).toBeDefined();
    expect(capturedUtterance.text).toBe(
      'Viaje de Pizzería Roma a Rivadavia 250. Cobrar 3.500 pesos en efectivo.'
    );
  });

  it('should correctly format order announcement for transfer customer order', () => {
    let capturedUtterance: any = null;
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
      capturedUtterance = u;
    });

    const sampleOrder: Order = {
      id: 'ord_2',
      userId: 'usr_1',
      date: '2026-09-04',
      timestamp: Date.now(),
      businessId: 'biz_2',
      businessName: 'Hamburguesería El Puente',
      address: 'Av. San Martín 800',
      zone: 'barrio_cerca',
      amount: 4200,
      paidBy: 'customer',
      paymentMethod: 'transfer',
      settled: false
    };

    speakOrder(sampleOrder);
    expect(capturedUtterance.text).toBe(
      'Viaje de Hamburguesería El Puente a Av. San Martín 800. Cobrar 4.200 pesos por transferencia.'
    );
  });

  it('should format announcement for business debt order (paidBy business)', () => {
    let capturedUtterance: any = null;
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
      capturedUtterance = u;
    });

    const sampleOrder: Order = {
      id: 'ord_3',
      userId: 'usr_1',
      date: '2026-09-04',
      timestamp: Date.now(),
      businessId: 'biz_3',
      businessName: 'Farmacia Central',
      address: 'Brown 150',
      zone: 'planta_urbana',
      amount: 2000,
      paidBy: 'business',
      paymentMethod: 'cash',
      settled: false
    };

    speakOrder(sampleOrder);
    expect(capturedUtterance.text).toBe(
      'Viaje de Farmacia Central a Brown 150. Cobrar a comercio.'
    );
  });

  it('should format announcement for already settled order', () => {
    let capturedUtterance: any = null;
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
      capturedUtterance = u;
    });

    const sampleOrder: Order = {
      id: 'ord_4',
      userId: 'usr_1',
      date: '2026-09-04',
      timestamp: Date.now(),
      businessId: 'biz_1',
      businessName: 'Heladería Bolívar',
      address: 'Alvear 400',
      zone: 'planta_urbana',
      amount: 3000,
      paidBy: 'customer',
      paymentMethod: 'cash',
      settled: true
    };

    speakOrder(sampleOrder);
    expect(capturedUtterance.text).toBe(
      'Viaje de Heladería Bolívar a Alvear 400. Ya cobrado.'
    );
  });

  it('should format order success confirmation', () => {
    let capturedUtterance: any = null;
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: any) => {
      capturedUtterance = u;
    });

    speakSuccess(4000);
    expect(capturedUtterance.text).toBe('Pedido registrado, 4.000 pesos.');
  });

  it('should safely unlock audio and cancel speech without throwing', () => {
    expect(() => unlockAudio()).not.toThrow();
    expect(() => cancelSpeech()).not.toThrow();
  });
});
