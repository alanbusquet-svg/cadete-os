import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation, MapPin, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import type { Order } from '../../types';
import { useOrders } from '../../hooks/useOrders';
import { useGeolocation, BOLIVAR_CENTER } from '../../hooks/useGeolocation';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatting';
import { resolveOrderCoordinates } from '../../utils/geocoding';
import { speakOrder } from '../../utils/speech';
import { CARTO_DARK_MATTER_URL, CARTO_TILE_OPTIONS, DEFAULT_MAP_ZOOM } from './mapConfig';
import { createCadeteLocationIcon, createOrderDestinationIcon } from './mapIcons';
import { OrderMapModal } from './OrderMapModal';

export const MapView: React.FC = () => {
  const { dayOrders } = useOrders();
  const { user } = useAuth();
  const city = user?.settings?.cityDefault || 'San Carlos de Bolívar';
  const { location: cadeteLocation, effectiveCenter, error: gpsError } = useGeolocation();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'all'>('pending');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const cadeteMarkerRef = useRef<L.Marker | null>(null);
  const orderMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  // Filter orders based on active filter (pending deliveries vs all day orders)
  const displayedOrders = dayOrders.filter((order) => {
    if (activeFilter === 'pending') {
      return !order.settled;
    }
    return true;
  });

  // Center map on cadete or city center
  const handleRecenter = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const center = cadeteLocation
      ? [cadeteLocation.lat, cadeteLocation.lng] as [number, number]
      : effectiveCenter;
    mapInstanceRef.current.setView(center, DEFAULT_MAP_ZOOM, { animate: true });
  }, [cadeteLocation, effectiveCenter]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: effectiveCenter,
        zoom: DEFAULT_MAP_ZOOM,
        zoomControl: false,
        attributionControl: true
      });

      L.tileLayer(CARTO_DARK_MATTER_URL, CARTO_TILE_OPTIONS).addTo(map);

      // Dedicated layer group for order pins
      const orderGroup = L.layerGroup().addTo(map);
      orderMarkersLayerRef.current = orderGroup;

      mapInstanceRef.current = map;

      // Invalidate size once container settles
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 120);

      return () => {
        clearTimeout(timer);
        map.remove();
        mapInstanceRef.current = null;
        cadeteMarkerRef.current = null;
        orderMarkersLayerRef.current = null;
      };
    } catch {
      // Fallback
    }
  }, [effectiveCenter]);

  // Update Cadete GPS marker reactively
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const coords: [number, number] = cadeteLocation
      ? [cadeteLocation.lat, cadeteLocation.lng]
      : BOLIVAR_CENTER;

    if (cadeteMarkerRef.current) {
      cadeteMarkerRef.current.setLatLng(coords);
    } else {
      cadeteMarkerRef.current = L.marker(coords, {
        icon: createCadeteLocationIcon(),
        zIndexOffset: 1000
      }).addTo(map);
    }
  }, [cadeteLocation]);

  // Update Order markers reactively
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = orderMarkersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    displayedOrders.forEach((order) => {
      const coords = resolveOrderCoordinates(order);
      const isSelected = selectedOrder?.id === order.id;
      const icon = createOrderDestinationIcon(order.amount, order.paymentMethod, isSelected);

      const marker = L.marker(coords, { icon });

      // Custom Dark Popup
      const isTransfer = order.paymentMethod === 'transfer';
      const paymentLabel = isTransfer ? 'Transferencia' : 'Efectivo';
      const payerLabel = order.paidBy === 'customer' ? 'Cobra al cliente' : 'Cta Cte Comercio';

      const popupHtml = `
        <div class="space-y-2 select-none min-w-[190px]">
          <div class="flex items-center gap-1.5 font-bold text-zinc-100 text-sm border-b border-zinc-800 pb-1">
            <span class="truncate">${order.businessName}</span>
          </div>
          <div class="text-xs text-zinc-300 flex items-center gap-1">
            <span class="truncate">${order.address || 'Sin dirección'}</span>
          </div>
          <div class="flex items-center justify-between text-xs pt-1">
            <span class="font-extrabold text-emerald-400 text-sm">$${order.amount.toLocaleString('es-AR')}</span>
            <span class="text-[10px] font-semibold text-zinc-400 uppercase">${paymentLabel}</span>
          </div>
          <div class="text-[10px] text-zinc-400">
            <span>${payerLabel}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        className: 'cadete-popup'
      });

      marker.on('click', () => {
        // Trigger brief audio announcement on marker tap
        try {
          speakOrder(order);
        } catch {
          // ignore
        }
      });

      layerGroup.addLayer(marker);
    });
  }, [displayedOrders, selectedOrder]);

  return (
    <div className="flex flex-col h-full space-y-3 pb-2">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800/80 rounded-2xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black text-zinc-100 uppercase tracking-wider truncate">
              {city}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium truncate">
              {displayedOrders.length === 1
                ? '1 viaje en pantalla'
                : `${displayedOrders.length} viajes en pantalla`}
            </span>
          </div>
        </div>

        {/* Filter Toggle (Pendientes vs Todos) */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeFilter === 'pending'
                ? 'bg-emerald-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Pendientes
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* GPS Warning if permission was denied */}
      {gpsError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{gpsError}</span>
        </div>
      )}

      {/* Interactive Map Card */}
      <div className="relative flex-1 w-full h-[calc(100vh-250px)] md:h-[calc(100vh-210px)] min-h-[400px] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-950">
        <div ref={mapContainerRef} className="w-full h-full" id="cadete-full-map-canvas" />

        {/* Floating Controls: GPS Re-Center Button */}
        <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleRecenter}
            className="w-14 h-14 rounded-2xl bg-zinc-900/95 border border-zinc-700 text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800 shadow-2xl flex items-center justify-center transition-all active:scale-90"
            title="Centrar en mi ubicación GPS"
            aria-label="Centrar en mi ubicación GPS"
          >
            <Navigation className="w-6 h-6 fill-emerald-400/20" />
          </button>
        </div>

        {/* Floating Quick Order Selector Pill at bottom-left */}
        {displayedOrders.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[400] max-w-[calc(100%-80px)]">
            <div className="bg-zinc-900/95 border border-zinc-800 backdrop-blur-md rounded-2xl p-2 shadow-2xl flex items-center gap-2 overflow-x-auto no-scrollbar">
              {displayedOrders.slice(0, 5).map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => setSelectedOrder(ord)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-xs font-bold text-zinc-200 flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[90px]">{ord.businessName}</span>
                  <span className="text-emerald-400 font-extrabold">{formatCurrency(ord.amount)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Order Route Modal */}
      {selectedOrder && (
        <OrderMapModal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
        />
      )}
    </div>
  );
};
