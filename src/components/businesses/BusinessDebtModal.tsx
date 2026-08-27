import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useBusinesses } from '../../hooks/useBusinesses';
import { formatCurrency, formatDateAR, getZoneLabel } from '../../utils/formatting';
import { generateWhatsAppSettlementText, generateWhatsAppUrl } from '../../utils/whatsapp';
import type { Business } from '../../types';
import { CheckCircle2, MessageCircle, MapPin, Calendar } from 'lucide-react';

export interface BusinessDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
}

export const BusinessDebtModal: React.FC<BusinessDebtModalProps> = ({
  isOpen,
  onClose,
  business
}) => {
  const { getBusinessDebt, settleBusinessDebt } = useBusinesses();

  if (!business) return null;

  const debtSummary = getBusinessDebt(business.id);
  const { totalDebt, unsettledOrdersCount, orders } = debtSummary;

  const handleSendWhatsApp = () => {
    const text = generateWhatsAppSettlementText(business, orders);
    const url = generateWhatsAppUrl(business.phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSettle = () => {
    if (unsettledOrdersCount === 0) return;
    if (window.confirm(`¿Confirmar liquidación de ${formatCurrency(totalDebt)} para ${business.name}?`)) {
      settleBusinessDebt(business.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Liquidación: ${business.name}`}
      subtitle={`${unsettledOrdersCount} viajes pendientes de cobro`}
    >
      <div className="space-y-4">
        {/* Total Debt Banner */}
        <div className="bg-gradient-to-br from-amber-950/40 to-zinc-950/80 border border-amber-500/30 rounded-3xl p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Total a Cobrar
            </span>
            <span className="text-3xl font-black text-amber-300 tracking-tight mt-0.5">
              {formatCurrency(totalDebt)}
            </span>
            {business.phone && (
              <span className="text-xs text-zinc-400 mt-1">
                WhatsApp: {business.phone}
              </span>
            )}
          </div>

          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg">
            {unsettledOrdersCount}
          </div>
        </div>

        {/* Detailed Orders List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Detalle de Envíos Pendientes
          </h4>

          {orders.length > 0 ? (
            orders.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>{order.address || 'Envío sin dirección'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDateAR(order.date)}
                    </span>
                    <span>•</span>
                    <Badge variant="zinc" size="sm">
                      {getZoneLabel(order.zone)}
                    </Badge>
                  </div>
                </div>

                <span className="text-sm font-black text-emerald-400 flex-shrink-0">
                  {formatCurrency(order.amount)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-6 bg-zinc-950/40 border border-zinc-800 rounded-2xl text-xs text-zinc-400 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>No hay viajes pendientes con este comercio.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {unsettledOrdersCount > 0 ? (
          <div className="space-y-2 pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSendWhatsApp}
              leftIcon={<MessageCircle className="w-5 h-5" />}
            >
              Enviar Resumen por WhatsApp
            </Button>

            <Button
              variant="success"
              size="lg"
              fullWidth
              onClick={handleSettle}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
            >
              Liquidar Deuda en Lote
            </Button>
          </div>
        ) : (
          <div className="pt-2">
            <Button variant="secondary" size="md" fullWidth onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
