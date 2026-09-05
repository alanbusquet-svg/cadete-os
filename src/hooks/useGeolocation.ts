import { useState, useEffect, useRef, useCallback } from 'react';

export interface CadeteLocation {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  defaultCenter?: [number, number];
}

export const BOLIVAR_CENTER: [number, number] = [-36.2307, -61.1130];

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 3000,
    defaultCenter = BOLIVAR_CENTER
  } = options;

  const [location, setLocation] = useState<CadeteLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);

  const startWatch = useCallback(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setPermissionState('unsupported');
      setError('Geolocalización no soportada en este dispositivo.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsWatching(true);
    setError(null);

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setPermissionState('granted');
          setError(null);
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            timestamp: pos.timestamp
          });
        },
        (err) => {
          if (err.code === 1) {
            setPermissionState('denied');
            setError('Permiso de GPS denegado. Mostrando centro de Bolívar.');
          } else if (err.code === 2) {
            setError('Señal GPS no disponible temporalmente.');
          } else {
            setError('Tiempo de espera de GPS agotado.');
          }
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    } catch {
      setError('Error al iniciar seguimiento GPS.');
      setIsWatching(false);
    }
  }, [enableHighAccuracy, timeout, maximumAge]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  useEffect(() => {
    startWatch();
    return () => {
      stopWatch();
    };
  }, [startWatch, stopWatch]);

  return {
    location,
    effectiveCenter: location ? ([location.lat, location.lng] as [number, number]) : defaultCenter,
    error,
    permissionState,
    isWatching,
    startWatch,
    stopWatch
  };
}
