import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Navigation, Volume2, Store, Clock, Route, ChevronDown, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { openNavigation } from '../../utils/navigation';
import { speakOrder } from '../../utils/speech';
import { resolveOrderCoordinates, calculateDistanceKm, estimateMotoEtaMinutes } from '../../utils/geocoding';
import { useGeolocation, BOLIVAR_CENTER } from '../../hooks/useGeolocation';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { CARTO_DARK_MATTER_URL, CARTO_TILE_OPTIONS, DEFAULT_MAP_ZOOM } from './mapConfig';
import { createCadeteLocationIcon, createOrderDestinationIcon } from './mapIcons';

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
  const { user } = useAuth();
  const city = user?.settings?.cityDefault || 'San Carlos de Bolívar';
  const country = user?.settings?.countryDefault || 'Argentina';
  const { location: cadeteLocation } = useGeolocation();

  const [showNavMenu, setShowNavMenu] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Initialize and update Leaflet route map
  useEffect(() => {
    if (!isOpen || !order || !mapContainerRef.current) return;

    // Small delay to allow the modal sheet DOM animation to settle
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Dispose existing map if container already initialized
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
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
        L.marker(originCoords, { icon: createCadeteLocationIcon() }).addTo(map);

        // Destination marker
        L.marker(destCoords, {
          icon: createOrderDestinationIcon(order.amount, order.paymentMethod, true)
        }).addTo(map);

        // Dashed emerald route polyline
        L.polyline([originCoords, destCoords], {
          color: '#10b981',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.9
        }).addTo(map);

        // Fit map bounds to show both points with comfortable padding
        const bounds = L.latLngBounds([originCoords, destCoords]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

        mapInstanceRef.current = map;

        // Ensure canvas tiles fill container cleanly
        map.invalidateSize();
      } catch {
        // Fallback gracefully if canvas context fails
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, order, cadeteLocation]);

  if (!isOpen || !order) return null;

  const destCoords = resolveOrderCoordinates(order);
  const originCoords: [number, number] = cadeteLocation
    ? [cadeteLocation.lat, cadeteLocation.lng]
    : BOLIVAR_CENTER;
  const distanceKm = calculateDistanceKm(originCoords, destCoords);
  const etaMinutes = estimateMotoEtaMinutes(distanceKm);

  const handleExternalNav = (provider: 'google' | 'waze') => {
    if (!order.address) return;
    openNavigation(order.address, provider, city, country);
    setShowNavMenu(false);
  };

  const handleSpeak = () => {
    try {
      speakOrder(order);
    } catch {
      // Safe fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      {/* 1-Tap Backdrop Dismissal */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Bottom Sheet Modal Container */}
      <div className="relative w-full max-w-lg bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] h-[88vh] sm:h-auto overflow-hidden z-10">
        {/* Mobile Drag Indicator Bar */}
        <div
          onClick={onClose}
          className="w-12 h-1.5 bg-zinc-700 hover:bg-zinc-500 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0 cursor-pointer"
          title="Tocar para cerrar"
        />

        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex flex-col min-w-0">
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
            {/* Repeat Audio Voice Button */}
            <button
              type="button"
              onClick={handleSpeak}
              className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition-colors active:scale-95"
              title="Escuchar indicaciones de voz"
              aria-label="Escuchar indicaciones de voz"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Cerrar modal"
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
          <div ref={mapContainerRef} className="w-full h-full" id="order-route-map-canvas" />
        </div>

        {/* Modal Footer Controls (1-Tap Dismiss & External Navigation) */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/95 flex items-center gap-2 flex-shrink-0">
          {/* External GPS Dropdown */}
          <div className="relative">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleExternalNav('google')}
                className="min-h-[52px] px-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                title="Abrir en Google Maps"
              >
                <Navigation className="w-4 h-4 text-emerald-400" />
                <span>Cómo ir</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNavMenu(!showNavMenu)}
                className="min-h-[52px] w-10 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center border border-zinc-700/80 transition-colors"
                title="Elegir aplicación"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showNavMenu && (
              <div className="absolute left-0 bottom-full mb-2 w-44 bg-zinc-900 border border-zinc-700 rounded-2xl p-1.5 shadow-xl z-30 space-y-1">
                <button
                  type="button"
                  onClick={() => handleExternalNav('google')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:bg-zinc-800 flex items-center justify-between"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExternalNav('waze')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:bg-zinc-800 flex items-center justify-between"
                >
                  <span>Waze</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
            )}
          </div>

          {/* Primary Dismiss Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[52px] px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/30 transition-all active:scale-[0.98]"
          >
            <span>Volver a Viajes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
