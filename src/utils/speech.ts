import type { Order } from '../types';

export const SPEECH_MUTED_STORAGE_KEY = 'cadete_os_speech_muted';

export interface SpeechOptions {
  rate?: number;   // 1.0 = normal, 1.05 = cadete agile
  pitch?: number;  // 1.0 = normal
  volume?: number; // 0.0 to 1.0
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let audioUnlocked = false;

function initVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    cachedVoices = window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          cachedVoices = window.speechSynthesis.getVoices();
        } catch {
          // Ignore voice change error
        }
      };
    }
  } catch {
    // Ignore error if speech synthesis is not fully supported
  }
}

// Initialize voices eagerly in browser
if (typeof window !== 'undefined') {
  initVoices();
}

/**
 * Desbloquea el subsistema de audio para navegadores móviles tras la primera interacción
 */
export function unlockAudio(): void {
  if (audioUnlocked || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    if (typeof SpeechSynthesisUtterance !== 'undefined') {
      const silent = new SpeechSynthesisUtterance('');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    }
    audioUnlocked = true;
  } catch {
    // Falla silenciosa si no se permite reproducción en este ciclo
  }
}

/**
 * Encuentra la mejor voz disponible en español priorizando es-AR
 */
export function getBestSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  try {
    const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Prioridad: Argentina (es-AR o es_AR)
    const esAR = voices.find((v) => v.lang === 'es-AR' || v.lang === 'es_AR');
    if (esAR) return esAR;

    // 2. Prioridad: Español Latinoamérica (es-419, es-MX, es-CL, es-CO, es-UY, etc.)
    const esLatam = voices.find((v) => /^(es-419|es-MX|es-CL|es-CO|es-UY|es-US)/i.test(v.lang));
    if (esLatam) return esLatam;

    // 3. Prioridad: Cualquier variante de español
    const anyEs = voices.find((v) => v.lang.toLowerCase().startsWith('es'));
    if (anyEs) return anyEs;

    // 4. Fallback: voz por defecto del sistema
    return voices.find((v) => v.default) || voices[0] || null;
  } catch {
    return null;
  }
}

/**
 * Retorna si la asistencia de voz se encuentra silenciada
 */
export function isSpeechMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SPEECH_MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Establece el estado de silencio y lo persiste en localStorage
 */
export function setSpeechMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SPEECH_MUTED_STORAGE_KEY, muted ? 'true' : 'false');
    if (muted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignorar error al escribir en storage
  }
}

/**
 * Alterna el estado de silencio (mute/unmute) y retorna el nuevo estado
 */
export function toggleSpeechMuted(): boolean {
  const current = isSpeechMuted();
  const next = !current;
  setSpeechMuted(next);
  return next;
}

/**
 * Cancela cualquier locución en curso o encolada
 */
export function cancelSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignorar error
    }
  }
}

/**
 * Sintetiza texto en voz alta con la Web Speech API
 */
export function speakText(text: string, options: SpeechOptions = {}): void {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (typeof SpeechSynthesisUtterance === 'undefined') return;
  if (isSpeechMuted()) return;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-AR';
    utterance.rate = options.rate ?? 1.05; // Cadencia ágil para cadetes
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    const voice = getBestSpanishVoice();
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Falla silenciosa si las políticas de reproducción bloquean la locución
  }
}

/**
 * Anuncia el pedido: negocio, destino y monto/modalidad de cobro
 */
export function speakOrder(order: Order): void {
  if (isSpeechMuted()) return;

  const dest = order.address?.trim() ? `a ${order.address.trim()}` : '';
  const biz = order.businessName?.trim() ? `de ${order.businessName.trim()}` : '';
  
  let headerParts: string[] = ['Viaje'];
  if (biz) headerParts.push(biz);
  if (dest) headerParts.push(dest);
  const header = headerParts.join(' ').trim();

  let paymentText = '';
  if (order.settled) {
    paymentText = 'Ya cobrado.';
  } else if (order.paidBy === 'business') {
    paymentText = 'Cobrar a comercio.';
  } else {
    const method = order.paymentMethod === 'cash' ? 'en efectivo' : 'por transferencia';
    const amountStr = order.amount.toLocaleString('es-AR');
    paymentText = `Cobrar ${amountStr} pesos ${method}.`;
  }

  const fullText = `${header}. ${paymentText}`.trim();
  speakText(fullText);
}

/**
 * Anuncia confirmación breve al registrar un pedido con éxito
 */
export function speakSuccess(amount: number): void {
  if (isSpeechMuted()) return;
  const amountStr = amount.toLocaleString('es-AR');
  speakText(`Pedido registrado, ${amountStr} pesos.`);
}
