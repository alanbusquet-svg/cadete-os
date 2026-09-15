import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, MapPin, Volume2, VolumeX, Crosshair, Store, Clock, Route, Loader2, Sun, Moon } from 'lucide-react';
import L from 'leaflet';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { speakOrder, isSpeechMuted, setSpeechMuted, cancelSpeech } from '../../utils/speech';
import { resolveOrderCoordinates, calculateDistanceKm, estimateMotoEtaMinutes } from '../../utils/geocoding';
import { fetchOsrmRoute } from '../../utils/routing';
import { useGeolocation, BOLIVAR_CENTER } from '../../hooks/useGeolocation';
import { useMapTheme } from '../../hooks/useMapTheme';
import { Badge } from '../common/Badge';
import { CARTO_DARK_MATTER_URL, CARTO_TILE_OPTIONS, DEFAULT_MAP_ZOOM } from './mapConfig';
import { createCadeteLocationIcon, createOrderDestinationIcon } from './mapIcons';
import { useModalBackHandler } from '../../hooks/useModalBackHandler';

export interface OrderMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const OrderMapModal: React.FC<OrderMapModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { location: cadeteLocation } = useGeolocation();
  const { isDark, toggleMapTheme } = useMapTheme();

  const [speechMuted, setSpeechMutedState] = useState<boolean>(() => isSpeechMuted());
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [etaMinutes, setEtaMinutes] = useState<number>(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const cadeteMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const hasSpokenRef = useRef<string | null>(null);

  const { handleProgrammaticClose } = useModalBackHandler({
    isOpen,
    onClose,
    modalId: 'order-map'
  });

  // Lock body scroll while route map modal is open
  useEffect(() => {
    if (!isOpen) return;
    if (typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Sync initial Haversine distance and ETA metrics immediately on open
  useEffect(() => {
    if (!isOpen || !order) {
      setDistanceKm(0);
      setEtaMinutes(0);
      setIsLoadingRoute(false);
      return;
    }

    const destCoords = resolveOrderCoordinates(order);
    const originCoords: [number, number] = cadeteLocation
      ? [cadeteLocation.lat, cadeteLocation.lng]
      : BOLIVAR_CENTER;
    const initialDistanceKm = calculateDistanceKm(originCoords, destCoords);
    const initialEtaMinutes = estimateMotoEtaMinutes(initialDistanceKm);
    setDistanceKm(initialDistanceKm);
    setEtaMinutes(initialEtaMinutes);
  }, [isOpen, order?.id, cadeteLocation]);

  // R3: Auto speech readout (< 300ms, deduplicated by order.id)
  useEffect(() => {
    if (!isOpen || !order) {
      hasSpokenRef.current = null;
      cancelSpeech();
      return;
    }

    if (hasSpokenRef.current !== order.id) {
      hasSpokenRef.current = order.id;
      const speechTimer = setTimeout(() => {
        if (!isSpeechMuted()) {
          cancelSpeech();
          speakOrder(order);
        }
      }, 150);

      return () => {
        clearTimeout(speechTimer);
      };
    }
  }, [isOpen, order?.id]);

  // Initialize and update Leaflet route map with OSRM street routing
  useEffect(() => {
    if (!isOpen || !order || !mapContainerRef.current) return;

    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    const abortController = new AbortController();

    // Small delay to allow the modal sheet DOM animation to settle
    const timer = setTimeout(() => {
      if (!mapContainerRef.current || !isMounted) return;

      // Dispose existing map if container already initialized
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        polylineRef.current = null;
        cadeteMarkerRef.current = null;
      }

      const destCoords = resolveOrderCoordinates(order);
      const originCoords: [number, number] = cadeteLocation
        ? [cadeteLocation.lat, cadeteLocation.lng]
        : BOLIVAR_CENTER;

      try {
        const map = L.map(mapContainerRef.current, {
          center: destCoords,
          zoom: DEFAULT_MAP_ZOOM,
          zoomControl: false,
          attributionControl: false
        });

        L.tileLayer(CARTO_DARK_MATTER_URL, CARTO_TILE_OPTIONS).addTo(map);

        // Cadete GPS marker
        const cadeteMarker = L.marker(originCoords, { icon: createCadeteLocationIcon() }).addTo(map);
        cadeteMarkerRef.current = cadeteMarker;

        // Destination marker
        L.marker(destCoords, {
          icon: createOrderDestinationIcon(order.amount, order.paymentMethod, true)
        }).addTo(map);

        // Initial render: straight dashed emerald route polyline with zero delay
        const straightPolyline = L.polyline([originCoords, destCoords], {
          color: '#10b981',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.9
        }).addTo(map);

        polylineRef.current = straightPolyline;

        // Fit map bounds to show both points with comfortable padding
        const bounds = L.latLngBounds([originCoords, destCoords]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

        mapInstanceRef.current = map;

        // Ensure canvas tiles fill container cleanly
        map.invalidateSize();

        // ResizeObserver on mapContainerRef.current for robust layout sizing
        if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (mapContainerRef.current && mapContainerRef.current.clientHeight > 0) {
              map.invalidateSize();
            }
          });
          resizeObserver.observe(mapContainerRef.current);
        }

        // Concurrently fetch real street driving route from OSRM
        setIsLoadingRoute(true);
        fetchOsrmRoute(originCoords, destCoords, { signal: abortController.signal })
          .then((result) => {
            if (!isMounted || !mapInstanceRef.current) return;
            setIsLoadingRoute(false);

            if (!result.isFallback && result.coordinates.length >= 2) {
              // Remove initial straight polyline
              if (polylineRef.current) {
                map.removeLayer(polylineRef.current);
                polylineRef.current = null;
              }

              // Add solid street polyline
              const streetPolyline = L.polyline(result.coordinates, {
                color: '#10b981',
                weight: 4,
                opacity: 0.9
              }).addTo(map);

              polylineRef.current = streetPolyline;

              // Refit bounds for the actual street path
              map.fitBounds(streetPolyline.getBounds(), { padding: [40, 40], maxZoom: 16 });

              // Update distance and ETA metrics to match OSRM street route
              setDistanceKm(result.distanceKm);
              setEtaMinutes(result.durationMinutes);
            }
          })
          .catch(() => {
            if (isMounted) {
              setIsLoadingRoute(false);
            }
          });
      } catch {
        // Fallback gracefully if canvas context fails
      }
    }, 150);

    return () => {
      isMounted = false;
      abortController.abort();
      clearTimeout(timer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        polylineRef.current = null;
        cadeteMarkerRef.current = null;
      }
    };
  }, [isOpen, order?.id]);

  // Separate effect for tracking cadete GPS position changes without destroying the map
  useEffect(() => {
    if (!isOpen || !cadeteMarkerRef.current) return;
    if (cadeteLocation) {
      cadeteMarkerRef.current.setLatLng([cadeteLocation.lat, cadeteLocation.lng]);
    }
  }, [isOpen, cadeteLocation?.lat, cadeteLocation?.lng]);

  // Listen for global speech mute changes
  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setSpeechMutedState(customEvent.detail ?? isSpeechMuted());
    };
    window.addEventListener('cadete_os_speech_muted_changed', handleMuteChange);
    return () => {
      window.removeEventListener('cadete_os_speech_muted_changed', handleMuteChange);
    };
  }, []);

  if (!isOpen || !order) return null;

  const handleFocusRoute = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineRef.current) {
      map.fitBounds(polylineRef.current.getBounds(), {
        padding: [40, 40],
        maxZoom: 16
      });
    } else if (order) {
      const destCoords = resolveOrderCoordinates(order);
      const originCoords: [number, number] = cadeteLocation
        ? [cadeteLocation.lat, cadeteLocation.lng]
        : BOLIVAR_CENTER;
      map.fitBounds(L.latLngBounds([originCoords, destCoords]), {
        padding: [40, 40],
        maxZoom: 16
      });
    }
  };

  const handleVoiceAction = () => {
    if (!order) return;
    if (isSpeechMuted()) {
      setSpeechMuted(false);
      setSpeechMutedState(false);
      speakOrder(order);
    } else {
      cancelSpeech();
      speakOrder(order);
    }
  };

  const handleSpeak = () => {
    try {
      if (!isSpeechMuted()) {
        cancelSpeech();
      }
      speakOrder(order);
    } catch {
      // Safe fallback
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* 1-Tap Backdrop Dismissal */}
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} aria-hidden="true" />

      {/* Bottom Sheet Modal Container */}
      <div className="relative w-full max-w-lg bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] h-[88vh] sm:h-auto overflow-hidden z-10">
        {/* Mobile Drag Indicator Bar - Interactive touch target */}
        <button
          type="button"
          onClick={handleProgrammaticClose}
          className="w-full min-h-[44px] flex items-center justify-center py-2 sm:hidden flex-shrink-0 cursor-pointer group focus:outline-none"
          aria-label="Tocar para cerrar"
          title="Tocar para cerrar"
        >
          <div className="w-12 h-1.5 bg-zinc-700 group-hover:bg-zinc-500 rounded-full transition-colors" />
        </button>

        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between gap-3 flex-shrink-0">
          {/* Left Back Button (Thumb Reachable) */}
          <button
            type="button"
            onClick={handleProgrammaticClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-zinc-800/80 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 flex items-center justify-center transition-colors shrink-0 active:scale-95"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-400 shrink-0" />
              <h3 className="font-black text-base text-zinc-100 truncate">
                {order.businessName}
              </h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-300 mt-0.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{order.address || 'Sin dirección'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button (Modo Blanco / Modo Oscuro) */}
            <button
              type="button"
              onClick={toggleMapTheme}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 flex items-center justify-center transition-colors active:scale-95"
              title={isDark ? 'Cambiar a Modo Blanco (Mapa Claro)' : 'Cambiar a Modo Oscuro'}
              aria-label={isDark ? 'Cambiar a Modo Blanco (Mapa Claro)' : 'Cambiar a Modo Oscuro'}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-400" />
              )}
            </button>

            {/* Repeat Audio Voice Button */}
            <button
              type="button"
              onClick={handleSpeak}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition-colors active:scale-95"
              title="Escuchar indicaciones de voz"
              aria-label="Escuchar indicaciones de voz"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleProgrammaticClose}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Cerrar modal"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Route Metrics Pill Row (Distance & ETA) */}
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/60 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <Route className="w-3.5 h-3.5" />
              <span>{distanceKm} km</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-300 font-semibold">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>~{etaMinutes} min en moto</span>
            </div>
            {isLoadingRoute && (
              <div className="flex items-center gap-1 text-emerald-400/90 font-medium animate-pulse ml-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-[11px] hidden xs:inline">Trazando calles...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="emerald" size="sm">
              {formatCurrency(order.amount)}
            </Badge>
            <span className="text-[11px] text-zinc-400 uppercase font-bold">
              {order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
            </span>
          </div>
        </div>

        {/* Interactive Leaflet Map Canvas */}
        <div className="flex-1 w-full min-h-[280px] sm:min-h-[340px] relative bg-zinc-950 overflow-hidden">
          <div
            ref={mapContainerRef}
            className={`w-full h-full transition-colors ${isDark ? 'map-dark' : 'map-light'}`}
            id="order-route-map-canvas"
          />
        </div>

        {/* Modal Footer Controls — 100% IN-APP CONTROLS (Zero External Redirects) */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/95 flex items-center gap-2 flex-shrink-0">
          {/* 1. Botón Enfocar Ruta / Destino */}
          <button
            type="button"
            onClick={handleFocusRoute}
            className="min-h-[52px] px-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            title="Enfocar ruta completa"
            aria-label="Enfocar Ruta / Destino"
          >
            <Crosshair className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Enfocar</span>
          </button>

          {/* 2. Control de Audio / Voz Integrado */}
          <button
            type="button"
            onClick={handleVoiceAction}
            className="min-h-[52px] w-10 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 flex items-center justify-center border border-zinc-700/80 transition-colors active:scale-95 shrink-0"
            title={speechMuted ? "Voz silenciada (Tocar para activar)" : "Repetir lectura por voz"}
            aria-label={speechMuted ? "Voz silenciada" : "Escuchar viaje por voz"}
          >
            {speechMuted ? (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* 3. Botón Principal: Volver a Viajes */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[52px] px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/30 transition-all active:scale-[0.98]"
            aria-label="Volver a Viajes"
          >
            <span>Volver a Viajes</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
};
