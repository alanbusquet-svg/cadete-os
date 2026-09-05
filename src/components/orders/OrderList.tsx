import React, { useState, useRef } from 'react';
import { Plus, Bike, Search, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useOrders } from '../../hooks/useOrders';
import { OrderCard } from './OrderCard';
import { OrderFormModal } from './OrderFormModal';
import { OrderMapModal } from '../map/OrderMapModal';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatCurrency, formatDateAR, getTodayDateString } from '../../utils/formatting';
import { getPreviousDate, getNextDate, isInteractiveElement, evaluateSwipeGesture } from '../../utils/date';
import type { Order } from '../../types';
import { cn } from '../../lib/utils';

export const OrderList: React.FC = () => {
  const { setSelectedDate } = useData();
  const { dayOrders, selectedDate, updateOrder, deleteOrder } = useOrders();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Swipe gesture state (R2)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const totalDayRevenue = dayOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const settledOrdersCount = dayOrders.filter((o) => o.settled).length;

  const filteredOrders = dayOrders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.businessName.toLowerCase().includes(q) ||
      (o.address && o.address.toLowerCase().includes(q)) ||
      (o.notes && o.notes.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.includes(q))
    );
  });

  const handleSettleToggle = (orderId: string, currentSettled: boolean) => {
    updateOrder(orderId, { settled: !currentSettled });
  };

  const handleDelete = (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const handleConfirmDelete = () => {
    if (orderToDelete) {
      deleteOrder(orderToDelete);
      setOrderToDelete(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    if (isInteractiveElement(e.target)) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (!touch) {
      touchStartRef.current = null;
      return;
    }

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const action = evaluateSwipeGesture(deltaX, deltaY, 50);
    if (action === 'prev_day') {
      setSwipeDirection('right');
      setIsSwiping(true);
      setSelectedDate(getPreviousDate(selectedDate));
      setTimeout(() => {
        setIsSwiping(false);
        setSwipeDirection(null);
      }, 150);
    } else if (action === 'next_day') {
      const todayStr = getTodayDateString();
      if (selectedDate < todayStr) {
        setSwipeDirection('left');
        setIsSwiping(true);
        setSelectedDate(getNextDate(selectedDate, todayStr));
        setTimeout(() => {
          setIsSwiping(false);
          setSwipeDirection(null);
        }, 150);
      }
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeDirection(null);
  };

  return (
    <div
      className={cn(
        'space-y-5 transition-all duration-150 ease-out',
        isSwiping
          ? swipeDirection === 'right'
            ? 'opacity-85 translate-x-1'
            : 'opacity-85 -translate-x-1'
          : 'opacity-100 translate-x-0'
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Header Metric Banner */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Bike className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Total Facturado • {formatDateAR(selectedDate)}
              </span>
              <span className="text-3xl font-black text-emerald-400 tracking-tight mt-0.5">
                {formatCurrency(totalDayRevenue)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-5">
            <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Viajes del Turno
              </span>
              <span className="text-xl font-black text-zinc-100">
                {dayOrders.length}
              </span>
              <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> {settledOrdersCount} cobrados
              </span>
            </div>

            {/* Primary CTA button (Header) */}
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-6 h-6 stroke-[3]" />}
            >
              Registrar Viaje
            </Button>
          </div>
        </div>
      </div>

      {/* Search filter if there are orders */}
      {dayOrders.length > 3 && (
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar por comercio, calle o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      )}

      {/* Orders Multi-Column Responsive Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onSettleToggle={handleSettleToggle}
              onDelete={handleDelete}
              onViewOnMap={(ord) => setSelectedOrderForMap(ord)}
            />
          ))}
        </div>
      ) : dayOrders.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl">
          <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-3">
            <Bike className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-200">Sin viajes en este turno</h3>
          <p className="text-xs text-zinc-400 max-w-xs mt-1">
            Tocá el botón verde para registrar tu primer viaje y calcular tu ganancia al instante.
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-5 h-5" />}
            >
              Cargar Primer Pedido
            </Button>
          </div>
        </div>
      ) : (
        /* No search results */
        <div className="text-center py-10 bg-zinc-900/30 border border-zinc-800 rounded-2xl text-xs text-zinc-400">
          No se encontraron viajes que coincidan con la búsqueda.
        </div>
      )}

      {/* Floating Action Button (R1 - Mobile bottom-left for left-thumb reach) */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Registrar Viaje"
        title="Registrar Viaje"
        className="fixed bottom-20 left-4 z-40 md:hidden flex items-center justify-center min-w-[60px] min-h-[60px] w-[60px] h-[60px] rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-95 transition-transform text-zinc-950 shadow-xl shadow-emerald-950/60 border border-emerald-400/40 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        <Plus className="w-8 h-8 stroke-[3]" />
      </button>

      {/* Modal Carga de Viaje */}
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Modal Mapa y Ruta In-App */}
      <OrderMapModal
        isOpen={selectedOrderForMap !== null}
        onClose={() => setSelectedOrderForMap(null)}
        order={selectedOrderForMap}
      />

      {/* Modal Confirmación de Eliminación */}
      <ConfirmDialog
        isOpen={orderToDelete !== null}
        title="Eliminar Viaje"
        message="¿Estás seguro de que querés eliminar este viaje? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setOrderToDelete(null)}
      />
    </div>
  );
};
