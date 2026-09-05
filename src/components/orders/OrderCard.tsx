import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  Map,
  CheckCircle2,
  Clock,
  Trash2,
  ChevronDown,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import type { Order } from '../../types';
import { formatCurrency, formatTime, getZoneLabel } from '../../utils/formatting';
import { openNavigation, isValidAddress } from '../../utils/navigation';
import { buildCustomerWhatsAppUrl } from '../../utils/whatsapp';
import { speakOrder } from '../../utils/speech';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { OrderMapModal } from '../map/OrderMapModal';
import { cn } from '../../lib/utils';

export interface OrderCardProps {
  order: Order;
  onSettleToggle?: (orderId: string, currentSettled: boolean) => void;
  onDelete?: (orderId: string) => void;
  onViewOnMap?: (order: Order) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onSettleToggle,
  onDelete,
  onViewOnMap
}) => {
  const { user } = useAuth();
  const city = user?.settings?.cityDefault || 'San Carlos de Bolívar';
  const country = user?.settings?.countryDefault || 'Argentina';
  const [showNavMenu, setShowNavMenu] = useState<boolean>(false);
  const [isInternalMapOpen, setIsInternalMapOpen] = useState<boolean>(false);

  const hasAddress = isValidAddress(order.address);
  const hasCustomerPhone = Boolean(order.customerPhone && order.customerPhone.trim());

  const handleNavigate = (provider: 'google' | 'waze') => {
    if (!order.address) return;
    openNavigation(order.address, provider, city, country);
    setShowNavMenu(false);
  };

  const handleOpenMap = () => {
    try {
      speakOrder(order);
    } catch {
      // Safe fallback
    }

    if (onViewOnMap) {
      onViewOnMap(order);
    } else {
      setIsInternalMapOpen(true);
    }
  };

  const handleWhatsAppCustomer = () => {
    if (!order.customerPhone) return;
    const url = buildCustomerWhatsAppUrl(order.customerPhone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-4 transition-all shadow-sm hover:border-zinc-700/80 space-y-3">
      {/* Top row: Business name + Amount */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-zinc-100 leading-tight truncate">
              {order.businessName}
            </span>
            <span className="text-xs text-zinc-400 font-medium shrink-0">
              {formatTime(order.timestamp)}
            </span>
          </div>

          {/* Delivery address */}
          {hasAddress ? (
            <div className="flex items-center gap-1.5 text-zinc-300 text-sm mt-1">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-medium truncate">{order.address}</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-400 mt-1 italic">Sin dirección especificada</span>
          )}
        </div>

        {/* Amount */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-xl font-black text-emerald-400 tracking-tight">
            {formatCurrency(order.amount)}
          </span>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase">
            {order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
          </span>
        </div>
      </div>

      {/* Badges row: Zone + Payer + Settlement */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-800/60">
        <Badge variant="zinc" size="sm">
          {getZoneLabel(order.zone)}
        </Badge>

        {order.paidBy === 'customer' ? (
          <Badge variant="emerald" size="sm">
            Cliente
          </Badge>
        ) : (
          <Badge variant="amber" size="sm">
            Comercio (Cta Cte)
          </Badge>
        )}

        {order.settled ? (
          <Badge variant="emerald" size="sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Cobrado
          </Badge>
        ) : (
          <Badge variant="amber" size="sm">
            <Clock className="w-3 h-3 text-amber-400" /> Pendiente
          </Badge>
        )}

        {order.notes && (
          <span className="text-xs text-zinc-400 italic truncate max-w-[200px] ml-1">
            {`"${order.notes}"`}
          </span>
        )}
      </div>

      {/* WhatsApp Button (when customerPhone is present) */}
      {hasCustomerPhone && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleWhatsAppCustomer}
            className="w-full min-h-[52px] px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-[0.98] transition-all"
            title={`Avisar a ${order.customerPhone} por WhatsApp`}
          >
            <MessageSquare className="w-5 h-5 fill-zinc-950 text-emerald-600" />
            <span>Estoy afuera 🛵</span>
            <span className="text-xs font-semibold text-zinc-900 bg-emerald-400/80 px-2 py-0.5 rounded-lg ml-1">
              {order.customerPhone}
            </span>
          </button>
        </div>
      )}

      {/* Row 1: Map Navigation Row (when hasAddress) */}
      {hasAddress && (
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
          {/* Primary Action: Ver en Mapa (Left-Thumb Ergonomic, >=52px touch target) */}
          <button
            type="button"
            onClick={handleOpenMap}
            className="flex-1 min-h-[52px] px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-950/20 active:scale-[0.98] transition-all"
            aria-label={`Ver en mapa viaje a ${order.address}`}
          >
            <Map className="w-4 h-4 stroke-[2.5]" />
            <span>Ver en Mapa</span>
          </button>

          {/* Secondary Action: External Navigation (Google Maps / Waze) */}
          <div className="relative shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleNavigate('google')}
                className="min-h-[52px] px-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                title="Abrir en Google Maps"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cómo ir</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNavMenu(!showNavMenu)}
                className="min-h-[52px] w-10 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center border border-zinc-700/80 transition-colors"
                title="Elegir aplicación de mapas"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown for external maps */}
            {showNavMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-900 border border-zinc-700 rounded-2xl p-1.5 shadow-xl z-20 space-y-1">
                <button
                  type="button"
                  onClick={() => handleNavigate('google')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:bg-zinc-800 flex items-center justify-between"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate('waze')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:bg-zinc-800 flex items-center justify-between"
                >
                  <span>Waze</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 2: Status & Management (Cobrar / Pendiente + Eliminar) */}
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          !hasAddress ? 'pt-2 border-t border-zinc-800/60' : 'pt-1'
        )}
      >
        {!hasAddress ? (
          <span className="text-xs text-zinc-400 font-medium py-2 italic">
            Sin ruta GPS
          </span>
        ) : (
          <div className="text-[11px] text-zinc-400 font-medium">
            <span>{city}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {onSettleToggle && (
            <button
              type="button"
              onClick={() => onSettleToggle(order.id, order.settled)}
              className="min-h-[52px] px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors active:scale-95"
              title={order.settled ? 'Marcar como pendiente' : 'Marcar como cobrado'}
            >
              {order.settled ? 'Pendiente' : 'Cobrar'}
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(order.id)}
              className="min-h-[52px] w-12 rounded-2xl bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors active:scale-95"
              title="Eliminar viaje"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Fallback Internal Modal (if not controlled by parent) */}
      {!onViewOnMap && isInternalMapOpen && (
        <OrderMapModal
          isOpen={isInternalMapOpen}
          onClose={() => setIsInternalMapOpen(false)}
          order={order}
        />
      )}
    </div>
  );
};

